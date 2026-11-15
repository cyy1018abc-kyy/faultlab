/* owner: arena-protocol | module: tools/arena-l2-core | contract: G9_G10_ARCH_GATE_SPEC_DRAFT.md §3（G10——落档外部 spec 原文逐字承接；
   V190_WAVE_DESIGN DEC-3，CHG-20261115-09/-10）
   arena-l2-core — Arena Level 2 共享核心（评测轨，零第三方依赖；gen/mcp-server/verify 三方
   共用同一实现，杜绝双实现漂移）。

   职责（spec §3 逐字承接）：
     ① 双层遥测封装构造（§3.1）：coarse_beacon（2.0 s 自由粗网格，31 行，剥 pre/post 相位行
        ——触发时刻只含单 post 采样值，保留 20 s 传感阶跃 vs 执行器渐变的认知模糊带）+
        high_res_store（0.1 s 全网格 + 精确 boundary 行——pre=left_limit/post=post_sample，
        事件边界行源自 run.snapshots 左极限快照）；
     ② 查询预算与 query_ledger 契约（§3.2）：c_i = K_i × M_i；B_max=180 硬帽（超支拒收）、
        B_min=45 最优目标；账本条目含 slice_sha256（返回行数组规范 JSON 的 SHA-256）；
     ③ L2 提交封存（§3.2③）：export 时嵌 query_ledger 并以 submission_sha256 封章；
     ④ L2 校验与评分（§3.3/§3.4）：N-B20 无据锚点（时窗重叠 <80% 拒收）、N-B21 预算超支/
        代价公式违约、N-B22 账本重放哈希不符、N-B23 观测词面扫描（水位/液位/water level/
        liquid level/验证通过/硬件已验证）；V-11a/b onset/propagation 锚点接地加分；
        S_diag(50)+S_anchor(30)+S_eff(20) 四位小数落章。

   编号勘误登记（V190 收口）：原文 N-B18..N-B20 与仓内既有 N-B18/N-B19（V150 O-1
   CHG-20261114-05——族枚举面，冻结不得删减）撞号 ⇒ 仓内重基线 N-B20..N-B22 + N-B23
   （面⑤「不得删减只可增补」纪律；映射：原文 N-B18→仓内 N-B20、N-B19→N-B21、
   N-B20→N-B22、原文 N-B13+ 词面→N-B23 提交侧 + copy-guard src/** 面）。
   L0 轨 rule_id = 因果模板节点 id（n1…n6，结构面）；语义规则匹配（FC_RULE_01…06）
   随 FMU 轨（FCFMU-G2b-04）到位——L0 轨 V-11 规则匹配为结构校验，登记不虚设。 */

import crypto from 'node:crypto';

export const L2_SCHEMA = 'faultlab.arena.l2.blindpack.v1';
export const L2_SCORE_SCHEMA = 'faultlab.arena.l2.score.v1';
export const L2_PROTOCOL = 'l2';
export const COARSE_DT_S = 2.0;
export const B_MAX_POINTS = 180;
export const B_MIN_POINTS = 45;
export const ANCHOR_OVERLAP_MIN = 0.80;
export const ONSET_WIDTH_MAX_S = 2.0;
export const PROPAGATION_MIN_S = 5.0;
export const L2_BANNED_TERMS = ['水位', '液位', 'water level', 'liquid level', '验证通过', '硬件已验证'];

export function l2Error(code, field, message, next) {
  const err = new Error('[L2-' + code + '] ' + message);
  err.name = 'ArenaL2Error';
  err.code = 'L2-' + code;
  err.field = field || '$';
  err.next = next || '按 Arena L2 协议修正后重试';
  return err;
}

function sha256Text(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function isNum(v) {
  return typeof v === 'number' && isFinite(v);
}

function uuidV4() {
  const b = crypto.randomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString('hex');
  return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20, 32);
}

/* -----------------------------------------------------------------------
 * ① 双层遥测封装构造（§3.1）
 * ----------------------------------------------------------------------- */

