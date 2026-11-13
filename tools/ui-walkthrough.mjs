/**
 * ui-walkthrough.mjs — CDP 六系统深度走查（正式化；发布轮手工执行工具，不进 run-g2）。
 *
 * 来历（V090_WAVE_DESIGN DEC-5 残留②清算；v080-release §4 残留原文）：
 *   v0.7.2 以**临时脚本**执行 CDP 深度走查 50/50（home 四系统化 + 徽章/原理卡轮），
 *   按纪律删除后 v0.8.0 未做（以 e2e 57 + file:// 冒烟 61×3 覆盖主旅程）。本文件按
 *   v0.7.2 T3 体例 50 断言重建为正式工具，并扩展到五系统覆盖；v1.1.0 MG 六系统波
 *   （V110_WAVE_DESIGN §2 W7，CHG-20261110-01 批准链）扩展到六系统 59 断言；
 *   V120 FC 电化学轨波（V120_WAVE_DESIGN §2 W5，CHG-20261113-01 批准链）增 §G
 *   FC on 轨走查（4 断言，全 additive）至 63 断言。
 *
 * **使用规程（发布轮）**：
 *   1. 本工具**不进 run-g2**（深度走查耗时，V090_WAVE_DESIGN DEC-5 定案）；
 *      run-g2 的浏览器面由 ② e2e.mjs + 第 31 步 file-smoke.mjs 承担；
 *   2. 发布轮（G8）手工执行并归档证据：
 *        node tools/ui-walkthrough.mjs --out FaultLab-evaluation/NEXT/evidence/g8/walkthrough
 *      报告 ui-walkthrough-report.json + 各系统页截图写入 --out 目录；
 *   3. 走查对象 = index.html 开发态（--port 起 http.server；发布工件面由
 *      tools/file-smoke.mjs 以 file:// 覆盖，两者互补不重复）；
 *   4. 退出码 0=63 断言全过；1=存在失败项。失败即发布轮阻塞项，按 G4 惯例留痕。
 *
 * 覆盖（63 断言；v0.7.2 T3 体例 + 六系统扩展 + V120 §G）：
 *   §A home 六系统卡（7）：卡数/卡序/徽章面（基准实验/已验收/扩展预览）/level 徽章/
 *      默认故障行/tagline/CTA；
 *   §B 实验详情面板（12 = 6 系统 × 2）：详情主面板 + level 徽章、三问题块恰 3 项；
 *   §C 故障原理卡（12 = 6 系统 × 2）：展开态内容面；FL/FC/GT 参数化静态图解
 *      （3 张 svg）vs PV/WT/MG 声明性机制说明（机制说明徽章 + 边界注记）；
 *   §D 系统页深链（18 = 6 系统 × 3）：?system= 深链、SVG 拓扑节点面、部件检查器；
 *   §E 对比/场景/曲线六系统声明面（6）：compare 六系统指标行、
 *      scenario METRIC_PICK 六系统键（源级）、scenario 页渲染 + MG-001 枚举在场、
 *      signals 页 WT Run、signals 页 MG Run 601 点、A-3 MG 单 Run 可达包络行
 *      （MG001_G2B_SPEC_APPROVED v1.0 §3.5 A-3 修订 UI 落地面，措辞带改标口径）；
 *   §G FC-001 电化学轨 on 走查（4；V120 W5，FC001_ELECTROCHEM_G2B_SPEC_APPROVED
 *      v1.0 §1.6）：on 轨 Run 数据面（cfg electrochem_model=on + T_st 601 点）、
 *      system 页 level_on 徽章 + summary_on 摘要 + on 轨模型声明面板
 *      （A-fcec 假设 + L1-lite 定位句——B-2 变体渲染面）、signals 页热力类目
 *      T_st 信号行（24 列通用渲染面）；轨翻转经既有草稿/运行语义（updateDraft +
 *      createRun 标准入口），REDLINE_TERMS 零改动；
 *   §F 全程守卫（4）：零 console error、零外部请求、渲染文本无 undefined 泄漏、
 *      肯定性孤岛检测/保护/检同期与电网保护/稳定验证类红线词渲染面扫描
 *      （B-1 口径——「孤岛」裸词为 MG-001 状态/模式命名面（孤岛状态/孤岛面/
 *      孤岛平衡填补）不入扫描；limitations 命名块经 collectText 剔除后扫描）。
 *
 * 用法：
 *   node tools/ui-walkthrough.mjs                 # 默认端口 4323/9343，报告写 artifacts/
 *   node tools/ui-walkthrough.mjs --out <dir>     # 发布轮归档目录
 *   node tools/ui-walkthrough.mjs --chrome <path> # 指定浏览器（Edge 取证同 e2e 体例）
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
const PORT = Number(opt('port', '4323'));
const CDP_PORT = Number(opt('cdp-port', '9343'));
const OUT = path.resolve(ROOT, opt('out', 'artifacts'));
const CHROME = opt('chrome', findChrome());
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const STARTED_MS = Date.now();
const STARTED_AT = new Date().toISOString();

/* 孤岛/并网类红线词（渲染面扫描用；CHG-20261108-01 波次纪律 + MG001_G2B_SPEC_APPROVED
   v1.0 §6.3 I-5 专项 B-1 口径，V110 W7 同步）。扫描收「肯定性禁用语义」词根：
   - 孤岛检测/保护类（孤岛检测/孤岛保护/防孤岛/检同期）——肯定性出现即禁；
   - 电网保护/稳定验证类（并网保护/电网保护/稳定验证/低电压穿越/高电压穿越/解列/重合闸）。
   注 1：裸「孤岛」自 v1.1.0 起不入扫描词根——MG-001 状态/模式命名面（孤岛状态/
   孤岛面/孤岛平衡填补）为 B-1 允许的命名（状态量非检测量），肯定性检测/保护语义
   已由本表词根覆盖；孤岛教学点文案只允许「脱离主馈线的功率平衡重整演示」类表述。
   注 2：limitations 命名块（B-1 允许的词面语境）在 collectText 中剔除后扫描——
   PV/MG 的未建模物理命名句属 model 元数据面（信号页「模型假设与局限」折叠块与
   对比页「模型局限与数据性质」卡），不入肯定性教学文案扫描面。
   注 3：既有 G2b 批准文案以「光伏并网等效演示 / 光伏并网（扩展）」为**拓扑描述词**，
   不含保护/稳定验证语义，故裸「并网」不入扫描词根。 */
