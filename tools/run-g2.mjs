/**
 * run-g2.mjs — G2 验收四件套聚合器（P0b-05 / G0-DEC-16；V0.3.0 T1 追溯增强）。
 *
 *   node tools/run-g2.mjs            # 全部四件套（--tier 默认 all，35 步全量）
 *   node tools/run-g2.mjs --skip-e2e # 跳过浏览器步（CI 无 Chrome 时）
 *   node tools/run-g2.mjs --tier core     # 只跑 core 层（28 步；部分运行，非全量门禁）
 *   node tools/run-g2.mjs --tier extended # 只跑 extended 层（7 步；部分运行）
 *
 * D-1 tier 分层（CHG-20261104-08 DEC-3，采纳 D1_LITE_ASSESSMENT 方案 C）：
 *   STEPS 每步带 tier: 'core' | 'extended' 标签；--tier 仅过滤运行步面，
 *   默认 all 时顺序与内容与历史完全一致（零变化）。部分运行（--tier core/extended，
 *   同 --skip-e2e）不构成 G2 全量门禁通过；步数账纪律见 STEPS 尾部注释块。
 *
 * 四件套（缺一不可，任一失败 => 非零退出）：
 *   ① 数值脚本：python scripts/verify_golden.py（exit 0）+ node tests/engine.test.js
 *   ② 浏览器 E2E：node tools/e2e.mjs（PHY-08/SA-22 + 五视图 + 离线）
 *   ③ RunRegistry/规范哈希：node tests/registry.test.js
 *   ④ Schema/单位字典：node tests/schema.test.js（含导入负例 tests/bundle.test.js）
 *   附加回归：tests/event-phase.test.js、tests/core.test.js、tests/arena.test.js、
 *             tests/scenario.test.js（C-2 场景编排，S5 第 26 步接线）
 *   PV-001 接线（第 27/28 步，core 层，CHG-20261104-10 / V070_WAVE_DESIGN）：
 *             verify_golden pv001（第 5 个 golden，PV-G2b-03 批准链）+
 *             tests/engine-pv.test.js（PV-001 引擎 ↔ golden pv001_v1 4 Run 一致性）
 *   WT-001 接线（第 29/30 步，core 层，CHG-20261107-01 / V080_WAVE_DESIGN DEC-6）：
 *             verify_golden wt001（第 6 个 golden，WT-G2b-03 批准链）+
 *             tests/engine-wt.test.js（WT-001 引擎 ↔ golden wt001_v1 5 Run 一致性）
 *   file:// 发布能力冒烟（第 31 步，core 层，CHG-20261108-01 / V090_WAVE_DESIGN
 *             DEC-5 残留①清算）：tools/file-smoke.mjs 61 断言（FaultLab.html 单文件
 *             工件 file:// 直接可用的发布能力面；--skip-e2e 与 ②/perf 同步跳过）
 *   教学生态接线（第 32/33 步，V1_FACES §4 #11 残留②裁定=修复补挂，v1.0.0 发布
 *             前置清算）：tests/teaching.test.js（C-3 教学路径回归，core 层）+
 *             tests/leaderboard.test.js（C-4 本地排行榜回归，extended 层——排行
 *             属生态扩展面，与 arena/backend 同层）；两测试面从步账外纳入门禁
 *   MG-001 接线（第 34/35 步，core 层，MG001_G2B_SPEC_APPROVED v1.0 §8 MG-G2b-04 /
 *             V110_WAVE_DESIGN DEC-5，CHG-20261110-01 批准链）：
 *             verify_golden mg001（第 7 个 golden，MG-G2b-03 批准链）+
 *             tests/engine-mg.test.js（MG-001 引擎 ↔ golden mg001_v1 5 Run 一致性，
 *             R-5 分派守卫）——WT-001 先例「新系统 = verify 步 + engine 步各一」
 *             （V080 DEC-6 口径）；FIRST-33-STEPS-NORMALIZED-IDENTICAL：既有 33 步
 *             顺序/判据/命令逐字零改动，仅尾部追加（第 34/35 步）
 *
 * V0.3.0 追溯增强（不改变 19 步测试、执行顺序与 PASS/FAIL 判据）：
 *   - 代码版本：commit_sha / branch / worktree_dirty（含脏文件清单）
 *   - 运行环境：platform / arch / node / python
 *   - 执行信息：command / started_at / generated_at / duration_ms
 *   - 单项测试：duration_ms；失败时保留简短错误输出（error 字段）
 *   工作区不干净只作标记，不阻止测试。原有报告字段保留。
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const skipE2e = args.indexOf('--skip-e2e') !== -1;
/* --tier core|extended|all（D-1，CHG-20261104-08 DEC-3）：默认 all = 全量，
   非法取值立即退出（exit 2），避免手误触发意外的部分运行或全量运行 */