/* 单 episode 双层封装。boundary 来源 = run.snapshots（phase=pre 左极限快照——ADR-002
   事件编码；post 行 = series 触发行的 post 采样语义）。无事件（健康局）⇒ 601 行 +
   空 boundary_rows。 */
export function buildL2Episode(index, run, observables) {
  const t = run.timeseries.t;
  const signals = run.timeseries.signals || {};
  const n = t.length;                       /* 601 */
  const dt = t.length > 1 ? +(t[1] - t[0]).toFixed(6) : 0.1;
  const duration = t[n - 1];

  const valAt = (arr, i) => (arr && isNum(arr[i]) ? arr[i] : null);
  const rowOf = (i) => [t[i]].concat(observables.map((o) => valAt(signals[o.id], i)));

  const preSnap = (run.snapshots || []).find((s) => s && s.phase === 'pre');
  const rows = [];
  const boundaryRows = [];
  if (preSnap && isNum(preSnap.t_s)) {
    const idx = Math.round(preSnap.t_s / dt);
    if (idx < 0 || idx >= n) throw l2Error('E01', 'episodes', '事件快照时刻越界');
    for (let i = 0; i < idx; i++) rows.push(rowOf(i));
    const preRow = [preSnap.t_s].concat(observables.map((o) => {
      const v = preSnap.variables ? preSnap.variables[o.id] : undefined;
      return isNum(v) ? v : null;
    }));
    boundaryRows.push({ index: rows.length, t: preSnap.t_s, phase: 'pre', derivation: 'left_limit' });
    rows.push(preRow);
    boundaryRows.push({ index: rows.length, t: t[idx], phase: 'post', derivation: 'post_sample' });
    rows.push(rowOf(idx));
    for (let i = idx + 1; i < n; i++) rows.push(rowOf(i));
  } else {
    for (let i = 0; i < n; i++) rows.push(rowOf(i));
  }

  /* coarse beacon：2.0 s 网格采样 series（触发行取 post 采样值、无相位标注——§3.1① 模糊带） */
  const step = Math.round(COARSE_DT_S / dt);
  const beaconRows = [];
  for (let i = 0; i * step < n; i++) beaconRows.push(rowOf(i * step));

  return {
    episode_id: uuidV4(),
    index,
    dt_s: dt,
    duration_s: duration,
    observables: observables.map((o) => ({ id: o.id, label: o.label, unit: o.unit })),
    coarse_beacon: { grid_dt_s: COARSE_DT_S, n_rows: beaconRows.length, rows: beaconRows },
    high_res_store: { dt_s: dt, n_rows: rows.length, rows, boundary_rows: boundaryRows },
  };
}

const L2_TOP_WHITELIST = ['schema', 'bundle_kind', 'arena_version', 'systemId', 'testset_id',
  'match_id', 'episodes', 'query_budget'];
const EPISODE_WHITELIST = ['episode_id', 'index', 'dt_s', 'duration_s', 'observables',
  'coarse_beacon', 'high_res_store'];
const STORE_WHITELIST = ['dt_s', 'n_rows', 'rows', 'boundary_rows'];
const BEACON_WHITELIST = ['grid_dt_s', 'n_rows', 'rows'];

