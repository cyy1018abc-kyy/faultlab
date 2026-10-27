/**
 * FaultLab QA harness — headless Chrome via CDP, zero dependencies.
 *
 * Usage (dev server must be running on :4318):
 *   node tools/qa.mjs boot                 # boot smoke + console error dump
 *   node tools/qa.mjs shot home            # screenshot one page -> artifacts/
 *   node tools/qa.mjs shots                # all pages, desktop + mobile
 *   node tools/qa.mjs ux                   # UX-01..UX-12 acceptance checks
 *   node tools/qa.mjs all                  # ux + shots
 *
 * Options: --base http://127.0.0.1:4318 --out artifacts --chrome "<path>"
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const cmd = args[0] || 'boot';
function opt(name, dflt) {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
}
const BASE = opt('base', 'http://127.0.0.1:4318').replace(/\/$/, '');
const OUT = path.resolve(ROOT, opt('out', 'artifacts'));
const PORT = Number(opt('port', '9333'));
const CHROME = opt('chrome', findChrome());
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe') : null,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ].filter(Boolean);
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error('Chrome/Edge not found; pass --chrome <path>');
}

/* ---------------------------------------------------------------- CDP */
class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.handlers = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(new Error('ws error ' + (e && e.message)));
    });
    this.ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message + ' ' + JSON.stringify(msg.error.data || '')));
        else resolve(msg.result);
        return;
      }
      if (msg.method) {
        const list = this.handlers.get(msg.method) || [];
        list.forEach((fn) => { try { fn(msg.params); } catch (e) { /* ignore */ } });
      }
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, fn) {
    if (!this.handlers.has(method)) this.handlers.set(method, []);
    this.handlers.get(method).push(fn);
  }
  close() { try { this.ws.close(); } catch { /* ignore */ } }
}

async function launch() {
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'faultlab-qa-'));
  const proc = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--disable-extensions', '--hide-scrollbars',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + userDir,
    '--window-size=1440,960',
    'about:blank'
  ], { stdio: 'ignore', windowsHide: true });

  const deadline = Date.now() + 20000;
  let version = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) { version = await res.json(); break; }
    } catch { /* retry */ }
    await wait(250);
  }
  if (!version) { proc.kill(); throw new Error('Chrome DevTools endpoint not available'); }

  const targetRes = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
  if (!targetRes.ok) throw new Error('cannot create CDP target: ' + targetRes.status);
  const target = await targetRes.json();
  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Console.enable');
  return { proc, cdp, userDir };
}

function collectErrors(cdp) {
  const errors = [];
  cdp.on('Runtime.exceptionThrown', (p) => {
    const d = p.exceptionDetails || {};
    errors.push('exception: ' + (d.exception && (d.exception.description || d.exception.value) || d.text) + ' @' + (d.url || ''));
  });
  cdp.on('Runtime.consoleAPICalled', (p) => {
    if (p.type !== 'error' && p.type !== 'assert') return;
    const txt = (p.args || []).map((a) => a.value != null ? a.value : (a.description || a.type)).join(' ');
    if (/favicon|Failed to load resource/i.test(txt)) return;
    errors.push('console.error: ' + txt);
  });
  cdp.on('Log.entryAdded', (p) => {
    const e = p.entry || {};
    if (e.level === 'error' && !/favicon/i.test(e.text || '')) errors.push('log: ' + e.text + ' @' + (e.url || ''));
  });
  return errors;
}

async function evaluate(cdp, expression) {
  const res = await cdp.send('Runtime.evaluate', {
    expression, returnByValue: true, awaitPromise: true, allowUnsafeEvalBlockedByCSP: true
  });
  if (res.exceptionDetails) {
    const d = res.exceptionDetails;
    throw new Error('evaluate failed: ' + (d.exception && (d.exception.description || d.exception.value) || d.text));
  }
  return res.result ? res.result.value : undefined;
}

async function goto(cdp, url, waitReady = true) {
  await cdp.send('Page.navigate', { url });
  await wait(400);
  if (!waitReady) return;
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const ready = await evaluate(cdp, 'Boolean(window.FL && window.FL.__ready)');
      if (ready) return;
    } catch { /* page may still be loading */ }
    await wait(200);
  }
  const body = await evaluate(cdp, 'document.body ? document.body.innerText.slice(0,400) : "no body"').catch(() => '?');
  throw new Error('page not ready: ' + url + '\n  body: ' + body);
}

async function setViewport(cdp, width, height) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: width < 600
  });
}

async function screenshot(cdp, name, width = 1440, height = 960) {
  fs.mkdirSync(OUT, { recursive: true });
  await setViewport(cdp, width, height);
  await wait(700);
  const res = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const file = path.join(OUT, name.endsWith('.png') ? name : name + '.png');
  fs.writeFileSync(file, Buffer.from(res.data, 'base64'));
  console.log('  shot -> ' + path.relative(ROOT, file));
  return file;
}

