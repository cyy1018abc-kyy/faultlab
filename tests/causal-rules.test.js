/* owner: causal-compare | module: tests/causal-rules | contract: UI_COPY_GUARDRAILS §3/§4 / G0-DEC-13
   G4 因果规则与证据链（I-08 完整版 / P0b-03）：
   - rule_id/rule_version/EvidenceLink 字段完备且绑定一致；
   - ⑤→⑥ 边不存在（TXT-06），⑥ 从测量通道分支接入；
   - ⑥ 文本含代数恒等分解式与"不是能量损失"（TXT-05）；
   - 因果/对比文案无禁止词（与 copy-guard 互补的程序化断言）。
   运行：node tests/causal-rules.test.js；失败非零退出。 */
'use strict';

const fs = require('fs');
const path = require('path');
const { bootstrap } = require('./core-load');
const FL = bootstrap();
const core = FL.core;

let pass = 0;
let fail = 0;
const failures = [];
function ok(cond, name, detail) {
  if (cond) pass++;
  else { fail++; failures.push({ name, detail: detail || '条件为假' }); }
}
function eq(a, b, name) { ok(a === b, name, 'expected ' + JSON.stringify(b) + '，actual ' + JSON.stringify(a)); }

const run = core.simulate(core.createConfig('FL-001', {}), { runId: 'CAUSAL-TEST' });
const causal = run.causal;
const sysSignals = FL.systems._raw.get('FL-001').signals.map((s) => s.id);

/* 1. 规则版本与 rule_id（D-06：规则模板版本化 + 证据绑定） */
eq(causal.rule_version, 'cr.fl001.v1', 'causal.rule_version 存在');
ok(causal.nodes.length === 6, '闭环故障因果链六节点');
causal.nodes.forEach((node) => {
  ok(typeof node.rule_id === 'string' && node.rule_id.indexOf('CR-FL001-') === 0,
    '节点 ' + node.id + ' rule_id 版本化（' + node.rule_id + '）');
  ok(Array.isArray(node.evidence) && node.evidence.length > 0, '节点 ' + node.id + ' 有证据');
  node.evidence.forEach((ev) => {
    eq(ev.run_id, run.runId, '证据 run_id 绑定（' + node.id + '）');
    eq(ev.rule_id, node.rule_id, '证据与节点共享 rule_id（' + node.id + '）');
    ok(typeof ev.signal_id === 'string' && sysSignals.indexOf(ev.signal_id) !== -1, '证据 signal_id 存在（' + node.id + '）');
    ok(Array.isArray(ev.time_window_s) && ev.time_window_s.length === 2 &&
      ev.time_window_s[0] <= ev.time_window_s[1] && ev.time_window_s[1] <= 60,
      '证据 time_window_s 有效（' + node.id + '）');
    ok(['CONFIG_FACT', 'MODEL_MECHANISM', 'OBSERVED_NUMERIC'].indexOf(ev.layer) !== -1,
      '证据 layer 三层枚举（' + node.id + '）');
  });
});

/* 2. ⑤→⑥ 边不存在；⑥ 从 ② 测量通道分支接入（TXT-06 / §3.3） */
const edges = causal.edges.map((e) => e.from + '->' + e.to);
ok(edges.indexOf('n5->n6') === -1, '⑤→⑥ 边已删除（G0-DEC-13）', JSON.stringify(edges));
ok(edges.indexOf('n4->n5') !== -1, '④→⑤ 边保留');
ok(edges.indexOf('n2->n6') !== -1, '⑥ 从 ② 测量通道分支接入');
const n2n6 = causal.edges.filter((e) => e.from === 'n2' && e.to === 'n6')[0];
ok(n2n6 && n2n6.label.indexOf('测量通道误差的功率当量') !== -1, '②→⑥ 边标注"测量通道误差的功率当量"');
ok(n2n6.dashed === true, '②→⑥ 为虚线分支');

