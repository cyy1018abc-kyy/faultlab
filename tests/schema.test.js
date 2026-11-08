/* owner: core-contract | module: tests/schema | contract: NEXT/DATA_CONTRACT_SPEC.md
   G2 四件套④ Schema/单位字典（PHY-10 / SA-24 子集 / I-01）。
   运行：node tests/schema.test.js；失败非零退出。 */
'use strict';

const { bootstrap } = require('./core-load');
const FL = bootstrap();
const contract = FL.contract;
const core = FL.core;

let pass = 0;
let fail = 0;
const failures = [];
function ok(cond, name, detail) {
  if (cond) pass++;
  else { fail++; failures.push({ name, detail: detail || '条件为假' }); }
}
function eq(a, b, name) { ok(a === b, name, 'expected ' + JSON.stringify(b) + '，actual ' + JSON.stringify(a)); }
function code(problems, expected, name) {
  const got = (problems || []).map((p) => p.code);
  ok(got.indexOf(expected) !== -1, name, 'expected 含 ' + expected + '，actual ' + JSON.stringify(got));
}

/* ------------------------------------------------------------------ *
 * 1. SignalCatalog（契约 §2.3 / §9）
 * ------------------------------------------------------------------ */
const sys = FL.systems._raw.get('FL-001');
const cat = sys.signals.map((s) => Object.assign({}, s));
eq(contract.validateSignalCatalog(cat).length, 0, 'FL-001 SignalCatalog 校验通过');
cat.forEach((s) => {
  ok(contract.UNIT_DICT[s.unit] !== undefined, '信号 ' + s.id + ' 单位在字典内（' + s.unit + '）');
  ok(contract.EXPOSURES.indexOf(s.exposure) !== -1, '信号 ' + s.id + ' exposure 合法（' + s.exposure + '）');
  ok(s.blindVisible === (s.exposure === 'blind_observable'), '信号 ' + s.id + ' blindVisible 由 exposure 派生');
});
eq(cat.filter((s) => s.id === 'I_bat_true_A')[0].exposure, 'public_demo', 'I_bat_true_A(MODEL_STATE)=public_demo');
eq(cat.filter((s) => s.id === 'I_bat_meas_A')[0].exposure, 'blind_observable', 'I_bat_meas_A(OBSERVATION)=blind_observable');
eq(cat.filter((s) => s.id === 'bias_A')[0].exposure, 'public_demo', 'bias_A(FAULT_EVENT)=public_demo');
eq(new Set(cat.map((s) => s.id)).size, cat.length, 'signal_id 无重复');

code(contract.validateSignalCatalog([Object.assign({}, cat[0], { unit: 'furlong' })]), 'CN-E02', '未知单位拒绝（CN-E02）');
code(contract.validateSignalCatalog([cat[0], Object.assign({}, cat[0])]), 'CN-E02', '重复信号 id 拒绝');
code(contract.validateSignalCatalog([Object.assign({}, cat[0], { exposure: 'everyone' })]), 'CN-E02', '未知 exposure 拒绝');
code(contract.validateSignalCatalog([Object.assign({}, cat[0], { exposure: 'blind_observable', blindVisible: false })]), 'CN-E02',
  'blindVisible 与 exposure 不一致拒绝（派生字段禁止独立设置）');

/* ------------------------------------------------------------------ *
 * 1b. PV-001 SignalCatalog + UNIT_DICT W/m² 扩展（C-3/C-6，PV001_G2B_SPEC_APPROVED
 *     §8 PV-G2b-03；PV-G2b-04b 回归面——schema.js UNIT_DICT 纯增项 'W/m²'）
 * ------------------------------------------------------------------ */
eq(contract.UNIT_DICT['W/m²'], 'irradiance', "UNIT_DICT 增 'W/m²' → irradiance（PV-001 纯增项）");
const pvSys = FL.systems._raw.get('PV-001');
const pvCat = pvSys.signals.map((s) => Object.assign({}, s));
eq(pvCat.length, 17, 'PV-001 信号目录 17 项（规格 §1.2）');
eq(contract.validateSignalCatalog(pvCat).length, 0, 'PV-001 SignalCatalog 校验通过（W/m² 通道过 CN-E02）');
const pvWm2 = pvCat.filter((s) => s.unit === 'W/m²').map((s) => s.id);
eq(pvWm2.join(','), 'G_true_W_m2,G_meas_W_m2,bias_W_m2', "PV-001 W/m² 信号 3 项（辐照度通道）");
pvCat.forEach((s) => {
  ok(contract.UNIT_DICT[s.unit] !== undefined, 'PV 信号 ' + s.id + ' 单位在字典内（' + s.unit + '）');
  ok(contract.EXPOSURES.indexOf(s.exposure) !== -1, 'PV 信号 ' + s.id + ' exposure 合法（' + s.exposure + '）');
});

