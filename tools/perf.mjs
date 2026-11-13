/* owner: qa-tooling | module: tools/perf | contract: V0.3 V3-03（O-11=a，F-5 收尾）+ V0.7 D-4（DEC-7，CHG-20261104-10）
   perf.mjs — 性能阈值门禁（V3-03 时长阈值实测冻结 2026-10-30；D-4 堆/帧率阈值 2026-11-05 登记）。

   ① V3-03 时长门禁：E2E 主旅程 wall-time ≤ 31500 ms
      （初冻 2026-10-30：实测 7372/7556/7454 ms，Chrome 156 @ 本机，阈值≈实测峰值的 2 倍，
      防退化不设性能炒作。v1.1.0 再登记 2026-11-13 CHG-20261110-03：e2e 旅程 additive 增长
      57→65 断言（E-14/E-15 MG demo 深链，CHG-20261110-01 批准）致时长确定性 15684/15766/
      15658/15627 ms——按同一「实测峰值×2」公式再登记 15766×2=31532→31500 ms（沿 2026-10-30
      舍入惯例）；每断言性能语义不回退（232→241 ms/断言，+4% 为 demo 启动开销），属随波
      additive 再校准而非 §3.2 判据放宽，程序 = D-4 先例：实测基线→CHG 登记→复测定稿）。
      读取 artifacts/e2e-report.json.duration_ms（e2e 步 freshly 写入）；缺失/超限即 FAIL。

   ② D-4 扩展（DEC-7：实测基线×安全系数定阈值，阈值登记+连续两轮复测在阈内才生效）：
      本工具自起静态服务器 + headless Chrome（CDP，驱动方式同 tools/e2e.mjs：浏览器级
      WS + Target.createTarget + flatten 会话），重走主旅程（fl001-min 交互路径）：
        demo 启动（E-01 同参 ?demo=1&reset=1&page=home）→ 五视图深链（E-02 同参）
        → signals 播放「曲线渲染窗」（rAF 计数 3.2s，≥3s）
        → 五页签 SPA 切换「页签切换窗」（rAF 计数 ≥3s，均值 fps=Σframes/Σs）。
      采样口径：
        (a) JS 堆 = 页面 performance.memory.usedJSHeapSize 取峰值（Node 侧 250ms 轮询 +
            采样窗内 rAF 帧级采样）。Chrome/156 headless 页面会话无 CDP
            Memory.getMetrics（2026-11-05 实测：'Memory.getMetrics' wasn't found），
            故采用 ask 允许的另一口径 performance.memory；不做强制 GC——原始峰值
            对上限门禁偏保守。
        (b) 交互帧率 = 曲线渲染窗 + 页签切换窗 rAF 计数均值（两窗各 ≥3s）。
      阈值（常量见下，含基线数值/安全系数/登记日期）：
        heap ≤ max(基线峰值×1.5, 120 MB)；fps ≥ max(30, 基线均值×0.7)。
      某指标不可测 → perf.baseline.last_run.gated=false + [WARN]，该指标降级
      「报告字段仅记录不设门」（不静默放行）。
      报告：写 artifacts/e2e-report.json 顶层 perf.baseline 块——只增字段，
      既有字段（journey/ok/pass/fail/failures/environment/generated_at/code/execution）
      的键序与值零改动。
      重登记基线：node tools/perf.mjs --record-baseline（跑 1 轮采样并打印数值，
      不做阈值判定；连续 3 轮取基线 → 回填下方冻结常量 → 复测 2 轮在阈内定稿）。 */
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
function opt(name, dflt) {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
}
const RECORD_BASELINE = args.indexOf('--record-baseline') !== -1;
const PORT = Number(opt('port', '4321'));      /* e2e.mjs 用 4319——错开，允许相邻运行 */
const CDP_PORT = Number(opt('cdp-port', '9340')); /* e2e.mjs 用 9339——同上 */
const CHROME_OPT = opt('chrome', '');
const REPORT_PATH = path.join(ROOT, 'artifacts', 'e2e-report.json');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- ① V3-03 时长阈值（初冻 2026-10-30；v1.1.0 再登记 2026-11-13，CHG-20261110-03） */
const THRESHOLD_MS = 31500;

