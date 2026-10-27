/* owner: chart-signals | module: ui/chart | contract: docs/CONTRACT.md */
/*
 * FaultLab — Canvas 图表渲染引擎（零依赖 / 零网络 / 不访问 store）
 *
 * 契约：docs/CONTRACT.md §10
 *   FL.chart.create(canvasEl, opts) -> chart
 *   chart.setSeries / setEvents / setCursor / setSelectedPoint / setDomain /
 *         setTheme / resize / render / destroy
 *
 * 设计要点：
 *   - devicePixelRatio 适配；宽度自适应容器，逻辑高度来自 opts.height（CSS px）；
 *   - 多序列 + 左右双轴；nice ticks；时间轴 0–60 s 主刻度 10 s；
 *   - 线型 solid / dashed / dashdot / dotted；step:true 采样保持（先水平后垂直）；
 *   - 事件竖线 + 顶部故障三角/斜纹标记 + 标签；
 *   - 游标（白色虚线）+ 各序列交点圆点 + 当前时刻徽标；选中点高亮；hover 最近采样回调；
 *   - 指针在 canvas 上拖动 => onCursorDrag(t)，页面自行暂停播放 / setTime；
 *   - 空数据、单点、极值相等、y 全 0 等边界安全；
 *   - prefers-reduced-motion：本图表本身没有任何动画，无需关闭；
 *   - canvas 设置 role/aria-label；表格模式由页面提供（契约 §10）。
 *
 * 颜色：优先接受语义 token（acc|obs|warm|fault|ok|warn|ink|ink0..ink3），
 * 由 getComputedStyle(document.documentElement) 读取 CSS 变量并缓存一次；
 * 未加载 theme.css 时回退到契约 §3.3 规定的同一套令牌值（不是另造配色）。
 */