/* ------------------------------------------------------------------ *
 * 1c. GT-001 SignalCatalog + UNIT_DICT K/kPa 扩展（GTL1-IMP-Q2，CHG-20261104-12；
 *     GTL1_G2B_SPEC_APPROVED v1.0 §4 项 7——schema.js UNIT_DICT 纯增项 'K'/'kPa'，
 *     PV001 C-3/C-6 同款先例）
 * ------------------------------------------------------------------ */
eq(contract.UNIT_DICT['K'], 'temperature', "UNIT_DICT 增 'K' → temperature（GT-001 L1 thermo 轨纯增项）");
eq(contract.UNIT_DICT['kPa'], 'pressure', "UNIT_DICT 增 'kPa' → pressure（GT-001 L1 thermo 轨纯增项）");
const gtSys001 = FL.systems._raw.get('GT-001');
const gtCat = gtSys001.signals.map((s) => Object.assign({}, s));
eq(contract.validateSignalCatalog(gtCat).length, 0, 'GT-001 SignalCatalog 校验通过（K/kPa 通道过 CN-E02）');
const gtK = gtCat.filter((s) => s.unit === 'K').map((s) => s.id);
const gtKpa = gtCat.filter((s) => s.unit === 'kPa').map((s) => s.id);
eq(gtK.join(','), 'T3_out_K,T2_out_K,T4_out_K', "GT-001 K 温度信号 3 项（T3/T2/T4）");
eq(gtKpa.join(','), 'p2_out_kPa', "GT-001 kPa 压力信号 1 项（p2）");
eq(gtCat.filter((s) => s.category === 'thermal').length, 8, 'GT-001 thermal 类信号 8 项（L1 §1.2）');
gtCat.forEach((s) => {
  ok(contract.UNIT_DICT[s.unit] !== undefined, 'GT 信号 ' + s.id + ' 单位在字典内（' + s.unit + '）');
  ok(contract.EXPOSURES.indexOf(s.exposure) !== -1, 'GT 信号 ' + s.id + ' exposure 合法（' + s.exposure + '）');
});
code(contract.validateSignalCatalog([Object.assign({}, gtCat[0], { unit: '°F' })]), 'CN-E02',
  '未知温度单位仍拒绝（K/kPa 为纯增项，非单位面放开）');

/* ------------------------------------------------------------------ *
 * 1d. WT-001 SignalCatalog + UNIT_DICT m/s·°·- 扩展（WT-G2b-03，CHG-20261107-01；
 *     WT001_G2B_SPEC_APPROVED v1.0 §1.2 信号表/§4 项 5 units 増注——schema.js
 *     UNIT_DICT 纯增项，PV 'W/m²' / GT 'K'·'kPa' 同款先例）
 * ------------------------------------------------------------------ */
