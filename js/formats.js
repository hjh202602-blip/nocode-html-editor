'use strict';
/* 탭4 의 「형식」 · 「구조」 보기
   형식: 함께 쓰는 모양(class) 목록 — 카드 누르면 고른 요소에 입히기, 요소 이름(id) 목록
   구조: 페이지 요소를 나무 모양으로 (피그마의 레이어 목록처럼) */
(() => {
  const { h, esc } = WB;
  const panel = WB.$('#tab4');
  const fmtBody = panel.querySelector('.fmt-body');
  const treeBody = panel.querySelector('.tree-body');
  let mode = 'tags';

  /** 한 줄 묻기 창 → 글자 (취소하면 null) */
  WB.ask = (title, value = '', placeholder = '', okLabel = '확인', sub = '') => new Promise(resolve => {
    const input = h('input', { type: 'text', value, placeholder, spellcheck: 'false', style: 'width:100%;height:32px' });
    let done = false;
    const finish = (close, v) => { if (done) return; done = true; close(); resolve(v); };
    const m = WB.modal({
      title, sub, content: input,
      actions: [
        { label: '취소', onClick: close => finish(close, null) },
        { label: okLabel, primary: true, onClick: close => finish(close, input.value.trim() || null) },
      ],
    });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') finish(m.close, input.value.trim() || null); });
    setTimeout(() => { input.focus(); input.select(); });
  });

  const classesOf = n => (n.attrs?.class || '').split(/\s+/).filter(Boolean);
  const goTo = id => { WB.select(id); WB.emit('reveal', id); };
  /** 같은 이름의 요소를 차례로 고름 */
  function cycle(list) {
    if (!list.length) return WB.toast('이 이름을 쓰는 요소가 아직 없어요');
    const i = list.findIndex(n => n.id === WB.selectedId());
    goTo(list[(i + 1) % list.length].id);
  }
  async function askFormatName(doc, title, value = '') {
    const name = await WB.ask(title, value, '예: 카드, 제목, main-button', '확인', '한글 · 영문 · 숫자 · - · _ 를 쓸 수 있어요 (띄어쓰기 없이, 숫자로 시작하지 않게)');
    if (!name) return null;
    if (!WB.FORMAT_NAME.test(name)) { WB.toast('이름에 띄어쓰기나 기호는 쓸 수 없어요', 'error'); return null; }
    if (name !== value && (Object.hasOwn(doc.formats || {}, name) || WB.formatMembers(doc, name).length)) { WB.toast(`'${name}' 은(는) 이미 쓰고 있는 이름이에요`, 'error'); return null; }
    return name;
  }
  /** 고른 요소의 모양으로 새 형식 만들기 (탭2 에서도 씀) */
  WB.formatCreateAsk = async () => {
    const doc = WB.canvasDoc(), sel = WB.selectedNode();
    if (!doc || !sel) return WB.toast('먼저 캔버스에서 본보기가 될 요소를 고르세요');
    const name = await askFormatName(doc, '새 형식 이름');
    if (!name) return;
    WB.formatCreate(name, sel.id);
    WB.toast(`형식 '${name}' 을(를) 만들었어요. 다른 요소를 고르고 이 형식을 누르면 같은 모양이 돼요`, 'ok');
  };

  /* ---------- 형식 보기 ---------- */
  const PREVIEW_SKIP = new Set(['margin', 'display', 'flex-direction', 'gap', 'grid-template-columns', 'white-space', 'flex-wrap', 'transition', 'rotate']);
  function preview(look) {
    const p = h('span', { class: 'fmt-prev' }, '가나 Aa');
    for (const [k, v] of Object.entries(look?.style || {})) if (!PREVIEW_SKIP.has(k)) { try { p.style.setProperty(k, v); } catch { /* 무시 */ } }
    return h('span', { class: 'fmt-prev-box' }, p);
  }
  function blockUses(doc, type, value) {
    let n = 0;
    (doc.blocks?.scripts || []).forEach(s => s.blocks.forEach(b => WB.walkBlock(b, x => {
      for (const [k, spec] of Object.entries(WB.BLOCK_DEFS[x.type]?.args || {})) if (spec.type === type && x.args[k] === value) n++;
    })));
    return n;
  }

  function renderFormats() {
    const doc = WB.canvasDoc();
    fmtBody.innerHTML = '';
    if (!doc) { fmtBody.append(h('div', { class: 'pal-empty' }, 'HTML 페이지를 열면 쓸 수 있어요.')); return; }
    const sel = WB.selectedNode();
    const selFmt = sel ? WB.formatOf(doc, sel) : '';
    const counts = new Map(), ids = [];
    WB.walk(doc.root, n => {
      if (n.id === 'root') return;
      for (const c of classesOf(n)) counts.set(c, (counts.get(c) || 0) + 1);
      if (n.attrs.id) ids.push(n);
    });
    const fmts = Object.entries(doc.formats || {});

    // 형식 카드
    const cards = h('div', { class: 'fmt-cards' });
    for (const [name, look] of fmts) {
      const n = WB.formatMembers(doc, name).length;
      const card = h('div', { class: 'fmt-card' + (name === selFmt ? ' on' : ''), 'data-fmt': name, title: sel && name !== selFmt ? '누르면 고른 요소에 이 형식을 입혀요' : '누르면 이 형식을 쓰는 요소를 차례로 골라요' },
        preview(look),
        h('span', { class: 'fmt-name' }, '.' + name),
        h('span', { class: 'fmt-count' }, n ? `요소 ${n}개` : '쓰는 요소 없음'),
        h('button', { class: 'fmt-more', 'data-more': name, title: '이름 바꾸기 · 풀기' }, '⋯'));
      cards.append(card);
    }
    const add = h('button', { class: 'fmt-add', 'data-act': 'new', disabled: !sel || null, title: sel ? '고른 요소의 모양을 형식으로 저장해요' : '먼저 캔버스에서 요소를 고르세요' }, '＋ 고른 요소로 새 형식');
    cards.append(add);
    const plain = [...counts.keys()].filter(c => !Object.hasOwn(doc.formats || {}, c)).sort();
    const colA = h('div', { class: 'fmt-col' },
      h('div', { class: 'fmt-head' }, h('b', {}, '형식'), h('span', {}, '같은 형식을 쓰는 요소는 모양(색 · 글자 · 테두리 · 여백)이 함께 바뀌어요. 크기와 위치는 요소마다 따로예요.')),
      cards);
    if (plain.length) {
      const chips = h('div', { class: 'fmt-chips' });
      for (const c of plain) chips.append(h('button', { class: 'fmt-chip', 'data-plain': c, title: '누르면 이 이름표가 붙은 요소를 차례로 골라요 · 오른쪽 클릭: 형식으로 만들기' }, '.' + c, h('i', {}, String(counts.get(c)))));
      colA.append(h('div', { class: 'fmt-head sub' }, h('b', {}, '이름표'), h('span', {}, '묶어 부르기만 하는 이름 (모양은 따로). 블록의 「이름표 ~ 요소」에서 써요.')), chips);
    }

    // 요소 이름 (id)
    const list = h('div', { class: 'fmt-ids' });
    for (const n of ids) {
      const uses = blockUses(doc, 'el', n.attrs.id);
      list.append(h('div', { class: 'fmt-id' + (n.id === sel?.id ? ' on' : ''), 'data-node': n.id },
        h('span', { class: 'chip chip-id' }, '#' + n.attrs.id),
        h('span', { class: 'fmt-id-label' }, WB.labelOf(n) + (n.text ? ` "${n.text.trim().slice(0, 16)}"` : '')),
        uses ? h('span', { class: 'fmt-id-use', title: '이 이름을 쓰는 블록 수' }, `블록 ${uses}`) : '',
        h('button', { 'data-idedit': n.attrs.id, title: '이름 바꾸기' }, '✎'),
        h('button', { 'data-iddel': n.attrs.id, title: '이름 지우기' }, '×')));
    }
    if (!ids.length) list.append(h('div', { class: 'pal-empty' }, '아직 이름 붙인 요소가 없어요. 블록에서 요소를 고르면 자동으로 붙어요.'));
    const addId = h('button', { class: 'fmt-add', 'data-act': 'newid', disabled: !sel || !!sel?.attrs.id || null }, '＋ 고른 요소에 이름 붙이기');
    const colB = h('div', { class: 'fmt-col ids' },
      h('div', { class: 'fmt-head' }, h('b', {}, '요소 이름 (id)'), h('span', {}, '요소 하나만 가리키는 이름. 블록 · 「#이름」 링크에서 써요.')),
      list, addId);
    fmtBody.append(colA, colB);
  }

  fmtBody.addEventListener('click', async e => {
    const doc = WB.canvasDoc();
    if (!doc) return;
    const t = e.target;
    const more = t.closest('[data-more]')?.dataset.more;
    if (more) return formatMenu(more, e.clientX, e.clientY);
    const act = t.closest('[data-act]')?.dataset.act;
    if (act === 'new') return WB.formatCreateAsk();
    if (act === 'newid') {
      const sel = WB.selectedNode();
      const name = sel && await WB.ask('요소 이름 (id)', '', '예: login-button', '붙이기', '영문 · 숫자 · - · _ (페이지에서 하나뿐인 이름)');
      if (!name) return;
      if (!/^[A-Za-z][\w-]*$/.test(name)) return WB.toast('영문으로 시작하고 영문 · 숫자 · - · _ 만 쓸 수 있어요', 'error');
      let dup = false;
      WB.walk(doc.root, n => { if (n.attrs?.id === name) dup = true; });
      if (dup) return WB.toast(`'${name}' 은(는) 이미 있는 이름이에요`, 'error');
      return WB.setAttr(sel.id, 'id', name);
    }
    const card = t.closest('[data-fmt]')?.dataset.fmt;
    if (card) {
      const sel = WB.selectedNode();
      if (sel && WB.formatOf(doc, sel) !== card) {
        WB.formatApply(card, sel.id);
        return WB.toast(`형식 '${card}' 을(를) 입혔어요`, 'ok');
      }
      return cycle(WB.formatMembers(doc, card));
    }
    const plain = t.closest('[data-plain]')?.dataset.plain;
    if (plain) {
      const list = [];
      WB.walk(doc.root, n => { if (n.id !== 'root' && classesOf(n).includes(plain)) list.push(n); });
      return cycle(list);
    }
    const idEdit = t.closest('[data-idedit]')?.dataset.idedit;
    if (idEdit) {
      const name = await WB.ask('요소 이름 바꾸기', idEdit, '', '바꾸기', '블록과 #링크에서 쓰는 곳도 함께 바뀌어요');
      if (!name || name === idEdit) return;
      if (!/^[A-Za-z][\w-]*$/.test(name)) return WB.toast('영문으로 시작하고 영문 · 숫자 · - · _ 만 쓸 수 있어요', 'error');
      let dup = false;
      WB.walk(doc.root, n => { if (n.attrs?.id === name) dup = true; });
      if (dup) return WB.toast(`'${name}' 은(는) 이미 있는 이름이에요`, 'error');
      return WB.idRename(idEdit, name);
    }
    const idDel = t.closest('[data-iddel]')?.dataset.iddel;
    if (idDel) {
      const uses = blockUses(doc, 'el', idDel);
      if (uses && !confirm(`블록 ${uses}곳에서 이 이름을 쓰고 있어요. 지우면 그 블록은 요소를 찾지 못해요. 지울까요?`)) return;
      return WB.idRename(idDel, null);
    }
    const row = t.closest('[data-node]')?.dataset.node;
    if (row) goTo(row);
  });
  fmtBody.addEventListener('contextmenu', e => {
    const card = e.target.closest('[data-fmt]')?.dataset.fmt, plain = e.target.closest('[data-plain]')?.dataset.plain;
    if (!card && !plain) return;
    e.preventDefault();
    if (card) formatMenu(card, e.clientX, e.clientY);
    else plainMenu(plain, e.clientX, e.clientY);
  });

  function formatMenu(name, x, y) {
    const doc = WB.canvasDoc(), sel = WB.selectedNode();
    const items = [{ label: '쓰는 요소 차례로 고르기', icon: 'file', action: () => cycle(WB.formatMembers(doc, name)) }];
    if (sel && WB.formatOf(doc, sel) !== name) items.push({ label: '고른 요소에 입히기', icon: 'copy', action: () => WB.formatApply(name, sel.id) });
    if (sel && WB.formatOf(doc, sel) === name) items.push({ label: '고른 요소만 이 형식에서 떼기', icon: 'copy', action: () => WB.formatDetach(sel.id) });
    items.push('sep',
      { label: '이름 바꾸기', icon: 'edit', action: async () => { const to = await askFormatName(doc, '형식 이름 바꾸기', name); if (to && to !== name) WB.classRename(name, to); } },
      { label: '형식 풀기 (요소 모양은 그대로)', icon: 'trash', danger: true, action: () => WB.formatRemove(name) });
    WB.menu(x, y, items);
  }
  function plainMenu(name, x, y) {
    const doc = WB.canvasDoc();
    WB.menu(x, y, [
      { label: '형식으로 만들기 (모양을 함께 쓰기)', icon: 'copy', action: () => {
        if (!WB.FORMAT_NAME.test(name)) return WB.toast('이 이름은 형식으로 쓸 수 없어요', 'error');
        const list = WB.formatMembers(doc, name);
        if (!list.length) return WB.toast('이 이름표가 맨 앞에 붙은 요소가 없어요', 'error');
        const key = WB.lookKey(WB.lookOf(list[0]));
        const diff = list.filter(n => WB.lookKey(WB.lookOf(n)) !== key).length;
        if (diff && !confirm(`모양이 다른 요소 ${diff}개가 첫 요소의 모양으로 맞춰져요. 계속할까요?`)) return;
        WB.commit(d => { d.formats = { ...(d.formats || {}), [name]: JSON.parse(JSON.stringify(WB.lookOf(WB.formatMembers(d, name)[0]))) }; }, `fmt:${Date.now()}`);
      } },
      { label: '이름 바꾸기', icon: 'edit', action: async () => { const to = await askFormatName(doc, '이름표 이름 바꾸기', name); if (to && to !== name) WB.classRename(name, to); } },
    ]);
  }

  /* ---------- 구조 보기 (레이어) ---------- */
  const closed = new Set(); // 접어 둔 요소 id
  function renderTree() {
    const doc = WB.canvasDoc();
    treeBody.innerHTML = '';
    if (!doc) { treeBody.append(h('div', { class: 'pal-empty' }, 'HTML 페이지를 열면 쓸 수 있어요.')); return; }
    const selId = doc.selectedId;
    const onPath = new Set((selId && selId !== 'root' ? WB.pathTo(doc.root, selId) : []).map(n => n.id));
    const frag = document.createDocumentFragment();
    const row = (n, depth) => {
      const kids = n.children || [];
      // 아이가 아주 많은 요소(큰 표 등)는 고른 요소가 안에 있을 때만 펼침
      const open = kids.length && !closed.has(n.id) && (kids.length <= 40 || onPath.has(n.id) || closed.has('open:' + n.id));
      const r = h('div', { class: 'tree-row' + (n.id === selId ? ' on' : ''), 'data-node': n.id, style: `padding-left:${6 + depth * 14}px` });
      r.innerHTML = `<span class="tw" data-tw="${kids.length ? n.id : ''}">${kids.length ? (open ? '▾' : '▸') : ''}</span><span class="tree-name">${esc(WB.labelOf(n))}</span>` +
        (n.text ? `<span class="tree-text">${esc(n.text.trim().slice(0, 24))}</span>` : '') +
        (n.attrs?.id ? `<span class="chip chip-id">#${esc(n.attrs.id)}</span>` : '') +
        classesOf(n).slice(0, 2).map(c => `<span class="chip ${Object.hasOwn(doc.formats || {}, c) ? 'chip-fmt' : 'chip-cls'}">.${esc(c)}</span>`).join('') +
        (kids.length && !open ? `<span class="tree-count">${kids.length}</span>` : '');
      frag.append(r);
      if (open) for (const c of kids) row(c, depth + 1);
    };
    row(doc.root, 0);
    treeBody.append(frag);
    treeBody.querySelector('.tree-row.on')?.scrollIntoView({ block: 'nearest' });
  }
  treeBody.addEventListener('click', e => {
    const tw = e.target.closest('[data-tw]')?.dataset.tw;
    if (tw) {
      const doc = WB.canvasDoc();
      const big = (WB.find(doc.root, tw)?.node || doc.root).children.length > 40;
      const key = big ? 'open:' + tw : tw;
      if (closed.has(key)) closed.delete(key); else closed.add(key);
      return renderTree();
    }
    const id = e.target.closest('[data-node]')?.dataset.node;
    if (id) goTo(id);
  });

  /* ---------- 보기 바꾸기 ---------- */
  function refresh() {
    if (mode === 'formats') renderFormats();
    else if (mode === 'tree') renderTree();
  }
  WB.setPaletteMode = m => {
    mode = m;
    panel.dataset.mode = m;
    panel.querySelectorAll('[data-pm]').forEach(b => b.classList.toggle('on', b.dataset.pm === m));
    panel.querySelector('.pal-body').hidden = m !== 'tags';
    fmtBody.hidden = m !== 'formats';
    treeBody.hidden = m !== 'tree';
    refresh();
  };
  panel.querySelector('.pal-mode').addEventListener('click', e => {
    const b = e.target.closest('[data-pm]');
    if (b) WB.setPaletteMode(b.dataset.pm);
  });
  let timer;
  const later = () => { clearTimeout(timer); timer = setTimeout(refresh, 60); };
  WB.on('change', later);
  WB.on('select', later);
  WB.on('doc', later);
})();