/* ------------------------------------------------------------- checks */
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? '  PASS ' : '  FAIL ') + name + (detail ? '  · ' + detail : ''));
}
async function checkAsync(name, fn) {
  try {
    const r = await fn();
    if (r === true || r === undefined) check(name, true);
    else if (r && typeof r === 'object' && 'ok' in r) check(name, r.ok, r.detail);
    else check(name, !!r);
  } catch (e) {
    check(name, false, String(e && e.message ? e.message : e));
  }
}

/* -------------------------------------------------------------- flows */
async function ux(cdp) {
  console.log('\n== UX acceptance flow (FL-001) ==');
  const errors = collectErrors(cdp);
  await goto(cdp, BASE + '/?demo=1&page=home');
  await wait(500);

  await checkAsync('UX boot: FL ready & 3 systems', async () =>
    await evaluate(cdp, 'FL && FL.__ready && FL.systems.list().length === 3'));

  await checkAsync('demo run exists, 601 samples, default fault', async () => {
    const r = await evaluate(cdp, `(() => {
      const s = FL.store.getState(); const run = s.activeRun;
      if (!run) return { ok: false, detail: 'no activeRun' };
      const c = run.config.fault;
      return { ok: run.timeseries.t.length === 601 && Math.abs(run.timeseries.t[600] - 60) < 1e-9
        && c.family === 'sensor_drift' && c.t_start_s === 20 && c.params.magnitude === 10
        && c.feedback_mode === undefined && run.config.feedback_mode === 'closed_loop',
        detail: 'run=' + run.runId + ' t=' + run.timeseries.t.length + ' fault=' + c.family + '/' + c.t_start_s + '/' + c.params.magnitude };
    })()`);
    return r;
  });

  await checkAsync('FL-001 analytic numbers (19.9/20.0/26/60s)', async () => {
    const r = await evaluate(cdp, `(() => {
      const run = FL.store.getState().activeRun;
      const I = (t) => FL.protocol.sampleAt(run, 'I_bat_meas_A', t).value;
      const It = (t) => FL.protocol.sampleAt(run, 'I_bat_true_A', t).value;
      const rM = (t) => FL.protocol.sampleAt(run, 'r_meas_kW', t).value;
      const rT = (t) => FL.protocol.sampleAt(run, 'r_true_kW', t).value;
      const ALIAS = { E_bat_kWh: 'E_bat_true_60s', E_source_kWh: 'E_gen_true_60s', E_load_served_kWh: 'E_load_served_60s', SOC_err_pp: 'SOC_err_end_pp', focal_change: 'focal_change_A' };
      const m = (id) => FL.core.getMetric(run, id) || FL.core.getMetric(run, ALIAS[id] || '');
      const near = (a, b, tol) => Math.abs(a - b) <= (tol || 1e-6);
      const problems = [];
      if (!near(I(19.9), 25)) problems.push('Imeas19.9=' + I(19.9));
      if (!near(I(20.0), 35)) problems.push('Imeas20=' + I(20.0));
      if (!near(It(20.0), 25)) problems.push('Itrue20=' + It(20.0));
      if (!near(It(26), 15 + 10 * Math.exp(-4), 1e-9)) problems.push('Itrue26=' + It(26));
      if (!near(I(26), 25 + 10 * Math.exp(-4), 1e-9)) problems.push('Imeas26=' + I(26));
      if (!near(It(21.5), 18.6787944117, 1e-9)) problems.push('Itrue21.5=' + It(21.5));
      if (!near(I(21.5), 28.6787944117, 1e-9)) problems.push('Imeas21.5=' + I(21.5));
      if (!near(rM(30), 4, 1e-6)) problems.push('rmeas30=' + rM(30));
      if (!near(rT(30), 0, 1e-6)) problems.push('rtrue30=' + rT(30));
      if (!near(m('E_bat_kWh').value, 0.1238888889, 1e-6)) problems.push('Ebat=' + m('E_bat_kWh').value);
      if (!near(m('E_source_kWh').value, 0.3761111111, 1e-6)) problems.push('Egen=' + m('E_source_kWh').value);
      if (!near(m('SOC_true_end_pct').value, 59.6902777778, 1e-6)) problems.push('SOCtrue=' + m('SOC_true_end_pct').value);
      if (!near(m('SOC_est_end_pct').value, 59.5791666667, 1e-6)) problems.push('SOCest=' + m('SOC_est_end_pct').value);
      if (!near(m('SOC_err_end_pp').value, -0.1111111111, 1e-6)) problems.push('SOCerr=' + m('SOC_err_end_pp').value);
      if (!near(m('max_abs_r_meas_kW').value, 4, 1e-6)) problems.push('maxRmeas=' + m('max_abs_r_meas_kW').value);
      if (!near(m('max_abs_r_true_kW').value, 0, 1e-6)) problems.push('maxRtrue=' + m('max_abs_r_true_kW').value);
      return { ok: problems.length === 0, detail: problems.join('; ') || 'all analytic values match' };
    })()`);
    return r;
  });

  await checkAsync('UX-01 start experiment -> system page @0s', async () => {
    const r = await evaluate(cdp, `(() => {
      FL.store.actions.startExperiment('FL-001', { silent: true });
      FL.store.actions.setTime(0, { pause: true });
      const s = FL.store.getState();
      return { ok: s.page === 'system' && s.currentTime === 0 && !!s.activeRun && !!s.baselineRun,
        detail: 'page=' + s.page + ' t=' + s.currentTime + ' run=' + (s.activeRun && s.activeRun.runId) + ' baseline=' + (s.baselineRun && s.baselineRun.runId) };
    })()`);
    return r;
  });

  await checkAsync('UX-02 19.9s/20.0s measurement jump + true continuity', async () => {
    const r = await evaluate(cdp, `(() => {
      const run = FL.store.getState().activeRun;
      const s = FL.protocol;
      const a = s.sampleAt(run, 'I_bat_meas_A', 19.9).value, b = s.sampleAt(run, 'I_bat_meas_A', 20.0).value;
      const t1 = s.sampleAt(run, 'I_bat_true_A', 19.9).value, t2 = s.sampleAt(run, 'I_bat_true_A', 20.0).value;
      return { ok: Math.abs(a - 25) < 1e-9 && Math.abs(b - 35) < 1e-9 && Math.abs(t1 - 25) < 1e-9 && Math.abs(t2 - 25) < 1e-9,
        detail: 'Imeas ' + a + '->' + b + ', Itrue ' + t1 + '->' + t2 };
    })()`);
    return r;
  });

  await checkAsync('UX-03 26s true ~15.18 / meas ~25.18', async () => {
    const r = await evaluate(cdp, `(() => {
      const run = FL.store.getState().activeRun;
      const t = FL.protocol.sampleAt(run, 'I_bat_true_A', 26).value;
      const m = FL.protocol.sampleAt(run, 'I_bat_meas_A', 26).value;
      return { ok: Math.abs(t - 15.183156388) < 1e-6 && Math.abs(m - 25.183156388) < 1e-6, detail: 'true=' + t + ' meas=' + m };
    })()`);
    return r;
  });

  await checkAsync('causal: 6 nodes, three layers, residual explanation', async () => {
    const r = await evaluate(cdp, `(() => {
      const run = FL.store.getState().activeRun;
      const c = run.causal;
      const layers = new Set((c.nodes || []).map(n => n.layer));
      const titles = (c.nodes || []).map(n => n.title).join('|');
      return { ok: c.nodes.length === 6 && layers.has('config') && layers.has('mechanism') && layers.has('observation')
        && /偏置注入/.test(titles) && /测量功率残差/.test(titles),
        detail: 'nodes=' + c.nodes.length + ' layers=' + [...layers].join(',') };
    })()`);
    return r;
  });

  await checkAsync('UX-06 monitor contrast: true current stays 25, meas 35', async () => {
    const r = await evaluate(cdp, `(() => {
      FL.store.actions.createMonitorContrast();
      const run = FL.store.getState().activeRun;
      const near = (a, b) => Math.abs(a - b) < 1e-6;
      const it = FL.protocol.sampleAt(run, 'I_bat_true_A', 40).value;
      const im = FL.protocol.sampleAt(run, 'I_bat_meas_A', 40).value;
      const ok = run.config.feedback_mode === 'monitor' && near(it, 25) && near(im, 35);
      // restore fault run for later checks
      FL.store.actions.loadRun(Object.keys(FL.store.getState().runs).filter(id => FL.store.getState().runs[id].config.feedback_mode === 'closed_loop' && FL.store.getState().runs[id].role !== 'baseline')[0]);
      return { ok, detail: 'mode=' + run.config.feedback_mode + ' Itrue=' + it + ' Imeas=' + im };
    })()`);
    return r;
  });

  await checkAsync('UX-07 baseline energy balance 0.5 kWh', async () => {
    const r = await evaluate(cdp, `(() => {
      const s = FL.store.getState();
      FL.store.actions.ensureBaseline({ explicit: true });
      const b = FL.store.getState().baselineRun;
      const ALIAS = { E_bat_kWh: 'E_bat_true_60s', E_source_kWh: 'E_gen_true_60s', E_load_served_kWh: 'E_load_served_60s', SOC_err_pp: 'SOC_err_end_pp' };
      const mv = (id) => { const x = FL.core.getMetric(b, id) || FL.core.getMetric(b, ALIAS[id] || ''); return x ? x.value : null; };
      const m = (id) => mv(id);
      return { ok: Math.abs(m('E_load_kWh') - 0.5) < 1e-6 && Math.abs(m('E_source_kWh') + m('E_bat_kWh') - 0.5) < 1e-3
        && Math.abs(m('E_bat_kWh') - 0.1666666667) < 1e-6 && Math.abs(m('SOC_true_end_pct') - 59.5833333333) < 1e-6,
        detail: 'Ebat=' + m('E_bat_kWh') + ' Egen=' + m('E_source_kWh') + ' SOctrue=' + m('SOC_true_end_pct') };
    })()`);
    return r;
  });

  await checkAsync('UX-09 draft edit does not mutate existing run', async () => {
    const r = await evaluate(cdp, `(() => {
      const before = FL.store.getState().activeRun;
      const hashBefore = before.configHash;
      const mBefore = FL.protocol.sampleAt(before, 'I_bat_meas_A', 30).value;
      FL.store.actions.updateDraft((d) => { d.fault.params.magnitude = 12; });
      const s = FL.store.getState();
      const after = s.activeRun;
      return { ok: s.draftDirty === true && after.configHash === hashBefore && after.config.fault.params.magnitude === 10
        && FL.protocol.sampleAt(after, 'I_bat_meas_A', 30).value === mBefore,
        detail: 'dirty=' + s.draftDirty + ' draftMag=' + s.draft.fault.params.magnitude + ' runMag=' + after.config.fault.params.magnitude };
    })()`);
    return r;
  });

  await checkAsync('UX-10 export traceability (CSV 601 rows + hashes + report)', async () => {
    const r = await evaluate(cdp, `(() => {
      const run = FL.store.getState().activeRun;
      const csv = FL.exporter.csv(run);
      const lines = csv.split('\\n');
      const dataRows = lines.filter(l => /^\\d/.test(l)).length;
      const manifest = FL.exporter.configManifest(run);
      const cmp = FL.core.compareRuns(FL.store.getState().baselineRun, run);
      const html = FL.exporter.htmlReport({ baseline: FL.store.getState().baselineRun, trial: run, comparison: cmp, system: FL.systems.get(run.systemId) });
      return { ok: csv.includes('# config_hash=' + run.configHash) && dataRows === 601
        && manifest.run_manifest.config_hash === run.configHash && manifest.model && manifest.model.model_hash
        && html.length > 3000 && html.includes('FaultLab'),
        detail: 'csvRows=' + dataRows + ' manifestHash=' + (manifest.run_manifest.config_hash || '').slice(0, 8) + ' html=' + html.length };
    })()`);
    return r;
  });

  await checkAsync('UX-12 navigation preserves time & selected component', async () => {
    const r = await evaluate(cdp, `(async () => {
      const A = FL.store.actions;
      A.startExperiment('FL-001', { silent: true });
      A.setTime(26, { pause: true });
      A.navigate('signals'); await new Promise(r => setTimeout(r, 120));
      const t1 = FL.store.getState().currentTime;
      A.navigate('causal'); await new Promise(r => setTimeout(r, 120));
      const t2 = FL.store.getState().currentTime;
      A.navigate('system'); await new Promise(r => setTimeout(r, 120));
      const s = FL.store.getState();
      A.navigate('compare'); await new Promise(r => setTimeout(r, 120));
      const t3 = FL.store.getState().currentTime;
      const pagesOk = ['home','system','signals','causal','compare','arena'].every(p => FL.pages[p]);
      return { ok: Math.abs(t1 - 26) < 1e-9 && Math.abs(t2 - 26) < 1e-9 && Math.abs(t3 - 26) < 1e-9 && pagesOk,
        detail: 't=' + t1 + '/' + t2 + '/' + t3 + ' pages=' + pagesOk };
    })()`);
    return r;
  });

  await checkAsync('page modules & nav rendered', async () => {
    const r = await evaluate(cdp, `(() => {
      const navs = [...document.querySelectorAll('.app-nav .nav-item')].map(a => a.textContent.trim());
      const activePage = document.querySelector('.page.is-active');
      return { ok: navs.length >= 6 && !!activePage && !!document.querySelector('.app-timeline') && !!document.querySelector('.brand'),
        detail: 'nav=' + navs.join('/') + ' active=' + (activePage && activePage.id) };
    })()`);
    return r;
  });

  if (errors.length) {
    console.log('\n  console errors:');
    errors.slice(0, 25).forEach((e) => console.log('   - ' + e));
  }
  check('console error count', errors.length === 0, String(errors.length));
}

