/**
 * file-smoke.mjs — file:// 发布能力冒烟（正式化；G2 第 31 步，core 层）。
 *
 * 来历（V090_WAVE_DESIGN DEC-5 残留①清算；v080-release §4 残留原文）：
 *   v0.7.2 与 v0.8.0 两轮均以**临时脚本**执行 file:// 冒烟后按纪律删除（每轮重建）：
 *   v0.7.2 = 57 断言（9 页 SPA/事件相位/golden 关键值/证据包往返/零 console error/
 *   file:// 会话恢复），v0.8.0 = 61 断言（按 e2e E-01..E-13 共 57 条 + WT 扩展镜像，
 *   ×3 轮独立 Chrome profile）。本文件把该体例**固化为正式工具**，每轮重建就此终止。
 *
 * 覆盖（85 断言/轮；v1.1.0 MG 六系统波 61→69，V110_WAVE_DESIGN §2 W7；
 *       V120 FC 电化学轨波 69→80，V120_WAVE_DESIGN §2 W5，CHG-20261113-01 批准链；
 *       V130 波 80→85——E-12 镜像同步 ARENA_EXCLUDED 收缩六系统池 + 新增 E-19 教学页
 *       path-mg-001 五条，V130_WAVE_DESIGN §2 W3/W4，CHG-20261113-05 批准链）：
 *   E-01..E-19 = tools/e2e.mjs 全部 81 条断言的 file:// 镜像（启动/demo Run/五视图
 *               深链跨页共享 Run/事件 pre-post 相位/单一时钟+回放不变/golden 关键值/
 *               因果证据链/EvidenceBundle 往返/深链残留面/六系统卡（MG-001 入卡）/
 *               WT 深链/Arena 盲测池六系统（ARENA_EXCLUDED 收缩——V130 W3）/scenario
 *               声明面（含 MG-001 键）/
 *               MG-001 深链系统页四族注入面（island_event 零参数族 + t_clear_s
 *               缺省 35）/MG-001 signals 页 + A-3 单 Run 可达包络行/
 *               scenario 页 FC electrochem_model 编辑器（B-1a 缺省态不写键 + 钉 on
 *               写入键 + 回退恢复哈希）/FC on 轨 deep-link 系统页（on 轨 Run 数据面 +
 *               level_on 徽章 + summary_on 摘要 + on 轨模型声明面板）/FC signals 页
 *               on 轨三新列（off 对照 21 列缺席守卫 + on 轨 24 列 601 点）/
 *               E-19 教学页 path-mg-001 渲染面（路径卡 8 条 + hero 计数徽章 +
 *               5 步展开 + I-5/锚点文案面——V130 W4 只读断言）——
 *               E-13 源级断言改为 Node 侧 fs 直读源文件，
 *               file:// 下页面内 fetch 受 CORS 限制不可用）；
 *   F-01..F-04 = file:// 专属 4 条：
 *               F-01 页面确经 file:// 协议打开且页面资源确经 file:// 装载
 *                    （location.protocol + fileResourceRequests 计数，v0.8.0
 *                    「18 次主框架导航 fileResourceRequests 佐证」体例）；
 *               F-02 FL.core.scenario / FL.core.teaching 就绪（CORE_FILES 合并面，
 *                    v0.7.2 清算项 5 的运行期确证）；
 *               F-03 九页 SPA 全页遍历（SHELL_PAGE_KEYS 9 键逐页可达）；
 *               F-04 localStorage 会话恢复（无参重载 → activeRun 自存储恢复，
 *                    run_hash 校验通过才会恢复——store.loadPersisted 契约）。
 *
 * 与 e2e.mjs 的差异（file:// 适配面，其余逐行同构）：
 *   - 不起静态服务器：目标 = 打包单文件工件 FaultLab.html（默认）的 file:// URL
 *     （--target 可换；发布能力面 = 零构建产物直接双击可用的确证）；
 *   - 离线守卫口径：file:/data:/blob: 均计本地，其余页面资源类型计外联；
 *     file: 协议页面资源另计 fileResourceRequests（F-01 断言 >0）；
 *   - CDP 端口默认 9341（与 e2e 9339 / ui-walkthrough 9343 错开）。
 *
 * 用法：
 *   node tools/file-smoke.mjs                 # 默认 FaultLab.html，1 轮
 *   node tools/file-smoke.mjs --rounds 3      # 发布轮规程：3 轮独立 Chrome profile
 *   node tools/file-smoke.mjs --target index.html   # 开发态排查用（非门禁口径）
 *
 * 退出码：0=全部轮全部通过；1=存在失败项。报告写 <--out>/file-smoke-report.json。
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
function opt(name, dflt) {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
}
const TARGET_REL = opt('target', 'FaultLab.html');
const ROUNDS = Math.max(1, Number(opt('rounds', '1')) || 1);
const CDP_PORT = Number(opt('cdp-port', '9341'));
const OUT = path.resolve(ROOT, opt('out', 'artifacts'));
const CHROME = opt('chrome', findChrome());
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const TARGET_ABS = path.resolve(ROOT, TARGET_REL);
const STARTED_MS = Date.now();
const STARTED_AT = new Date().toISOString();

/* 受限 Windows 沙箱下管道 stdio 可能 EPERM：子进程输出走继承的临时文件 fd
   （与 tools/e2e.mjs runCapture 同构）。 */
