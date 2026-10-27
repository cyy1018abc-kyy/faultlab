/**
 * FaultLab E2E — headless Chrome via CDP, zero dependencies（G2 四件套②，P0a-06/07）。
 *
 * 用法：
 *   node tools/e2e.mjs                     # 自起静态服务器 + Chrome，跑 fl001-min 旅程
 *   node tools/e2e.mjs --journey fl001-min # 同上（显式旅程名）
 *   node tools/e2e.mjs --base <url>        # 复用已运行的服务器
 *
 * 覆盖（对应 MODEL_VALIDATION_SPEC §10.1 ② + BACKLOG P0a-06/07 DoD）：
 *   E-01 启动、demo 自动建 Run、FL-001 范围守卫；
 *   E-02 五视图 hash 深链可达、跨页共享 Run；
 *   E-03 事件 pre/post：pre.t_s=20.0/left_limit，post I_meas=35；曲线数据 20.0 行=post；
 *   E-04 单一时钟：跨页游标保持；播放/暂停前后 Run 数据与 run_hash 不变（PHY-08/SA-22 冒烟）；
 *   E-05 指标与 golden 关键值一致（E_bat_true_60s ±1e-6 kWh）；
 *   E-06 因果证据链：六节点、evidence 带 rule_id/time_window_s（I-08 最小版）；
 *   E-07 EvidenceBundle v1 在浏览器内构建→导入→run_hash 一致；
 *   E-08 全程无 console error、无外部网络请求（纯浏览器离线）。
 *
 * 退出码：0=全部通过；1=存在失败项。报告写 artifacts/e2e-report.json。
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
function opt(name, dflt) {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
}
const JOURNEY = opt('journey', 'fl001-min');
const PORT = Number(opt('port', '4319'));
const CDP_PORT = Number(opt('cdp-port', '9339'));
const BASE = opt('base', '');
const OUT = path.resolve(ROOT, opt('out', 'artifacts'));
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
  throw new Error('Chrome/Edge 未找到；用 --chrome <path> 指定');
}

/* ---------------------------------------------------------------- CDP */
class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.listeners = [];
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = () => reject(new Error('ws error'));
    });
    this.ws.onmessage = (ev) => {
      if (process.env.E2E_DEBUG) console.log('[frame]', typeof ev.data, String(typeof ev.data === 'string' ? ev.data : '(binary)').slice(0, 140));
      let msg;
      try { msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ''); } catch { return; }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
        return;
      }
      if (msg.method) this.listeners.forEach((fn) => { try { fn(msg); } catch { /* ignore */ } });
    };
  }
  on(method, fn) {
    this.listeners.push((msg) => { if (msg.method === method) fn(msg.params); });
  }
  send(method, params = {}) {
    const id = ++this.id;
    /* 30 s 防挂起：导航竞态可能吞掉 CDP 响应，超时即失败重试由调用方处理 */
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('CDP 超时：' + method));
      }, 30000);
      this.pending.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject: (e) => { clearTimeout(timer); reject(e); }
      });
      const payload = { id, method, params };
      if (this.sessionId) payload.sessionId = this.sessionId;
      if (process.env.E2E_DEBUG) console.log('[send]', id, method, this.sessionId ? '(routed ' + this.sessionId.slice(0, 8) + ')' : '(browser)');
      this.ws.send(JSON.stringify(payload));
    });
  }
  async evalExpr(expr) {
    const res = await this.send('Runtime.evaluate', {
      expression: expr, returnByValue: true, awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error('页面表达式错误: ' + JSON.stringify(res.exceptionDetails).slice(0, 300));
    }
    return res.result.value;
  }
  close() { try { this.ws.close(); } catch { /* ignore */ } }
}

async function discoverWs(port) {
  /* 浏览器级端点（/json/version）：Edge 的初始页 target 会话可能无响应，
     统一走 browser WS + Target.createTarget + flatten 会话路由（对 Chrome 同样标准）。 */
  for (let i = 0; i < 40; i++) {
    try {
      const txt = await new Promise((resolve, reject) => {
        http.get({ host: '127.0.0.1', port, path: '/json/version' }, (res) => {
          let d = '';
          res.on('data', (c) => { d += c; });
          res.on('end', () => resolve(d));
        }).on('error', reject);
      });
      const wsUrl = JSON.parse(txt).webSocketDebuggerUrl;
      if (wsUrl) return wsUrl;
    } catch { /* retry */ }
    await wait(250);
  }
  throw new Error('CDP 浏览器端点发现超时');
}

