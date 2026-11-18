'use strict';
/* 「HTML 태그」 안의 「슬라이드」 보기: 발표 슬라이드를 작은 그림으로 차례대로 보여 줌
   누르면 그 슬라이드로 · ↑ ↓ 순서 · 복제 · 삭제, 위쪽에서 새 슬라이드 · 발표하기 · PDF 로 저장 */
(() => {
  const { h, esc, icon } = WB;
  const panel = WB.$('#tab4');
  const body = panel.querySelector('.slides-body');
  const THUMB_W = 168;
  const isSlide = n => n?.attrs?.['data-slide'] != null;
  const slidesOf = doc => (doc ? doc.root.children.filter(isSlide) : []);

  /** 캔버스에 그려진 슬라이드를 복사해 작게 줄임 (편집기 표시 · id 는 지움) */
  function thumb(doc, node) {
    const src = WB.canvasEl(node.id);
    const box = h('div', { class: 'sl-thumb' });
    if (!src) return box;
    const w = src.offsetWidth || 1280, hh = src.offsetHeight || 720;
    const k = THUMB_W / w;
    const c = src.cloneNode(true);
    [c, ...c.querySelectorAll('*')].forEach(x => {
      for (const a of [...x.attributes]) if (a.name.startsWith('data-wb')) x.removeAttribute(a.name);
      x.removeAttribute('draggable');
    });
    Object.assign(c.style, { margin: '0', boxShadow: 'none', transform: `scale(${k})`, transformOrigin: '0 0', pointerEvents: 'none' });
    const inner = h('div', { class: 'sl-thumb-in' });
    // 페이지 글꼴 · 글자색을 이어받게
    const rs = WB.mergedStyle(doc.root);
    for (const p of ['font-family', 'color', 'line-height']) if (rs[p]) inner.style.setProperty(p, rs[p]);
    inner.append(c);
    box.style.height = Math.round(hh * k) + 'px';
    box.append(inner);
    return box;
  }

  function render() {
    const doc = WB.canvasDoc();
    body.innerHTML = '';
    if (!doc) { body.append(h('div', { class: 'pal-empty' }, 'HTML 페이지를 열면 쓸 수 있어요.')); return; }
    const slides = slidesOf(doc);
    const cur = WB.slideOf(doc, WB.selectedId());
    const head = h('div', { class: 'sl-head' },
      h('button', { class: 'btn small', 'data-act': 'add', title: '지금 슬라이드 뒤에 새 슬라이드 (틀 고르기)' }, '＋ 새 슬라이드'),
      h('button', { class: 'btn small primary', 'data-act': 'play', disabled: !slides.length || null, title: '새 창에서 발표 (← → 넘기기 · F 전체 화면 · N 발표자 메모 · Esc 모두 보기)' }, '▶ 발표하기'),
      h('button', { class: 'btn small', 'data-act': 'pdf', disabled: !slides.length || null, title: '새 창에서 인쇄 창을 열어요. 「대상: PDF로 저장」을 고르세요 (한 장에 한 슬라이드)' }, 'PDF'));
    body.append(head);
    if (!slides.length) {
      body.append(h('div', { class: 'sl-empty' },
        h('p', {}, '아직 슬라이드가 없어요.'),
        h('p', {}, '「＋ 새 슬라이드」로 표지 · 제목+본문 · 차트 같은 틀을 고르거나, 「HTML 태그」의 「슬라이드」 묶음에서 끌어오세요. 슬라이드 안의 요소는 놓은 자리에 그대로 놓여요.')));
      return;
    }
    const list = h('div', { class: 'sl-list' });
    slides.forEach((s, i) => {
      const row = h('div', { class: 'sl-row' + (s === cur ? ' on' : ''), 'data-slide-id': s.id, title: s.attrs['data-notes'] ? '발표자 메모: ' + s.attrs['data-notes'] : '' },
        h('span', { class: 'sl-no' }, String(i + 1)),
        thumb(doc, s),
        h('div', { class: 'sl-acts' },
          h('button', { 'data-sa': 'up', title: '앞으로', disabled: !i || null }, '↑'),
          h('button', { 'data-sa': 'down', title: '뒤로', disabled: i === slides.length - 1 || null }, '↓'),
          h('button', { 'data-sa': 'dup', title: '복제' }, '⧉'),
          h('button', { 'data-sa': 'play', title: '이 장부터 발표' }, '▶'),
          h('button', { 'data-sa': 'del', title: '삭제' }, '×')));
      list.append(row);
    });
    body.append(list);
    list.querySelector('.sl-row.on')?.scrollIntoView({ block: 'nearest' });
  }

  /** 슬라이드 틀 고르기 메뉴 */
  function addMenu(x, y) {
    const items = WB.PALETTE.find(g => g.cat === '슬라이드').items.filter(it => it.slide);
    WB.menu(x, y, items.map(it => ({ label: it.name + ' — ' + it.desc, action: () => WB.addFromPalette(it.key) })));
  }

  body.addEventListener('click', e => {
    const doc = WB.canvasDoc();
    if (!doc) return;
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'add') { const r = e.target.closest('button').getBoundingClientRect(); return addMenu(r.left, r.bottom + 2); }
    if (act === 'play') return WB.preview('#' + (slidesOf(doc).indexOf(WB.slideOf(doc, WB.selectedId())) + 1 || 1));
    if (act === 'pdf') return WB.preview('#print');
    const row = e.target.closest('[data-slide-id]');
    if (!row) return;
    const id = row.dataset.slideId;
    const sa = e.target.closest('[data-sa]')?.dataset.sa;
    if (sa === 'up' || sa === 'down') {
      // 슬라이드끼리 순서 바꾸기 (사이의 다른 요소는 건너뜀)
      const slides = slidesOf(doc), i = slides.findIndex(s => s.id === id), other = slides[i + (sa === 'up' ? -1 : 1)];
      if (!other) return;
      WB.commit(d => {
        const a = d.root.children.findIndex(n => n.id === id), b = d.root.children.findIndex(n => n.id === other.id);
        [d.root.children[a], d.root.children[b]] = [d.root.children[b], d.root.children[a]];
      }, `slide-move:${Date.now()}`);
    } else if (sa === 'dup') WB.duplicateNode(id);
    else if (sa === 'del') {
      if (!confirm(`${slidesOf(doc).findIndex(s => s.id === id) + 1}번째 슬라이드를 지울까요? (Ctrl+Z 로 되돌릴 수 있어요)`)) return;
      WB.removeNode(id);
    } else if (sa === 'play') WB.preview('#' + (slidesOf(doc).findIndex(s => s.id === id) + 1));
    else { WB.select(id); WB.emit('reveal', id); }
  });

  WB.renderSlides = render;
  let timer;
  const later = () => {
    if (body.hidden) return;
    clearTimeout(timer);
    timer = setTimeout(render, 250); // 고칠 때마다 다시 그리지 않고 잠깐 멈췄을 때
  };
  WB.on('change', later);
  WB.on('select', later);
  WB.on('doc', later);
})();