const tierIdx = args.indexOf('--tier');
let tier = 'all';
if (tierIdx !== -1) {
  const tierVal = args[tierIdx + 1];
  if (tierVal !== 'core' && tierVal !== 'extended' && tierVal !== 'all') {
    console.error('错误：--tier 仅接受 core | extended | all（收到：' +
      (tierVal === undefined ? '(缺参)' : tierVal) + '）。');
    process.exit(2);
  }
  tier = tierVal;
}
const STARTED_MS = Date.now();
const STARTED_AT = new Date().toISOString();
const COMMAND = 'node tools/run-g2.mjs' + (skipE2e ? ' --skip-e2e' : '') +
  (tier !== 'all' ? ' --tier ' + tier : '');

/* ------------------------------------------------------- 追溯信息（T1） */
function git(argsArr) {
  const res = spawnSync('git', argsArr, { cwd: ROOT, encoding: 'utf8' });
  if (res.error || res.status !== 0) return null;
  return (res.stdout || '').trim();
}

function pythonVersion() {
  for (const cmd of ['python', 'python3']) {
    const res = spawnSync(cmd, ['--version'], { cwd: ROOT, encoding: 'utf8' });
    if (!res.error && res.status === 0) {
      return ((res.stdout || '') + (res.stderr || '')).trim() || null;
    }
  }
  return null;
}

const COMMIT_SHA = git(['rev-parse', 'HEAD']);
const BRANCH = git(['rev-parse', '--abbrev-ref', 'HEAD']);
const STATUS_TRACKED = git(['status', '--porcelain', '--untracked-files=no']);
const WORKTREE_DIRTY = STATUS_TRACKED === null ? null : STATUS_TRACKED.length > 0;
const DIRTY_PATHS = STATUS_TRACKED ? STATUS_TRACKED.split(/\r?\n/).filter(Boolean).slice(0, 20) : [];
const PYTHON_VERSION = pythonVersion();