eq(contract.UNIT_DICT['m/s'], 'wind', "UNIT_DICT 增 'm/s' → wind（WT-001 风速通道纯增项）");
eq(contract.UNIT_DICT['°'], 'angle', "UNIT_DICT 增 '°' → angle（WT-001 桨距角通道纯增项）");
eq(contract.UNIT_DICT['-'], 'dimensionless', "UNIT_DICT 增 '-' → dimensionless（WT λ/cp 无量纲信号纯增项）");
const wtSys001 = FL.systems._raw.get('WT-001');
const wtCat = wtSys001.signals.map((s) => Object.assign({}, s));
eq(wtCat.length, 22, 'WT-001 信号目录 22 项（规格 §1.2）');
eq(contract.validateSignalCatalog(wtCat).length, 0, 'WT-001 SignalCatalog 校验通过（m/s·°·- 通道过 CN-E02）');
const wtMs = wtCat.filter((s) => s.unit === 'm/s').map((s) => s.id);
const wtDeg = wtCat.filter((s) => s.unit === '°').map((s) => s.id);
const wtDim = wtCat.filter((s) => s.unit === '-').map((s) => s.id);
eq(wtMs.join(','), 'v_true_ms,v_meas_ms,bias_ms', "WT-001 m/s 风速信号 3 项（v_true/v_meas/bias）");
eq(wtDeg.join(','), 'beta_pitch_deg,beta_cmd_deg,beta_stuck_deg', "WT-001 ° 桨距信号 3 项（pitch/cmd/stuck）");
eq(wtDim.join(','), 'lambda_tip,cp_coeff', "WT-001 '-' 无量纲信号 2 项（λ_tip/cp，§4 项 5：无量纲不入单位表口径随 golden units 面）");
wtCat.forEach((s) => {
  ok(contract.UNIT_DICT[s.unit] !== undefined, 'WT 信号 ' + s.id + ' 单位在字典内（' + s.unit + '）');
  ok(contract.EXPOSURES.indexOf(s.exposure) !== -1, 'WT 信号 ' + s.id + ' exposure 合法（' + s.exposure + '）');
});
code(contract.validateSignalCatalog([Object.assign({}, wtCat[0], { unit: 'mph' })]), 'CN-E02',
  '未知风速单位仍拒绝（m/s·°·- 为纯增项，非单位面放开）');

/* ------------------------------------------------------------------ *
 * 2. ScenarioConfig §2.1 视图与校验（T-07 负例子集）
 * ------------------------------------------------------------------ */
const cfgFault = core.createConfig('FL-001', {});
const scFault = contract.scenarioView(cfgFault);
eq(scFault.model_id, 'fl001', 'scenarioView.model_id=fl001（契约 §1.1）');
eq(scFault.model_version, '1.1.0', 'scenarioView.model_version=1.1.0（三段式 v2 归一样式，L4 模型版本涟漪——L6 交接翻转清单项）');
eq(scFault.bias_A, 10, 'scenarioView.bias_A=+10');
eq(scFault.fault_time_s, 20, 'scenarioView.fault_time_s=20.0');
eq(scFault.feedback_mode, 'closed_loop', 'scenarioView.feedback_mode');
eq(scFault.initial_load_kW, 30, 'scenarioView.initial_load_kW=30');
eq(scFault.initial_SOC_pct, 60, 'scenarioView.initial_SOC_pct=60');
eq(scFault.noise, null, 'scenarioView.noise=null（P0）');
const cfgBase = core.createConfig('FL-001', { fault: { family: 'none', faultId: null, t_start_s: 20, params: { magnitude: 0 } } });
eq(contract.scenarioView(cfgBase).bias_A, 0, '基准 bias_A=0');

eq(contract.validateScenarioConfig(scFault).length, 0, 'faulted ScenarioConfig 校验通过');
eq(contract.validateScenarioConfig(contract.scenarioView(cfgBase)).length, 0, 'baseline ScenarioConfig 校验通过');
code(contract.validateScenarioConfig(Object.assign({}, scFault, { fault_time_s: 20.05 })), 'CN-E02', '故障时刻未对齐 dt 网格拒绝');
code(contract.validateScenarioConfig(Object.assign({}, scFault, { bias_A: 30 })), 'CN-E02', 'bias 超出 |b|≤20 拒绝');
code(contract.validateScenarioConfig(Object.assign({}, scFault, { feedback_mode: 'open_loop' })), 'CN-E02', '未知 feedback_mode 拒绝');
code(contract.validateScenarioConfig(Object.assign({}, scFault, { duration_s: 60.55 })), 'CN-E02', 'duration 非 dt 整数倍拒绝');
code(contract.validateScenarioConfig(Object.assign({}, scFault, { schema_version: '2.0.0' })), 'CN-E02', 'schema_version 不符拒绝');
code(contract.validateScenarioConfig(Object.assign({}, scFault, { bias_A: NaN })), 'CN-E02', 'NaN 参数拒绝');
code(contract.validateScenarioConfig(Object.assign({}, scFault, { initial_load_kW: Infinity })), 'CN-E02', 'Infinity 参数拒绝');

/* ------------------------------------------------------------------ *
 * 2b. ScenarioConfig initial 键面按 system.bounds 派生（R-8，CHG-20261105-01 清算项 2；
 *     PV001_G2B_SPEC_APPROVED v1.0 §1.1：PV-001 initial 无 SOC_pct、有 G0_W_m2）。
 *     PV Run 导出校验由 CN-E02 改为 pass；FL/FC/GT 既有键面与域校验逐字保持；
 *     未知 model_id 反查失败回退既有键面；声明面外初值键处置不变（不要求、不新增拒绝）。
 * ------------------------------------------------------------------ */