const REDLINE_TERMS = ['孤岛检测', '孤岛保护', '防孤岛', '检同期', '并网保护', '电网保护', '稳定验证',
  '低电压穿越', '高电压穿越', '解列', '重合闸'];

const SYSTEMS = ['FL-001', 'FC-001', 'GT-001', 'PV-001', 'WT-001', 'MG-001'];
/* 原理卡形态面：测量偏置三系统 = 参数化静态图解（PRINCIPLE_DIAGRAM 注册键）；
   PV/WT/MG = 声明性机制说明卡（home.js buildPrincipleCard）。 */
const DIAGRAM_SYSTEMS = ['FL-001', 'FC-001', 'GT-001'];

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

function startServer() {
  return spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
    cwd: ROOT, stdio: 'ignore'
  });
}

/* ------------------------------------------------------------- 断言面 */
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

/* 源级断言（Node 侧直读，与 e2e E-13 / file-smoke E-13 同思路） */
function sourceChecks() {
  const scenarioSrc = fs.readFileSync(path.join(ROOT, 'src', 'ui', 'pages', 'scenario.js'), 'utf8');
  const pickKeys = SYSTEMS.filter((id) => new RegExp("'" + id + "':\\s*\\[").test(scenarioSrc));
  return { pickKeys };
}

/* 渲染文本采集（泄漏/红线扫描用）。v1.1.0 起剔除 B-1 允许语境的 limitations
   命名块（未建模物理命名词面属 model 元数据面，不入肯定性教学文案红线扫描，
   REDLINE_TERMS 注 2）：信号页「模型假设与局限」折叠块（.sig-foot-details）与
   对比页「模型局限与数据性质」卡（.cp-lim-card）。 */
async function collectText(cdp, pageId) {
  return cdp.evalExpr(`(function(){
    const sec = document.getElementById('${pageId}');
    if (!sec) return '';
    const clone = sec.cloneNode(true);
    clone.querySelectorAll('.sig-foot-details, .cp-lim-card').forEach(function (n) { n.remove(); });
    return clone.textContent;
  })()`);
}

