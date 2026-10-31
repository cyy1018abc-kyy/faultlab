/* owner: lead | module: store | contract: docs/CONTRACT.md */
(function () {
  'use strict';
  const FL = window.FL = window.FL || {};

  const LS_RUNS = 'faultlab.runs.v1';
  const LS_SESSION = 'faultlab.session.v1';
  const MAX_RUNS = 10;

  let state = baseState();
  const listeners = new Set();
  let clockHandle = null;
  let lastFrameTs = 0;
  let toastSeq = 0;
  let saveTimer = null;

  function baseState() {
    return {
      booted: false,
      page: 'home',
      systemId: 'FL-001',
      draft: null,
      draftDirty: false,
      draftErrors: [],
      draftBaseHash: null,
      activeRun: null,
      baselineRun: null,
      monitorRun: null,
      runs: {},
      currentTime: 0,
      computeState: 'empty',
      playback: { status: 'stopped', speed: 1 },
      selectedComponent: null,
      truthSealed: false,
      mode: 'demo',
      pageState: {
        system: { assumptionsOpen: false, showIntro: false, pendingFlash: false },
        signals: {
          category: 'current', visible: {}, baselineOverlay: false,
          viewWindow: null, zoom: 'full', tableMode: false,
          selectedSignal: null, selectedT: null
        },
        causal: { focusNodeId: null, evidenceOpen: false, monitorOpen: false, residualOpen: false },
        compare: { trialRunId: null, baselineRunId: null, view: 'overlay', signalId: null },
        arena: {
          setup: { systemId: 'FL-001', rounds: 6, seed: 20261027, noise: false, agentIds: [] },
          match: null, running: false
        }
      },
      toasts: [],
      drawer: null,
      modal: null,
      introStep: 0,
      lastError: null,
      lastSession: null
    };
  }

  /* ---------------------------------------------------------------- util */
  function notify(reason) {
    const snapshot = state;
    listeners.forEach((fn) => {
      try { fn(snapshot, reason || 'all'); } catch (err) { console.error('[store] listener error', err); }
    });
  }

  function hashOf(obj) {
    try {
      if (FL.core && FL.core.hashObject) return FL.core.hashObject(obj);
    } catch (e) { /* ignore */ }
    try { return JSON.stringify(obj); } catch (e) { return String(Date.now()); }
  }

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function currentSystem() {
    try { return FL.systems.get(state.systemId); } catch (e) { return null; }
  }

  function duration() {
    return state.activeRun ? state.activeRun.config.duration_s : 60;
  }

  function clampTime(t) {
    const d = duration();
    if (!isFinite(t)) return 0;
    return Math.max(0, Math.min(d, t));
  }

  function runSeq() {
    let max = 0;
    Object.keys(state.runs).forEach((id) => {
      const m = /(\d+)/.exec(id);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return max + 1;
  }

  function makeLabel(config) {
    const sys = (function () { try { return FL.systems.get(config.systemId); } catch (e) { return null; } })();
    const mode = config.feedback_mode === 'monitor' ? '仅监测' : '闭环';
    if (!config.fault || config.fault.family === 'none') return '无故障基准 · ' + mode;
    let faultDef = null;
    try { faultDef = FL.systems.faults(config.systemId).filter((f) => f.id === config.fault.faultId)[0] || null; } catch (e) { faultDef = null; }
    const name = faultDef ? faultDef.shortLabel : (config.fault.family || '故障');
    const p = (config.fault.params || {});
    const mag = p.magnitude != null ? ('+' === '' ? '' : '') + p.magnitude : '';
    const unit = faultDef && faultDef.params && faultDef.params[0] ? faultDef.params[0].unit : '';
    return mode + ' · ' + name + ' ' + mag + unit + ' @' + config.fault.t_start_s + 's';
  }

  function defaultVisibleMap(run) {
    const map = {};
    (run.signals || []).forEach((s) => {
      if (s.tableOnly) return;
      map[s.id] = !(s.chart && s.chart.defaultVisible === false);
    });
    return map;
  }

  function systemDraft(systemId) {
    try {
      if (FL.systems && FL.systems.defaultConfig) return FL.systems.defaultConfig(systemId);
      if (FL.core && FL.core.createConfig) return FL.core.createConfig(systemId, {});
    } catch (e) { console.error('[store] default config failed', e); }
    return null;
  }

  function validateDraft(draft) {
    try {
      if (FL.core && FL.core.validateConfig) return FL.core.validateConfig(draft);
      if (FL.systems && FL.systems.validateDraft) return FL.systems.validateDraft(draft);
    } catch (e) { console.error('[store] validation failed', e); }
    return { ok: true, errors: [], warnings: [] };
  }

  function updateDirty() {
    if (!state.draft) { state.draftDirty = false; return; }
    const h = hashOf(state.draft);
    state.draftDirty = state.draftBaseHash ? h !== state.draftBaseHash : false;
  }

  function setActiveRun(run, opts) {
    state.activeRun = run || null;
    if (run) {
      state.systemId = run.systemId;
      state.computeState = 'completed';
      state.pageState.signals.category = (run.signals && run.signals[0] && run.signals[0].category) || 'current';
      state.pageState.signals.visible = defaultVisibleMap(run);
      state.pageState.signals.viewWindow = null;
      state.pageState.signals.zoom = 'full';
      state.pageState.compare.trialRunId = run.role === 'baseline' ? null : run.runId;
      if (run.role === 'baseline') state.baselineRun = run;
      if (run.role === 'contrast') state.monitorRun = run;
      state.selectedComponent = state.selectedComponent || defaultComponent(run.systemId);
    } else {
      state.computeState = 'draft_valid';
    }
    if (opts && opts.keepTime !== true) state.currentTime = 0;
    state.playback.status = 'stopped';
  }

  function defaultComponent(systemId) {
    try {
      const sys = FL.systems.get(systemId);
      const anchor = sys.faultAnchors && sys.faultAnchors[sys.faults && sys.faults[0] ? sys.faults[0].family : 'sensor_drift'];
      if (anchor) return anchor;
      const sensor = (sys.components || []).filter((c) => /sensor|controller/.test(c.kind))[0];
      return sensor ? sensor.id : (sys.components && sys.components[0] ? sys.components[0].id : null);
    } catch (e) { return null; }
  }

  function ensureBaselineInternal(reason) {
    const draft = state.draft;
    if (!draft) return null;
    // reuse an existing matching baseline
    const want = {
      systemId: draft.systemId, modelId: draft.modelId, modelVersion: draft.modelVersion,
      duration_s: draft.duration_s, dt_s: draft.dt_s, feedback_mode: draft.feedback_mode
    };
    const candidates = Object.keys(state.runs).map((id) => state.runs[id]).filter((r) => r && r.role === 'baseline');
    for (let i = 0; i < candidates.length; i++) {
      const r = candidates[i];
      const c = r.config;
      if (c.systemId === want.systemId && c.modelVersion === want.modelVersion &&
        c.duration_s === want.duration_s && c.dt_s === want.dt_s &&
        c.feedback_mode === want.feedback_mode &&
        JSON.stringify(c.initial) === JSON.stringify(draft.initial)) {
        state.baselineRun = r;
        return r;
      }
    }
    let cfg;
    try {
      cfg = (FL.core && FL.core.createConfig) ? FL.core.createConfig(draft.systemId, Object.assign(clone(draft), {
        fault: { family: 'none', faultId: null, t_start_s: 20, params: { magnitude: 0 } }
      })) : null;
    } catch (e) { cfg = null; }
    if (!cfg) return null;
    let run;
    try {
      run = FL.registry.createRun({
        config: cfg,
        role: 'baseline',
        label: makeLabel(cfg),
        runId: 'Run-' + String(runSeq() + 1).padStart(3, '0'),
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.error('[store] baseline simulation failed', e);
      state.lastError = String(e && e.message ? e.message : e);
      return null;
    }
    state.runs[run.runId] = run;
    state.baselineRun = run;
    pruneRuns();
    persist();
    if (reason === 'explicit') notify('run');
    return run;
  }

  function pruneRuns() {
    const ids = Object.keys(state.runs);
    if (ids.length <= MAX_RUNS) return;
    const keep = new Set();
    if (state.activeRun) keep.add(state.activeRun.runId);
    if (state.baselineRun) keep.add(state.baselineRun.runId);
    if (state.monitorRun) keep.add(state.monitorRun.runId);
    ids.sort((a, b) => {
      const ta = state.runs[a].createdAt || '';
      const tb = state.runs[b].createdAt || '';
      return tb.localeCompare(ta);
    });
    ids.forEach((id) => {
      if (keep.size >= MAX_RUNS) return;
      keep.add(id);
    });
    Object.keys(state.runs).forEach((id) => { if (!keep.has(id)) delete state.runs[id]; });
  }

  /* ------------------------------------------------------------ persist */
  function persist() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        const runs = Object.keys(state.runs).map((id) => state.runs[id]);
        localStorage.setItem(LS_RUNS, JSON.stringify({ v: 1, runs }));
        localStorage.setItem(LS_SESSION, JSON.stringify({
          v: 1, systemId: state.systemId, draft: state.draft,
          activeRunId: state.activeRun ? state.activeRun.runId : null,
          baselineRunId: state.baselineRun ? state.baselineRun.runId : null,
          systemDraftHash: state.draftBaseHash,
          savedAt: new Date().toISOString()
        }));
      } catch (e) {
        console.warn('[store] persist failed', e);
        // quota fallback: keep only current + baseline
        try {
          const keep = [];
          if (state.activeRun) keep.push(state.activeRun);
          if (state.baselineRun && state.baselineRun !== state.activeRun) keep.push(state.baselineRun);
          localStorage.setItem(LS_RUNS, JSON.stringify({ v: 1, runs: keep }));
        } catch (e2) { /* ignore */ }
      }
    }, 220);
  }

  function loadPersisted() {
    let runs = {};
    let session = null;
    try {
      const raw = localStorage.getItem(LS_RUNS);
      if (raw) {
        const parsed = JSON.parse(raw);
        (parsed.runs || []).forEach((r) => {
          if (!r || !r.runId) return;
          /* 刷新恢复：校验 run_hash；不通过则丢弃，不得伪造历史 Run（契约 §4.2） */
          if (FL.registry && typeof FL.registry.validateRestored === 'function') {
            const verdict = FL.registry.validateRestored(r);
            if (!verdict.ok) {
              console.warn('[store] 拒绝恢复运行', r.runId, verdict.reason);
              return;
            }
          }
          runs[r.runId] = r;
        });
      }
    } catch (e) { console.warn('[store] load runs failed', e); }
    try {
      const raw = localStorage.getItem(LS_SESSION);
      if (raw) session = JSON.parse(raw);
    } catch (e) { console.warn('[store] load session failed', e); }
    return { runs, session };
  }

  /* -------------------------------------------------------------- clock */
  function startClock() {
    if (clockHandle) return;
    lastFrameTs = 0;
    const step = (ts) => {
      clockHandle = null;
      if (state.playback.status !== 'playing' || !state.activeRun) return;
      if (!lastFrameTs) lastFrameTs = ts;
      const dtReal = Math.min(0.25, (ts - lastFrameTs) / 1000);
      lastFrameTs = ts;
      const next = state.currentTime + dtReal * (state.playback.speed || 1);
      const d = duration();
      if (next >= d) {
        state.currentTime = d;
        state.playback.status = 'ended';
        notify('time');
        notify('playback');
        return;
      }
      state.currentTime = next;
      notify('time');
      clockHandle = requestAnimationFrame(step);
    };
    clockHandle = requestAnimationFrame(step);
  }

  function stopClock() {
    if (clockHandle) { cancelAnimationFrame(clockHandle); clockHandle = null; }
    lastFrameTs = 0;
  }

  /* ------------------------------------------------------------ actions */
  const actions = {
    startExperiment(systemId, opts) {
      const o = opts || {};
      const sid = systemId || state.systemId;
      let sys;
      try { sys = FL.systems.get(sid); } catch (e) { sys = null; }
      if (!sys) { actions.toast('未找到系统 ' + sid, 'danger'); return { ok: false }; }
      stopClock();
      state.systemId = sid;
      state.draft = systemDraft(sid);
      state.draftBaseHash = null;
      state.draftErrors = [];
      state.draftDirty = false;
      state.activeRun = null;
      state.baselineRun = null;
      state.monitorRun = null;
      state.currentTime = 0;
      state.playback = { status: 'stopped', speed: 1 };
      state.selectedComponent = defaultComponent(sid);
      state.pageState.signals.category = 'current';
      state.pageState.signals.visible = {};
      state.pageState.causal = { focusNodeId: null, evidenceOpen: false, monitorOpen: false, residualOpen: false };
      state.computeState = 'draft_valid';
      state.lastError = null;
      state.page = 'system';
      updateHashIfNeeded('system');
      const res = actions.createRun({ silent: true, initial: true });
      if (res && res.ok) {
        ensureBaselineInternal();
        if (!o.silent) {
          const ev = (res.run.events && res.run.events[0]) || null;
          actions.toast('已按默认配置创建 ' + res.run.runId + '（' + (ev ? 't=' + ev.trigger_s + 's ' + ev.label : '无故障') + '）', 'ok');
        }
      }
      notify('run');
      return res || { ok: false };
    },

    createRun(opts) {
      const o = opts || {};
      const draft = state.draft;
      if (!draft) { actions.toast('没有可运行的配置草稿', 'danger'); return { ok: false, error: 'no-draft' }; }
      const val = validateDraft(draft);
      state.draftErrors = val.errors || [];
      if (!val.ok) {
        actions.toast('参数无效：' + (state.draftErrors[0] ? state.draftErrors[0].message : '请检查输入'), 'danger');
        notify('draft');
        return { ok: false, error: 'invalid', errors: state.draftErrors };
      }
      state.computeState = 'computing';
      notify('run');
      let run;
      try {
        run = FL.registry.createRun({
          config: clone(draft),
          role: o.role || (draft.fault && draft.fault.family === 'none' ? 'baseline' : 'fault'),
          runId: 'Run-' + String(runSeq()).padStart(3, '0'),
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        console.error('[store] simulate failed', e);
        state.computeState = 'failed';
        state.lastError = String(e && e.message ? e.message : e);
        state.draftErrors = [{ field: 'simulate', message: state.lastError }];
        actions.toast('计算失败：' + state.lastError, 'danger');
        notify('run');
        return { ok: false, error: state.lastError };
      }
      state.runs[run.runId] = run;
      state.draftBaseHash = hashOf(draft);
      state.draftDirty = false;
      if (run.role === 'baseline') {
        state.baselineRun = run;
        state.activeRun = state.activeRun || run;
        state.computeState = 'completed';
      } else {
        setActiveRun(run, { keepTime: o.keepTime === true });
      }
      if (!o.initial) state.currentTime = 0;
      state.playback.status = 'stopped';
      pruneRuns();
      persist();
      notify('run');
      if (!o.silent) actions.toast('已创建 ' + run.runId + ' · ' + run.label, 'ok');
      return { ok: true, run };
    },

    createMonitorContrast() {
      const base = state.activeRun || null;
      if (!base) { actions.toast('请先创建一个运行', 'warn'); return { ok: false }; }
      const cfg = clone(base.config);
      cfg.feedback_mode = 'monitor';
      const val = validateDraft(cfg);
      if (!val.ok) { actions.toast('无法创建仅监测对照：' + val.errors[0].message, 'danger'); return { ok: false }; }
      let run;
      try {
        run = FL.registry.createRun({
          config: cfg,
          role: 'contrast',
          label: makeLabel(cfg) + '（对照）',
          runId: 'Run-' + String(runSeq()).padStart(3, '0'),
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        actions.toast('对照运行计算失败', 'danger'); return { ok: false };
      }
      state.runs[run.runId] = run;
      state.monitorRun = run;
      state.activeRun = run;
      state.currentTime = 0;
      state.playback.status = 'stopped';
      state.computeState = 'completed';
      pruneRuns();
      persist();
      actions.toast('已创建仅监测对照 ' + run.runId + '：真实电流保持不变，测量电流仍偏高', 'info');
      notify('run');
      return { ok: true, run };
    },

    ensureBaseline(opts) {
      const run = ensureBaselineInternal((opts && opts.explicit) ? 'explicit' : 'silent');
      return run;
    },

    loadRun(runId) {
      const run = state.runs[runId];
      if (!run) { actions.toast('运行 ' + runId + ' 不存在', 'danger'); return false; }
      if (run.role === 'baseline') state.baselineRun = run;
      setActiveRun(run);
      state.draft = clone(run.config);
      state.draftBaseHash = run.configHash;
      state.draftDirty = false;
      state.selectedComponent = defaultComponent(run.systemId);
      state.page = 'system';
      updateHashIfNeeded('system');
      persist();
      notify('run');
      return true;
    },

    deleteRun(runId) {
      if (state.activeRun && state.activeRun.runId === runId) {
        actions.toast('不能删除当前正在查看的运行', 'warn');
        return false;
      }
      delete state.runs[runId];
      if (state.baselineRun && state.baselineRun.runId === runId) state.baselineRun = null;
      if (state.monitorRun && state.monitorRun.runId === runId) state.monitorRun = null;
      persist();
      notify('run');
      return true;
    },

    /* EvidenceBundle v1 导入入库（校验在 FL.bundle.importBundle 内完成）：
       role=imported、不覆盖现有 Run；同 run_id 冲突时追加后缀。 */
    addImportedRun(run) {
      if (!run || run.role !== 'imported') {
        actions.toast('只能导入通过校验的 imported 运行', 'danger');
        return { ok: false };
      }
      let id = run.runId || 'RUN-IMPORTED';
      while (state.runs[id]) {
        id = id + '-A' + String(Object.keys(state.runs).length + 1);
      }
      if (id !== run.runId) {
        const m = Object.assign({}, run.manifest, { run_id: id });
        const patched = JSON.parse(JSON.stringify(run));
        patched.runId = id;
        patched.manifest = m;
        run = FL.registry.deepFreeze(patched);
      }
      state.runs[id] = run;
      state.systemId = run.systemId || state.systemId;
      setActiveRun(run, { keepTime: false });
      pruneRuns();
      persist();
      actions.toast('已导入（角色=imported）' + id + '：现有运行未被覆盖', 'ok');
      notify('run');
      return { ok: true, run };
    },

    /* 后端对照运行入库（FL-19 增量三；V312 §6 断言已由 createFromParts 保证
       scope=extension_preview / manifest.backend）。不覆盖现有 Run。 */
    addBackendRun(run) {
      if (!run || !run.manifest || !run.manifest.backend) {
        actions.toast('仅接受由后端组装层产出的运行（manifest.backend）', 'danger');
        return { ok: false };
      }
      let id = run.runId || 'RUN-BACKEND';
      while (state.runs[id]) {
        id = id + '-B' + String(Object.keys(state.runs).length + 1);
      }
      if (id !== run.runId) {
        const patched = JSON.parse(JSON.stringify(run));
        patched.runId = id;
        const m = Object.assign({}, patched.manifest, { run_id: id });
        patched.manifest = m;
        run = FL.registry.deepFreeze(patched);
      }
      state.runs[id] = run;
      setActiveRun(run, { keepTime: false });
      pruneRuns();
      persist();
      actions.toast('后端对照运行已入库（' + (run.manifest.backend.id) + ' · scope=extension_preview）', 'ok');
      notify('run');
      return { ok: true, run };
    },

    navigate(pageId) {
      if (state.truthSealed && ['signals', 'causal', 'compare'].indexOf(pageId) >= 0) {
        actions.toast('盲测进行中：真值相关页面已封存，比赛结束后解锁', 'warn');
        return;
      }
      if (state.page === pageId) {
        notify('nav');
        return;
      }
      state.page = pageId;
      updateHashIfNeeded(pageId);
      notify('nav');
    },

    selectComponent(componentId) {
      state.selectedComponent = componentId;
      notify('selection');
    },

    updateDraft(patchOrFn) {
      if (!state.draft) return;
      const next = clone(state.draft);
      if (typeof patchOrFn === 'function') patchOrFn(next);
      else Object.assign(next, patchOrFn);
      state.draft = next;
      const val = validateDraft(next);
      state.draftErrors = val.errors || [];
      updateDirty();
      notify('draft');
    },

    setDraft(next) {
      state.draft = clone(next);
      const val = validateDraft(state.draft);
      state.draftErrors = val.errors || [];
      updateDirty();
      notify('draft');
    },

    resetDraft() {
      state.draft = systemDraft(state.systemId);
      state.draftErrors = [];
      updateDirty();
      actions.toast('草稿已恢复默认参数（历史运行不受影响）', 'info');
      notify('draft');
    },

    setTime(t, opts) {
      const o = opts || {};
      state.currentTime = clampTime(t);
      if (o.pause !== false && state.playback.status === 'playing') {
        state.playback.status = 'paused';
        stopClock();
      }
      notify('time');
    },

    play() {
      if (!state.activeRun) { actions.toast('请先创建运行', 'warn'); return; }
      if (state.playback.status === 'ended' || state.currentTime >= duration()) state.currentTime = 0;
      state.playback.status = 'playing';
      startClock();
      notify('playback');
    },

    pause() {
      if (state.playback.status !== 'playing') return;
      state.playback.status = 'paused';
      stopClock();
      notify('playback');
    },

    togglePlay() {
      if (state.playback.status === 'playing') actions.pause();
      else actions.play();
    },

    replay() {
      if (!state.activeRun) return;
      stopClock();
      state.currentTime = 0;
      state.playback.status = 'playing';
      startClock();
      notify('time');
      notify('playback');
    },

    setSpeed(speed) {
      const allowed = [0.5, 1, 2, 4];
      state.playback.speed = allowed.indexOf(speed) >= 0 ? speed : 1;
      notify('playback');
    },

    jumpToFault() {
      if (!state.activeRun) return;
      const ev = (FL.protocol && FL.protocol.faultEvent) ? FL.protocol.faultEvent(state.activeRun) : null;
      if (!ev) { actions.toast('本运行没有故障事件', 'info'); return; }
      actions.setTime(ev.trigger_s, { pause: true });
    },

    stepEvent(dir) {
      if (!state.activeRun) return;
      const evs = (state.activeRun.events || []).slice().sort((a, b) => a.trigger_s - b.trigger_s);
      if (!evs.length) return;
      let target = null;
      if (dir > 0) {
        target = evs.filter((e) => e.trigger_s > state.currentTime + 0.05)[0] || null;
      } else {
        target = evs.filter((e) => e.trigger_s < state.currentTime - 0.05).slice(-1)[0] || null;
      }
      if (!target) { actions.toast('没有更多事件', 'info', 1500); return; }
      actions.setTime(target.trigger_s, { pause: true });
    },

    setPageState(pageId, patch) {
      const prev = state.pageState[pageId] || {};
      state.pageState[pageId] = Object.assign({}, prev, patch || {});
      notify('view');
    },

    setChartCategory(category) {
      state.pageState.signals.category = category;
      notify('view');
    },

    openDrawer(id) { state.drawer = id; notify('view'); },
    closeDrawer() { state.drawer = null; notify('view'); },
    openModal(id) { state.modal = id; notify('view'); },
    closeModal() { state.modal = null; notify('view'); },
    setIntroStep(n) { state.introStep = n | 0; notify('view'); },

    toast(message, tone, ttl) {
      const id = 'T' + (++toastSeq);
      state.toasts.push({ id, message, tone: tone || 'info', ttl: ttl || 4200 });
      notify('toast');
      setTimeout(() => {
        state.toasts = state.toasts.filter((t) => t.id !== id);
        notify('toast');
      }, ttl || 4200);
      return id;
    },

    setTruthSealed(sealed) {
      state.truthSealed = !!sealed;
      state.mode = sealed ? 'blind' : 'demo';
      if (sealed && ['signals', 'causal', 'compare'].indexOf(state.page) >= 0) {
        state.page = 'arena';
        updateHashIfNeeded('arena');
      }
      notify('arena');
    },

    setArenaState(patch) {
      const cur = state.pageState.arena || {};
      state.pageState.arena = Object.assign({}, cur, patch || {});
      notify('arena');
    },

    restoreLastSession() {
      const ids = Object.keys(state.runs);
      if (!ids.length) { actions.toast('浏览器里还没有可恢复的实验', 'info'); return; }
      ids.sort((a, b) => ((state.runs[b].createdAt || '').localeCompare(state.runs[a].createdAt || '')));
      actions.loadRun(ids[0]);
      actions.toast('已恢复上次实验 ' + ids[0], 'ok');
    },

    resetAll() {
      stopClock();
      try { localStorage.removeItem(LS_RUNS); localStorage.removeItem(LS_SESSION); } catch (e) { /* ignore */ }
      state = baseState();
      init({ fresh: true });
      notify('all');
    }
  };

  function updateHashIfNeeded(pageId) {
    try {
      const next = '#/' + pageId;
      if (location.hash !== next) history.replaceState(null, '', next);
    } catch (e) { /* ignore */ }
  }

  /* --------------------------------------------------------------- init */
  function init(opts) {
    const o = opts || {};
    if (o.fresh) {
      state.systemId = 'FL-001';
      state.draft = systemDraft('FL-001');
      state.selectedComponent = defaultComponent('FL-001');
      state.page = 'home';
      state.booted = true;
      return;
    }
    const persisted = loadPersisted();
    state.runs = persisted.runs || {};
    const session = persisted.session || null;
    state.lastSession = session;

    // query params for QA / deep links: ?system=FC-001&page=system&demo=1
    let params = new URLSearchParams();
    try { params = new URLSearchParams(location.search); } catch (e) { /* ignore */ }
    if (params.get('reset') === '1') {
      try { localStorage.removeItem(LS_RUNS); localStorage.removeItem(LS_SESSION); } catch (e) { /* ignore */ }
      state.runs = {};
    }
    const wantedSystem = params.get('system');
    let sid = (wantedSystem && systemExists(wantedSystem)) ? wantedSystem : (session && session.systemId) || 'FL-001';
    if (!systemExists(sid)) sid = 'FL-001';
    state.systemId = sid;
    state.draft = (session && session.draft && session.draft.systemId === sid) ? clone(session.draft) : systemDraft(sid);
    state.draftErrors = [];
    state.draftBaseHash = (session && session.systemDraftHash) || null;
    updateDirty();
    state.selectedComponent = defaultComponent(sid);

    // restore previous active run into registry refs (not auto-activated: home offers restore)
    // 深链接 ?system=X 时只恢复属于 X 的 Run，避免页面系统与 Run 系统不一致
    const restoredRun = (session && session.activeRunId) ? state.runs[session.activeRunId] : null;
    if (restoredRun && restoredRun.systemId === sid) {
      const r = restoredRun;
      if (r.role === 'baseline') state.baselineRun = r;
      else state.activeRun = r;
      state.draft = clone(r.config);
      state.draftBaseHash = r.configHash;
      state.draftErrors = [];
      updateDirty();
      state.computeState = 'completed';
      state.pageState.signals.category = (r.signals && r.signals[0] && r.signals[0].category) || 'current';
      state.pageState.signals.visible = defaultVisibleMap(r);
    }
    if (session && session.baselineRunId && state.runs[session.baselineRunId] &&
      state.runs[session.baselineRunId].systemId === sid) {
      state.baselineRun = state.runs[session.baselineRunId];
    }

    // page from hash / query
    let page = 'home';
    const hashMatch = /^#\/([a-z]+)/.exec(location.hash || '');
    if (hashMatch) page = hashMatch[1];
    const qPage = params.get('page');
    if (qPage) page = qPage;
    if (!FL.pages || !FL.pages[page]) page = 'home';

    // QA/demo bootstrap: ?demo=1 auto-creates a default fault run (+baseline)
    if (params.get('demo') === '1') {
      state.page = page;
      state.booted = true;
      if (!state.activeRun || state.activeRun.systemId !== sid) {
        state.activeRun = null;
        state.baselineRun = (state.baselineRun && state.baselineRun.systemId === sid) ? state.baselineRun : null;
        state.systemId = sid;
        state.draft = systemDraft(sid);
        actions.startExperiment(sid, { silent: true });
      }
      if (!state.baselineRun || state.baselineRun.systemId !== sid) ensureBaselineInternal();
      state.page = page;
      state.computeState = state.activeRun ? 'completed' : 'draft_valid';
      state.currentTime = params.get('t') ? clampTime(parseFloat(params.get('t'))) : 0;
      updateHashIfNeeded(page);
      notify('boot');
      return;
    }

    state.page = page;
    state.computeState = state.activeRun ? 'completed' : 'draft_valid';
    state.booted = true;
    updateHashIfNeeded(page);
    notify('boot');
  }

  function systemExists(sid) {
    try { return !!(FL.systems && FL.systems.list().filter((s) => s.id === sid).length); } catch (e) { return false; }
  }

  FL.store = {
    getState: () => state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    init,
    actions,
    stopClock
  };
})();
