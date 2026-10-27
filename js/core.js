'use strict';
/* 블록 웹 편집기 — 공용 상태 · 문서 모델 · 실행 취소 · 작은 도구 */
const WB = (window.WB = {});

/* ---------- DOM 도구 ---------- */
WB.$ = (sel, root = document) => root.querySelector(sel);
WB.$$ = (sel, root = document) => [...root.querySelectorAll(sel)];
WB.h = function (tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
  return el;
};
WB.esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
WB.extOf = name => (name.includes('.') ? name.split('.').pop().toLowerCase() : '');

const ICONS = {
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  filePlus: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 11v6M9 14h6"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  folderOpen: '<path d="M3 17V7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v1"/><path d="M3 19l2.6-7.4A2 2 0 0 1 7.5 10H21l-2.7 7.7a2 2 0 0 1-1.9 1.3H3z"/>',
  folderPlus: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 10v6M9 13h6"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.4-5.7L20 8.5"/><path d="M20 3.5v5h-5"/>',
  collapse: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12h8"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  monitor: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  tablet: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M11 18h2"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  guides: '<rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 3"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
  settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  code: '<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  down: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  parent: '<path d="M9 14l-4-4 4-4"/><path d="M5 10h11a4 4 0 0 1 4 4v6"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
  alignL: '<path d="M4 6h16M4 12h10M4 18h13"/>',
  alignC: '<path d="M4 6h16M7 12h10M5.5 18h13"/>',
  alignR: '<path d="M4 6h16M10 12h10M7 18h13"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
};
WB.icon = (name, size = 16) =>
  `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;

/* ---------- 이벤트 ---------- */
const listeners = {};
WB.on = (ev, fn) => (listeners[ev] ||= []).push(fn);
WB.emit = (ev, data) => (listeners[ev] || []).forEach(fn => fn(data));

/* ---------- 태그 정보 ---------- */
const KIND = {};
'div section header footer nav main article aside form ul ol table thead tbody tr select figure body'
  .split(' ').forEach(t => (KIND[t] = 'container'));
'img input hr br video audio iframe textarea'.split(' ').forEach(t => (KIND[t] = 'void'));
/** container = 안에 다른 요소를 담음, text = 글자를 담음, void = 아무것도 담지 않음 */
WB.kindOf = tag => KIND[tag] || 'text';
/** 특정 태그 안에는 정해진 태그만 넣을 수 있음 */
WB.ACCEPTS = { select: ['option'], table: ['thead', 'tbody', 'tr'], thead: ['tr'], tbody: ['tr'], tr: ['td', 'th'] };

WB.TAG_LABEL = {
  body: '페이지', h1: '큰 제목', h2: '중간 제목', h3: '작은 제목', h4: '제목 4', h5: '제목 5', h6: '제목 6',
  p: '문단', span: '짧은 글자', strong: '굵은 글자', em: '기울임 글자', blockquote: '인용문', small: '작은 글자',
  div: '상자', section: '구역', header: '머리말', footer: '꼬리말', nav: '메뉴 영역', main: '본문', article: '글 묶음',
  aside: '곁 내용', figure: '그림 묶음', hr: '구분선', br: '줄바꿈', a: '링크', button: '버튼', img: '이미지',
  video: '동영상', audio: '오디오', iframe: '웹페이지 삽입', ul: '글머리 목록', ol: '번호 목록', li: '목록 항목',
  table: '표', thead: '표 머리', tbody: '표 본문', tr: '표 줄', td: '표 칸', th: '표 제목 칸',
  form: '입력 양식', input: '입력칸', textarea: '여러 줄 입력', select: '선택 목록', option: '선택 항목', label: '라벨',
};
const INPUT_LABEL = { checkbox: '체크박스', radio: '라디오 버튼', password: '비밀번호 칸', email: '이메일 칸', number: '숫자 칸', date: '날짜 칸', submit: '제출 버튼', color: '색 고르기', range: '슬라이더' };
WB.labelOf = node => {
  if (!node) return '';
  if (node.id === 'root') return '페이지';
  if (WB.isFree(node)) return '자유 배치';
  if (node.tag === 'div' && (node.style.display || '').includes('flex'))
    return node.style['flex-direction'] === 'column' ? '세로 배치' : '가로 배치';
  if (node.tag === 'input') return INPUT_LABEL[node.attrs.type] || '입력칸';
  return WB.TAG_LABEL[node.tag] || node.tag;
};

/* ---------- 문서 모델 ----------
   node = { id, tag, attrs:{}, style:{}, children:[] | text:'' }
   style 은 CSS 속성 이름(케밥 표기) → 값 */
let idSeq = 0;
WB.newId = () => 'e' + ++idSeq;

WB.makeNode = (tag, opts = {}) => {
  const node = { id: WB.newId(), tag, attrs: { ...(opts.attrs || {}) }, style: { ...(opts.style || {}) } };
  const kind = WB.kindOf(tag);
  if (kind === 'container') node.children = opts.children || [];
  else if (kind === 'text') node.text = opts.text ?? '';
  return node;
};

WB.DEFAULT_PAGE_STYLE = {
  margin: '0',
  padding: '24px',
  'font-family': "'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif",
  'line-height': '1.6',
  color: '#222222',
  'background-color': '#ffffff',
};
WB.newRoot = () => ({ id: 'root', tag: 'body', attrs: {}, style: { ...WB.DEFAULT_PAGE_STYLE }, children: [] });

WB.find = function find(node, id, parent = null) {
  if (node.id === id) return { node, parent, index: parent ? parent.children.indexOf(node) : -1 };
  for (const c of node.children || []) {
    const r = find(c, id, node);
    if (r) return r;
  }
  return null;
};
WB.pathTo = (root, id) => {
  const out = [];
  const walk = n => {
    out.push(n);
    if (n.id === id) return true;
    for (const c of n.children || []) if (walk(c)) return true;
    out.pop();
    return false;
  };
  return walk(root) ? out : [];
};
WB.walk = (node, fn) => {
  fn(node);
  (node.children || []).forEach(c => WB.walk(c, fn));
};
/** 저장해 둔 문서를 불러올 때 id 가 겹치지 않도록 새로 매김 */
WB.reId = root => {
  WB.walk(root, n => { if (n.id !== 'root') n.id = WB.newId(); });
  return root;
};
/** 요소를 통째로 복사 (복사본은 모두 새 id) */
WB.cloneNode = node => {
  const copy = JSON.parse(JSON.stringify(node));
  WB.walk(copy, x => (x.id = WB.newId()));
  return copy;
};

/* ---------- 열린 문서들 ---------- */
let docSeq = 0;
WB.state = { docs: [], activeId: null };
WB.newDocId = () => 'd' + ++docSeq;
WB.newPageDoc = opts => ({
  id: WB.newDocId(),
  kind: 'page',
  name: opts.name,
  handle: opts.handle || null,
  path: opts.path ?? null,
  title: opts.title ?? opts.name.replace(/\.html?$/i, ''),
  root: opts.root || WB.newRoot(),
  blocks: opts.blocks || { scripts: [] }, // 탭5 블록 코딩
  selectedId: null,
  dirty: false,
  undo: [],
  redo: [],
  lastKey: null,
  lastTime: 0,
});
WB.activeDoc = () => WB.state.docs.find(d => d.id === WB.state.activeId) || null;
WB.canvasDoc = () => {
  const d = WB.activeDoc();
  return d && d.kind === 'page' ? d : null;
};
WB.dirPathOf = doc => (doc.path == null ? null : doc.path.split('/').slice(0, -1).join('/'));

/* ---------- 선택 ---------- */
WB.selectedId = () => WB.canvasDoc()?.selectedId || null;
WB.selectedNode = () => {
  const doc = WB.canvasDoc();
  if (!doc || !doc.selectedId) return null;
  return WB.find(doc.root, doc.selectedId)?.node || null;
};
WB.select = id => {
  const doc = WB.canvasDoc();
  if (!doc) return;
  doc.selectedId = id;
  WB.emit('select', id);
};

/* ---------- 변경 · 실행 취소 ----------
   같은 key 로 1.2초 안에 이어지는 변경(색 고르기, 글자 입력 등)은 한 번의 실행 취소로 묶음 */
const snapshot = doc => JSON.stringify({ title: doc.title, root: doc.root, blocks: doc.blocks });
WB.commit = function (mutate, key) {
  const doc = WB.canvasDoc();
  if (!doc) return;
  const now = Date.now();
  if (!(key && key === doc.lastKey && now - doc.lastTime < 1200)) {
    doc.undo.push(snapshot(doc));
    if (doc.undo.length > 200) doc.undo.shift();
    doc.redo = [];
  }
  doc.lastKey = key || null;
  doc.lastTime = now;
  mutate(doc);
  doc.dirty = true;
  WB.emit('change', doc);
};
function travel(from, to) {
  const doc = WB.canvasDoc();
  if (!doc || !doc[from].length) return;
  doc[to].push(snapshot(doc));
  const s = JSON.parse(doc[from].pop());
  doc.title = s.title;
  doc.root = s.root;
  doc.blocks = s.blocks || { scripts: [] };
  doc.lastKey = null;
  doc.dirty = true;
  if (doc.selectedId && !WB.find(doc.root, doc.selectedId)) doc.selectedId = null;
  WB.emit('change', doc);
  WB.emit('select', doc.selectedId);
}
WB.undo = () => travel('undo', 'redo');
WB.redo = () => travel('redo', 'undo');

const nodeIn = (doc, id) => WB.find(doc.root, id)?.node;

WB.insertNode = (node, parentId, index) =>
  WB.commit(doc => {
    const p = nodeIn(doc, parentId);
    p.children.splice(index ?? p.children.length, 0, node);
  });

WB.moveNode = (id, parentId, index) => {
  const doc = WB.canvasDoc();
  if (!doc || id === 'root') return;
  const src = WB.find(doc.root, id);
  if (!src || WB.find(src.node, parentId)) return; // 자기 자신 안으로는 옮길 수 없음
  if (src.parent.id === parentId && (index === src.index || index === src.index + 1)) return; // 제자리
  WB.commit(d => {
    const s = WB.find(d.root, id);
    s.parent.children.splice(s.index, 1);
    let i = index;
    if (s.parent.id === parentId && s.index < i) i--;
    const target = nodeIn(d, parentId);
    if (!WB.isFree(target)) unfree(s.node); // 자유 배치 상자에서 꺼내면 원래 흐름으로
    target.children.splice(i, 0, s.node);
  });
};

/* ---------- 자유 배치 상자: 안의 요소를 좌표(left/top)로 놓음 ---------- */
WB.isFree = node => node?.attrs?.['data-layout'] === 'free';
const unfree = n => {
  if (n.style.position !== 'absolute') return;
  delete n.style.position;
  delete n.style.left;
  delete n.style.top;
};
WB.unfree = unfree;
/** node(새 요소) 또는 id(있는 요소)를 자유 배치 상자 parentId 안의 (x, y)에 놓음. 맨 앞으로 올라옴 */
WB.placeFree = (nodeOrId, parentId, x, y) => {
  const doc = WB.canvasDoc();
  if (!doc) return;
  if (typeof nodeOrId === 'string') {
    const src = WB.find(doc.root, nodeOrId);
    if (!src || src.node.id === parentId || WB.find(src.node, parentId)) return;
  }
  WB.commit(d => {
    let n = nodeOrId;
    if (typeof nodeOrId === 'string') {
      const f = WB.find(d.root, nodeOrId);
      f.parent.children.splice(f.index, 1);
      n = f.node;
    }
    Object.assign(n.style, { position: 'absolute', left: Math.round(x) + 'px', top: Math.round(y) + 'px' });
    nodeIn(d, parentId).children.push(n);
  });
};

WB.removeNode = id => {
  const doc = WB.canvasDoc();
  if (!doc || id === 'root') return;
  WB.commit(d => {
    const f = WB.find(d.root, id);
    if (f) f.parent.children.splice(f.index, 1);
  });
  if (doc.selectedId && !WB.find(doc.root, doc.selectedId)) WB.select(null);
};

WB.duplicateNode = id => {
  const doc = WB.canvasDoc();
  if (!doc || id === 'root') return;
  const f = WB.find(doc.root, id);
  const copy = WB.cloneNode(f.node);
  if (copy.style.position === 'absolute') {
    // 자유 배치에서는 겹치지 않게 조금 비켜서 놓음
    copy.style.left = (parseFloat(copy.style.left) || 0) + 16 + 'px';
    copy.style.top = (parseFloat(copy.style.top) || 0) + 16 + 'px';
  }
  WB.insertNode(copy, f.parent.id, f.index + 1);
  WB.select(copy.id);
};

WB.moveSibling = (id, dir) => {
  const doc = WB.canvasDoc();
  const f = doc && WB.find(doc.root, id);
  if (!f || !f.parent) return;
  const j = f.index + dir;
  if (j < 0 || j >= f.parent.children.length) return;
  WB.commit(d => {
    const g = WB.find(d.root, id);
    const arr = g.parent.children;
    [arr[g.index], arr[j]] = [arr[j], arr[g.index]];
  });
};

WB.setStyle = (id, prop, value, key) =>
  WB.commit(doc => {
    const n = nodeIn(doc, id);
    if (value === '' || value == null) delete n.style[prop];
    else n.style[prop] = value;
  }, key || `style:${id}:${prop}`);

WB.setStyles = (id, obj, key) =>
  WB.commit(doc => {
    const n = nodeIn(doc, id);
    for (const [k, v] of Object.entries(obj)) {
      if (v === '' || v == null) delete n.style[k];
      else n.style[k] = v;
    }
  }, key);

WB.setAttr = (id, name, value, key) =>
  WB.commit(doc => {
    const n = nodeIn(doc, id);
    if (value == null) delete n.attrs[name];
    else n.attrs[name] = value;
  }, key || `attr:${id}:${name}`);

WB.setText = (id, text, key) =>
  WB.commit(doc => {
    nodeIn(doc, id).text = text;
  }, key || `text:${id}`);

/* ---------- 설정 (브라우저에 기억) ---------- */
WB.load = (key, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v && typeof v === 'object' && !Array.isArray(fallback) ? { ...fallback, ...v } : v ?? fallback;
  } catch {
    return fallback;
  }
};
WB.store = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* 저장 공간이 없으면 무시 */ }
};
WB.settings = WB.load('wb.settings', { theme: 'dark', guides: true, device: 'desktop' });
WB.saveSettings = () => WB.store('wb.settings', WB.settings);

/* ---------- 알림 · 메뉴 · 모달 ---------- */
let toastTimer;
WB.toast = (msg, type = '') => {
  const t = WB.$('#toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = 'toast ' + type), 2400);
};

WB.download = (name, text, type = 'text/html') => {
  const url = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
  const a = WB.h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** items: [{ label, icon, kbd, danger, action } | 'sep'] */
WB.menu = (x, y, items) => {
  const m = WB.$('#ctx-menu');
  m.innerHTML = '';
  for (const it of items) {
    if (it === 'sep') { m.append(WB.h('div', { class: 'sep' })); continue; }
    const b = WB.h('button', { class: it.danger ? 'danger' : '' });
    b.innerHTML = `${it.icon ? WB.icon(it.icon, 14) : '<span style="width:14px"></span>'}<span>${WB.esc(it.label)}</span>${it.kbd ? `<kbd>${it.kbd}</kbd>` : ''}`;
    b.onclick = () => { close(); it.action(); };
    m.append(b);
  }
  m.hidden = false;
  const r = m.getBoundingClientRect();
  m.style.left = Math.min(x, innerWidth - r.width - 6) + 'px';
  m.style.top = Math.min(y, innerHeight - r.height - 6) + 'px';
  const close = () => {
    m.hidden = true;
    removeEventListener('mousedown', outside, true);
    removeEventListener('keydown', esc, true);
    removeEventListener('blur', close);
  };
  const outside = e => { if (!m.contains(e.target)) close(); };
  const esc = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  setTimeout(() => {
    addEventListener('mousedown', outside, true);
    addEventListener('keydown', esc, true);
    addEventListener('blur', close);
  });
};

/** 모달 창. content 는 노드, actions 는 [{ label, primary, icon, onClick(close) }] */
WB.modal = ({ title, sub, content, actions = [], wide = false, bodyClass = '', note = '' }) => {
  const overlay = WB.h('div', { class: 'modal-overlay' });
  const box = WB.h('div', { class: 'modal' + (wide ? ' wide' : '') });
  const head = WB.h('div', { class: 'modal-head' }, WB.h('h3', {}, title), sub ? WB.h('span', { class: 'sub' }, sub) : null);
  const x = WB.h('button', { class: 'icon-btn', title: '닫기', html: WB.icon('x') });
  head.append(x);
  const body = WB.h('div', { class: 'modal-body ' + bodyClass }, content);
  const foot = WB.h('div', { class: 'modal-foot' });
  if (note) foot.append(WB.h('span', { class: 'note' }, note));
  foot.append(WB.h('span', { class: 'spacer' }));
  const close = () => {
    overlay.remove();
    removeEventListener('keydown', onKey, true);
  };
  for (const a of actions) {
    const b = WB.h('button', { class: 'btn' + (a.primary ? ' primary' : ''), html: (a.icon ? WB.icon(a.icon, 15) : '') + WB.esc(a.label) });
    b.onclick = () => a.onClick(close, b);
    foot.append(b);
  }
  box.append(head, body, foot);
  overlay.append(box);
  const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  x.onclick = close;
  overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(); });
  addEventListener('keydown', onKey, true);
  WB.$('#modal-root').append(overlay);
  return { close, body, box };
};
