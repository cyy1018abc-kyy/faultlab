/* owner: core-teaching | module: tests/teaching | contract: FaultLab-evaluation/NEXT/V06_ROADMAP.md 主线 C「C-3」行
   + FaultLab-evaluation/NEXT/V070_WAVE_DESIGN.md DEC-5（CHG-20261104-10）
   教学路径核心测试（C-3 最小形态）：
   A. 模块形态 + view.page 校验表与 src/ui/shell.js PAGES 键源码交叉核对；
   B. 8 条预设路径（4 系统主线 + GT 跨深度扩展 + WT ×2 + FL thermal 跨深度，
      v0.8.0 UI 接线路 CHG-20261107-01；+ MG-001 三段式平衡重整 path-mg-001，
      V130 DEC-3 CHG-20261113-04）全部过 validateTeachingPath +
      元数据 / 5 步结构 / 导出原语断言；
   C. 校验器负例（8 类）+ 装载顺序守卫 + warning 面；
   D. narrative/文案禁词自检：读 tools/copy-guard.mjs BANNED 数组（39 模式）对路径内
      全部字符串值做子串自查（正则形模式退化为同义 RegExp；字面形为纯子串比对——
      teaching.js 文案承诺零禁词子串、连批准否定串也不含，故无需 ALLOW 剥离，严于 copy-guard）；
   E. scenarioSpec 执行冒烟：FL 路径第⑤步 executeScenario → 3 Run 结构完整 + 哈希确定性。
   运行：node tests/teaching.test.js；失败非零退出。
   装载：src/core/scenario.js 与 src/core/teaching.js 已并入 tests/core-load.js
   CORE_FILES（V072 残留清单 5，S1/C-3 临时 (0,eval) 自装载退役）——bootstrap() 直接
   就绪 FL.core.scenario / FL.core.teaching，序 registry.js → scenario.js → teaching.js
   与 index.html <script> 序一致。 */
'use strict';

const fs = require('fs');
const path = require('path');
const { bootstrap } = require('./core-load');

const ROOT = path.join(__dirname, '..');
const FL = bootstrap();

const TC = FL.core.teaching;
const SC = FL.core.scenario;
const TS = '2026-11-05T00:00:00Z';

let pass = 0;
let fail = 0;
const failures = [];
function ok(cond, name, detail) {
  if (cond) pass++;
  else { fail++; failures.push({ name, detail: detail || '条件为假' }); }
}
function eq(a, b, name) { ok(a === b, name, 'expected ' + JSON.stringify(b) + '，actual ' + JSON.stringify(a)); }
function section(name) { console.log('== ' + name); }

function clone(j) { return JSON.parse(JSON.stringify(j)); }

/* ------------------------------------------------------------------ *
 * A. 模块形态 + 页面键校验表同步                                       *
 * ------------------------------------------------------------------ */
section('A. 模块形态 + SHELL_PAGE_KEYS ↔ shell.js PAGES 同步');
ok(TC && typeof TC.validateTeachingPath === 'function' && typeof TC.getTeachingPaths === 'function' &&
  typeof TC.exportTeachingPath === 'function', 'FL.core.teaching API 就绪（validate/get/export）');
eq(TC.PATH_SCHEMA_VERSION, 1, 'PATH_SCHEMA_VERSION=1');
eq(JSON.stringify(TC.STEP_TEMPLATE.map((s) => s.id)), JSON.stringify(['inject', 'closed-loop', 'monitor-compare', 'causal', 'eval']), 'STEP_TEMPLATE 5 步 id 序列');
eq(JSON.stringify(TC.STEP_TEMPLATE.map((s) => s.title)), JSON.stringify(['传感器故障注入', '闭环响应观察', '仅监测对照', '因果解释', '评测入口']), 'STEP_TEMPLATE 5 步标题序列');