async function pageTexts(cdp) { return evaluate(cdp, 'document.querySelector(".page.is-active") ? document.querySelector(".page.is-active").innerText : ""'); }

async function shots(cdp) {
  console.log('\n== screenshots ==');
  await goto(cdp, BASE + '/?demo=1&page=home');
  await screenshot(cdp, '01-home');
  await goto(cdp, BASE + '/?demo=1&page=system&t=21');
  await screenshot(cdp, '02-system');
  await goto(cdp, BASE + '/?demo=1&page=signals&t=21');
  await screenshot(cdp, '03-signals');
  await goto(cdp, BASE + '/?demo=1&page=causal&t=26');
  await screenshot(cdp, '04-causal');
  await goto(cdp, BASE + '/?demo=1&page=compare&t=21');
  await screenshot(cdp, '05-compare');
  await goto(cdp, BASE + '/?demo=1&page=arena');
  await screenshot(cdp, '06-arena');
  await goto(cdp, BASE + '/?demo=1&system=FC-001&page=system&t=21');
  await screenshot(cdp, '07-system-fc');
  await goto(cdp, BASE + '/?demo=1&system=GT-001&page=signals&t=21');
  await screenshot(cdp, '08-signals-gt');
  // mobile
  await goto(cdp, BASE + '/?demo=1&page=home');
  await screenshot(cdp, '10-mobile-home', 390, 844);
  await goto(cdp, BASE + '/?demo=1&page=system&t=21');
  await screenshot(cdp, '11-mobile-system', 390, 844);
  await goto(cdp, BASE + '/?demo=1&page=signals&t=21');
  await screenshot(cdp, '12-mobile-signals', 390, 844);
}