/* 3. ⑥ 节点：代数恒等分解 + 边界文案（TXT-05） */
const n6 = causal.nodes.filter((n) => n.id === 'n6')[0];
ok(n6.detail.indexOf('r_meas = (P_gen + P_bat,true − P_load) + (P_bat,meas − P_bat,true) = 0 + 0.4·b') !== -1,
  '⑥ 含完整恒等分解式', n6.detail.slice(0, 120));
ok(n6.detail.indexOf('不是能量损失') !== -1, '⑥ 含"不是能量损失"');
ok(n6.detail.indexOf('不是 ⑤ 的结果') !== -1, '⑥ 明确"不是 ⑤ 的结果"');
ok(n6.epistemic === '代数恒等' && n6.kind === 'algebraic_identity', '⑥ 携带代数恒等认识论标签');
ok(causal.mechanismSummary.indexOf('不是能量损失') !== -1 && causal.mechanismSummary.indexOf('不是发电机补偿的结果') !== -1,
  '机制摘要含双重边界（不是能量损失 / 不是发电机补偿的结果）');

/* 4. 三层认识论标签齐备（U-10） */
const layers = causal.nodes.map((n) => n.layer);
ok(layers.indexOf('config') !== -1 && layers.indexOf('mechanism') !== -1 && layers.indexOf('observation') !== -1,
  'config/mechanism/observation 三层各≥1');

/* 5. monitor 链路：r_meas 节点同样从测量通道分支（无发电机节点） */
const mon = core.simulate(core.createConfig('FL-001', { feedback_mode: 'monitor' }), { runId: 'CAUSAL-MON' });
const monEdges = mon.causal.edges.map((e) => e.from + '->' + e.to);
ok(monEdges.indexOf('m2->m4') !== -1 && monEdges.every((e) => e !== 'm3->m4' && e !== 'm5->m4'),
  'monitor 链 r_meas（m4）从测量分支接入');
ok(mon.causal.nodes.some((n) => n.detail.indexOf('不是能量损失') !== -1 || n.detail.indexOf('不是能量损失') !== -1),
  'monitor 链含测量偏差边界文案');

/* 6. 措辞护栏（程序化断言，与 copy-guard 互补）：因果链文本无"因为发电机补偿所以残差" */
ok(n6.detail.indexOf('因为发电机补偿所以') === -1, '⑥ 不把残差归因于发电机补偿');
ok(causal.nodes.every((n) => n.detail.indexOf('多发') === -1), '因果链无"多发"表述');
ok(causal.nodes.every((n) => n.detail.indexOf('诊断') === -1), '因果链无诊断类表述');

/* 7. 因果页横幅与教学卡文案在源码中逐字落地（TXT-04/TXT-07 的源级断言；
    DOM 级断言由 tools/e2e.mjs 扩展覆盖） */
const causalSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', 'pages', 'causal.js'), 'utf8');
ok(causalSrc.indexOf('本次故障是运行前注入的配置事实；本页不做检测/定位/诊断，无检出率与延迟指标。') !== -1,
  '§3.1 锁定横幅逐字存在');
ok(causalSrc.indexOf('data-testid\': \'causal-banner') !== -1, '横幅携带 data-testid=causal-banner');
ok(causalSrc.indexOf('card-residual-energy') !== -1, '教学卡携带 data-testid=card-residual-energy');
ok(causalSrc.indexOf('0.04444') !== -1 && causalSrc.indexOf('0.04278') !== -1 && causalSrc.indexOf('0.00167') !== -1
  && causalSrc.indexOf('代数恒等') !== -1, '教学卡三量并列 + 代数恒等（TXT-07）');

/* 8. V072 清算项 6/7：GT thermo 轨叙事卡（systems.js causalTemplates 新键）
      + RESIDUAL_CANDIDATES PV-001 / GT thermo 键（src/ui/pages/causal.js）。
      契约：既有三族模板零改动；thermo_track 为叙事卡模板键（非 fault.family
      分派键）——v0.9.0 DEC-5 起由 engine 运行期自动挂载为 causal.thermoTrackCard
      附加字段（见 §9），主链仍按 fault.family 分派；候选键按 r_meas→d_pv /
      thermo 效率链口径解析。 */
