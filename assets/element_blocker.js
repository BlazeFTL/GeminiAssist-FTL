(function () {
  if (window.top !== window || window.__ftlBlocker) return;
  window.__ftlBlocker = true;

  var KEY = 'ftl_blocked_selectors';
  var POS_KEY = 'ftl_blocker_bar';
  var NS = 'http://www.w3.org/2000/svg';
  var BAD = /^(ng-|cdk-|mat-|mdc-|ripple|focus|hover|active|selected|disabled|open|opened|visible|hidden|loading|ftl-)|\d{3,}/i;

  var UI_CSS = [
    ':host{--bg:#f6f6f8;--fg:#1a1a1c;--muted:#6b7280;--line:#e4e4e8;--row:#ececef;--primary:#0f172a;--primary-fg:#fff;--danger:#dc2626;--danger-bg:#fde4e4;--handle:#2e2e33;--icon:#444746}',
    ':host([data-theme=dark]){--bg:#222226;--fg:#ececee;--muted:#9a9aa3;--line:#35353b;--row:#2e2e33;--primary:#e8eaf0;--primary-fg:#10131a;--danger:#ff8a80;--danger-bg:#4a2a2a;--handle:#b8b8c0;--icon:#c4c7c5}',
    '*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}',
    'button{font:inherit;color:inherit;border:0;background:none;padding:0;margin:0;cursor:pointer;touch-action:manipulation}',
    'svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;display:block;pointer-events:none}',
    '.hdr{position:fixed;display:none;align-items:center;justify-content:center;border-radius:50%;color:var(--icon);z-index:1}',
    '.hdr:active{background:rgba(128,128,128,.22)}',
    '.backdrop{position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,.4);opacity:0;pointer-events:none;transition:opacity .2s;z-index:2}',
    '.backdrop.on{opacity:1;pointer-events:auto}',
    '.sheet{position:fixed;left:0;right:0;bottom:0;max-height:72vh;display:flex;flex-direction:column;background:var(--bg);color:var(--fg);border-radius:24px 24px 0 0;transform:translateY(105%);visibility:hidden;transition:transform .25s ease,visibility 0s .25s;z-index:3;padding-bottom:env(safe-area-inset-bottom,0px);box-shadow:0 -4px 24px rgba(0,0,0,.18)}',
    '.sheet.on{transform:none;visibility:visible;transition:transform .25s ease}',
    '.handle{width:44px;height:4px;border-radius:2px;background:var(--handle);margin:14px auto 12px;flex:none;opacity:.85}',
    '.head{display:flex;align-items:center;justify-content:space-between;padding:0 8px 0 16px;height:48px;border-bottom:1px solid var(--line);flex:none}',
    '.title{font-size:14px;font-weight:500}',
    '.icon{width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:50%}',
    '.body{padding:16px;display:flex;flex-direction:column;min-height:0}',
    '.primary{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;height:54px;border-radius:12px;background:var(--primary);color:var(--primary-fg);font-size:16px;font-weight:600;flex:none}',
    '.primary svg{width:20px;height:20px}',
    '.count{margin:12px 0 8px;color:var(--muted);font-size:14px;flex:none}',
    '.list{overflow:auto;display:flex;flex-direction:column;gap:8px;min-height:0;overscroll-behavior:contain}',
    '.row{display:flex;align-items:center;gap:8px;background:var(--row);border-radius:10px;padding:8px 8px 8px 12px;flex:none}',
    '.sel{flex:1;min-width:0;font:13px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.sq{width:36px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:var(--danger-bg);color:var(--danger);flex:none}',
    '.sq svg{width:18px;height:18px}',
    '.clear{display:none;margin-top:12px;height:46px;width:100%;border-radius:10px;background:var(--row);border:1px solid var(--line);color:var(--danger);font-size:15px;flex:none}',
    '.hl{position:fixed;display:none;border:2px solid #ef4444;background:rgba(239,68,68,.16);pointer-events:none;z-index:1}',
    '.bar{position:fixed;left:0;top:0;width:min(calc(100vw - 24px),520px);display:none;flex-direction:column;border-radius:18px;background:#1c2230;color:#e5e7eb;box-shadow:0 6px 24px rgba(0,0,0,.35);z-index:4;overflow:hidden}',
    '.grip{height:22px;flex:none;display:flex;align-items:center;justify-content:center;touch-action:none;cursor:grab}',
    '.grip i{display:block;width:40px;height:4px;border-radius:2px;background:#4b5468}',
    '.ctl{display:flex;align-items:center;gap:8px;padding:0 8px 8px;flex:none}',
    '.bar .sel{padding-left:8px;line-height:40px;touch-action:none;cursor:grab}',
    '.bar .sel.empty{color:#9aa3b2;font-family:inherit;font-size:14px}',
    '.near{display:none;position:relative;border-top:1px solid #2c3446;max-height:min(32vh,260px);overflow:auto;overscroll-behavior:contain;padding:6px}',
    '.nb{display:flex;align-items:center;gap:8px;width:100%;height:34px;padding:0 10px;border-radius:8px;color:#c3cad8;font:12.5px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;text-align:left;white-space:nowrap;overflow:hidden}',
    '.nb b{flex:0 1 auto;max-width:72%;overflow:hidden;text-overflow:ellipsis;font-weight:500}',
    '.nb i{flex:1 1 0;min-width:0;overflow:hidden;text-overflow:ellipsis;font:12px system-ui,-apple-system,Roboto,sans-serif;color:#8590a6}',
    '.nb.sib{opacity:.7}',
    '.nb.cur{background:rgba(239,68,68,.24);color:#fff;opacity:1}',
    '.nb.cur i{color:#d7a9a9}',
    '.blk{height:40px;padding:0 18px;border-radius:10px;background:#ef4444;color:#fff;font-weight:600;font-size:15px;flex:none}',
    '.sm{width:40px;height:40px;border-radius:10px;background:#333b4b;color:#e5e7eb;display:flex;align-items:center;justify-content:center;flex:none}',
    '.sm svg{width:20px;height:20px}',
    'button[disabled]{opacity:.45}',
    '.pill{position:fixed;display:none;left:50%;bottom:calc(20px + env(safe-area-inset-bottom,0px));margin-left:-24px;width:48px;height:48px;border-radius:50%;background:#1c2230;color:#fff;align-items:center;justify-content:center;box-shadow:0 6px 20px rgba(0,0,0,.35);z-index:4}',
    '.toast{position:fixed;left:50%;bottom:calc(88px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:#1c2230;color:#fff;padding:10px 16px;border-radius:12px;font-size:14px;opacity:0;pointer-events:none;transition:opacity .2s;z-index:5;max-width:80vw;white-space:nowrap}',
    '.toast.on{opacity:1}'
  ].join('\n');

  var ICONS = {
    shield: ['M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z', 'M9.5 9.5l5 5', 'M14.5 9.5l-5 5'],
    cursor: ['M5 3.5v15l4.2-4 2.8 6 2.3-1-2.8-5.9H18z'],
    copy: ['M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1z', 'M5 15V5a1 1 0 0 1 1-1h10'],
    x: ['M6 6l12 12', 'M18 6L6 18'],
    minus: ['M6 12h12'],
    up: ['M12 19V5', 'M6 11l6-6 6 6']
  };

  var blocked = [];
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (Array.isArray(saved)) {
      blocked = saved.filter(function (s) { return typeof s === 'string' && s; });
    }
  } catch (e) {}

  var posFrac = null;
  try {
    var pf = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
    if (pf && isFinite(pf.x) && isFinite(pf.y)) {
      posFrac = { x: Math.max(0, Math.min(1, pf.x)), y: Math.max(0, Math.min(1, pf.y)) };
    }
  } catch (e) {}

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(blocked)); } catch (e) {}
  }

  var blockSheet = null;
  var blockStyle = null;

  function applyBlocks() {
    var css = blocked.map(function (s) { return s + '{display:none!important}'; }).join('\n');
    try {
      if (!blockSheet) blockSheet = new CSSStyleSheet();
      blockSheet.replaceSync(css);
      if (document.adoptedStyleSheets.indexOf(blockSheet) < 0) {
        document.adoptedStyleSheets = Array.prototype.slice.call(document.adoptedStyleSheets).concat([blockSheet]);
      }
      return;
    } catch (e) {}
    var root = document.head || document.documentElement;
    if (!root) return;
    if (!blockStyle || !blockStyle.isConnected) {
      blockStyle = document.createElement('style');
      root.appendChild(blockStyle);
    }
    blockStyle.textContent = css;
  }

  applyBlocks();

  function esc(s) {
    return window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/[^\w-]/g, '\\$&');
  }

  function unique(sel, el) {
    try {
      var l = document.querySelectorAll(sel);
      return l.length === 1 && l[0] === el;
    } catch (e) {
      return false;
    }
  }

  function part(el) {
    var tag = el.tagName.toLowerCase();
    var id = el.getAttribute('id');
    if (id && /^[A-Za-z][\w-]*$/.test(id) && !/\d{3,}/.test(id)) return '#' + id;
    var s = tag;
    var tid = el.hasAttribute('data-test-id') ? 'data-test-id' : el.hasAttribute('data-testid') ? 'data-testid' : '';
    var tv = tid ? el.getAttribute(tid) : '';
    if (tv && tv.length < 60) {
      s += '[' + tid + '="' + tv.replace(/["\\]/g, '\\$&') + '"]';
    } else {
      var cls = Array.prototype.filter.call(el.classList, function (c) { return c.length < 40 && !BAD.test(c); }).slice(0, 3);
      cls.forEach(function (c) { s += '.' + esc(c); });
      var al = el.getAttribute('aria-label');
      if (!cls.length && al && al.length < 40) s += '[aria-label="' + al.replace(/["\\]/g, '\\$&') + '"]';
    }
    var parent = el.parentElement;
    if (parent) {
      var same = 0;
      var idx = 0;
      for (var c = parent.firstElementChild; c; c = c.nextElementSibling) {
        if (c.tagName === el.tagName) {
          idx++;
          if (c === el) var at = idx;
        }
        try { if (c.matches(s)) same++; } catch (e) {}
      }
      if (same > 1) s += ':nth-of-type(' + at + ')';
    }
    return s;
  }

  function build(el) {
    var parts = [];
    var cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.body && cur !== document.documentElement) {
      parts.unshift(part(cur));
      var sel = parts.join(' > ');
      if (unique(sel, el)) return sel;
      cur = cur.parentElement;
    }
    parts = [];
    for (cur = el; cur && cur !== document.documentElement; cur = cur.parentElement) {
      var n = 1;
      for (var p = cur.previousElementSibling; p; p = p.previousElementSibling) {
        if (p.tagName === cur.tagName) n++;
      }
      parts.unshift(cur.tagName.toLowerCase() + ':nth-of-type(' + n + ')');
    }
    return parts.join(' > ');
  }

  function dark() {
    var els = [document.body, document.documentElement];
    for (var i = 0; i < els.length; i++) {
      if (!els[i]) continue;
      var m = getComputedStyle(els[i]).backgroundColor.match(/[\d.]+/g);
      if (m && m.length >= 3 && (m.length < 4 || +m[3] > 0.5)) {
        return 0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2] < 128;
      }
    }
    return !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  }

  function mk(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function icon(name) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    ICONS[name].forEach(function (d) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      s.appendChild(p);
    });
    return s;
  }

  function btn(cls, name, label) {
    var b = mk('button', cls);
    b.type = 'button';
    if (label) b.setAttribute('aria-label', label);
    if (name) b.appendChild(icon(name));
    return b;
  }

  function copy(text) {
    var ok = false;
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '0';
      ta.style.top = '0';
      ta.style.opacity = '0';
      shadow.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      ok = document.execCommand('copy');
      shadow.removeChild(ta);
    } catch (e) {}
    if (ok) return Promise.resolve(true);
    try {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  var host, shadow, hdr, backdrop, sheet, countEl, listEl, clearBtn, hl, bar, barSel, blockBtn, upBtn, pill, toastEl;
  var dragging = false;
  var near;
  var toastTimer = 0;
  var clearTimer = 0;
  var pick = { on: false, min: false, target: null, sel: '' };
  var st = { avatar: null, shifted: [], unclipped: [], dx: 0, base: null, found: false, t0: Date.now(), theme: '' };

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 1600);
  }

  function render() {
    var n = blocked.length;
    countEl.textContent = n === 0 ? 'No elements blocked' : n === 1 ? '1 element blocked' : n + ' elements blocked';
    listEl.textContent = '';
    blocked.forEach(function (s) {
      var row = mk('div', 'row');
      var t = mk('div', 'sel', s);
      var c = btn('sq', 'copy', 'Copy selector');
      var d = btn('sq', 'x', 'Remove');
      c.addEventListener('click', function () {
        copy(s).then(function (ok) { toast(ok ? 'Selector copied' : 'Copy failed'); });
      });
      d.addEventListener('click', function () {
        var i = blocked.indexOf(s);
        if (i >= 0) blocked.splice(i, 1);
        save();
        applyBlocks();
        render();
      });
      row.appendChild(t);
      row.appendChild(c);
      row.appendChild(d);
      listEl.appendChild(row);
    });
    clearBtn.style.display = n ? 'block' : 'none';
    clearBtn.textContent = 'Clear all blocks';
    clearTimeout(clearTimer);
  }

  function openSheet() {
    render();
    backdrop.classList.add('on');
    sheet.classList.add('on');
  }

  function closeSheet() {
    backdrop.classList.remove('on');
    sheet.classList.remove('on');
  }

  function labelOf(e) {
    var s = e.tagName.toLowerCase();
    if (e.id && e.id.length < 30) s += '#' + e.id;
    Array.prototype.filter.call(e.classList, function (c) { return c.length < 30 && !BAD.test(c); }).slice(0, 2).forEach(function (c) {
      s += '.' + c;
    });
    return s;
  }

  function snippet(e) {
    var w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    var out = '';
    var steps = 0;
    var n;
    while (out.length < 32 && steps++ < 40 && (n = w.nextNode())) {
      var t = n.nodeValue.replace(/\s+/g, ' ').trim();
      if (t) out += (out ? ' ' : '') + t;
    }
    return out.slice(0, 32);
  }

  function skip(e) {
    if (/^(script|style|link|meta|noscript|template)$/i.test(e.tagName) || e === host) return true;
    try { return getComputedStyle(e).display === 'none'; } catch (x) { return false; }
  }

  function nearbyRows(el) {
    var rows = [];
    var anc = [];
    for (var p = el.parentElement; p && p !== document.body && p !== document.documentElement && anc.length < 6; p = p.parentElement) {
      anc.unshift(p);
    }
    anc.forEach(function (a, i) { rows.push({ el: a, depth: i }); });
    var d = anc.length;
    var prev = el.previousElementSibling;
    while (prev && skip(prev)) prev = prev.previousElementSibling;
    var next = el.nextElementSibling;
    while (next && skip(next)) next = next.nextElementSibling;
    if (prev) rows.push({ el: prev, depth: d, sib: true });
    rows.push({ el: el, depth: d, cur: true });
    if (next) rows.push({ el: next, depth: d, sib: true });
    var n = 0;
    for (var c = el.firstElementChild; c; c = c.nextElementSibling) {
      if (skip(c)) continue;
      if (n++ >= 8) {
        rows.push({ more: true, depth: d + 1 });
        break;
      }
      rows.push({ el: c, depth: d + 1 });
    }
    return rows;
  }

  function renderNear() {
    near.textContent = '';
    var t = pick.target;
    if (!t) {
      near.style.display = 'none';
      return;
    }
    var cur = null;
    nearbyRows(t).forEach(function (r) {
      var b = mk('button', 'nb' + (r.cur ? ' cur' : '') + (r.sib ? ' sib' : ''));
      b.type = 'button';
      b.style.paddingLeft = 10 + Math.min(r.depth, 8) * 12 + 'px';
      if (r.more) {
        b.disabled = true;
        b.appendChild(mk('b', '', '\u2026'));
      } else {
        b.appendChild(mk('b', '', labelOf(r.el)));
        var s = snippet(r.el);
        if (s) b.appendChild(mk('i', '', s));
        b.addEventListener('click', function () { setTarget(r.el); });
      }
      if (r.cur) cur = b;
      near.appendChild(b);
    });
    near.style.display = 'block';
    if (cur) near.scrollTop = Math.max(0, cur.offsetTop - near.clientHeight / 3);
  }

  function placePanel() {
    if (!bar || bar.style.display !== 'flex' || dragging) return;
    var r = bar.getBoundingClientRect();
    var vw = innerWidth;
    var vh = innerHeight;
    var x = posFrac ? posFrac.x * (vw - r.width) : (vw - r.width) / 2;
    var y = posFrac ? posFrac.y * (vh - r.height) : vh - r.height - 16;
    bar.style.left = Math.round(Math.max(0, Math.min(x, vw - r.width))) + 'px';
    bar.style.top = Math.round(Math.max(0, Math.min(y, vh - r.height))) + 'px';
  }

  function bindDrag(h) {
    var d = null;
    h.addEventListener('pointerdown', function (e) {
      var r = bar.getBoundingClientRect();
      d = { id: e.pointerId, ox: e.clientX - r.left, oy: e.clientY - r.top };
      dragging = true;
      try { h.setPointerCapture(e.pointerId); } catch (x) {}
      e.preventDefault();
    });
    h.addEventListener('pointermove', function (e) {
      if (!d || e.pointerId !== d.id) return;
      var r = bar.getBoundingClientRect();
      var fw = innerWidth - r.width;
      var fh = innerHeight - r.height;
      var x = Math.max(0, Math.min(e.clientX - d.ox, fw));
      var y = Math.max(0, Math.min(e.clientY - d.oy, fh));
      bar.style.left = Math.round(x) + 'px';
      bar.style.top = Math.round(y) + 'px';
      posFrac = { x: fw > 0 ? x / fw : 0.5, y: fh > 0 ? y / fh : 1 };
    });
    var end = function (e) {
      if (!d || e.pointerId !== d.id) return;
      d = null;
      dragging = false;
      if (posFrac) {
        try { localStorage.setItem(POS_KEY, JSON.stringify(posFrac)); } catch (x) {}
      }
    };
    h.addEventListener('pointerup', end);
    h.addEventListener('pointercancel', end);
  }

  function positionHl() {
    var t = pick.target;
    if (!pick.on || pick.min || !t || !t.isConnected) {
      hl.style.display = 'none';
      return;
    }
    var r = t.getBoundingClientRect();
    if (!r.width && !r.height) {
      hl.style.display = 'none';
      return;
    }
    hl.style.display = 'block';
    hl.style.left = r.left + 'px';
    hl.style.top = r.top + 'px';
    hl.style.width = r.width + 'px';
    hl.style.height = r.height + 'px';
  }

  function showPick() {
    bar.style.display = pick.on && !pick.min ? 'flex' : 'none';
    pill.style.display = pick.on && pick.min ? 'flex' : 'none';
    placePanel();
    positionHl();
  }

  function setTarget(e) {
    pick.target = e;
    pick.sel = e ? build(e) : '';
    barSel.textContent = e ? pick.sel : 'Tap an element to select it';
    barSel.className = e ? 'sel' : 'sel empty';
    blockBtn.disabled = !e;
    upBtn.disabled = !e;
    renderNear();
    placePanel();
    positionHl();
  }

  function startPick() {
    closeSheet();
    pick.on = true;
    pick.min = false;
    setTarget(null);
    showPick();
  }

  function stopPick() {
    pick.on = false;
    pick.min = false;
    pick.target = null;
    pick.sel = '';
    showPick();
  }

  function commit() {
    if (!pick.target || !pick.sel) return;
    if (blocked.indexOf(pick.sel) < 0) blocked.push(pick.sel);
    save();
    applyBlocks();
    setTarget(null);
    toast('Blocked');
  }

  function choose(x, y) {
    var stack = document.elementsFromPoint(x, y);
    for (var i = 0; i < stack.length; i++) {
      var e = stack[i];
      if (e === host || e === document.documentElement || e === document.body) continue;
      setTarget(e);
      return;
    }
    toast('Cannot select this');
  }

  function ours(e) {
    var p = e.composedPath ? e.composedPath() : [];
    return p.indexOf(host) >= 0;
  }

  function gate(e) {
    return host && pick.on && !pick.min && !ours(e);
  }

  var tap = null;

  function bindPickEvents() {
    var o = { capture: true, passive: false };
    window.addEventListener('touchstart', function (e) {
      if (!gate(e)) return;
      var t = e.touches[0];
      tap = { x: t.clientX, y: t.clientY, at: Date.now(), multi: e.touches.length > 1 };
    }, o);
    window.addEventListener('touchend', function (e) {
      if (!gate(e) || !tap) return;
      var s = tap;
      tap = null;
      var t = e.changedTouches[0];
      if (s.multi || Date.now() - s.at > 600 || Math.hypot(t.clientX - s.x, t.clientY - s.y) > 10) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      choose(t.clientX, t.clientY);
    }, o);
    window.addEventListener('click', function (e) {
      if (!gate(e) || !e.isTrusted) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      choose(e.clientX, e.clientY);
    }, o);
    ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'auxclick', 'dblclick'].forEach(function (type) {
      window.addEventListener(type, function (e) {
        if (!gate(e) || !e.isTrusted) return;
        e.stopImmediatePropagation();
      }, o);
    });
    window.addEventListener('scroll', positionHl, true);
    window.addEventListener('resize', positionHl);
  }

  function visible(e) {
    var r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function rightmost(root) {
    var best = null;
    var edge = 0;
    var c = root.querySelectorAll('a,button');
    for (var j = 0; j < c.length; j++) {
      var r = c[j].getBoundingClientRect();
      if (r.width && r.height && r.top < 120 && r.right > innerWidth * 0.5 && r.right > edge) {
        edge = r.right;
        best = c[j];
      }
    }
    return best;
  }

  function findAvatar() {
    var l = document.querySelectorAll('a[href*="/SignOutOptions"]');
    for (var i = 0; i < l.length; i++) {
      if (visible(l[i])) return l[i];
    }
    var o = document.querySelectorAll('.signed-out-buttons');
    for (var k = 0; k < o.length; k++) {
      var b = rightmost(o[k]);
      if (b) return b;
    }
    var g = document.getElementById('gb');
    return g ? rightmost(g) : null;
  }

  function findNeighbors(a, r) {
    var out = [];
    var y = r.top + r.height / 2;
    var last = r.left;
    var limit = 40;
    var x = last - 4;
    var floor = Math.max(0, r.left - 240);
    while (x > floor) {
      var stack = document.elementsFromPoint(x, y);
      var hit = null;
      var hr = null;
      for (var i = 0; i < stack.length && !hit; i++) {
        var c = stack[i].closest('button,a,[role="button"],[role="link"]');
        if (!c || c === host || c === a || a.contains(c) || c.contains(a) || out.indexOf(c) >= 0) continue;
        var cr = c.getBoundingClientRect();
        if (cr.width > 160 || cr.height > 80 || Math.abs(cr.top + cr.height / 2 - y) > r.height) continue;
        hit = c;
        hr = cr;
      }
      if (hit) {
        out.push(hit);
        last = hr.left;
        limit = 16;
        x = last - 4;
      } else {
        x -= 6;
        if (last - x > limit + 6) break;
      }
    }
    return out;
  }

  function clearShift() {
    st.shifted.forEach(function (e) { e.style.removeProperty('translate'); });
    st.unclipped.forEach(function (e) { e.style.removeProperty('overflow'); });
    st.shifted = [];
    st.unclipped = [];
    st.dx = 0;
    st.base = null;
  }

  function pushLeft(list, dx) {
    list.forEach(function (e) { e.style.setProperty('translate', '-' + dx + 'px 0', 'important'); });
    st.shifted = list;
    st.dx = dx;
    list.forEach(function (e) {
      var r = e.getBoundingClientRect();
      for (var p = e.parentElement; p && p !== document.documentElement; p = p.parentElement) {
        var cs = getComputedStyle(p);
        if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
        var pr = p.getBoundingClientRect();
        if (r.left < pr.left - 0.5 && st.unclipped.indexOf(p) < 0) {
          p.style.setProperty('overflow', 'visible', 'important');
          st.unclipped.push(p);
        }
      }
    });
  }

  function hitByBlock(e) {
    return blocked.some(function (s) {
      try { return !!e.closest(s); } catch (x) { return false; }
    });
  }

  function place(b) {
    var size = Math.round(Math.min(b.h, 48));
    hdr.style.display = 'flex';
    hdr.style.width = size + 'px';
    hdr.style.height = size + 'px';
    hdr.style.right = 'auto';
    hdr.style.left = Math.round(b.l + b.w - size) + 'px';
    hdr.style.top = Math.round(b.t + (b.h - size) / 2) + 'px';
  }

  function floating() {
    clearShift();
    hdr.style.display = 'flex';
    hdr.style.width = '40px';
    hdr.style.height = '40px';
    hdr.style.left = 'auto';
    hdr.style.right = '8px';
    hdr.style.top = '8px';
  }

  function sync() {
    if (!host || document.hidden) return;
    if (!host.isConnected && document.documentElement) document.documentElement.appendChild(host);
    var theme = dark() ? 'dark' : 'light';
    if (theme !== st.theme) {
      st.theme = theme;
      host.setAttribute('data-theme', theme);
    }
    if (blockSheet && document.adoptedStyleSheets.indexOf(blockSheet) < 0) applyBlocks();
    positionHl();
    placePanel();

    var pref = document.querySelector('a[href*="/SignOutOptions"]');
    if (pref && pref !== st.avatar && visible(pref)) {
      clearShift();
      st.avatar = pref;
    }
    var a = st.avatar;
    if (!a || !a.isConnected) {
      clearShift();
      st.avatar = a = findAvatar();
    }
    if (!a) {
      var raw = document.querySelector('a[href*="/SignOutOptions"],.signed-out-buttons');
      if ((raw && hitByBlock(raw)) || (!st.found && Date.now() - st.t0 > 6000)) floating();
      else hdr.style.display = 'none';
      return;
    }
    st.found = true;

    var r = a.getBoundingClientRect();
    if (!r.width || !r.height) {
      clearShift();
      if (hitByBlock(a)) floating();
      else hdr.style.display = 'none';
      return;
    }

    var b = { l: r.left + st.dx, t: r.top, w: r.width, h: r.height };
    if (st.dx && (!st.base || Math.abs(st.base.l - b.l) > 1 || Math.abs(st.base.t - b.t) > 1 || Math.abs(st.base.w - b.w) > 1 ||
        st.shifted.some(function (e) { return !e.isConnected; }))) {
      clearShift();
      r = a.getBoundingClientRect();
      b = { l: r.left, t: r.top, w: r.width, h: r.height };
    }
    if (!st.dx) {
      var size = Math.round(Math.min(b.h, 48));
      pushLeft([a].concat(findNeighbors(a, r)), size + 8);
      st.base = b;
    }
    place(b);
  }

  function buildUi() {
    host = document.createElement('div');
    host.id = 'ftl-blocker-host';
    host.style.cssText = 'all:initial;position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;font:14px/1.3 system-ui,-apple-system,Roboto,sans-serif;color:#1a1a1c;';
    shadow = host.attachShadow({ mode: 'closed' });
    try {
      var cs = new CSSStyleSheet();
      cs.replaceSync(UI_CSS);
      shadow.adoptedStyleSheets = [cs];
    } catch (e) {
      shadow.appendChild(mk('style', '', UI_CSS));
    }

    hdr = btn('hdr', 'shield', 'Element blocker');
    hdr.addEventListener('click', function () {
      stopPick();
      openSheet();
    });

    backdrop = mk('div', 'backdrop');
    backdrop.addEventListener('click', closeSheet);

    sheet = mk('div', 'sheet');
    sheet.appendChild(mk('div', 'handle'));
    var head = mk('div', 'head');
    head.appendChild(mk('div', 'title', 'Element Blocker'));
    var close = btn('icon', 'x', 'Close');
    close.addEventListener('click', closeSheet);
    head.appendChild(close);
    sheet.appendChild(head);

    var body = mk('div', 'body');
    var sel = mk('button', 'primary');
    sel.type = 'button';
    sel.appendChild(icon('cursor'));
    sel.appendChild(document.createTextNode('Select element to block'));
    sel.addEventListener('click', startPick);
    countEl = mk('div', 'count');
    listEl = mk('div', 'list');
    clearBtn = mk('button', 'clear', 'Clear all blocks');
    clearBtn.type = 'button';
    clearBtn.addEventListener('click', function () {
      if (clearBtn.getAttribute('data-arm')) {
        clearBtn.removeAttribute('data-arm');
        blocked = [];
        save();
        applyBlocks();
        render();
        return;
      }
      clearBtn.setAttribute('data-arm', '1');
      clearBtn.textContent = 'Tap again to confirm';
      clearTimeout(clearTimer);
      clearTimer = setTimeout(function () {
        clearBtn.removeAttribute('data-arm');
        clearBtn.textContent = 'Clear all blocks';
      }, 2500);
    });
    body.appendChild(sel);
    body.appendChild(countEl);
    body.appendChild(listEl);
    body.appendChild(clearBtn);
    sheet.appendChild(body);

    hl = mk('div', 'hl');

    bar = mk('div', 'bar');
    var grip = mk('div', 'grip');
    grip.appendChild(mk('i'));
    var ctl = mk('div', 'ctl');
    near = mk('div', 'near');
    barSel = mk('div', 'sel empty', 'Tap an element to select it');
    upBtn = btn('sm', 'up', 'Select parent');
    upBtn.disabled = true;
    upBtn.addEventListener('click', function () {
      var p = pick.target && pick.target.parentElement;
      if (!p || p === document.body || p === document.documentElement) {
        toast('Cannot select higher');
        return;
      }
      setTarget(p);
    });
    blockBtn = mk('button', 'blk', 'Block');
    blockBtn.type = 'button';
    blockBtn.disabled = true;
    blockBtn.addEventListener('click', commit);
    var min = btn('sm', 'minus', 'Minimize');
    min.addEventListener('click', function () {
      pick.min = true;
      showPick();
    });
    var stop = btn('sm', 'x', 'Exit');
    stop.addEventListener('click', stopPick);
    ctl.appendChild(barSel);
    ctl.appendChild(upBtn);
    ctl.appendChild(blockBtn);
    ctl.appendChild(min);
    ctl.appendChild(stop);
    bar.appendChild(grip);
    bar.appendChild(ctl);
    bar.appendChild(near);
    bindDrag(grip);
    bindDrag(barSel);

    pill = btn('pill', 'shield', 'Resume selecting');
    pill.addEventListener('click', function () {
      pick.min = false;
      showPick();
    });

    toastEl = mk('div', 'toast');

    [hl, hdr, backdrop, sheet, bar, pill, toastEl].forEach(function (e) { shadow.appendChild(e); });
    document.documentElement.appendChild(host);
    bindPickEvents();
    setInterval(sync, 350);
    window.addEventListener('resize', sync);
    sync();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildUi);
  else buildUi();
})();