const STEPS = [
  { id: '① verify_golden fl001（独立 oracle → golden 容差比对）', cmd: 'python', args: ['scripts/verify_golden.py'], tier: 'core' },
  { id: '① verify_golden fc001（P1-06 / G2b-lite）', cmd: 'python', args: ['scripts/verify_golden.py', 'fc001'], tier: 'core' },
  { id: '① verify_golden gt001（GTL1-G2b-03 / gt001_v3 T-B）', cmd: 'python', args: ['scripts/verify_golden.py', 'gt001'], tier: 'core' },
  { id: 'R-3 property_harness.py（模型侧三不变量 240+27 组参数扫描，DEC-E 24→25）', cmd: 'python', args: ['-I', 'tools/oracle/properties/property_harness.py'], tier: 'core' },
  { id: '① engine.test.js（FL-001 601 点对 golden + PHY/SA）', cmd: 'node', args: ['tests/engine.test.js'], tier: 'core' },
  { id: '① engine-fc.test.js（FC-001 601 点对 golden，P1-06）', cmd: 'node', args: ['tests/engine-fc.test.js'], tier: 'core' },
  { id: '+ plants.test.js（I-11 plant 接口护栏，CHG-20261030-07）', cmd: 'node', args: ['tests/plants.test.js'], tier: 'core' },
  { id: '② e2e.mjs（浏览器 E2E，PHY-08/SA-22）', cmd: 'node', args: ['tools/e2e.mjs'], skip: skipE2e, tier: 'core' },
  { id: 'V3-03 perf.mjs（E2E 主旅程时长阈值，F-5 收尾）', cmd: 'node', args: ['tools/perf.mjs'], skip: skipE2e, tier: 'core' },
  { id: '③ registry.test.js（RunRegistry/规范哈希/不可变）', cmd: 'node', args: ['tests/registry.test.js'], tier: 'core' },
  { id: '④ schema.test.js（Schema/单位字典/exposure/投影）', cmd: 'node', args: ['tests/schema.test.js'], tier: 'core' },
  { id: '④ bundle.test.js（EvidenceBundle v1 + N-1…N-10 负例）', cmd: 'node', args: ['tests/bundle.test.js'], tier: 'core' },
  { id: '+ event-phase.test.js（事件相位 G0-DEC-05）', cmd: 'node', args: ['tests/event-phase.test.js'], tier: 'core' },
  { id: 'G4 scope-guard.test.js（SA-24 范围守卫）', cmd: 'node', args: ['tests/scope-guard.test.js'], tier: 'core' },
  { id: 'G4 compare.test.js（对比白名单 T-15）', cmd: 'node', args: ['tests/compare.test.js'], tier: 'core' },
  { id: 'G4 causal-rules.test.js（因果规则/证据链/教学卡）', cmd: 'node', args: ['tests/causal-rules.test.js'], tier: 'core' },
  { id: 'G4 copy-guard.mjs（禁止词扫描 §6.3）', cmd: 'node', args: ['tools/copy-guard.mjs'], tier: 'core' },
  { id: 'P1 report.test.js（HTML 报告验收）', cmd: 'node', args: ['tests/report.test.js'], tier: 'extended' },
  { id: 'G6 arena-protocol-negative.test.js（盲评测协议 v2 + N-B1…B17 负例 + MVP smoke + QP-4 假候选率）', cmd: 'node', args: ['tests/arena-protocol-negative.test.js'], tier: 'extended' },
  { id: 'FL-19 backend-admission.test.js（B-1/B-5 vs golden + 准入机检 G-1/G-2）', cmd: 'node', args: ['tests/backend-admission.test.js'], tier: 'extended' },
  { id: 'V3-33 engine-gt.test.js（GT-001 引擎 ↔ golden ±1e-9 + GT PHY 检查）', cmd: 'node', args: ['tests/engine-gt.test.js'], tier: 'core' },
  { id: 'FL-19 backend-bridge.test.js（后端对照 HTTP 桥安全边界+端点）', cmd: 'node', args: ['tests/backend-bridge.test.js'], tier: 'extended' },
  { id: 'V3-34 fmu-admission（Q-5：model_manifest 强制 + zip 结构 + 拒绝路径）', cmd: 'python', args: ['tools/backend/py/fmu_admission.py', '--self-check'], tier: 'extended' },
  { id: '+ core.test.js（既有回归，适配新语义）', cmd: 'node', args: ['tests/core.test.js'], tier: 'core' },
  { id: '+ arena.test.js（既有回归）', cmd: 'node', args: ['tests/arena.test.js'], tier: 'extended' },
  { id: 'C-2 scenario.test.js（场景编排回归：负例/roundtrip/执行等价，S5 第 26 步）', cmd: 'node', args: ['tests/scenario.test.js'], tier: 'core' },
  { id: 'PV-001 verify_golden pv001（第 5 个 golden，PV-G2b-03 / CHG-20261104-10 批准链，第 27 步）', cmd: 'python', args: ['scripts/verify_golden.py', 'pv001'], tier: 'core' },
  { id: 'PV-001 engine-pv.test.js（引擎↔golden pv001_v1 4 Run 一致性 + R-4 守卫，第 28 步）', cmd: 'node', args: ['tests/engine-pv.test.js'], tier: 'core' },
  { id: 'WT-001 verify_golden wt001（第 6 个 golden，WT-G2b-03 / CHG-20261107-01 批准链，第 29 步）', cmd: 'python', args: ['scripts/verify_golden.py', 'wt001'], tier: 'core' },
  { id: 'WT-001 engine-wt.test.js（引擎↔golden wt001_v1 5 Run 一致性 + R-7 守卫，第 30 步）', cmd: 'node', args: ['tests/engine-wt.test.js'], tier: 'core' },
  { id: '+ file-smoke.mjs（file:// 发布能力冒烟 61 断言——FaultLab.html 单文件工件；CHG-20261108-01 / V090_WAVE_DESIGN DEC-5 残留①固化，第 31 步）', cmd: 'node', args: ['tools/file-smoke.mjs'], skip: skipE2e, tier: 'core' },
  { id: 'C-3 teaching.test.js（教学路径回归：7 路径校验/负例 8 类/禁词子串自检/FL 3 Run 冒烟——V1_FACES §4 #11 残留②补挂，第 32 步）', cmd: 'node', args: ['tests/teaching.test.js'], tier: 'core' },
  { id: 'C-4 leaderboard.test.js（本地排行榜回归——排行属生态扩展面，与 arena/backend 同层；V1_FACES §4 #11 残留②补挂，第 33 步）', cmd: 'node', args: ['tests/leaderboard.test.js'], tier: 'extended' },
  { id: 'MG-001 verify_golden mg001（第 7 个 golden，MG-G2b-03 / CHG-20261110-01 批准链，第 34 步）', cmd: 'python', args: ['scripts/verify_golden.py', 'mg001'], tier: 'core' },
  { id: 'MG-001 engine-mg.test.js（引擎↔golden mg001_v1 5 Run 一致性 + R-5 守卫，第 35 步）', cmd: 'node', args: ['tests/engine-mg.test.js'], tier: 'core' }
];

