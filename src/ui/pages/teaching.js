/* owner: teaching-ui | module: page-teaching | contract: FaultLab-evaluation/NEXT/V070_WAVE_DESIGN.md DEC-5（C-3 最小形态·UI 接线，CHG-20261104-10）
   =========================================================================
   教学路径引导页（页面键 teaching，导航 08）：
   - 数据源：FL.core.teaching.getTeachingPaths()（src/core/teaching.js，8 条预设 × 固定 5 步：
     FL/FC/GT/WT 主线 + GT/FL 跨深度扩展 + WT 阵风——v0.8.0 UI 接线路 CHG-20261107-01，
     第 8 条 MG-001 平衡重整 = V130 DEC-3 CHG-20261113-04 additive，
     路径数据事实源在 src/core/teaching.js PATHS，本页只渲染）；
     DEC-5：注入→闭环观察→仅监测对照→因果→评测入口；本页零新执行语义（I-6）；
   - 路径选择：预设卡（pathId / title / system / goal / prerequisites）；
   - 步骤卡：narrative（教学叙述）+ compare（可选对照视角）+ view.focus（焦点说明）；
     「进入视图」= 按 step.view.page 深链跳转既有页面，并以 toast 提示焦点说明
     （view.focus 是给读者的「看什么」文字说明，不解析为 DOM 选择器——不触碰目标页语义）；
   - 第⑤步「生成评测场景」：把 step.scenarioSpec 写入 sessionStorage 草稿
     （键 = DRAFT_KEY，场景编排页按同一键做最小读取），然后跳转 scenario 页；
     场景执行一律由场景编排页复用 FL.core.scenario 原语（parseScenario / executeScenario）；
   - 文案护栏：UI_COPY_GUARDRAILS §6（tools/copy-guard.mjs 33 模式零命中）；
     教学叙述文案事实源在 src/core/teaching.js（tests/teaching.test.js D 节做禁词子串自检）；
   - 零构建 ES2020、零依赖经典脚本 IIFE；依赖装载顺序：src/core/teaching.js 在本模块之前
     （index.html 由本接线轮写入：scenario.js → teaching.js → 各页面模块）。
   ========================================================================= */
