/* owner: core-engine | module: tests/core | contract: docs/CONTRACT.md */
/* 核心层单元测试：node tests/core.test.js（不依赖任何第三方库）
   覆盖：契约 §5.1 精确数值表 / monitor / load_step / actuator / FC·GT 验收范围 /
        守恒 / 哈希确定性 / 非法配置 / run 结构完整性 / causal 结构 / compareRuns / 采样 API。
   输出 PASS n / FAIL m；失败时打印 actual vs expected 并非零退出。 */
'use strict';

const fs = require('fs');
const path = require('path');
const { bootstrap } = require('./core-load');

const FL = bootstrap();
const core = FL.core;
const systems = FL.systems;

let pass = 0;
let fail = 0;
const failures = [];

/* ------------------------------------------------------------------ */
/* 断言工具                                                            */
/* ------------------------------------------------------------------ */
function ok(cond, name, detail) {
  if (cond) {
    pass++;
  } else {
    fail++;
    failures.push({ name: name, detail: detail || '条件为假' });
  }
}

function eq(actual, expected, name) {
  const same = Object.is(actual, expected) || actual === expected;
  ok(same, name, 'expected ' + show(expected) + '，actual ' + show(actual));
}

function close(actual, expected, tol, name) {
  const good = typeof actual === 'number' && isFinite(actual) && Math.abs(actual - expected) <= tol;
  ok(good, name, 'expected ' + show(expected) + ' ±' + tol + '，actual ' + show(actual) +
    (typeof actual === 'number' ? '（diff ' + show(actual - expected) + '）' : ''));
}

function between(actual, lo, hi, name) {
  const good = typeof actual === 'number' && isFinite(actual) && actual >= lo && actual <= hi;
  ok(good, name, 'expected ∈ [' + lo + ', ' + hi + ']，actual ' + show(actual));
}

function notNull(actual, name) {
  ok(actual !== null && actual !== undefined, name, 'expected 非空，actual ' + show(actual));
}

function throwsField(fn, field, name) {
  let thrown = null;
  try { fn(); } catch (e) { thrown = e; }
  if (!thrown) {
    ok(false, name, 'expected 抛出错误（field=' + field + '），实际未抛');
    return;
  }
  ok(thrown.field === field, name,
    'expected 错误 field=' + field + '，actual field=' + show(thrown.field) + ' / message=' + thrown.message);
}

function show(v) {
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return JSON.stringify(v);
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  try { return JSON.stringify(v).slice(0, 200); } catch (e) { return String(v); }
}

function hex64(v) { return typeof v === 'string' && /^[0-9a-f]{64}$/.test(v); }

function makeRun(systemId, overrides, opts) {
  const config = core.createConfig(systemId, overrides || {});
  const options = Object.assign({ runId: 'Run-TEST' }, opts || {});
  return core.simulate(config, options);
}

function at(run, signalId, t) { return core.sampleAt(run, signalId, t).value; }
function mval(run, metricId) {
  const m = core.getMetric(run, metricId);
  return m ? m.value : undefined;
}
function qfail(run) { return run.quality.filter((q) => q.status === 'fail'); }
function qmap(run) {
  const out = {};
  run.quality.forEach((q) => { out[q.check_id] = q; });
  return out;
}

/* run 结构完整性（契约 §4.6） */
function assertRunShape(run, label, systemId) {
  ok(!!run && typeof run === 'object', label + '：run 为对象');
  ['runId', 'runShortHash', 'systemId', 'label', 'role', 'createdAt', 'status', 'config', 'configHash',
    'modelHash', 'engineVersion', 'signals', 'timeseries', 'events', 'snapshots', 'metrics', 'quality',
    'causal', 'truth'].forEach((k) => {
    ok(Object.prototype.hasOwnProperty.call(run, k), label + '：run 含字段 ' + k, '缺少 ' + k);
  });
  eq(run.systemId, systemId, label + '：systemId');
  eq(run.status, 'completed', label + '：status');
  eq(run.engineVersion, '0.1.0', label + '：engineVersion');
  ok(hex64(run.configHash), label + '：configHash 为 sha256 hex', show(run.configHash));
  ok(hex64(run.modelHash), label + '：modelHash 为 sha256 hex', show(run.modelHash));
  eq(run.runShortHash, run.configHash.slice(0, 8), label + '：runShortHash = configHash 前 8 位');
  ok(['fault', 'baseline', 'contrast', 'arena'].indexOf(run.role) !== -1, label + '：role 合法', show(run.role));
  ok(typeof run.createdAt === 'string' && run.createdAt.length >= 19, label + '：createdAt 字符串');

  const ts = run.timeseries;
  notNull(ts, label + '：timeseries');
  eq(ts.t.length, 601, label + '：601 个采样点');
  close(ts.t[0], 0, 1e-9, label + '：t[0]=0');
  close(ts.t[600], 60, 1e-9, label + '：t[600]=60');
  close(ts.t[600] - ts.t[599], 0.1, 1e-9, label + '：末步长 0.1 s');

  const sigIds = run.signals.map((s) => s.id);
  eq(new Set(sigIds).size, sigIds.length, label + '：信号 id 不重复');
  sigIds.forEach((id) => {
    const arr = ts.signals[id];
    ok(Array.isArray(arr), label + '：序列存在 ' + id);
    if (Array.isArray(arr)) {
      eq(arr.length, 601, label + '：序列 601 点 ' + id);
      let bad = 0;
      for (let i = 0; i < arr.length; i++) {
        const v = arr[i];
        if (v !== null && !(typeof v === 'number' && isFinite(v))) bad++;
      }
      eq(bad, 0, label + '：序列无 NaN/Inf（null 仅用于可选限值信号）' + id);
    }
  });
  eq(Object.keys(ts.signals).length, run.signals.length, label + '：序列数量与信号元数据一致');

  /* 信号元数据完整性（Lead 硬性要求） */
  run.signals.forEach((sg) => {
    ['id', 'label', 'shortLabel', 'unit', 'category', 'sourceKind', 'definition', 'formula',
      'precision', 'blindVisible', 'tableOnly'].forEach((k) => {
      ok(Object.prototype.hasOwnProperty.call(sg, k), label + '：信号 ' + sg.id + ' 含字段 ' + k, '缺少 ' + k);
    });
    ok(!!sg.chart && typeof sg.chart === 'object', label + '：信号 ' + sg.id + ' 含 chart');
    if (sg.chart) {
      ['style', 'colorToken', 'axis', 'step', 'defaultVisible'].forEach((k) => {
        ok(Object.prototype.hasOwnProperty.call(sg.chart, k), label + '：chart 含 ' + k + '（' + sg.id + '）');
      });
      ok(['solid', 'dashed', 'dashdot', 'dotted'].indexOf(sg.chart.style) !== -1, label + '：chart.style 合法（' + sg.id + '）', show(sg.chart.style));
      ok(['acc', 'obs', 'warm', 'fault', 'ink', 'ok'].indexOf(sg.chart.colorToken) !== -1, label + '：chart.colorToken 合法（' + sg.id + '）', show(sg.chart.colorToken));
      ok(sg.chart.axis === 'left' || sg.chart.axis === 'right', label + '：chart.axis 合法（' + sg.id + '）');
    }
    ok(['CONFIG', 'MODEL_STATE', 'OBSERVATION', 'CONTROLLER', 'FAULT_EVENT', 'DERIVED', 'MODEL_ASSUMPTION']
      .indexOf(sg.sourceKind) !== -1, label + '：sourceKind 合法（' + sg.id + '）', show(sg.sourceKind));
  });

  /* metrics 必含项 */
  const requiredMetrics = ['E_load_kWh', 'E_load_served_kWh', 'E_source_kWh', 'E_bat_kWh',
    'SOC_true_end_pct', 'SOC_est_end_pct', 'SOC_err_pp', 'max_abs_r_true_kW', 'max_abs_r_meas_kW',
    'fault_active_s', 'fault_duration_s', 'fault_peak_magnitude', 'effective_mode', 'focal_change'];
  const metricIds = run.metrics.map((m) => m.metric_id);
  requiredMetrics.forEach((id) => {
    ok(metricIds.indexOf(id) !== -1, label + '：metrics 含 ' + id);
  });
  run.metrics.forEach((m) => {
    ['metric_id', 'label', 'value', 'unit', 'precision', 'time_window', 'method', 'source_run_ids',
      'source_kind', 'focal', 'unavailable'].forEach((k) => {
      ok(Object.prototype.hasOwnProperty.call(m, k), label + '：metric ' + m.metric_id + ' 含字段 ' + k);
    });
    if (m.unavailable) ok(m.value === null, label + '：unavailable 指标 value 必须为 null（' + m.metric_id + '）');
    if (!m.unavailable && typeof m.value === 'number') ok(isFinite(m.value), label + '：metric 数值有限（' + m.metric_id + '）');
  });
  const focal = core.getMetric(run, 'focal_change');
  ok(!!focal && typeof focal.signal_id === 'string', label + '：focal_change 附 signal_id');
  ok(!!focal && typeof focal.unit === 'string', label + '：focal_change 附 unit');

  /* quality 必含项 */
  const requiredChecks = ['sampling', 'conservation-true', 'conservation-meas', 'units', 'soc-bounds',
    'event-window', 'energy-balance'];
  const checkIds = run.quality.map((c) => c.check_id);
  requiredChecks.forEach((id) => ok(checkIds.indexOf(id) !== -1, label + '：quality 含 ' + id));
  run.quality.forEach((q) => {
    ok(['pass', 'warn', 'fail'].indexOf(q.status) !== -1, label + '：quality.status 合法（' + q.check_id + '）', show(q.status));
    ok(Object.prototype.hasOwnProperty.call(q, 'tolerance'), label + '：quality 含 tolerance（' + q.check_id + '）');
    ok(Object.prototype.hasOwnProperty.call(q, 'computed_value'), label + '：quality 含 computed_value（' + q.check_id + '）');
    ok(typeof q.message === 'string' && q.message.length > 0, label + '：quality.message 非空（' + q.check_id + '）');
  });
  eq(qfail(run).length, 0, label + '：quality 无 fail（守恒/边界检查全部通过）');

  /* truth */
  ['faultFamily', 'faultId', 'faultActiveFrom_s', 'faultDuration_s', 'peakMagnitude', 'unit',
    'effectiveFeedbackMode', 'affectedComponent'].forEach((k) => {
    ok(Object.prototype.hasOwnProperty.call(run.truth, k), label + '：truth 含 ' + k);
  });
}