const shellSrc = fs.readFileSync(path.join(ROOT, 'src', 'ui', 'shell.js'), 'utf8');
const pagesMatch = shellSrc.match(/const PAGES = \[([\s\S]*?)\];/);
ok(!!pagesMatch, 'shell.js PAGES 块可提取');
const shellIds = (pagesMatch[1].match(/id: '([a-z]+)'/g) || []).map((s) => s.replace(/id: '|'/g, ''));
eq(JSON.stringify(TC.SHELL_PAGE_KEYS), JSON.stringify(shellIds), 'SHELL_PAGE_KEYS 与 shell.js PAGES 键逐位同步');
eq(TC.SHELL_PAGE_KEYS.length, 9, '页面键数=9（home/system/signals/causal/compare/arena/scenario/teaching/leaderboard，UI 接线路 CHG-20261104-10 增补）');

/* ------------------------------------------------------------------ *
 * B. 预设路径全部过 validateTeachingPath                               *
 * （计数断言随路径数据面机械适配：3→4 为 V072 清算项 7 先例；4→7 为
 *    v0.8.0 UI 接线路 CHG-20261107-01——WT-001 ×2 + FL thermal 跨深度 ×1；
 *    7→8 为 V130 DEC-3（CHG-20261113-04）——MG-001 三段式平衡重整 path-mg-001；
 *    新路径的专项断言随本波落入 §B MG 块。）                               *
 * ------------------------------------------------------------------ */
section('B. 预设路径校验 + 结构 + 导出原语');
const paths = TC.getTeachingPaths();
eq(paths.length, 8, 'getTeachingPaths 返回 8 条（4 系统主线 + GT 跨深度 + WT ×2 + FL thermal 跨深度 + MG-001 平衡重整，V130 DEC-3 CHG-20261113-04）');
eq(new Set(paths.map((p) => p.pathId)).size, 8, 'pathId 唯一');
['FL-001', 'FC-001', 'GT-001', 'WT-001', 'MG-001'].forEach((sid) => {
  ok(paths.some((p) => p.system === sid), '存在 ' + sid + ' 路径');
});

const WANT_VIEW_PAGES = ['system', 'signals', 'compare', 'causal', 'scenario'];
paths.forEach((p) => {
  const v = TC.validateTeachingPath(p);
  ok(v.ok, 'validateTeachingPath 通过：' + p.pathId, JSON.stringify(v.errors));
  eq(v.warnings.length, 0, p.pathId + ' 校验零 warning');
  eq(p.steps.length, 5, p.pathId + ' 步数=5');
  eq(JSON.stringify(p.steps.map((s) => s.id)), JSON.stringify(['inject', 'closed-loop', 'monitor-compare', 'causal', 'eval']), p.pathId + ' 步骤 id 序列=DEC-5 模板');
  eq(JSON.stringify(p.steps.map((s) => s.view.page)), JSON.stringify(WANT_VIEW_PAGES), p.pathId + ' 视图深链序列 system→signals→compare→causal→scenario');
  ok(typeof p.goal === 'string' && p.goal.length > 10, p.pathId + ' 目标非空');
  ok(typeof p.prerequisites === 'string' && p.prerequisites.length > 5, p.pathId + ' 前置非空');
  ok(p.steps.every((s) => typeof s.narrative === 'string' && s.narrative.length > 40), p.pathId + ' 每步教学叙述卡非空');

  const spec = p.steps[4].scenarioSpec;
  ok(!!spec, p.pathId + ' 第⑤步携带 scenarioSpec');
  const pr = SC.parseScenario(spec);
  ok(pr.ok, p.pathId + ' 第⑤步 scenarioSpec 可过 parseScenario（schema v1）', JSON.stringify(pr.errors));
  eq(spec.system, p.system, p.pathId + ' 场景系统与路径系统一致');
  ok(SC.scenarioHash(spec) && SC.scenarioHash(JSON.parse(JSON.stringify(spec))) === SC.scenarioHash(spec), p.pathId + ' 场景内容哈希确定性');
});