const gtSys = FL.systems._raw.get('GT-001');
eq(JSON.stringify(Object.keys(gtSys.causalTemplates)),
  JSON.stringify(['sensor_drift', 'load_step', 'actuator_fault', 'thermo_track']),
  'GT-001 causalTemplates：既有三族键零改动 + 新增 thermo_track（V072 清算项 6）');
eq(gtSys.causalTemplates.sensor_drift.id, 'gt-sensor-drift', '既有模板 id 零改动（sensor_drift）');
eq(gtSys.causalTemplates.load_step.id, 'gt-load-step', '既有模板 id 零改动（load_step）');
eq(gtSys.causalTemplates.actuator_fault.id, 'gt-valve-stuck', '既有模板 id 零改动（actuator_fault）');
const thermoCard = FL.systems.causalTemplate('GT-001', 'thermo_track');
ok(thermoCard && thermoCard.id === 'gt-thermo-cross-depth',
  'thermo_track 卡经 causalTemplate API 可取（叙事卡模板键，非 fault.family 分派键；运行期挂载见 §9）');
eq(thermoCard.nodes.length, 6, 'thermo 卡 6 节点（PV001 spec §6.4 先例结构）');
ok(Array.isArray(thermoCard.monitorNodes) && thermoCard.monitorNodes.length === 3, 'thermo 卡 monitor 链 3 节点');

ok(thermoCard.mechanismSummary.indexOf('测量偏置 → 效率链重新平衡') !== -1 &&
  thermoCard.mechanismSummary.indexOf('MPPT') !== -1 && thermoCard.mechanismSummary.indexOf('不适用') !== -1,
  'thermo 卡机制摘要：测量偏置→效率链重新平衡；PV MPPT 类比不适用显式登记');
const thermoCardText = JSON.stringify(thermoCard);
['49.590174', '49.589336', '49.999347', '49.992213', '18.266', '20.000', '49.719396', '49.791667', '0.3221', '0.213412']
  .forEach((num) => ok(thermoCardText.indexOf(num) !== -1, 'thermo 卡引用 §3.2 数值：' + num));
/* 卡面引用完整性：componentId / signalIds / assumptions 均存在于 GT-001 注册面 */
const gtCompIds = gtSys.components.map((c) => c.id);
const gtSigIds = gtSys.signals.map((s) => s.id);
const gtAsmIds = (gtSys.model.assumptions || []).map((a) => a.id);
thermoCard.nodes.forEach((n) => {
  ok(gtCompIds.indexOf(n.componentId) !== -1, 'thermo 卡节点 ' + n.id + ' componentId 存在（' + n.componentId + '）');
  (n.signalIds || []).forEach((sid) => ok(gtSigIds.indexOf(sid) !== -1, 'thermo 卡节点 ' + n.id + ' 信号 ' + sid + ' 存在'));
});
thermoCard.assumptions.forEach((aid) => ok(gtAsmIds.indexOf(aid) !== -1, 'thermo 卡假设 ' + aid + ' 存在于 model.assumptions'));

/* RESIDUAL_CANDIDATES：源码提取 + 按系统/轨解析断言 */
const mRes = causalSrc.match(/const RESIDUAL_CANDIDATES = \{([\s\S]*?)\n  \};/);
ok(!!mRes, 'causal.js RESIDUAL_CANDIDATES 块可提取');
const RES = (0, eval)('({' + mRes[1] + '})');
eq(JSON.stringify(RES.pvMeas), JSON.stringify(['d_pv_kW']), 'PV-001 键（r_meas→d_pv 口径）：pvMeas=[d_pv_kW]');
eq(JSON.stringify(RES.pvSource), JSON.stringify(['P_pv_true_kW']), 'PV-001 电源项键：pvSource=[P_pv_true_kW]');
eq(JSON.stringify(RES.gtThermoChain), JSON.stringify(['Q_fuel_kW', 'P_comp_kW', 'P_turb_kW']),
  'GT thermo 键：gtThermoChain=效率链三信号（kW 域，非残差信号）');
