/* owner: core-contract | module: golden-compare | contract: V312_BACKEND_ADMISSION_CHECKLIST §3 / FL19_BACKEND_RFC_APPROVED §5
   后端 Run 的 vs-golden 容差校验器（BK-E03 判定载体，纯函数、零 DOM、零 fs——
   golden 对象由调用方注入：Node 测试经 fs 读入；浏览器路径（增补二）经 fetch 注入）。
   容差档（RFC §5.1 声明制）：
     - fl001-analytic-crosscheck：直接采用 golden.tolerances.analytic_crosscheck（单一来源）；
     - fl001-rk4-dt0.1：声明档（上限值，量化预算冻结前适用）。
   判定：golden.series 逐点（按信号类选容差）+ golden.metrics 同名项。超差即违规项列出，
   调用方（组装层）据其置 quality_checks fail 并触发 BK-E03。 */
(function () {
  'use strict';
  var FL = window.FL = window.FL || {};

  var PROFILES = {
    'fl001-analytic-crosscheck': { source: 'golden.analytic_crosscheck' },
    'fl001-rk4-dt0.1': {
      series_rtol: 1e-3, series_atol: 1e-6,
      E_abs: 5e-4, SOC_pp: 5e-3, metric_rtol: 1e-3
    }
  };

  function classOf(key) {
    if (/^I_/.test(key) || key === 'bias_A') return 'I';
    if (/^P_/.test(key)) return 'P';
    if (/^SOC_/.test(key)) return 'SOC';
    if (key === 'r_true_kW' || key.indexOf('r_true') === 0) return 'r_true';
    if (key === 'r_meas_kW' || key.indexOf('r_meas') === 0) return 'r_meas';
    return 'other';
  }

  function tolFor(profile, cls, goldenTol) {
    if (profile === 'fl001-analytic-crosscheck') {
      var g = goldenTol || {};
      switch (cls) {
        case 'I': return { rtol: g.I_A_rtol, atol: g.I_A_atol };
        case 'P': return { rtol: g.P_kW_rtol, atol: g.P_kW_atol };
        case 'SOC': return { rtol: null, atol: g.SOC_pp_atol };
        case 'r_true': return { rtol: null, atol: g.r_true_kW };
        case 'r_meas': return { rtol: null, atol: g.r_meas_kW_atol };
        default: return { rtol: 1e-12, atol: 1e-15 };
      }
    }
    var p = PROFILES[profile];
    switch (cls) {
      case 'SOC': return { rtol: null, atol: p.SOC_pp };
      case 'r_true': return { rtol: null, atol: p.series_atol };
      case 'r_meas': return { rtol: null, atol: p.series_atol };
      default: return { rtol: p.series_rtol, atol: p.series_atol };
    }
  }

  function within(v, ref, tol) {
    /* 缺省分量不参与：rtol 缺 → 0 权重；atol 缺 → 不设限（该类在所选档未声明）。 */
    var r = tol.rtol == null ? 0 : tol.rtol;
    var a = tol.atol == null ? Infinity : tol.atol;
    var diff = Math.abs(v - ref);
    return diff <= a + r * Math.abs(ref);
  }

  /* produced: {t, signals:{id:[…]}, metrics:{name:{value,…}}}
     goldenRun: golden.runs.<run>；goldenTol: golden.tolerances（analytic 档单一来源） */
  function goldenCompare(produced, goldenRun, profileId, goldenTol) {
    var violations = [];
    if (!PROFILES[profileId]) {
      return { ok: false, profile: profileId, violations: [{ kind: 'profile', key: profileId, detail: '未注册容差档' }] };
    }
    var gs = goldenRun.series || {};
    var ps = produced.signals || {};
    ['t'].concat(Object.keys(gs)).forEach(function (key) {
      if (key === 't') {
        var gt = gs.t, pt = produced.t;
        if (!pt || pt.length !== gt.length) {
          violations.push({ kind: 'grid', key: 't', detail: '点数不符：golden ' + gt.length + ' vs 后端 ' + (pt ? pt.length : 'null') });
          return;
        }
        for (var i = 0; i < gt.length; i++) {
          if (Math.abs(gt[i] - pt[i]) > 1e-9) {
            violations.push({ kind: 'grid', key: 't[' + i + ']', detail: '时间网格偏差 ' + Math.abs(gt[i] - pt[i]) });
            break;
          }
        }
        return;
      }
      var mine = ps[key];
      if (!mine || mine.length !== gs[key].length) {
        violations.push({ kind: 'missing', key: key, detail: '后端未产出该信号或点数不符' });
        return;
      }
      var tol = tolFor(profileId, classOf(key), goldenTol);
      for (var j = 0; j < gs[key].length; j++) {
        var ref = gs[key][j], v = mine[j];
        if (ref === null || v === null) {
          if (ref !== v) { violations.push({ kind: 'series', key: key + '[' + j + ']', detail: 'null 位形不一致' }); break; }
          continue;
        }
        if (!within(v, ref, tol)) {
          violations.push({ kind: 'series', key: key + '[' + j + ']',
            detail: '超差：golden ' + ref + ' vs 后端 ' + v + '（' + (v - ref) + '）' });
          break;
        }
      }
    });
    var gm = goldenRun.metrics || {};
    Object.keys(produced.metrics || {}).forEach(function (name) {
      if (!(name in gm)) return;
      var ref = gm[name].value, v = produced.metrics[name].value;
      var cls = classOf(name);
      var tol;
      if (profileId === 'fl001-analytic-crosscheck') {
        tol = (cls === 'SOC') ? { rtol: null, atol: goldenTol.SOC_pp_atol }
          : (cls === 'r_meas') ? { rtol: null, atol: goldenTol.r_meas_kW_atol }
          : (cls === 'r_true') ? { rtol: null, atol: goldenTol.r_true_kW }
          : (cls === 'I') ? { rtol: goldenTol.I_A_rtol, atol: goldenTol.I_A_atol }
          : { rtol: goldenTol.E_kWh_rtol != null ? goldenTol.E_kWh_rtol : goldenTol.E_kWh, atol: goldenTol.E_kWh_atol != null ? goldenTol.E_kWh_atol : goldenTol.E_kWh };
      } else {
        tol = (cls === 'SOC') ? { rtol: null, atol: PROFILES[profileId].SOC_pp }
          : (name.indexOf('E_') === 0) ? { rtol: null, atol: PROFILES[profileId].E_abs }
          : { rtol: PROFILES[profileId].metric_rtol, atol: 1e-9 };
      }
      if (!within(v, ref, tol)) {
        violations.push({ kind: 'metric', key: name, detail: '超差：golden ' + ref + ' vs 后端 ' + v });
      }
    });
    return { ok: violations.length === 0, profile: profileId, violations: violations };
  }

  FL.core.goldenCompare = goldenCompare;
  FL.core.GOLDEN_PROFILES = PROFILES;
})();