const pvBase = core.createConfig('PV-001', { fault: { family: 'none', faultId: null, t_start_s: 20, params: { magnitude: 0 } } });
const scPV = contract.scenarioView(pvBase);
eq(scPV.initial_load_kW, 30, 'PV scenarioView.initial_load_kW=30');
eq(scPV.initial_SOC_pct, undefined, 'PV scenarioView 无 initial_SOC_pct（无储能键面）');
eq(scPV.initial_G0_W_m2, 1000, 'PV scenarioView.initial_G0_W_m2=1000（R-8 投影补入）');
eq(contract.validateScenarioConfig(scPV).length, 0, 'PV-001 Run 导出校验通过（R-8：声明才要求，不再报 CN-E02）');
code(contract.validateScenarioConfig(Object.assign({}, scPV, { initial_G0_W_m2: 200 })), 'CN-E02', 'PV G0 低于 bounds 域下界 300 拒绝');
code(contract.validateScenarioConfig(Object.assign({}, scPV, { initial_G0_W_m2: 1200 })), 'CN-E02', 'PV G0 高于 bounds 域上界 1000 拒绝');
code(contract.validateScenarioConfig(Object.assign({}, scPV, { initial_G0_W_m2: NaN })), 'CN-E02', 'PV G0 NaN 拒绝');
code(contract.validateScenarioConfig(Object.assign({}, scPV, { initial_G0_W_m2: undefined })), 'CN-E02', 'PV G0 缺失拒绝（声明即要求）');
eq(contract.validateScenarioConfig(Object.assign({}, scPV, { initial_G0_W_m2: 300 })).length, 0, 'PV G0=300（bounds 下界端点）通过');
['FC-001', 'GT-001'].forEach((sid) => {
  eq(contract.validateScenarioConfig(contract.scenarioView(core.createConfig(sid, {}))).length, 0,
    sid + ' Run 导出校验通过（bounds 含 SOC_pct，键面零变化）');
});
code(contract.validateScenarioConfig(Object.assign({}, scFault, { initial_SOC_pct: 150 })), 'CN-E02', 'FL SOC 域校验保持（bounds 声明 SOC_pct）');
code(contract.validateScenarioConfig(Object.assign({}, scFault, { model_id: 'x-unknown', initial_SOC_pct: 150 })), 'CN-E02',
  '未知 model_id 反查失败回退既有键面（SOC 域校验仍生效）');
eq(contract.validateScenarioConfig(Object.assign({}, scFault, { initial_G0_W_m2: 1000 })).length, 0,
  'FL 场景携带声明面外初值键处置保持（不要求、不新增拒绝）');

/* ------------------------------------------------------------------ *
 * 2c. WT-001 initial_v0_ms 导出面正反例（B-2 / WT-G2b-03，CHG-20261107-01；
 *     WT001_G2B_SPEC_APPROVED v1.0 §1.1：bounds.v0_ms = [6,10] m/s——R-8
 *     bounds 驱动自动纳入（resolveInitialBounds 泛化 + scenarioView.initial_v0_ms
 *     投影），非硬编码系统清单；正例 7 / 反例 11 逐项登记）
 * ------------------------------------------------------------------ */
