/* owner: causal-compare | module: page-causal | contract: docs/CONTRACT.md */
/* 故障因果解释页：只渲染 run.causal / run.events / run.metrics / system 元数据与 run.timeseries。
   页面不生成因果结论，也不把测量一致性残差解读为损失的能量。 */
(function () {
  'use strict';
  const FL = window.FL = window.FL || {};
  const pages = FL.pages = FL.pages || {};

  const SVG_NS = 'http://www.w3.org/2000/svg';

  /* 三层：配置事实 / 模型机制 / 数值观测 ------------------------------------ */
  const LAYERS = {
    config: {
      key: 'config', label: '配置事实', short: '配置', en: 'CONFIG',
      desc: '由故障配置直接给定的事实，不依赖模型计算。', icon: 'sliders', kind: 'CONFIG'
    },
    mechanism: {
      key: 'mechanism', label: '模型机制', short: '机制', en: 'MECHANISM',
      desc: '由模型结构规定的信号影响路径与连接规则。', icon: 'link', kind: 'MODEL_STATE'
    },
    observation: {
      key: 'observation', label: '数值观测', short: '观测', en: 'OBSERVATION',
      desc: '由本次运行的数值结果支持的信号变化。', icon: 'wave', kind: 'OBSERVATION'
    }
  };

  /* 功率残差逐项展示时可识别的信号（按系统） */
  const RESIDUAL_CANDIDATES = {
    sourceTrue: ['P_gen_true_kW', 'P_fc_true_kW'],
    batTrue: ['P_bat_true_kW'],
    batMeas: ['P_bat_meas_kW', 'P_fc_meas_kW'],
    load: ['P_load_served_kW', 'P_load_demand_kW'],
    rotor: ['P_rotor_kW'],
    rTrue: ['r_true_kW'],
    rMeas: ['r_meas_kW']
  };

  let el = null;
  let UI = null;
  let FMT = null;
  let P = null;
  let apiRef = null;

  let refs = null;
  let lastKey = '';
  let liveHooks = [];
  let pendingFocus = null;
  let lastState = null;
  let resizeTimer = null;

  /* --------------------------------------------------------------- utils */
  function act(name) {
    const args = Array.prototype.slice.call(arguments, 1);
    return apiRef.actions[name].apply(apiRef.actions, args);
  }
  function pageState(state) {
    return (state && state.pageState && state.pageState.causal) || {};
  }
  function systemOf(systemId) {
    try { return apiRef.systems.get(systemId); } catch (e) { return null; }
  }
  function svgEl(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    if (attrs) Object.keys(attrs).forEach((k) => node.setAttribute(k, attrs[k]));
    return node;
  }
  /* components.chip 只接受字符串/Node；这里支持多段内容（主题样式保持 chip 外观） */
  function chipRich(parts, opts) {
    const node = UI.chip('', opts || {});
    (parts || []).forEach((p) => { if (p != null) node.appendChild(p); });
    return node;
  }
  function fmtNum(v, digits) {
    return (v == null || !isFinite(v)) ? '不可用' : FMT.num(v, digits == null ? 2 : digits);
  }
  function fmtVal(v, sig) {
    if (v == null || !isFinite(v)) return '不可用';
    const d = sig && sig.precision != null ? sig.precision : 2;
    return FMT.num(v, d);
  }
  /* 0 附近不用 ±0.000 表示，直接显示 0.000（避免"正负零"歧义） */
  function signedOrZero(v, digits) {
    if (v == null || typeof v !== 'number' || !isFinite(v)) return '不可用';
    const d = digits == null ? 3 : digits;
    if (Math.abs(v) < Math.pow(10, -d) / 2) return FMT.num(0, d);
    return FMT.signed(v, d);
  }
  function unitOf(sig) { return (sig && sig.unit) || ''; }
  function precisionOf(sig, fallback) {
    return sig && sig.precision != null ? sig.precision : (fallback == null ? 2 : fallback);
  }
  function signalOf(run, id) {
    if (!run || !run.signals) return null;
    for (let i = 0; i < run.signals.length; i++) if (run.signals[i].id === id) return run.signals[i];
    return null;
  }
  function sample(run, id, t) {
    try { return P.sampleAt(run, id, t); } catch (e) { return { value: null, index: -1, t: null }; }
  }
  function metricOf(run, id) {
    if (!run || !run.metrics) return null;
    for (let i = 0; i < run.metrics.length; i++) if (run.metrics[i].metric_id === id) return run.metrics[i];
    return null;
  }
  function componentOf(system, id) {
    if (!system || !system.components || !id) return null;
    for (let i = 0; i < system.components.length; i++) if (system.components[i].id === id) return system.components[i];
    return null;
  }
  function componentLabel(system, id) {
    const c = componentOf(system, id);
    return c ? c.label : null;
  }
  function signalLabel(run, id) {
    const s = signalOf(run, id);
    return s ? s.label : null;
  }
  function findFaultDef(system, run) {
    if (!system || !run || !run.config || !run.config.fault) return null;
    const fam = run.config.fault.family;
    const id = run.config.fault.faultId;
    const list = (system.faults || []);
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    for (let i = 0; i < list.length; i++) if (list[i].family === fam) return list[i];
    return null;
  }
  /* 事件幅值按故障目录的精度显示（GT 的 0.3 Hz 不能被四舍五入成 0） */
  function magnitudeText(ev, fault) {
    const mag = ev && ev.magnitude;
    if (mag == null || !isFinite(mag)) return null;
    let d = null;
    if (fault && fault.params && fault.params[0] && fault.params[0].precision != null) d = fault.params[0].precision;
    if (d == null) {
      const m = Math.abs(mag);
      d = Math.abs(m - Math.round(m)) < 1e-9 ? 0 : (Math.abs(m * 10 - Math.round(m * 10)) < 1e-9 ? 1 : 2);
    }
    return FMT.signed(mag, d) + (ev.unit ? ' ' + ev.unit : '');
  }

  /* 焦点事件 / 焦点节点 ------------------------------------------------- */
  function findFocusEvent(run) {
    if (!run || !run.events || !run.events.length) return null;
    const causal = run.causal || {};
    if (causal.focusEventId) {
      for (let i = 0; i < run.events.length; i++) if (run.events[i].event_id === causal.focusEventId) return run.events[i];
    }
    try {
      if (P.faultEvent) {
        const ev = P.faultEvent(run);
        if (ev && ev.event_type && ev.event_type !== 'healthy') return ev;
        return null;
      }
    } catch (e) { /* ignore */ }
    return run.events[0] || null;
  }
  function causalNodes(run) {
    const causal = run && run.causal;
    if (!causal || !Array.isArray(causal.nodes)) return [];
    return causal.nodes.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  function causalEdges(run) {
    const causal = run && run.causal;
    if (!causal || !Array.isArray(causal.edges)) return [];
    return causal.edges.filter((e) => e && e.from && e.to);
  }
  function resolveFocusNodeId(state, run, nodes) {
    if (!nodes.length) return null;
    const wanted = pageState(state).focusNodeId;
    if (wanted) {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === wanted) return nodes[i].id;
        if (nodes[i].componentId && nodes[i].componentId === wanted) return nodes[i].id;
      }
    }
    let first = null;
    let firstObservation = null;
    for (let i = 0; i < nodes.length; i++) {
      if (!first) first = nodes[i].id;
      if (!firstObservation && normalizeLayer(nodes[i].layer) === 'observation') firstObservation = nodes[i].id;
    }
    return firstObservation || first;
  }
  function normalizeLayer(layer) {
    const s = String(layer || '').toLowerCase();
    if (LAYERS[s]) return s;
    if (s === 'config' || s === 'configuration') return 'config';
    if (s === 'mechanism' || s === 'model') return 'mechanism';
    if (s === 'observation' || s === 'observed') return 'observation';
    return null;
  }
  function layerMeta(layer) {
    return LAYERS[normalizeLayer(layer)] || {
      key: 'unknown', label: '未标注来源层', short: '未标注', en: 'UNSPECIFIED',
      desc: '引擎未给出该节点的来源层。', icon: 'info', kind: 'MODEL_ASSUMPTION'
    };
  }
  function nodeById(nodes, id) {
    for (let i = 0; i < nodes.length; i++) if (nodes[i].id === id) return nodes[i];
    return null;
  }
  function incomingEdges(edges, nodeId) {
    return edges.filter((e) => e.to === nodeId);
  }
  function computeRelations(nodes, edges, focusId) {
    const up = new Set([focusId]);
    const down = new Set([focusId]);
    let queue = [focusId];
    while (queue.length) {
      const cur = queue.shift();
      for (let i = 0; i < edges.length; i++) {
        const e = edges[i];
        if (e.to === cur && !up.has(e.from)) { up.add(e.from); queue.push(e.from); }
      }
    }
    queue = [focusId];
    while (queue.length) {
      const cur = queue.shift();
      for (let i = 0; i < edges.length; i++) {
        const e = edges[i];
        if (e.from === cur && !down.has(e.to)) { down.add(e.to); queue.push(e.to); }
      }
    }
    return { up: up, down: down };
  }

  /* ------------------------------------------------------------ skeleton */
  function buildSkeleton(root) {
    UI.clear(root);
    const wrap = el('div', { class: 'pg-causal page-pad' });
    /* 页头常驻横幅（UI_COPY_GUARDRAILS §3.1 逐字锁定；TXT-04） */
    wrap.appendChild(el('div', {
      class: 'notice', 'data-testid': 'causal-banner', 'data-tone': 'warn', role: 'note'
    }, '本次故障是运行前注入的配置事实；本页不做检测/定位/诊断，无检出率与延迟指标。'));

    refs = {
      wrap: wrap,
      focus: el('header', { class: 'cc-focus', 'aria-label': '焦点事件' }),
      grid: el('div', { class: 'cc-grid' }),
      chainPanel: el('section', { class: 'cc-chain-panel fl-panel', 'aria-labelledby': 'cc-chain-title' }),
      chainWrap: el('div', { class: 'cc-chain-wrap' }),
      chain: el('div', { class: 'cc-chain' }),
      edgeSvg: svgEl('svg', { class: 'cc-edges', 'aria-hidden': 'true' }),
      edgeLabels: el('div', { class: 'cc-edge-labels', 'aria-hidden': 'true' }),
      chainEmpty: el('div', { class: 'cc-chain-empty', hidden: true }),
      chainFoot: el('div', { class: 'cc-chain-foot' }),
      side: el('aside', { class: 'cc-side fl-panel', 'aria-label': '因果节点解释' }),
      inspector: el('div', { class: 'cc-inspector' }),
      bottom: el('div', { class: 'cc-bottom' })
    };

    /* 因果链面板头 + 三层图例 */
    const legend = el('div', { class: 'cc-legend', 'aria-label': '三层来源图例' });
    ['config', 'mechanism', 'observation'].forEach((key) => {
      const meta = LAYERS[key];
      legend.appendChild(el('span', { class: 'cc-legend-item', 'data-layer': key, title: meta.desc }, [
        el('span', { class: 'cc-legend-dot', 'aria-hidden': 'true' }),
        el('span', {}, meta.label),
        el('span', { class: 'cc-legend-en mono' }, meta.en)
      ]));
    });
    refs.chainPanel.appendChild(el('div', { class: 'panel-head' }, [
      el('div', { class: 'panel-head-main' }, [
        el('span', { class: 'panel-title', id: 'cc-chain-title' }, '因果链'),
        el('span', { class: 'panel-sub' }, '模型连接规则 · 上游 → 下游')
      ]),
      legend
    ]));
    const chainBody = el('div', { class: 'panel-body cc-chain-body' }, [
      refs.chainEmpty,
      refs.chainWrap,
      refs.chainFoot
    ]);
    refs.chainWrap.appendChild(refs.edgeSvg);
    refs.chainWrap.appendChild(refs.chain);
    refs.chainWrap.appendChild(refs.edgeLabels);
    refs.chainPanel.appendChild(chainBody);

    refs.side.appendChild(refs.inspector);
    refs.grid.appendChild(refs.chainPanel);
    refs.grid.appendChild(refs.side);

    wrap.appendChild(refs.focus);
    wrap.appendChild(refs.grid);
    wrap.appendChild(refs.bottom);
    root.appendChild(wrap);
  }

  /* --------------------------------------------------------- top bar */
  function renderFocusBar(state, run) {
    const host = refs.focus;
    UI.clear(host);
    if (!run) {
      host.appendChild(el('div', { class: 'cc-focus-body' }, [
        el('div', {}, [
          el('div', { class: 'eyebrow' }, '焦点事件 · FOCUS EVENT'),
          el('div', { class: 'cc-focus-headline muted' }, '创建运行后显示焦点事件与因果链')
        ])
      ]));
      host.appendChild(el('div', { class: 'cc-focus-side' }, [
        el('span', { class: 'cc-truth-note' }, '演示模式可公开真值')
      ]));
      return;
    }
    const causal = run.causal || {};
    const ev = findFocusEvent(run);
    const system = systemOf(run.systemId);
    const fault = findFaultDef(system, run);
    const eventLabel = causal.headline || (ev ? (ev.label || '故障事件') : '本运行没有故障事件');
    const mode = state.mode === 'demo' ? 'demo' : (state.mode || 'demo');

    const chips = el('div', { class: 'cc-focus-chips tag-row' });
    if (ev) {
      chips.appendChild(chipRich([el('span', {}, '时刻 '), el('b', {}, 't=' + FMT.time(ev.trigger_s))], { icon: 'clock' }));
      chips.appendChild(chipRich([el('span', {}, '故障类型 '), el('b', {}, fault ? fault.label : (ev.event_type || '事件'))], { icon: 'warning', tone: 'fault' }));
      if (ev.magnitude != null) {
        chips.appendChild(chipRich([el('span', {}, '幅值 '), el('b', {}, magnitudeText(ev, fault) || '不可用')], { icon: 'pulse' }));
      }
      const channelText = componentLabel(system, ev.target_component) ||
        signalLabel(run, ev.target_signal) || ev.target_component || ev.target_signal || '未标注';
      chips.appendChild(chipRich([el('span', {}, '作用通道 '), el('b', {}, channelText)], { icon: 'sensor' }));
      chips.appendChild(chipRich([el('span', {}, '事件 '), el('b', { class: 'mono' }, ev.event_id || '—')], { icon: 'flag' }));
    } else {
      chips.appendChild(chipRich([el('span', {}, '无故障事件（健康/基准运行）')], { icon: 'check', tone: 'acc' }));
    }
    chips.appendChild(UI.sourceTag('FAULT_EVENT'));

    const body = el('div', { class: 'cc-focus-body' }, [
      el('div', { class: 'cc-focus-eyebrow' }, [
        el('span', { class: 'eyebrow' }, '焦点事件 · FOCUS EVENT'),
        UI.badge(mode === 'demo' ? '演示模式 · 真值公开' : '盲测模式 · 真值封存', { tone: mode === 'demo' ? 'info' : 'warn', icon: mode === 'demo' ? 'eye' : 'lock' })
      ]),
      el('div', { class: 'cc-focus-headline' }, eventLabel),
      chips,
      causal.mechanismSummary ? el('div', { class: 'cc-mechanism' }, [
        el('span', { class: 'eyebrow' }, '机制总结'),
        el('p', {}, causal.mechanismSummary)
      ]) : null
    ]);

    const focusId = resolveFocusNodeId(state, run, causalNodes(run));
    const side = el('div', { class: 'cc-focus-side' }, [
      el('div', { class: 'cc-truth-note' }, '演示模式可公开真值；盲测时真值相关节点与工具响应将被封存。'),
      el('div', { class: 'row wrap' }, [
        el('button', {
          class: 'btn btn-ghost btn-sm', type: 'button', disabled: !ev,
          title: ev ? '把全局时间线定位到故障时刻' : '本运行没有故障事件',
          on: { click: () => { if (ev) act('setTime', ev.trigger_s, { pause: true }); } }
        }, [UI.icon('flag', { size: 13 }), el('span', {}, '跳到故障时刻')]),
        el('button', {
          class: 'btn btn-ghost btn-sm', type: 'button',
          title: '在曲线页显示焦点节点的信号并保留当前时刻',
          on: { click: () => openFocusSignals(state, run) }
        }, [UI.icon('chart', { size: 13 }), el('span', {}, '在曲线页查看')]),
        el('button', {
          class: 'btn btn-ghost btn-sm', type: 'button',
          on: { click: () => openAssumptions(run) }
        }, [UI.icon('info', { size: 13 }), el('span', {}, '模型假设')])
      ])
    ]);

    host.appendChild(body);
    host.appendChild(side);
    host.dataset.status = ev ? 'fault' : 'healthy';
  }

  function openFocusSignals(state, run) {
    const nodes = causalNodes(run);
    const focusId = resolveFocusNodeId(state, run, nodes);
    const node = nodeById(nodes, focusId);
    const visible = {};
    const ids = [];
    if (node && node.signalIds) node.signalIds.forEach((id) => ids.push(id));
    nodes.forEach((n) => {
      if (normalizeLayer(n.layer) === 'observation' && n.signalIds) n.signalIds.forEach((id) => { if (ids.indexOf(id) < 0) ids.push(id); });
    });
    if (!ids.length) {
      (run.signals || []).forEach((s) => {
        if (s.sourceKind === 'MODEL_STATE' && !s.tableOnly && /(_true_|_meas_)/.test(s.id)) ids.push(s.id);
      });
    }
    ids.forEach((id) => { visible[id] = true; });
    if (!Object.keys(visible).length) { act('toast', '本运行没有可用于曲线页的节点信号', 'warn'); return; }
    const ev = findFocusEvent(run);
    act('setPageState', 'signals', {
      visible: visible,
      selectedSignal: ids[0] || null,
      selectedT: ev ? ev.trigger_s : state.currentTime
    });
    act('navigate', 'signals');
  }

  function openAssumptions(run) {
    const system = systemOf(run && run.systemId);
    const model = (system && system.model) || {};
    const content = el('div', {});
    content.appendChild(el('div', { class: 'eyebrow mb-8' }, '模型假设 · MODEL ASSUMPTIONS'));
    const assumptions = model.assumptions || [];
    if (assumptions.length) {
      const kv = el('dl', { class: 'kv' });
      assumptions.forEach((a) => {
        kv.appendChild(el('dt', { class: 'mono' }, a.id || 'ASSUMPTION'));
        kv.appendChild(el('dd', {}, a.text || ''));
      });
      content.appendChild(kv);
    } else {
      content.appendChild(el('p', { class: 'muted' }, '模型未提供假设条目。'));
    }
    content.appendChild(el('hr', { class: 'hr' }));
    content.appendChild(el('div', { class: 'eyebrow mb-8' }, '模型限制 · LIMITATIONS'));
    const limits = model.limitations || [];
    if (limits.length) {
      content.appendChild(el('ul', { class: 'cc-bullets' }, limits.map((t) => el('li', {}, t))));
    } else {
      content.appendChild(el('p', { class: 'muted' }, '模型未提供限制条目。'));
    }
    if (model.equations && model.equations.length) {
      content.appendChild(el('hr', { class: 'hr' }));
      content.appendChild(el('div', { class: 'eyebrow mb-8' }, '方程 · EQUATIONS'));
      model.equations.forEach((eq) => {
        content.appendChild(el('div', { class: 'formula' }, [
          el('div', {}, eq.latex_text || eq.id || ''),
          eq.note ? el('div', { class: 'tiny muted' }, eq.note) : null
        ]));
      });
    }
    content.appendChild(el('hr', { class: 'hr' }));
    content.appendChild(el('p', { class: 'tiny muted' },
      '以上内容来自模型清单（' + ((system && system.level) || 'L0 行为级演示模型') + '）。FaultLab 的因果解释是模型规定的机制演示，不是对真实设备的诊断结论。'));
    UI.drawer({
      title: '模型假设与限制',
      subtitle: (system ? (system.title + ' · ' + system.experimentCode) : (run ? run.runId : '')),
      content: content
    });
  }

  /* ------------------------------------------------------------- chain */
  function renderChain(state, run, nodes, edges, focusId) {
    UI.clear(refs.chain);
    UI.clear(refs.edgeSvg);
    UI.clear(refs.edgeLabels);
    refs.nodeEls = {};
    refs.edgeEls = {};

    if (!nodes.length) {
      refs.chainWrap.hidden = true;
      refs.chainEmpty.hidden = false;
      UI.clear(refs.chainEmpty);
      const ev = findFocusEvent(run);
      const healthy = !!(run && !ev);
      refs.chainEmpty.appendChild(UI.emptyState({
        icon: healthy ? 'check' : 'link',
        title: healthy ? '健康基准：没有故障事件可供解释' : (run ? '本模型无法推导该现象' : '尚未创建运行'),
        desc: healthy
          ? '本次运行未注入故障，run.causal 不包含因果节点（这是预期结果）。因果解释页用于解释故障注入后的模型机制；可创建带故障的运行进行对比。'
          : (run
            ? '引擎未为本次运行生成 run.causal 节点。因果解释需要模型提供的因果链，页面不会自行编造原因。'
            : '尚未创建运行，无法显示因果链。')
      }));
      if (healthy) {
        refs.chainEmpty.appendChild(el('div', { class: 'cc-insp-actions' }, [goSystemButton()]));
      }
      refs.chainFoot.textContent = '';
      return;
    }
    refs.chainWrap.hidden = false;
    refs.chainEmpty.hidden = true;

    const rel = computeRelations(nodes, edges, focusId);
    refs.graph = { nodes: nodes, edges: edges, focusId: focusId, rel: rel };

    /* defs + markers */
    const defs = svgEl('defs');
    [['cc-arrow', 'var(--line-3)'], ['cc-arrow-hot', 'var(--acc)']].forEach((pair) => {
      const marker = svgEl('marker', {
        id: pair[0], viewBox: '0 0 10 10', refX: '8.5', refY: '5',
        markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse'
      });
      marker.appendChild(svgEl('path', { d: 'M0,0 L10,5 L0,10 z', fill: pair[1] }));
      defs.appendChild(marker);
    });
    refs.edgeSvg.appendChild(defs);
    const g = svgEl('g', { class: 'cc-edge-layer' });
    refs.edgeSvg.appendChild(g);
    refs.edgeGroup = g;

    /* nodes: 3 columns; 第二行从右向左（⑥ ← ⑤ ← ④） */
    const cols = 3;
    nodes.forEach((node, index) => {
      const order = node.order || (index + 1);
      let row;
      let col;
      if (index < cols) { row = 1; col = index + 1; }
      else { row = 2; col = cols - (index - cols); }
      if (col < 1) col = 1;
      const layerKey = normalizeLayer(node.layer) || 'unknown';
      const btn = el('button', {
        class: 'cc-node', type: 'button', 'data-id': node.id, 'data-layer': layerKey,
        'data-order': String(order), 'aria-pressed': String(node.id === focusId),
        title: `节点 ${order} · ${layerMeta(node.layer).label}`,
        style: { gridRow: String(row), gridColumn: String(col) },
        on: {
          click: () => {
            pendingFocus = node.id;
            act('setPageState', 'causal', { focusNodeId: node.id });
          }
        }
      }, [
        el('span', { class: 'cc-node-order num' }, String(order).padStart(2, '0')),
        el('span', { class: 'cc-node-main' }, [
          el('span', { class: 'cc-node-title' }, node.title || node.short || node.id),
          node.short && node.short !== node.title ? el('span', { class: 'cc-node-short' }, node.short) : null
        ]),
        el('span', { class: 'cc-layer-badge', 'data-layer': layerKey }, [
          UI.icon(layerMeta(node.layer).icon, { size: 11 }),
          el('span', {}, layerMeta(node.layer).label)
        ]),
        node.evidence && node.evidence.length
          ? el('span', { class: 'cc-node-evidence', title: '该节点有 ' + node.evidence.length + ' 条数值证据' }, [
            UI.icon('link', { size: 10 }), el('span', {}, String(node.evidence.length))
          ])
          : null
      ]);
      refs.nodeEls[node.id] = btn;
      refs.chain.appendChild(btn);
    });

    edges.forEach((edge, i) => {
      const path = svgEl('path', {
        class: 'cc-edge', 'data-from': edge.from, 'data-to': edge.to,
        'marker-end': 'url(#cc-arrow)'
      });
      g.appendChild(path);
      refs.edgeEls['e' + i] = { el: path, edge: edge };
    });

    /* 高亮上游/下游 */
    Object.keys(refs.nodeEls).forEach((id) => {
      const btn = refs.nodeEls[id];
      btn.classList.toggle('is-focus', id === focusId);
      btn.classList.toggle('is-up', id !== focusId && rel.up.has(id));
      btn.classList.toggle('is-down', id !== focusId && rel.down.has(id));
      btn.classList.toggle('is-dim', id !== focusId && !rel.up.has(id) && !rel.down.has(id));
    });
    Object.keys(refs.edgeEls).forEach((k) => {
      const item = refs.edgeEls[k];
      const hot = (rel.up.has(item.edge.from) && rel.up.has(item.edge.to)) ||
        (rel.down.has(item.edge.from) && rel.down.has(item.edge.to));
      item.el.classList.toggle('is-hot', hot);
      item.el.setAttribute('marker-end', hot ? 'url(#cc-arrow-hot)' : 'url(#cc-arrow)');
    });

    refs.chainFoot.textContent = '';
    refs.chainFoot.appendChild(el('span', {}, `共 ${nodes.length} 个节点、${edges.length} 条模型连接；点击节点高亮其上游/下游并查看解释。`));
    refs.chainFoot.appendChild(el('span', { class: 'cc-chain-foot-note' }, '箭头代表模型连接规则，不代表已被数据验证的因果强度。'));

    requestAnimationFrame(() => layoutEdges(state));
  }

  function layoutEdges(state) {
    if (!refs || !refs.graph || !refs.chainWrap || refs.chainWrap.hidden) return;
    const wrap = refs.chainWrap;
    const wrapRect = wrap.getBoundingClientRect();
    if (!wrapRect.width) { requestAnimationFrame(() => layoutEdges(state)); return; }
    refs.edgeSvg.setAttribute('viewBox', '0 0 ' + wrapRect.width + ' ' + wrapRect.height);
    refs.edgeSvg.setAttribute('preserveAspectRatio', 'none');
    UI.clear(refs.edgeLabels);

    const rects = {};
    Object.keys(refs.nodeEls).forEach((id) => {
      const r = refs.nodeEls[id].getBoundingClientRect();
      rects[id] = {
        left: r.left - wrapRect.left, right: r.right - wrapRect.left,
        top: r.top - wrapRect.top, bottom: r.bottom - wrapRect.top,
        cx: r.left - wrapRect.left + r.width / 2, cy: r.top - wrapRect.top + r.height / 2,
        w: r.width, h: r.height
      };
    });

    const orderIndex = {};
    (refs.graph.nodes || []).forEach((n, i) => { orderIndex[n.id] = i; });

    Object.keys(refs.edgeEls).forEach((key) => {
      const item = refs.edgeEls[key];
      const a = rects[item.edge.from];
      const b = rects[item.edge.to];
      if (!a || !b) return;
      const geom = edgeGeometry(a, b, orderIndex[item.edge.from] || 0, orderIndex[item.edge.to] || 0);
      item.el.setAttribute('d', geom.d);
      if (item.edge.label) {
        const lab = el('span', { class: 'cc-edge-label mono' + (geom.vertical ? ' is-vert' : '') }, item.edge.label);
        lab.style.left = geom.lx + 'px';
        lab.style.top = geom.ly + 'px';
        refs.edgeLabels.appendChild(lab);
      }
    });
  }

  function edgeGeometry(a, b, iA, iB) {
    const sameRow = Math.abs(a.cy - b.cy) < Math.max(16, a.h * 0.35);
    const dir = b.cx >= a.cx ? 1 : -1;
    if (sameRow) {
      const adjacent = Math.abs(iA - iB) === 1;
      const rowIdx = Math.floor(Math.min(iA, iB) / 3);
      if (adjacent) {
        const ax = dir > 0 ? a.right : a.left;
        const bx = dir > 0 ? b.left : b.right;
        const ay = a.cy;
        const by = b.cy;
        const dx = Math.max(16, Math.min(64, Math.abs(bx - ax) * 0.48));
        const d = 'M' + ax + ',' + ay + ' C' + (ax + dir * dx) + ',' + ay + ' ' + (bx - dir * dx) + ',' + by + ' ' + bx + ',' + by;
        /* 同行连线的文字放在该行节点上方/下方，避免压住相邻节点卡 */
        const labelAbove = rowIdx === 0;
        return {
          d: d, vertical: false,
          lx: (ax + bx) / 2,
          ly: labelAbove ? Math.min(a.top, b.top) - 9 : Math.max(a.bottom, b.bottom) + 9
        };
      }
      /* 跨列连线：绕行到行间空隙，避免穿过中间节点卡 */
      const ax = a.cx + dir * Math.min(46, a.w * 0.32);
      const bx = b.cx - dir * Math.min(46, b.w * 0.32);
      if (rowIdx === 0) {
        const y = Math.max(a.bottom, b.bottom) + 20;
        const d = 'M' + ax + ',' + a.bottom + ' C' + ax + ',' + y + ' ' + bx + ',' + y + ' ' + bx + ',' + b.bottom;
        return { d: d, vertical: false, lx: (ax + bx) / 2, ly: y };
      }
      const y2 = Math.min(a.top, b.top) - 20;
      const d = 'M' + ax + ',' + a.top + ' C' + ax + ',' + y2 + ' ' + bx + ',' + y2 + ' ' + bx + ',' + b.top;
      return { d: d, vertical: false, lx: (ax + bx) / 2, ly: y2 };
    }
    const vdir = b.cy >= a.cy ? 1 : -1;
    const ax = a.cx;
    const bx = b.cx;
    const ay = vdir > 0 ? a.bottom : a.top;
    const by = vdir > 0 ? b.top : b.bottom;
    const dy = Math.max(12, Math.min(48, Math.abs(by - ay) * 0.5));
    const d = 'M' + ax + ',' + ay + ' C' + ax + ',' + (ay + vdir * dy) + ' ' + bx + ',' + (by - vdir * dy) + ' ' + bx + ',' + by;
    return { d: d, vertical: true, lx: ax + (bx > ax ? -14 : 14), ly: (ay + by) / 2 };
  }

  /* --------------------------------------------------------- inspector */
  function renderInspector(state, run, nodes, edges, focusId) {
    const host = refs.inspector;
    UI.clear(host);
    const node = nodeById(nodes, focusId);
    if (!run || !node) {
      const hasEvent = !!(run && findFocusEvent(run));
      host.appendChild(UI.emptyState({
        icon: !run ? 'flask' : hasEvent ? 'link' : 'check',
        title: !run ? '尚未创建运行' : hasEvent ? '没有可解释的因果节点' : '健康基准：没有故障节点',
        desc: !run
          ? '请先在系统交互图创建一次带故障的运行，再回到本页查看因果解释。'
          : hasEvent
            ? '当前运行的 run.causal 未提供节点。页面不会自行编造因果解释。'
            : '本次运行未注入故障。健康运行的真实/测量残差应接近 0，不需要故障因果链。'
      }));
      if (!run) {
        host.appendChild(el('div', { class: 'cc-insp-actions' }, [goSystemButton(), recentRunButton(state)]));
      }
      return;
    }
    const causal = run.causal || {};
    const system = systemOf(run.systemId);
    const ev = findFocusEvent(run);
    const layer = layerMeta(node.layer);
    const component = componentOf(system, node.componentId);
    const signalIds = (node.signalIds || []).filter((id) => !!signalOf(run, id));
    const focusSignals = signalIds.map((id) => signalOf(run, id)).filter(Boolean);

    /* 头部 */
    host.appendChild(el('div', { class: 'cc-insp-head' }, [
      el('span', { class: 'cc-insp-order num', 'data-layer': layer.key }, String(node.order || '').padStart(2, '0')),
      el('div', { class: 'cc-insp-title-wrap' }, [
        el('div', { class: 'cc-insp-title' }, node.title || node.id),
        el('div', { class: 'tag-row cc-insp-tags' }, [
          el('span', { class: 'cc-layer-badge', 'data-layer': layer.key }, [
            UI.icon(layer.icon, { size: 11 }), el('span', {}, layer.label)
          ]),
          component ? UI.chip(component.label, { icon: 'grid' }) : null,
          el('span', { class: 'cc-clock mono' }, 't = ' + FMT.time(state.currentTime))
        ])
      ])
    ]));

    /* 模板句 */
    const tpl = buildTemplateSentence(state, run, node, edges, causal, ev, system);
    host.appendChild(el('div', { class: 'cc-template' }, [
      el('div', { class: 'cc-block-label' }, [
        el('span', { class: 'eyebrow' }, '确定性模板句'),
        el('span', { class: 'cc-block-hint' }, '因为[事件]发生在[通道]，且[规则]，所以[状态]改变')
      ]),
      el('p', { class: 'cc-sentence' }, tpl.segments)
    ]));
    host.appendChild(el('div', { class: 'cc-template-src tag-row' }, [
      UI.sourceTag('FAULT_EVENT'),
      UI.sourceTag(layer.kind),
      el('span', { class: 'tiny muted' }, '模板由 run.causal、事件日志与信号元数据组合，未新增模型未给出的事实。')
    ]));

    /* 节点 detail */
    if (node.detail) {
      host.appendChild(el('div', { class: 'cc-detail' }, [
        el('div', { class: 'eyebrow mb-8' }, '节点说明 · DETAIL'),
        el('p', {}, node.detail)
      ]));
    }

    /* 数值证据（当前时刻） */
    const valuesBlock = el('div', { class: 'cc-values' });
    valuesBlock.appendChild(el('div', { class: 'cc-block-label' }, [
      el('span', { class: 'eyebrow' }, '当前时刻数值证据'),
      el('span', { class: 'cc-block-hint' }, 'sampleAt(run, signal, currentTime) · 拖时间线同步')
    ]));
    if (focusSignals.length) {
      const rows = [];
      focusSignals.slice(0, 6).forEach((sig) => {
        const valueEl = el('span', { class: 'cc-ev-value num' }, '');
        const unitEl = el('span', { class: 'cc-ev-unit mono' }, unitOf(sig));
        rows.push({ sig: sig, valueEl: valueEl });
        valuesBlock.appendChild(el('div', { class: 'cc-value-row' }, [
          el('div', { class: 'cc-value-label' }, [
            el('span', { class: 'cc-value-title' }, sig.label || sig.id),
            el('span', { class: 'cc-value-id mono' }, sig.id)
          ]),
          el('div', { class: 'cc-value-num' }, [valueEl, unitEl]),
          el('div', { class: 'cc-value-src' }, [UI.sourceTag(sig.sourceKind)])
        ]));
      });
      const updateValues = (st) => {
        rows.forEach((row) => {
          const v = sample(run, row.sig.id, st.currentTime).value;
          row.valueEl.textContent = fmtVal(v, row.sig);
          row.valueEl.classList.toggle('is-unavailable', v == null);
        });
      };
      liveHooks.push(updateValues);
      updateValues(state);
      if (node.signalIds && node.signalIds.length) {
        valuesBlock.appendChild(el('div', { class: 'cc-value-foot hint-row' }, [
          UI.icon('info', { size: 13 }),
          el('span', {}, '数值为 ' + run.runId + ' 的模型输出，来源标签区分真实状态 / 观测 / 控制器 / 故障事件；说明文本不作为计算数据源。')
        ]));
      }
    } else {
      valuesBlock.appendChild(el('div', { class: 'notice' }, [
        UI.icon('info', { size: 14 }),
        el('div', {}, '该节点未绑定可采样信号，因此没有数值证据。这不代表现象不存在，只表示本节点是配置或机制层描述。')
      ]));
    }
    host.appendChild(valuesBlock);

    /* 证据列表 */
    const ps = pageState(state);
    const evidence = Array.isArray(node.evidence) ? node.evidence : [];
    const evidenceBtn = el('button', {
      class: 'btn btn-ghost btn-sm cc-evidence-toggle', type: 'button',
      'aria-expanded': String(!!ps.evidenceOpen), disabled: !evidence.length,
      title: evidence.length ? '展开/收起该节点的数值证据（run_id + variable + time_window）' : '该节点没有证据条目',
      on: { click: () => act('setPageState', 'causal', { evidenceOpen: !ps.evidenceOpen }) }
    }, [
      UI.icon(ps.evidenceOpen ? 'chevron-down' : 'chevron-right', { size: 13 }),
      el('span', {}, (ps.evidenceOpen ? '收起证据' : '显示证据') + (evidence.length ? '（' + evidence.length + '）' : ''))
    ]);
    host.appendChild(el('div', { class: 'cc-evidence-block' }, [
      evidenceBtn,
      (ps.evidenceOpen && evidence.length) ? renderEvidenceList(run, evidence) : null
    ]));

    /* 无模型支撑提示 */
    if (!signalIds.length && !evidence.length && !component) {
      host.appendChild(el('div', { class: 'notice', 'data-tone': 'warn' }, [
        UI.icon('warning', { size: 14 }),
        el('div', {}, '「本模型无法推导该现象」：该节点没有绑定部件、信号或证据条目，模型无法给出该步骤的数值支撑，页面不做猜测。')
      ]));
    }

    /* 操作按钮 */
    host.appendChild(el('div', { class: 'cc-insp-actions' }, [
      el('button', {
        class: 'btn btn-primary btn-sm', type: 'button',
        on: { click: () => openFocusSignals(state, run) }
      }, [UI.icon('chart', { size: 13 }), el('span', {}, '查看对应曲线')]),
      el('button', {
        class: 'btn btn-ghost btn-sm', type: 'button', disabled: !ev,
        on: { click: () => { if (ev) act('setTime', ev.trigger_s, { pause: true }); } }
      }, [UI.icon('flag', { size: 13 }), el('span', {}, '定位到 ' + (ev ? FMT.num(ev.trigger_s, 1) + ' s' : '故障时刻') )]),
      el('button', {
        class: 'btn btn-ghost btn-sm', type: 'button',
        on: { click: () => openAssumptions(run) }
      }, [UI.icon('info', { size: 13 }), el('span', {}, '查看模型假设')])
    ]));

    /* 节点上的 component 选择（供系统页联动） */
    if (component) {
      host.appendChild(el('div', { class: 'cc-insp-component' }, [
        el('span', { class: 'eyebrow' }, '关联部件'),
        el('button', {
          class: 'btn btn-ghost btn-xs', type: 'button', title: '在系统页选中该部件',
          on: { click: () => { act('selectComponent', component.id); act('navigate', 'system'); } }
        }, [UI.icon('grid', { size: 12 }), el('span', {}, component.label)])
      ]));
    }
  }

  function renderEvidenceList(run, evidence) {
    const list = el('div', { class: 'cc-ev-list' });
    evidence.forEach((evd) => {
      const runId = evd.runId || run.runId;
      const varId = evd.varId || '';
      const sig = signalOf(run, varId);
      const t0 = evd.t0;
      const t1 = evd.t1;
      const targetRun = runId === run.runId ? run : (apiRef.getState().runs || {})[runId];
      const vals = evd.values || null;
      const v0 = targetRun ? ((vals && isFinite(vals.t0)) ? vals.t0 : sample(targetRun, varId, t0).value) : null;
      const v1 = targetRun ? ((vals && isFinite(vals.t1)) ? vals.t1 : sample(targetRun, varId, t1).value) : null;
      const prec = precisionOf(sig, 3);
      const winText = (t0 != null ? FMT.num(t0, 1) : '?') + ' – ' + (t1 != null ? FMT.num(t1, 1) : '?') + ' s';
      list.appendChild(el('div', { class: 'cc-ev-item' }, [
        el('div', { class: 'cc-ev-head' }, [
          el('span', { class: 'mono cc-ev-run' }, runId),
          el('span', { class: 'cc-ev-dot', 'aria-hidden': 'true' }, '·'),
          el('span', { class: 'mono cc-ev-var' }, varId || '未标注变量'),
          el('span', { class: 'cc-ev-dot', 'aria-hidden': 'true' }, '·'),
          el('span', { class: 'mono cc-ev-window' }, winText)
        ]),
        el('div', { class: 'cc-ev-note' }, evd.note || ''),
        el('div', { class: 'cc-ev-meta tag-row' }, [
          el('span', { class: 'mono tiny' }, 't0=' + (t0 != null ? FMT.num(t0, 2) : '—') + ' s：' + (v0 == null ? '不可用' : FMT.num(v0, prec) + ' ' + unitOf(sig))),
          el('span', { class: 'mono tiny' }, 't1=' + (t1 != null ? FMT.num(t1, 2) : '—') + ' s：' + (v1 == null ? '不可用' : FMT.num(v1, prec) + ' ' + unitOf(sig))),
          sig ? UI.sourceTag(sig.sourceKind) : null,
          el('button', {
            class: 'btn btn-ghost btn-xs', type: 'button',
            title: '跳转曲线页并锁定该变量与时段',
            on: { click: () => jumpToEvidence(run, varId, t0, t1) }
          }, [UI.icon('external', { size: 12 }), el('span', {}, '查看原始数据')])
        ])
      ]));
    });
    return list;
  }

  /* 证据 → 曲线页：锁定该变量（全量 visible map 覆盖）+ 该证据时段（按曲线页最小窗宽外扩） */
  function jumpToEvidence(run, varId, t0, t1) {
    if (!varId) { act('toast', '该证据未标注变量，无法定位到曲线', 'warn'); return; }
    const sig = signalOf(run, varId);
    const visible = {};
    (run.signals || []).forEach((s) => { if (!s.tableOnly) visible[s.id] = (s.id === varId); });
    if (!Object.prototype.hasOwnProperty.call(visible, varId)) visible[varId] = true;
    const patch = { visible: visible, selectedSignal: varId };
    if (sig && sig.category) patch.category = sig.category;
    const dur = (run.config && run.config.duration_s) || 60;
    if (t0 != null && t1 != null && t1 >= t0) {
      const center = (t0 + t1) / 2;
      const half = Math.max((t1 - t0) / 2, 0.35);
      patch.viewWindow = [Math.max(0, center - half), Math.min(dur, center + half)];
      patch.zoom = 'custom';
    }
    act('setPageState', 'signals', patch);
    act('navigate', 'signals');
  }

  /* 模板句：只用引擎已给的事件/连接/信号元数据组合，不新增事实 */
  function buildTemplateSentence(state, run, node, edges, causal, ev, system) {
    const segments = [];
    const slot = (text, kind) => el('b', { class: 'cc-slot', 'data-kind': kind || null }, text);

    const eventText = causal && causal.headline
      ? causal.headline
      : (ev ? ((ev.trigger_s != null ? 't=' + FMT.time(ev.trigger_s) + ' ' : '') + (ev.label || '故障事件')) : '该运行中没有故障事件');

    const channelText = componentLabel(system, node.componentId) ||
      (ev && componentLabel(system, ev.target_component)) ||
      (ev && signalLabel(run, ev.target_signal)) ||
      (node.signalIds && node.signalIds.length ? signalLabel(run, node.signalIds[0]) : null) ||
      '该作用通道';

    const incoming = incomingEdges(edges, node.id);
    let ruleText = '';
    let ruleKind = '';
    if (Array.isArray(incoming) && incoming.length) {
      ruleText = '模型连接规则「' + incoming.map((e) => e.label || (e.from + '→' + e.to)).join('」「') + '」';
      ruleKind = 'MODEL_STATE';
    } else if (node.signalIds && node.signalIds.length) {
      const sig = signalOf(run, node.signalIds[0]);
      if (sig && sig.formula) { ruleText = '信号定义「' + sig.formula + '」'; ruleKind = sig.sourceKind || 'MODEL_STATE'; }
    }
    if (!ruleText && causal && causal.mechanismSummary) {
      ruleText = causal.mechanismSummary;
      ruleKind = 'MODEL_STATE';
    }
    if (!ruleText) ruleText = '该节点由模型连接规则确定';

    const effectText = node.short || node.title || node.id;

    segments.push('因为【');
    segments.push(slot(eventText, 'FAULT_EVENT'));
    segments.push('】发生在【');
    segments.push(slot(channelText, 'CONFIG'));
    segments.push('】，且');
    segments.push(slot(ruleText, ruleKind));
    segments.push('，所以【');
    segments.push(slot(effectText, 'MODEL_STATE'));
    segments.push('】发生改变。');
    return { segments: segments };
  }

  /* ---------------------------------------------------- monitor contrast */
  function renderMonitorCard(state, run) {
    const card = el('section', { class: 'cc-bottom-card fl-panel' });
    const ps = pageState(state);
    const mon = state.monitorRun;
    const compatible = !!(mon && run && isMonitorCompatible(run, mon));
    const open = !!ps.monitorOpen;

    const head = el('div', { class: 'panel-head' }, [
      el('div', { class: 'panel-head-main' }, [
        UI.icon('monitor', { size: 14 }),
        el('span', { class: 'panel-title' }, '仅监测 vs 闭环')
      ]),
      mon ? el('button', {
        class: 'btn btn-ghost btn-xs', type: 'button', 'aria-expanded': String(open),
        on: { click: () => act('setPageState', 'causal', { monitorOpen: !open }) }
      }, [UI.icon(open ? 'chevron-down' : 'chevron-right', { size: 12 }), el('span', {}, open ? '收起' : '展开')]) : null
    ]);
    card.appendChild(head);
    const body = el('div', { class: 'panel-body cc-bottom-body' });
    card.appendChild(body);

    if (!run) {
      body.appendChild(el('p', { class: 'muted small' }, '创建运行后可与仅监测对照运行比较。'));
      return card;
    }

    const system = systemOf(run.systemId);
    const fault = findFaultDef(system, run);
    /* 当前运行本身就是仅监测对照运行：应与配置相同的闭环运行对照，而不是自己和自己比 */
    if (mon && run.runId === mon.runId) {
      const pool = Object.keys(apiRef.getState().runs || {}).map((id) => apiRef.getState().runs[id]);
      const closed = pool.filter((r) => r && r.runId !== mon.runId && isMonitorCompatible(r, mon))[0] || null;
      body.appendChild(el('div', { class: 'notice', 'data-tone': 'info' }, [
        UI.icon('info', { size: 14 }),
        el('div', {}, '当前运行 ' + mon.runId + ' 本身就是仅监测对照运行。要观察"仅监测 vs 闭环"的差异，请载入同一配置的闭环故障运行作为当前运行。')
      ]));
      if (closed) {
        body.appendChild(el('button', {
          class: 'btn btn-primary btn-sm', type: 'button',
          on: { click: () => act('loadRun', closed.runId) }
        }, [UI.icon('swap', { size: 13 }), el('span', {}, '载入闭环运行 ' + closed.runId)]));
      } else {
        body.appendChild(el('button', {
          class: 'btn btn-primary btn-sm', type: 'button',
          on: { click: () => act('navigate', 'system') }
        }, [UI.icon('grid', { size: 13 }), el('span', {}, '前往系统页创建闭环故障运行')]));
      }
      const note = run.causal && run.causal.monitorContrast && run.causal.monitorContrast.description;
      if (note) {
        body.appendChild(el('div', { class: 'cc-def' }, [
          el('span', { class: 'eyebrow' }, '模型对照说明'), el('span', { class: 'mono' }, note)
        ]));
      }
      return card;
    }
    if (!mon) {
      body.appendChild(el('p', { class: 'cc-card-desc' },
        '仅监测模式：偏置只进入测量通道、不参与反馈，真实状态保持不变；与当前闭环运行对照可区分"模型机制"与"测量污染"。'));
      if (fault && fault.monitorEffect) {
        body.appendChild(el('div', { class: 'cc-def' }, [
          el('span', { class: 'eyebrow' }, '仅监测预期行为'), el('span', { class: 'mono' }, fault.monitorEffect)
        ]));
      }
      const contrastNote = run.causal && run.causal.monitorContrast && run.causal.monitorContrast.description;
      if (contrastNote) {
        body.appendChild(el('div', { class: 'cc-def' }, [
          el('span', { class: 'eyebrow' }, '模型对照说明'), el('span', { class: 'mono' }, contrastNote)
        ]));
      }
      body.appendChild(el('button', {
        class: 'btn btn-primary btn-sm', type: 'button',
        disabled: !run,
        on: { click: () => act('createMonitorContrast') }
      }, [UI.icon('plus', { size: 13 }), el('span', {}, '创建仅监测对照运行')]));
      body.appendChild(el('p', { class: 'tiny muted' }, '将用当前运行配置创建 feedback_mode=monitor 的新 Run（role=contrast），不改写现有运行。'));
      return card;
    }

    if (!compatible) {
      body.appendChild(el('div', { class: 'notice', 'data-tone': 'warn' }, [
        UI.icon('warning', { size: 14 }),
        el('div', {}, '对照运行 ' + mon.runId + ' 与当前运行的系统/故障配置不一致，不能直接比较；请重新创建对照运行。')
      ]));
      body.appendChild(el('button', {
        class: 'btn btn-primary btn-sm', type: 'button',
        on: { click: () => act('createMonitorContrast') }
      }, [UI.icon('refresh', { size: 13 }), el('span', {}, '按当前配置重建对照运行')]));
      return card;
    }

    body.appendChild(el('p', { class: 'cc-card-desc' },
      '两个运行共用同一模型与故障配置，仅 feedback_mode 不同；下表为焦点信号当前时刻值（' + run.runId + ' vs ' + mon.runId + '）。'));
    const contrastNote = run.causal && run.causal.monitorContrast && run.causal.monitorContrast.description;
    if (contrastNote) {
      body.appendChild(el('div', { class: 'cc-def' }, [
        el('span', { class: 'eyebrow' }, '模型对照说明'), el('span', { class: 'mono' }, contrastNote)
      ]));
    }
    if (open) {
      const signals = contrastSignals(run, mon);
      if (!signals.length) {
        body.appendChild(el('p', { class: 'muted small' }, '没有可对照的焦点信号。'));
      } else {
        const table = el('table', { class: 'cc-mini-table' });
        table.appendChild(el('thead', {}, [
          el('tr', {}, [
            el('th', {}, '焦点信号'),
            el('th', {}, (run.config && run.config.feedback_mode === 'monitor' ? '仅监测' : '闭环') + ' · ' + run.runId),
            el('th', {}, '仅监测 · ' + mon.runId),
            el('th', {}, '差值')
          ])
        ]));
        const tbody = el('tbody');
        const rows = [];
        signals.slice(0, 5).forEach((sig) => {
          const closedEl = el('td', { class: 'num' }, '');
          const monEl = el('td', { class: 'num' }, '');
          const deltaEl = el('td', { class: 'num' }, '');
          rows.push({ sig: sig, closedEl: closedEl, monEl: monEl, deltaEl: deltaEl });
          tbody.appendChild(el('tr', {}, [
            el('td', {}, [
              el('span', { class: 'cc-mini-name' }, sig.label || sig.id),
              el('span', { class: 'cc-mini-id mono' }, sig.id + ' · ' + (sig.unit || ''))
            ]),
            closedEl, monEl, deltaEl
          ]));
        });
        table.appendChild(tbody);
        body.appendChild(el('div', { class: 'cc-table-wrap' }, [table]));
        const update = (st) => {
          rows.forEach((row) => {
            const a = sample(run, row.sig.id, st.currentTime).value;
            const b = sample(mon, row.sig.id, st.currentTime).value;
            const d = (a != null && b != null) ? (b - a) : null;
            const prec = precisionOf(row.sig, 2);
            row.closedEl.textContent = (a == null ? '不可用' : FMT.num(a, prec)) + ' ' + unitOf(row.sig);
            row.monEl.textContent = (b == null ? '不可用' : FMT.num(b, prec)) + ' ' + unitOf(row.sig);
            row.deltaEl.textContent = d == null ? '不可用' : signedOrZero(d, prec) + ' ' + unitOf(row.sig);
          });
        };
        liveHooks.push(update);
        update(state);
        body.appendChild(el('p', { class: 'tiny muted' },
          '对照运行来自 state.monitorRun（role=contrast）。拖动时间线可观察测量通道与真实状态的分离；两 Run 的时间基准相同。'));
      }
      if (fault) {
        body.appendChild(el('div', { class: 'cc-def-row' }, [
          fault.closedLoopEffect ? el('div', { class: 'cc-def' }, [
            el('span', { class: 'eyebrow' }, '闭环模式模型行为'), el('span', { class: 'mono' }, fault.closedLoopEffect)
          ]) : null,
          fault.monitorEffect ? el('div', { class: 'cc-def' }, [
            el('span', { class: 'eyebrow' }, '仅监测模式模型行为'), el('span', { class: 'mono' }, fault.monitorEffect)
          ]) : null
        ]));
      }
    }
    return card;
  }

  function isMonitorCompatible(run, mon) {
    if (!run || !mon) return false;
    if (run.systemId !== mon.systemId) return false;
    const a = run.config || {};
    const b = mon.config || {};
    if (b.feedback_mode !== 'monitor') return false;
    if (JSON.stringify(a.initial) !== JSON.stringify(b.initial)) return false;
    if (a.duration_s !== b.duration_s || a.dt_s !== b.dt_s) return false;
    const fa = a.fault || {};
    const fb = b.fault || {};
    return fa.family === fb.family && fa.faultId === fb.faultId &&
      fa.t_start_s === fb.t_start_s &&
      JSON.stringify(fa.params || {}) === JSON.stringify(fb.params || {});
  }

  function contrastSignals(run, mon) {
    const nodes = causalNodes(run);
    const wanted = new Set();
    nodes.forEach((n) => (n.signalIds || []).forEach((id) => wanted.add(id)));
    let list = (run.signals || []).filter((s) => wanted.has(s.id) && !s.tableOnly && s.sourceKind !== 'FAULT_EVENT');
    list = list.filter((s) => s.sourceKind === 'MODEL_STATE' || s.sourceKind === 'OBSERVATION');
    if (!list.length) {
      list = (run.signals || []).filter((s) => !s.tableOnly && s.sourceKind !== 'FAULT_EVENT' &&
        (/_(true|meas)_/.test(s.id)) && /(current|power|frequency)/.test(s.category || ''));
    }
    if (!list.length) {
      list = (run.signals || []).filter((s) => !s.tableOnly && (s.sourceKind === 'MODEL_STATE' || s.sourceKind === 'OBSERVATION'));
    }
    /* 优先展示电流/频率通道的真值-测量对，其次功率；同类别先真值后测量 */
    list.sort((a, b) => {
      const catRank = (s) => {
        const cat = s.category || '';
        if (/current|frequency/.test(cat)) return 0;
        if (/power/.test(cat)) return 1;
        return 2;
      };
      const kindRank = (s) => (/true/.test(s.id) ? 0 : /meas/.test(s.id) ? 1 : 2);
      return (catRank(a) - catRank(b)) || (kindRank(a) - kindRank(b));
    });
    const seen = new Set();
    return list.filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return mon.timeseries && mon.timeseries.signals && mon.timeseries.signals[s.id];
    });
  }

  /* ------------------------------------------------------- residual card */
  function findSignalByCandidates(run, ids) {
    for (let i = 0; i < ids.length; i++) {
      const s = signalOf(run, ids[i]);
      if (s) return s;
    }
    return null;
  }
  function residualPeak(run) {
    const metric = metricOf(run, 'max_abs_r_meas_kW');
    if (metric && !metric.unavailable && typeof metric.value === 'number' && isFinite(metric.value)) return metric.value;
    const sig = findSignalByCandidates(run, RESIDUAL_CANDIDATES.rMeas);
    if (!sig) return null;
    const arr = run.timeseries && run.timeseries.signals ? run.timeseries.signals[sig.id] : null;
    if (!arr) return null;
    let max = 0;
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      if (typeof v === 'number' && isFinite(v)) max = Math.max(max, Math.abs(v));
    }
    return max;
  }

  function renderResidualCard(state, run) {
    const ps = pageState(state);
    const open = !!ps.residualOpen;
    const peak = run ? residualPeak(run) : null;
    const peakText = peak == null ? null : FMT.num(peak, Math.abs(peak) >= 10 ? 1 : 2);
    const title = (peak != null && peak > 1e-6) ? '为什么显示 +' + peakText + ' kW' : '功率平衡残差';

    const card = el('section', { class: 'cc-bottom-card fl-panel' });
    card.appendChild(el('div', { class: 'panel-head' }, [
      el('div', { class: 'panel-head-main' }, [
        UI.icon('pulse', { size: 14 }),
        el('span', { class: 'panel-title' }, title)
      ]),
      el('button', {
        class: 'btn btn-ghost btn-xs', type: 'button', 'aria-expanded': String(open),
        title: '展开真实/测量功率平衡公式与逐项数值',
        on: { click: () => act('setPageState', 'causal', { residualOpen: !open }) }
      }, [UI.icon(open ? 'chevron-down' : 'chevron-right', { size: 12 }), el('span', {}, open ? '收起' : '展开')])
    ]));
    const body = el('div', { class: 'panel-body cc-bottom-body' });
    card.appendChild(body);

    if (!run) {
      body.appendChild(el('p', { class: 'muted small' }, '创建运行后可查看真实/测量功率平衡残差。'));
      return card;
    }
    const ev = findFocusEvent(run);
    const sigTrue = findSignalByCandidates(run, RESIDUAL_CANDIDATES.rTrue);
    const sigMeas = findSignalByCandidates(run, RESIDUAL_CANDIDATES.rMeas);
    const sourceTrue = findSignalByCandidates(run, RESIDUAL_CANDIDATES.sourceTrue);
    const batTrue = findSignalByCandidates(run, RESIDUAL_CANDIDATES.batTrue);
    const batMeas = findSignalByCandidates(run, RESIDUAL_CANDIDATES.batMeas);
    const loadSig = findSignalByCandidates(run, RESIDUAL_CANDIDATES.load);
    const rotorSig = findSignalByCandidates(run, RESIDUAL_CANDIDATES.rotor);

    if (!sigTrue && !sigMeas) {
      body.appendChild(el('div', { class: 'notice', 'data-tone': 'warn' }, [
        UI.icon('warning', { size: 14 }),
        el('div', {}, '「本模型无法推导该现象」：本次运行未提供 r_true / r_meas 残差信号，模型没有对应的守恒残差定义，页面不猜测原因。')
      ]));
      return card;
    }
    if (!ev) {
      body.appendChild(el('p', { class: 'cc-card-desc' }, '本运行没有故障事件，真实与测量平衡残差都应接近 0，不存在需要解释的残差现象。'));
      body.appendChild(el('div', { class: 'cc-resid-summary' }, [
        residualSummaryRow(run, sigTrue, state.currentTime),
        residualSummaryRow(run, sigMeas, state.currentTime)
      ]));
      return card;
    }
    if (peak == null || peak <= 1e-6) {
      body.appendChild(el('div', { class: 'notice' }, [
        UI.icon('info', { size: 14 }),
        el('div', {}, '本次运行的最大测量一致性残差 ≈ 0，未出现可解释的残差异常；页面不推断未观测的原因。')
      ]));
      return card;
    }

    body.appendChild(el('p', { class: 'cc-card-desc' },
      '测量一致性残差由测量通道构造，' + peakText + ' kW 是测量偏差的体现；真实功率守恒仍然成立。点击展开查看两条平衡式的逐项数值。'));
    /* +4 kW 教学卡（UI_COPY_GUARDRAILS §4 逐字口径；TXT-07）。
       仅对批准白名单内的 P0 基准故障 Run（+4 kW）显示数值；其余 Run 只给机制文本，不编造数字。 */
    (function appendTeachingCard() {
      try {
        const scope = FL.scope && FL.scope.classify ? FL.scope.classify(run.config) : 'extension_preview';
        const rMeasM = run.metrics.filter((m) => m.metric_id === 'max_abs_r_meas_kW')[0] || {};
        const isP0FourKw = scope === 'approved_p0' && typeof rMeasM.value === 'number' && Math.abs(rMeasM.value - 4) < 1e-9;
        if (!isP0FourKw) return;
        body.appendChild(el('div', { class: 'notice', 'data-testid': 'card-residual-energy' }, [
          el('div', {}, '+4 kW 是测量通道误差的功率当量（代数恒等），不是能量损失。'),
          el('div', {}, '+4 kW×40 s = 0.04444 kWh（测量残差积分）；实际少放电 0.04278 kWh（真实口径，故障比基准少放）；测量口径电池电能比基准多 +0.00167 kWh（口径差异，非真实多充/多放）。'),
          el('div', {}, '恒等分解：0.0444444 kWh（A 测量残差积分） = 0.0427778 kWh（B 实际少放电） + 0.0016667 kWh（C 测量口径电能差）；三者定义不同、口径不同，不能互相替代。'),
          el('div', {}, '误差单位：pp（百分点）；60 s 误差 −0.11111 pp。')
        ]));
      } catch (e) { /* 教学卡为增强内容，出错不阻塞残差卡 */ }
    })();
    if (!open) {
      const summary = el('div', { class: 'cc-resid-summary' });
      const hook = (st) => {
        UI.clear(summary);
        const tEval = residualEvalTime(st, run, ev);
        summary.appendChild(residualSummaryRow(run, sigTrue, tEval, true));
        summary.appendChild(residualSummaryRow(run, sigMeas, tEval, true));
        summary.appendChild(el('div', { class: 'tiny muted' }, '评估时刻：t = ' + FMT.time(tEval) +
          (st.currentTime < ev.trigger_s ? '（故障尚未开始，已取故障期间末点）' : '（当前时刻）')));
      };
      liveHooks.push(hook);
      hook(state);
      body.appendChild(summary);
      return card;
    }

    /* 展开：两条平衡式 + 逐项数值 */
    const terms = [];
    const termList = [];
    if (sourceTrue) termList.push({ sig: sourceTrue, sign: 1, label: '电源真实功率' });
    if (batTrue) termList.push({ sig: batTrue, sign: 1, label: '电池真实功率' });
    if (batMeas) termList.push({ sig: batMeas, sign: 1, label: '电池测量功率' });
    if (loadSig) termList.push({ sig: loadSig, sign: -1, label: '负载功率' });
    if (rotorSig) termList.push({ sig: rotorSig, sign: -1, label: '转子等效功率' });

    const liveBox = el('div', { class: 'cc-resid-live' });
    const hook = (st) => {
      UI.clear(liveBox);
      const tEval = residualEvalTime(st, run, ev);
      const samples = {};
      termList.forEach((term) => { samples[term.sig.id] = sample(run, term.sig.id, tEval).value; });
      const useTrue = !!(sourceTrue && batTrue && loadSig);
      const useMeas = !!(sourceTrue && batMeas && loadSig);
      liveBox.appendChild(el('div', { class: 'cc-resid-time mono' }, '评估时刻 t = ' + FMT.time(tEval) +
        (st.currentTime < ev.trigger_s ? '（故障尚未开始，取故障期间末点）' : '（当前时刻）')));
      if (useTrue) {
        liveBox.appendChild(residualFormulaBlock('真实功率平衡残差 r_true', true, tEval, run, {
          sourceTrue: sourceTrue, bat: batTrue, load: loadSig, rotor: rotorSig, residual: sigTrue
        }, samples));
      }
      if (useMeas) {
        liveBox.appendChild(residualFormulaBlock('测量一致性残差 r_meas', false, tEval, run, {
          sourceTrue: sourceTrue, bat: batMeas, load: loadSig, rotor: rotorSig, residual: sigMeas
        }, samples));
      }
      if (!useTrue && !useMeas) {
        const tRow = el('div', { class: 'cc-term-table' });
        termList.forEach((term) => {
          const v = samples[term.sig.id];
          tRow.appendChild(el('div', { class: 'cc-term-row' }, [
            el('span', { class: 'cc-term-label' }, [
              el('span', {}, term.sig.label || term.sig.id),
              el('span', { class: 'mono tiny muted' }, term.sig.id)
            ]),
            el('span', { class: 'cc-term-value num' }, (v == null ? '不可用' : signedOrZero(term.sign * v, precisionOf(term.sig, 3))) + ' ' + unitOf(term.sig)),
            el('span', {}, UI.sourceTag(term.sig.sourceKind))
          ]));
        });
        liveBox.appendChild(tRow);
      }
      const delta = (() => {
        const a = sigMeas ? sample(run, sigMeas.id, tEval).value : null;
        const b = sigTrue ? sample(run, sigTrue.id, tEval).value : null;
        return (a != null && b != null) ? a - b : null;
      })();
      liveBox.appendChild(el('div', { class: 'cc-term-foot' }, [
        el('span', {}, 'r_meas − r_true = ' + (delta == null ? '不可用' : signedOrZero(delta, 3) + ' kW')),
        el('span', { class: 'muted' }, '该项即测量通道引入的一致性偏差。')
      ]));
    };
    liveHooks.push(hook);
    hook(state);
    body.appendChild(liveBox);
    body.appendChild(el('div', { class: 'notice', 'data-tone': 'warn' }, [
      UI.icon('warning', { size: 14 }),
      el('div', {}, '这是测量一致性残差，不是实际多发/损失的能量：总线上的真实功率守恒（r_true ≈ 0）并未被破坏，' +
        '故障期间看起来的"多出功率"来自测量通道的偏置，不是真实能量。')
    ]));
    if (!terms.length) { /* noop */ }
    return card;
  }

  function residualEvalTime(state, run, ev) {
    const d = (run.config && run.config.duration_s) || 60;
    if (!ev) return state.currentTime;
    if (state.currentTime >= ev.trigger_s) return state.currentTime;
    return d;
  }

  function residualSummaryRow(run, sig, t, withLabel) {
    if (!sig) return el('span', { class: 'muted small' }, '残差信号不可用');
    const v = sample(run, sig.id, t).value;
    const prec = precisionOf(sig, 3);
    return el('div', { class: 'cc-resid-row' }, [
      el('span', { class: 'cc-resid-name' }, [
        el('span', {}, sig.label || sig.id),
        el('span', { class: 'mono tiny muted' }, sig.id)
      ]),
      el('span', { class: 'cc-resid-val num' }, (v == null ? '不可用' : signedOrZero(v, prec) + ' ' + unitOf(sig))),
      el('span', {}, UI.sourceTag(sig.sourceKind)),
      withLabel ? el('span', { class: 'tiny muted' }, 't=' + FMT.num(t, 1) + ' s') : null
    ]);
  }

  function residualFormulaBlock(title, isTrue, tEval, run, parts, samples) {
    const source = parts.sourceTrue;
    const bat = parts.bat;
    const load = parts.load;
    const rotor = parts.rotor;
    const residual = parts.residual;
    const label = (sig) => (sig && sig.shortLabel) || (sig && sig.id) || '—';
    const numeric = (sig) => {
      const v = sig ? samples[sig.id] : null;
      return v == null ? '不可用' : FMT.num(v, precisionOf(sig, 3));
    };
    const sum = (() => {
      const sv = source ? samples[source.id] : null;
      const bv = bat ? samples[bat.id] : null;
      const lv = load ? samples[load.id] : null;
      const rv = rotor ? samples[rotor.id] : null;
      if (sv == null || bv == null || lv == null) return null;
      return sv + bv - lv - (rv == null ? 0 : rv);
    })();
    const residualVal = residual ? sample(run, residual.id, tEval).value : null;
    const lhs = label(residual);
    const expr = label(source) + ' + ' + label(bat) + ' − ' + label(load) + (rotor ? ' − ' + label(rotor) : '');
    const nums = numeric(source) + ' + ' + numeric(bat) + ' − ' + numeric(load) + (rotor ? ' − ' + numeric(rotor) : '');
    const sumText = sum == null ? '不可用' : signedOrZero(sum, 3) + ' kW';
    const sigText = residualVal == null ? '不可用' : signedOrZero(residualVal, precisionOf(residual, 3)) + ' kW';
    return el('div', { class: 'cc-formula-block' + (isTrue ? '' : ' is-meas') }, [
      el('div', { class: 'cc-formula-title' }, [
        el('span', {}, title),
        residual ? UI.sourceTag(residual.sourceKind) : null
      ]),
      el('div', { class: 'formula' }, [
        el('div', {}, lhs + ' = ' + expr),
        el('div', {}, '  = ' + nums + ' ' + ((bat && bat.unit) || 'kW')),
        el('div', {}, '  = ' + sumText + '（信号值 ' + sigText + '）')
      ]),
      el('div', { class: 'cc-term-chips tag-row' }, [
        source ? termChip(source, samples[source.id], 1) : null,
        bat ? termChip(bat, samples[bat.id], 1) : null,
        load ? termChip(load, samples[load.id], -1) : null,
        rotor ? termChip(rotor, samples[rotor.id], -1) : null
      ])
    ]);
  }

  function termChip(sig, value, sign) {
    return el('span', { class: 'cc-term-chip' }, [
      UI.sourceTag(sig.sourceKind),
      el('span', { class: 'cc-term-chip-label mono' }, (sig.shortLabel || sig.id)),
      el('span', { class: 'cc-term-chip-val num' }, (value == null ? '不可用' : signedOrZero(sign * value, precisionOf(sig, 3))))
    ]);
  }

  /* -------------------------------------------------- alternatives card */
  function renderAlternativesCard(state, run) {
    const card = el('section', { class: 'cc-bottom-card fl-panel' });
    card.appendChild(el('div', { class: 'panel-head' }, [
      el('div', { class: 'panel-head-main' }, [
        UI.icon('layers', { size: 14 }),
        el('span', { class: 'panel-title' }, '替代解释与局限')
      ]),
      run ? el('button', {
        class: 'btn btn-ghost btn-xs', type: 'button', on: { click: () => openAssumptions(run) }
      }, [UI.icon('info', { size: 12 }), el('span', {}, '模型假设')]) : null
    ]));
    const body = el('div', { class: 'panel-body cc-bottom-body' });
    card.appendChild(body);
    if (!run) { body.appendChild(el('p', { class: 'muted small' }, '创建运行后显示替代解释与模型局限。')); return card; }
    const causal = run.causal || {};
    const system = systemOf(run.systemId);
    const alternatives = Array.isArray(causal.alternatives) ? causal.alternatives : [];
    if (alternatives.length) {
      alternatives.forEach((alt) => {
        body.appendChild(el('div', { class: 'cc-alt' }, [
          el('div', { class: 'cc-alt-title' }, alt.title || '替代解释'),
          el('div', { class: 'cc-alt-text' }, alt.text || '')
        ]));
      });
    } else {
      body.appendChild(el('div', { class: 'notice' }, [
        UI.icon('info', { size: 14 }),
        el('div', {}, '引擎未提供替代解释条目；本页不做额外推断。')
      ]));
    }
    const limits = [];
    const pushLimit = (t) => { if (t && limits.indexOf(t) < 0) limits.push(t); };
    (causal.limitations || []).forEach(pushLimit);
    ((system && system.model && system.model.limitations) || []).forEach(pushLimit);
    if (limits.length) {
      body.appendChild(el('div', { class: 'eyebrow mt-12 mb-8' }, '模型局限'));
      body.appendChild(el('ul', { class: 'cc-bullets' }, limits.map((t) => el('li', {}, t))));
    }
    body.appendChild(el('p', { class: 'cc-footnote' },
      '因果链是模型规定的机制解释，不是 AI 独立发现故障，也不是对真实设备的诊断结论；所有数值均来自当前运行 ' + run.runId + '。'));
    return card;
  }

  function goSystemButton() {
    return el('button', {
      class: 'btn btn-primary btn-sm', type: 'button',
      on: { click: () => act('navigate', 'system') }
    }, [UI.icon('grid', { size: 13 }), el('span', {}, '前往系统交互图创建运行')]);
  }
  function recentRunButton(state) {
    const hasRuns = state.runs && Object.keys(state.runs).length > 0;
    if (!hasRuns) return null;
    return el('button', {
      class: 'btn btn-ghost btn-sm', type: 'button',
      on: { click: () => act('restoreLastSession') }
    }, [UI.icon('replay', { size: 13 }), el('span', {}, '载入最近一次运行')]);
  }

  /* ----------------------------------------------------------- render all */
  function renderAll(state) {
    lastState = state;
    liveHooks = [];
    const run = state.activeRun;
    const nodes = causalNodes(run);
    const edges = causalEdges(run);
    const focusId = resolveFocusNodeId(state, run, nodes);

    renderFocusBar(state, run);
    renderChain(state, run, nodes, edges, focusId);
    renderInspector(state, run, nodes, edges, focusId);
    UI.clear(refs.bottom);
    if (!run) {
      refs.grid.hidden = true;
      refs.bottom.hidden = true;
      const wrap = refs.wrap;
      if (!wrap.querySelector('.cc-no-run')) {
        const noRun = el('div', { class: 'cc-no-run fl-panel' }, [
          UI.emptyState({
            icon: 'flask',
            title: '尚未创建运行',
            desc: '因果解释需要一次带故障的运行。先到系统交互图选择故障并创建运行，再回到本页查看六节点因果链与数值证据。'
          }),
          el('div', { class: 'cc-no-run-actions' }, [goSystemButton(), recentRunButton(state)])
        ]);
        wrap.appendChild(noRun);
      }
      return;
    }
    const stale = refs.wrap.querySelector('.cc-no-run');
    if (stale) stale.remove();
    refs.grid.hidden = false;
    refs.bottom.hidden = false;
    refs.bottom.appendChild(renderMonitorCard(state, run));
    refs.bottom.appendChild(renderResidualCard(state, run));
    refs.bottom.appendChild(renderAlternativesCard(state, run));

    /* 焦点节点保持键盘焦点 */
    if (pendingFocus && refs.nodeEls && refs.nodeEls[pendingFocus]) {
      try { refs.nodeEls[pendingFocus].focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      pendingFocus = null;
    }
  }

  function syncTime(state) {
    lastState = state;
    if (refs && refs.inspector) {
      const clock = refs.inspector.querySelector('.cc-clock');
      if (clock && clock.isConnected) clock.textContent = 't = ' + FMT.time(state.currentTime);
    }
    for (let i = 0; i < liveHooks.length; i++) {
      try { liveHooks[i](state); } catch (e) { /* keep page alive */ }
    }
  }

  function renderKey(state) {
    const run = state.activeRun;
    const ps = pageState(state);
    const causal = run && run.causal;
    return [
      run ? run.runId : 'no-run',
      run ? run.configHash : '',
      causal ? (causal.focusEventId || '') : '',
      causal && causal.nodes ? causal.nodes.length : 0,
      causal && causal.edges ? causal.edges.length : 0,
      ps.focusNodeId || '',
      ps.evidenceOpen ? 'e1' : 'e0',
      ps.monitorOpen ? 'm1' : 'm0',
      ps.residualOpen ? 'r1' : 'r0',
      state.monitorRun ? state.monitorRun.runId : '',
      state.mode || '',
      (state.runs ? Object.keys(state.runs).length : 0)
    ].join('|');
  }

  /* -------------------------------------------------------------- resize */
  function onResize() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (lastState && lastState.page === 'causal') layoutEdges(lastState);
    }, 120);
  }

  /* ------------------------------------------------------------- page def */
  pages['causal'] = {
    id: 'causal',
    label: '因果解释',
    navLabel: '因果',
    mount(root, api) {
      apiRef = api;
      el = api.el;
      UI = api.ui;
      FMT = api.fmt;
      P = api.protocol;
      buildSkeleton(root);
      window.addEventListener('resize', onResize);
    },
    update(state, reason) {
      if (!refs) return;
      if (state.truthSealed) {
        /* 壳层会阻止进入，这里仍做防御性处理 */
        const key = 'sealed';
        if (key !== lastKey) {
          lastKey = key;
          UI.clear(refs.focus);
          UI.clear(refs.inspector);
          UI.clear(refs.chain);
          refs.chainWrap.hidden = true;
          refs.chainEmpty.hidden = false;
          UI.clear(refs.chainEmpty);
          refs.chainEmpty.appendChild(UI.emptyState({
            icon: 'lock', title: '盲测进行中：真值相关页面已封存',
            desc: '比赛结束后因果解释页自动解锁。'
          }));
          showSealedNotice(refs.focus);
        }
        return;
      }
      if (state.page !== 'causal') {
        lastKey = '';
        return;
      }
      const key = renderKey(state);
      if (key !== lastKey) {
        lastKey = key;
        renderAll(state);
      } else if (reason === 'time' || reason === 'playback' || reason === 'run' || reason === 'all') {
        syncTime(state);
      }
    }
  };

  function showSealedNotice(host) {
    UI.clear(host);
    host.appendChild(el('div', { class: 'cc-focus-body' }, [
      el('div', { class: 'eyebrow' }, '盲测模式'),
      el('div', { class: 'cc-focus-headline' }, '真值相关页面已封存')
    ]));
  }
})();