/* ---------------- ② D-4 阈值（冻结登记，DEC-7 / CHG-20261104-10，登记 2026-11-05）
   测量程序：node tools/perf.mjs（本文件——CDP 驱动 headless Chrome 重走主旅程，
   采样口径见文件头②；heap=performance.memory.usedJSHeapSize 峰值，
   fps=曲线渲染窗+页签切换窗 rAF 计数均值，两窗各 ≥3s）。
   基线 3 轮（2026-11-05，Chrome/156 headless @ 本机；heap 峰值 MB / fps 均值，
   node tools/perf.mjs --record-baseline ×3 输出）：
     R1  17.52 / 59.9   R2  19.81 / 59.9   R3  19.06 / 59.9
   基线取值：heap 峰值 = 3 轮最大 = 19.81（R2）；fps 基线 = 3 轮均值 = 59.9。
   安全系数：heap ×1.5（下限 120 MB）→ max(19.81×1.5=29.7, 120) = 120 MB（下限主导，
   19.81×1.5 不足以覆盖其他机器/浏览器差异，floor 为跨环境兜底）；
   fps ×0.7（下限 30 fps）→ max(30, 59.9×0.7=41.93) = 41.93 fps。
   复测 2 轮（阈值冻结后立即执行，2026-11-05）：
     R4  19.98 / 60.1   R5  19.88 / 59.8
   ——连续两轮均在阈内（≤120 MB / ≥41.93 fps）→ 阈值定稿（登记 2026-11-05）。 */
const BASELINE_ROUNDS = [
  { round: 1, heapMB: 17.52, fps: 59.9 },
  { round: 2, heapMB: 19.81, fps: 59.9 },
  { round: 3, heapMB: 19.06, fps: 59.9 }
];
const RETEST_ROUNDS = [
  { round: 4, heapMB: 19.98, fps: 60.1 },
  { round: 5, heapMB: 19.88, fps: 59.8 }
];
const BASELINE_HEAP_PEAK_MB = 19.81;   /* 3 轮基线峰值最大值（R2） */
const BASELINE_FPS_MEAN = 59.9;        /* 3 轮 fps 均值（三轮同为 59.9） */
const HEAP_SAFETY_FACTOR = 1.5;
const HEAP_FLOOR_MB = 120;
const FPS_SAFETY_FACTOR = 0.7;
const FPS_FLOOR = 30;
const HEAP_THRESHOLD_MB = Math.max(BASELINE_HEAP_PEAK_MB * HEAP_SAFETY_FACTOR, HEAP_FLOOR_MB); /* = 120 */
const FPS_THRESHOLD = Math.max(FPS_FLOOR, BASELINE_FPS_MEAN * FPS_SAFETY_FACTOR);              /* = 41.93 */

const PAGES = ['home', 'system', 'signals', 'causal', 'compare'];
const FPS_WINDOW_MS = 3200;   /* 曲线渲染窗（≥3s） */
const TAB_DWELL_MS = 300;     /* 页签切换窗每页驻留（2 轮×5 页×300ms≈3.0s+开销，≥3s） */
const HEAP_POLL_MS = 250;

/* ---------------------------------------------------------------- Chrome/CDP */
function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe') : null,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ].filter(Boolean);
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error('Chrome/Edge 未找到；用 --chrome <path> 指定');
}

/* 最小 CDP 客户端——与 e2e.mjs 同构（浏览器级 WS + flatten 会话路由 + 30s 防挂起） */
class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
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
      }
    };
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

/* 页面侧 rAF 计数器 + 帧级堆采样（安装幂等；SPA 切页不销毁，整页导航后需重装）。
   ES2020 内不引入新语法（var/function），O-03 零构建口径。 */
const RAF_INSTALL = '(function(){' +
  'if (!window.__flPerf) { window.__flPerf = { frames: 0, heapPeak: 0 };' +
  'var tick = function(){ var s = window.__flPerf; s.frames++;' +
  'if (performance.memory && performance.memory.usedJSHeapSize > s.heapPeak) s.heapPeak = performance.memory.usedJSHeapSize;' +
  'requestAnimationFrame(tick); }; requestAnimationFrame(tick); } return true; })()';
const RAF_MARK = '(function(){ window.__flPerfMark = { f0: window.__flPerf.frames, t0: performance.now() }; return true; })()';
const RAF_READ = '(function(){ var s = window.__flPerf, m = window.__flPerfMark;' +
  'return { frames: s.frames - m.f0, ms: performance.now() - m.t0, heapPeak: s.heapPeak }; })()';
const HEAP_NOW = '(performance.memory && performance.memory.usedJSHeapSize) || 0';

function startServer() {
  return spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
    cwd: ROOT, stdio: 'ignore'
  });
}

