/* owner: lead | module: components | contract: docs/CONTRACT.md */
(function () {
  'use strict';
  const FL = window.FL = window.FL || {};
  const proto = FL.protocol || {};
  const fmt = proto.fmt || { num: (v) => (v == null ? '—' : String(v)), time: (t) => t + ' s' };

  /* =====================================================================
     hyperscript
     ===================================================================== */
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
      children.unshift(attrs);
      attrs = null;
    }
    if (attrs) {
      for (const key of Object.keys(attrs)) {
        const val = attrs[key];
        if (val === null || val === undefined || val === false) continue;
        if (key === 'class' || key === 'className') { el.className = val; }
        else if (key === 'text') { el.textContent = String(val); }
        else if (key === 'html') { el.innerHTML = val; }
        else if (key === 'style') {
          if (typeof val === 'string') el.setAttribute('style', val);
          else Object.assign(el.style, val);
        }
        else if (key === 'dataset') { Object.assign(el.dataset, val); }
        else if (key === 'on') {
          Object.keys(val).forEach((ev) => el.addEventListener(ev, val[ev]));
        }
        else if (key === 'value' && 'value' in el) { el.value = val; }
        else if (key === 'checked' && 'checked' in el) { el.checked = !!val; }
        else if (val === true) { el.setAttribute(key, ''); }
        else { el.setAttribute(key, String(val)); }
      }
    }
    append(el, children);
    return el;
  }

  function append(parent, children) {
    for (const c of children) {
      if (c === null || c === undefined || c === false || c === '') continue;
      if (Array.isArray(c)) { append(parent, c); continue; }
      parent.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    }
  }

  function frag(...children) {
    const f = document.createDocumentFragment();
    append(f, children);
    return f;
  }

  function clear(el) { while (el && el.firstChild) el.removeChild(el.firstChild); }

  /* =====================================================================
     icons (inline, stroke-based, 24x24)
     ===================================================================== */
  const ICONS = {
    bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/>',
    battery: '<path d="M2 9a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9Z"/><path d="M21 10v4"/>',
    turbine: '<circle cx="12" cy="12" r="2.2"/><path d="M12 9.8V4M12 14.2V20M9.8 12H4M14.2 12H20M10.4 10.4 6 6M13.6 13.6 18 18M13.6 10.4 18 6M10.4 13.6 6 18"/>',
    fuelcell: '<path d="M4 8h16v8H4zM8 8V5M12 8V5M16 8V5M8 16v3M12 16v3M16 16v3M4 12h16"/>',
    sensor: '<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
    controller: '<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M8 10h2M8 14h2M14 10h2M14 14h2"/>',
    bus: '<path d="M3 12h18M7 8v8M12 8v8M17 8v8"/>',
    load: '<path d="M9 3v6M15 3v6M6 9h12v3a6 6 0 0 1-12 0V9ZM12 18v3"/>',
    play: '<path d="M8 5v14l11-7L8 5Z"/>',
    pause: '<path d="M8 5v14M16 5v14" stroke-width="2.6"/>',
    replay: '<path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/>',
    skipback: '<path d="M19 20 9 12l10-8v16ZM5 19V5"/>',
    skipforward: '<path d="M5 4l10 8-10 8V4ZM19 5v14"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'chevron-right': '<path d="m9 6 6 6-6 6"/>',
    'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    warning: '<path d="M12 3 2 21h20L12 3Z"/><path d="M12 10v4M12 17.5h.01"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    flask: '<path d="M9 3h6M10 3v7L4 20h16L14 10V3M7 15h10"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
    'eye-off': '<path d="M3 3l18 18M10.6 6.2A10.9 10.9 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.4 3.9M6.3 6.9C3.7 8.6 2 12 2 12s3.5 6 10 6c1.4 0 2.7-.3 3.9-.7"/>',
    lock: '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    home: '<path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9Z"/>',
    wave: '<path d="M2 12h3l2-6 4 12 4-12 2 6h5"/>',
    pulse: '<path d="M3 12h4l2-7 4 14 2-7h6"/>',
    link: '<path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/>',
    external: '<path d="M14 4h6v6M20 4l-8 8M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 1 1 3.5 2.4c-.8.3-1 .9-1 1.6M12 17h.01"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/><circle cx="12" cy="12" r="2"/>',
    monitor: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    gauge: '<path d="M12 14 16 9"/><path d="M4.5 18a9 9 0 1 1 15 0"/><circle cx="12" cy="14" r="1.6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    shield: '<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/>',
    swap: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5"/>',
    trash: '<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v5M14 11v5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    sliders: '<path d="M4 8h9M17 8h3M4 16h3M11 16h9"/><circle cx="15" cy="8" r="2"/><circle cx="9" cy="16" r="2"/>',
    layers: '<path d="M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5"/>',
    compare: '<path d="M4 6h7M4 18h7M13 6h7M13 18h7M12 3v18"/>',
    board: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 8h8M8 12h5M8 16h3"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    dot: '<circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>'
  };

  function icon(name, opts) {
    const o = opts || {};
    const size = o.size || 16;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', o.strokeWidth || '1.6');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    if (o.class) svg.setAttribute('class', o.class);
    svg.innerHTML = ICONS[name] || ICONS.dot;
    return svg;
  }

  /* =====================================================================
     small display components
     ===================================================================== */
  function badge(text, opts) {
    const o = opts || {};
    const node = h('span', { class: 'badge', 'data-tone': o.tone || 'neutral', title: o.title || '' });
    if (o.icon) node.appendChild(icon(o.icon, { size: 11 }));
    node.appendChild(document.createTextNode(text));
    return node;
  }

  function sourceTag(kind, opts) {
    const meta = (proto.sourceMeta && proto.sourceMeta(kind)) || { label: kind || '—', full: kind || '—', desc: '' };
    return h('span', {
      class: 'source-tag',
      'data-kind': kind,
      title: (opts && opts.title) || meta.desc || meta.full
    }, meta.label);
  }

  function chip(text, opts) {
    const o = opts || {};
    const node = h('span', { class: 'chip', 'data-tone': o.tone || 'neutral', title: o.title || '' });
    if (o.icon) node.appendChild(icon(o.icon, { size: 12 }));
    if (typeof text === 'string') node.appendChild(document.createTextNode(text));
    else if (text instanceof Node) node.appendChild(text);
    return node;
  }

  function stat(opts) {
    const o = opts || {};
    const valueText = o.unavailable ? '不可用' : (o.value == null ? '—' : String(o.value));
    const wrap = h('div', {
      class: 'stat',
      'data-tone': o.tone || 'neutral',
      title: o.title || o.hint || ''
    }, [
      h('div', { class: 'stat-label' }, o.label || ''),
      h('div', { class: 'row', style: { alignItems: 'baseline', gap: '1px', minWidth: 0 } }, [
        h('span', { class: 'stat-value' + (o.unavailable ? ' is-unavailable' : '') }, valueText),
        o.unit ? h('span', { class: 'stat-unit' }, o.unit) : null
      ]),
      o.source ? h('div', { class: 'row', style: { marginTop: '2px' } }, [sourceTag(o.source)]) : null,
      o.hint ? h('div', { class: 'stat-hint' }, o.hint) : null
    ]);
    return wrap;
  }

  function field(opts) {
    const o = opts || {};
    const wrap = h('div', { class: 'field', id: o.id || null });
    if (o.label) {
      const lab = h('label', { class: 'field-label', for: o.for || null }, [
        h('span', {}, o.label),
        o.unit ? h('span', { class: 'fl-unit' }, o.unit) : null
      ]);
      wrap.appendChild(lab);
    }
    if (o.control) wrap.appendChild(o.control);
    if (o.hint) wrap.appendChild(h('div', { class: 'field-hint' }, o.hint));
    if (o.error) {
      wrap.appendChild(h('div', { class: 'field-error' }, [icon('warning', { size: 13 }), h('span', {}, o.error)]));
      if (o.control && o.control.setAttribute) o.control.setAttribute('aria-invalid', 'true');
    }
    return wrap;
  }

  /* segmented: returns element with .setValue(v) */
  function segmented(opts) {
    const o = opts || {};
    const el = h('div', { class: 'seg', role: 'group', 'aria-label': o.ariaLabel || '' });
    const buttons = [];
    (o.options || []).forEach((opt) => {
      const b = h('button', {
        type: 'button',
        class: 'seg-item',
        'aria-pressed': String(opt.value === o.value),
        disabled: !!opt.disabled,
        title: opt.title || '',
        on: {
          click: () => {
            if (opt.disabled || !o.onChange) return;
            update(opt.value);
            o.onChange(opt.value);
          }
        }
      }, [
        opt.icon ? icon(opt.icon, { size: 13 }) : null,
        h('span', {}, opt.label)
      ]);
      b.dataset.value = opt.value;
      buttons.push(b);
      el.appendChild(b);
    });
    function update(v) {
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === v)));
    }
    el.setValue = update;
    return el;
  }

  /* slider: returns { el, setValue(v) } */
  function slider(opts) {
    const o = opts || {};
    const id = o.id || ('rng-' + Math.random().toString(36).slice(2, 8));
    const input = h('input', {
      class: 'range', type: 'range', id,
      min: String(o.min != null ? o.min : 0),
      max: String(o.max != null ? o.max : 100),
      step: String(o.step != null ? o.step : 1),
      value: String(o.value != null ? o.value : 0),
      disabled: !!o.disabled,
      'aria-label': o.ariaLabel || o.label || ''
    });
    const val = h('span', { class: 'range-val mono' }, o.format ? o.format(o.value) : fmt.unit(o.value, o.unit, o.digits || 0));
    function paintFill() {
      const min = +input.min, max = +input.max;
      const pct = max > min ? ((+input.value - min) / (max - min)) * 100 : 0;
      input.style.setProperty('--range-fill', pct + '%');
    }
    function renderVal(v) { val.textContent = o.format ? o.format(v) : fmt.unit(v, o.unit, o.digits || 0); }
    input.addEventListener('input', () => {
      paintFill();
      const v = +input.value;
      renderVal(v);
      if (o.onInput) o.onInput(v);
    });
    if (o.onChange) input.addEventListener('change', () => o.onChange(+input.value));
    paintFill();
    const el = h('div', { class: 'range-wrap' }, [input, val]);
    return {
      el,
      input,
      setValue(v) {
        input.value = String(v);
        paintFill();
        renderVal(v);
      },
      setDisabled(disabled) { input.disabled = !!disabled; }
    };
  }

  /* switch: returns element with .setChecked(bool) + .input */
  function switchControl(opts) {
    const o = opts || {};
    const id = o.id || ('sw-' + Math.random().toString(36).slice(2, 8));
    const input = h('input', { type: 'checkbox', id, checked: !!o.checked, disabled: !!o.disabled });
    const label = h('label', { class: 'switch', for: id, title: o.title || '' }, [
      input,
      h('span', { class: 'sw-track', 'aria-hidden': 'true' }),
      o.label ? h('span', { class: 'sw-label' }, o.label) : null
    ]);
    input.addEventListener('change', () => { if (o.onChange) o.onChange(input.checked); });
    label.input = input;
    label.setChecked = (v) => { input.checked = !!v; };
    return label;
  }

  function emptyState(opts) {
    const o = opts || {};
    const wrap = h('div', { class: 'empty' }, [
      h('div', { class: 'empty-icon' }, [icon(o.icon || 'flask', { size: 22 })]),
      h('div', { class: 'empty-title' }, o.title || '暂无数据'),
      o.desc ? h('div', { class: 'empty-desc' }, o.desc) : null
    ]);
    if (o.action) {
      if (o.action instanceof Node) wrap.appendChild(o.action);
      else {
        wrap.appendChild(h('button', {
          class: 'btn btn-primary btn-sm', type: 'button',
          on: { click: o.action.onClick || (() => {}) }
        }, [o.action.icon ? icon(o.action.icon, { size: 13 }) : null, o.action.label || '开始']));
      }
    }
    return wrap;
  }

  function loadingState(opts) {
    const o = opts || {};
    return h('div', { class: 'loading', role: 'status' }, [
      h('span', { class: 'spinner' }),
      h('span', {}, o.text || '计算中…')
    ]);
  }

  /* =====================================================================
     overlays: drawer / modal
     ===================================================================== */
  function overlayRoot() {
    let root = document.getElementById('overlay-root');
    if (!root) { root = h('div', { id: 'overlay-root', class: 'overlay-root' }); document.body.appendChild(root); }
    return root;
  }

  function focusables(container) {
    return Array.from(container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((el) => el.offsetParent !== null || el === document.activeElement);
  }

  function trapFocus(container) {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (container.__onEsc) container.__onEsc();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables(container);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }

  function closeButton(onClose) {
    return h('button', {
      class: 'btn btn-ghost btn-icon btn-sm', type: 'button', 'aria-label': '关闭',
      on: { click: onClose }
    }, [icon('x', { size: 15 })]);
  }

  function modal(opts) {
    const o = opts || {};
    const prevFocus = document.activeElement;
    const root = overlayRoot();
    const backdrop = h('div', { class: 'modal-backdrop' });
    const dialog = h('div', {
      class: 'modal' + (o.wide ? ' modal--wide' : ''),
      role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title || '对话框'
    });
    dialog.appendChild(h('div', { class: 'modal-head' }, [
      h('div', {}, [
        h('div', { class: 'modal-title' }, o.title || ''),
        o.subtitle ? h('div', { class: 'modal-sub' }, o.subtitle) : null
      ]),
      closeButton(close)
    ]));
    const body = h('div', { class: 'modal-body' });
    if (o.content) append(body, [o.content]);
    dialog.appendChild(body);
    const footer = h('div', { class: 'modal-foot' });
    const actions = o.actions || [{ label: '关闭', onClick: close }];
    actions.forEach((a) => {
      footer.appendChild(h('button', {
        class: 'btn btn-sm ' + (a.primary ? 'btn-primary' : (a.tone === 'danger' ? 'btn-danger' : 'btn-ghost')),
        type: 'button',
        on: { click: () => { if (a.onClick) a.onClick(); if (a.close !== false) close(); } }
      }, [a.icon ? icon(a.icon, { size: 13 }) : null, h('span', {}, a.label)]));
    });
    dialog.appendChild(footer);
    backdrop.appendChild(dialog);
    root.appendChild(backdrop);

    let closed = false;
    const untrap = trapFocus(dialog);
    dialog.__onEsc = close;
    backdrop.__onEsc = close;
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
    const t = setTimeout(() => {
      const items = focusables(dialog);
      if (items.length) items[0].focus();
    }, 20);

    function close() {
      if (closed) return;
      closed = true;
      clearTimeout(t);
      untrap();
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      if (o.onClose) o.onClose();
      if (prevFocus && prevFocus.focus) prevFocus.focus();
    }
    return { close, dialog };
  }

  function drawer(opts) {
    const o = opts || {};
    const prevFocus = document.activeElement;
    const root = overlayRoot();
    const backdrop = h('div', { class: 'drawer-backdrop' });
    const panel = h('aside', {
      class: 'drawer', role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title || '抽屉'
    });
    panel.appendChild(h('div', { class: 'drawer-head' }, [
      h('div', {}, [
        h('div', { class: 'modal-title' }, o.title || ''),
        o.subtitle ? h('div', { class: 'modal-sub' }, o.subtitle) : null
      ]),
      closeButton(close)
    ]));
    const body = h('div', { class: 'drawer-body' });
    if (o.content) append(body, [o.content]);
    panel.appendChild(body);
    root.appendChild(backdrop);
    root.appendChild(panel);

    let closed = false;
    const untrap = trapFocus(panel);
    panel.__onEsc = close;
    backdrop.addEventListener('click', close);
    const t = setTimeout(() => {
      const items = focusables(panel);
      if (items.length > 1) items[1].focus(); else if (items.length) items[0].focus();
    }, 20);

    function close() {
      if (closed) return;
      closed = true;
      clearTimeout(t);
      untrap();
      if (panel.parentNode) panel.parentNode.removeChild(panel);
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      if (o.onClose) o.onClose();
      if (prevFocus && prevFocus.focus) prevFocus.focus();
    }
    return { close, panel };
  }

  function toast(message, tone) {
    if (FL.store && FL.store.actions && FL.store.actions.toast) {
      FL.store.actions.toast(message, tone || 'info');
      return;
    }
    let root = document.getElementById('toast-root');
    if (!root) { root = h('div', { id: 'toast-root', class: 'toast-root' }); document.body.appendChild(root); }
    const node = h('div', { class: 'toast', 'data-tone': tone || 'info', role: 'status' }, [
      icon(tone === 'danger' ? 'warning' : tone === 'warn' ? 'warning' : tone === 'ok' ? 'check' : 'info', { size: 15 }),
      h('div', {}, message)
    ]);
    root.appendChild(node);
    setTimeout(() => { if (node.parentNode) node.parentNode.removeChild(node); }, 4200);
  }

  /* line-style legend swatch */
  function lineSwatch(style, color, width) {
    return h('span', {
      class: 'ls-swatch',
      'data-style': style || 'solid',
      style: { borderTopColor: color || 'currentColor', borderTopWidth: (width || 2) + 'px' }
    });
  }

  FL.ui = {
    h, frag, clear, append,
    icon,
    badge, sourceTag, chip, stat, field,
    segmented, slider, switchControl,
    emptyState, loadingState,
    modal, drawer, toast,
    lineSwatch,
    fmt,
    sourceMeta: proto.sourceMeta,
    overlayRoot
  };
})();