/* ② 结构校验（closed-world 白名单 + 网格/边界完整性；§3.1/§3.2 契约面） */
export function validateL2Pack(pack, opts) {
  const o = opts || {};
  const err = (c, f, m, n) => { throw l2Error(c, f, m, n); };
  if (!pack || typeof pack !== 'object' || Array.isArray(pack)) {
    err('E01', '$', '盲包必须是 JSON 对象');
  }
  if (pack.schema !== L2_SCHEMA) err('E01', 'schema', 'schema 必须是 ' + L2_SCHEMA);
  if (pack.bundle_kind !== 'arena_blind_l2') err('E01', 'bundle_kind', 'bundle_kind 必须是 "arena_blind_l2"');
  if (typeof pack.systemId !== 'string' || !pack.systemId) err('E01', 'systemId', '缺少 systemId');
  if (!Array.isArray(pack.episodes) || !pack.episodes.length || pack.episodes.length > 12) {
    err('E07', 'episodes', 'episode 数须为 1–12');
  }
  Object.keys(pack).forEach((k) => {
    if (L2_TOP_WHITELIST.indexOf(k) < 0) err('E08', '$.' + k, '未知字段（closed-world）');
  });
  const seenEp = {};
  for (const ep of pack.episodes) {
    if (!ep || typeof ep !== 'object') err('E01', 'episodes', 'episode 必须是对象');
    Object.keys(ep).forEach((k) => {
      if (EPISODE_WHITELIST.indexOf(k) < 0) err('E08', 'episodes.' + k, '未知字段（closed-world）');
    });
    if (!/^[0-9a-f-]{36}$/.test(String(ep.episode_id))) err('E13', 'episode_id', 'episode_id 须为 opaque UUID');
    if (seenEp[ep.episode_id]) err('E07', 'episode_id', 'episode_id 重复');
    seenEp[ep.episode_id] = true;
    const obs = ep.observables;
    if (!Array.isArray(obs) || !obs.length || obs.length > 32) err('E06', 'observables', '观测通道须为 1–32 条');
    const dt = ep.dt_s;
    const store = ep.high_res_store;
    const beacon = ep.coarse_beacon;
    ['coarse_beacon', 'high_res_store'].forEach((k) => {
      Object.keys(ep[k]).forEach((kk) => {
        const wl = k === 'coarse_beacon' ? BEACON_WHITELIST : STORE_WHITELIST;
        if (wl.indexOf(kk) < 0) err('E08', 'episodes.' + k + '.' + kk, '未知字段（closed-world）');
      });
    });
    if (beacon.grid_dt_s !== COARSE_DT_S) err('E07', 'coarse_beacon.grid_dt_s', '粗网格须 2.0 s');
    if (beacon.n_rows !== beacon.rows.length) err('E07', 'coarse_beacon.n_rows', 'n_rows 与 rows 不一致');
    if (store.n_rows !== store.rows.length) err('E07', 'high_res_store.n_rows', 'n_rows 与 rows 不一致');
    /* 行数契约：601 网格行 + 每事件 1 条 pre 边界行（post 边界行 = 触发网格行的
       post 采样语义复用——不新增行；G10 原文 602 行/事件口径的仓内化）。 */
    const preRows = store.boundary_rows.filter((b) => b.phase === 'pre').length;
    const postRows = store.boundary_rows.filter((b) => b.phase === 'post').length;
    if (preRows !== postRows) err('E07', 'boundary_rows', 'pre/post 边界行须成对');
    const expected = Math.round(ep.duration_s / store.dt_s) + 1 + preRows;
    if (store.rows.length !== expected) {
      err('E07', 'high_res_store.rows', '行数 = 601 网格 + pre 边界行数（实得 ' + store.rows.length + ' ≠ ' + expected + '）');
    }
    const nCols = obs.length + 1;
    let prevT = null;
    for (let i = 0; i < store.rows.length; i++) {
      const row = store.rows[i];
      if (!Array.isArray(row) || row.length !== nCols) err('E07', 'rows[' + i + ']', '行长度须为 observables+1');
      const tv = row[0];
      if (!isNum(tv)) err('E07', 'rows[' + i + '][0]', '时间必须为数值');
      if (prevT !== null && !(tv >= prevT)) err('E07', 'rows[' + i + '][0]', '时间须非递减（边界行同刻）');
      prevT = tv;
      for (let j = 1; j < row.length; j++) {
        const v = row[j];
        if (v === null) continue;
        if (!isNum(v)) err('E10', 'rows[' + i + '][' + j + ']', '样本须为有限数值或 null');
        if (Math.abs(v) > 1e9) err('E10', 'rows[' + i + '][' + j + ']', '样本超阈值 1e9');
      }
    }
    for (const b of store.boundary_rows) {
      if (b.index < 0 || b.index >= store.rows.length) err('E07', 'boundary_rows', '边界行索引越界');
      if (Math.abs(store.rows[b.index][0] - b.t) > 1e-9) err('E07', 'boundary_rows', '边界行时间不一致');
      if (b.phase !== 'pre' && b.phase !== 'post') err('E07', 'boundary_rows', 'phase 须 pre/post');
    }
  }
  const qb = pack.query_budget;
  if (!qb || qb.b_max_points !== B_MAX_POINTS || qb.b_min_points !== B_MIN_POINTS) {
    err('E07', 'query_budget', 'query_budget 须钉 B_max=180 / B_min=45');
  }
  if (Array.isArray(o.approvedTestsetIds) && o.approvedTestsetIds.indexOf(pack.testset_id) < 0) {
    err('E13', 'testset_id', 'testset_id 不在本场批准清单内');
  }
  return { ok: true, episodes: pack.episodes.length };
}

