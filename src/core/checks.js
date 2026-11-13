/* owner: core-engine | module: checks | contract: docs/CONTRACT.md */
/* quality_checks：契约 §4.8 检查（sampling / conservation-true / conservation-meas /
   units / soc-bounds / event-window / energy-balance）+ 系统专属 PHY 按系统分派
   （GT：gt-energy-consistency / gt-bat-envelope；PV：pv-energy-consistency；
   WT：wt-energy-identity——WT001_G2B_SPEC_APPROVED v1.0 §8 WT-G2b-04）。
   soc-bounds/energy-balance 按 system.bounds 派生：声明 bounds.SOC_pct 的系统（FL/FC/GT）
   才检查；PV-001 无 SOC/E_bat 面，不派发（CHG-20261105-01 清算项 1，解除
   CHG-20261104-10 锁定态），其能量恒等由 pv-energy-consistency 承载（EQ-PV-5/EQ-PV-7）；
   WT-001 同款口径不派发（无 SOC/E_bat 面——WT001_G2B_SPEC_APPROVED v1.0 §1.1 无 SOC 键），
   其能量恒等由 wt-energy-identity 承载（EQ-WT-8/EQ-WT-9）。
   FL-001 energy-balance 于 thermal_model=on 分支扩判据 −E_loss（EQ-FLTH-9，守恒面 (a)，
   CHG-20261107-01）；off/PV/FC/GT 路径零变化。
   MG-001 落地面（MG001_G2B_SPEC_APPROVED v1.0 §1.3/§4 项 4/§4 项 5；W6，CHG-20261110-01，
   MG-001 键控 additive）：sampling 对唯一事件域 null 列 P_bess_chase_kW 的豁免
   （I_bat_cap_A/beta_stuck_deg 先例同构）+ units 声明面 '-'（island_state；复用既有字典
   零新增）——两者均为 MG-001 键控分支，既有五系统检查输出逐字节不变；MG bounds 刻意
   不含 SOC_pct（SystemDef 登记面）→ soc-bounds/energy-balance 不派发（bounds 派生分派
   既有机制自动覆盖，PV/WT 同款口径）。
   不通过时页面必须显示"验证未通过"。 */