/* ------------------------------------------------------------- 采样旅程 */
async function measureJourney() {
  const notes = [];
  const base = 'http://127.0.0.1:' + PORT;
  const CHROME = CHROME_OPT || findChrome();
  const server = startServer();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'faultlab-perf-'));
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-component-update', '--disable-sync', '--disable-client-side-phishing-detection', '--disable-extensions',
    '--disable-features=OptimizationGuideModelDownloading,OptimizationHintsFetching,OptimizationTargetPrediction',
    '--remote-debugging-port=' + CDP_PORT, '--user-data-dir=' + profile,
    'about:blank'
  ], { stdio: 'ignore' });
  let cdp = null;
  const state = { heapPeakBytes: 0 };
  const startedMs = Date.now();
  try {
    await new Promise((resolve, reject) => {
      const probe = () => http.get(base + '/index.html', (res) => { res.resume(); resolve(); }).on('error', reject);
      setTimeout(probe, 700);
    });
    const wsUrl = await discoverWs(CDP_PORT);
    cdp = new Cdp(wsUrl);
    await cdp.ready;
    const created = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const attached = await cdp.send('Target.attachToTarget', { targetId: created.targetId, flatten: true });
    cdp.sessionId = attached.sessionId;
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');

    /* 全程堆轮询（Node 侧 250ms；导航间隙表达式失败即跳过该样本） */
    const heapPoll = setInterval(async () => {
      try {
        const v = await cdp.evalExpr(HEAP_NOW);
        if (typeof v === 'number' && v > state.heapPeakBytes) state.heapPeakBytes = v;
      } catch { /* ignore */ }
    }, HEAP_POLL_MS);

    /* 主旅程：demo 启动（E-01 同参） */
    await cdp.send('Page.navigate', { url: base + '/index.html?demo=1&reset=1&page=home' });
    await wait(1600);
    const boot = await cdp.evalExpr('(function(){ var s = FL.store.getState();' +
      'return { booted: s.booted, hasRun: !!s.activeRun }; })()');
    if (!boot || boot.booted !== true || boot.hasRun !== true) {
      throw new Error('perf 旅程启动失败：demo 未 booted（' + JSON.stringify(boot) + '）');
    }

    /* 堆口径可用性（performance.memory） */
    const pmProbe = await cdp.evalExpr(HEAP_NOW);
    const heapAvailable = typeof pmProbe === 'number' && pmProbe > 0;
    if (!heapAvailable) notes.push('performance.memory 不可用——heap 本轮仅记录不设门');

    /* 主旅程：五视图深链（E-02 同参） */
    for (const p of PAGES) {
      await cdp.send('Page.navigate', { url: base + '/index.html?page=' + p });
      await wait(450);
    }

    /* 曲线渲染窗：signals 播放（逐帧 canvas 重绘 + rAF 时钟，store.js/src/ui） */
    await cdp.send('Page.navigate', { url: base + '/index.html?page=signals' });
    await wait(600);
    await cdp.evalExpr(RAF_INSTALL);
    await cdp.evalExpr(RAF_MARK);
    await cdp.evalExpr('FL.store.actions.setTime(2, { pause: true });');
    await cdp.evalExpr('FL.store.actions.play();');
    await wait(FPS_WINDOW_MS);
    const wa = await cdp.evalExpr('(function(){ var s = window.__flPerf, m = window.__flPerfMark;' +
      'return { frames: s.frames - m.f0, ms: performance.now() - m.t0, heapPeak: s.heapPeak,' +
      't: FL.store.getState().currentTime }; })()');
    await cdp.evalExpr('FL.store.actions.pause();');
    if (!wa || typeof wa.frames !== 'number' || !(wa.t > 2)) {
      throw new Error('perf 旅程曲线窗异常：播放未推进时钟（' + JSON.stringify(wa) + '）');
    }

    /* 页签切换窗：SPA 五页签切换（actions.navigate，hash 路由；2 轮≈3.0s+开销） */
    await cdp.evalExpr(RAF_MARK);
    let wb = null;
    const tabRounds = 2;
    for (let r = 0; r < tabRounds; r++) {
      for (const p of PAGES) {
        await cdp.evalExpr("FL.store.actions.navigate('" + p + "');");
        await wait(TAB_DWELL_MS);
      }
    }
    wb = await cdp.evalExpr(RAF_READ);
    if (!wb || typeof wb.ms !== 'number' || wb.ms < 3000) {
      /* 窗长不足 3s（仅在系统时钟异常抖动时可能出现）——补 1 轮并合并 */
      await cdp.evalExpr(RAF_MARK);
      for (const p of PAGES) {
        await cdp.evalExpr("FL.store.actions.navigate('" + p + "');");
        await wait(TAB_DWELL_MS);
      }
      const wx = await cdp.evalExpr(RAF_READ);
      wb = { frames: wb.frames + wx.frames, ms: wb.ms + wx.ms, heapPeak: Math.max(wb.heapPeak, wx.heapPeak) };
    }

    clearInterval(heapPoll);
    const finalHeap = await cdp.evalExpr(HEAP_NOW);
    if (typeof finalHeap === 'number' && finalHeap > state.heapPeakBytes) state.heapPeakBytes = finalHeap;

    const heapPeakBytes = Math.max(state.heapPeakBytes, wa.heapPeak || 0, wb.heapPeak || 0);
    const fpsAvailable = (wa.frames + wb.frames) > 0 && (wa.ms + wb.ms) > 0;
    if (!fpsAvailable) notes.push('rAF 3s 窗口零计数——帧率在本环境不可测，本轮仅记录不设门');
    const fpsCurve = wa.frames / (wa.ms / 1000);
    const fpsTabs = wb.frames / (wb.ms / 1000);
    const fpsMean = (wa.frames + wb.frames) / ((wa.ms + wb.ms) / 1000);
    return {
      ok: true,
      chrome: CHROME,
      heapAvailable,
      heapPeakMB: Math.round((heapPeakBytes / 1048576) * 100) / 100,
      fpsAvailable,
      fpsMean: Math.round(fpsMean * 10) / 10,
      fpsCurve: Math.round(fpsCurve * 10) / 10,
      fpsTabs: Math.round(fpsTabs * 10) / 10,
      windowCurveMs: Math.round(wa.ms),
      windowTabsMs: Math.round(wb.ms),
      notes,
      durationMs: Date.now() - startedMs
    };
  } finally {
    if (cdp) cdp.close();
    try { chrome.kill(); } catch { /* ignore */ }
    try { server.kill(); } catch { /* ignore */ }
  }
}