/* FL 路径第⑤步：3 事件（闭环 / 仅监测 / 执行器），全部落在 approved_p0 锚点域 */
const flPath = paths.find((p) => p.pathId === 'path-fl-001');
eq(flPath.system, 'FL-001', 'FL 路径绑定 FL-001');
eq(flPath.steps[4].scenarioSpec.events.length, 3, 'FL 第⑤步场景 3 事件');
eq(JSON.stringify(flPath.steps[4].scenarioSpec.events.map((e) => e.feedback_mode)), JSON.stringify(['closed_loop', 'monitor', 'closed_loop']), 'FL 3 事件反馈模式序列');
eq(JSON.stringify(flPath.steps[4].scenarioSpec.events.map((e) => e.family)), JSON.stringify(['sensor_drift', 'sensor_drift', 'actuator_fault']), 'FL 3 事件故障族序列');
eq(JSON.stringify(flPath.steps[4].scenarioSpec.events.map((e) => e.params.magnitude)), JSON.stringify([10, 10, 55]), 'FL 3 事件参数取目录锚点值（10 A / 10 A / 55%）');
/* FL load_step 已按 O-13 删除（docs/FAULT_CATALOG.md §1）——FL 场景不含该族 */
ok(flPath.steps[4].scenarioSpec.events.every((e) => e.family !== 'load_step'), 'FL 场景不含已删除族 load_step（O-13）');
/* GT 路径第⑤步演示 GT 专属 t_clear */
const gtPath = paths.find((p) => p.pathId === 'path-gt-001');
eq(gtPath.steps[4].scenarioSpec.events[3].t_clear_s, 35, 'GT 第⑤步含 t_clear_s=35（GT-001 执行器专属）');

/* GT 跨深度扩展路径（V072 清算项 7）：独立 pathId 保 DEC-5 5 步契约零改动；
   第⑤步 4 事件双轨成对（事件级 inertia_model 键，B-2 定案）——「同一故障、两种模型深度」。 */
const gtxPath = paths.find((p) => p.pathId === 'path-gt-001-cross-depth');
ok(!!gtxPath, '存在 GT 跨深度扩展路径 path-gt-001-cross-depth');
eq(gtxPath.system, 'GT-001', '跨深度路径绑定 GT-001');
eq(gtxPath.steps.length, 5, '跨深度路径步数=5（DEC-5 契约不破坏）');
eq(JSON.stringify(gtxPath.steps.map((s) => s.view.page)), JSON.stringify(['system', 'signals', 'compare', 'causal', 'scenario']),
  '跨深度路径视图深链序列与模板同构');
const gtxEvents = gtxPath.steps[4].scenarioSpec.events;
eq(gtxEvents.length, 4, '跨深度第⑤步 4 事件（双故障 × 双轨成对）');
eq(JSON.stringify(gtxEvents.map((e) => e.family + ':' + e.inertia_model)),
  JSON.stringify(['sensor_drift:thermo', 'sensor_drift:swing', 'load_step:thermo', 'load_step:swing']),
  '跨深度 4 事件双轨成对（sensor/load × thermo/swing，锚点参数 0.3 Hz / 10 kW）');
eq(JSON.stringify(gtxEvents.map((e) => e.params.magnitude)), JSON.stringify([0.3, 0.3, 10, 10]),
  '跨深度事件参数取目录锚点值');
/* 跨深度叙事数值锚（GTL1_G2B_SPEC_APPROVED §3.2 v1.0 口径，engine-gt.test.js 跨深度分歧断言同源） */
const gtxText = JSON.stringify(gtxPath);
['49.590174', '49.589336', '49.999347', '49.992213', '49.70050', '49.70548', '1044.16', '687.22', '19.65', '17.80', '18.266', '20.000']
  .forEach((num) => ok(gtxText.indexOf(num) !== -1, '跨深度路径引用 §3.2 数值：' + num));
/* 既有 3 路径本体零改动（新增为第 4 条，不扩不改） */
eq(flPath.pathId, 'path-fl-001', '既有 FL 路径零改动');
eq(TC.exportTeachingPath('path-gt-001').path.title, '燃气涡轮：转速偏置与双通道冗余', '既有 GT 路径零改动');