(function () {
  'use strict';

  var FL = window.FL = window.FL || {};
  FL.core = FL.core || {};

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  function maxAbs(arr) {
    if (!arr) return null;
    var m = 0;
    var found = false;
    for (var i = 0; i < arr.length; i++) {
      var v = arr[i];
      if (!isNum(v)) continue;
      found = true;
      var a = v < 0 ? -v : v;
      if (a > m) m = a;
    }
    return found ? m : null;
  }

  function minMaxNonEmpty(arr) {
    var min = Infinity;
    var max = -Infinity;
    var found = false;
    if (!arr) return null;
    for (var i = 0; i < arr.length; i++) {
      if (!isNum(arr[i])) continue;
      found = true;
      if (arr[i] < min) min = arr[i];
      if (arr[i] > max) max = arr[i];
    }
    return found ? { min: min, max: max } : null;
  }

  function findMetric(metrics, id) {
    if (!metrics) return null;
    for (var i = 0; i < metrics.length; i++) if (metrics[i].metric_id === id) return metrics[i];
    return null;
  }

  /* FL-001 契约指标 ID（DATA_CONTRACT_SPEC §2.6）与旧 ID 的别名解析（与 engine.js 一致） */
  var METRIC_ALIAS = {
    E_bat_kWh: ['E_bat_true_60s'],
    E_source_kWh: ['E_gen_true_60s'],
    E_load_served_kWh: ['E_load_served_60s'],
    SOC_err_pp: ['SOC_err_end_pp'],
    focal_change: ['focal_change_A']
  };

  function findMetricAny(metrics, id) {
    var m = findMetric(metrics, id);
    if (m) return m;
    var alts = METRIC_ALIAS[id] || [];
    for (var i = 0; i < alts.length; i++) {
      m = findMetric(metrics, alts[i]);
      if (m) return m;
    }
    return null;
  }

  function metricValue(metrics, id) {
    var m = findMetricAny(metrics, id);
    return (m && !m.unavailable && isNum(m.value)) ? m.value : null;
  }

  /* QualityChecks（契约 §2.7）：observed/expected/tolerance/reason/owner 为契约字段；
     label/computed_value/message 为 UI 兼容别名（导出时由 FL.contract.toContractCheck 投影）。 */
  function check(id, label, status, tolerance, computedValue, message, expected, owner) {
    var observed = (computedValue === null || computedValue === undefined) ? null : computedValue;
    return {
      check_id: id,
      label: label,
      status: status,
      observed: observed,
      computed_value: observed,
      expected: expected === undefined ? null : expected,
      tolerance: tolerance,
      reason: message,
      message: message,
      owner: owner || 'numeric'
    };
  }

  function evaluate(ctx) {
    var system = ctx.system;
    var cfg = ctx.config;
    var t = ctx.t;
    var series = ctx.series;
    var metrics = ctx.metrics || [];
    var events = ctx.events || [];
    var snapshots = ctx.snapshots || [];
    var duration = cfg.duration_s;
    var dt = cfg.dt_s;
    var family = cfg.fault.family;
    var faulted = family !== 'none';
    var noiseEnabled = !!(cfg.noise && cfg.noise.enabled);
    var quality = [];

    /* ---- sampling ---- */
    var expectedPoints = Math.round(duration / dt) + 1;
    var n = t.length;
    var lengthsOk = true;
    var badSignal = null;
    Object.keys(series).forEach(function (id) {
      if (!series[id] || series[id].length !== n) { lengthsOk = false; badSignal = id; }
    });
    var gridOk = n === expectedPoints &&
      Math.abs(t[0]) < 1e-9 &&
      Math.abs(t[n - 1] - duration) < 1e-9 &&
      Math.abs((t[1] - t[0]) - dt) < 1e-9;
    var nanCount = 0;
    var nullOptionalCount = 0;
    /* GT-001 L1 thermo 轨专属热力信号（GTL1_G2B_SPEC_APPROVED v1.0 §1.2 八信号）：
       swing/linear 遗留轨无热力面——八信号全程 null 属结构性缺席（与 golden gt001_v1/v2
       SERIES_IDS 不含热力面一致），非 thermo 运行不计为 NaN 违规。 */
    var THERMO_ONLY_SIGNALS = {
      T3_out_K: 1, T2_out_K: 1, p2_out_kPa: 1, T4_out_K: 1,
      Q_fuel_kW: 1, P_comp_kW: 1, P_turb_kW: 1, eta_cycle_pct: 1
    };
    /* FL-001 thermal 轨专属热力信号（FL001_THERMAL_G2B_SPEC_APPROVED v1.0 §1.2 两信号）：
       thermal_model=off 默认轨无热力面——两信号全程 null 属结构性缺席（GT thermo 同款
       先例；spec §3.5 明文「off 轨全程 null」），off 轨不计为 NaN 违规。 */
    var FL_THERMAL_SIGNALS = { T_bat_K: 1, P_loss_kW: 1 };
    /* MG-001 事件域 null 列（MG001_G2B_SPEC_APPROVED v1.0 §1.3/§4 项 4；W6 落地面，
       CHG-20261110-01）：P_bess_chase_kW 为唯一事件域 null 列——岛窗外不可用（null），
       属事件域结构性缺席（I_bat_cap_A / beta_stuck_deg 事件域 null 先例同构），不计为
       NaN 违规。MG-001 键控 additive：既有五系统 null 处理路径零变化（WT beta_stuck_deg
       豁免仍为其规格登记的并发落地面，本波零触碰）。 */
    var MG_EVENT_DOMAIN_SIGNALS = { P_bess_chase_kW: 1 };
    Object.keys(series).forEach(function (id) {
      var isOptional = /(_cap_A|_cap_kW)$/.test(id) ||
        (system.id === 'MG-001' && MG_EVENT_DOMAIN_SIGNALS[id] === 1) ||
        (THERMO_ONLY_SIGNALS[id] && !(cfg && cfg.inertia_model === 'thermo')) ||
        (FL_THERMAL_SIGNALS[id] && !(cfg && cfg.thermal_model === 'on'));
      var arr = series[id] || [];
      for (var i = 0; i < arr.length; i++) {
        var v = arr[i];
        if (v === null) {
          if (isOptional) nullOptionalCount++;
          else nanCount++;
        } else if (!isNum(v)) {
          nanCount++;
        }
      }
    });
    /* null 可选点位说明按系统分派（MG-001 键控 additive）：既有五系统串面逐字不变
       （cap/thermo/FL-thermal 三先例原文保序），MG-001 走事件域列专属说明。 */
    var samplingNullNote = '';
    if (nullOptionalCount) {
      samplingNullNote = system.id === 'MG-001'
        ? ('；' + nullOptionalCount + ' 个可选点位为 null（P_bess_chase_kW 事件域列岛窗外不可用——island_event 结构性缺席，I_bat_cap_A/beta_stuck_deg 先例同构）')
        : ('；' + nullOptionalCount + ' 个可选点位为 null（cap 信号未生效时段：actuator 轨为 t < t_start 前置窗，其余场景全程未生效；thermo 专属热力信号在 swing/linear 遗留轨全程为 null——无热力面；FL thermal 专属热力信号 T_bat_K/P_loss_kW 在 thermal_model=off 轨全程为 null——无热力面）');
    }
    quality.push(check(
      'sampling', '采样与序列完整性',
      (lengthsOk && gridOk && nanCount === 0) ? 'pass' : 'fail',
      expectedPoints + ' 点 / dt ' + dt + ' s / 全部序列等长 / 无 NaN',
      n,
      (lengthsOk && gridOk && nanCount === 0)
        ? ('601 点采样网格一致，' + Object.keys(series).length + ' 个信号等长，无 NaN/Inf' + samplingNullNote)
        : ('采样检查失败：长度' + (lengthsOk ? '一致' : '不一致(' + badSignal + ')') +
          '，网格' + (gridOk ? '正确' : '错误') + '，非法数值 ' + nanCount + ' 个')
    ));

    /* ---- conservation-true（PHY-01 定义自洽：G0-DEC-12 冻结 FL-001 容差 ≤1e-12 kW）----
       注意：这是定义恒等式的代数一致性回归（P_gen := P_load − P_bat；FL thermal on 域
       EQ-FLTH-5/6 扩为 P_gen := P_load − P_bat + P_loss——r_true 信号定义式已由 engine
       扩展，本检查残差判据与容差面不变），不是"物理守恒验证"，更不能表述为模型验证
       （MODEL_VALIDATION_SPEC §4.3）。
       WT-001 走通用 else 面（r_true/r_meas ≡ 0 定义恒等，EQ-WT-8）：tolTrue else 档 1e-12 kW
       与 WT 规格 §4 项 3 WS-4（≤1e-12）对齐——通用面自动覆盖 WT，无专属分支；
       r_meas 全功率通道健康（故障期仍 ≡ 0），conservation-meas 不会误入 warn 路径。 */
    var tolTrue = system.id === 'GT-001' ? 1e-9 : (system.id === 'FC-001' ? 1e-6 : 1e-12);
    var maxRt = maxAbs(series.r_true_kW);
    var trueOk = maxRt !== null && maxRt <= tolTrue;
    quality.push(check(
      'conservation-true', '定义自洽（代数一致性）',
      trueOk ? 'pass' : 'fail',
      '≤ ' + tolTrue + ' kW' + (system.id === 'GT-001' ? '（含 P_rotor 项）' : ''),
      maxRt,
      trueOk
        ? ('定义自洽检查通过：max|r_true| = ' + maxRt.toExponential(2) + ' kW，在容差内' +
          '（定义恒等式回归，不是物理守恒验证）' +
          (system.id === 'GT-001' ? '；含转子惯量项 P_rotor' : ''))
        : ('定义自洽检查未通过：P_gen ≠ P_load − P_bat，max|r_true| = ' + maxRt + ' kW > ' + tolTrue + ' kW'),
      0, 'numeric'
    ));

    /* ---- conservation-meas ---- */
    if (system.id === 'GT-001') {
      /* GT：r_meas 已废除（G2b v1.1 条件 2）——改为频率通道冗余一致性检查。
         无噪声 golden 口径 max|f_channel_diff| ≤ 1e-9 Hz；故障期 = b(t) 属预期检测信号（warn）。 */
      var maxFd = maxAbs(series.f_channel_diff_Hz);
      var fdStatus;
      if (maxFd === null) fdStatus = 'fail';
      else if (maxFd <= 1e-9) fdStatus = 'pass';
      else if (faulted) fdStatus = 'warn';
      else if (noiseEnabled) fdStatus = 'warn';
      else fdStatus = 'fail';
      var fdMsg;
      if (fdStatus === 'pass') fdMsg = '频率通道冗余不一致最大 ' + maxFd.toExponential(2) + ' Hz（健康口径 ≤1e-9）';
      else if (fdStatus === 'warn' && faulted) fdMsg = '故障期间通道不一致 ' + maxFd.toFixed(3) + ' Hz：这是测量偏差（检测信号），不是能量损失';
      else if (fdStatus === 'warn') fdMsg = '观测噪声开启，通道不一致 ' + maxFd.toFixed(4) + ' Hz 非零（演示用噪声，允许 warn）';
      else fdMsg = '无故障且无噪声时通道不一致应≤1e-9 Hz，实际 ' + maxFd + ' Hz';
      quality.push(check(
        'conservation-meas', '频率通道冗余一致性',
        fdStatus,
        faulted ? '故障期等于偏置量（检测信号，warn 允许）' : '≤ 1e-9 Hz',
        maxFd,
        fdMsg
      ));
    } else {
    var maxRm = maxAbs(series.r_meas_kW);
    var measStatus;
    if (maxRm === null) measStatus = 'fail';
    else if (maxRm <= 1e-6) measStatus = 'pass';
    else if (faulted) measStatus = 'warn';
    else if (noiseEnabled) measStatus = 'warn';
    else measStatus = 'fail';
    var measMsg;
    if (measStatus === 'pass') {
      measMsg = '测量一致性残差最大 ' + maxRm.toExponential(2) + ' kW（无故障或无测量偏置）';
    } else if (measStatus === 'warn' && faulted) {
      measMsg = '故障期间测量一致性残差为 ' + maxRm.toFixed(2) + ' kW：这是测量偏差，不是能量损失（真实口径由 conservation-true 单独校验）';
    } else if (measStatus === 'warn') {
      measMsg = '观测噪声开启，测量一致性残差 ' + maxRm.toFixed(3) + ' kW 非零（演示用噪声，允许 warn）';
    } else {
      measMsg = '无故障且无噪声时测量一致性残差应≈0，实际 ' + maxRm + ' kW';
    }
    quality.push(check(
      'conservation-meas', '测量一致性残差',
      measStatus,
      faulted ? '故障期允许非零（测量偏差，warn 允许）' : '≤ 1e-6 kW',
      maxRm,
      measMsg
    ));
    }

    /* ---- GT 专属 PHY（G2b v1.1 §3/§5；CHG-20261030-06 批准口径；A-1 双轨分派 CHG-20261102-01；
         L1 thermo 分派 GTL1-G2b-04 / CHG-20261104-12）---- */
    if (system.id === 'GT-001') {
      var inertiaGt = (cfg && cfg.inertia_model === 'linear') ? 'linear'
        : (cfg && cfg.inertia_model === 'thermo') ? 'thermo' : 'swing';
      var fArrGt = series.f_true_Hz;
      var fEndGt = fArrGt && fArrGt.length ? fArrGt[fArrGt.length - 1] : null;
      if (fEndGt !== null && inertiaGt === 'thermo') {
        /* thermo 轨（GTL1_G2B_SPEC_APPROVED v1.0 §2.2 EQ-GTL1-12 检查式）：燃烧室离散能量恒等
           C_3·(T3_end − T3_0) ≡ ∫(η_b·Q_f − ṁ_g·cp_g·(T3−T2))dt（右侧引擎子步左矩形经
           E_comb_net_kWh 承载；RK4 离散自洽回归，不是物理验证）。容差按引擎四场景复算上界
           登记（GTL1-G2b-04 临时脚本复算，安全系数 ≥10；终值随 gt001_v3 oracle GL-2 复算
           分布对齐——GTL1-G2b-03）。 */
        var t3ArrGt = series.T3_out_K;
        var t3FirstGt = t3ArrGt && isNum(t3ArrGt[0]) ? t3ArrGt[0] : null;
        var t3LastGt = t3ArrGt && t3ArrGt.length ? t3ArrGt[t3ArrGt.length - 1] : null;
        var eCombGt = metricValue(metrics, 'E_comb_net_kWh');
        var residThGt = (t3FirstGt !== null && t3LastGt !== null && eCombGt !== null)
          ? Math.abs(0.335983796442745 * (t3LastGt - t3FirstGt) / 3600 - eCombGt) : null;
        /* 容差 1e-3 kWh：GTL1-G2b-04 引擎复算上界 8.256e-5 kWh（六场景含 load+20 角点；
           复算证实残差 ∝ h——左矩形一阶离散残差；安全系数 ≥12）。终值随 gt001_v3 oracle
           GL-2 复算分布对齐（GTL1-G2b-03）。 */
        var okThGt = residThGt !== null && residThGt <= 1e-3;
        quality.push(check(
          'gt-energy-consistency', '燃烧室能量恒等闭合（thermo 轨，EQ-GTL1-12 检查式）',
          okThGt ? 'pass' : 'fail', 'numeric',
          residThGt,
          '|C_3·ΔT3 − ∫(η_b·Q_f − ṁ_g·cp_g·(T3−T2))dt| = ' +
            (residThGt === null ? '不可用' : residThGt.toExponential(2)) +
            ' kWh（≤1e-3，复算上界 8.3e-5 ×≥12；左矩形一阶离散残差回归，非物理验证）'
        ));
      } else if (fEndGt !== null && inertiaGt === 'linear') {
        /* linear 遗留轨：线性化能量离散自洽（代数恒等，非物理验证）。
           ∫P_rotor 取子步左矩形（与 f 更新同式，= K_J·Δf 精确 telescoping，经 E_rotor 指标承载）；
           二次型 ΔE_kin 与线性化能量之差 = 线性化截断残差 K_J·Δf²/(2f₀)（恒正）。 */
        var dfGt = fEndGt - 50;
        var dEkGt = (5.0 * 50 / 2) * ((fEndGt / 50) * (fEndGt / 50) - 1); /* kW·s */
        var eLinGt = null;
        (metrics || []).forEach(function (m) {
          if (m.metric_id === 'E_rotor_kWh' && m.value != null) eLinGt = m.value * 3600;
        });
        var truncGt = 5.0 * dfGt * dfGt / (2 * 50);
        var eResid = (eLinGt !== null && !isNaN(eLinGt)) ? Math.abs(dEkGt - eLinGt - truncGt) : null;
        var eOk = eResid !== null && eResid <= 1e-6;
        quality.push(check(
          'gt-energy-consistency', '线性化能量离散自洽（含截断残差项，linear 轨）',
          eOk ? 'pass' : 'fail', 'numeric',
          eResid,
          'ΔE_kin − ∫P_rotor − K_J·Δf²/(2f₀) = ' + (eResid === null ? '不可用' : eResid.toExponential(2)) +
            ' kW·s（代数恒等回归：验证离散自洽与线性化截断项量级，不是物理验证）'
        ));
      } else if (fEndGt !== null) {
        /* swing 轨（A-1，ALINE §4.3）：能量闭合 |ΔE_kin − ∫P_rotor(子步左矩形)| ≤ tol。
           tol 由 oracle 复算分布冻结（CHG-20261102-01）：六 Run 全参数域复算上界
           2.2e-4 kW·s（load_step），取 1e-3（安全系数 ≥4）。线性轨下该差为截断+离散化
           相消的代数恒等（~0），swing 轨下为真实离散化残差——本检查验证量级正确性；
           判别性恒等式（Σ r·dt·(f₊+f₋)/(2f₋) ≡ ΔE_kin，±1e-9）由 oracle GS-1 承载。 */
        var dEkSwGt = (5.0 * 50 / 2) * ((fEndGt / 50) * (fEndGt / 50) - 1); /* kW·s */
        var eIntSwGt = null;
        (metrics || []).forEach(function (m) {
          if (m.metric_id === 'E_rotor_int_kWh' && m.value != null) eIntSwGt = m.value * 3600;
        });
        var eResidSw = (eIntSwGt !== null && !isNaN(eIntSwGt)) ? Math.abs(dEkSwGt - eIntSwGt) : null;
        var eOkSw = eResidSw !== null && eResidSw <= 1e-3;
        quality.push(check(
          'gt-energy-consistency', '摇摆方程能量闭合（swing 轨，离散化残差量级）',
          eOkSw ? 'pass' : 'fail', 'numeric',
          eResidSw,
          '|ΔE_kin − ∫P_rotor| = ' + (eResidSw === null ? '不可用' : eResidSw.toExponential(2)) +
            ' kW·s（≤1e-3 oracle 复算冻结；离散化残差量级验证，非物理验证）'
        ));
      }
      /* gt-bat-envelope：变流器物理包络 ±25 kW（合法参数域内恒过；±15 kW 短时额定为假设/UI 警示） */
      var maxPbatGt = maxAbs(series.P_bat_true_kW);
      var envOk = maxPbatGt !== null && maxPbatGt <= 25;
      quality.push(check(
        'gt-bat-envelope', '电池功率在变流器包络内（±25 kW）',
        envOk ? 'pass' : 'fail', 'numeric',
        maxPbatGt,
        'max|P_bat| = ' + (maxPbatGt === null ? '不可用' : maxPbatGt.toFixed(3)) + ' kW；工作点超 ±15 kW 时依赖短时过载假设（长时运行须降额）'
      ));
    }

    /* ---- PV-001 专属 PHY（PV001_G2B_SPEC_APPROVED v1.0 §4 项 2 PS-2 能量恒等面；
         CHG-20261105-01 清算项 1）：能量账本恒等 E_pv_true + E_grid = E_load
         （EQ-PV-5/EQ-PV-7 定义恒等；E_grid 由引擎按 E_load − E_pv 承载，engine
         integrals 同源，engine.js PV 分支 integrals 块）。容差按 pv001_v1 golden
         gate T-A E_kWh = 1e-9 kWh（引擎四场景残差复算 ≤5.6e-17，余量 ≥7 个量级）。
         本检查验证指标账本对恒等式的回归一致，不是物理守恒验证。 */
    if (system.id === 'PV-001') {
      var ePvTrue = metricValue(metrics, 'E_pv_true_kWh');
      var eGrid = metricValue(metrics, 'E_grid_kWh');
      var eLoad = metricValue(metrics, 'E_load_kWh');
      var residPv = (ePvTrue !== null && eGrid !== null && eLoad !== null)
        ? Math.abs(ePvTrue + eGrid - eLoad) : null;
      var okPv = residPv !== null && residPv <= 1e-9;
      quality.push(check(
        'pv-energy-consistency', '能量账本恒等闭合（EQ-PV-5/EQ-PV-7 定义恒等）',
        okPv ? 'pass' : 'fail',
        '≤ 1e-9 kWh（pv001_v1 gate T-A E_kWh）',
        residPv,
        '|E_pv_true + E_grid − E_load| = ' + (residPv === null ? '不可用' : residPv.toExponential(2)) +
          ' kWh（E_grid 按 E_load − E_pv 定义承载；定义恒等回归，不是物理守恒验证）'
      ));
    }

    /* ---- WT-001 专属 PHY（WT001_G2B_SPEC_APPROVED v1.0 §8 WT-G2b-04；CHG-20261107-01）：
         能量账本恒等 E_wt_true + E_grid_true = E_load（EQ-WT-8/EQ-WT-9 定义恒等；E_grid 由
         引擎按 E_load − E_wt 承载，engine simulateWT001 integrals 同源）。容差对齐
         pv-energy-consistency 量级口径 = wt001_v1 golden gate T-A E_kWh 1e-9 kWh（三账本
         同源自 integrals，残差 fp 级）。本检查验证指标账本对恒等式的回归一致，
         不是物理守恒验证。 ---- */
    if (system.id === 'WT-001') {
      var eWtTrue = metricValue(metrics, 'E_wt_true_kWh');
      var eGridWt = metricValue(metrics, 'E_grid_kWh');
      var eLoadWt = metricValue(metrics, 'E_load_kWh');
      var residWt = (eWtTrue !== null && eGridWt !== null && eLoadWt !== null)
        ? Math.abs(eWtTrue + eGridWt - eLoadWt) : null;
      var okWt = residWt !== null && residWt <= 1e-9;
      quality.push(check(
        'wt-energy-identity', '能量账本恒等闭合（EQ-WT-8/EQ-WT-9 定义恒等）',
        okWt ? 'pass' : 'fail',
        '≤ 1e-9 kWh（wt001_v1 gate T-A E_kWh）',
        residWt,
        '|E_wt_true + E_grid − E_load| = ' + (residWt === null ? '不可用' : residWt.toExponential(2)) +
          ' kWh（E_grid 按 E_load − E_wt 定义承载；定义恒等回归，不是物理守恒验证）'
      ));
    }

    /* ---- units ---- */
    var unitIssues = [];
    var declaredUnits = (system.model && FL.systems && FL.systems._raw && FL.systems._raw.units) ? FL.systems._raw.units : {};
    var allowedUnits = Object.keys(declaredUnits).map(function (k) { return declaredUnits[k]; });
    allowedUnits.push('rpm'); /* 转速展示单位 */
    allowedUnits.push('pp');  /* SOC 误差百分点的展示单位 */
    /* MG-001 键控 additive（MG001_G2B_SPEC_APPROVED v1.0 §1.3/§4 项 5；W6 落地面，
       CHG-20261110-01）：allowedUnits 增 '-'（无量纲——island_state；units 复用既有
       字典零新增，schema.js UNIT_DICT 已入 '-': 'dimensionless'，golden units 表同入）。
       systems.js UNITS 表缺 'm/s'/'°'/'-' 为 WT lambda_tip/cp_coeff 同款并发落地面
       （本波零扩展）——MG 键控改在本检查面补 '-'，既有五系统 allowedUnits 面零变化
       （WT units 状态维持其规格登记的现状，不在本波触碰）。 */
    if (system.id === 'MG-001') allowedUnits.push('-');
    (system.signals || []).forEach(function (sg) {
      if (!sg.unit || typeof sg.unit !== 'string') unitIssues.push(sg.id + ' 缺单位');
      else if (allowedUnits.indexOf(sg.unit) === -1) unitIssues.push(sg.id + ' 单位未声明：' + sg.unit);
    });
    quality.push(check(
      'units', '单位与量纲声明',
      unitIssues.length === 0 ? 'pass' : 'fail',
      '全部信号单位在 modelManifest.units 中声明',
      unitIssues.length,
      unitIssues.length === 0
        ? ((system.signals || []).length + ' 个信号单位齐备（' + allowedUnits.join('/') + '；rpm/pp 为展示单位）')
        : ('单位问题：' + unitIssues.join('；'))
    ));

    /* ---- soc-bounds（按 system.bounds 派生：声明 bounds.SOC_pct 的系统（FL/FC/GT）才检查；
       PV-001 bounds 无 SOC_pct 键（有 load_kW/G0_W_m2），无 SOC 序列面，不派发——
       CHG-20261105-01 清算项 1；WT-001 同款口径不派发（bounds 无 SOC_pct 键，initial 无
       SOC 键——WT 无储能，WT001_G2B_SPEC_APPROVED v1.0 §1.1/§8 WT-G2b-04））---- */
    var socDeclared = !!(system.bounds && system.bounds.SOC_pct);
    if (socDeclared) {
      var socTrueRange = minMaxNonEmpty(series.SOC_true_pct);
      var socEstRange = minMaxNonEmpty(series.SOC_est_pct);
      var socViolation = 0;
      var socOk = !!(socTrueRange && socEstRange);
      if (socTrueRange) {
        if (socTrueRange.min < -1e-6) { socOk = false; socViolation = Math.max(socViolation, -socTrueRange.min); }
        if (socTrueRange.max > 100 + 1e-6) { socOk = false; socViolation = Math.max(socViolation, socTrueRange.max - 100); }
      }
      if (socEstRange) {
        if (socEstRange.min < -1e-6) { socOk = false; socViolation = Math.max(socViolation, -socEstRange.min); }
        if (socEstRange.max > 100 + 1e-6) { socOk = false; socViolation = Math.max(socViolation, socEstRange.max - 100); }
      }
      quality.push(check(
        'soc-bounds', 'SOC 物理边界',
        socOk ? 'pass' : 'fail',
        'SOC_true 与 SOC_est ∈ [0, 100] %',
        socViolation,
        socOk
          ? ('SOC_true ∈ [' + socTrueRange.min.toFixed(5) + ', ' + socTrueRange.max.toFixed(5) + '] %；SOC_est ∈ [' +
            socEstRange.min.toFixed(5) + ', ' + socEstRange.max.toFixed(5) + '] %')
          : ('SOC 越界，最大越界量 ' + socViolation.toFixed(6) + ' pp')
      ));
    }

    /* ---- event-window（G0-DEC-05：pre = t_f 左极限，t_s 恒为 t_f；19.9 不是 pre）---- */
    var eventOk;
    var eventMsg;
    if (!faulted) {
      eventOk = true;
      eventMsg = '健康基准运行无故障事件（events 为空属预期）';
    } else {
      var tStart = cfg.fault.t_start_s;
      var gridAligned = Math.abs(tStart / dt - Math.round(tStart / dt)) < 1e-9;
      var ev = events[0];
      var evAligned = !!ev && Math.abs(ev.trigger_s - tStart) < 1e-9;
      var pre = snapshots.length >= 2 ? snapshots.filter(function (s) { return s.phase === 'pre'; })[0] : null;
      var post = snapshots.length >= 2 ? snapshots.filter(function (s) { return s.phase === 'post'; })[0] : null;
      var preOk = !!pre && Math.abs(pre.t_s - tStart) < 1e-9 && pre.derivation === 'left_limit';
      var postOk = !!post && Math.abs(post.t_s - tStart) < 1e-9 && post.derivation === 'post_sample';
      var varsOk = !!(pre && pre.variables && Object.keys(pre.variables).length);
      eventOk = gridAligned && evAligned && preOk && postOk && varsOk;
      eventMsg = eventOk
        ? ('事件 t=' + tStart.toFixed(1) + ' s 对齐 0.1 s 网格；pre/post 快照 t_s 均为 ' + tStart.toFixed(1) +
          ' s（pre=左极限 left_limit，post=右采样行 post_sample），含 ' + Object.keys(pre.variables).length + ' 个变量；19.9 s 只是上一常规采样点')
        : ('事件窗口检查失败：网格' + (gridAligned ? 'OK' : '异常') + '，事件' + (evAligned ? 'OK' : '异常') +
          '，pre 快照' + (preOk ? 'OK' : '异常') + '（t_s 必须为 ' + tStart.toFixed(1) + ' 且 derivation=left_limit）' +
          '，post 快照' + (postOk ? 'OK' : '异常'));
    }
    quality.push(check(
      'event-window', '事件与快照相位',
      eventOk ? 'pass' : 'fail',
      'pre.t_s = post.t_s = t_f（20.0），derivation = left_limit / post_sample',
      faulted ? cfg.fault.t_start_s : 0,
      eventMsg,
      faulted ? cfg.fault.t_start_s : null, 'numeric'
    ));

    /* ---- energy-balance（与 soc-bounds 同一 bounds 派生面：声明 bounds.SOC_pct 的系统
       （FL/FC/GT，均带 E_bat 电池面）才检查；PV-001 无 SOC/E_bat 面，不派发——
       其能量恒等由专属 PHY 检查 pv-energy-consistency 承载。CHG-20261105-01 清算项 1；
       WT-001 同款口径不派发，能量恒等由 wt-energy-identity 承载——WT-G2b-04）----
       FL-001 thermal_model=on 分支（EQ-FLTH-9 检查式，FL001_THERMAL_G2B_SPEC_APPROVED
       v1.0 §2.2.0 守恒面 (a) / FLTH-G2b-04，CHG-20261107-01）：判据扩为
       E_source + E_bat − E_load − E_loss ≡ 0（E_source 已含损耗补偿，engine integrals
       E_source = E_load − E_bat + E_loss 同源）；容差沿本检查既有 FL 档 1e-6 kWh 不变。
       off/PV/FC/GT 路径零变化。 ---- */
    if (socDeclared) {
      var eSource = metricValue(metrics, 'E_source_kWh');
      var eBat = metricValue(metrics, 'E_bat_kWh');
      var eServed = metricValue(metrics, 'E_load_served_kWh');
      var balanceTol = system.id === 'GT-001' ? 1e-3 : (system.id === 'FC-001' ? 1e-3 : 1e-6);
      var flThermalBal = system.id === 'FL-001' && !!(cfg && cfg.thermal_model === 'on');
      var residual = null;
      var balanceMsg;
      if (eSource === null || eBat === null || eServed === null) {
        balanceMsg = '能量指标不可用，无法校验能量平衡';
      } else if (system.id === 'GT-001') {
        var fArr = series.f_true_Hz;
        var fFirst = fArr && isNum(fArr[0]) ? fArr[0] : null;
        var fLast = fArr && isNum(fArr[fArr.length - 1]) ? fArr[fArr.length - 1] : null;
        if (fFirst === null || fLast === null) {
          balanceMsg = '频率信号不可用，无法校验含转子项的能量平衡';
        } else {
          var eRotor = (5.0 * (fLast - fFirst)) / 3600;
          residual = Math.abs(eSource + eBat - eServed - eRotor);
          balanceMsg = '|E_gen + E_bat − E_load − E_rotor| = ' + residual.toExponential(3) +
            ' kWh（E_rotor = K_J·Δf/3600 = ' + eRotor.toExponential(3) + ' kWh）';
        }
      } else if (flThermalBal) {
        var eLossBal = metricValue(metrics, 'E_loss_kWh');
        if (eLossBal === null) {
          balanceMsg = '热域损耗指标不可用，无法校验含损耗项的能量平衡（EQ-FLTH-9）';
        } else {
          residual = Math.abs(eSource + eBat - eServed - eLossBal);
          balanceMsg = '|E_source + E_bat − E_load − E_loss| = ' + residual.toExponential(3) +
            ' kWh（E_loss = ' + eLossBal.toExponential(3) + ' kWh，thermal on 记账口径，EQ-FLTH-9）';
        }
      } else {
        residual = Math.abs(eSource + eBat - eServed);
        balanceMsg = '|E_source + E_bat − E_load_served| = ' + residual.toExponential(3) + ' kWh';
      }
      var balanceOk = residual !== null && residual <= balanceTol;
      quality.push(check(
        'energy-balance', '电能平衡',
        balanceOk ? 'pass' : 'fail',
        '≤ ' + balanceTol + ' kWh' + (system.id === 'GT-001' ? '（含转子动能变化项）'
          : (flThermalBal ? '（含热损耗记账项 E_loss，EQ-FLTH-9）' : '')),
        residual,
        balanceOk ? balanceMsg : ('电能平衡超差：' + balanceMsg)
      ));
    }

    return quality;
  }

  FL.core.checks = { evaluate: evaluate };
})();