const pvSys = FL.systems._raw.get('PV-001');
const pvSigIds = pvSys.signals.map((s) => s.id);
['d_pv_kW', 'r_meas_kW', 'P_pv_true_kW'].forEach((sid) => {
  ok(pvSigIds.indexOf(sid) !== -1, 'PV-001 信号目录含 ' + sid);
});
const gtThermoRun = core.simulate(core.createConfig('GT-001', {}), { runId: 'CR-GT-TH' });
function hasFiniteSeries(run, id) {
  const arr = run.timeseries && run.timeseries.signals ? run.timeseries.signals[id] : null;
  return Array.isArray(arr) && arr.some((v) => typeof v === 'number' && isFinite(v));
}
ok(RES.gtThermoChain.every((id) => hasFiniteSeries(gtThermoRun, id)), 'thermo 轨：效率链三信号为有限数值轨（可解析）');
const gtSwingRun = core.simulate(core.createConfig('GT-001', { inertia_model: 'swing' }), { runId: 'CR-GT-SW' });
ok(RES.gtThermoChain.every((id) => !hasFiniteSeries(gtSwingRun, id)), 'swing 遗留轨：效率链三信号全程 null（不解析）');
const pvRun = core.simulate(core.createConfig('PV-001', { fault: { family: 'sensor_drift', params: { magnitude: 100 }, t_start_s: 20 }, feedback_mode: 'closed_loop' }), { runId: 'CR-PV' });
ok(hasFiniteSeries(pvRun, 'd_pv_kW') && hasFiniteSeries(pvRun, 'r_meas_kW'), 'PV-001 运行：d_pv / r_meas 双通道并存');
eq((pvRun.metrics.find((m) => m.metric_id === 'max_abs_r_meas_kW') || {}).value, 0,
  'PV-001 r_meas 恒 0（r_meas→d_pv 口径的根因：功率测量通道全健康）');

/* 9. DEC-5（V090_WAVE_DESIGN / v080-release §4 残留③ v0.9.0 清算）：
      thermo_track 运行期自动挂载（engine.js buildCausal → causal.thermoTrackCard）。
      契约：①触发面 = causalTemplates.thermo_track 已注册（当前仅 GT-001）
      ∧ cfg.inertia_model === 'thermo' ∧ family !== 'none'；
      ②主链分派零变化——thermo Run 主链仍走既有三族模板（与 swing/linear 同构；
      tests/core.test.js §6 既有 GT causal 断言为回归佐证）；
      ③挂载卡与主链经同一构建机制产出（字段面同构：rule_version/focusEventId/
      headline/mechanismSummary/nodes/edges/assumptions/limitations/alternatives/
      monitorContrast），不新增字段面；
      ④run_hash 不含 causal（registry.js runHashInput），golden 字节冻结不受影响。 */
const gtMountRun = core.simulate(core.createConfig('GT-001', {}), { runId: 'CR-GT-MOUNT' });
const mount = gtMountRun.causal.thermoTrackCard;
ok(mount && typeof mount === 'object', 'thermo Run（GT 默认轨）causal 自动挂载 thermoTrackCard');
if (mount) {
  eq(mount.nodes.length, 6, '挂载卡 6 节点（与 §8 静态卡同源）');
  ok(mount.headline.indexOf('跨深度叙事卡') !== -1, '挂载卡 headline 来自 thermo_track 模板');
  ok(mount.nodes[0].rule_id.indexOf('gt-thermo-cross-depth') !== -1,
    '挂载卡 rule_id 携带模板 id（' + mount.nodes[0].rule_id + '）');
  ok(Array.isArray(mount.assumptions) && mount.assumptions.length === 8, '挂载卡假设面 = A-gtl1-* 八条');
  ok(mount.monitorContrast && typeof mount.monitorContrast.description === 'string',
    '挂载卡字段面与主链同构（含 monitorContrast.description）');
  mount.nodes.forEach((n) => {
    ok(typeof n.rule_id === 'string' && n.rule_id.indexOf('CR-GT001-') === 0,
      '挂载卡节点 ' + n.id + ' rule_id 版本化');
    ok(Array.isArray(n.evidence), '挂载卡节点 ' + n.id + ' evidence 数组在场');
  });
}
/* 主链零变化（thermo Run 主链仍按 fault.family 既有模板分派） */
eq(gtMountRun.causal.nodes.length, 6, 'thermo Run 主链仍 6 节点（零变化）');
eq(gtMountRun.causal.nodes[0].rule_id, 'CR-GT001-sensor_drift-gt-sensor-drift-n1',
  'thermo Run 主链 rule_id 仍按 sensor_drift 模板分派');