function startServer() {
  return spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
    cwd: ROOT, stdio: 'ignore'
  });
}

/* ------------------------------------------------------------- journey */
let pass = 0;
let fail = 0;
const failures = [];
const consoleErrors = [];
const externalRequests = [];
function ok(cond, name, detail) {
  if (cond) pass++;
  else { fail++; failures.push({ name, detail: detail || '条件为假' }); }
}
function eq(a, b, name) { ok(a === b, name, 'expected ' + JSON.stringify(b) + '，actual ' + JSON.stringify(a)); }
function close(a, b, tol, name) {
  ok(typeof a === 'number' && isFinite(a) && Math.abs(a - b) <= tol, name,
    'expected ' + b + ' ±' + tol + '，actual ' + a);
}

const PAGES = ['home', 'system', 'signals', 'causal', 'compare'];

async function main() {
  const server = BASE ? null : startServer();
  const base = BASE || ('http://127.0.0.1:' + PORT);
  let chrome = null;
  let cdp = null;
  try {
    await new Promise((resolve, reject) => {
      const probe = () => http.get(base + '/index.html', (res) => { res.resume(); resolve(); }).on('error', reject);
      setTimeout(probe, 700);
    });

    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'faultlab-e2e-'));
    chrome = spawn(CHROME, [
      '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
      '--disable-component-update', '--disable-sync', '--disable-client-side-phishing-detection', '--disable-extensions',
      '--disable-features=OptimizationGuideModelDownloading,OptimizationHintsFetching,OptimizationTargetPrediction',
      '--remote-debugging-port=' + CDP_PORT, '--user-data-dir=' + profile,
      'about:blank'
    ], { stdio: 'ignore' });
    const wsUrl = await discoverWs(CDP_PORT);
    cdp = new Cdp(wsUrl);
    await cdp.ready;
    /* Edge 无头模式的页面会话存在启动期抖动（初始页 agent 可能无响应）：
       新建 target + attach 是已验证可靠的模式；enable 失败则换新 target 重试（≤3 轮）。 */
    let lastErr = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const created = await cdp.send('Target.createTarget', { url: 'about:blank' });
      const attached = await cdp.send('Target.attachToTarget', { targetId: created.targetId, flatten: true });
      cdp.sessionId = attached.sessionId;
      try {
        await cdp.send('Runtime.enable');
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        if (attempt < 3) await wait(1500);
      }
    }
    if (lastErr) throw lastErr;
    await cdp.send('Page.enable');
    await cdp.send('Network.enable');
    cdp.on('Runtime.consoleAPICalled', (p) => {
      if (p.type === 'error') consoleErrors.push(p.args.map((a) => a.value || a.description || '').join(' '));
    });
    cdp.on('Network.requestWillBeSent', (p) => {
      /* 只统计页面资源（Document/Script/Stylesheet/Image/Fetch/XHR/Font/Manifest）；
         Chrome 自身遥测（type=Other）不计入离线判定 */
      const pageTypes = ['Document', 'Script', 'Stylesheet', 'Image', 'Fetch', 'XHR', 'Font', 'Manifest'];
      const url = p.request.url;
      const isLocal = /^data:/.test(url) || /127\.0\.0\.1|localhost/.test(url) || /^blob:/.test(url);
      if (pageTypes.indexOf(p.type) !== -1 && !isLocal) {
        externalRequests.push(p.type + ' ' + url);
      }
    });

    /* E-01 启动（demo=1 自动创建默认故障 Run + baseline；reset=1 清空历史） */
    await cdp.send('Page.navigate', { url: base + '/index.html?demo=1&reset=1&page=home' });
    await wait(1600);
    const boot = await cdp.evalExpr(`(function(){
      const s = FL.store.getState();
      return { booted: s.booted, page: s.page, hasRun: !!s.activeRun, systemId: s.systemId,
               runId: s.activeRun && s.activeRun.runId };
    })()`);
    eq(boot.booted, true, 'E-01：应用启动 booted');
    eq(boot.hasRun, true, 'E-01：demo 启动已创建 activeRun');
    eq(boot.systemId, 'FL-001', 'E-01：系统为 FL-001（P0 范围守卫）');

    /* E-02 五视图深链 + 跨页共享 Run */
    for (const p of PAGES) {
      await cdp.send('Page.navigate', { url: base + '/index.html?page=' + p });
      await wait(450);
      const st = await cdp.evalExpr(`(function(){
        const s = FL.store.getState();
        return { page: s.page, runId: s.activeRun && s.activeRun.runId };
      })()`);
      eq(st.page, p, 'E-02：视图深链 ' + p);
      eq(st.runId, boot.runId, 'E-02：' + p + ' 共享同一 Run（跨页状态）');
    }

    /* E-03 事件 pre/post 契约（页面上下文） */
    const evState = await cdp.evalExpr(`(function(){
      const r = FL.store.getState().activeRun;
      const pre = r.snapshots.filter(s => s.phase === 'pre')[0];
      const post = r.snapshots.filter(s => s.phase === 'post')[0];
      return { preT: pre.t_s, preDeriv: pre.derivation, preMeas: pre.variables.I_bat_meas_A,
               postT: post.t_s, postDeriv: post.derivation, postMeas: post.variables.I_bat_meas_A,
               postTrue: post.variables.I_bat_true_A,
               meas200: r.timeseries.signals.I_bat_meas_A[200], meas199: r.timeseries.signals.I_bat_meas_A[199] };
    })()`);
    close(evState.preT, 20, 0, 'E-03：pre.t_s=20.0（左极限，非 19.9）');
    eq(evState.preDeriv, 'left_limit', 'E-03：pre.derivation=left_limit');
    close(evState.preMeas, 25, 1e-9, 'E-03：pre I_meas=25 A');
    close(evState.postT, 20, 0, 'E-03：post.t_s=20.0');
    close(evState.postMeas, 35, 1e-9, 'E-03：post I_meas=35 A（阶跃）');
    close(evState.postTrue, 25, 1e-9, 'E-03：post I_true=25 A（C0 连续）');
    close(evState.meas200, 35, 1e-9, 'E-03：曲线数据 20.0 行=post（35 A）');
    close(evState.meas199, 25, 1e-9, 'E-03：19.9 行=25 A（常规采样）');

    /* E-04 单一时钟 + 回放不变性（PHY-08/SA-22 冒烟）。
       跨页用 SPA 导航（actions.navigate，hash 路由）；整页刷新恢复属会话路径，另行由
       E-02 的深链覆盖（刷新保 Run/页面，游标按会话语义复位）。 */
    await cdp.evalExpr(`FL.store.actions.setTime(30, { pause: true });`);
    await cdp.evalExpr(`FL.store.actions.navigate('causal');`);
    await wait(350);
    const t1 = await cdp.evalExpr(`FL.store.getState().currentTime`);
    close(t1, 30, 1e-9, 'E-04：游标跨页保持（30 s，SPA hash 路由）');
    const hashNow = await cdp.evalExpr(`location.hash`);
    eq(hashNow, '#/causal', 'E-04：hash 路由同步（#/causal）');
    const runJsonBefore = await cdp.evalExpr(`(function(r){
      return JSON.stringify({ manifest: r.manifest, t0: r.timeseries.t[0], t200: r.timeseries.t[200],
               sigLen: r.timeseries.signals.I_bat_true_A.length, metrics: r.metrics.length });
    })(FL.store.getState().activeRun)`);
    await cdp.evalExpr(`FL.store.actions.play();`);
    await wait(900);
    await cdp.evalExpr(`FL.store.actions.pause();`);
    const replay = await cdp.evalExpr(`(function(){
      const s = FL.store.getState();
      const r = s.activeRun;
      return { t: s.currentTime, json: JSON.stringify({ manifest: r.manifest,
        t0: r.timeseries.t[0], t200: r.timeseries.t[200],
        sigLen: r.timeseries.signals.I_bat_true_A.length, metrics: r.metrics.length }) };
    })()`);
    eq(replay.json, runJsonBefore, 'E-04/PHY-08：播放前后 Run 数据逐字节不变');
    ok(replay.t > 30, 'E-04：播放确实推进了时钟（' + Number(replay.t).toFixed(2) + ' s）');

    /* E-05 golden 关键值（页面运行 vs 解析金标准） */
    const metricVals = await cdp.evalExpr(`(function(){
      const r = FL.store.getState().activeRun;
      const m = (id) => (r.metrics.filter(x => x.metric_id === id)[0] || {});
      return { eBat: m('E_bat_true_60s').value, eGen: m('E_gen_true_60s').value,
               socErr: m('SOC_err_end_pp').value, method: m('E_bat_true_60s').method };
    })()`);
    close(metricVals.eBat, 446 / 3600, 1e-6, 'E-05：E_bat_true_60s=446/3600 kWh（±1e-6）');
    close(metricVals.eGen, 1354 / 3600, 1e-6, 'E-05：E_gen_true_60s=1354/3600 kWh（±1e-6）');
    close(metricVals.socErr, -0.11111111111110716, 1e-5, 'E-05：SOC_err_end_pp（±1e-5 pp）');
    eq(metricVals.method, 'analytic_flux', 'E-05：method=analytic_flux（G0-DEC-06）');

    /* E-06 因果证据链（I-08 最小版：rule_id + time_window_s） */
    const causal = await cdp.evalExpr(`(function(){
      const r = FL.store.getState().activeRun;
      const n0 = r.causal.nodes[0];
      return { nodes: r.causal.nodes.length, ruleVersion: r.causal.rule_version,
               ruleId: n0.rule_id, evRule: n0.evidence[0].rule_id,
               win: n0.evidence[0].time_window_s, layer: n0.evidence[0].layer };
    })()`);
    eq(causal.nodes, 6, 'E-06：因果链六节点');
    eq(causal.ruleVersion, 'cr.fl001.v1', 'E-06：causal.rule_version');
    ok(causal.ruleId && causal.ruleId === causal.evRule, 'E-06：节点与证据绑定同一 rule_id（' + causal.ruleId + '）');
    ok(Array.isArray(causal.win) && causal.win.length === 2, 'E-06：证据带 time_window_s');

    /* E-07 EvidenceBundle v1 浏览器内 构建→导入→run_hash 一致 */
    const bundleCheck = await cdp.evalExpr(`(function(){
      const r = FL.store.getState().activeRun;
      const files = FL.bundle.buildBundleFiles(r);
      const names = Object.keys(files);
      const imp = FL.bundle.importBundle(Object.assign({}, files));
      return { count: names.length, hasSums: names.indexOf('SHA256SUMS.txt') !== -1,
               hashEq: imp.manifest.run_hash === r.manifest.run_hash,
               role: imp.role, points: imp.timeseries.t.length };
    })()`);
    eq(bundleCheck.count, 8, 'E-07：证据包 8 文件');
    eq(bundleCheck.hasSums, true, 'E-07：含 SHA256SUMS.txt');
    eq(bundleCheck.hashEq, true, 'E-07：浏览器内导入 run_hash 一致');
    eq(bundleCheck.role, 'imported', 'E-07：导入角色=imported');
    eq(bundleCheck.points, 601, 'E-07：导入重建 601 点');

    /* E-08 离线与控制台 */
    ok(externalRequests.length === 0, 'E-08：无外部网络请求（纯浏览器离线）',
      JSON.stringify(externalRequests.slice(0, 8)));
    eq(consoleErrors.length, 0, 'E-08：全程无 console error');

    /* 截图留证 */
    fs.mkdirSync(OUT, { recursive: true });
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, 'e2e-fl001-min.png'), Buffer.from(shot.data, 'base64'));
  } finally {
    if (cdp) cdp.close();
    if (chrome) { try { chrome.kill(); } catch { /* ignore */ } }
    if (server) { try { server.kill(); } catch { /* ignore */ } }
  }

  const report = {
    journey: JOURNEY,
    ok: fail === 0,
    pass, fail,
    failures,
    environment: { chrome: CHROME, base: BASE || ('http://127.0.0.1:' + PORT), node: process.version },
    generated_at: new Date().toISOString()
  };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'e2e-report.json'), JSON.stringify(report, null, 2));
  console.log('\n================================================');
  console.log('E2E ' + JOURNEY + '：PASS ' + pass + ' / FAIL ' + fail + (fail ? '  ✗' : '  ✓'));
  if (fail) {
    failures.slice(0, 30).forEach((f, i) => console.log('  [' + i + '] ' + f.name + '\n      ' + f.detail));
    console.log('================================================');
    process.exit(1);
  }
  console.log('E2E 冒烟全部通过（五视图/事件相位/单时钟/回放不变/golden/因果/证据包/离线）。');
}

main().catch((e) => {
  console.error('E2E 运行失败：', e && e.message ? e.message : e);
  process.exit(1);
});