/* ------------------------------------- 步数账与 tier 口径（I-7 / D-1 DEC-3） *
 * tier 判定口径（CHG-20261104-08 DEC-3，采纳 D1_LITE_ASSESSMENT 方案 C，
 * 与该文件「实施追记 §7」一致）：
 *   core     = 门禁主干——verify_golden 六系统（FL/FC/GT/PV-001/WT-001/MG-001）+
 *              property_harness 模型侧不变量 + engine/engine-fc/engine-gt/
 *              engine-pv/engine-wt/engine-mg 对 golden +
 *              plants/schema/registry/
 *              bundle/event-phase/core.test/scenario.test 等核心回归 + G4 守卫族
 *              （scope-guard/compare/causal-rules/copy-guard）+ e2e + perf
 *              （G2 四件套之②缺一不可，随主干）+ file-smoke（file:// 发布能力冒烟，
 *              浏览器步随 ② 同步 --skip-e2e，CHG-20261108-01）+ teaching
 *              （C-3 教学路径回归，V1_FACES §4 #11 残留②补挂）；
 *   extended = 扩展面——backend（admission/bridge）、arena（protocol-negative/
 *              arena.test）、fmu-admission、report、leaderboard（C-4 本地排行榜，
 *              生态扩展面与 arena/backend 同层）。
 *   当前构成：35 步 = core 28 + extended 7（33→35：第 34/35 步 MG-001 接线，
 *              CHG-20261110-01 / V110_WAVE_DESIGN DEC-5——既有 33 步零改动）。
 * 步数账纪律（V06_ROADMAP I-7：步数增长须有预算与分层）：
 *   1. 每步必须带合法 tier 标签（下方护栏强制），新增步须同时声明归属层与预算来源；
 *   2. 任何增删步必须在 CHG 登记步数账（删几步/增几步/理由/归属卡），预算线沿用
 *      DEC-E 口径（单波 ≤ +1；CHG-20261104-08 预算 ≤27 已兑现，CHG-20261104-10
 *      登记 26→28、预算 ≤29 已兑现；CHG-20261104-12（GT-L1 实现轮，GTL1-IMP-Q1）
 *      0 增步维持 28；当前波 CHG-20261107-01（V080_WAVE_DESIGN DEC-6）28→30、
 *      预算 ≤29→≤31 显式申报——FL 侧零新增步（verify_golden 步①同一 python 调用
 *      内双 golden 顺序验证，FLTH §7.3「优先并入现有步」口径），WT 侧 +2 步
 *      （A-4b 并入口径已用足、B-2 新系统 5 Run golden + 引擎轨无法并入既有步））；
 *      当前波 CHG-20261108-01（V090_WAVE_DESIGN DEC-5 残留①清算 + DEC-7）30→31、
 *      预算 ≤31→≤32 显式申报——file:// 冒烟固化 tools/file-smoke.mjs 挂第 31 步、
 *      core 层（v0.7.2/v0.8.0 两轮临时件正式化转门禁步，单波 +1））；
 *      当前波（v1.0.0 发布前置清算，V1_FACES §4 #11 残留②裁定=修复补挂）31→33、
 *      预算 ≤32→≤33 显式申报——tests/teaching.test.js 挂第 32 步、core 层
 *      （C-3 教学路径回归）+ tests/leaderboard.test.js 挂第 33 步、extended 层
 *      （C-4 本地排行榜回归，排行属生态扩展面与 arena/backend 同层）——两测试面
 *      从步账外纳入门禁（发布前全覆盖裁定），单波 +2；无步删除、既有 31 步顺序
 *      与判据零改动；
 *      当前波（MG-001 接线，MG001_G2B_SPEC_APPROVED v1.0 §8 MG-G2b-04 /
 *      V110_WAVE_DESIGN DEC-5，CHG-20261110-01 批准链）33→35、预算 ≤33→≤35
 *      显式申报——verify_golden mg001 挂第 34 步（第 7 个 golden）+ tests/engine-mg
 *      .test.js 挂第 35 步（R-5 分派守卫），均 core 层（WT-001 先例「新系统 =
 *      verify 步 + engine 步各一」，V080 DEC-6 口径：新系统 5 Run golden + 引擎轨
 *      无法并入既有步，单波 +2 用足）。**FIRST-33-STEPS-NORMALIZED-IDENTICAL
 *      机检注记**：既有 33 步顺序/判据/命令逐字零改动（仅 STEPS 尾部追加第 34/35
 *      步，无插入、无删除、无判据修改）；
 *   3. 步数账变迁：18→19（plants，CHG-20261030-07）→24（G2b/V3 系列与回归挂入）→
 *      25（property_harness，DEC-E 24→25）→25（D-1 分层：仅加 tier 标签与 --tier
 *      参数，0 增步，CHG-20261104-08 DEC-3）→26（S5 测试接线：scenario.test.js
 *      挂第 26 步、core 层，单波 +1，预算 ≤27 兑现，CHG-20261104-08）→
 *      28（PV-001 接线：verify_golden pv001 挂第 27 步、engine-pv.test.js 挂
 *      第 28 步，均 core 层，单波 +2（V070_WAVE_DESIGN 登记），预算 ≤29 兑现，
 *      CHG-20261104-10）→28（GT-L1 实现轮：verify_golden gt001 步 id 不变、
 *      oracle/golden 重指向 gt001_l1_oracle/gt001_v3（T-B），engine-gt thermo
 *      变体并入既有 engine-gt.test.js 步——0 增步，28 维持，预算 ≤29 沿用
 *      （GTL1-IMP-Q1，优先并入现有步），CHG-20261104-12）→
 *      30（WT-001 接线（V080_WAVE_DESIGN DEC-6，CHG-20261107-01）：verify_golden
 *      wt001 挂第 29 步、engine-wt.test.js 挂第 30 步，均 core 层，单波 +2，
 *      预算 ≤29→≤31 显式申报；同波 FL 侧零新增步——fl001_l1 双 golden 并入
 *      步①同一 python 调用，FLTH §7.3 口径）→
 *      31（file:// 冒烟固化（V090_WAVE_DESIGN DEC-5 残留①，CHG-20261108-01）：
 *      tools/file-smoke.mjs 挂第 31 步、core 层，单波 +1，预算 ≤31→≤32 显式申报
 *      ——v0.7.2（57 断言）/v0.8.0（61 断言）两轮临时件正式化为发布能力门禁步，
 *      每轮重建就此终止；--skip-e2e 与 ②/perf 同步跳过）→
 *      33（教学生态补挂（V1_FACES §4 #11 残留②，v1.0.0 发布前置清算）：
 *      tests/teaching.test.js 挂第 32 步、core 层（C-3 教学路径回归）；
 *      tests/leaderboard.test.js 挂第 33 步、extended 层（C-4 本地排行榜回归，
 *      排行属生态扩展面，与 arena/backend 同层）——两测试面从步账外纳入门禁
 *      （发布前全覆盖裁定），单波 +2，预算 ≤32→≤33 显式申报）→
 *      35（MG-001 接线（MG001_G2B_SPEC_APPROVED v1.0 §8 MG-G2b-04 / V110_WAVE_DESIGN
 *      DEC-5，CHG-20261110-01 批准链）：verify_golden mg001 挂第 34 步（第 7 个
 *      golden）、tests/engine-mg.test.js 挂第 35 步（R-5 分派守卫），均 core 层，
 *      单波 +2，预算 ≤33→≤35 显式申报；FIRST-33-STEPS-NORMALIZED-IDENTICAL 机检
 *      ——既有 33 步顺序/判据/命令逐字零改动）。
 * 部分运行 ≠ 全量门禁：--tier core/extended 与 --skip-e2e 同为部分运行，不产生
 *   「部分执行 = 门禁通过」的新路径；发布门（G7/G8）与 CHG 验收句必须引用
 *   --tier all 全量运行（报告 tier 字段 + execution.command 可机检）。
 * 报告分层小计（tiers）语义：tiers.<tier>.steps = STEPS 内该层步数（步数账口径，
 *   与本次运行过滤无关）；pass / duration_ms = 本次运行该层实际执行且通过的步数
 *   与时长合计（skipped 不计通过；未被选中运行的层记 0）。
 */

