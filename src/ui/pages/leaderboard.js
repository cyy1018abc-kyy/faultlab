/* owner: leaderboard-ui | module: page-leaderboard | contract: FaultLab-evaluation/NEXT/V070_WAVE_DESIGN.md DEC-6（C-4 最小形态·只读 UI 视图，CHG-20261104-10）
   =========================================================================
   本地排行榜页（页面键 leaderboard，导航 09，EXT 扩展预览）：
   - 数据源：tools/leaderboard.mjs 产物 leaderboard.json（schema faultlab.leaderboard.v1），
     文件输入导入；本页只读展示，不在浏览器里复算评分（评分单源在成绩单落章链路）；
   - 排序即文件序：entries 顺序与 rank 由 CLI 聚合排序产出，本页按原序渲染，不做二次排序；
   - 列：排名 / 参与者 / 平均分 / 场次 / 轮次 / 备注（备注 = 参与者 id 解析来源，
     单轮最佳/最差与场次目录放 title 提示）；固定措辞「合成场景评测游戏，非真实诊断性能」常驻；
   - 无数据空态；导入失败给字段级错误列表，未通过前不渲染排行表；
   - 纯本地文件（I-1）：不上传、不做 localStorage 以外的持久化、零第三方依赖；
   - 文案护栏：UI_COPY_GUARDRAILS §6（tools/copy-guard.mjs 33 模式零命中）；
   - 零构建 ES2020、零依赖经典脚本 IIFE。
   ========================================================================= */
