/* owner: lead | module: shell | contract: docs/CONTRACT.md */
(function () {
  'use strict';
  const FL = window.FL = window.FL || {};
  const ui = FL.ui;
  const h = ui.h;
  const fmt = FL.protocol.fmt;

  const PAGES = [
    { id: 'home', index: '01' },
    { id: 'system', index: '02' },
    { id: 'signals', index: '03' },
    { id: 'causal', index: '04' },
    { id: 'compare', index: '05' },
    { id: 'arena', index: '06', ext: true }
  ];
  const TRUTH_PAGES = ['signals', 'causal', 'compare'];

  const refs = {};
  const pageRoots = {};
  let booted = false;
  let lastPage = null;
  let lastToastKey = '';
  let lastRunKey = null;
  let lastNavKey = null;
  let popover = null;

  const api = {
    FL,
    get actions() { return FL.store.actions; },
    getState: () => FL.store.getState(),
    el: h,
    ui,
    get chart() { return FL.chart; },
    get core() { return FL.core; },
    get systems() { return FL.systems; },
    get protocol() { return FL.protocol; },
    get exporter() { return FL.exporter; },
    get fmt() { return fmt; },
    toast: (m, t) => FL.store.actions.toast(m, t),
    navigate: (p) => FL.store.actions.navigate(p),
    subscribe: (fn) => FL.store.subscribe(fn)
  };

  /* ===================================================================
     build DOM
     =================================================================== */
  function buildShell() {
    const app = document.getElementById('app');
    ui.clear(app);

    /* ---- header ---- */
    const brand = h('a', { class: 'brand', href: '#/home', 'aria-label': 'FaultLab 首页' }, [
      h('span', { class: 'brand-mark' }, [ui.icon('pulse', { size: 22 })]),
      h('span', { class: 'brand-text' }, [
        h('span', { class: 'brand-name' }, ['FAULT', h('em', {}, 'LAB')]),
        h('span', { class: 'brand-sub' }, ['Virtual Energy Lab · V0.1'])
      ])
    ]);

    refs.systemSwitch = h('button', {
      class: 'system-switch', type: 'button', 'aria-haspopup': 'menu',
      on: { click: (e) => { e.stopPropagation(); toggleSystemPopover(); } }
    }, [
      h('span', { class: 'sw-code' }, 'FL-001'),
      h('span', { class: 'sw-title' }, '电池储能系统'),
      ui.icon('chevron-down', { size: 13, class: 'sw-swap' })
    ]);

    refs.modeFlag = h('span', { class: 'mode-flag', 'data-mode': 'demo' }, '演示模式');
    refs.hdrModel = h('span', { class: 'hdr-meta' }, [
      h('span', { class: 'eyebrow' }, '模型'), h('span', {}, 'L0')
    ]);
    refs.hdrRun = h('span', { class: 'hdr-run', 'data-status': 'empty' }, [
      h('span', { class: 'dot' }), h('span', {}, '未创建运行')
    ]);

    const header = h('header', { class: 'app-header' }, [
      brand,
      h('span', { class: 'hdr-divider', 'aria-hidden': 'true' }),
      h('div', { class: 'header-context' }, [refs.systemSwitch, refs.modeFlag, refs.hdrModel, refs.hdrRun]),
      h('div', { class: 'header-actions' }, [
        h('button', {
          class: 'btn btn-ghost btn-sm', type: 'button', title: '帮助与快捷键（?）',
          on: { click: openHelp }
        }, [ui.icon('help', { size: 15 }), h('span', {}, '帮助')])
      ])
    ]);

    /* ---- nav ---- */
    refs.navItems = {};
    const nav = h('nav', { class: 'app-nav', 'aria-label': '页面导航' });
    PAGES.forEach((p) => {
      const def = (FL.pages && FL.pages[p.id]) || {};
      const item = h('a', {
        class: 'nav-item', href: '#/' + p.id, 'data-page': p.id,
        title: def.label || p.id
      }, [
        h('span', { class: 'nav-index' }, p.index),
        h('span', {}, def.navLabel || def.label || p.id),
        p.ext ? h('span', { class: 'nav-ext' }, 'EXT') : null
      ]);
      refs.navItems[p.id] = item;
      nav.appendChild(item);
    });
    nav.appendChild(h('span', { class: 'nav-spacer' }));
    nav.appendChild(h('span', { class: 'nav-note' }, [
      h('span', {}, '离线运行'), h('span', { class: 'sep' }), h('span', {}, 'L0 行为级'),
      h('span', { class: 'sep' }), h('span', {}, '演示数据')
    ]));

    /* ---- main ---- */
    refs.viewRoot = h('main', { class: 'app-main', id: 'view-root' });
    refs.viewRoot.setAttribute('aria-live', 'polite');

    /* ---- timeline ---- */
    const timeline = buildTimeline();

    app.appendChild(header);
    app.appendChild(nav);
    app.appendChild(refs.viewRoot);
    app.appendChild(timeline);

    document.title = 'FaultLab · 虚拟能源实验场';
  }

  /* ===================================================================
     timeline
     =================================================================== */
  function buildTimeline() {
    refs.btnReplay = tlBtn('replay', '重播', '重播（不重新计算）');
    refs.btnFault = tlBtn('flag', '故障点', '跳到故障点');
    refs.btnPrev = tlBtn('skipback', '事件', '上一个事件');
    refs.btnPlay = h('button', { class: 'tl-btn tl-play', type: 'button', title: '播放/暂停（空格）' }, [
      ui.icon('play', { size: 15 }), h('span', {}, '播放')
    ]);
    refs.btnPlay.addEventListener('click', () => FL.store.actions.togglePlay());
    refs.btnNext = tlBtn('skipforward', '事件', '下一个事件');

    refs.btnReplay.addEventListener('click', () => FL.store.actions.replay());
    refs.btnFault.addEventListener('click', () => FL.store.actions.jumpToFault());
    refs.btnPrev.addEventListener('click', () => FL.store.actions.stepEvent(-1));
    refs.btnNext.addEventListener('click', () => FL.store.actions.stepEvent(1));

    refs.speedButtons = {};
    const speed = h('div', { class: 'tl-speed', role: 'group', 'aria-label': '播放速度' });
    [0.5, 1, 2, 4].forEach((s) => {
      const b = h('button', { type: 'button', 'aria-pressed': String(s === 1) }, s + 'x');
      b.addEventListener('click', () => FL.store.actions.setSpeed(s));
      refs.speedButtons[s] = b;
      speed.appendChild(b);
    });

    refs.tlNow = h('span', { class: 'tl-now' }, '0.0');
    refs.tlTotal = h('span', { class: 'tl-total' }, '/ 60.0 s');
    refs.tlState = h('span', { class: 'tl-state', 'data-status': 'stopped' }, '未运行');
    refs.tlHint = h('span', { class: 'tl-hint' }, '空格 播放/暂停 · ←/→ ±0.1s · Shift ±1s · Home/End 0/60s');
    const readout = h('div', { class: 'tl-readout' }, [
      refs.tlNow, refs.tlTotal, refs.tlState, h('span', { class: 'spacer' }), refs.tlHint
    ]);

    refs.miniCanvas = h('canvas', { class: 'tl-mini', 'aria-hidden': 'true' });
    refs.rail = h('div', {
      class: 'tl-rail is-empty', role: 'slider', tabindex: '0',
      'aria-label': '仿真时间线', 'aria-valuemin': '0', 'aria-valuemax': '60', 'aria-valuenow': '0'
    }, [
      h('div', { class: 'tl-fill' }),
      h('div', { class: 'tl-handle' })
    ]);
    refs.tlFill = refs.rail.querySelector('.tl-fill');
    refs.tlHandle = refs.rail.querySelector('.tl-handle');
    refs.tlTicks = h('div', { class: 'tl-ticks', 'aria-hidden': 'true' });
    const railWrap = h('div', { class: 'tl-rail-wrap' }, [refs.miniCanvas, refs.rail, refs.tlTicks]);

    bindRail();
    refs.tlTrack = h('div', { class: 'tl-track' }, [readout, railWrap]);

    return h('footer', { class: 'app-timeline', 'aria-label': '仿真时间线与播放控制' }, [
      h('div', { class: 'tl-controls' }, [
        refs.btnReplay, refs.btnFault, refs.btnPrev, refs.btnPlay, refs.btnNext, speed
      ]),
      refs.tlTrack
    ]);
  }

  function tlBtn(iconName, label, title) {
    return h('button', { class: 'tl-btn', type: 'button', title: title || label }, [
      ui.icon(iconName, { size: 15 }), h('span', {}, label)
    ]);
  }

  function bindRail() {
    let dragging = false;
    function seek(ev) {
      const st = FL.store.getState();
      if (!st.activeRun) return;
      const rect = refs.rail.getBoundingClientRect();
      if (!rect.width) return;
      const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      const d = st.activeRun.config.duration_s;
      FL.store.actions.setTime(ratio * d, { pause: true });
    }
    refs.rail.addEventListener('pointerdown', (e) => {
      const st = FL.store.getState();
      if (!st.activeRun) return;
      dragging = true;
      try { refs.rail.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      seek(e);
      e.preventDefault();
    });
    refs.rail.addEventListener('pointermove', (e) => { if (dragging) seek(e); });
    refs.rail.addEventListener('pointerup', () => { dragging = false; });
    refs.rail.addEventListener('pointercancel', () => { dragging = false; });
    refs.rail.addEventListener('keydown', (e) => {
      const st = FL.store.getState();
      if (!st.activeRun) return;
      if (e.key === 'ArrowLeft') { FL.store.actions.setTime(st.currentTime - (e.shiftKey ? 1 : 0.1), { pause: true }); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { FL.store.actions.setTime(st.currentTime + (e.shiftKey ? 1 : 0.1), { pause: true }); e.preventDefault(); }
      else if (e.key === 'Home') { FL.store.actions.setTime(0, { pause: true }); e.preventDefault(); }
      else if (e.key === 'End') { FL.store.actions.setTime(st.activeRun.config.duration_s, { pause: true }); e.preventDefault(); }
    });
  }

  /* ===================================================================
     render
     =================================================================== */
  function onState(state, reason) {
    if (!booted) return;
    try {
      renderHeader(state);
      renderNav(state);
      renderTimeline(state, reason);
      renderToasts(state);
      renderPage(state, reason);
    } catch (err) {
      console.error('[shell] render error', err);
    }
  }

  function renderHeader(state) {
    let sys = null;
    try { sys = FL.systems.get(state.systemId); } catch (e) { sys = null; }
    if (sys) {
      refs.systemSwitch.querySelector('.sw-code').textContent = sys.experimentCode;
      refs.systemSwitch.querySelector('.sw-title').textContent = sys.title;
      refs.hdrModel.lastChild.textContent = (sys.level || 'L0').split('·')[0].trim();
      document.title = 'FaultLab · ' + sys.title + (state.activeRun ? ' · ' + state.activeRun.runId : ' · 未创建运行');
    }
    refs.modeFlag.dataset.mode = state.mode;
    refs.modeFlag.textContent = state.mode === 'blind' ? '盲测 · 真值封存' : '演示模式';
    if (state.activeRun) {
      refs.hdrRun.dataset.status = state.computeState === 'computing' ? 'computing' : 'completed';
      refs.hdrRun.lastChild.textContent = state.activeRun.runId + ' · ' + (state.computeState === 'computing' ? '计算中' : '已完成');
    } else {
      refs.hdrRun.dataset.status = 'empty';
      refs.hdrRun.lastChild.textContent = '未创建运行';
    }
  }

  function renderNav(state) {
    const sealedKey = state.truthSealed ? '1' : '0';
    if (lastNavKey === state.page + '|' + sealedKey) return;
    lastNavKey = state.page + '|' + sealedKey;
    PAGES.forEach((p) => {
      const el = refs.navItems[p.id];
      if (!el) return;
      if (p.id === state.page) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
      const shouldDisable = state.truthSealed && TRUTH_PAGES.indexOf(p.id) >= 0;
      if (shouldDisable) {
        el.setAttribute('aria-disabled', 'true');
        el.setAttribute('title', '盲测进行中：真值相关页面已封存');
      } else {
        el.removeAttribute('aria-disabled');
        const def = (FL.pages && FL.pages[p.id]) || {};
        el.setAttribute('title', def.label || p.id);
      }
    });
  }

  function renderToasts(state) {
    let root = document.getElementById('toast-root');
    if (!root) {
      root = h('div', { id: 'toast-root', class: 'toast-root', 'aria-live': 'polite' });
      document.body.appendChild(root);
    }
    const key = (state.toasts || []).map((t) => t.id).join(',');
    if (key === lastToastKey) return;
    lastToastKey = key;
    ui.clear(root);
    (state.toasts || []).forEach((t) => {
      root.appendChild(h('div', { class: 'toast', 'data-tone': t.tone || 'info', role: 'status' }, [
        ui.icon(t.tone === 'danger' || t.tone === 'warn' ? 'warning' : t.tone === 'ok' ? 'check' : 'info', { size: 15 }),
        h('div', {}, t.message)
      ]));
    });
  }

  function renderTimeline(state, reason) {
    const run = state.activeRun;
    const hasRun = !!run;
    const d = hasRun ? run.config.duration_s : 60;
    const t = state.currentTime || 0;
    const ratio = d > 0 ? Math.max(0, Math.min(1, t / d)) : 0;

    refs.tlNow.textContent = fmt.num(t, 1);
    refs.tlTotal.textContent = '/ ' + fmt.num(d, 1) + ' s';
    const status = hasRun ? state.playback.status : 'stopped';
    refs.tlState.dataset.status = status;
    refs.tlState.textContent = status === 'playing' ? '播放中' : status === 'paused' ? '已暂停'
      : status === 'ended' ? '已结束' : hasRun ? '就绪' : '未运行';
    refs.tlFill.style.width = (ratio * 100) + '%';
    refs.tlHandle.style.left = (ratio * 100) + '%';
    refs.rail.setAttribute('aria-valuenow', String(t.toFixed(1)));
    refs.rail.setAttribute('aria-valuemax', String(d));
    refs.rail.classList.toggle('is-empty', !hasRun);

    const playing = status === 'playing';
    refs.btnPlay.classList.toggle('is-playing', playing);
    ui.clear(refs.btnPlay);
    refs.btnPlay.appendChild(ui.icon(playing ? 'pause' : 'play', { size: 15 }));
    refs.btnPlay.appendChild(h('span', {}, playing ? '暂停' : '播放'));

    [refs.btnReplay, refs.btnPrev, refs.btnFault, refs.btnNext].forEach((b) => {
      if (hasRun) b.removeAttribute('disabled'); else b.setAttribute('disabled', '');
    });
    Object.keys(refs.speedButtons).forEach((s) => {
      refs.speedButtons[s].setAttribute('aria-pressed', String(Number(s) === (state.playback.speed || 1)));
    });

    const key = hasRun ? run.runId : 'none';
    if (key !== lastRunKey) {
      lastRunKey = key;
      rebuildTicks(d);
      rebuildFaultMarks(run);
      renderMini(run);
    }
    if (reason === 'time' || reason === 'run' || reason === 'playback' || reason === 'boot') renderMini(run);
  }

  function rebuildTicks(d) {
    ui.clear(refs.tlTicks);
    const step = d <= 12 ? 1 : d <= 30 ? 2 : 5;
    for (let s = 0; s <= d + 0.001; s += step) {
      const span = h('span', { class: s % 10 === 0 ? 'major' : '' });
      span.style.left = (s / d * 100) + '%';
      refs.tlTicks.appendChild(span);
    }
  }

  function rebuildFaultMarks(run) {
    Array.from(refs.rail.querySelectorAll('.tl-fault-mark')).forEach((n) => n.remove());
    if (!run) return;
    const d = run.config.duration_s || 60;
    (run.events || []).filter((e) => e.event_type && e.event_type !== 'healthy').forEach((ev, i) => {
      const mark = h('div', { class: 'tl-fault-mark' });
      mark.style.left = ((ev.trigger_s / d) * 100) + '%';
      if (i === 0) {
        mark.appendChild(h('span', { class: 'tl-fault-label' }, '故障 ' + fmt.num(ev.trigger_s, 1) + ' s'));
      }
      refs.rail.appendChild(mark);
    });
  }

  function renderMini(run) {
    const cv = refs.miniCanvas;
    if (!cv) return;
    const wrap = cv.parentElement;
    const w = Math.max(10, wrap.clientWidth);
    const hgt = 28;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(hgt * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(hgt * dpr);
    }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, hgt);
    if (!run || !run.timeseries) return;
    const signals = run.timeseries.signals;
    let id = null;
    let arr = null;
    const preferred = (run.signals || []).filter((s) => s.sourceKind === 'MODEL_STATE' && !s.tableOnly);
    const pick = preferred.filter((s) => /_true_(kW|A|Hz)$/.test(s.id))[0] || preferred[0];
    if (pick && signals[pick.id]) { id = pick.id; arr = signals[pick.id]; }
    if (!arr) return;
    const times = run.timeseries.t;
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < arr.length; i++) { if (arr[i] < min) min = arr[i]; if (arr[i] > max) max = arr[i]; }
    if (!isFinite(min) || !isFinite(max)) return;
    if (max - min < 1e-9) { max = min + 1; }
    const pad = 3;
    ctx.beginPath();
    for (let i = 0; i < arr.length; i++) {
      const x = (times[i] / (run.config.duration_s || 60)) * w;
      const y = hgt - pad - ((arr[i] - min) / (max - min)) * (hgt - pad * 2);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(200, 244, 90, .55)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // fault vertical lines
    const d = run.config.duration_s || 60;
    (run.events || []).filter((e) => e.event_type && e.event_type !== 'healthy').forEach((ev) => {
      const x = (ev.trigger_s / d) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x, hgt);
      ctx.strokeStyle = 'rgba(255, 95, 109, .35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }

  /* ===================================================================
     page mounting
     =================================================================== */
  function renderPage(state, reason) {
    const pageId = state.page;
    const def = FL.pages && FL.pages[pageId];
    if (!def) {
      ui.clear(refs.viewRoot);
      refs.viewRoot.appendChild(ui.emptyState({
        icon: 'warning', title: '页面未加载', desc: '页面模块 ' + pageId + ' 缺失，请检查 index.html 的脚本加载。'
      }));
      return;
    }
    let root = pageRoots[pageId];
    if (!root) {
      root = h('section', {
        class: 'page page-' + pageId, id: 'page-' + pageId,
        'aria-label': def.label || pageId
      });
      pageRoots[pageId] = root;
      refs.viewRoot.appendChild(root);
      try {
        def.mount(root, api);
      } catch (err) {
        console.error('[shell] mount failed for page', pageId, err);
        root.appendChild(ui.emptyState({
          icon: 'warning', title: '页面初始化失败', desc: String(err && err.message ? err.message : err)
        }));
      }
    }
    if (lastPage !== pageId) {
      Object.keys(pageRoots).forEach((id) => {
        pageRoots[id].classList.toggle('is-active', id === pageId);
      });
      root.classList.add('is-active');
      lastPage = pageId;
      refs.viewRoot.scrollTop = 0;
    }
    try {
      if (def.update) def.update(state, reason || 'nav');
    } catch (err) {
      console.error('[shell] update failed for page', pageId, err);
    }
  }

  /* ===================================================================
     system switcher popover
     =================================================================== */
  function toggleSystemPopover() {
    if (popover) { closePopover(); return; }
    const list = (function () {
      try { return FL.systems.list(); } catch (e) { return []; }
    })();
    const panel = h('div', { class: 'popover', role: 'menu', 'aria-label': '选择实验系统' });
    list.forEach((sys) => {
      const state = FL.store.getState();
      const item = h('button', {
        class: 'popover-item', type: 'button', role: 'menuitemradio',
        'aria-checked': String(sys.id === state.systemId),
        on: {
          click: () => {
            closePopover();
            if (sys.id !== state.systemId) FL.store.actions.startExperiment(sys.id);
          }
        }
      }, [
        h('span', { class: 'pi-code' }, sys.experimentCode),
        h('span', {}, [
          h('span', { class: 'pi-title' }, sys.title),
          h('span', { class: 'pi-sub' }, sys.tagline || '')
        ])
      ]);
      panel.appendChild(item);
    });
    const backdrop = h('div', { class: 'popover-backdrop', on: { click: closePopover } });
    document.body.appendChild(backdrop);
    document.body.appendChild(panel);
    const rect = refs.systemSwitch.getBoundingClientRect();
    const pw = Math.min(400, window.innerWidth - 24);
    panel.style.width = pw + 'px';
    panel.style.top = (rect.bottom + 7) + 'px';
    panel.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - pw - 12)) + 'px';
    popover = { panel, backdrop, onKey: null };
    popover.onKey = (e) => { if (e.key === 'Escape') closePopover(); };
    document.addEventListener('keydown', popover.onKey, true);
    const first = panel.querySelector('.popover-item');
    if (first) first.focus();
  }

  function closePopover() {
    if (!popover) return;
    if (popover.panel.parentNode) popover.panel.parentNode.removeChild(popover.panel);
    if (popover.backdrop.parentNode) popover.backdrop.parentNode.removeChild(popover.backdrop);
    document.removeEventListener('keydown', popover.onKey, true);
    popover = null;
    if (refs.systemSwitch && refs.systemSwitch.focus) refs.systemSwitch.focus();
  }

  /* ===================================================================
     help
     =================================================================== */
  function openHelp() {
    const content = h('div', {}, [
      h('div', { class: 'eyebrow mb-8' }, '操作'),
      h('div', { class: 'kv' }, [
        h('dt', {}, '空格'), h('dd', {}, '播放 / 暂停'),
        h('dt', {}, '← / →'), h('dd', {}, '后退 / 前进 0.1 s'),
        h('dt', {}, 'Shift + ←/→'), h('dd', {}, '后退 / 前进 1 s'),
        h('dt', {}, 'Home / End'), h('dd', {}, '跳到 0 s / 60 s'),
        h('dt', {}, '?'), h('dd', {}, '打开这个帮助')
      ]),
      h('hr', { class: 'hr' }),
      h('div', { class: 'eyebrow mb-8' }, '页面'),
      h('p', { class: 'muted' },
        '首页选择系统并创建运行；系统页注入故障并观察能量流；曲线页同步查看真实/测量/派生信号；' +
        '因果页解释"为什么变化"；对比页比较故障组与无故障基准；竞技场让诊断 Agent 在封存真值条件下比赛。'),
      h('hr', { class: 'hr' }),
      h('div', { class: 'eyebrow mb-8' }, '数据可信度'),
      h('p', { class: 'muted' },
        'FaultLab V0.1 是离线可运行的行为级（L0）解析模型演示：FL-001 的数值由规格中的解析式精确生成，' +
        '非 Simulink、非现场数据、非实测。所有数字都带来源标签（配置 / 模型状态 / 观测 / 控制器 / 故障事件 / 派生 / 模型假设），' +
        '说明文本不作为计算数据源。观测残差（如 +4 kW）是测量一致性残差，不是能量损失。'),
      h('hr', { class: 'hr' }),
      h('div', { class: 'eyebrow mb-8' }, '版本'),
      h('p', { class: 'muted' }, 'FaultLab V0.1 / FL-001 · 基准日期 2026-10-27 · 离线单页应用 · 模型层级 L0')
    ]);
    ui.modal({ title: '帮助与快捷键', subtitle: 'FaultLab — Virtual Energy Lab', content, wide: false });
  }

  /* ===================================================================
     wiring
     =================================================================== */
  function wireGlobal() {
    window.addEventListener('hashchange', () => {
      const m = /^#\/([a-z]+)/.exec(location.hash || '');
      if (!m) return;
      const pageId = m[1];
      if (FL.pages && FL.pages[pageId]) FL.store.actions.navigate(pageId);
    });

    document.addEventListener('keydown', (e) => {
      const target = e.target;
      if (target && (target.closest && target.closest('input, textarea, select, [contenteditable="true"]'))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const state = FL.store.getState();
      if (e.code === 'Space' && !e.repeat) {
        if (target && target.closest && target.closest('button, a')) return;
        e.preventDefault();
        FL.store.actions.togglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        FL.store.actions.setTime(state.currentTime - (e.shiftKey ? 1 : 0.1), { pause: true });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        FL.store.actions.setTime(state.currentTime + (e.shiftKey ? 1 : 0.1), { pause: true });
      } else if (e.key === 'Home') {
        e.preventDefault();
        FL.store.actions.setTime(0, { pause: true });
      } else if (e.key === 'End') {
        const d = state.activeRun ? state.activeRun.config.duration_s : 60;
        e.preventDefault();
        FL.store.actions.setTime(d, { pause: true });
      } else if (e.key === '?') {
        e.preventDefault();
        openHelp();
      }
    });

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => renderMini(FL.store.getState().activeRun), 120);
    });
  }

  function boot() {
    if (!FL.store) {
      document.getElementById('app').appendChild(ui.emptyState({
        icon: 'warning', title: '初始化失败', desc: 'store 模块缺失，请检查 index.html 脚本顺序。'
      }));
      return;
    }
    buildShell();
    FL.store.subscribe(onState);
    wireGlobal();
    FL.store.init();
    booted = true;
    const state = FL.store.getState();
    renderHeader(state);
    renderNav(state);
    renderTimeline(state, 'boot');
    renderToasts(state);
    renderPage(state, 'boot');
  }

  FL.shell = { boot, api, openHelp };
})();
