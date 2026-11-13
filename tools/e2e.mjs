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
 *   E-08 全程无 console error、无外部网络请求（纯浏览器离线）；
 *   E-09 深链残留面：teaching 页 → hash 深链进 signals → 切 scenario（SPA 离开）
 *        → #page-signals 恢复非激活隐藏（v0.7.0 UI 路探针发现路径固化，
 *        v0.7.2 清算项 4；E-02 用整页刷新覆盖不到这条 SPA 残留路径）。
 *   E-10 六系统卡：home 六系统卡 + WT-001 入卡（v0.8.0 UI 接线路，CHG-20261107-01）
 *        + MG-001 入卡与名称/level 徽章/I-5 描述（v1.1.0 UI 接线路，CHG-20261110-01）；
 *   E-11 WT-001 深链系统页 + demo Run 关键信号 601 点（P_wt / d_wt / n_rotor）；
 *   E-12 Arena 排除：系统选择器与页面文本不含 WT-001 / PV-001 / MG-001
 *        （ARENA_EXCLUDED 守卫——MG-001 增项为 V110 DEC-4，CHG-20261110-01）；
 *   E-13 scenario 页 METRIC_PICK 声明 WT-001 / MG-001 键 + FL thermal_model 展示面
 *        （同源取模块源的源级断言——内部常量无 DOM 直读面，fetch 本地不计外联）；
 *   E-14 MG-001 深链系统页 + 四族注入面（v1.1.0 UI 接线路，CHG-20261110-01）：
 *        load_step / shading_link / gust_link / island_event 四族卡在场；
 *        island_event 零参数族（Q2 定案）——无幅值输入、t_clear_s 重连时刻编辑器
 *        缺省 35 s（golden mg001_v1 island_reconnect 锚定值）；
 *   E-15 MG-001 signals 页 + A-3 单 Run 可达包络行（MG001_G2B_SPEC_APPROVED v1.0
 *        §3.5 A-3 修订的 UI 落地面）：关键信号 601 点 + 页脚包络行在场 +
 *        措辞带「不是参数域叉积包络」改标口径。
 *
 * 退出码：0=全部通过；1=存在失败项。报告写 <--out 目录>/e2e-report.json。
 *
 * v1.1.0 MG 六系统波（V110_WAVE_DESIGN §2 W7，CHG-20261110-01 批准链）：
 *   断言 57→65（E-10 增 MG 卡面 1 条、E-13 增 MG 键 1 条、新增 E-14/E-15 各 3 条）；
 *   既有 E-01..E-13 旅程与判据零语义变化（E-10 卡数 5→6、E-12 排除清单增 MG-001
 *   为系统数扩展面）。旅程覆盖清单随 E-14/E-15 增补，执行顺序与退出码不变。
 *
 * V0.3.0 T3 双浏览器追溯增强（不改变旅程、40 条断言、执行顺序与退出码）：
 *   - --out 输出目录在 main() 启动即创建（原为截图/写报告时才创建）；
 *   - environment.browser：CDP Browser.getVersion 实测 product/revision/userAgent/
 *     jsVersion（浏览器级会话，必须在 Target.attachToTarget 设置 sessionId 之前发送）；
 *   - code：commit_sha / branch / worktree_dirty（仅 tracked 变更）；
 *   - execution：started_at / generated_at / duration_ms。
 *   原有顶层字段（journey/ok/pass/fail/failures/environment/generated_at）全部保留。
 */
import { spawn, spawnSync } from 'node:child_process';
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

/* ------------------------------------------------- 追溯信息（T3） */
const STARTED_MS = Date.now();
const STARTED_AT = new Date().toISOString();