/* ------------------------------------------------------------- journey */
async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = startServer();
  const base = 'http://127.0.0.1:' + PORT;
  let chrome = null;
  let cdp = null;
  let browserVersion = null;
  const pageTexts = {};
  try {
    await new Promise((resolve, reject) => {
      const probe = () => http.get(base + '/index.html', (res) => { res.resume(); resolve(); }).on('error', reject);
      setTimeout(probe, 700);
    });
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'faultlab-walkthrough-'));
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
    try { browserVersion = await cdp.send('Browser.getVersion'); } catch { /* 追溯字段 */ }
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
      const pageTypes = ['Document', 'Script', 'Stylesheet', 'Image', 'Fetch', 'XHR', 'Font', 'Manifest'];
      const url = p.request.url;
      const isLocal = /^data:/.test(url) || /^blob:/.test(url) || /127\.0\.0\.1|localhost/.test(url);
      if (pageTypes.indexOf(p.type) !== -1 && !isLocal) externalRequests.push(p.type + ' ' + url);
    });

    /* ===== §A home 六系统卡（7 断言） ===== */
    await cdp.send('Page.navigate', { url: base + '/index.html?demo=1&reset=1&page=home' });
    await wait(1600);
    pageTexts.home = await collectText(cdp, 'page-home');
    const cards = await cdp.evalExpr(`(function(){
      const els = Array.prototype.slice.call(document.querySelectorAll('.home-sys-card'));
      return els.map(function (c) {
        const badge = c.querySelector('.home-sys-top .badge');
        return { id: c.getAttribute('data-system'),
                 badge: badge ? badge.textContent : '',
                 level: (c.querySelector('.home-sys-level') || {}).textContent || '',
                 fault: (c.querySelector('.home-sys-fault-text') || {}).textContent || '',
                 tagline: (c.querySelector('.home-sys-tagline') || {}).textContent || '',
                 cta: c.textContent.indexOf('查看实验详情') !== -1 };
      });
    })()`);
    eq(cards.length, 6, 'W-A1：home 六系统卡（count=6）');
    eq(JSON.stringify(cards.map((c) => c.id)), JSON.stringify(SYSTEMS), 'W-A2：卡序 = FL/FC/GT/PV/WT/MG（注册序）');
    const flBadge = cards.filter((c) => c.id === 'FL-001')[0] || {};
    const fcBadge = cards.filter((c) => c.id === 'FC-001')[0] || {};
    const extBadges = cards.filter((c) => c.id !== 'FL-001' && c.id !== 'FC-001');
    ok(flBadge.badge === '基准实验' && fcBadge.badge.indexOf('已验收') !== -1 &&
      extBadges.every((c) => c.badge.length > 0),
      'W-A3：徽章面（FL 基准实验 / FC 已验收 / GT·PV·WT·MG 扩展预览徽章非空）',
      JSON.stringify(cards.map((c) => [c.id, c.badge])));
    /* v1.1.0 起子串判定：MG-001 level =「聚合层 L0 · 多源聚合行为级演示（G2b 已批准）」
       以「聚合层」起头（I-2 不升级 provenance），L 令牌为子串非前缀。 */
    ok(cards.every((c) => /L\d[a-z]?/.test(c.level)), 'W-A4：六卡 level 徽章含 L 令牌（' +
      cards.map((c) => c.id + '=' + c.level).join(' / ') + '）');
    ok(cards.every((c) => c.fault.length > 0), 'W-A5：六卡默认故障行非空');
    ok(cards.every((c) => c.tagline.length > 0), 'W-A6：六卡 tagline 非空');
    ok(cards.every((c) => c.cta), 'W-A7：六卡均带「查看实验详情」CTA');

    /* ===== §B 详情面板（12 = 6×2） + §C 故障原理卡（12 = 6×2） ===== */
    for (const sysId of SYSTEMS) {
      await cdp.evalExpr(`(function(){
        const card = document.querySelector('.home-sys-card[data-system="${sysId}"]');
        if (card) card.click();
      })()`);
      await wait(250);
      const detail = await cdp.evalExpr(`(function(){
        const main = document.querySelector('.home-detail-main');
        const qList = document.querySelectorAll('.home-q-list li');
        const headBadge = main ? main.querySelector('.panel-head .badge') : null;
        return { hasMain: !!main, title: main ? (main.querySelector('.home-detail-title') || {}).textContent || '' : '',
                 level: headBadge ? headBadge.textContent : '', qCount: qList.length };
      })()`);
      ok(detail.hasMain && detail.title.length > 0 && detail.level.length > 0,
        'W-B：' + sysId + ' 详情主面板（标题 + level 徽章）');
      eq(detail.qCount, 3, 'W-B：' + sysId + ' 三问题块恰 3 项');

      /* 原理卡：未展开则点开（teaser 态按钮「展开故障原理」或动作按钮「查看故障原理」） */
      const opened = await cdp.evalExpr(`(function(){
        const sec = document.querySelector('.home-principle');
        if (!sec) return { found: false, open: false };
        if (!sec.classList.contains('is-open')) {
          const btn = Array.prototype.find.call(sec.querySelectorAll('button'),
            function (b) { return /展开故障原理|查看故障原理/.test(b.textContent); });
          if (btn) btn.click();
        }
        return { found: true, open: sec.classList.contains('is-open') };
      })()`);
      await wait(250);
      const principle = await cdp.evalExpr(`(function(){
        const sec = document.querySelector('.home-principle');
        if (!sec) return { found: false };
        const badge = sec.querySelector('.panel-head .badge');
        return { found: true, open: sec.classList.contains('is-open'),
                 hasContent: !!sec.querySelector('.home-principle-content'),
                 svgCount: sec.querySelectorAll('.home-principle-svg').length,
                 badge: badge ? badge.textContent : '',
                 noteCount: sec.querySelectorAll('.home-principle-note').length };
      })()`);
      ok(principle.found && principle.open && principle.hasContent,
        'W-C：' + sysId + ' 故障原理卡展开态内容面');
      if (DIAGRAM_SYSTEMS.indexOf(sysId) !== -1) {
        eq(principle.svgCount, 3, 'W-C：' + sysId + ' 参数化静态图解 3 张 svg（' + principle.badge + '）');
      } else {
        ok(principle.badge === '机制说明' && principle.noteCount > 0,
          'W-C：' + sysId + ' 声明性机制说明卡（徽章=' + principle.badge + '，边界注记 ' + principle.noteCount + ' 条）');
      }
    }

    /* ===== §D 系统页深链（18 = 6×3） ===== */
    for (const sysId of SYSTEMS) {
      await cdp.send('Page.navigate', { url: base + '/index.html?demo=1&reset=1&system=' + sysId + '&page=system' });
      await wait(1300);
      pageTexts['system-' + sysId] = await collectText(cdp, 'page-system');
      const sysPage = await cdp.evalExpr(`(function(){
        const s = FL.store.getState();
        const nodes = document.querySelectorAll('.sys-node[data-component]');
        const svg = document.querySelector('#page-system svg');
        const insp = document.getElementById('sys-inspector');
        return { systemId: s.systemId, page: s.page,
                 nodeCount: nodes.length, viewBox: svg ? (svg.getAttribute('viewBox') || '') : '',
                 hasInsp: !!insp, inspText: insp ? insp.textContent.length : 0,
                 faultBadge: !!document.querySelector('.sys-fault-badge') };
      })()`);
      eq(sysPage.systemId + '@' + sysPage.page, sysId + '@system',
        'W-D：' + sysId + ' ?system= 深链进系统页');
      ok(sysPage.nodeCount >= 3 && sysPage.viewBox.length > 0,
        'W-D：' + sysId + ' SVG 拓扑节点面（' + sysPage.nodeCount + ' 节点，viewBox 在场）');
      ok(sysPage.hasInsp && sysPage.inspText > 0 && sysPage.faultBadge,
        'W-D：' + sysId + ' 部件检查器 + 故障徽章在场');
    }

    /* ===== §E 对比/场景/曲线六系统声明面（6 断言） ===== */
    /* compare 六系统渲染覆盖：base 组服务 FL/FC/GT、bySystem 覆盖 PV/WT/MG
       （compare.js METRIC_GROUPS 结构；MG 另有 mg-island onlySystems 组）——
       逐系统指标行 > 0（聚合 1 断言）。 */
    const cmpRows = {};
    for (const sysId of SYSTEMS) {
      await cdp.send('Page.navigate', { url: base + '/index.html?demo=1&reset=1&system=' + sysId + '&page=compare' });
      await wait(1100);
      cmpRows[sysId] = await cdp.evalExpr(
        `document.querySelectorAll('#page-compare .cp-metric-row').length`);
    }
    ok(SYSTEMS.every((id) => cmpRows[id] > 0),
      'W-E：compare 页六系统指标行均渲染（base 组 + bySystem/onlySystems 覆盖面）',
      JSON.stringify(cmpRows));
    const srcChk = sourceChecks();
    eq(JSON.stringify(srcChk.pickKeys), JSON.stringify(SYSTEMS),
      'W-E：scenario.js METRIC_PICK 声明六系统键（源级）', JSON.stringify(srcChk.pickKeys));
    await cdp.send('Page.navigate', { url: base + '/index.html?demo=1&reset=1&page=scenario' });
    await wait(1200);
    pageTexts.scenario = await collectText(cdp, 'page-scenario');
    const scnPage = await cdp.evalExpr(`(function(){
      const sec = document.getElementById('page-scenario');
      const ta = sec ? sec.querySelector('[data-testid="scenario-import-text"]') : null;
      const ph = ta ? (ta.getAttribute('placeholder') || '') : '';
      return { page: FL.store.getState().page, len: sec ? sec.textContent.length : 0,
               hasMgEnum: ph.indexOf('MG-001') !== -1 && ph.indexOf('WT-001') !== -1 };
    })()`);
    ok(scnPage.page === 'scenario' && scnPage.len > 100 && scnPage.hasMgEnum,
      'W-E：scenario 页渲染面非空（' + scnPage.len + ' 字符）+ 导入占位枚举含 MG-001（六系统——placeholder 属性面）');
    await cdp.send('Page.navigate', { url: base + '/index.html?demo=1&reset=1&system=WT-001&page=signals' });
    await wait(1300);
    const sigPage = await cdp.evalExpr(`(function(){
      const s = FL.store.getState();
      const r = s.activeRun;
      const sec = document.getElementById('page-signals');
      return { page: s.page, systemId: s.systemId, hasRun: !!r,
               runSystem: r ? r.systemId : '', hasRoot: !!sec, len: sec ? sec.textContent.length : 0 };
    })()`);
    ok(sigPage.page === 'signals' && sigPage.runSystem === 'WT-001' && sigPage.hasRoot && sigPage.len > 100,
      'W-E：signals 页 WT-001 Run 渲染面（系统深链 + 曲线页就绪）');
    /* MG-001 signals 页 + A-3 单 Run 可达包络行（MG001_G2B_SPEC_APPROVED v1.0 §3.5
       A-3 修订 UI 落地面——页脚包络行，措辞带「不是参数域叉积包络」改标口径）。 */
    await cdp.send('Page.navigate', { url: base + '/index.html?demo=1&reset=1&system=MG-001&page=signals' });
    await wait(1300);
    const mgSigPage = await cdp.evalExpr(`(function(){
      const s = FL.store.getState();
      const r = s.activeRun;
      const sig = r && r.timeseries && r.timeseries.signals ? r.timeseries.signals : {};
      const len = function (id) { return sig[id] ? sig[id].length : 0; };
      const sec = document.getElementById('page-signals');
      const env = document.querySelector('.sig-envelope-row');
      return { page: s.page, runSystem: r ? r.systemId : '', hasRoot: !!sec, len: sec ? sec.textContent.length : 0,
               ppv: len('P_pv_kW'), pgrid: len('P_grid_true_kW'), isl: len('island_state'),
               envFound: !!env, envHidden: env ? env.hidden : null, envText: env ? env.textContent : '' };
    })()`);
    ok(mgSigPage.page === 'signals' && mgSigPage.runSystem === 'MG-001' && mgSigPage.hasRoot &&
      mgSigPage.ppv === 601 && mgSigPage.pgrid === 601 && mgSigPage.isl === 601,
      'W-E：signals 页 MG-001 Run 渲染面（关键信号 601 点：P_pv/P_grid/island_state）',
      JSON.stringify({ runSystem: mgSigPage.runSystem, ppv: mgSigPage.ppv, pgrid: mgSigPage.pgrid, isl: mgSigPage.isl }));
    ok(mgSigPage.envFound && !mgSigPage.envHidden &&
      mgSigPage.envText.indexOf('MG-001 单 Run 可达包络') === 0 &&
      mgSigPage.envText.indexOf('不是参数域叉积包络') !== -1,
      'W-E：A-3 MG 单 Run 可达包络行在场（信号页页脚，措辞带 A-3 改标口径）',
      mgSigPage.envText.slice(0, 140));

    /* ===== §G FC-001 电化学轨 on 走查（4 断言；V120 W5） ===== */
    /* 轨翻转经既有草稿/运行语义（updateDraft electrochem_model=on + createRun 标准入口，
       不引入新执行语义）；on 轨系统页文本纳入 §F 红线/泄漏扫描面（A-fcec-* 批准冻结
       文案经规格 §6.3 预检——11 词根零命中）。 */
    await cdp.send('Page.navigate', { url: base + '/index.html?demo=1&reset=1&system=FC-001&page=system' });
    await wait(1400);
    await cdp.evalExpr(`(function(){
      FL.store.actions.updateDraft(function (d) { d.electrochem_model = 'on'; });
      return FL.store.actions.createRun({ silent: true });
    })()`);
    await wait(800);
    pageTexts['system-FC-001-on'] = await collectText(cdp, 'page-system');
    const fcOnWalk = await cdp.evalExpr(`(function(){
      const s = FL.store.getState();
      const r = s.activeRun;
      const sig = r && r.timeseries && r.timeseries.signals ? r.timeseries.signals : {};
      const badges = Array.prototype.slice.call(document.querySelectorAll('.sys-head-meta .badge'))
        .map(function (b) { return b.textContent || ''; });
      const sub = (document.querySelector('.sys-page-sub') || {}).textContent || '';
      const panel = document.querySelector('.sys-track-panel');
      const panelText = panel ? panel.textContent : '';
      return { page: s.page, runSystem: r ? r.systemId : '',
               cfgTrack: r && r.config ? r.config.electrochem_model : '',
               tst: sig.T_st_K ? sig.T_st_K.length : 0,
               badges: badges, subHasSummaryOn: sub.indexOf('电堆按极化曲线出力') !== -1,
               panelFound: !!panel,
               panelHasAssumption: panelText.indexOf('A-fcec-polarization') !== -1,
               panelHasNote: panelText.indexOf('L1-lite') !== -1 };
    })()`);
    ok(fcOnWalk.page === 'system' && fcOnWalk.runSystem === 'FC-001' &&
      fcOnWalk.cfgTrack === 'on' && fcOnWalk.tst === 601,
      'W-G：FC on 轨 Run 数据面（cfg electrochem_model=on + T_st 601 点）',
      JSON.stringify({ cfgTrack: fcOnWalk.cfgTrack, tst: fcOnWalk.tst }));
    ok(fcOnWalk.badges.some(function (t) { return t.indexOf('L1 · 电堆极化与单节点热') !== -1; }),
      'W-G：FC on 轨 system 页 level_on 徽章（L1 · 电堆极化与单节点热（数值仿真级））',
      JSON.stringify(fcOnWalk.badges));
    ok(fcOnWalk.subHasSummaryOn && fcOnWalk.panelFound && fcOnWalk.panelHasAssumption && fcOnWalk.panelHasNote,
      'W-G：FC on 轨 system 页 summary_on 摘要 + on 轨模型声明面板（A-fcec 假设 + L1-lite 定位句——B-2 变体渲染）',
      JSON.stringify({ subHasSummaryOn: fcOnWalk.subHasSummaryOn, panelFound: fcOnWalk.panelFound,
        panelHasAssumption: fcOnWalk.panelHasAssumption, panelHasNote: fcOnWalk.panelHasNote }));
    await cdp.send('Page.navigate', { url: base + '/index.html?demo=1&reset=1&system=FC-001&page=signals' });
    await wait(1300);
    await cdp.evalExpr(`(function(){
      FL.store.actions.updateDraft(function (d) { d.electrochem_model = 'on'; });
      FL.store.actions.createRun({ silent: true });
      FL.store.actions.setPageState('signals', { category: 'thermal' });
      return true;
    })()`);
    await wait(800);
    const fcOnSigWalk = await cdp.evalExpr(`(function(){
      const s = FL.store.getState();
      const r = s.activeRun;
      const items = Array.prototype.slice.call(document.querySelectorAll('.sig-item'));
      const tstItem = items.filter(function (i) { return (i.textContent || '').indexOf('电堆温度') !== -1; }).length;
      return { page: s.page, catCount: r && r.signals ? r.signals.length : 0, tstItem: tstItem };
    })()`);
    ok(fcOnSigWalk.page === 'signals' && fcOnSigWalk.catCount === 24 && fcOnSigWalk.tstItem > 0,
      'W-G：FC on 轨 signals 页热力类目 T_st 信号行在场（信号目录 24 列——run.signals 通用渲染面）',
      JSON.stringify(fcOnSigWalk));

    /* teaching 页纳入红线扫描面（不单独计断言） */
    await cdp.send('Page.navigate', { url: base + '/index.html?page=teaching' });
    await wait(900);
    pageTexts.teaching = await collectText(cdp, 'page-teaching');
    /* compare 页纳入泄漏/红线扫描面 */
    await cdp.send('Page.navigate', { url: base + '/index.html?demo=1&page=compare' });
    await wait(1000);
    pageTexts.compare = await collectText(cdp, 'page-compare');

    /* ===== §F 全程守卫（4 断言） ===== */
    const allText = Object.keys(pageTexts).map((k) => pageTexts[k]).join('\n');
    ok(allText.indexOf('undefined') === -1,
      'W-F：渲染文本无 undefined 泄漏（home/6×system+FC on 轨/scenario/signals×2/teaching/compare)');
    const redlineHits = REDLINE_TERMS.filter((t) => allText.indexOf(t) !== -1);
    eq(JSON.stringify(redlineHits), JSON.stringify([]),
      'W-F：肯定性孤岛检测/保护/检同期与电网保护/稳定验证类红线词渲染面零命中（' +
      REDLINE_TERMS.join('/') + '；B-1 口径——裸「孤岛」为 MG 状态/模式命名面不入扫描，' +
      'limitations 命名块已剔除）');
    ok(externalRequests.length === 0, 'W-F：零外部网络请求（纯浏览器离线）',
      JSON.stringify(externalRequests.slice(0, 8)));
    eq(consoleErrors.length, 0, 'W-F：全程零 console error');

    /* 截图留证（五系统页各一张 + home） */
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, 'walkthrough-compare.png'), Buffer.from(shot.data, 'base64'));
  } finally {
    if (cdp) cdp.close();
    if (chrome) { try { chrome.kill(); } catch { /* ignore */ } }
    if (server) { try { server.kill(); } catch { /* ignore */ } }
  }

  const generatedAt = new Date().toISOString();
  const browser = browserVersion
    ? { product: browserVersion.product, revision: browserVersion.revision,
        userAgent: browserVersion.userAgent, jsVersion: browserVersion.jsVersion }
    : { product: null, revision: null, userAgent: null, jsVersion: null };
  const report = {
    journey: 'ui-walkthrough-63',
    ok: fail === 0,
    pass, fail,
    failures,
    scope: {
      systems: SYSTEMS,
      sections: ['A home 六系统卡 7', 'B 详情面板 12', 'C 故障原理卡 12', 'D 系统页深链 18', 'E 六系统声明面 6', 'G FC 电化学轨 on 走查 4', 'F 全程守卫 4'],
      redline_terms: REDLINE_TERMS
    },
    environment: { chrome: CHROME, base, node: process.version, browser },
    code: { commit_sha: COMMIT_SHA, branch: BRANCH, worktree_dirty: WORKTREE_DIRTY },
    execution: {
      command: 'node tools/ui-walkthrough.mjs' + (opt('out', '') ? ' --out ' + opt('out', '') : ''),
      started_at: STARTED_AT,
      generated_at: generatedAt,
      duration_ms: Date.now() - STARTED_MS
    }
  };
  fs.writeFileSync(path.join(OUT, 'ui-walkthrough-report.json'), JSON.stringify(report, null, 2));
  console.log('\n================================================');
  console.log('六系统深度走查：PASS ' + pass + ' / FAIL ' + fail + (fail ? '  ✗' : '  ✓'));
  console.log('浏览器：' + (browser.product || 'n/a') + '（revision ' + (browser.revision || 'n/a') + '）');
  console.log('追溯：commit=' + (COMMIT_SHA || 'n/a').slice(0, 12) + ' branch=' + (BRANCH || 'n/a') +
    ' dirty=' + WORKTREE_DIRTY + ' node=' + process.version + ' 用时 ' + report.execution.duration_ms + ' ms');
  if (fail) {
    failures.slice(0, 30).forEach((f, i) => console.log('  [' + i + '] ' + f.name + '\n      ' + f.detail));
    console.log('================================================');
    process.exit(1);
  }
  console.log('深度走查全部通过（发布轮手工执行工具，不进 run-g2；报告 ' + path.join(OUT, 'ui-walkthrough-report.json') + '）。');
  console.log('注意：通过项为 UI 走查面内部一致性证据，不构成模型验证或硬件验证。');
}

main().catch((e) => {
  console.error('深度走查运行失败：', e && e.message ? e.message : e);
  process.exit(1);
});