/* -----------------------------------------------------------------------
 * ② 查询预算 + query_ledger 会话（§3.2）
 * ----------------------------------------------------------------------- */
export function createL2Session(pack) {
  validateL2Pack(pack);
  const episodes = {};
  pack.episodes.forEach((ep) => { episodes[ep.episode_id] = ep; });
  const ledger = [];
  let used = 0;

  function requireEpisode(episodeId) {
    const ep = episodes[episodeId];
    if (!ep) throw l2Error('E14', 'episode_id', '未知 episode：' + episodeId);
    return ep;
  }

  function sliceRows(ep, variables, tStart, tEnd, stride) {
    const store = ep.high_res_store;
    const obsIds = ep.observables.map((o) => o.id);
    for (const v of variables) {
      if (obsIds.indexOf(v) < 0) throw l2Error('E06', 'variables', '观测通道越权：' + v);
    }
    if (!isNum(tStart) || !isNum(tEnd) || tStart < 0 || tEnd > ep.duration_s || tStart > tEnd) {
      throw l2Error('E07', 't_start/t_end', '时窗非法（[0,' + ep.duration_s + '] 且 start ≤ end）');
    }
    if (!Number.isInteger(stride) || stride < 1) throw l2Error('E07', 'stride', 'stride 须为 ≥1 整数');
    const colIdx = variables.map((v) => obsIds.indexOf(v) + 1);
    const boundaryIdx = {};
    store.boundary_rows.forEach((b) => { boundaryIdx[b.index] = b; });
    const rows = [];
    const boundary = [];
    for (let i = 0; i < store.rows.length; i++) {
      const t = store.rows[i][0];
      if (t < tStart - 1e-9 || t > tEnd + 1e-9) continue;
      const isBoundary = boundaryIdx[i] !== undefined;
      if (!isBoundary) {
        const kk = Math.round(t / store.dt_s);
        if ((kk % stride) !== 0) continue;       /* 边界行永不跳过（§3.1②） */
      }
      rows.push([t].concat(colIdx.map((c) => store.rows[i][c])));
      if (isBoundary) {
        boundary.push({ row: rows.length - 1, phase: boundaryIdx[i].phase, derivation: boundaryIdx[i].derivation });
      }
    }
    return { rows, boundary };
  }

  return {
    getSummary(episodeId) {
      const ep = requireEpisode(episodeId);
      return { episode_id: ep.episode_id, dt_s: ep.dt_s, duration_s: ep.duration_s,
        observables: ep.observables, coarse_beacon: ep.coarse_beacon,
        budget: { used_points: used, b_max_points: B_MAX_POINTS, b_min_points: B_MIN_POINTS } };
    },

    sliceTelemetry(episodeId, variables, tStart, tEnd, stride) {
      const ep = requireEpisode(episodeId);
      if (!Array.isArray(variables) || !variables.length) {
        throw l2Error('E06', 'variables', 'variables 须为非空数组');
      }
      const { rows, boundary } = sliceRows(ep, variables, tStart, tEnd, stride);
      const cost = variables.length * rows.length;          /* c_i = K_i × M_i（§3.2①） */
      if (used + cost > B_MAX_POINTS) {
        throw l2Error('E19', 'budget', '预算超支：已用 ' + used + ' + 本次 ' + cost
          + ' > B_max=' + B_MAX_POINTS, '缩减 variables/时窗/加大 stride 后重试');
      }
      used += cost;
      const entry = {
        seq: ledger.length + 1,
        episode_id: episodeId,
        variables: variables.slice(),
        t_start: tStart,
        t_end: tEnd,
        stride,
        returned_rows: rows.length,
        cost_points: cost,
        slice_sha256: sha256Text(JSON.stringify(rows)),
        includes_pre_post: boundary.length > 0,
      };
      ledger.push(entry);
      return { rows, boundary, cost_points: cost, used_points: used, seq: entry.seq };
    },

    budgetUsed() { return used; },

    ledger() { return ledger.map((e) => Object.assign({}, e)); },

    /* ③ 提交封存：嵌 query_ledger + submission_sha256（剥离封章字段后规范 JSON 的 SHA-256） */
    exportSubmission(input) {
      const sub = input && typeof input === 'object' ? input : {};
      const out = {
        protocol: L2_PROTOCOL,
        agent: sub.agent || { name: 'unnamed-l2-agent' },
        testset_id: pack.testset_id,
        match_id: pack.match_id,
        episodes: Array.isArray(sub.episodes) ? sub.episodes : [],
        query_ledger: ledger.map((e) => Object.assign({}, e)),
      };
      out.submission_sha256 = sha256Text(JSON.stringify(out));
      return out;
    },
  };
}

