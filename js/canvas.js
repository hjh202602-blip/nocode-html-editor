'use strict';
/* 탭3 — 캔버스: 페이지 그리기, 선택, 끌어서 놓기, 글자 바로 고치기
   페이지는 Shadow DOM 안에 그려서 편집기 화면의 스타일과 섞이지 않게 함 */
(() => {
  const { $, icon } = WB;
  const scroller = $('#canvas-scroll');
  const frame = $('#canvas-frame');
  const host = $('#canvas-host');
  const dropLine = $('#drop-line');
  const selBar = $('#sel-toolbar');
  const crumbs = $('#breadcrumb');

  const CANVAS_CSS = `
    :host { all: initial; }
    *, *::before, *::after { box-sizing: border-box; }
    .wb-page { flex: 1; position: relative; contain: layout; } /* contain: 「화면에 고정」 요소가 편집기 창이 아니라 페이지 안에 머물게 */
    dialog[data-wb-id] { display: block; position: relative; margin: 12px auto; } /* 팝업 창도 편집할 수 있게 펼쳐 둠 */
    .wb-page:empty::before {
      content: '오른쪽 「HTML 태그」에서 요소를 클릭하거나 이곳으로 끌어다 놓으세요';
      display: flex; align-items: center; justify-content: center; height: 220px; padding: 16px;
      border: 2px dashed #c9d1dc; border-radius: 10px; color: #8a96a8; text-align: center;
      font: 14px 'Malgun Gothic', sans-serif;
    }
    /* 빈 상자는 「끌어다 놓기」 칸으로 — 단, 높이를 정한 장식(선 · 원 · 색 견본)은 정한 크기 그대로 */
    [data-wb-container]:not(.wb-page):not([data-wb-decor]):empty { min-height: 48px; }
    [data-wb-container]:not(.wb-page):not(select):not([data-wb-decor]):empty::before {
      content: '여기에 끌어다 놓기'; display: flex; align-items: center; justify-content: center;
      min-height: 48px; width: 100%; border: 1px dashed #c3cad5; border-radius: 4px;
      color: #9aa4b2; font: 12px 'Malgun Gothic', sans-serif;
    }
    .wb-page[data-wb-guides] [data-wb-id] { outline: 1px dashed rgba(100, 116, 139, .35); outline-offset: -1px; }
    [data-wb-drop-parent] { outline: 1px dashed #2563eb !important; outline-offset: -1px; }
    [data-wb-hover] { outline: 1px solid #60a5fa !important; outline-offset: -1px; }
    [data-wb-selected] { outline: 2px solid #2563eb !important; outline-offset: -2px; }
    [data-wb-drop] { outline: 2px dashed #2563eb !important; outline-offset: -2px; background-color: rgba(37, 99, 235, .08) !important; }
    [data-wb-editing] { outline: 2px solid #f59e0b !important; outline-offset: 1px; cursor: text; }
    [data-wb-dragging] { opacity: .35; }
    [data-wb-noptr] { pointer-events: none; }
    [data-layout="free"] { outline: 1px dashed #a78bfa; outline-offset: -1px; }
    [data-layout="free"]:empty::before { content: '자유 배치 — 요소를 아무 곳에나 끌어다 놓으세요' !important; min-height: 100% !important; position: absolute; inset: 0; border: 0 !important; }
    a, button { cursor: default; }
    /* 발표 슬라이드: 왼쪽 위에 몇 번째 장인지 */
    .wb-page { counter-reset: wbslide; }
    [data-slide] { counter-increment: wbslide; }
    [data-slide]::before { content: counter(wbslide); position: absolute; left: 0; top: 0; z-index: 2147483000; padding: 2px 10px; border-radius: 0 0 8px 0; background: rgba(15, 23, 42, .55); color: #fff; font: 700 18px/26px 'Malgun Gothic', sans-serif; pointer-events: none; }
    svg[data-chart] { display: block; }
  ` + WB.HL_CSS('') + '\n' + WB.hoverCSS(new Set(WB.HOVERS.map(h => h[0]))) + '\n' + WB.UI_CSS('');
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>${CANVAS_CSS}</style><style class="wb-extra"></style><div class="wb-page" data-wb-id="root" data-wb-container></div>`;
  const page = shadow.querySelector('.wb-page');
  const extraStyle = shadow.querySelector('.wb-extra');
  /** 가져온 페이지의 보존 CSS 를 캔버스 안에서도: body → 페이지 상자, :root · html → 캔버스 바깥 */
  const canvasExtraCSS = extra => [extra?.cssTop, extra?.css].filter(Boolean).join('\n')
    .replace(/(^|[\s,{}>+~(])body(?=[\s,{.#:[>+~)]|$)/gm, '$1.wb-page')
    .replace(/(^|[\s,{}>+~(])(:root|html)(?=[\s,{.#:[>+~)]|$)/gm, '$1:host');

  // 마우스로 직접 누르면 입력이 되어 버리는 요소들 → 클릭을 막고 위치로 찾음
  const NOPTR = new Set(['input', 'textarea', 'select', 'video', 'audio', 'iframe']);
  const assetUrls = new Map();
  let editingId = null;
  let hoverEl = null;

  const elFor = id => (id === 'root' ? page : shadow.querySelector(`[data-wb-id="${id}"]`));
  const nodeOf = el => WB.find(WB.canvasDoc().root, el.dataset.wbId)?.node;
  const childEls = el => [...el.children].filter(c => c.hasAttribute('data-wb-id'));

  /* ---------- 그리기 ---------- */
  function applyStyle(el, style) {
    for (const [k, v] of Object.entries(style || {})) el.style.setProperty(k, String(v).replace(/\s*!important\s*$/i, ''));
  }
  /** 글자 넣기. raw 가 아니면 *강조* 부분을 <span class="hl"> 로 */
  function fillText(el, text, raw = false) {
    (text || '').split('\n').forEach((line, i) => {
      if (i) el.append(document.createElement('br'));
      if (raw) return el.append(line);
      line.split(/(\*[^*]+\*)/).forEach(part => {
        if (/^\*[^*]+\*$/.test(part)) {
          const sp = document.createElement('span');
          sp.className = 'hl';
          sp.textContent = part.slice(1, -1);
          el.append(sp);
        } else if (part) el.append(part);
      });
    });
  }
  /** 지금 보는 화면 크기에 맞는 스타일 (태블릿 · 휴대폰 보기면 그 화면 전용 스타일을 덮어씀).
      탭2 상태가 「마우스 올림」이면 고른 요소는 마우스를 올린 모습으로 보여 줌 */
  const viewStyle = node => WB.mergedStyle(node, WB.settings.device, WB.editVariant() === 'hover' && node.id === WB.selectedId());
  /** 캔버스 확대 배율 (화면 위치 ↔ 페이지 px 바꿀 때 나눔) */
  const Z = () => WB.settings.zoom || 1;
  function chartEl(node) {
    const t = document.createElement('template');
    t.innerHTML = node.raw != null
      ? `<svg xmlns="http://www.w3.org/2000/svg">${node.raw}</svg>` // 가져온 아이콘 (속성은 아래에서 붙임)
      : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">${WB.chartInner(node.attrs)}</svg>`;
    return t.content.firstElementChild;
  }
  function build(node) {
    const el = node.tag === 'svg' ? chartEl(node) : document.createElement(node.tag);
    el.setAttribute('data-wb-id', node.id);
    for (const [k, v] of Object.entries(node.attrs || {})) {
      if (/^on/i.test(k) || k === 'contenteditable') continue; // 편집기 안에서는 글자를 바로 고치지 않음 (두 번 클릭으로 고침)
      try { el.setAttribute(k, v); } catch { /* 잘못된 속성 이름은 무시 */ }
    }
    applyStyle(el, viewStyle(node));
    if (node.tag === 'details') el.open = true; // 접는 내용: 편집할 때는 펼쳐 둠
    const kind = WB.kindOf(node);
    if (kind === 'container') {
      el.setAttribute('data-wb-container', '');
      for (const c of node.children) el.append(build(c));
      // 높이를 정한 빈 상자는 선 · 원 같은 장식 → 「끌어다 놓기」 칸으로 부풀리지 않음
      const st = viewStyle(node);
      if (!node.children.length && (st.height || st['min-height'] || st['aspect-ratio'])) el.setAttribute('data-wb-decor', '');
    } else if (kind === 'text') fillText(el, node.text);
    if (NOPTR.has(node.tag)) el.setAttribute('data-wb-noptr', '');
    el.draggable = true;
    return el;
  }

  function render() {
    const doc = WB.canvasDoc();
    if (!doc || editingId) return;
    page.removeAttribute('style');
    extraStyle.textContent = canvasExtraCSS(doc.extra) + '\n' + hoverRulesCSS(doc) + '\n' + paletteCSS(doc);
    loadWebFonts(doc);
    applyStyle(page, viewStyle(doc.root));
    page.replaceChildren(...doc.root.children.map(build));
    // 표 계산: =로 시작하는 칸은 계산한 값으로 보여 줌 (두 번 클릭하면 수식이 보임)
    page.querySelectorAll('table[data-calc] td').forEach(td => {
      const f = td.textContent.trim();
      if (f.startsWith('=')) td.dataset.formula = f;
    });
    WB.calcTables(page);
    // 쪽 번호: 몇 번째 슬라이드인지 채워서 보여 줌 (저장한 페이지에서도 저절로 채워짐)
    page.querySelectorAll('[data-slide]').forEach((s, i) => s.querySelectorAll('[data-slide-num]').forEach(n => (n.textContent = i + 1)));
    page.draggable = true;
    page.toggleAttribute('data-wb-guides', !!WB.settings.guides);
    hoverEl = null;
    resolveAssets(doc);
    applySelection();
  }

  /** 「마우스 올림」 스타일: 캔버스에서도 실제로 마우스를 올리면 바뀌게 (요소의 style="" 보다 앞서도록 !important) */
  function hoverRulesCSS(doc) {
    const out = [];
    WB.walk(doc.root, n => {
      if (!n.styleHover || n.id === 'root') return;
      out.push(`[data-wb-id="${n.id}"]:hover { ${Object.entries(n.styleHover).map(([k, v]) => `${k}: ${String(v).replace(/\s*!important\s*$/i, '')} !important;`).join(' ')} }`);
    });
    return out.join('\n');
  }
  /** 색 팔레트 변수 (가져온 CSS 가 var(--이름) 을 쓸 수 있게) */
  const paletteCSS = doc => ((doc.extra?.vars || []).length ? `:host { ${doc.extra.vars.map(v => `--${v.name}: ${v.value};`).join(' ')} }` : '');
  /** 웹 글꼴: 편집기 문서에 Google Fonts 링크를 걸면 캔버스(Shadow DOM)에서도 그 글꼴로 보임 */
  let fontHref = '';
  function loadWebFonts(doc) {
    const names = new Set();
    WB.walk(doc.root, n => {
      for (const s of [n.style, n.styleTablet, n.styleMobile, n.styleHover]) for (const k of ['font-family', '--hl-font']) if (s?.[k]) WB.webFontsIn(s[k]).forEach(f => names.add(f));
    });
    const href = names.size ? WB.fontsURL([...names]) : '';
    if (href === fontHref) return;
    fontHref = href;
    let link = document.getElementById('wb-webfonts');
    if (!href) return link?.remove();
    if (!link) document.head.append(link = WB.h('link', { rel: 'stylesheet', id: 'wb-webfonts' }));
    link.href = href;
  }
  WB.loadWebFonts = loadWebFonts;

  /** 열린 폴더 안의 상대 경로 이미지(images/a.png 등)를 캔버스에서 볼 수 있게 연결 */
  function resolveAssets(doc) {
    const dir = WB.dirPathOf(doc);
    if (dir == null || !WB.explorer?.root) return;
    // 배경 그림 url("images/a.png")
    shadow.querySelectorAll('[style*="url("]').forEach(async el => {
      const m = el.style.backgroundImage.match(/url\("?([^")]+)"?\)/);
      if (!m || /^([a-z]+:|\/\/)/i.test(m[1])) return;
      const path = normalizePath(dir, m[1]);
      try {
        if (!assetUrls.has(path)) assetUrls.set(path, URL.createObjectURL(await WB.explorer.fileAt(path)));
        if (el.isConnected) el.style.backgroundImage = `url("${assetUrls.get(path)}")`;
      } catch { /* 파일이 없으면 그대로 둠 */ }
    });
    shadow.querySelectorAll('[src]').forEach(async el => {
      const src = el.getAttribute('src');
      if (!src || /^([a-z]+:|\/\/|#)/i.test(src)) return;
      const path = normalizePath(dir, src.split(/[?#]/)[0]);
      try {
        if (!assetUrls.has(path)) assetUrls.set(path, URL.createObjectURL(await WB.explorer.fileAt(path)));
        if (el.isConnected) el.src = assetUrls.get(path);
      } catch { /* 파일이 없으면 그대로 둠 */ }
    });
  }
  function normalizePath(dir, rel) {
    const parts = rel.startsWith('/') ? [] : dir.split('/').filter(Boolean);
    for (const seg of decodeURI(rel).split('/')) {
      if (!seg || seg === '.') continue;
      if (seg === '..') parts.pop();
      else parts.push(seg);
    }
    return parts.join('/');
  }
  WB.forgetAsset = path => assetUrls.delete(path);

  /* ---------- 선택 표시 ---------- */
  function applySelection() {
    shadow.querySelectorAll('[data-wb-selected]').forEach(e => e.removeAttribute('data-wb-selected'));
    const id = WB.selectedId();
    const el = id && elFor(id);
    if (el && el !== page) el.setAttribute('data-wb-selected', '');
    positionBar();
    renderCrumbs();
  }

  selBar.innerHTML = `<span class="sel-name"></span>
    <button data-act="parent" title="바깥 상자 선택 (Esc)">${icon('parent', 14)}</button>
    <button data-act="up" title="앞으로 옮기기 (Alt+↑)">${icon('up', 14)}</button>
    <button data-act="down" title="뒤로 옮기기 (Alt+↓)">${icon('down', 14)}</button>
    <button data-act="dup" title="복제 (Ctrl+D)">${icon('copy', 14)}</button>
    <button data-act="cstyle" title="스타일 복사 (Ctrl+Shift+C)">${icon('brush', 14)}</button>
    <button data-act="pstyle" title="스타일 붙여넣기 (Ctrl+Shift+V)">${icon('paste', 14)}</button>
    <button data-act="repeat" title="데이터로 반복해서 만들기">${icon('rows', 14)}</button>
    <button data-act="del" title="삭제 (Delete)">${icon('trash', 14)}</button>`;
  const selName = selBar.querySelector('.sel-name');

  /* 크기 조절 손잡이: 고른 요소의 테두리(오른쪽 · 아래 · 모서리)를 끌면 너비 · 높이가 바뀜.
     띄워 놓은 요소(자유 배치 · 띄워서 겹치기)는 위 · 왼쪽 테두리도 (위치가 함께 바뀜) */
  const rsBox = WB.h('div', { class: 'rs-box', hidden: true });
  rsBox.innerHTML = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map(d => `<div class="rs-h rs-${d.length > 1 ? 'c' : 'edge'}" data-h="${d}"></div>`).join('') + '<div class="rs-label" hidden></div>';
  scroller.append(rsBox);
  const rsLabel = rsBox.querySelector('.rs-label');
  let resizing = null;
  function positionRS(el) {
    if (!el || editingId || WB.drag || !WB.canvasDoc()) { if (!resizing) rsBox.hidden = true; return; }
    const r = el.getBoundingClientRect(), s = scroller.getBoundingClientRect();
    Object.assign(rsBox.style, { left: r.left - s.left + scroller.scrollLeft + 'px', top: r.top - s.top + scroller.scrollTop + 'px', width: r.width + 'px', height: r.height + 'px' });
    const abs = ['absolute', 'fixed'].includes(getComputedStyle(el).position);
    rsBox.classList.toggle('abs', abs); // 띄운 요소만 위 · 왼쪽 손잡이
    rsBox.hidden = false;
  }
  rsBox.addEventListener('pointerdown', e => {
    const hd = e.target.closest('[data-h]');
    const id = WB.selectedId();
    const el = id && elFor(id);
    if (!hd || !el || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    try { hd.setPointerCapture(e.pointerId); } catch { /* 이미 끝난 포인터 */ }
    const node = nodeOf(el), z = Z(), dir = hd.dataset.h;
    const r = el.getBoundingClientRect();
    const st = WB.styleOf(node);
    const abs = ['absolute', 'fixed'].includes(getComputedStyle(el).position);
    const byRight = abs && st.right && !st.left, byBottom = abs && st.bottom && !st.top; // 오른쪽 · 아래 기준으로 놓인 요소
    const s0 = { w: r.width / z, h: r.height / z, l: parseFloat(st.left) || el.offsetLeft, t: parseFloat(st.top) || el.offsetTop, rr: parseFloat(st.right) || 0, bb: parseFloat(st.bottom) || 0 };
    resizing = { id, dir, out: {} };
    rsLabel.hidden = false;
    const move = ev => {
      let dx = (ev.clientX - e.clientX) / z, dy = (ev.clientY - e.clientY) / z;
      const snap = v => (ev.altKey ? v : Math.round(v / (ev.shiftKey && dir.length === 1 ? 10 : 1)) * (ev.shiftKey && dir.length === 1 ? 10 : 1));
      let w = s0.w, h = s0.h;
      if (dir.includes('e')) w = s0.w + dx;
      if (dir.includes('w')) w = s0.w - dx;
      if (dir.includes('s')) h = s0.h + dy;
      if (dir.includes('n')) h = s0.h - dy;
      if (ev.shiftKey && dir.length === 2) h = w * s0.h / s0.w; // 모서리 + Shift: 비율 그대로
      w = Math.max(8, snap(w));
      h = Math.max(8, snap(h));
      const out = {};
      if (/[ew]/.test(dir)) { out.width = Math.round(w) + 'px'; el.style.width = out.width; el.style.flexGrow = '0'; el.style.maxWidth = 'none'; }
      if (/[ns]/.test(dir)) { out.height = Math.round(h) + 'px'; el.style.height = out.height; el.style.minHeight = '0'; }
      if (abs) {
        // 왼쪽 · 위 손잡이는 반대쪽 끝이 그대로 있게 위치도 옮김 (오른쪽 · 아래 기준이면 반대로)
        if (dir.includes('w') && !byRight) out.left = Math.round(s0.l + s0.w - w) + 'px';
        if (dir.includes('e') && byRight) out.right = Math.round(s0.rr - (w - s0.w)) + 'px';
        if (dir.includes('n') && !byBottom) out.top = Math.round(s0.t + s0.h - h) + 'px';
        if (dir.includes('s') && byBottom) out.bottom = Math.round(s0.bb - (h - s0.h)) + 'px';
        for (const k of ['left', 'right', 'top', 'bottom']) if (out[k]) el.style[k] = out[k];
      }
      resizing.out = out;
      rsLabel.textContent = `${Math.round(w)} × ${Math.round(h)}`;
      positionRS(el);
    };
    const up = () => {
      hd.removeEventListener('pointermove', move);
      hd.removeEventListener('pointerup', up);
      hd.removeEventListener('pointercancel', up);
      const out = resizing.out;
      resizing = null;
      rsLabel.hidden = true;
      if (!Object.keys(out).length) return;
      const mw = st['max-width'] || '';
      if (out.width) Object.assign(out, { 'flex-grow': '', 'max-width': /px$/.test(mw) && parseFloat(mw) < parseFloat(out.width) ? '' : mw }); // 더 작은 최대 너비(px)는 지움
      if (out.height && st['min-height'] && parseFloat(st['min-height']) > parseFloat(out.height)) out['min-height'] = '';
      WB.setStyles(id, out, `resize:${id}:${Date.now()}`);
    };
    hd.addEventListener('pointermove', move);
    hd.addEventListener('pointerup', up);
    hd.addEventListener('pointercancel', up);
  });
  // 손잡이를 두 번 클릭하면 그 방향 크기를 「자동」으로 (정한 크기 지우기)
  rsBox.addEventListener('dblclick', e => {
    const dir = e.target.closest('[data-h]')?.dataset.h, id = WB.selectedId();
    if (!dir || !id) return;
    const out = {};
    if (/[ew]/.test(dir)) out.width = '';
    if (/[ns]/.test(dir)) Object.assign(out, { height: '', 'min-height': '' });
    WB.setStyles(id, out, `resize:${id}:${Date.now()}`);
    WB.toast('정한 크기를 지웠어요 (내용에 맞춤)');
  });

  function positionBar() {
    const id = WB.selectedId();
    const el = id && id !== 'root' && elFor(id);
    WB.emit('rulers'); // 눈금자 · 여백 보기도 함께 다시 그림
    positionRS(el);
    if (!el || editingId) { selBar.hidden = true; return; }
    const node = nodeOf(el);
    selName.innerHTML = `${WB.esc(WB.labelOf(node))}<code>&lt;${node.tag}&gt;</code>${WB.idClassChips(WB.canvasDoc(), node)}`;
    selBar.hidden = false;
    const r = el.getBoundingClientRect();
    const s = scroller.getBoundingClientRect();
    const bh = selBar.offsetHeight, bw = selBar.offsetWidth;
    let top = r.top - s.top + scroller.scrollTop - bh;
    if (r.top - s.top < bh) top = r.bottom - s.top + scroller.scrollTop; // 위에 자리가 없으면 아래쪽에
    let left = r.left - s.left + scroller.scrollLeft;
    left = Math.max(0, Math.min(left, scroller.scrollWidth - bw - 2));
    selBar.style.top = top + 'px';
    selBar.style.left = left + 'px';
  }

  selBar.addEventListener('click', e => {
    const b = e.target.closest('button');
    const id = WB.selectedId();
    if (!b || !id) return;
    const act = b.dataset.act;
    if (act === 'parent') WB.selectParent();
    else if (act === 'up') WB.moveSibling(id, -1);
    else if (act === 'down') WB.moveSibling(id, 1);
    else if (act === 'dup') WB.duplicateNode(id);
    else if (act === 'cstyle') WB.copyStyle();
    else if (act === 'pstyle') WB.pasteStyle();
    else if (act === 'repeat') WB.openRepeater(id);
    else if (act === 'del') WB.removeNode(id);
  });

  WB.selectParent = () => {
    const doc = WB.canvasDoc();
    const id = WB.selectedId();
    if (!doc || !id) return;
    const f = WB.find(doc.root, id);
    WB.select(f && f.parent ? f.parent.id : null);
  };

  function renderCrumbs() {
    const doc = WB.canvasDoc();
    crumbs.innerHTML = '';
    if (!doc) return;
    const id = WB.selectedId();
    const path = id ? WB.pathTo(doc.root, id) : [];
    path.forEach((n, i) => {
      if (i) crumbs.append(WB.h('span', { class: 'ar' }, '›'));
      const b = WB.h('button', { class: i === path.length - 1 ? 'cur' : '' }, WB.labelOf(n));
      b.onclick = () => WB.select(n.id);
      crumbs.append(b);
    });
    if (!path.length) crumbs.append(WB.h('span', {}, '선택한 요소 없음'));
    crumbs.append(WB.h('span', { class: 'hint' }, '두 번 클릭: 글자 고치기 · Delete: 삭제 · Ctrl+Z: 되돌리기'));
  }

  /* ---------- 마우스로 요소 찾기 ---------- */
  function hitEl(e) {
    let el = null;
    for (const n of e.composedPath()) {
      if (n === host) break;
      if (n.nodeType === 1 && n.hasAttribute('data-wb-id')) { el = n; break; }
    }
    if (!el) return null;
    // 입력칸처럼 클릭이 통과하는 요소는 좌표로 찾음
    const x = e.clientX, y = e.clientY;
    let best = null;
    el.querySelectorAll('[data-wb-noptr]').forEach(c => {
      const r = c.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) best = c;
    });
    return best || el;
  }

  function setHover(el) {
    if (el === page) el = null;
    if (hoverEl === el) return;
    hoverEl?.removeAttribute('data-wb-hover');
    hoverEl = el;
    el?.setAttribute('data-wb-hover', '');
  }

  shadow.addEventListener('mousemove', e => { if (!WB.drag && !editingId) setHover(hitEl(e)); });
  host.addEventListener('mouseleave', () => setHover(null));

  shadow.addEventListener('click', e => {
    const editing = editingId && elFor(editingId);
    if (editing && editing.contains(e.composedPath()[0])) return;
    e.preventDefault(); // 링크 이동 · 양식 제출 막기
    const el = hitEl(e);
    if (el) WB.select(el.dataset.wbId);
  });
  shadow.addEventListener('submit', e => e.preventDefault());

  /* ---------- 오른쪽 클릭: 고른 요소로 할 수 있는 일 ---------- */
  const TEXT_TAGS = [['h1', '큰 제목'], ['h2', '중간 제목'], ['h3', '작은 제목'], ['p', '문단'], ['span', '짧은 글자'], ['strong', '굵은 글자'], ['small', '작은 글자'], ['blockquote', '인용문'], ['a', '링크'], ['button', '버튼'], ['label', '라벨']];
  const BOX_TAGS = [['div', '상자'], ['section', '구역'], ['header', '머리말'], ['footer', '꼬리말'], ['nav', '메뉴 영역'], ['main', '본문'], ['article', '글 묶음'], ['aside', '곁 내용'], ['form', '입력 양식']];
  function elementMenu(id, x, y) {
    const doc = WB.canvasDoc();
    const node = WB.find(doc.root, id)?.node;
    if (!node) return;
    const root = id === 'root';
    const kind = WB.kindOf(node);
    const fmt = WB.formatOf(doc, node);
    const items = [];
    // 바탕화면(페이지)도 같은 메뉴: 페이지에는 쓸 수 없는 항목은 흐리게
    const st = node.style;
    const tags = root ? [] : (kind === 'text' ? TEXT_TAGS : kind === 'container' ? BOX_TAGS : []).filter(([t]) => t !== node.tag);
    items.push(
      { label: '글자 고치기', icon: 'edit', kbd: 'Enter', disabled: root || kind !== 'text', action: () => WB.startEditSelected() },
      { label: '잘라내기', icon: 'x', kbd: 'Ctrl+X', disabled: root, action: () => WB.cutNode(id) },
      { label: '복사', icon: 'copy', kbd: 'Ctrl+C', disabled: root, action: () => WB.copyNode(id) });
    if (WB.hasClipboard()) items.push({ label: kind === 'container' ? '안에 붙여넣기' : '뒤에 붙여넣기', icon: 'paste', kbd: 'Ctrl+V', action: () => WB.pasteNode() });
    items.push(
      { label: '복제', icon: 'copy', kbd: 'Ctrl+D', disabled: root, action: () => WB.duplicateNode(id) },
      { label: '삭제', icon: 'trash', kbd: 'Delete', danger: true, disabled: root, action: () => WB.removeNode(id) },
      'sep',
      { label: '상자로 감싸기', icon: 'box', disabled: root, action: () => { const w = WB.wrapNode(id, { padding: '16px' }); if (w) WB.select(w); } },
      { label: '가로 배치로 감싸기', icon: 'rows', disabled: root, action: () => { const w = WB.wrapNode(id, { display: 'flex', 'flex-direction': 'row', gap: '12px', 'align-items': 'center' }); if (w) WB.select(w); } });
    if (!root && kind === 'container' && node.children.length) items.push({ label: '상자 풀기 (안의 요소만 남기기)', icon: 'parent', action: () => { WB.unwrapNode(id); WB.select(node.children[0]?.id || null); } });
    items.push({ label: '태그 바꾸기 ▸', icon: 'code', disabled: !tags.length, action: () => WB.menu(x + 16, y, tags.map(([t, l]) => ({ label: `${l}  <${t}>`, action: () => WB.changeTag(id, t) }))) },
      'sep',
      { label: '스타일 복사', icon: 'brush', kbd: 'Ctrl+Shift+C', action: () => WB.copyStyle() },
      ...(WB.copyStyleReady() ? [{ label: '스타일 붙여넣기', icon: 'paste', kbd: 'Ctrl+Shift+V', action: () => WB.pasteStyle() }] : []));
    if (!root && (st.width || st.height || st['flex-grow'])) items.push({ label: '크기를 내용에 맞추기', icon: 'collapse', action: () => WB.setStyles(id, { width: '', height: '', 'flex-grow': '', 'min-height': '' }, `fit:${id}:${Date.now()}`) });
    items.push(
      { label: '가로 가운데에 놓기', icon: 'alignC', disabled: root, action: () => WB.setStyles(id, { display: kind === 'container' || !['span', 'a', 'strong', 'small', 'label', 'button', 'img', 'input'].includes(node.tag) ? st.display || '' : 'block', 'margin-left': 'auto', 'margin-right': 'auto', width: st.width || 'fit-content' }, `center:${id}:${Date.now()}`) },
      { label: node.styleMobile?.display === 'none' ? '휴대폰에서 다시 보이기' : '휴대폰에서 숨기기', icon: 'phone', disabled: root, action: () => WB.toggleMobileHide(id) },
      'sep',
      fmt ? { label: `형식 .${fmt} 에서 떼기`, icon: 'copy', action: () => WB.formatDetach(id) } : { label: '이 모양으로 형식 만들기…', icon: 'copy', disabled: root, action: () => WB.formatCreateAsk() },
      { label: node.attrs.id ? `요소 이름 바꾸기 (#${node.attrs.id})…` : '요소 이름(id) 붙이기…', icon: 'edit', disabled: root, action: () => nameElement(id, node.attrs.id) },
      { label: '클릭했을 때 동작 만들기 (JS)', icon: 'code', disabled: root, action: () => clickBlock(id) },
      { label: '데이터로 반복해서 만들기', icon: 'rows', disabled: root, action: () => WB.openRepeater(id) },
      { label: root ? '이 페이지를 내 에셋으로 저장…' : '내 에셋으로 저장…', icon: 'save', action: () => WB.saveMyAsset(id) },
      'sep',
      { label: '바깥 상자 고르기', icon: 'parent', kbd: 'Esc', disabled: root, action: () => WB.selectParent() },
      { label: '구조에서 보기', icon: 'rows', action: () => { WB.setTool('html'); WB.setPaletteMode('tree'); } },
      'sep');
    if (root) items.push({ label: '바탕화면 CSS', icon: 'brush', action: () => { WB.select('root'); WB.setCodeMode?.('css', false); WB.setTool('css'); } });
    items.push({ label: '에셋 가져오기…', icon: 'box', action: () => WB.openAssets() });
    WB.menu(x, y, items.filter((it, i, a) => !(it === 'sep' && (i === 0 || a[i - 1] === 'sep'))));
  }
  async function nameElement(id, old) {
    const v = await WB.ask(old ? '요소 이름 바꾸기' : '요소 이름 (id)', old || '', '예: login-button', old ? '바꾸기' : '붙이기', '영문 · 숫자 · - · _ (페이지에서 하나뿐인 이름). 블록과 #링크에서 써요');
    if (!v || v === old) return;
    if (!/^[A-Za-z][\w-]*$/.test(v)) return WB.toast('영문으로 시작하고 영문 · 숫자 · - · _ 만 쓸 수 있어요', 'error');
    let dup = false;
    WB.walk(WB.canvasDoc().root, n => { if (n.attrs?.id === v) dup = true; });
    if (dup) return WB.toast(`'${v}' 은(는) 이미 있는 이름이에요`, 'error');
    if (old) WB.idRename(old, v);
    else WB.setAttr(id, 'id', v);
  }
  /** 「~을(를) 클릭했을 때」 블록을 만들어 JS 동작 탭에 놓음 (요소 이름이 없으면 붙임) */
  function clickBlock(id) {
    WB.commit(d => {
      const n = WB.find(d.root, id).node;
      if (!n.attrs.id) {
        const used = new Set();
        WB.walk(d.root, x => x.attrs?.id && used.add(x.attrs.id));
        const base = { button: 'button', a: 'link', img: 'image', input: 'input' }[n.tag] || 'el';
        let i = 1;
        while (used.has(base + i)) i++;
        n.attrs.id = base + i;
      }
      const hat = WB.newBlock('onClick', d.blocks);
      hat.args.el = n.attrs.id;
      const y = (d.blocks.scripts || []).reduce((m, s) => Math.max(m, s.y), 0) + ((d.blocks.scripts || []).length ? 120 : 12);
      d.blocks.scripts.push({ x: 12, y, blocks: [hat] });
    }, `clickblock:${Date.now()}`);
    WB.setTool('js');
    WB.toast('「클릭했을 때」 블록을 만들었어요. 그 아래에 할 일을 붙이세요', 'ok');
  }
  shadow.addEventListener('contextmenu', e => {
    if (editingId) return; // 글자 고치는 중에는 브라우저 기본 메뉴 (맞춤법 등)
    const el = hitEl(e);
    if (!el) return;
    e.preventDefault();
    if (el === page) { backgroundMenu(e.clientX, e.clientY); return; } // 페이지 바탕(빈 곳)
    const id = el.dataset.wbId;
    WB.select(id);
    elementMenu(id, e.clientX, e.clientY);
  });
  // 작업 공간의 페이지 바깥 빈 곳도
  scroller.addEventListener('contextmenu', e => {
    if (e.target !== scroller && e.target !== frame) return;
    e.preventDefault();
    backgroundMenu(e.clientX, e.clientY);
  });
  /** 바탕화면(페이지 바탕 · 바깥 빈 곳) 오른쪽 클릭: 요소와 같은 메뉴 + 맨 아래 「바탕화면 CSS」 · 「에셋 가져오기」 */
  function backgroundMenu(x, y) {
    if (!WB.canvasDoc()) return;
    WB.select('root');
    elementMenu('root', x, y);
  }
  scroller.addEventListener('click', e => {
    if (e.target === scroller || e.target === frame) WB.select(null);
  });

  shadow.addEventListener('dblclick', e => {
    const el = hitEl(e);
    if (!el || el === page) return;
    startEdit(el);
  });

  /* ---------- 글자 바로 고치기 ---------- */
  function startEdit(el) {
    const node = nodeOf(el);
    if (!node || WB.kindOf(node) !== 'text') return;
    if (node.tag === 'button' || node.tag === 'option') { WB.emit('focus-text'); return; } // 버튼 안은 위쪽 '글자' 칸에서 고침
    setHover(null);
    editingId = node.id;
    selBar.hidden = true;
    rsBox.hidden = true;
    for (let a = el; a; a = a.parentElement) a.draggable = false;
    el.setAttribute('data-wb-editing', '');
    // 고치는 동안에는 *강조* 표시를 그대로 보여 줌
    el.replaceChildren();
    fillText(el, node.text, true);
    el.contentEditable = 'plaintext-only';
    if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
    el.focus();
    const sel = shadow.getSelection ? shadow.getSelection() : document.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(range);

    const onKey = ev => {
      ev.stopPropagation();
      if (ev.key === 'Escape' || (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey))) { ev.preventDefault(); el.blur(); }
    };
    el.addEventListener('keydown', onKey);
    el.addEventListener('blur', () => {
      el.removeEventListener('keydown', onKey);
      const text = el.innerText.replace(/\n$/, '');
      editingId = null;
      if (text !== node.text) WB.setText(node.id, text);
      else render();
    }, { once: true });
  }
  WB.startEditSelected = () => {
    const id = WB.selectedId();
    const el = id && id !== 'root' && elFor(id);
    if (el) startEdit(el);
  };
  WB.isEditingText = () => !!editingId;

  /* ---------- 끌어서 놓기 ---------- */
  shadow.addEventListener('dragstart', e => {
    const el = editingId ? null : hitEl(e);
    if (!el || el === page) { e.preventDefault(); return; }
    const r = el.getBoundingClientRect();
    // gx, gy: 요소 안에서 잡은 위치 (자유 배치에서 놓을 좌표 계산용)
    WB.drag = { type: 'move', id: el.dataset.wbId, tag: nodeOf(el).tag, gx: e.clientX - r.left, gy: e.clientY - r.top };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'wb-move');
    // 아무 곳에나 놓기에서는 놓일 자리에 실제 모습을 그리므로 브라우저의 끌기 그림은 투명하게
    if (WB.anywhereMode()) e.dataTransfer.setDragImage(WB.BLANK_IMG, 0, 0);
    else e.dataTransfer.setDragImage(el, Math.min(e.clientX - r.left, 40), Math.min(e.clientY - r.top, 20));
    setHover(null);
    selBar.hidden = true;
    rsBox.hidden = true;
    requestAnimationFrame(() => el.setAttribute('data-wb-dragging', ''));
  });

  const accepts = (el, tag) => {
    const list = WB.ACCEPTS[el.tagName.toLowerCase()];
    return !list || list.includes(tag);
  };

  function isHorizontal(el) {
    const p = el.parentElement;
    if (!p) return false;
    const ps = getComputedStyle(p);
    if (ps.display.includes('flex')) return ps.flexDirection.startsWith('row');
    if (ps.display.includes('grid')) return true; // 격자는 왼쪽→오른쪽으로 채움
    const d = getComputedStyle(el).display;
    return d.startsWith('inline') || d === 'table-cell';
  }

  /** el 의 앞(before) 또는 뒤에 넣기. 부모가 그 태그를 받지 못하면 한 단계 바깥으로 */
  function beside(el, before, tag) {
    const parentEl = el.parentElement;
    if (el !== page && parentEl && !accepts(parentEl, tag) && parentEl !== page) return beside(parentEl, before, tag);
    const i = childEls(parentEl).indexOf(el);
    return { parentId: parentEl.dataset.wbId, index: before ? i : i + 1, ref: el, before, horiz: isHorizontal(el), parentEl };
  }

  const isFreeEl = el => !!el && el.getAttribute('data-layout') === 'free';
  /** 자유 배치 상자 안의 좌표 (상자 왼쪽 위 기준, 잡은 위치만큼 빼서 요소 왼쪽 위가 됨) */
  function freeDrop(box, e) {
    const r = box.getBoundingClientRect(); // 화면 위치는 확대된 크기 → 배율로 나눠 페이지 px 로
    const x = (e.clientX - r.left - (WB.drag.gx || 0)) / Z() - box.clientLeft + box.scrollLeft;
    const y = (e.clientY - r.top - (WB.drag.gy || 0)) / Z() - box.clientTop + box.scrollTop;
    return { parentId: box.dataset.wbId, free: true, x: Math.max(0, x), y: Math.max(0, y), inside: box };
  }

  /** 세로로 쌓이는 자리에서 요소의 왼쪽 · 오른쪽 끝(또는 빈 옆자리)에 오면 → 옆에 놓기 (둘을 가로 배치로 감쌈)
      outside: 요소 밖의 옆자리도 받음 (상자 안의 빈 곳에서 가장 가까운 요소를 고른 경우) */
  const NO_SIDE = new Set(['li', 'tr', 'td', 'th', 'option', 'summary', 'thead', 'tbody', 'br']);
  function sideDrop(el, x, y, outside) {
    if (!el || el === page || NO_SIDE.has(el.tagName.toLowerCase())) return null;
    const p = el.parentElement;
    if (!p || isFreeEl(p) || isHorizontal(el) || WB.ACCEPTS[p.tagName.toLowerCase()]) return null;
    if (WB.drag.type === 'move' && elFor(WB.drag.id)?.contains(el)) return null;
    const st = getComputedStyle(el);
    if (st.position === 'absolute' || st.position === 'fixed') return null;
    const r = el.getBoundingClientRect();
    if (y < r.top || y > r.bottom) return null;
    let s = null;
    if (outside) s = x < r.left ? 'left' : x > r.right ? 'right' : null;
    else {
      // 상자는 안에 넣을 자리를 남기려고 끝의 좁은 띠만, 글자 · 그림 같은 요소는 양쪽 1/4
      const zone = el.hasAttribute('data-wb-container') ? Math.min(22, r.width / 6) : Math.max(14, Math.min(r.width / 4, 120));
      const dl = x - r.left, dr = r.right - x; // 좁은 요소는 두 띠가 겹치므로 더 가까운 쪽
      s = Math.min(dl, dr) < zone ? (dl <= dr ? 'left' : 'right') : null;
    }
    if (!s) return null;
    return { side: s, refId: el.dataset.wbId, ref: el, before: s === 'left', horiz: true, parentEl: p };
  }

  /* 놓는 방식: 「아무 곳에나」(기본) 는 놓은 자리에 그대로, 「칸에 맞춰」는 위아래 · 옆 순서로. Alt 를 누르고 놓으면 반대로 */
  WB.anywhereMode = () => WB.settings.freeDrop !== false;
  const NO_FREE = new Set(['table', 'thead', 'tbody', 'tr', 'select', 'ul', 'ol', 'details', 'summary', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'button', 'label', 'span', 'strong', 'em', 'small', 'li', 'td', 'th', 'blockquote']);
  function anywhereDrop(e) {
    const moving = WB.drag.type === 'move' ? elFor(WB.drag.id) : null;
    let el = hitEl(e) || page;
    // 마우스 아래에서 가장 가까운 상자 (끌고 있는 요소 자신과 그 안은 빼고)
    while (el !== page && (!el.hasAttribute('data-wb-container') || NO_FREE.has(el.tagName.toLowerCase()) || !accepts(el, WB.drag.tag) || (moving && moving.contains(el)))) el = el.parentElement;
    const d = freeDrop(el, e);
    const z = Z(), mr = moving?.getBoundingClientRect();
    if (!moving && !WB.drag.size) WB.drag.size = measureNew(WB.drag.key, el); // 새 요소는 한 번 그려 보고 크기를 잼
    const w = mr ? mr.width / z : WB.drag.size.w, h = mr ? mr.height / z : WB.drag.size.h;
    d.anywhere = true;
    d.guides = e.shiftKey ? [] : snapDrop(d, el, moving, w, h); // Shift: 스냅 없이
    d.size = { w: mr ? w : 0, h, boxH: el.getBoundingClientRect().height / z };
    d.pw = w * z;
    d.ph = h * z;
    return d;
  }
  /** 팔레트의 새 요소가 놓였을 때의 크기 (보이지 않게 그려서 잼) */
  function measureNew(key, box) {
    const t = build(WB.paletteItem(key).make());
    Object.assign(t.style, { position: 'absolute', left: '0', top: '0', visibility: 'hidden' });
    box.append(t);
    const r = t.getBoundingClientRect();
    t.remove();
    return { w: r.width / Z(), h: r.height / Z() };
  }

  /* ---------- 스냅 (피그마처럼) ----------
     끌고 있는 요소의 왼쪽 · 가운데 · 오른쪽 (위 · 가운데 · 아래) 이 상자나 다른 요소의 끝 · 가운데에 가까우면 딱 맞추고,
     다른 요소 사이의 간격과 같아지는 자리 · 두 요소 사이의 한가운데에도 맞춤. 좌표는 상자 안의 페이지 px */
  function rectIn(c, box) {
    const r = c.getBoundingClientRect(), b = box.getBoundingClientRect(), z = Z();
    return { x: (r.left - b.left) / z - box.clientLeft + box.scrollLeft, y: (r.top - b.top) / z - box.clientTop + box.scrollTop, w: r.width / z, h: r.height / z };
  }
  const AX = { x: ['x', 'w', 'y', 'h'], y: ['y', 'h', 'x', 'w'] };
  const overlaps = (a, b, k) => { const [, , P, S] = AX[k]; return a[P] < b[P] + b[S] && a[P] + a[S] > b[P]; };
  function snapDrop(d, box, moving, w, h) {
    const th = 6 / Z(); // 화면에서 6px 안이면 붙음
    const me = { x: d.x, y: d.y, w, h };
    let sibs = childEls(box).filter(c => c !== moving).map(c => rectIn(c, box)).filter(r => r.w > 0 && r.h > 0);
    if (sibs.length > 60) sibs = sibs.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y)).slice(0, 60);
    const area = { x: 0, y: 0, w: box.clientWidth, h: Math.max(box.clientHeight, me.y + h) };
    const found = {};
    for (const k of ['x', 'y']) {
      const [P, S] = AX[k];
      let best = null;
      const offer = (pos, info) => { const dist = Math.abs(pos - me[P]); if (dist < th && (!best || dist < best.dist - 0.01)) best = { dist, pos, ...info }; };
      // 1) 끝 · 가운데 맞추기
      for (const t of [{ r: area, box: true }, ...sibs.map(r => ({ r }))])
        for (const tv of [t.r[P], t.r[P] + t.r[S] / 2, t.r[P] + t.r[S]])
          for (const off of [0, me[S] / 2, me[S]]) offer(tv - off, { type: 'align', v: tv, r: t.r, box: t.box });
      // 2) 같은 간격: 다른 요소 사이에 이미 있는 간격만큼 떨어진 자리
      const row = sibs.filter(r => overlaps(r, me, k));
      const gaps = [];
      for (const a of sibs) for (const b of sibs) if (a !== b && a[P] + a[S] <= b[P] && overlaps(a, b, k)) gaps.push({ g: b[P] - (a[P] + a[S]), a, b });
      for (const s of row) for (const g of gaps) {
        offer(s[P] + s[S] + g.g, { type: 'gap', s, g, after: true });
        offer(s[P] - g.g - me[S], { type: 'gap', s, g, after: false });
      }
      // 3) 두 요소 사이의 한가운데 (양쪽 간격이 같게)
      for (const a of row) for (const b of row) {
        const free = b[P] - (a[P] + a[S]) - me[S];
        if (free > 0) offer(a[P] + a[S] + free / 2, { type: 'mid', a, b, g: free / 2 });
      }
      if (best) { me[P] = best.pos; found[k] = best; }
    }
    d.x = Math.max(0, Math.round(me.x));
    d.y = Math.max(0, Math.round(me.y));
    me.x = d.x;
    me.y = d.y;
    return guidesFor(me, sibs, area, found);
  }
  /** 안내선: 맞춘 선(빨강), 같은 간격 표시, 그리고 위 · 아래 · 왼쪽 · 오른쪽으로 가장 가까운 것까지의 거리 */
  function guidesFor(me, sibs, area, found) {
    const g = [];
    const line = (x1, y1, x2, y2, label, kind) => g.push({ x1, y1, x2, y2, label, kind });
    const cx = me.x + me.w / 2, cy = me.y + me.h / 2;
    for (const k of ['x', 'y']) {
      const f = found[k];
      if (!f) continue;
      const [P, S, Q, T] = AX[k];
      if (f.type === 'align') {
        const lo = f.box ? area[Q] : Math.min(me[Q], f.r[Q]), hi = f.box ? area[Q] + area[T] : Math.max(me[Q] + me[T], f.r[Q] + f.r[T]);
        k === 'x' ? line(f.v, lo, f.v, hi, '', 'align') : line(lo, f.v, hi, f.v, '', 'align');
      } else {
        // 간격 표시: 같은 길이의 구간들에 같은 숫자
        const seg = (a0, a1, across, len) => (k === 'x' ? line(a0, across, a1, across, len, 'gap') : line(across, a0, across, a1, len, 'gap'));
        const mid = r => r[Q] + r[T] / 2;
        const len = Math.round(f.g.g ?? f.g);
        if (f.type === 'gap') {
          if (f.after) seg(f.s[P] + f.s[S], me[P], (Math.max(me[Q], f.s[Q]) + Math.min(me[Q] + me[T], f.s[Q] + f.s[T])) / 2, len);
          else seg(me[P] + me[S], f.s[P], (Math.max(me[Q], f.s[Q]) + Math.min(me[Q] + me[T], f.s[Q] + f.s[T])) / 2, len);
          seg(f.g.a[P] + f.g.a[S], f.g.b[P], (mid(f.g.a) + mid(f.g.b)) / 2, len);
        } else {
          seg(f.a[P] + f.a[S], me[P], k === 'x' ? cy : cx, len);
          seg(me[P] + me[S], f.b[P], k === 'x' ? cy : cx, len);
        }
      }
    }
    // 거리: 네 방향으로 가장 가까운 요소(없으면 상자 끝)까지
    if (!found.x || found.x.type === 'align') {
      const left = sibs.filter(r => overlaps(r, me, 'x') && r.x + r.w <= me.x + 0.5).reduce((m, r) => Math.max(m, r.x + r.w), area.x);
      const right = sibs.filter(r => overlaps(r, me, 'x') && r.x >= me.x + me.w - 0.5).reduce((m, r) => Math.min(m, r.x), area.x + area.w);
      if (me.x - left > 0.5) line(left, cy, me.x, cy, Math.round(me.x - left), 'dist');
      if (right - me.x - me.w > 0.5) line(me.x + me.w, cy, right, cy, Math.round(right - me.x - me.w), 'dist');
    }
    if (!found.y || found.y.type === 'align') {
      const top = sibs.filter(r => overlaps(r, me, 'y') && r.y + r.h <= me.y + 0.5).reduce((m, r) => Math.max(m, r.y + r.h), area.y);
      const below = sibs.filter(r => overlaps(r, me, 'y') && r.y >= me.y + me.h - 0.5).reduce((m, r) => Math.min(m, r.y), Infinity);
      if (me.y - top > 0.5) line(cx, top, cx, me.y, Math.round(me.y - top), 'dist');
      if (below < Infinity && below - me.y - me.h > 0.5) line(cx, me.y + me.h, cx, below, Math.round(below - me.y - me.h), 'dist');
    }
    return g;
  }
  const snapLayer = WB.h('div', { class: 'snap-layer', hidden: true });
  scroller.append(snapLayer);
  function drawGuides(box, guides) {
    snapLayer.replaceChildren();
    if (!box || !guides?.length) { snapLayer.hidden = true; return; }
    const b = box.getBoundingClientRect(), s = scroller.getBoundingClientRect(), z = Z();
    const X = v => b.left - s.left + scroller.scrollLeft + (v + box.clientLeft - box.scrollLeft) * z;
    const Y = v => b.top - s.top + scroller.scrollTop + (v + box.clientTop - box.scrollTop) * z;
    for (const gd of guides) {
      const x1 = X(gd.x1), x2 = X(gd.x2), y1 = Y(gd.y1), y2 = Y(gd.y2);
      const vert = Math.abs(x1 - x2) < 0.5;
      snapLayer.append(WB.h('div', { class: 'sg sg-' + gd.kind + (vert ? ' v' : ' h'), style: vert
        ? `left:${x1}px;top:${Math.min(y1, y2)}px;height:${Math.abs(y2 - y1)}px`
        : `left:${Math.min(x1, x2)}px;top:${y1}px;width:${Math.abs(x2 - x1)}px` }));
      if (gd.label !== '' && gd.label != null)
        snapLayer.append(WB.h('div', { class: 'sg-label sg-' + gd.kind, style: `left:${(x1 + x2) / 2}px;top:${(y1 + y2) / 2}px` }, String(gd.label)));
    }
    snapLayer.hidden = false;
  }

  /** 슬라이드를 끌 때: 언제나 페이지 바로 아래, 마우스에 가까운 슬라이드의 앞 · 뒤 */
  const isSlideEl = el => !!el?.hasAttribute?.('data-slide');
  function slideDrag() {
    const d = WB.drag;
    return d.type === 'new' ? !!WB.paletteItem(d.key)?.slide : isSlideEl(elFor(d.id));
  }
  function slideDrop(e) {
    const slides = childEls(page).filter(isSlideEl);
    if (!slides.length) return { parentId: 'root', index: childEls(page).length, inside: page };
    let ref = slides[slides.length - 1], before = false;
    for (const s of slides) {
      const r = s.getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) { ref = s; before = true; break; }
    }
    const i = childEls(page).indexOf(ref);
    return { parentId: 'root', index: before ? i : i + 1, ref, before, horiz: false, parentEl: page };
  }

  function computeDrop(e) {
    if (slideDrag()) return slideDrop(e);
    if (WB.anywhereMode() !== !!e.altKey) return anywhereDrop(e);
    const d = computeFlowDrop(e);
    // 결과가 자유 배치 상자 안이면 순서 대신 좌표로 놓기
    if (d && !d.free && d.parentId !== 'root' && isFreeEl(elFor(d.parentId))) return freeDrop(elFor(d.parentId), e);
    return d;
  }

  function computeFlowDrop(e) {
    const drag = WB.drag;
    const x = e.clientX, y = e.clientY;
    let el = hitEl(e) || page;
    if (drag.type === 'move') {
      const moving = elFor(drag.id);
      if (moving && moving.contains(el)) {
        // 자기 자신 위: 자유 배치 안이면 자리만 옮기기, 아니면 그대로
        return isFreeEl(moving.parentElement) ? freeDrop(moving.parentElement, e) : null;
      }
    }
    if (isFreeEl(el) && accepts(el, drag.tag)) return freeDrop(el, e);
    const side = sideDrop(el, x, y, false);
    if (side) return side;
    const r = el.getBoundingClientRect();
    if (el.hasAttribute('data-wb-container') && accepts(el, drag.tag)) {
      if (el !== page && !isFreeEl(el.parentElement)) {
        const horiz = isHorizontal(el);
        const size = horiz ? r.width : r.height;
        const edge = Math.min(10, size / 4);
        const lead = horiz ? x - r.left : y - r.top;
        const trail = horiz ? r.right - x : r.bottom - y;
        if (lead < edge) return beside(el, true, drag.tag);
        if (trail < edge) return beside(el, false, drag.tag);
      }
      const kids = childEls(el);
      if (!kids.length) return { parentId: el.dataset.wbId, index: 0, inside: el };
      // 가장 가까운 자식 요소를 기준으로 앞/뒤 결정
      let best = null, bestD = Infinity, bi = 0;
      kids.forEach((k, i) => {
        const kr = k.getBoundingClientRect();
        const dx = Math.max(kr.left - x, 0, x - kr.right);
        const dy = Math.max(kr.top - y, 0, y - kr.bottom);
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = k; bi = i; }
      });
      const kr = best.getBoundingClientRect();
      const nextTo = sideDrop(best, x, y, true); // 폭이 좁은 요소의 빈 옆자리
      if (nextTo) return nextTo;
      const horiz = isHorizontal(best);
      const before = horiz ? x < kr.left + kr.width / 2 : y < kr.top + kr.height / 2;
      return { parentId: el.dataset.wbId, index: before ? bi : bi + 1, ref: best, before, horiz, parentEl: el };
    }
    const horiz = isHorizontal(el);
    const before = horiz ? x < r.left + r.width / 2 : y < r.top + r.height / 2;
    return beside(el, before, drag.tag);
  }

  let marked = [];
  function clearMarks() {
    marked.forEach(([el, attr]) => el.removeAttribute(attr));
    marked = [];
  }
  function mark(el, attr) {
    if (!el || el === page) return;
    el.setAttribute(attr, '');
    marked.push([el, attr]);
  }
  /* 아무 곳에나 놓기의 미리보기: 끄는 요소의 실제 모습을 놓일 자리(스냅된 자리)에 그대로 그림.
     브라우저가 그리는 끌기 그림은 투명하게 해서 두 개가 겹쳐 보이지 않게 */
  let ghost = null;
  function showGhost(d) {
    if (!d) { ghost?.remove(); ghost = null; return; }
    if (!ghost) {
      const moving = WB.drag.type === 'move' ? elFor(WB.drag.id) : null;
      ghost = moving ? moving.cloneNode(true) : build(WB.paletteItem(WB.drag.key).make());
      [ghost, ...ghost.querySelectorAll('[data-wb-id]')].forEach(x => { x.removeAttribute('data-wb-id'); x.removeAttribute('data-wb-selected'); x.removeAttribute('data-wb-dragging'); x.removeAttribute('data-wb-hover'); x.draggable = false; });
      ghost.setAttribute('data-wb-ghost', '');
      Object.assign(ghost.style, { position: 'absolute', margin: '0', right: 'auto', bottom: 'auto', pointerEvents: 'none', zIndex: '99999', boxSizing: 'border-box' });
      if (moving) ghost.style.width = moving.getBoundingClientRect().width / Z() + 'px'; // 흐름에서 꺼내도 지금 폭 그대로 보이게
      page.append(ghost);
    }
    // 상자 안의 좌표 → 페이지 안의 좌표
    const z = Z(), b = d.inside.getBoundingClientRect(), p = page.getBoundingClientRect();
    ghost.style.left = (b.left - p.left) / z - page.clientLeft + page.scrollLeft + d.x + d.inside.clientLeft - d.inside.scrollLeft + 'px';
    ghost.style.top = (b.top - p.top) / z - page.clientTop + page.scrollTop + d.y + d.inside.clientTop - d.inside.scrollTop + 'px';
  }
  function showDrop(d) {
    clearMarks();
    if (!d?.anywhere) { drawGuides(null); showGhost(null); }
    if (!d) { dropLine.hidden = true; return; }
    if (d.anywhere) {
      mark(d.inside, 'data-wb-drop-parent');
      dropLine.hidden = true;
      showGhost(d);
      drawGuides(d.inside, d.guides);
      return;
    }
    if (d.inside) {
      dropLine.hidden = true;
      mark(d.inside, 'data-wb-drop');
      return;
    }
    mark(d.parentEl, 'data-wb-drop-parent');
    const r = d.ref.getBoundingClientRect();
    const s = scroller.getBoundingClientRect();
    const ox = scroller.scrollLeft - s.left, oy = scroller.scrollTop - s.top;
    Object.assign(dropLine.style, d.horiz
      ? { left: (d.before ? r.left : r.right) + ox - 2 + 'px', top: r.top + oy + 'px', width: '4px', height: r.height + 'px' }
      : { left: r.left + ox + 'px', top: (d.before ? r.top : r.bottom) + oy - 2 + 'px', width: r.width + 'px', height: '4px' });
    dropLine.hidden = false;
  }
  function endDrag() {
    clearMarks();
    drawGuides(null);
    showGhost(null);
    dropLine.hidden = true;
    shadow.querySelectorAll('[data-wb-dragging]').forEach(e => e.removeAttribute('data-wb-dragging'));
    WB.drag = null;
    positionBar();
  }

  scroller.addEventListener('dragenter', e => { if (WB.drag) e.preventDefault(); });
  scroller.addEventListener('dragover', e => {
    if (!WB.drag || !WB.canvasDoc()) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = WB.drag.type === 'move' ? 'move' : 'copy';
    showDrop(computeDrop(e));
  });
  scroller.addEventListener('dragleave', e => {
    if (!e.relatedTarget || !scroller.contains(e.relatedTarget)) { clearMarks(); drawGuides(null); showGhost(null); dropLine.hidden = true; }
  });
  scroller.addEventListener('drop', e => {
    if (!WB.drag) return;
    e.preventDefault();
    const drag = WB.drag;
    const d = computeDrop(e);
    endDrag();
    if (!d) return;
    if (d.anywhere) {
      // 아무 곳에나: 놓은 자리에 그대로
      const node = drag.type === 'new' ? WB.paletteItem(drag.key).make() : drag.id;
      WB.placeAnywhere(node, d.parentId, d.x, d.y, d.size);
      WB.select(typeof node === 'string' ? node : node.id);
      return;
    }
    if (d.side) {
      // 옆에 놓기: 세로로 쌓이던 자리를 가로 배치로 바꿔서 나란히
      const node = drag.type === 'new' ? WB.paletteItem(drag.key).make() : drag.id;
      WB.placeBeside(node, d.refId, d.side);
      WB.select(typeof node === 'string' ? node : node.id);
      return;
    }
    if (drag.type === 'new') {
      const node = WB.paletteItem(drag.key).make();
      if (d.free) WB.placeFree(node, d.parentId, d.x, d.y);
      else WB.insertNode(node, d.parentId, d.index);
      WB.select(node.id);
    } else if (d.free) {
      // 오른쪽 · 아래 기준으로 놓인 요소는 그 기준을 지킴
      const st = WB.find(WB.canvasDoc().root, drag.id).node.style;
      const box = elFor(d.parentId), me = elFor(drag.id);
      const anchor = {};
      if (box && me && st.right) anchor.right = box.clientWidth - d.x - me.offsetWidth;
      if (box && me && st.bottom) anchor.bottom = box.clientHeight - d.y - me.offsetHeight;
      WB.placeFree(drag.id, d.parentId, d.x, d.y, anchor);
      WB.select(drag.id);
    } else {
      WB.moveNode(drag.id, d.parentId, d.index);
      WB.select(drag.id);
    }
  });
  document.addEventListener('dragend', () => { if (WB.drag || marked.length) endDrag(); });
  shadow.addEventListener('dragend', endDrag);

  /* ---------- 기기 크기 · 연결 ---------- */
  const DEVICE_W = { desktop: '', tablet: '768px', mobile: '390px' };
  WB.applyDevice = () => {
    const wide = WB.settings.device === 'wide'; // 실제 PC 화면처럼 1280px 고정 (좁으면 옆으로 스크롤)
    frame.style.maxWidth = DEVICE_W[WB.settings.device] || '';
    frame.style.width = wide ? '1280px' : '';
    frame.style.flexShrink = wide ? '0' : '';
    frame.style.alignSelf = wide ? 'flex-start' : '';
    frame.classList.toggle('is-mobile', WB.settings.device === 'mobile' || WB.settings.device === 'tablet');
    frame.style.zoom = Z() === 1 ? '' : String(Z());
    render(); // 휴대폰 보기에서는 휴대폰 전용 스타일이 적용되므로 다시 그림
    WB.emit('device');
    requestAnimationFrame(positionBar);
  };
  WB.renderCanvas = render;
  WB.canvasEl = id => elFor(id); // 슬라이드 목록의 작은 그림용
  /** 요소 위치 · 크기 (페이지 px — 확대 배율을 뺀 값) */
  WB.measureEl = id => {
    const r = elFor(id)?.getBoundingClientRect();
    if (!r) return null;
    const z = Z();
    return { left: r.left / z, top: r.top / z, right: r.right / z, bottom: r.bottom / z, width: r.width / z, height: r.height / z };
  };
  /** 상자 안 자식들의 지금 화면 위치 (자유 배치로 바꿀 때 제자리를 지키려고 씀) */
  WB.measureChildren = id => {
    const box = elFor(id);
    if (!box) return [];
    const r = box.getBoundingClientRect();
    return childEls(box).map(c => {
      const cr = c.getBoundingClientRect();
      return { id: c.dataset.wbId, x: Math.round((cr.left - r.left) / Z() - box.clientLeft), y: Math.round((cr.top - r.top) / Z() - box.clientTop), w: Math.round(cr.width / Z()) };
    });
  };

  /* ---------- 눈금자 + 여백 보기 ----------
     위 · 왼쪽 눈금자: 페이지 왼쪽 위가 0, 10px 마다 눈금, 100px 마다 숫자. 고른 요소의 범위와 마우스 위치를 표시
     고른 요소 위에: 바깥 여백(margin) 주황 · 안쪽 여백(padding) 초록 — 브라우저 개발자 도구처럼 */
  const RULER = 20;
  const docBody = scroller.parentElement;
  const rx = WB.h('canvas', { class: 'ruler ruler-x' });
  const ry = WB.h('canvas', { class: 'ruler ruler-y' });
  const corner = WB.h('div', { class: 'ruler-corner', title: '눈금자 단위: px (페이지 왼쪽 위가 0)' }, 'px');
  docBody.append(rx, ry, corner);
  const ov = WB.h('div', { class: 'box-ov', hidden: true }, WB.h('div', { class: 'ov-m' }), WB.h('div', { class: 'ov-p' }), WB.h('div', { class: 'ov-label' }));
  scroller.append(ov);
  let mouse = null, rulerQueued = false;
  const rulersOn = () => !!WB.settings.rulers;

  function drawRuler(cv, horizontal, origin, band) {
    const dpr = devicePixelRatio || 1;
    const w = cv.clientWidth, ht = cv.clientHeight;
    if (!w || !ht) return;
    cv.width = w * dpr;
    cv.height = ht * dpr;
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cs = getComputedStyle(cv);
    g.fillStyle = cs.backgroundColor;
    g.fillRect(0, 0, w, ht);
    const len = horizontal ? w : ht;
    if (band) {
      g.fillStyle = 'rgba(37, 99, 235, 0.28)';
      if (horizontal) g.fillRect(band[0], 0, band[1] - band[0], ht);
      else g.fillRect(0, band[0], w, band[1] - band[0]);
    }
    g.strokeStyle = g.fillStyle = cs.color;
    g.font = '9px ' + getComputedStyle(document.body).fontFamily;
    g.beginPath();
    const z = Z(), step = z < 0.5 ? 20 : 10; // 줄여 보면 눈금을 성기게
    const major = z < 0.5 ? 200 : 100;
    for (let v = Math.floor(-origin / z / step) * step; v * z + origin <= len; v += step) {
      const p = Math.round(v * z + origin) + 0.5;
      const t = v % major === 0 ? RULER : v % (major / 2) === 0 ? 8 : 4; // 눈금 길이
      if (horizontal) { g.moveTo(p, RULER); g.lineTo(p, RULER - t); } else { g.moveTo(RULER, p); g.lineTo(RULER - t, p); }
      if (v % major === 0) {
        if (horizontal) g.fillText(String(v), p + 3, 9);
        else { g.save(); g.translate(9, p + 3); g.rotate(-Math.PI / 2); g.textAlign = 'right'; g.fillText(String(v), 0, 0); g.restore(); }
      }
    }
    g.stroke();
    if (mouse) {
      // 마우스 위치
      const p = Math.round((horizontal ? mouse.x : mouse.y) - (horizontal ? cv.getBoundingClientRect().left : cv.getBoundingClientRect().top)) + 0.5;
      g.strokeStyle = '#ef4444';
      g.beginPath();
      if (horizontal) { g.moveTo(p, 0); g.lineTo(p, ht); } else { g.moveTo(0, p); g.lineTo(w, p); }
      g.stroke();
    }
  }
  function drawRulers() {
    rulerQueued = false;
    docBody.classList.toggle('has-rulers', rulersOn());
    if (!rulersOn() || scroller.hidden) return;
    const pr = page.getBoundingClientRect(), xr = rx.getBoundingClientRect(), yr = ry.getBoundingClientRect();
    const id = WB.selectedId();
    const el = id && id !== 'root' && !editingId && elFor(id);
    const r = el && el.getBoundingClientRect();
    drawRuler(rx, true, pr.left - xr.left, r && [r.left - xr.left, r.right - xr.left]);
    drawRuler(ry, false, pr.top - yr.top, r && [r.top - yr.top, r.bottom - yr.top]);
    const z = Z();
    corner.title = r ? `고른 요소: 가로 ${Math.round((r.left - pr.left) / z)}px 위치, 폭 ${Math.round(r.width / z)}px · 세로 ${Math.round((r.top - pr.top) / z)}px 위치, 높이 ${Math.round(r.height / z)}px` : '눈금자 단위: px (페이지 왼쪽 위가 0)';
  }
  const queueRulers = () => { if (!rulerQueued) { rulerQueued = true; requestAnimationFrame(drawRulers); } };

  /** 고른 요소의 바깥 여백 · 안쪽 여백을 색으로 */
  function drawSpacing() {
    const id = WB.selectedId();
    const el = rulersOn() && id && id !== 'root' && !editingId && elFor(id);
    ov.hidden = !el;
    if (!el) return;
    const cs = getComputedStyle(el);
    const z = Z();
    const px = k => (parseFloat(cs[k]) || 0) * z; // 화면에 그릴 때는 확대된 크기로
    const m = [px('marginTop'), px('marginRight'), px('marginBottom'), px('marginLeft')];
    const b = [px('borderTopWidth'), px('borderRightWidth'), px('borderBottomWidth'), px('borderLeftWidth')];
    const p = [px('paddingTop'), px('paddingRight'), px('paddingBottom'), px('paddingLeft')];
    const r = el.getBoundingClientRect(), s = scroller.getBoundingClientRect();
    const x = r.left - s.left + scroller.scrollLeft, y = r.top - s.top + scroller.scrollTop;
    const [om, op, label] = ov.children;
    Object.assign(om.style, { left: x - m[3] + 'px', top: y - m[0] + 'px', width: r.width + m[1] + m[3] + 'px', height: r.height + m[0] + m[2] + 'px', borderWidth: m.map(v => Math.max(0, v) + 'px').join(' ') });
    Object.assign(op.style, { left: x + b[3] + 'px', top: y + b[0] + 'px', width: r.width - b[1] - b[3] + 'px', height: r.height - b[0] - b[2] + 'px', borderWidth: p.map(v => v + 'px').join(' ') });
    const short = a => (a.every(v => v === a[0]) ? String(a[0]) : a[0] === a[2] && a[1] === a[3] ? `${a[0]} ${a[1]}` : a.join(' '));
    const real = a => a.map(v => Math.round(v / z)); // 글자로는 페이지 px
    label.textContent = `${Math.round(r.width / z)} × ${Math.round(r.height / z)} · 바깥 여백 ${short(real(m))} · 안쪽 여백 ${short(real(p))}`;
    Object.assign(label.style, { left: x + 'px', top: y + r.height + Math.max(0, m[2]) + 2 + 'px' });
  }
  function applyRulers() {
    drawSpacing();
    queueRulers();
  }
  scroller.addEventListener('scroll', queueRulers);
  scroller.addEventListener('pointermove', e => { if (rulersOn()) { mouse = { x: e.clientX, y: e.clientY }; queueRulers(); } });
  scroller.addEventListener('pointerleave', () => { mouse = null; queueRulers(); });
  new ResizeObserver(queueRulers).observe(scroller);
  WB.on('rulers', applyRulers);
  WB.on('device', () => requestAnimationFrame(applyRulers));

  /* ---------- 확대 · 축소 (Ctrl + 마우스 휠, 탭3 위쪽 버튼) ---------- */
  WB.setZoom = z => {
    if (z === 'fit') {
      // 페이지 폭이 작업 공간에 꼭 맞게
      frame.style.zoom = '';
      // 페이지보다 넓은 슬라이드(1280px)가 있으면 그것까지 다 보이게
      const wide = Math.max(frame.offsetWidth, page.scrollWidth + (parseFloat(getComputedStyle(page).paddingLeft) || 0));
      z = Math.min(1, (scroller.clientWidth - 24) / Math.max(1, wide));
    }
    WB.settings.zoom = Math.round(Math.max(0.25, Math.min(2, z)) * 100) / 100;
    WB.saveSettings();
    frame.style.zoom = Z() === 1 ? '' : String(Z());
    WB.emit('zoom', Z());
    requestAnimationFrame(() => { positionBar(); applyRulers(); });
  };
  scroller.addEventListener('wheel', e => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    WB.setZoom(Z() * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
  }, { passive: false });

  WB.on('change', render);
  WB.on('doc', () => { render(); renderCrumbs(); });
  WB.on('select', () => (WB.editVariant() === 'hover' ? render() : applySelection())); // 마우스 올림 미리보기는 고른 요소에만
  WB.on('reveal', id => elFor(id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  WB.on('layout', () => requestAnimationFrame(positionBar));
  new ResizeObserver(() => positionBar()).observe(frame);
  shadow.addEventListener('load', () => positionBar(), true); // 이미지가 늦게 열리면 위치 다시 계산
})();