(function () {
  'use strict';
  const FL = window.FL = window.FL || {};
  const pages = FL.pages = FL.pages || {};

  /* 与 tools/leaderboard.mjs 输出契约同源（SCHEMA_LEADERBOARD / NOTICE）；
     CLI 常量为 ESM 导出，浏览器页不 import——此处镜像字面量并注明事实源。 */
  const SCHEMA_LEADERBOARD = 'faultlab.leaderboard.v1';
  const NOTICE = '合成场景评测游戏，非真实诊断性能';
  /* tools/leaderboard.mjs SOURCE_LABELS 同表镜像 */
  const SOURCE_LABELS = { report: 'id 内嵌于成绩单', submission: 'id 取自配对提交' };
  const MAX_ERROR_ROWS = 12;

  let api = null;
  let ui = null;
  let h = null;
  const refs = {};
  const local = {
    built: false,
    data: null,        // 已通过校验的 leaderboard.json 本体
    fileName: '',
    errors: null       // 最近一次导入失败的错误列表（字符串数组）
  };

  function isFiniteNum(v) { return typeof v === 'number' && isFinite(v); }
  function fmtScore(v) { return isFiniteNum(v) ? v.toFixed(1) : '—'; }

  /* ===================================================================
     校验（结构门；不复算、不改排序）
     =================================================================== */
  function validate(data) {
    const errors = [];
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { ok: false, errors: ['顶层不是 JSON 对象'] };
    }
    if (data.schema !== SCHEMA_LEADERBOARD) {
      errors.push('schema 缺失或非 ' + SCHEMA_LEADERBOARD + '（实际读到 ' + JSON.stringify(data.schema) + '）');
    }
    if (!Array.isArray(data.entries) || !data.entries.length) {
      errors.push('entries 缺失/非数组/为空：没有可展示的排行条目');
    } else {
      data.entries.forEach((e, i) => {
        if (!e || typeof e !== 'object' || Array.isArray(e)) {
          errors.push('entries[' + i + '] 不是对象');
          return;
        }
        if (typeof e.participant !== 'string' || !e.participant.trim()) {
          errors.push('entries[' + i + '].participant 缺失或非非空字符串');
        }
        if (!isFiniteNum(e.avg_score)) errors.push('entries[' + i + '].avg_score 缺失或不可解析（数值）');
        if (!isFiniteNum(e.sessions)) errors.push('entries[' + i + '].sessions 缺失或不可解析（数值）');
        if (!isFiniteNum(e.rounds)) errors.push('entries[' + i + '].rounds 缺失或不可解析（数值）');
      });
    }
    return { ok: errors.length === 0, errors: errors };
  }

  function importText(text) {
    let data = null;
    try { data = JSON.parse(String(text || '')); } catch (e) {
      local.data = null;
      local.errors = ['JSON 解析失败：' + e.message];
      syncAll('leaderboard-import');
      return;
    }
    const v = validate(data);
    if (!v.ok) {
      local.data = null;
      local.errors = v.errors;
      syncAll('leaderboard-import');
      return;
    }
    local.data = data;
    local.errors = null;
    syncAll('leaderboard-import');
  }

  function clearImport() {
    local.data = null;
    local.errors = null;
    local.fileName = '';
    if (refs.fileInput) refs.fileInput.value = '';
    syncAll('leaderboard-clear');
  }

  /* ===================================================================
     mount / build
     =================================================================== */
  function mount(rootEl, pageApi) {
    api = pageApi;
    ui = api.ui;
    h = api.ui.h;

    const root = h('div', { class: 'pg-leaderboard page-pad' });
    rootEl.appendChild(root);
    refs.root = root;

    root.appendChild(buildHero());
    root.appendChild(buildImport());
    refs.metaPanel = buildMeta();
    root.appendChild(refs.metaPanel);
    refs.tablePanel = buildTable();
    root.appendChild(refs.tablePanel);
    root.appendChild(h('footer', { class: 'lb-foot' }, [
      h('span', { class: 'eyebrow' }, 'FAULTLAB · C-4 · EXT'),
      h('span', {}, '排行榜为本地聚合视图：数据来自 tools/leaderboard.mjs 对已落章成绩单的聚合，本页只读展示、不复算评分；成绩单字段事实源为 arena 评分协议。'),
      h('span', { class: 'lb-foot-ver mono' }, 'leaderboard_page 0.1')
    ]));

    local.built = true;
    syncAll('mount');
  }

  function buildHero() {
    refs.heroStatus = h('span', { class: 'badge', 'data-tone': 'neutral' }, '未导入');
    return h('header', { class: 'lb-hero' }, [
      h('div', { class: 'lb-hero-main' }, [
        h('div', { class: 'eyebrow' }, 'C-4 · LOCAL LEADERBOARD'),
        h('h1', { class: 'lb-title' }, ['本地', h('em', {}, '排行榜')]),
        h('p', { class: 'lb-sub' },
          '导入 tools/leaderboard.mjs 生成的 leaderboard.json，只读展示按参与者聚合的排行表' +
          '（场次数、轮次数、平均分均值）。本页不在浏览器里复算评分，也不改动文件序与排名。'),
        h('div', { class: 'lb-hero-tags' }, [
          ui.badge('只读视图', { tone: 'info' }),
          ui.badge('扩展预览 · 合成场景', { tone: 'neutral' }),
          ui.badge('schema faultlab.leaderboard.v1', { tone: 'neutral' }),
          ui.badge('纯本地文件', { tone: 'acc' })
        ])
      ]),
      h('div', { class: 'lb-hero-side' }, [refs.heroStatus])
    ]);
  }

  function buildImport() {
    refs.fileInput = h('input', {
      type: 'file', accept: '.json,application/json', class: 'lb-file-input',
      on: {
        change: () => {
          const f = refs.fileInput.files && refs.fileInput.files[0];
          if (!f) return;
          local.fileName = f.name;
          const reader = new FileReader();
          reader.onload = () => importText(String(reader.result || ''));
          reader.onerror = () => {
            local.data = null;
            local.errors = ['文件读取失败：请重试。'];
            syncAll('leaderboard-file');
          };
          reader.readAsText(f, 'utf-8');
          refs.fileInput.value = '';
        }
      }
    });

    refs.clearBtn = h('button', {
      class: 'btn btn-ghost btn-sm', type: 'button',
      on: { click: clearImport }
    }, [ui.icon('x', { size: 13 }), h('span', {}, '清空')]);

    refs.verdict = h('div', { class: 'lb-verdict', 'data-testid': 'leaderboard-verdict' });

    return h('section', { class: 'fl-panel lb-import' }, [
      h('div', { class: 'panel-head' }, [
        h('div', { class: 'panel-head-main' }, [
          h('span', { class: 'eyebrow' }, 'IMPORT'),
          h('span', { class: 'panel-title' }, '导入 leaderboard.json'),
          h('span', { class: 'panel-sub' }, 'tools/leaderboard.mjs 产物（node tools/leaderboard.mjs --out out）')
        ]),
        ui.badge('schema faultlab.leaderboard.v1', { tone: 'neutral' })
      ]),
      h('div', { class: 'panel-body lb-import-body' }, [
        h('div', { class: 'lb-import-actions' }, [
          h('label', { class: 'btn btn-ghost btn-sm lb-file-label' }, [
            ui.icon('external', { size: 13 }), h('span', {}, '选择 JSON 文件'), refs.fileInput
          ]),
          refs.clearBtn
        ]),
        h('div', { class: 'hint-row' }, [
          ui.icon('info', { size: 13 }),
          h('span', {}, '导入后按文件内 entries 原序渲染；校验失败时逐条给出字段级错误，未通过前不渲染排行表。')
        ]),
        refs.verdict
      ])
    ]);
  }

  function buildMeta() {
    refs.metaChips = h('div', { class: 'lb-meta', 'data-testid': 'leaderboard-meta' });
    refs.metaFileName = h('span', { class: 'panel-sub' });
    return h('section', { class: 'fl-panel lb-meta-panel', hidden: true }, [
      h('div', { class: 'panel-head' }, [
        h('div', { class: 'panel-head-main' }, [
          h('span', { class: 'eyebrow' }, 'SOURCE'),
          h('span', { class: 'panel-title' }, '数据来源'),
          refs.metaFileName
        ]),
        h('span', { class: 'badge', 'data-tone': 'ok' }, '校验通过')
      ]),
      h('div', { class: 'panel-body' }, [
        refs.metaChips,
        h('div', { class: 'lb-notice notice', 'data-tone': 'info', 'data-testid': 'leaderboard-notice' }, [
          ui.icon('info', { size: 14 }),
          h('span', {}, NOTICE)
        ])
      ])
    ]);
  }

  function buildTable() {
    refs.tableWrap = h('div', { class: 'lb-table-wrap', 'data-testid': 'leaderboard-table' });
    refs.tableSub = h('span', { class: 'panel-sub' });
    return h('section', { class: 'fl-panel lb-table-panel', hidden: true }, [
      h('div', { class: 'panel-head' }, [
        h('div', { class: 'panel-head-main' }, [
          h('span', { class: 'eyebrow' }, 'RANKING'),
          h('span', { class: 'panel-title' }, '排行表（只读）'),
          refs.tableSub
        ]),
        h('span', { class: 'badge', 'data-tone': 'acc' }, '文件序渲染')
      ]),
      h('div', { class: 'panel-body' }, [refs.tableWrap])
    ]);
  }

  /* ===================================================================
     render
     =================================================================== */
  function syncAll() {
    if (!local.built) return;
    renderHero();
    renderVerdict();
    const hasData = !!local.data;
    refs.metaPanel.hidden = !hasData;
    refs.metaFileName.textContent = local.fileName ? ('文件 ' + local.fileName) : '';
    refs.tablePanel.hidden = !hasData;
    if (hasData) {
      renderMeta();
      renderTable();
    }
  }

  function renderHero() {
    let text = '未导入';
    let tone = 'neutral';
    if (local.data) {
      text = '已导入 · ' + local.data.entries.length + ' 名参与者';
      tone = 'ok';
    } else if (local.errors) {
      text = '校验未通过 · ' + local.errors.length + ' 条错误';
      tone = 'danger';
    }
    refs.heroStatus.textContent = text;
    refs.heroStatus.setAttribute('data-tone', tone);
  }

  function renderVerdict() {
    ui.clear(refs.verdict);
    if (local.errors && local.errors.length) {
      const box = h('div', { class: 'lb-errors', 'data-testid': 'leaderboard-errors' }, [
        h('div', { class: 'notice', 'data-tone': 'danger' }, [
          ui.icon('warning', { size: 14 }),
          h('span', {}, '排行榜校验未通过（' + local.errors.length + ' 条）：未渲染排行表，现有内容不变；请改用 tools/leaderboard.mjs 生成的文件。')
        ]),
        h('ul', { class: 'lb-error-list' }, [])
      ]);
      const ul = box.querySelector('ul');
      local.errors.slice(0, MAX_ERROR_ROWS).forEach((msg) => {
        ul.appendChild(h('li', { class: 'lb-error-item' }, String(msg)));
      });
      if (local.errors.length > MAX_ERROR_ROWS) {
        ul.appendChild(h('li', { class: 'lb-error-item lb-error-more' },
          '……另有 ' + (local.errors.length - MAX_ERROR_ROWS) + ' 条'));
      }
      refs.verdict.appendChild(box);
      return;
    }
    if (!local.data) {
      refs.verdict.appendChild(ui.emptyState({
        icon: 'board',
        title: '还没有导入排行榜',
        desc: '先在本地运行 node tools/leaderboard.mjs 聚合归档场次成绩单，再选择其产物 leaderboard.json；' +
          '本页只读展示，不在浏览器里复算评分。'
      }));
    }
  }

  function renderMeta() {
    const d = local.data;
    ui.clear(refs.metaChips);
    if (typeof d.generated_at === 'string' && d.generated_at) {
      refs.metaChips.appendChild(ui.chip('生成时间 ' + d.generated_at, { tone: 'neutral' }));
    }
    if (typeof d.scan_mode === 'string' && d.scan_mode) {
      refs.metaChips.appendChild(ui.chip('扫描方式 ' + d.scan_mode, { tone: 'neutral' }));
    }
    if (d.totals && typeof d.totals === 'object') {
      const t = d.totals;
      if (isFiniteNum(t.sessions_scanned)) refs.metaChips.appendChild(ui.chip('场次 ' + t.sessions_scanned, { tone: 'info' }));
      if (isFiniteNum(t.reports_valid) && isFiniteNum(t.reports_found)) {
        refs.metaChips.appendChild(ui.chip('成绩单有效 ' + t.reports_valid + ' / 共 ' + t.reports_found, { tone: 'info' }));
      }
      if (isFiniteNum(t.participants)) refs.metaChips.appendChild(ui.chip('参与者 ' + t.participants, { tone: 'acc' }));
    }
    if (typeof d.notice === 'string' && d.notice && d.notice !== NOTICE) {
      refs.metaChips.appendChild(ui.chip('文件 notice：' + d.notice, { tone: 'warn' }));
    }
    renderSkippedChip(d);
  }

  function renderSkippedChip(d) {
    const skipped = d.skipped;
    if (!skipped || typeof skipped !== 'object' || !isFiniteNum(skipped.total) || skipped.total <= 0) return;
    const files = Array.isArray(skipped.files) ? skipped.files : [];
    const tip = files.slice(0, 5).map((f) =>
      (f && f.session ? f.session : '') + '/' + (f && f.file ? f.file : '') + ' — ' + (f && f.reason ? f.reason : '')
    ).join('\n') + (files.length > 5 ? '\n……另有 ' + (files.length - 5) + ' 条' : '');
    refs.metaChips.appendChild(ui.chip('跳过 ' + skipped.total + ' 份成绩单（明细见 JSON 的 skipped 字段）', {
      tone: 'warn', title: tip || '明细见 JSON 的 skipped 字段'
    }));
  }

  function sourceLabel(e) {
    if (typeof e.participant_source !== 'string' || !e.participant_source) return '—';
    return SOURCE_LABELS[e.participant_source] || e.participant_source;
  }

  function entryTip(e) {
    const bits = [];
    if (isFiniteNum(e.best_round_score) && isFiniteNum(e.worst_round_score)) {
      bits.push('单轮 ' + fmtScore(e.worst_round_score) + ' … ' + fmtScore(e.best_round_score));
    }
    if (Array.isArray(e.session_dirs) && e.session_dirs.length) {
      bits.push('场次目录：\n' + e.session_dirs.join('\n'));
    }
    return bits.join('\n');
  }

  function renderTable() {
    const d = local.data;
    refs.tableSub.textContent = '共 ' + d.entries.length + ' 名参与者 · 平均分 = 各场次 avg_score 均值';

    const thead = h('thead', {}, [h('tr', {}, [
      h('th', { class: 'lb-col-rank' }, '排名'),
      h('th', { class: 'lb-col-participant' }, '参与者'),
      h('th', { class: 'lb-col-num' }, '平均分'),
      h('th', { class: 'lb-col-num' }, '场次'),
      h('th', { class: 'lb-col-num' }, '轮次'),
      h('th', { class: 'lb-col-note' }, '备注')
    ])]);
    const tbody = h('tbody', {});
    d.entries.forEach((e) => {
      tbody.appendChild(h('tr', {}, [
        h('td', { class: 'lb-col-rank mono' }, isFiniteNum(e.rank) ? String(e.rank) : '—'),
        h('td', { class: 'lb-col-participant' }, String(e.participant)),
        h('td', { class: 'lb-col-num mono' }, fmtScore(e.avg_score)),
        h('td', { class: 'lb-col-num mono' }, isFiniteNum(e.sessions) ? String(e.sessions) : '—'),
        h('td', { class: 'lb-col-num mono' }, isFiniteNum(e.rounds) ? String(e.rounds) : '—'),
        h('td', { class: 'lb-col-note', title: entryTip(e) }, sourceLabel(e))
      ]));
    });
    ui.clear(refs.tableWrap);
    refs.tableWrap.appendChild(h('table', { class: 'lb-table' }, [thead, tbody]));
  }

  /* ===================================================================
     page module
     =================================================================== */
  pages.leaderboard = {
    id: 'leaderboard',
    label: '本地排行榜',
    navLabel: '排行',
    mount: mount
  };
})();
