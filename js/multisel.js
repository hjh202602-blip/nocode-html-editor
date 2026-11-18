'use strict';
/* 여러 요소 고르기
   - 페이지 빈 곳(또는 페이지 바깥)에서 왼쪽 버튼을 누른 채 끌면 사각형 → 사각형 안에 완전히 들어온 요소들을 고름
     (요소 위에서 시작하려면 Shift 를 누른 채 끌기). Shift+클릭으로 하나씩 더하기 · 빼기, Ctrl+A 로 전부
   - 여러 개를 고르면 위에 「N개 선택」 막대 + 오른쪽 클릭 메뉴: 묶기 · 맞추기 · 같은 크기 · 같은 모양 · 이름표 · 형식 · id 번호 · 복제 · 삭제 */
(() => {
  const { h, icon } = WB;
  const cv = WB._cv;
  const { shadow, scroller, frame, host, page, elFor, hitEl } = cv;

  /* ---------- 고른 것 보여 주기 ---------- */
  const bar = h('div', { class: 'sel-toolbar multi-bar', hidden: true });
  bar.innerHTML = `<span class="sel-name"></span>
    <button data-m="group" title="한 상자로 묶기 (Ctrl+G)">${icon('box', 14)}</button>
    <button data-m="align" title="맞추기 · 같은 간격">${icon('alignC', 14)}</button>
    <button data-m="class" title="같은 이름표(class) 붙이기">${icon('edit', 14)}</button>
    <button data-m="dup" title="모두 복제 (Ctrl+D)">${icon('copy', 14)}</button>
    <button data-m="more" title="더 보기 (오른쪽 클릭과 같은 메뉴)">⋯</button>
    <button data-m="del" title="모두 삭제 (Delete)">${icon('trash', 14)}</button>`;
  scroller.append(bar);
  const name = bar.querySelector('.sel-name');

  WB.applyMulti = () => {
    const ids = WB.multiIds();
    if (ids.length < 2 || cv.editing()) { bar.hidden = true; return; }
    const els = ids.map(elFor).filter(Boolean);
    els.forEach(el => el.setAttribute('data-wb-selected', ''));
    name.textContent = `${ids.length}개 선택`;
    bar.hidden = false;
    // 모두를 감싸는 사각형 위에 막대
    const rs = els.map(el => el.getBoundingClientRect());
    const top = Math.min(...rs.map(r => r.top)), left = Math.min(...rs.map(r => r.left)), bottom = Math.max(...rs.map(r => r.bottom));
    const s = scroller.getBoundingClientRect(), bh = bar.offsetHeight, bw = bar.offsetWidth;
    let y = top - s.top + scroller.scrollTop - bh;
    if (top - s.top < bh) y = bottom - s.top + scroller.scrollTop;
    bar.style.top = y + 'px';
    bar.style.left = Math.max(0, Math.min(left - s.left + scroller.scrollLeft, scroller.scrollWidth - bw - 2)) + 'px';
  };
  WB.on('select', () => requestAnimationFrame(() => WB.applyMulti()));
  scroller.addEventListener('scroll', () => { if (!bar.hidden) WB.applyMulti(); });

  WB.toggleMulti = id => {
    const cur = WB.multiIds();
    const base = cur.length ? cur : (WB.selectedId() && WB.selectedId() !== 'root' ? [WB.selectedId()] : []);
    WB.selectMany(base.includes(id) ? base.filter(x => x !== id) : [...base, id]);
  };

  /* ---------- 끌어서 사각형으로 고르기 ---------- */
  const box = h('div', { class: 'marquee', hidden: true });
  scroller.append(box);
  let mq = null;
  scroller.addEventListener('mousedown', e => {
    if (e.button !== 0 || cv.editing() || !WB.canvasDoc()) return;
    const onBg = e.target === scroller || e.target === frame;
    const inHost = e.composedPath().includes(host);
    if (!onBg && !inHost) return; // 선택 막대 · 손잡이 등
    const el = inHost ? hitEl(e) : null;
    // 자유 배치 상자(슬라이드 등)의 빈 곳: 그 상자를 고르지 않았으면 사각형 고르기, 골랐으면 상자 옮기기
    const freeEmpty = el && el !== page && el.getAttribute('data-layout') === 'free' && el.dataset.wbId !== WB.selectedId();
    if (!onBg && el !== page && !freeEmpty && !e.shiftKey) return; // 요소 위에서는 보통처럼 끌어 옮기기
    e.preventDefault(); // 브라우저 끌기 · 글자 선택 막기
    cv.marquee = true;
    mq = { x: e.clientX, y: e.clientY, moved: false, add: e.shiftKey ? WB.multiIds().length ? WB.multiIds() : [WB.selectedId()].filter(x => x && x !== 'root') : [] };
  }, true);
  addEventListener('mousemove', e => {
    if (!mq) return;
    if (!mq.moved && Math.hypot(e.clientX - mq.x, e.clientY - mq.y) < 4) return;
    mq.moved = true;
    const x1 = Math.min(mq.x, e.clientX), y1 = Math.min(mq.y, e.clientY), x2 = Math.max(mq.x, e.clientX), y2 = Math.max(mq.y, e.clientY);
    const s = scroller.getBoundingClientRect();
    Object.assign(box.style, { left: x1 - s.left + scroller.scrollLeft + 'px', top: y1 - s.top + scroller.scrollTop + 'px', width: x2 - x1 + 'px', height: y2 - y1 + 'px' });
    box.hidden = false;
    // 사각형 안에 완전히 들어온 요소 (안 보이는 것 · 크기 0 은 빼고)
    const hit = [...shadow.querySelectorAll('[data-wb-id]')].filter(el => {
      if (el === page || el.closest('[data-lock]')) return false; // 잠근 요소는 사각형으로 고르지 않음
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.left >= x1 && r.right <= x2 && r.top >= y1 && r.bottom <= y2;
    }).map(el => el.dataset.wbId);
    WB.selectMany([...new Set([...mq.add, ...hit])]);
  });
  addEventListener('mouseup', () => {
    if (!mq) return;
    if (mq.moved) { cv.skipClick = true; setTimeout(() => (cv.skipClick = false)); }
    mq = null;
    cv.marquee = false;
    box.hidden = true;
  });

  /* ---------- 할 수 있는 일 ---------- */
  const doc = () => WB.canvasDoc();
  const nodes = ids => ids.map(id => WB.find(doc().root, id)?.node).filter(Boolean);
  const finds = (d, ids) => ids.map(id => WB.find(d.root, id)).filter(Boolean);
  /** 모두 같은 자유 배치 상자 안에 띄워 놓은 요소인가 (맞추기 · 같은 간격에 필요) */
  function freeSiblings(ids) {
    const fs = finds(doc(), ids);
    return fs.length > 1 && fs.every(f => f.parent.id === fs[0].parent.id && f.node.style.position === 'absolute');
  }
  /** 화면에 그려진 위치 (부모 기준, 확대 · 축소와 상관없는 페이지 px) */
  const geo = id => { const el = elFor(id); return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }; };

  function group(ids) {
    const d0 = doc();
    if (!d0 || ids.length < 2) return;
    const free = freeSiblings(ids);
    const g = free ? ids.map(geo) : null;
    const wrap = WB.makeNode('div', { attrs: free ? { 'data-layout': 'free' } : {}, style: {} });
    if (free) {
      const x = Math.min(...g.map(a => a.x)), y = Math.min(...g.map(a => a.y));
      const r = Math.max(...g.map(a => a.x + a.w)), b = Math.max(...g.map(a => a.y + a.h));
      Object.assign(wrap.style, { position: 'absolute', left: x + 'px', top: y + 'px', width: r - x + 'px', height: b - y + 'px' });
      wrap._off = { x, y, g };
    }
    WB.commit(d => {
      const fs = finds(d, ids);
      const first = fs[0], parent = first.parent, index = first.index;
      // 첫 요소가 문서에서 가장 앞이라 같은 부모 안에서 그 앞 번호는 바뀌지 않음
      fs.forEach(f => f.parent.children.splice(f.parent.children.indexOf(f.node), 1));
      fs.forEach((f, i) => {
        if (free) {
          const a = wrap._off.g[i];
          delete f.node.style.right; delete f.node.style.bottom;
          f.node.style.left = a.x - wrap._off.x + 'px';
          f.node.style.top = a.y - wrap._off.y + 'px';
        }
        wrap.children.push(f.node);
      });
      delete wrap._off;
      parent.children.splice(Math.min(index, parent.children.length), 0, wrap);
    }, `group:${Date.now()}`);
    WB.select(wrap.id);
    WB.toast(`${ids.length}개를 한 상자로 묶었어요 (풀려면 오른쪽 클릭 → 상자 풀기, Ctrl+Shift+G)`, 'ok');
  }
  WB.groupSelected = () => group(WB.multiIds());

  function align(ids, how) {
    if (!freeSiblings(ids)) return WB.toast('맞추기는 같은 「자유 배치」 상자 안에 띄워 놓은 요소끼리만 돼요', 'error');
    const g = ids.map(geo);
    const L = Math.min(...g.map(a => a.x)), T = Math.min(...g.map(a => a.y));
    const R = Math.max(...g.map(a => a.x + a.w)), B = Math.max(...g.map(a => a.y + a.h));
    const pos = g.map(a => ({ x: a.x, y: a.y }));
    if (how === 'left') pos.forEach(p => (p.x = L));
    if (how === 'right') pos.forEach((p, i) => (p.x = R - g[i].w));
    if (how === 'hcenter') pos.forEach((p, i) => (p.x = Math.round((L + R) / 2 - g[i].w / 2)));
    if (how === 'top') pos.forEach(p => (p.y = T));
    if (how === 'bottom') pos.forEach((p, i) => (p.y = B - g[i].h));
    if (how === 'vcenter') pos.forEach((p, i) => (p.y = Math.round((T + B) / 2 - g[i].h / 2)));
    if (how === 'hspace' || how === 'vspace') {
      const k = how === 'hspace' ? ['x', 'w'] : ['y', 'h'];
      const order = g.map((a, i) => i).sort((a, b) => g[a][k[0]] - g[b][k[0]]);
      const total = g.reduce((s, a) => s + a[k[1]], 0);
      const gap = ((how === 'hspace' ? R - L : B - T) - total) / (g.length - 1);
      let at = how === 'hspace' ? L : T;
      for (const i of order) { pos[i][k[0]] = Math.round(at); at += g[i][k[1]] + gap; }
    }
    WB.commit(d => finds(d, ids).forEach((f, i) => {
      delete f.node.style.right; delete f.node.style.bottom;
      f.node.style.left = pos[i].x + 'px';
      f.node.style.top = pos[i].y + 'px';
    }), `align:${Date.now()}`);
  }

  function sameSize(ids, prop) {
    const [first] = nodes(ids);
    const v = first.style[prop] || (prop === 'width' ? elFor(first.id).offsetWidth : elFor(first.id).offsetHeight) + 'px';
    WB.commit(d => finds(d, ids).forEach(f => (f.node.style[prop] = v)), `size:${Date.now()}`);
    WB.toast(`모두 첫 번째 요소와 같은 ${prop === 'width' ? '너비' : '높이'}(${v})로 맞췄어요`, 'ok');
  }

  const NO_COPY = new Set(['position', 'left', 'top', 'right', 'bottom', 'z-index']);
  function sameLook(ids) {
    const [first] = nodes(ids);
    const look = Object.fromEntries(Object.entries(first.style).filter(([k]) => !NO_COPY.has(k)));
    WB.commit(d => finds(d, ids).slice(1).forEach(f => {
      const keep = Object.fromEntries(Object.entries(f.node.style).filter(([k]) => NO_COPY.has(k)));
      f.node.style = { ...look, ...keep };
    }), `look:${Date.now()}`);
    WB.toast('첫 번째 요소의 모양(글꼴 · 색 · 여백 · 테두리 …)을 모두에 입혔어요', 'ok');
  }

  const CLASS_RE = /^[A-Za-z_][\w-]*$/;
  async function addClass(ids) {
    const v = await WB.ask('같은 이름표(class) 붙이기', '', '예: card', '붙이기', '여러 요소에 같은 이름을 붙여요. CSS 의 .이름 { } 이나 블록에서 한꺼번에 다룰 수 있어요. 이미 있는 「형식」 이름이면 그 모양도 함께 입혀요');
    if (!v) return;
    if (!CLASS_RE.test(v)) return WB.toast('영문으로 시작하고 영문 · 숫자 · - · _ 만 쓸 수 있어요', 'error');
    const d = doc();
    if (d.formats && Object.hasOwn(d.formats, v)) { ids.forEach(id => WB.formatApply(v, id)); WB.toast(`형식 .${v} 을(를) ${ids.length}개에 입혔어요`, 'ok'); return; }
    WB.commit(dd => finds(dd, ids).forEach(f => {
      const list = (f.node.attrs.class || '').split(/\s+/).filter(Boolean);
      if (!list.includes(v)) f.node.attrs.class = [...list, v].join(' ');
    }), `cls:${Date.now()}`);
    WB.toast(`이름표 .${v} 을(를) ${ids.length}개에 붙였어요`, 'ok');
  }
  async function makeFormat(ids) {
    const v = await WB.ask('첫 요소 모양으로 형식 만들어 함께 쓰기', '', '예: card', '만들기', '하나를 고치면 나머지도 함께 바뀌어요 (형식 탭에서 관리)');
    if (!v) return;
    if (!CLASS_RE.test(v)) return WB.toast('영문으로 시작하고 영문 · 숫자 · - · _ 만 쓸 수 있어요', 'error');
    if (doc().formats && Object.hasOwn(doc().formats, v)) return WB.toast(`.${v} 형식은 이미 있어요. 「형식 입히기」에서 고르세요`, 'error');
    WB.formatCreate(v, ids[0]);
    ids.slice(1).forEach(id => WB.formatApply(v, id));
    WB.toast(`형식 .${v} 을(를) 만들어 ${ids.length}개에 입혔어요`, 'ok');
  }
  function applyFormat(ids, x, y) {
    const names = Object.keys(doc().formats || {});
    if (!names.length) return WB.toast('아직 형식이 없어요. 「첫 요소 모양으로 형식 만들기」로 만들어 보세요');
    WB.menu(x + 16, y, names.map(n => ({ label: '.' + n, action: () => { ids.forEach(id => WB.formatApply(n, id)); WB.toast(`형식 .${n} 을(를) ${ids.length}개에 입혔어요`, 'ok'); } })));
  }
  async function numberIds(ids) {
    const v = await WB.ask('요소 이름(id) 번호로 붙이기', '', '예: card  →  card-1, card-2, …', '붙이기', 'id 는 페이지에서 하나뿐이어야 해서 여러 요소에 같은 id 를 줄 수는 없어요. 그래서 번호를 붙여요. 같은 이름으로 묶으려면 「같은 이름표(class)」를 쓰세요');
    if (!v) return;
    if (!CLASS_RE.test(v)) return WB.toast('영문으로 시작하고 영문 · 숫자 · - · _ 만 쓸 수 있어요', 'error');
    const used = new Set();
    WB.walk(doc().root, n => { if (n.attrs?.id && !ids.includes(n.id)) used.add(n.attrs.id); });
    let k = 1;
    const out = ids.map(() => { while (used.has(`${v}-${k}`)) k++; used.add(`${v}-${k}`); return `${v}-${k++}`; });
    WB.commit(d => finds(d, ids).forEach((f, i) => (f.node.attrs.id = out[i])), `ids:${Date.now()}`);
    WB.toast(`#${out[0]} … #${out[out.length - 1]} 로 이름을 붙였어요`, 'ok');
  }
  function duplicateAll(ids) {
    const copies = [];
    WB.commit(d => finds(d, ids).reverse().forEach(f => {
      const c = WB.cloneNode(f.node);
      if (c.style.position === 'absolute') { c.style.left = (parseFloat(c.style.left) || 0) + 16 + 'px'; c.style.top = (parseFloat(c.style.top) || 0) + 16 + 'px'; }
      f.parent.children.splice(f.parent.children.indexOf(f.node) + 1, 0, c);
      copies.unshift(c.id);
    }), `dupall:${Date.now()}`);
    WB.selectMany(copies);
  }
  function removeAll(ids) {
    WB.commit(d => finds(d, ids).forEach(f => f.parent.children.splice(f.parent.children.indexOf(f.node), 1)), `delall:${Date.now()}`);
    WB.select(null);
    WB.toast(`${ids.length}개를 지웠어요 (Ctrl+Z 로 되돌리기)`);
  }
  function hideMobile(ids) {
    const hideAll = nodes(ids).some(n => n.styleMobile?.display !== 'none');
    WB.commit(d => finds(d, ids).forEach(f => {
      const m = { ...(f.node.styleMobile || {}) };
      if (hideAll) m.display = 'none'; else delete m.display;
      if (Object.keys(m).length) f.node.styleMobile = m; else delete f.node.styleMobile;
    }), `mhide:${Date.now()}`);
  }

  WB.alignMulti = align;
  function alignItems(ids) {
    const ok = freeSiblings(ids);
    const t = ok ? '' : ' (자유 배치에서만)';
    return [
      { label: '왼쪽 맞추기' + t, icon: 'alignL', disabled: !ok, action: () => align(ids, 'left') },
      { label: '가로 가운데 맞추기' + t, icon: 'alignC', disabled: !ok, action: () => align(ids, 'hcenter') },
      { label: '오른쪽 맞추기' + t, icon: 'alignR', disabled: !ok, action: () => align(ids, 'right') },
      { label: '위 맞추기' + t, icon: 'up', disabled: !ok, action: () => align(ids, 'top') },
      { label: '세로 가운데 맞추기' + t, icon: 'rows', disabled: !ok, action: () => align(ids, 'vcenter') },
      { label: '아래 맞추기' + t, icon: 'down', disabled: !ok, action: () => align(ids, 'bottom') },
      'sep',
      { label: '가로로 같은 간격' + t, icon: 'wide', disabled: !ok || ids.length < 3, action: () => align(ids, 'hspace') },
      { label: '세로로 같은 간격' + t, icon: 'rows', disabled: !ok || ids.length < 3, action: () => align(ids, 'vspace') },
    ];
  }
  WB.multiMenu = (x, y) => {
    const ids = WB.multiIds();
    if (ids.length < 2) return;
    WB.menu(x, y, [
      { label: `한 상자로 묶기 (${ids.length}개)`, icon: 'box', kbd: 'Ctrl+G', action: () => group(ids) },
      { label: '맞추기 · 같은 간격 ▸', icon: 'alignC', action: () => WB.menu(x + 16, y, alignItems(ids)) },
      { label: '같은 너비로 (첫 번째 요소 기준)', icon: 'wide', action: () => sameSize(ids, 'width') },
      { label: '같은 높이로 (첫 번째 요소 기준)', icon: 'rows', action: () => sameSize(ids, 'height') },
      { label: '첫 번째 요소 모양을 모두에', icon: 'brush', action: () => sameLook(ids) },
      'sep',
      { label: '같은 이름표(class) 붙이기…', icon: 'edit', action: () => addClass(ids) },
      { label: '첫 요소 모양으로 형식 만들어 함께 쓰기…', icon: 'copy', action: () => makeFormat(ids) },
      { label: '형식 입히기 ▸', icon: 'copy', disabled: !Object.keys(doc().formats || {}).length, action: () => applyFormat(ids, x, y) },
      { label: '요소 이름(id) 번호로 붙이기…', icon: 'edit', action: () => numberIds(ids) },
      'sep',
      { label: '휴대폰에서 숨기기 · 보이기', icon: 'phone', action: () => hideMobile(ids) },
      { label: '모두 복제', icon: 'copy', kbd: 'Ctrl+D', action: () => duplicateAll(ids) },
      { label: `모두 삭제 (${ids.length}개)`, icon: 'trash', kbd: 'Delete', danger: true, action: () => removeAll(ids) },
      'sep',
      { label: '고르기 풀기', icon: 'x', kbd: 'Esc', action: () => WB.select(null) },
    ]);
  };
  bar.addEventListener('click', e => {
    const m = e.target.closest('[data-m]')?.dataset.m;
    if (!m) return;
    const ids = WB.multiIds(), r = e.target.closest('button').getBoundingClientRect();
    if (m === 'group') group(ids);
    else if (m === 'align') WB.menu(r.left, r.bottom + 4, alignItems(ids));
    else if (m === 'class') addClass(ids);
    else if (m === 'dup') duplicateAll(ids);
    else if (m === 'del') removeAll(ids);
    else if (m === 'more') WB.multiMenu(r.left, r.bottom + 4);
  });

  /* ---------- 단축키 ---------- */
  WB.multiKey = (e, mod, key) => {
    const ids = WB.multiIds();
    if (mod && key === 'a') { e.preventDefault(); WB.selectMany(doc().root.children.map(n => n.id)); return true; }
    if (mod && e.shiftKey && key === 'g') {
      const id = WB.selectedId(), n = WB.selectedNode();
      if (n && id !== 'root' && n.children?.length) { e.preventDefault(); const first = n.children[0].id; WB.unwrapNode(id); WB.selectMany(n.children.map(c => c.id).length > 1 ? n.children.map(c => c.id) : [first]); }
      return true;
    }
    if (ids.length < 2) return false;
    if (mod && key === 'g') { e.preventDefault(); group(ids); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeAll(ids); }
    else if (mod && key === 'd') { e.preventDefault(); duplicateAll(ids); }
    else if (e.key === 'Escape') WB.select(null);
    else if (e.key.startsWith('Arrow') && !e.altKey && nodes(ids).every(n => n.style.position === 'absolute' && n.attrs?.['data-lock'] == null)) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      WB.commit(d => finds(d, ids).forEach(f => {
        const g = geo(f.node.id);
        delete f.node.style.right; delete f.node.style.bottom;
        f.node.style.left = Math.max(0, g.x + dx) + 'px';
        f.node.style.top = Math.max(0, g.y + dy) + 'px';
      }), 'nudge-multi');
    } else return false;
    return true;
  };
})();