/* 步数账护栏（I-7）：任何无 tier 或非法 tier 的新步在此直接失败，防止绕过分层登记 */
for (const s of STEPS) {
  if (s.tier !== 'core' && s.tier !== 'extended') {
    console.error('FATAL: STEPS 步「' + s.id + '」缺少合法 tier 标签（core|extended）——' +
      '请先在 CHG 步数账登记分层（V06_ROADMAP I-7）。');
    process.exit(2);
  }
}
/* --tier 过滤：默认 all 直接沿用 STEPS 原数组引用（顺序与内容零变化） */
const selectedSteps = tier === 'all' ? STEPS : STEPS.filter((s) => s.tier === tier);

/* 失败时保留简短错误输出（T1）：stdout/stderr 各取末尾若干行，总长受限 */
function shortError(res) {
  const tail = (text, lines) => {
    const all = String(text || '').split(/\r?\n/).filter((line) => line.trim().length > 0);
    return all.slice(-lines).join('\n');
  };
  const out = [];
  if (res.error) out.push('spawn error: ' + (res.error.message || String(res.error)));
  const so = tail(res.stdout, 12);
  const se = tail(res.stderr, 8);
  if (so) out.push('---- stdout 末尾 ----\n' + so);
  if (se) out.push('---- stderr 末尾 ----\n' + se);
  const text = out.join('\n');
  return text.length > 1600 ? text.slice(0, 1600) + '\n…(截断)' : text;
}
const __t0 = Date.now();
const results = [];
let failed = 0;
for (const step of selectedSteps) {
  if (step.skip) {
    results.push({ id: step.id, status: 'skipped', reason: '--skip-e2e' });
    console.log('[SKIP] ' + step.id);
    continue;
  }
  const stepStartedMs = Date.now();
  const res = spawnSync(step.cmd, step.args, { cwd: ROOT, encoding: 'utf8', timeout: 300000 });
  const durationMs = Date.now() - stepStartedMs;
  const ok = res.status === 0;
  if (!ok) failed++;
  const entry = {
    id: step.id, cmd: step.cmd + ' ' + step.args.join(' '),
    status: ok ? 'pass' : 'fail', exit_code: res.status, duration_ms: durationMs
  };
  if (!ok) entry.error = shortError(res);
  results.push(entry);
  console.log('[' + (ok ? 'PASS' : 'FAIL') + '] ' + step.id + '（' + durationMs + ' ms）');
  if (!ok) {
    const tail = (res.stdout || '').split('\n').slice(-14).join('\n');
    console.log('---- stdout 末尾 ----\n' + tail);
    if (res.stderr) console.log('---- stderr 末尾 ----\n' + res.stderr.split('\n').slice(-8).join('\n'));
  }
}

