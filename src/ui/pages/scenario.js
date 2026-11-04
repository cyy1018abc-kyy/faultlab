/* owner: orchestrator-ui | module: page-scenario | contract: FaultLab-evaluation/NEXT/V06_ROADMAP.md §7 S4（C-2 UI 只读骨架，CHG-20261104-08） */
/* =========================================================================
   场景编排页（V06_ROADMAP 主线 C，DEC-1 最小闭环：只读序列视图，无拖拽）
   - 导入：场景 JSON（schema v1）两种等价入口——文件选择 + 粘贴文本；
   - 校验：FL.core.scenario.parseScenario → 通过=事件卡只读序列；失败=结构化错误列表；
   - 运行：FL.core.scenario.executeScenario 按事件序构造标准 Run（复用 engine/registry
     既有语义，不引入新执行语义），经 store.addScenarioRuns 入运行档案；
   - 结果：每 Run 一行（key / family / feedback_mode / 关键指标，数值只读 run.metrics），
     「载入查看」复用既有 loadRun 入口（系统页打开，曲线/因果/对比共享同一 Run）；
   - 导出：归一化场景 JSON（再解析幂等，roundtrip 内容哈希一致）；
   - 不做：拖拽编辑（规划于 v0.7）、localStorage 以外的持久化、云/账户（I-1）；
   - 文案护栏：UI_COPY_GUARDRAILS §6 禁词 / §7 空态不放假数据；
   - [登记·UI 接线路 CHG-20261104-10 最小改动] 教学路径草稿读取入口
    （maybeConsumeTeachingDraft / TEACHING_DRAFT_KEY，见函数处注释）：只新增「读 sessionStorage
     草稿→填入导入框→走既有 parseCurrent」一条通路，不触碰解析/运行/导出语义。
   ========================================================================= */
