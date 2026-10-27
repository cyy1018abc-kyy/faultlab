/* owner: lead | module: protocol | contract: docs/CONTRACT.md */
(function () {
  'use strict';
  const FL = window.FL = window.FL || {};

  const VERSION = '0.1.0';

  /* ---------- source_kind 词汇（全站唯一枚举） ---------- */
  const SOURCE_KIND_LIST = ['CONFIG', 'MODEL_STATE', 'OBSERVATION', 'CONTROLLER', 'FAULT_EVENT', 'DERIVED', 'MODEL_ASSUMPTION'];
  const SOURCE_KINDS = {
    CONFIG: { id: 'CONFIG', label: '配置', full: 'CONFIG', desc: '用户/实验配置直接给定的事实，不随时间变化。' },
    MODEL_STATE: { id: 'MODEL_STATE', label: '模型状态', full: 'MODEL_STATE', desc: '由模型方程计算出的真实物理状态。' },
    OBSERVATION: { id: 'OBSERVATION', label: '观测', full: 'OBSERVATION', desc: '传感器/量测通道输出，可能被故障污染。' },
    CONTROLLER: { id: 'CONTROLLER', label: '控制器', full: 'CONTROLLER', desc: '控制器的目标值、指令或内部模式。' },
    FAULT_EVENT: { id: 'FAULT_EVENT', label: '故障事件', full: 'FAULT_EVENT', desc: '故障注入事件本身（幅值/时刻/作用通道）。' },
    DERIVED: { id: 'DERIVED', label: '派生', full: 'DERIVED', desc: '由其他信号按明确公式派生，如守恒残差。' },
    MODEL_ASSUMPTION: { id: 'MODEL_ASSUMPTION', label: '模型假设', full: 'MODEL_ASSUMPTION', desc: '模型前置假设（理想母线、理想平衡源等）。' }
  };

  function sourceMeta(kind) {
    return SOURCE_KINDS[kind] || { id: kind || 'UNKNOWN', label: '未知', full: String(kind), desc: '' };
  }

  /* ---------- 数值格式化 ---------- */
  const DASH = '—';

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  function fixed(v, digits) {
    if (!isNum(v)) return DASH;
    const d = (digits === undefined || digits === null) ? 2 : digits;
    let s = v.toFixed(d);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    if (s === '-0') s = '0';
    return s;
  }

  function group(v) {
    const parts = String(v).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }

  const fmt = {
    dash: DASH,
    /** 固定小数位（默认 2），非数值给 —（不填 0） */
    num(v, digits) {
      if (!isNum(v)) return DASH;
      const d = digits === undefined ? 2 : digits;
      return group(v.toFixed(d));
    },
    int(v) { return isNum(v) ? group(String(Math.round(v))) : DASH; },
    /** 带符号（用于变化量/残差） */
    signed(v, digits) {
      if (!isNum(v)) return DASH;
      const s = fmt.num(Math.abs(v), digits === undefined ? 2 : digits);
      return (v > 0 ? '+' : v < 0 ? '−' : '±') + s;
    },
    pct(v, digits) { return isNum(v) ? fmt.num(v, digits === undefined ? 3 : digits) + '%' : DASH; },
    pp(v, digits) {
      if (!isNum(v)) return DASH;
      const s = fmt.num(Math.abs(v), digits === undefined ? 3 : digits);
      return (v > 0 ? '+' : v < 0 ? '−' : '±') + s + ' pp';
    },
    unit(v, unit, digits) {
      const s = fmt.num(v, digits === undefined ? 2 : digits);
      return s === DASH ? DASH : s + (unit ? ' ' + unit : '');
    },
    time(t, digits) {
      return isNum(t) ? fmt.num(t, digits === undefined ? 1 : digits) + ' s' : DASH;
    },
    clock(t) {
      return isNum(t) ? t.toFixed(1) + ' / 60.0 s' : DASH;
    },
    hash(h, head) {
      if (!h) return DASH;
      return head === false ? h : String(h).slice(0, 8);
    },
    timestamp(iso) {
      if (!iso) return DASH;
      try {
        const d = new Date(iso);
        const p = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
      } catch (e) { return DASH; }
    }
  };

  /* ---------- 时间轴/采样工具（页面只读 run） ---------- */
  function nearestIndex(run, t) {
    if (!run || !run.timeseries || !run.timeseries.t) return -1;
    const times = run.timeseries.t;
    if (!times.length) return -1;
    const dt = run.config && run.config.dt_s ? run.config.dt_s : 0.1;
    let idx = Math.round((Number(t) - times[0]) / dt);
    if (!isFinite(idx)) idx = 0;
    return Math.max(0, Math.min(times.length - 1, idx));
  }

  function sampleAt(run, signalId, t) {
    if (!run || !run.timeseries) return { value: null, index: -1, t: null };
    const idx = nearestIndex(run, t);
    const arr = run.timeseries.signals ? run.timeseries.signals[signalId] : null;
    return {
      value: arr && idx >= 0 ? arr[idx] : null,
      index: idx,
      t: idx >= 0 ? run.timeseries.t[idx] : null
    };
  }

  function sampleAll(run, t, signalIds) {
    const out = {};
    const idx = nearestIndex(run, t);
    if (!run || !run.timeseries || idx < 0) return out;
    const signals = run.timeseries.signals || {};
    const ids = signalIds && signalIds.length ? signalIds : Object.keys(signals);
    ids.forEach((id) => {
      const arr = signals[id];
      out[id] = arr ? arr[idx] : null;
    });
    return out;
  }

  function slice(run, signalId, t0, t1) {
    if (!run || !run.timeseries) return [];
    const times = run.timeseries.t;
    const arr = run.timeseries.signals ? run.timeseries.signals[signalId] : null;
    if (!arr) return [];
    const out = [];
    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      if (t < t0 || t > t1) continue;
      out.push([t, arr[i]]);
    }
    return out;
  }

  function signalsOf(run) {
    if (run && run.signals && run.signals.length) return run.signals;
    return [];
  }

  function signalById(run, id) {
    const list = signalsOf(run);
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function signalsByCategory(run) {
    const map = {};
    signalsOf(run).forEach((s) => {
      (map[s.category] = map[s.category] || []).push(s);
    });
    return map;
  }

  function categorySignals(run, categoryId) {
    return signalsOf(run).filter((s) => s.category === categoryId);
  }

  function visibleSignals(run, { includeTableOnly = false } = {}) {
    return signalsOf(run).filter((s) => includeTableOnly || !s.tableOnly);
  }

  function metricById(run, metricId) {
    if (!run || !run.metrics) return null;
    for (let i = 0; i < run.metrics.length; i++) if (run.metrics[i].metric_id === metricId) return run.metrics[i];
    return null;
  }

  function faultEvent(run) {
    if (!run || !run.events) return null;
    for (let i = 0; i < run.events.length; i++) {
      const ev = run.events[i];
      if (ev && ev.event_type && ev.event_type !== 'healthy') return ev;
    }
    return run.events[0] || null;
  }

  function validateRun(run) {
    const problems = [];
    if (!run || typeof run !== 'object') return { ok: false, problems: ['run 为空'] };
    if (!run.timeseries || !Array.isArray(run.timeseries.t)) problems.push('缺少 timeseries.t');
    else if (run.timeseries.t.length !== 601) problems.push('采样点不是 601');
    if (!run.signals || !run.signals.length) problems.push('缺少 signals 元数据');
    return { ok: problems.length === 0, problems };
  }

  FL.protocol = {
    VERSION,
    SOURCE_KIND_LIST,
    SOURCE_KINDS,
    sourceMeta,
    fmt,
    isNum,
    nearestIndex,
    sampleAt,
    sampleAll,
    slice,
    signalsOf,
    signalById,
    signalsByCategory,
    categorySignals,
    visibleSignals,
    metricById,
    faultEvent,
    validateRun
  };
})();
