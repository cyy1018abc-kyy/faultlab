/* owner: lab-pages | module: page-home | contract: docs/CONTRACT.md */
/* 实验首页：Hero（价值主张 + 信任标签）、三系统选择卡、选中系统的实验详情、
   三个问题、参数摘要（标预设值）、建议体验路径、模型假设抽屉、3 步快速讲解浮层、
   故障原理解剖（静态图解）、恢复上次实验 / 继续当前实验。 */
(function () {
  'use strict';
  const FL = window.FL = window.FL || {};
  const pages = FL.pages = FL.pages || {};

  const TRUST = [
    { icon: 'shield', label: '离线可运行', title: '纯静态单页应用：无网络请求、无需安装 MATLAB，双击 FaultLab.html 亦可运行。' },
    { icon: 'gauge', label: 'L0 行为级演示', title: '解析/行为级降阶模型；非 Simulink、非实测（无实测对比）。' },
    { icon: 'flask', label: '演示数据（解析示例）', title: '所有数值由模型生成，界面标注「预设值 / 示例」，并按 source_kind 标出来源。' }
  ];

  const INTRO_STEPS = [
    {
      icon: 'layers',
      title: '选择一个系统',
      text: '三个 L0 行为级能源系统共用同一套五页面。FL-001 电池储能为基准实验：默认在 20 s 注入 +10 A 电流传感器偏置。',
      bullets: ['FL-001 电池储能（基准）', 'FC-001 燃料电池（扩展）', 'GT-001 燃气涡轮（扩展）']
    },
    {
      icon: 'sliders',
      title: '编排并注入故障',
      text: '在系统页选择故障家族、幅值与时标；「应用并创建运行」会生成一个不可变 Run。修改草稿不会改写既有运行与哈希。',
      bullets: ['传感器漂移 / 负载冲击 / 执行器异常', '闭环反馈 ↔ 仅监测', '历史运行与基准运行都会被保留']
    },
    {
      icon: 'chart',
      title: '用证据核对每个数字',
      text: '曲线页区分真实值、测量值、目标值与偏置；因果页解释反馈回路；对比页与无故障基准比较并导出可复现数据。',
      bullets: ['同一条全局仿真时间线', '每个数字带 source_kind 来源标签', '结论可回溯到 run_id + variable + time_window']
    }
  ];

  const PAGE_GUIDE = [
    { id: 'home', icon: 'home', desc: '选择系统、创建运行、找回历史实验' },
    { id: 'system', icon: 'grid', desc: '在拓扑总览上编排故障并注入观察' },
    { id: 'signals', icon: 'wave', desc: '真实 / 测量 / 派生信号同轴核对' },
    { id: 'causal', icon: 'link', desc: '事件机制链解释每个数字为何变化' },
    { id: 'compare', icon: 'compare', desc: '与无故障基准对齐比较并导出证据' },
    { id: 'arena', icon: 'target', desc: '盲测竞技场：内置 Agent 同台排名', ext: true }
  ];

  const ROLE_META = {
    baseline: { label: '基准', tone: 'ok' },
    fault: { label: '故障组', tone: 'danger' },
    contrast: { label: '对照', tone: 'info' },
    imported: { label: '导入', tone: 'warn' }
  };

  const local = {
    selectedId: null,
    lastRunId: null,
    lastKey: null,
    principleOpen: false,
    activeIntro: null,
    activeDrawer: null,
    refs: {}
  };

  let ui = null;
  let actions = null;
  let getState = null;
  let protocol = null;
  let fmt = null;

  /* ------------------------------------------------------------------ */
  /* helpers                                                             */
  /* ------------------------------------------------------------------ */
  function el(tag, attrs) {
    const kids = Array.prototype.slice.call(arguments, 2);
    return ui.h.apply(null, [tag, attrs].concat(kids));
  }

  function safe(fn, fallback) {
    try { return fn(); } catch (err) {
      console.warn('[home]', err);
      return fallback;
    }
  }

  function list() { return safe(() => FL.systems.list(), []) || []; }
  function getDef(id) { return safe(() => FL.systems.get(id), null); }
  function state() { return getState ? getState() : { runs: {} }; }

  function defaultSelectedId(st, systems) {
    const ids = systems.map((s) => s.id);
    const runSys = st.activeRun && st.activeRun.systemId;
    if (runSys && ids.indexOf(runSys) >= 0) return runSys;
    if (st.systemId && ids.indexOf(st.systemId) >= 0) return st.systemId;
    return ids.length ? ids[0] : null;
  }

  function firstFault(sysDef) {
    if (!sysDef || !sysDef.faults || !sysDef.faults.length) return null;
    return sysDef.faults[0];
  }

  function findFault(sysDef, family) {
    if (!sysDef || !sysDef.faults) return null;
    for (let i = 0; i < sysDef.faults.length; i++) {
      if (sysDef.faults[i].family === family) return sysDef.faults[i];
    }
    return null;
  }

  function faultMagnitudeText(fault) {
    if (!fault || !fault.params || !fault.params.length) return '';
    const p = fault.params[0];
    const v = p.default;
    const num = (typeof v === 'number') ? String(v) : String(v);
    if (fault.family === 'actuator_fault') return '限幅 ' + num + (p.unit || '');
    const sign = (typeof v === 'number' && v >= 0) ? '+' : '';
    return sign + num + (p.unit ? ' ' + p.unit : '');
  }

  function faultSummary(fault) {
    if (!fault) return '无故障基准';
    return (fault.shortLabel || fault.label) + ' · ' + faultMagnitudeText(fault) + ' @ ' + fault.defaultTime_s + ' s';
  }

  function busVoltageText(sysDef) {
    const comps = (sysDef && sysDef.components) || [];
    for (let i = 0; i < comps.length; i++) {
      const c = comps[i];
      if (c.kind === 'bus' || c.id === 'bus') {
        const m = /(\d+(?:\.\d+)?)\s*V/.exec(String(c.role || '') + ' ' + String(c.description || ''));
        if (m) return m[1] + ' V';
      }
    }
    const asm = (sysDef && sysDef.model && sysDef.model.assumptions) || [];
    for (let i = 0; i < asm.length; i++) {
      const m = /(\d+(?:\.\d+)?)\s*V/.exec(asm[i].text || '');
      if (m) return m[1] + ' V';
    }
    return null;
  }

  function modeText(mode) { return mode === 'monitor' ? '仅监测' : '闭环演示'; }

  function paramChips(sysDef) {
    const fault = firstFault(sysDef);
    const chips = [];
    if (fault) {
      chips.push({ text: 't = ' + fault.defaultTime_s + ' s', tone: 'fault', title: '默认故障注入时刻（预设值）' });
      if (fault.params && fault.params.length) {
        const p = fault.params[0];
        const label = fault.family === 'actuator_fault'
          ? '限幅 ' + p.default + (p.unit || '')
          : '+' + p.default + (p.unit ? ' ' + p.unit : '');
        chips.push({ text: label, tone: 'fault', title: '默认幅值（预设值）' });
      }
    }
    const dur = (sysDef && sysDef.duration_s) || 60;
    chips.push({ text: dur + ' s', tone: 'neutral', title: '仿真时长（预设值）' });
    const v = busVoltageText(sysDef);
    if (v) chips.push({ text: v, tone: 'neutral', title: '母线电压为模型假设（理想母线，恒定）' });
    const mode = sysDef && sysDef.defaults ? sysDef.defaults.feedback_mode : 'closed_loop';
    chips.push({ text: modeText(mode), tone: 'acc', title: '默认控制模式（预设值）' });
    return chips;
  }

  /* ------------------------------------------------------------------ */
  /* hero                                                                */
  /* ------------------------------------------------------------------ */
  function buildFlowArt() {
    const nodes = [
      { label: '电池组', tone: 'acc' },
      { label: '变换器', tone: '' },
      { label: '母线', tone: 'bus' },
      { label: '负载', tone: '' }
    ];
    const row1 = el('div', { class: 'home-flow-row' });
    nodes.forEach((n, i) => {
      row1.appendChild(el('span', { class: 'home-flow-node' + (n.tone ? ' is-' + n.tone : '') }, n.label));
      if (i < nodes.length - 1) row1.appendChild(el('span', { class: 'home-flow-link is-power', 'aria-hidden': 'true' }));
    });
    const row2 = el('div', { class: 'home-flow-row is-signal' }, [
      el('span', { class: 'home-flow-node is-obs' }, '电流传感器'),
      el('span', { class: 'home-flow-link is-meas', 'aria-hidden': 'true' }),
      el('span', { class: 'home-flow-node' }, '控制器'),
      el('span', { class: 'home-flow-loop' }, '闭环反馈 ↑')
    ]);
    const art = el('aside', { class: 'home-hero-art', 'aria-hidden': 'true' }, [
      el('div', { class: 'home-art-head' }, [
        el('span', { class: 'eyebrow' }, '反馈回路示意 · 以 FL-001 为例'),
        el('span', { class: 'badge', 'data-tone': 'info' }, '示意')
      ]),
      el('div', { class: 'home-flow' }, [row1, row2]),
      el('div', { class: 'home-art-legend' }, [
        el('span', { class: 'home-art-legend-item' }, [el('span', { class: 'ls-swatch', 'data-style': 'solid', style: 'border-top-color:var(--acc)' }), '真实功率流']),
        el('span', { class: 'home-art-legend-item' }, [el('span', { class: 'ls-swatch', 'data-style': 'dashed', style: 'border-top-color:var(--obs)' }), '测量 / 信号通道'])
      ]),
      el('div', { class: 'home-art-foot' }, '仅表达拓扑关系，不含数值；数值实验见系统页与曲线页。')
    ]);
    return art;
  }

  function buildHero(state0) {
    const sys0 = safe(() => FL.systems.get('FL-001'), null);
    const dur = (sys0 && sys0.duration_s) || 60;
    const dt = (sys0 && sys0.dt_s) || 0.1;
    const points = Math.round(dur / dt) + 1;

    local.refs.btnStart = el('button', { class: 'btn btn-primary home-cta-main', type: 'button' }, [
      ui.icon('play', { size: 15 }), el('span', { class: 'home-cta-label' }, '开始实验 · FL-001')
    ]);
    local.refs.btnStart.addEventListener('click', () => startSelected());

    const btnIntro = el('button', { class: 'btn home-cta-ghost', type: 'button' }, [
      ui.icon('spark', { size: 15 }), el('span', {}, '观看快速讲解')
    ]);
    btnIntro.addEventListener('click', () => openIntro());

    const btnAssumptions = el('button', { class: 'btn home-cta-ghost', type: 'button' }, [
      ui.icon('layers', { size: 15 }), el('span', {}, '查看模型假设')
    ]);
    btnAssumptions.addEventListener('click', () => openModelDrawer(currentDef()));

    local.refs.heroSecondary = el('div', { class: 'home-hero-secondary' });

    const copy = el('div', { class: 'home-hero-copy' }, [
      el('div', { class: 'home-hero-eyebrow' }, [
        el('span', { class: 'eyebrow eyebrow--acc' }, 'FaultLab · Virtual Energy Lab'),
        el('span', { class: 'home-hero-eyebrow-sep', 'aria-hidden': 'true' }),
        el('span', { class: 'eyebrow' }, 'V0.2.0 / 实验首页')
      ]),
      el('h1', { class: 'home-title display' }, [
        '亲手注入故障，',
        el('span', { class: 'home-title-accent' }, '看反馈回路如何改变真实能量流')
      ]),
      el('p', { class: 'home-lead' },
        '无需安装 MATLAB：选一个能源系统，在第 20 秒注入传感器偏置、负载冲击或执行器异常，' +
        '再用同一条仿真时间线核对真实状态、测量通道与控制指令——每个数字都能回溯到模型与来源。'),
      el('div', { class: 'home-trust tag-row' }, TRUST.map((t) => ui.chip(t.label, { icon: t.icon, title: t.title }))),
      el('div', { class: 'home-hero-cta' }, [local.refs.btnStart, btnIntro, btnAssumptions]),
      local.refs.heroSecondary
    ]);

    const agentCount = safe(() => (FL.agents && typeof FL.agents.list === 'function' ? FL.agents.list().length : 0), 0);

    const hero = el('section', { class: 'home-hero' }, [
      copy,
      buildFlowArt(),
      el('div', { class: 'home-strip', 'aria-hidden': 'false' }, [
        el('span', { class: 'home-strip-item' }, [el('b', { class: 'mono' }, String(dur)), ' s 仿真时长']),
        el('span', { class: 'home-strip-dot', 'aria-hidden': 'true' }),
        el('span', { class: 'home-strip-item' }, [el('b', { class: 'mono' }, String(dt)), ' s 采样周期']),
        el('span', { class: 'home-strip-dot', 'aria-hidden': 'true' }),
        el('span', { class: 'home-strip-item' }, [el('b', { class: 'mono' }, String(points)), ' 点 / 信号']),
        el('span', { class: 'home-strip-dot', 'aria-hidden': 'true' }),
        el('span', { class: 'home-strip-item' }, [el('b', { class: 'mono' }, String(list().length)), ' 个系统 · 同一套页面']),
        el('span', { class: 'home-strip-dot', 'aria-hidden': 'true' }),
        el('span', { class: 'home-strip-item' }, [el('b', { class: 'mono' }, String(PAGE_GUIDE.length)), ' 个逻辑视图']),
        el('span', { class: 'home-strip-dot', 'aria-hidden': 'true' }),
        agentCount
          ? el('span', { class: 'home-strip-item' }, [el('b', { class: 'mono' }, String(agentCount)), ' 个内置 Agent'])
          : null
      ])
    ]);
    return hero;
  }

  /* ------------------------------------------------------------------ */
  /* system cards                                                        */
  /* ------------------------------------------------------------------ */
  function buildSystemsSection() {
    local.refs.cardsGrid = el('div', { class: 'home-sys-grid' });
    local.refs.cards = {};
    local.refs.sysSection = el('section', { class: 'home-sys-section' }, [
      el('div', { class: 'section-head home-section-head' }, [
        el('div', {}, [
          el('div', { class: 'eyebrow' }, '01 / 选择实验系统'),
          el('h2', { class: 'section-title home-section-title' }, '三个系统，同一条验证路径'),
          el('p', { class: 'section-sub' }, 'FL-001 电池储能为基准实验；FC-001 与 GT-001 展示同一套页面如何驱动不同能源系统与故障家族。')
        ]),
        el('span', { class: 'badge', 'data-tone': 'info' }, 'L0 · 行为级')
      ])
    , local.refs.cardsGrid]);
    return local.refs.sysSection;
  }

  function buildSystemCards(systems) {
    ui.clear(local.refs.cardsGrid);
    local.refs.cards = {};
    systems.forEach((s) => {
      const def = getDef(s.id);
      const fault = firstFault(def);
      const isBaseline = s.id === 'FL-001';
      const card = el('button', {
        class: 'home-sys-card fl-card fl-card--hover', type: 'button',
        'aria-pressed': 'false', 'data-system': s.id,
        on: { click: () => selectSystem(s.id) }
      }, [
        el('span', { class: 'home-sys-top' }, [
          el('span', { class: 'home-sys-code mono' }, s.experimentCode || s.id),
          isBaseline
            ? el('span', { class: 'badge', 'data-tone': 'acc' }, '基准实验')
            : el('span', { class: 'badge', 'data-tone': 'neutral' }, '扩展系统')
        ]),
        el('span', { class: 'home-sys-title display' }, s.title),
        el('span', { class: 'home-sys-tagline' }, s.tagline || ''),
        el('span', { class: 'home-sys-fault' }, [
          el('span', { class: 'eyebrow' }, '默认故障'),
          el('span', { class: 'home-sys-fault-text' }, faultSummary(fault))
        ]),
        el('span', { class: 'home-sys-foot' }, [
          el('span', { class: 'home-sys-level' }, s.level || 'L0'),
          el('span', { class: 'home-sys-select' }, [el('span', {}, '查看实验详情'), ui.icon('arrow-right', { size: 13 })])
        ])
      ]);
      local.refs.cards[s.id] = card;
      local.refs.cardsGrid.appendChild(card);
    });
  }

  /* ------------------------------------------------------------------ */
  /* detail                                                              */
  /* ------------------------------------------------------------------ */
  function buildDetail() {
    local.refs.detail = el('section', { class: 'home-detail', id: 'home-detail' });
    return local.refs.detail;
  }

  /* ------------------------------------------------------------------ */
  /* page guide tiles                                                    */
  /* ------------------------------------------------------------------ */
  function buildExploreSection() {
    local.refs.exploreGrid = el('div', { class: 'home-guide-grid' });
    PAGE_GUIDE.forEach((g, i) => {
      const def = (FL.pages && FL.pages[g.id]) || {};
      const tile = el('button', {
        class: 'home-guide-tile fl-card fl-card--hover', type: 'button',
        'data-page': g.id,
        on: { click: () => actions.navigate(g.id) }
      }, [
        el('span', { class: 'home-guide-icon' }, ui.icon(g.icon, { size: 16 })),
        el('span', { class: 'home-guide-body' }, [
          el('span', { class: 'home-guide-label' }, [
            el('span', { class: 'home-guide-index mono' }, String(i + 1).padStart(2, '0')),
            el('span', { class: 'home-guide-title display' }, def.navLabel || def.label || g.id)
          ]),
          el('span', { class: 'home-guide-desc' }, g.desc)
        ]),
        el('span', { class: 'home-guide-go' }, [
          g.ext ? el('span', { class: 'badge', 'data-tone': 'info' }, 'EXT') : null,
          ui.icon('arrow-right', { size: 13 })
        ])
      ]);
      local.refs.exploreGrid.appendChild(tile);
    });
    return el('section', { class: 'home-explore-section' }, [
      el('div', { class: 'section-head home-section-head' }, [
        el('div', {}, [
          el('div', { class: 'eyebrow' }, '03 / 页面导览'),
          el('h2', { class: 'section-title home-section-title' }, '六个逻辑视图，一条证据链'),
          el('p', { class: 'section-sub' }, '同一时刻、同一运行贯穿全部页面；任一页面都能回溯到模型与来源。')
        ]),
        el('span', { class: 'badge', 'data-tone': 'neutral' }, '共享时间线')
      ]),
      local.refs.exploreGrid
    ]);
  }

  /* ------------------------------------------------------------------ */
  /* recent runs                                                         */
  /* ------------------------------------------------------------------ */
  function runEventText(run) {
    const evs = (run && run.events || []).filter((e) => e.event_type && e.event_type !== 'healthy');
    if (!evs.length) return { text: '无故障基准', tone: 'ok' };
    const ev = evs[0];
    const label = ev.shortLabel || ev.label || (ev.parameter_key || ev.event_type);
    return { text: fmt.num(ev.trigger_s, 1) + ' s · ' + label, tone: 'danger', count: evs.length };
  }

  function runModeText(run) {
    const m = run && run.config && run.config.feedback_mode;
    return m === 'monitor' ? '仅监测' : '闭环';
  }

  function renderRuns(st) {
    const host = local.refs.runsHost;
    if (!host) return;
    ui.clear(host);
    const runs = Object.keys(st.runs || {}).map((id) => st.runs[id])
      .filter(Boolean)
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    if (local.refs.runsNote) {
      local.refs.runsNote.textContent = runs.length ? ('共 ' + runs.length + ' 个运行 · 存于本地浏览器') : '';
    }

    if (!runs.length) {
      host.appendChild(el('div', { class: 'home-runs-empty' }, [
        ui.icon('clock', { size: 15 }),
        el('span', {}, '还没有运行记录 — 点击「开始实验」创建第一个 Run，之后每次实验都会留档在此。')
      ]));
      return;
    }
    const shown = runs.slice(0, 8);
    shown.forEach((run) => {
      const role = ROLE_META[run.role] || { label: run.role || '—', tone: 'neutral' };
      const ev = runEventText(run);
      const isActive = st.activeRun && st.activeRun.runId === run.runId;
      const time = String(run.createdAt || '').slice(5, 16).replace('T', ' ');
      const hash = String(run.configHash || '').slice(0, 8);
      const row = el('div', { class: 'home-runs-row' + (isActive ? ' is-active' : '') }, [
        el('span', { class: 'home-runs-id mono' }, [
          el('b', {}, run.runId),
          isActive ? el('span', { class: 'badge', 'data-tone': 'acc' }, '当前') : null
        ]),
        el('span', { class: 'home-runs-label' }, run.label || '—'),
        el('span', { class: 'home-runs-cell' }, [
          el('span', { class: 'badge', 'data-tone': role.tone }, role.label),
          el('span', { class: 'home-runs-mode' }, runModeText(run))
        ]),
        el('span', { class: 'home-runs-cell home-runs-sys' }, [
          el('span', { class: 'eyebrow' }, '系统'),
          el('span', { class: 'mono' }, run.systemId || '—')
        ]),
        el('span', { class: 'home-runs-event', 'data-tone': ev.tone }, [
          el('span', { class: 'eyebrow' }, ev.count > 1 ? '事件 ×' + ev.count : '事件'),
          el('span', { class: 'mono' }, ev.text)
        ]),
        el('span', { class: 'home-runs-meta mono' }, [hash, el('span', { class: 'home-runs-time' }, time)]),
        el('span', { class: 'home-runs-actions' }, [
          el('button', {
            class: 'btn btn-xs' + (isActive ? '' : ' home-runs-load'), type: 'button',
            disabled: isActive ? 'true' : null,
            on: { click: () => { actions.loadRun(run.runId); } }
          }, [el('span', {}, isActive ? '查看中' : '载入'), ui.icon('arrow-right', { size: 11 })]),
          el('button', {
            class: 'btn btn-xs btn-ghost home-runs-del', type: 'button',
            title: '删除该运行（当前运行不可删除）',
            disabled: isActive ? 'true' : null,
            on: { click: () => { actions.deleteRun(run.runId); } }
          }, [ui.icon('trash', { size: 11 })])
        ])
      ]);
      host.appendChild(row);
    });
    if (runs.length > shown.length) {
      host.appendChild(el('div', { class: 'home-runs-more' },
        '仅显示最近 ' + shown.length + ' 条（共 ' + runs.length + ' 条）'));
    }
  }

  function buildRunsSection() {
    local.refs.runsNote = el('span', { class: 'home-section-note' });
    local.refs.runsHost = el('div', { class: 'home-runs-list' });
    return el('section', { class: 'home-runs-section' }, [
      el('div', { class: 'section-head home-section-head' }, [
        el('div', {}, [
          el('div', { class: 'eyebrow' }, '04 / 历史运行'),
          el('h2', { class: 'section-title home-section-title' }, '运行档案，随时召回'),
          el('p', { class: 'section-sub' }, '每次实验生成不可变 Run（含配置哈希）；载入后可在全部页面按原数据回看。')
        ]),
        local.refs.runsNote
      ]),
      local.refs.runsHost
    ]);
  }

  function renderDetail(sysDef, selected, st) {
    const host = local.refs.detail;
    if (!host) return;
    ui.clear(host);
    if (!sysDef) {
      host.appendChild(ui.emptyState({
        icon: 'warning', title: '系统数据未加载', desc: '未找到系统 ' + selected + '，请检查核心模块是否就绪。'
      }));
      return;
    }
    const fault = firstFault(sysDef);
    const model = sysDef.model || {};

    /* ---- main column ---- */
    const questions = (sysDef.questions || []).map((q, i) => el('li', { class: 'home-q' }, [
      el('span', { class: 'home-q-num mono' }, String(i + 1).padStart(2, '0')),
      el('span', { class: 'home-q-text' }, q)
    ]));

    const chips = paramChips(sysDef).map((c) => ui.chip(c.text, { tone: c.tone, title: c.title }));

    const pathSteps = [
      {
        num: '①', label: '认识系统',
        desc: '先看电池 / 母线 / 负载与测量控制链，再谈曲线。',
        act: '打开系统图',
        run: () => {
          if (st.activeRun && st.activeRun.systemId === selected) actions.navigate('system');
          else actions.startExperiment(selected);
        }
      },
      {
        num: '②', label: '观察偏置',
        desc: '跳到故障时刻，对照真实电流与测量电流的分离。',
        act: '看曲线',
        run: () => withRunFor(selected, sysDef, (run) => {
          const ev = protocol && protocol.faultEvent ? protocol.faultEvent(run) : null;
          if (ev && ev.event_type && ev.event_type !== 'healthy') actions.setTime(ev.trigger_s, { pause: true });
          actions.navigate('signals');
        })
      },
      {
        num: '③', label: '看因果',
        desc: '沿六节点机制链核对“为什么真实电流下降”。',
        act: '看因果',
        run: () => withRunFor(selected, sysDef, () => actions.navigate('causal'))
      },
      {
        num: '④', label: '对比',
        desc: '与无故障基准比较电能、SOC 与残差，并导出可复现数据。',
        act: '去对比',
        run: () => withRunFor(selected, sysDef, () => {
          actions.ensureBaseline({ explicit: true });
          actions.navigate('compare');
        })
      }
    ].map((s) => el('div', { class: 'home-path-step' }, [
      el('span', { class: 'home-path-num display' }, s.num),
      el('span', { class: 'home-path-body' }, [
        el('span', { class: 'home-path-label' }, s.label),
        el('span', { class: 'home-path-desc' }, s.desc)
      ]),
      el('button', {
        class: 'btn btn-ghost btn-xs home-path-btn', type: 'button',
        on: { click: s.run }
      }, [el('span', {}, s.act), ui.icon('chevron-right', { size: 12 })])
    ]));

    const actionButtons = [
      el('button', {
        class: 'btn btn-primary', type: 'button',
        on: { click: () => actions.startExperiment(selected) }
      }, [ui.icon('play', { size: 14 }), el('span', {}, '开始实验 · ' + sysDef.experimentCode)]),
      el('button', {
        class: 'btn', type: 'button',
        on: { click: () => openModelDrawer(sysDef) }
      }, [ui.icon('layers', { size: 14 }), el('span', {}, '模型假设与局限')]),
      el('button', {
        class: 'btn', type: 'button', 'aria-expanded': String(!!local.principleOpen),
        on: { click: () => { local.principleOpen = !local.principleOpen; renderDetail(sysDef, selected, state()); } }
      }, [ui.icon('flask', { size: 14 }), el('span', {}, local.principleOpen ? '收起故障原理' : '查看故障原理')])
    ];

    const main = el('section', { class: 'home-detail-main fl-panel' }, [
      el('div', { class: 'panel-head' }, [
        el('div', { class: 'panel-head-main' }, [
          el('span', { class: 'eyebrow' }, '02 / 实验详情 · ' + sysDef.experimentCode),
          sBaselineBadge(selected)
        ]),
        el('span', { class: 'badge', 'data-tone': 'neutral' }, sysDef.level || 'L0')
      ]),
      el('div', { class: 'panel-body home-detail-body' }, [
        el('div', { class: 'home-detail-headline' }, [
          el('h3', { class: 'home-detail-title display' }, sysDef.experimentName || sysDef.title),
          el('p', { class: 'home-detail-tagline' }, sysDef.tagline || ''),
          el('p', { class: 'home-detail-summary' }, sysDef.summary || '')
        ]),
        el('div', { class: 'home-block home-questions' }, [
          el('div', { class: 'home-block-head' }, [
            el('span', { class: 'eyebrow' }, '这个实验要回答的三个问题'),
            el('span', { class: 'home-block-note' }, '目标问题，不是结论')
          ]),
          el('ol', { class: 'home-q-list' }, questions)
        ]),
        el('div', { class: 'home-block home-params' }, [
          el('div', { class: 'home-block-head' }, [
            el('span', { class: 'eyebrow' }, '参数摘要'),
            el('span', { class: 'home-block-note' }, '均为默认预设值 · 非实验已测结果')
          ]),
          el('div', { class: 'tag-row home-param-chips' }, chips)
        ]),
        el('div', { class: 'home-block home-path' }, [
          el('div', { class: 'home-block-head' }, [
            el('span', { class: 'eyebrow' }, '建议体验路径'),
            el('span', { class: 'home-block-note' }, '先系统，后曲线')
          ]),
          el('div', { class: 'home-path-steps' }, pathSteps)
        ]),
        el('div', { class: 'home-detail-actions' }, actionButtons),
        el('div', { class: 'home-detail-meta mono' }, [
          (model.model_id || '—') + ' · v' + (model.model_version || '—'),
          ' · ' + (sysDef.duration_s || 60) + ' s @ ' + (sysDef.dt_s || 0.1) + ' s',
          ' · ' + ((sysDef.signals || []).length) + ' 个信号定义'
        ])
      ])
    ]);

    /* ---- side column ---- */
    const assumptions = (model.assumptions || []).slice(0, 3).map((a) => el('li', { class: 'home-assume-item' }, [
      el('span', { class: 'home-assume-id mono' }, a.id),
      el('span', { class: 'home-assume-text' }, a.text)
    ]));

    const sideAssumptions = el('section', { class: 'home-side-card fl-panel' }, [
      el('div', { class: 'panel-head' }, [
        el('div', { class: 'panel-head-main' }, [
          el('span', { class: 'panel-title' }, '模型假设'),
          el('span', { class: 'panel-sub mono' }, (model.model_id || '—'))
        ]),
        el('span', { class: 'badge', 'data-tone': 'info' }, 'L0')
      ]),
      el('div', { class: 'panel-body home-side-body' }, [
        el('ul', { class: 'home-assume-list' }, assumptions.length ? assumptions
          : [el('li', { class: 'home-assume-item' }, el('span', { class: 'muted' }, '该系统的模型假设尚未提供。'))]),
        el('div', { class: 'hint-row home-side-hint' }, [
          ui.icon('info', { size: 13 }),
          el('span', {}, '解析 / 行为级演示模型；非 Simulink、非实测（无实测对比）。')
        ]),
        el('button', {
          class: 'btn btn-sm btn-block home-side-btn', type: 'button',
          on: { click: () => openModelDrawer(sysDef) }
        }, [el('span', {}, '查看全部假设、公式与局限'), ui.icon('chevron-right', { size: 13 })])
      ])
    ]);

    const sidePrinciple = el('section', { class: 'home-side-card fl-panel home-principle' + (local.principleOpen ? ' is-open' : '') }, [
      el('div', { class: 'panel-head' }, [
        el('div', { class: 'panel-head-main' }, [
          el('span', { class: 'panel-title' }, '故障原理'),
          el('span', { class: 'panel-sub' }, fault ? (fault.shortLabel || fault.label) : '—')
        ]),
        el('span', { class: 'badge', 'data-tone': 'danger' }, '静态图解')
      ]),
      el('div', { class: 'panel-body home-side-body' }, local.principleOpen
        ? [buildPrincipleDiagram(sysDef, fault)]
        : [
          el('p', { class: 'home-principle-teaser' },
            '展开查看 I_meas = I_true + b(t)：偏置只进入测量通道，然后通过反馈回路改变真实电流。'),
          el('button', {
            class: 'btn btn-sm btn-block', type: 'button',
            on: { click: () => { local.principleOpen = true; renderDetail(sysDef, selected, state()); } }
          }, [ui.icon('chevron-down', { size: 13 }), el('span', {}, '展开故障原理图解')])
        ])
    ]);

    const side = el('aside', { class: 'home-detail-side' }, [sideAssumptions, sidePrinciple]);
    host.appendChild(el('div', { class: 'home-detail-grid' }, [main, side]));
  }

  function sBaselineBadge(selected) {
    if (selected === 'FL-001') return el('span', { class: 'badge', 'data-tone': 'acc' }, '基准实验');
    return el('span', { class: 'badge', 'data-tone': 'neutral' }, '扩展系统');
  }

  function buildPrincipleDiagram(sysDef, fault) {
    const mag = fault && fault.params && fault.params[0] ? fault.params[0].default : 10;
    const unit = fault && fault.params && fault.params[0] ? (fault.params[0].unit || '') : 'A';
    const t0 = fault ? fault.defaultTime_s : 20;
    const t0x = (8 + t0 / 60 * 604).toFixed(1);
    const positive = typeof mag !== 'number' || mag >= 0;
    const biasLabel = (positive ? '+' : '−') + Math.abs(mag) + (unit ? ' ' + unit : '');

    function svgDefs() {
      return '<defs><marker id="homeArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">' +
        '<path d="M0 0 L10 5 L0 10 z" fill="var(--ink-3)"/></marker></defs>';
    }
    function panel(titleCls, title, path, extraCls) {
      return '<div class="home-principle-plot">' +
        '<div class="home-principle-plot-head"><span class="eyebrow ' + titleCls + '">' + title + '</span></div>' +
        '<svg class="home-principle-svg" viewBox="0 0 620 56" preserveAspectRatio="none" aria-hidden="true">' +
        svgDefs() +
        '<line class="hp-grid" x1="8" y1="50" x2="612" y2="50"/>' +
        '<line class="hp-event" x1="' + t0x + '" y1="4" x2="' + t0x + '" y2="50"/>' +
        '<text class="hp-event-label" x="' + (+t0x + 5) + '" y="12">t = ' + t0 + ' s</text>' +
        '<path class="' + extraCls + '" d="' + path + '" marker-end="url(#homeArrow)"/>' +
        '</svg></div>';
    }

    const content = el('div', { class: 'home-principle-content' }, [
      el('div', { class: 'formula home-principle-formula' }, [
        el('span', { class: 'fx-obs' }, 'I_meas(t)'),
        el('span', {}, ' = '),
        el('span', { class: 'fx-acc' }, 'I_true(t)'),
        el('span', {}, ' + '),
        el('span', { class: 'fx-fault' }, 'b(t)'),
        el('span', { class: 'home-formula-note' }, '   ← 偏置只注入测量通道，不直接改变物理量')
      ]),
      el('div', { class: 'formula home-principle-formula is-small' }, [
        'b(t) = 0 (t < ' + t0 + ' s)； b(t) = ' + biasLabel.replace(' ', '') + ' (t ≥ ' + t0 + ' s)'
      ]),
      el('div', { class: 'home-principle-plots', html:
        panel('hp-true', '真实电流 I_true（闭环反馈响应）',
          'M8 18 H' + t0x + ' C ' + (+t0x + 30) + ' 18, ' + (+t0x + 54) + ' 34, ' + (+t0x + 120) + ' 34 H612',
          'hp-line hp-solid') +
        panel('hp-bias', '偏置 b(t)（故障事件，阶跃）',
          'M8 40 H' + t0x + ' V14 H612',
          'hp-line hp-dashed hp-faultline') +
        panel('hp-meas', '测量电流 I_meas = I_true + b(t)（观测通道）',
          'M8 18 H' + t0x + ' V4 C ' + (+t0x + 30) + ' 4, ' + (+t0x + 54) + ' 24, ' + (+t0x + 120) + ' 26 H612',
          'hp-line hp-dashed hp-obsline')
      }),
      el('p', { class: 'home-principle-note' },
        '示意：仅表达“真实值连续、测量值在故障时刻阶跃、闭环后真实值缓慢回落”的定性关系，不含刻度与数值。' +
        '默认场景的精确数值（20 s / +10 A / 60 s）见参数摘要，实际结果以运行数据为准。')
    ]);
    return content;
  }

  /* ------------------------------------------------------------------ */
  /* assumptions drawer                                                  */
  /* ------------------------------------------------------------------ */
  function openModelDrawer(sysDef) {
    if (!sysDef) { ui.toast('系统数据尚未就绪', 'warn'); return; }
    if (local.activeDrawer) { local.activeDrawer.close(); local.activeDrawer = null; }
    const model = sysDef.model || {};
    const assumptions = (model.assumptions || []).map((a) => el('li', { class: 'home-assume-item' }, [
      el('span', { class: 'home-assume-id mono' }, a.id),
      el('span', { class: 'home-assume-text' }, a.text)
    ]));
    const limitations = (model.limitations || []).map((t) => el('li', { class: 'home-limitation-item' }, t));
    const equations = (model.equations || []).map((eq) => el('div', { class: 'home-eq' }, [
      el('div', { class: 'home-eq-head' }, [
        el('span', { class: 'home-eq-id mono' }, eq.id || ''),
        el('span', { class: 'home-eq-note' }, eq.note || '')
      ]),
      el('div', { class: 'formula home-eq-formula' }, eq.latex_text || '')
    ]));

    const content = el('div', { class: 'pg-home home-drawer' }, [
      el('div', { class: 'notice', 'data-tone': 'info' }, [
        ui.icon('info', { size: 14 }),
        el('span', {}, '本页所有假设与公式来自 ' + (model.model_id || '模型清单') + ' v' + (model.model_version || '—') +
          '，属于解析 / 行为级演示模型；非 Simulink、非实测（无实测对比）。')
      ]),
      el('div', { class: 'home-drawer-block' }, [
        el('div', { class: 'eyebrow' }, '模型假设 · assumptions'),
        el('ul', { class: 'home-assume-list' }, assumptions.length ? assumptions : [el('li', { class: 'muted' }, '暂无')])
      ]),
      el('div', { class: 'home-drawer-block' }, [
        el('div', { class: 'eyebrow' }, '适用局限 · limitations'),
        el('ul', { class: 'home-limitation-list' }, limitations.length ? limitations : [el('li', { class: 'muted' }, '暂无')])
      ]),
      el('div', { class: 'home-drawer-block' }, [
        el('div', { class: 'eyebrow' }, '核心方程 · equations'),
        el('div', { class: 'home-eq-list' }, equations.length ? equations : [el('div', { class: 'muted' }, '暂无')])
      ]),
      el('div', { class: 'home-drawer-unit mono' }, '单位：s / kW / A / V / % / Hz / kWh · 母线电压按模型假设恒定')
    ]);

    local.activeDrawer = ui.drawer({
      title: '模型假设与局限',
      subtitle: sysDef.experimentCode + ' · ' + sysDef.title + ' · ' + (model.model_id || '—') + ' v' + (model.model_version || '—'),
      content,
      onClose: () => { local.activeDrawer = null; }
    });
  }

  /* ------------------------------------------------------------------ */
  /* 3-step intro modal                                                  */
  /* ------------------------------------------------------------------ */
  function openIntro() {
    if (local.activeIntro) return;
    let step = 1;
    const bodyHost = el('div', { class: 'home-intro-body' });
    const dots = el('div', { class: 'home-intro-dots', 'aria-hidden': 'true' });
    const prevBtn = el('button', { class: 'btn btn-ghost btn-sm', type: 'button' }, [ui.icon('skipback', { size: 13 }), el('span', {}, '上一步')]);
    const nextBtn = el('button', { class: 'btn btn-primary btn-sm', type: 'button' }, [el('span', {}, '下一步'), ui.icon('arrow-right', { size: 13 })]);
    const nav = el('div', { class: 'home-intro-nav' }, [
      prevBtn, el('span', { class: 'spacer' }), nextBtn
    ]);
    const content = el('div', { class: 'pg-home home-intro-wrap' }, [el('div', { class: 'home-intro' }, [bodyHost, el('div', { class: 'home-intro-foot' }, [dots, nav])])]);
    let modalRef = null;

    function paint(n) {
      step = n;
      if (actions) actions.setIntroStep(n);
      const s = INTRO_STEPS[n - 1];
      ui.clear(bodyHost);
      bodyHost.appendChild(el('div', { class: 'home-intro-step' }, [
        el('div', { class: 'home-intro-icon' }, ui.icon(s.icon, { size: 24 })),
        el('div', { class: 'home-intro-step-head' }, [
          el('span', { class: 'eyebrow' }, '步骤 ' + n + ' / ' + INTRO_STEPS.length),
          el('h3', { class: 'home-intro-title display' }, s.title)
        ]),
        el('p', { class: 'home-intro-text' }, s.text),
        el('ul', { class: 'home-intro-list' }, (s.bullets || []).map((b) => el('li', {}, b)))
      ]));
      ui.clear(dots);
      for (let i = 1; i <= INTRO_STEPS.length; i++) {
        dots.appendChild(el('span', { class: 'home-intro-dot' + (i === n ? ' is-active' : '') }));
      }
      prevBtn.disabled = n <= 1;
      ui.clear(nextBtn);
      nextBtn.appendChild(el('span', {}, n >= INTRO_STEPS.length ? '完成' : '下一步'));
      nextBtn.appendChild(ui.icon(n >= INTRO_STEPS.length ? 'check' : 'arrow-right', { size: 13 }));
    }

    prevBtn.addEventListener('click', () => { if (step > 1) paint(step - 1); });
    nextBtn.addEventListener('click', () => {
      if (step >= INTRO_STEPS.length) { if (modalRef) modalRef.close(); return; }
      paint(step + 1);
    });

    modalRef = ui.modal({
      title: '快速讲解',
      subtitle: '3 步了解 FaultLab 的实验路径 · 讲解不会触发任何数值仿真',
      content,
      actions: [{ label: '跳过讲解', onClick: () => { if (actions) actions.setIntroStep(0); } }],
      onClose: () => {
        local.activeIntro = null;
        if (actions) actions.setIntroStep(0);
      }
    });
    local.activeIntro = modalRef;
    paint(1);
  }

  /* ------------------------------------------------------------------ */
  /* actions                                                             */
  /* ------------------------------------------------------------------ */
  function startSelected() {
    const id = local.selectedId || defaultSelectedId(state(), list());
    if (!id) { ui.toast('系统尚未加载完成', 'warn'); return; }
    actions.startExperiment(id);
  }

  function selectSystem(id) {
    local.selectedId = id;
    refresh(state());
    const host = local.refs.detail;
    if (host && host.scrollIntoView) {
      try { host.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { host.scrollIntoView(); }
    }
  }

  function withRunFor(systemId, sysDef, fn) {
    const st = state();
    if (!st.activeRun) {
      ui.toast('先点击「开始实验」创建运行，再沿建议路径体验', 'warn');
      return;
    }
    if (st.activeRun.systemId !== systemId) {
      ui.toast('当前运行属于 ' + st.activeRun.systemId + '；请先为 ' + (sysDef.experimentCode || systemId) + ' 创建运行', 'warn');
      return;
    }
    fn(st.activeRun);
  }

  function currentDef() {
    const id = local.selectedId;
    return id ? getDef(id) : null;
  }

  /* ------------------------------------------------------------------ */
  /* render                                                              */
  /* ------------------------------------------------------------------ */
  function renderHero(state0, systems, sysDef, selected) {
    if (local.refs.btnStart) {
      const label = local.refs.btnStart.querySelector('.home-cta-label');
      if (label) label.textContent = '开始实验 · ' + ((sysDef && sysDef.experimentCode) || selected || '');
      local.refs.btnStart.disabled = !sysDef;
    }
    const host = local.refs.heroSecondary;
    if (!host) return;
    ui.clear(host);
    const hasRun = !!state0.activeRun;
    const runIds = Object.keys(state0.runs || {});
    const savedId = (state0.lastSession && state0.lastSession.activeRunId) || null;
    const hasSaved = runIds.length > 0 || !!state0.lastSession;
    host.hidden = !hasRun && !hasSaved;
    if (hasRun) {
      const btn = el('button', { class: 'btn home-cta-ghost home-cta-run', type: 'button' }, [
        ui.icon('arrow-right', { size: 15 }),
        el('span', {}, '继续当前实验 · ' + state0.activeRun.runId + ' → 系统页')
      ]);
      btn.addEventListener('click', () => actions.navigate('system'));
      host.appendChild(btn);
    }
    if (hasSaved) {
      const label = savedId && state0.runs && state0.runs[savedId]
        ? '恢复上次实验 · ' + savedId
        : (state0.lastSession && state0.lastSession.savedAt ? '恢复上次实验' : '恢复上次实验 · ' + runIds.length + ' 个存档运行');
      const btn = el('button', { class: 'btn home-cta-ghost', type: 'button' }, [
        ui.icon('replay', { size: 15 }), el('span', {}, label)
      ]);
      btn.addEventListener('click', () => actions.restoreLastSession());
      host.appendChild(btn);
    }
  }

  function renderCards(selected) {
    Object.keys(local.refs.cards || {}).forEach((id) => {
      const card = local.refs.cards[id];
      const isSel = id === selected;
      card.setAttribute('aria-pressed', String(isSel));
      card.classList.toggle('is-selected', isSel);
    });
  }

  function refresh(state0) {
    const systems = list();
    if (!systems.length) { renderUnavailable(); return; }
    const activeRunId = state0.activeRun ? state0.activeRun.runId : '';
    if (activeRunId !== local.lastRunId) {
      local.lastRunId = activeRunId;
      if (activeRunId) local.selectedId = null; /* 跟随当前运行的系统 */
    }
    const ids = systems.map((s) => s.id);
    let selected = local.selectedId;
    if (!selected || ids.indexOf(selected) < 0) selected = defaultSelectedId(state0, systems);
    local.selectedId = selected;
    const sysDef = getDef(selected);
    renderHero(state0, systems, sysDef, selected);
    renderCards(selected);
    renderDetail(sysDef, selected, state0);
    renderRuns(state0);
  }

  function renderUnavailable() {
    if (local.refs.cardHost) ui.clear(local.refs.cardHost);
    if (local.refs.detail) {
      ui.clear(local.refs.detail);
      local.refs.detail.appendChild(ui.emptyState({
        icon: 'warning',
        title: '系统数据未就绪',
        desc: '核心模块（FL.systems / FL.core）尚未加载完成。请稍后刷新页面；如果问题持续，检查 index.html 的脚本加载顺序。'
      }));
    }
  }

  /* ------------------------------------------------------------------ */
  /* page module                                                         */
  /* ------------------------------------------------------------------ */
  pages.home = {
    id: 'home',
    label: '实验首页',
    navLabel: '首页',
    mount(root, api) {
      ui = api.ui;
      actions = api.actions;
      getState = api.getState;
      protocol = api.protocol;
      fmt = api.fmt || (api.protocol && api.protocol.fmt);
      local.activeIntro = null;
      local.activeDrawer = null;
      local.lastKey = null;

      ui.clear(root);
      root.classList.add('pg-home');

      const wrap = el('div', { class: 'home-wrap page-pad' });
      wrap.appendChild(buildHero(state()));
      wrap.appendChild(buildSystemsSection());
      wrap.appendChild(buildDetail());
      wrap.appendChild(buildExploreSection());
      wrap.appendChild(buildRunsSection());
      wrap.appendChild(el('footer', { class: 'home-foot' }, [
        el('div', { class: 'home-foot-main' }, [
          el('span', { class: 'eyebrow' }, 'FaultLab V0.2.0 · 实验首页'),
          el('span', { class: 'home-foot-text' }, '离线单页应用 · L0 行为级解析模型 · 演示数据（预设值 / 示例），非 Simulink、非实测')
        ]),
        el('span', { class: 'home-foot-meta mono' }, 'run 数据保存在本地浏览器 localStorage')
      ]));
      root.appendChild(wrap);

      const systems = list();
      buildSystemCards(systems);
      refresh(state());
    },

    update(state0, reason) {
      if (!ui) return;
      if (reason === 'time' || reason === 'playback') return;
      const key = [
        state0.activeRun ? state0.activeRun.runId : '-',
        Object.keys(state0.runs || {}).length,
        state0.lastSession ? '1' : '0',
        state0.page
      ].join('|');
      if (key === local.lastKey) return;
      local.lastKey = key;
      try { refresh(state0); } catch (err) {
        console.error('[home] update failed', err);
      }
    },

    unmount() {
      if (local.activeIntro) { try { local.activeIntro.close(); } catch (e) { /* ignore */ } local.activeIntro = null; }
      if (local.activeDrawer) { try { local.activeDrawer.close(); } catch (e) { /* ignore */ } local.activeDrawer = null; }
    }
  };
})();