/* 各故障族 thermo Run：主链不变 + 卡照挂（thermo_track 卡 n5 即跨故障叙事） */
const gtMountLoad = core.simulate(core.createConfig('GT-001', { fault: { family: 'load_step' } }), { runId: 'CR-GT-ML' });
ok(gtMountLoad.causal.thermoTrackCard && gtMountLoad.causal.thermoTrackCard.nodes.length === 6,
  'thermo load_step Run 同样挂载');
ok(gtMountLoad.causal.nodes.length === 6 && gtMountLoad.causal.nodes[0].rule_id.indexOf('gt-load-step') !== -1,
  'thermo load_step 主链 rule_id 仍按 load_step 模板分派');
const gtMountAct = core.simulate(core.createConfig('GT-001', { fault: { family: 'actuator_fault' } }), { runId: 'CR-GT-MA' });
ok(gtMountAct.causal.thermoTrackCard && gtMountAct.causal.nodes.length === 5,
  'thermo actuator Run：主链 5 节点零变化 + 挂载卡在场');
/* monitor 轨：挂载卡走 thermo_track.monitorNodes（3 节点），主链 monitor 链不变 */
const gtMountMon = core.simulate(core.createConfig('GT-001', { feedback_mode: 'monitor' }), { runId: 'CR-GT-MM' });
ok(gtMountMon.causal.thermoTrackCard && gtMountMon.causal.thermoTrackCard.nodes.length === 3,
  'monitor Run 挂载卡走 monitorNodes（3 节点）');
eq(gtMountMon.causal.nodes.length, 4, 'monitor Run 主链仍 4 节点（零变化）');
/* 遗留轨不受影响：swing/linear 不挂载（既有分派零变化的直接断言） */
ok(gtSwingRun.causal.thermoTrackCard === undefined, 'swing 遗留轨不挂载（thermoTrackCard 缺席）');
const gtLinearCausal = core.simulate(core.createConfig('GT-001', { inertia_model: 'linear' }), { runId: 'CR-GT-LN' });
ok(gtLinearCausal.causal.thermoTrackCard === undefined, 'linear 遗留轨不挂载');
/* 零波及面：无 thermo_track 模板注册的系统无挂载字段；健康基准 family=none 早返回 */
const flMountRun = core.simulate(core.createConfig('FL-001', {}), { runId: 'CR-FL-MOUNT' });
ok(flMountRun.causal.thermoTrackCard === undefined, 'FL-001（无 thermo_track 模板注册）零波及');
const gtHealthyCausal = core.simulate(core.createConfig('GT-001', { fault: { family: 'none' } }), { runId: 'CR-GT-HEAL' });
ok(gtHealthyCausal.causal.thermoTrackCard === undefined && gtHealthyCausal.causal.nodes.length === 0,
  'GT 健康基准无挂载（family=none 早返回）');

/* ------------------------------------------------------------------ */
console.log('\n================================================');
console.log('PASS ' + pass + ' / FAIL ' + fail + (fail ? '  ✗' : '  ✓'));
if (fail) {
  console.log('---- 失败明细（前 30）----');
  failures.slice(0, 30).forEach((f, i) => console.log('  [' + i + '] ' + f.name + '\n      ' + f.detail));
  console.log('================================================');
  process.exit(1);
}
console.log('因果规则与证据链测试全部通过（G0-DEC-13 / TXT-05/06/07 源级）。');