(function () {
  'use strict';
  const FL = window.FL = window.FL || {};
  const pages = FL.pages = FL.pages || {};

  /* 与 src/ui/pages/scenario.js 的读取键为同一字面量（跨文件镜像，改动须两处同步） */
  const DRAFT_KEY = 'faultlab.teaching.scenarioDraft.v1';
  const STEP_INDEX_LABELS = ['01', '02', '03', '04', '05'];

  let api = null;
  let ui = null;
  let h = null;
  const refs = {};
  const local = {
    built: false,
    paths: null,          // getTeachingPaths() 深克隆副本
    selectedPathId: null
  };

  function teachingModule() {
    return (FL.core && FL.core.teaching && typeof FL.core.teaching.getTeachingPaths === 'function')
      ? FL.core.teaching : null;
  }

  function systemTitle(systemId) {
    try {
      const sys = FL.systems.get(systemId);
      if (sys) return sys.title || systemId;
    } catch (e) { /* ignore */ }
    return systemId;
  }

  function pageLabelOf(pageId) {
    try {
      const def = FL.pages && FL.pages[pageId];
      if (def && def.label) return def.label;
    } catch (e) { /* ignore */ }
    return pageId;
  }

  /* ===================================================================
     深链 / 场景草稿
     =================================================================== */
  function enterView(step) {
    if (!step || !step.view || !step.view.page) return;
    api.navigate(step.view.page);
    const focus = step.view.focus ? '：' + step.view.focus : '';
    /* api.toast 只转发 (message, tone)；带 ttl 的提示走 api.actions.toast（store 全签名） */
    api.actions.toast('已打开' + pageLabelOf(step.view.page) + focus, 'info', 6000);
  }

  function generateScenario(path, step) {
    if (!step || !step.scenarioSpec) { api.toast('该路径第⑤步没有预置场景', 'warn'); return; }
    const payload = {
      kind: 'faultlab-teaching-scenario-draft',
      version: 1,
      pathId: path.pathId,
      pathTitle: path.title,
      scenarioId: step.scenarioSpec.scenario_id || '',
      spec: step.scenarioSpec,
      at: new Date().toISOString()
    };
    let stored = false;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      stored = true;
    } catch (e) { stored = false; }
    if (!stored) {
      api.toast('会话草稿写入失败（浏览器限制）：未跳转，可改在场景编排页手动导入场景 JSON', 'danger');
      return;
    }
    api.toast('已生成评测场景草稿（' + (payload.scenarioId || path.pathId) + '）：打开场景编排页后自动填入', 'ok');
    api.navigate('scenario');
  }

  function selectPath(pathId) {
    local.selectedPathId = pathId;
    renderSelection();
  }

  function backToPaths() {
    local.selectedPathId = null;
    renderSelection();
  }

  /* ===================================================================
     mount / build
     =================================================================== */
  function mount(rootEl, pageApi) {
    api = pageApi;
    ui = api.ui;
    h = api.ui.h;

    const root = h('div', { class: 'pg-teaching page-pad' });
    rootEl.appendChild(root);
    refs.root = root;

    root.appendChild(buildHero());

    refs.moduleNotice = h('div', { class: 'tea-module-notice' });
    root.appendChild(refs.moduleNotice);

    refs.pathsPanel = buildPathsPanel();
    root.appendChild(refs.pathsPanel);
    refs.stepsPanel = buildStepsPanel();
    root.appendChild(refs.stepsPanel);

    root.appendChild(h('footer', { class: 'tea-foot' }, [
      h('span', { class: 'eyebrow' }, 'FAULTLAB · C-3'),
      h('span', {}, '教学路径为预设引导内容：解释运行前注入的已知故障的传播路径，不做检测/定位/诊断；场景执行复用场景编排页既有语义，本页不创建运行。'),
      h('span', { class: 'tea-foot-ver mono' }, 'teaching_page 0.1')
    ]));

    local.built = true;
    syncAll('mount');
  }

  function buildHero() {
    refs.heroStatus = h('span', { class: 'badge', 'data-tone': 'neutral' }, '未选择路径');
    /* 路径计数徽章挂 ref：syncAll 装载 paths 后按实际条数刷新（数据事实源
       src/core/teaching.js PATHS，页面不写死条数——v0.8.0 五系统接线路）。 */
    refs.heroCount = ui.badge('预设教学路径 × 5 步', { tone: 'info' });
    return h('header', { class: 'tea-hero' }, [
      h('div', { class: 'tea-hero-main' }, [
        h('div', { class: 'eyebrow' }, 'C-3 · TEACHING PATHS'),
        h('h1', { class: 'tea-title' }, ['教学', h('em', {}, '路径')]),
        h('p', { class: 'tea-sub' },
          '预设教学路径（FL-001 / FC-001 / GT-001 / WT-001 主线 + GT/FL 跨模型深度扩展，每条固定 5 步）：' +
          '先在运行前配置里注入已知故障，再依次观察闭环响应、对照仅监测模式、读取因果解释，最后进入评测入口。' +
          '页面结论只在本演示假设内成立。'),
        h('div', { class: 'tea-hero-tags' }, [
          refs.heroCount,
          ui.badge('视图深链', { tone: 'neutral' }),
          ui.badge('零新执行语义', { tone: 'acc' })
        ])
      ]),
      h('div', { class: 'tea-hero-side' }, [refs.heroStatus])
    ]);
  }

  function buildPathsPanel() {
    refs.pathCards = h('div', { class: 'tea-paths', 'data-testid': 'teaching-path-cards' });
    return h('section', { class: 'fl-panel tea-paths-panel' }, [
      h('div', { class: 'panel-head' }, [
        h('div', { class: 'panel-head-main' }, [
          h('span', { class: 'eyebrow' }, 'PATHS'),
          h('span', { class: 'panel-title' }, '选择一条教学路径'),
          h('span', { class: 'panel-sub' }, '预设路径各绑定一个系统，固定 5 步（DEC-5 模板）')
        ]),
        ui.badge('schema v' + (function () {
          const T = teachingModule();
          return T ? String(T.PATH_SCHEMA_VERSION) : '?';
        })(), { tone: 'neutral' })
      ]),
      h('div', { class: 'panel-body' }, [refs.pathCards])
    ]);
  }

  function buildStepsPanel() {
    refs.stepsBack = h('button', {
      class: 'btn btn-ghost btn-xs', type: 'button',
      on: { click: backToPaths }
    }, [ui.icon('chevron-down', { size: 11 }), h('span', {}, '返回路径选择')]);

    refs.stepsMeta = h('div', { class: 'tea-steps-meta' });
    refs.stepsList = h('div', { class: 'tea-steps', 'data-testid': 'teaching-steps' });

    return h('section', { class: 'fl-panel tea-steps-panel', hidden: true }, [
      h('div', { class: 'panel-head' }, [
        h('div', { class: 'panel-head-main' }, [
          refs.stepsBack,
          h('span', { class: 'eyebrow' }, 'STEPS'),
          h('span', { class: 'panel-title', 'data-testid': 'teaching-steps-title' }, '步骤卡')
        ]),
        h('span', { class: 'badge', 'data-tone': 'acc' }, '固定 5 步')
      ]),
      h('div', { class: 'panel-body tea-steps-body' }, [refs.stepsMeta, refs.stepsList])
    ]);
  }

  /* ===================================================================
     render
     =================================================================== */
  function syncAll(reason) {
    if (!local.built) return;
    const T = teachingModule();
    ui.clear(refs.moduleNotice);
    if (!T) {
      refs.moduleNotice.appendChild(h('div', { class: 'notice', 'data-tone': 'danger' }, [
        ui.icon('warning', { size: 14 }),
        h('span', {}, '教学路径核心未装载（FL.core.teaching 缺失）：请检查 index.html 脚本顺序（src/core/teaching.js 须在本页面模块之前）。')
      ]));
      refs.pathsPanel.hidden = true;
      refs.stepsPanel.hidden = true;
      return;
    }
    if (!local.paths) {
      local.paths = T.getTeachingPaths();
    }
    if (refs.heroCount) refs.heroCount.textContent = '预设 ' + local.paths.length + ' 路径 × 5 步';
    renderSelection();
  }

  function renderSelection() {
    const selected = selectedPath();
    refs.heroStatus.textContent = selected ? ('进行中 · ' + selected.title) : '未选择路径';
    refs.heroStatus.setAttribute('data-tone', selected ? 'acc' : 'neutral');
    refs.pathsPanel.hidden = !!selected;
    refs.stepsPanel.hidden = !selected;
    if (selected) renderSteps(selected);
    else renderPathCards();
  }

  function selectedPath() {
    if (!local.paths || !local.selectedPathId) return null;
    for (let i = 0; i < local.paths.length; i++) {
      if (local.paths[i].pathId === local.selectedPathId) return local.paths[i];
    }
    return null;
  }

  function renderPathCards() {
    ui.clear(refs.pathCards);
    (local.paths || []).forEach((p) => {
      refs.pathCards.appendChild(h('button', {
        class: 'fl-card fl-card--selectable fl-card--hover tea-path-card', type: 'button',
        dataset: { pathId: p.pathId }, 'data-testid': 'teaching-path-card',
        on: { click: () => selectPath(p.pathId) }
      }, [
        h('div', { class: 'tea-path-top' }, [
          ui.chip(systemTitle(p.system) + '（' + p.system + '）', { tone: 'neutral' }),
          ui.chip('5 步', { tone: 'info' })
        ]),
        h('div', { class: 'tea-path-title' }, p.title),
        h('div', { class: 'tea-path-goal' }, p.goal),
        h('div', { class: 'tea-path-prereq' }, [
          h('span', { class: 'eyebrow' }, '前置'),
          h('span', {}, p.prerequisites)
        ]),
        h('div', { class: 'tea-path-cta' }, [
          h('span', {}, '进入路径'),
          ui.icon('arrow-right', { size: 12 })
        ])
      ]));
    });
  }

  function renderSteps(path) {
    const titleEl = refs.stepsPanel.querySelector('[data-testid="teaching-steps-title"]');
    if (titleEl) titleEl.textContent = path.title;

    ui.clear(refs.stepsMeta);
    refs.stepsMeta.appendChild(ui.chip(systemTitle(path.system) + '（' + path.system + '）', { tone: 'neutral' }));
    refs.stepsMeta.appendChild(ui.chip('pathId ' + path.pathId, { tone: 'info' }));
    refs.stepsMeta.appendChild(ui.chip('目标：' + path.goal, { tone: 'acc' }));
    refs.stepsMeta.appendChild(ui.chip('前置：' + path.prerequisites, { tone: 'neutral' }));

    ui.clear(refs.stepsList);
    (path.steps || []).forEach((step, i) => {
      refs.stepsList.appendChild(renderStepCard(path, step, i));
    });
  }

  function renderStepCard(path, step, i) {
    const isEvalStep = i === 4 && !!step.scenarioSpec;
    const actions = [
      h('button', {
        class: 'btn btn-ghost btn-sm', type: 'button', 'data-testid': 'teaching-step-view',
        title: '深链跳转到' + pageLabelOf(step.view ? step.view.page : '') + '，并提示本步的视图焦点',
        on: { click: () => enterView(step) }
      }, [ui.icon('external', { size: 13 }), h('span', {}, '进入视图')])
    ];
    if (isEvalStep) {
      actions.push(h('button', {
        class: 'btn btn-primary btn-sm', type: 'button', 'data-testid': 'teaching-step-generate',
        title: '把第⑤步预置场景写入会话草稿，并打开场景编排页（校验通过后可运行）',
        on: { click: () => generateScenario(path, step) }
      }, [ui.icon('flask', { size: 13 }), h('span', {}, '生成评测场景')]));
    }

    const blocks = [
      h('div', { class: 'tea-step-head' }, [
        h('span', { class: 'tea-step-idx mono' }, STEP_INDEX_LABELS[i] || String(i + 1)),
        h('div', { class: 'tea-step-head-main' }, [
          h('span', { class: 'tea-step-title' }, step.title),
          h('span', { class: 'mono tea-step-id' }, step.id)
        ])
      ]),
      h('p', { class: 'tea-narrative' }, step.narrative)
    ];
    if (step.view && step.view.focus) {
      blocks.push(h('div', { class: 'tea-focus hint-row' }, [
        ui.icon('target', { size: 13 }),
        h('span', {}, [
          h('b', { class: 'tea-focus-k' }, '视图焦点（' + pageLabelOf(step.view.page) + '）'),
          h('span', { class: 'tea-focus-text' }, step.view.focus)
        ])
      ]));
    }
    if (step.compare) {
      blocks.push(h('div', { class: 'tea-compare' }, [
        h('div', { class: 'tea-compare-label' }, [
          ui.icon('compare', { size: 12 }),
          h('span', {}, step.compare.label || '对照视角')
        ]),
        h('p', { class: 'tea-compare-text' }, step.compare.text)
      ]));
    }
    blocks.push(h('div', { class: 'tea-step-actions' }, actions));

    return h('article', { class: 'tea-step' + (isEvalStep ? ' tea-step--eval' : ''), dataset: { stepId: step.id } }, blocks);
  }

  /* ===================================================================
     page module
     =================================================================== */
  pages.teaching = {
    id: 'teaching',
    label: '教学路径',
    navLabel: '教学',
    mount: mount
  };
})();