const wtBase = core.createConfig('WT-001', { fault: { family: 'none', faultId: null, t_start_s: 20, params: { magnitude: 0 } } });
const scWT = contract.scenarioView(wtBase);
/* 正例 7 */
eq(scWT.initial_v0_ms, 9, 'WT scenarioView.initial_v0_ms=9（R-8 投影补入）');
eq(scWT.initial_SOC_pct, undefined, 'WT scenarioView 无 initial_SOC_pct（无储能键面，§1.1）');
eq(scWT.initial_G0_W_m2, undefined, 'WT scenarioView 无 initial_G0_W_m2（PV 专属键不渗入 WT 投影）');
eq(contract.validateScenarioConfig(scWT).length, 0, 'WT-001 Run 导出校验通过（R-8：声明才要求，不再报 CN-E02）');
eq(contract.validateScenarioConfig(Object.assign({}, scWT, { initial_v0_ms: 6 })).length, 0, 'WT v0=6（bounds 下界端点）通过');
eq(contract.validateScenarioConfig(Object.assign({}, scWT, { initial_v0_ms: 10 })).length, 0, 'WT v0=10（bounds 上界端点）通过');
eq(contract.validateScenarioConfig(Object.assign({}, scWT, { initial_v0_ms: 7.5 })).length, 0, 'WT v0=7.5（域内非整值）通过');
/* 反例 11 */
code(contract.validateScenarioConfig(Object.assign({}, scWT, { initial_v0_ms: 5.9 })), 'CN-E02', 'WT v0 低于 bounds 下界 6 拒绝');
code(contract.validateScenarioConfig(Object.assign({}, scWT, { initial_v0_ms: 10.1 })), 'CN-E02', 'WT v0 高于 bounds 上界 10 拒绝');
code(contract.validateScenarioConfig(Object.assign({}, scWT, { initial_v0_ms: 0 })), 'CN-E02', 'WT v0=0（域外）拒绝');
code(contract.validateScenarioConfig(Object.assign({}, scWT, { initial_v0_ms: NaN })), 'CN-E02', 'WT v0 NaN 拒绝');
code(contract.validateScenarioConfig(Object.assign({}, scWT, { initial_v0_ms: Infinity })), 'CN-E02', 'WT v0 Infinity 拒绝');
code(contract.validateScenarioConfig(Object.assign({}, scWT, { initial_v0_ms: '9' })), 'CN-E02', 'WT v0 字符串类型拒绝');
code(contract.validateScenarioConfig(Object.assign({}, scWT, { initial_v0_ms: null })), 'CN-E02', 'WT v0 null 拒绝');
(function v0Missing() {
  const noV0 = Object.assign({}, scWT);
  delete noV0.initial_v0_ms;
  code(contract.validateScenarioConfig(noV0), 'CN-E02', 'WT v0 缺失拒绝（声明即要求，G0_W_m2 同款）');
})();
code(contract.validateScenarioConfig(Object.assign({}, scWT, { initial_v0_ms: 6 - 1e-7 })), 'CN-E02',
  'WT v0=6−1e-7（1e-9 域容差外侧）拒绝');
code(contract.validateScenarioConfig(Object.assign({}, scWT, { initial_v0_ms: 10 + 1e-7 })), 'CN-E02',
  'WT v0=10+1e-7（1e-9 域容差外侧）拒绝');
code(contract.validateScenarioConfig(Object.assign({}, scWT, { model_id: 'x-unknown' })), 'CN-E02',
  'WT v0 面：未知 model_id 反查失败回退既有键面（SOC 域校验仍生效）');

/* ------------------------------------------------------------------ *
 * 2d. faulted PV Run 导出不再 CN-E02（残留① L6 修复断言固化，CHG-20261107-01）：
 *     bias_A 契约键在投影面统一承载 fault.params.magnitude，但 |b|≤20 A 是电流域
 *     物理界——分派口径按系统信号目录是否存在 id='bias_A' 信号（FL/FC 生效，
 *     PV/GT/WT 豁免，反查失败回退生效）；FL/FC 既有域校验逐字保持。
 * ------------------------------------------------------------------ */
const pvFaulted = core.createConfig('PV-001', { fault: { family: 'sensor_drift', t_start_s: 20 } });
const scPVf = contract.scenarioView(pvFaulted);
eq(scPVf.bias_A, 100, 'faulted PV 导出 bias_A 键承载偏置幅值 +100（键名沿契约 §2.1 历史面）');
eq(contract.validateScenarioConfig(scPVf).length, 0, 'faulted PV Run 导出校验通过（不再误报 CN-E02——残留①固化）');
const pvShade = core.createConfig('PV-001', { fault: { family: 'shading_step', t_start_s: 20 } });
eq(contract.validateScenarioConfig(contract.scenarioView(pvShade)).length, 0,
  'faulted PV shading_step（−300 W/m²）导出校验通过（W/m² 域幅值不适用电流域检查）');
eq(contract.validateScenarioConfig(Object.assign({}, scPVf, { bias_A: 1000 })).length, 0,
  'PV 偏置幅值不适用电流域 |b|≤20 检查（bias_A 分派按信号目录是否存在 bias_A 信号，残留①口径）');