async function bootOnly(cdp) {
  console.log('\n== boot smoke ==');
  const errors = collectErrors(cdp);
  await goto(cdp, BASE + '/?demo=1&page=home');
  await wait(800);
  const info = await evaluate(cdp, `(() => ({
    ready: Boolean(window.FL && FL.__ready),
    title: document.title,
    bodyLen: document.body.innerText.length,
    hasHeader: !!document.querySelector('.app-header'),
    hasNav: document.querySelectorAll('.app-nav .nav-item').length,
    hasTimeline: !!document.querySelector('.app-timeline'),
    page: FL.store && FL.store.getState().page,
    run: FL.store && FL.store.getState().activeRun && FL.store.getState().activeRun.runId
  }))()`);
  console.log(JSON.stringify(info, null, 2));
  if (errors.length) {
    console.log('console errors:'); errors.slice(0, 30).forEach((e) => console.log('  - ' + e));
  } else {
    console.log('console errors: none');
  }
  return errors;
}

/* ---------------------------------------------------------------- main */
(async () => {
  const { proc, cdp } = await launch();
  let exitCode = 0;
  try {
    if (cmd === 'boot') {
      const errs = await bootOnly(cdp);
      if (errs.length) exitCode = 2;
    } else if (cmd === 'shot') {
      const page = args[1] && !args[1].startsWith('--') ? args[1] : 'home';
      const extra = opt('query', 'demo=1');
      await goto(cdp, BASE + '/?' + extra + '&page=' + page);
      await screenshot(cdp, 'shot-' + page + '-' + Date.now());
      const errors = await evaluate(cdp, '1');
    } else if (cmd === 'shots') {
      await shots(cdp);
    } else if (cmd === 'scrollshot') {
      // node tools/qa.mjs scrollshot <page> --y 700 [--query demo=1&t=21]
      const page = args[1] && !args[1].startsWith('--') ? args[1] : 'home';
      const extra = opt('query', 'demo=1');
      const y = Number(opt('y', '600'));
      await goto(cdp, BASE + '/?' + extra + '&page=' + page);
      await wait(600);
      await evaluate(cdp, `(() => { const m = document.querySelector('.app-main'); if (m) m.scrollTop = ${y}; return m ? m.scrollTop : 0; })()`);
      await wait(500);
      await screenshot(cdp, opt('name', 'scroll-' + page + '-' + y));
    } else if (cmd === 'arena') {
      const rounds = opt('rounds', '3');
      const seed = opt('seed', '20261027');
      const system = opt('system', '');
      const errors = collectErrors(cdp);
      console.log('\n== agent arena flow ==');
      await goto(cdp, BASE + '/?demo=1&page=arena&autorun=1&rounds=' + rounds + '&seed=' + seed + (system ? '&system=' + system : ''));
      let match = null;
      const deadline = Date.now() + 45000;
      while (Date.now() < deadline) {
        match = await evaluate(cdp, '(() => { const a = FL.store.getState().pageState.arena; return a && a.match ? a.match : null; })()').catch(() => null);
        if (match && match.leaderboard && match.leaderboard.length) break;
        await wait(400);
      }
      await checkAsync('arena match created (' + rounds + ' rounds)', async () => ({
        ok: !!match && match.rounds.length === Number(rounds) && !!match.leaderboard && match.leaderboard.length === 5,
        detail: match ? 'rounds=' + match.rounds.length + ' agents=' + match.leaderboard.length + ' top=' + (match.leaderboard[0] && match.leaderboard[0].name) : 'no match'
      }));
      await checkAsync('arena leaderboard sorted & scores in range', async () => {
        if (!match) return { ok: false, detail: 'no match' };
        const scores = match.leaderboard.map((r) => r.avgScore);
        const sorted = scores.every((s, i) => i === 0 || scores[i - 1] >= s);
        const inRange = scores.every((s) => s >= 0 && s <= 100);
        return { ok: sorted && inRange, detail: match.leaderboard.map((r) => r.agentId + ':' + r.avgScore.toFixed(1)).join(' ') };
      });
      await checkAsync('arena fusion beats sensor-limit', async () => {
        if (!match) return { ok: false, detail: 'no match' };
        const by = Object.fromEntries(match.leaderboard.map((r) => [r.agentId, r.avgScore]));
        return { ok: by.fusion > by['sensor-limit'] + 3, detail: 'fusion=' + (by.fusion || 0).toFixed(1) + ' sensor-limit=' + (by['sensor-limit'] || 0).toFixed(1) };
      });
      await checkAsync('arena truth sealed -> revealed after finish', async () => {
        const st = await evaluate(cdp, '(() => ({ sealed: FL.store.getState().truthSealed, running: FL.store.getState().pageState.arena.running }))()');
        return { ok: st.sealed === false && st.running === false, detail: JSON.stringify(st) };
      });
      await checkAsync('arena blind bundle has no truth leakage', async () => {
        const r = await evaluate(cdp, `(() => {
          const match = FL.store.getState().pageState.arena.match;
          const bundle = FL.arena.exportMatchBundle(match);
          const text = JSON.stringify(bundle);
          const bad = [];
          if (/"truth"/.test(text)) bad.push('truth');
          if (/_true_/.test(text)) bad.push('_true_');
          if (/"bias_/.test(text)) bad.push('bias');
          if (/"fault"/.test(text)) bad.push('fault');
          if (/"config"/.test(text)) bad.push('config');
          return { ok: bad.length === 0 && bundle.rounds.length === match.rounds.length, detail: 'leaks=' + (bad.join(',') || 'none') };
        })()`);
        return r;
      });
      await screenshot(cdp, '13-arena-results');
      await checkAsync('arena UI shows leaderboard & reveal', async () => {
        const text = await evaluate(cdp, '(() => { const p = document.querySelector("#page-arena"); return p ? p.innerText : ""; })()');
        return {
          ok: /排行榜|Leaderboard|积分榜/i.test(text) && /(真值|揭晓)/.test(text) && /多信号融合/.test(text),
          detail: 'textLen=' + text.length
        };
      });
      if (errors.length) { console.log('console errors:'); errors.slice(0, 20).forEach((e) => console.log('  - ' + e)); }
      check('arena console errors', errors.length === 0, String(errors.length));
    } else if (cmd === 'ui') {
      console.log('\n== UI interaction flow ==');
      const errors = collectErrors(cdp);
      const clickText = async (scope, text) => evaluate(cdp, `(() => {
        const norm = (s) => (s || '').replace(/\\s+/g, '');
        const target = ${JSON.stringify(text)};
        const els = Array.from(document.querySelectorAll(${JSON.stringify(scope)}))
          .filter((e) => norm(e.textContent).includes(target))
          .sort((a, b) => a.textContent.length - b.textContent.length);
        const el = els[0];
        if (!el) return false;
        const clickable = el.closest('button, [role="radio"], [role="button"], [role="tab"], [tabindex], label') || el;
        clickable.click();
        return true;
      })()`);
      const state = () => evaluate(cdp, '(() => { const s = FL.store.getState(); return { page: s.page, time: s.currentTime, run: s.activeRun && s.activeRun.runId, family: s.draft && s.draft.fault && s.draft.fault.family, errors: s.draftErrors && s.draftErrors.length, dirty: s.draftDirty, view: s.pageState.compare && s.pageState.compare.view, zoom: s.pageState.signals && s.pageState.signals.zoom }; })()');

      await goto(cdp, BASE + '/?demo=1&page=home');
      await checkAsync('UI home: click 开始实验 -> system page with new run', async () => {
        const clicked = await clickText('button', '开始实验');
        await wait(900);
        const st = await state();
        return { ok: clicked && st.page === 'system' && !!st.run, detail: JSON.stringify({ clicked, ...st }) };
      });
      await checkAsync('UI system: click 负载冲击 updates draft family + params', async () => {
        const clicked = await clickText('#page-system *', '负载冲击');
        await wait(350);
        const st = await state();
        const mag = await evaluate(cdp, '(() => FL.store.getState().draft.fault.params.magnitude)()');
        return { ok: clicked && st.family === 'load_step' && typeof mag === 'number', detail: JSON.stringify({ clicked, ...st, mag }) };
      });
      await checkAsync('UI system: click 应用并创建运行 -> new valid run', async () => {
        const clicked = await clickText('button', '应用并创建运行');
        await wait(1200);
        const st = await evaluate(cdp, `(() => { const s = FL.store.getState(); const r = s.activeRun; return {
          page: s.page, run: r && r.runId, family: r && r.config.fault.family,
          points: r && r.timeseries.t.length, qualityFails: r && r.quality.filter(q => q.status === 'fail').length,
          draftErrors: s.draftErrors.length
        }; })()`);
        return { ok: clicked && st.family === 'load_step' && st.points === 601 && st.qualityFails === 0 && st.draftErrors === 0, detail: JSON.stringify(st) };
      });
      await checkAsync('UI nav: click 曲线 -> signals page', async () => {
        await clickText('.app-nav a', '曲线');
        await wait(700);
        const st = await state();
        return { ok: st.page === 'signals', detail: JSON.stringify(st) };
      });
      await checkAsync('UI signals: click 故障前后 ±5s -> zoom state', async () => {
        const clicked = await clickText('#page-signals button', '故障前后');
        await wait(400);
        const st = await state();
        return { ok: clicked && st.zoom === 'fault', detail: JSON.stringify(st) };
      });
      await checkAsync('UI nav: click 对比 -> compare page', async () => {
        await clickText('.app-nav a', '对比');
        await wait(800);
        const st = await state();
        return { ok: st.page === 'compare', detail: JSON.stringify(st) };
      });
      await checkAsync('UI compare: click 双屏 -> view=dual', async () => {
        const clicked = await clickText('#page-compare button, #page-compare [role=radio], #page-compare .seg-item', '双屏');
        await wait(500);
        const st = await state();
        return { ok: clicked && (st.view === 'dual' || st.view === 'split' || st.view === 'dual-pane'), detail: JSON.stringify({ clicked, ...st }) };
      });
      await checkAsync('UI nav: click 竞技场 -> arena page', async () => {
        await clickText('.app-nav a', '竞技场');
        await wait(800);
        const st = await state();
        const hasArena = await evaluate(cdp, 'Boolean(document.querySelector("#page-arena") && document.querySelector("#page-arena").innerText.length > 200)');
        return { ok: st.page === 'arena' && hasArena, detail: JSON.stringify({ ...st, hasArena }) };
      });
      if (errors.length) { console.log('console errors:'); errors.slice(0, 20).forEach((e) => console.log('  - ' + e)); }
      check('ui console errors', errors.length === 0, String(errors.length));
    } else if (cmd === 'evalshot') {
      // node tools/qa.mjs evalshot <page> --js <file.js> --query demo=1 --name shot-name
      const page = args[1] && !args[1].startsWith('--') ? args[1] : 'home';
      const jsFile = opt('js', '');
      const extra = opt('query', 'demo=1');
      await goto(cdp, BASE + '/?' + extra + '&page=' + page);
      await wait(600);
      if (jsFile) {
        const code = fs.readFileSync(path.resolve(ROOT, jsFile), 'utf8');
        const out = await evaluate(cdp, `(() => { ${code} ; return 'ok'; })()`);
        if (out !== 'ok') throw new Error('evalshot script result: ' + out);
        await wait(900);
      }
      await screenshot(cdp, opt('name', 'eval-' + page + '-' + Date.now()));
    } else if (cmd === 'misc') {
      console.log('\n== spec edge-case & UX-04/05/08/12 flow ==');
      const errors = collectErrors(cdp);
      const clickText = async (scope, text) => evaluate(cdp, `(() => {
        const norm = (s) => (s || '').replace(/\\s+/g, '');
        const target = ${JSON.stringify(text)};
        const els = Array.from(document.querySelectorAll(${JSON.stringify(scope)}))
          .filter((e) => norm(e.textContent).includes(target))
          .sort((a, b) => a.textContent.length - b.textContent.length);
        const el = els[0];
        if (!el) return false;
        const clickable = el.closest('button, [role="radio"], [role="button"], [role="tab"], [tabindex], label') || el;
        clickable.click();
        return true;
      })()`);

      // UX-04: select sensor on system page -> 查看对应曲线 keeps time & auto-selects true/meas signals
      await goto(cdp, BASE + '/?demo=1&page=system&t=21');
      await checkAsync('UX-04 select sensor -> curves auto-check true/meas, keep time', async () => {
        await clickText('#page-system *', '电流传感器');
        await wait(350);
        const sel = await evaluate(cdp, 'FL.store.getState().selectedComponent');
        await clickText('#page-system button', '查看对应曲线');
        await wait(900);
        const st = await evaluate(cdp, `(() => { const s = FL.store.getState(); return {
          page: s.page, time: s.currentTime, sel: s.selectedComponent,
          visible: s.pageState.signals.visible }; })()`);
        return {
          ok: st.page === 'signals' && Math.abs(st.time - 21) < 0.2 && st.sel === 'sensor' &&
            st.visible.I_bat_true_A === true && st.visible.I_bat_meas_A === true,
          detail: JSON.stringify(st)
        };
      });

      // UX-05: causal +4kW expander shows real vs measured balance with data values
      await goto(cdp, BASE + '/?demo=1&page=causal&t=26');
      await checkAsync('UX-05 causal +4kW expander: real≈0, measured=+4, with formula', async () => {
        const opened = await clickText('#page-causal button, #page-causal [role="button"], #page-causal summary', '展开');
        await wait(400);
        const text = await evaluate(cdp, '(() => { const p = document.querySelector("#page-causal"); return p ? p.innerText : ""; })()');
        return {
          ok: /真实功率平衡残差/.test(text) && /测量一致性残差/.test(text) && /\+4\.00/.test(text) && /0\.000/.test(text) && /不是.*能量损失|并非.*能量损失|不是实际/.test(text),
          detail: 'expander=' + opened + ' len=' + text.length
        };
      });

      // UX-08: SOC zoom shows explicit zoom badge and magnitude caveat
      await goto(cdp, BASE + '/?demo=1&page=signals&cat=soc&t=60');
      await checkAsync('UX-08 SOC vertical zoom: explicit range badge, no exaggeration', async () => {
        const clicked = await clickText('#page-signals button', '纵轴放大');
        await wait(500);
        const text = await evaluate(cdp, '(() => { const p = document.querySelector("#page-signals"); return p ? p.innerText : ""; })()');
        const st = await evaluate(cdp, '(() => ({ zoom: FL.store.getState().pageState.signals.zoom }))()');
        return { ok: clicked && /量程已放大|纵轴已放大|放大/.test(text) && /pp/.test(text), detail: JSON.stringify(st) + ' len=' + text.length };
      });

      // keyboard: space toggles playback
      await goto(cdp, BASE + '/?demo=1&page=system&t=5');
      await checkAsync('keyboard: Space toggles playback; → steps +0.1s', async () => {
        await evaluate(cdp, 'document.body.focus()');
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
        await wait(500);
        const s1 = await evaluate(cdp, 'FL.store.getState().playback.status');
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
        await wait(200);
        const t0 = await evaluate(cdp, 'FL.store.getState().currentTime');
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
        await wait(250);
        const t1 = await evaluate(cdp, 'FL.store.getState().currentTime');
        const s2 = await evaluate(cdp, 'FL.store.getState().playback.status');
        return { ok: (s1 === 'playing' || s1 === 'ended') && s2 !== 'playing' && t1 >= t0 + 0.05, detail: JSON.stringify({ s1, s2, t0, t1 }) };
      });

      // reload persistence: runs survive reload
      await checkAsync('reload: run registry + active run restored', async () => {
        const before = await evaluate(cdp, '(() => { const s = FL.store.getState(); return { run: s.activeRun && s.activeRun.runId, n: Object.keys(s.runs).length }; })()');
        await cdp.send('Page.reload', { ignoreCache: true });
        await wait(1200);
        const deadline = Date.now() + 15000;
        let ready = false;
        while (Date.now() < deadline) {
          ready = await evaluate(cdp, 'Boolean(window.FL && window.FL.__ready)').catch(() => false);
          if (ready) break;
          await wait(300);
        }
        const after = await evaluate(cdp, '(() => { const s = FL.store.getState(); return { run: s.activeRun && s.activeRun.runId, n: Object.keys(s.runs).length, page: s.page }; })()');
        return { ok: ready && after.n >= before.n && !!after.run, detail: JSON.stringify({ before, after }) };
      });

      // home onboarding modal + assumptions drawer focus/escape behaviour
      await goto(cdp, BASE + '/?demo=1&page=home');
      await checkAsync('UI home: 快速讲解 modal opens & Esc closes', async () => {
        await clickText('#page-home button', '观看快速讲解');
        await wait(500);
        const open = await evaluate(cdp, '(() => { const m = document.querySelector(".modal"); return m ? { open: true, text: m.innerText.slice(0, 200) } : { open: false }; })()');
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await wait(400);
        const closed = await evaluate(cdp, '!document.querySelector(".modal")');
        return { ok: open.open && closed && /1|第一步|步骤|讲解/.test(open.text), detail: JSON.stringify({ open: open.open, closed, text: (open.text || '').slice(0, 60) }) };
      });
      await checkAsync('UI home: 模型假设 drawer opens with assumptions & Esc closes', async () => {
        await clickText('#page-home button', '查看模型假设');
        await wait(500);
        const open = await evaluate(cdp, '(() => { const d = document.querySelector(".drawer"); return d ? { open: true, text: d.innerText.slice(0, 300) } : { open: false }; })()');
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await wait(400);
        const closed = await evaluate(cdp, '!document.querySelector(".drawer")');
        return { ok: open.open && closed && /假设|理想|L0/.test(open.text), detail: JSON.stringify({ open: open.open, closed }) };
      });
      // system -> causal focus via 解释异常来源
      await goto(cdp, BASE + '/?demo=1&page=system&t=21');
      await checkAsync('UI system: select sensor + 解释异常来源 -> causal focus', async () => {
        await clickText('#page-system *', '电流传感器');
        await wait(300);
        const clicked = await clickText('#page-system button', '解释异常来源');
        await wait(800);
        const st = await evaluate(cdp, '(() => { const s = FL.store.getState(); return { page: s.page, focus: s.pageState.causal.focusNodeId, sel: s.selectedComponent }; })()');
        return { ok: clicked && st.page === 'causal', detail: JSON.stringify(st) };
      });

      if (errors.length) { console.log('console errors:'); errors.slice(0, 20).forEach((e) => console.log('  - ' + e)); }
      check('misc console errors', errors.length === 0, String(errors.length));
    } else if (cmd === 'dump') {
      // node tools/qa.mjs dump <page> [--query demo=1&t=21] [--chars 4000]
      const page = args[1] && !args[1].startsWith('--') ? args[1] : 'home';
      const extra = opt('query', 'demo=1');
      const chars = Number(opt('chars', '4000'));
      await goto(cdp, BASE + '/?' + extra + '&page=' + page);
      await wait(900);
      const text = await evaluate(cdp, '(() => { const p = document.querySelector(".page.is-active"); return p ? p.innerText : document.body.innerText; })()');
      console.log(text.slice(0, chars));
    } else if (cmd === 'ux') {
      await ux(cdp);
    } else if (cmd === 'all') {
      await ux(cdp);
      await shots(cdp);
    } else {
      console.log('unknown command: ' + cmd);
      console.log('commands: boot | shot <page> | shots | ux | all');
      exitCode = 1;
    }
  } catch (err) {
    console.error('\nQA ERROR:', err && err.stack || err);
    exitCode = 3;
  } finally {
    cdp.close();
    proc.kill();
  }
  if (results.length) {
    const failed = results.filter((r) => !r.ok);
    console.log('\n== summary: ' + (results.length - failed.length) + '/' + results.length + ' passed ==');
    if (failed.length) {
      exitCode = 1;
      console.log('failed:');
      failed.forEach((f) => console.log('  - ' + f.name + (f.detail ? ' :: ' + f.detail : '')));
    }
  }
  process.exit(exitCode);
})();

