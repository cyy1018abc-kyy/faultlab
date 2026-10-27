/* owner: causal-compare | module: page-compare | contract: docs/CONTRACT.md */
/* 实验结果对比页：基准/试验 Run 选择、一致性检查、指标卡、叠加/双屏/差值视图、
   事件分叉线、发现与局限、导出。数值只来自 run.timeseries / run.metrics /
   FL.core.compareRuns / FL.exporter，页面不生成数值。 */
(function () {
  'use strict';
  const FL = window.FL = window.FL || {};
  const pages = FL.pages = FL.pages || {};

  /* 指标卡分组（对应规格 §7.3 的六类 + focal_change）。
     FL-001 使用 DATA_CONTRACT_SPEC §2.6 的 P0 契约指标 ID（*_60s/*_end_pp/focal_change_A）；
     FC/GT 冻结预览沿用旧 ID——两组 ID 并列，由 metricLoose 兼容匹配。 */
  const METRIC_GROUPS = [
    {
      id: 'energy-load', title: '负载需求电能 / 实际服务电能',
      desc: '负载需求与母线实际服务电能的积分，用于核对需求是否被满足。',
      metrics: ['E_load_kWh', 'E_load_served_kWh', 'E_load_served_60s']
    },
    {
      id: 'energy-source', title: '电源电能 / 电池电能积分',
      desc: '电源真实电能与电池真实电能（带符号）的积分；二者之和应与实际供电电能一致。',
      metrics: ['E_source_kWh', 'E_bat_kWh', 'E_gen_true_60s', 'E_bat_true_60s']
    },
    {
      id: 'soc', title: 'SOC 真值 / 估计 / 误差',
      desc: '真实 SOC、由测量积分的估计 SOC 及两者差值（单位：百分点 pp）。',
      metrics: ['SOC_true_end_pct', 'SOC_est_end_pct', 'SOC_err_pp', 'SOC_err_end_pp']
    },
    {
      id: 'residual', title: '最大功率平衡残差',
      desc: '最大真实守恒残差 max|r_true| 与最大测量一致性残差 max|r_meas|，两者含义不同，不得混用。',
      metrics: ['max_abs_r_true_kW', 'max_abs_r_meas_kW']
    },
    {
      id: 'fault', title: '故障激活信息',
      desc: '故障激活时刻、持续时长、峰值幅值与真正生效的控制模式。',
      metrics: ['fault_active_s', 'fault_duration_s', 'fault_peak_magnitude', 'effective_mode']
    },
    {
      id: 'focal', title: '焦点信号变化量（从故障时刻起）',
      desc: '规格要求的实际焦点信号变化量，而不是"诊断延迟"——V0.1 没有诊断算法，不统计检出率与误报率。',
      metrics: ['focal_change', 'focal_change_A'], accent: true
    }
  ];

  const COLOR_VARS = {
    acc: 'var(--acc)', obs: 'var(--obs)', warm: 'var(--warm)',
    fault: 'var(--fault)', ok: 'var(--ok)', ink: 'var(--ink-2)'
  };

  let el = null;
  let UI = null;
  let FMT = null;
  let apiRef = null;

  let refs = null;
  let lastKey = '';
  let lastData = null;
  let charts = [];
  let checksOpen = false;
  let expandedCats = {};
  let resizeTimer = null;

  /* --------------------------------------------------------------- utils */
  function act(name) {
    const args = Array.prototype.slice.call(arguments, 1);
    return apiRef.actions[name].apply(apiRef.actions, args);
  }
  function pageState(state) {
    return (state && state.pageState && state.pageState.compare) || {};
  }
  function systemOf(systemId) {
    try { return apiRef.systems.get(systemId); } catch (e) { return null; }
  }
  function metricOf(run, id) {
    if (!run || !run.metrics) return null;
    for (let i = 0; i < run.metrics.length; i++) if (run.metrics[i].metric_id === id) return run.metrics[i];
    return null;
  }
  function metricLoose(run, id) {
    const m = metricOf(run, id);
    if (m) return m;
    if (!run || !run.metrics) return null;
    for (let i = 0; i < run.metrics.length; i++) {
      const mid = run.metrics[i].metric_id || '';
      if (mid.indexOf(id) === 0 || (id === 'focal_change' && mid.indexOf('focal') >= 0)) return run.metrics[i];
    }
    return null;
  }
  function signalOf(run, id) {
    if (!run || !run.signals) return null;
    for (let i = 0; i < run.signals.length; i++) if (run.signals[i].id === id) return run.signals[i];
    return null;
  }
  function colorVar(token) { return COLOR_VARS[token] || COLOR_VARS.acc; }
  function modeLabel(mode) {
    if (mode === 'closed_loop') return '闭环反馈';
    if (mode === 'monitor') return '仅监测';
    if (mode === 'healthy' || mode === 'none') return '无故障';
    return mode || '不可用';
  }
  function enumMetricText(v) {
    if (v == null) return '不可用';
    if (v === 'closed_loop' || v === 'monitor' || v === 'healthy' || v === 'none') return modeLabel(v);
    return String(v);
  }
  function statusMeta(status) {
    if (status === 'pass') return { tone: 'ok', text: '通过', icon: 'check', short: '一致' };
    if (status === 'warn') return { tone: 'warn', text: '警告', icon: 'warning', short: '警告' };
    if (status === 'fail') return { tone: 'danger', text: '未通过', icon: 'x', short: '不一致' };
    return { tone: 'neutral', text: '未检查', icon: 'help', short: '未检查' };
  }
  function worstStatus(list) {
    let out = 'pass';
    let has = false;
    list.forEach((s) => {
      has = true;
      if (s === 'fail') out = 'fail';
      else if (s === 'warn' && out !== 'fail') out = 'warn';
    });
    return has ? out : 'unknown';
  }
  function delayFrame(fn) {
    if (window.requestAnimationFrame) window.requestAnimationFrame(fn);
    else setTimeout(fn, 16);
  }

  /* ------------------------------------------------------ run resolution */
  function resolveRuns(state) {
    const ps = pageState(state);
    const runs = state.runs || {};
    const list = Object.keys(runs).map((id) => runs[id]).filter(Boolean);
    const byRole = (role) => list.filter((r) => r.role === role);
    const baselines = byRole('baseline');
    const faults = byRole('fault');
    const contrasts = byRole('contrast');
    const others = list.filter((r) => ['baseline', 'fault', 'contrast'].indexOf(r.role) < 0);
    let baseline = null;
    if (ps.baselineRunId && runs[ps.baselineRunId]) baseline = runs[ps.baselineRunId];
    if (!baseline && state.baselineRun) baseline = state.baselineRun;
    if (!baseline && baselines.length) baseline = baselines[baselines.length - 1];
    let trial = null;
    if (ps.trialRunId && runs[ps.trialRunId]) trial = runs[ps.trialRunId];
    if (trial && baseline && trial.runId === baseline.runId) trial = null;
    if (!trial && state.activeRun && (!baseline || state.activeRun.runId !== baseline.runId)) trial = state.activeRun;
    if (!trial && faults.length) trial = faults[faults.length - 1];
    if (!trial) trial = contrasts[contrasts.length - 1] || others[others.length - 1] || null;
    if (trial && baseline && trial.runId === baseline.runId) trial = null;
    return { list: list, baselines: baselines, faults: faults, contrasts: contrasts, others: others, baseline: baseline, trial: trial };
  }

  function getComparison(baseline, trial) {
    if (!baseline || !trial) return { result: null, error: null };
    let result = null;
    let error = null;
    try {
      if (apiRef.core && apiRef.core.compareRuns) result = apiRef.core.compareRuns(baseline, trial);
      else error = new Error('核心模块 FL.core.compareRuns 未就绪');
    } catch (e) {
      error = e;
      result = null;
    }
    return { result: result, error: error };
  }

  /* ------------------------------------------------------------ skeleton */
  function buildSkeleton(root) {
    UI.clear(root);
    const wrap = el('div', { class: 'pg-compare page-pad' });
    refs = {
      wrap: wrap,
      head: el('header', { class: 'cp-head', 'aria-label': '对比运行选择' }),
      notices: el('div', { class: 'cp-notices', role: 'status' }),
      empty: el('div', { class: 'cp-empty' }),
      metrics: el('section', { class: 'cp-metrics-section' }),
      view: el('section', { class: 'cp-view-section' }),
      findings: el('section', { class: 'cp-findings-section' }),
      export: el('section', { class: 'cp-export-section' })
    };
    wrap.appendChild(refs.head);
    wrap.appendChild(refs.notices);
    wrap.appendChild(refs.empty);
    wrap.appendChild(refs.metrics);
    wrap.appendChild(refs.view);
    wrap.appendChild(refs.findings);
    wrap.appendChild(refs.export);
    root.appendChild(wrap);
  }

  /* --------------------------------------------------------- run pickers */
  function buildRunOptions(selectedId, placeholder) {
    const cur = resolveRuns(apiRef.getState());
    const select = el('select', { class: 'cp-select', 'aria-label': placeholder });
    select.appendChild(el('option', { value: '', selected: !selectedId }, placeholder));
    const groups = [
      { label: '基准运行（无故障）', items: cur.baselines },
      { label: '试验运行（故障）', items: cur.faults },
      { label: '仅监测对照运行', items: cur.contrasts },
      { label: '其他运行', items: cur.others }
    ];
    groups.forEach((group) => {
      if (!group.items.length) return;
      const og = el('optgroup', { label: group.label });
      group.items.forEach((run) => {
        og.appendChild(el('option', { value: run.runId, selected: run.runId === selectedId }, [
          run.runId + ' · ' + (run.label || run.role || '')
        ]));
      });
      select.appendChild(og);
    });
    return select;
  }

  function runMetaLine(run, roleLabel) {
    if (!run) return null;
    const cfg = run.config || {};
    return el('div', { class: 'cp-run-meta mono' }, [
      el('span', { class: 'cp-run-id' }, run.runId),
      el('span', { class: 'cp-run-dot' }, '·'),
      el('span', {}, roleLabel || (run.role === 'baseline' ? '基准' : run.role === 'contrast' ? '仅监测对照' : '试验')),
      el('span', { class: 'cp-run-dot' }, '·'),
      el('span', {}, cfg.feedback_mode === 'monitor' ? '仅监测' : '闭环'),
      el('span', { class: 'cp-run-dot' }, '·'),
      el('span', {}, 'hash ' + FMT.hash(run.configHash)),
      el('span', { class: 'cp-run-dot' }, '·'),
      el('span', {}, (cfg.duration_s != null ? cfg.duration_s : 60) + ' s / ' + (cfg.dt_s != null ? cfg.dt_s : 0.1) + ' s')
    ]);
  }

  function renderHead(data) {
    const host = refs.head;
    UI.clear(host);
    host.appendChild(el('div', { class: 'cp-head-title' }, [
      el('div', { class: 'eyebrow' }, '实验结果对比 · COMPARE & REPORT'),
      el('div', { class: 'cp-head-hint' },
        '校验两次运行是否可比；结论只表述「与基准差异」，不把差异直接归因为故障。')
    ]));

    const pickRow = el('div', { class: 'cp-run-row' });
    const baseSel = buildRunOptions(data.baseline ? data.baseline.runId : '', '— 选择基准运行 —');
    baseSel.addEventListener('change', () => {
      const id = baseSel.value || null;
      const patch = { baselineRunId: id };
      const ps = pageState(apiRef.getState());
      if (id && ps.trialRunId === id) patch.trialRunId = null;
      act('setPageState', 'compare', patch);
    });
    const trialSel = buildRunOptions(data.trial ? data.trial.runId : '', '— 选择试验运行 —');
    trialSel.addEventListener('change', () => {
      const id = trialSel.value || null;
      const patch = { trialRunId: id };
      const ps = pageState(apiRef.getState());
      if (id && ps.baselineRunId === id) patch.baselineRunId = null;
      act('setPageState', 'compare', patch);
    });

    pickRow.appendChild(el('div', { class: 'cp-pick' }, [
      el('div', { class: 'cp-pick-label' }, [
        el('span', { class: 'eyebrow' }, '基准运行'),
        el('span', { class: 'cp-pick-tag mono' }, 'BASELINE')
      ]),
      baseSel,
      runMetaLine(data.baseline, '基准')
    ]));
    pickRow.appendChild(el('div', { class: 'cp-vs', 'aria-hidden': 'true' }, 'VS'));
    pickRow.appendChild(el('div', { class: 'cp-pick' }, [
      el('div', { class: 'cp-pick-label' }, [
        el('span', { class: 'eyebrow' }, '试验运行'),
        el('span', { class: 'cp-pick-tag mono' }, 'TRIAL')
      ]),
      trialSel,
      runMetaLine(data.trial, '试验')
    ]));
    host.appendChild(pickRow);
    host.appendChild(renderChecks(data));
  }

  /* 一致性检查：3 组徽章（模型版本 / 参数（除故障） / 时钟）--------------- */
  function groupChecks(checks) {
    const groups = [
      { id: 'model', label: '模型版本', patterns: ['model', 'engine'] },
      { id: 'param', label: '参数（除故障）', patterns: ['param', 'initial', 'load', 'observ', 'config'] },
      { id: 'clock', label: '时钟', patterns: ['clock', 'time', 'duration', 'dt', 'sampl', 'length'] }
    ];
    const out = groups.map((g) => ({ id: g.id, label: g.label, checks: [] }));
    const pool = checks || [];
    pool.forEach((c) => {
      const hay = ((c.id || '') + ' ' + (c.label || '')).toLowerCase();
      let target = null;
      for (let i = 0; i < groups.length; i++) {
        if (groups[i].patterns.some((p) => hay.indexOf(p) >= 0)) { target = out[i]; break; }
      }
      if (target) target.checks.push(c);
    });
    /* 兜底：若 compareRuns 恰好返回 3 条且关键词未命中，按契约顺序映射 */
    if (!out.some((g) => g.checks.length) && pool.length === 3) {
      pool.forEach((c, i) => { if (out[i]) out[i].checks.push(c); });
    }
    out.forEach((g) => { g.status = worstStatus(g.checks.map((c) => c.status)); });
    return out;
  }

  function renderChecks(data) {
    const host = el('div', { class: 'cp-checks' });
    const comp = data.comparison;
    const checks = comp && Array.isArray(comp.checks) ? comp.checks : [];
    const groups = groupChecks(checks);
    host.appendChild(el('span', { class: 'cp-checks-label eyebrow' },
      checks.length ? '一致性检查' : '一致性检查（需要基准 + 试验）'));
    groups.forEach((g) => {
      const meta = statusMeta(g.status);
      const badge = UI.badge(g.label + ' ' + meta.short, { tone: meta.tone, icon: meta.icon });
      badge.title = g.checks.length
        ? g.checks.map((c) => (c.label || c.id) + '：' + (c.message || meta.text)).join('\n')
        : 'compareRuns 未返回该类检查项';
      host.appendChild(badge);
    });
    if (checks.length) {
      host.appendChild(el('button', {
        class: 'btn btn-ghost btn-xs cp-checks-toggle', type: 'button',
        'aria-expanded': String(checksOpen), title: '展开全部一致性检查与说明',
        on: {
          click: () => {
            checksOpen = !checksOpen;
            renderChecksInto(data);
          }
        }
      }, [UI.icon(checksOpen ? 'chevron-down' : 'chevron-right', { size: 12 }), el('span', {}, '全部 ' + checks.length + ' 项')]));
    }
    if (checksOpen && checks.length) {
      const list = el('div', { class: 'cp-check-list' });
      checks.forEach((c) => {
        const meta = statusMeta(c.status);
        list.appendChild(el('div', { class: 'cp-check-item', 'data-status': c.status || 'warn' }, [
          UI.badge(meta.text, { tone: meta.tone, icon: meta.icon }),
          el('div', { class: 'cp-check-text' }, [
            el('div', { class: 'cp-check-name' }, (c.label || c.id || '检查项') + (c.id ? '（' + c.id + '）' : '')),
            el('div', { class: 'cp-check-msg' }, c.message || '')
          ])
        ]));
      });
      host.appendChild(list);
    }
    return host;
  }

  function renderChecksInto(data) {
    const old = refs.head.querySelector('.cp-checks');
    if (!old) { renderHead(data); return; }
    old.parentNode.replaceChild(renderChecks(data), old);
  }

  /* ------------------------------------------------------------ notices */
  function renderNotices(data) {
    const host = refs.notices;
    UI.clear(host);
    const comp = data.comparison;
    const items = [];
    if (!data.baseline && data.trial) {
      items.push({ tone: 'warn', text: '缺少基准运行：没有无故障对照就无法判断试验变化的来源。请创建基准运行后再查看指标与曲线对比。' });
    }
    if (comp) {
      const checkIssues = (comp.checks || []).filter((c) => c.status === 'warn' || c.status === 'fail');
      if (comp.valid === false || checkIssues.length) {
        const msgs = [];
        checkIssues.forEach((c) => { if (c.message) msgs.push(c.message); });
        (comp.warnings || []).forEach((w) => { if (msgs.indexOf(w) < 0) msgs.push(w); });
        items.push({
          tone: 'warn',
          title: comp.valid === false ? '对比有效性未通过：本页只表述「与基准差异」' : '对比一致性存在警告：差异归因需谨慎',
          text: '以下条件不完全一致，因此不把差异表述为「因故障导致」，只表述「与基准差异」。' +
            (msgs.length ? ' 差异项：' + msgs.join('；') : '')
        });
      }
      if (comp.diffAllowed === false) {
        items.push({
          tone: 'warn',
          title: '差值视图不可用',
          text: '两次运行的单位或时间基准不兼容，无法绘制「试验 − 基准」差值曲线；叠加/双屏视图仍可用。' +
            ((comp.warnings || []).length ? ' ' + (comp.warnings || []).join('；') : '')
        });
      }
      if (comp.valid === true && !checkIssues.length && comp.diffAllowed !== false) {
        items.push({ tone: 'ok', text: '一致性检查通过：模型版本、参数（除故障）与时钟一致，可在演示口径下比较两次运行。' });
      }
    }
    if (data.baseline && data.baseline.config && data.baseline.config.fault &&
      data.baseline.config.fault.family && data.baseline.config.fault.family !== 'none') {
      items.push({
        tone: 'warn',
        text: '所选基准运行本身包含故障注入（' + data.baseline.runId + '），它不能代表无故障对照，差异不等于故障影响。'
      });
    }
    if (data.trial && !faultEvents(data.trial).length) {
      items.push({ tone: 'info', text: '试验运行没有故障事件：对比仅反映配置/模型层面的差异。' });
    }
    const bMode = data.baseline && data.baseline.config ? data.baseline.config.feedback_mode : null;
    const tMode = data.trial && data.trial.config ? data.trial.config.feedback_mode : null;
    if (data.baseline && data.trial && bMode !== tMode) {
      items.push({
        tone: 'info',
        title: '两次运行的控制模式不同（刻意对照）',
        text: '基准为「' + modeLabel(bMode) + '」，试验为「' + modeLabel(tMode) +
          '」。差异反映反馈回路与测量通道机制，而不是故障对真实物理量的影响；本页不会把它表述为"故障导致"。'
      });
    }
    if (data.comparisonError) {
      items.push({ tone: 'danger', text: '对比计算失败：' + (data.comparisonError.message || String(data.comparisonError)) });
    }
    items.forEach((item) => {
      const tone = item.tone || 'info';
      host.appendChild(el('div', {
        class: 'notice', 'data-tone': tone,
        role: (tone === 'warn' || tone === 'danger') ? 'alert' : 'status'
      }, [
        UI.icon(tone === 'warn' || tone === 'danger' ? 'warning' : tone === 'ok' ? 'check' : 'info', { size: 14 }),
        el('div', { class: 'cp-notice-text' }, [
          item.title ? el('div', { class: 'cp-notice-title' }, item.title) : null,
          el('div', {}, item.text)
        ])
      ]));
    });
  }

  /* -------------------------------------------------------- empty states */
  function renderEmpty(data) {
    const host = refs.empty;
    UI.clear(host);
    const hasAny = data.list.length > 0;
    const show = !data.baseline || !data.trial;
    host.hidden = !show;
    if (!show) return;
    const panel = el('div', { class: 'fl-panel cp-empty-panel' });
    if (!hasAny) {
      panel.appendChild(UI.emptyState({
        icon: 'compare',
        title: '还没有可对比的运行',
        desc: '结果对比需要至少一个故障试验运行和一个无故障基准运行。先到系统交互图创建默认实验（首次创建会自动生成基准运行）。'
      }));
      panel.appendChild(el('div', { class: 'cp-empty-actions' }, [
        el('button', {
          class: 'btn btn-primary btn-sm', type: 'button',
          on: { click: () => act('navigate', 'system') }
        }, [UI.icon('grid', { size: 13 }), el('span', {}, '前往系统交互图创建运行')])
      ]));
    } else if (!data.trial) {
      panel.appendChild(UI.emptyState({
        icon: 'flask',
        title: '还没有试验运行',
        desc: '试验运行是带故障注入的那次运行。创建试验运行后即可与基准运行对比。'
      }));
      panel.appendChild(el('div', { class: 'cp-empty-actions' }, [
        el('button', {
          class: 'btn btn-primary btn-sm', type: 'button',
          on: { click: () => act('navigate', 'system') }
        }, [UI.icon('grid', { size: 13 }), el('span', {}, '前往系统交互图创建试验运行')])
      ]));
    } else if (!data.baseline) {
      panel.appendChild(UI.emptyState({
        icon: 'compare',
        title: '缺少无故障基准运行',
        desc: '基准运行使用相同配置但不注入故障，用来区分"故障导致的变化"与"配置本身的差异"。'
      }));
      panel.appendChild(el('div', { class: 'cp-empty-actions' }, [
        el('button', {
          class: 'btn btn-primary btn-sm', type: 'button',
          on: { click: createBaseline }
        }, [UI.icon('plus', { size: 13 }), el('span', {}, '创建基准运行')]),
        el('button', {
          class: 'btn btn-ghost btn-sm', type: 'button',
          on: { click: () => act('navigate', 'system') }
        }, [UI.icon('grid', { size: 13 }), el('span', {}, '去系统页查看配置')])
      ]));
    }
    host.appendChild(panel);
  }

  function createBaseline() {
    try {
      const run = act('ensureBaseline', { explicit: true });
      if (run && run.runId) {
        act('setPageState', 'compare', { baselineRunId: run.runId });
        act('toast', '已创建无故障基准运行 ' + run.runId, 'ok');
      } else {
        act('toast', '无法创建基准运行：请先在系统交互图创建一次运行（基准会用当前配置草稿生成）', 'warn');
      }
    } catch (e) {
      act('toast', '创建基准运行失败：' + (e && e.message ? e.message : String(e)), 'danger');
    }
  }

  /* -------------------------------------------------------------- metrics */
  function pairFor(comp, metricId) {
    if (!comp || !Array.isArray(comp.pairs)) return null;
    for (let i = 0; i < comp.pairs.length; i++) if (comp.pairs[i].metric_id === metricId) return comp.pairs[i];
    return null;
  }

  function metricEntry(data, metricId) {
    const comp = data.comparison;
    const pair = pairFor(comp, metricId);
    const baseMetric = (pair && pair.baseline && Object.keys(pair.baseline).length) ? pair.baseline : metricLoose(data.baseline, metricId);
    const trialMetric = (pair && pair.trial && Object.keys(pair.trial).length) ? pair.trial : metricLoose(data.trial, metricId);
    const unit = (trialMetric && trialMetric.unit) || (baseMetric && baseMetric.unit) || (pair && pair.deltaUnit) || '';
    const label = (trialMetric && trialMetric.label) || (baseMetric && baseMetric.label) || metricId;
    const precision = (trialMetric && trialMetric.precision != null) ? trialMetric.precision :
      ((baseMetric && baseMetric.precision != null) ? baseMetric.precision : 3);
    const baseValue = (baseMetric && !baseMetric.unavailable && baseMetric.value != null) ? baseMetric.value : null;
    const trialValue = (trialMetric && !trialMetric.unavailable && trialMetric.value != null) ? trialMetric.value : null;
    const unavailable = !baseMetric && !trialMetric;
    let delta = null;
    let deltaNote = '';
    const numeric = typeof baseValue === 'number' && typeof trialValue === 'number';
    if (pair && pair.delta != null) {
      delta = pair.delta;
    } else if (numeric) {
      const bu = (baseMetric && baseMetric.unit) || '';
      const tu = (trialMetric && trialMetric.unit) || '';
      if (bu === tu) delta = trialValue - baseValue;
      else deltaNote = '不可用（单位不一致）';
    } else if (typeof baseValue === 'string' || typeof trialValue === 'string') {
      deltaNote = '不可用（非数值指标）';
    } else if (baseValue == null || trialValue == null) {
      deltaNote = '不可用（缺失数据）';
    }
    return {
      id: metricId, label: label, unit: unit, precision: precision,
      baseline: baseMetric || null, trial: trialMetric || null,
      baseValue: baseValue, trialValue: trialValue,
      delta: delta, deltaNote: deltaNote, unavailable: unavailable, pair: pair
    };
  }

  function valueText(entry, which) {
    const m = which === 'base' ? entry.baseline : entry.trial;
    const v = which === 'base' ? entry.baseValue : entry.trialValue;
    if (!m) return { text: '不可用', unavailable: true, title: '运行未提供该指标（metric_id=' + entry.id + '）' };
    if (m.unavailable || v == null) return { text: '不可用', unavailable: true, title: '指标被标记为不可用或缺失，不填 0 冒充' };
    if (typeof v === 'string') return { text: enumMetricText(v), unavailable: false, title: v };
    if (typeof v === 'number') {
      const d = m.precision != null ? m.precision : entry.precision;
      return { text: FMT.num(v === 0 ? 0 : v, d), unavailable: false, title: '' };
    }
    return { text: String(v), unavailable: false, title: '' };
  }

  function deltaText(entry) {
    if (entry.deltaNote) return { text: entry.deltaNote, tone: 'muted' };
    if (entry.delta == null) return { text: '差值不可用', tone: 'muted' };
    if (typeof entry.delta === 'number') {
      const d = entry.precision;
      const roundedZero = Math.abs(entry.delta) < Math.pow(10, -d) / 2;
      return {
        text: roundedZero ? FMT.num(0, d) : FMT.signed(entry.delta, d),
        tone: roundedZero ? 'zero' : (entry.delta > 0 ? 'pos' : 'neg')
      };
    }
    return { text: String(entry.delta), tone: 'muted' };
  }

  function windowText(m) {
    if (!m || !m.time_window) return '不可用';
    return FMT.num(m.time_window[0], 1) + ' – ' + FMT.num(m.time_window[1], 1) + ' s';
  }

  function renderMetrics(data) {
    const host = refs.metrics;
    UI.clear(host);
    host.appendChild(el('div', { class: 'cp-section-head' }, [
      el('div', {}, [
        el('div', { class: 'panel-title' }, '关键指标'),
        el('div', { class: 'panel-sub' }, '规格 §7.3 六类指标 + 焦点信号变化量；数值来源为 run.metrics / compareRuns.pairs，缺失显示「不可用」不填 0。')
      ]),
      el('div', { class: 'cp-section-side' }, [
        UI.badge('基准 → 试验 → 差值', { tone: 'info', icon: 'swap' })
      ])
    ]));

    const grid = el('div', { class: 'cp-metric-grid' });
    METRIC_GROUPS.forEach((group) => {
      const card = el('section', {
        class: 'cp-cat fl-card' + (group.accent ? ' is-accent' : ''),
        'data-cat': group.id,
        'aria-label': group.title
      });
      const expanded = !!expandedCats[group.id];
      card.appendChild(el('button', {
        class: 'cp-cat-head', type: 'button',
        'aria-expanded': String(expanded),
        title: '点击展开 / 收起指标定义（method、时间窗、来源运行）',
        on: {
          click: () => {
            expandedCats[group.id] = !expandedCats[group.id];
            renderMetrics(data);
          }
        }
      }, [
        el('span', { class: 'cp-cat-title' }, group.title),
        el('span', { class: 'cp-cat-meta mono' }, group.metrics.length + ' 项'),
        UI.icon(expanded ? 'chevron-down' : 'chevron-right', { size: 13 })
      ]));

      const rowsHost = el('div', { class: 'cp-cat-rows' });
      group.metrics.forEach((metricId) => {
        const entry = metricEntry(data, metricId);
        const b = valueText(entry, 'base');
        const t = valueText(entry, 'trial');
        const d = deltaText(entry);
        const row = el('div', { class: 'cp-metric-row', 'data-metric': metricId });
        row.appendChild(el('div', { class: 'cp-metric-name' }, [
          el('span', { class: 'cp-metric-label' }, entry.label || metricId),
          el('span', { class: 'cp-metric-id mono' }, metricId)
        ]));
        row.appendChild(el('div', { class: 'cp-metric-flow' }, [
          el('span', { class: 'cp-mv cp-mv-base' + (b.unavailable ? ' is-unavailable' : ''), title: b.title || '基准值' }, b.text),
          el('span', { class: 'cp-flow-arrow', 'aria-hidden': 'true' }, '→'),
          el('span', { class: 'cp-mv cp-mv-trial' + (t.unavailable ? ' is-unavailable' : ''), title: t.title || '试验值' }, t.text),
          entry.unit ? el('span', { class: 'cp-munit mono' }, entry.unit) : null
        ]));
        row.appendChild(el('div', { class: 'cp-metric-delta', 'data-tone': d.tone }, [
          el('span', { class: 'cp-delta-label mono' }, 'Δ'),
          el('span', { class: 'cp-delta-value num' }, d.text)
        ]));
        const tags = el('div', { class: 'cp-metric-src' });
        if (entry.trial && entry.trial.source_kind) tags.appendChild(UI.sourceTag(entry.trial.source_kind));
        if (entry.baseline && entry.baseline.source_kind &&
          (!entry.trial || entry.baseline.source_kind !== entry.trial.source_kind)) {
          tags.appendChild(UI.sourceTag(entry.baseline.source_kind));
        }
        row.appendChild(tags);
        rowsHost.appendChild(row);
        if (expanded) {
          const defRows = [
            ['定义', entry.label || metricId],
            ['method', (entry.trial && entry.trial.method) || (entry.baseline && entry.baseline.method) || '不可用'],
            ['时间窗', windowText(entry.trial) !== '不可用' ? windowText(entry.trial) : windowText(entry.baseline)],
            ['基准来源', (entry.baseline && entry.baseline.source_run_ids ? entry.baseline.source_run_ids.join(', ') : (data.baseline ? data.baseline.runId : '不可用'))],
            ['试验来源', (entry.trial && entry.trial.source_run_ids ? entry.trial.source_run_ids.join(', ') : (data.trial ? data.trial.runId : '不可用'))],
            ['精度 / 单位', (entry.precision != null ? String(entry.precision) : '—') + ' 位 / ' + (entry.unit || '无单位')]
          ];
          const def = el('div', { class: 'cp-metric-def' });
          def.appendChild(el('div', { class: 'cp-def-title' }, '指标定义 · ' + (entry.label || metricId)));
          const kv = el('dl', { class: 'kv' });
          defRows.forEach((pair) => {
            kv.appendChild(el('dt', { class: 'mono' }, pair[0]));
            kv.appendChild(el('dd', {}, pair[1]));
          });
          def.appendChild(kv);
          rowsHost.appendChild(def);
        }
      });
      card.appendChild(rowsHost);
      grid.appendChild(card);
    });
    host.appendChild(grid);
    host.appendChild(el('p', { class: 'cp-section-note' },
      '提示：max|r_true| 是真实守恒残差（理想模型下恒为 0）；max|r_meas| 是测量一致性残差，两者含义不同。' +
      'SOC 误差单位为百分点（pp），不是能量损失。'));
  }

  /* ---------------------------------------------------------------- view */
  function faultEvents(run) {
    if (!run || !run.events) return [];
    return run.events.filter((e) => e && e.event_type && e.event_type !== 'healthy');
  }

  function compatibleSignals(data, view, signalId) {
    const trial = data.trial;
    const baseline = data.baseline;
    if (!trial) return { list: [], selected: null, incompatibleSelected: '' };
    const list = [];
    (trial.signals || []).forEach((sig) => {
      if (sig.tableOnly) return;
      const b = signalOf(baseline, sig.id);
      if (view === 'diff') {
        let compatible = true;
        let reason = '';
        if (sig.sourceKind === 'FAULT_EVENT') { compatible = false; reason = '故障事件通道不可作差'; }
        else if (!b) { compatible = false; reason = '基准运行无同语义信号'; }
        else if ((b.unit || '') !== (sig.unit || '')) {
          compatible = false;
          reason = '单位不一致（' + (b.unit || '—') + ' vs ' + (sig.unit || '—') + '）';
        } else if (b.category !== sig.category) { compatible = false; reason = '语义类别不一致'; }
        list.push({ sig: sig, trialSig: sig, baselineSig: b, compatible: compatible, reason: reason });
      } else {
        list.push({ sig: sig, trialSig: sig, baselineSig: b, compatible: true, reason: b ? '' : '基准运行无此信号' });
      }
    });
    const pick = (id) => list.filter((it) => it.sig.id === id)[0] || null;
    let selected = null;
    let incompatibleSelected = '';
    if (signalId) {
      const want = pick(signalId);
      if (want && (view !== 'diff' || want.compatible)) selected = want;
      else if (want) incompatibleSelected = '「' + (want.sig.label || want.sig.id) + '」在差值视图不可用：' + want.reason;
    }
    if (!selected) {
      const focal = metricLoose(trial, 'focal_change');
      const focalSignalId = focal && (focal.signal_id || focal.signalId);
      if (focalSignalId) {
        const it = pick(focalSignalId);
        if (it && (view !== 'diff' || it.compatible)) selected = it;
      }
    }
    if (!selected) {
      selected = list.filter((it) => it.sig.sourceKind === 'MODEL_STATE' && /_true_/.test(it.sig.id) && (view !== 'diff' || it.compatible))[0] || null;
    }
    if (!selected) {
      selected = list.filter((it) => it.sig.sourceKind === 'MODEL_STATE' && !it.sig.tableOnly && (view !== 'diff' || it.compatible))[0] || null;
    }
    if (!selected) selected = list.filter((it) => view !== 'diff' || it.compatible)[0] || null;
    return { list: list, selected: selected, incompatibleSelected: incompatibleSelected, diffCompatibleCount: list.filter((it) => it.compatible).length };
  }

  function destroyCharts() {
    charts.forEach((item) => { try { item.chart.destroy(); } catch (e) { /* ignore */ } });
    charts = [];
  }

  function chartCanvas(host, ariaLabel) {
    const box = el('div', { class: 'cp-canvas-box' });
    const canvas = el('canvas', { class: 'cp-canvas', role: 'img', 'aria-label': ariaLabel });
    box.appendChild(canvas);
    host.appendChild(box);
    return canvas;
  }

  function createChart(canvas, height, duration, ariaLabel) {
    if (!apiRef.chart || !apiRef.chart.create) throw new Error('图表模块 FL.chart 未就绪');
    return apiRef.chart.create(canvas, {
      height: height,
      xDomain: [0, duration],
      yDomain: null,
      onCursorDrag: (t) => act('setTime', t, { pause: true }),
      onClick: ({ t }) => act('setTime', t, { pause: true }),
      ariaLabel: ariaLabel
    });
  }

  function seriesFor(data, item, which) {
    const run = which === 'baseline' ? data.baseline : data.trial;
    const sig = which === 'baseline' ? item.baselineSig : item.trialSig;
    if (!run || !sig) return null;
    const arr = run.timeseries && run.timeseries.signals ? run.timeseries.signals[sig.id] : null;
    if (!arr) return null;
    const semanticStyle = (sig.chart && sig.chart.style) || 'solid';
    const token = (sig.chart && sig.chart.colorToken) || 'acc';
    if (which === 'baseline') {
      return {
        id: 'baseline-' + sig.id,
        label: '基准 ' + (sig.shortLabel || sig.label || sig.id),
        unit: sig.unit || '',
        axis: (sig.chart && sig.chart.axis) || 'left',
        colorToken: token,
        style: 'dotted',
        opacity: 0.45,
        width: 1.6,
        step: !!(sig.chart && sig.chart.step),
        points: { t: run.timeseries.t, v: arr }
      };
    }
    return {
      id: 'trial-' + sig.id,
      label: '试验 ' + (sig.shortLabel || sig.label || sig.id),
      unit: sig.unit || '',
      axis: (sig.chart && sig.chart.axis) || 'left',
      colorToken: token,
      style: semanticStyle,
      opacity: 1,
      width: 2,
      step: !!(sig.chart && sig.chart.step),
      points: { t: run.timeseries.t, v: arr }
    };
  }

  function diffSeries(data, item) {
    const trial = data.trial;
    const baseline = data.baseline;
    if (!trial || !baseline || !item.trialSig || !item.baselineSig) return null;
    const ta = trial.timeseries.signals[item.trialSig.id];
    const ba = baseline.timeseries.signals[item.baselineSig.id];
    if (!ta || !ba) return null;
    if (ta.length !== ba.length) return null;
    const out = new Array(ta.length);
    for (let i = 0; i < ta.length; i++) out[i] = (typeof ta[i] === 'number' && typeof ba[i] === 'number') ? ta[i] - ba[i] : NaN;
    return {
      id: 'diff-' + item.trialSig.id,
      label: '差值（试验 − 基准）',
      unit: item.trialSig.unit || '',
      axis: (item.trialSig.chart && item.trialSig.chart.axis) || 'left',
      colorToken: 'obs',
      style: 'solid',
      opacity: 1,
      width: 2,
      points: { t: trial.timeseries.t, v: out }
    };
  }

  function chartEvents(run) {
    return faultEvents(run).map((ev) => ({
      t: ev.trigger_s,
      label: '故障分叉 · ' + FMT.time(ev.trigger_s),
      style: 'fault'
    }));
  }

  function legendItem(style, colorToken, label) {
    return el('span', { class: 'cp-legend-item' }, [
      UI.lineSwatch(style, colorVar(colorToken), 2),
      el('span', {}, label)
    ]);
  }

  function renderView(data) {
    const host = refs.view;
    UI.clear(host);
    destroyCharts();
    const comp = data.comparison;
    const ps = pageState(apiRef.getState());
    const requested = ps.view || 'overlay';
    const diffAllowed = !comp || comp.diffAllowed !== false;
    const view = (requested === 'diff' && !diffAllowed) ? 'overlay' : requested;

    const trial = data.trial;
    const baseline = data.baseline;
    const duration = (trial && trial.config && trial.config.duration_s) || 60;
    const signals = compatibleSignals(data, view, ps.signalId);
    const selected = signals.selected;

    const panel = el('section', { class: 'cp-view fl-panel' });
    const head = el('div', { class: 'panel-head cp-view-head' }, [
      el('div', { class: 'panel-head-main' }, [
        el('span', { class: 'panel-title' }, view === 'diff' ? '差值曲线（试验 − 基准）' : view === 'split' ? '双屏同步曲线' : '曲线叠加'),
        el('span', { class: 'panel-sub' }, '事件分叉线 · 时间游标与全局时间线同步')
      ])
    ]);
    const controls = el('div', { class: 'cp-view-controls' });

    controls.appendChild(UI.segmented({
      options: [
        { value: 'overlay', label: '叠加', icon: 'chart' },
        { value: 'split', label: '双屏', icon: 'monitor' },
        {
          value: 'diff', label: '差值', icon: 'diff',
          disabled: !diffAllowed,
          title: diffAllowed ? '试验 − 基准，仅同语义同单位信号' : '单位或时间基准不兼容，差值视图不可用'
        }
      ],
      value: view,
      ariaLabel: '对比视图',
      onChange: (v) => act('setPageState', 'compare', { view: v })
    }));

    const select = el('select', { class: 'cp-select cp-signal-select', 'aria-label': '选择对比信号', title: '信号来自 run.signals（排除 tableOnly）；差值视图仅可选中同语义、同单位信号' });
    if (!signals.list.length) {
      select.disabled = true;
      select.appendChild(el('option', { value: '' }, '没有可对比信号'));
    } else {
      signals.list.forEach((item) => {
        const incompatible = view === 'diff' && !item.compatible;
        const suffix = incompatible
          ? ' · 差值不可用（' + (item.reason || '不兼容') + '）'
          : (item.baselineSig ? '' : ' · 基准无此信号');
        select.appendChild(el('option', {
          value: item.sig.id,
          selected: !!(selected && selected.sig.id === item.sig.id),
          disabled: incompatible
        }, [
          (item.sig.label || item.sig.id) + '（' + (item.sig.shortLabel || item.sig.id) + '）' + (item.sig.unit ? ' · ' + item.sig.unit : ''),
          suffix
        ]));
      });
    }
    select.addEventListener('change', () => {
      act('setPageState', 'compare', { signalId: select.value || null });
    });
    controls.appendChild(select);

    const nowEl = el('span', { class: 'cp-now mono' }, 't = ' + FMT.time(apiRef.getState().currentTime));
    refs.viewNow = nowEl;
    controls.appendChild(nowEl);
    head.appendChild(controls);
    panel.appendChild(head);

    const body = el('div', { class: 'panel-body cp-view-body' });
    panel.appendChild(body);
    host.appendChild(panel);

    if (!data.baseline || !data.trial) {
      body.appendChild(UI.emptyState({ icon: 'compare', title: '需要基准与试验两个运行', desc: '选择或创建基准/试验运行后即可绘图。' }));
      return;
    }
    if (data.comparisonError) {
      body.appendChild(el('div', { class: 'notice', 'data-tone': 'danger' }, [
        UI.icon('warning', { size: 14 }),
        el('div', {}, '对比计算失败，无法安全绘图：' + (data.comparisonError.message || String(data.comparisonError)))
      ]));
      return;
    }
    if (!selected) {
      body.appendChild(el('div', { class: 'notice', 'data-tone': 'warn' }, [
        UI.icon('warning', { size: 14 }),
        el('div', {}, view === 'diff'
          ? '没有满足「同语义、同单位」条件的信号可供差值视图使用。'
          : '两次运行没有共同可绘制的信号。')
      ]));
      return;
    }

    if (requested === 'diff' && !diffAllowed) {
      body.appendChild(el('div', { class: 'notice', 'data-tone': 'warn' }, [
        UI.icon('warning', { size: 14 }),
        el('div', {}, '差值视图不可用：两次运行的单位或时间基准不兼容，已回退到叠加视图。')
      ]));
    }
    if (signals.incompatibleSelected) {
      body.appendChild(el('div', { class: 'notice', 'data-tone': 'warn' }, [
        UI.icon('warning', { size: 14 }),
        el('div', {}, signals.incompatibleSelected + '；已切换到可比较的信号。差值只允许同语义、同单位信号，单位不同的通道不能混减。')
      ]));
    }

    const trialSig = selected.trialSig;
    const baseSig = selected.baselineSig;
    const token = (trialSig.chart && trialSig.chart.colorToken) || 'acc';
    const diffData = view === 'diff' ? diffSeries(data, selected) : null;

    /* 图例 */
    const legend = el('div', { class: 'cp-chart-legend' });
    if (view === 'diff') {
      legend.appendChild(legendItem('solid', 'obs', '差值（试验 − 基准）'));
      legend.appendChild(el('span', { class: 'cp-legend-note mono' }, '单位：' + (trialSig.unit || '—')));
      legend.appendChild(el('span', { class: 'cp-legend-note' },
        '仅同语义同单位信号可作差；不可比信号已在下拉中禁用（可差值信号 ' + signals.diffCompatibleCount + ' 项）。'));
    } else {
      legend.appendChild(legendItem((trialSig.chart && trialSig.chart.style) || 'solid', token,
        '试验 · ' + (trialSig.shortLabel || trialSig.id) + '（按信号语义线型）'));
      legend.appendChild(legendItem('dotted', token,
        '基准 · ' + (baseSig ? (baseSig.shortLabel || baseSig.id) : '无此信号') + '（dotted · 45% 透明）'));
    }
    body.appendChild(legend);

    const chartHost = el('div', { class: 'cp-chart-host' });
    body.appendChild(chartHost);

    try {
      if (view === 'split') {
        chartHost.appendChild(el('div', { class: 'cp-chart-caption' }, [
          el('span', { class: 'cp-chart-caption-title' }, '基准 · ' + data.baseline.runId),
          el('span', { class: 'cp-chart-caption-sub mono' }, (data.baseline.label || '') + ' · ' + (baseSig ? baseSig.label : '基准无此信号'))
        ]));
        const topCanvas = chartCanvas(chartHost, '基准运行 ' + (baseSig ? baseSig.label : '') + ' 曲线');
        const topChart = createChart(topCanvas, 210, duration, '基准运行曲线：' + (baseSig ? baseSig.label : ''));
        const baseSeries = seriesFor(data, selected, 'baseline');
        if (baseSeries) topChart.setSeries([baseSeries]);
        topChart.setCursor(apiRef.getState().currentTime);
        charts.push({ chart: topChart, role: 'baseline' });

        chartHost.appendChild(el('div', { class: 'cp-chart-caption' }, [
          el('span', { class: 'cp-chart-caption-title' }, '试验 · ' + data.trial.runId),
          el('span', { class: 'cp-chart-caption-sub mono' }, (data.trial.label || '') + ' · ' + trialSig.label)
        ]));
        const bottomCanvas = chartCanvas(chartHost, '试验运行 ' + trialSig.label + ' 曲线');
        const bottomChart = createChart(bottomCanvas, 250, duration, '试验运行曲线：' + trialSig.label);
        const trialSeries = seriesFor(data, selected, 'trial');
        if (trialSeries) bottomChart.setSeries([trialSeries]);
        bottomChart.setEvents(chartEvents(data.trial));
        bottomChart.setCursor(apiRef.getState().currentTime);
        charts.push({ chart: bottomChart, role: 'trial' });
      } else if (view === 'diff') {
        const canvas = chartCanvas(chartHost, '差值曲线：' + trialSig.label);
        const chart = createChart(canvas, 320, duration, '差值曲线：试验减基准 ' + trialSig.label);
        if (!diffData) {
          body.appendChild(el('div', { class: 'notice', 'data-tone': 'warn' }, [
            UI.icon('warning', { size: 14 }),
            el('div', {}, '该信号的采样长度或时间基准不一致，无法计算差值。')
          ]));
        } else {
          chart.setSeries([diffData]);
          chart.setEvents(chartEvents(data.trial));
          chart.setCursor(apiRef.getState().currentTime);
          charts.push({ chart: chart, role: 'diff', series: diffData });
        }
      } else {
        const canvas = chartCanvas(chartHost, '叠加曲线：' + trialSig.label);
        const chart = createChart(canvas, 320, duration, '曲线叠加：基准与试验 ' + trialSig.label);
        const list = [];
        const baseSeries = seriesFor(data, selected, 'baseline');
        const trialSeries = seriesFor(data, selected, 'trial');
        if (baseSeries) list.push(baseSeries);
        if (trialSeries) list.push(trialSeries);
        chart.setSeries(list);
        chart.setEvents(chartEvents(data.trial));
        chart.setCursor(apiRef.getState().currentTime);
        charts.push({ chart: chart, role: 'overlay' });
      }
    } catch (err) {
      body.appendChild(el('div', { class: 'notice', 'data-tone': 'danger' }, [
        UI.icon('warning', { size: 14 }),
        el('div', {}, '图表创建失败：' + (err && err.message ? err.message : String(err)))
      ]));
    }

    /* 图下说明 */
    const caption = el('div', { class: 'cp-chart-caption cp-chart-foot' });
    caption.appendChild(el('span', {}, '事件分叉线：故障注入时刻由试验运行事件日志给出；跨 20 s 的阶跃信号按采样保持绘制，不做平滑插值。'));
    if (view === 'overlay' && !baseSig) {
      caption.appendChild(el('span', { class: 'cp-caption-warn' }, '基准运行没有该信号，仅显示试验曲线。'));
    }
    if (view === 'diff' && diffData) {
      const vs = diffData.points.v;
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < vs.length; i++) {
        const v = vs[i];
        if (!isFinite(v)) continue;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      if (isFinite(min) && isFinite(max)) {
        caption.appendChild(el('span', { class: 'mono cp-diff-range' },
          '差值量程：' + FMT.signed(min, 3) + ' ~ ' + FMT.signed(max, 3) + ' ' + (trialSig.unit || '') +
          '（纵轴自动缩放，仅用于查看差异形状，不代表物理量级）'));
      }
    }
    body.appendChild(caption);
  }

  /* ------------------------------------------------------------ findings */
  function renderFindings(data) {
    const host = refs.findings;
    UI.clear(host);
    const comp = data.comparison;
    const system = systemOf((data.trial && data.trial.systemId) || (data.baseline && data.baseline.systemId) || apiRef.getState().systemId);
    const invalid = !!(comp && comp.valid === false);
    const grid = el('div', { class: 'cp-findings' });

    const findCard = el('section', { class: 'fl-panel cp-find-card' });
    findCard.appendChild(el('div', { class: 'panel-head' }, [
      el('div', { class: 'panel-head-main' }, [
        el('span', { class: 'panel-title' }, invalid ? '与基准差异（不作为因果结论）' : '重要发现'),
        el('span', { class: 'panel-sub' }, '来自 compareRuns.findings · 最多展示三条')
      ])
    ]));
    const findBody = el('div', { class: 'panel-body cp-find-body' });
    const findings = comp && Array.isArray(comp.findings) ? comp.findings.slice(0, 3) : [];
    if (!comp) {
      findBody.appendChild(el('p', { class: 'muted small' }, data.baseline ? '选择试验运行后显示对比结论。' : '创建基准与试验运行后显示对比结论。'));
    } else if (!findings.length) {
      findBody.appendChild(el('div', { class: 'notice' }, [
        UI.icon('info', { size: 14 }),
        el('div', {}, '对比未产生"重要发现"条目（可能两次运行数值接近，或引擎未提供 findings）。页面不额外编造结论。')
      ]));
    } else {
      findings.forEach((finding, i) => {
        const chips = el('div', { class: 'cp-finding-metrics tag-row' });
        (finding.metric_ids || []).forEach((id) => {
          chips.appendChild(UI.chip(id, { tone: 'neutral' }));
        });
        findBody.appendChild(el('div', { class: 'cp-finding', 'data-severity': finding.severity || 'info' }, [
          el('span', { class: 'cp-finding-index num' }, String(i + 1).padStart(2, '0')),
          el('div', { class: 'cp-finding-main' }, [
            el('div', { class: 'cp-finding-title' }, [
              el('span', {}, finding.title || '发现'),
              finding.severity ? UI.badge(finding.severity === 'info' ? '信息' : String(finding.severity), {
                tone: finding.severity === 'warn' ? 'warn' : finding.severity === 'danger' ? 'danger' : 'info'
              }) : null
            ]),
            el('div', { class: 'cp-finding-text' }, finding.text || ''),
            (finding.metric_ids && finding.metric_ids.length) ? chips : null
          ])
        ]));
      });
    }
    if (comp && comp.warnings && comp.warnings.length) {
      findBody.appendChild(el('div', { class: 'cp-warning-list' }, [
        el('div', { class: 'eyebrow mb-8' }, '对比警告'),
        el('ul', { class: 'cp-bullets' }, comp.warnings.map((w) => el('li', {}, w)))
      ]));
    }
    findCard.appendChild(findBody);
    grid.appendChild(findCard);

    const limCard = el('section', { class: 'fl-panel cp-lim-card' });
    limCard.appendChild(el('div', { class: 'panel-head' }, [
      el('div', { class: 'panel-head-main' }, [
        el('span', { class: 'panel-title' }, '模型局限与数据性质'),
        el('span', { class: 'panel-sub' }, '解释结论前必须阅读')
      ])
    ]));
    const limBody = el('div', { class: 'panel-body cp-lim-body' });
    const limits = (system && system.model && system.model.limitations) || [];
    if (limits.length) {
      limBody.appendChild(el('ul', { class: 'cp-bullets' }, limits.map((t) => el('li', {}, t))));
    } else {
      limBody.appendChild(el('p', { class: 'muted small' }, '模型未提供局限条目。'));
    }
    limBody.appendChild(el('div', { class: 'cp-data-nature' }, [
      UI.badge('数据性质：L0 行为级演示', { tone: 'warn', icon: 'flask' }),
      el('p', {}, '数据性质：解析/行为级（L0）演示数据，不是 Simulink 运行结果、不是现场数据、也不是实测结论。' +
        '所有结论可回溯到运行 ID、模型哈希与配置哈希。')
    ]));
    if (data.baseline && data.trial) {
      limBody.appendChild(el('div', { class: 'cp-ids mono' }, [
        el('span', {}, '基准 ' + data.baseline.runId + ' · model ' + FMT.hash(data.baseline.modelHash) + ' · config ' + FMT.hash(data.baseline.configHash)),
        el('span', {}, '试验 ' + data.trial.runId + ' · model ' + FMT.hash(data.trial.modelHash) + ' · config ' + FMT.hash(data.trial.configHash))
      ]));
    }
    limCard.appendChild(limBody);
    grid.appendChild(limCard);
    host.appendChild(grid);
  }

  /* -------------------------------------------------------------- exports */
  function busyButton(btn, fn) {
    if (btn.disabled) return;
    btn.disabled = true;
    btn.dataset.loading = 'true';
    let settled = false;
    const finish = (err) => {
      if (settled) return;
      settled = true;
      btn.removeAttribute('data-loading');
      btn.disabled = false;
      if (err) act('toast', (btn.dataset.label || '导出') + '失败：' + (err && err.message ? err.message : String(err)), 'danger');
    };
    try {
      const res = fn();
      if (res && typeof res.then === 'function') res.then(() => finish(null)).catch((e) => finish(e));
      else delayFrame(() => finish(null));
    } catch (e) {
      finish(e);
    }
  }

  function validationFailed(data) {
    if (data.comparison && data.comparison.valid === false) return true;
    return !!(data.trial && data.trial.quality && data.trial.quality.some((q) => q.status === 'fail'));
  }

  function exportButtons(data) {
    const exporter = apiRef.exporter;
    const trial = data.trial;
    const baseline = data.baseline;
    const comp = data.comparison;
    const system = systemOf((trial && trial.systemId) || apiRef.getState().systemId);
    const failed = validationFailed(data);
    const buttons = [];

    const make = (label, icon, handler, opts) => {
      const o = opts || {};
      const btn = el('button', {
        class: 'btn ' + (o.primary ? 'btn-primary' : 'btn-ghost') + ' btn-sm cp-export-btn',
        type: 'button',
        disabled: !!o.disabled,
        title: o.title || label,
        dataset: { label: label },
        on: { click: () => { if (!o.disabled) busyButton(btn, handler); } }
      }, [UI.icon(icon, { size: 13 }), el('span', {}, label)]);
      return btn;
    };

    buttons.push(make('下载试验 CSV', 'download', () => {
      if (!exporter || !exporter.csv) throw new Error('导出模块 FL.exporter 未就绪');
      const text = exporter.csv(trial);
      const name = exporter.csvFilename(trial);
      exporter.download(name, text, 'text/csv;charset=utf-8');
      act('toast', '已导出试验 CSV：' + name, 'ok');
    }, { primary: true, disabled: !trial || !exporter, title: trial ? '导出 ' + trial.runId + ' 的 601 点原始采样' : '需要试验运行' }));

    buttons.push(make('下载配置清单 JSON', 'copy', () => {
      if (!exporter || !exporter.configManifest) throw new Error('导出模块 FL.exporter 未就绪');
      const manifest = exporter.configManifest(trial);
      const name = exporter.jsonFilename(trial, 'config-manifest');
      exporter.download(name, JSON.stringify(manifest, null, 2), 'application/json;charset=utf-8');
      act('toast', '已导出配置清单：' + name, 'ok');
    }, { disabled: !trial || !exporter, title: trial ? '导出运行配置、模型清单、质量检查与哈希' : '需要试验运行' }));

    buttons.push(make('下载 HTML 报告', 'external', () => {
      if (!exporter || !exporter.htmlReport) throw new Error('导出模块 FL.exporter 未就绪');
      const html = exporter.htmlReport({ baseline: baseline, trial: trial, comparison: comp, system: system });
      const name = exporter.reportFilename(trial);
      exporter.download(name, html, 'text/html;charset=utf-8');
      act('toast', failed ? '已导出 HTML 报告（已标记验证未通过，仅排障用途）' : '已导出 HTML 报告：' + name, failed ? 'warn' : 'ok');
    }, { disabled: !trial || !exporter, title: trial ? '生成自包含 HTML 报告（含配置、指标、校验与可信度标签）' : '需要试验运行' }));

    buttons.push(make('复制分享摘要', 'copy', () => {
      if (!exporter || !exporter.summaryText || !exporter.copyText) throw new Error('导出模块 FL.exporter 未就绪');
      const text = exporter.summaryText({ baseline: baseline, trial: trial, comparison: comp });
      return exporter.copyText(text).then((ok) => {
        act('toast', ok ? '分享摘要已复制到剪贴板' : '复制失败：浏览器未授权剪贴板，请手动查看摘要', ok ? 'ok' : 'warn');
        if (!ok) throw new Error('剪贴板不可用');
      });
    }, { disabled: !trial || !exporter, title: trial ? '复制一段纯文本对比摘要（含一致性检查结果）' : '需要试验运行' }));

    buttons.push(make('导出证据包 v1（8 文件）', 'shield', () => {
      if (!exporter || !exporter.downloadBundle) throw new Error('EvidenceBundle v1 导出模块未就绪');
      const res = exporter.downloadBundle(trial);
      act('toast', failed
        ? '已开始下载证据包（含 FAIL 标注）' + res.count + ' 个文件；验证未通过的内容已标记'
        : '已开始下载证据包 v1：' + res.count + ' 个文件（' + res.prefix + '*）', failed ? 'warn' : 'ok');
    }, { disabled: !trial || !exporter, title: 'EvidenceBundle v1：manifest/config/model_manifest/timeseries/events/metrics/checks + SHA256SUMS；导入方将重算指标并比对 run_hash' }));

    buttons.push(make('导入证据包', 'download', () => {
      if (!exporter || !exporter.importBundleFromFileList) throw new Error('EvidenceBundle v1 导入模块未就绪');
      return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = '.json,.csv,.txt';
        input.onchange = () => {
          if (!input.files || !input.files.length) { resolve(); return; }
          exporter.importBundleFromFileList(input.files).then((run) => {
            act('addImportedRun', run);
            resolve();
          }).catch((e) => {
            act('toast', '导入被拒绝：' + (e && e.message ? e.message : String(e)) +
              (e && e.next ? '。下一步：' + e.next : ''), 'danger');
            reject(e);
          });
        };
        input.click();
      });
    }, { disabled: !exporter, title: '导入 EvidenceBundle v1：哈希→Schema→重算→run_hash 比对；角色=imported，不覆盖现有运行' }));

    return buttons;
  }

  function renderExport(data) {
    const host = refs.export;
    UI.clear(host);
    const panel = el('section', { class: 'fl-panel cp-export' });
    const exporterReady = !!(apiRef.exporter && apiRef.exporter.csv);
    const failed = validationFailed(data);
    panel.appendChild(el('div', { class: 'panel-head' }, [
      el('div', { class: 'panel-head-main' }, [
        el('span', { class: 'panel-title' }, '导出与分享'),
        el('span', { class: 'panel-sub' }, '导出基于不可变 Run 与其完整原始数据')
      ]),
      el('div', { class: 'cp-export-status' }, [
        failed
          ? UI.badge('验证未通过 · 仅排障用途', { tone: 'danger', icon: 'warning' })
          : (data.comparison ? UI.badge('演示级校验通过', { tone: 'ok', icon: 'check' }) : UI.badge('等待对比数据', { tone: 'neutral', icon: 'clock' }))
      ])
    ]));
    const body = el('div', { class: 'panel-body cp-export-body' });
    const row = el('div', { class: 'cp-export-row' });
    exportButtons(data).forEach((b) => row.appendChild(b));
    body.appendChild(row);
    [
      'CSV 导出试验运行的 601 点全精度采样；配置清单含 config / model / quality / hashes。',
      'HTML 报告是自包含文件；证据包在 validation_failed 时会在文件名与内容中标注「验证未通过」，不生成"验证通过"字样。',
      '分享摘要为纯文本，可用于提交排障材料。'
    ].forEach((n) => body.appendChild(el('p', { class: 'cp-export-note' }, n)));
    if (!exporterReady) {
      body.appendChild(el('div', { class: 'notice', 'data-tone': 'warn' }, [
        UI.icon('warning', { size: 14 }),
        el('div', {}, '导出模块 FL.exporter 尚未就绪，导出按钮暂不可用。')
      ]));
    }
    panel.appendChild(body);
    host.appendChild(panel);
  }

  /* ----------------------------------------------------------- render all */
  function renderAll(state) {
    const runs = resolveRuns(state);
    const cmp = getComparison(runs.baseline, runs.trial);
    const data = {
      state: state,
      list: runs.list,
      baseline: runs.baseline,
      trial: runs.trial,
      comparison: cmp.result,
      comparisonError: cmp.error
    };
    lastData = data;

    renderHead(data);
    renderNotices(data);
    renderEmpty(data);
    const both = !!(runs.baseline && runs.trial);
    refs.metrics.hidden = !both;
    refs.view.hidden = !both;
    refs.findings.hidden = !both;
    if (both) {
      renderMetrics(data);
      renderView(data);
      renderFindings(data);
    } else {
      UI.clear(refs.metrics);
      UI.clear(refs.view);
      UI.clear(refs.findings);
    }
    renderExport(data);
    refs.head.hidden = false;
    refs.notices.hidden = false;
    refs.export.hidden = false;
  }

  function syncCursor(state) {
    charts.forEach((item) => {
      try { item.chart.setCursor(state.currentTime); } catch (e) { /* ignore */ }
    });
    if (refs && refs.viewNow && refs.viewNow.isConnected) refs.viewNow.textContent = 't = ' + FMT.time(state.currentTime);
  }

  function renderKey(state) {
    const ps = pageState(state);
    const runs = resolveRuns(state);
    return [
      runs.baseline ? runs.baseline.runId : 'no-base',
      runs.trial ? runs.trial.runId : 'no-trial',
      ps.view || 'overlay',
      ps.signalId || '',
      runs.list.length,
      checksOpen ? 'c1' : 'c0',
      Object.keys(expandedCats).filter((k) => expandedCats[k]).join(','),
      state.truthSealed ? 'sealed' : 'open',
      state.mode || ''
    ].join('|');
  }

  function onResize() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      charts.forEach((item) => { try { item.chart.resize(); } catch (e) { /* ignore */ } });
    }, 140);
  }

  /* ------------------------------------------------------------- page def */
  pages['compare'] = {
    id: 'compare',
    label: '结果对比',
    navLabel: '对比',
    mount(root, api) {
      apiRef = api;
      el = api.el;
      UI = api.ui;
      FMT = api.fmt;
      buildSkeleton(root);
      window.addEventListener('resize', onResize);
    },
    update(state, reason) {
      if (!refs) return;
      if (state.truthSealed) {
        const key = 'sealed';
        if (key !== lastKey) {
          lastKey = key;
          destroyCharts();
          UI.clear(refs.head);
          UI.clear(refs.notices);
          UI.clear(refs.metrics);
          UI.clear(refs.view);
          UI.clear(refs.findings);
          UI.clear(refs.export);
          refs.empty.hidden = false;
          UI.clear(refs.empty);
          const panel = el('div', { class: 'fl-panel cp-empty-panel' });
          panel.appendChild(UI.emptyState({
            icon: 'lock', title: '盲测进行中：真值相关页面已封存',
            desc: '比赛结束后结果对比页自动解锁。'
          }));
          refs.empty.appendChild(panel);
        }
        return;
      }
      if (state.page !== 'compare') {
        lastKey = '';
        return;
      }
      const key = renderKey(state);
      if (key !== lastKey) {
        lastKey = key;
        renderAll(state);
      } else if (reason === 'time' || reason === 'playback' || reason === 'run' || reason === 'all') {
        syncCursor(state);
      }
    }
  };
})();