code(contract.validateScenarioConfig(Object.assign({}, scFault, { model_id: 'x-unknown', bias_A: 30 })), 'CN-E02',
  '电流域检查反查失败回退生效（FL |b|≤20 在未知 model_id 下仍拒绝）');

/* ------------------------------------------------------------------ *
 * 3. TimeSeries §2.4（n 由参数派生，禁止硬编码 601；T-07 / SA-01）
 * ------------------------------------------------------------------ */
const run = core.simulate(cfgFault, { runId: 'SCHEMA-TEST' });
const ts = run.timeseries;
eq(contract.deriveNSamples(60, 0.1), 601, 'n = duration/dt + 1 = 601（派生）');
eq(contract.deriveNSamples(30, 0.1), 301, 'P1 变 duration 时 n 随参数派生（非硬编码）');
eq(contract.validateTimeSeries(ts, { duration_s: 60, dt_s: 0.1 }).length, 0, '引擎 TimeSeries 校验通过');
ok(Math.abs(ts.t[199] - 19.900000000000002) < 1e-18, 't[199] 为 199·0.1 的 IEEE-754 值');
ok(ts.t[200] === 20, 't[200]=20（post 行）');
code(contract.validateTimeSeries({ t: ts.t.slice(0, 600), signals: {} }, { duration_s: 60, dt_s: 0.1 }), 'CN-E03', '点数不足拒绝');
code(contract.validateTimeSeries({ t: [0, 0.2, 0.1].concat(ts.t.slice(3)), signals: {} }, { duration_s: 60, dt_s: 0.1 }), 'CN-E03', '时间非单调拒绝');
code(contract.validateTimeSeries({ t: ts.t.map((v) => v + 0.05), signals: {} }, { duration_s: 60, dt_s: 0.1 }), 'CN-E03', '网格偏移拒绝（t[i]≠i·dt）');
const badT = ts.t.slice(); badT[5] = NaN;
code(contract.validateTimeSeries({ t: badT, signals: {} }, { duration_s: 60, dt_s: 0.1 }), 'CN-E03', 'NaN 时间拒绝');
const badSig = JSON.parse(JSON.stringify(ts.signals)); badSig.I_bat_true_A[7] = Infinity;
code(contract.validateTimeSeries({ t: ts.t, signals: badSig }, { duration_s: 60, dt_s: 0.1 }), 'CN-E04', '信号含 Infinity 拒绝（CN-E04）');

/* ------------------------------------------------------------------ *
 * 4. EventSnapshot §2.5（CN-E05）
 * ------------------------------------------------------------------ */
eq(contract.validateEventSnapshots(run.events, run.snapshots, scFault).length, 0, '事件快照契约校验通过');
code(contract.validateEventSnapshots(run.events, [run.snapshots[0]], scFault), 'CN-E05', '缺 post 快照拒绝（成对）');
code(contract.validateEventSnapshots(run.events,
  [Object.assign({}, run.snapshots[0], { t_s: 19.9 }), run.snapshots[1]], scFault), 'CN-E05', 'pre.t_s=19.9 拒绝（必须为 20.0）');
code(contract.validateEventSnapshots(run.events,
  [Object.assign({}, run.snapshots[0], { derivation: 'post_sample' }), run.snapshots[1]], scFault), 'CN-E05', 'pre.derivation 错误拒绝');

/* ------------------------------------------------------------------ *
 * 5. DerivedMetric / QualityChecks / RunManifest（CN-E01/E02/E04）
 * ------------------------------------------------------------------ */
const contractMetrics = FL.registry.contractMetrics(run.metrics);
eq(contract.validateMetrics(contractMetrics).length, 0, '契约指标投影校验通过');
code(contract.validateMetrics(contractMetrics.map((m) => m.unit === 'pp' ? Object.assign({}, m, { unit: '%' }) : m)), 'CN-E02',
  'SOC_err 单位为 % 拒绝（必须 pp）');
code(contract.validateMetrics([Object.assign({}, contractMetrics[0], { method: 'magic' })]), 'CN-E02', '未知 method 拒绝');
code(contract.validateMetrics([Object.assign({}, contractMetrics[0], { value: null, unavailable_reason: null })]), 'CN-E01',
  'value=null 缺 unavailable_reason 拒绝');