const generatedAt = new Date().toISOString();
/* D-1 分层小计（CHG-20261104-08 DEC-3；只增字段）：results 与 selectedSteps 按
   下标配对（循环每步恰 push 一条，skipped 亦然）。语义见 STEPS 尾部注释块。 */
const tiersSummary = {};
for (const t of ['core', 'extended']) {
  let pass = 0;
  let durationMs = 0;
  selectedSteps.forEach((s, i) => {
    if (s.tier !== t) return;
    const r = results[i];
    if (!r) return;
    if (r.status === 'pass') pass++;
    if (typeof r.duration_ms === 'number') durationMs += r.duration_ms;
  });
  tiersSummary[t] = {
    steps: STEPS.filter((s) => s.tier === t).length,
    pass,
    duration_ms: durationMs
  };
}
const report = {
  /* 原有字段（读取兼容） */
  gate: 'G2 四件套',
  duration_ms: Date.now() - __t0,
  ok: failed === 0,
  failed_count: failed,
  results,
  node: process.version,
  generated_at: generatedAt,
  /* T1 代码版本 */
  code: {
    commit_sha: COMMIT_SHA,
    branch: BRANCH,
    worktree_dirty: WORKTREE_DIRTY,
    dirty_paths: DIRTY_PATHS
  },
  /* T1 运行环境 */
  environment: {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    python: PYTHON_VERSION
  },
  /* T1 执行信息 */
  execution: {
    command: COMMAND,
    started_at: STARTED_AT,
    generated_at: generatedAt,
    duration_ms: Date.now() - STARTED_MS
  },
  /* D-1 tier 分层（CHG-20261104-08 DEC-3）：tier=本次运行过滤（all=全量门禁）；
     tiers=分层小计（步数账 + 通过数 + 时长合计，语义见 STEPS 尾部注释块） */
  tier,
  tiers: tiersSummary
};
fs.mkdirSync(path.join(ROOT, 'artifacts'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'artifacts', 'run-g2-report.json'), JSON.stringify(report, null, 2));
console.log('\n================================================');
console.log('追溯：commit=' + (COMMIT_SHA || 'n/a').slice(0, 12) + ' branch=' + (BRANCH || 'n/a') +
  ' dirty=' + WORKTREE_DIRTY + ' node=' + process.version + ' python=' + PYTHON_VERSION +
  (tier !== 'all' ? ' tier=' + tier : '') +
  ' 用时 ' + report.execution.duration_ms + ' ms');
if (failed) {
  console.log('G2 聚合：' + failed + ' 项失败（详见 artifacts/run-g2-report.json）——相应门禁不得声称关闭。');
  process.exit(1);
}
if (tier === 'all') {
  console.log('G2 四件套聚合：全部通过（artifacts/run-g2-report.json）。');
  console.log('注意：通过项为内部一致性/可复核性证据，不构成模型验证或硬件验证。');
} else {
  console.log('G2 分层运行（--tier ' + tier + '，' + selectedSteps.length + ' 步）：所选层全部通过' +
    '（artifacts/run-g2-report.json）——部分运行不构成 G2 全量门禁通过，发布门（G7/G8）与 CHG 验收须引用 --tier all 全量运行。');
  console.log('注意：通过项为内部一致性/可复核性证据，不构成模型验证或硬件验证。');
}