(function () {
  'use strict';
  const FL = window.FL = window.FL || {};
  const pages = FL.pages = FL.pages || {};

  const MODE_LABEL = { closed_loop: '闭环反馈', monitor: '仅监测' };
  /* 教学路径草稿键（与 src/ui/pages/teaching.js DRAFT_KEY 同一字面量镜像，改动须两处同步） */
  const TEACHING_DRAFT_KEY = 'faultlab.teaching.scenarioDraft.v1';
  /* 每 Run 摘要行展示的关键指标（按系统选取；数值一律来自 run.metrics）。
     PV-001：focal_change 的焦点信号即 P_pv_true_kW（metrics.js FOCAL_SIGNAL 映射，
     故障时刻→结束的真实出力变化量）；ΔE_pv（E_pv_err_kWh）承担 SOC_est 的功能位
     （EQ-PV-7），E_grid_kWh 为馈线受电口径（E_pv + E_grid = E_load 定义恒等）。
     PV-001 无储能/无 SOC，故不取 SOC 类指标（缺失显示 不可用，见 pickMetrics）。 */
  const METRIC_PICK = {
    'FL-001': ['focal_change_A', 'SOC_err_end_pp', 'E_bat_true_60s'],
    'FC-001': ['focal_change', 'SOC_err_pp', 'E_bat_kWh'],
    'GT-001': ['focal_change', 'f_nadir_Hz'],
    'PV-001': ['focal_change', 'E_pv_err_kWh', 'E_grid_kWh']
  };
  const MAX_ERROR_ROWS = 12;

  let api = null;
  let ui = null;
  let h = null;
  const refs = {};
  const local = {
    built: false,
    coreReady: false,
    parsed: null,        // parseScenario 结果（{ok, scenario|errors, warnings}）
    scenarioHash: null,  // 当前已解析场景的内容哈希
    exec: null,          // 最近一次运行 { runs, scenarioHash, at }
    execError: '',
    execSeq: 0,
    hasText: false,
    teachingDraftText: '',        // 最近一次从教学草稿自动填入的原文（重复点击可覆盖）
    teachingDraftNotifiedAt: null // 已就「导入框被占用」提示过一次的草稿 at 标记
  };

  function fmt() { return (api && api.fmt) ? api.fmt : FL.protocol.fmt; }
  function scenarioModule() {
    return (FL.core && FL.core.scenario && typeof FL.core.scenario.parseScenario === 'function')
      ? FL.core.scenario : null;
  }
  function scenarioReady() { return !!scenarioModule(); }
  function parsedOk() { return !!(local.parsed && local.parsed.ok && local.parsed.scenario); }

  function systemTitle(systemId) {
    try {
      const sys = FL.systems.get(systemId);
      if (sys) return sys.title || systemId;
    } catch (e) { /* ignore */ }
    return systemId;
  }
  function faultDef(systemId, family) {
    try {
      const sys = FL.systems.get(systemId);
      if (sys && sys.faults) {
        for (let i = 0; i < sys.faults.length; i++) if (sys.faults[i].family === family) return sys.faults[i];
      }
    } catch (e) { /* ignore */ }
    return null;
  }
  function familyLabel(systemId, family) {
    const def = faultDef(systemId, family);
    return (def && def.label) ? def.label : (family || '—');
  }
  function modeLabel(mode) { return MODE_LABEL[mode] || mode || '—'; }

  /* 关键指标取值：只读 run.metrics；缺失显示 不可用（不填 0，护栏 §6.2） */
  function pickMetrics(run, event) {
    const list = [];
    const seen = {};
    const ids = (METRIC_PICK[run.systemId] || []).slice();
    (run.metrics || []).forEach((m) => { if (m && m.focal && ids.indexOf(m.metric_id) === -1 && ids.length < 3) ids.push(m.metric_id); });
    ids.forEach((id) => {
      if (seen[id]) return;
      let m = null;
      for (let i = 0; i < (run.metrics || []).length; i++) {
        if (run.metrics[i] && run.metrics[i].metric_id === id) { m = run.metrics[i]; break; }
      }
      if (!m) return;
      seen[id] = true;
      list.push(m);
    });
    if (!list.length && event) {
      const def = faultDef(run.systemId, event.family);
      const p0 = def && def.params && def.params[0];
      list.push({ metric_id: 'fault_peak_magnitude', label: '故障峰值幅值', unit: p0 ? p0.unit : '',
        value: run.config && run.config.fault && run.config.fault.params ? run.config.fault.params.magnitude : null });
    }
    return list.slice(0, 3);
  }
  function metricText(m) {
    if (!m) return '—';
    if (m.value === null || m.value === undefined || m.unavailable) return '不可用';
    return fmt().unit(m.value, m.unit || '', m.precision != null ? m.precision : 2);
  }

  /* ===================================================================
     mount / build
     =================================================================== */
  function mount(rootEl, pageApi) {
    api = pageApi;
    ui = api.ui;
    h = api.ui.h;
    local.coreReady = scenarioReady();

    const root = h('div', { class: 'pg-scenario page-pad' });
    rootEl.appendChild(root);
    refs.root = root;

    root.appendChild(buildHero());
    root.appendChild(buildImport());
    refs.seqPanel = buildSequence();
    root.appendChild(refs.seqPanel);
    refs.resultsPanel = buildResults();
    root.appendChild(refs.resultsPanel);
    root.appendChild(h('footer', { class: 'scn-foot' }, [
      h('span', { class: 'eyebrow' }, 'FAULTLAB · C-2'),
      h('span', {}, '场景 Run 与手动创建的 Run 走同一引擎入口与内容哈希口径；关键指标为解析行为级演示数值（L0），说明文本不作为计算数据源。'),
      h('span', { class: 'scn-foot-ver mono' }, 'scenario_page 0.1')
    ]));

    local.built = true;
    syncAll(api.getState(), 'mount');
    maybeConsumeTeachingDraft();
  }

  function buildHero() {
    refs.heroStatus = h('span', { class: 'badge', 'data-tone': 'neutral' }, '未导入');
    return h('header', { class: 'scn-hero' }, [
      h('div', { class: 'scn-hero-main' }, [
        h('div', { class: 'eyebrow' }, 'C-2 · SCENARIO ORCHESTRATOR'),
        h('h1', { class: 'scn-title' }, ['场景', h('em', {}, '编排器')]),
        h('p', { class: 'scn-sub' },
          '导入场景 JSON（schema v1，封闭白名单），校验通过后生成只读事件序列；一键按序创建标准 Run 并入运行档案。本波为只读骨架，拖拽编辑不在范围内。'),
        h('div', { class: 'scn-hero-tags' }, [
          ui.badge('只读序列视图', { tone: 'info' }),
          ui.badge('schema v1 · 封闭白名单', { tone: 'neutral' }),
          ui.badge('复用既有 Run 语义', { tone: 'acc' })
        ])
      ]),
      h('div', { class: 'scn-hero-side' }, [refs.heroStatus])
    ]);
  }

  function buildImport() {
    refs.parseBtn = h('button', {
      class: 'btn btn-primary btn-sm', type: 'button',
      on: { click: parseCurrent }
    }, [ui.icon('check', { size: 13 }), h('span', {}, '解析校验')]);

    refs.fileInput = h('input', {
      type: 'file', accept: '.json,application/json', class: 'scn-file-input',
      on: {
        change: () => {
          const f = refs.fileInput.files && refs.fileInput.files[0];
          if (!f) return;
          const reader = new FileReader();
          reader.onload = () => {
            refs.text.value = String(reader.result || '');
            onTextChanged();
            parseCurrent();
          };
          reader.onerror = () => {
            showVerdictError('文件读取失败：请重试，或改用粘贴文本导入。');
          };
          reader.readAsText(f, 'utf-8');
          refs.fileInput.value = '';
        }
      }
    });

    refs.text = h('textarea', {
      class: 'input scn-text', rows: '8', spellcheck: 'false',
      'data-testid': 'scenario-import-text',
      placeholder: '粘贴场景 JSON（schema v1）。顶层字段：version=1 / system（FL-001 · FC-001 · GT-001 · PV-001）/ events[]；' +
        '事件字段：key、family、params、t_start_s、feedback_mode（closed_loop / monitor）。',
      on: { input: onTextChanged }
    });

    const sampleBtns = ['FL-001', 'FC-001', 'GT-001'].map((sid) => h('button', {
      class: 'btn btn-ghost btn-xs', type: 'button', title: '载入 ' + sid + ' 可直接运行的合法样例场景',
      on: { click: () => loadSample(sid) }
    }, [ui.icon('flask', { size: 11 }), h('span', {}, sid + ' 样例')]));

    refs.clearBtn = h('button', {
      class: 'btn btn-ghost btn-sm', type: 'button',
      on: { click: clearAll }
    }, [ui.icon('x', { size: 13 }), h('span', {}, '清空')]);

    refs.verdict = h('div', { class: 'scn-verdict', 'data-testid': 'scenario-verdict' });

    return h('section', { class: 'fl-panel scn-import' }, [
      h('div', { class: 'panel-head' }, [
        h('div', { class: 'panel-head-main' }, [
          h('span', { class: 'eyebrow' }, 'IMPORT'),
          h('span', { class: 'panel-title' }, '导入场景 JSON'),
          h('span', { class: 'panel-sub' }, '选择文件 / 粘贴文本，两种入口等价')
        ]),
        ui.badge('schema v1', { tone: 'neutral' })
      ]),
      h('div', { class: 'panel-body scn-import-body' }, [
        refs.text,
        h('div', { class: 'scn-import-actions' }, [
          h('label', { class: 'btn btn-ghost btn-sm scn-file-label' }, [
            ui.icon('external', { size: 13 }), h('span', {}, '选择 JSON 文件'), refs.fileInput
          ]),
          sampleBtns,
          h('span', { class: 'spacer' }),
          refs.clearBtn,
          refs.parseBtn
        ]),
        h('div', { class: 'hint-row' }, [
          ui.icon('info', { size: 13 }),
          h('span', {}, '样例为可直接运行的合法场景；解析失败时逐条给出字段级错误，未通过前不创建任何运行。')
        ]),
        refs.verdict
      ])
    ]);
  }

  function buildSequence() {
    refs.seqMeta = h('div', { class: 'scn-meta' });
    refs.seqHash = h('div', { class: 'scn-hash' });
    refs.seqList = h('div', { class: 'scn-events', 'data-testid': 'scenario-sequence' });

    refs.exportBtn = h('button', {
      class: 'btn btn-ghost btn-sm', type: 'button', 'data-testid': 'scenario-export-btn',
      on: { click: exportScenario }
    }, [ui.icon('download', { size: 13 }), h('span', {}, '导出场景 JSON')]);

    refs.runBtn = h('button', {
      class: 'btn btn-primary btn-sm', type: 'button', 'data-testid': 'scenario-run-btn',
      on: { click: runScenario }
    }, [ui.icon('play', { size: 13 }), h('span', {}, '运行场景')]);

    return h('section', { class: 'fl-panel scn-seq', hidden: true }, [
      h('div', { class: 'panel-head' }, [
        h('div', { class: 'panel-head-main' }, [
          h('span', { class: 'eyebrow' }, 'SEQUENCE'),
          h('span', { class: 'panel-title' }, '只读事件序列'),
          h('span', { class: 'panel-sub' }, '按导入顺序排列；拖拽编辑规划于 v0.7（DEC-1）')
        ]),
        h('span', { class: 'badge', 'data-tone': 'ok' }, '校验通过')
      ]),
      h('div', { class: 'panel-body scn-seq-body' }, [refs.seqMeta, refs.seqHash, refs.seqList]),
      h('div', { class: 'panel-foot scn-seq-foot' }, [
        h('span', { class: 'muted small' }, '运行按事件顺序逐个创建标准 Run（每次 60 s / 0.1 s 基准网格，噪声关闭）。'),
        h('span', { class: 'spacer' }),
        refs.exportBtn,
        refs.runBtn
      ])
    ]);
  }

  function buildResults() {
    refs.resultsHead = h('span', { class: 'panel-sub' });
    refs.resultsList = h('div', { class: 'scn-runs', 'data-testid': 'scenario-results' });
    return h('section', { class: 'fl-panel scn-results', hidden: true }, [
      h('div', { class: 'panel-head' }, [
        h('div', { class: 'panel-head-main' }, [
          h('span', { class: 'eyebrow' }, 'RESULTS'),
          h('span', { class: 'panel-title' }, '运行结果'),
          refs.resultsHead
        ]),
        h('span', { class: 'badge', 'data-tone': 'acc' }, '已入档')
      ]),
      h('div', { class: 'panel-body' }, [refs.resultsList])
    ]);
  }

  /* ===================================================================
     导入 / 校验
     =================================================================== */
  function onTextChanged() {
    local.hasText = String(refs.text.value || '').trim().length > 0;
  }

  function loadSample(systemId) {
    const SC = scenarioModule();
    if (!SC) { api.toast('编排核心未就绪', 'warn'); return; }
    const samples = SC.samples();
    const s = samples[systemId];
    if (!s) { api.toast('没有 ' + systemId + ' 样例', 'warn'); return; }
    refs.text.value = JSON.stringify(s, null, 2);
    onTextChanged();
    parseCurrent();
  }

  function parseCurrent() {
    const SC = scenarioModule();
    if (!SC) { api.toast('编排核心未就绪：FL.core.scenario 缺失（检查 index.html 脚本装载顺序）', 'warn'); return; }
    local.exec = null;
    local.execError = '';
    local.scenarioHash = null;
    const text = String(refs.text.value || '').trim();
    if (!text) {
      local.parsed = null;
      syncAll(api.getState(), 'scenario-parse');
      return;
    }
    local.parsed = SC.parseScenario(text);
    if (local.parsed.ok) {
      try { local.scenarioHash = SC.scenarioHash(local.parsed.scenario); } catch (e) { local.scenarioHash = null; }
    }
    syncAll(api.getState(), 'scenario-parse');
  }

  function clearAll() {
    refs.text.value = '';
    onTextChanged();
    local.parsed = null;
    local.scenarioHash = null;
    local.exec = null;
    local.execError = '';
    syncAll(api.getState(), 'scenario-clear');
  }

  function showVerdictError(msg) {
    ui.clear(refs.verdict);
    refs.verdict.appendChild(h('div', { class: 'notice', 'data-tone': 'danger' }, [
      ui.icon('warning', { size: 14 }),
      h('span', {}, msg)
    ]));
  }

  /* ===================================================================
     教学路径草稿读取入口（最小改动，登记见文件头）
     =================================================================== */
  /* src/ui/pages/teaching.js 第⑤步「生成评测场景」把 scenarioSpec 写入 sessionStorage
     （TEACHING_DRAFT_KEY）；本函数在挂载与每次非时间轴状态更新时检查一次：
     - 草稿合法且导入框为空（或仍为本页上次自动填入的原文）→ 填入并走既有 parseCurrent，
       随后删除草稿键（消费一次即失效，不反复打扰）；
     - 导入框已有用户内容 → 绝不覆盖，草稿保留；对同一份草稿只提示一次「待填入」；
     - 草稿不合法 → 直接删除，不解析不报错（生成方负责其正确性）。
     只新增填入通路，不改变解析/运行/导出语义。 */
  function maybeConsumeTeachingDraft() {
    let raw = null;
    try { raw = sessionStorage.getItem(TEACHING_DRAFT_KEY); } catch (e) { raw = null; }
    if (!raw) return;
    let payload = null;
    try { payload = JSON.parse(raw); } catch (e) { payload = null; }
    if (!payload || payload.kind !== 'faultlab-teaching-scenario-draft' || !payload.spec) {
      try { sessionStorage.removeItem(TEACHING_DRAFT_KEY); } catch (e2) { /* ignore */ }
      return;
    }
    const current = String(refs.text.value || '');
    const isEmpty = current.trim().length === 0;
    const sameAsLastFill = local.teachingDraftText !== '' && current === local.teachingDraftText;
    if (!isEmpty && !sameAsLastFill) {
      if (payload.at && local.teachingDraftNotifiedAt !== payload.at) {
        local.teachingDraftNotifiedAt = payload.at;
        api.actions.toast('教学路径场景草稿待填入：导入框当前有内容未被覆盖；清空后再次从教学页生成即可填入', 'info', 6000);
      }
      return;
    }
    const specText = JSON.stringify(payload.spec, null, 2);
    refs.text.value = specText;
    local.teachingDraftText = specText;
    onTextChanged();
    parseCurrent();
    try { sessionStorage.removeItem(TEACHING_DRAFT_KEY); } catch (e3) { /* ignore */ }
    const okFilled = !!(local.parsed && local.parsed.ok);
    api.actions.toast('已从教学路径载入评测场景草稿（' + (payload.scenarioId || payload.pathId || 'teaching') + '）'
      + (okFilled ? '，校验通过' : '，校验未通过：请查看错误列表'), okFilled ? 'ok' : 'warn', 6000);
  }

  /* ===================================================================
     运行 / 导出
     =================================================================== */
  function runScenario() {
    const SC = scenarioModule();
    if (!SC) { api.toast('编排核心未就绪，无法运行场景', 'warn'); return; }
    if (!parsedOk()) { api.toast('请先通过解析校验，再运行场景', 'warn'); return; }
    local.execSeq += 1;
    const prefix = 'Scen' + String(local.execSeq).padStart(2, '0');
    let result = null;
    let err = null;
    try {
      result = SC.executeScenario(local.parsed.scenario, {
        runIdPrefix: prefix,
        createdAt: new Date().toISOString()
      });
    } catch (e) { err = e; }
    if (err || !result || !result.runs || !result.runs.length) {
      const errs = (err && err.errors) || [];
      const first = errs.length ? (errs[0].field + ' ' + errs[0].message)
        : String(err && err.message ? err.message : (err || '没有生成任何 Run'));
      local.exec = null;
      local.execError = '场景运行在执行中中断：' + first + '。本次结果未入档，现有 Run 不受影响。';
      syncAll(api.getState(), 'scenario-run');
      api.toast('场景运行失败', 'danger');
      return;
    }
    const add = api.actions.addScenarioRuns(result.runs);
    if (!add || !add.ok) {
      local.exec = null;
      local.execError = '场景 Run 入档失败（store.addScenarioRuns 拒绝）。本次结果未入档，现有 Run 不受影响。';
      syncAll(api.getState(), 'scenario-run');
      api.toast('场景 Run 入档失败', 'danger');
      return;
    }
    local.execError = '';
    local.exec = { runs: add.runs, scenarioHash: result.scenarioHash, at: new Date().toISOString() };
    syncAll(api.getState(), 'scenario-run');
    api.toast('场景运行完成：' + add.runs.length + ' 个 Run 已入档（首页「历史运行」可见）', 'ok');
  }

  function safeFilePart(s) {
    return String(s || '').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'scenario';
  }

  function exportScenario() {
    if (!parsedOk()) { api.toast('请先通过解析校验，再导出场景', 'warn'); return; }
    let ok = false;
    try {
      const text = JSON.stringify(local.parsed.scenario, null, 2);
      const sid = safeFilePart(local.parsed.scenario.scenario_id ||
        ('hash-' + String(local.scenarioHash || '').slice(0, 8)));
      const exporter = FL.exporter;
      const stamp = (exporter && exporter._helpers && typeof exporter._helpers.stamp === 'function')
        ? exporter._helpers.stamp() : String(Date.now());
      const name = 'FaultLab_scenario_' + sid + '_' + stamp + '.json';
      ok = exporter.download(name, text, 'application/json;charset=utf-8');
    } catch (e) {
      ok = false;
    }
    if (ok) api.toast('已导出场景 JSON：再导入可复现同一内容哈希', 'ok');
    else api.toast('导出失败：浏览器未允许下载', 'danger');
  }

  /* ===================================================================
     render
     =================================================================== */
  function syncAll(state, reason) {
    if (!local.built) return;
    local.coreReady = scenarioReady();
    const ok = parsedOk();

    refs.parseBtn.disabled = !local.coreReady;
    refs.runBtn.disabled = !local.coreReady || !ok;
    refs.exportBtn.disabled = !ok;
    refs.runBtn.querySelector('span').textContent = ok
      ? '运行场景 · ' + local.parsed.scenario.events.length + ' Run' : '运行场景';

    renderHero();
    renderVerdict();
    refs.seqPanel.hidden = !ok;
    if (ok) renderSequence();
    refs.resultsPanel.hidden = !local.exec && !local.execError;
    renderResults();
  }

  function renderHero() {
    let text = '未导入';
    let tone = 'neutral';
    if (local.exec) {
      text = '已运行 · ' + local.exec.runs.length + ' Run';
      tone = 'acc';
    } else if (parsedOk()) {
      text = '校验通过 · ' + local.parsed.scenario.events.length + ' 事件';
      tone = 'ok';
    } else if (local.parsed && !local.parsed.ok) {
      text = '校验未通过 · ' + local.parsed.errors.length + ' 条错误';
      tone = 'danger';
    }
    refs.heroStatus.textContent = text;
    refs.heroStatus.setAttribute('data-tone', tone);
  }

  function renderVerdict() {
    if (local.parsed && !local.parsed.ok) {
      ui.clear(refs.verdict);
      const errors = local.parsed.errors || [];
      const box = h('div', { class: 'scn-errors', 'data-testid': 'scenario-errors' }, [
        h('div', { class: 'notice', 'data-tone': 'danger' }, [
          ui.icon('warning', { size: 14 }),
          h('span', {}, '场景校验未通过（' + errors.length + ' 条）：未创建运行，现有 Run 不变；按下列条目修正后重新解析。')
        ]),
        h('ul', { class: 'scn-error-list' }, [])
      ]);
      const ul = box.querySelector('ul');
      errors.slice(0, MAX_ERROR_ROWS).forEach((e) => {
        ul.appendChild(h('li', { class: 'scn-error-item' }, [
          h('span', { class: 'scn-error-field mono' }, e.field || 'scenario'),
          h('span', { class: 'scn-error-msg' }, e.message || String(e))
        ]));
      });
      if (errors.length > MAX_ERROR_ROWS) {
        ul.appendChild(h('li', { class: 'scn-error-item scn-error-more' },
          '……另有 ' + (errors.length - MAX_ERROR_ROWS) + ' 条'));
      }
      refs.verdict.appendChild(box);
      return;
    }
    if (!local.hasText && !local.parsed) {
      ui.clear(refs.verdict);
      refs.verdict.appendChild(h('div', { class: 'scn-verdict-empty' }, [
        ui.icon('info', { size: 13 }),
        h('span', {}, '尚无场景：粘贴 JSON、选择文件，或载入三系统样例之一。')
      ]));
      return;
    }
    if (parsedOk()) {
      ui.clear(refs.verdict);
      const warn = (local.parsed.warnings || []);
      if (warn.length) {
        refs.verdict.appendChild(h('div', { class: 'notice', 'data-tone': 'warn' }, [
          ui.icon('warning', { size: 14 }),
          h('span', {}, warn.map((w) => (w.field ? w.field + ' ' : '') + w.message).join('；'))
        ]));
      } else {
        refs.verdict.appendChild(h('div', { class: 'hint-row' }, [
          ui.icon('check', { size: 13 }),
          h('span', {}, '校验通过：事件卡序列见下方「只读事件序列」，可运行或导出。')
        ]));
      }
      return;
    }
    ui.clear(refs.verdict);
  }

  function renderSequence() {
    const s = local.parsed.scenario;
    ui.clear(refs.seqMeta);
    refs.seqMeta.appendChild(ui.chip(systemTitle(s.system) + '（' + s.system + '）', { tone: 'neutral' }));
    refs.seqMeta.appendChild(ui.chip('version ' + s.version, { tone: 'neutral' }));
    refs.seqMeta.appendChild(ui.chip('事件 ' + s.events.length + ' / 上限 ' +
      (scenarioModule() ? scenarioModule().MAX_EVENTS : 12), { tone: 'neutral' }));
    if (s.scenario_id) refs.seqMeta.appendChild(ui.chip('scenario_id ' + s.scenario_id, { tone: 'info' }));
    if (s.label) refs.seqMeta.appendChild(ui.chip(s.label, { tone: 'acc' }));

    ui.clear(refs.seqHash);
    refs.seqHash.appendChild(h('span', { class: 'eyebrow' }, '场景内容哈希'));
    refs.seqHash.appendChild(h('span', { class: 'mono scn-hash-val' },
      local.scenarioHash ? String(local.scenarioHash) : '—'));
    refs.seqHash.appendChild(h('span', { class: 'muted small' },
      '内容校验和：仅证明内容一致性，不代表签名/来源/第三方认证。'));

    ui.clear(refs.seqList);
    s.events.forEach((ev, i) => refs.seqList.appendChild(renderEventCard(s, ev, i)));
  }

  function renderEventCard(s, ev, i) {
    const def = faultDef(s.system, ev.family);
    const chips = [
      ui.badge(familyLabel(s.system, ev.family), { tone: 'danger', title: '故障族 ' + ev.family }),
      ui.chip(modeLabel(ev.feedback_mode), { tone: ev.feedback_mode === 'monitor' ? 'neutral' : 'acc' }),
      ui.chip('注入 ' + fmt().time(ev.t_start_s), { title: 't_start_s = ' + ev.t_start_s + ' s' })
    ];
    if (typeof ev.t_clear_s === 'number') {
      chips.push(ui.chip('清除 ' + fmt().time(ev.t_clear_s), { title: 't_clear_s = ' + ev.t_clear_s + ' s' }));
    }
    const paramChips = Object.keys(ev.params || {}).map((k) => {
      const p = def && def.params ? def.params.filter((pp) => pp.key === k)[0] : null;
      const label = p && p.label ? p.label : k;
      const unit = p && p.unit ? p.unit : '';
      return ui.chip(label + ' ' + fmt().unit(ev.params[k], unit, p && p.precision != null ? p.precision : 2),
        { tone: 'neutral', title: k + ' = ' + ev.params[k] + (unit ? ' ' + unit : '') });
    });
    return h('article', { class: 'scn-event', dataset: { eventKey: ev.key } }, [
      h('span', { class: 'scn-event-idx mono' }, String(i + 1).padStart(2, '0')),
      h('div', { class: 'scn-event-main' }, [
        h('div', { class: 'scn-event-top' }, [
          h('span', { class: 'mono scn-event-key' }, ev.key),
          ev.label ? h('span', { class: 'scn-event-label' }, ev.label) : null
        ]),
        h('div', { class: 'scn-event-chips' }, chips),
        paramChips.length ? h('div', { class: 'scn-params' }, paramChips) : null
      ])
    ]);
  }

  function renderResults() {
    ui.clear(refs.resultsList);
    if (local.execError) {
      refs.resultsHead.textContent = '';
      refs.resultsList.appendChild(h('div', { class: 'notice', 'data-tone': 'danger' }, [
        ui.icon('warning', { size: 14 }),
        h('span', {}, local.execError)
      ]));
      return;
    }
    if (!local.exec) {
      refs.resultsHead.textContent = '';
      refs.resultsList.appendChild(ui.emptyState({
        icon: 'board',
        title: '还没有场景运行结果',
        desc: '解析通过后点击「运行场景」；每个事件生成一个标准 Run，结果同时进入首页「历史运行」。'
      }));
      return;
    }
    refs.resultsHead.textContent = '共 ' + local.exec.runs.length + ' 个 Run · 内容哈希 ' +
      fmt().hash(local.exec.scenarioHash || '');
    local.exec.runs.forEach((run, i) => refs.resultsList.appendChild(renderRunRow(run, i)));
  }

  function renderRunRow(run, i) {
    const ev = (local.parsed && local.parsed.ok && local.parsed.scenario.events[i]) || null;
    const metrics = pickMetrics(run, ev);
    const metricNodes = metrics.map((m) => h('span', { class: 'scn-metric' }, [
      h('span', { class: 'scn-metric-k' }, m.label || m.metric_id),
      h('span', { class: 'mono scn-metric-v' }, metricText(m))
    ]));
    return h('div', { class: 'scn-run', dataset: { runId: run.runId } }, [
      h('span', { class: 'scn-run-id mono' }, h('b', {}, run.runId)),
      h('div', { class: 'scn-run-ev' }, [
        h('span', { class: 'mono scn-run-key' }, ev ? ev.key : '—'),
        h('span', { class: 'scn-run-label' }, (ev && ev.label) || run.label || '')
      ]),
      h('span', { class: 'scn-run-family' }, ui.badge(
        familyLabel(run.systemId, ev ? ev.family : (run.config.fault ? run.config.fault.family : '')),
        { tone: 'danger' })),
      h('span', { class: 'scn-run-mode' }, ui.chip(modeLabel(run.config.feedback_mode),
        { tone: run.config.feedback_mode === 'monitor' ? 'neutral' : 'acc' })),
      h('div', { class: 'scn-run-metrics' }, metricNodes),
      h('span', { class: 'scn-run-hash mono', title: 'config_hash ' + (run.configHash || '') },
        fmt().hash(run.configHash || '')),
      h('span', { class: 'scn-run-actions' }, [
        h('button', {
          class: 'btn btn-xs', type: 'button',
          title: '在系统页按原数据查看该 Run；曲线 / 因果 / 对比页共享同一 Run。',
          on: { click: () => { api.actions.loadRun(run.runId); } }
        }, [h('span', {}, '载入查看'), ui.icon('arrow-right', { size: 11 })])
      ])
    ]);
  }

  /* ===================================================================
     update / page module
     =================================================================== */
  function update(state, reason) {
    if (!local.built) return;
    // 场景页不依赖全局仿真时间；播放/时间/全局 toast 更新时跳过，避免每帧重排 DOM。
    if (reason === 'time' || reason === 'playback' || reason === 'toast') return;
    // 教学路径草稿读取入口（登记见文件头）：在导航/草稿等非时间轴更新时检查一次。
    maybeConsumeTeachingDraft();
    syncAll(state, reason || 'update');
  }

  pages.scenario = {
    id: 'scenario',
    label: '场景编排',
    navLabel: '场景',
    mount: mount,
    update: update
  };
})();
