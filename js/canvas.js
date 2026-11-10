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
      content: '아래 「HTML 태그」에서 요소를 클릭하거나 이곳으로 끌어다 놓으세요';
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

  function positionBar() {
    const id = WB.selectedId();
    const el = id && id !== 'root' && elFor(id);
    WB.emit('rulers'); // 눈금자 · 여백 보기도 함께 다시 그림
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
    e.dataTransfer.setDragImage(el, Math.min(e.clientX - r.left, 40), Math.min(e.clientY - r.top, 20));
    setHover(null);
    selBar.hidden = true;
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

  function computeDrop(e) {
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
  function showDrop(d) {
    clearMarks();
    if (!d) { dropLine.hidden = true; return; }
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
    if (!e.relatedTarget || !scroller.contains(e.relatedTarget)) { clearMarks(); dropLine.hidden = true; }
  });
  scroller.addEventListener('drop', e => {
    if (!WB.drag) return;
    e.preventDefault();
    const drag = WB.drag;
    const d = computeDrop(e);
    endDrag();
    if (!d) return;
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
      z = Math.min(1, (scroller.clientWidth - 24) / Math.max(1, frame.offsetWidth));
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