function runCapture(cmd, argsArr, cwd) {
  const file = path.join(os.tmpdir(),
    'fl-capture-' + process.pid + '-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.log');
  let fd = null;
  try {
    fd = fs.openSync(file, 'w');
    const res = spawnSync(cmd, argsArr, { cwd, stdio: ['ignore', fd, fd], timeout: 15000 });
    const out = fs.readFileSync(file, 'utf8');
    return { status: res.status, stdout: out, error: res.error || null };
  } catch (e) {
    return { status: null, stdout: '', error: e };
  } finally {
    if (fd !== null) { try { fs.closeSync(fd); } catch { /* ignore */ } }
    try { fs.unlinkSync(file); } catch { /* ignore */ }
  }
}
function git(argsArr) {
  const res = runCapture('git', argsArr, ROOT);
  if (res.error || res.status !== 0) return null;
  return (res.stdout || '').trim();
}
const COMMIT_SHA = git(['rev-parse', 'HEAD']);
const BRANCH = git(['rev-parse', '--abbrev-ref', 'HEAD']);
const STATUS_TRACKED = git(['status', '--porcelain', '--untracked-files=no']);
const WORKTREE_DIRTY = STATUS_TRACKED === null ? null : STATUS_TRACKED.length > 0;

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
/* 与 tools/e2e.mjs Cdp 类同构（browser WS + Target.createTarget + flatten 路由）。 */
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

/* ------------------------------------------------------------- 断言面 */
let pass = 0;
let fail = 0;
const failures = [];
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

/* E-13 源级断言：file:// 下页面内 fetch 受 CORS 限制，改为 Node 侧直读源文件
   （与 e2e E-13「同源取模块源的源级断言」同判据、同三条断言）。 */
