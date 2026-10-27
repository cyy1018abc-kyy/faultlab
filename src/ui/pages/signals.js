/* owner: chart-signals | module: page-signals | contract: docs/CONTRACT.md */
/*
 * 实时曲线页（规格 §5 / 契约 §8 §10 §13）
 *
 * - 顶部：信号分类、基准叠加、表格模式、导出 CSV、恢复默认
 * - 左：信号通道勾选（线型示意 + source_kind 标签 + 至少保留一个）
 * - 中：Canvas 主图（真实/测量/目标/偏置、20 s 事件、游标、缩放窗口、跳转）
 * - 右：数据快照（时刻 / 值 / 单位 / 来源 / 计算说明）+ pre/post 事件快照 + 采样点元数据
 * - 每帧 time 更新走轻量路径：只重绘 canvas / 刷新数值，不重建 DOM
 * - state.truthSealed=true 时隐藏 MODEL_STATE / FAULT_EVENT 通道，禁用事件与导出
 */
(function () {
  'use strict';

  var FL = window.FL = window.FL || {};
  var pages = FL.pages = FL.pages || {};

  var PRECISION_DEFAULT = 2;
  var MIN_WINDOW_SPAN = 0.5;
  var TOKEN_CSS = {
    acc: 'var(--acc)',
    obs: 'var(--obs)',
    warm: 'var(--warm)',
    fault: 'var(--fault)',
    ok: 'var(--ok)',
    warn: 'var(--warn)',
    ink: 'var(--ink-1)',
    derived: 'var(--derived)'
  };

  var page = {
    mounted: false,
    root: null,
    api: null,
    state: null,
    view: null,
    chart: null,
    socZoom: false,
    viewKey: '',
    lastSelectedSignal: null,
    pairs: { key: '', map: {} },
    basePairs: { key: '', map: {} },
    signalRows: [],
    snapRows: [],
    tableRows: [],
    tableRowIndex: -1,
    tooltipRows: [],
    catKey: '',
    listStructKey: '',
    zoomKey: '',
    eventsKey: '',
    snapsKey: '',
    eventSnapsKey: '',
    detailKey: '',
    tableKey: '',
    footerSystem: '',
    finiteCache: { key: '', map: {} },
    resizeHandler: null
  };

  /* ================================================================== *
   * 小工具
   * ================================================================== */

  function h() {
    return page.api.ui.h.apply(null, arguments);
  }

  function uiGet() {
    return page.api ? page.api.ui : FL.ui;
  }

  function icon(name, opts) {
    return uiGet().icon(name, opts);
  }

  function toast(msg, tone) {
    if (page.api && page.api.toast) return page.api.toast(msg, tone || 'info');
    if (FL.store && FL.store.actions && FL.store.actions.toast) return FL.store.actions.toast(msg, tone || 'info');
    if (window.console) window.console.info('[signals]', msg);
    return null;
  }

  function actions() {
    return (page.api && page.api.actions) || (FL.store && FL.store.actions) || null;
  }

  function callAction(name) {
    var acts = actions();
    if (!acts || typeof acts[name] !== 'function') return null;
    var args = Array.prototype.slice.call(arguments, 1);
    try {
      return acts[name].apply(acts, args);
    } catch (err) {
      if (window.console) window.console.error('[signals] 动作失败 ' + name, err);
      toast('操作失败：' + (err && err.message ? err.message : err), 'danger');
      return null;
    }
  }

  function protocol() {
    return (page.api && page.api.protocol) || FL.protocol || null;
  }

  function fmt() {
    return (page.api && page.api.fmt) || (FL.protocol && FL.protocol.fmt) || null;
  }

  function fmtNum(v, digits) {
    var f = fmt();
    if (f && typeof f.num === 'function') return f.num(v, digits);
    if (v == null || !isFinite(v)) return '—';
    return Number(v).toFixed(digits == null ? PRECISION_DEFAULT : digits);
  }

  function fmtSigned(v, digits) {
    var f = fmt();
    if (f && typeof f.signed === 'function') return f.signed(v, digits);
    if (v == null || !isFinite(v)) return '—';
    return (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(digits == null ? PRECISION_DEFAULT : digits);
  }

  function isFiniteNumber(v) {
    return typeof v === 'number' && isFinite(v);
  }

  function fmtValue(sig, v) {
    if (!isFiniteNumber(v)) return '—';
    var p = sig && sig.precision != null ? sig.precision : PRECISION_DEFAULT;
    return fmtNum(v, p);
  }

  function systemGet(systemId) {
    var systems = (page.api && page.api.systems) || FL.systems;
    try {
      return systems && systems.get ? systems.get(systemId) : null;
    } catch (e) {
      return null;
    }
  }

  function sourceTag(kind) {
    var ui = uiGet();
    if (ui && ui.sourceTag) return ui.sourceTag(kind);
    return h('span', { class: 'source-tag', 'data-kind': kind || '' }, kind || '');
  }

  function sourceLabel(kind) {
    var proto = protocol();
    if (proto && typeof proto.sourceMeta === 'function') {
      var meta = proto.sourceMeta(kind);
      if (meta && meta.label) return meta.label;
    }
    return kind || '—';
  }

  function badge(text, tone) {
    var ui = uiGet();
    if (ui && ui.badge) return ui.badge(text, { tone: tone || 'neutral' });
    return h('span', { class: 'badge', 'data-tone': tone || 'neutral' }, text);
  }

  function swatch(colorToken, style, extraClass) {
    var ui = uiGet();
    var color = TOKEN_CSS[colorToken] || TOKEN_CSS.ink;
    var node = (ui && ui.lineSwatch)
      ? ui.lineSwatch(style || 'solid', color, 2)
      : h('span', { class: 'ls-swatch', 'data-style': style || 'solid', style: { borderTopColor: color } });
    if (extraClass) node.classList.add(extraClass);
    return node;
  }

  function setHidden(el, hidden) {
    if (!el) return;
    if (hidden) el.setAttribute('hidden', '');
    else el.removeAttribute('hidden');
  }

  function clear(el) {
    var ui = uiGet();
    if (ui && ui.clear) ui.clear(el);
    else if (el) el.textContent = '';
  }

  function button(label, opts) {
    var o = opts || {};
    return h('button', {
      class: 'btn btn-sm ' + (o.variant || 'btn-ghost'),
      type: 'button',
      title: o.title || '',
      disabled: !!o.disabled,
      'aria-label': o.ariaLabel || label,
      on: { click: o.onClick || function () {} }
    }, [o.icon ? icon(o.icon, { size: 13 }) : null, h('span', {}, label)]);
  }

  /* ================================================================== *
   * 数据派生
   * ================================================================== */

  function signalVisible(ps, sig) {
    var map = (ps && ps.visible) || {};
    if (Object.prototype.hasOwnProperty.call(map, sig.id)) return !!map[sig.id];
    return !(sig.chart && sig.chart.defaultVisible === false);
  }

  /** 信号是否至少有一个有限采样（全 null 的执行器通道不参与轴单位/图例统计） */
  function signalHasFinite(run, id) {
    if (!run || !run.timeseries) return false;
    var key = run.runId || '';
    if (page.finiteCache.key !== key) {
      page.finiteCache.key = key;
      page.finiteCache.map = {};
    }
    if (Object.prototype.hasOwnProperty.call(page.finiteCache.map, id)) return page.finiteCache.map[id];
    var arr = run.timeseries.signals ? run.timeseries.signals[id] : null;
    var found = false;
    if (arr) {
      for (var i = 0; i < arr.length; i++) {
        var v = arr[i];
        if (typeof v === 'number' && isFinite(v)) { found = true; break; }
      }
    }
    page.finiteCache.map[id] = found;
    return found;
  }

  function eventList(run) {
    if (!run || !run.events) return [];
    var out = [];
    for (var i = 0; i < run.events.length; i++) {
      var ev = run.events[i];
      if (!ev) continue;
      if (ev.event_type === 'healthy') continue;
      if (!isFiniteNumber(+ev.trigger_s)) continue;
      out.push(ev);
    }
    out.sort(function (a, b) { return a.trigger_s - b.trigger_s; });
    return out;
  }

  function faultTime(run) {
    var evs = eventList(run);
    if (evs.length) return evs[0].trigger_s;
    if (run && run.config && run.config.fault && run.config.fault.family &&
        run.config.fault.family !== 'none' && isFiniteNumber(+run.config.fault.t_start_s)) {
      return +run.config.fault.t_start_s;
    }
    return null;
  }

  function baselineInfo(state, run) {
    var base = state.baselineRun;
    if (!base) return { ok: false, reason: '尚无无故障基准运行' };
    if (!run) return { ok: false, reason: '当前没有运行' };
    if (base.runId === run.runId) return { ok: false, reason: '基准运行与当前运行相同' };
    if (base.systemId !== run.systemId) return { ok: false, reason: '基准运行属于其他系统' };
    var bc = base.config || {};
    var rc = run.config || {};
    if (bc.duration_s !== rc.duration_s) return { ok: false, reason: '基准运行时长不一致' };
    if (bc.dt_s !== rc.dt_s) return { ok: false, reason: '基准运行采样步长不一致' };
    if (!base.timeseries || !base.timeseries.signals) return { ok: false, reason: '基准运行数据不完整' };
    return { ok: true, run: base };
  }

  function resolveWindow(ps, run) {
    var dur = run && run.config && isFiniteNumber(run.config.duration_s) ? run.config.duration_s : 60;
    var ev = faultTime(run);
    var zoom = ps.zoom === 'fault' ? 'fault' : (ps.zoom === 'custom' ? 'custom' : 'full');
    // 兼容外部页面（因果/系统）只写 viewWindow、未显式写 zoom 的深链场景
    if (zoom === 'full' && Array.isArray(ps.viewWindow) && ps.viewWindow.length >= 2 &&
        isFiniteNumber(+ps.viewWindow[0]) && isFiniteNumber(+ps.viewWindow[1])) {
      zoom = 'custom';
    }
    if (zoom === 'fault') {
      if (ev == null) return { zoom: 'full', win: null };
      return { zoom: 'fault', win: [Math.max(0, ev - 5), Math.min(dur, ev + 5)] };
    }
    if (zoom === 'custom') {
      var w = ps.viewWindow;
      if (Array.isArray(w) && w.length >= 2 && isFiniteNumber(+w[0]) && isFiniteNumber(+w[1])) {
        var a = Math.max(0, Math.min(dur, +w[0]));
        var b = Math.max(0, Math.min(dur, +w[1]));
        if (b > a + MIN_WINDOW_SPAN - 1e-9) return { zoom: 'custom', win: [a, b] };
      }
      if (ev != null) return { zoom: 'custom', win: [Math.max(0, ev - 5), Math.min(dur, ev + 5)] };
      return { zoom: 'custom', win: [0, dur] };
    }
    return { zoom: 'full', win: null };
  }

  function validateSignals(run, catSignals) {
    var problems = [];
    if (!run || !run.timeseries || !Array.isArray(run.timeseries.t)) {
      return { ok: false, problems: ['缺少时间轴数据'] };
    }
    var t = run.timeseries.t;
    var dur = run.config && isFiniteNumber(run.config.duration_s) ? run.config.duration_s : 60;
    if (t.length < 2) problems.push('采样点过少（' + t.length + ' 点）');
    else if (Math.abs(t[0]) > 1e-6) problems.push('时间轴不是从 0 s 开始');
    else if (Math.abs(t[t.length - 1] - dur) > 1e-6) problems.push('时间轴末点与运行时长 ' + dur + ' s 不一致');
    var data = run.timeseries.signals || {};
    for (var i = 0; i < catSignals.length; i++) {
      var sig = catSignals[i];
      var arr = data[sig.id];
      if (!arr) { problems.push('信号 ' + sig.id + ' 缺少采样数据'); continue; }
      if (arr.length !== t.length) problems.push('信号 ' + sig.id + ' 长度（' + arr.length + '）与时钟（' + t.length + '）不一致');
      if (typeof sig.unit !== 'string') problems.push('信号 ' + sig.id + ' 缺少单位定义');
    }
    return { ok: problems.length === 0, problems: problems };
  }

  function computeSoc(run, visibleChart, win, dur) {
    var lo = Infinity;
    var hi = -Infinity;
    var t = run.timeseries.t;
    var t0 = win ? win[0] : 0;
    var t1 = win ? win[1] : dur;
    var i0 = 0;
    var i1 = t.length - 1;
    for (var k = 0; k < t.length; k++) {
      if (t[k] >= t0) { i0 = k; break; }
    }
    for (var m = t.length - 1; m >= 0; m--) {
      if (t[m] <= t1) { i1 = m; break; }
    }
    var arrays = [];
    for (var i = 0; i < visibleChart.length; i++) {
      var arr = run.timeseries.signals[visibleChart[i].id];
      if (!arr) continue;
      arrays.push(arr);
      for (var j = i0; j <= i1; j++) {
        var v = arr[j];
        if (isFiniteNumber(v)) {
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
      }
    }
    var maxDiff = null;
    if (arrays.length >= 2) {
      for (var q = i0; q <= i1; q++) {
        var a = arrays[0][q];
        var b = arrays[1][q];
        if (isFiniteNumber(a) && isFiniteNumber(b)) {
          var diff = Math.abs(a - b);
          if (maxDiff == null || diff > maxDiff) maxDiff = diff;
        }
      }
    }
    if (!isFiniteNumber(lo) || !isFiniteNumber(hi)) return null;
    var span = hi - lo;
    var pad = span > 1e-9 ? Math.max(span * 0.08, 0.02) : 0.05;
    var dlo = Math.floor((lo - pad) * 100) / 100;
    var dhi = Math.ceil((hi + pad) * 100) / 100;
    if (dhi - dlo < 0.1) {
      dlo = Math.floor((lo - 0.05) * 100) / 100;
      dhi = Math.ceil((hi + 0.05) * 100) / 100;
    }
    return { domain: [dlo, dhi], lo: dlo, hi: dhi, span: dhi - dlo, maxDiff: maxDiff, dataLo: lo, dataHi: hi };
  }

  function derive(state) {
    var run = state.activeRun;
    var ps = state.pageState.signals || {};
    var sys = systemGet((run && run.systemId) || state.systemId);
    var cats = (sys && sys.signalCategories) || [];
    var cat = ps.category;
    var ci;
    for (ci = 0; ci < cats.length; ci++) if (cats[ci].id === cat) break;
    if (ci >= cats.length) {
      cat = cats.length ? cats[0].id : ((run && run.signals && run.signals[0] && run.signals[0].category) || 'current');
    }
    var sealed = !!state.truthSealed;
    var allSignals = (run && run.signals) || [];
    var catSignals = [];
    for (var s = 0; s < allSignals.length; s++) {
      var sig = allSignals[s];
      if (sig.category !== cat) continue;
      if (sealed && (sig.sourceKind === 'MODEL_STATE' || sig.sourceKind === 'FAULT_EVENT')) continue;
      catSignals.push(sig);
    }
    var visibleSet = {};
    var i;
    for (i = 0; i < catSignals.length; i++) {
      if (signalVisible(ps, catSignals[i])) visibleSet[catSignals[i].id] = true;
    }
    var chartSignals = [];
    var visibleChart = [];
    var tableOnlySignals = [];
    var visibleTableOnly = [];
    for (i = 0; i < catSignals.length; i++) {
      var cs = catSignals[i];
      if (cs.tableOnly) {
        tableOnlySignals.push(cs);
        if (visibleSet[cs.id]) visibleTableOnly.push(cs);
      } else {
        chartSignals.push(cs);
        if (visibleSet[cs.id]) visibleChart.push(cs);
      }
    }
    // 至少保留一个可绘制信号（防御性；UI 会阻止把最后一个也隐藏）
    if (!visibleChart.length && chartSignals.length) {
      visibleChart = [chartSignals[0]];
      visibleSet[chartSignals[0].id] = true;
    }
    var snapSignals = visibleChart.concat(visibleTableOnly);
    var zoom = resolveWindow(ps, run);
    var baseline = baselineInfo(state, run);
    var baselineOn = !!(ps.baselineOverlay && baseline.ok && !sealed);
    var dur = run && run.config && isFiniteNumber(run.config.duration_s) ? run.config.duration_s : 60;
    var invalid = validateSignals(run, catSignals);
    var catLabel = cat;
    for (i = 0; i < cats.length; i++) if (cats[i].id === cat) catLabel = cats[i].label;
    var rightUnits = [];
    for (i = 0; i < visibleChart.length; i++) {
      var ch = visibleChart[i].chart || {};
      if (ch.axis !== 'right') continue;
      if (!signalHasFinite(run, visibleChart[i].id)) continue;
      if (visibleChart[i].unit && rightUnits.indexOf(visibleChart[i].unit) < 0) {
        rightUnits.push(visibleChart[i].unit);
      }
    }
    var soc = null;
    if (cat === 'soc') soc = computeSoc(run, visibleChart, zoom.win, dur);
    return {
      run: run,
      sys: sys,
      ps: ps,
      cats: cats,
      cat: cat,
      catLabel: catLabel,
      sealed: sealed,
      catSignals: catSignals,
      chartSignals: chartSignals,
      visibleChart: visibleChart,
      tableOnlySignals: tableOnlySignals,
      visibleTableOnly: visibleTableOnly,
      snapSignals: snapSignals,
      visibleSet: visibleSet,
      zoom: zoom,
      baseline: baseline,
      baselineOn: baselineOn,
      events: sealed ? [] : eventList(run),
      invalid: invalid,
      duration: dur,
      rightUnits: rightUnits,
      soc: soc
    };
  }

  /* ================================================================== *
   * mount：静态骨架
   * ================================================================== */

  function buildEmptyHost(view) {
    var empty = h('div', { class: 'sig-mode sig-mode--empty' });
    empty.appendChild(uiGet().emptyState({
      icon: 'chart',
      title: '还没有可回放的运行',
      desc: '曲线页只展示当前实验运行的不可变数据。创建一个默认实验运行，或先到系统页配置故障并创建运行。',
      action: {
        label: '创建实验运行',
        icon: 'flask',
        onClick: function () {
          var res = callAction('createRun');
          if (res && res.ok) toast('已创建 ' + res.run.runId + ' · ' + (res.run.label || ''), 'ok');
          else if (res === null) {
            toast('store 尚未就绪，前往系统页创建运行', 'warn');
            callAction('navigate', 'system');
          }
        }
      }
    }));
    empty.appendChild(h('div', { class: 'sig-empty-actions' }, [
      button('前往系统页', { icon: 'sliders', onClick: function () { callAction('navigate', 'system'); } }),
      button('前往实验首页', { icon: 'home', onClick: function () { callAction('navigate', 'home'); } })
    ]));
    return empty;
  }

  function buildLoadingHost() {
    return h('div', { class: 'sig-mode sig-mode--loading fl-panel' }, [
      uiGet().loadingState({ text: '正在生成仿真数据…' }),
      h('p', { class: 'sig-mode-note' }, '数据就绪后才会显示真实 / 观测 / 目标 / 故障信号；计算期间不展示结论。')
    ]);
  }

  function buildErrorHost(view) {
    view.errorText = h('div', { class: 'sig-mode-error-text' }, '运行数据不可用。');
    return h('div', { class: 'sig-mode sig-mode--error fl-panel' }, [
      h('div', { class: 'notice', 'data-tone': 'danger', role: 'alert' }, [
        icon('warning', { size: 15 }),
        view.errorText
      ]),
      h('div', { class: 'sig-empty-actions' }, [
        button('重试创建运行', {
          icon: 'refresh', variant: 'btn-primary',
          onClick: function () {
            var res = callAction('createRun');
            if (res && res.ok) toast('已创建 ' + res.run.runId, 'ok');
          }
        }),
        button('前往系统页', { icon: 'sliders', onClick: function () { callAction('navigate', 'system'); } })
      ])
    ]);
  }

  function buildTopbar(view) {
    view.runLabel = h('span', { class: 'sig-run-label mono' }, '—');
    view.runMeta = h('span', { class: 'sig-run-meta' }, '');
    view.hashMeta = h('span', { class: 'sig-run-hash mono' }, '');
    view.metaBadges = h('span', { class: 'sig-meta-badges' });

    view.baselineSwitch = uiGet().switchControl({
      checked: false,
      label: '基准叠加',
      onChange: function (checked) {
        callAction('setPageState', 'signals', { baselineOverlay: !!checked });
      }
    });
    view.baselineHint = h('span', { class: 'sig-hint' }, '');
    view.baselineCreateBtn = button('创建基准运行', {
      icon: 'plus',
      title: '创建同配置、无故障的基准运行',
      onClick: function () {
        var run = callAction('ensureBaseline', { explicit: true });
        if (run && run.runId) toast('已准备基准运行 ' + run.runId, 'ok');
        else toast('基准运行创建失败，请先在系统页创建运行', 'warn');
      }
    });

    view.tableSwitch = uiGet().switchControl({
      checked: false,
      label: '表格模式',
      onChange: function (checked) {
        callAction('setPageState', 'signals', { tableMode: !!checked });
      }
    });

    view.exportBtn = button('导出 CSV', {
      icon: 'download',
      title: '导出当前运行的全量原始采样（601 点）',
      onClick: exportCsv
    });
    view.resetBtn = button('恢复默认', {
      icon: 'refresh',
      title: '复位缩放窗口与信号显隐（不会重新运行）',
      onClick: resetView
    });

    view.topbarCats = h('div', { class: 'sig-cats', role: 'group', 'aria-label': '信号分类' });

    return h('section', { class: 'sig-topbar fl-panel', 'aria-label': '曲线工具条' }, [
      h('div', { class: 'sig-topbar-main' }, [
        h('div', { class: 'sig-head-titles' }, [
          h('span', { class: 'eyebrow' }, 'SIGNALS · 实时曲线'),
          h('div', { class: 'sig-head-line' }, [view.runLabel, view.runMeta, view.hashMeta, view.metaBadges])
        ]),
        h('div', { class: 'sig-actions' }, [
          h('div', { class: 'sig-switch-wrap' }, [view.baselineSwitch, view.baselineHint]),
          view.baselineCreateBtn,
          view.tableSwitch,
          view.exportBtn,
          view.resetBtn
        ])
      ]),
      h('div', { class: 'sig-topbar-row' }, [
        view.topbarCats,
        h('span', { class: 'sig-topbar-note' }, '切换分类只改变图层，不影响播放与 Run')
      ])
    ]);
  }

  function buildSide(view) {
    view.signalList = h('div', { class: 'sig-list', role: 'group', 'aria-label': '信号显示开关' });
    view.baselineLegendHost = h('div', { class: 'sig-baseline-legend' });
    var legendItems = [
      ['solid', 'acc', '真实 / 模型状态'],
      ['dashed', 'obs', '测量 / 观测'],
      ['dashdot', 'warm', '控制器目标'],
      ['dotted', 'ink', '基准对照（45%）']
    ];
    var legend = h('div', { class: 'sig-legend' });
    legendItems.forEach(function (it) {
      legend.appendChild(h('div', { class: 'sig-legend-row' }, [
        swatch(it[1], it[0], it[1] === 'ink' ? 'sig-swatch--baseline' : null),
        h('span', {}, it[2])
      ]));
    });
    legend.appendChild(h('div', { class: 'sig-legend-row' }, [
      h('span', { class: 'sig-legend-fault', 'aria-hidden': 'true' }),
      h('span', {}, '故障事件（三角 + 斜纹）')
    ]));
    var legendHead = h('div', { class: 'sig-legend-head eyebrow' }, '线型语义');
    return h('aside', { class: 'sig-side fl-panel', 'aria-label': '信号通道' }, [
      h('div', { class: 'panel-head' }, [
        h('div', { class: 'panel-head-main' }, [
          h('div', { class: 'panel-title' }, '信号通道'),
          h('span', { class: 'panel-sub' }, '至少保留一个')
        ])
      ]),
      h('div', { class: 'sig-side-body' }, [
        view.signalList,
        view.baselineLegendHost,
        legendHead,
        legend
      ])
    ]);
  }

  function buildMain(view) {
    view.chartTitle = h('div', { class: 'panel-title' }, '电流曲线');
    view.chartSub = h('span', { class: 'panel-sub' }, '');
    view.socBadge = badge('量程已放大', 'warn');
    view.baselineBadge = badge('基准叠加', 'info');
    setHidden(view.socBadge, true);
    setHidden(view.baselineBadge, true);
    view.badges = h('div', { class: 'sig-chart-badges' }, [view.baselineBadge, view.socBadge]);

    view.chartCanvas = document.createElement('canvas');
    view.chartCanvas.className = 'sig-canvas';
    view.tooltip = h('div', { class: 'sig-tooltip', hidden: true, 'aria-hidden': 'true' });
    view.tooltipTime = h('div', { class: 'sig-tt-time' }, '');
    view.tooltipBody = h('div', { class: 'sig-tt-body' });
    view.tooltip.appendChild(view.tooltipTime);
    view.tooltip.appendChild(view.tooltipBody);
    view.chartWrap = h('div', { class: 'sig-chart-wrap' }, [view.chartCanvas, view.tooltip]);

    view.zoomSegHost = h('div', { class: 'sig-zoom-seg' });
    view.t0 = h('input', {
      class: 'input input--num', type: 'number', min: '0', max: '60', step: '0.1',
      value: '15', 'aria-label': '自定义窗口起始时刻（秒）'
    });
    view.t1 = h('input', {
      class: 'input input--num', type: 'number', min: '0', max: '60', step: '0.1',
      value: '25', 'aria-label': '自定义窗口结束时刻（秒）'
    });
    view.windowErr = h('span', { class: 'sig-inline-err', role: 'alert' }, '');
    view.customWindow = h('div', { class: 'sig-custom-window', hidden: true }, [
      h('label', { class: 'sig-t-label' }, [h('span', {}, 't₀'), view.t0]),
      h('span', { class: 'sig-t-dash' }, '–'),
      h('label', { class: 'sig-t-label' }, [h('span', {}, 't₁'), view.t1]),
      h('span', { class: 'sig-unit-tag mono' }, 's'),
      button('应用', { onClick: applyCustomWindow, title: '应用自定义时间窗口' }),
      view.windowErr
    ]);
    view.jumpBtn = button('跳到 20.0 s', {
      icon: 'flag',
      onClick: function () { jumpToFault(); }
    });
    view.prevEventBtn = button('前事件', { icon: 'skipback', onClick: function () { callAction('stepEvent', -1); } });
    view.nextEventBtn = button('后事件', { icon: 'skipforward', onClick: function () { callAction('stepEvent', 1); } });

    view.socZoomBtn = button('纵轴放大', {
      icon: 'gauge',
      onClick: function () {
        page.socZoom = !page.socZoom;
        page.viewKey = '';
        if (page.state) renderNow(page.state, 'view');
      }
    });
    view.socNote = h('span', { class: 'sig-zoom-note' }, '');
    view.socRow = h('div', { class: 'sig-y-row', hidden: true }, [view.socZoomBtn, view.socNote]);
    view.zoomNote = h('div', { class: 'sig-zoom-note sig-zoom-note--block', hidden: true });

    view.jumpGroup = h('div', { class: 'sig-jump-group' }, [view.jumpBtn, view.prevEventBtn, view.nextEventBtn]);
    view.chartFoot = h('div', { class: 'sig-chart-foot' }, [
      h('div', { class: 'sig-zoom-bar' }, [
        h('span', { class: 'eyebrow' }, '缩放窗口'),
        view.zoomSegHost,
        view.customWindow,
        h('span', { class: 'spacer' }),
        view.jumpGroup
      ]),
      view.zoomNote,
      view.socRow
    ]);

    view.chartPanel = h('section', { class: 'sig-chart-panel fl-panel', 'aria-label': '实时曲线主图' }, [
      h('div', { class: 'panel-head' }, [
        h('div', { class: 'panel-head-main' }, [view.chartTitle, view.chartSub]),
        view.badges
      ]),
      view.chartWrap,
      view.chartFoot
    ]);

    view.tableWrap = h('div', {
      class: 'sig-table-wrap', tabindex: '0', role: 'region', 'aria-label': '数据表格模式（可滚动）'
    });
    view.tablePanel = h('section', { class: 'sig-table-panel fl-panel', hidden: true, 'aria-label': '数据表格模式' }, [
      h('div', { class: 'panel-head' }, [
        h('div', { class: 'panel-head-main' }, [
          h('div', { class: 'panel-title' }, '数据表格模式'),
          h('span', { class: 'panel-sub' }, '与图表等价的 0.1 s 采样表；变量名与单位对屏幕阅读器可见')
        ])
      ]),
      view.tableWrap
    ]);

    return h('section', { class: 'sig-main' }, [view.chartPanel, view.tablePanel]);
  }

  function buildSnapshot(view) {
    view.snapTime = h('span', { class: 'sig-snap-time mono' }, '0.0 s');
    view.snapSub = h('span', { class: 'panel-sub' }, '');
    view.snapList = h('div', { class: 'sig-snap-list' });
    view.snapEventsSummary = h('summary', {}, '事件前后快照');
    view.snapEventsBody = h('div', { class: 'sig-events-body' });
    view.snapEvents = h('details', { class: 'sig-events-block', hidden: true }, [
      view.snapEventsSummary,
      view.snapEventsBody
    ]);
    view.snapTimeBig = h('span', { class: 'sig-snap-now mono' }, '0.0');
    view.detailT = h('span', { class: 'mono' }, '');
    view.detailBody = h('div', { class: 'sig-detail-body' });
    view.detail = h('div', { class: 'sig-detail', hidden: true }, [
      h('div', { class: 'sig-subhead' }, [h('span', {}, '采样点详情'), view.detailT]),
      view.detailBody
    ]);
    return h('aside', { class: 'sig-snap fl-panel', 'aria-label': '当前时刻数据快照' }, [
      h('div', { class: 'panel-head' }, [
        h('div', { class: 'panel-head-main' }, [
          h('div', { class: 'panel-title' }, '数据快照'),
          view.snapSub
        ]),
        view.snapTime
      ]),
      h('div', { class: 'sig-snap-body' }, [
        h('div', { class: 'sig-snap-head' }, [
          h('span', { class: 'eyebrow' }, '当前时刻'),
          view.snapTimeBig,
          h('span', { class: 'sig-snap-unit mono' }, 's')
        ]),
        view.detail,
        view.snapList,
        view.snapEvents
      ])
    ]);
  }

  function buildFootnote(view) {
    view.footText = h('div', { class: 'sig-foot-text' }, '');
    view.footList = h('ul', { class: 'sig-foot-list' });
    view.footDetails = h('details', { class: 'sig-foot-details' }, [
      h('summary', {}, '模型假设与局限'),
      view.footList
    ]);
    return h('footer', { class: 'sig-footnote' }, [
      h('span', { class: 'sig-foot-icon', 'aria-hidden': 'true' }, [icon('info', { size: 14 })]),
      view.footText,
      view.footDetails
    ]);
  }

  function buildSkeleton(root) {
    var view = {};
    root.classList.add('pg-signals', 'page-pad');
    var stage = h('div', { class: 'sig-stage' });
    view.banners = h('div', { class: 'sig-banners', 'aria-live': 'polite' });
    view.emptyHost = buildEmptyHost(view);
    view.loadingHost = buildLoadingHost();
    view.errorHost = buildErrorHost(view);
    view.readyHost = h('div', { class: 'sig-ready' }, [
      buildTopbar(view),
      h('div', { class: 'sig-layout' }, [buildSide(view), buildMain(view), buildSnapshot(view)]),
      buildFootnote(view)
    ]);
    setHidden(view.emptyHost, true);
    setHidden(view.loadingHost, true);
    setHidden(view.errorHost, true);
    setHidden(view.readyHost, true);
    stage.appendChild(view.banners);
    stage.appendChild(view.emptyHost);
    stage.appendChild(view.loadingHost);
    stage.appendChild(view.errorHost);
    stage.appendChild(view.readyHost);
    root.appendChild(stage);
    view.stage = stage;
    view.root = root;
    return view;
  }

  /* ================================================================== *
   * 图表 / 交互
   * ================================================================== */

  function chartHeight() {
    var w = window.innerWidth || 1440;
    if (w < 768) return 300;
    if (w < 1200) return 360;
    return 400;
  }

  function createChart(view, api) {
    var chart = api.chart;
    if (!chart || typeof chart.create !== 'function') {
      throw new Error('FL.chart 未就绪（页面需要 src/ui/chart.js）');
    }
    page.chart = chart.create(view.chartCanvas, {
      height: chartHeight(),
      xDomain: [0, 60],
      ariaLabel: '实时曲线图',
      onHover: onChartHover,
      onClick: onChartClick,
      onCursorDrag: onChartDrag
    });
    page.chart.setSeries([]);
    page.chart.setEvents([]);
    page.chart.setCursor(0);
    page.chart.render();
    view.chartWrap.addEventListener('pointerleave', hideTooltip);
  }

  function onChartHover(info) {
    var view = page.view;
    if (!view || !view.tooltip) return;
    if (!info || info.t == null) { hideTooltip(); return; }
    if (page.state && page.state.pageState.signals && page.state.pageState.signals.tableMode) {
      hideTooltip();
      return;
    }
    var values = info.values || {};
    for (var i = 0; i < page.tooltipRows.length; i++) {
      var row = page.tooltipRows[i];
      var v = values[row.id];
      row.valueEl.textContent = row.sig ? fmtValue(row.sig, v) : (isFiniteNumber(v) ? fmtNum(v, 2) : '—');
    }
    view.tooltipTime.textContent = 't = ' + fmtNum(info.t, 1) + ' s · 最近采样';
    setHidden(view.tooltip, false);
    var wrap = view.chartWrap;
    var maxX = wrap.clientWidth || 0;
    var tw = view.tooltip.offsetWidth || 200;
    var th = view.tooltip.offsetHeight || 80;
    var left = info.x + 16;
    var top = info.y + 14;
    if (left + tw > maxX - 6) left = info.x - tw - 14;
    if (left < 4) left = 4;
    if (top + th > (wrap.clientHeight || 400) - 4) top = info.y - th - 12;
    if (top < 4) top = 4;
    view.tooltip.style.left = left + 'px';
    view.tooltip.style.top = top + 'px';
  }

  function hideTooltip() {
    var view = page.view;
    if (!view || !view.tooltip) return;
    setHidden(view.tooltip, true);
  }

  function onChartClick(info) {
    if (!info) return;
    var state = page.state;
    if (!state || !state.activeRun) return;
    var d = derive(state);
    var t = info.t;
    var nearest = t;
    var proto = protocol();
    if (proto && proto.nearestIndex) {
      var idx = proto.nearestIndex(state.activeRun, t);
      var times = state.activeRun.timeseries.t;
      if (idx >= 0 && idx < times.length) nearest = times[idx];
    }
    callAction('setPageState', 'signals', {
      selectedT: nearest,
      selectedSignal: d.visibleChart.length ? d.visibleChart[0].id : null
    });
  }

  function onChartDrag(t) {
    if (typeof t !== 'number' || !isFinite(t)) return;
    callAction('setTime', t, { pause: true });
  }

  function bindRangeInputs(view) {
    function applyFromEnter(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyCustomWindow();
      }
    }
    view.t0.addEventListener('keydown', applyFromEnter);
    view.t1.addEventListener('keydown', applyFromEnter);
    [view.t0, view.t1].forEach(function (input) {
      input.addEventListener('change', function () { applyCustomWindow(); });
    });
  }

  function applyCustomWindow() {
    var view = page.view;
    var state = page.state;
    if (!view || !state || !state.activeRun) return;
    var dur = state.activeRun.config && isFiniteNumber(state.activeRun.config.duration_s)
      ? state.activeRun.config.duration_s : 60;
    var a = Number(view.t0.value);
    var b = Number(view.t1.value);
    var errors = [];
    if (!isFinite(a) || !isFinite(b)) errors.push('请输入数字');
    else {
      if (a < 0 || b > dur) errors.push('范围必须在 0–' + fmtNum(dur, 0) + ' s');
      if (b - a < MIN_WINDOW_SPAN) errors.push('窗口宽度至少 ' + MIN_WINDOW_SPAN + ' s');
    }
    if (errors.length) {
      view.windowErr.textContent = errors[0];
      view.t0.setAttribute('aria-invalid', 'true');
      view.t1.setAttribute('aria-invalid', 'true');
      return;
    }
    view.windowErr.textContent = '';
    view.t0.removeAttribute('aria-invalid');
    view.t1.removeAttribute('aria-invalid');
    callAction('setPageState', 'signals', { zoom: 'custom', viewWindow: [a, b] });
  }

  function jumpToFault() {
    var state = page.state;
    if (!state || !state.activeRun) return;
    var t = faultTime(state.activeRun);
    if (t == null) { toast('本运行没有故障事件', 'info'); return; }
    callAction('setTime', t, { pause: true });
  }

  function resetView() {
    var state = page.state;
    if (!state || !state.activeRun) return;
    var run = state.activeRun;
    var map = {};
    (run.signals || []).forEach(function (s) {
      if (s.tableOnly) return;
      map[s.id] = !(s.chart && s.chart.defaultVisible === false);
    });
    page.socZoom = false;
    callAction('setPageState', 'signals', {
      visible: map,
      baselineOverlay: false,
      viewWindow: null,
      zoom: 'full',
      tableMode: false,
      selectedSignal: null,
      selectedT: null
    });
    toast('已恢复默认视图（缩放与信号显隐），未重新运行', 'info');
  }

  function canExport(state, d) {
    if (state.truthSealed) return { ok: false, reason: '盲测封存中：真值数据禁止导出' };
    if (!state.activeRun) return { ok: false, reason: '没有可导出的运行' };
    if (d && !d.invalid.ok) return { ok: false, reason: '信号数据校验未通过，已阻止导出' };
    return { ok: true };
  }

  function exportCsv() {
    var state = page.state;
    if (!state || !state.activeRun) return;
    var d = derive(state);
    var guard = canExport(state, d);
    if (!guard.ok) { toast(guard.reason, 'warn'); return; }
    var ex = (page.api && page.api.exporter) || FL.exporter;
    if (!ex || typeof ex.csv !== 'function' || typeof ex.download !== 'function') {
      toast('导出模块尚未就绪', 'warn');
      return;
    }
    try {
      var text = ex.csv(state.activeRun);
      var name = typeof ex.csvFilename === 'function' ? ex.csvFilename(state.activeRun) : ('FaultLab_' + state.activeRun.runId + '.csv');
      ex.download(name, text, 'text/csv;charset=utf-8');
      toast('已导出 ' + name + '（不可变运行全量采样）', 'ok');
    } catch (err) {
      toast('导出失败：' + (err && err.message ? err.message : err), 'danger');
    }
  }

  /* ================================================================== *
   * 渲染：模式 / 横幅 / 元信息
   * ================================================================== */

  function applyMode(mode, state) {
    var view = page.view;
    page.root.dataset.state = mode;
    setHidden(view.emptyHost, mode !== 'no_run');
    setHidden(view.loadingHost, mode !== 'loading');
    setHidden(view.errorHost, mode !== 'error');
    setHidden(view.readyHost, mode !== 'ready');
    if (mode === 'no_run') {
      var txt = view.emptyHost.querySelector('.empty-desc');
      if (txt) {
        txt.textContent = state.computeState === 'computing'
          ? '正在生成默认运行数据，稍候会自动切换到曲线视图。'
          : '曲线页只展示当前实验运行的不可变数据。创建一个默认实验运行，或先到系统页配置故障并创建运行。';
      }
    } else if (mode === 'error') {
      var msg = (state.lastError && (state.lastError.message || state.lastError)) || '运行数据缺失';
      view.errorText.textContent = '运行数据不可用：' + msg + '。已保留草稿与历史运行，请重试或返回系统页检查配置。';
    }
  }

  function renderBanners(state, d) {
    var view = page.view;
    clear(view.banners);
    var nodes = [];
    if (state.truthSealed) {
      nodes.push(h('div', { class: 'notice', 'data-tone': 'danger', role: 'status' }, [
        icon('lock', { size: 15 }),
        h('span', {}, '盲测封存中：MODEL_STATE / FAULT_EVENT 真值通道已隐藏，故障事件与 CSV 导出已禁用；表格模式仅含盲测可见通道。')
      ]));
    }
    if (!d.invalid.ok) {
      nodes.push(h('div', { class: 'notice', 'data-tone': 'danger', role: 'alert' }, [
        icon('warning', { size: 15 }),
        h('span', {}, 'invalid_signal：' + d.invalid.problems.slice(0, 3).join('；') +
          (d.invalid.problems.length > 3 ? '…' : '') + '。结果导出已禁用。')
      ]));
    }
    if (state.computeState === 'failed' && state.lastError) {
      nodes.push(h('div', { class: 'notice', 'data-tone': 'warn', role: 'alert' }, [
        icon('warning', { size: 15 }),
        h('span', {}, '最近一次计算失败：' + (state.lastError.message || state.lastError) + '；当前仍展示已完成的运行。')
      ]));
    }
    if (d.ps.baselineOverlay && !d.baseline.ok && !state.truthSealed) {
      nodes.push(h('div', { class: 'notice', 'data-tone': 'warn', role: 'status' }, [
        icon('warning', { size: 15 }),
        h('span', {}, '基准叠加未生效：' + d.baseline.reason + '。请先创建同配置的无故障基准运行。')
      ]));
    }
    nodes.forEach(function (n) { view.banners.appendChild(n); });
    setHidden(view.banners, nodes.length === 0);
  }

  function renderMeta(state, d) {
    var view = page.view;
    var run = d.run;
    view.runLabel.textContent = run.runId + ' · ' + (run.label || '未命名运行');
    view.runMeta.textContent = (d.sys ? d.sys.shortTitle || d.sys.title : run.systemId) +
      ' · ' + (run.config && run.config.feedback_mode === 'monitor' ? '仅监测' : '闭环') +
      ' · ' + fmtNum(d.duration, 0) + ' s';
    view.hashMeta.textContent = 'hash ' + ((run.runShortHash || run.configHash || '').slice(0, 8) || '—');
    clear(view.metaBadges);
    view.metaBadges.appendChild(badge(d.sealed ? '盲测封存' : '演示模式', d.sealed ? 'danger' : 'info'));
    view.metaBadges.appendChild(badge((d.sys && d.sys.level) ? String(d.sys.level).split('·')[0].trim() : 'L0', 'neutral'));
    if (run.role) {
      view.metaBadges.appendChild(badge(
        run.role === 'baseline' ? '基准运行' : run.role === 'contrast' ? '仅监测对照' : '故障运行',
        'neutral'
      ));
    }
  }

  /* ================================================================== *
   * 渲染：分类 / 信号列表
   * ================================================================== */

  function renderCategories(state, d) {
    var view = page.view;
    var ui = uiGet();
    var key = (d.sys ? d.sys.id : '') + '|' + d.cats.map(function (c) { return c.id; }).join(',');
    if (page.catKey !== key) {
      page.catKey = key;
      clear(view.topbarCats);
      var counts = {};
      (d.run.signals || []).forEach(function (s) {
        counts[s.category] = (counts[s.category] || 0) + 1;
      });
      var opts = d.cats.map(function (c) {
        return { value: c.id, label: c.label + (counts[c.id] ? ' ' + counts[c.id] : '') };
      });
      view.categorySeg = ui.segmented({
        options: opts,
        value: d.cat,
        ariaLabel: '信号分类',
        onChange: function (value) {
          callAction('setPageState', 'signals', { category: value });
        }
      });
      view.topbarCats.appendChild(view.categorySeg);
    } else if (view.categorySeg) {
      view.categorySeg.setValue(d.cat);
    }
  }

  function renderSignalList(state, d) {
    var view = page.view;
    var structKey = (d.sys ? d.sys.id : '') + '|' + d.cat + '|' + (d.sealed ? 'sealed' : 'demo') + '|' + d.run.runId;
    if (page.listStructKey !== structKey) {
      page.listStructKey = structKey;
      clear(view.signalList);
      page.signalRows = [];
      if (!d.catSignals.length) {
        view.signalList.appendChild(h('div', { class: 'sig-list-empty' },
          d.sealed ? '盲测封存：该分类没有可公开的通道。' : '该分类没有信号定义。'));
      }
      d.catSignals.forEach(function (sig) {
        var chart = sig.chart || {};
        var input = h('input', { type: 'checkbox', 'aria-label': '显示或隐藏信号 ' + sig.label });
        var row = h('label', { class: 'sig-item', title: sig.definition || '' }, [
          input,
          swatch(chart.colorToken || 'ink', chart.style || 'solid', null),
          h('span', { class: 'sig-item-main' }, [
            h('span', { class: 'sig-item-name' }, sig.label),
            h('span', { class: 'sig-item-meta' }, [
              sourceTag(sig.sourceKind),
              sig.tableOnly ? badge('仅表格', 'info') : null,
              h('span', { class: 'sig-item-unit mono' }, sig.unit || '')
            ])
          ])
        ]);
        input.addEventListener('change', function () { onToggleSignal(sig); });
        page.signalRows.push({ sig: sig, input: input, row: row });
        view.signalList.appendChild(row);
      });
    }
    syncSignalRows(d);
    clear(view.baselineLegendHost);
    if (d.baselineOn && d.baseline.ok) {
      view.baselineLegendHost.appendChild(h('div', { class: 'sig-baseline-note' }, [
        swatch('ink', 'dotted', 'sig-swatch--baseline'),
        h('span', {}, '无故障基准 ' + d.baseline.run.runId + '（dotted · 45% 不透明度）')
      ]));
    }
  }

  function syncSignalRows(d) {
    for (var i = 0; i < page.signalRows.length; i++) {
      var item = page.signalRows[i];
      var on = !!d.visibleSet[item.sig.id];
      if (item.input.checked !== on) item.input.checked = on;
      item.row.classList.toggle('is-off', !on);
      item.row.title = (item.sig.definition || '') + (on ? '' : '（当前隐藏）');
    }
  }

  function onToggleSignal(sig) {
    var state = page.state;
    if (!state || !state.activeRun) return;
    var d = derive(state);
    var ps = state.pageState.signals || {};
    var next = {};
    Object.keys(ps.visible || {}).forEach(function (k) { next[k] = ps.visible[k]; });
    var willBeOn = !d.visibleSet[sig.id];
    if (!willBeOn && !sig.tableOnly) {
      var chartStill = d.visibleChart.filter(function (s) { return s.id !== sig.id; });
      if (!chartStill.length) {
        toast('同图至少保留一个信号：请先勾选另一个信号再隐藏「' + sig.label + '」', 'warn');
        syncSignalRows(d);
        return;
      }
    }
    next[sig.id] = willBeOn;
    callAction('setPageState', 'signals', { visible: next });
  }

  /* ================================================================== *
   * 渲染：图表
   * ================================================================== */

  function pairsFor(run, sigId) {
    var key = run ? run.runId : '';
    if (page.pairs.key !== key) {
      page.pairs.key = key;
      page.pairs.map = {};
    }
    var cached = page.pairs.map[sigId];
    if (cached) return cached;
    var arr = run.timeseries.signals[sigId];
    if (!arr) return null;
    var t = run.timeseries.t;
    var out = new Array(t.length);
    for (var i = 0; i < t.length; i++) out[i] = [t[i], arr[i]];
    page.pairs.map[sigId] = out;
    return out;
  }

  function basePairsFor(run, sigId) {
    var key = run ? run.runId : '';
    if (page.basePairs.key !== key) {
      page.basePairs.key = key;
      page.basePairs.map = {};
    }
    var cached = page.basePairs.map[sigId];
    if (cached) return cached;
    var arr = run.timeseries.signals[sigId];
    if (!arr) return null;
    var t = run.timeseries.t;
    var out = new Array(t.length);
    for (var i = 0; i < t.length; i++) out[i] = [t[i], arr[i]];
    page.basePairs.map[sigId] = out;
    return out;
  }

  function chartAxis(sig) {
    return sig.chart && sig.chart.axis === 'right' ? 'right' : 'left';
  }

  function chartColor(sig) {
    return (sig.chart && sig.chart.colorToken) || 'ink';
  }

  function chartStyleOf(sig) {
    return (sig.chart && sig.chart.style) || 'solid';
  }

  function buildChartSeries(d) {
    var list = [];
    d.visibleChart.forEach(function (sig) {
      var points = pairsFor(d.run, sig.id);
      if (!points) return;
      list.push({
        id: sig.id,
        label: sig.shortLabel || sig.label,
        unit: sig.unit,
        axis: chartAxis(sig),
        color: chartColor(sig),
        style: chartStyleOf(sig),
        step: !!(sig.chart && sig.chart.step),
        width: 2,
        opacity: 1,
        points: points
      });
    });
    if (d.baselineOn && d.baseline.ok) {
      d.visibleChart.forEach(function (sig) {
        var points = basePairsFor(d.baseline.run, sig.id);
        if (!points) return;
        list.push({
          id: sig.id + '__baseline',
          label: (sig.shortLabel || sig.label) + ' · 基准',
          unit: sig.unit,
          axis: chartAxis(sig),
          color: chartColor(sig),
          style: 'dotted',
          step: !!(sig.chart && sig.chart.step),
          width: 1.5,
          opacity: 0.45,
          points: points
        });
      });
    }
    return list;
  }

  function buildChartEvents(d) {
    return d.events.map(function (ev) {
      return {
        t: ev.trigger_s,
        label: ev.label || ('事件 ' + fmtNum(ev.trigger_s, 1) + ' s'),
        style: 'fault'
      };
    });
  }

  function renderChart(state, d) {
    if (!page.chart) return;
    var series = buildChartSeries(d);
    page.chart.setSeries(series);
    var evKey = d.events.map(function (e) { return e.trigger_s + ':' + (e.label || ''); }).join('|') + '#' + (d.sealed ? 'sealed' : '');
    if (page.eventsKey !== evKey) {
      page.eventsKey = evKey;
      page.chart.setEvents(buildChartEvents(d));
    }
    var yDomain = null;
    if (d.cat === 'soc' && page.socZoom && d.soc) yDomain = [d.soc.lo, d.soc.hi];
    page.chart.setDomain({ x: d.zoom.win, y: yDomain, yRight: null });
    page.chart.setCursor(state.currentTime);
    page.chart.setSelectedPoint(d.ps.selectedT != null && isFiniteNumber(+d.ps.selectedT) ? +d.ps.selectedT : null);
    page.chart.render();
    viewSetChartHead(d);
    buildTooltipRows(series, d);
  }

  function viewSetChartHead(d) {
    var view = page.view;
    view.chartTitle.textContent = d.catLabel + '曲线';
    var parts = [];
    parts.push(d.visibleChart.length + ' 条可见信号');
    if (d.rightUnits.length) parts.push('右轴 ' + d.rightUnits.join(' / '));
    if (d.baselineOn) parts.push('基准叠加');
    if (d.sealed) parts.push('真值封存');
    view.chartSub.textContent = parts.join(' · ');
    setHidden(view.baselineBadge, !d.baselineOn);
    setHidden(view.socBadge, !(d.cat === 'soc' && page.socZoom && d.soc));
  }

  function buildTooltipRows(series, d) {
    var view = page.view;
    clear(view.tooltipBody);
    page.tooltipRows = [];
    if (!series.length) {
      view.tooltipBody.appendChild(h('div', { class: 'sig-tt-empty' }, '无可见信号'));
      return;
    }
    series.forEach(function (s) {
      var baseId = s.id.indexOf('__baseline') >= 0 ? s.id.replace('__baseline', '') : s.id;
      var sigMeta = null;
      for (var i = 0; i < d.catSignals.length; i++) {
        if (d.catSignals[i].id === baseId) { sigMeta = d.catSignals[i]; break; }
      }
      var valueEl = h('span', { class: 'sig-tt-val mono' }, '—');
      view.tooltipBody.appendChild(h('div', { class: 'sig-tt-row' }, [
        swatch(s.color, s.style),
        h('span', { class: 'sig-tt-label' }, s.label),
        valueEl,
        h('span', { class: 'sig-tt-unit mono' }, s.unit || '')
      ]));
      page.tooltipRows.push({ id: s.id, sig: sigMeta, valueEl: valueEl });
    });
  }

  /* ================================================================== *
   * 渲染：缩放 / SOC
   * ================================================================== */

  function renderZoomBar(state, d) {
    var view = page.view;
    var ui = uiGet();
    var hasEvent = faultTime(d.run) != null;
    var dur = d.duration;
    var zkey = String(hasEvent) + '|' + dur;
    if (page.zoomKey !== zkey) {
      page.zoomKey = zkey;
      clear(view.zoomSegHost);
      var evT = faultTime(d.run);
      view.zoomSeg = ui.segmented({
        options: [
          { value: 'full', label: '全时段' },
          {
            value: 'fault',
            label: '故障前后 ±5 s',
            disabled: !hasEvent,
            title: hasEvent ? ('定位到 ' + fmtNum(evT - 5, 1) + '–' + fmtNum(evT + 5, 1) + ' s') : '本运行没有故障事件'
          },
          { value: 'custom', label: '自定义' }
        ],
        value: d.zoom.zoom,
        ariaLabel: '缩放窗口',
        onChange: onZoomChange
      });
      view.zoomSegHost.appendChild(view.zoomSeg);
    } else if (view.zoomSeg) {
      view.zoomSeg.setValue(d.zoom.zoom);
    }
    setHidden(view.customWindow, d.zoom.zoom !== 'custom');
    if (d.zoom.zoom === 'custom' && d.zoom.win) {
      var a = fmtNum(d.zoom.win[0], 1);
      var b = fmtNum(d.zoom.win[1], 1);
      if (document.activeElement !== view.t0) view.t0.value = a;
      if (document.activeElement !== view.t1) view.t1.value = b;
      view.t0.max = String(dur);
      view.t1.max = String(dur);
    }
    var evT2 = faultTime(d.run);
    view.jumpBtn.querySelector('span').textContent = evT2 == null ? '无故障事件' : ('跳到 ' + fmtNum(evT2, 1) + ' s');
    view.jumpBtn.disabled = evT2 == null;
    view.prevEventBtn.disabled = !hasEvent;
    view.nextEventBtn.disabled = !hasEvent;
    view.prevEventBtn.title = hasEvent ? '跳到上一个事件（并暂停）' : '本运行没有事件';
    view.nextEventBtn.title = hasEvent ? '跳到下一个事件（并暂停）' : '本运行没有事件';
    if (d.zoom.win) {
      view.zoomNote.textContent = '当前视图窗口 ' + fmtNum(d.zoom.win[0], 1) + '–' + fmtNum(d.zoom.win[1], 1) +
        ' s（只改变图表视口，不改变数据与播放）';
      setHidden(view.zoomNote, false);
    } else {
      setHidden(view.zoomNote, true);
    }
  }

  function onZoomChange(value) {
    var state = page.state;
    if (!state || !state.activeRun) return;
    var dur = state.activeRun.config && isFiniteNumber(state.activeRun.config.duration_s)
      ? state.activeRun.config.duration_s : 60;
    if (value === 'custom') {
      var d = derive(state);
      var w = d.zoom.win || [0, dur];
      callAction('setPageState', 'signals', { zoom: 'custom', viewWindow: [w[0], w[1]] });
      return;
    }
    if (value === 'fault') {
      var ev = faultTime(state.activeRun);
      if (ev == null) { toast('本运行没有故障事件', 'info'); return; }
      callAction('setPageState', 'signals', {
        zoom: 'fault',
        viewWindow: [Math.max(0, ev - 5), Math.min(dur, ev + 5)]
      });
      return;
    }
    callAction('setPageState', 'signals', { zoom: 'full', viewWindow: null });
  }

  function renderSoc(state, d) {
    var view = page.view;
    var isSoc = d.cat === 'soc';
    if (!isSoc) page.socZoom = false;
    setHidden(view.socRow, !isSoc);
    if (!isSoc) return;
    view.socZoomBtn.setAttribute('aria-pressed', String(!!page.socZoom));
    view.socZoomBtn.querySelector('span').textContent = page.socZoom ? '恢复纵轴' : '纵轴放大';
    if (!d.soc) {
      view.socNote.textContent = '当前窗口没有可用的 SOC 采样。';
      return;
    }
    if (!page.socZoom) {
      view.socNote.textContent = '默认纵轴按数据自动取整；需要分辨 ' +
        (d.soc.maxDiff != null ? fmtNum(d.soc.maxDiff, 3) + ' pp' : '微小差值') +
        ' 时可放大纵轴（会明确标注量程与差值）。';
      return;
    }
    var diffText = d.soc.maxDiff != null
      ? '两条 SOC 线最大差 ' + fmtNum(d.soc.maxDiff, 3) + ' pp（估计 − 真值）'
      : '两条 SOC 线差值';
    view.socNote.textContent = '量程已放大：纵轴 ' + fmtNum(d.soc.lo, 2) + '–' + fmtNum(d.soc.hi, 2) +
      ' %（跨 ' + fmtNum(d.soc.span, 2) + ' pp）；' + diffText +
      '。这是估计误差的可视化放大，不代表 SOC 实际大幅跌落。';
    view.zoomNote.textContent = '量程已放大：纵轴 ' + fmtNum(d.soc.lo, 2) + '–' + fmtNum(d.soc.hi, 2) +
      ' %；' + diffText + '。';
    setHidden(view.zoomNote, false);
  }

  /* ================================================================== *
   * 渲染：快照 / 事件快照 / 采样详情 / 表格
   * ================================================================== */

  function renderSnapshotRows(state, d) {
    var view = page.view;
    var key = d.run.runId + '|' + d.cat + '|' + d.snapSignals.map(function (s) { return s.id; }).join(',') + '|' + (d.sealed ? 's' : 'd');
    if (page.snapsKey !== key) {
      page.snapsKey = key;
      clear(view.snapList);
      page.snapRows = [];
      if (!d.snapSignals.length) {
        view.snapList.appendChild(h('div', { class: 'sig-snap-empty' }, '当前分类没有可显示为快照的信号。'));
      }
      d.snapSignals.forEach(function (sig) {
        var valEl = h('span', { class: 'sig-snap-val mono' }, '—');
        var row = h('div', { class: 'sig-snap-row', 'data-sig': sig.id }, [
          h('div', { class: 'sig-snap-row-top' }, [
            swatch(chartColor(sig), chartStyleOf(sig)),
            h('span', { class: 'sig-snap-label' }, sig.label),
            sig.tableOnly ? badge('仅表格', 'info') : null,
            h('span', { class: 'sig-snap-value-wrap mono' }, [valEl, h('span', { class: 'sig-snap-unit' }, sig.unit || '')])
          ]),
          h('div', { class: 'sig-snap-row-meta' }, [
            sourceTag(sig.sourceKind),
            h('span', { class: 'sig-snap-def', title: sig.definition || '' }, sig.definition || '—')
          ]),
          sig.formula ? h('div', { class: 'sig-snap-formula mono' }, sig.formula) : null
        ]);
        page.snapRows.push({ sig: sig, valueEl: valEl, row: row });
        view.snapList.appendChild(row);
      });
    }
    var selectedSignal = d.ps.selectedSignal;
    for (var i = 0; i < page.snapRows.length; i++) {
      page.snapRows[i].row.classList.toggle('is-selected', !!(selectedSignal && page.snapRows[i].sig.id === selectedSignal));
    }
    view.snapSub.textContent = d.catLabel + ' · ' + d.snapSignals.length + ' 个通道';
  }

  function renderEventSnapshots(state, d) {
    var view = page.view;
    var snaps = (d.run.snapshots || []).slice().sort(function (a, b) { return (a.t_s || 0) - (b.t_s || 0); });
    if (d.sealed || !snaps.length) {
      setHidden(view.snapEvents, true);
      return;
    }
    var pre = null;
    var post = null;
    snaps.forEach(function (sn) {
      if (sn.phase === 'pre') pre = sn;
      else if (sn.phase === 'post') post = sn;
    });
    if (!pre && !post) { setHidden(view.snapEvents, true); return; }
    var key = d.run.runId + '|' + d.snapSignals.map(function (s) { return s.id; }).join(',') + '|' +
      (pre ? pre.snapshotId : '') + '|' + (post ? post.snapshotId : '');
    if (page.eventSnapsKey !== key) {
      page.eventSnapsKey = key;
      var wasOpen = !!view.snapEvents.open;
      clear(view.snapEventsBody);
      var ev = d.events[0] || null;
      var tPre = pre ? pre.t_s : null;
      var tPost = post ? post.t_s : null;
      view.snapEventsSummary.textContent = '事件前后快照 · ' +
        (ev && ev.label ? ev.label + ' · ' : '') +
        (tPre != null ? fmtNum(tPre, 1) : '—') + ' s / ' + (tPost != null ? fmtNum(tPost, 1) : '—') + ' s';
      var useSignals = d.snapSignals.filter(function (sig) {
        return (pre && pre.variables && Object.prototype.hasOwnProperty.call(pre.variables, sig.id)) ||
          (post && post.variables && Object.prototype.hasOwnProperty.call(post.variables, sig.id));
      });
      if (!useSignals.length) {
        view.snapEventsBody.appendChild(h('div', { class: 'sig-snap-empty' }, '快照中没有当前可见通道。'));
      } else {
        view.snapEventsBody.appendChild(h('table', { class: 'sig-events-table' }, [
          h('caption', { class: 'sr-only' }, '故障事件前后采样快照，含变量名与单位'),
          h('thead', {}, [h('tr', {}, [
            h('th', { scope: 'col' }, '变量'),
            h('th', { scope: 'col' }, '事件前'),
            h('th', { scope: 'col' }, '事件后'),
            h('th', { scope: 'col' }, '变化')
          ])]),
          h('tbody', {}, useSignals.map(function (sig) {
            var vPre = pre && pre.variables ? pre.variables[sig.id] : null;
            var vPost = post && post.variables ? post.variables[sig.id] : null;
            var delta = (isFiniteNumber(vPre) && isFiniteNumber(vPost)) ? vPost - vPre : null;
            var p = sig.precision != null ? sig.precision : PRECISION_DEFAULT;
            return h('tr', {}, [
              h('td', {}, [
                h('span', { class: 'sig-ev-name' }, sig.label),
                h('span', { class: 'sig-ev-unit mono' }, sig.unit || '')
              ]),
              h('td', { class: 'mono' }, fmtValue(sig, vPre)),
              h('td', { class: 'mono' }, fmtValue(sig, vPost)),
              h('td', { class: 'mono' }, delta == null ? '—' : fmtSigned(delta, p))
            ]);
          }))
        ]));
      }
      if (wasOpen) view.snapEvents.open = true;
    }
    setHidden(view.snapEvents, false);
  }

  function renderDetail(state, d) {
    var view = page.view;
    var t = d.ps.selectedT;
    if (t == null || !isFiniteNumber(+t)) {
      setHidden(view.detail, true);
      return;
    }
    t = +t;
    var key = d.run.runId + '|' + t + '|' + d.snapSignals.map(function (s) { return s.id; }).join(',') + '|' + (d.ps.selectedSignal || '');
    if (page.detailKey !== key) {
      page.detailKey = key;
      clear(view.detailBody);
      view.detailT.textContent = 't = ' + fmtNum(t, 1) + ' s（就近吸附 0.1 s 采样）';
      if (!d.snapSignals.length) {
        view.detailBody.appendChild(h('div', { class: 'sig-snap-empty' }, '没有可见通道。'));
      } else {
        var proto = protocol();
        d.snapSignals.forEach(function (sig) {
          var sample = proto && proto.sampleAt ? proto.sampleAt(d.run, sig.id, t) : { value: null, t: t };
          var value = sample ? sample.value : null;
          var sampleT = sample && sample.t != null ? sample.t : t;
          var strong = d.ps.selectedSignal && sig.id === d.ps.selectedSignal;
          view.detailBody.appendChild(h('div', { class: 'sig-detail-row' + (strong ? ' is-strong' : '') }, [
            h('div', { class: 'sig-detail-row-head' }, [
              h('span', { class: 'sig-detail-id mono' }, sig.id),
              h('span', { class: 'sig-detail-val mono' }, fmtValue(sig, value)),
              h('span', { class: 'sig-detail-unit mono' }, sig.unit || ''),
              sourceTag(sig.sourceKind)
            ]),
            h('div', { class: 'sig-detail-def' }, sig.definition || '—'),
            h('div', { class: 'sig-detail-evidence mono' }, '依据：' + d.run.runId + ' · ' + sig.id + ' · t=' + fmtNum(sampleT, 1) + ' s')
          ]));
        });
      }
    }
    setHidden(view.detail, false);
  }

  function renderTable(state, d) {
    var view = page.view;
    var on = !!d.ps.tableMode;
    setHidden(view.chartPanel, on);
    setHidden(view.tablePanel, !on);
    if (!on) return;
    var key = d.run.runId + '|' + d.snapSignals.map(function (s) { return s.id; }).join(',') + '|' + (d.sealed ? 's' : 'd');
    if (page.tableKey === key) {
      updateTableHighlight(state, d);
      return;
    }
    page.tableKey = key;
    clear(view.tableWrap);
    page.tableRows = [];
    page.tableRowIndex = -1;
    var t = d.run.timeseries.t;
    var data = d.run.timeseries.signals;
    if (!d.snapSignals.length) {
      view.tableWrap.appendChild(h('div', { class: 'sig-snap-empty' }, '没有可见通道，表格为空。'));
      return;
    }
    var headCells = [h('th', { scope: 'col', class: 'sig-col-time' }, '时刻 (s)')];
    d.snapSignals.forEach(function (sig) {
      headCells.push(h('th', { scope: 'col' }, [
        h('span', { class: 'sig-th-name' }, sig.label),
        h('span', { class: 'sig-th-unit mono' }, '(' + (sig.unit || '—') + ')'),
        h('span', { class: 'sig-th-source mono' }, sourceLabel(sig.sourceKind))
      ]));
    });
    var tbody = h('tbody');
    for (var i = 0; i < t.length; i++) {
      var cells = [h('td', { class: 'mono sig-col-time' }, fmtNum(t[i], 1))];
      for (var j = 0; j < d.snapSignals.length; j++) {
        var sig = d.snapSignals[j];
        var arr = data[sig.id];
        cells.push(h('td', { class: 'mono' }, fmtValue(sig, arr ? arr[i] : null)));
      }
      var tr = h('tr', { 'data-index': String(i) }, cells);
      page.tableRows.push(tr);
      tbody.appendChild(tr);
    }
    view.tableWrap.appendChild(h('table', { class: 'sig-table' }, [
      h('caption', { class: 'sr-only' }, '实时曲线数据表格模式：' + d.run.runId + '，' + d.catLabel + '，含变量名与单位'),
      h('thead', {}, [h('tr', {}, headCells)]),
      tbody
    ]));
    page.tableRowIndex = -1;
    updateTableHighlight(state, d);
    scrollTableToCurrent();
  }

  function scrollTableToCurrent() {
    var view = page.view;
    if (!view || !view.tableWrap) return;
    if (page.tableRowIndex < 0 || !page.tableRows[page.tableRowIndex]) return;
    var wrap = view.tableWrap;
    var row = page.tableRows[page.tableRowIndex];
    var rowRect = row.getBoundingClientRect();
    var wrapRect = wrap.getBoundingClientRect();
    var target = wrap.scrollTop + (rowRect.top - wrapRect.top) - wrap.clientHeight / 2;
    wrap.scrollTop = Math.max(0, Math.min(wrap.scrollHeight - wrap.clientHeight, target));
  }

  /* ================================================================== *
   * 渲染：数值刷新（轻量路径）
   * ================================================================== */

  function updateValues(state, d) {
    var view = page.view;
    var t = state.currentTime || 0;
    var timeText = fmtNum(t, 1);
    view.snapTime.textContent = timeText + ' s';
    view.snapTimeBig.textContent = timeText;
    var proto = protocol();
    for (var i = 0; i < page.snapRows.length; i++) {
      var row = page.snapRows[i];
      var sample = proto && proto.sampleAt ? proto.sampleAt(d.run, row.sig.id, t) : null;
      row.valueEl.textContent = fmtValue(row.sig, sample ? sample.value : null);
    }
    if (page.chart) {
      page.chart.setCursor(t);
      page.chart.render();
    }
    updateTableHighlight(state, d);
    updateAria(state, d);
  }

  function updateTableHighlight(state, d) {
    if (!d.ps.tableMode || !page.tableRows.length) return;
    var proto = protocol();
    var idx = proto && proto.nearestIndex
      ? proto.nearestIndex(d.run, state.currentTime || 0)
      : Math.round((state.currentTime || 0) * 10);
    if (idx < 0) idx = 0;
    if (idx >= page.tableRows.length) idx = page.tableRows.length - 1;
    if (idx === page.tableRowIndex) return;
    if (page.tableRowIndex >= 0 && page.tableRows[page.tableRowIndex]) {
      page.tableRows[page.tableRowIndex].classList.remove('is-current');
    }
    page.tableRowIndex = idx;
    var row = page.tableRows[idx];
    if (row) row.classList.add('is-current');
  }

  function updateAria(state, d) {
    var view = page.view;
    var t = state.currentTime || 0;
    if (!view.chartCanvas) return;
    view.chartCanvas.setAttribute('aria-label',
      '实时曲线图：' + (d.sys ? d.sys.shortTitle || d.sys.title : d.run.systemId) +
      '，' + d.catLabel + '分类，' + d.visibleChart.length + ' 条可见信号，当前 ' + fmtNum(t, 1) + ' 秒' +
      '；可切换到表格模式获取数值。' + (d.sealed ? '盲测封存模式。' : ''));
  }

  function updateExportState(state, d) {
    var view = page.view;
    var guard = canExport(state, d);
    view.exportBtn.disabled = !guard.ok;
    view.exportBtn.title = guard.ok ? '导出当前运行的全量原始采样（601 点）' : guard.reason;
    view.exportBtn.setAttribute('aria-disabled', String(!guard.ok));
  }

  function updateBaselineControls(state, d) {
    var view = page.view;
    var sw = view.baselineSwitch;
    var ok = d.baseline.ok && !d.sealed;
    if (sw && sw.input) sw.input.disabled = !ok;
    if (sw && sw.setChecked && sw.input && sw.input.checked !== d.baselineOn) sw.setChecked(d.baselineOn);
    var hint = '';
    if (d.sealed) hint = '盲测封存期间不可用';
    else if (d.baseline.ok) hint = d.baselineOn ? ('已叠加 ' + d.baseline.run.runId) : ('可用 ' + d.baseline.run.runId);
    else hint = d.baseline.reason;
    view.baselineHint.textContent = hint;
    view.baselineHint.title = ok ? '' : hint;
    setHidden(view.baselineCreateBtn, d.baseline.ok || d.sealed);
    view.tableSwitch.setChecked(!!d.ps.tableMode);
  }

  /* ================================================================== *
   * 页脚
   * ================================================================== */

  function renderFooter(state, d) {
    var view = page.view;
    view.footText.textContent = '数据来源与假设：L0 行为级解析模型演示（非 Simulink / 非实测数据）；真实状态、观测、控制器目标、故障事件与派生量均以 source_kind 标注，说明文本不作为计算数据源。';
    var sysKey = d.sys ? d.sys.id : '';
    if (page.footerSystem !== sysKey) {
      page.footerSystem = sysKey;
      clear(view.footList);
      var model = (d.sys && d.sys.model) || {};
      var items = [];
      (model.assumptions || []).forEach(function (a) {
        items.push(a.text || a.id || String(a));
      });
      (model.limitations || []).forEach(function (l) {
        items.push('局限：' + (typeof l === 'string' ? l : (l.text || JSON.stringify(l))));
      });
      if (!items.length) items.push('模型假设与局限由系统定义提供。');
      items.forEach(function (text) {
        view.footList.appendChild(h('li', {}, text));
      });
    }
  }

  /* ================================================================== *
   * 全量渲染 / 轻量渲染
   * ================================================================== */

  function fullUpdate(state, d) {
    renderBanners(state, d);
    renderMeta(state, d);
    renderCategories(state, d);
    renderSignalList(state, d);
    renderChart(state, d);
    renderZoomBar(state, d);
    renderSnapshotRows(state, d);
    renderEventSnapshots(state, d);
    renderDetail(state, d);
    renderTable(state, d);
    renderSoc(state, d);
    updateBaselineControls(state, d);
    updateExportState(state, d);
    renderFooter(state, d);
    updateValues(state, d);
    hideTooltip();
  }

  function lightUpdate(state, d) {
    // 每帧 time 更新：仅刷新 canvas 游标 + 快照数值（/表格当前行），不重建 DOM
    updateValues(state, d);
  }

  /**
   * 兼容外部页面深链：系统页/因果页会 setPageState('signals', { visible, selectedSignal }) 后跳转，
   * 但不一定写 category。若选中的信号不在当前分类，自动切到它所属分类（只写一次 state）。
   */
  function syncExternalSelection(state) {
    var ps = state.pageState.signals || {};
    var sel = ps.selectedSignal;
    if (sel === page.lastSelectedSignal) return false;
    page.lastSelectedSignal = sel;
    if (!sel || !state.activeRun) return false;
    var signals = state.activeRun.signals || [];
    var meta = null;
    for (var i = 0; i < signals.length; i++) {
      if (signals[i].id === sel) { meta = signals[i]; break; }
    }
    if (!meta || !meta.category || meta.category === ps.category) return false;
    var sys = systemGet(state.activeRun.systemId);
    var cats = (sys && sys.signalCategories) || [];
    for (var j = 0; j < cats.length; j++) {
      if (cats[j].id === meta.category) {
        var res = callAction('setPageState', 'signals', { category: meta.category });
        return res !== null;
      }
    }
    return false;
  }

  function viewKeyOf(state, d) {
    var ps = d.ps;
    var vis = d.catSignals.map(function (s) {
      return s.id + ':' + (d.visibleSet[s.id] ? 1 : 0);
    }).join(',');
    return [
      d.run.runId,
      (d.run.configHash || '').slice(0, 12),
      state.systemId,
      d.cat,
      vis,
      d.baselineOn ? 'b1' : 'b0',
      state.baselineRun ? state.baselineRun.runId : '',
      d.zoom.zoom,
      d.zoom.win ? d.zoom.win[0] + '~' + d.zoom.win[1] : '',
      ps.tableMode ? 't1' : 't0',
      state.truthSealed ? 's1' : 's0',
      ps.selectedT == null ? '' : String(ps.selectedT),
      ps.selectedSignal || '',
      d.invalid.ok ? 'ok' : 'bad',
      page.socZoom ? 'y1' : 'y0',
      d.cat === 'soc' && d.soc ? d.soc.lo + '~' + d.soc.hi : ''
    ].join('|');
  }

  function renderNow(state, reason) {
    var run = state.activeRun;
    var mode = 'ready';
    if (state.computeState === 'computing' && !run) mode = 'loading';
    else if (!run) mode = 'no_run';
    else if (!run.timeseries || !run.signals) mode = 'error';
    applyMode(mode, state);
    if (mode !== 'ready') {
      page.viewKey = '';
      return;
    }
    // 外部深链：选中信号若不在当前分类，先切分类（会触发一次新 update）
    if (syncExternalSelection(state)) return;
    var d;
    try {
      d = derive(state);
    } catch (err) {
      if (window.console) window.console.error('[signals] 派生数据失败', err);
      applyMode('error', { lastError: err });
      return;
    }
    var vk = viewKeyOf(state, d);
    if (vk === page.viewKey) {
      lightUpdate(state, d);
      return;
    }
    try {
      fullUpdate(state, d);
      page.viewKey = vk;
    } catch (err) {
      if (window.console) window.console.error('[signals] 渲染失败', err);
      applyMode('error', { lastError: err });
    }
    if (reason === 'toast') { /* 无需特殊处理 */ }
  }

  /* ================================================================== *
   * 尺寸响应
   * ================================================================== */

  function onViewportChange() {
    if (!page.chart) return;
    page.chart.setHeight(chartHeight());
  }

  /* ================================================================== *
   * QA / 截图深链参数（仅用于验收与截图，不改变正常交互）
   *   ?cat=soc&zoom=fault&win=15,25&baseline=1&table=1&soczoom=1&selt=20&visible=I_bat_true_A,I_bat_meas_A
   * ================================================================== */

  function applyQaParams(state) {
    var params;
    try { params = new URLSearchParams(window.location.search); } catch (e) { return; }
    if (!params || typeof params.get !== 'function') return;
    var run = state.activeRun;
    var sys = systemGet(state.systemId || (run && run.systemId));
    var cats = (sys && sys.signalCategories) || [];
    var patch = {};
    var cat = params.get('cat');
    if (cat && cats.some(function (c) { return c.id === cat; })) patch.category = cat;
    if (params.get('table') === '1') patch.tableMode = true;
    if (params.get('baseline') === '1') patch.baselineOverlay = true;
    var zoom = params.get('zoom');
    if (zoom === 'fault' || zoom === 'custom' || zoom === 'full') {
      patch.zoom = zoom;
      if (zoom === 'full') patch.viewWindow = null;
    }
    var win = params.get('win');
    if (win) {
      var parts = win.split(',');
      if (parts.length === 2 && isFinite(+parts[0]) && isFinite(+parts[1])) {
        patch.zoom = 'custom';
        patch.viewWindow = [+parts[0], +parts[1]];
      }
    }
    var vis = params.get('visible');
    if (vis && run) {
      var ids = vis.split(',').filter(Boolean);
      var map = {};
      (run.signals || []).forEach(function (s) {
        if (!s.tableOnly) map[s.id] = ids.indexOf(s.id) >= 0;
      });
      patch.visible = map;
    }
    var selt = params.get('selt');
    if (selt != null && selt !== '' && isFinite(+selt)) {
      patch.selectedT = +selt;
      var useCat = patch.category || (state.pageState.signals || {}).category;
      var firstSig = null;
      (run ? run.signals || [] : []).forEach(function (s) {
        if (!firstSig && !s.tableOnly && s.category === useCat && !(s.sourceKind === 'MODEL_STATE' && state.truthSealed)) {
          firstSig = s;
        }
      });
      if (firstSig) patch.selectedSignal = firstSig.id;
    }
    if (Object.keys(patch).length) callAction('setPageState', 'signals', patch);
    if (params.get('soczoom') === '1') {
      page.socZoom = true;
      page.viewKey = '';
    }
  }

  /* ================================================================== *
   * 页面接口
   * ================================================================== */

  var pageModule = {
    id: 'signals',
    label: '实时曲线',
    navLabel: '曲线',

    mount: function (root, api) {
      page.root = root;
      page.api = api;
      page.mounted = true;
      root.classList.add('pg-signals', 'page-pad');
      clear(root);
      page.view = buildSkeleton(root);
      try {
        createChart(page.view, api);
      } catch (err) {
        if (window.console) window.console.error('[signals] 图表初始化失败', err);
        page.view.banners.appendChild(h('div', { class: 'notice', 'data-tone': 'danger', role: 'alert' }, [
          icon('warning', { size: 15 }),
          h('span', {}, '图表引擎不可用：' + (err && err.message ? err.message : err))
        ]));
        setHidden(page.view.banners, false);
      }
      bindRangeInputs(page.view);
      page.resizeHandler = function () { onViewportChange(); };
      window.addEventListener('resize', page.resizeHandler);
      applyQaParams(api.getState());
      renderNow(api.getState(), 'boot');
    },

    update: function (state, reason) {
      if (!page.mounted) return;
      page.state = state;
      if (state.page !== 'signals') return;
      renderNow(state, reason || 'all');
    },

    unmount: function () {
      if (page.resizeHandler) {
        window.removeEventListener('resize', page.resizeHandler);
        page.resizeHandler = null;
      }
      if (page.chart && page.chart.destroy) page.chart.destroy();
      page.chart = null;
      page.mounted = false;
    }
  };

  pages['signals'] = pageModule;

  // 供 Lead QA 使用的轻量调试信息（不属于契约接口）
  pageModule.__debug = function () {
    return {
      mounted: page.mounted,
      viewKey: page.viewKey,
      socZoom: page.socZoom,
      chart: !!page.chart,
      hasGetLayout: !!(page.chart && page.chart.getLayout),
      chartKeys: page.chart ? Object.keys(page.chart) : [],
      destroyed: !!(page.chart && page.chart.isDestroyed && page.chart.isDestroyed()),
      rows: page.signalRows.length,
      snapRows: page.snapRows.length,
      tableRows: page.tableRows.length,
      layout: page.chart && page.chart.getLayout ? page.chart.getLayout() : null
    };
  };
})();