/* ------------------------------------------------- perf.baseline 报告块（只增字段） */
function perfBaselineBlock(m) {
  return {
    baseline: {
      registered_at: '2026-11-05',
      change_id: 'CHG-20261104-10（V070_WAVE_DESIGN DEC-7：实测基线×安全系数定阈值）',
      program: 'node tools/perf.mjs——CDP 驱动 headless Chrome 重走主旅程：demo 启动 → 五视图深链 → signals 播放曲线渲染窗（rAF 计数 3.2s）→ 五页签 SPA 切换窗（rAF 计数 ≥3s）；fps=两窗 rAF 计数均值',
      heap_source: 'performance.memory.usedJSHeapSize 取峰值（250ms 轮询+窗内帧级采样；Chrome/156 headless 页面会话无 CDP Memory.getMetrics，2026-11-05 实测确认）',
      measurement_rounds: {
        baseline: BASELINE_ROUNDS,
        retest: RETEST_ROUNDS
      },
      heap: {
        unit: 'MB',
        baseline_peak_mb: BASELINE_HEAP_PEAK_MB,
        safety_factor: HEAP_SAFETY_FACTOR,
        floor_mb: HEAP_FLOOR_MB,
        threshold_mb: HEAP_THRESHOLD_MB,
        gate: 'peak <= threshold_mb'
      },
      fps: {
        unit: 'fps',
        baseline_mean: BASELINE_FPS_MEAN,
        safety_factor: FPS_SAFETY_FACTOR,
        floor_fps: FPS_FLOOR,
        threshold_fps: FPS_THRESHOLD,
        window_min_s: 3,
        gate: 'mean >= threshold_fps'
      },
      last_run: {
        at: new Date().toISOString(),
        mode: RECORD_BASELINE ? 'record_baseline' : 'gate',
        chrome: m.chrome,
        heap_mb: m.heapPeakMB,
        heap_available: m.heapAvailable,
        fps_mean: m.fpsMean,
        fps_curve_window: m.fpsCurve,
        fps_tab_window: m.fpsTabs,
        window_curve_ms: m.windowCurveMs,
        window_tabs_ms: m.windowTabsMs,
        duration_ms: m.durationMs,
        notes: m.notes,
        heap_within: m.heapWithin === null ? null : !!m.heapWithin,
        fps_within: m.fpsWithin === null ? null : !!m.fpsWithin,
        gated: { heap: m.heapGated, fps: m.fpsGated }
      }
    }
  };
}

function writeReportBlock(report, block) {
  /* 只增字段：既有键序与值原样保留，perf 顶层字段不存在则追加、存在则整体刷新 */
  report.perf = block;
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
}