function scenarioSourceChecks() {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'ui', 'pages', 'scenario.js'), 'utf8');
  return {
    hasWT: /'WT-001':\s*\[/.test(src) && src.indexOf('d_wt_kW') !== -1,
    hasMG: /'MG-001':\s*\[/.test(src),
    hasThermal: src.indexOf('thermal_model') !== -1
  };
}

/* ------------------------------------------------------------ 单轮旅程 */
async function runRound(roundIdx) {
  const fileUrl = pathToFileURL(TARGET_ABS).href;
  const consoleErrors = [];
  const externalRequests = [];
  let fileResourceRequests = 0;
  let chrome = null;
  let cdp = null;
  let browserVersion = null;
  try {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'faultlab-file-smoke-'));
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
    try { browserVersion = await cdp.send('Browser.getVersion'); } catch { /* 追溯字段，失败不阻断 */ }
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
      /* 只统计页面资源（与 e2e 同口径）；file:/data:/blob: 计本地——file: 即应用自身 */
      const pageTypes = ['Document', 'Script', 'Stylesheet', 'Image', 'Fetch', 'XHR', 'Font', 'Manifest'];
      const url = p.request.url;
      const isLocal = /^data:/.test(url) || /^blob:/.test(url) || /^file:/.test(url) ||
        /127\.0\.0\.1|localhost/.test(url);
      if (pageTypes.indexOf(p.type) !== -1 && /^file:/.test(url)) fileResourceRequests++;
      if (pageTypes.indexOf(p.type) !== -1 && !isLocal) externalRequests.push(p.type + ' ' + url);
    });

    /* E-01 启动（demo=1 自动创建默认故障 Run + baseline；reset=1 清空历史） */
    await cdp.send('Page.navigate', { url: fileUrl + '?demo=1&reset=1&page=home' });
    await wait(1600);
    const boot = await cdp.evalExpr(`(function(){
      const s = FL.store.getState();
      return { booted: s.booted, page: s.page, hasRun: !!s.activeRun, systemId: s.systemId,
               runId: s.activeRun && s.activeRun.runId };
    })()`);
    eq(boot.booted, true, 'E-01：应用启动 booted');
    eq(boot.hasRun, true, 'E-01：demo 启动已创建 activeRun');
    eq(boot.systemId, 'FL-001', 'E-01：系统为 FL-001（P0 范围守卫）');

    /* F-01 file:// 协议确证（单断言）：页面确经 file:// 打开，且页面资源确经 file://
       装载（v0.8.0 体例：fileResourceRequests 计数佐证，非仅 URL 字符串） */
    const proto = await cdp.evalExpr(`location.protocol`);
    ok(proto === 'file:' && fileResourceRequests > 0,
      'F-01：页面确经 file:// 协议打开且资源经 file:// 装载（protocol=' + proto +
      '，fileResourceRequests=' + fileResourceRequests + '）');

    /* F-02 FL.core.scenario / FL.core.teaching 就绪（CORE_FILES 合并面，v0.7.2 清算项 5） */
    const coreFaces = await cdp.evalExpr(`(function(){
      return { scenario: !!(FL.core && FL.core.scenario && typeof FL.core.scenario.parseScenario === 'function'),
               teaching: !!(FL.core && FL.core.teaching && typeof FL.core.teaching.getTeachingPaths === 'function'),
               pageKeys: (FL.core && FL.core.teaching && FL.core.teaching.SHELL_PAGE_KEYS) || [] };
    })()`);
    ok(coreFaces.scenario && coreFaces.teaching, 'F-02：FL.core.scenario / FL.core.teaching 就绪（CORE_FILES 面）');

    /* E-02 五视图深链 + 跨页共享 Run */
    for (const p of PAGES) {
      await cdp.send('Page.navigate', { url: fileUrl + '?page=' + p });
      await wait(450);
      const st = await cdp.evalExpr(`(function(){
        const s = FL.store.getState();
        return { page: s.page, runId: s.activeRun && s.activeRun.runId };
      })()`);
      eq(st.page, p, 'E-02：视图深链 ' + p);
      eq(st.runId, boot.runId, 'E-02：' + p + ' 共享同一 Run（跨页状态）');
    }

    /* F-03 九页 SPA 全页遍历（SHELL_PAGE_KEYS 9 键逐页可达；聚合 1 断言） */
    const sweep = await cdp.evalExpr(`(function(){
      const keys = (FL.core && FL.core.teaching && FL.core.teaching.SHELL_PAGE_KEYS) || [];
      const visited = [];
      let allOk = keys.length === 9;
      const seq = keys.slice();
      return seq.reduce(function (pr, key) {
        return pr.then(function () {
          FL.store.actions.navigate(key);
          return new Promise(function (r) { setTimeout(r, 120); });
        }).then(function () {
          const page = FL.store.getState().page;
          visited.push(page);
          if (page !== key) allOk = false;
        });
      }, Promise.resolve()).then(function () {
        return { keys: keys, visited: visited, allOk: allOk };
      });
    })()`);
    ok(sweep.allOk && sweep.visited.length === 9,
      'F-03：九页 SPA 全页遍历可达（' + sweep.visited.join('→') + '）',
      'keys=' + JSON.stringify(sweep.keys) + ' visited=' + JSON.stringify(sweep.visited));

    /* E-03 事件 pre/post 契约（页面上下文） */
    await cdp.send('Page.navigate', { url: fileUrl + '?page=system' });
    await wait(450);
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

    /* E-04 单一时钟 + 回放不变性（PHY-08/SA-22 冒烟） */
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

    /* E-09 深链残留面（v0.7.2 清算项 4 固化路径，与 e2e 同构） */
    await cdp.evalExpr(`FL.store.actions.navigate('teaching');`);
    await wait(450);
    eq(await cdp.evalExpr(`FL.store.getState().page`), 'teaching', 'E-09：SPA 进入教学页');
    await cdp.evalExpr(`location.hash = '#/signals';`);
    await wait(450);
    const onSignals = await cdp.evalExpr(`(function(){
      const sec = document.getElementById('page-signals');
      const inner = sec && sec.querySelector(':scope > .pg-signals');
      return { page: FL.store.getState().page,
               sectionPg: sec.classList.contains('pg-signals') || sec.classList.contains('page-pad'),
               hasInner: !!inner, display: getComputedStyle(sec).display,
               visible: !!sec.offsetParent };
    })()`);
    eq(onSignals.page, 'signals', 'E-09：hash 深链 #/signals 可达');
    eq(onSignals.sectionPg, false, 'E-09：signals 挂载不改 shell section 类（内层根 div 模式）');
    eq(onSignals.hasInner, true, 'E-09：.pg-signals 挂在本页内层根 div 上');
    ok(onSignals.display === 'block' && onSignals.visible, 'E-09：激活态 #page-signals 可见');
    await cdp.evalExpr(`FL.store.actions.startExperiment('FL-001');`);
    await wait(450);
    const afterLeave = await cdp.evalExpr(`(function(){
      const sig = document.getElementById('page-signals');
      const tea = document.getElementById('page-teaching');
      return { page: FL.store.getState().page,
               sigDisplay: getComputedStyle(sig).display, sigVisible: !!sig.offsetParent,
               teaDisplay: getComputedStyle(tea).display, teaVisible: !!tea.offsetParent };
    })()`);
    eq(afterLeave.page, 'system', 'E-09：切 scenario 后 SPA 离开 signals');
    ok(afterLeave.sigDisplay !== 'block' && !afterLeave.sigVisible,
      'E-09：离开后 #page-signals 恢复非激活隐藏（非 block 且不可见）',
      'display=' + afterLeave.sigDisplay + ' visible=' + afterLeave.sigVisible);
    ok(afterLeave.teaDisplay !== 'block' && !afterLeave.teaVisible,
      'E-09：对照 #page-teaching 同样恢复隐藏（内层根模式基线）',
      'display=' + afterLeave.teaDisplay + ' visible=' + afterLeave.teaVisible);

    /* E-10 六系统卡（v1.1.0 UI 接线路：六系统化 + MG-001 入卡——卡名/level 徽章/
       I-5 描述文案面断言沿 e2e E-10 同判据） */
    await cdp.send('Page.navigate', { url: fileUrl + '?demo=1&reset=1&page=home' });
    await wait(1400);
    const home6 = await cdp.evalExpr(`(function(){
      const cards = Array.prototype.slice.call(document.querySelectorAll('.home-sys-card'));
      return { count: cards.length,
               ids: cards.map(function (c) { return c.getAttribute('data-system'); }) };
    })()`);
    eq(home6.count, 6, 'E-10：home 六系统卡');
    ok(home6.ids.indexOf('WT-001') !== -1, 'E-10：home 卡序含 WT-001（L0b 徽章）', JSON.stringify(home6.ids));
    const homeMg = await cdp.evalExpr(`(function(){
      const card = document.querySelector('.home-sys-card[data-system="MG-001"]');
      if (!card) return { found: false };
      const title = (card.querySelector('.home-sys-title') || {}).textContent || '';
      const level = (card.querySelector('.home-sys-level') || {}).textContent || '';
      const tagline = (card.querySelector('.home-sys-tagline') || {}).textContent || '';
      return { found: true, title: title, level: level, tagline: tagline };
    })()`);
    ok(homeMg.found && homeMg.title === '微电网多源聚合系统' &&
      /^聚合层 L0/.test(homeMg.level) && homeMg.tagline.indexOf('分断主馈线') !== -1 &&
      homeMg.tagline.indexOf('重整') !== -1,
      'E-10：MG-001 卡名称/level 徽章（聚合层 L0）/I-5 描述（主馈线分断 + 功率平衡重整表述）',
      JSON.stringify(homeMg));

    /* E-11 WT-001 深链系统页 + 关键信号 601 点 */
    await cdp.send('Page.navigate', { url: fileUrl + '?demo=1&reset=1&system=WT-001&page=system' });
    await wait(1500);
    const wtRun = await cdp.evalExpr(`(function(){
      const s = FL.store.getState();
      const r = s.activeRun;
      const sig = r && r.timeseries && r.timeseries.signals ? r.timeseries.signals : {};
      const len = function (id) { return sig[id] ? sig[id].length : 0; };
      return { systemId: s.systemId, page: s.page, hasRun: !!r,
               runId: r && r.runId,
               pwt: len('P_wt_true_kW'), dwt: len('d_wt_kW'), nrotor: len('n_rotor_rpm') };
    })()`);
    eq(wtRun.systemId, 'WT-001', 'E-11：?system=WT-001 深链进入 WT 系统页');
    ok(wtRun.hasRun && wtRun.pwt === 601 && wtRun.dwt === 601 && wtRun.nrotor === 601,
      'E-11：WT-001 demo Run 关键信号 601 点可见（P_wt / d_wt / n_rotor）',
      JSON.stringify({ hasRun: wtRun.hasRun, pwt: wtRun.pwt, dwt: wtRun.dwt, nrotor: wtRun.nrotor }));

    /* E-12 Arena 盲测池六系统（ARENA_EXCLUDED 收缩——V130 DEC-2 exposure 三值映射验证轮
       全过，CHG-20261113-05，ARENA_EXPOSURE_VERIFICATION_ROUND.md v1；历史排除链保留：
       PV CHG-20261104-10 / WT CHG-20261107-01 / MG V110 DEC-4 CHG-20261110-01） */
    await cdp.send('Page.navigate', { url: fileUrl + '?page=arena' });
    await wait(700);
    const arenaChk = await cdp.evalExpr(`(function(){
      const sec = document.getElementById('page-arena');
      const sysSeg = sec ? sec.querySelector('.seg[aria-label="选择实验系统"]') : null;
      const vals = sysSeg ? Array.prototype.map.call(sysSeg.querySelectorAll('.seg-item'),
        function (b) { return b.dataset.value; }) : [];
      return { page: FL.store.getState().page, vals: vals };
    })()`);
    eq(arenaChk.page, 'arena', 'E-12：arena 页打开');
    const ARENA_POOL_SIX = ['FL-001', 'FC-001', 'GT-001', 'PV-001', 'WT-001', 'MG-001'];
    ok(ARENA_POOL_SIX.every(function (id) { return arenaChk.vals.indexOf(id) !== -1; }),
      'E-12：arena 系统选择器含全部六系统（ARENA_EXCLUDED 收缩）', JSON.stringify(arenaChk.vals));
    eq(arenaChk.vals.length, 6, 'E-12：arena 系统选择器恰 6 项');

    /* E-13 scenario 页声明面（源级断言：Node 侧直读源文件，见 scenarioSourceChecks） */
    const scnChk = scenarioSourceChecks();
    ok(scnChk.hasWT, 'E-13：scenario 页 METRIC_PICK 声明 WT-001 键（focal/ΔE_wt/d_wt）', JSON.stringify(scnChk));
    ok(scnChk.hasMG, 'E-13：scenario 页 METRIC_PICK 声明 MG-001 键（focal 不可用/EQ-MG-8 账本口径）', JSON.stringify(scnChk));
    ok(scnChk.hasThermal, 'E-13：scenario 页含 FL thermal_model off/on 事件列展示面');

    /* E-16 scenario 页 FC electrochem_model 编辑器（V120 W5，e2e E-16 同判据；
       B-1(a) 显式键条件式形态——缺省态不写键、仅显式 off/on 写入场景键并入内容哈希） */
    await cdp.send('Page.navigate', { url: fileUrl + '?demo=1&reset=1&page=scenario' });
    await wait(1200);
    await cdp.evalExpr(`(function(){
      const btns = Array.prototype.slice.call(document.querySelectorAll('.scn-import-actions button'));
      const fcBtn = btns.filter(function (b) { return (b.textContent || '').indexOf('FC-001 样例') !== -1; })[0];
      if (fcBtn) fcBtn.click();
    })()`);
    await wait(600);
    const echDefault = await cdp.evalExpr(`(function(){
      const edits = Array.prototype.slice.call(document.querySelectorAll('.scn-ech-edit'));
      const pressed = edits.map(function (e) {
        const cur = e.querySelector('.seg .seg-item[aria-pressed="true"]');
        return cur ? cur.dataset.value : '';
      });
      const chips = Array.prototype.slice.call(document.querySelectorAll('.scn-event-chips .chip'))
        .map(function (c) { return c.textContent || ''; });
      return { page: FL.store.getState().page, edits: edits.length, pressed: pressed,
               textHasDefault: document.getElementById('page-scenario').textContent.indexOf('默认 off（未钉轨）') !== -1,
               echChips: chips.filter(function (t) { return t.indexOf('电化学模型') !== -1; }),
               hashBefore: (document.querySelector('.scn-hash-val') || {}).textContent || '' };
    })()`);
    ok(echDefault.page === 'scenario' && echDefault.edits === 1 && echDefault.pressed[0] === 'absent' &&
      echDefault.textHasDefault && echDefault.echChips.length === 0,
      'E-16：FC 场景事件卡 electrochem 编辑器在场 + 缺省态「默认 off（未钉轨）」不写键（无 chip）',
      JSON.stringify(echDefault));
    await cdp.evalExpr(`(function(){
      const seg = document.querySelector('.scn-ech-edit .seg');
      const onBtn = seg ? seg.querySelector('.seg-item[data-value="on"]') : null;
      if (onBtn) onBtn.click();
    })()`);
    await wait(500);
    const echPinned = await cdp.evalExpr(`(function(){
      const chips = Array.prototype.slice.call(document.querySelectorAll('.scn-event-chips .chip'))
        .map(function (c) { return c.textContent || ''; });
      const cur = document.querySelector('.scn-ech-edit .seg .seg-item[aria-pressed="true"]');
      return { pressed: cur ? cur.dataset.value : '',
               echChips: chips.filter(function (t) { return t.indexOf('电化学模型 on') !== -1; }),
               hashNow: (document.querySelector('.scn-hash-val') || {}).textContent || '' };
    })()`);
    ok(echPinned.pressed === 'on' && echPinned.echChips.length === 1 &&
      echPinned.hashNow && echPinned.hashNow !== echDefault.hashBefore,
      'E-16：钉 on 写入场景键（电化学模型 on chip 在场 + 场景内容哈希随显式键变化）',
      JSON.stringify(echPinned));
    await cdp.evalExpr(`(function(){
      const seg = document.querySelector('.scn-ech-edit .seg');
      const btn = seg ? seg.querySelector('.seg-item[data-value="absent"]') : null;
      if (btn) btn.click();
    })()`);
    await wait(500);
    const echRestored = await cdp.evalExpr(`(function(){
      const chips = Array.prototype.slice.call(document.querySelectorAll('.scn-event-chips .chip'))
        .map(function (c) { return c.textContent || ''; });
      const cur = document.querySelector('.scn-ech-edit .seg .seg-item[aria-pressed="true"]');
      return { pressed: cur ? cur.dataset.value : '',
               echChips: chips.filter(function (t) { return t.indexOf('电化学模型') !== -1; }),
               hashNow: (document.querySelector('.scn-hash-val') || {}).textContent || '' };
    })()`);
    ok(echRestored.pressed === 'absent' && echRestored.echChips.length === 0 &&
      echRestored.hashNow === echDefault.hashBefore,
      'E-16：回退未钉轨恢复既有哈希（B-1a 缺省态键不存在——既有 FC 场景 scenarioHash 零变化面）',
      JSON.stringify(echRestored));

    /* E-17 FC on 轨 deep-link 系统页（V120 W5，e2e E-17 同判据；轨翻转经既有草稿/运行
       语义——updateDraft electrochem_model=on + createRun 标准入口） */
    await cdp.send('Page.navigate', { url: fileUrl + '?demo=1&reset=1&system=FC-001&page=system' });
    await wait(1500);
    const fcOffChk = await cdp.evalExpr(`(function(){
      const s = FL.store.getState();
      const r = s.activeRun;
      return { systemId: s.systemId, page: s.page,
               cfgTrack: r && r.config ? r.config.electrochem_model : '' };
    })()`);
    eq(fcOffChk.systemId + '@' + fcOffChk.page + '@' + fcOffChk.cfgTrack, 'FC-001@system@off',
      'E-17：?system=FC-001 深链进入 FC 系统页（demo Run = off 默认轨）');
    const fcOnCreate = await cdp.evalExpr(`(function(){
      FL.store.actions.updateDraft(function (d) { d.electrochem_model = 'on'; });
      const res = FL.store.actions.createRun({ silent: true });
      return { ok: !!(res && res.ok), err: res && res.error ? String(res.error) : '' };
    })()`);
    await wait(700);
    const fcOnUI = await cdp.evalExpr(`(function(){
      const s = FL.store.getState();
      const r = s.activeRun;
      const sig = r && r.timeseries && r.timeseries.signals ? r.timeseries.signals : {};
      const len = function (id) { return sig[id] ? sig[id].length : 0; };
      const badges = Array.prototype.slice.call(document.querySelectorAll('.sys-head-meta .badge'))
        .map(function (b) { return b.textContent || ''; });
      const sub = (document.querySelector('.sys-page-sub') || {}).textContent || '';
      const panel = document.querySelector('.sys-track-panel');
      const panelText = panel ? panel.textContent : '';
      return { cfgTrack: r && r.config ? r.config.electrochem_model : '',
               tst: len('T_st_K'), vst: len('V_stack_V'), pls: len('P_loss_stack_kW'),
               badges: badges, subHasSummaryOn: sub.indexOf('电堆按极化曲线出力') !== -1,
               panelFound: !!panel,
               panelHasAssumption: panelText.indexOf('A-fcec-polarization') !== -1,
               panelHasNote: panelText.indexOf('L1-lite') !== -1 };
    })()`);
    ok(fcOnCreate.ok && fcOnUI.cfgTrack === 'on' && fcOnUI.tst === 601 && fcOnUI.vst === 601 && fcOnUI.pls === 601,
      'E-17：FC on 轨 Run 数据面（cfg electrochem_model=on + T_st/V_stack/P_loss 三新信号 601 点）',
      JSON.stringify({ ok: fcOnCreate.ok, err: fcOnCreate.err, cfgTrack: fcOnUI.cfgTrack,
        tst: fcOnUI.tst, vst: fcOnUI.vst, pls: fcOnUI.pls }));
    ok(fcOnUI.badges.some(function (t) { return t.indexOf('L1 · 电堆极化与单节点热') !== -1; }),
      'E-17：system 页 header 层级徽章切 level_on（L1 · 电堆极化与单节点热（数值仿真级））',
      JSON.stringify(fcOnUI.badges));
    ok(fcOnUI.subHasSummaryOn,
      'E-17：system 页摘要追加 summary_on 句（电堆按极化曲线出力、损耗热加热电堆（模型记账口径））',
      fcOnUI.subHasSummaryOn ? 'ok' : JSON.stringify(fcOnUI).slice(0, 160));
    ok(fcOnUI.panelFound && fcOnUI.panelHasAssumption && fcOnUI.panelHasNote,
      'E-17：system 页 on 轨模型声明面板在场（A-fcec 假设 + L1-lite 定位句——B-2 变体渲染）',
      JSON.stringify({ panelFound: fcOnUI.panelFound,
        panelHasAssumption: fcOnUI.panelHasAssumption, panelHasNote: fcOnUI.panelHasNote }));

    /* E-18 FC signals 页 on 轨三新列（V120 W5，e2e E-18 同判据；off 对照 = 结构性缺席守卫） */
    await cdp.send('Page.navigate', { url: fileUrl + '?demo=1&reset=1&system=FC-001&page=signals' });
    await wait(1500);
    const fcOffSig = await cdp.evalExpr(`(function(){
      const s = FL.store.getState();
      const r = s.activeRun;
      return { page: s.page, runSystem: r ? r.systemId : '',
               catCount: r && r.signals ? r.signals.length : 0,
               tst: !!(r && r.timeseries && r.timeseries.signals && r.timeseries.signals.T_st_K) };
    })()`);
    ok(fcOffSig.page === 'signals' && fcOffSig.runSystem === 'FC-001' &&
      fcOffSig.catCount === 21 && !fcOffSig.tst,
      'E-18：FC off 轨对照——信号目录 21 列、T_st_K 结构性缺席（off 域零变化守卫）',
      JSON.stringify(fcOffSig));
    const fcOnSigCreate = await cdp.evalExpr(`(function(){
      FL.store.actions.updateDraft(function (d) { d.electrochem_model = 'on'; });
      const res = FL.store.actions.createRun({ silent: true });
      return { ok: !!(res && res.ok) };
    })()`);
    await wait(700);
    await cdp.evalExpr(`(function(){
      FL.store.actions.setPageState('signals', { category: 'thermal' });
      return true;
    })()`);
    await wait(500);
    const fcOnSig = await cdp.evalExpr(`(function(){
      const s = FL.store.getState();
      const r = s.activeRun;
      const sig = r && r.timeseries && r.timeseries.signals ? r.timeseries.signals : {};
      const len = function (id) { return sig[id] ? sig[id].length : 0; };
      const items = Array.prototype.slice.call(document.querySelectorAll('.sig-item'));
      const tstItem = items.filter(function (i) { return (i.textContent || '').indexOf('电堆温度') !== -1; }).length;
      return { page: s.page, catCount: r && r.signals ? r.signals.length : 0,
               tst: len('T_st_K'), vst: len('V_stack_V'), pls: len('P_loss_stack_kW'),
               tstItem: tstItem };
    })()`);
    ok(fcOnSigCreate.ok && fcOnSig.catCount === 24 && fcOnSig.tst === 601 && fcOnSig.vst === 601 && fcOnSig.pls === 601,
      'E-18：FC on 轨 signals 页——信号目录 24 列 + 三新列 601 点（T_st/V_stack/P_loss）',
      JSON.stringify({ ok: fcOnSigCreate.ok, catCount: fcOnSig.catCount,
        tst: fcOnSig.tst, vst: fcOnSig.vst, pls: fcOnSig.pls }));
    ok(fcOnSig.page === 'signals' && fcOnSig.tstItem > 0,
      'E-18：signals 页 on 轨渲染面（热力类目电堆温度 T_st 信号行在场——run.signals 通用渲染零改动核实）',
      JSON.stringify({ page: fcOnSig.page, tstItem: fcOnSig.tstItem }));

    /* E-14 MG-001 深链系统页 + 四族注入面（v1.1.0 UI 接线路；island_event 零参数族——
       无幅值输入、t_clear_s 重连时刻编辑器缺省 35 s = golden 锚定值，e2e E-14 同判据） */
    await cdp.send('Page.navigate', { url: fileUrl + '?demo=1&reset=1&system=MG-001&page=system' });
    await wait(1500);
    const mgFam = await cdp.evalExpr(`(function(){
      const cards = Array.prototype.slice.call(document.querySelectorAll('.sys-family-card'));
      const fams = cards.map(function (c) { return c.getAttribute('data-family'); });
      const island = cards.filter(function (c) { return c.getAttribute('data-family') === 'island_event'; })[0] || null;
      if (island) island.click();
      return { systemId: FL.store.getState().systemId, page: FL.store.getState().page, fams: fams };
    })()`);
    await wait(400);
    const mgIslandUI = await cdp.evalExpr(`(function(){
      const host = document.querySelector('.sys-param-controls');
      const nums = host ? Array.prototype.map.call(host.querySelectorAll('input[type="number"]'),
        function (e) { return e.value; }) : [];
      const selected = document.querySelector('.sys-family-card.is-selected');
      return { nums: nums, selectedFam: selected ? selected.getAttribute('data-family') : '' };
    })()`);
    eq(mgFam.systemId + '@' + mgFam.page, 'MG-001@system', 'E-14：?system=MG-001 深链进入 MG 系统页');
    ok(['load_step', 'shading_link', 'gust_link', 'island_event'].every(function (f) {
      return mgFam.fams.indexOf(f) !== -1;
    }), 'E-14：MG 四族故障家族卡在场（load_step/shading_link/gust_link/island_event）', JSON.stringify(mgFam.fams));
    ok(mgIslandUI.selectedFam === 'island_event' && mgIslandUI.nums.length === 2 &&
      Number(mgIslandUI.nums[1]) === 35 && mgIslandUI.nums[0].length > 0,
      'E-14：island_event 零参数族注入面（无幅值输入——仅故障时刻 + 重连时刻 t_clear_s，缺省 35 s）',
      JSON.stringify(mgIslandUI));

    /* E-15 MG-001 signals 页 + A-3 单 Run 可达包络行（e2e E-15 同判据；措辞带
       「不是参数域叉积包络」改标口径——不称全域） */
    await cdp.send('Page.navigate', { url: fileUrl + '?demo=1&reset=1&system=MG-001&page=signals' });
    await wait(1500);
    const mgSig = await cdp.evalExpr(`(function(){
      const s = FL.store.getState();
      const r = s.activeRun;
      const sig = r && r.timeseries && r.timeseries.signals ? r.timeseries.signals : {};
      const len = function (id) { return sig[id] ? sig[id].length : 0; };
      const env = document.querySelector('.sig-envelope-row');
      return { page: s.page, runSystem: r ? r.systemId : '', runId: r ? r.runId : '',
               ppv: len('P_pv_kW'), pgrid: len('P_grid_true_kW'), isl: len('island_state'),
               envFound: !!env, envHidden: env ? env.hidden : null,
               envText: env ? env.textContent : '' };
    })()`);
    ok(mgSig.page === 'signals' && mgSig.runSystem === 'MG-001' &&
      mgSig.ppv === 601 && mgSig.pgrid === 601 && mgSig.isl === 601,
      'E-15：MG-001 demo Run 关键信号 601 点可见（P_pv / P_grid / island_state）',
      JSON.stringify({ page: mgSig.page, runSystem: mgSig.runSystem, ppv: mgSig.ppv, pgrid: mgSig.pgrid, isl: mgSig.isl }));
    ok(mgSig.envFound && !mgSig.envHidden && mgSig.envText.indexOf('MG-001 单 Run 可达包络') === 0,
      'E-15：A-3 MG 单 Run 可达包络行在场（信号页页脚，默认故障 Run 数据范围）', mgSig.envText.slice(0, 120));
    ok(mgSig.envText.indexOf('不是参数域叉积包络') !== -1 && mgSig.envText.indexOf('全') === -1,
      'E-15：包络行措辞带 A-3 改标口径（单 Run 可达 ≠ 参数域叉积包络，不称全域）',
      mgSig.envText.slice(-120));

    /* E-19 教学页 path-mg-001（V130 W4 DEC-3 CHG-20261113-04——teaching.js PATHS additive
       第 8 条的教学页渲染面镜像；沿 E-09 既有 page=teaching 导航形态，只读渲染面断言：
       路径卡在场 + 可展开 5 步 + I-5/锚点文案面——零新执行语义，不生成场景不建 Run） */
    await cdp.send('Page.navigate', { url: fileUrl + '?page=teaching' });
    await wait(900);
    const teachCards = await cdp.evalExpr(`(function(){
      const cards = Array.prototype.slice.call(document.querySelectorAll('[data-testid="teaching-path-card"]'));
      const heroBadges = Array.prototype.slice.call(document.querySelectorAll('.tea-hero-tags .badge'))
        .map(function (b) { return b.textContent || ''; });
      return { page: FL.store.getState().page, count: cards.length,
               ids: cards.map(function (c) { return c.getAttribute('data-path-id'); }),
               heroCount: heroBadges.filter(function (t) { return t.indexOf('预设 ') === 0; })[0] || '' };
    })()`);
    eq(teachCards.page + '@' + teachCards.count, 'teaching@8',
      'E-19：教学页路径卡 8 条（7 既有 + path-mg-001 additive 第 8 条，V130 DEC-3）');
    eq(teachCards.heroCount, '预设 8 路径 × 5 步', 'E-19：hero 计数徽章随路径数据面同步（页面不写死条数）');
    ok(teachCards.ids.indexOf('path-mg-001') !== -1,
      'E-19：path-mg-001 路径卡在场（data-path-id）', JSON.stringify(teachCards.ids));
    await cdp.evalExpr(`(function(){
      const card = document.querySelector('[data-testid="teaching-path-card"][data-path-id="path-mg-001"]');
      if (card) card.click();
    })()`);
    await wait(500);
    const mgExpand = await cdp.evalExpr(`(function(){
      const steps = Array.prototype.slice.call(document.querySelectorAll('[data-testid="teaching-steps"] .tea-step'));
      const title = (document.querySelector('[data-testid="teaching-steps-title"]') || {}).textContent || '';
      const allText = steps.map(function (s) { return s.textContent; }).join('\\n');
      const evalText = steps.length > 4 ? steps[4].textContent : '';
      return { page: FL.store.getState().page, title: title, stepCount: steps.length,
               stepIds: steps.map(function (s) { return s.getAttribute('data-step-id'); }),
               hasI5: allText.indexOf('脱离主馈线的功率平衡重整') !== -1,
               hasClamp8: allText.indexOf('8 kW') !== -1,
               hasShed2: allText.indexOf('P_shed = 2 kW') !== -1,
               hasTclear35: allText.indexOf('t_clear = 35 s') !== -1,
               evalHasAnchor: evalText.indexOf('评测入口') !== -1 && evalText.indexOf('t_clear_s = 35') !== -1 };
    })()`);
    ok(mgExpand.page === 'teaching' && mgExpand.title.indexOf('主馈线分断') !== -1 &&
      mgExpand.stepCount === 5 &&
      JSON.stringify(mgExpand.stepIds) === JSON.stringify(['inject', 'closed-loop', 'monitor-compare', 'causal', 'eval']),
      'E-19：path-mg-001 可展开为 5 步（步骤卡 id 序列 = DEC-5 模板 + 路径标题在场）',
      JSON.stringify({ page: mgExpand.page, title: mgExpand.title, stepCount: mgExpand.stepCount, stepIds: mgExpand.stepIds }));
    ok(mgExpand.hasI5 && mgExpand.hasClamp8 && mgExpand.hasShed2 && mgExpand.hasTclear35 && mgExpand.evalHasAnchor,
      'E-19：path-mg-001 文案面（I-5 句式「脱离主馈线的功率平衡重整」+ 钳位 8 kW / P_shed = 2 kW / t_clear = 35 s 锚点 + 第⑤步评测入口锚定值）',
      JSON.stringify({ hasI5: mgExpand.hasI5, hasClamp8: mgExpand.hasClamp8,
        hasShed2: mgExpand.hasShed2, hasTclear35: mgExpand.hasTclear35, evalHasAnchor: mgExpand.evalHasAnchor }));

    /* F-04 localStorage 会话恢复：无参重载（不 reset 不 demo）→ activeRun 自存储恢复
       （store.loadPersisted 契约：run_hash 校验通过才恢复，不伪造历史 Run）。
       对照相 = E-15 结束时的 activeRun（v1.1.0 起 E-14/E-15 在 F-04 之前创建 MG Run，
       故恢复对象为最后激活的 MG-001 Run——V120 起 E-17/E-18 亦在 E-14/E-15 之前创建
       FC on/off Run，E-11 的 WT Run 面仍由 E-12 前的会话链覆盖；V130 起 E-19 教学
       渲染面只读、不建 Run，恢复对象不变）。 */
    await cdp.send('Page.navigate', { url: fileUrl + '?page=system' });
    await wait(1400);
    const restored = await cdp.evalExpr(`(function(){
      const s = FL.store.getState();
      return { booted: s.booted, hasRun: !!s.activeRun,
               runId: s.activeRun && s.activeRun.runId };
    })()`);
    ok(restored.booted && restored.hasRun && restored.runId === mgSig.runId,
      'F-04：localStorage 会话恢复（无参重载 activeRun=' + restored.runId + ' 与重载前一致）',
      JSON.stringify(restored) + ' vs ' + mgSig.runId);

    /* E-08 离线与控制台 */
    ok(externalRequests.length === 0, 'E-08：无外部网络请求（file:// 纯离线）',
      JSON.stringify(externalRequests.slice(0, 8)));
    eq(consoleErrors.length, 0, 'E-08：全程无 console error');

    /* 截图留证（每轮覆盖写） */
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, 'file-smoke.png'), Buffer.from(shot.data, 'base64'));
    return { browserVersion };
  } finally {
    if (cdp) cdp.close();
    if (chrome) { try { chrome.kill(); } catch { /* ignore */ } }
  }
}