/* ================================================================== */
/* 0. SHA-256 / canonicalize / RNG                                    */
/* ================================================================== */
eq(core.sha256(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'SHA-256 空字符串向量');
eq(core.sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'SHA-256 "abc" 向量');
eq(core.sha256('中文 UTF-8'), core.sha256('中文 UTF-8'), 'SHA-256 中文输入确定性');
eq(core.canonicalize({ b: 2, a: 1 }), '{"a":1,"b":2}', 'canonicalize 对象 key 排序');
eq(core.canonicalize([2, 1]), '[2,1]', 'canonicalize 数组保序');
eq(core.hashObject({ b: [2, 3], a: 1 }), core.hashObject({ a: 1, b: [2, 3] }), 'hashObject 与 key 顺序无关');

const rand1 = FL.rng.mulberry32(12345);
const rand2 = FL.rng.mulberry32(12345);
eq(rand1(), rand2(), 'rng 同 seed 首值一致');
eq(rand1(), rand2(), 'rng 同 seed 第二值一致');
ok(FL.rng.mulberry32(1)() !== FL.rng.mulberry32(2)(), 'rng 不同 seed 序列不同');
ok(typeof FL.rng.hashSeed('abc') === 'number', 'rng.hashSeed 返回数字');
eq(FL.rng.hashSeed('abc'), FL.rng.hashSeed('abc'), 'rng.hashSeed 确定性');
eq(FL.rng.noiseAt(7, 'I_bat_meas_A', 200), FL.rng.noiseAt(7, 'I_bat_meas_A', 200), 'rng.noiseAt 确定性');
eq(FL.rng.gauss(FL.rng.mulberry32(5)), FL.rng.gauss(FL.rng.mulberry32(5)), 'rng.gauss 确定性');

/* ================================================================== */
/* 1. SystemDef 元数据完整性                                           */
/* ================================================================== */
const sysList = systems.list();
eq(sysList.length, 3, 'systems.list 返回三个系统');
eq(sysList.map((s) => s.id).join(','), 'FL-001,FC-001,GT-001', 'systems.list 顺序稳定');
sysList.forEach((item) => {
  ok(item.experimentCode && item.title && item.shortTitle && item.tagline && item.level, 'systems.list 字段齐备（' + item.id + '）');
  eq(item.available, true, 'systems.list available（' + item.id + '）');
  eq(item.defaultFaultFamily, 'sensor_drift', 'systems.list defaultFaultFamily（' + item.id + '）');
});

['FL-001', 'FC-001', 'GT-001'].forEach((id) => {
  const s = systems.get(id);
  eq(s.id, id, id + '：get 返回正确系统');
  ok(s.experimentCode === id, id + '：experimentCode = id');
  eq(s.duration_s, 60, id + '：duration_s=60');
  eq(s.dt_s, 0.1, id + '：dt_s=0.1');
  ok(s.questions.length === 3, id + '：三个引导问题');
  ok(typeof s.summary === 'string' && s.summary.length > 10, id + '：summary');
  ok(Array.isArray(s.topologyViewBox) && s.topologyViewBox.length === 4, id + '：topologyViewBox');
  ok(s.components.length >= 6, id + '：components 数量 ≥ 6');
  ok(s.edges.length >= 6, id + '：edges 数量 ≥ 6');
  ok(s.signals.length >= 10, id + '：signals 数量 ≥ 10');
  eq(s.faults.length, 3, id + '：三个故障家族');
  eq(s.faults.map((f) => f.family).sort().join(','), 'actuator_fault,load_step,sensor_drift', id + '：故障家族覆盖');
  eq(s.signals.map((sg) => sg.id).join(','), systems.get(id).signals.map((sg) => sg.id).join(','), id + '：signals 顺序稳定');
  eq(typeof s.model.model_id, 'string', id + '：model_id');
  eq(typeof s.model.model_version, 'string', id + '：model_version');
  ok(s.model.assumptions.length >= 3, id + '：model.assumptions');
  ok(s.model.equations.length >= 3, id + '：model.equations');
  ok(s.model.limitations.length >= 2, id + '：model.limitations');

  /* 组件坐标在 topologyViewBox 内 */
  s.components.forEach((c) => {
    const vb = s.topologyViewBox;
    ok(c.x >= vb[0] && c.y >= vb[1] && c.x + c.w <= vb[0] + vb[2] && c.y + c.h <= vb[1] + vb[3],
      id + '：组件 ' + c.id + ' 坐标在 topologyViewBox 内', JSON.stringify({ x: c.x, y: c.y, w: c.w, h: c.h }));
    ok(typeof c.label === 'string' && typeof c.kind === 'string', id + '：组件 ' + c.id + ' 元数据');
    ok(Array.isArray(c.inspector), id + '：组件 ' + c.id + ' 有 inspector');
    c.inspector.forEach((it) => {
      ok(!!systems.signalMap(id)[it.id], id + '：inspector 引用存在的信号 ' + it.id);
    });
  });
  /* 边引用存在的组件 */
  const compIds = s.components.map((c) => c.id);
  s.edges.forEach((e) => {
    ok(compIds.indexOf(e.from) !== -1 && compIds.indexOf(e.to) !== -1, id + '：边引用存在的组件 ' + e.id);
    ok(['power', 'signal', 'measurement'].indexOf(e.kind) !== -1, id + '：边 kind 合法 ' + e.id);
  });
  /* 故障锚点存在 */
  Object.keys(s.faultAnchors).forEach((fam) => {
    ok(compIds.indexOf(s.faultAnchors[fam]) !== -1, id + '：faultAnchors.' + fam + ' 指向存在的组件');
  });
  /* 故障参数 */
  s.faults.forEach((f) => {
    ok(['sensor_drift', 'load_step', 'actuator_fault'].indexOf(f.family) !== -1, id + '：fault.family 合法');
    ok(f.params.length >= 1, id + '：fault ' + f.id + ' 有参数');
    f.params.forEach((p) => {
      ok(p.default >= p.min && p.default <= p.max, id + '：fault ' + f.id + ' 参数默认值在范围');
      ok(typeof p.unit === 'string' && p.unit.length > 0, id + '：fault 参数含单位');
    });
    ok(f.defaultTime_s >= f.timeRange[0] && f.defaultTime_s <= f.timeRange[1], id + '：fault 默认时刻在 timeRange');
    ok(typeof f.causalTemplateId === 'string' && f.causalTemplateId.length > 0, id + '：causalTemplateId');
  });
  /* 信号分类引用 */
  const catIds = s.signalCategories.map((c) => c.id);
  s.signals.forEach((sg) => {
    ok(catIds.indexOf(sg.category) !== -1, id + '：信号 ' + sg.id + ' 的 category 存在');
    ok(typeof sg.precision === 'number' && sg.precision >= 0, id + '：信号 precision（' + sg.id + '）');
  });
  /* 因果模板 */
  const tpl = systems.causalTemplate(id, 'sensor_drift');
  notNull(tpl, id + '：causalTemplate(sensor_drift)');
  if (tpl) ok(tpl.nodes.length >= 5, id + '：sensor_drift 因果模板节点 ≥5');
  eq(systems.causalTemplate(id, 'none'), null, id + '：causalTemplate(none) 为 null');
  eq(systems.validateDraft(core.createConfig(id)).ok, true, id + '：validateDraft 默认配置通过');
});

/* FL-001 必含信号集合（契约 §5.1 表） */
const FL_REQUIRED_SIGNALS = ['I_bat_true_A', 'I_bat_meas_A', 'I_ref_A', 'bias_A', 'I_bat_cap_A',
  'P_bat_true_kW', 'P_bat_meas_kW', 'P_gen_true_kW', 'P_gen_meas_kW', 'P_load_demand_kW',
  'P_load_served_kW', 'V_bus_V', 'SOC_true_pct', 'SOC_est_pct', 'r_true_kW', 'r_meas_kW'];
const flSignalIds = systems.get('FL-001').signals.map((s) => s.id);
eq(flSignalIds.slice().sort().join(','), FL_REQUIRED_SIGNALS.slice().sort().join(','), 'FL-001 必含信号集合（16 个）');
eq(systems.signalMap('FL-001').I_bat_meas_A.blindVisible, true, 'FL-001 I_bat_meas_A blindVisible');
eq(systems.signalMap('FL-001').I_bat_true_A.chart.style, 'solid', 'FL-001 I_true 为实线');
eq(systems.signalMap('FL-001').I_bat_meas_A.chart.style, 'dashed', 'FL-001 I_meas 为虚线');
eq(systems.signalMap('FL-001').I_ref_A.chart.style, 'dashdot', 'FL-001 I_ref 为点划线');
eq(systems.signalMap('FL-001').V_bus_V.tableOnly, true, 'FL-001 V_bus tableOnly');

/* FC-001 新增 EMS 估算信号 + GT 双通道语义（Lead 裁决） */
const fcSignals = systems.signalMap('FC-001');
eq(fcSignals.P_bat_est_kW.sourceKind, 'DERIVED', 'FC-001 P_bat_est_kW 为 DERIVED');
eq(fcSignals.P_bat_est_kW.blindVisible, true, 'FC-001 P_bat_est_kW blindVisible');
ok(fcSignals.P_bat_est_kW.definition.indexOf('EMS') !== -1 || fcSignals.P_bat_est_kW.definition.indexOf('平衡') !== -1, 'FC-001 P_bat_est 定义说明为 EMS 平衡估算');
ok(systems.get('FC-001').model.assumptions.some((a) => a.id === 'A-fc-soc-est'), 'FC-001 含 model.assumption A-fc-soc-est');

const gtSignals = systems.signalMap('GT-001');
eq(gtSignals.f_meas_Hz.sourceKind, 'OBSERVATION', 'GT-001 f_meas_Hz 为 OBSERVATION');
ok(gtSignals.f_meas_Hz.definition.indexOf('健康') !== -1, 'GT-001 f_meas_Hz 定义为健康通道');
ok(gtSignals.n_meas_rpm.formula.indexOf('b(t)') !== -1, 'GT-001 n_meas_rpm 公式含故障偏置 b(t)');
ok(gtSignals.r_meas_kW.formula.indexOf('P_rotor') !== -1, 'GT-001 r_meas 扣除转子项');

/* 便捷 API */
eq(systems.fault('FL-001', 'load_step').family, 'load_step', 'systems.fault 按家族查询');
eq(systems.fault('FL-001', 'nope'), null, 'systems.fault 未知家族返回 null');
eq(systems.component('FL-001', 'sensor').id, 'sensor', 'systems.component 查询');
eq(systems.component('FL-001', 'nope'), null, 'systems.component 未知返回 null');

/* ================================================================== */
/* 2. FL-001 基准：契约 §5.1 精确数值表（容差 1e-6）                     */
/* ================================================================== */
const flDefault = makeRun('FL-001');
assertRunShape(flDefault, 'FL-001 默认闭环', 'FL-001');

eq(flDefault.role, 'fault', 'FL-001 默认 role=fault');
ok(flDefault.label.indexOf('闭环') !== -1 && flDefault.label.indexOf('+10 A') !== -1, 'FL-001 label 含闭环/+10 A', flDefault.label);
eq(flDefault.events.length, 1, 'FL-001 默认 1 个 onset 事件');
eq(flDefault.snapshots.length, 2, 'FL-001 默认 2 个快照');
eq(flDefault.truth.faultFamily, 'sensor_drift', 'FL-001 truth.faultFamily');
eq(flDefault.truth.faultId, 'I_bat_sensor_bias', 'FL-001 truth.faultId');
close(flDefault.truth.faultActiveFrom_s, 20, 0, 'FL-001 truth.faultActiveFrom_s=20');
close(flDefault.truth.faultDuration_s, 40, 1e-9, 'FL-001 truth.faultDuration_s=40');
close(flDefault.truth.peakMagnitude, 10, 1e-9, 'FL-001 truth.peakMagnitude=10');
eq(flDefault.truth.unit, 'A', 'FL-001 truth.unit=A');
eq(flDefault.truth.effectiveFeedbackMode, 'closed_loop', 'FL-001 truth.effectiveFeedbackMode');
eq(flDefault.truth.affectedComponent, 'sensor', 'FL-001 truth.affectedComponent=sensor');

const ev = flDefault.events[0];
eq(ev.event_id, 'EV-001', 'event_id=EV-001');
eq(ev.event_type, 'sensor_bias', 'FL-001 event_type=sensor_bias');
close(ev.trigger_s, 20, 1e-9, 'event trigger_s=20');
eq(ev.target_signal, 'bias_A', 'event target_signal=bias_A');
eq(ev.target_component, 'sensor', 'event target_component=sensor');
close(ev.magnitude, 10, 1e-9, 'event magnitude=10');
eq(ev.unit, 'A', 'event unit=A');
eq(ev.phase, 'onset', 'event phase=onset');
eq(ev.preSnapshotId, 'EV-001-pre', 'event preSnapshotId');
eq(ev.postSnapshotId, 'EV-001-post', 'event postSnapshotId');
eq(flDefault.snapshots[0].snapshotId, 'EV-001-pre', 'snapshot pre id');
eq(flDefault.snapshots[0].phase, 'pre', 'snapshot pre phase');
close(flDefault.snapshots[0].t_s, 19.9, 1e-9, 'snapshot pre t=19.9');
eq(flDefault.snapshots[1].phase, 'post', 'snapshot post phase');
close(flDefault.snapshots[1].t_s, 20, 1e-9, 'snapshot post t=20');

close(at(flDefault, 'I_bat_meas_A', 19.9), 25, 1e-6, '19.9 s I_meas=25 A');
close(at(flDefault, 'I_bat_meas_A', 20.0), 35, 1e-6, '20.0 s I_meas=35 A');
close(at(flDefault, 'I_bat_true_A', 20.0), 25, 1e-6, '20.0 s I_true=25 A（连续）');
close(at(flDefault, 'I_bat_true_A', 26), 15 + 10 * Math.exp(-4), 1e-6, '26 s I_true=15+10e^-4');
close(at(flDefault, 'I_bat_meas_A', 26), 25 + 10 * Math.exp(-4), 1e-6, '26 s I_meas=25+10e^-4');
/* 21.5 s 黄金点（Lead 指定）：I_true = 15 + 10e^(-1) = 18.6787944117 A */
const goldenI = 15 + 10 * Math.exp(-1);
close(at(flDefault, 'I_bat_true_A', 21.5), goldenI, 1e-6, '21.5 s I_true=18.6787944117 A');
close(at(flDefault, 'I_bat_meas_A', 21.5), goldenI + 10, 1e-6, '21.5 s I_meas=28.6787944117 A');
close(at(flDefault, 'P_bat_true_kW', 21.5), 0.4 * goldenI, 1e-6, '21.5 s P_bat,true=7.4715177647 kW');
close(at(flDefault, 'P_bat_meas_kW', 21.5), 0.4 * (goldenI + 10), 1e-6, '21.5 s P_bat,meas=11.4715177647 kW');
close(at(flDefault, 'I_bat_true_A', 60), 15 + 10 * Math.exp(-40 / 1.5), 1e-6, '60 s I_true=15+10e^-40/1.5');
close(at(flDefault, 'bias_A', 19.9), 0, 1e-9, '19.9 s bias=0');
close(at(flDefault, 'bias_A', 20.0), 10, 1e-9, '20.0 s bias=10');
close(at(flDefault, 'I_ref_A', 40), 25, 1e-9, 'I_ref 恒为 25 A');
close(flDefault.snapshots[0].variables.I_bat_meas_A, 25, 1e-9, 'pre 快照 I_meas=25');
close(flDefault.snapshots[1].variables.I_bat_meas_A, 35, 1e-9, 'post 快照 I_meas=35');
eq(at(flDefault, 'I_bat_cap_A', 30), null, '非执行器场景 I_bat_cap=null');

close(mval(flDefault, 'E_bat_kWh'), 446 / 3600, 1e-6, 'E_bat=0.1238889 kWh');
close(mval(flDefault, 'E_source_kWh'), 1354 / 3600, 1e-6, 'E_gen=0.3761111 kWh');
close(mval(flDefault, 'E_load_kWh'), 0.5, 1e-6, 'E_load=0.5 kWh');
close(mval(flDefault, 'E_load_served_kWh'), 0.5, 1e-6, 'E_load_served=0.5 kWh');
close(mval(flDefault, 'SOC_true_end_pct'), 60 - 446 / 144000 * 100, 1e-6, 'SOC_true=59.6902778 %');
close(mval(flDefault, 'SOC_est_end_pct'), 60 - 606 / 144000 * 100, 1e-6, 'SOC_est=59.5791667 %');
close(mval(flDefault, 'SOC_err_pp'), -160 / 144000 * 100, 1e-6, 'SOC_err=-0.1111111 pp');
ok(mval(flDefault, 'max_abs_r_true_kW') <= 1e-6, 'max|r_true| ≤ 1e-6', show(mval(flDefault, 'max_abs_r_true_kW')));
close(mval(flDefault, 'max_abs_r_meas_kW'), 4.0, 1e-6, 'max|r_meas|=4.0 kW');
close(mval(flDefault, 'fault_active_s'), 20, 0, 'fault_active_s=20');
close(mval(flDefault, 'fault_duration_s'), 40, 0, 'fault_duration_s=40');
close(mval(flDefault, 'fault_peak_magnitude'), 10, 0, 'fault_peak_magnitude=10');
eq(mval(flDefault, 'effective_mode'), 'closed_loop', 'effective_mode=closed_loop');
close(mval(flDefault, 'focal_change'), -10, 1e-6, 'focal_change=-10 A');
eq(core.getMetric(flDefault, 'focal_change').signal_id, 'I_bat_true_A', 'focal_change.signal_id=I_bat_true_A');
eq(core.getMetric(flDefault, 'focal_change').unit, 'A', 'focal_change.unit=A');
close(at(flDefault, 'r_meas_kW', 30), 4, 1e-9, '故障期 r_meas(30)=4 kW');
close(at(flDefault, 'r_true_kW', 30), 0, 1e-9, '故障期 r_true(30)=0');
close(at(flDefault, 'P_bat_meas_kW', 20.0), 14, 1e-9, '故障瞬间 P_bat,meas(20.0)=14 kW');
close(at(flDefault, 'P_bat_true_kW', 20.0), 10, 1e-9, '故障瞬间 P_bat,true(20.0)=10 kW');
close(at(flDefault, 'P_gen_true_kW', 20.0), 20, 1e-9, '故障瞬间 P_gen,true(20.0)=20 kW');
close(at(flDefault, 'I_bat_meas_A', 30), 25 + 10 * Math.exp(-10 / 1.5), 1e-6, '30 s I_meas=25+10e^-6.667');
close(at(flDefault, 'P_bat_meas_kW', 30), 0.4 * (25 + 10 * Math.exp(-10 / 1.5)), 1e-6, '30 s P_bat,meas 按解析式');
close(at(flDefault, 'P_bat_true_kW', 30), 0.4 * (15 + 10 * Math.exp(-10 / 1.5)), 1e-6, '30 s P_bat,true 按解析式');
close(at(flDefault, 'P_gen_true_kW', 30), 30 - 0.4 * (15 + 10 * Math.exp(-10 / 1.5)), 1e-6, '30 s P_gen,true 按解析式');

/* 因果链六节点（规格 §6.1） */
const flCausal = flDefault.causal;
eq(flCausal.focusEventId, 'EV-001', 'FL causal.focusEventId=EV-001');
eq(flCausal.nodes.length, 6, 'FL-001 默认因果链恰好六节点');
eq(flCausal.nodes.map((n) => n.id).join(','), 'n1,n2,n3,n4,n5,n6', 'FL 因果节点 id 顺序');
eq(flCausal.nodes.map((n) => n.order).join(','), '1,2,3,4,5,6', 'FL 因果节点 order');
eq(flCausal.nodes[0].layer, 'config', 'FL 因果首节点 layer=config');
eq(flCausal.nodes[2].layer, 'mechanism', 'FL 因果第 3 节点 layer=mechanism');
ok(flCausal.edges.length === 5, 'FL 因果 5 条边');
ok(flCausal.headline.indexOf('20.0') !== -1, 'FL causal.headline 含 20.0', flCausal.headline);
ok(flCausal.mechanismSummary.indexOf('偏置') !== -1, 'FL causal.mechanismSummary 含机制');
ok(flCausal.assumptions.length >= 2, 'FL causal.assumptions 非空');
ok(flCausal.limitations.length >= 2, 'FL causal.limitations 非空');
ok(flCausal.alternatives.length >= 1 && flCausal.alternatives[0].title.indexOf('仅监测') !== -1, 'FL causal.alternatives 含仅监测对照');
ok(!!flCausal.monitorContrast && typeof flCausal.monitorContrast.description === 'string', 'FL causal.monitorContrast 描述');
eq(flCausal.nodes[5].componentId, 'bus', 'FL 因果末节点位于母线');
ok(flCausal.nodes[5].detail.indexOf('不是') !== -1 && flCausal.nodes[5].detail.indexOf('残差') !== -1, 'FL 因果末节点明确 +4kW 是测量残差不是能量损失');
const compIdSet = systems.get('FL-001').components.map((c) => c.id);
const sigIdSet = systems.get('FL-001').signals.map((s) => s.id);
flCausal.nodes.forEach((node) => {
  ok(['config', 'mechanism', 'observation'].indexOf(node.layer) !== -1, 'FL 因果节点 layer 合法（' + node.id + '）', show(node.layer));
  ok(compIdSet.indexOf(node.componentId) !== -1, 'FL 因果节点 componentId 存在（' + node.id + '）');
  ok(Array.isArray(node.signalIds) && node.signalIds.length > 0, 'FL 因果节点含 signalIds（' + node.id + '）');
  node.signalIds.forEach((sid) => ok(sigIdSet.indexOf(sid) !== -1, 'FL 因果节点引用存在的信号 ' + sid));
  ok(typeof node.detail === 'string' && node.detail.length > 10, 'FL 因果节点 detail 非空（' + node.id + '）');
  ok(Array.isArray(node.evidence) && node.evidence.length > 0, 'FL 因果节点含证据（' + node.id + '）');
  node.evidence.forEach((e) => {
    eq(e.runId, 'Run-TEST', 'FL 证据 runId（' + node.id + '）');
    ok(typeof e.varId === 'string' && sigIdSet.indexOf(e.varId) !== -1, 'FL 证据 varId 存在（' + node.id + '）');
    ok(typeof e.t0 === 'number' && e.t0 >= 0 && e.t0 <= 60, 'FL 证据 t0 在时间轴（' + node.id + '）');
    ok(typeof e.t1 === 'number' && e.t1 >= 0 && e.t1 <= 60, 'FL 证据 t1 在时间轴（' + node.id + '）');
    ok(typeof e.note === 'string' && e.note.length > 5, 'FL 证据 note 非空（' + node.id + '）');
  });
});
flCausal.edges.forEach((edge) => {
  ok(flCausal.nodes.some((n) => n.id === edge.from) && flCausal.nodes.some((n) => n.id === edge.to), 'FL 因果边引用存在的节点');
  ok(typeof edge.label === 'string' && edge.label.length > 0, 'FL 因果边有 label');
});
/* 因果占位符全部被替换 */
ok(flCausal.nodes.every((n) => n.detail.indexOf('{') === -1), 'FL 因果 detail 无未替换占位符');
ok(flCausal.nodes.every((n) => n.short.indexOf('{') === -1), 'FL 因果 short 无未替换占位符');

/* ================================================================== */
/* 3. FL-001 无故障基准 / 仅监测                                        */
/* ================================================================== */
const flHealthy = makeRun('FL-001', { fault: { family: 'none' } });
assertRunShape(flHealthy, 'FL-001 基准', 'FL-001');
eq(flHealthy.role, 'baseline', 'FL-001 基准 role=baseline');
eq(flHealthy.events.length, 0, '健康运行无事件');
eq(flHealthy.snapshots.length, 0, '健康运行无快照');
eq(flHealthy.causal.nodes.length, 0, '健康运行 causal.nodes 为空');
eq(flHealthy.causal.focusEventId, null, '健康运行 causal.focusEventId=null');
eq(flHealthy.truth.faultFamily, 'none', '健康运行 truth.faultFamily=none');
eq(flHealthy.truth.effectiveFeedbackMode, 'healthy', '健康运行 effectiveFeedbackMode=healthy');
close(mval(flHealthy, 'E_bat_kWh'), 0.1666666667, 1e-6, '基准 E_bat=0.1666667');
close(mval(flHealthy, 'E_source_kWh'), 0.3333333333, 1e-6, '基准 E_gen=0.3333333');
close(mval(flHealthy, 'SOC_true_end_pct'), 59.5833333, 1e-6, '基准 SOC_true=59.5833333');
close(mval(flHealthy, 'SOC_err_pp'), 0, 1e-9, '基准 SOC_err=0');
close(mval(flHealthy, 'max_abs_r_meas_kW'), 0, 1e-9, '基准 max|r_meas|=0');
eq(core.getMetric(flHealthy, 'focal_change').unavailable, true, '基准 focal_change 不可用（无故障）');
eq(core.getMetric(flHealthy, 'fault_active_s').unavailable, true, '基准 fault_active_s 不可用');
eq(core.getMetric(flHealthy, 'effective_mode').value, 'healthy', '基准 effective_mode=healthy');

const flMonitor = makeRun('FL-001', { feedback_mode: 'monitor' });
assertRunShape(flMonitor, 'FL-001 仅监测', 'FL-001');
eq(flMonitor.role, 'contrast', 'FL-001 monitor role=contrast');
eq(flMonitor.truth.effectiveFeedbackMode, 'monitor', 'FL monitor truth.effectiveFeedbackMode');
['20', '30', '45', '60'].forEach((tStr) => {
  const t = Number(tStr);
  close(at(flMonitor, 'I_bat_true_A', t), 25, 1e-9, 'monitor 模式 I_true(' + t + 's)=25 A');
});
close(at(flMonitor, 'I_bat_meas_A', 19.9), 25, 1e-9, 'monitor I_meas(19.9)=25');
close(at(flMonitor, 'I_bat_meas_A', 20.0), 35, 1e-9, 'monitor I_meas(20.0)=35');
close(at(flMonitor, 'I_bat_meas_A', 30), 35, 1e-9, 'monitor I_meas(30)=35');
close(mval(flMonitor, 'E_bat_kWh'), 0.1666666667, 1e-6, 'monitor E_bat=0.1666667');
close(mval(flMonitor, 'SOC_true_end_pct'), 59.5833333, 1e-6, 'monitor SOC_true=59.5833333');
close(mval(flMonitor, 'SOC_est_end_pct'), 59.4722222, 1e-6, 'monitor SOC_est=59.4722222');
close(mval(flMonitor, 'SOC_err_pp'), -0.1111111, 1e-6, 'monitor SOC_err=-0.1111111');
close(mval(flMonitor, 'focal_change'), 0, 1e-9, 'monitor focal_change=0（真实电流不变）');
eq(flMonitor.causal.nodes.length, 5, 'monitor 因果链 5 节点（无反馈回路节点）');
ok(flMonitor.causal.nodes.every((n) => n.title.indexOf('真实电池放电下降') === -1), 'monitor 因果链不伪造"真实放电下降"');
ok(flMonitor.causal.nodes.some((n) => n.layer === 'mechanism'), 'monitor 因果链含 mechanism 层');
eq(flMonitor.causal.monitorContrast.description.indexOf('仅监测') !== -1, true, 'monitor monitorContrast 描述含仅监测');

/* ================================================================== */
/* 4. FL-001 扩展场景：load_step / actuator_fault                       */
/* ================================================================== */
const flLoad = makeRun('FL-001', { fault: { family: 'load_step' } });
assertRunShape(flLoad, 'FL-001 load_step', 'FL-001');
eq(flLoad.events.length, 1, 'load_step 1 个事件');
eq(flLoad.events[0].event_type, 'load_step', 'load_step event_type');
eq(flLoad.events[0].target_signal, 'P_load_demand_kW', 'load_step target_signal');
eq(flLoad.events[0].target_component, 'load', 'load_step target_component');
close(at(flLoad, 'P_load_demand_kW', 19.9), 30, 1e-9, 'load_step 前需求 30 kW');
close(at(flLoad, 'P_load_demand_kW', 20.0), 40, 1e-9, 'load_step 后需求 40 kW');
close(at(flLoad, 'P_load_served_kW', 30), 40, 1e-9, 'load_step 服务功率=需求');
close(at(flLoad, 'P_gen_true_kW', 60), 30, 1e-3, 'load_step P_gen 60s→30 kW');
let iPeak = -Infinity;
for (let t = 20; t <= 60.0001; t += 0.1) iPeak = Math.max(iPeak, at(flLoad, 'I_bat_true_A', t));
close(iPeak, 50, 0.05, 'load_step 电池电流峰值约 50 A');
close(at(flLoad, 'I_bat_true_A', 60), 25, 1e-3, 'load_step 60s 电流回落 25 A');
close(at(flLoad, 'I_bat_true_A', 20), 50, 1e-6, 'load_step 20.0s 电流阶跃到 50 A');
close(mval(flLoad, 'E_load_kWh'), 2200 / 3600, 1e-6, 'load_step E_load=0.6111111 kWh');
close(mval(flLoad, 'E_bat_kWh') + mval(flLoad, 'E_source_kWh'), 2200 / 3600, 1e-6, 'load_step 电能守恒');
ok(mval(flLoad, 'max_abs_r_true_kW') <= 1e-6, 'load_step 真实守恒 ≤1e-6');
eq(flLoad.causal.nodes.length, 5, 'load_step 因果链 5 节点');

const flAct = makeRun('FL-001', { fault: { family: 'actuator_fault' } });
assertRunShape(flAct, 'FL-001 actuator_fault', 'FL-001');
eq(flAct.events[0].event_type, 'actuator_limit', 'actuator event_type');
eq(flAct.events[0].target_component, 'converter', 'actuator target_component=converter');
eq(at(flAct, 'I_bat_cap_A', 19.9), null, 'actuator 前 I_cap=null');
close(at(flAct, 'I_bat_cap_A', 30), 13.75, 1e-9, 'actuator I_cap=13.75 A');
close(at(flAct, 'I_bat_true_A', 60), 13.75, 1e-6, 'actuator I_true 60s→13.75 A');
close(at(flAct, 'I_ref_A', 60), 25, 1e-9, 'actuator I_ref 保持 25 A');
close(at(flAct, 'P_gen_true_kW', 60), 24.5, 1e-6, 'actuator P_gen 60s→24.5 kW');
close(at(flAct, 'P_bat_true_kW', 60), 5.5, 1e-6, 'actuator P_bat 60s→5.5 kW');
ok(mval(flAct, 'max_abs_r_meas_kW') <= 1e-6, 'actuator r_meas≈0（测量本身一致）');
close(mval(flAct, 'focal_change'), -11.25, 1e-3, 'actuator focal_change=-11.25 A');
eq(flAct.causal.nodes.length, 5, 'actuator 因果链 5 节点');

/* ================================================================== */
/* 5. FC-001 验收（Lead 裁决：SOC_err = +0.11111 pp）                   */
/* ================================================================== */
const fcDefault = makeRun('FC-001');
assertRunShape(fcDefault, 'FC-001 默认', 'FC-001');
close(at(fcDefault, 'I_fc_true_A', 20), 50, 1e-6, 'FC I_fc(20)=50 A');
close(at(fcDefault, 'I_fc_true_A', 60), 40, 1e-3, 'FC I_fc 60s→40 A（τ=1.2）');
close(at(fcDefault, 'I_fc_meas_A', 20), 60, 1e-6, 'FC I_fc,meas(20)=60 A');
close(at(fcDefault, 'P_fc_true_kW', 60), 16, 1e-3, 'FC P_fc 60s→16 kW');
close(at(fcDefault, 'P_bat_true_kW', 60), 14, 1e-3, 'FC P_bat 60s→14 kW');
close(mval(fcDefault, 'E_load_kWh'), 0.5, 1e-6, 'FC E_load=0.5 kWh');
close(mval(fcDefault, 'E_source_kWh') + mval(fcDefault, 'E_bat_kWh'), 0.5, 1e-3, 'FC E_fc+E_bat=0.5 kWh');
ok(mval(fcDefault, 'max_abs_r_true_kW') <= 1e-6, 'FC r_true≈0');
close(mval(fcDefault, 'max_abs_r_meas_kW'), 4.0, 1e-6, 'FC r_meas=+4 kW');
close(mval(fcDefault, 'SOC_true_end_pct'), 60 - 755.2 / 144000 * 100, 1e-6, 'FC SOC_true_end=59.4755556 %');
close(mval(fcDefault, 'SOC_est_end_pct'), 60 - 595.2 / 144000 * 100, 1e-6, 'FC SOC_est_end=59.5866667 %');
close(mval(fcDefault, 'SOC_err_pp'), 160 / 144000 * 100, 1e-6, 'FC SOC_err=+0.11111 pp（正号）');
ok(mval(fcDefault, 'SOC_err_pp') > 0, 'FC SOC_err 为正号（Lead 裁决）');
close(at(fcDefault, 'P_bat_est_kW', 30), 10, 0.05, 'FC P_bat_est 故障期≈10 kW（小于真实 14）');
eq(fcDefault.causal.nodes.length, 6, 'FC 默认因果链 6 节点');
ok(fcDefault.causal.nodes.some((n) => n.signalIds.indexOf('P_bat_est_kW') !== -1), 'FC 因果链引用 P_bat_est_kW');
ok(fcDefault.causal.assumptions.some((a) => a.indexOf('A-fc-soc-est') !== -1), 'FC 因果链引用假设 A-fc-soc-est');

const fcMonitor = makeRun('FC-001', { feedback_mode: 'monitor' });
assertRunShape(fcMonitor, 'FC-001 monitor', 'FC-001');
['20', '30', '60'].forEach((t) => close(at(fcMonitor, 'I_fc_true_A', Number(t)), 50, 1e-9, 'FC monitor I_fc 恒 50（' + t + 's）'));
close(at(fcMonitor, 'I_fc_meas_A', 30), 60, 1e-9, 'FC monitor I_fc,meas(30)=60');
close(mval(fcMonitor, 'max_abs_r_meas_kW'), 4.0, 1e-6, 'FC monitor r_meas=+4');
close(mval(fcMonitor, 'SOC_err_pp'), 160 / 144000 * 100, 1e-6, 'FC monitor SOC_err=+0.11111');
eq(fcMonitor.causal.nodes.length, 5, 'FC monitor 因果链 5 节点');

const fcLoad = makeRun('FC-001', { fault: { family: 'load_step' } });
assertRunShape(fcLoad, 'FC-001 load_step', 'FC-001');
close(at(fcLoad, 'I_fc_true_A', 60), 75, 0.01, 'FC load_step I_fc 60s→75 A');
close(at(fcLoad, 'P_fc_true_kW', 60), 30, 0.01, 'FC load_step P_fc→30 kW');
close(at(fcLoad, 'P_bat_true_kW', 60), 10, 0.05, 'FC load_step P_bat 回落 10 kW');
close(mval(fcLoad, 'E_load_kWh') - mval(fcLoad, 'E_source_kWh') - mval(fcLoad, 'E_bat_kWh'), 0, 1e-3, 'FC load_step 电能守恒');
eq(fcLoad.causal.nodes.length, 5, 'FC load_step 因果链 5 节点');

const fcAct = makeRun('FC-001', { fault: { family: 'actuator_fault' } });
assertRunShape(fcAct, 'FC-001 actuator', 'FC-001');
close(at(fcAct, 'I_fc_true_A', 60), 27.5, 1e-3, 'FC actuator I_fc→27.5 A');
close(at(fcAct, 'I_fc_cap_A', 30), 27.5, 1e-9, 'FC actuator I_fc_cap=27.5 A');
close(at(fcAct, 'I_fc_ref_A', 60), 50, 1e-9, 'FC actuator I_fc_ref 保持 50 A');
close(at(fcAct, 'P_fc_true_kW', 60), 11, 1e-3, 'FC actuator P_fc→11 kW');
close(at(fcAct, 'P_bat_true_kW', 60), 19, 1e-3, 'FC actuator P_bat→19 kW');
close(at(fcAct, 'valve_cmd_pct', 30), 100, 1e-9, 'FC actuator valve_cmd=100%');
close(at(fcAct, 'valve_meas_pct', 30), 55, 1e-9, 'FC actuator valve_meas=55%');
close(at(fcAct, 'valve_meas_pct', 19.9), 100, 1e-9, 'FC actuator 故障前 valve_meas=100%');

/* ================================================================== */
/* 6. GT-001 验收（双通道频率测量）                                     */
/* ================================================================== */
const gtDefault = makeRun('GT-001');
assertRunShape(gtDefault, 'GT-001 默认', 'GT-001');
close(at(gtDefault, 'f_true_Hz', 60), 49.7, 0.05, 'GT f_true 稳态≈49.7 Hz');
eq(at(gtDefault, 'f_meas_Hz', 60), at(gtDefault, 'f_true_Hz', 60), 'GT f_meas_Hz = f_true（健康电气频率量测）');
close(at(gtDefault, 'n_meas_rpm', 60) / 60 - at(gtDefault, 'f_meas_Hz', 60), 0.3, 1e-9, 'GT n_meas/60 − f_meas = +0.3 Hz（冗余不一致）');
/* GT 慢极点说明：K_J=5.0 kW·s/Hz 与 Ki=2.0 kW/(Hz·s) 决定 τ≈9–12 s 的慢模态，
   t=60 s 时仍在向理论稳态（f=49.7 / P_gen=17.8 / P_bat=12.2 / n_meas=3000）收敛；
   实测 60 s 值 49.7055 / 17.93 / 12.07 / 3000.33 rpm 属验收范围（±0.6），
   不允许为凑稳态而改 K_J/Ki（会破坏 load_step "8–20 s 恢复" 的验收口径）。 */
between(at(gtDefault, 'n_meas_rpm', 60), 3000 - 0.6, 3000 + 0.6, 'GT n_meas 稳态≈3000 rpm（±0.6，慢极点未完全收敛）');
between(at(gtDefault, 'P_gen_true_kW', 60), 17.2, 18.4, 'GT P_gen 稳态≈17.8 kW（±0.6）');
between(at(gtDefault, 'P_bat_true_kW', 60), 11.6, 12.8, 'GT P_bat 稳态≈12.2 kW（±0.6）');
close(at(gtDefault, 'n_meas_rpm', 19.9), 3000, 1e-9, 'GT 故障前 n_meas=3000 rpm');
close(at(gtDefault, 'n_meas_rpm', 20.0), 3018, 1e-9, 'GT 20.0s n_meas=3018 rpm（+0.3Hz）');
close(at(gtDefault, 'P_load_demand_kW', 60), 30, 1e-9, 'GT 负载恒 30 kW');
ok(mval(gtDefault, 'max_abs_r_true_kW') <= 1e-3, 'GT 含转子项真实守恒 ≤1e-3');
ok(mval(gtDefault, 'max_abs_r_meas_kW') <= 1e-6, 'GT 功率测量一致（r_meas≈0）');
eq(gtDefault.causal.nodes.length, 6, 'GT 默认因果链 6 节点');
ok(gtDefault.causal.nodes.some((n) => n.signalIds.indexOf('n_meas_rpm') !== -1), 'GT 因果链引用转速通道');
ok(gtDefault.causal.nodes.some((n) => n.signalIds.indexOf('f_meas_Hz') !== -1), 'GT 因果链引用健康频率量测');
ok(gtDefault.causal.nodes.some((n) => n.detail.indexOf('冗余') !== -1), 'GT 因果链说明冗余交叉校验');

const gtMonitor = makeRun('GT-001', { feedback_mode: 'monitor' });
assertRunShape(gtMonitor, 'GT-001 monitor', 'GT-001');
['20', '40', '60'].forEach((t) => close(at(gtMonitor, 'f_true_Hz', Number(t)), 50, 1e-9, 'GT monitor f_true 恒 50（' + t + 's）'));
close(at(gtMonitor, 'n_meas_rpm', 60), 3018, 1e-9, 'GT monitor n_meas 仍偏置 3018 rpm');
close(at(gtMonitor, 'P_gen_true_kW', 60), 25, 1e-6, 'GT monitor P_gen 恒 25 kW');
close(at(gtMonitor, 'P_bat_true_kW', 60), 5, 1e-6, 'GT monitor P_bat 恒 5 kW');
eq(gtMonitor.causal.nodes.length, 4, 'GT monitor 因果链 4 节点');

const gtLoad = makeRun('GT-001', { fault: { family: 'load_step' } });
assertRunShape(gtLoad, 'GT-001 load_step', 'GT-001');
let fNadir = Infinity;
for (let t = 20; t <= 60.0001; t += 0.1) fNadir = Math.min(fNadir, at(gtLoad, 'f_true_Hz', t));
between(fNadir - 50, -0.6, -0.3, 'GT load_step 频率最低点 −0.3 ~ −0.6 Hz');
between(mval(gtLoad, 'f_recovery_s'), 8, 20, 'GT load_step 8–20 s 恢复 50 Hz');
between(at(gtLoad, 'P_gen_true_kW', 60), 34.5, 35.5, 'GT load_step P_gen 60s≈35 kW');
between(at(gtLoad, 'P_bat_true_kW', 60), 4.5, 5.5, 'GT load_step P_bat 60s≈5 kW');
close(at(gtLoad, 'P_load_demand_kW', 20), 40, 1e-9, 'GT load_step 需求阶跃到 40 kW');
ok(Math.abs(at(gtLoad, 'f_true_Hz', 60) - 50) < 0.05, 'GT load_step 60s 频率回到 50±0.05');
ok(mval(gtLoad, 'max_abs_r_true_kW') <= 1e-3, 'GT load_step 含转子项守恒');
eq(gtLoad.causal.nodes.length, 6, 'GT load_step 因果链 6 节点');

const gtAct = makeRun('GT-001', { fault: { family: 'actuator_fault' } });
assertRunShape(gtAct, 'GT-001 actuator', 'GT-001');
close(at(gtAct, 'P_gen_true_kW', 60), 20, 1e-6, 'GT actuator P_gen 钳位 20 kW');
between(at(gtAct, 'f_true_Hz', 60), 49.6, 49.9, 'GT actuator 频率稳态 49.6–49.9 Hz');
between(at(gtAct, 'P_bat_true_kW', 60), 9.5, 10.5, 'GT actuator 电池长期≈10 kW');
close(at(gtAct, 'P_gen_cap_kW', 30), 20, 1e-9, 'GT actuator P_gen_cap=20 kW');
eq(at(gtAct, 'P_gen_cap_kW', 19.9), null, 'GT actuator 故障前 P_gen_cap=null');
close(at(gtAct, 'valve_meas_pct', 60), 50, 1e-9, 'GT actuator valve_meas=50%');
close(at(gtAct, 'valve_cmd_pct', 60), 100, 1e-9, 'GT actuator valve_cmd 升到 100%');
ok(at(gtAct, 'valve_cmd_pct', 30) > at(gtAct, 'valve_cmd_pct', 20.1), 'GT actuator valve_cmd 持续上升');
ok(mval(gtAct, 'max_abs_r_true_kW') <= 1e-3, 'GT actuator 含转子项守恒');
eq(gtAct.causal.nodes.length, 5, 'GT actuator 因果链 5 节点');

/* ================================================================== */
/* 7. 三系统 × 全场景：无 NaN / SOC 边界 / quality 无 fail               */
/* ================================================================== */
const scenarioMatrix = [
  ['FL-001', 'default', {}],
  ['FL-001', 'healthy', { fault: { family: 'none' } }],
  ['FL-001', 'monitor', { feedback_mode: 'monitor' }],
  ['FL-001', 'load_step', { fault: { family: 'load_step' } }],
  ['FL-001', 'actuator', { fault: { family: 'actuator_fault' } }],
  ['FC-001', 'default', {}],
  ['FC-001', 'healthy', { fault: { family: 'none' } }],
  ['FC-001', 'monitor', { feedback_mode: 'monitor' }],
  ['FC-001', 'load_step', { fault: { family: 'load_step' } }],
  ['FC-001', 'actuator', { fault: { family: 'actuator_fault' } }],
  ['GT-001', 'default', {}],
  ['GT-001', 'healthy', { fault: { family: 'none' } }],
  ['GT-001', 'monitor', { feedback_mode: 'monitor' }],
  ['GT-001', 'load_step', { fault: { family: 'load_step' } }],
  ['GT-001', 'actuator', { fault: { family: 'actuator_fault' } }]
];
scenarioMatrix.forEach((entry) => {
  const run = makeRun(entry[0], entry[2]);
  const tag = entry[0] + ' / ' + entry[1];
  const s = run.timeseries.signals;
  Object.keys(s).forEach((id) => {
    let bad = 0;
    for (let i = 0; i < s[id].length; i++) {
      const v = s[id][i];
      if (v !== null && !(typeof v === 'number' && isFinite(v))) bad++;
    }
    eq(bad, 0, tag + '：无 NaN/Inf（' + id + '）');
  });
  const soc = [run.timeseries.signals.SOC_true_pct, run.timeseries.signals.SOC_est_pct];
  soc.forEach((arr, idx) => {
    let bad = 0;
    for (let i = 0; i < arr.length; i++) if (arr[i] !== null && (arr[i] < 0 || arr[i] > 100)) bad++;
    eq(bad, 0, tag + '：SOC 在 [0,100]（' + (idx === 0 ? 'true' : 'est') + '）');
  });
  eq(qfail(run).length, 0, tag + '：quality 无 fail');
  eq(run.snapshots.length, entry[2].fault && entry[2].fault.family === 'none' ? 0 : 2, tag + '：快照数量');
});

/* ================================================================== */
/* 8. 哈希确定性 / 不可变性                                            */
/* ================================================================== */
const runA = makeRun('FL-001');
const beforeTimeseries = JSON.stringify(runA.timeseries);
const beforeMetrics = JSON.stringify(runA.metrics);
const beforeConfig = JSON.stringify(runA.config);
const runB = makeRun('FL-001');
eq(runA.configHash, runB.configHash, '同配置两次运行 configHash 相同');
eq(runA.modelHash, runB.modelHash, '同配置两次运行 modelHash 相同');
eq(JSON.stringify(runA.timeseries), JSON.stringify(runB.timeseries), '同配置两次运行 timeseries 完全一致');
eq(JSON.stringify(runA.metrics), JSON.stringify(runB.metrics), '同配置两次运行 metrics 完全一致');
eq(JSON.stringify(runA.timeseries), beforeTimeseries, '二次运行不修改原 run.timeseries');
eq(JSON.stringify(runA.metrics), beforeMetrics, '二次运行不修改原 run.metrics');
eq(JSON.stringify(runA.config), beforeConfig, '二次运行不修改原 run.config');

const runMag12 = makeRun('FL-001', { fault: { params: { magnitude: 12 } } });
ok(runMag12.configHash !== runA.configHash, '改 magnitude 后 configHash 变化');
ok(runMag12.modelHash === runA.modelHash, '改故障参数不影响 modelHash');
close(mval(runMag12, 'focal_change'), -12, 1e-3, 'magnitude=12 时 focal_change=-12 A');

/* simulate 两次同配置返回的对象/数组不共享引用（不可变契约） */
const immA = makeRun('FL-001');
const immB = makeRun('FL-001');
ok(immA !== immB, '两次 simulate 返回不同 run 对象');
ok(immA.timeseries !== immB.timeseries, '两次 simulate timeseries 不共享引用');
ok(immA.timeseries.signals.I_bat_true_A !== immB.timeseries.signals.I_bat_true_A,
  '两次 simulate 信号数组不共享引用');
ok(immA.config !== immB.config, '两次 simulate config 对象不共享引用');
const immOriginal = immB.timeseries.signals.I_bat_true_A[10];
immA.timeseries.signals.I_bat_true_A[10] = 999999;
eq(immB.timeseries.signals.I_bat_true_A[10], immOriginal, '修改一次 run 的序列不影响另一次 run');
eq(immA.timeseries.signals.I_bat_true_A[10], 999999, '（自检）被修改的 run 确实变化（上一条断言有效）');

/* config 输入不被 mutate，且 run.config / run.timeseries 与输入不共享引用 */
const inputCfg = core.createConfig('FL-001');
const inputJsonBefore = JSON.stringify(inputCfg);
const runFromInput = core.simulate(inputCfg, { runId: 'Run-IMM' });
eq(JSON.stringify(inputCfg), inputJsonBefore, 'simulate 不修改传入的 config');
ok(runFromInput.config !== inputCfg, 'run.config 是深拷贝（不共享引用）');
inputCfg.initial.load_kW = 44;
close(runFromInput.config.initial.load_kW, 30, 0, '修改输入 config 不影响已生成 run');
eq(JSON.stringify(inputCfg) === inputJsonBefore, false, '（自检）输入 config 确实被改动（上一条断言有效）');

const runMonitorA = makeRun('FL-001', { feedback_mode: 'monitor' });
ok(runMonitorA.configHash !== runA.configHash, 'monitor 模式 configHash 与闭环不同');

const flManifest1 = core.modelManifest('FL-001');
const flManifest2 = core.modelManifest('FL-001');
eq(flManifest1.model_hash, flManifest2.model_hash, 'modelManifest 哈希稳定');
eq(flManifest1.model_hash, runA.modelHash, 'run.modelHash = modelManifest.model_hash');
ok(core.modelManifest('FC-001').model_hash !== flManifest1.model_hash, '不同系统 modelHash 不同');
ok(Array.isArray(flManifest1.assumptions) && flManifest1.assumptions.length > 0, 'manifest.assumptions');
ok(Array.isArray(flManifest1.equations) && flManifest1.equations.length > 0, 'manifest.equations');
ok(!!flManifest1.units && flManifest1.units.power === 'kW', 'manifest.units 含功率单位');

/* ================================================================== */
/* 9. 观测噪声（确定性、只加在 OBSERVATION）                             */
/* ================================================================== */
const noisyCfg = { noise: { enabled: true, seed: 20261027, level: 1 } };
const noisy1 = makeRun('FL-001', noisyCfg);
const noisy2 = makeRun('FL-001', noisyCfg);
eq(JSON.stringify(noisy1.timeseries.signals), JSON.stringify(noisy2.timeseries.signals), '噪声开启时序列确定（同 seed 同结果）');
eq(noisy1.configHash, noisy2.configHash, '噪声开启 configHash 确定');
ok(noisy1.configHash !== runA.configHash, '噪声开启改变 configHash');
['I_bat_true_A', 'P_bat_true_kW', 'P_gen_true_kW', 'SOC_true_pct'].forEach((id) => {
  eq(JSON.stringify(noisy1.timeseries.signals[id]), JSON.stringify(runA.timeseries.signals[id]),
    '噪声只加在观测通道：真值信号不变 ' + id);
});
ok(JSON.stringify(noisy1.timeseries.signals.I_bat_meas_A) !== JSON.stringify(runA.timeseries.signals.I_bat_meas_A),
  '噪声改变观测信号 I_bat_meas_A');
const noisySeed2 = makeRun('FL-001', { noise: { enabled: true, seed: 7, level: 1 } });
ok(JSON.stringify(noisySeed2.timeseries.signals.I_bat_meas_A) !== JSON.stringify(noisy1.timeseries.signals.I_bat_meas_A),
  '不同 seed 噪声序列不同');
/* 噪声信号仍无 NaN 且 quality 无 fail */
eq(qfail(noisy1).length, 0, '噪声运行 quality 无 fail');

/* ================================================================== */
/* 10. validateConfig / createConfig                                   */
/* ================================================================== */
const defaultFL = core.createConfig('FL-001');
eq(core.validateConfig(defaultFL).ok, true, 'defaultConfig(FL-001) 校验通过');
eq(defaultFL.fault.family, 'sensor_drift', 'defaultConfig fault.family');
eq(defaultFL.fault.faultId, 'I_bat_sensor_bias', 'defaultConfig faultId');
close(defaultFL.fault.t_start_s, 20, 0, 'defaultConfig t_start_s=20');
close(defaultFL.fault.params.magnitude, 10, 0, 'defaultConfig magnitude=10');
close(defaultFL.initial.load_kW, 30, 0, 'defaultConfig load=30');
close(defaultFL.initial.SOC_pct, 60, 0, 'defaultConfig SOC=60');
eq(defaultFL.noise.enabled, false, 'defaultConfig noise 默认关闭');

const mergedCfg = core.createConfig('FL-001', { initial: { load_kW: 35 } });
close(mergedCfg.initial.load_kW, 35, 0, 'createConfig 覆盖 load_kW');
close(mergedCfg.initial.SOC_pct, 60, 0, 'createConfig 深合并保留 SOC_pct');
close(mergedCfg.fault.params.magnitude, 10, 0, 'createConfig 深合并保留故障参数');

const loadFamilyCfg = core.createConfig('FL-001', { fault: { family: 'load_step' } });
eq(loadFamilyCfg.fault.family, 'load_step', '切换家族 family=load_step');
eq(loadFamilyCfg.fault.faultId, 'load_step_10kW', '切换家族自动纠正 faultId');
close(loadFamilyCfg.fault.params.magnitude, 10, 0, '切换家族使用新家族默认 magnitude=10');
eq(core.validateConfig(loadFamilyCfg).ok, true, '切换家族后的配置校验通过');

const actFamilyCfg = core.createConfig('FL-001', { fault: { family: 'actuator_fault' } });
eq(actFamilyCfg.fault.faultId, 'converter_current_limit', '切换 actuator 家族 faultId');
close(actFamilyCfg.fault.params.magnitude, 55, 0, '切换 actuator 家族默认 magnitude=55');
eq(core.validateConfig(actFamilyCfg).ok, true, '切换 actuator 家族校验通过');

const gtFamilyCfg = core.createConfig('GT-001', { fault: { family: 'actuator_fault' } });
close(gtFamilyCfg.fault.params.magnitude, 50, 0, 'GT actuator 默认卡涩 50%');

function validationErrorField(overrides, expectedField, name) {
  const cfg = core.createConfig('FL-001', overrides);
  const res = core.validateConfig(cfg);
  ok(res.ok === false, name + '：校验不通过');
  const hit = res.errors.some((e) => e.field === expectedField);
  ok(hit, name + '：错误字段为 ' + expectedField, '实际 ' + show(res.errors));
}
validationErrorField({ duration_s: 30 }, 'duration_s', '非法 duration_s');
validationErrorField({ dt_s: 0.05 }, 'dt_s', '非法 dt_s');
validationErrorField({ fault: { params: { magnitude: 99 } } }, 'fault.params.magnitude', '磁值超 bounds');
validationErrorField({ fault: { params: { magnitude: -3 } } }, 'fault.params.magnitude', '负磁值越界');
validationErrorField({ fault: { t_start_s: 70 } }, 'fault.t_start_s', 'fault_time 越界');
validationErrorField({ fault: { t_start_s: 20.05 } }, 'fault.t_start_s', '故障时刻不在 0.1s 网格');
validationErrorField({ fault: { family: 'bogus' } }, 'fault.family', '未知故障家族');
validationErrorField({ feedback_mode: 'nope' }, 'feedback_mode', '未知反馈模式');
validationErrorField({ initial: { load_kW: 4 } }, 'initial.load_kW', '负载超范围');
validationErrorField({ initial: { SOC_pct: 120 } }, 'initial.SOC_pct', 'SOC 超范围');
validationErrorField({ noise: { level: 5 } }, 'noise.level', '噪声水平超范围');
validationErrorField({ modelId: 'wrong.model' }, 'modelId', 'modelId 不匹配');
eq(core.validateConfig({ systemId: 'XX-999', schemaVersion: 1 }).ok, false, '未知系统校验不通过');
eq(core.validateConfig(null).ok, false, 'null 配置校验不通过');

throwsField(() => core.simulate(core.createConfig('FL-001', { fault: { params: { magnitude: 99 } } })),
  'fault.params.magnitude', 'simulate 对非法幅值抛出带 field 的错误');
throwsField(() => core.simulate({ systemId: 'XX-999', schemaVersion: 1 }), 'systemId', 'simulate 对未知系统抛错');
throwsField(() => core.createConfig('XX-999'), 'systemId', 'createConfig 对未知系统抛错');

/* ================================================================== */
/* 11. sampleAt / sampleAll / slice / findEventAt / makeRunId / 工具     */
/* ================================================================== */
const sample = core.sampleAt(runA, 'I_bat_meas_A', 20);
eq(sample.index, 200, 'sampleAt index=200');
close(sample.t, 20, 1e-9, 'sampleAt 返回吸附时刻 20.0');
close(sample.value, 35, 1e-9, 'sampleAt 返回 I_meas=35');
close(core.sampleAt(runA, 'I_bat_true_A', 26).value, 15 + 10 * Math.exp(-4), 1e-6, 'sampleAt 26s 值');
throwsField(() => core.sampleAt(runA, 'NOPE', 1), undefined, 'sampleAt 未知信号抛错');

const snapAll = core.sampleAll(runA, 20, { categories: ['current'] });
eq(snapAll.I_bat_meas_A, 35, 'sampleAll 电流分类含 I_meas=35');
eq(snapAll.I_bat_true_A, 25, 'sampleAll 含 I_true=25');
ok(!Object.prototype.hasOwnProperty.call(snapAll, 'P_bat_true_kW'), 'sampleAll 分类过滤掉功率信号');
const visibleAll = core.sampleAll(runA, 20, { visible: { I_bat_meas_A: false } });
ok(!Object.prototype.hasOwnProperty.call(visibleAll, 'I_bat_meas_A'), 'sampleAll visible 过滤');
const allAt20 = core.sampleAll(runA, 20);
eq(Object.keys(allAt20).length, runA.signals.length, 'sampleAll 默认返回全部信号');

const sl = core.slice(runA, 'bias_A', 19, 21);
eq(sl.length, 21, 'slice 19–21s 返回 21 个点');
close(sl[0][0], 19, 1e-9, 'slice 首点 t=19');
close(sl[0][1], 0, 1e-9, 'slice 首点 bias=0');
const at20 = sl.filter((p) => Math.abs(p[0] - 20) < 1e-9);
eq(at20.length, 1, 'slice 含 t=20');
close(at20[0][1], 10, 1e-9, 'slice t=20 bias=10');
eq(core.slice(runA, 'bias_A', 0, 1, { step: 5 }).length, 3, 'slice step=5 抽样');
throwsField(() => core.slice(runA, 'NOPE', 0, 1), undefined, 'slice 未知信号抛错');

eq(core.findEventAt(runA, 20).event_id, 'EV-001', 'findEventAt(20) 命中事件');
eq(core.findEventAt(runA, 15), null, 'findEventAt(15) 无事件');
eq(core.findEventAt(flHealthy, 20), null, '健康运行 findEventAt 为 null');
eq(core.makeRunId(1), 'Run-001', 'makeRunId(1)');
eq(core.makeRunId(42), 'Run-042', 'makeRunId(42)');
eq(core.makeRunId(1000), 'Run-1000', 'makeRunId(1000)');
eq(core.clamp(5, 0, 1), 1, 'clamp 上界');
eq(core.clamp(-1, 0, 1), 0, 'clamp 下界');
eq(core.clamp(0.5, 0, 1), 0.5, 'clamp 区间内');
eq(core.getMetric(runA, 'nope_metric'), null, 'getMetric 未知返回 null');
eq(core.fmt(3.14159, 2), '3.14', 'core.fmt 数字精度');
eq(core.fmt(null), '—', 'core.fmt null 占位');

/* 盲测辅助：只暴露 blindVisible 信号 */
const blind = core.blindSignals(runA);
ok(blind.length > 0, 'blindSignals 非空');
ok(blind.every((s) => s.blindVisible === true), 'blindSignals 全部 blindVisible');
ok(blind.every((s) => s.id.indexOf('_true_') === -1), 'blindSignals 不含 *_true_*');
ok(blind.every((s) => s.sourceKind !== 'MODEL_STATE' && s.sourceKind !== 'FAULT_EVENT'), 'blindSignals 不含 MODEL_STATE/FAULT_EVENT');
const blindSample = core.blindSample(runA, 200);
close(blindSample.t, 20, 1e-9, 'blindSample 时刻 20.0');
eq(blindSample.s.I_bat_meas_A, 35, 'blindSample 含 I_meas=35');
ok(!Object.prototype.hasOwnProperty.call(blindSample.s, 'I_bat_true_A'), 'blindSample 不含真值');
ok(!Object.prototype.hasOwnProperty.call(blindSample.s, 'bias_A'), 'blindSample 不含 bias');

/* run 读取路径不应改变 systems 定义（深拷贝快照） */
const sigMetaBefore = JSON.stringify(systems.get('FL-001').signals);
runA.signals[0].label = '被页面改坏了';
eq(JSON.stringify(systems.get('FL-001').signals), sigMetaBefore, 'run.signals 是深拷贝，不回写 system 定义');

/* ================================================================== */
/* 12. compareRuns（契约 §4.10）                                       */
/* ================================================================== */
const cmp = core.compareRuns(flHealthy, flDefault);
eq(cmp.valid, true, 'compareRuns 基准 vs 故障：valid=true');
eq(cmp.diffAllowed, true, 'compareRuns 基准 vs 故障：diffAllowed=true');
eq(cmp.checks.length, 6, 'compareRuns 6 条检查');
eq(cmp.checks.map((c) => c.id).join(','),
  'model-hash,engine-version,duration-dt,initial-conditions,load-profile,observations', 'compareRuns checks id 顺序');
ok(cmp.checks.every((c) => c.status === 'pass'), 'compareRuns 同系统检查全部 pass');
const pairEbat = cmp.pairs.filter((p) => p.metric_id === 'E_bat_kWh')[0];
notNull(pairEbat, 'pairs 含 E_bat_kWh');
close(pairEbat.delta, 446 / 3600 - 600 / 3600, 1e-5, 'E_bat delta = -0.0427778 kWh（446−600 kW·s）');
eq(pairEbat.deltaUnit, 'kWh', 'pair.deltaUnit');
ok(cmp.findings.length >= 3, 'compareRuns findings ≥3');
ok(cmp.findings.some((f) => f.metric_ids.indexOf('E_bat_kWh') !== -1), 'findings 引用 E_bat_kWh');
ok(cmp.findings.some((f) => f.metric_ids.indexOf('focal_change') !== -1), 'findings 引用 focal_change');
ok(cmp.findings.some((f) => f.metric_ids.indexOf('max_abs_r_meas_kW') !== -1), 'findings 引用 r_meas 并说明不是能量损失');
eq(cmp.warnings.length, 0, '有效对比无警告');

const cmpLoad = core.compareRuns(flHealthy, flLoad);
eq(cmpLoad.valid, false, 'load_step 对比：valid=false（负载曲线改变）');
ok(cmpLoad.checks.some((c) => c.id === 'load-profile' && c.status === 'fail'), 'load_step 对比 load-profile=fail');
ok(cmpLoad.warnings.length > 0, 'load_step 对比有警告');

const flBaseRun = makeRun('FL-001', { fault: { family: 'none' } });
const fcBaseRun = makeRun('FC-001', { fault: { family: 'none' } });
const cmpCross = core.compareRuns(flBaseRun, fcBaseRun);
eq(cmpCross.valid, false, '跨系统对比 valid=false');
eq(cmpCross.diffAllowed, false, '跨系统对比 diffAllowed=false');
ok(cmpCross.checks.some((c) => c.id === 'model-hash' && c.status === 'fail'), '跨系统 model-hash=fail');
ok(cmpCross.checks.some((c) => c.id === 'observations' && c.status === 'fail'), '跨系统 observations=fail');

const fakeEngine = Object.assign({}, flDefault, { engineVersion: '9.9.9' });
const cmpEngine = core.compareRuns(flHealthy, fakeEngine);
eq(cmpEngine.valid, false, 'engineVersion 不一致时 valid=false');
ok(cmpEngine.checks.some((c) => c.id === 'engine-version' && c.status === 'fail'), 'engine-version=fail');

const cmpNull = core.compareRuns(null, flDefault);
eq(cmpNull.valid, false, '缺少 baseline 时 valid=false');
eq(cmpNull.diffAllowed, false, '缺少 baseline 时 diffAllowed=false');

/* ================================================================== */
/* 13. 源码静态约束（无 DOM / 网络 / 随机源 / ES module）                */
/* ================================================================== */
const CORE_DIR = path.join(__dirname, '..', 'src', 'core');
['hash.js', 'rng.js', 'systems.js', 'engine.js', 'metrics.js', 'checks.js'].forEach((file) => {
  const src = fs.readFileSync(path.join(CORE_DIR, file), 'utf8');
  ok(src.indexOf('owner: core-engine') === 0 || src.slice(0, 60).indexOf('owner: core-engine') !== -1, file + '：文件头 owner 注释');
  ok(!/Math\.random\s*\(/.test(src), file + '：禁止 Math.random');
  ok(!/\bdocument\b/.test(src), file + '：禁止引用 document');
  ok(!/\bwindow\.document\b/.test(src), file + '：禁止引用 window.document');
  ok(!/\bfetch\s*\(/.test(src), file + '：禁止网络请求 fetch');
  ok(!/XMLHttpRequest/.test(src), file + '：禁止 XMLHttpRequest');
  ok(!/^\s*import\s/m.test(src) && !/^\s*export\s/m.test(src), file + '：禁止 ES module import/export');
  ok(!/\bFloat64Array\b/.test(src), file + '：使用普通数组（不用 TypedArray）');
});
/* 核心层不硬依赖 FL.protocol（protocol.js 未加载也能用，bootstrap 已证明） */
ok(typeof FL.protocol === 'undefined', '核心层不依赖 FL.protocol（Node 环境下未定义）');

/* ================================================================== */
/* 汇总                                                                */
/* ================================================================== */
if (fail === 0) {
  console.log('PASS ' + pass + ' / FAIL 0');
  process.exit(0);
} else {
  console.log('FAILURES:');
  failures.forEach((f, i) => {
    console.log('  [' + (i + 1) + '] ' + f.name);
    if (f.detail) console.log('      ' + f.detail);
  });
  console.log('PASS ' + pass + ' / FAIL ' + fail);
  process.exit(1);
}