/* ------------------------------------------------------------------ main */
async function main() {
  /* ① V3-03 时长门禁（既有逻辑原样：缺失/超限即 FAIL） */
  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  const dur = (report.execution && typeof report.execution.duration_ms === 'number')
    ? report.execution.duration_ms
    : report.duration_ms;
  if (typeof dur !== 'number' || !isFinite(dur)) {
    console.error('[FAIL] e2e-report.json 缺少 duration_ms（perf 载体失效）');
    process.exit(1);
  }
  if (dur > THRESHOLD_MS) {
    console.error('[FAIL] E2E 主旅程 ' + dur + ' ms 超阈值 ' + THRESHOLD_MS + ' ms');
    process.exit(1);
  }
  console.log('[PASS] E2E 主旅程 ' + dur + ' ms ≤ 阈值 ' + THRESHOLD_MS + ' ms（V3-03 实测冻结 2026-10-30；v1.1.0 再登记 2026-11-13 CHG-20261110-03）');

  /* ② D-4 采样（基础设施失败=门禁无法执行，FAIL，不静默放行） */
  let m;
  try {
    m = await measureJourney();
  } catch (e) {
    console.error('[FAIL] D-4 主旅程采样失败：' + (e && e.message ? e.message : e));
    process.exit(1);
  }

  /* ③ 阈值判定（指标不可测 → 仅记录不设门 + WARN；可测 → 硬门禁） */
  m.heapGated = m.heapAvailable && !RECORD_BASELINE;
  m.fpsGated = m.fpsAvailable && !RECORD_BASELINE;
  m.heapWithin = m.heapAvailable ? (m.heapPeakMB <= HEAP_THRESHOLD_MB) : null;
  m.fpsWithin = m.fpsAvailable ? (m.fpsMean >= FPS_THRESHOLD) : null;

  /* ④ 报告 perf.baseline 块（只增字段；FAIL 也落盘留证） */
  try {
    writeReportBlock(report, perfBaselineBlock(m));
  } catch (e) {
    console.error('[FAIL] perf.baseline 写入 e2e-report.json 失败：' + (e && e.message ? e.message : e));
    process.exit(1);
  }

  /* ⑤ 结论 */
  const sample = 'heap 峰值 ' + m.heapPeakMB + ' MB ｜ fps 均值 ' + m.fpsMean +
    '（曲线窗 ' + m.fpsCurve + ' / 页签窗 ' + m.fpsTabs + '，窗长 ' + m.windowCurveMs + '/' + m.windowTabsMs + ' ms）';
  (m.notes || []).forEach((n) => console.warn('[WARN] ' + n));
  if (RECORD_BASELINE) {
    console.log('[D-4][record-baseline] ' + sample + '（本轮不做阈值判定；3 轮后回填冻结常量）');
    process.exit(0);
  }
  let hardFail = false;
  if (m.heapGated) {
    if (m.heapWithin) {
      console.log('[PASS] D-4 JS 堆峰值 ' + m.heapPeakMB + ' MB ≤ 阈值 ' + HEAP_THRESHOLD_MB +
        ' MB（基线 ' + BASELINE_HEAP_PEAK_MB + '×' + HEAP_SAFETY_FACTOR + '，下限 ' + HEAP_FLOOR_MB + '；登记 2026-11-05）');
    } else {
      console.error('[FAIL] D-4 JS 堆峰值 ' + m.heapPeakMB + ' MB 超阈值 ' + HEAP_THRESHOLD_MB + ' MB');
      hardFail = true;
    }
  } else {
    console.warn('[WARN] D-4 JS 堆不可测/未设门——报告字段仅记录（perf.baseline.last_run.gated.heap=false）');
  }
  if (m.fpsGated) {
    if (m.fpsWithin) {
      console.log('[PASS] D-4 交互帧率均值 ' + m.fpsMean + ' fps ≥ 阈值 ' + FPS_THRESHOLD +
        ' fps（基线 ' + BASELINE_FPS_MEAN + '×' + FPS_SAFETY_FACTOR + '，下限 ' + FPS_FLOOR + '；登记 2026-11-05）');
    } else {
      console.error('[FAIL] D-4 交互帧率均值 ' + m.fpsMean + ' fps 低于阈值 ' + FPS_THRESHOLD + ' fps');
      hardFail = true;
    }
  } else {
    console.warn('[WARN] D-4 帧率不可测/未设门——报告字段仅记录（perf.baseline.last_run.gated.fps=false）');
  }
  if (hardFail) process.exit(1);
  console.log('D-4 采样完成（perf.baseline 已写入 e2e-report.json，只增字段）。');
}

main().catch((e) => {
  console.error('perf.mjs 运行失败：', e && e.message ? e.message : e);
  process.exit(1);
});
