'use strict';
/* 에셋 가져오기 창 + 내 에셋(사용자 지정 에셋)
   - 섹션: 실제 페이지에 바로 끼워 쓰는 구역 (머리말 · 첫 화면 · 기능 · 가격 · 후기 · 문의 · 꼬리말 …)
   - 페이지: 자기소개 · 발표 · 웹 게임 · 로그인 · 일반 · 자유 / 그림 · 배경
   - 내 에셋: 직접 만든 요소 · 페이지를 저장해 두고 다른 페이지에서 다시 씀 (이 브라우저에 저장, JSON 으로 내보내기 · 가져오기)
   열기: 3번 설정 줄의 「에셋 가져오기」, 바탕화면 · 요소 오른쪽 클릭 메뉴 */
(() => {
  const { h } = WB;

  /* ================= 내 에셋 저장소 ================= */
  const KEY = 'wb.myAssets';
  const load = () => { const v = WB.load(KEY, []); return Array.isArray(v) ? v : []; };
  const store = list => {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; }
    catch { WB.toast('저장 공간이 모자라요. 안 쓰는 내 에셋을 지우거나 내보내기로 백업해 주세요', 'error'); return false; }
  };
  WB.myAssets = {
    list: load,
    add(item) { const list = load(); list.unshift(item); return store(list); },
    remove(id) { store(load().filter(a => a.id !== id)); },
    rename(id, name) { store(load().map(a => (a.id === id ? { ...a, name } : a))); },
  };
  /** 고른 요소(또는 페이지 전체)를 내 에셋으로 저장 */
  WB.saveMyAsset = async id => {
    const doc = WB.canvasDoc();
    if (!doc) return;
    const isPage = !id || id === 'root';
    const node = isPage ? null : WB.find(doc.root, id)?.node;
    if (!isPage && !node) return WB.toast('저장할 요소를 먼저 고르세요');
    const name = await WB.ask(isPage ? '이 페이지를 내 에셋으로' : '이 요소를 내 에셋으로', isPage ? doc.title : WB.labelOf(node), '예: 우리 가게 머리말', '저장', '이 브라우저에 저장돼요. 에셋 가져오기 → 「내 에셋」에서 다시 넣을 수 있어요');
    if (!name) return;
    const strip = o => JSON.parse(JSON.stringify(o));
    const item = isPage
      ? { id: 'my' + Date.now(), type: 'page', name, created: Date.now(), page: strip({ title: doc.title, root: doc.root, blocks: doc.blocks, extra: doc.extra, formats: doc.formats || {} }) }
      : { id: 'my' + Date.now(), type: 'element', name, created: Date.now(), node: strip(node), extra: strip({ css: doc.extra?.css || '' }) };
    if (WB.myAssets.add(item)) WB.toast(`「${name}」 을(를) 내 에셋에 저장했어요`, 'ok');
  };
  /** 내 에셋 넣기: 요소는 고른 곳에(상자 안 · 바로 뒤 · 슬라이드 안), 페이지는 새 페이지로 */
  function useMine(a, asPage) {
    if (a.type === 'page' || asPage) {
      const p = a.type === 'page' ? a.page : { title: a.name, root: { ...WB.newRoot(), children: [a.node] } };
      WB.newPage();
      WB.commit(d => {
        d.title = p.title || a.name;
        d.root = WB.reId(JSON.parse(JSON.stringify(p.root)));
        if (p.blocks) d.blocks = WB.reIdBlocks(p.blocks);
        if (p.extra) d.extra = { ...WB.emptyExtra(), ...p.extra };
        if (p.formats) d.formats = p.formats;
      }, `mine:${Date.now()}`);
      WB.select(null);
      WB.setZoom('fit');
      return;
    }
    const doc = WB.canvasDoc();
    if (!doc) return;
    const node = WB.cloneNode(a.node);
    const sel = WB.selectedNode();
    const slide = sel && WB.slideOf?.(doc, sel.id);
    if (slide && node.style.position === 'absolute') WB.placeAnywhere(node, slide.id, parseFloat(node.style.left) || 80, parseFloat(node.style.top) || 80, { boxH: 720 });
    else if (sel && sel.id !== 'root' && WB.kindOf(sel) === 'container' && !WB.ACCEPTS[sel.tag]) WB.insertNode(node, sel.id);
    else if (sel && sel.id !== 'root') { const f = WB.find(doc.root, sel.id); WB.insertNode(node, f.parent.id, f.index + 1); }
    else WB.insertNode(node, 'root');
    WB.select(node.id);
    WB.emit('reveal', node.id);
    WB.toast(`「${a.name}」 을(를) 넣었어요`, 'ok');
  }
  /** JSON 파일로 내보내기 · 가져오기 (다른 컴퓨터 · 브라우저로 옮기기, 백업) */
  function exportMine() {
    const list = load();
    if (!list.length) return WB.toast('내보낼 내 에셋이 없어요');
    const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify({ format: 'wb-assets', version: 1, assets: list }, null, 1)], { type: 'application/json' })), download: 'my-assets.json' });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  function importMine(done) {
    const input = h('input', { type: 'file', accept: '.json,application/json' });
    input.onchange = async () => {
      try {
        const data = JSON.parse(await input.files[0].text());
        const items = (Array.isArray(data) ? data : data.assets || []).filter(x => x && (x.type === 'element' ? x.node : x.page) && x.name);
        if (!items.length) throw new Error('에셋이 들어 있지 않아요');
        const have = new Set(load().map(x => x.id));
        const list = [...items.map(x => (have.has(x.id) ? { ...x, id: 'my' + Date.now() + Math.random().toString(36).slice(2, 6) } : x)), ...load()];
        if (store(list)) WB.toast(`내 에셋 ${items.length}개를 가져왔어요`, 'ok');
        done();
      } catch (e) { WB.toast('가져오지 못했어요: ' + e.message, 'error'); }
    };
    input.click();
  }

  /* ================= 에셋 창 ================= */
  const TABS = [['all', '전체'], ['section', '섹션'], ['mine', '내 에셋'], ...WB.ASSET_KINDS, ['art', '그림'], ['bg', '배경']];
  let lastTab = 'section';

  /** 미리보기 상자: 보일 때만 실제 모습을 줄여서 그림 */
  function previewBox(kind, key, sw) {
    const box = h('div', { class: 'aw-prev' });
    Object.assign(box.dataset, { kind, key });
    box.style.setProperty('--sw', sw || '#ffffff');
    return box;
  }
  function fillPreview(box) {
    if (box.dataset.done) return;
    box.dataset.done = '1';
    const { kind, key } = box.dataset;
    let a;
    if (kind === 'page') a = WB.buildAssetDoc(key);
    else if (kind === 'section') a = WB.sectionPreviewDoc(key);
    else {
      const m = load().find(x => x.id === key);
      if (!m) return;
      a = m.type === 'page' ? { ...m.page, root: JSON.parse(JSON.stringify(m.page.root)) } : { title: m.name, root: { ...WB.newRoot(), children: [JSON.parse(JSON.stringify(m.node))] }, extra: { ...WB.emptyExtra(), ...(m.extra || {}) } };
    }
    const doc = WB.newPageDoc({ name: 'asset.html', title: a.title, root: a.root, blocks: a.blocks ? WB.reIdBlocks(a.blocks) : undefined, extra: a.extra, formats: a.formats });
    const f = h('iframe', { sandbox: 'allow-scripts', loading: 'lazy', tabindex: '-1', title: (a.title || '') + ' 미리보기' });
    f.srcdoc = WB.generateHTML(doc);
    box.append(f);
  }

  WB.$('#btn-assets').onclick = () => WB.openAssets();
  WB.openAssets = (tab = lastTab) => {
    const doc = WB.canvasDoc();
    const tabs = h('div', { class: 'seg aw-tabs' });
    for (const [k, l] of TABS) tabs.append(h('button', { 'data-tab': k }, l));
    const search = h('input', { type: 'text', class: 'aw-search', placeholder: '에셋 찾기 (예: 가격, 문의, 꼬리말, 게임)', spellcheck: 'false' });
    const tools = h('div', { class: 'aw-tools' });
    const grid = h('div', { class: 'aw-grid' });
    const content = h('div', { class: 'aw' }, h('div', { class: 'aw-bar' }, tabs, search), tools, grid);
    let io = null;
    const m = WB.modal({
      title: '에셋 가져오기', sub: '편집기가 주는 무료 섹션 · 페이지 · 그림 · 배경, 그리고 직접 저장한 내 에셋', wide: true, content,
      actions: [{ label: '닫기', onClick: close => close() }],
    });
    m.box.classList.add('aw-modal');
    const close = () => { io?.disconnect(); m.close(); };

    function render() {
      tabs.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
      const q = search.value.trim().toLowerCase();
      const hit = s => !q || s.toLowerCase().includes(q) || WB.t(s).toLowerCase().includes(q);
      grid.innerHTML = '';
      tools.innerHTML = '';
      io?.disconnect();
      io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) fillPreview(x.target); }), { root: m.body, rootMargin: '200px' });
      const card = (preview, title, sub, buttons, cls = '') => h('div', { class: 'aw-card ' + cls }, preview, h('div', { class: 'aw-info' }, h('b', {}, title), h('span', {}, sub)), h('div', { class: 'aw-acts' }, ...buttons));
      const show = k => tab === 'all' || tab === k;
      // 내 에셋
      if (tab === 'mine') {
        const sel = WB.selectedNode();
        tools.append(
          h('button', { class: 'btn small primary', 'data-tool': 'save-el', disabled: !doc || !sel || sel.id === 'root' || null, title: '캔버스에서 고른 요소를 저장해요' }, '＋ 고른 요소 저장'),
          h('button', { class: 'btn small', 'data-tool': 'save-page', disabled: !doc || null }, '＋ 이 페이지 저장'),
          h('span', { class: 'spacer' }),
          h('button', { class: 'btn small', 'data-tool': 'import', title: 'my-assets.json 파일에서 가져오기' }, '가져오기'),
          h('button', { class: 'btn small', 'data-tool': 'export', title: '모든 내 에셋을 my-assets.json 파일로 (백업 · 다른 컴퓨터로 옮기기)' }, '내보내기'));
      }
      if (show('mine')) for (const a of load()) {
        if (!hit(a.name)) continue;
        const pv = previewBox('mine', a.id, '#ffffff');
        grid.append(card(pv, a.name, (a.type === 'page' ? '내 에셋 · 페이지' : '내 에셋 · 요소') + ' · ' + new Date(a.created).toLocaleDateString(), [
          a.type === 'page' ? h('button', { class: 'btn small primary', 'data-mine-open': a.id }, '새 페이지로 열기') : h('button', { class: 'btn small primary', 'data-mine-use': a.id, disabled: !doc || null }, '지금 페이지에 넣기'),
          h('button', { class: 'btn small', 'data-mine-rename': a.id }, '이름 바꾸기'),
          h('button', { class: 'btn small danger', 'data-mine-del': a.id }, '지우기'),
        ], 'mine'));
        io.observe(pv);
      }
      if (tab === 'mine' && !load().length) grid.append(h('p', { class: 'aw-empty' }, '아직 내 에셋이 없어요. 캔버스에서 요소를 오른쪽 클릭 → 「내 에셋으로 저장…」, 또는 위의 「＋ 고른 요소 저장」으로 만들어요.'));
      // 섹션
      if (show('section')) for (const s of WB.SECTION_ASSETS) {
        if (!hit(`${s.name} ${s.desc} ${WB.sectionKindName(s.kind)} 섹션`)) continue;
        const pv = previewBox('section', s.key, '#ffffff');
        grid.append(card(pv, s.name, `섹션 · ${WB.sectionKindName(s.kind)} · ${s.desc}`, [
          h('button', { class: 'btn small primary', 'data-section': s.key, disabled: !doc || null, title: '고른 구역 바로 아래(없으면 맨 끝)에 넣어요' }, '지금 페이지에 넣기'),
        ], 'section'));
        io.observe(pv);
      }
      // 페이지
      if (tab === 'all' || WB.ASSET_KINDS.some(([k]) => k === tab)) for (const a of WB.PAGE_ASSETS) {
        if ((tab !== 'all' && a.kind !== tab) || !hit(`${a.name} ${a.desc} ${WB.assetKindName(a.kind)}`)) continue;
        const pv = previewBox('page', a.key, a.swatch[0]);
        grid.append(card(pv, a.name, `${WB.assetKindName(a.kind)} · ${a.desc}`, [
          h('button', { class: 'btn small primary', 'data-open': a.key }, '새 페이지로 열기'),
          h('button', { class: 'btn small', 'data-insert': a.key, disabled: !doc || null, title: '지금 페이지 맨 아래에 통째로 넣어요 (게임 · 로그인의 움직임 코드는 빼고)' }, '지금 페이지에 넣기'),
        ]));
        io.observe(pv);
      }
      if (show('art')) for (const a of WB.ASSET_ILLUST) {
        if (!hit(`${a.name} ${a.desc} 그림`)) continue;
        grid.append(card(h('div', { class: 'aw-prev img' }, h('img', { src: a.src, alt: '' })), a.name, '그림 · ' + a.desc, [h('button', { class: 'btn small primary', 'data-art': a.key, disabled: !doc || null }, '넣기')]));
      }
      if (show('bg')) for (const a of WB.ASSET_BG) {
        if (!hit(`${a.name} ${a.desc} 배경`)) continue;
        grid.append(card(h('div', { class: 'aw-prev img' }, h('img', { src: a.src, alt: '' })), a.name, '배경 · ' + a.desc, [h('button', { class: 'btn small primary', 'data-bg': a.key, disabled: !doc || null, title: '고른 상자 · 슬라이드의 배경으로 (아무것도 안 골랐으면 페이지 배경)' }, '배경으로')]));
      }
      if (!grid.children.length) grid.append(h('p', { class: 'aw-empty' }, '찾는 에셋이 없어요.'));
    }
    tabs.addEventListener('click', e => {
      const b = e.target.closest('[data-tab]');
      if (!b) return;
      tab = lastTab = b.dataset.tab;
      render();
    });
    search.addEventListener('input', render);
    tools.addEventListener('click', async e => {
      const t = e.target.closest('[data-tool]')?.dataset.tool;
      if (t === 'save-el') { await WB.saveMyAsset(WB.selectedId()); render(); }
      else if (t === 'save-page') { await WB.saveMyAsset('root'); render(); }
      else if (t === 'export') exportMine();
      else if (t === 'import') importMine(render);
    });
    grid.addEventListener('click', async e => {
      const b = e.target.closest('button');
      if (!b) return;
      const d = b.dataset;
      const mine = id => load().find(x => x.id === id);
      if (d.open) { close(); WB.openTemplate(d.open); }
      else if (d.section) { close(); WB.insertSection(d.section); }
      else if (d.mineUse) { close(); useMine(mine(d.mineUse)); }
      else if (d.mineOpen) { close(); useMine(mine(d.mineOpen), true); }
      else if (d.mineRename) {
        const a = mine(d.mineRename);
        const name = await WB.ask('내 에셋 이름 바꾸기', a.name, '', '바꾸기');
        if (name) { WB.myAssets.rename(a.id, name); render(); }
      } else if (d.mineDel) {
        const a = mine(d.mineDel);
        if (!confirm(`내 에셋 「${a.name}」 을(를) 지울까요? 되돌릴 수 없어요 (내보내기로 백업해 두면 다시 가져올 수 있어요)`)) return;
        WB.myAssets.remove(a.id);
        render();
      } else if (d.insert) {
        const a = WB.buildAssetDoc(d.insert);
        const { margin, ...st } = a.root.style;
        const box = WB.makeNode('div', { style: st, children: a.root.children });
        close();
        WB.insertNode(box, 'root');
        WB.select(box.id);
        WB.emit('reveal', box.id);
        WB.toast(`「${a.name}」 에셋을 페이지 맨 아래에 넣었어요`, 'ok');
      } else if (d.art) { close(); WB.addFromPalette('art-' + d.art); }
      else if (d.bg) {
        const a = WB.ASSET_BG.find(x => x.key === d.bg);
        const sel = WB.selectedNode();
        const target = sel && WB.kindOf(sel) === 'container' ? sel.id : 'root';
        close();
        WB.setStyles(target, WB.bgStyle(a.src), `bg:${Date.now()}`);
        WB.toast(`「${a.name}」 배경을 ${target === 'root' ? '페이지' : '고른 상자'}에 넣었어요`, 'ok');
      }
    });
    render();
    setTimeout(() => search.focus());
  };
})();
