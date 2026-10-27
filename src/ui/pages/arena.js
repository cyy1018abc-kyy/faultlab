/* owner: arena-agents | module: page-arena | contract: docs/CONTRACT.md */
/* =========================================================================
   Agent 竞技场页面
   - 设置（系统 / 轮数 / seed / 噪声 / Agent 多选）→ 开始盲测
   - 盲测期间页面显著提示「真值封存」，并禁用设置；结束 try/finally 解封
   - 排行榜 + 逐轮真值揭晓 + 每个 Agent 诊断 vs 真值 + 评分分解
   - 盲测数据包导出（单轮 / 整场，无真值） + 外部诊断导入
   - 口径说明：评分权重、盲测设计、内置确定性 Agent 强项/弱项
   ========================================================================= */
(function () {
  'use strict';
  const FL = window.FL = window.FL || {};
  const pages = FL.pages = FL.pages || {};

  const FAMILY_LABEL = {
    sensor_drift: '传感器漂移',
    load_step: '负载冲击',
    actuator_fault: '执行器异常',
    none: '健康'
  };
  const AGENT_FAMILY_LABEL = {
    threshold: '阈值规则',
    'model-based': '模型残差',
    statistical: '统计变点',
    probabilistic: '概率模型',
    fusion: '多信号融合',
    'rule-based': '规则',
    external: '外部导入'
  };
  const DIMS = [
    ['detection', '检测'],
    ['family', '家族'],
    ['component', '部件'],
    ['magnitude', '幅值'],
    ['latency', '延迟'],
    ['calibration', '校准']
  ];
  const FALLBACK_SPEC = {
    weights: { detection: 0.20, family: 0.25, component: 0.10, magnitude: 0.15, latency: 0.15, calibration: 0.15 },
    falseAlarmPenalty: 10,
    latencyWindow_s: 12,
    healthyRatio: 0.2
  };
  const FALLBACK_AGENTS = [
    { id: 'sensor-limit', name: '固定阈值报警', family: 'threshold', description: '固定阈值越限报警基线。', strengths: '简单、快。', weaknesses: '不分析指令-反馈偏差。' },
    { id: 'fusion', name: '多信号融合', family: 'fusion', description: '多信号融合诊断。', strengths: '覆盖全面。', weaknesses: '阈值人工设定。' }
  ];

  let api = null;
  let ui = null;
  let h = null;
  const refs = {};
  const local = {
    built: false,
    running: false,
    showTruth: true,
    externalAgents: [],
    extSeq: 0,
    matchError: '',
    renderKey: '',
    progress: 0,
    progressText: '',
    autorunPending: false,
    agentCatalog: []
  };

  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function ns() { return (api && api.FL) || FL; }
  function fmt() { return (api && api.fmt) ? api.fmt : FL.protocol.fmt; }  function arenaState() {
    const st = api.getState();
    return (st.pageState && st.pageState.arena) || {};
  }
  function setupState() {
    const a = arenaState();
    return a.setup || { systemId: 'FL-001', rounds: 6, seed: 20261027, noise: false, agentIds: [] };
  }
  function scoringSpec() {
    const F = ns();
    return (F.arena && F.arena.SCORING_SPEC) ? F.arena.SCORING_SPEC : FALLBACK_SPEC;
  }
  function weights() { return scoringSpec().weights || FALLBACK_SPEC.weights; }
  function catalog() {
    const F = ns();
    if (F.agents && typeof F.agents.list === 'function') {
      try { return F.agents.list(); } catch (e) { /* ignore */ }
    }
    return FALLBACK_AGENTS;
  }
  function systemList() {
    try {
      const list = api.systems && api.systems.list ? api.systems.list() : [];
      if (list && list.length) return list;
    } catch (e) { /* ignore */ }
    return [
      { id: 'FL-001', title: '电池储能系统', shortTitle: '电池储能', experimentCode: 'FL-001' },
      { id: 'FC-001', title: '燃料电池系统', shortTitle: '燃料电池', experimentCode: 'FC-001' },
      { id: 'GT-001', title: '燃气涡轮系统', shortTitle: '燃气涡轮', experimentCode: 'GT-001' }
    ];
  }
  function systemTitle(systemId) {
    const list = systemList();
    for (let i = 0; i < list.length; i++) if (list[i].id === systemId) return list[i].shortTitle || list[i].title || systemId;
    return systemId;
  }
  function componentMap(systemId) {
    const map = {};
    try {
      const sys = api.systems.get(systemId);
      (sys.components || []).forEach((c) => { map[c.id] = c.label || c.id; });
    } catch (e) { /* ignore */ }
    return map;
  }
  function componentLabel(map, id) {
    if (!id || id === 'none') return '无';
    return map[id] || id;
  }
  function familyLabel(id) { return FAMILY_LABEL[id] || id || '—'; }
  function agentFamilyLabel(id) { return AGENT_FAMILY_LABEL[id] || id || '规则'; }
  function magText(mag) {
    if (!mag || !isNum(mag.value)) return '—';
    const unit = mag.unit || '';
    const digits = unit === '%' ? 0 : (unit === 'Hz' ? 2 : 1);
    return fmt().num(mag.value, digits) + (unit ? ' ' + unit : '');
  }
  function modeLabel(mode) {
    if (mode === 'monitor') return '仅监测';
    if (mode === 'healthy') return '健康局 · 无故障注入';
    if (mode === 'closed_loop') return '闭环反馈';
    return mode || '—';
  }
  function pctOrDash(v) {
    if (!isNum(v)) return '—';
    return fmt().num(v * 100, 1) + '%';
  }
  function scoreTone(total) {
    if (!isNum(total)) return 'neutral';
    if (total >= 90) return 'ok';
    if (total >= 70) return 'warn';
    return 'danger';
  }
  function arenaReady() {
    const F = ns();
    return !!(F.arena && F.core && F.core.simulate && F.systems && F.agents);
  }
  function downloadText(filename, text, mime) {
    const F = ns();
    try {
      if (F.exporter && typeof F.exporter.download === 'function') {
        F.exporter.download(filename, text, mime || 'application/json;charset=utf-8');
        return true;
      }
    } catch (e) { /* fall through */ }
    try {
      const blob = new Blob([text], { type: mime || 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = h('a', { href: url, download: filename, class: 'sr-only' });
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (a.parentNode) a.parentNode.removeChild(a);
        URL.revokeObjectURL(url);
      }, 600);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ===================================================================
     mount / build
     =================================================================== */
  function mount(rootEl, pageApi) {
    api = pageApi;
    ui = api.ui;
    h = api.ui.h;
    const root = pageApi.ui.h('div', { class: 'pg-arena page-pad' });
    rootEl.appendChild(root);
    refs.root = root;
    local.agentCatalog = catalog();

    root.appendChild(buildHero());
    root.appendChild(buildSealBanner());
    root.appendChild(buildSetup());
    root.appendChild(buildProgress());
    refs.results = h('div', { class: 'arena-results', hidden: true });
    root.appendChild(refs.results);
    root.appendChild(buildImport());
    root.appendChild(buildSpec());
    root.appendChild(h('footer', { class: 'arena-foot' }, [
      h('span', { class: 'eyebrow' }, 'FAULTLAB · EXT'),
      h('span', {}, 'Agent Arena 为 V0.1 扩展预览，不属于 FL-001 基准验收路径。内置 Agent 为确定性算法，非 LLM；当前仅保留未来真实 AI Agent 的接入协议。'),
      h('span', { class: 'arena-foot-hash mono' }, 'arena_version 0.1')
    ]));

    local.built = true;
    syncAll(api.getState(), 'mount');
    scheduleAutorun();
  }

  function buildHero() {
    refs.heroStatus = h('span', { class: 'badge', 'data-tone': 'neutral' }, '待开始');
    refs.heroMeta = h('span', { class: 'arena-hero-meta mono' }, '内置确定性算法 · 盲测真值封存');
    return h('header', { class: 'arena-hero' }, [
      h('div', { class: 'arena-hero-main' }, [
        h('div', { class: 'eyebrow' }, 'EXT · DIAGNOSTIC ARENA'),
        h('h1', { class: 'arena-title' }, ['AI Agent ', h('em', {}, '诊断竞技场')]),
        h('p', { class: 'arena-sub' }, '多个诊断算法在同一条盲观测流上比赛：隐藏故障家族、幅值、时刻与控制模式，真值全程封存；赛后揭晓逐项打分。'),
        h('div', { class: 'arena-hero-tags' }, [
          ui.badge('内置确定性算法 · 非 LLM', { tone: 'info' }),
          ui.badge('盲测 · 真值封存', { tone: 'warn' }),
          ui.badge('EXT 扩展预览', { tone: 'neutral' })
        ])
      ]),
      h('div', { class: 'arena-hero-side' }, [
        refs.heroMeta,
        refs.heroStatus
      ])
    ]);
  }

  function buildSealBanner() {
    refs.sealBanner = h('div', { class: 'arena-seal', hidden: true, role: 'status', 'aria-live': 'polite' }, [
      h('span', { class: 'arena-seal-icon' }, [ui.icon('lock', { size: 18 })]),
      h('div', {}, [
        h('strong', {}, '真值封存 · 禁止进入真值页'),
        h('span', {}, '比赛进行中：shell 已临时禁用「实时曲线 / 因果解释 / 结果对比」入口；比赛结束后自动解封。')
      ]),
      h('span', { class: 'badge', 'data-tone': 'danger' }, 'BLIND')
    ]);
    return refs.sealBanner;
  }

  function buildSetup() {
    refs.setupError = h('div', { class: 'field-error arena-setup-error', hidden: true });
    refs.agentCount = h('span', { class: 'mono arena-agent-count' });
    refs.agentGrid = h('div', { class: 'arena-agent-grid' });
    buildAgentOptions();
    refs.selectAllBtn = h('button', {
      class: 'btn btn-ghost btn-xs', type: 'button',
      on: { click: () => setAllAgents(true) }
    }, '全选');
    refs.clearAllBtn = h('button', {
      class: 'btn btn-ghost btn-xs', type: 'button',
      on: { click: () => setAllAgents(false) }
    }, '清空');
    const agentField = ui.field({
      label: '参与 Agent',
      control: h('div', { class: 'arena-agent-wrap' }, [
        h('div', { class: 'arena-agent-toolbar' }, [refs.agentCount, h('span', { class: 'spacer' }), refs.selectAllBtn, refs.clearAllBtn]),
        refs.agentGrid,
        h('div', { class: 'field-hint' }, '默认全选；盲测中无法更改。')
      ])
    });
    agentField.classList.add('arena-span-3');

    refs.systemSeg = ui.segmented({
      ariaLabel: '选择实验系统',
      value: setupState().systemId,
      options: systemList().map((s) => ({ value: s.id, label: s.shortTitle || s.experimentCode || s.id, title: s.title || '' })),
      onChange: (v) => { applySetupPatch({ systemId: v }); }
    });
    refs.roundsSeg = ui.segmented({
      ariaLabel: '选择轮数',
      value: setupState().rounds,
      options: [{ value: 3, label: '3 轮' }, { value: 6, label: '6 轮' }, { value: 10, label: '10 轮' }],
      onChange: (v) => { applySetupPatch({ rounds: v }); }
    });
    refs.seedInput = h('input', {
      class: 'input input--num', type: 'number', min: '0', step: '1',
      value: String(setupState().seed == null ? 20261027 : setupState().seed),
      'aria-label': '随机种子',
      on: {
        change: () => {
          const v = parseInt(refs.seedInput.value, 10);
          applySetupPatch({ seed: isFinite(v) && v >= 0 ? v : 20261027 });
        }
      }
    });
    refs.noiseSwitch = ui.switchControl({
      checked: !!setupState().noise,
      label: '观测通道叠加确定性噪声',
      onChange: (checked) => { applySetupPatch({ noise: !!checked }); }
    });

    const systemField = ui.field({ label: '实验系统', control: refs.systemSeg, hint: '仅作用于本场盲测，不改变全局实验系统；三系统均有独立故障目录与盲观测通道。' });
    const roundsField = ui.field({ label: '盲测轮数', control: refs.roundsSeg, hint: '每轮独立随机隐藏场景；小样本保证至少 1 个健康局。' });
    const seedField = ui.field({ label: '随机种子', control: h('div', { class: 'row' }, [refs.seedInput, h('span', { class: 'input-unit' }, 'seed')]), hint: '同 seed + 同设置逐字节复现。' });
    const noiseField = ui.field({ label: '观测噪声', control: refs.noiseSwitch, hint: '仅叠加在 OBSERVATION 通道，确定性。' });
    systemField.classList.add('arena-span-2');

    refs.startBtn = h('button', {
      class: 'btn btn-primary arena-start', type: 'button',
      on: { click: startMatch }
    }, [ui.icon('target', { size: 15 }), h('span', {}, '开始盲测')]);
    refs.clearResultBtn = h('button', {
      class: 'btn btn-ghost btn-sm', type: 'button',
      on: { click: clearMatch }
    }, [ui.icon('refresh', { size: 13 }), h('span', {}, '清空结果')]);
    refs.engineNote = h('div', { class: 'hint-row arena-engine-note' });

    const panel = h('section', { class: 'fl-panel arena-setup' }, [
      h('div', { class: 'panel-head' }, [
        h('div', { class: 'panel-head-main' }, [
          h('span', { class: 'eyebrow' }, 'SETUP'),
          h('span', { class: 'panel-title' }, '盲测设置'),
          h('span', { class: 'panel-sub' }, '隐藏场景由 seed 决定；开始后真值封存')
        ]),
        h('span', { class: 'badge', 'data-tone': 'warn' }, '真值封存')
      ]),
      h('div', { class: 'panel-body arena-setup-body' }, [
        systemField, roundsField, seedField, noiseField, agentField
      ]),
      h('div', { class: 'arena-setup-foot' }, [
        h('div', { class: 'arena-setup-note' }, [
          refs.engineNote,
          h('div', { class: 'hint-row' }, [
            ui.icon('info', { size: 13 }),
            h('span', {}, '单轮 100 分：检测 20% · 家族 25% · 部件 10% · 幅值 15% · 延迟 15% · 校准 15%；健康局误报扣 10 分。')
          ]),
          refs.setupError
        ]),
        h('div', { class: 'arena-setup-actions' }, [refs.clearResultBtn, refs.startBtn])
      ])
    ]);
    return panel;
  }

  function buildAgentOptions() {
    ui.clear(refs.agentGrid);
    local.agentCatalog.forEach((a) => {
      const cb = h('input', {
        type: 'checkbox', class: 'arena-agent-check', value: a.id,
        checked: true,
        on: { change: onAgentSelectionChange }
      });
      cb.dataset.agentId = a.id;
      const opt = h('label', {
        class: 'arena-agent-opt',
        title: (a.strengths ? '强项：' + a.strengths + '\n' : '') + (a.weaknesses ? '弱项：' + a.weaknesses : '')
      }, [
        cb,
        h('span', { class: 'arena-agent-opt-body' }, [
          h('span', { class: 'arena-agent-opt-top' }, [
            h('span', { class: 'arena-agent-opt-name' }, a.name),
            ui.badge(agentFamilyLabel(a.family), { tone: a.family === 'fusion' ? 'acc' : 'neutral' })
          ]),
          h('span', { class: 'arena-agent-opt-desc' }, a.description || '')
        ])
      ]);
      refs.agentGrid.appendChild(opt);
    });
    if (!local.agentCatalog.length) {
      refs.agentGrid.appendChild(h('div', { class: 'notice', 'data-tone': 'danger' }, '未检测到内置诊断 Agent（FL.agents 未就绪）。'));
    }
  }

  function buildProgress() {
    refs.progressFill = h('div', { class: 'arena-progress-fill' });
    refs.progressPct = h('span', { class: 'mono arena-progress-pct' }, '0%');
    refs.progressText = h('span', { class: 'arena-progress-text' }, '准备生成隐藏场景…');
    refs.progressPanel = h('section', { class: 'fl-panel arena-progress', hidden: true, 'aria-live': 'polite' }, [
      h('div', { class: 'arena-progress-head' }, [
        h('span', { class: 'arena-progress-icon' }, [ui.icon('lock', { size: 16 })]),
        h('div', { class: 'arena-progress-copy' }, [
          h('strong', {}, '盲测计算中 · 真值封存'),
          refs.progressText
        ]),
        refs.progressPct
      ]),
      h('div', { class: 'arena-progress-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100' }, [refs.progressFill])
    ]);
    return refs.progressPanel;
  }

  function buildImport() {
    refs.importText = h('textarea', {
      class: 'input arena-import-text', rows: '6', spellcheck: 'false',
      placeholder: '粘贴外部 Agent 诊断 JSON（单轮对象或轮次数组），例如：\n{\n  "arena_version": "0.1",\n  "agent": { "name": "my-agent" },\n  "round": 1,\n  "diagnosis": { "faultDetected": true, … }\n}'
    });
    refs.fileInput = h('input', {
      type: 'file', accept: '.json,application/json', class: 'arena-file-input',
      on: {
        change: () => {
          const f = refs.fileInput.files && refs.fileInput.files[0];
          if (!f) return;
          const reader = new FileReader();
          reader.onload = () => { refs.importText.value = String(reader.result || ''); };
          reader.onerror = () => { showImportErrors([{ path: '$', message: '文件读取失败' }], true); };
          reader.readAsText(f, 'utf-8');
        }
      }
    });
    refs.importErrors = h('div', { class: 'arena-import-errors', hidden: true });
    refs.importStatus = h('div', { class: 'arena-import-status' }, '完成一场盲测后即可导入外部诊断。');
    refs.extList = h('div', { class: 'arena-ext-list' });
    refs.importBtn = h('button', {
      class: 'btn btn-primary btn-sm', type: 'button',
      on: { click: importExternal }
    }, [ui.icon('download', { size: 13 }), h('span', {}, '导入并评分')]);
    refs.importClearBtn = h('button', {
      class: 'btn btn-ghost btn-sm', type: 'button',
      on: { click: clearExternal }
    }, [ui.icon('x', { size: 13 }), h('span', {}, '清空外部结果')]);
    return h('section', { class: 'fl-panel arena-import' }, [
      h('div', { class: 'panel-head' }, [
        h('div', { class: 'panel-head-main' }, [
          h('span', { class: 'eyebrow' }, 'EXTERNAL'),
          h('span', { class: 'panel-title' }, '导入外部诊断'),
          h('span', { class: 'panel-sub' }, '外部 Agent 只提交诊断，不接触真值')
        ]),
        ui.badge('未来 AI Agent 接口', { tone: 'info' })
      ]),
      h('div', { class: 'panel-body arena-import-body' }, [
        h('p', { class: 'arena-import-desc' }, '上传或粘贴外部 Agent 的诊断 JSON。系统按同样的评分函数逐轮打分，并以「外部导入」身份加入排行榜；未提交的轮次不计入其平均分。协议见 docs/AGENT_PROTOCOL.md。'),
        refs.importStatus,
        refs.importText,
        h('div', { class: 'arena-import-actions' }, [
          h('label', { class: 'btn btn-ghost btn-sm arena-file-label' }, [ui.icon('external', { size: 13 }), h('span', {}, '选择 JSON 文件'), refs.fileInput]),
          refs.importClearBtn,
          h('span', { class: 'spacer' }),
          refs.importBtn
        ]),
        refs.importErrors,
        refs.extList
      ])
    ]);
  }

  function buildSpec() {
    const spec = scoringSpec();
    const w = spec.weights || FALLBACK_SPEC.weights;
    const rows = DIMS.map(([key, label]) => h('tr', {}, [
      h('td', {}, label),
      h('td', { class: 'mono num' }, fmt().num((w[key] || 0) * 100, 0) + '%'),
      h('td', { class: 'arena-spec-rule' }, specRuleText(key))
    ]));
    const agents = local.agentCatalog;
    const roster = agents.map((a) => h('div', { class: 'arena-roster-item' }, [
      h('div', { class: 'arena-roster-head' }, [
        h('span', { class: 'arena-roster-name' }, a.name),
        ui.badge(agentFamilyLabel(a.family), { tone: a.family === 'fusion' ? 'acc' : 'neutral' })
      ]),
      h('p', { class: 'arena-roster-desc' }, a.description || ''),
      h('p', { class: 'arena-roster-strength' }, [h('strong', {}, '强项 '), a.strengths || '—']),
      h('p', { class: 'arena-roster-weak' }, [h('strong', {}, '弱项 '), a.weaknesses || '—'])
    ]));
    return h('section', { class: 'fl-panel arena-spec' }, [
      h('div', { class: 'panel-head' }, [
        h('div', { class: 'panel-head-main' }, [
          h('span', { class: 'eyebrow' }, 'CALIBRATION'),
          h('span', { class: 'panel-title' }, '口径说明'),
          h('span', { class: 'panel-sub' }, '评分公式、盲测设计与算法边界')
        ])
      ]),
      h('div', { class: 'panel-body arena-spec-body' }, [
        h('div', { class: 'arena-spec-col' }, [
          h('div', { class: 'eyebrow mb-8' }, '评分权重（单轮 100 分）'),
          h('table', { class: 'arena-table' }, [
            h('thead', {}, [h('tr', {}, [h('th', {}, '维度'), h('th', {}, '权重'), h('th', {}, '口径')])]),
            h('tbody', {}, rows)
          ]),
          h('p', { class: 'arena-spec-note' }, '总分 = 100 × Σ(权重 × 得分) − 10 × 健康局误报，单轮最低 0 分；排行榜取各轮平均分。盲测数据包只含观测样本与评分口径，不含真值。'),
          h('div', { class: 'eyebrow mb-8 mt-16' }, '盲测设计'),
          h('ul', { class: 'arena-list' }, [
            h('li', {}, '每轮约 20% 概率为健康局；轮数 ≥3 时若随机结果没有健康局，会把中间一轮替换为健康局，保证误报率有数据可查。'),
            h('li', {}, '故障家族、幅值、注入时刻在故障目录范围内随机；闭环/仅监测模式随机；观测噪声可选且确定性。'),
            h('li', {}, 'Agent 只收到 blindVisible 观测流，按 0.1 s 顺序在线 observe；t=60 s 统一收卷。'),
            h('li', {}, '比赛期间 truthSealed=true，shell 禁用真值相关页面；结束后自动解封并揭晓真值。'),
            h('li', {}, '导出帧 truth_sealed:true，递归扫描禁止 truth / *_true_* / bias / cap / 故障配置字段。')
          ])
        ]),
        h('div', { class: 'arena-spec-col' }, [
          h('div', { class: 'eyebrow mb-8' }, '内置 Agent 名单（确定性算法，非 LLM）'),
          h('div', { class: 'arena-roster' }, roster.length ? roster : h('div', { class: 'notice', 'data-tone': 'warn' }, 'FL.agents 未就绪。')),
          h('p', { class: 'arena-spec-note mt-12' }, '对外协议版本 arena_version: "0.1"，为未来真实 AI / LLM Agent 预留。当前页面运行时只运行上述确定性算法。')
        ])
      ])
    ]);
  }

  function specRuleText(key) {
    if (key === 'detection') return '故障局正确报警 / 健康局未报警';
    if (key === 'family') return '故障家族正确（健康局按未报警计）';
    if (key === 'component') return '受影响部件正确（健康局按未报警计）';
    if (key === 'magnitude') return 'max(0, 1 − |估计−真值|/真值)，单位一致';
    if (key === 'latency') return 'max(0, 1 − (首报时刻−故障时刻)/12 s)';
    if (key === 'calibration') return '1 − Brier(confidence, 是否故障)';
    return '';
  }

  /* ===================================================================
     setup interactions
     =================================================================== */
  function applySetupPatch(patch) {
    const cur = setupState();
    const next = Object.assign({}, cur, patch || {});
    api.actions.setArenaState({ setup: next });
    syncSetupControls(next, false);
  }

  function onAgentSelectionChange() {
    let selected = [];
    refs.agentGrid.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      if (cb.checked) selected.push(cb.value);
    });
    if (!selected.length) {
      const first = refs.agentGrid.querySelector('input[type="checkbox"]');
      if (first) first.checked = true;
      selected = first ? [first.value] : [];
      showSetupError('至少保留 1 个 Agent，已自动恢复选择。');
    } else if (!local.running) {
      showSetupError('');
    }
    const cur = setupState();
    api.actions.setArenaState({ setup: Object.assign({}, cur, { agentIds: selected }) });
    updateAgentCount(selected.length);
  }

  function updateAgentCount(n) {
    refs.agentCount.textContent = '已选 ' + n + ' / ' + local.agentCatalog.length;
  }

  function setAllAgents(checked) {
    if (checked) {
      refs.agentGrid.querySelectorAll('input[type="checkbox"]').forEach((cb) => { cb.checked = true; });
      onAgentSelectionChange();
    } else {
      refs.agentGrid.querySelectorAll('input[type="checkbox"]').forEach((cb, i) => { cb.checked = i === 0; });
      onAgentSelectionChange();
      showSetupError('至少保留 1 个 Agent。');
    }
  }

  function selectedAgentIds() {
    const out = [];
    refs.agentGrid.querySelectorAll('input[type="checkbox"]').forEach((cb) => { if (cb.checked) out.push(cb.value); });
    return out;
  }

  function showSetupError(msg) {
    if (!refs.setupError) return;
    refs.setupError.textContent = msg || '';
    refs.setupError.hidden = !msg;
  }

  function lockSetup(locked) {
    const disableAll = (el, flag) => {
      if (!el) return;
      el.querySelectorAll('button, input, select, textarea').forEach((n) => { n.disabled = !!flag; });
    };
    disableAll(refs.systemSeg, locked);
    disableAll(refs.roundsSeg, locked);
    refs.seedInput.disabled = locked;
    refs.noiseSwitch.input.disabled = locked;
    refs.selectAllBtn.disabled = locked;
    refs.clearAllBtn.disabled = locked;
    refs.agentGrid.querySelectorAll('input').forEach((n) => { n.disabled = locked; });
    refs.startBtn.disabled = locked || !arenaReady();
    refs.clearResultBtn.disabled = locked;
    refs.agentGrid.querySelectorAll('.arena-agent-opt').forEach((n) => n.classList.toggle('is-locked', !!locked));
  }

  function collectSetup() {
    const cur = setupState();
    const seedVal = parseInt(refs.seedInput.value, 10);
    return {
      systemId: cur.systemId || 'FL-001',
      rounds: Number(cur.rounds) || 6,
      seed: isFinite(seedVal) && seedVal >= 0 ? seedVal : 20261027,
      noise: !!(refs.noiseSwitch.input && refs.noiseSwitch.input.checked),
      agentIds: selectedAgentIds()
    };
  }

  function validateSetup(setup) {
    if (!setup.agentIds.length) return '请至少选择 1 个 Agent。';
    if (!isNum(setup.rounds) || setup.rounds < 1) return '轮数无效。';
    if (!isNum(setup.seed) || setup.seed < 0) return '随机种子必须是非负整数。';
    try {
      if (api.systems && api.systems.get) api.systems.get(setup.systemId);
    } catch (e) {
      return '系统 ' + setup.systemId + ' 不可用。';
    }
    return '';
  }

  /* ===================================================================
     盲测流程（try/finally 保证解封）
     =================================================================== */
  function startMatch() {
    if (local.running) return;
    if (!arenaReady()) {
      showSetupError('核心引擎 / Agent 套件尚未就绪，暂时无法开始盲测。');
      api.toast('核心引擎尚未就绪，无法开始盲测', 'warn');
      return;
    }
    const setup = collectSetup();
    const err = validateSetup(setup);
    if (err) { showSetupError(err); return; }
    showSetupError('');
    local.running = true;
    local.matchError = '';
    local.progress = 0;
    local.progressText = '正在生成隐藏场景与盲观测流…';
    local.showTruth = true;
    local.externalAgents = [];
    local.extSeq = 0;
    local.renderKey = '';
    refs.progressPanel.hidden = false;
    refs.sealBanner.hidden = false;
    refs.results.hidden = true;
    refs.startBtn.disabled = true;
    updateProgressUi();
    // 先上锁 / 封存真值，再计算；finally 中保证解锁
    api.actions.setArenaState({ setup: setup, running: true, match: null });
    api.actions.setTruthSealed(true);
    refs.sealBanner.hidden = false;
    setTimeout(() => { runCompute(setup); }, 60);
  }

  function runCompute(setup) {
    let match = null;
    let error = null;
    try {
      match = ns().arena.createMatch(setup, {
        onProgress: (p) => {
          local.progress = p.rounds ? (p.index / p.rounds) : 0;
          updateProgressUi(p.index, p.rounds);
        }
      });
    } catch (e) {
      error = e;
      console.error('[arena] createMatch failed', e);
    } finally {
      finishMatch(setup, match, error);
    }
  }

  function finishMatch(setup, match, error) {
    local.running = false;
    if (error) local.matchError = String(error && error.message ? error.message : error);
    local.progress = 1;
    try {
      api.actions.setArenaState({ setup: setup, running: false, match: match || null });
    } catch (e) {
      console.error('[arena] setArenaState failed', e);
    } finally {
      // 无论正常/异常中断都必须解封真值并退出 running
      try {
        api.actions.setArenaState({ running: false });
      } catch (e2) { /* ignore */ }
      try { api.actions.setTruthSealed(false); } catch (e3) { /* ignore */ }
    }
    refs.progressPanel.hidden = true;
    refs.sealBanner.hidden = true;
    refs.renderKey = '';
    syncAll(api.getState(), 'arena');
    if (error) {
      api.toast('盲测失败：' + local.matchError, 'danger');
    } else {
      const top = match && match.leaderboard && match.leaderboard[0];
      api.toast('盲测完成' + (top ? '：' + top.name + ' 平均 ' + fmt().num(top.avgScore, 1) + ' 分领先' : '') + '；真值已解封', 'ok');
    }
  }

  function updateProgressUi(index, rounds) {
    const total = rounds || (refs.progressPanel && setupState().rounds) || 6;
    const pct = Math.round((local.progress || 0) * 100);
    if (refs.progressFill) refs.progressFill.style.width = Math.max(3, pct) + '%';
    if (refs.progressPct) refs.progressPct.textContent = pct + '%';
    if (refs.progressText) {
      refs.progressText.textContent = index
        ? '已完成 ' + index + ' / ' + total + ' 轮：仿真 → 盲观测回放 → 逐 Agent 诊断 → 评分'
        : local.progressText;
    }
    if (refs.progressPanel && refs.progressPanel.querySelector('[role="progressbar"]')) {
      refs.progressPanel.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', String(pct));
    }
  }

  function clearMatch() {
    if (local.running) return;
    local.matchError = '';
    local.externalAgents = [];
    local.extSeq = 0;
    local.showTruth = true;
    local.renderKey = '';
    refs.results.hidden = true;
    api.actions.setArenaState({ running: false, match: null });
    syncAll(api.getState(), 'arena');
    api.toast('已清空本场结果', 'info');
  }

  function scheduleAutorun() {
    let params;
    try { params = new URLSearchParams(location.search); } catch (e) { return; }
    if (params.get('autorun') !== '1') return;
    local.autorunPending = true;
    setTimeout(() => {
      if (!local.autorunPending) return;
      local.autorunPending = false;
      const patch = {};
      const sid = params.get('system');
      if (sid) {
        try { api.systems.get(sid); patch.systemId = sid; } catch (e) { /* ignore */ }
      }
      const rounds = parseInt(params.get('rounds'), 10);
      if (isFinite(rounds) && [3, 6, 10].indexOf(rounds) >= 0) patch.rounds = rounds;
      const seed = parseInt(params.get('seed'), 10);
      if (isFinite(seed) && seed >= 0) patch.seed = seed;
      if (params.get('noise') === '1') patch.noise = true;
      if (Object.keys(patch).length) applySetupPatch(patch);
      startMatch();
    }, 450);
  }

  /* ===================================================================
     sync / update
     =================================================================== */
  function syncAll(state, reason) {
    if (!local.built) return;
    const arena = (state.pageState && state.pageState.arena) || {};
    const setup = arena.setup || setupState();
    const running = !!arena.running;
    syncSetupControls(setup, running);
    syncHero(arena);
    refs.sealBanner.hidden = !running;
    refs.progressPanel.hidden = !running;
    if (running) updateProgressUi();
    const match = arena.match || null;
    const key = [
      running ? 'run' : 'idle',
      match ? match.id : 'none',
      local.showTruth ? 'truth' : 'masked',
      local.matchError,
      local.externalAgents.map((a) => a.id + ':' + Object.keys(a.rounds || {}).length).join(','),
      local.agentCatalog.map((a) => a.id).join(',')
    ].join('|');
    if (key !== local.renderKey) {
      local.renderKey = key;
      renderResults(match, running);
      renderExternalList();
    }
    refs.importBtn.disabled = running || !match;
    refs.clearResultBtn.disabled = running || !match;
    if (refs.importStatus) {
      if (!match) {
        refs.importStatus.textContent = '尚无比赛结果：先完成一场盲测，再导入外部诊断。';
        refs.importStatus.setAttribute('data-tone', 'warn');
      } else {
        refs.importStatus.textContent = '本场可评分轮次：第 1–' + match.rounds.length + ' 轮；轮次编号与导出的盲测数据包 round.index 一致。';
        refs.importStatus.setAttribute('data-tone', 'info');
      }
    }
    refs.results.hidden = running || (!match && !local.matchError);
    renderEngineNote();
  }

  function syncSetupControls(setup, locked) {
    const s = setup || {};
    try { refs.systemSeg.setValue(s.systemId || 'FL-001'); } catch (e) { /* ignore */ }
    try { refs.roundsSeg.setValue(Number(s.rounds) || 6); } catch (e) { /* ignore */ }
    if (document.activeElement !== refs.seedInput) {
      refs.seedInput.value = String(s.seed == null ? 20261027 : s.seed);
    }
    if (refs.noiseSwitch && refs.noiseSwitch.input) {
      refs.noiseSwitch.setChecked(!!s.noise);
    }
    const allIds = local.agentCatalog.map((a) => a.id);
    const chosen = (s.agentIds && s.agentIds.length) ? s.agentIds : allIds;
    refs.agentGrid.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.checked = chosen.indexOf(cb.value) >= 0;
    });
    updateAgentCount(refs.agentGrid.querySelectorAll('input:checked').length);
    lockSetup(locked);
    refs.startBtn.querySelector('span').textContent = locked ? '盲测进行中…' : (arenaState().match ? '再赛一场' : '开始盲测');
    refs.startBtn.disabled = locked || !arenaReady();
  }

  function syncHero(arena) {
    const running = !!arena.running;
    const match = arena.match || null;
    let text = '待开始';
    let tone = 'neutral';
    if (running) { text = '盲测进行中 · 真值封存'; tone = 'danger'; }
    else if (local.matchError) { text = '计算失败'; tone = 'danger'; }
    else if (match) {
      const healthy = (match.rounds || []).filter((r) => r.truth && r.truth.healthy).length;
      text = '已揭晓 · ' + match.rounds.length + ' 轮 · ' + healthy + ' 个健康局';
      tone = 'ok';
    }
    refs.heroStatus.textContent = text;
    refs.heroStatus.setAttribute('data-tone', tone);
    if (match) {
      refs.heroMeta.textContent = systemTitle(match.systemId) + ' · seed ' + match.setup.seed +
        ' · ' + (match.rounds.length) + ' 轮'; 
    } else {
      refs.heroMeta.textContent = '内置确定性算法 · 盲测真值封存';
    }
  }

  function renderEngineNote() {
    ui.clear(refs.engineNote);
    if (!arenaReady()) {
      refs.engineNote.setAttribute('data-tone', 'warn');
      refs.engineNote.appendChild(ui.icon('warning', { size: 13 }));
      refs.engineNote.appendChild(h('span', {}, '核心引擎或 Agent 模块尚未就绪，盲测按钮暂不可用。'));
    } else {
      refs.engineNote.setAttribute('data-tone', '');
      refs.engineNote.appendChild(ui.icon('check', { size: 13 }));
      refs.engineNote.appendChild(h('span', {}, '就绪：' + local.agentCatalog.length + ' 个内置确定性诊断算法（非 LLM），三系统可用。'));
    }
  }

  /* ===================================================================
     results rendering
     =================================================================== */
  function renderResults(match, running) {
    ui.clear(refs.results);
    if (running) return;
    if (!match) {
      if (local.matchError) {
        refs.results.appendChild(h('section', { class: 'fl-panel arena-error-panel' }, [
          h('div', { class: 'panel-head' }, [h('div', { class: 'panel-head-main' }, [
            h('span', { class: 'eyebrow' }, 'ERROR'), h('span', { class: 'panel-title' }, '盲测未完成')
          ])]),
          h('div', { class: 'panel-body' }, [
            h('div', { class: 'notice', 'data-tone': 'danger' }, [ui.icon('warning', { size: 14 }), h('span', {}, local.matchError)]),
            h('p', { class: 'arena-spec-note mt-12' }, '真值已解封，可修改设置后重新开始。')
          ])
        ]));
      }
      return;
    }
    refs.results.appendChild(renderLeaderboard(match));
    const roundsWrap = h('div', { class: 'arena-rounds' });
    match.rounds.forEach((round) => roundsWrap.appendChild(renderRoundCard(match, round)));
    refs.results.appendChild(roundsWrap);
  }

  function externalRows(match) {
    return local.externalAgents.map((agent) => {
      const entries = Object.keys(agent.rounds || {}).map(Number).filter((idx) => {
        return match.rounds.some((r) => r.index === idx);
      }).map((idx) => ({ round: match.rounds.filter((r) => r.index === idx)[0], item: agent.rounds[idx] }));
      const scores = entries.map((e) => e.item.score.total);
      const faultEntries = entries.filter((e) => e.round && !e.round.truth.healthy);
      const healthyEntries = entries.filter((e) => e.round && e.round.truth.healthy);
      let detected = 0;
      let latencySum = 0;
      let latencyN = 0;
      let famCorrect = 0;
      faultEntries.forEach((e) => {
        const d = e.item.diagnosis;
        if (d.faultDetected) {
          detected += 1;
          if (isNum(d.detectTime_s) && isNum(e.round.truth.t_fault)) {
            latencySum += Math.max(0, d.detectTime_s - e.round.truth.t_fault);
            latencyN += 1;
          }
          if (d.faultType === e.round.truth.faultFamily) famCorrect += 1;
        }
      });
      let falseAlarms = 0;
      healthyEntries.forEach((e) => { if (e.item.diagnosis.faultDetected) falseAlarms += 1; });
      return {
        agentId: agent.id,
        name: agent.name,
        family: 'external',
        source: 'external',
        avgScore: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
        detectionRate: faultEntries.length ? detected / faultEntries.length : null,
        avgLatency: latencyN ? Math.round((latencySum / latencyN) * 100) / 100 : null,
        falseAlarmRate: healthyEntries.length ? falseAlarms / healthyEntries.length : null,
        familyAcc: faultEntries.length ? famCorrect / faultEntries.length : null,
        coverage: entries.length + '/' + match.rounds.length,
        totalScore: scores.reduce((a, b) => a + b, 0)
      };
    });
  }

  function renderLeaderboard(match) {
    const rows = match.leaderboard.map((r) => Object.assign({}, r, {
      coverage: (match.rounds.length) + '/' + match.rounds.length,
      source: 'builtin'
    })).concat(externalRows(match));
    rows.sort((a, b) => {
      const sa = isNum(a.avgScore) ? a.avgScore : -1;
      const sb = isNum(b.avgScore) ? b.avgScore : -1;
      if (sb !== sa) return sb - sa;
      return String(a.name).localeCompare(String(b.name));
    });
    const healthyCount = match.rounds.filter((r) => r.truth.healthy).length;
    refs.truthToggle = h('button', {
      class: 'btn btn-ghost btn-sm', type: 'button',
      'aria-pressed': String(local.showTruth),
      title: local.showTruth ? '隐藏真值，重新以盲测视角查看诊断' : '显示真值',
      on: {
        click: () => {
          local.showTruth = !local.showTruth;
          local.renderKey = '';
          syncAll(api.getState(), 'arena');
        }
      }
    }, [ui.icon(local.showTruth ? 'eye-off' : 'eye', { size: 13 }), h('span', {}, local.showTruth ? '隐藏真值' : '显示真值')]);
    refs.exportMatchBtn = h('button', {
      class: 'btn btn-ghost btn-sm', type: 'button',
      on: { click: () => exportMatch(match) }
    }, [ui.icon('download', { size: 13 }), h('span', {}, '导出整场数据包')]);

    const head = h('div', { class: 'panel-head arena-lb-head' }, [
      h('div', { class: 'panel-head-main' }, [
        h('span', { class: 'eyebrow' }, 'LEADERBOARD'),
        h('span', { class: 'panel-title' }, '排行榜'),
        h('span', { class: 'panel-sub' }, systemTitle(match.systemId) + ' · seed ' + match.setup.seed +
          ' · ' + match.rounds.length + ' 轮 · ' + healthyCount + ' 个健康局')
      ]),
      h('div', { class: 'arena-lb-actions' }, [refs.truthToggle, refs.exportMatchBtn])
    ]);
    const body = h('div', { class: 'panel-body arena-lb-body' });
    const headRow = h('div', { class: 'arena-lb-headrow' }, [
      h('span', {}, '名次'), h('span', {}, 'Agent'), h('span', {}, '综合分'), h('span', {}),
      h('span', {}, '检出率'), h('span', {}, '平均延迟'), h('span', {}, '误报率'),
      h('span', {}, '家族准确率'), h('span', {}, '覆盖')
    ]);
    body.appendChild(headRow);
    rows.forEach((row, i) => {
      const pct = isNum(row.avgScore) ? Math.max(0, Math.min(100, row.avgScore)) : 0;
      const isExt = row.source === 'external';
      body.appendChild(h('div', {
        class: 'arena-lb-row' + (i === 0 ? ' is-top' : ''),
        dataset: { source: isExt ? 'external' : 'builtin' }
      }, [
        h('span', { class: 'arena-rank' }, String(i + 1).padStart(2, '0')),
        h('span', { class: 'arena-lb-agent' }, [
          h('span', { class: 'arena-lb-name' }, row.name),
          h('span', { class: 'arena-lb-tags' }, [
            isExt ? ui.badge('外部导入', { tone: 'info' }) : ui.badge('内置', { tone: 'neutral' }),
            h('span', { class: 'arena-lb-family' }, isExt ? '外部诊断提交' : agentFamilyLabel(row.family))
          ])
        ]),
        h('span', { class: 'arena-lb-score' }, [
          h('strong', { class: 'num', 'data-tone': scoreTone(row.avgScore) }, isNum(row.avgScore) ? fmt().num(row.avgScore, 1) : '—'),
          h('span', { class: 'arena-lb-score-unit' }, '/ 100')
        ]),
        h('span', { class: 'arena-lb-bar-cell' }, [
          h('span', { class: 'arena-lb-bar' }, [h('span', { class: 'arena-lb-bar-fill', 'data-tone': scoreTone(row.avgScore), style: { width: pct + '%' } })])
        ]),
        h('span', { class: 'arena-lb-metric mono', 'data-label': '检出' }, pctOrDash(row.detectionRate)),
        h('span', { class: 'arena-lb-metric mono', 'data-label': '延迟' }, isNum(row.avgLatency) ? fmt().num(row.avgLatency, 2) + ' s' : '—'),
        h('span', { class: 'arena-lb-metric mono', 'data-label': '误报' }, pctOrDash(row.falseAlarmRate)),
        h('span', { class: 'arena-lb-metric mono', 'data-label': '家族' }, pctOrDash(row.familyAcc)),
        h('span', { class: 'arena-lb-metric mono', 'data-label': '覆盖' }, row.coverage || '—')
      ]));
    });
    if (!rows.length) body.appendChild(h('div', { class: 'empty' }, [h('div', { class: 'empty-title' }, '暂无排行榜')]));
    return h('section', { class: 'fl-panel arena-lb' }, [head, body]);
  }

  function renderRoundCard(match, round) {
    const truth = round.truth;
    const truthVisible = local.showTruth;
    const compMap = componentMap(match.systemId);
    const head = h('div', { class: 'arena-round-head' }, [
      h('span', { class: 'arena-round-no mono' }, 'R' + String(round.index).padStart(2, '0')),
      h('div', { class: 'arena-round-head-main' }, [
        h('div', { class: 'arena-round-title' }, truthVisible
          ? (truth.healthy ? '健康局' : truth.faultFamilyLabel)
          : '第 ' + round.index + ' 轮 · 真值已隐藏'),
        h('div', { class: 'arena-round-sub mono' }, 'configHash ' + fmt().hash(round.configHash || '') +
          ' · ' + round.samples.length + ' 样本 × ' + round.observables.length + ' 观测通道')
      ]),
      h('div', { class: 'arena-round-tags' }, truthVisible ? [
        truth.healthy ? ui.badge('无故障注入', { tone: 'ok' }) : ui.badge(truth.faultFamilyLabel, { tone: 'danger' }),
        truth.healthy ? null : ui.chip(modeLabel(truth.feedbackMode)),
        truth.healthy ? null : ui.chip('部件 ' + (truth.componentLabel || componentLabel(compMap, truth.component))),
        truth.healthy ? null : ui.chip('幅值 ' + magText(truth.magnitude)),
        truth.healthy ? null : ui.chip('t = ' + fmt().time(truth.t_fault))
      ] : [
        ui.badge('真值封存', { tone: 'warn' }),
        local.showTruth ? null : ui.chip('点击排行榜「显示真值」揭晓')
      ])
    ]);

    const truthBlock = truthVisible
      ? h('div', { class: 'arena-truth' + (truth.healthy ? ' is-healthy' : '') }, truth.healthy
        ? [h('span', { class: 'arena-truth-label' }, '本轮判定'), h('strong', {}, '健康局（无故障）'), h('span', { class: 'muted' }, '所有 Agent 的期望行为是「未报警」；误报将扣 10 分。')]
        : [
          truthItem('故障家族', truth.faultFamilyLabel),
          truthItem('受影响部件', truth.componentLabel || componentLabel(compMap, truth.component)),
          truthItem('故障幅值', magText(truth.magnitude)),
          truthItem('注入时刻', fmt().time(truth.t_fault)),
          truthItem('生效模式', modeLabel(truth.feedbackMode)),
          truthItem('持续时长', truth.active_s != null ? fmt().num(truth.active_s, 1) + ' s' : '—'),
          truthItem('最快报警', truth.detectedAt == null ? '无 Agent 报警' : fmt().time(truth.detectedAt))
        ])
      : h('div', { class: 'arena-truth is-masked' }, [
        ui.icon('lock', { size: 14 }),
        h('span', {}, '真值已隐藏：仅显示各 Agent 的诊断、得分与解释，便于以盲测视角复盘。')
      ]);

    const resultsWrap = h('div', { class: 'arena-result-grid' });
    round.results.forEach((result) => resultsWrap.appendChild(renderAgentResult(match, round, result)));
    local.externalAgents.forEach((agent) => {
      const item = agent.rounds && agent.rounds[round.index];
      if (item) {
        resultsWrap.appendChild(renderAgentResult(match, round, {
          agentId: agent.id,
          name: agent.name,
          source: 'external',
          family: 'external',
          diagnosis: item.diagnosis,
          score: item.score
        }));
      } else {
        resultsWrap.appendChild(h('div', { class: 'arena-result is-missing' }, [
          h('div', { class: 'arena-result-head' }, [
            h('span', { class: 'arena-result-name' }, agent.name),
            ui.badge('外部导入', { tone: 'info' })
          ]),
          h('div', { class: 'arena-result-missing' }, [ui.icon('x', { size: 13 }), h('span', {}, '未提交本轮诊断，不计入平均分')])
        ]));
      }
    });

    const foot = h('div', { class: 'arena-round-foot' }, [
      h('span', { class: 'muted small' }, truthVisible ? '本轮数据包不含真值；导出后可直接交给外部 Agent 重放。' : '导出数据包始终不含真值。'),
      h('button', {
        class: 'btn btn-ghost btn-sm', type: 'button',
        on: { click: () => exportRound(match, round.index) }
      }, [ui.icon('download', { size: 13 }), h('span', {}, '导出第 ' + round.index + ' 轮盲测包')])
    ]);
    return h('article', { class: 'fl-panel arena-round' }, [head, truthBlock, resultsWrap, foot]);
  }

  function truthItem(label, value) {
    return h('div', { class: 'arena-truth-item' }, [
      h('span', { class: 'arena-truth-k' }, label),
      h('span', { class: 'arena-truth-v' }, value == null ? '—' : String(value))
    ]);
  }

  function renderAgentResult(match, round, result) {
    const truth = round.truth;
    const d = result.diagnosis || {};
    const isExt = result.source === 'external';
    const showTruth = local.showTruth;
    const compMap = componentMap(match.systemId);
    const detected = d.faultDetected === true;
    const familyTxt = detected ? familyLabel(d.faultType) : '判定健康';
    const compTxt = detected ? componentLabel(compMap, d.component) : '—';
    const familyCorrect = showTruth && !truth.healthy && detected && d.faultType === truth.faultFamily;
    const componentCorrect = showTruth && !truth.healthy && detected && d.component === truth.component;
    const score = result.score || {};
    const total = score.total;
    const head = h('div', { class: 'arena-result-head' }, [
      h('div', { class: 'arena-result-id' }, [
        h('span', { class: 'arena-result-name' }, result.name),
        isExt ? ui.badge('外部导入', { tone: 'info' }) : ui.badge(agentFamilyLabel(result.family), { tone: result.family === 'fusion' ? 'acc' : 'neutral' }),
        detected
          ? ui.badge(familyTxt, { tone: (showTruth && d.faultType === truth.faultFamily) ? 'ok' : (showTruth ? 'danger' : 'neutral') })
          : ui.badge('健康', { tone: (showTruth && !truth.healthy) ? 'danger' : 'ok' })
      ]),
      h('div', { class: 'arena-result-score' }, [
        h('strong', { class: 'num', 'data-tone': scoreTone(total) }, isNum(total) ? fmt().num(total, 1) : '—'),
        h('span', {}, '/ 100')
      ])
    ]);
    const diagLine = h('div', { class: 'arena-result-diagnosis' }, [
      detected ? [
        h('span', {}, '家族 '),
        h('strong', {}, familyTxt),
        showTruth ? h('span', { class: 'arena-mark', 'data-ok': String(familyCorrect) }, familyCorrect ? '✓' : '✗') : null,
        h('span', { class: 'arena-sep' }, '·'),
        h('span', {}, '部件 '),
        h('strong', {}, compTxt),
        showTruth ? h('span', { class: 'arena-mark', 'data-ok': String(componentCorrect) }, componentCorrect ? '✓' : '✗') : null,
        h('span', { class: 'arena-sep' }, '·'),
        h('span', {}, '幅值 '),
        h('strong', {}, magText(d.magnitude)),
        h('span', { class: 'arena-sep' }, '·'),
        h('span', {}, '首报 '),
        h('strong', {}, isNum(d.detectTime_s) ? fmt().time(d.detectTime_s) : '—')
      ] : [
        h('span', {}, '未报警；置信度 '),
        h('strong', {}, fmt().num(d.confidence, 2)),
        showTruth ? h('span', { class: 'arena-mark', 'data-ok': String(truth.healthy) }, truth.healthy ? '✓' : '✗') : null
      ]
    ]);
    const confLine = h('div', { class: 'arena-result-conf mono' }, detected
      ? '置信度 ' + fmt().num(d.confidence, 3) + (score.falseAlarm ? ' · 健康局误报 −10' : '')
      : '置信度 ' + fmt().num(d.confidence, 3) + (score.falseAlarm ? ' · 误报 −10' : ''));

    const breakdown = h('div', { class: 'arena-breakdown' });
    DIMS.forEach(([key, label]) => {
      const v = isNum(score[key]) ? score[key] : 0;
      const weight = (weights()[key] || 0);
      breakdown.appendChild(h('div', { class: 'arena-break-row', title: label + ' 权重 ' + fmt().num(weight * 100, 0) + '%' }, [
        h('span', { class: 'arena-break-label' }, label),
        h('span', { class: 'arena-break-bar' }, [h('span', {
          class: 'arena-break-fill',
          'data-tone': v >= 0.9 ? 'ok' : v >= 0.5 ? 'warn' : 'danger',
          style: { width: Math.round(v * 100) + '%' }
        })]),
        h('span', { class: 'arena-break-val mono' }, fmt().num(v, 2)),
        h('span', { class: 'arena-break-weight mono' }, fmt().num(weight * 100, 0) + '%')
      ]));
    });

    return h('div', { class: 'arena-result', dataset: { source: isExt ? 'external' : 'builtin' } }, [
      head,
      diagLine,
      confLine,
      breakdown,
      h('p', { class: 'arena-result-explain' }, d.explanation || '（无解释）')
    ]);
  }

  /* ===================================================================
     exports
     =================================================================== */
  function exportRound(match, roundIndex) {
    try {
      const bundle = ns().arena.exportRoundBundle(match, roundIndex);
      const filename = 'FaultLab_arena_' + match.systemId + '_seed' + match.setup.seed + '_round' + roundIndex + '.json';
      const ok = downloadText(filename, JSON.stringify(bundle, null, 2), 'application/json;charset=utf-8');
      if (ok) api.toast('已导出第 ' + roundIndex + ' 轮盲测数据包（truth_sealed）', 'ok');
      else api.toast('导出失败：浏览器未允许下载', 'danger');
    } catch (e) {
      api.toast('导出失败：' + (e && e.message ? e.message : e), 'danger');
    }
  }

  function exportMatch(match) {
    try {
      const bundle = ns().arena.exportMatchBundle(match);
      const filename = 'FaultLab_arena_' + match.systemId + '_seed' + match.setup.seed + '_allRounds.json';
      const ok = downloadText(filename, JSON.stringify(bundle, null, 2), 'application/json;charset=utf-8');
      if (ok) api.toast('已导出整场盲测数据包（truth_sealed）', 'ok');
      else api.toast('导出失败：浏览器未允许下载', 'danger');
    } catch (e) {
      api.toast('导出失败：' + (e && e.message ? e.message : e), 'danger');
    }
  }

  /* ===================================================================
     外部诊断导入
     =================================================================== */
  function showImportErrors(errors, fatal) {
    ui.clear(refs.importErrors);
    if (!errors || !errors.length) {
      refs.importErrors.hidden = true;
      return;
    }
    refs.importErrors.hidden = false;
    refs.importErrors.setAttribute('data-tone', fatal ? 'danger' : 'warn');
    refs.importErrors.appendChild(h('div', { class: 'arena-import-error-head' }, [
      ui.icon(fatal ? 'warning' : 'info', { size: 13 }),
      h('strong', {}, fatal ? '导入失败' : '部分轮次未评分')
    ]));
    const ul = h('ul', {});
    errors.slice(0, 12).forEach((e) => {
      ul.appendChild(h('li', {}, h('span', { class: 'mono' }, (e.path || '$') + '：') + ' ' + (e.message || String(e))));
    });
    if (errors.length > 12) ul.appendChild(h('li', {}, '……另有 ' + (errors.length - 12) + ' 条'));
    refs.importErrors.appendChild(ul);
  }

  function importExternal() {
    if (local.running) { api.toast('盲测进行中，暂不能导入外部诊断', 'warn'); return; }
    const match = arenaState().match;
    if (!match) { showImportErrors([{ path: '$', message: '请先完成一场盲测，再导入外部诊断。' }], true); return; }
    if (!ns().arena || typeof ns().arena.parseExternalBundle !== 'function') {
      showImportErrors([{ path: '$', message: 'FL.arena 未就绪，无法解析外部诊断。' }], true);
      return;
    }
    const text = String(refs.importText.value || '').trim();
    if (!text) { showImportErrors([{ path: '$', message: '请粘贴 JSON 或先选择文件。' }], true); return; }
    const parsed = ns().arena.parseExternalBundle(text);
    if (!parsed.ok) { showImportErrors(parsed.errors, true); return; }
    const errors = [];
    const rounds = {};
    parsed.data.rounds.forEach((item) => {
      const round = match.rounds.filter((r) => r.index === item.round)[0];
      if (!round) {
        errors.push({ path: '$[round=' + item.round + ']', message: '本场比赛没有第 ' + item.round + ' 轮' });
        return;
      }
      try {
        const score = ns().arena.scoreExternalDiagnosis(match, item.round, item.diagnosis);
        rounds[item.round] = { diagnosis: item.diagnosis, score: score };
      } catch (e) {
        errors.push({ path: '$[round=' + item.round + ']', message: String(e && e.message ? e.message : e) });
      }
    });
    if (!Object.keys(rounds).length) {
      showImportErrors(errors.length ? errors : [{ path: '$', message: '没有可评分的轮次' }], true);
      return;
    }
    local.extSeq += 1;
    const agent = {
      id: 'ext-' + local.extSeq,
      name: parsed.data.agentName || ('外部 Agent ' + local.extSeq),
      source: 'external',
      rounds: rounds
    };
    local.externalAgents.push(agent);
    showImportErrors(errors, false);
    refs.importText.value = '';
    local.renderKey = '';
    syncAll(api.getState(), 'arena');
    api.toast('已导入外部诊断「' + agent.name + '」：' + Object.keys(rounds).length + ' 轮，已加入排行榜', 'ok');
  }

  function clearExternal() {
    if (!local.externalAgents.length) { api.toast('没有可清空的外部结果', 'info'); return; }
    local.externalAgents = [];
    local.renderKey = '';
    showImportErrors([], false);
    syncAll(api.getState(), 'arena');
    api.toast('已清空外部导入结果', 'info');
  }

  function removeExternal(id) {
    local.externalAgents = local.externalAgents.filter((a) => a.id !== id);
    local.renderKey = '';
    syncAll(api.getState(), 'arena');
  }

  function renderExternalList() {
    ui.clear(refs.extList);
    if (!local.externalAgents.length) {
      refs.extList.hidden = false;
      refs.extList.appendChild(h('div', { class: 'arena-ext-empty' }, '尚未导入外部诊断。'));
      return;
    }
    local.externalAgents.forEach((agent) => {
      const rows = externalRows(arenaState().match || { rounds: [] });
      const row = rows.filter((r) => r.agentId === agent.id)[0];
      refs.extList.appendChild(h('div', { class: 'arena-ext-item' }, [
        h('div', { class: 'arena-ext-main' }, [
          h('span', { class: 'arena-ext-name' }, agent.name),
          ui.badge('外部导入', { tone: 'info' }),
          h('span', { class: 'arena-ext-meta mono' }, '覆盖 ' + (row ? row.coverage : '—') +
            ' · 均分 ' + (row && isNum(row.avgScore) ? fmt().num(row.avgScore, 1) : '—'))
        ]),
        h('button', {
          class: 'btn btn-ghost btn-xs', type: 'button', 'aria-label': '移除外部 Agent ' + agent.name,
          on: { click: () => removeExternal(agent.id) }
        }, [ui.icon('x', { size: 12 })])
      ]));
    });
  }

  /* ===================================================================
     update / export page module
     =================================================================== */
  function update(state, reason) {
    if (!local.built) return;
    // 竞技场不依赖全局仿真时间；播放/时间/全局 toast 更新时跳过，避免每帧重排 DOM。
    if (reason === 'time' || reason === 'playback' || reason === 'toast') return;
    syncAll(state, reason || 'update');
  }

  pages.arena = {
    id: 'arena',
    label: 'Agent 竞技场',
    navLabel: '竞技场',
    mount: mount,
    update: update
  };
})();
