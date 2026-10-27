/* owner: lab-pages | module: page-system | contract: docs/CONTRACT.md */
/* 系统交互图：左栏故障编排（3 故障家族 + 幅值/时刻 + 闭环/仅监测 + 校验/脏提示 + 创建运行/播放控制）、
   中栏 SVG 拓扑（由 system.components/edges/topologyViewBox 驱动，实线箭头=功率流、虚线=信号/测量、
   故障点专属三角+斜纹+FLT 标记，节点显示当前时刻采样值）、右栏部件检查器（字段来自
   system.components[].inspector，值来自 run 当前时刻，带 source_kind 标签，可跳曲线页/因果页）。 */
(function () {
  'use strict';
  const FL = window.FL = window.FL || {};
  const pages = FL.pages = FL.pages || {};

  const SVG_NS = 'http://www.w3.org/2000/svg';

  /* 节点数值的来源短标签（文字，不只靠颜色） */
  const SRC_SHORT = {
    MODEL_STATE: '真值', OBSERVATION: '观测', CONTROLLER: '控制', FAULT_EVENT: '故障',
    DERIVED: '派生', MODEL_ASSUMPTION: '假设', CONFIG: '配置'
  };
  const KIND_LABEL = {
    generator: '发电机', battery: '电池', converter: '变换器', bus: '母线', load: '负载',
    sensor: '传感器', controller: '控制器', governor: '调速器', fuelcell: '燃料电池',
    turbine: '涡轮', valve: '阀门', speed_sensor: '传感器'
  };
  const KIND_ICON = {
    generator: 'bolt', battery: 'battery', converter: 'swap', bus: 'bus', load: 'load',
    sensor: 'sensor', controller: 'controller', governor: 'controller',
    fuelcell: 'fuelcell', turbine: 'turbine', valve: 'sliders'
  };
  const FAMILY_ICON = { sensor_drift: 'sensor', load_step: 'load', actuator_fault: 'sliders' };
  /* 节点默认展示哪个来源的数值（按部件类型优先） */
  const KIND_SRC_PREF = {
    sensor: ['OBSERVATION', 'MODEL_STATE', 'FAULT_EVENT'],
    valve: ['OBSERVATION', 'CONTROLLER', 'FAULT_EVENT'],
    controller: ['CONTROLLER', 'OBSERVATION', 'DERIVED'],
    governor: ['CONTROLLER', 'OBSERVATION'],
    bus: ['MODEL_ASSUMPTION', 'DERIVED'],
    load: ['CONFIG', 'MODEL_STATE']
  };
  const DEFAULT_SRC_PREF = ['MODEL_STATE', 'DERIVED', 'OBSERVATION', 'CONTROLLER', 'FAULT_EVENT', 'MODEL_ASSUMPTION', 'CONFIG'];
  const FIELD_LABELS = {
    'fault.params.magnitude': '故障幅值', 'fault.params': '故障参数', 'fault.t_start_s': '故障时刻',
    'feedback_mode': '控制模式', 'fault.family': '故障家族', 'fault.faultId': '故障类型',
    'duration_s': '仿真时长', 'dt_s': '采样周期', 'initial': '初始条件', 'noise': '观测噪声'
  };

  const local = {
    sysId: null, sys: null, layout: null, router: null,
    nodeMeta: {}, edgeEls: [],
    familyEls: {}, familyMeta: {},
    controlFamilyKey: null, controlMeta: null, modeSeg: null,
    inspectorKey: null, inspectorValues: [],
    headerKey: null, runKey: null, noticeKey: null, badgeKey: null,
    faultKey: null, leftNoticeKey: null, topoNoteKey: null,
    refs: {},
    escHandler: null
  };

  let ui = null;
  let actions = null;
  let getState = null;
  let protocol = null;
  let fmt = null;
  let apiRef = null;

  /* ================================================================== */
  /* generic helpers                                                    */
  /* ================================================================== */
  function el(tag, attrs) {
    return ui.h.apply(null, [tag, attrs].concat(Array.prototype.slice.call(arguments, 2)));
  }
  function svgEl(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        if (attrs[k] === null || attrs[k] === undefined) return;
        node.setAttribute(k, String(attrs[k]));
      });
    }
    return node;
  }
  function safe(fn, fallback) {
    try { return fn(); } catch (err) { console.warn('[system]', err); return fallback; }
  }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function state() { return getState ? getState() : null; }
  function decimalsOf(step) {
    const s = String(step);
    const i = s.indexOf('.');
    return i < 0 ? 0 : s.length - i - 1;
  }
  function snapClamp(v, min, max, step, decimals) {
    const n = Number(v);
    if (!isFinite(n)) return min;
    const base = min + Math.round((n - min) / step) * step;
    const clamped = Math.min(max, Math.max(min, base));
    return Number(clamped.toFixed(Math.max(decimals, 0)));
  }
  function clampNum(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function fmtPoint(p) { return (Math.round(p.x * 10) / 10) + ' ' + (Math.round(p.y * 10) / 10); }
  function sortedEvents(run) {
    if (!run || !run.events) return [];
    return run.events.filter((e) => e && e.event_type && e.event_type !== 'healthy')
      .slice().sort((a, b) => a.trigger_s - b.trigger_s);
  }
  function cleanEventLabel(ev) {
    const label = String((ev && ev.label) || '').replace(/\s*@\s*[\d.]+\s*s\s*$/i, '').trim();
    if (label) return label;
    if (ev && ev.magnitude != null) return '幅值 ' + ev.magnitude + ' ' + (ev.unit || '');
    return '故障事件';
  }
  function faultEventOf(run) {
    const evs = sortedEvents(run);
    return evs.length ? evs[0] : null;
  }
  function findFault(sys, family) {
    if (!sys || !sys.faults) return null;
    for (let i = 0; i < sys.faults.length; i++) if (sys.faults[i].family === family) return sys.faults[i];
    return null;
  }
  function compById(sys, id) {
    if (!sys || !sys.components) return null;
    for (let i = 0; i < sys.components.length; i++) if (sys.components[i].id === id) return sys.components[i];
    return null;
  }
  function componentSignals(sys, comp) {
    const map = {};
    (sys.signals || []).forEach((s) => { map[s.id] = s; });
    const ids = [];
    ((comp && comp.inspector) || []).forEach((it) => {
      if (map[it.id] && ids.indexOf(it.id) < 0) ids.push(it.id);
    });
    return ids;
  }
  function draftOf(state0, sys) {
    const d = state0 && state0.draft;
    if (!d || !sys) return null;
    if (d.systemId && d.systemId !== sys.id) return null;
    return d;
  }
  function runOf(state0, sys) {
    const r = state0 && state0.activeRun;
    if (!r || !sys) return null;
    return r.systemId === sys.id ? r : null;
  }
  function fieldLabel(field) {
    if (!field) return '配置';
    if (FIELD_LABELS[field]) return FIELD_LABELS[field];
    const parts = String(field).split('.');
    const last = parts[parts.length - 1];
    if (FIELD_LABELS['fault.params.' + last]) return FIELD_LABELS['fault.params.' + last];
    if (parts[0] === 'fault') return '故障配置';
    return field;
  }
  function draftFamilyValue(draft) {
    return draft && draft.fault && draft.fault.family ? draft.fault.family : null;
  }
  function currentFault(sys, draft) {
    const fam = draftFamilyValue(draft);
    if (!fam || fam === 'none') return null;
    return findFault(sys, fam);
  }

  /* ================================================================== */
  /* topology geometry: fallback layout + A* orthogonal routing         */
  /* ================================================================== */
  function fallbackBox(index, vb) {
    const cols = 3;
    const col = index % cols;
    const row = Math.floor(index / cols);
    const w = vb[2] * 0.16;
    const h = vb[3] * 0.14;
    return {
      x: vb[0] + vb[2] * (0.05 + col * 0.31),
      y: vb[1] + vb[3] * (0.08 + row * 0.4),
      w, h
    };
  }

  function computeLayout(sys) {
    let vb = sys && sys.topologyViewBox;
    if (!Array.isArray(vb) || vb.length !== 4 || !(Number(vb[2]) > 0) || !(Number(vb[3]) > 0)) vb = [0, 0, 1000, 620];
    else vb = vb.map(Number);
    const comps = ((sys && sys.components) || []).map((c, i) => {
      const ok = isNum(c.x) && isNum(c.y) && isNum(c.w) && isNum(c.h) && c.w > 0 && c.h > 0;
      const base = ok ? c : Object.assign({}, c, fallbackBox(i, vb));
      /* 显示用最小高度：保证标题 / role / 数值 / 来源四行不互相压盖（不改变拓扑坐标体系） */
      return Object.assign({}, base, { h: Math.max(isNum(base.h) ? base.h : 0, 92) });
    });
    return { vb, comps };
  }

  function buildRouter(layout) {
    const vb = layout.vb;
    const cols = Math.max(4, Math.round(vb[2] / 10));
    const rows = Math.max(4, Math.round(vb[3] / 10));
    const cw = vb[2] / cols;
    const ch = vb[3] / rows;
    const pad = Math.min(9, Math.min(cw, ch) * 1.1);
    const blocked = new Uint8Array(cols * rows);
    layout.comps.forEach((c) => {
      const x0 = c.x - pad, y0 = c.y - pad, x1 = c.x + c.w + pad, y1 = c.y + c.h + pad;
      for (let r = 0; r < rows; r++) {
        const cy = vb[1] + (r + 0.5) * ch;
        if (cy <= y0 || cy >= y1) continue;
        for (let cc = 0; cc < cols; cc++) {
          const cx = vb[0] + (cc + 0.5) * cw;
          if (cx > x0 && cx < x1) blocked[r * cols + cc] = 1;
        }
      }
    });
    function cellOf(x, y) {
      const c = clampNum(Math.floor((x - vb[0]) / cw), 0, cols - 1);
      const r = clampNum(Math.floor((y - vb[1]) / ch), 0, rows - 1);
      return { c: c | 0, r: r | 0 };
    }
    function center(c, r) { return { x: vb[0] + (c + 0.5) * cw, y: vb[1] + (r + 0.5) * ch }; }
    return { vb, cols, rows, cw, ch, blocked, cellOf, center };
  }

  function heapPush(heap, f, s) {
    heap.push([f, s]);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      const t = heap[p]; heap[p] = heap[i]; heap[i] = t;
      i = p;
    }
  }
  function heapPop(heap) {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        const t = heap[m]; heap[m] = heap[i]; heap[i] = t;
        i = m;
      }
    }
    return top;
  }

  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  function findPath(g, sCell, eCell) {
    const cols = g.cols, rows = g.rows, blocked = g.blocked;
    const startIdx = sCell.r * cols + sCell.c;
    const endIdx = eCell.r * cols + eCell.c;
    if (startIdx === endIdx) return [[sCell.c, sCell.r]];
    const N = cols * rows;
    const dist = new Float64Array(N * 4);
    for (let i = 0; i < dist.length; i++) dist[i] = Infinity;
    const prev = new Int32Array(N * 4);
    for (let i = 0; i < prev.length; i++) prev[i] = -1;
    const visited = new Uint8Array(N * 4);
    const heap = [];
    const startBase = startIdx * 4;
    for (let d = 0; d < 4; d++) { dist[startBase + d] = 0; heapPush(heap, 0, startBase + d); }
    function heuristic(cellIdx) {
      const c = cellIdx % cols;
      const r = (cellIdx / cols) | 0;
      return Math.abs(c - eCell.c) + Math.abs(r - eCell.r);
    }
    let endState = -1;
    while (heap.length) {
      const item = heapPop(heap);
      const s = item[1];
      if (visited[s]) continue;
      const cellIdx = s >> 2;
      if (item[0] > dist[s] + heuristic(cellIdx) + 1e-9) continue;
      visited[s] = 1;
      if (cellIdx === endIdx) { endState = s; break; }
      const c = cellIdx % cols;
      const r = (cellIdx / cols) | 0;
      const dIn = s & 3;
      for (let nd = 0; nd < 4; nd++) {
        const nc = c + DIRS[nd][0];
        const nr = r + DIRS[nd][1];
        if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
        const nIdx = nr * cols + nc;
        if (blocked[nIdx] && nIdx !== startIdx && nIdx !== endIdx) continue;
        const turn = nd === dIn ? 0 : (nd === ((dIn + 2) & 3) ? 5 : 0.8);
        const ndist = dist[s] + 1 + turn;
        const ns = nIdx * 4 + nd;
        if (ndist < dist[ns]) {
          dist[ns] = ndist;
          prev[ns] = s;
          heapPush(heap, ndist + heuristic(nIdx), ns);
        }
      }
    }
    if (endState < 0) return null;
    const cells = [];
    let cur = endState;
    while (cur >= 0) {
      const cell = cur >> 2;
      cells.push([cell % cols, (cell / cols) | 0]);
      cur = prev[cur];
    }
    cells.reverse();
    return cells;
  }

  function sidePoint(c, side) {
    if (side === 'right') return { p: { x: c.x + c.w, y: c.y + c.h / 2 }, n: { x: 1, y: 0 } };
    if (side === 'left') return { p: { x: c.x, y: c.y + c.h / 2 }, n: { x: -1, y: 0 } };
    if (side === 'bottom') return { p: { x: c.x + c.w / 2, y: c.y + c.h }, n: { x: 0, y: 1 } };
    return { p: { x: c.x + c.w / 2, y: c.y }, n: { x: 0, y: -1 } };
  }

  function anchorPoints(src, dst, vb) {
    const dx = (dst.x + dst.w / 2) - (src.x + src.w / 2);
    const dy = (dst.y + dst.h / 2) - (src.y + src.h / 2);
    let ss, ts;
    if (Math.abs(dx) >= Math.abs(dy)) {
      ss = dx >= 0 ? 'right' : 'left';
      ts = dx >= 0 ? 'left' : 'right';
    } else {
      ss = dy >= 0 ? 'bottom' : 'top';
      ts = dy >= 0 ? 'top' : 'bottom';
    }
    const sp = sidePoint(src, ss);
    const tp = sidePoint(dst, ts);
    const M = 26;
    const startStub = { x: sp.p.x + sp.n.x * M, y: sp.p.y + sp.n.y * M };
    const endStub = { x: tp.p.x + tp.n.x * M, y: tp.p.y + tp.n.y * M };
    const vx0 = vb[0] + 4, vy0 = vb[1] + 4, vx1 = vb[0] + vb[2] - 4, vy1 = vb[1] + vb[3] - 4;
    startStub.x = clampNum(startStub.x, vx0, vx1);
    startStub.y = clampNum(startStub.y, vy0, vy1);
    endStub.x = clampNum(endStub.x, vx0, vx1);
    endStub.y = clampNum(endStub.y, vy0, vy1);
    return { startPort: sp.p, startStub, endPort: tp.p, endStub };
  }

  function dedupeSimplify(pts) {
    const out = [];
    pts.forEach((p) => {
      if (!isNum(p.x) || !isNum(p.y)) return;
      const last = out[out.length - 1];
      if (last && Math.abs(last.x - p.x) < 0.5 && Math.abs(last.y - p.y) < 0.5) return;
      out.push({ x: p.x, y: p.y });
    });
    if (out.length <= 2) return out;
    const res = [out[0]];
    for (let i = 1; i < out.length - 1; i++) {
      const a = res[res.length - 1];
      const b = out[i];
      const c = out[i + 1];
      const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      if (Math.abs(cross) < 0.5) continue;
      res.push(b);
    }
    res.push(out[out.length - 1]);
    return res;
  }

  function roundedPath(pts, radius) {
    if (!pts.length) return '';
    if (pts.length === 1) return 'M' + fmtPoint(pts[0]);
    let d = 'M' + fmtPoint(pts[0]);
    for (let i = 1; i < pts.length - 1; i++) {
      const prev = pts[i - 1], cur = pts[i], next = pts[i + 1];
      const d1 = Math.hypot(cur.x - prev.x, cur.y - prev.y);
      const d2 = Math.hypot(next.x - cur.x, next.y - cur.y);
      if (d1 < 1e-6 || d2 < 1e-6) continue;
      const r = Math.min(radius, d1 * 0.5, d2 * 0.5);
      const u1 = { x: (cur.x - prev.x) / d1, y: (cur.y - prev.y) / d1 };
      const u2 = { x: (next.x - cur.x) / d2, y: (next.y - cur.y) / d2 };
      if (Math.abs(u1.x - u2.x) < 1e-3 && Math.abs(u1.y - u2.y) < 1e-3) { d += ' L' + fmtPoint(cur); continue; }
      const a = { x: cur.x - u1.x * r, y: cur.y - u1.y * r };
      const b = { x: cur.x + u2.x * r, y: cur.y + u2.y * r };
      d += ' L' + fmtPoint(a) + ' Q' + fmtPoint(cur) + ' ' + fmtPoint(b);
    }
    return d + ' L' + fmtPoint(pts[pts.length - 1]);
  }

  function polylineMid(pts) {
    let total = 0;
    const lens = [];
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      lens.push(l);
      total += l;
    }
    if (total < 1e-6) return { point: pts[0], angle: 0 };
    let target = total / 2;
    for (let i = 0; i < lens.length; i++) {
      if (target <= lens[i]) {
        const r = lens[i] ? target / lens[i] : 0;
        return {
          point: {
            x: pts[i].x + (pts[i + 1].x - pts[i].x) * r,
            y: pts[i].y + (pts[i + 1].y - pts[i].y) * r
          },
          angle: Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x)
        };
      }
      target -= lens[i];
    }
    return { point: pts[pts.length - 1], angle: 0 };
  }

  function elbowFallback(anchors) {
    const mx = (anchors.startStub.x + anchors.endStub.x) / 2;
    const my = (anchors.startStub.y + anchors.endStub.y) / 2;
    if (Math.abs(anchors.endStub.x - anchors.startStub.x) >= Math.abs(anchors.endStub.y - anchors.startStub.y)) {
      return [{ x: mx, y: anchors.startStub.y }, { x: mx, y: anchors.endStub.y }];
    }
    return [{ x: anchors.startStub.x, y: my }, { x: anchors.endStub.x, y: my }];
  }

  function routeEdge(edge) {
    const src = compById(local.sys, edge.from);
    const dst = compById(local.sys, edge.to);
    if (!src || !dst) return null;
    const vb = local.layout.vb;
    const anchors = anchorPoints(src, dst, vb);
    const g = local.router;
    const pts = [anchors.startPort, anchors.startStub];
    let cells = null;
    if (g) cells = findPath(g, g.cellOf(anchors.startStub.x, anchors.startStub.y), g.cellOf(anchors.endStub.x, anchors.endStub.y));
    if (cells && cells.length) {
      cells.forEach((cell) => pts.push(g.center(cell[0], cell[1])));
    } else {
      elbowFallback(anchors).forEach((p) => pts.push(p));
    }
    pts.push(anchors.endStub, anchors.endPort);
    const clean = dedupeSimplify(pts);
    return { d: roundedPath(clean, 8), points: clean, mid: polylineMid(clean) };
  }

  function polylineLength(pts) {
    let total = 0;
    for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    return total;
  }
  function pointAtFraction(pts, fraction) {
    const total = polylineLength(pts);
    if (!total) return { point: pts[0], angle: 0 };
    let target = total * clampNum(fraction, 0, 1);
    for (let i = 1; i < pts.length; i++) {
      const len = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      if (target <= len && len > 1e-6) {
        const r = target / len;
        return {
          point: { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * r, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * r },
          angle: Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x)
        };
      }
      target -= len;
    }
    return { point: pts[pts.length - 1], angle: 0 };
  }
  function labelTextWidth(text) {
    let w = 0;
    for (let i = 0; i < text.length; i++) w += text.charCodeAt(i) > 127 ? 15 : 8.4;
    return w;
  }
  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  }
  /* 标签锚点贴近路径拐角时加罚：避免标签落在节点角上，看起来像游离标签 */
  function cornerPenalty(pts, point) {
    let bestD = Infinity;
    let bestI = -1;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = Math.hypot(pts[i].x - point.x, pts[i].y - point.y);
      if (d < bestD) { bestD = d; bestI = i; }
    }
    if (bestI < 0 || bestD > 26) return 0;
    const a = pts[bestI - 1], b = pts[bestI], c = pts[bestI + 1];
    const u1x = b.x - a.x, u1y = b.y - a.y;
    const u2x = c.x - b.x, u2y = c.y - b.y;
    const l1 = Math.hypot(u1x, u1y) || 1;
    const l2 = Math.hypot(u2x, u2y) || 1;
    const dot = (u1x * u2x + u1y * u2y) / (l1 * l2);
    const turn = Math.acos(Math.max(-1, Math.min(1, dot)));
    if (turn < 0.45) return 0;
    return 170 * (1 - bestD / 26) * (turn / Math.PI);
  }
  /* 为连线标签挑一个不压住部件/其它标签的位置：优先靠近所属边的中点，
     远离节点边框；空间不足时外移并画引线。 */
  function chooseLabelPosition(text, route, layout, placedBoxes) {
    const vb = layout.vb;
    const halfW = labelTextWidth(text) / 2 + 4;
    const halfH = 9.5;
    const pts = route.points;
    if (!pts || pts.length < 2) return null;
    const midAt = pointAtFraction(pts, 0.5);
    /* 只允许在路径中段附近取样，避免标签跨到大半张图外 */
    const fractions = [0.5, 0.44, 0.56, 0.38, 0.62, 0.32, 0.68];
    const offsets = [13, -13, 21, -21, 34, -34, 48, -48, 64, -64, 80, -80];
    let best = null;
    let bestScore = -Infinity;
    fractions.forEach((f) => {
      const at = pointAtFraction(pts, f);
      const nx = -Math.sin(at.angle);
      const ny = Math.cos(at.angle);
      const corner = cornerPenalty(pts, at.point);
      offsets.forEach((off) => {
        const cx = at.point.x + nx * off;
        const cy = at.point.y + ny * off;
        const box = { x: cx - halfW, y: cy - halfH, w: halfW * 2, h: halfH * 2 };
        if (box.x < vb[0] + 3 || box.y < vb[1] + 3 ||
          box.x + box.w > vb[0] + vb[2] - 3 || box.y + box.h > vb[1] + vb[3] - 3) return;
        const midDist = Math.hypot(cx - midAt.point.x, cy - midAt.point.y);
        let penalty = midDist * 0.9 + Math.abs(f - 0.5) * 22 + Math.abs(off) * 0.5 + corner;
        let blocked = false;
        let nearNode = false;
        layout.comps.forEach((c) => {
          if (rectsOverlap(box, { x: c.x - 6, y: c.y - 6, w: c.w + 12, h: c.h + 12 })) {
            blocked = true;
          } else if (rectsOverlap(box, { x: c.x - 14, y: c.y - 14, w: c.w + 28, h: c.h + 28 })) {
            nearNode = true; /* 离节点边框太近：轻微软惩罚，避免标签贴死节点 */
          }
        });
        if (nearNode && !blocked) penalty += 10;
        placedBoxes.forEach((pb) => {
          if (rectsOverlap(box, pb)) { blocked = true; penalty += 420; }
        });
        if (blocked) return;
        const score = -penalty;
        if (score > bestScore) {
          bestScore = score;
          best = { cx, cy, box, anchor: { x: at.point.x, y: at.point.y } };
        }
      });
    });
    if (!best) {
      const mid = route.mid || { point: pts[0] };
      const cx = clampNum(mid.point.x, vb[0] + halfW + 3, vb[0] + vb[2] - halfW - 3);
      const cy = clampNum(mid.point.y - 12, vb[1] + 14, vb[1] + vb[3] - 14);
      best = { cx, cy, box: { x: cx - halfW, y: cy - halfH, w: halfW * 2, h: halfH * 2 }, anchor: { x: mid.point.x, y: mid.point.y } };
    }
    placedBoxes.push(best.box);
    return { x: best.cx, y: best.cy, anchor: best.anchor };
  }

  /* ================================================================== */
  /* static skeleton                                                    */
  /* ================================================================== */
  function buildSkeleton() {
    const refs = local.refs;

    refs.eyebrow = el('div', { class: 'eyebrow eyebrow--acc' }, 'SYSTEM LAB · 系统交互图');
    refs.title = el('h1', { class: 'sys-page-title display' }, '系统交互图');
    refs.code = el('span', { class: 'sys-code mono' }, 'FL-001');
    refs.sub = el('p', { class: 'sys-page-sub' }, '');
    refs.headMeta = el('div', { class: 'sys-head-meta' });
    const head = el('header', { class: 'sys-head' }, [
      el('div', { class: 'sys-head-main' }, [
        refs.eyebrow,
        el('div', { class: 'sys-title-row' }, [refs.title, refs.code]),
        refs.sub
      ]),
      refs.headMeta
    ]);

    /* -------- left: fault orchestration -------- */
    refs.draftState = el('span', { class: 'panel-sub sys-draft-state' }, '草稿');
    refs.lockBadge = el('span', { class: 'badge' }, '可直接编辑');
    refs.runSummary = el('div', { class: 'sys-run-summary' });
    refs.familyList = el('div', { class: 'sys-family-list', role: 'group', 'aria-label': '故障家族' });
    refs.paramNote = el('span', { class: 'sys-block-note' }, '');
    refs.paramControls = el('div', { class: 'sys-param-controls' });
    refs.modeControl = el('div', { class: 'sys-mode-control' });
    refs.effectHint = el('div', { class: 'sys-effect-hint' });
    refs.draftNotices = el('div', { class: 'sys-draft-notices' });
    refs.errorsBox = el('div', { class: 'sys-errors' });
    refs.runError = el('div', { class: 'sys-run-error' });

    refs.btnCreate = el('button', { class: 'btn btn-primary btn-block', type: 'button' }, [
      ui.icon('play', { size: 14 }), el('span', {}, '应用并创建运行')
    ]);
    refs.createHint = el('div', { class: 'sys-create-hint' });
    refs.btnReplay = el('button', { class: 'btn btn-sm', type: 'button', title: '同一 Run 从 0 s 重播（不重新计算）' }, [
      ui.icon('replay', { size: 13 }), el('span', {}, '重播')
    ]);
    refs.btnPause = el('button', { class: 'btn btn-sm', type: 'button', title: '播放 / 暂停' }, [
      ui.icon('pause', { size: 13 }), el('span', {}, '暂停')
    ]);
    refs.btnJump = el('button', { class: 'btn btn-sm', type: 'button', title: '暂停并定位到故障时刻' }, [
      ui.icon('flag', { size: 13 }), el('span', {}, '跳到故障点')
    ]);
    refs.btnReset = el('button', { class: 'btn btn-ghost btn-xs sys-reset-btn', type: 'button', title: '恢复默认参数（不影响历史运行）' }, [
      ui.icon('refresh', { size: 11 }), el('span', {}, '默认参数')
    ]);

    refs.leftPanel = el('aside', { class: 'sys-col sys-col-left fl-panel', 'aria-label': '故障编排与控制' }, [
      el('div', { class: 'panel-head' }, [
        el('div', { class: 'panel-head-main' }, [
          el('span', { class: 'panel-title' }, '故障编排'),
          refs.draftState
        ]),
        refs.lockBadge
      ]),
      el('div', { class: 'panel-body sys-left-body' }, [
        refs.runSummary,
        el('div', { class: 'sys-block' }, [
          el('div', { class: 'sys-block-head' }, [
            el('span', { class: 'eyebrow' }, '故障家族'),
            el('span', { class: 'sys-block-note' }, '选择后联动参数')
          ]),
          refs.familyList
        ]),
        el('div', { class: 'sys-block sys-block--mode' }, [
          el('div', { class: 'sys-mode-row' }, [
            el('span', { class: 'eyebrow sys-mode-label' }, '控制模式'),
            refs.modeControl
          ])
        ]),
        el('div', { class: 'sys-block' }, [
          el('div', { class: 'sys-block-head' }, [
            el('span', { class: 'eyebrow' }, '参数与时刻'),
            el('span', { class: 'sys-block-head-right' }, [refs.paramNote, refs.btnReset])
          ]),
          refs.paramControls,
          refs.effectHint
        ]),
        refs.draftNotices,
        refs.runError
      ]),
      el('div', { class: 'panel-foot sys-left-foot' }, [
        refs.errorsBox,
        refs.btnCreate,
        refs.createHint,
        el('div', { class: 'sys-transport' }, [refs.btnReplay, refs.btnPause, refs.btnJump])
      ])
    ]);

    /* -------- center: topology -------- */
    refs.topoSub = el('span', { class: 'panel-sub' }, '');
    refs.timeReadout = el('span', { class: 'sys-time-readout mono' }, 't = 0.0 s');
    refs.faultBadge = el('span', { class: 'sys-fault-badge' });
    refs.btnInspToggle = el('button', { class: 'btn btn-sm sys-insp-toggle', type: 'button', 'aria-controls': 'sys-inspector' }, [
      ui.icon('board', { size: 13 }), el('span', {}, '部件检查器')
    ]);
    refs.topoNotice = el('div', { class: 'sys-topo-notice' });
    refs.svg = svgEl('svg', {
      class: 'sys-edges', xmlns: SVG_NS, preserveAspectRatio: 'none',
      'aria-hidden': 'true', focusable: 'false'
    });
    refs.nodes = el('div', { class: 'sys-nodes' });
    refs.stage = el('div', { class: 'sys-stage' }, [refs.svg, refs.nodes]);
    refs.stageScroll = el('div', { class: 'sys-stage-scroll' }, [refs.stage]);
    refs.topoLegend = buildLegend();
    refs.topoNote = el('div', { class: 'sys-topo-note' }, '');
    refs.centerPanel = el('section', { class: 'sys-col sys-col-center fl-panel', 'aria-label': '模型拓扑与动态流' }, [
      el('div', { class: 'panel-head sys-topo-head' }, [
        el('div', { class: 'panel-head-main' }, [
          el('span', { class: 'panel-title' }, '模型拓扑与动态流'),
          refs.topoSub
        ]),
        el('div', { class: 'sys-topo-tools' }, [
          refs.timeReadout, refs.faultBadge,
          el('span', { class: 'sys-scroll-hint' }, '⇠ 横向滑动查看完整拓扑 ⇢'),
          refs.btnInspToggle
        ])
      ]),
      el('div', { class: 'panel-body sys-topo-body' }, [
        refs.topoNotice, refs.stageScroll
      ]),
      el('div', { class: 'panel-foot sys-topo-foot' }, [refs.topoLegend, refs.topoNote])
    ]);

    /* -------- right: inspector -------- */
    refs.inspTime = el('span', { class: 'panel-sub mono' }, '');
    refs.inspKind = el('span', { class: 'sys-insp-kind' });
    refs.btnInspClose = el('button', {
      class: 'btn btn-ghost btn-icon btn-sm sys-insp-close', type: 'button', 'aria-label': '关闭检查器'
    }, [ui.icon('x', { size: 14 })]);
    refs.inspBody = el('div', { class: 'panel-body sys-insp-body' });
    refs.inspectorPanel = el('aside', {
      class: 'sys-col sys-col-right fl-panel sys-inspector', id: 'sys-inspector', 'aria-label': '部件检查器'
    }, [
      el('div', { class: 'panel-head' }, [
        el('div', { class: 'panel-head-main' }, [
          el('span', { class: 'panel-title' }, '部件检查器'),
          refs.inspTime
        ]),
        el('div', { class: 'sys-insp-head-tools' }, [refs.inspKind, refs.btnInspClose])
      ]),
      refs.inspBody
    ]);

    refs.inspBackdrop = el('div', { class: 'sys-insp-backdrop', 'aria-hidden': 'true' });
    refs.grid = el('div', { class: 'sys-grid' }, [
      refs.leftPanel, refs.centerPanel, refs.inspectorPanel, refs.inspBackdrop
    ]);
    refs.wrap = el('div', { class: 'sys-wrap page-pad' }, [head, refs.grid]);
    return refs.wrap;
  }

  function buildLegend() {
    const item = (sw, text) => el('span', { class: 'sys-legend-item' }, [sw, el('span', {}, text)]);
    const powerSw = el('span', { class: 'sys-legend-line is-power' }, [
      el('span', { class: 'sys-legend-arrow', 'aria-hidden': 'true' })
    ]);
    const sigSw = el('span', { class: 'sys-legend-line is-signal' });
    const measSw = el('span', { class: 'sys-legend-line is-meas' });
    const flt = el('span', { class: 'sys-legend-flt', 'aria-hidden': 'true' });
    return el('div', { class: 'sys-legend' }, [
      item(powerSw, '实线 + 箭头 = 实际功率流'),
      item(sigSw, '虚线 = 信号通道'),
      item(measSw, '虚线 = 测量通道'),
      item(flt, 'FLT 三角 + 斜纹 = 故障注入点')
    ]);
  }

  function buildHeaderMeta(state0, sys) {
    const meta = local.refs.headMeta;
    ui.clear(meta);
    const chips = [];
    if (state0.activeRun) {
      chips.push(ui.badge(state0.activeRun.runId + ' · ' + (state0.activeRun.role || 'trial'), { tone: 'info' }));
      const cfg = state0.activeRun.config || {};
      chips.push(ui.badge(cfg.feedback_mode === 'monitor' ? '仅监测' : '闭环', { tone: cfg.feedback_mode === 'monitor' ? 'warn' : 'acc' }));
    } else {
      chips.push(ui.badge('未创建运行', { tone: 'neutral' }));
    }
    if (state0.draftDirty) chips.push(ui.badge('草稿已修改', { tone: 'warn', icon: 'warning' }));
    if (state0.computeState === 'computing') chips.push(ui.badge('计算中', { tone: 'warn' }));
    chips.push(ui.badge((sys.level || 'L0').split('·')[0].trim(), { tone: 'neutral' }));
    chips.forEach((c) => meta.appendChild(c));
  }

  /* ================================================================== */
  /* build per-system topology                                          */
  /* ================================================================== */
  function buildTopology(sys) {
    const layout = computeLayout(sys);
    local.layout = layout;
    local.router = buildRouter(layout);
    const stage = local.refs.stage;
    const vb = layout.vb;
    stage.style.aspectRatio = vb[2] + ' / ' + vb[3];
    const svg = local.refs.svg;
    ui.clear(svg);
    svg.setAttribute('viewBox', vb.join(' '));

    /* markers */
    const defs = svgEl('defs');
    defs.appendChild(buildMarker('sys-arrow-power', 'power', true));
    defs.appendChild(buildMarker('sys-arrow-signal', 'signal', false));
    defs.appendChild(buildMarker('sys-arrow-meas', 'meas', false));
    svg.appendChild(defs);

    /* edges */
    local.edgeEls = [];
    const placedLabels = [];
    (sys.edges || []).forEach((edge) => {
      const route = routeEdge(edge);
      if (!route) return;
      const kind = edge.kind === 'power' ? 'power' : (edge.kind === 'measurement' ? 'meas' : 'signal');
      const g = svgEl('g', { class: 'sys-edge is-' + kind, 'data-edge': edge.id, 'data-kind': edge.kind });
      if (kind === 'power') {
        const base = svgEl('path', { class: 'sys-edge-base is-power', d: route.d });
        g.appendChild(base);
        const flow = svgEl('path', { class: 'sys-edge-flow is-power', d: route.d });
        g.appendChild(flow);
        base.setAttribute('marker-end', 'url(#sys-arrow-power)');
      } else if (kind === 'meas') {
        const p = svgEl('path', { class: 'sys-edge-base is-meas', d: route.d });
        p.setAttribute('marker-end', 'url(#sys-arrow-meas)');
        g.appendChild(p);
      } else {
        const p = svgEl('path', { class: 'sys-edge-base is-signal', d: route.d });
        p.setAttribute('marker-end', 'url(#sys-arrow-signal)');
        g.appendChild(p);
      }
      if (edge.label) {
        const pos = chooseLabelPosition(edge.label, route, local.layout, placedLabels);
        if (pos) {
          const boxW = labelTextWidth(edge.label) + 10;
          const boxH = 18;
          const dist = Math.hypot(pos.anchor.x - pos.x, pos.anchor.y - pos.y);
          if (dist > 26) {
            g.appendChild(svgEl('line', {
              class: 'sys-edge-leader is-' + kind,
              x1: pos.anchor.x, y1: pos.anchor.y, x2: pos.x, y2: pos.y
            }));
          }
          g.appendChild(svgEl('rect', {
            class: 'sys-edge-label-bg is-' + kind,
            x: pos.x - boxW / 2, y: pos.y - boxH / 2,
            width: boxW, height: boxH, rx: 3
          }));
          const label = svgEl('text', {
            class: 'sys-edge-label is-' + kind, x: pos.x, y: pos.y,
            'text-anchor': 'middle', 'dominant-baseline': 'middle'
          });
          label.textContent = edge.label;
          g.appendChild(label);
        }
      }
      svg.appendChild(g);
      local.edgeEls.push({ edge, g });
    });

    /* nodes (HTML overlay, same coordinate system via percentages) */
    const nodes = local.refs.nodes;
    ui.clear(nodes);
    local.nodeMeta = {};
    layout.comps.forEach((c) => {
      const longLabel = String(c.label || '').length >= 9;
      const btn = el('button', {
        class: 'sys-node' + (longLabel ? ' is-long' : ''), type: 'button',
        'data-component': c.id, 'data-kind': c.kind, 'aria-pressed': 'false',
        title: c.label + (c.role ? ' · ' + c.role : '')
      });
      btn.style.left = (((c.x - vb[0]) / vb[2]) * 100) + '%';
      btn.style.top = (((c.y - vb[1]) / vb[3]) * 100) + '%';
      btn.style.width = ((c.w / vb[2]) * 100) + '%';
      btn.style.height = ((c.h / vb[3]) * 100) + '%';

      const top = el('span', { class: 'sys-node-top' }, [
        el('span', { class: 'sys-node-icon' }, ui.icon(KIND_ICON[c.kind] || 'dot', { size: 13 })),
        el('span', { class: 'sys-node-name', title: c.label }, c.label)
      ]);
      const roleEl = el('span', { class: 'sys-node-role', title: c.role || '' }, c.role || '');
      const vnum = el('span', { class: 'sys-node-vnum mono' }, '—');
      const unit = el('span', { class: 'sys-node-unit' }, '');
      const src = el('span', { class: 'sys-node-src' }, '未运行');
      const value = el('span', { class: 'sys-node-val' }, [vnum, unit, src]);
      const inner = el('span', { class: 'sys-node-inner' }, [top, roleEl, value]);
      const flt = el('span', { class: 'sys-flt', 'aria-hidden': 'true' }, [
        el('span', { class: 'sys-flt-tri' }),
        el('span', { class: 'sys-flt-tag' }, 'FLT')
      ]);
      const active = el('span', { class: 'sys-node-active' }, '故障激活');
      btn.appendChild(inner);
      btn.appendChild(flt);
      btn.appendChild(active);
      btn.addEventListener('click', () => selectComponent(c.id));
      nodes.appendChild(btn);

      const pick = pickNodeSignal(sys, c);
      local.nodeMeta[c.id] = {
        btn, vnum, unit, src, flt, active, comp: c,
        signalId: pick ? pick.id : null,
        precision: pick ? pick.precision : 2,
        unitText: pick ? pick.unit : '',
        sourceKind: pick ? pick.sourceKind : null
      };
    });
  }

  function buildMarker(id, kind, filled) {
    const marker = svgEl('marker', {
      id, viewBox: '0 0 12 12', refX: '11', refY: '6',
      markerWidth: '13', markerHeight: '13', orient: 'auto', markerUnits: 'userSpaceOnUse'
    });
    const path = svgEl('path', {
      d: filled ? 'M1 2 L11 6 L1 10 z' : 'M2.5 2.5 L10.5 6 L2.5 9.5',
      class: 'sys-marker-shape is-' + kind
    });
    marker.appendChild(path);
    return marker;
  }

  function pickNodeSignal(sys, comp) {
    const map = {};
    (sys.signals || []).forEach((s) => { map[s.id] = s; });
    const prefs = KIND_SRC_PREF[comp.kind] || DEFAULT_SRC_PREF;
    const inspector = comp.inspector || [];
    for (let i = 0; i < prefs.length; i++) {
      const wanted = prefs[i];
      for (let j = 0; j < inspector.length; j++) {
        const it = inspector[j];
        if ((it.source || '') !== wanted) continue;
        const meta = map[it.id];
        if (meta) return meta;
      }
    }
    for (let j = 0; j < inspector.length; j++) {
      if (map[inspector[j].id]) return map[inspector[j].id];
    }
    return null;
  }

  /* ================================================================== */
  /* left column rendering                                              */
  /* ================================================================== */
  function buildFamilyCards(sys) {
    const host = local.refs.familyList;
    ui.clear(host);
    local.familyEls = {};
    local.familyMeta = {};
    (sys.faults || []).forEach((fault) => {
      const target = compById(sys, fault.target);
      const param = (fault.params || [])[0];
      const currentEl = el('span', { class: 'sys-family-current mono' }, '');
      const card = el('button', {
        class: 'sys-family-card', type: 'button', 'data-family': fault.family,
        'aria-pressed': 'false', title: fault.description || fault.label
      }, [
        el('span', { class: 'sys-family-icon' }, ui.icon(FAMILY_ICON[fault.family] || 'warning', { size: 15 })),
        el('span', { class: 'sys-family-body' }, [
          el('span', { class: 'sys-family-title' }, fault.shortLabel || fault.label),
          el('span', { class: 'sys-family-variant' }, fault.label)
        ]),
        el('span', { class: 'sys-family-meta' }, [currentEl])
      ]);
      card.addEventListener('click', () => applyFamily(fault));
      host.appendChild(card);
      local.familyEls[fault.family] = card;
      local.familyMeta[fault.family] = { fault, card, currentEl, param, target };
    });
  }

  function applyFamily(fault) {
    const st = state();
    const draft = draftOf(st, local.sys);
    if (!draft) { ui.toast('没有可编辑的草稿，请重新开始实验', 'warn'); return; }
    if (st.computeState === 'computing') return;
    const prevT = draft.fault && isNum(draft.fault.t_start_s) ? draft.fault.t_start_s : fault.defaultTime_s;
    const tMin = (fault.timeRange && fault.timeRange[0]) || 0;
    const tMax = (fault.timeRange && fault.timeRange[1]) || (draft.duration_s - 1);
    const t = snapClamp(prevT, tMin, tMax, 0.1, 1);
    const params = {};
    (fault.params || []).forEach((p) => { params[p.key] = p.default; });
    actions.updateDraft((d) => {
      d.fault = { family: fault.family, faultId: fault.id, t_start_s: t, params };
    });
  }

  function renderFamilySelection(draft) {
    const family = draftFamilyValue(draft);
    Object.keys(local.familyEls).forEach((fam) => {
      const card = local.familyEls[fam];
      const selected = fam === family;
      card.setAttribute('aria-pressed', String(selected));
      card.classList.toggle('is-selected', selected);
      const meta = local.familyMeta[fam];
      if (!meta) return;
      if (selected && draft && draft.fault) {
        const p = meta.param;
        const val = draft.fault.params && p && draft.fault.params[p.key] != null ? draft.fault.params[p.key] : (p ? p.default : '');
        const unit = p ? (p.unit || '') : '';
        const sign = p && p.unit !== '%' && Number(val) >= 0 ? '+' : '';
        meta.currentEl.textContent = sign + val + (unit ? ' ' + unit : '') + ' @ ' + fmt.num(draft.fault.t_start_s, 1) + ' s';
      } else {
        const p = meta.param;
        meta.currentEl.textContent = p ? (p.default + (p.unit ? ' ' + p.unit : '')) + ' @ ' + meta.fault.defaultTime_s + ' s' : '';
      }
    });
    if (!local.familyEls[family]) {
      Object.keys(local.familyEls).forEach((fam) => {
        local.familyEls[fam].classList.remove('is-selected');
        local.familyEls[fam].setAttribute('aria-pressed', 'false');
      });
    }
    const note = local.refs.paramNote;
    const meta = family ? local.familyMeta[family] : null;
    if (note) {
      if (meta) {
        const targetLabel = meta.target ? meta.target.label : (meta.fault.target || '');
        note.textContent = targetLabel ? '作用对象：' + targetLabel : '故障参数';
        note.title = meta.fault.description || '';
      } else {
        note.textContent = '选择故障家族后编辑';
        note.removeAttribute('title');
      }
    }
  }

  function buildModeControl() {
    const host = local.refs.modeControl;
    ui.clear(host);
    const seg = ui.segmented({
      ariaLabel: '控制模式',
      value: 'closed_loop',
      options: [
        { value: 'closed_loop', label: '闭环反馈', icon: 'link' },
        { value: 'monitor', label: '仅监测', icon: 'eye' }
      ],
      onChange: (v) => {
        const st = state();
        if (st.computeState === 'computing') return;
        actions.updateDraft((d) => { d.feedback_mode = v; });
        actions.toast(v === 'monitor'
          ? '已切换为仅监测：故障不进入反馈，需创建新运行生效'
          : '已切换为闭环反馈：需创建新运行生效', 'info');
      }
    });
    host.appendChild(seg);
    local.modeSeg = seg;
  }

  function currentDraftTimeRange(draft, fault) {
    const tMin = fault && fault.timeRange ? fault.timeRange[0] : 2;
    const tMaxRaw = fault && fault.timeRange ? fault.timeRange[1] : 55;
    const dur = (draft && draft.duration_s) || 60;
    return [tMin, Math.min(tMaxRaw, dur - 0.1)];
  }

  function rebuildParamControls(sys, draft, fault) {
    const host = local.refs.paramControls;
    ui.clear(host);
    local.controlMeta = null;
    if (!fault) {
      const fam = draftFamilyValue(draft);
      host.appendChild(el('div', { class: 'sys-param-empty' }, fam === 'none'
        ? '当前草稿是「无故障基准」（healthy baseline）：选择上方任一故障家族开始编排，或恢复默认参数。'
        : '当前草稿的故障家族不在目录中：请选择一个故障家族。'));
      return;
    }
    const meta = { entries: [], time: null };
    (fault.params || []).forEach((p) => {
      const value = draft.fault && draft.fault.params && draft.fault.params[p.key] != null ? draft.fault.params[p.key] : p.default;
      const decimals = p.precision != null ? p.precision : decimalsOf(p.step);
      const slider = ui.slider({
        min: p.min, max: p.max, step: p.step, value, unit: p.unit,
        digits: decimals, ariaLabel: p.label, disabled: false,
        onInput: (v) => commitParam(p, v)
      });
      const num = el('input', {
        class: 'input input--num sys-param-num', type: 'number',
        min: String(p.min), max: String(p.max), step: String(p.step),
        value: String(value), 'aria-label': p.label + '（数值输入）'
      });
      num.addEventListener('change', () => {
        const v = snapClamp(num.value, p.min, p.max, p.step, decimals);
        num.value = String(v);
        commitParam(p, v);
      });
      const row = el('div', { class: 'sys-param-row' }, [slider.el, num, el('span', { class: 'sys-param-unit mono' }, p.unit || '')]);
      const fieldNode = ui.field({
        label: p.label,
        unit: p.unit,
        hint: p.help || (p.min != null ? '范围 ' + p.min + ' – ' + p.max + ' ' + (p.unit || '') + '，步长 ' + p.step : ''),
        control: row
      });
      host.appendChild(fieldNode);
      meta.entries.push({ p, slider, num, decimals });
    });

    const range = currentDraftTimeRange(draft, fault);
    const tValue = draft.fault && isNum(draft.fault.t_start_s) ? draft.fault.t_start_s : fault.defaultTime_s;
    const tSlider = ui.slider({
      min: range[0], max: range[1], step: 0.1, value: tValue, unit: 's', digits: 1,
      ariaLabel: '故障时刻', disabled: false,
      onInput: (v) => commitTime(v, range, fault)
    });
    const tNum = el('input', {
      class: 'input input--num sys-param-num', type: 'number',
      min: String(range[0]), max: String(range[1]), step: '0.1',
      value: String(tValue), 'aria-label': '故障时刻（数值输入）'
    });
    tNum.addEventListener('change', () => {
      const v = snapClamp(tNum.value, range[0], range[1], 0.1, 1);
      tNum.value = String(v);
      commitTime(v, range, fault);
    });
    const tRow = el('div', { class: 'sys-param-row' }, [tSlider.el, tNum, el('span', { class: 'sys-param-unit mono' }, 's')]);
    host.appendChild(ui.field({
      label: '故障时刻',
      unit: 's',
      hint: '故障在第 ' + fmt.num(tValue, 1) + ' s 注入；允许 ' + fmt.num(range[0], 1) + ' – ' + fmt.num(range[1], 1) + ' s，按 0.1 s 网格。',
      control: tRow
    }));
    meta.time = { slider: tSlider, num: tNum, range };
    local.controlMeta = meta;
    host.querySelectorAll('.field-hint').forEach((hintEl) => {
      hintEl.title = hintEl.textContent || '';
    });
  }

  function commitParam(p, rawValue) {
    const st = state();
    const draft = draftOf(st, local.sys);
    if (!draft || st.computeState === 'computing') return;
    const decimals = p.precision != null ? p.precision : decimalsOf(p.step);
    const v = snapClamp(rawValue, p.min, p.max, p.step, decimals);
    actions.updateDraft((d) => {
      if (!d.fault) return;
      d.fault.params = Object.assign({}, d.fault.params, { [p.key]: v });
    });
  }

  function commitTime(v, range, fault) {
    const st = state();
    const draft = draftOf(st, local.sys);
    if (!draft || st.computeState === 'computing') return;
    const t = snapClamp(v, range[0], range[1], 0.1, 1);
    actions.updateDraft((d) => { if (d.fault) d.fault.t_start_s = t; });
  }

  function syncControlValues(draft) {
    const meta = local.controlMeta;
    if (!meta || !draft || !draft.fault) return;
    const active = document.activeElement;
    meta.entries.forEach((entry) => {
      const v = draft.fault.params && draft.fault.params[entry.p.key] != null ? draft.fault.params[entry.p.key] : entry.p.default;
      if (entry.slider && entry.slider.input && active !== entry.slider.input) entry.slider.setValue(v);
      if (entry.num && active !== entry.num && Number(entry.num.value) !== Number(v)) entry.num.value = String(v);
    });
    if (meta.time) {
      const tv = isNum(draft.fault.t_start_s) ? draft.fault.t_start_s : 20;
      if (meta.time.slider.input && active !== meta.time.slider.input) meta.time.slider.setValue(tv);
      if (active !== meta.time.num && Number(meta.time.num.value) !== Number(tv)) meta.time.num.value = String(tv);
    }
  }

  function renderModeControl(draft, fault) {
    if (!local.modeSeg) buildModeControl();
    const mode = draft && draft.feedback_mode ? draft.feedback_mode : 'closed_loop';
    local.modeSeg.setValue(mode);
    const lock = state() && state().computeState === 'computing';
    const buttons = local.modeSeg.querySelectorAll('.seg-item');
    buttons.forEach((b) => { b.disabled = !!lock; });
    const hint = local.refs.effectHint;
    ui.clear(hint);
    if (fault) {
      const text = mode === 'monitor' ? fault.monitorEffect : fault.closedLoopEffect;
      hint.appendChild(el('div', { class: 'sys-effect' }, [
        el('span', { class: 'eyebrow' }, mode === 'monitor' ? '仅监测预期' : '闭环预期'),
        el('span', { class: 'sys-effect-text' }, text || '—')
      ]));
    } else {
      hint.appendChild(el('div', { class: 'sys-effect is-muted' }, [
        el('span', { class: 'eyebrow' }, '当前配置'),
        el('span', { class: 'sys-effect-text' }, '无故障基准运行：真实通道与测量通道应保持一致。')
      ]));
    }
  }

  function renderRunSummary(state0, run) {
    const host = local.refs.runSummary;
    const key = [
      run ? run.runId : 'none',
      state0.computeState,
      state0.draftDirty ? '1' : '0',
      state0.lastError || ''
    ].join('|');
    if (local.runKey === key) return;
    local.runKey = key;
    ui.clear(host);
    if (run) {
      const ev = faultEventOf(run);
      host.appendChild(el('div', { class: 'sys-run-card' }, [
        el('div', { class: 'sys-run-line' }, [
          el('span', { class: 'eyebrow' }, '当前运行'),
          el('span', { class: 'sys-run-id mono' }, run.runId),
          ui.badge(run.role === 'baseline' ? '无故障基准' : (run.role === 'contrast' ? '对照' : '故障'), {
            tone: run.role === 'baseline' ? 'ok' : 'info'
          })
        ]),
        el('div', { class: 'sys-run-label' }, run.label || '—'),
        el('div', { class: 'sys-run-meta mono' }, [
          'hash ' + fmt.hash(run.configHash || ''),
          ' · ' + (run.config ? run.config.duration_s : 60) + ' s',
          ' · ' + ((run.config && run.config.feedback_mode) === 'monitor' ? '仅监测' : '闭环'),
          ev ? ' · 故障点 ' + fmt.num(ev.trigger_s, 1) + ' s' : ' · 无故障事件'
        ])
      ]));
    } else {
      host.appendChild(el('div', { class: 'notice', 'data-tone': 'info' }, [
        ui.icon('info', { size: 14 }),
        el('span', {}, '尚未创建运行：先选择故障家族与参数，再点击「应用并创建运行」。拓扑结构来自模型定义，数值需要运行数据。')
      ]));
    }
    if (state0.computeState === 'failed' && state0.lastError) {
      host.appendChild(el('div', { class: 'notice', 'data-tone': 'danger' }, [
        ui.icon('warning', { size: 14 }),
        el('span', {}, '计算失败：' + state0.lastError + '。草稿已保留，可修改参数后重试。')
      ]));
    }
  }

  function renderDraftNotices(state0, draft) {
    const key = [
      state0.draftDirty ? 'dirty' : 'clean',
      (state0.draftErrors || []).length,
      state0.computeState,
      draft ? draftFamilyValue(draft) : 'nodraft',
      draft ? draft.feedback_mode : ''
    ].join('|');
    if (local.leftNoticeKey === key) return;
    local.leftNoticeKey = key;
    const host = local.refs.draftNotices;
    ui.clear(host);
    if (state0.draftDirty) {
      host.appendChild(el('div', { class: 'notice', 'data-tone': 'warn', role: 'status' }, [
        ui.icon('warning', { size: 14 }),
        el('span', {}, '草稿已修改：改动须创建新运行才会生效。当前 Run 与哈希保持不变。')
      ]));
    }
    if (draft && draftFamilyValue(draft) === 'none') {
      host.appendChild(el('div', { class: 'notice', 'data-tone': 'info' }, [
        ui.icon('info', { size: 14 }),
        el('span', {}, '草稿为「无故障基准」：可用于与故障运行对照；从上方选择一个故障家族可编排故障。')
      ]));
    }
    if (state0.computeState === 'computing') {
      host.appendChild(el('div', { class: 'notice', 'data-tone': 'info', role: 'status' }, [
        el('span', { class: 'spinner' }), el('span', {}, '计算中：参数编辑暂时锁定…')
      ]));
    }
  }

  function renderErrors(state0) {
    const host = local.refs.errorsBox;
    const errors = state0.draftErrors || [];
    const key = errors.map((e) => (e.field || '') + ':' + (e.message || '')).join(';') + '|' + state0.computeState;
    if (local.errorsKey === key) return;
    local.errorsKey = key;
    ui.clear(host);
    if (!errors.length) return;
    host.appendChild(el('div', { class: 'sys-errors-head' }, [
      ui.icon('warning', { size: 14 }),
      el('span', {}, '配置校验未通过（' + errors.length + ' 项）')
    ]));
    errors.forEach((err) => {
      host.appendChild(el('div', { class: 'sys-error-row' }, [
        el('span', { class: 'sys-error-field mono' }, fieldLabel(err.field)),
        el('span', { class: 'sys-error-msg' }, err.message || '参数无效')
      ]));
    });
    host.appendChild(el('div', { class: 'sys-errors-hint' }, '修正后再创建运行；当前运行不会被改写。'));
  }

  function updateCreateButton(state0, draft) {
    const btn = local.refs.btnCreate;
    const computing = state0.computeState === 'computing';
    const errors = (state0.draftErrors || []).length;
    const noDraft = !draft;
    btn.disabled = computing || noDraft || errors > 0;
    btn.dataset.loading = computing ? 'true' : 'false';
    const hint = local.refs.createHint;
    hint.textContent = computing ? '计算中…'
      : errors ? '请先修正 ' + errors + ' 项配置错误'
        : noDraft ? '草稿不可用，请重新开始实验'
          : state0.draftDirty ? '改动须创建新运行（当前运行与哈希不变）'
            : '使用当前草稿创建不可变运行';
    const lockBadge = local.refs.lockBadge;
    lockBadge.textContent = computing ? '计算中 · 已锁定' : '可直接编辑';
    lockBadge.dataset.tone = computing ? 'warn' : 'neutral';
  }

  function updateTransport(state0, run, draft) {
    const ev = run ? faultEventOf(run) : null;
    const hasRun = !!run;
    const playing = state0.playback && state0.playback.status === 'playing';
    local.refs.btnReplay.disabled = !hasRun;
    local.refs.btnPause.disabled = !hasRun;
    local.refs.btnJump.disabled = !hasRun || !ev;
    ui.clear(local.refs.btnPause);
    local.refs.btnPause.appendChild(ui.icon(playing ? 'pause' : 'play', { size: 13 }));
    local.refs.btnPause.appendChild(el('span', {}, playing ? '暂停' : '播放'));
    ui.clear(local.refs.btnJump);
    local.refs.btnJump.appendChild(ui.icon('flag', { size: 13 }));
    const jumpT = ev ? ev.trigger_s : (draft && draft.fault && isNum(draft.fault.t_start_s) ? draft.fault.t_start_s : null);
    local.refs.btnJump.appendChild(el('span', {}, jumpT != null ? '跳到 ' + fmt.num(jumpT, 1) + ' s' : '跳到故障点'));
    local.refs.btnReset.disabled = state0.computeState === 'computing' || !draft;
  }

  /* ================================================================== */
  /* center column rendering                                            */
  /* ================================================================== */
  function renderTopoHeader(state0, sys, run) {
    const subKey = sys.id + '|' + ((sys.components || []).length) + '|' + ((sys.edges || []).length);
    if (local.topoSubKey !== subKey) {
      local.topoSubKey = subKey;
      local.refs.topoSub.textContent = (sys.shortTitle || sys.title) + ' · ' + (sys.components || []).length + ' 部件 · ' + (sys.edges || []).length + ' 连接';
    }
    local.refs.timeReadout.textContent = 't = ' + fmt.num(state0.currentTime || 0, 1) + ' s';
    const ev = run ? faultEventOf(run) : null;
    const isFaultRun = !!(run && run.config && run.config.fault && run.config.fault.family !== 'none' && ev);
    const active = isFaultRun && (state0.currentTime || 0) >= ev.trigger_s;
    const key = [run ? run.runId : 'none', isFaultRun ? 'f' : 'h', active ? 'live' : 'idle', ev ? ev.trigger_s : ''].join('|');
    if (local.badgeKey === key) return;
    local.badgeKey = key;
    const host = local.refs.faultBadge;
    ui.clear(host);
    if (!run) {
      host.appendChild(ui.badge('未运行', { tone: 'neutral' }));
    } else if (!isFaultRun) {
      host.appendChild(ui.badge('无故障基准', { tone: 'ok', icon: 'check' }));
      host.appendChild(ui.badge('无故障事件', { tone: 'neutral' }));
    } else {
      host.appendChild(ui.badge('故障点 ' + fmt.num(ev.trigger_s, 1) + ' s', { tone: 'danger', icon: 'flag' }));
      host.appendChild(ui.badge(active ? '故障已激活' : '故障未激活', { tone: active ? 'danger' : 'neutral', icon: active ? 'warning' : 'clock' }));
    }
  }

  function renderTopoNotice(state0, sys, run, draft) {
    const mismatch = !!(state0.activeRun && run === null);
    const ev = run ? faultEventOf(run) : null;
    const key = [
      run ? run.runId : 'none',
      state0.computeState,
      mismatch ? 'mismatch' : '',
      draft ? 'draft' : 'nodraft'
    ].join('|');
    if (local.noticeKey === key) return;
    local.noticeKey = key;
    const host = local.refs.topoNotice;
    ui.clear(host);
    host.hidden = false;
    if (mismatch) {
      host.appendChild(el('div', { class: 'notice', 'data-tone': 'warn' }, [
        ui.icon('warning', { size: 14 }),
        el('span', {}, '当前运行属于 ' + (state0.activeRun.systemId || '其他系统') + '，与本页系统不一致；请从首页或顶部切换到对应系统，或按当前配置创建运行。')
      ]));
      return;
    }
    if (state0.computeState === 'computing') {
      host.appendChild(ui.loadingState({ text: '正在计算运行数据…' }));
      return;
    }
    if (!run) {
      const wrap = el('div', { class: 'sys-norun' }, [
        el('div', { class: 'sys-norun-copy' }, [
          el('span', { class: 'badge warn', 'data-tone': 'warn' }, 'NO RUN'),
          el('span', { class: 'sys-norun-text' }, '尚未创建运行：当前只显示模型结构。创建运行后，节点将显示当前时刻的采样值。')
        ]),
        el('button', {
          class: 'btn btn-primary btn-sm', type: 'button',
          on: { click: () => actions.createRun() }
        }, [ui.icon('plus', { size: 13 }), el('span', {}, '按当前配置创建运行')])
      ]);
      host.appendChild(wrap);
      return;
    }
    if (run.role === 'baseline' || (run.config && run.config.fault && run.config.fault.family === 'none')) {
      host.appendChild(el('div', { class: 'notice', 'data-tone': 'ok' }, [
        ui.icon('check', { size: 14 }),
        el('span', {}, '当前为无故障基准运行：真实通道与测量通道一致，可用于对照。左侧选择故障家族可创建故障运行。')
      ]));
      return;
    }
    if (ev) {
      const active = (state0.currentTime || 0) >= ev.trigger_s;
      host.appendChild(el('div', { class: 'notice', 'data-tone': active ? 'danger' : 'info' }, [
        ui.icon(active ? 'warning' : 'flag', { size: 14 }),
        el('span', {}, active
          ? '故障已激活：t = ' + fmt.num(state0.currentTime || 0, 1) + ' s ≥ ' + fmt.num(ev.trigger_s, 1) + ' s。节点数值为当前时刻采样，观测通道已受偏置影响。'
          : '故障尚未激活：当前 t = ' + fmt.num(state0.currentTime || 0, 1) + ' s，故障点 ' + fmt.num(ev.trigger_s, 1) + ' s。可点击「跳到 ' + fmt.num(ev.trigger_s, 1) + ' s」。')
      ]));
    }
    host.hidden = false;
  }

  function updateNodeValues(state0, run) {
    const t = state0.currentTime || 0;
    const nodeMeta = local.nodeMeta;
    Object.keys(nodeMeta).forEach((id) => {
      const m = nodeMeta[id];
      if (!m) return;
      m.btn.classList.remove('is-value-missing');
      if (!run) {
        m.vnum.textContent = '—';
        m.unit.textContent = '';
        m.src.textContent = '未运行';
        m.src.dataset.kind = '';
        m.btn.classList.add('is-value-missing');
        return;
      }
      if (!m.signalId) {
        m.vnum.textContent = '—';
        m.unit.textContent = '';
        m.src.textContent = '无绑定信号';
        m.src.dataset.kind = '';
        return;
      }
      const sample = protocol.sampleAt(run, m.signalId, t);
      const value = sample ? sample.value : null;
      if (value == null || !isFinite(value)) {
        m.vnum.textContent = '—';
        m.unit.textContent = '';
        m.src.textContent = '本场景不可用';
        m.src.dataset.kind = '';
        m.btn.classList.add('is-value-missing');
        return;
      }
      m.vnum.textContent = fmt.num(value, Math.min(m.precision, 3));
      m.unit.textContent = m.unitText || '';
      m.src.textContent = SRC_SHORT[m.sourceKind] || m.sourceKind || '';
      m.src.dataset.kind = m.sourceKind || '';
      const label = (local.sys.signals || []).filter((s) => s.id === m.signalId)[0];
      m.btn.title = m.comp.label + (m.comp.role ? ' · ' + m.comp.role : '') +
        '\n' + (label ? label.label + ' = ' + fmt.num(value, m.precision) + ' ' + (m.unitText || '') : m.signalId);
    });
  }

  function updateNodeSelection(state0) {
    const selected = state0.selectedComponent;
    Object.keys(local.nodeMeta).forEach((id) => {
      const m = local.nodeMeta[id];
      const on = id === selected;
      m.btn.classList.toggle('is-selected', on);
      m.btn.setAttribute('aria-pressed', String(on));
    });
  }

  function updateFaultMarks(state0, sys, draft, run) {
    const draftFamily = draftFamilyValue(draft);
    const targets = {};
    if (draftFamily && draftFamily !== 'none') {
      const anchor = (sys.faultAnchors || {})[draftFamily] ||
        (findFault(sys, draftFamily) || {}).target;
      if (anchor) targets[anchor] = Object.assign(targets[anchor] || {}, { draft: true, family: draftFamily });
    }
    const ev = run ? faultEventOf(run) : null;
    const hasFaultRun = !!(run && ev && run.config && run.config.fault && run.config.fault.family !== 'none');
    let active = false;
    if (hasFaultRun) {
      const target = ev.target_component || (run.truth && run.truth.affectedComponent) || null;
      active = (state0.currentTime || 0) >= ev.trigger_s;
      if (target) targets[target] = Object.assign(targets[target] || {}, { event: ev, active });
    }
    const key = JSON.stringify(Object.keys(targets).sort().map((id) => [id, !!(targets[id] && targets[id].active)])) + '|' + active;
    if (local.faultKey === key) return;
    local.faultKey = key;
    Object.keys(local.nodeMeta).forEach((id) => {
      const m = local.nodeMeta[id];
      const tg = targets[id];
      const draftOnly = !!(tg && tg.draft && !tg.event);
      m.flt.hidden = !tg;
      m.flt.classList.toggle('is-active', !!(tg && tg.active));
      m.flt.classList.toggle('is-draft', draftOnly);
      m.btn.classList.toggle('is-fault-target', !!tg);
      m.btn.classList.toggle('is-fault-active', !!(tg && tg.active));
      if (tg) {
        const evLabel = tg.event && tg.event.label ? tg.event.label : '当前草稿故障注入点（创建新运行后生效）';
        m.flt.title = '故障注入点 · ' + evLabel;
      } else {
        m.flt.removeAttribute('title');
      }
    });
  }

  function renderTopoNote(state0, sys, run) {
    const bus = (sys.components || []).filter((c) => c.kind === 'bus')[0];
    let voltage = null;
    if (bus) {
      const m = /(\d+(?:\.\d+)?)\s*V/.exec(String(bus.role || '') + ' ' + String(bus.description || ''));
      if (m) voltage = m[1] + ' V';
    }
    const key = [sys.id, run ? run.runId : 'none', voltage].join('|');
    if (local.topoNoteKey === key) return;
    local.topoNoteKey = key;
    local.refs.topoNote.textContent =
      (voltage ? voltage + ' 母线为模型假设（理想母线，无动态、不展示未建模的电压尖峰）。' : '母线电压为模型假设。') +
      ' 节点显示当前时刻采样值：真值=模型状态、观测=测量通道输出、假设=模型假设；完整曲线与证据见曲线页。';
  }

  /* ================================================================== */
  /* right column: inspector                                            */
  /* ================================================================== */
  function selectComponent(id) {
    actions.selectComponent(id);
    if (window.matchMedia && window.matchMedia('(min-width: 768px) and (max-width: 1199px)').matches) {
      openInspector();
    }
  }

  function openInspector() {
    if (!local.refs.grid) return;
    local.refs.grid.classList.add('is-insp-open');
  }
  function closeInspector() {
    if (!local.refs.grid) return;
    local.refs.grid.classList.remove('is-insp-open');
  }

  function inspectorRows(sys, run, comp, state0) {
    const values = [];
    const rows = [];
    (comp.inspector || []).forEach((item) => {
      const meta = (run ? protocol.signalById(run, item.id) : null) ||
        ((sys.signals || []).filter((s) => s.id === item.id)[0] || null);
      const sourceKind = item.source || (meta ? meta.sourceKind : 'MODEL_STATE');
      if (meta) {
        const row = {
          type: 'signal', id: item.id,
          label: meta.label || item.label || item.id,
          unit: meta.unit || '',
          sourceKind,
          definition: meta.definition || '',
          formula: meta.formula || '',
          precision: meta.precision == null ? 2 : meta.precision
        };
        rows.push(row);
        values.push(row);
      } else {
        const asm = ((sys.model && sys.model.assumptions) || []).filter((a) => a.id === item.id)[0];
        rows.push({
          type: 'text', id: item.id,
          label: item.label || item.id,
          sourceKind,
          text: asm ? asm.text : '该变量不在当前运行的数据中（本场景不可用）。'
        });
        values.push(null);
      }
    });
    /* 控制器按规格 §4.3 额外展示反馈模式（来自 CONFIG） */
    if (run && /controller|governor/.test(comp.kind)) {
      const cfg = run.config || {};
      rows.push({
        type: 'text', id: 'feedback_mode', label: '反馈模式', sourceKind: 'CONFIG',
        text: cfg.feedback_mode === 'monitor'
          ? '仅监测：测量值不参与反馈，物理输入照常生效。'
          : '闭环反馈：控制器按测量值调节执行器，测量偏差会进入物理回路。'
      });
      values.push(null);
    }
    return { rows, values };
  }

  function buildInspectorContent(sys, state0, run, comp) {
    const host = local.refs.inspBody;
    ui.clear(host);
    local.inspectorValues = [];
    if (!comp) {
      host.appendChild(ui.emptyState({
        icon: 'target', title: '未选择部件', desc: '点击拓扑中的任意部件，查看它在当前时刻的真实值、观测值与来源标签。'
      }));
      return;
    }
    const iconName = KIND_ICON[comp.kind] || 'dot';
    const kindLabel = KIND_LABEL[comp.kind] || comp.kind;
    const head = el('div', { class: 'sys-insp-hero' }, [
      el('span', { class: 'sys-insp-icon' }, ui.icon(iconName, { size: 20 })),
      el('div', { class: 'sys-insp-id' }, [
        el('div', { class: 'sys-insp-name display' }, comp.label),
        el('div', { class: 'sys-insp-tags' }, [
          el('span', { class: 'badge', 'data-tone': 'neutral' }, kindLabel),
          el('span', { class: 'sys-insp-role' }, comp.role || '')
        ])
      ])
    ]);
    host.appendChild(head);
    if (comp.description) host.appendChild(el('p', { class: 'sys-insp-desc' }, comp.description));

    if (!run) {
      host.appendChild(el('div', { class: 'sys-insp-time' }, [
        el('span', { class: 'eyebrow' }, '当前时刻'),
        el('span', { class: 'mono' }, '无运行数据'),
        el('span', { class: 'muted' }, ' · 创建运行后显示采样值')
      ]));
      host.appendChild(ui.emptyState({
        icon: 'flask',
        title: '尚未创建运行',
        desc: '检查器字段来自 system.components[].inspector；值来自当前 Run 的当前时刻采样。创建运行后即可查看。',
        action: { label: '按当前配置创建运行', icon: 'plus', onClick: () => actions.createRun() }
      }));
      return;
    }

    host.appendChild(el('div', { class: 'sys-insp-time' }, [
      el('span', { class: 'eyebrow' }, '当前时刻'),
      el('span', { class: 'mono' }, 't = ' + fmt.num(state0.currentTime || 0, 1) + ' s'),
      el('span', { class: 'muted' }, ' · 数值随全局时间线同步')
    ]));

    const built = inspectorRows(sys, run, comp, state0);
    const fields = el('div', { class: 'sys-insp-fields' });
    built.rows.forEach((row, idx) => {
      const fieldEl = el('div', { class: 'sys-insp-field', 'data-kind': row.sourceKind });
      const labelRow = el('div', { class: 'sys-insp-field-head' }, [
        el('span', { class: 'sys-insp-label' }, row.label),
        ui.sourceTag(row.sourceKind)
      ]);
      fieldEl.appendChild(labelRow);
      if (row.type === 'signal') {
        const valEl = el('span', { class: 'sys-insp-val mono' }, '—');
        fieldEl.appendChild(el('div', { class: 'sys-insp-value-row' }, [
          valEl,
          el('span', { class: 'sys-insp-unit' }, row.unit || ''),
          el('span', { class: 'sys-insp-sig mono' }, row.id)
        ]));
        if (row.formula) fieldEl.appendChild(el('div', { class: 'sys-insp-formula mono' }, row.formula));
        if (row.definition) fieldEl.appendChild(el('div', { class: 'sys-insp-def' }, row.definition));
        local.inspectorValues.push({ el: valEl, id: row.id, precision: row.precision, unit: row.unit });
      } else {
        fieldEl.appendChild(el('div', { class: 'sys-insp-text' }, row.text));
      }
      fields.appendChild(fieldEl);
    });
    if (!built.rows.length) {
      fields.appendChild(el('div', { class: 'sys-insp-empty-fields' },
        '该部件在 system.components[].inspector 中没有绑定可检查字段；可参考上方描述与拓扑连接。'));
    }
    host.appendChild(fields);

    /* actions */
    const signalIds = componentSignals(sys, comp);
    const canCurves = signalIds.length > 0;
    const btnCurve = el('button', { class: 'btn btn-primary btn-sm btn-block', type: 'button' }, [
      ui.icon('chart', { size: 13 }), el('span', {}, '查看对应曲线' + (canCurves ? ' · ' + signalIds.length + ' 条信号' : ''))
    ]);
    btnCurve.disabled = !canCurves;
    btnCurve.addEventListener('click', () => goToSignals(sys, run, comp));
    const btnCausal = el('button', { class: 'btn btn-sm btn-block', type: 'button' }, [
      ui.icon('pulse', { size: 13 }), el('span', {}, '解释异常来源')
    ]);
    btnCausal.addEventListener('click', () => goToCausal(run, comp));
    host.appendChild(el('div', { class: 'sys-insp-actions' }, [btnCurve, btnCausal]));

    const notes = el('div', { class: 'sys-insp-notes' }, [
      el('div', { class: 'hint-row' }, [
        ui.icon('info', { size: 13 }),
        el('span', {}, '「查看对应曲线」会勾选该部件信号并保留当前时刻（t = ' + fmt.num(state0.currentTime || 0, 1) + ' s）；「解释异常来源」在无故障运行时给出提示。')
      ])
    ]);
    const assumptionRows = built.rows.filter((r) => r.sourceKind === 'MODEL_ASSUMPTION' && r.type === 'signal');
    if (assumptionRows.length) {
      notes.appendChild(el('div', { class: 'hint-row' }, [
        ui.icon('shield', { size: 13 }),
        el('span', {}, '带「假设」标签的数值来自模型假设（如理想母线电压），不是被仿真的物理状态。')
      ]));
    }
    host.appendChild(notes);
  }

  function goToSignals(sys, run, comp) {
    if (!run) { ui.toast('请先创建运行，再查看曲线', 'warn'); return; }
    const ids = componentSignals(sys, comp);
    if (!ids.length) { ui.toast('该部件在模型的 inspect 定义中没有可绘制信号', 'warn'); return; }
    const visible = {};
    (run.signals || []).forEach((s) => {
      if (s.tableOnly) return;
      visible[s.id] = false;
    });
    let category = null;
    ids.forEach((id) => {
      const meta = protocol.signalById(run, id);
      if (!meta) return;
      if (meta.tableOnly) return;
      visible[id] = true;
      if (!category) category = meta.category;
    });
    if (!Object.keys(visible).some((k) => visible[k])) {
      ui.toast('该部件的信号只在数据快照中出现（未建模曲线）', 'info');
      return;
    }
    actions.setPageState('signals', {
      visible,
      category: category || 'current',
      selectedSignal: ids[0] || null
    });
    actions.navigate('signals');
    ui.toast('已勾选 ' + comp.label + ' 的 ' + ids.length + ' 条信号 · 游标保留 t = ' + fmt.num((state() || {}).currentTime || 0, 1) + ' s', 'ok');
  }

  function goToCausal(run, comp) {
    if (!run) { ui.toast('请先创建运行，再查看因果解释', 'warn'); return; }
    const ev = faultEventOf(run);
    const hasFault = !!(ev && run.config && run.config.fault && run.config.fault.family !== 'none');
    if (!hasFault) {
      ui.toast('当前运行没有故障事件（无故障基准），无法推导异常来源；请先创建故障运行。', 'warn');
      return;
    }
    let focusId = null;
    const nodes = (run.causal && run.causal.nodes) || [];
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].componentId && comp && nodes[i].componentId === comp.id) { focusId = nodes[i].id; break; }
    }
    actions.setPageState('causal', { focusNodeId: focusId, evidenceOpen: false });
    actions.navigate('causal');
  }

  function updateInspectorValues(state0, run) {
    if (!run || !local.inspectorValues || !local.inspectorValues.length) return;
    const t = state0.currentTime || 0;
    local.inspectorValues.forEach((v) => {
      if (!v || !v.el) return;
      const sample = protocol.sampleAt(run, v.id, t);
      const value = sample ? sample.value : null;
      if (value == null || !isFinite(value)) {
        v.el.textContent = '—';
        v.el.classList.add('is-missing');
        v.el.title = '该信号在当前场景不可用';
      } else {
        v.el.textContent = fmt.num(value, v.precision);
        v.el.classList.remove('is-missing');
        v.el.removeAttribute('title');
      }
    });
  }

  function renderInspector(state0, sys, run) {
    const sel = state0.selectedComponent;
    const comp = compById(sys, sel) || compById(sys, (sys.faultAnchors || {})[(sys.faults && sys.faults[0] && sys.faults[0].family) || 'sensor_drift']) || (sys.components || [])[0];
    const key = [sys.id, run ? run.runId : 'none', comp ? comp.id : 'none', state0.computeState].join('|');
    local.refs.inspTime.textContent = run ? 't = ' + fmt.num(state0.currentTime || 0, 1) + ' s' : '无运行';
    ui.clear(local.refs.inspKind);
    if (comp) local.refs.inspKind.appendChild(ui.badge(KIND_LABEL[comp.kind] || comp.kind || '—', { tone: 'neutral' }));
    if (local.inspectorKey === key) { updateInspectorValues(state0, run); return; }
    local.inspectorKey = key;
    if (state0.computeState === 'computing') {
      ui.clear(local.refs.inspBody);
      local.inspectorValues = [];
      local.refs.inspBody.appendChild(ui.loadingState({ text: '正在计算运行数据…' }));
      return;
    }
    buildInspectorContent(sys, state0, run, comp);
    updateInspectorValues(state0, run);
  }

  /* ================================================================== */
  /* top-level render                                                   */
  /* ================================================================== */
  function ensureSystem(state0) {
    if (!state0) return null;
    const sid = state0.systemId;
    if (local.sys && local.sysId === sid) return local.sys;
    local.sysId = sid;
    local.sys = safe(() => FL.systems.get(sid), null);
    local.layout = null;
    local.router = null;
    local.nodeMeta = {};
    local.familyEls = {};
    local.familyMeta = {};
    local.controlFamilyKey = null;
    local.controlMeta = null;
    local.inspectorKey = null;
    local.inspectorValues = [];
    local.headerKey = null;
    local.runKey = null;
    local.noticeKey = null;
    local.badgeKey = null;
    local.faultKey = null;
    local.leftNoticeKey = null;
    local.errorsKey = null;
    local.topoNoteKey = null;
    local.topoSubKey = null;
    if (local.sys) {
      local.refs.title.textContent = local.sys.title;
      local.refs.code.textContent = local.sys.experimentCode || local.sys.id;
      local.refs.sub.textContent = local.sys.summary || '';
      buildFamilyCards(local.sys);
      buildTopology(local.sys);
      renderTopoNote(state0, local.sys, runOf(state0, local.sys));
    }
    return local.sys;
  }

  function renderSystemError() {
    const host = local.refs.stageScroll;
    if (!local.refs.inspBody) return;
    const msg = '无法加载系统定义（' + (local.sysId || '—') + '）。核心模块可能尚未就绪，请刷新页面重试。';
    if (host && !host.dataset.errShown) {
      host.dataset.errShown = '1';
      ui.clear(host);
      host.appendChild(ui.emptyState({ icon: 'warning', title: '系统数据未就绪', desc: msg }));
    }
  }

  function render(state0, reason) {
    if (!local.refs.wrap) return;
    const sys = ensureSystem(state0);
    if (!sys) { renderSystemError(); return; }
    const draft = draftOf(state0, sys);
    const run = runOf(state0, sys);

    /* header badges */
    const hKey = [sys.id, state0.activeRun ? state0.activeRun.runId : 'none', state0.draftDirty ? '1' : '0',
      state0.computeState, state0.activeRun ? state0.activeRun.config.feedback_mode : (draft ? draft.feedback_mode : '')].join('|');
    if (local.headerKey !== hKey) {
      local.headerKey = hKey;
      buildHeaderMeta(state0, sys);
    }

    /* left */
    renderRunSummary(state0, run);
    renderFamilySelection(draft);
    const fault = currentFault(sys, draft);
    const famKey = [sys.id, draftFamilyValue(draft), fault ? fault.id : 'none'].join('|');
    if (local.controlFamilyKey !== famKey) {
      rebuildParamControls(sys, draft, fault);
      local.controlFamilyKey = famKey;
    } else {
      syncControlValues(draft);
    }
    renderModeControl(draft, fault);
    renderDraftNotices(state0, draft);
    renderErrors(state0);
    updateCreateButton(state0, draft);
    updateTransport(state0, run, draft);
    const editing = state0.computeState === 'computing';
    Object.keys(local.familyEls).forEach((fam) => { local.familyEls[fam].disabled = editing; });
    if (local.controlMeta) {
      local.controlMeta.entries.forEach((entry) => {
        if (entry.slider && entry.slider.setDisabled) entry.slider.setDisabled(editing);
        if (entry.num) entry.num.disabled = editing;
      });
      if (local.controlMeta.time) {
        if (local.controlMeta.time.slider.setDisabled) local.controlMeta.time.slider.setDisabled(editing);
        if (local.controlMeta.time.num) local.controlMeta.time.num.disabled = editing;
      }
    }

    /* center */
    renderTopoHeader(state0, sys, run);
    renderTopoNotice(state0, sys, run, draft);
    updateFaultMarks(state0, sys, draft, run);
    updateNodeValues(state0, run);
    updateNodeSelection(state0);
    renderTopoNote(state0, sys, run);

    /* right */
    renderInspector(state0, sys, run);
  }

  /* ================================================================== */
  /* wiring                                                             */
  /* ================================================================== */
  function wire() {
    const refs = local.refs;
    refs.btnCreate.addEventListener('click', () => {
      const st = state();
      if (!st || st.computeState === 'computing') return;
      actions.createRun();
    });
    refs.btnReplay.addEventListener('click', () => actions.replay());
    refs.btnPause.addEventListener('click', () => actions.togglePlay());
    refs.btnJump.addEventListener('click', () => actions.jumpToFault());
    refs.btnReset.addEventListener('click', () => actions.resetDraft());
    refs.btnInspToggle.addEventListener('click', () => {
      if (refs.grid.classList.contains('is-insp-open')) closeInspector();
      else openInspector();
    });
    refs.btnInspClose.addEventListener('click', closeInspector);
    refs.inspBackdrop.addEventListener('click', closeInspector);

    local.escHandler = (e) => {
      if (e.key === 'Escape' && refs.grid && refs.grid.classList.contains('is-insp-open')) {
        e.stopPropagation();
        closeInspector();
      }
    };
    document.addEventListener('keydown', local.escHandler, true);
  }

  /* ================================================================== */
  /* page module                                                        */
  /* ================================================================== */
  pages.system = {
    id: 'system',
    label: '系统交互图',
    navLabel: '系统',
    mount(root, api) {
      apiRef = api;
      ui = api.ui;
      actions = api.actions;
      getState = api.getState;
      protocol = api.protocol;
      fmt = api.fmt || (api.protocol && api.protocol.fmt);
      ui.clear(root);
      root.classList.add('pg-system');
      root.appendChild(buildSkeleton());
      buildModeControl();
      wire();
      try { render(getState(), 'boot'); } catch (err) { console.error('[system] mount render failed', err); }
    },
    update(state0, reason) {
      if (!ui) return;
      try { render(state0, reason); } catch (err) {
        console.error('[system] render failed', err, reason);
      }
    },
    unmount() {
      if (local.escHandler) {
        document.removeEventListener('keydown', local.escHandler, true);
        local.escHandler = null;
      }
    }
  };
})();