/* MG 教学路径（V130 DEC-3 CHG-20261113-04）：三段式并网基线 → 脱离主馈线的功率平衡重整
   → 重连恢复（路径数据面 additive 第 8 条，不扩不改既有 7 条）。
   结构 + 第⑤步 3 事件（并网基线 load_step + island_event 闭环/仅监测成对，
   t_clear_s=35 锚定 mg001_v1 golden island_reconnect Run）+ I-5/锚点文案面。 */
const mgPath = paths.find((p) => p.pathId === 'path-mg-001');
ok(!!mgPath, '存在 MG 教学路径 path-mg-001');
eq(mgPath.system, 'MG-001', 'MG 路径绑定 MG-001');
eq(mgPath.pathId, 'path-mg-001', 'MG 路径 pathId');
eq(mgPath.steps.length, 5, 'MG 路径步数=5（DEC-5 契约不破坏）');
eq(JSON.stringify(mgPath.steps.map((s) => s.id)), JSON.stringify(['inject', 'closed-loop', 'monitor-compare', 'causal', 'eval']), 'MG 路径步骤 id 序列=DEC-5 模板');
eq(JSON.stringify(mgPath.steps.map((s) => s.view.page)), JSON.stringify(['system', 'signals', 'compare', 'causal', 'scenario']), 'MG 路径视图深链序列与模板同构');
ok(mgPath.steps.every((s) => typeof s.narrative === 'string' && s.narrative.length > 40), 'MG 路径每步教学叙述卡非空');
/* 第⑤步 3 事件：家族合法（MG 现有四族取 load_step + island_event）+ 零参数族 + t_clear_s=35 */
const mgEvents = mgPath.steps[4].scenarioSpec.events;
eq(mgEvents.length, 3, 'MG 第⑤步 3 事件（并网基线 + 分断/重连双模式成对）');
eq(JSON.stringify(mgEvents.map((e) => e.family + ':' + e.feedback_mode)),
  JSON.stringify(['load_step:closed_loop', 'island_event:closed_loop', 'island_event:monitor']),
  'MG 3 事件族×模式序列（load_step 基线 + island_event 拓扑事件两模式）');
const mgPr = SC.parseScenario(mgPath.steps[4].scenarioSpec);
ok(mgPr.ok, 'MG 第⑤步 scenarioSpec 可过 parseScenario（schema v1 + t_clear_s 守卫扩展）', JSON.stringify(mgPr.errors));
eq(mgEvents[1].t_clear_s, 35, 'MG island_event 闭环轨 t_clear_s=35（mg001_v1 island_reconnect 锚定值）');
eq(mgEvents[2].t_clear_s, 35, 'MG island_event 仅监测轨 t_clear_s=35');
eq(JSON.stringify(mgEvents[1].params), '{}', 'island_event 零参数族（params:{}——Q2 定案库内首例，无幅值语义）');
eq(mgEvents[0].params.magnitude, 10, 'MG load_step 基线取目录锚点值 +10 kW');
/* 文案锚点断言：I-5 句式在场 + EQ-MG 引用 + mg001_v1 冻结锚点数值
   （钳位 8 / shed 2 / 补差 5→15 / 服务 28 / 重连恢复 8→5 与 5 kW） */
const mgText = JSON.stringify(mgPath);
[
  '脱离主馈线的功率平衡重整', 'EQ-MG-3', 'EQ-MG-4', 'EQ-MG-5', 'EQ-MG-6',
  '5→15 kW', 'P_grid ≡ 0', '钳位', '8 kW', 'P_shed = 2 kW', '28 kW',
  't_clear = 35 s', '8→5', 'P_bess 回 5 kW'
].forEach((needle) => ok(mgText.indexOf(needle) !== -1, 'MG 路径文案锚点在场：' + needle));