export function verifySealedSubmission(sub) {
  if (!sub || typeof sub !== 'object' || sub.protocol !== L2_PROTOCOL) {
    throw l2Error('E11', 'protocol', '提交须锚定 protocol:"l2"');
  }
  const seal = sub.submission_sha256;
  const body = Object.assign({}, sub);
  delete body.submission_sha256;
  const ok = seal === sha256Text(JSON.stringify(body));
  if (!ok) throw l2Error('E22', 'submission_sha256', '封章哈希不符（载荷被篡改或缺 query_ledger）');
  return ok;
}

/* -----------------------------------------------------------------------
 * ③ 校验 + 评分（§3.3 N-B20..22 + §3.4 V-11a/b 与 S_diag/S_anchor/S_eff）
 * ----------------------------------------------------------------------- */
function replaySlice(pack, entry) {
  const ep = pack.episodes.find((e) => e.episode_id === entry.episode_id);
  if (!ep) throw l2Error('E22', 'query_ledger', '账本条目 episode 不在盲包内：' + entry.episode_id);
  const session = createL2Session(pack);
  const out = session.sliceTelemetry(entry.episode_id, entry.variables, entry.t_start,
    entry.t_end, entry.stride);
  return out;
}

function overlapRatio(a0, a1, b0, b1) {
  const lo = Math.max(a0, b0);
  const hi = Math.min(a1, b1);
  const width = a1 - a0;
  if (width <= 0) return 0;
  return Math.max(0, (hi - lo)) / width;
}

function containsBanned(text) {
  if (typeof text !== 'string') return null;
  const low = text.toLowerCase();
  for (const term of L2_BANNED_TERMS) {
    if (low.indexOf(term.toLowerCase()) >= 0) return term;
  }
  return null;
}