/* 受限 Windows 沙箱（workspace-write）下管道 stdio 可能 EPERM（libuv 走 named pipe）：
   子进程输出改走继承的临时文件 fd，使 commit_sha/branch/worktree_dirty 在受限环境
   仍为真实值；stdio:'inherit'/'ignore' 类环境与 danger-full-access 下同样可移植。 */
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
  /* 输出目录在启动浏览器/服务器之前创建（失败也可留痕） */
  fs.mkdirSync(OUT, { recursive: true });
  const server = BASE ? null : startServer();
  const base = BASE || ('http://127.0.0.1:' + PORT);
  let chrome = null;
  let cdp = null;
  let browserVersion = null;
  let browserVersionError = null;
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
    /* 浏览器真实身份：Browser.getVersion 是浏览器级域，必须在
       Target.attachToTarget 设置 cdp.sessionId 之前发送（否则会被路由到页面会话）。 */
    try {
      browserVersion = await cdp.send('Browser.getVersion');
    } catch (e) {
      browserVersionError = e && e.message ? e.message : String(e);
    }
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

    /* E-09 深链残留面（v0.7.0 UI 路探针发现路径固化，v0.7.2 清算项 4）：
       缺陷史——signals 曾把 .pg-signals/.page-pad 挂到 shell 的 section.page 上，
       同特异性下 signals.css（index.html 中晚于 theme.css 加载）的
       .pg-signals{display:block} 压过 .page{display:none}，SPA 离开本页后
       section 恒可见。修复为内层根 div 模式（与 teaching/leaderboard 页同构）。
       本块把发现路径固化为断言：teaching → hash 深链 signals（本会话首次挂载）
       → 切 scenario（SPA 离开）→ #page-signals 必须恢复非激活隐藏。
       E-02 的五视图深链走整页刷新，覆盖不到这条 SPA 残留路径。 */
    await cdp.evalExpr(`FL.store.actions.navigate('teaching');`);
    await wait(450);
    eq(await cdp.evalExpr(`FL.store.getState().page`), 'teaching', 'E-09：SPA 进入教学页');

    /* 深链走 hash 路由（hashchange → navigate），与 actions.navigate 直调不同入口 */
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

    /* 切 scenario：startExperiment 重置为默认场景并 SPA 导航到 system 页 */
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

    /* E-10 六系统卡（v0.8.0 UI 接线路 CHG-20261107-01：home 五系统化 + WT-001 入卡；
       v1.1.0 UI 接线路 CHG-20261110-01：六系统化 + MG-001 入卡——卡名/level 徽章/
       I-5 描述文案面断言） */
    await cdp.send('Page.navigate', { url: base + '/index.html?demo=1&reset=1&page=home' });
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

    /* E-11 WT-001 深链系统页 + 关键信号（WT-G2b-04 UI 接线面：?system= 深链 +
       demo=1 自动建 Run；关键信号取 Run 数据面 601 点——P_wt / d_wt / n_rotor） */
    await cdp.send('Page.navigate', { url: base + '/index.html?demo=1&reset=1&system=WT-001&page=system' });
    await wait(1500);
    const wtRun = await cdp.evalExpr(`(function(){
      const s = FL.store.getState();
      const r = s.activeRun;
      const sig = r && r.timeseries && r.timeseries.signals ? r.timeseries.signals : {};
      const len = function (id) { return sig[id] ? sig[id].length : 0; };
      return { systemId: s.systemId, page: s.page, hasRun: !!r,
               pwt: len('P_wt_true_kW'), dwt: len('d_wt_kW'), nrotor: len('n_rotor_rpm') };
    })()`);
    eq(wtRun.systemId, 'WT-001', 'E-11：?system=WT-001 深链进入 WT 系统页');
    ok(wtRun.hasRun && wtRun.pwt === 601 && wtRun.dwt === 601 && wtRun.nrotor === 601,
      'E-11：WT-001 demo Run 关键信号 601 点可见（P_wt / d_wt / n_rotor）',
      JSON.stringify({ hasRun: wtRun.hasRun, pwt: wtRun.pwt, dwt: wtRun.dwt, nrotor: wtRun.nrotor }));

    /* E-12 Arena 排除 WT-001 / PV-001 / MG-001（ARENA_EXCLUDED 守卫——PV DEC-2 同款，
       CHG-20261107-01；MG-001 增项 = V110 DEC-4，CHG-20261110-01） */
    await cdp.send('Page.navigate', { url: base + '/index.html?page=arena' });
    await wait(700);
    const arenaChk = await cdp.evalExpr(`(function(){
      const sec = document.getElementById('page-arena');
      const sysSeg = sec ? sec.querySelector('.seg[aria-label="选择实验系统"]') : null;
      const vals = sysSeg ? Array.prototype.map.call(sysSeg.querySelectorAll('.seg-item'),
        function (b) { return b.dataset.value; }) : [];
      return { page: FL.store.getState().page, vals: vals, text: sec ? sec.textContent : '' };
    })()`);
    eq(arenaChk.page, 'arena', 'E-12：arena 页打开');
    ok(arenaChk.vals.indexOf('WT-001') === -1 && arenaChk.vals.indexOf('PV-001') === -1 &&
      arenaChk.vals.indexOf('MG-001') === -1 && arenaChk.vals.indexOf('FL-001') !== -1,
      'E-12：arena 系统选择器不含 WT-001 / PV-001 / MG-001（ARENA_EXCLUDED 守卫）', JSON.stringify(arenaChk.vals));
    ok(arenaChk.text.indexOf('WT-001') === -1 && arenaChk.text.indexOf('MG-001') === -1,
      'E-12：arena 页面文本不含 WT-001 / MG-001');

    /* E-13 scenario 页 METRIC_PICK 含 WT-001 / MG-001 键 + FL thermal_model 展示面。
       METRIC_PICK / thermalChipOf 为页面模块内部量：经同源静态服务器取模块源核对
       （源级断言，与 tests/causal-rules.test.js §7 同思路；fetch 127.0.0.1 属本地
       请求，不计入 E-08 外联判定）。 */
    const scnChk = await cdp.evalExpr(`(function(){
      return fetch('src/ui/pages/scenario.js').then(function (r) { return r.text(); }).then(function (t) {
        return { hasWT: /'WT-001':\\s*\\[/.test(t), hasDwt: t.indexOf('d_wt_kW') !== -1,
                 hasMG: /'MG-001':\\s*\\[/.test(t), hasSixSys: t.indexOf('MG-001') !== -1,
                 hasThermal: t.indexOf('thermal_model') !== -1 };
      });
    })()`);
    ok(scnChk.hasWT && scnChk.hasDwt, 'E-13：scenario 页 METRIC_PICK 声明 WT-001 键（focal/ΔE_wt/d_wt）', JSON.stringify(scnChk));
    ok(scnChk.hasMG, 'E-13：scenario 页 METRIC_PICK 声明 MG-001 键（focal 不可用/EQ-MG-8 账本口径）', JSON.stringify(scnChk));
    ok(scnChk.hasThermal, 'E-13：scenario 页含 FL thermal_model off/on 事件列展示面');

    /* E-14 MG-001 深链系统页 + 四族注入面（v1.1.0 UI 接线路 CHG-20261110-01；
       island_event 零参数族 = MG-DRAFT-Q2 定案——无幅值输入，t_clear_s 重连时刻
       编辑器缺省 35 s = golden mg001_v1 island_reconnect 锚定值） */
    await cdp.send('Page.navigate', { url: base + '/index.html?demo=1&reset=1&system=MG-001&page=system' });
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
      const labels = host ? Array.prototype.map.call(host.querySelectorAll('.field-label, label, .field .field-name'),
        function (e) { return e.textContent || ''; }) : [];
      const nums = host ? Array.prototype.map.call(host.querySelectorAll('input[type="number"]'),
        function (e) { return e.value; }) : [];
      const note = (document.querySelector('.sys-param-note, .sys-block-note') || {}).textContent || '';
      const selected = document.querySelector('.sys-family-card.is-selected');
      return { labels: labels, nums: nums, note: note,
               selectedFam: selected ? selected.getAttribute('data-family') : '' };
    })()`);
    eq(mgFam.systemId + '@' + mgFam.page, 'MG-001@system', 'E-14：?system=MG-001 深链进入 MG 系统页');
    ok(['load_step', 'shading_link', 'gust_link', 'island_event'].every(function (f) {
      return mgFam.fams.indexOf(f) !== -1;
    }), 'E-14：MG 四族故障家族卡在场（load_step/shading_link/gust_link/island_event）', JSON.stringify(mgFam.fams));
    ok(mgIslandUI.selectedFam === 'island_event' && mgIslandUI.nums.length === 2 &&
      Number(mgIslandUI.nums[1]) === 35 && mgIslandUI.nums[0].length > 0,
      'E-14：island_event 零参数族注入面（无幅值输入——仅故障时刻 + 重连时刻 t_clear_s，缺省 35 s）',
      JSON.stringify(mgIslandUI));

    /* E-15 MG-001 signals 页 + A-3 单 Run 可达包络行（MG001_G2B_SPEC_APPROVED v1.0
       §3.5 A-3 修订 UI 落地面；措辞带「不是参数域叉积包络」改标口径——不称全域） */
    await cdp.send('Page.navigate', { url: base + '/index.html?demo=1&reset=1&system=MG-001&page=signals' });
    await wait(1500);
    const mgSig = await cdp.evalExpr(`(function(){
      const s = FL.store.getState();
      const r = s.activeRun;
      const sig = r && r.timeseries && r.timeseries.signals ? r.timeseries.signals : {};
      const len = function (id) { return sig[id] ? sig[id].length : 0; };
      const env = document.querySelector('.sig-envelope-row');
      return { page: s.page, runSystem: r ? r.systemId : '',
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

    /* E-08 离线与控制台 */
    ok(externalRequests.length === 0, 'E-08：无外部网络请求（纯浏览器离线）',
      JSON.stringify(externalRequests.slice(0, 8)));
    eq(consoleErrors.length, 0, 'E-08：全程无 console error');

    /* 截图留证 */
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, 'e2e-fl001-min.png'), Buffer.from(shot.data, 'base64'));
  } finally {
    if (cdp) cdp.close();
    if (chrome) { try { chrome.kill(); } catch { /* ignore */ } }
    if (server) { try { server.kill(); } catch { /* ignore */ } }
  }

  const generatedAt = new Date().toISOString();
  const browser = browserVersion
    ? {
        product: browserVersion.product,
        revision: browserVersion.revision,
        userAgent: browserVersion.userAgent,
        jsVersion: browserVersion.jsVersion
      }
    : {
        product: null,
        revision: null,
        userAgent: null,
        jsVersion: null,
        error: browserVersionError
      };
  const report = {
    /* 原有字段（读取兼容） */
    journey: JOURNEY,
    ok: fail === 0,
    pass, fail,
    failures,
    environment: {
      chrome: CHROME,
      base: BASE || ('http://127.0.0.1:' + PORT),
      node: process.version,
      browser
    },
    generated_at: generatedAt,
    /* T3 追溯：代码版本 */
    code: {
      commit_sha: COMMIT_SHA,
      branch: BRANCH,
      worktree_dirty: WORKTREE_DIRTY
    },
    /* T3 追溯：执行信息 */
    execution: {
      started_at: STARTED_AT,
      generated_at: generatedAt,
      duration_ms: Date.now() - STARTED_MS
    }
  };
  fs.writeFileSync(path.join(OUT, 'e2e-report.json'), JSON.stringify(report, null, 2));
  console.log('\n================================================');
  console.log('E2E ' + JOURNEY + '：PASS ' + pass + ' / FAIL ' + fail + (fail ? '  ✗' : '  ✓'));
  console.log('浏览器：' + (browser.product || 'n/a') + '（revision ' + (browser.revision || 'n/a') + '）');
  console.log('追溯：commit=' + (COMMIT_SHA || 'n/a').slice(0, 12) + ' branch=' + (BRANCH || 'n/a') +
    ' dirty=' + WORKTREE_DIRTY + ' node=' + process.version + ' 用时 ' + report.execution.duration_ms + ' ms');
  if (fail) {
    failures.slice(0, 30).forEach((f, i) => console.log('  [' + i + '] ' + f.name + '\n      ' + f.detail));
    console.log('================================================');
    process.exit(1);
  }
  console.log('E2E 冒烟全部通过（五视图/事件相位/单时钟/回放不变/golden/因果/证据包/深链残留面/离线）。');
}

main().catch((e) => {
  console.error('E2E 运行失败：', e && e.message ? e.message : e);
  process.exit(1);
});