/* 导出原语：确定性信封 + 内容哈希；未知 pathId 抛中文错误 */
const exp1 = TC.exportTeachingPath('path-fl-001');
eq(exp1.kind, 'faultlab-teaching-path', '导出 kind=faultlab-teaching-path');
eq(exp1.version, 1, '导出 version=1');
ok(exp1.path && exp1.path.pathId === 'path-fl-001' && Array.isArray(exp1.path.steps) && exp1.path.steps.length === 5, '导出携带路径本体（5 步完整）');
ok(typeof exp1.content_checksum === 'string' && exp1.content_checksum.length === 64, '导出内容校验和（SHA256 hex 64）');
eq(exp1.content_checksum, TC.exportTeachingPath('path-fl-001').content_checksum, '导出确定性（两次导出同校验和）');
ok(JSON.stringify(Object.keys(exp1.path.steps[4].scenarioSpec)) === JSON.stringify(Object.keys(flPath.steps[4].scenarioSpec)), '导出与 getTeachingPaths 内容一致');
let threw = null;
try { TC.exportTeachingPath('no-such-path'); } catch (e) { threw = e; }
ok(threw && /未知教学路径/.test(threw.message) && /path-fl-001/.test(threw.message), '未知 pathId 抛中文错误并列出可用 id', threw && threw.message);

/* MG 路径导出原语（V130 DEC-3）：确定性信封同构（kind/version/content_checksum） */
const expMg = TC.exportTeachingPath('path-mg-001');
eq(expMg.kind, 'faultlab-teaching-path', 'MG 导出 kind=faultlab-teaching-path');
eq(expMg.version, 1, 'MG 导出 version=1');
ok(expMg.path && expMg.path.pathId === 'path-mg-001' && Array.isArray(expMg.path.steps) && expMg.path.steps.length === 5,
  'MG 导出携带路径本体（path-mg-001 × 5 步完整）');
ok(typeof expMg.content_checksum === 'string' && expMg.content_checksum.length === 64, 'MG 导出内容校验和（SHA256 hex 64）');
eq(expMg.content_checksum, TC.exportTeachingPath('path-mg-001').content_checksum, 'MG 导出确定性（两次导出同校验和）');
ok(expMg.path.steps[4].scenarioSpec.events.length === 3 && expMg.path.steps[4].scenarioSpec.events[1].t_clear_s === 35,
  'MG 导出本体与 PATHS 数据一致（3 事件 + t_clear_s=35）');

/* getTeachingPaths 返回克隆：外部改动不内渗 */
paths[0].title = 'MUTATED';
paths[0].steps[0].narrative = 'MUTATED';
eq(TC.getTeachingPaths()[0].title, '电池储能：传感器偏置与闭环反馈', 'getTeachingPaths 返回克隆（元数据不内渗）');
eq(TC.getTeachingPaths()[0].steps[0].narrative === 'MUTATED', false, 'getTeachingPaths 返回克隆（narrative 不内渗）');
const expMut = TC.exportTeachingPath('path-fl-001');
eq(expMut.path.title, '电池储能：传感器偏置与闭环反馈', 'exportTeachingPath 不受外部改动影响');

/* ------------------------------------------------------------------ *
 * C. 校验器负例 + 装载顺序守卫 + warning 面                            *
 * ------------------------------------------------------------------ */