eq(contract.validateChecks(FL.registry.contractChecks(run.quality)).length, 0, '契约检查投影校验通过');
code(contract.validateChecks([{ check_id: 'X', status: 'maybe', owner: 'numeric' }]), 'CN-E02', '未知 status 拒绝');
code(contract.validateChecks([{ check_id: 'X', status: 'pass', owner: 'nobody' }]), 'CN-E02', '未知 owner 拒绝');

const manifest = run.manifest || null;
ok(manifest === null, 'engine.simulate 原始输出不含 manifest（由 registry 添加）');
const frozenRun = FL.registry.createRun({ config: core.createConfig('FL-001', {}), runId: 'SCHEMA-R2', createdAt: '2026-10-28T00:00:00Z' });
eq(contract.validateRunManifest(frozenRun.manifest).length, 0, 'RunManifest 契约校验通过');
const badManifest = JSON.parse(JSON.stringify(frozenRun.manifest));
badManifest.verification.model_validation = 'passed';
code(contract.validateRunManifest(badManifest), 'CN-E02', 'model_validation≠not_performed 拒绝（L0 无实测验证）');
code(contract.validateRunManifest(Object.assign({}, badManifest, {
  verification: frozenRun.manifest.verification, integrity: { run_hash: 'deadbeef', checks_status: 'pass' }
})), 'CN-E01', 'integrity.run_hash 与 run_hash 不一致拒绝');

/* ------------------------------------------------------------------ *
 * 6. project(run,'demo'|'blind')（契约 §2.13 / G0-DEC-11 / T-16 子集）
 * ------------------------------------------------------------------ */
const demo = contract.project(frozenRun, 'demo');
ok(demo.truth !== null && demo.truth.faultFamily === 'sensor_drift', 'demo 投影含 truth（演示公开）');
eq(demo.timeseries.t.length, 601, 'demo 投影保留完整 TimeSeries');
const before = JSON.stringify(frozenRun);
contract.project(frozenRun, 'blind');
eq(JSON.stringify(frozenRun), before, 'project 不修改原 Run（纯函数）');

const blind = contract.project(frozenRun, 'blind');
const blindIds = blind.signals.map((s) => s.id);
ok(blindIds.indexOf('I_bat_true_A') === -1, 'blind 不含 *_true_* 信号');
ok(blindIds.indexOf('bias_A') === -1, 'blind 不含 bias_A');
ok(blind.signals.every((s) => s.exposure === 'blind_observable'), 'blind 仅含 exposure=blind_observable');
eq(blind.events[0].magnitude, undefined, 'blind 事件不含幅值（脱敏）');
eq(blind.events[0].trigger_s, 20, 'blind 事件保留时间');
ok(blind.metrics.every((m) => m.metric_id.indexOf('true') === -1), 'blind 指标不含真值口径');
ok(blind.config.fault === undefined, 'blind config 无 fault');
ok(blind.truth === undefined, 'blind 无 truth');

/* 递归泄露断言：注入真值键后 blindScan 必须命中 */
const leakHits = contract.blindScan({ a: { SOC_true_pct: [1] }, b: [{ bias_A: 1 }], truth: { x: 1 } }, '$', []);
ok(leakHits.length >= 3, 'blindScan 递归捕获泄露键', JSON.stringify(leakHits));
ok(contract.looksBlindBanned('I_bat_true_A') && contract.looksBlindBanned('bias_A') && contract.looksBlindBanned('I_bat_cap_A'),
  'blindScan 命中 _true_/bias_A/_cap_');

/* ------------------------------------------------------------------ *
 * 7. 错误对象形态（契约 §7.1）
 * ------------------------------------------------------------------ */
const e = contract.validateSignalCatalog([{ id: 'x', unit: 'bad', sourceKind: 'OBSERVATION', exposure: 'public_demo', precision: 2 }])[0];
ok(e && e.code === 'CN-E02' && typeof e.message === 'string' && typeof e.next === 'string',
  '契约错误含 code/message/next（中文可读）', JSON.stringify(e));

/* ------------------------------------------------------------------ */
console.log('\n================================================');
console.log('PASS ' + pass + ' / FAIL ' + fail + (fail ? '  ✗' : '  ✓'));
if (fail) {
  console.log('---- 失败明细（前 30）----');
  failures.slice(0, 30).forEach((f, i) => console.log('  [' + i + '] ' + f.name + '\n      ' + f.detail));
  console.log('================================================');
  process.exit(1);
}
console.log('Schema/契约测试全部通过。');