(function () {
  'use strict';

  var FL = window.FL = window.FL || {};
  var VERSION = '0.1.0';

  /* ------------------------------------------------------------------ *
   * 常量 / 回退主题
   * ------------------------------------------------------------------ */

  var STYLE_DASH = {
    solid: [],
    dashed: [6, 4],
    dashdot: [9, 4, 2, 4],
    dotted: [2, 3]
  };

  var VALID_STYLES = { solid: 1, dashed: 1, dashdot: 1, dotted: 1 };

  // 契约 §3.3 / §4.3：colorToken 只能是这些语义 token
  var TOKEN_ALIAS = {
    acc: 'acc',
    obs: 'obs',
    warm: 'warm',
    fault: 'fault',
    ok: 'ok',
    warn: 'warn',
    ink: 'ink1',
    ink0: 'ink0',
    ink1: 'ink1',
    ink2: 'ink2',
    ink3: 'ink3',
    bg0: 'bg0',
    bg1: 'bg1',
    bg2: 'bg2',
    bg3: 'bg3',
    line1: 'line1',
    line2: 'line2',
    cursor: 'cursor',
    grid: 'grid',
    axis: 'axis'
  };

  // 只在 theme.css 尚未就绪时使用；值与契约 §3.3 完全一致
  var FALLBACK_VARS = {
    '--bg-0': '#06080b',
    '--bg-1': '#0b0f14',
    '--bg-2': '#11161d',
    '--bg-3': '#171e27',
    '--line-1': '#232b35',
    '--line-2': '#2f3945',
    '--ink-0': '#eef3f2',
    '--ink-1': '#c2ccd0',
    '--ink-2': '#8b98a5',
    '--ink-3': '#5a6673',
    '--acc': '#c8f45a',
    '--obs': '#5ad8ff',
    '--warm': '#ffb257',
    '--fault': '#ff5f6d',
    '--ok': '#5fe3a1',
    '--warn': '#ffd166',
    '--font-mono': '"Cascadia Mono", "Cascadia Code", "Consolas", "Microsoft YaHei UI", monospace',
    '--font-body': '"Segoe UI Variable Text", "Segoe UI", "Microsoft YaHei UI", "PingFang SC", sans-serif'
  };

  var VAR_NAMES = Object.keys(FALLBACK_VARS);

  var BASE_THEME = null;
  var LIVE_RESET = []; // 现有实例的 refreshTheme 回调用（destroy 时移除）

  /* ------------------------------------------------------------------ *
   * 基础工具
   * ------------------------------------------------------------------ */

  function isNum(v) {
    return typeof v === 'number' && isFinite(v);
  }

  /** null / undefined / 空串 => NaN（缺测不能画成 0，契约 §4.6） */
  function toNum(v) {
    if (v == null || v === '') return NaN;
    var n = Number(v);
    return isFinite(n) ? n : NaN;
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function safeCall(fn, arg) {
    if (typeof fn !== 'function') return;
    try {
      fn(arg);
    } catch (err) {
      // 回调异常不能破坏图表主循环；交由控制台定位
      if (window.console && window.console.error) {
        window.console.error('[FL.chart] 回调异常：', err);
      }
    }
  }

  function cleanFloat(v) {
    if (!isFinite(v)) return v;
    if (v === 0) return 0;
    return Number(v.toPrecision(12));
  }

  function pxFont(size, family) {
    return String(size) + 'px ' + (family || FALLBACK_VARS['--font-mono']);
  }

  function prefersReducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
      return false;
    }
  }

  /* ------------------------------------------------------------------ *
   * 主题（CSS 变量只解析一次并缓存）
   * ------------------------------------------------------------------ */

  function readCssVariables() {
    var vars = {};
    var i;
    for (i = 0; i < VAR_NAMES.length; i++) vars[VAR_NAMES[i]] = FALLBACK_VARS[VAR_NAMES[i]];
    try {
      if (window.getComputedStyle && document.documentElement) {
        var cs = window.getComputedStyle(document.documentElement);
        for (i = 0; i < VAR_NAMES.length; i++) {
          var name = VAR_NAMES[i];
          var val = cs.getPropertyValue(name);
          if (val) {
            val = val.trim();
            if (val) vars[name] = val;
          }
        }
      }
    } catch (e) {
      /* 保留回退 */
    }
    return vars;
  }

  function getBaseTheme() {
    if (BASE_THEME) return BASE_THEME;
    var vars = readCssVariables();
    BASE_THEME = {
      vars: vars,
      colors: {
        acc: vars['--acc'],
        obs: vars['--obs'],
        warm: vars['--warm'],
        fault: vars['--fault'],
        ok: vars['--ok'],
        warn: vars['--warn'],
        ink0: vars['--ink-0'],
        ink1: vars['--ink-1'],
        ink2: vars['--ink-2'],
        ink3: vars['--ink-3'],
        bg0: vars['--bg-0'],
        bg1: vars['--bg-1'],
        bg2: vars['--bg-2'],
        bg3: vars['--bg-3'],
        line1: vars['--line-1'],
        line2: vars['--line-2'],
        cursor: vars['--ink-0'],
        grid: vars['--line-1'],
        axis: vars['--line-2']
      },
      fontMono: vars['--font-mono'],
      fontBody: vars['--font-body']
    };
    return BASE_THEME;
  }

  /**
   * 解析序列/事件颜色：'acc' | 'obs' | ... | 'var(--acc)' | '#c8f45a'
   */
  function resolveColor(value, theme) {
    if (value == null || value === '') return theme.colors.ink1;
    var s = String(value).trim();
    if (!s) return theme.colors.ink1;
    var low = s.toLowerCase();
    var alias = TOKEN_ALIAS[low];
    if (alias && theme.colors[alias] != null) return theme.colors[alias];
    if (low.indexOf('var(') === 0) {
      var m = low.match(/var\(\s*(--[a-z0-9_-]+)\s*(?:,[^)]*)?\)/);
      if (m) {
        var cssVal = theme.vars[m[1]] || FALLBACK_VARS[m[1]];
        if (cssVal) return cssVal;
      }
    }
    return s;
  }

  /* ------------------------------------------------------------------ *
   * Nice ticks / 数值格式
   * ------------------------------------------------------------------ */

  function niceNum(range, round) {
    if (!isFinite(range) || range <= 0) return 1;
    var exp = Math.floor(Math.log10(range));
    var f = range / Math.pow(10, exp);
    var nf;
    if (round) {
      if (f < 1.5) nf = 1;
      else if (f < 3) nf = 2;
      else if (f < 7) nf = 5;
      else nf = 10;
    } else {
      if (f <= 1) nf = 1;
      else if (f <= 2) nf = 2;
      else if (f <= 5) nf = 5;
      else nf = 10;
    }
    return nf * Math.pow(10, exp);
  }

  function decimalsForStep(step) {
    if (!isFinite(step) || step <= 0) return 2;
    var d = Math.ceil(-Math.log10(step) - 1e-9);
    return clamp(d, 0, 6);
  }

  /** 自动 nice 域：返回 { lo, hi, step, ticks, decimals } */
  function niceScale(min, max, maxTicks) {
    min = Number(min);
    max = Number(max);
    if (!isFinite(min) || !isFinite(max)) {
      min = 0;
      max = 1;
    }
    if (max < min) {
      var tmp = min;
      min = max;
      max = tmp;
    }
    if (Math.abs(max - min) < 1e-9) {
      if (Math.abs(max) < 1e-6 && Math.abs(min) < 1e-6) {
        // 恒为 0 的残差类信号：给一个可读的对称域（避免刻度全是 0.000000）
        min = -1;
        max = 1;
      } else if (max === 0) {
        min = -1;
        max = 1;
      } else {
        var pad = Math.abs(max) * 0.05;
        if (!(pad > 0)) pad = 0.5;
        min -= pad;
        max += pad;
      }
    }
    var step = niceNum((max - min) / Math.max(1, (maxTicks || 5) - 1), true);
    var lo = cleanFloat(Math.floor(min / step) * step);
    var hi = cleanFloat(Math.ceil(max / step) * step);
    if (hi - lo < step * 1e-9) hi = lo + step;
    var n = Math.round((hi - lo) / step);
    if (!isFinite(n) || n < 0) n = 1;
    n = Math.min(n, 80);
    var ticks = [];
    for (var i = 0; i <= n; i++) ticks.push(cleanFloat(lo + i * step));
    return {
      lo: lo,
      hi: hi,
      step: step,
      ticks: ticks,
      decimals: decimalsForStep(step),
      exact: false
    };
  }

  /** 用户显式指定的域（例如 SOC 纵轴放大）：范围严格保留，刻度取 nice */
  function exactScale(lo, hi, maxTicks) {
    lo = Number(lo);
    hi = Number(hi);
    if (!isFinite(lo) || !isFinite(hi)) return niceScale(0, 1, maxTicks);
    if (hi < lo) {
      var tmp = lo;
      lo = hi;
      hi = tmp;
    }
    if (Math.abs(hi - lo) < 1e-12) {
      var c = (lo + hi) / 2;
      var pad = Math.abs(c) * 0.01;
      if (!(pad > 0)) pad = 0.5;
      lo -= pad;
      hi += pad;
    }
    var span = hi - lo;
    var step = niceNum(span / Math.max(1, (maxTicks || 5) - 1), true);
    var start = Math.ceil(lo / step - 1e-9) * step;
    var ticks = [];
    for (var v = start, i = 0; v <= hi + step * 1e-9 && i < 60; i++, v = start + i * step) {
      var val = cleanFloat(v);
      if (val >= lo - step * 1e-9) ticks.push(val);
    }
    if (ticks.length < 2) ticks = [cleanFloat(lo), cleanFloat(hi)];
    return {
      lo: cleanFloat(lo),
      hi: cleanFloat(hi),
      step: step,
      ticks: ticks,
      decimals: decimalsForStep(step),
      exact: true
    };
  }

  function fmtTick(value, decimals) {
    var d = decimals == null ? 2 : decimals;
    if (!isFinite(value)) return '';
    var s;
    try {
      s = value.toFixed(d);
    } catch (e) {
      s = String(value);
    }
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    if (s === '' || s === '-0' || s === '-0.') s = '0';
    return s;
  }

  function fmtSeconds(t) {
    if (!isFinite(t)) return '';
    return (Math.round(t * 10) / 10).toFixed(1) + ' s';
  }

  /* ------------------------------------------------------------------ *
   * 二分查找 / 取值（step 采样保持 / 连续线性插值）
   * ------------------------------------------------------------------ */

  function lowerBound(arr, n, v) {
    var lo = 0;
    var hi = n;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (arr[mid] < v) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  function upperBound(arr, n, v) {
    var lo = 0;
    var hi = n;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (arr[mid] <= v) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  function nearestIndex(arr, n, v) {
    if (n <= 0) return -1;
    if (v <= arr[0]) return 0;
    if (v >= arr[n - 1]) return n - 1;
    var lo = lowerBound(arr, n, v);
    var a = lo;
    var b = lo - 1;
    return (arr[a] - v <= v - arr[b]) ? a : b;
  }

  function firstFinite(vs, n) {
    for (var i = 0; i < n; i++) if (isFinite(vs[i])) return vs[i];
    return null;
  }

  function lastFinite(vs, n) {
    for (var i = n - 1; i >= 0; i--) if (isFinite(vs[i])) return vs[i];
    return null;
  }

  /** 取序列在 t 处的值：step => 采样保持；否则线性插值（游标圆点/快照用） */
  function valueAtPoint(series, t) {
    if (!series || series.n <= 0) return null;
    var ts = series.ts;
    var vs = series.vs;
    var n = series.n;
    if (t <= ts[0]) return isFinite(vs[0]) ? vs[0] : firstFinite(vs, n);
    if (t >= ts[n - 1]) return isFinite(vs[n - 1]) ? vs[n - 1] : lastFinite(vs, n);
    var i = upperBound(ts, n, t); // 第一个 > t 的下标
    if (series.step) {
      var k = i - 1;
      while (k >= 0 && !isFinite(vs[k])) k--;
      return k >= 0 ? vs[k] : null;
    }
    var k0 = i - 1;
    var k1 = i;
    var v0 = vs[k0];
    var v1 = vs[k1];
    var f0 = isFinite(v0);
    var f1 = isFinite(v1);
    if (!f0 && !f1) return null;
    if (!f0) return v1;
    if (!f1) return v0;
    var t0 = ts[k0];
    var t1 = ts[k1];
    if (t1 === t0) return v1;
    var r = (t - t0) / (t1 - t0);
    return v0 + (v1 - v0) * r;
  }

  /* ------------------------------------------------------------------ *
   * 数据预处理
   * ------------------------------------------------------------------ */

  function normalizeStyle(style) {
    var s = String(style || 'solid').toLowerCase();
    return VALID_STYLES[s] ? s : 'solid';
  }

  function preparePoints(rawPoints) {
    var n = 0;
    var ts = null;
    var vs = null;
    if (!rawPoints || typeof rawPoints !== 'object') {
      return { ts: new Float64Array(0), vs: new Float64Array(0), n: 0 };
    }
    if (Array.isArray(rawPoints.t) || (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView && ArrayBuffer.isView(rawPoints.t))) {
      // 扩展形式：{ t:[...], v:[...] }（页面可避免逐点建数组）
      var tArr = rawPoints.t;
      var vArr = rawPoints.v || rawPoints.y;
      n = Math.min(tArr ? tArr.length : 0, vArr ? vArr.length : 0);
      ts = new Float64Array(n);
      vs = new Float64Array(n);
      for (var a = 0; a < n; a++) {
        ts[a] = toNum(tArr[a]);
        vs[a] = toNum(vArr[a]);
      }
    } else if (typeof rawPoints.length === 'number') {
      n = rawPoints.length;
      ts = new Float64Array(n);
      vs = new Float64Array(n);
      for (var i = 0; i < n; i++) {
        var p = rawPoints[i];
        if (Array.isArray(p)) {
          ts[i] = toNum(p[0]);
          vs[i] = toNum(p[1]);
        } else if (p && typeof p === 'object') {
          ts[i] = toNum(p.t != null ? p.t : p.x);
          vs[i] = toNum(p.v != null ? p.v : p.y);
        } else {
          ts[i] = NaN;
          vs[i] = NaN;
        }
      }
    } else {
      ts = new Float64Array(0);
      vs = new Float64Array(0);
    }

    // 防御：非单调时间轴排序（正常数据无需走这里）
    var sorted = true;
    for (var j = 1; j < n; j++) {
      if (!(ts[j] >= ts[j - 1])) {
        sorted = false;
        break;
      }
    }
    if (!sorted) {
      var idx = new Array(n);
      for (var k = 0; k < n; k++) idx[k] = k;
      idx.sort(function (x, y) { return (ts[x] - ts[y]) || (x - y); });
      var nts = new Float64Array(n);
      var nvs = new Float64Array(n);
      for (var q = 0; q < n; q++) {
        nts[q] = ts[idx[q]];
        nvs[q] = vs[idx[q]];
      }
      ts = nts;
      vs = nvs;
    }
    return { ts: ts, vs: vs, n: n };
  }

  function prepareSeries(raw, index) {
    if (!raw || typeof raw !== 'object') return null;
    var style = normalizeStyle(raw.style);
    var width = Number(raw.width);
    if (!isFinite(width) || width <= 0) width = style === 'dotted' ? 1.4 : 2;
    width = clamp(width, 0.5, 8);
    var opacity = Number(raw.opacity);
    if (!isFinite(opacity)) opacity = 1;
    opacity = clamp(opacity, 0, 1);
    var points = preparePoints(raw.points);
    var id = raw.id != null ? String(raw.id) : 'series-' + index;
    return {
      id: id,
      label: raw.label != null ? String(raw.label) : id,
      unit: raw.unit != null ? String(raw.unit) : '',
      axis: raw.axis === 'right' ? 'right' : 'left',
      style: style,
      width: width,
      opacity: opacity,
      step: !!raw.step,
      colorRaw: raw.color != null ? raw.color
        : (raw.colorToken != null ? raw.colorToken
          : (raw.token != null ? raw.token : 'ink')),
      visible: raw.visible !== false,
      ts: points.ts,
      vs: points.vs,
      n: points.n
    };
  }

  function prepareSeriesList(list) {
    var out = [];
    if (!list || typeof list.length !== 'number') return out;
    for (var i = 0; i < list.length; i++) {
      var s = prepareSeries(list[i], i);
      if (s) out.push(s);
    }
    return out;
  }

  function prepareEvents(list) {
    var out = [];
    if (!list || typeof list.length !== 'number') return out;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (!e || typeof e !== 'object') continue;
      var t = Number(e.t != null ? e.t : e.trigger_s);
      if (!isFinite(t)) continue;
      out.push({
        t: t,
        label: e.label != null ? String(e.label) : '',
        colorRaw: e.color != null ? e.color : null,
        style: e.style ? String(e.style) : 'fault'
      });
    }
    out.sort(function (a, b) { return a.t - b.t; });
    return out;
  }

  function normalizeXDomain(d, fallback) {
    var fb = Array.isArray(fallback) && fallback.length >= 2 ? [Number(fallback[0]), Number(fallback[1])] : [0, 60];
    if (!isFinite(fb[0]) || !isFinite(fb[1]) || fb[0] === fb[1]) fb = [0, 60];
    if (fb[0] > fb[1]) {
      var tmp = fb[0];
      fb[0] = fb[1];
      fb[1] = tmp;
    }
    if (!d || typeof d.length !== 'number' || d.length < 2) return fb.slice();
    var a = Number(d[0]);
    var b = Number(d[1]);
    if (!isFinite(a) || !isFinite(b)) return fb.slice();
    if (a > b) {
      var tmp2 = a;
      a = b;
      b = tmp2;
    }
    if (Math.abs(b - a) < 1e-9) {
      a -= 0.5;
      b += 0.5;
    }
    return [a, b];
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    var radius = Math.min(r, w / 2, h / 2);
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
      return;
    }
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.arcTo(x + w, y, x + w, y + radius, radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
    ctx.lineTo(x + radius, y + h);
    ctx.arcTo(x, y + h, x, y + h - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
  }

  /* ------------------------------------------------------------------ *
   * 图表实例
   * ------------------------------------------------------------------ */

  function createChart(canvasEl, opts) {
    var canvas = canvasEl;
    if (typeof canvas === 'string') canvas = document.querySelector(canvasEl);
    if (!canvas || !canvas.getContext) {
      throw new Error('FL.chart.create: 需要 <canvas> 元素');
    }
    var ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('FL.chart.create: 无法获取 2d 上下文');

    var o = opts || {};

    var state = {
      destroyed: false,
      width: 0,
      height: 0,
      dpr: 1,
      series: [],
      events: [],
      cursorT: null,
      selectedT: null,
      hover: null,
      xDomain: normalizeXDomain(o.xDomain, [0, 60]),
      defaultXDomain: normalizeXDomain(o.xDomain, [0, 60]),
      userY: null,
      userYRight: null,
      paddings: {
        l: o.paddings && isNum(o.paddings.l) ? o.paddings.l : 56,
        r: o.paddings && isNum(o.paddings.r) ? o.paddings.r : 18,
        t: o.paddings && isNum(o.paddings.t) ? o.paddings.t : 18,
        b: o.paddings && isNum(o.paddings.b) ? o.paddings.b : 30
      },
      heightOpt: isNum(o.height) ? o.height : 320,
      ariaLabel: typeof o.ariaLabel === 'string' ? o.ariaLabel : '实时曲线图',
      themeOverrides: null,
      themeCache: null,
      rafId: 0,
      ro: null,
      drag: null,
      hoverTarget: null,
      cursorStyle: '',
      plot: null,
      yL: null,
      yR: null,
      xTicks: [],
      resetTheme: null
    };

    /* ---------------- 尺寸 / DPR ---------------- */

    function measure() {
      var cssW = canvas.clientWidth || 0;
      var parent = canvas.parentElement;
      if (!cssW && parent) cssW = parent.clientWidth || 0;
      if (!cssW) cssW = 640;
      if (!cssW || !isFinite(cssW)) cssW = 640;

      var cssH = state.heightOpt > 0 ? state.heightOpt : 320;

      if (canvas.style.display !== 'block') canvas.style.display = 'block';
      if (canvas.style.width !== '100%') canvas.style.width = '100%';
      if (canvas.style.height !== cssH + 'px') canvas.style.height = cssH + 'px';

      var dpr = window.devicePixelRatio || 1;
      if (!isFinite(dpr) || dpr <= 0) dpr = 1;
      if (dpr > 3) dpr = 3;
      var bw = Math.max(1, Math.round(cssW * dpr));
      var bh = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      state.width = cssW;
      state.height = cssH;
      state.dpr = dpr;
    }

    /* ---------------- 主题 ---------------- */

    function instanceTheme() {
      var base = getBaseTheme();
      var ov = state.themeOverrides;
      if (!ov) return base;
      if (state.themeCache) return state.themeCache;
      var colors = {};
      var k;
      for (k in base.colors) colors[k] = base.colors[k];
      if (ov.colors && typeof ov.colors === 'object') {
        for (k in ov.colors) if (ov.colors[k] != null) colors[k] = ov.colors[k];
      }
      for (k in ov) {
        if (k === 'colors' || k === 'fontMono' || k === 'fontBody') continue;
        var alias = TOKEN_ALIAS[k];
        if (alias && ov[k] != null) colors[alias] = ov[k];
      }
      var theme = {
        colors: colors,
        vars: base.vars,
        fontMono: ov.fontMono || base.fontMono,
        fontBody: ov.fontBody || base.fontBody
      };
      state.themeCache = theme;
      return theme;
    }

    /* ---------------- 坐标映射 ---------------- */

    function xToPx(t) {
      var plot = state.plot;
      if (!plot) return null;
      var dom = state.xDomain;
      var span = dom[1] - dom[0];
      if (!(span > 0)) return plot.x;
      return plot.x + ((t - dom[0]) / span) * plot.w;
    }

    function yToPx(v, axis) {
      var plot = state.plot;
      if (!plot || !axis) return null;
      var span = axis.hi - axis.lo;
      if (!(span > 1e-12)) return plot.y + plot.h / 2;
      return plot.y + ((axis.hi - v) / span) * plot.h;
    }

    function tFromPx(px) {
      var plot = state.plot;
      if (!plot) return null;
      var x = clamp(px, plot.x, plot.x + plot.w);
      var dom = state.xDomain;
      return dom[0] + ((x - plot.x) / plot.w) * (dom[1] - dom[0]);
    }

    function localPoint(e) {
      var rect = canvas.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      if (!isFinite(x) || !isFinite(y)) {
        x = e.offsetX;
        y = e.offsetY;
      }
      return { x: x, y: y };
    }

    function inPlot(x, y) {
      var p = state.plot;
      if (!p) return false;
      return x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h;
    }

    function snapTime(t) {
      if (!isFinite(t)) return null;
      var list = state.series;
      var i;
      for (i = 0; i < list.length; i++) {
        if (list[i].visible !== false && list[i].n > 0) {
          var idx = nearestIndex(list[i].ts, list[i].n, t);
          if (idx >= 0) return cleanFloat(list[i].ts[idx]);
          break;
        }
      }
      return Math.round(t * 10) / 10;
    }

    function activeSeries() {
      var out = [];
      for (var i = 0; i < state.series.length; i++) {
        if (state.series[i].visible !== false) out.push(state.series[i]);
      }
      return out;
    }

    function valuesAt(t) {
      var values = {};
      var list = activeSeries();
      for (var i = 0; i < list.length; i++) {
        var s = list[i];
        var v = valueAtPoint(s, t);
        values[s.id] = v == null || !isFinite(v) ? null : v;
      }
      return values;
    }

    /* ---------------- 刻度 / 轴 ---------------- */

    function axisUnits(side) {
      var units = [];
      var list = activeSeries();
      for (var i = 0; i < list.length; i++) {
        var s = list[i];
        if (s.axis !== side) continue;
        if (!hasFiniteData(s)) continue;
        if (s.unit && units.indexOf(s.unit) < 0) units.push(s.unit);
      }
      if (units.length === 0) return '';
      return units.join(' / ');
    }

    /** 序列是否至少有一个有限采样（全 null 的通道不应参与轴标题/轴范围） */
    function hasFiniteData(series) {
      var vs = series.vs;
      for (var i = 0; i < series.n; i++) if (isFinite(vs[i])) return true;
      return false;
    }

    function collectDataRange(side) {
      var min = Infinity;
      var max = -Infinity;
      var found = false;
      var dom = state.xDomain;
      var list = activeSeries();
      for (var i = 0; i < list.length; i++) {
        var s = list[i];
        if (s.axis !== side || s.n === 0) continue;
        var i0 = lowerBound(s.ts, s.n, dom[0]);
        var i1 = upperBound(s.ts, s.n, dom[1]) - 1;
        if (i1 < i0) {
          // 视窗内没有采样点：退回整条序列，避免空轴
          i0 = 0;
          i1 = s.n - 1;
        }
        for (var k = i0; k <= i1; k++) {
          var v = s.vs[k];
          if (isFinite(v)) {
            found = true;
            if (v < min) min = v;
            if (v > max) max = v;
          }
        }
      }
      return { min: min, max: max, found: found };
    }

    function computeAxis(side) {
      var user = side === 'right' ? state.userYRight : state.userY;
      if (Array.isArray(user) && user.length >= 2 && isNum(Number(user[0])) && isNum(Number(user[1]))) {
        var scaleU = exactScale(user[0], user[1], side === 'right' ? 4 : 5);
        scaleU.title = axisUnits(side);
        return scaleU;
      }
      var has = false;
      var list = activeSeries();
      for (var i = 0; i < list.length; i++) {
        if (list[i].axis === side && list[i].n > 0 && hasFiniteData(list[i])) {
          has = true;
          break;
        }
      }
      if (!has) {
        // 该侧没有可绘制数据（无序列或全为 null）：不画 fake 轴
        return null;
      }
      var range = collectDataRange(side);
      if (!range.found) return null;
      var scale = niceScale(range.min, range.max, side === 'right' ? 4 : 5);
      scale.title = axisUnits(side);
      return scale;
    }

    function makeXTicks(dom) {
      var span = dom[1] - dom[0];
      var target = span >= 30 ? 6 : (span >= 12 ? 6 : (span >= 4 ? 5 : 4));
      var step = niceNum(span / Math.max(1, target - 1), true);
      var start = Math.ceil(dom[0] / step - 1e-9) * step;
      var ticks = [];
      for (var v = start, i = 0; v <= dom[1] + step * 1e-9 && i < 40; i++, v = start + i * step) {
        ticks.push(cleanFloat(v));
      }
      if (ticks.length < 2) ticks = [cleanFloat(dom[0]), cleanFloat(dom[1])];
      return {
        ticks: ticks,
        step: step,
        decimals: decimalsForStep(step)
      };
    }

    function computeLayout(theme, yL, yR) {
      ctx.font = pxFont(10, theme.fontMono);
      var leftW = 0;
      var i;
      if (yL) {
        for (i = 0; i < yL.ticks.length; i++) {
          var w = ctx.measureText(fmtTick(yL.ticks[i], yL.decimals)).width;
          if (w > leftW) leftW = w;
        }
      }
      var rightW = 0;
      if (yR) {
        for (i = 0; i < yR.ticks.length; i++) {
          var w2 = ctx.measureText(fmtTick(yR.ticks[i], yR.decimals)).width;
          if (w2 > rightW) rightW = w2;
        }
      }
      var leftTitle = !!(yL && yL.title);
      var rightTitle = !!(yR && yR.title);
      var l = Math.max(state.paddings.l, 10 + leftW + (leftTitle ? 14 : 0));
      var r = Math.max(state.paddings.r, 10 + rightW + (rightTitle ? 14 : 0));
      var t = Math.max(state.paddings.t, state.events.length > 0 ? 30 : 16);
      var b = Math.max(state.paddings.b, 34);
      var width = state.width;
      var height = state.height;
      var plot = {
        x: l,
        y: t,
        w: Math.max(10, width - l - r),
        h: Math.max(10, height - t - b)
      };
      state.plot = plot;
      state.yL = yL;
      state.yR = yR;
      state.xTicks = makeXTicks(state.xDomain);
    }

    /* ---------------- 绘制：网格 / 坐标 ---------------- */

    function drawGrid(theme, yL, yR) {
      var plot = state.plot;
      var colors = theme.colors;
      var i;

      // 横向网格（优先左轴；只有右轴序列时用右轴）
      var gridAxis = yL || yR;
      if (gridAxis) {
        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = colors.grid;
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        for (i = 0; i < gridAxis.ticks.length; i++) {
          var gpy = yToPx(gridAxis.ticks[i], gridAxis);
          if (gpy >= plot.y - 0.5 && gpy <= plot.y + plot.h + 0.5) {
            ctx.moveTo(plot.x, gpy + 0.5);
            ctx.lineTo(plot.x + plot.w, gpy + 0.5);
          }
        }
        ctx.stroke();
        ctx.restore();
      }

      // 纵向网格（时间轴）
      var xt = state.xTicks;
      if (xt) {
        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = colors.grid;
        ctx.globalAlpha = 0.32;
        ctx.beginPath();
        for (i = 0; i < xt.ticks.length; i++) {
          var v = xt.ticks[i];
          if (v < state.xDomain[0] - 1e-9 || v > state.xDomain[1] + 1e-9) continue;
          var px = xToPx(v);
          ctx.moveTo(px + 0.5, plot.y);
          ctx.lineTo(px + 0.5, plot.y + plot.h);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 零线（当 y 域跨 0）
      if (gridAxis && gridAxis.lo < 0 && gridAxis.hi > 0) {
        var zy = yToPx(0, gridAxis);
        ctx.save();
        ctx.strokeStyle = colors.line2;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(plot.x, zy + 0.5);
        ctx.lineTo(plot.x + plot.w, zy + 0.5);
        ctx.stroke();
        ctx.restore();
      }

      // 边框
      ctx.save();
      ctx.strokeStyle = colors.axis;
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 1;
      ctx.strokeRect(plot.x + 0.5, plot.y + 0.5, plot.w - 1, plot.h - 1);
      ctx.restore();

      // 左轴刻度 + 标签
      ctx.save();
      ctx.font = pxFont(10, theme.fontMono);
      ctx.fillStyle = colors.ink2;
      ctx.textBaseline = 'middle';
      if (yL) {
        ctx.textAlign = 'right';
        for (i = 0; i < yL.ticks.length; i++) {
          var ly = yToPx(yL.ticks[i], yL);
          if (ly < plot.y - 0.5 || ly > plot.y + plot.h + 0.5) continue;
          ctx.globalAlpha = 1;
          ctx.fillText(fmtTick(yL.ticks[i], yL.decimals), plot.x - 8, ly);
          ctx.strokeStyle = colors.axis;
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.moveTo(plot.x - 4, ly + 0.5);
          ctx.lineTo(plot.x, ly + 0.5);
          ctx.stroke();
        }
      }
      if (yR) {
        ctx.textAlign = 'left';
        for (i = 0; i < yR.ticks.length; i++) {
          var ry = yToPx(yR.ticks[i], yR);
          if (ry < plot.y - 0.5 || ry > plot.y + plot.h + 0.5) continue;
          ctx.globalAlpha = 1;
          ctx.fillText(fmtTick(yR.ticks[i], yR.decimals), plot.x + plot.w + 8, ry);
          ctx.strokeStyle = colors.axis;
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.moveTo(plot.x + plot.w, ry + 0.5);
          ctx.lineTo(plot.x + plot.w + 4, ry + 0.5);
          ctx.stroke();
        }
      }
      ctx.restore();

      // 时间刻度 + 标签
      if (xt) {
        ctx.save();
        ctx.font = pxFont(10, theme.fontMono);
        ctx.fillStyle = colors.ink2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        var lastRight = -Infinity;
        for (i = 0; i < xt.ticks.length; i++) {
          var tv = xt.ticks[i];
          if (tv < state.xDomain[0] - 1e-9 || tv > state.xDomain[1] + 1e-9) continue;
          var tpx = xToPx(tv);
          var label = fmtTick(tv, xt.decimals);
          var tw = ctx.measureText(label).width;
          if (tpx - tw / 2 < lastRight + 2) continue;
          lastRight = tpx + tw / 2;
          ctx.globalAlpha = 1;
          ctx.fillText(label, tpx, plot.y + plot.h + 16);
          ctx.strokeStyle = colors.axis;
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.moveTo(tpx + 0.5, plot.y + plot.h);
          ctx.lineTo(tpx + 0.5, plot.y + plot.h + 4);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    function drawAxisTitles(theme, yL, yR) {
      var plot = state.plot;
      var colors = theme.colors;
      ctx.save();
      ctx.font = pxFont(9, theme.fontMono);
      ctx.fillStyle = colors.ink3;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (yL && yL.title) {
        ctx.save();
        ctx.translate(10, plot.y + plot.h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(yL.title, 0, 0);
        ctx.restore();
      }
      if (yR && yR.title) {
        ctx.save();
        ctx.translate(state.width - 10, plot.y + plot.h / 2);
        ctx.rotate(Math.PI / 2);
        ctx.fillText(yR.title, 0, 0);
        ctx.restore();
      }
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('时间 / s', plot.x + plot.w / 2, state.height - 5);
      ctx.restore();
    }

    /* ---------------- 绘制：事件 ---------------- */

    function drawEventMarker(px, color, style, theme) {
      var plot = state.plot;
      if (style === 'fault') {
        var top = plot.y - 12;
        var apex = plot.y - 2;
        ctx.save();
        // 故障三角（形态 + 颜色双通道）
        ctx.beginPath();
        ctx.moveTo(px, apex);
        ctx.lineTo(px - 7, top);
        ctx.lineTo(px + 7, top);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.globalAlpha = 1;
        ctx.fill();
        // 三角内斜纹：避免只靠颜色区分
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(px - 7, top);
        ctx.lineTo(px + 7, top);
        ctx.lineTo(px, apex);
        ctx.closePath();
        ctx.clip();
        ctx.strokeStyle = theme.colors.bg0;
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 1.2;
        for (var hx = -11; hx <= 9; hx += 5) {
          ctx.beginPath();
          ctx.moveTo(px + hx, top);
          ctx.lineTo(px + hx + 12, top + 12);
          ctx.stroke();
        }
        ctx.restore();
        ctx.restore();
      } else {
        // 非故障标记：空心菱形
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = theme.colors.bg1;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(px, plot.y - 11);
        ctx.lineTo(px + 5, plot.y - 6);
        ctx.lineTo(px, plot.y - 1);
        ctx.lineTo(px - 5, plot.y - 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    function drawEvents(theme) {
      var plot = state.plot;
      if (!state.events.length) return;
      var dom = state.xDomain;
      var lastLabelRight = -Infinity;
      var lastLabelLeft = Infinity;
      for (var i = 0; i < state.events.length; i++) {
        var ev = state.events[i];
        if (ev.t < dom[0] - 1e-9 || ev.t > dom[1] + 1e-9) continue;
        var px = xToPx(ev.t);
        var color = ev.colorRaw != null ? resolveColor(ev.colorRaw, theme) : theme.colors.fault;
        var style = ev.style || 'fault';

        // 竖向事件线（绘制在序列之下）
        ctx.save();
        ctx.strokeStyle = color;
        ctx.globalAlpha = style === 'fault' ? 0.85 : 0.55;
        ctx.lineWidth = 1;
        ctx.setLineDash(style === 'fault' ? [4, 4] : [2, 4]);
        ctx.beginPath();
        ctx.moveTo(px + 0.5, plot.y);
        ctx.lineTo(px + 0.5, plot.y + plot.h);
        ctx.stroke();
        ctx.restore();

        // 顶部标记
        drawEventMarker(px, color, style, theme);

        // 标签：靠近右边界时右对齐；与相邻标签重叠时跳过（线/三角仍在）
        var label = ev.label || ('事件 ' + fmtSeconds(ev.t));
        ctx.save();
        ctx.font = pxFont(10, theme.fontMono);
        ctx.fillStyle = color;
        ctx.textBaseline = 'alphabetic';
        var tw = ctx.measureText(label).width;
        var x0 = px + 8;
        var align = 'left';
        if (x0 + tw > state.width - 6) {
          x0 = px - 8;
          align = 'right';
        }
        var left = align === 'left' ? x0 : (px - 8 - tw);
        var right = left + tw;
        if (right + 4 < lastLabelLeft || left - 4 > lastLabelRight) {
          ctx.textAlign = align;
          ctx.fillText(label, x0, 13);
          lastLabelLeft = left;
          lastLabelRight = right;
        }
        ctx.restore();
      }
    }

    /* ---------------- 绘制：序列 ---------------- */

    function strokeSeries(series, theme) {
      var plot = state.plot;
      var axis = series.axis === 'right' ? state.yR : state.yL;
      if (!axis || series.n === 0) return;
      var dom = state.xDomain;
      var span = dom[1] - dom[0];
      if (!(span > 0)) return;
      var sx = plot.w / span;
      var sy;
      var axisSpan = axis.hi - axis.lo;
      if (!(Math.abs(axisSpan) > 1e-12)) return;
      sy = plot.h / axisSpan;

      var color = resolveColor(series.colorRaw, theme);
      var ts = series.ts;
      var vs = series.vs;
      var n = series.n;

      ctx.save();
      ctx.globalAlpha = series.opacity;
      ctx.strokeStyle = color;
      ctx.lineWidth = series.width;
      ctx.lineJoin = 'miter';
      ctx.lineCap = 'butt';
      ctx.setLineDash(STYLE_DASH[series.style] || []);
      ctx.beginPath();

      var started = false;
      var lastY = 0;
      for (var i = 0; i < n; i++) {
        var v = vs[i];
        if (!isFinite(v)) {
          started = false;
          continue;
        }
        var px = plot.x + (ts[i] - dom[0]) * sx;
        var py = plot.y + (axis.hi - v) * sy;
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else if (series.step) {
          // 采样保持：先水平，再垂直（跨 20.0 s 跳变不平滑）
          ctx.lineTo(px, lastY);
          ctx.lineTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
        lastY = py;
      }
      ctx.stroke();

      // 单点序列：绘制一个可见点
      if (n === 1 && isFinite(vs[0])) {
        var px1 = plot.x + (ts[0] - dom[0]) * sx;
        var py1 = plot.y + (axis.hi - vs[0]) * sy;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(px1, py1, Math.max(2, series.width + 1), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.restore();
    }

    function drawAllSeries(theme) {
      var list = activeSeries();
      for (var i = 0; i < list.length; i++) strokeSeries(list[i], theme);
    }

    /* ---------------- 绘制：游标 / 选中 / hover ---------------- */

    function drawTimeBadge(px, t, theme) {
      var plot = state.plot;
      var label = fmtSeconds(t);
      ctx.save();
      ctx.font = pxFont(10, theme.fontMono);
      var tw = ctx.measureText(label).width;
      var bw = tw + 12;
      var bh = 16;
      var bx = clamp(px - bw / 2, plot.x + 2, plot.x + plot.w - bw - 2);
      var by = plot.y + plot.h - bh - 5;
      roundRectPath(ctx, bx, by, bw, bh, 3);
      ctx.fillStyle = theme.colors.bg2;
      ctx.globalAlpha = 0.96;
      ctx.fill();
      ctx.strokeStyle = theme.colors.line2;
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = theme.colors.ink0;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, bx + bw / 2, by + bh / 2 + 0.5);
      ctx.restore();
    }

    function drawCursor(theme) {
      var plot = state.plot;
      var t = state.cursorT;
      if (t == null || !isFinite(t)) return;
      var dom = state.xDomain;
      var inside = t >= dom[0] - 1e-9 && t <= dom[1] + 1e-9;
      var px = inside ? xToPx(t) : (t < dom[0] ? plot.x : plot.x + plot.w);
      if (px == null) return;

      // 游标竖线（白色虚线）
      ctx.save();
      ctx.strokeStyle = theme.colors.cursor;
      ctx.globalAlpha = inside ? 0.9 : 0.3;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(px + 0.5, plot.y);
      ctx.lineTo(px + 0.5, plot.y + plot.h);
      ctx.stroke();
      ctx.restore();

      if (!inside) return;

      // 各序列交点圆点
      var list = activeSeries();
      for (var i = 0; i < list.length; i++) {
        var s = list[i];
        var axis = s.axis === 'right' ? state.yR : state.yL;
        if (!axis) continue;
        var v = valueAtPoint(s, t);
        if (v == null || !isFinite(v)) continue;
        var py = yToPx(v, axis);
        if (py == null) continue;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = resolveColor(s.colorRaw, theme);
        ctx.fill();
        ctx.strokeStyle = theme.colors.bg1;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      drawTimeBadge(px, t, theme);
    }

    function drawSelected(theme) {
      var t = state.selectedT;
      if (t == null || !isFinite(t)) return;
      var dom = state.xDomain;
      if (t < dom[0] - 1e-9 || t > dom[1] + 1e-9) return;
      var px = xToPx(t);
      if (px == null) return;
      var list = activeSeries();
      for (var i = 0; i < list.length; i++) {
        var s = list[i];
        var axis = s.axis === 'right' ? state.yR : state.yL;
        if (!axis) continue;
        var v = valueAtPoint(s, t);
        if (v == null || !isFinite(v)) continue;
        var py = yToPx(v, axis);
        // 选中数据点：外环强调 + 内点保持序列色（形态可辨）
        ctx.beginPath();
        ctx.arc(px, py, 5.5, 0, Math.PI * 2);
        ctx.strokeStyle = theme.colors.ink0;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(px, py, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = resolveColor(s.colorRaw, theme);
        ctx.fill();
      }
    }

    function drawHover(theme) {
      var h = state.hover;
      if (!h || h.t == null) return;
      var plot = state.plot;
      var px = xToPx(h.t);
      if (px == null) return;
      // 与游标重合时不再画第二条竖线
      if (state.cursorT != null) {
        var cx = xToPx(state.cursorT);
        if (cx != null && Math.abs(cx - px) < 5) return;
      }
      ctx.save();
      ctx.strokeStyle = theme.colors.ink2;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(px + 0.5, plot.y);
      ctx.lineTo(px + 0.5, plot.y + plot.h);
      ctx.stroke();
      ctx.restore();

      var list = activeSeries();
      for (var i = 0; i < list.length; i++) {
        var s = list[i];
        var axis = s.axis === 'right' ? state.yR : state.yL;
        if (!axis) continue;
        var v = valueAtPoint(s, h.t);
        if (v == null || !isFinite(v)) continue;
        var py = yToPx(v, axis);
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = resolveColor(s.colorRaw, theme);
        ctx.fill();
        ctx.strokeStyle = theme.colors.bg1;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    function drawEmptyMessage(theme) {
      var list = activeSeries();
      var any = false;
      var hasSeries = false;
      for (var i = 0; i < list.length; i++) {
        var series = list[i];
        if (series.n > 0) hasSeries = true;
        for (var k = 0; k < series.n; k++) {
          if (isFinite(series.vs[k])) {
            any = true;
            break;
          }
        }
        if (any) break;
      }
      if (any) return;
      var plot = state.plot;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = pxFont(12, theme.fontBody);
      ctx.fillStyle = theme.colors.ink3;
      ctx.fillText(hasSeries ? '该分类在当前场景下没有采样（值为 null）' : '暂无可绘制的信号数据',
        plot.x + plot.w / 2, plot.y + plot.h / 2 - 8);
      ctx.font = pxFont(10, theme.fontMono);
      ctx.globalAlpha = 0.85;
      ctx.fillText(hasSeries ? '例如执行器故障通道只在对应场景下有数据' : '请在左侧勾选信号，或创建实验运行',
        plot.x + plot.w / 2, plot.y + plot.h / 2 + 12);
      ctx.restore();
    }

    /* ---------------- 主绘制 ---------------- */

    function draw() {
      if (state.destroyed || !ctx) return;
      measure();
      var theme = instanceTheme();
      var W = state.width;
      var H = state.height;
      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';

      var yL = computeAxis('left');
      var yR = computeAxis('right');
      computeLayout(theme, yL, yR);
      var plot = state.plot;
      if (!plot || plot.w <= 0 || plot.h <= 0) return;

      drawGrid(theme, yL, yR);
      drawEvents(theme);

      // 序列裁剪在绘图区内
      ctx.save();
      ctx.beginPath();
      ctx.rect(plot.x, plot.y, plot.w, plot.h);
      ctx.clip();
      drawAllSeries(theme);
      ctx.restore();

      drawCursor(theme);
      drawSelected(theme);
      drawHover(theme);
      drawAxisTitles(theme, yL, yR);
      drawEmptyMessage(theme);
    }

    /* ---------------- 调度 ---------------- */

    function scheduleRender() {
      if (state.destroyed) return;
      if (state.rafId) return;
      var raf = window.requestAnimationFrame;
      if (typeof raf === 'function') {
        state.rafId = raf(function () {
          state.rafId = 0;
          try {
            draw();
          } catch (err) {
            if (window.console && window.console.error) {
              window.console.error('[FL.chart] 绘制异常：', err);
            }
          }
        });
      } else {
        state.rafId = 1;
        window.setTimeout(function () {
          state.rafId = 0;
          draw();
        }, 16);
      }
    }

    /* ---------------- 指针交互 ---------------- */

    function setCursorStyle(style) {
      if (state.cursorStyle === style) return;
      state.cursorStyle = style;
      canvas.style.cursor = style;
    }

    function updateHover(pos) {
      if (!pos) return;
      if (!inPlot(pos.x, pos.y)) {
        if (state.hover) {
          state.hover = null;
          scheduleRender();
          if (state.hoverTarget != null) {
            state.hoverTarget = null;
            safeCall(o.onHover, null);
          }
        }
        return;
      }
      var t = tFromPx(pos.x);
      if (t == null) return;
      var snapped = snapTime(t);
      if (snapped == null) return;
      var values = valuesAt(snapped);
      state.hover = { t: snapped, x: pos.x, y: pos.y };
      state.hoverTarget = snapped;
      setCursorStyle(
        state.cursorT != null && Math.abs(pos.x - (xToPx(state.cursorT) || -9999)) < 6 ? 'ew-resize' : 'crosshair'
      );
      scheduleRender();
      safeCall(o.onHover, { t: snapped, values: values, x: pos.x, y: pos.y });
    }

    function emitDrag(t) {
      var snapped = snapTime(t);
      if (snapped == null) return;
      state.cursorT = snapped;
      scheduleRender();
      safeCall(o.onCursorDrag, snapped);
    }

    function onPointerDown(e) {
      if (state.destroyed) return;
      if (e.button != null && e.button !== 0) return;
      var pos = localPoint(e);
      if (!inPlot(pos.x, pos.y)) return;
      var t = tFromPx(pos.x);
      if (t == null) return;
      state.drag = {
        pointerId: e.pointerId,
        startX: pos.x,
        startY: pos.y,
        moved: 0
      };
      try {
        if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
      } catch (err) { /* ignore */ }
      setCursorStyle('ew-resize');
      emitDrag(t);
      if (e.preventDefault) e.preventDefault();
    }

    function onPointerMove(e) {
      if (state.destroyed) return;
      var pos = localPoint(e);
      if (state.drag && e.pointerId === state.drag.pointerId) {
        state.drag.moved = Math.max(
          state.drag.moved,
          Math.sqrt(Math.pow(pos.x - state.drag.startX, 2) + Math.pow(pos.y - state.drag.startY, 2))
        );
        var t = tFromPx(pos.x);
        if (t != null) emitDrag(t);
        if (e.preventDefault) e.preventDefault();
        return;
      }
      updateHover(pos);
    }

    function onPointerUp(e) {
      if (state.destroyed) return;
      var drag = state.drag;
      if (!drag || e.pointerId !== drag.pointerId) return;
      state.drag = null;
      try {
        if (canvas.releasePointerCapture) canvas.releasePointerCapture(e.pointerId);
      } catch (err) { /* ignore */ }
      var pos = localPoint(e);
      var t = null;
      if (inPlot(pos.x, pos.y)) t = tFromPx(pos.x);
      if (t == null) t = drag.startX != null ? tFromPx(drag.startX) : null;
      var snapped = t == null ? null : snapTime(t);
      if (snapped != null && drag.moved < 4) {
        // 视为点击：页面据此吸附最近采样点并显示元数据
        safeCall(o.onClick, { t: snapped });
      }
      state.drag = null;
      updateHover(pos);
      scheduleRender();
    }

    function onPointerCancel(e) {
      if (state.destroyed) return;
      if (state.drag && e.pointerId === state.drag.pointerId) state.drag = null;
      scheduleRender();
    }

    function onPointerLeave() {
      if (state.destroyed) return;
      if (state.drag) return;
      if (state.hover) {
        state.hover = null;
        state.hoverTarget = null;
        scheduleRender();
        safeCall(o.onHover, null);
      }
      setCursorStyle('default');
    }

    function bind(el, type, fn, options) {
      el.addEventListener(type, fn, options || false);
      state.listeners.push({ el: el, type: type, fn: fn, options: options || false });
    }

    if (!state.listeners) state.listeners = [];
    bind(canvas, 'pointerdown', onPointerDown);
    bind(canvas, 'pointermove', onPointerMove);
    bind(canvas, 'pointerup', onPointerUp);
    bind(canvas, 'pointercancel', onPointerCancel);
    bind(canvas, 'pointerleave', onPointerLeave);
    canvas.style.touchAction = 'pan-y';

    function onWindowResize() {
      scheduleRender();
    }
    bind(window, 'resize', onWindowResize);

    // 容器宽度自适应（ResizeObserver 可用时监听父容器；否则依赖 window resize）
    if (typeof window.ResizeObserver === 'function') {
      try {
        state.ro = new window.ResizeObserver(function () {
          scheduleRender();
        });
        state.ro.observe(canvas.parentElement || canvas);
      } catch (err) {
        state.ro = null;
      }
    }

    // canvas 可访问性
    if (!canvas.getAttribute('role')) canvas.setAttribute('role', 'img');
    if (!canvas.getAttribute('aria-label')) canvas.setAttribute('aria-label', state.ariaLabel);

    /* ---------------- 公共 API ---------------- */

    var api = {
      el: canvas,

      setSeries: function (list) {
        if (state.destroyed) return api;
        state.series = prepareSeriesList(list);
        scheduleRender();
        return api;
      },

      setEvents: function (list) {
        if (state.destroyed) return api;
        state.events = prepareEvents(list);
        scheduleRender();
        return api;
      },

      setCursor: function (t) {
        if (state.destroyed) return api;
        var v = t == null ? null : Number(t);
        if (v != null && !isFinite(v)) v = null;
        if (v === state.cursorT) return api;
        state.cursorT = v;
        scheduleRender();
        return api;
      },

      setSelectedPoint: function (t) {
        if (state.destroyed) return api;
        var v = t == null ? null : Number(t);
        if (v != null && !isFinite(v)) v = null;
        if (v === state.selectedT) return api;
        state.selectedT = v;
        scheduleRender();
        return api;
      },

      setDomain: function (domain) {
        if (state.destroyed) return api;
        if (!domain || typeof domain !== 'object') return api;
        if ('x' in domain) {
          state.xDomain = domain.x == null ? state.defaultXDomain.slice() : normalizeXDomain(domain.x, state.defaultXDomain);
        }
        if ('y' in domain) {
          if (domain.y == null) state.userY = null;
          else if (Array.isArray(domain.y) && domain.y.length >= 2 && isNum(Number(domain.y[0])) && isNum(Number(domain.y[1]))) {
            state.userY = [Number(domain.y[0]), Number(domain.y[1])];
          }
        }
        if ('yRight' in domain) {
          if (domain.yRight == null) state.userYRight = null;
          else if (Array.isArray(domain.yRight) && domain.yRight.length >= 2 && isNum(Number(domain.yRight[0])) && isNum(Number(domain.yRight[1]))) {
            state.userYRight = [Number(domain.yRight[0]), Number(domain.yRight[1])];
          }
        }
        scheduleRender();
        return api;
      },

      setTheme: function (theme) {
        if (state.destroyed) return api;
        if (!theme || typeof theme !== 'object') {
          state.themeOverrides = null;
        } else {
          var prev = state.themeOverrides || {};
          var merged = {};
          var k;
          for (k in prev) merged[k] = prev[k];
          for (k in theme) merged[k] = theme[k];
          state.themeOverrides = merged;
        }
        state.themeCache = null;
        scheduleRender();
        return api;
      },

      resize: function () {
        if (state.destroyed) return api;
        measure();
        scheduleRender();
        return api;
      },

      render: function () {
        if (state.destroyed) return api;
        scheduleRender();
        return api;
      },

      // 扩展（非契约必需）：页面响应断点时调整逻辑高度
      setHeight: function (h) {
        if (state.destroyed) return api;
        if (isNum(h) && h > 0) {
          state.heightOpt = h;
          scheduleRender();
        }
        return api;
      },

      setAriaLabel: function (text) {
        if (state.destroyed) return api;
        if (typeof text === 'string' && text) canvas.setAttribute('aria-label', text);
        return api;
      },

      getCursor: function () {
        return state.cursorT;
      },

      // 扩展（非契约必需）：QA / 页面自测读取当前布局与视窗
      getLayout: function () {
        if (state.destroyed) return null;
        var plot = state.plot;
        return {
          width: state.width,
          height: state.height,
          plot: plot ? { x: plot.x, y: plot.y, w: plot.w, h: plot.h } : null,
          xDomain: state.xDomain.slice(),
          yL: state.yL ? { lo: state.yL.lo, hi: state.yL.hi } : null,
          yR: state.yR ? { lo: state.yR.lo, hi: state.yR.hi } : null,
          yDomainUser: state.userY ? state.userY.slice() : null,
          cursor: state.cursorT,
          selected: state.selectedT,
          series: state.series.map(function (s) {
            return { id: s.id, unit: s.unit, axis: s.axis, style: s.style, opacity: s.opacity, n: s.n, step: s.step };
          }),
          events: state.events.map(function (e) { return e.t; })
        };
      },

      isDestroyed: function () {
        return state.destroyed;
      },

      destroy: function () {
        if (state.destroyed) return;
        state.destroyed = true;
        if (state.rafId) {
          try {
            if (window.cancelAnimationFrame) window.cancelAnimationFrame(state.rafId);
          } catch (err) { /* ignore */ }
          state.rafId = 0;
        }
        for (var i = 0; i < state.listeners.length; i++) {
          var l = state.listeners[i];
          try {
            l.el.removeEventListener(l.type, l.fn, l.options);
          } catch (err) { /* ignore */ }
        }
        state.listeners = [];
        if (state.ro) {
          try {
            state.ro.disconnect();
          } catch (err) { /* ignore */ }
          state.ro = null;
        }
        if (state.resetTheme) {
          var idx = LIVE_RESET.indexOf(state.resetTheme);
          if (idx >= 0) LIVE_RESET.splice(idx, 1);
        }
        state.series = [];
        state.events = [];
        state.hover = null;
        ctx = null;
      }
    };

    // theme.css 若在图表创建后才加载，可调用 FL.chart.refreshTheme() 重取变量
    state.resetTheme = function () {
      state.themeCache = null;
      scheduleRender();
    };
    LIVE_RESET.push(state.resetTheme);

    // 首帧
    measure();
    getBaseTheme();
    scheduleRender();

    return api;
  }

  /* ------------------------------------------------------------------ *
   * 导出
   * ------------------------------------------------------------------ */

  FL.chart = {
    VERSION: VERSION,
    create: createChart,

    /** 清除 CSS 变量缓存并重绘现存图表（主题晚于图表加载时使用） */
    refreshTheme: function () {
      BASE_THEME = null;
      for (var i = 0; i < LIVE_RESET.length; i++) {
        try {
          LIVE_RESET[i]();
        } catch (err) { /* ignore */ }
      }
    },

    /** 当前解析到的语义色（供页面图例/提示使用；优先用 CSS 变量） */
    palette: function () {
      var t = getBaseTheme();
      var out = {};
      var k;
      for (k in t.colors) out[k] = t.colors[k];
      out.fontMono = t.fontMono;
      out.fontBody = t.fontBody;
      return out;
    },

    prefersReducedMotion: prefersReducedMotion
  };
})();