section('C. 校验器负例（8 类）+ 装载顺序守卫 + warning 面');
function expectFail(mutate, name, fieldNeedle) {
  const p = clone(TC.getTeachingPaths().find((x) => x.pathId === 'path-fl-001'));
  mutate(p);
  const v = TC.validateTeachingPath(p);
  ok(!v.ok && v.errors.length > 0, '负例命中：' + name, 'expected failure, got ' + JSON.stringify(v));
  if (fieldNeedle) {
    ok(v.errors.some((e) => String(e.field).indexOf(fieldNeedle) !== -1 || String(e.message).indexOf(fieldNeedle) !== -1),
      '负例错误指向 ' + fieldNeedle + '：' + name, JSON.stringify(v.errors));
  }
}
expectFail((p) => { p.steps.pop(); }, '步数 5→4', 'path.steps');
expectFail((p) => { p.system = 'XX-999'; }, '未知系统', '未知系统');
expectFail((p) => { p.steps[0].view.page = 'nope'; }, 'view.page 越出页面键集合', 'view.page');
expectFail((p) => { p.steps[0].narrative = ''; }, 'narrative 置空', 'narrative');
expectFail((p) => { p.steps[4].scenarioSpec.events[0].family = 'load_step'; }, 'FL 目录不含 load_step（O-13 已删除族）', 'load_step');
expectFail((p) => { p.steps[4].scenarioSpec.events[0].params.magnitude = 999; }, 'params 越上界（999 A > 30 A）', '999');
expectFail((p) => { p.steps[4].scenarioSpec.events.push({ key: 'ev-x', family: 'sensor_drift', params: { magnitude: 5 }, t_start_s: 10, feedback_mode: 'monitor' }); p.steps[4].scenarioSpec.oops = 1; }, 'scenarioSpec 未知顶层字段（parseScenario 封闭白名单）', '未知顶层字段');
{
  const g = clone(TC.getTeachingPaths().find((x) => x.pathId === 'path-gt-001'));
  g.steps[4].scenarioSpec.events[0].params.magnitude = 0.31; /* 0.05 Hz 步长网格外 */
  const vg = TC.validateTeachingPath(g);
  ok(!vg.ok && vg.errors.some((e) => /步长/.test(e.message)), '负例命中：GT 参数偏离 0.05 Hz 步长网格', JSON.stringify(vg.errors));
  ok(!vg.ok && vg.errors.some((e) => e.field.indexOf('scenarioSpec') !== -1), 'GT 负例错误定位到 scenarioSpec', JSON.stringify(vg.errors));
}
{
  /* 步骤 id 重复 */
  const p = clone(flPath);
  p.steps[1].id = p.steps[0].id;
  const v = TC.validateTeachingPath(p);
  ok(!v.ok && v.errors.some((e) => /步骤 id 重复/.test(e.message)), '负例命中：步骤 id 重复', JSON.stringify(v.errors));
}

/* 装载顺序守卫：scenario.js 未就绪时 validateTeachingPath 给结构化错误而非裸异常 */
{
  const saved = FL.core.scenario;
  delete FL.core.scenario;
  const v = TC.validateTeachingPath(clone(flPath));
  ok(!v.ok && v.errors.some((e) => /scenario\.js 未装载/.test(e.message)), 'scenario.js 未装载 → 结构化错误（含装载顺序提示）', JSON.stringify(v.errors));
  FL.core.scenario = saved;
}

/* warning 面：第⑤步缺 scenarioSpec → 仍通过但告警；非⑤步携带 → 告警 */
{
  const p1 = clone(flPath);
  delete p1.steps[4].scenarioSpec;
  const v1 = TC.validateTeachingPath(p1);
  ok(v1.ok && v1.errors.length === 0, '第⑤步缺 scenarioSpec → 仍通过（字段可选）', JSON.stringify(v1.errors));
  ok(v1.warnings.some((w) => w.field === 'path.steps[4].scenarioSpec'), '缺 scenarioSpec → steps[4] warning', JSON.stringify(v1.warnings));
  const p2 = clone(flPath);
  p2.steps[0].scenarioSpec = clone(flPath.steps[4].scenarioSpec);
  const v2 = TC.validateTeachingPath(p2);
  ok(v2.ok && v2.warnings.some((w) => w.field === 'path.steps[0].scenarioSpec'), '非⑤步携带 scenarioSpec → warning', JSON.stringify(v2.warnings));
}
/* 非对象入参 */
ok(TC.validateTeachingPath(null).ok === false && TC.validateTeachingPath('x').ok === false && TC.validateTeachingPath(42).ok === false, '非对象入参 → 结构化拒绝');

/* ------------------------------------------------------------------ *
 * D. 禁词子串自检（tools/copy-guard.mjs BANNED 39 模式）               *
 * ------------------------------------------------------------------ */