/* L2 评分主链：先 N-B21/N-B22/N-B20/N-B23 拒收面，再 V-11a/b 与三分量评分。 */
export function scoreL2Submission(parts) {
  const p = parts || {};
  const pack = p.pack;
  const submission = p.submission;
  const reveal = p.reveal;
  if (!pack || pack.schema !== L2_SCHEMA) throw l2Error('E01', 'pack', '盲包 schema 非法');
  verifySealedSubmission(submission);
  if (!reveal || reveal.testset_id !== pack.testset_id || reveal.match_id !== pack.match_id) {
    throw l2Error('E12', 'reveal', 'reveal 缺失/不匹配（评分需组织方映射）');
  }
  const ledger = Array.isArray(submission.query_ledger) ? submission.query_ledger : [];
  if (!ledger.length) throw l2Error('E21', 'query_ledger', '账本为空（L2 提交须有高分辨率查询证据）');

  /* N-B21 预算：代价公式逐条 + 累计硬帽 */
  let used = 0;
  for (const e of ledger) {
    if (!e || !Array.isArray(e.variables)) throw l2Error('E21', 'query_ledger', '账本条目非法');
    const expect = e.variables.length * e.returned_rows;
    if (e.cost_points !== expect) {
      throw l2Error('E21', 'query_ledger[' + (e.seq || 0) + ']', 'cost_points ≠ K×M（'
        + e.cost_points + ' ≠ ' + e.variables.length + '×' + e.returned_rows + '）');
    }
    used += e.cost_points;
    if (used > B_MAX_POINTS) {
      throw l2Error('E21', 'query_ledger', '累计预算超支：' + used + ' > ' + B_MAX_POINTS);
    }
  }

  /* N-B22 账本重放：逐条对盲包重算 slice，比对 slice_sha256 与 returned_rows */
  for (const e of ledger) {
    let replay;
    try {
      replay = replaySlice(pack, e);
    } catch (err) {
      throw l2Error('E22', 'query_ledger[' + (e.seq || 0) + ']', '重放失败：' + err.message);
    }
    if (replay.rows.length !== e.returned_rows
      || sha256Text(JSON.stringify(replay.rows)) !== e.slice_sha256) {
      throw l2Error('E22', 'query_ledger[' + (e.seq || 0) + ']',
        '重放哈希/行数不符（盲包与账本不一致或参数被改）');
    }
    if (e.includes_pre_post !== (replay.boundary.length > 0)) {
      throw l2Error('E22', 'query_ledger[' + (e.seq || 0) + ']', 'includes_pre_post 与重放不符');
    }
  }

  /* 逐 episode 评分 */
  const truthByRound = {};
  (reveal.mapping || []).forEach((m) => { truthByRound[m.round] = m.truth || {}; });
  const outEpisodes = [];
  let total = 0;
  for (const ep of submission.episodes || []) {
    const packEp = pack.episodes.find((e) => e.episode_id === ep.episode_id);
    if (!packEp) throw l2Error('E14', 'episodes', '提交 episode 不在盲包内：' + ep.episode_id);
    const truth = truthByRound[packEp.index] || {};
    const diag = ep.diagnosis || {};
    for (const field of ['explanation']) {
      const hit = containsBanned(diag[field]);
      if (hit) throw l2Error('E23', 'episodes.diagnosis.' + field, '观测词面禁词命中：' + hit);
    }
    const anchors = Array.isArray(ep.evidence_anchors) ? ep.evidence_anchors : [];
    for (const a of anchors) {
      const hit = containsBanned(a && a.note);
      if (hit) throw l2Error('E23', 'evidence_anchors.note', '观测词面禁词命中：' + hit);
    }

    const fFaulty = truth.healthy ? false : true;
    const fStar = truth.faultFamily || 'none';
    const fHat = diag.faultDetected ? (diag.faultType || 'none') : 'none';
    let sDiag = 0;
    if (!fFaulty) {
      sDiag = (fHat === 'none' && (diag.detectTime_s === null || diag.detectTime_s === undefined)) ? 50 : 0;
    } else {
      const mStar = truth.magnitude && isNum(truth.magnitude.value) ? truth.magnitude.value : null;
      const mUnit = truth.magnitude && truth.magnitude.unit ? truth.magnitude.unit : '';
      const mHat = diag.magnitude && isNum(diag.magnitude.value) ? diag.magnitude.value : null;
      const magOk = mStar !== null && mHat !== null && diag.magnitude && diag.magnitude.unit === mUnit
        && Math.abs(mHat - mStar) <= 0.1;
      sDiag = 20.0 * (fHat === fStar ? 1 : 0)
        + 15.0 * (magOk ? 1 : 0)
        + 15.0 * (isNum(diag.detectTime_s) && truth.t_fault !== null && truth.t_fault !== undefined
          && Math.abs(diag.detectTime_s - truth.t_fault) <= 0.1 ? 1 : 0);
    }

    /* 锚点接地（N-B20 先行：逐锚点时窗重叠 ≥80% 且 backed_by_query_seq 可解析） */
    let v11a = 0;
    let v11b = 0;
    let steadyOk = false;
    for (const a of anchors) {
      if (!a || !isNum(a.t_start) || !isNum(a.t_end) || !Number.isInteger(a.backed_by_query_seq)) {
        throw l2Error('E20', 'evidence_anchors', '锚点须含 t_start/t_end/backed_by_query_seq');
      }
      const entry = ledger.find((e) => e.seq === a.backed_by_query_seq);
      if (!entry) throw l2Error('E20', 'evidence_anchors', 'backed_by_query_seq 无对应账本条目：'
        + a.backed_by_query_seq);
      const overlap = overlapRatio(a.t_start, a.t_end, entry.t_start, entry.t_end);
      if (overlap < ANCHOR_OVERLAP_MIN) {
        throw l2Error('E20', 'evidence_anchors', '锚点时窗与账本条目重叠 '
          + (overlap * 100).toFixed(1) + '% < 80%（无据锚点拒收）');
      }
      if (a.t_end <= a.t_start) throw l2Error('E20', 'evidence_anchors', '锚点时窗须正宽度');
      /* 规则接地：rule_id 必填；truth 携带期望 id 时须精确匹配（L0 轨 = 模板节点 id
         n1…n6 结构面——FMU 轨 FC_RULE_01…06 语义匹配随 G2b-04） */
      const ruleOk = typeof a.rule_id === 'string' && a.rule_id.length > 0
        && (!truth.rule_id_onset || a.rule_id === truth.rule_id_onset);
      if (a.kind === 'onset' && fFaulty) {
        const coversOnset = truth.t_fault !== null && truth.t_fault !== undefined
          && a.t_start <= truth.t_fault && a.t_end >= truth.t_fault
          && (a.t_end - a.t_start) <= ONSET_WIDTH_MAX_S;
        if (coversOnset && entry.includes_pre_post && ruleOk) v11a = 15.0;
      }
      if (a.kind === 'propagation' && fFaulty) {
        const coversProp = truth.t_fault !== null && truth.t_fault !== undefined
          && a.t_end >= truth.t_fault + PROPAGATION_MIN_S;
        const propOk = !truth.rule_id_propagation || (typeof a.rule_id === 'string'
          && a.rule_id.length > 0 && a.rule_id === truth.rule_id_propagation);
        if (coversProp && propOk) v11b = 15.0;
      }
      if (a.kind === 'steady_state') steadyOk = true;
    }
    const diagMatch = (!fFaulty && fHat === 'none') || (fFaulty && fHat === fStar);
    let sAnchor = 0;
    if (diagMatch) {
      if (fFaulty) sAnchor = v11a + v11b;
      else if (steadyOk) sAnchor = 30.0;
    }

    let sEff = 0;
    if (sDiag === 50.0) {
      sEff = 20.0 * Math.min(1.0, Math.max(0.0, (B_MAX_POINTS - used) / (B_MAX_POINTS - B_MIN_POINTS)));
    }
    const score = Math.round((sDiag + sAnchor + sEff) * 10000) / 10000;
    total += score;
    outEpisodes.push({
      index: packEp.index,
      episode_id: ep.episode_id,
      s_diag: sDiag, s_anchor: sAnchor, s_eff: sEff,
      score,
      v11a: v11a > 0, v11b: v11b > 0,
      budget_used_points: used,
    });
  }
  if (!outEpisodes.length) throw l2Error('E11', 'episodes', '提交不含任何 episode');

  const hashInput = {
    submission_sha256: submission.submission_sha256,
    scoring: 'l2.v1: S_diag(50)+S_anchor(30)+S_eff(20); B_max=180; B_min=45; '
      + 'overlap>=0.80; onset<=2.0s; prop>=5.0s; N-B20/21/22/23',
    episodes: outEpisodes,
  };
  return {
    schema: L2_SCORE_SCHEMA,
    bundle_kind: pack.bundle_kind,
    testset_id: pack.testset_id,
    match_id: pack.match_id,
    episodes: outEpisodes,
    avg_score: Math.round(total / outEpisodes.length * 10000) / 10000,
    budget_used_points: used,
    budget_max_points: B_MAX_POINTS,
    score_hash: sha256Text(JSON.stringify(hashInput)),
    notice: '合成故障评测游戏（L2 主动探查协议），非真实诊断性能',
  };
}