/* ---------------------------------------------------------------- main */
async function main() {
  if (!fs.existsSync(TARGET_ABS)) {
    console.error('错误：目标文件不存在：' + TARGET_ABS +
      (TARGET_REL === 'FaultLab.html' ? '（先运行 python tools/build.py 重打包）' : ''));
    process.exit(2);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const targetBytes = fs.statSync(TARGET_ABS).size;
  const roundResults = [];
  let browserVersion = null;
  for (let i = 1; i <= ROUNDS; i++) {
    pass = 0; fail = 0; failures.length = 0;
    const roundStarted = Date.now();
    let aborted = null;
    try {
      const r = await runRound(i);
      browserVersion = r.browserVersion;
    } catch (e) {
      aborted = e && e.message ? e.message : String(e);
      fail++;
      failures.push({ name: '轮次执行中断', detail: aborted });
    }
    roundResults.push({
      round: i,
      ok: fail === 0,
      pass, fail,
      failures: failures.slice(),
      duration_ms: Date.now() - roundStarted,
      aborted: aborted
    });
    console.log('第 ' + i + '/' + ROUNDS + ' 轮：PASS ' + pass + ' / FAIL ' + fail +
      (fail ? '  ✗' : '  ✓') + '（' + (Date.now() - roundStarted) + ' ms）');
    if (fail && process.env.FILE_SMOKE_DEBUG) {
      failures.slice(0, 30).forEach((f, j) => console.log('  [' + j + '] ' + f.name + '\n      ' + f.detail));
    }
    if (failures.length && ROUNDS > 1 && fail) {
      /* 多轮规程：任一轮失败即终止（失败面同轮内短路语义，避免掩盖首因） */
      failures.slice(0, 10).forEach((f, j) => console.log('  [' + j + '] ' + f.name + '\n      ' + f.detail));
      break;
    }
  }

  const generatedAt = new Date().toISOString();
  const allOk = roundResults.every((r) => r.ok);
  const totalPass = roundResults.reduce((s, r) => s + r.pass, 0);
  const totalFail = roundResults.reduce((s, r) => s + r.fail, 0);
  const browser = browserVersion
    ? { product: browserVersion.product, revision: browserVersion.revision,
        userAgent: browserVersion.userAgent, jsVersion: browserVersion.jsVersion }
    : { product: null, revision: null, userAgent: null, jsVersion: null };
  const report = {
    journey: 'file-smoke-85',
    target: { path: TARGET_REL, absolute: TARGET_ABS, bytes: targetBytes },
    protocol: 'file:',
    assertions_per_round: 85,
    rounds: ROUNDS,
    ok: allOk,
    pass: totalPass,
    fail: totalFail,
    round_results: roundResults,
    failures: roundResults.flatMap((r) => r.failures.map((f) => Object.assign({ round: r.round }, f))),
    environment: { chrome: CHROME, node: process.version, browser },
    code: { commit_sha: COMMIT_SHA, branch: BRANCH, worktree_dirty: WORKTREE_DIRTY },
    execution: {
      command: 'node tools/file-smoke.mjs' + (ROUNDS > 1 ? ' --rounds ' + ROUNDS : '') +
        (TARGET_REL !== 'FaultLab.html' ? ' --target ' + TARGET_REL : ''),
      started_at: STARTED_AT,
      generated_at: generatedAt,
      duration_ms: Date.now() - STARTED_MS
    }
  };
  fs.writeFileSync(path.join(OUT, 'file-smoke-report.json'), JSON.stringify(report, null, 2));
  console.log('\n================================================');
  console.log('file:// 冒烟（' + TARGET_REL + '，' + ROUNDS + ' 轮 × 85 断言）：' +
    (allOk ? '全部通过  ✓' : '存在失败  ✗') + '（累计 PASS ' + totalPass + ' / FAIL ' + totalFail + '）');
  console.log('浏览器：' + (browser.product || 'n/a') + '（revision ' + (browser.revision || 'n/a') + '）');
  console.log('追溯：commit=' + (COMMIT_SHA || 'n/a').slice(0, 12) + ' branch=' + (BRANCH || 'n/a') +
    ' dirty=' + WORKTREE_DIRTY + ' node=' + process.version + ' 用时 ' + report.execution.duration_ms + ' ms');
  console.log('注意：通过项为发布能力面（单文件工件 file:// 直接可用）的内部一致性证据，不构成模型验证或硬件验证。');
  if (!allOk) {
    const firstFail = roundResults.find((r) => !r.ok);
    if (firstFail) {
      firstFail.failures.slice(0, 30).forEach((f, i) => console.log('  [' + i + '] ' + f.name + '\n      ' + f.detail));
    }
    console.log('================================================');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('file:// 冒烟运行失败：', e && e.message ? e.message : e);
  process.exit(1);
});