section('D. 禁词子串自检（copy-guard.mjs BANNED 39 模式 × 路径全部字符串值）');
const guardSrc = fs.readFileSync(path.join(ROOT, 'tools', 'copy-guard.mjs'), 'utf8');
const mBanned = guardSrc.match(/const BANNED = \[([\s\S]*?)\]\.map\(/);
ok(!!mBanned, 'tools/copy-guard.mjs BANNED 数组可提取');
const BANNED = (0, eval)('[' + mBanned[1] + ']');
eq(BANNED.length, 43, 'BANNED 模式数=43（FCFMU-G2b-04 Q11 四词入表——CHG-20261118-01）');

function hitByPattern(pattern, text) {
  if (pattern.indexOf('(?i)') === 0) {
    return text.toLowerCase().indexOf(pattern.slice(4).toLowerCase()) !== -1;
  }
  if (/[\\^$.*+?()[\]{}|]/.test(pattern)) {
    return new RegExp(pattern).test(text); /* 正则形模式（与 copy-guard 同义） */
  }
  return text.indexOf(pattern) !== -1; /* 字面形模式 = 纯子串比对 */
}
function collectStrings(v, out) {
  if (typeof v === 'string') { out.push(v); return; }
  if (Array.isArray(v)) { v.forEach((x) => collectStrings(x, out)); return; }
  if (v && typeof v === 'object') { Object.keys(v).forEach((k) => collectStrings(v[k], out)); }
}
const banHits = [];
TC.getTeachingPaths().forEach((p) => {
  const strs = [];
  collectStrings(p, strs);
  ok(strs.length > 30, p.pathId + ' 字符串值已全量收集（' + strs.length + ' 条）');
  strs.forEach((s) => {
    BANNED.forEach((pat) => {
      if (hitByPattern(pat, s)) banHits.push({ pathId: p.pathId, pattern: String(pat), text: s.slice(0, 80) });
    });
  });
});
eq(banHits.length, 0, '教学路径全部字符串值零禁词命中（39 模式）', JSON.stringify(banHits));
{
  /* 自检器自身有效性：对含禁词的探针串必须命中（防「自检恒绿」假阳性） */
  const probe = { a: '这是能量损失的表述', b: '有 损失 4 kW 的句子', c: '含 Sealed 字样', d: '多发 4 kW 话术', e: '校准与实测字样' };
  const probeHits = [];
  Object.keys(probe).forEach((k) => {
    BANNED.forEach((pat) => { if (hitByPattern(pat, probe[k])) probeHits.push(k); });
  });
  eq(new Set(probeHits).size, 5, '自检器有效性：5 个探针串全部命中（含 (?i)/正则形模式）', JSON.stringify(probeHits));
}

/* ------------------------------------------------------------------ *
 * E. scenarioSpec 执行冒烟（FL 路径第⑤步 → 3 Run 结构完整）            *
 * ------------------------------------------------------------------ */
section('E. FL 第⑤步 executeScenario 冒烟：3 Run 结构完整 + 哈希确定性');
const flSpec = TC.getTeachingPaths().find((p) => p.pathId === 'path-fl-001').steps[4].scenarioSpec;
const prE = SC.parseScenario(flSpec);
ok(prE.ok, 'FL 评测场景解析通过', JSON.stringify(prE.errors));
const exec = SC.executeScenario(prE.scenario, { runIdPrefix: 'Teach-FL', createdAt: TS });
eq(exec.runs.length, 3, 'executeScenario 产出 3 Run');
ok(typeof exec.scenarioHash === 'string' && exec.scenarioHash.length === 64, '场景内容哈希（SHA256 hex 64）', String(exec.scenarioHash));

const WANT_MODES = ['closed_loop', 'monitor', 'closed_loop'];
const WANT_FAMILIES = ['sensor_drift', 'sensor_drift', 'actuator_fault'];
exec.runs.forEach((r, i) => {
  const n = 'Run ' + (i + 1);
  ok(r && r.runId === 'Teach-FL-' + String(i + 1).padStart(2, '0'), n + ' runId=Teach-FL-0' + (i + 1), r && r.runId);
  eq(r.systemId, 'FL-001', n + ' systemId=FL-001');
  eq(r.status, 'completed', n + ' status=completed');
  ok(r.label.indexOf('FL-001 教学路径评测') === 0, n + ' label 继承场景标签', r.label);
  ok(r.config && r.config.systemId === 'FL-001' && r.config.duration_s === 60 && r.config.dt_s === 0.1, n + ' config：FL-001 × 60 s / 0.1 s');
  eq(r.config.fault.family, WANT_FAMILIES[i], n + ' fault.family');
  eq(r.config.fault.params.magnitude, [10, 10, 55][i], n + ' fault.params.magnitude');
  eq(r.config.fault.t_start_s, 20, n + ' t_start_s=20');
  eq(r.config.feedback_mode, WANT_MODES[i], n + ' feedback_mode');
  ok(r.manifest && typeof r.manifest.run_hash === 'string' && r.manifest.run_hash.length === 64, n + ' manifest.run_hash（SHA256 hex 64）');
  ok(FL.registry.verifyRunHash(r), n + ' run_hash 自校验通过');
  eq(r.manifest.scope, 'approved_p0', n + ' scope=approved_p0（锚点参数 @20 s / 30 kW / 60%）');
  eq(r.manifest.verification.model_validation, 'not_performed', n + ' 模型验证口径=not_performed');
  ok(r.timeseries && Array.isArray(r.timeseries.t) && r.timeseries.t.length === 601, n + ' 时间序列 601 点（60 s / 0.1 s）');
  ok(r.timeseries && r.timeseries.signals && Array.isArray(r.timeseries.signals.I_bat_true_A) && r.timeseries.signals.I_bat_true_A.length === 601, n + ' I_bat_true_A 序列完整');
  ok(Array.isArray(r.events) && r.events.length > 0, n + ' 事件面非空');
  ok(Array.isArray(r.metrics) && r.metrics.length > 0, n + ' metrics 非空（' + (r.metrics ? r.metrics.length : 0) + ' 项）');
  ok(Array.isArray(r.quality) && r.quality.length > 0, n + ' 质量检查面非空');
  ok(r.causal && typeof r.causal === 'object', n + ' 因果解释面就绪');
  ok(Object.isFrozen(r), n + ' Run 深冻结（不可变）');
});
/* monitor Run 与闭环 Run 的物理分离冒烟：monitor 轨真实电流不动、闭环轨被拉低 */
{
  const cl = exec.runs[0].timeseries.signals.I_bat_true_A;
  const mon = exec.runs[1].timeseries.signals.I_bat_true_A;
  const t = exec.runs[0].timeseries.t;
  const idx26 = t.indexOf(26);
  ok(Math.abs(cl[idx26] - 25) > 1 && cl[idx26] < 25, '闭环 Run 26 s 真实电流已低于 25 A（一阶衰减中）', 'I_true(26s)=' + cl[idx26]);
  ok(Math.abs(mon[idx26] - 25) < 1e-9, '仅监测 Run 26 s 真实电流恒 25 A（偏置不进入物理回路）', 'I_true(26s)=' + mon[idx26]);
}

const exec2 = SC.executeScenario(flSpec, { runIdPrefix: 'Teach-FL', createdAt: TS });
eq(exec.scenarioHash, exec2.scenarioHash, 'scenarioHash 确定性（两次执行同哈希）');
eq(exec.runs[0].manifest.run_hash, exec2.runs[0].manifest.run_hash, 'run_hash 确定性（两次执行同哈希）');

/* ------------------------------------------------------------------ */
console.log('\n================================================');
console.log('PASS ' + pass + ' / FAIL ' + fail + (fail ? '  ✗' : '  ✓'));
if (fail) {
  console.log('---- 失败明细（前 30）----');
  failures.slice(0, 30).forEach((f, i) => console.log('  [' + i + '] ' + f.name + '\n      ' + f.detail));
  console.log('================================================');
  process.exit(1);
}
console.log('教学路径核心（C-3 DEC-5）测试全部通过：8 路径校验（含 GT/FL 跨深度扩展 + WT ×2 + MG-001 平衡重整，V130 DEC-3）/ 负例 8 类 + 守卫 / 禁词 39 模式子串自检 / FL 3 Run 执行冒烟。');
