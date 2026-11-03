'use strict';
/* 탭5 — 동작 (JS 블록 코딩)
   위쪽 목록에서 블록을 끌어와 아래 작업판에 끼워 맞추면, 저장/코드로 변환할 때 <script> 로 만들어짐 */
(() => {
  const { $, h, icon } = WB;
  const DEFS = WB.BLOCK_DEFS;
  const panel = $('#tab5');

  panel.innerHTML = `
    <div class="panel-head"><span class="panel-title">블록 코딩 <b>JS</b></span>
      <div class="blk-mode seg mini" title="블록으로 만들기 / JavaScript 직접 쓰기">
        <button data-mode="blocks" class="on">블록</button><button data-mode="code">코드</button>
      </div>
      <div class="head-actions">
        <button class="blk-run" data-act="run" title="페이지를 새 창에서 열어 블록을 실행해 봐요">▶ 시작하기</button>
        <button class="icon-btn" data-act="max" title="블록 작업판 크게 / 원래대로">${icon('wide')}</button>
        <button class="icon-btn" data-act="tidy" title="블록 묶음 가지런히 정리">${icon('alignL')}</button>
        <button class="icon-btn" data-act="code" title="만들어진 JavaScript 보기">${icon('code')}</button>
      </div>
    </div>
    <div class="blk-body">
      <div class="blk-cats">${WB.BLOCK_CATS.map((c, i) => `<button class="blk-cat ${i ? '' : 'on'}" data-cat="${c.id}" style="--c:${c.c}" title="${c.name}"><span class="ci">${c.icon}</span><span class="cn">${c.name}</span></button>`).join('')}</div>
      <div class="blk-palette"></div>
      <div class="blk-ws"><div class="blk-ws-inner"></div></div>
    </div>
    <div class="blk-codebox" hidden>
      <div class="blk-code-hint">블록과 함께 실행돼요. <code>el('id')</code> 로 요소 찾기, <code>on('id', 'click', () => { … })</code> 로 이벤트, 블록에서 만든 변수는 <code>vars['이름']</code>.</div>
      <div class="blk-code-wrap"><pre class="blk-code-gutter">1</pre><textarea class="blk-code" spellcheck="false" placeholder="// 여기에 JavaScript 를 직접 써요&#10;on('button1', 'click', () => {&#10;  alert('안녕!');&#10;});"></textarea></div>
      <div class="blk-code-err" hidden></div>
    </div>
    <div class="blk-foot">블록을 작업판으로 끌어와 끼워 맞추세요. 지우려면 블록 꾸러미로 다시 끌어다 놓아요.</div>`;
  const pal = panel.querySelector('.blk-palette');
  const ws = panel.querySelector('.blk-ws');
  const inner = panel.querySelector('.blk-ws-inner');
  const snap = h('div', { class: 'bk-snap', hidden: true });
  let cat = 'start';
  const blockData = () => WB.canvasDoc()?.blocks || WB.emptyBlocks();

  /* ---------- 캔버스 요소 목록 (블록에서 고를 대상) ---------- */
  const FILTERS = {
    any: () => true,
    input: n => (n.tag === 'input' && !['checkbox', 'radio', 'submit', 'button'].includes(n.attrs.type)) || n.tag === 'textarea' || n.tag === 'select',
    check: n => n.tag === 'input' && ['checkbox', 'radio'].includes(n.attrs.type),
    form: n => n.tag === 'form',
    media: n => n.tag === 'audio' || n.tag === 'video',
    box: n => WB.kindOf(n) === 'container',
    text: n => WB.kindOf(n) === 'text',
  };
  function elementList(filter) {
    const doc = WB.canvasDoc();
    const out = [];
    if (doc) WB.walk(doc.root, n => { if (n.id !== 'root' && FILTERS[filter](n)) out.push(n); });
    return out;
  }
  const elLabel = n => {
    const t = (n.text || n.attrs.placeholder || '').trim().slice(0, 14);
    return WB.labelOf(n) + (t ? ` "${t}"` : '');
  };
  /** 요소 칸에 고를 수 있는 특별한 값: 그때그때 정해지는 요소 */
  const SPECIAL_EL = WB.SPECIAL_EL;
  const elValueLabel = v => (SPECIAL_EL[v] ? '⟐ ' + SPECIAL_EL[v] : '#' + v);
  // 한 번 그릴 때 함께 쓰는 id · 이름표 목록 (그릴 때마다 새로 만듦)
  let cache = null;
  const scan = () => {
    if (cache) return cache;
    cache = { ids: new Set(), classes: new Set() };
    const doc = WB.canvasDoc();
    if (doc) WB.walk(doc.root, n => {
      if (n.attrs.id) cache.ids.add(n.attrs.id);
      (n.attrs.class || '').split(/\s+/).filter(Boolean).forEach(c => cache.classes.add(c));
    });
    return cache;
  };
  const idSet = () => scan().ids;
  const classSet = () => scan().classes;
  /** 요소 고르기 목록을 펼치기 직전에 채움 */
  function fillElSelect(sel) {
    if (sel.dataset.filled) return;
    sel.dataset.filled = '1';
    const v = sel.value;
    sel.innerHTML = '';
    sel.append(new Option('요소 고르기…', ''));
    const sp = h('optgroup', { label: '그때그때 정해지는 요소' });
    for (const [k, l] of Object.entries(SPECIAL_EL)) sp.append(new Option('⟐ ' + l, k));
    sel.append(sp);
    let found = !v || !!SPECIAL_EL[v];
    const grp = h('optgroup', { label: '캔버스의 요소' });
    for (const n of elementList(sel.dataset.filter)) {
      const value = n.attrs.id || 'node:' + n.id;
      if (value === v) found = true;
      grp.append(new Option((n.attrs.id ? '#' + n.attrs.id + ' · ' : '') + elLabel(n), value));
    }
    sel.append(grp);
    if (!found) sel.append(new Option(`(없는 요소 #${v})`, v));
    sel.value = v;
  }

  /** 블록에서 고른 요소에 id 가 없으면 영어 id 를 붙여 줌 (JS 에서 찾을 이름) */
  const ID_BASE = { button: 'button', input: 'input', textarea: 'textarea', select: 'choice', form: 'form', a: 'link', img: 'image', p: 'text', span: 'text', label: 'label', h1: 'title', h2: 'title', h3: 'title', div: 'box' };
  function uniqueId(doc, n) {
    const used = new Set();
    WB.walk(doc.root, x => x.attrs.id && used.add(x.attrs.id));
    const base = ID_BASE[n.tag] || n.tag;
    let i = 1;
    while (used.has(base + i)) i++;
    return base + i;
  }

  /* ---------- 블록 그리기 ---------- */
  function renderBlock(b, mode) {
    const def = DEFS[b.type];
    const style = `--c:${WB.blockColor(b.type)}`;
    if (def.shape === 'c' || def.shape === 'c2') {
      const wrap = h('div', { class: 'bk-c', 'data-bid': b.id, style });
      wrap.append(bar(b, def.text, 'bk bk-top', mode), mouth(b, 'body', mode));
      if (def.shape === 'c2') wrap.append(h('div', { class: 'bk bk-mid2' }, h('span', { class: 'bk-t' }, def.text2)), mouth(b, 'body2', mode));
      wrap.append(h('div', { class: 'bk bk-bot' }));
      return wrap;
    }
    const el = bar(b, def.text, 'bk ' + def.shape, mode);
    el.setAttribute('data-bid', b.id);
    el.setAttribute('style', style);
    return el;
  }
  /** 엔트리처럼: 시작 블록은 왼쪽에 동그란 아이콘, 일반 블록은 오른쪽 끝에 분류 아이콘 */
  function decorate(el, b, cls) {
    const def = DEFS[b.type];
    if (def.shape === 'hat') el.prepend(h('span', { class: 'bk-ico' }, def.icon || '▶'));
    else if (def.shape === 'stack' || cls.includes('bk-top')) el.append(h('span', { class: 'bk-end' }, WB.blockCatIcon(b.type)));
  }
  const mouth = (b, key, mode) => h('div', { class: 'bk-mid' }, h('div', { class: 'bk-arm' }), listEl(b[key], `${b.id}:${key}`, mode));
  function listEl(list, path, mode) {
    const el = h('div', { class: 'bk-list', 'data-path': path });
    for (const b of list) el.append(renderBlock(b, mode));
    return el;
  }
  function bar(b, text, cls, mode) {
    const el = h('div', { class: cls });
    for (const part of text.split(/(\{\w+\})/)) {
      const m = part.match(/^\{(\w+)\}$/);
      if (m) el.append(slot(b, m[1], mode));
      else if (part.trim()) el.append(h('span', { class: 'bk-t' }, part.trim()));
    }
    if (text === DEFS[b.type].text) decorate(el, b, cls);
    return el;
  }
  function slot(b, name, mode) {
    const spec = DEFS[b.type].args[name];
    const v = b.args[name];
    const accept = spec.type === 'bool' ? 'bool' : spec.type === 'text' || spec.type === 'num' ? 'any' : '';
    const wrap = h('span', { class: 'sl-wrap', 'data-owner': b.id, 'data-slot': name, 'data-accept': accept || null });
    if (v && typeof v === 'object') {
      wrap.setAttribute('data-filled', '');
      wrap.append(renderBlock(v, mode));
      return wrap;
    }
    const live = mode === 'ws';
    if (spec.type === 'el') {
      if (!live) { wrap.append(h('span', { class: 'sl dd' }, v ? elValueLabel(v) : '요소')); return wrap; }
      // 목록은 펼칠 때 채움 (요소가 많은 페이지에서 고칠 때마다 수천 개 항목을 다시 만들지 않게)
      const sel = h('select', { class: 'sl', 'data-arg': name, 'data-filter': spec.filter, title: '캔버스에 있는 요소 고르기' });
      sel.append(new Option(v ? elValueLabel(v) : '요소 고르기…', v || ''));
      sel.value = v || '';
      sel.classList.toggle('warn', !v || (!SPECIAL_EL[v] && !idSet().has(v)));
      wrap.append(sel);
    } else if (spec.type === 'cls') {
      // 이름표: 캔버스 요소들의 이름표(class)에 쓰인 단어 목록
      if (!live) { wrap.append(h('span', { class: 'sl dd dark' }, v ? '.' + v : '이름표')); return wrap; }
      const names = classSet();
      const sel = h('select', { class: 'sl dark', 'data-arg': name, title: '탭2 속성의 「이름표」에 적은 이름' });
      sel.append(new Option(names.size ? '이름표 고르기…' : '(이름표 없음)', ''));
      for (const c of [...names].sort()) sel.append(new Option('.' + c, c));
      if (v && !names.has(v)) sel.append(new Option(`(없음: ${v})`, v));
      sel.value = v || '';
      sel.classList.toggle('warn', !v || !names.has(v));
      wrap.append(sel);
    } else if (spec.type === 'var' || spec.type === 'signal') {
      const names = blockData()[spec.type === 'var' ? 'vars' : 'signals'] || [];
      if (!live) { wrap.append(h('span', { class: 'sl dd dark' }, v || (spec.type === 'var' ? '변수' : '신호'))); return wrap; }
      const sel = h('select', { class: 'sl dark', 'data-arg': name });
      if (!names.includes(v)) sel.append(new Option(v ? `(없음: ${v})` : '고르기…', v));
      for (const n of names) sel.append(new Option(n, n));
      sel.value = v;
      sel.classList.toggle('warn', !names.includes(v));
      wrap.append(sel);
    } else if (spec.type === 'choice') {
      const sel = h('select', { class: 'sl dark', 'data-arg': name, disabled: !live });
      for (const [value, label] of spec.options) sel.append(new Option(label, value));
      sel.value = v;
      wrap.append(sel);
    } else if (spec.type === 'color') {
      wrap.append(h('input', { type: 'color', class: 'sl sl-color', 'data-arg': name, value: v || '#000000', disabled: !live }));
    } else if (spec.type === 'bool') {
      wrap.append(h('span', { class: 'sl-bool', title: '초록색 참/거짓 블록을 끼워 넣으세요' }));
    } else {
      wrap.append(h('input', {
        type: 'text', class: 'sl', 'data-arg': name, value: v ?? '', spellcheck: 'false', readonly: !live,
        size: Math.max(2, String(v ?? '').length + 1), inputmode: spec.type === 'num' ? 'decimal' : null,
      }));
    }
    return wrap;
  }

  /* ---------- 블록 목록 · 작업판 ---------- */
  const LIST_INFO = {
    vars: { make: '변수 만들기', ask: '새 변수 이름', ph: '예: 점수', empty: '변수를 만들면 변수 블록이 나타나요.' },
    signals: { make: '신호 만들기', ask: '새 신호 이름', ph: '예: 게임 시작', empty: '신호를 만들면 신호 블록이 나타나요.' },
  };
  const CAT_LIST = { start: 'signals', variable: 'vars' };

  function renderPalette() {
    const info = WB.BLOCK_CATS.find(c => c.id === cat);
    const d = blockData();
    pal.innerHTML = '';
    pal.style.setProperty('--c', info.c);
    pal.append(h('div', { class: 'pal-title' }, info.name));
    const listKey = CAT_LIST[cat];
    if (listKey) {
      // 엔트리처럼 꾸러미 위쪽에 「변수 만들기」 · 「신호 만들기」
      const L = LIST_INFO[listKey];
      pal.append(h('button', { class: 'pal-make', 'data-make': listKey }, '+ ' + L.make));
      const names = d[listKey] || [];
      if (names.length) {
        const chips = h('div', { class: 'pal-names' });
        for (const n of names) chips.append(h('span', { class: 'pal-name' }, n, h('button', { 'data-del': listKey, 'data-name': n, title: '지우기' }, '×')));
        pal.append(chips);
      } else pal.append(h('div', { class: 'pal-hint' }, L.empty));
    }
    for (const [type, def] of Object.entries(DEFS)) {
      if (def.cat !== cat || def.hidden) continue;
      if (def.needs && !(d[def.needs] || []).length) continue;
      const b = WB.newBlock(type, d);
      b.id = 'pal:' + type;
      pal.append(h('div', { class: 'pal-row' }, renderBlock(b, 'pal')));
    }
    panel.querySelectorAll('.blk-cat').forEach(x => x.classList.toggle('on', x.dataset.cat === cat));
  }

  /** 이름 묻기 창 */
  function askName(title, placeholder) {
    return new Promise(resolve => {
      const input = h('input', { type: 'text', placeholder, spellcheck: 'false', style: 'width:100%;height:32px' });
      let done = false;
      const finish = (close, v) => { if (done) return; done = true; close(); resolve(v); };
      const m = WB.modal({
        title,
        content: input,
        actions: [
          { label: '취소', onClick: close => finish(close, null) },
          { label: '만들기', primary: true, onClick: close => finish(close, input.value.trim() || null) },
        ],
      });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') finish(m.close, input.value.trim() || null); });
      setTimeout(() => input.focus());
    });
  }

  pal.addEventListener('click', async e => {
    const make = e.target.closest('[data-make]')?.dataset.make;
    const del = e.target.closest('[data-del]');
    if (make) {
      const L = LIST_INFO[make];
      const name = await askName(L.make, L.ph);
      if (!name) return;
      if ((blockData()[make] || []).includes(name)) return WB.toast(`'${name}' 은(는) 이미 있어요`, 'error');
      WB.commit(doc => (doc.blocks[make] ||= []).push(name));
    } else if (del) {
      const key = del.dataset.del, name = del.dataset.name;
      if (!confirm(`'${name}' 을(를) 지울까요? 이 이름을 쓰는 블록은 노란색 경고로 표시돼요.`)) return;
      WB.commit(doc => (doc.blocks[key] = (doc.blocks[key] || []).filter(n => n !== name)));
    }
  });

  let work = null; // 끄는 동안 쓰는 블록 데이터 사본
  const data = () => work || WB.canvasDoc()?.blocks || { scripts: [] };
  const blockById = (d, id) => {
    const loc = WB.locateBlock(d, id);
    return loc && (loc.list ? loc.list[loc.index] : loc.parent.args[loc.name]);
  };

  function renderWs() {
    cache = null;
    inner.innerHTML = '';
    panel.classList.toggle('disabled', !WB.canvasDoc());
    if (!WB.canvasDoc()) {
      inner.append(h('div', { class: 'blk-empty' }, 'HTML 페이지를 열면 블록을 쓸 수 있어요.'));
      return;
    }
    const d = data();
    d.scripts.forEach((s, i) => {
      const sc = h('div', { class: 'bk-script', style: `left:${s.x}px;top:${s.y}px` });
      sc.append(listEl(s.blocks, `script:${i}`, 'ws'));
      inner.append(sc);
    });
    if (!d.scripts.length && !work)
      inner.append(h('div', { class: 'blk-empty' }, '위에서 노란색 「…했을 때」 블록을 이곳으로 끌어온 다음, 그 아래에 파란 동작 블록을 붙여 보세요.'));
    snap.hidden = true;
    inner.append(snap);
    let w = 0, ht = 0;
    inner.querySelectorAll('.bk-script').forEach(sc => {
      w = Math.max(w, sc.offsetLeft + sc.offsetWidth);
      ht = Math.max(ht, sc.offsetTop + sc.offsetHeight);
    });
    inner.style.width = w + 120 + 'px';
    inner.style.height = ht + 160 + 'px';
  }

  /* ---------- 끌어서 끼우기 ---------- */
  let drag = null, ghost = null, hot = null;

  function onDown(e) {
    if (e.button !== 0 || !WB.canvasDoc()) return;
    const inWs = ws.contains(e.target);
    if (inWs && e.target.closest('input, select')) return; // 칸 안 글자 고치기
    const bEl = e.target.closest('[data-bid]');
    if (!bEl) return;
    e.preventDefault();
    const r = bEl.getBoundingClientRect();
    drag = { id: bEl.dataset.bid, fromWs: inWs, sx: e.clientX, sy: e.clientY, gx: e.clientX - r.left, gy: e.clientY - r.top, started: false };
    addEventListener('pointermove', onMove);
    addEventListener('pointerup', onUp);
    addEventListener('pointercancel', onUp);
  }

  function begin() {
    work = JSON.parse(JSON.stringify(WB.canvasDoc().blocks));
    if (!drag.fromWs) drag.stack = [WB.newBlock(drag.id.slice(4), work)];
    else {
      // 잡은 블록과 그 아래 블록들을 함께 떼어 냄 (값 블록은 그것만)
      const loc = WB.locateBlock(work, drag.id);
      if (loc.list) {
        drag.stack = loc.list.splice(loc.index);
        if (!loc.script.blocks.length) work.scripts.splice(work.scripts.indexOf(loc.script), 1);
      } else {
        drag.stack = [loc.parent.args[loc.name]];
        loc.parent.args[loc.name] = DEFS[loc.parent.type].args[loc.name].def ?? '';
      }
    }
    ghost = h('div', { class: 'bk-ghost' }, listEl(drag.stack, 'ghost', 'ghost'));
    document.body.append(ghost);
    document.body.classList.add('bk-dragging');
    renderWs();
  }

  function onMove(e) {
    if (!drag) return;
    if (!drag.started) {
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 4) return;
      drag.started = true;
      begin();
    }
    ghost.style.left = e.clientX - drag.gx + 'px';
    ghost.style.top = e.clientY - drag.gy + 'px';
    drag.target = findTarget();
    showTarget(drag.target);
  }

  /** 가장 가까운 끼울 자리 찾기 */
  function findTarget() {
    const first = drag.stack[0];
    const shape = DEFS[first.type].shape;
    const fr = ghost.querySelector('[data-bid]').getBoundingClientRect();
    if (shape === 'rep' || shape === 'bool') {
      // 값 블록 → 비어 있는 값 칸
      const px = fr.left, py = fr.top + fr.height / 2;
      let best = null, bestArea = Infinity;
      inner.querySelectorAll('.sl-wrap[data-accept]:not([data-filled])').forEach(w => {
        if (w.dataset.accept === 'bool' && shape !== 'bool') return;
        const r = w.getBoundingClientRect();
        if (px >= r.left - 14 && px <= r.right + 4 && py >= r.top - 12 && py <= r.bottom + 12 && r.width * r.height < bestArea) {
          bestArea = r.width * r.height;
          best = { slot: w.dataset.slot, owner: w.dataset.owner, el: w };
        }
      });
      return best;
    }
    if (shape === 'hat') return null; // 시작 블록은 항상 새 묶음의 맨 위
    const gr = ghost.getBoundingClientRect();
    let best = null, bestD = 32;
    const consider = (x, y, from, cand) => {
      const d = Math.hypot(x - from.x, y - from.y);
      if (d < bestD) { bestD = d; best = { ...cand, x, y }; }
    };
    const top = { x: fr.left, y: fr.top }, bottom = { x: gr.left, y: gr.bottom };
    inner.querySelectorAll('.bk-list').forEach(list => {
      const path = list.dataset.path;
      const blocks = WB.listAt(work, path) || [];
      if (blocks[0] && WB.isValueBlock(blocks[0])) return; // 따로 놓인 값 블록 아래에는 못 붙임
      const kids = [...list.children];
      kids.forEach((k, i) => {
        const r = k.getBoundingClientRect();
        consider(r.left, r.bottom, top, { path, index: i + 1 });
      });
      if (!path.startsWith('script:')) {
        const r = list.getBoundingClientRect();
        consider(r.left, r.top, top, { path, index: 0 });
      } else if (kids.length && DEFS[blocks[0].type].shape !== 'hat') {
        const r = kids[0].getBoundingClientRect();
        consider(r.left, r.top, bottom, { path, index: 0, prepend: true });
      }
    });
    return best;
  }

  function showTarget(t) {
    hot?.classList.remove('sl-hot');
    hot = null;
    snap.hidden = !t || !!t.slot;
    if (!t) return;
    if (t.slot) { hot = t.el; hot.classList.add('sl-hot'); return; }
    const ir = inner.getBoundingClientRect();
    snap.style.left = t.x - ir.left + 'px';
    snap.style.top = t.y - ir.top - 2 + 'px';
  }

  function onUp(e) {
    removeEventListener('pointermove', onMove);
    removeEventListener('pointerup', onUp);
    removeEventListener('pointercancel', onUp);
    const d = drag;
    drag = null;
    if (!d || !d.started) return;
    const fr = ghost.querySelector('[data-bid]').getBoundingClientRect();
    ghost.remove();
    document.body.classList.remove('bk-dragging');
    showTarget(null);
    const result = work;
    work = null;
    const wr = ws.getBoundingClientRect();
    const overWs = e.type === 'pointerup' && e.clientX >= wr.left && e.clientX <= wr.right && e.clientY >= wr.top && e.clientY <= wr.bottom;
    if (!overWs && !d.fromWs) { renderWs(); return; } // 목록에서 꺼냈다가 그냥 놓음
    if (overWs) {
      const t = d.target;
      const ir = inner.getBoundingClientRect();
      const x = Math.max(4, Math.round(fr.left - ir.left)), y = Math.max(4, Math.round(fr.top - ir.top));
      if (t && t.slot) blockById(result, t.owner).args[t.slot] = d.stack[0];
      else if (t) {
        WB.listAt(result, t.path).splice(t.index, 0, ...d.stack);
        if (t.prepend) Object.assign(result.scripts[+t.path.split(':')[1]], { x, y });
      } else result.scripts.push({ x, y, blocks: d.stack });
    }
    // 작업판 밖(블록 목록 등)에 놓으면 지워짐
    WB.commit(doc => (doc.blocks = result), 'blocks:' + Date.now());
  }

  pal.addEventListener('pointerdown', onDown);
  ws.addEventListener('pointerdown', onDown);

  /* ---------- 칸 값 바꾸기 ---------- */
  ws.addEventListener('change', e => {
    const t = e.target;
    const name = t.dataset.arg;
    if (!name) return;
    const owner = t.closest('.sl-wrap').dataset.owner;
    let v = t.value;
    WB.commit(doc => {
      if (v.startsWith('node:')) {
        const n = WB.find(doc.root, v.slice(5)).node;
        n.attrs.id = uniqueId(doc, n);
        v = n.attrs.id;
      }
      blockById(doc.blocks, owner).args[name] = v;
    }, `barg:${owner}:${name}:${Date.now()}`);
  });
  const fillOnOpen = e => { if (e.target.matches?.('select[data-filter]')) fillElSelect(e.target); };
  ws.addEventListener('pointerdown', fillOnOpen, true);
  ws.addEventListener('focusin', fillOnOpen);
  ws.addEventListener('input', e => {
    if (e.target.matches('input.sl[type=text]')) e.target.size = Math.max(2, e.target.value.length + 1);
  });
  ws.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input.sl')) e.target.blur(); });

  /* ---------- 오른쪽 클릭 · 정리 · 코드 보기 ---------- */
  ws.addEventListener('contextmenu', e => {
    if (!WB.canvasDoc()) return;
    e.preventDefault();
    const id = e.target.closest('[data-bid]')?.dataset.bid;
    const items = [];
    if (id) {
      items.push(
        { label: '복제', icon: 'copy', action: () => WB.commit(doc => {
          const b = blockById(doc.blocks, id);
          const loc = WB.locateBlock(doc.blocks, id);
          const s = loc.script;
          doc.blocks.scripts.push({ x: s.x + 24, y: s.y + 24, blocks: [WB.cloneBlock(b)] });
        }) },
        { label: '이 블록 삭제', icon: 'trash', danger: true, action: () => WB.commit(doc => {
          const loc = WB.locateBlock(doc.blocks, id);
          if (loc.list) {
            loc.list.splice(loc.index, 1);
            if (!loc.script.blocks.length) doc.blocks.scripts.splice(doc.blocks.scripts.indexOf(loc.script), 1);
          } else loc.parent.args[loc.name] = DEFS[loc.parent.type].args[loc.name].def ?? '';
        }) },
        'sep');
    }
    items.push({ label: '가지런히 정리', icon: 'alignL', action: tidy });
    WB.menu(e.clientX, e.clientY, items);
  });

  function tidy() {
    const heights = [...inner.querySelectorAll('.bk-script')].map(s => s.offsetHeight);
    WB.commit(doc => {
      let y = 12;
      doc.blocks.scripts.forEach((s, i) => {
        Object.assign(s, { x: 12, y });
        y += (heights[i] || 40) + 20;
      });
    });
  }

  function showCode() {
    const doc = WB.canvasDoc();
    if (!doc) return;
    const js = WB.generateJS(doc.blocks) || '// 아직 실행될 블록이 없어요.\n// 노란색 「…했을 때」 블록 아래에 동작 블록을 붙여 보세요.\n';
    const n = js.split('\n').length;
    WB.modal({
      title: '만들어진 JavaScript',
      sub: '코드로 변환하면 HTML 의 <script> 안에 들어가요',
      wide: true,
      bodyClass: 'code',
      content: h('div', { class: 'code-view' },
        h('pre', { class: 'gutter' }, Array.from({ length: n }, (_, i) => i + 1).join('\n')),
        h('pre', { class: 'code' }, js)),
      actions: [{ label: '닫기', onClick: close => close() }],
    });
  }

  panel.querySelector('.head-actions').addEventListener('click', e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!WB.canvasDoc()) return;
    if (act === 'run') WB.preview();
    if (act === 'max') e.target.closest('[data-act]').classList.toggle('on', WB.toggleBlockMax());
    if (act === 'tidy') tidy();
    if (act === 'code') showCode();
  });
  panel.querySelector('.blk-cats').addEventListener('click', e => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    cat = b.dataset.cat;
    renderPalette();
  });

  /* ---------- 「코드」: JavaScript 직접 쓰기 ---------- */
  const body = panel.querySelector('.blk-body');
  const foot = panel.querySelector('.blk-foot');
  const codeBox = panel.querySelector('.blk-codebox');
  const ta = panel.querySelector('.blk-code');
  const gutter = panel.querySelector('.blk-code-gutter');
  const errEl = panel.querySelector('.blk-code-err');
  const modeBtns = panel.querySelectorAll('[data-mode]');
  let mode = 'blocks';
  function setMode(m) {
    mode = m;
    modeBtns.forEach(b => b.classList.toggle('on', b.dataset.mode === m));
    body.hidden = foot.hidden = m === 'code';
    codeBox.hidden = m !== 'code';
    if (m === 'code') syncCode();
  }
  function checkCode() {
    gutter.textContent = Array.from({ length: ta.value.split('\n').length }, (_, i) => i + 1).join('\n');
    let msg = '';
    try { new Function(ta.value); } catch (err) { msg = '문법 오류: ' + err.message; } // 실행하지 않고 문법만 검사
    errEl.textContent = msg;
    errEl.hidden = !msg;
    // 코드가 있으면 「코드」 버튼에 점 표시
    modeBtns[1].classList.toggle('has', !!ta.value.trim());
  }
  function syncCode() {
    if (document.activeElement !== ta) ta.value = blockData().code || '';
    ta.disabled = !WB.canvasDoc();
    checkCode();
  }
  panel.querySelector('.blk-mode').addEventListener('click', e => {
    const b = e.target.closest('[data-mode]');
    if (b) setMode(b.dataset.mode);
  });
  ta.addEventListener('input', () => {
    WB.commit(doc => (doc.blocks.code = ta.value), 'blk-code');
    checkCode();
  });
  ta.addEventListener('scroll', () => (gutter.scrollTop = ta.scrollTop));
  ta.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    e.preventDefault(); // 탭 키는 칸 이동 대신 들여쓰기
    ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end');
    ta.dispatchEvent(new Event('input'));
  });

  WB.on('change', () => { if (!drag?.started) { renderWs(); renderPalette(); } syncCode(); });
  WB.on('doc', () => { renderWs(); renderPalette(); syncCode(); });
  renderPalette();
  renderWs();
})();
