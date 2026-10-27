'use strict';
/* 탭4 — HTML 태그 모음: 종류별로 묶어서 보여주고, 클릭하거나 끌어서 캔버스에 넣음 */
(() => {
  const { h, esc } = WB;
  const N = WB.makeNode;

  const IMG_PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">' +
    '<rect width="320" height="200" fill="#e5e9f0"/><path d="M110 140l40-48 30 34 20-22 30 36z" fill="#b8c1cf"/>' +
    '<circle cx="205" cy="74" r="14" fill="#b8c1cf"/></svg>');

  const li = t => N('li', { text: t });
  const cell = (tag, t) => N(tag, { text: t, style: { border: '1px solid #cccccc', padding: '8px 12px' } });

  WB.PALETTE = [
    { cat: '텍스트', color: '#4c97ff', items: [
      { key: 'h1', name: '큰 제목', icon: 'H1', desc: '페이지에서 가장 중요한 제목', make: () => N('h1', { text: '큰 제목' }) },
      { key: 'h2', name: '중간 제목', icon: 'H2', desc: '구역의 제목', make: () => N('h2', { text: '중간 제목' }) },
      { key: 'h3', name: '작은 제목', icon: 'H3', desc: '작은 묶음의 제목', make: () => N('h3', { text: '작은 제목' }) },
      { key: 'p', name: '문단', icon: '¶', desc: '여러 줄의 글', make: () => N('p', { text: '여기에 내용을 입력하세요. 두 번 클릭하면 글자를 고칠 수 있어요.' }) },
      { key: 'span', name: '짧은 글자', icon: 'T', desc: '한 줄 안에 들어가는 짧은 글자', make: () => N('span', { text: '짧은 글자' }) },
      { key: 'strong', name: '굵은 글자', icon: 'B', desc: '중요해서 굵게 보이는 글자', make: () => N('strong', { text: '중요한 글자' }) },
      { key: 'blockquote', name: '인용문', icon: '❝', desc: '다른 곳에서 가져온 말', make: () => N('blockquote', { text: '인용할 문장을 입력하세요.', style: { 'border-left': '4px solid #cbd5e1', padding: '8px 16px', margin: '16px 0', color: '#555555' } }) },
    ] },
    { cat: '레이아웃', color: '#9966ff', items: [
      { key: 'div', name: '상자', icon: '▢', desc: '여러 요소를 담는 기본 상자', make: () => N('div', { style: { padding: '16px' } }) },
      { key: 'row', name: '가로 배치', icon: '⇆', desc: '안에 넣은 요소를 옆으로 나란히', make: () => N('div', { style: { display: 'flex', 'flex-direction': 'row', gap: '12px', padding: '8px' } }) },
      { key: 'col', name: '세로 배치', icon: '⇅', desc: '안에 넣은 요소를 위아래로', make: () => N('div', { style: { display: 'flex', 'flex-direction': 'column', gap: '12px', padding: '8px' } }) },
      { key: 'free', name: '자유 배치', icon: '✥', desc: '안에 넣은 요소를 마우스로 아무 위치에나 놓기', make: () => N('div', { attrs: { 'data-layout': 'free' }, style: { position: 'relative', 'min-height': '320px', 'background-color': '#f8fafc' } }) },
      { key: 'section', name: '구역', icon: '§', desc: '페이지를 나누는 큰 구역', make: () => N('section', { style: { padding: '24px 0' } }) },
      { key: 'header', name: '머리말', icon: '▔', desc: '페이지 맨 위 (로고, 메뉴)', make: () => N('header', { style: { padding: '16px 24px', 'background-color': '#f1f5f9' } }) },
      { key: 'nav', name: '메뉴 영역', icon: '☰', desc: '다른 페이지로 가는 링크 모음', make: () => N('nav', {
        style: { display: 'flex', gap: '16px', padding: '8px 0' },
        children: ['홈', '소개', '연락처'].map(t => N('a', { text: t, attrs: { href: '#' } })),
      }) },
      { key: 'footer', name: '꼬리말', icon: '▁', desc: '페이지 맨 아래 (저작권, 연락처)', make: () => N('footer', {
        style: { padding: '16px 24px', 'background-color': '#f1f5f9', color: '#666666', 'font-size': '14px' },
        children: [N('p', { text: '© 2026 나의 웹사이트' })],
      }) },
      { key: 'hr', name: '구분선', icon: '—', desc: '내용을 나누는 가로줄', make: () => N('hr') },
    ] },
    { cat: '링크·버튼', color: '#ffab19', items: [
      { key: 'a', name: '링크', icon: 'a', desc: '누르면 다른 페이지로 이동', make: () => N('a', { text: '링크 글자', attrs: { href: '#' } }) },
      { key: 'button', name: '버튼', icon: 'btn', desc: '누를 수 있는 버튼', make: () => N('button', {
        text: '버튼',
        attrs: { type: 'button' },
        style: { padding: '10px 20px', 'background-color': '#2563eb', color: '#ffffff', 'border-style': 'none', 'border-radius': '6px', 'font-size': '15px' },
      }) },
      { key: 'linkbtn', name: '버튼 모양 링크', icon: '↗', desc: '버튼처럼 생긴 링크', make: () => N('a', {
        text: '바로 가기',
        attrs: { href: '#' },
        style: { display: 'inline-block', padding: '10px 20px', 'background-color': '#111827', color: '#ffffff', 'border-radius': '6px', 'text-decoration': 'none' },
      }) },
    ] },
    { cat: '미디어', color: '#cf63cf', items: [
      { key: 'img', name: '이미지', icon: '▣', desc: '그림·사진', make: () => N('img', { attrs: { src: IMG_PLACEHOLDER, alt: '이미지 설명' }, style: { 'max-width': '100%' } }) },
      { key: 'video', name: '동영상', icon: '▶', desc: '동영상 파일 재생', make: () => N('video', { attrs: { src: '', controls: '' }, style: { width: '480px', 'max-width': '100%', 'background-color': '#000000' } }) },
      { key: 'audio', name: '오디오', icon: '♪', desc: '소리 파일 재생', make: () => N('audio', { attrs: { src: '', controls: '' } }) },
      { key: 'iframe', name: '웹페이지 삽입', icon: 'www', desc: '다른 웹페이지·지도·유튜브 넣기', make: () => N('iframe', { attrs: { src: '', title: '삽입한 페이지' }, style: { width: '480px', height: '270px', 'max-width': '100%', border: '1px solid #cccccc' } }) },
    ] },
    { cat: '목록·표', color: '#59c059', items: [
      { key: 'ul', name: '글머리 목록', icon: '•≡', desc: '점(•)으로 시작하는 목록', make: () => N('ul', { children: [li('첫 번째 항목'), li('두 번째 항목'), li('세 번째 항목')] }) },
      { key: 'ol', name: '번호 목록', icon: '1≡', desc: '1, 2, 3 번호가 붙는 목록', make: () => N('ol', { children: [li('첫 번째 단계'), li('두 번째 단계'), li('세 번째 단계')] }) },
      { key: 'li', name: '목록 항목', icon: 'li', desc: '목록 안에 넣는 한 줄', make: () => li('새 항목') },
      { key: 'table', name: '표', icon: '▦', desc: '줄과 칸으로 된 표', make: () => N('table', {
        style: { 'border-collapse': 'collapse' },
        children: [
          N('tr', { children: ['이름', '나이', '지역'].map(t => cell('th', t)) }),
          N('tr', { children: ['홍길동', '20', '서울'].map(t => cell('td', t)) }),
          N('tr', { children: ['김철수', '25', '부산'].map(t => cell('td', t)) }),
        ],
      }) },
      { key: 'tr', name: '표 줄', icon: '═', desc: '표에 한 줄 더하기', make: () => N('tr', { children: ['', '', ''].map(t => cell('td', t || '내용')) }) },
      { key: 'td', name: '표 칸', icon: '□', desc: '표 줄에 칸 하나 더하기', make: () => cell('td', '내용') },
    ] },
    { cat: '입력 양식', color: '#5cb1d6', items: [
      { key: 'form', name: '입력 양식', icon: 'form', desc: '라벨 + 입력칸 + 버튼 묶음', make: () => N('form', {
        style: { display: 'flex', 'flex-direction': 'column', gap: '8px', 'max-width': '320px' },
        children: [
          N('label', { text: '이름' }),
          N('input', { attrs: { type: 'text', placeholder: '이름을 입력하세요' }, style: { padding: '8px' } }),
          N('button', { text: '보내기', attrs: { type: 'submit' }, style: { padding: '10px' } }),
        ],
      }) },
      { key: 'input', name: '글자 입력칸', icon: 'abc', desc: '한 줄 글자 입력', make: () => N('input', { attrs: { type: 'text', placeholder: '여기에 입력' }, style: { padding: '8px' } }) },
      { key: 'password', name: '비밀번호 칸', icon: '***', desc: '입력한 글자가 가려짐', make: () => N('input', { attrs: { type: 'password', placeholder: '비밀번호' }, style: { padding: '8px' } }) },
      { key: 'email', name: '이메일 칸', icon: '@', desc: '이메일 주소 입력', make: () => N('input', { attrs: { type: 'email', placeholder: 'name@example.com' }, style: { padding: '8px' } }) },
      { key: 'number', name: '숫자 칸', icon: '123', desc: '숫자만 입력', make: () => N('input', { attrs: { type: 'number', placeholder: '0' }, style: { padding: '8px' } }) },
      { key: 'checkbox', name: '체크박스', icon: '☑', desc: '켜고 끄는 네모 칸', make: () => N('input', { attrs: { type: 'checkbox' } }) },
      { key: 'radio', name: '라디오 버튼', icon: '◉', desc: '여러 개 중 하나 고르기', make: () => N('input', { attrs: { type: 'radio', name: 'choice' } }) },
      { key: 'textarea', name: '여러 줄 입력', icon: '¶¶', desc: '긴 글 입력', make: () => N('textarea', { attrs: { rows: '4', placeholder: '내용을 입력하세요' }, style: { width: '320px', padding: '8px' } }) },
      { key: 'select', name: '선택 목록', icon: '▾', desc: '펼쳐서 고르는 목록', make: () => N('select', { style: { padding: '6px' }, children: ['선택 1', '선택 2', '선택 3'].map(t => N('option', { text: t })) }) },
      { key: 'label', name: '라벨', icon: 'lbl', desc: '입력칸에 붙이는 이름표', make: () => N('label', { text: '라벨' }) },
    ] },
  ];

  const byKey = new Map();
  for (const g of WB.PALETTE) for (const it of g.items) {
    it.tag = it.make().tag;
    it.group = g;
    byKey.set(it.key, it);
  }
  WB.paletteItem = key => byKey.get(key);

  /** 클릭으로 넣기: 선택한 상자 안(맨 끝) 또는 선택한 요소 바로 뒤에 넣음 */
  WB.addFromPalette = key => {
    const doc = WB.canvasDoc();
    const item = byKey.get(key);
    if (!doc || !item) return;
    const node = item.make();
    let parentId = 'root', index;
    const sel = WB.selectedNode();
    if (sel) {
      const accepts = WB.ACCEPTS[sel.tag];
      if (WB.kindOf(sel.tag) === 'container' && (!accepts || accepts.includes(node.tag))) parentId = sel.id;
      else {
        const f = WB.find(doc.root, sel.id);
        parentId = f.parent.id;
        index = f.index + 1;
      }
    }
    const parent = WB.find(doc.root, parentId).node;
    if (WB.isFree(parent)) {
      // 자유 배치 상자에는 왼쪽 위부터 조금씩 비켜서 놓음
      const k = parent.children.length % 8;
      WB.placeFree(node, parentId, 20 + k * 24, 20 + k * 24);
    } else WB.insertNode(node, parentId, index);
    WB.select(node.id);
    WB.emit('reveal', node.id);
  };

  /* ---------- 화면 ---------- */
  const panel = WB.$('#tab4');
  panel.innerHTML = `
    <div class="panel-head pal-head">
      <span class="panel-title">HTML 태그</span>
      <input class="pal-search" type="text" placeholder="태그 찾기 (예: 버튼, img)" spellcheck="false">
      <div class="pal-cats"></div>
      <span class="head-actions" style="font-size:11px;color:var(--text-faint);white-space:nowrap;padding-right:6px">클릭하면 넣기 · 끌어서 원하는 곳에 놓기</span>
    </div>
    <div class="pal-body"></div>`;
  const search = panel.querySelector('.pal-search');
  const cats = panel.querySelector('.pal-cats');
  const body = panel.querySelector('.pal-body');
  let cat = '전체';

  function renderCats() {
    cats.innerHTML = ['전체', ...WB.PALETTE.map(g => g.cat)]
      .map(c => `<button class="pal-cat ${c === cat ? 'on' : ''}" data-cat="${c}">${c}</button>`).join('');
  }
  function renderItems() {
    const q = search.value.trim().toLowerCase();
    body.innerHTML = '';
    for (const g of WB.PALETTE) {
      if (cat !== '전체' && g.cat !== cat) continue;
      const items = g.items.filter(it => !q || `${it.name} ${it.tag} ${it.key} ${it.desc}`.toLowerCase().includes(q));
      if (!items.length) continue;
      const grid = h('div', { class: 'pal-items' });
      for (const it of items) {
        const b = h('button', { class: 'pal-item', draggable: 'true', 'data-key': it.key, title: `${it.desc}  <${it.tag}>` });
        b.innerHTML = `<span class="pi-ico">${esc(it.icon)}</span><span class="pi-txt"><span class="pi-name">${esc(it.name)}</span><span class="pi-tag">&lt;${it.tag}&gt;</span></span>`;
        grid.append(b);
      }
      body.append(h('div', { class: 'pal-group', style: `--gc:${g.color}` }, h('h4', {}, g.cat), grid));
    }
    if (!body.children.length) body.innerHTML = '<div class="pal-empty">찾는 태그가 없어요.</div>';
  }

  cats.addEventListener('click', e => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    cat = b.dataset.cat;
    renderCats();
    renderItems();
  });
  search.addEventListener('input', renderItems);
  search.addEventListener('keydown', e => { if (e.key === 'Escape') { search.value = ''; renderItems(); } });

  body.addEventListener('click', e => {
    const b = e.target.closest('.pal-item');
    if (b) WB.addFromPalette(b.dataset.key);
  });
  body.addEventListener('dragstart', e => {
    const b = e.target.closest('.pal-item');
    if (!b) return;
    WB.drag = { type: 'new', key: b.dataset.key, tag: byKey.get(b.dataset.key).tag, gx: 10, gy: 10 };
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', b.dataset.key);
  });
  body.addEventListener('dragend', () => (WB.drag = null));

  WB.on('doc', () => panel.classList.toggle('disabled', !WB.canvasDoc()));

  renderCats();
  renderItems();
})();
