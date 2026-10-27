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
    .wb-page { flex: 1; position: relative; }
    .wb-page:empty::before {
      content: '아래 「HTML 태그」에서 요소를 클릭하거나 이곳으로 끌어다 놓으세요';
      display: flex; align-items: center; justify-content: center; height: 220px; padding: 16px;
      border: 2px dashed #c9d1dc; border-radius: 10px; color: #8a96a8; text-align: center;
      font: 14px 'Malgun Gothic', sans-serif;
    }
    [data-wb-container]:not(.wb-page):empty { min-height: 48px; }
    [data-wb-container]:not(.wb-page):not(select):empty::before {
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
  `;
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>${CANVAS_CSS}</style><div class="wb-page" data-wb-id="root" data-wb-container></div>`;
  const page = shadow.querySelector('.wb-page');

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
  function fillText(el, text) {
    (text || '').split('\n').forEach((line, i) => {
      if (i) el.append(document.createElement('br'));
      el.append(line);
    });
  }
  function build(node) {
    const el = document.createElement(node.tag);
    el.setAttribute('data-wb-id', node.id);
    for (const [k, v] of Object.entries(node.attrs || {})) {
      if (/^on/i.test(k)) continue;
      try { el.setAttribute(k, v); } catch { /* 잘못된 속성 이름은 무시 */ }
    }
    applyStyle(el, node.style);
    const kind = WB.kindOf(node.tag);
    if (kind === 'container') {
      el.setAttribute('data-wb-container', '');
      for (const c of node.children) el.append(build(c));
    } else if (kind === 'text') fillText(el, node.text);
    if (NOPTR.has(node.tag)) el.setAttribute('data-wb-noptr', '');
    el.draggable = true;
    return el;
  }

  function render() {
    const doc = WB.canvasDoc();
    if (!doc || editingId) return;
    page.removeAttribute('style');
    applyStyle(page, doc.root.style);
    page.replaceChildren(...doc.root.children.map(build));
    page.draggable = true;
    page.toggleAttribute('data-wb-guides', !!WB.settings.guides);
    hoverEl = null;
    resolveAssets(doc);
    applySelection();
  }

  /** 열린 폴더 안의 상대 경로 이미지(images/a.png 등)를 캔버스에서 볼 수 있게 연결 */
  function resolveAssets(doc) {
    const dir = WB.dirPathOf(doc);
    if (dir == null || !WB.explorer?.root) return;
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
    <button data-act="del" title="삭제 (Delete)">${icon('trash', 14)}</button>`;
  const selName = selBar.querySelector('.sel-name');

  function positionBar() {
    const id = WB.selectedId();
    const el = id && id !== 'root' && elFor(id);
    if (!el || editingId) { selBar.hidden = true; return; }
    const node = nodeOf(el);
    selName.innerHTML = `${WB.esc(WB.labelOf(node))}<code>&lt;${node.tag}&gt;</code>`;
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
    if (!node || WB.kindOf(node.tag) !== 'text') return;
    if (node.tag === 'button' || node.tag === 'option') { WB.emit('focus-text'); return; } // 버튼 안은 위쪽 '글자' 칸에서 고침
    setHover(null);
    editingId = node.id;
    selBar.hidden = true;
    for (let a = el; a; a = a.parentElement) a.draggable = false;
    el.setAttribute('data-wb-editing', '');
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
    if (ps.display.includes('grid')) return false;
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
    const r = box.getBoundingClientRect();
    const x = e.clientX - r.left - box.clientLeft + box.scrollLeft - (WB.drag.gx || 0);
    const y = e.clientY - r.top - box.clientTop + box.scrollTop - (WB.drag.gy || 0);
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
      WB.placeFree(drag.id, d.parentId, d.x, d.y);
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
    frame.style.maxWidth = DEVICE_W[WB.settings.device] || '';
    requestAnimationFrame(positionBar);
  };
  WB.renderCanvas = render;
  /** 상자 안 자식들의 지금 화면 위치 (자유 배치로 바꿀 때 제자리를 지키려고 씀) */
  WB.measureChildren = id => {
    const box = elFor(id);
    if (!box) return [];
    const r = box.getBoundingClientRect();
    return childEls(box).map(c => {
      const cr = c.getBoundingClientRect();
      return { id: c.dataset.wbId, x: Math.round(cr.left - r.left - box.clientLeft), y: Math.round(cr.top - r.top - box.clientTop), w: Math.round(cr.width) };
    });
  };

  WB.on('change', render);
  WB.on('doc', () => { render(); renderCrumbs(); });
  WB.on('select', applySelection);
  WB.on('reveal', id => elFor(id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  WB.on('layout', () => requestAnimationFrame(positionBar));
  new ResizeObserver(() => positionBar()).observe(frame);
  shadow.addEventListener('load', () => positionBar(), true); // 이미지가 늦게 열리면 위치 다시 계산
})();
