'use strict';
/* 아이콘 · 글꼴 가져오기 — 저작권에 걸리지 않게 돕는 창
   - 아이콘: 무료 공개 라이선스 묶음(Font Awesome Free · Bootstrap Icons · Material Symbols · Tabler)을
     공식 CDN 링크로만 연결 (파일을 복사해 넣지 않음 → 라이선스 문구가 든 원본 CSS 를 그대로 씀)
   - 글꼴: Google Fonts(모두 OFL · Apache 같은 공개 라이선스) 이름으로 더하기, Pretendard(OFL) 연결
   - 검사: 페이지에 쓰인 유료 글꼴 · Font Awesome Pro 모양을 찾아 무료 대체로 한 번에 바꾸기 */
(() => {
  const { h, esc } = WB;

  /* ---------- 아이콘 묶음 ---------- */
  // 자주 쓰는 24가지: [뜻, fa, bi, ms, ti]
  const COMMON = [
    ['집', 'house', 'house', 'home', 'home'], ['찾기', 'magnifying-glass', 'search', 'search', 'search'],
    ['사람', 'user', 'person', 'person', 'user'], ['메일', 'envelope', 'envelope', 'mail', 'mail'],
    ['전화', 'phone', 'telephone', 'call', 'phone'], ['하트', 'heart', 'heart', 'favorite', 'heart'],
    ['별', 'star', 'star', 'star', 'star'], ['장바구니', 'cart-shopping', 'cart', 'shopping_cart', 'shopping-cart'],
    ['설정', 'gear', 'gear', 'settings', 'settings'], ['알림', 'bell', 'bell', 'notifications', 'bell'],
    ['달력', 'calendar', 'calendar', 'calendar_month', 'calendar'], ['확인', 'check', 'check-lg', 'check', 'check'],
    ['닫기', 'xmark', 'x-lg', 'close', 'x'], ['메뉴', 'bars', 'list', 'menu', 'menu-2'],
    ['오른쪽', 'arrow-right', 'arrow-right', 'arrow_forward', 'arrow-right'], ['내려받기', 'download', 'download', 'download', 'download'],
    ['카메라', 'camera', 'camera', 'photo_camera', 'camera'], ['위치', 'location-dot', 'geo-alt', 'location_on', 'map-pin'],
    ['자물쇠', 'lock', 'lock', 'lock', 'lock'], ['대화', 'comment', 'chat', 'chat', 'message'],
    ['더하기', 'plus', 'plus-lg', 'add', 'plus'], ['지우기', 'trash', 'trash', 'delete', 'trash'],
    ['고치기', 'pen', 'pencil', 'edit', 'pencil'], ['공유', 'share-nodes', 'share', 'share', 'share'],
  ];
  const FA_PRO = /\bfa-(light|thin|duotone|sharp(?:-duotone)?(?:-\w+)?|sharp)\b/g;
  WB.ICON_LIBS = [
    {
      key: 'fa', col: 1, name: 'Font Awesome Free', ver: '6.5.2', license: '아이콘 CC BY 4.0 · 글꼴 SIL OFL 1.1 · 코드 MIT',
      css: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
      site: 'https://fontawesome.com/search?o=r&m=free', example: 'rocket 또는 fa-brands fa-github',
      note: '무료는 fa-solid · fa-regular · fa-brands 뿐이에요. fa-light · fa-thin · fa-duotone · fa-sharp 는 유료(Pro)라서 넣을 때 fa-solid 로 바꿔요. 출처 표시는 연결한 CSS 파일 안에 들어 있어요. 브랜드 아이콘은 그 회사의 상표라서 그 회사를 가리킬 때만 쓰세요.',
      cls: n => {
        let c = n.trim().replace(/\s+/g, ' ');
        if (!/\bfa-/.test(c)) c = 'fa-' + c;
        c = c.replace(FA_PRO, 'fa-solid');
        if (!/\bfa-(solid|regular|brands)\b/.test(c)) c = 'fa-solid ' + c;
        return { tag: 'i', cls: [...new Set(c.split(' '))].join(' '), text: '' };
      },
    },
    {
      key: 'bi', col: 2, name: 'Bootstrap Icons', ver: '1.11.3', license: 'MIT',
      css: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
      site: 'https://icons.getbootstrap.com/', example: 'rocket-takeoff',
      note: '2,000개 넘는 선 아이콘. MIT 라이선스라 출처 표시 없이 써도 돼요.',
      cls: n => ({ tag: 'i', cls: 'bi bi-' + n.trim().replace(/^bi\s+/, '').replace(/^bi-/, ''), text: '' }),
    },
    {
      key: 'ms', col: 3, name: 'Material Symbols', ver: 'Google Fonts', license: 'Apache 2.0',
      css: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined',
      site: 'https://fonts.google.com/icons', example: 'rocket_launch',
      note: 'Google 의 아이콘 글꼴. 클래스 대신 글자(이름)로 모양을 고르는 방식이에요.',
      cls: n => ({ tag: 'span', cls: 'material-symbols-outlined', text: n.trim().toLowerCase().replace(/[\s-]+/g, '_') }),
    },
    {
      key: 'ti', col: 4, name: 'Tabler Icons', ver: '3.19.0', license: 'MIT',
      css: 'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css',
      site: 'https://tabler.io/icons', example: 'rocket',
      note: '5,000개 넘는 깔끔한 선 아이콘. MIT 라이선스.',
      cls: n => ({ tag: 'i', cls: 'ti ti-' + n.trim().replace(/^ti\s+/, '').replace(/^ti-/, ''), text: '' }),
    },
  ];
  // 링크로 쓰는 무료 글꼴 (Google Fonts 에 없는 것)
  WB.LINK_FONTS = [
    { key: 'pretendard', name: 'Pretendard', license: 'SIL OFL 1.1', fallback: 'sans-serif',
      css: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css',
      note: '한국에서 많이 쓰는 깔끔한 고딕. 상업용도 무료.' },
  ];
  const LINKED = [...WB.ICON_LIBS, ...WB.LINK_FONTS];
  const linkTag = l => `<link rel="stylesheet" href="${l.css}" data-lib="${l.key}">`;
  const hasLib = (doc, l) => (doc?.extra?.head || []).some(s => s.includes(l.css));
  const linkFontValue = f => `'${f.name}', ${f.fallback}`;

  /** 캔버스(Shadow DOM)에서도 보이게: 아이콘 CSS 는 캔버스 안에, @font-face 는 문서 쪽에도 (Shadow DOM 안의 @font-face 는 무시됨) */
  const docLinks = new Map();
  WB.syncLibLinks = (doc, shadow, page) => {
    const want = LINKED.filter(l => hasLib(doc, l));
    for (const l of LINKED) {
      let a = shadow.querySelector(`link[data-lib="${l.key}"]`);
      const on = want.includes(l);
      if (on && !a) shadow.insertBefore(h('link', { rel: 'stylesheet', href: l.css, 'data-lib': l.key }), page);
      if (!on && a) a.remove();
      if (on && !docLinks.has(l.key)) { const d = h('link', { rel: 'stylesheet', href: l.css }); document.head.append(d); docLinks.set(l.key, d); }
    }
  };
  /** 페이지에 라이브러리 링크 걸기 (<head> 에 들어가 저장한 페이지에서도 그대로 동작) */
  function connect(l, quiet) {
    const doc = WB.canvasDoc();
    if (!doc || hasLib(doc, l)) return;
    WB.commit(d => { d.extra = { ...WB.emptyExtra(), ...d.extra, head: [...(d.extra?.head || []), linkTag(l)] }; }, `lib:${l.key}:${Date.now()}`);
    if (!quiet) WB.toast(`「${l.name}」 을(를) 이 페이지에 연결했어요`, 'ok');
  }
  function disconnect(l) {
    WB.commit(d => { d.extra = { ...d.extra, head: (d.extra?.head || []).filter(s => !s.includes(l.css)) }; }, `unlib:${l.key}:${Date.now()}`);
    WB.toast(`「${l.name}」 연결을 뺐어요 (그 아이콘들은 빈칸으로 보여요)`);
  }
  // 모달 안 미리보기를 위해 문서 쪽에도 읽어 둠
  const preload = l => { if (!docLinks.has(l.key)) { const d = h('link', { rel: 'stylesheet', href: l.css }); document.head.append(d); docLinks.set(l.key, d); } };

  /** 고른 곳에 아이콘 넣기 (상자를 골랐으면 그 안, 아니면 바로 뒤, 없으면 맨 끝) */
  function insertIcon(l, name) {
    const doc = WB.canvasDoc();
    if (!doc) return WB.toast('먼저 페이지를 여세요', 'error');
    const raw = String(name || '').trim();
    if (!raw) return;
    const pro = l.key === 'fa' && FA_PRO.test(raw);
    FA_PRO.lastIndex = 0;
    const r = l.cls(raw);
    connect(l, true);
    const node = WB.makeNode(r.tag, { attrs: { class: r.cls, 'aria-hidden': 'true' }, style: { 'font-size': '24px' } });
    node.text = r.text;
    const sel = WB.selectedNode();
    if (sel && sel.id !== 'root' && WB.kindOf(sel) === 'container' && !WB.ACCEPTS[sel.tag]) WB.insertNode(node, sel.id);
    else if (sel && sel.id !== 'root') { const f = WB.find(doc.root, sel.id); WB.insertNode(node, f.parent.id, f.index + 1); }
    else WB.insertNode(node, 'root');
    WB.select(node.id);
    WB.emit('reveal', node.id);
    WB.toast(pro ? '유료(Pro) 모양이라 무료 fa-solid 로 바꿔 넣었어요' : `아이콘을 넣었어요 (${r.cls}${r.text ? ' · ' + r.text : ''}) — 크기는 글자 크기, 색은 글자 색으로`, pro ? '' : 'ok');
  }

  /* ---------- 글꼴 ---------- */
  /** Google Fonts 이름으로 더하기: 실제로 있는지 확인하고, 굵기 여러 개가 안 되면 기본 굵기로 */
  async function addGoogleFont(name, fallback) {
    name = name.trim().replace(/\s+/g, ' ').replace(/^['"]|['"]$/g, '');
    if (!name) return;
    const fam = encodeURIComponent(name).replace(/%20/g, '+');
    let spec = null;
    for (const s of ['wght@400;700', '']) {
      try {
        const r = await fetch(`https://fonts.googleapis.com/css2?family=${fam}${s ? ':' + s : ''}&display=swap`);
        if (r.ok) { spec = s; break; }
      } catch { /* 없는 글꼴은 Google 이 막음 */ }
    }
    if (spec === null) return WB.toast(`Google Fonts 에서 「${name}」 을(를) 찾지 못했어요. 이름 철자 · 띄어쓰기를 확인하세요`, 'error');
    const added = WB.addWebFont(name, spec, fallback);
    WB.toast(added ? `「${name}」 을(를) 글꼴 목록에 더했어요 (CSS 디자인 → 글꼴)` : `「${name}」 은(는) 이미 목록에 있어요`, 'ok');
    return name;
  }
  function useFont(value) {
    const sel = WB.selectedNode();
    const id = sel ? sel.id : 'root';
    WB.setStyles(id, { 'font-family': value }, `font:${Date.now()}`);
    WB.toast(`${id === 'root' ? '페이지 전체' : '고른 요소'}의 글꼴을 바꿨어요`, 'ok');
  }

  /* ---------- 저작권 검사 ---------- */
  // 웹에 올리려면 따로 웹 라이선스가 필요한 대표 글꼴 → 비슷한 무료(OFL) 글꼴 [이름, 무료, 굵기, 종류]
  const PAID = [
    [/^helvetica( neue)?$/i, 'Inter'], [/^futura( pt)?$/i, 'Jost', 'wght@400;500;700'], [/^gotham( rounded)?$/i, 'Montserrat'],
    [/^proxima nova$/i, 'Figtree', 'wght@400;500;700'], [/^avenir( next)?$/i, 'Nunito Sans', 'wght@400;600;700'],
    [/^gill sans( mt)?$/i, 'Lato', 'wght@400;700'], [/^(univers|frutiger|myriad( pro)?)$/i, 'Source Sans 3', 'wght@400;600;700'],
    [/^(circular( std)?|graphik|sofia pro|brandon grotesque|akzidenz[- ]grotesk)$/i, 'DM Sans'],
    [/^(sf pro( display| text)?|san francisco|-apple-system-ui)$/i, 'Inter'],
    [/^(didot|bodoni( moda)?)$/i, 'Playfair Display'], [/^(minion( pro)?|garamond premier( pro)?|adobe garamond( pro)?)$/i, 'EB Garamond', 'wght@400;700', 'serif'],
    [/^(윤고딕.*|yoon ?gothic.*|산돌.*|sandoll.*|rix.*|tmon.*)$/i, 'Noto Sans KR'],
    [/^(윤명조.*|yoon ?myungjo.*|hy.*명조.*)$/i, 'Noto Serif KR', 'wght@400;700', 'serif'],
  ];
  const familyNames = v => String(v).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  function scan(doc) {
    const fonts = new Map(); // 이름 → 쓰인 곳 수
    const pro = [];
    const visit = s => { for (const k of ['font-family', '--hl-font']) if (s?.[k]) for (const n of familyNames(s[k])) fonts.set(n, (fonts.get(n) || 0) + 1); };
    WB.walk(doc.root, n => {
      [n.style, n.styleTablet, n.styleMobile, n.styleHover].forEach(visit);
      if (/\bfa-/.test(n.attrs?.class || '') && FA_PRO.test(n.attrs.class)) pro.push(n.id);
      FA_PRO.lastIndex = 0;
    });
    for (const look of Object.values(doc.formats || {})) ['style', 'styleTablet', 'styleMobile', 'styleHover'].forEach(k => visit(look[k]));
    const css = [doc.extra?.cssTop, doc.extra?.css].filter(Boolean).join('\n');
    for (const m of css.matchAll(/font-family\s*:\s*([^;}]+)/gi)) for (const n of familyNames(m[1])) fonts.set(n, (fonts.get(n) || 0) + 1);
    const paid = [];
    for (const [n, count] of fonts) {
      const p = PAID.find(([re]) => re.test(n));
      if (p) paid.push({ name: n, count, alt: p[1], spec: p[2] ?? 'wght@400;500;700', fb: p[3] || 'sans-serif' });
    }
    const fontFiles = [...css.matchAll(/@font-face[^}]*url\(\s*['"]?([^'")]+)/gi)].map(m => m[1]);
    const kits = (doc.extra?.head || []).filter(s => /use\.typekit\.net|kit\.fontawesome\.com|fonts\.com|myfonts/i.test(s));
    return { paid, pro, fontFiles, kits };
  }
  function fixAll(doc, r) {
    for (const p of r.paid) WB.addWebFont(p.alt, p.spec, p.fb);
    const swap = v => familyNames(v).map(n => { const p = r.paid.find(x => x.name === n); return p ? `'${p.alt}'` : (/\s/.test(n) && !/^[\w-]+$/.test(n) ? `'${n}'` : n); }).filter((n, i, a) => a.indexOf(n) === i).join(', ');
    const fixStyle = s => { for (const k of ['font-family', '--hl-font']) if (s?.[k]) s[k] = swap(s[k]); };
    WB.commit(d => {
      WB.walk(d.root, n => {
        [n.style, n.styleTablet, n.styleMobile, n.styleHover].forEach(fixStyle);
        if (n.attrs?.class && /\bfa-/.test(n.attrs.class)) n.attrs.class = [...new Set(n.attrs.class.replace(FA_PRO, 'fa-solid').split(/\s+/))].join(' ');
      });
      for (const look of Object.values(d.formats || {})) ['style', 'styleTablet', 'styleMobile', 'styleHover'].forEach(k => fixStyle(look[k]));
      if (d.extra) for (const k of ['cssTop', 'css']) if (d.extra[k]) d.extra[k] = d.extra[k].replace(/(font-family\s*:\s*)([^;}]+)/gi, (_, a, v) => a + swap(v));
    }, `fixfonts:${Date.now()}`);
  }

  /* ---------- 창 ---------- */
  let lastTab = 'icons';
  WB.openLibs = (tab = lastTab) => {
    const tabs = h('div', { class: 'seg aw-tabs' });
    for (const [k, l] of [['icons', '아이콘 묶음'], ['fonts', '무료 글꼴'], ['check', '저작권 검사']]) tabs.append(h('button', { 'data-tab': k }, l));
    const body = h('div', { class: 'lib-body' });
    const m = WB.modal({
      title: '아이콘 · 글꼴 가져오기', sub: '공개 라이선스(무료) 것만 공식 링크로 연결해요 — 파일을 복사하지 않아서 저작권 걱정이 없어요', wide: true,
      content: h('div', { class: 'aw' }, h('div', { class: 'aw-bar' }, tabs), body),
      actions: [{ label: '닫기', onClick: close => close() }],
    });
    m.box.classList.add('aw-modal');
    const render = () => {
      tabs.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
      body.replaceChildren(...(tab === 'icons' ? iconsTab() : tab === 'fonts' ? fontsTab() : checkTab()));
    };
    tabs.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { tab = lastTab = b.dataset.tab; render(); } });

    function iconsTab() {
      const doc = WB.canvasDoc();
      return WB.ICON_LIBS.map(l => {
        preload(l);
        const on = hasLib(doc, l);
        const input = h('input', { type: 'text', class: 'lib-name', placeholder: '아이콘 이름 (예: ' + l.example + ')', spellcheck: 'false' });
        const add = h('button', { class: 'btn small primary', disabled: !doc || null }, '넣기');
        add.onclick = () => insertIcon(l, input.value);
        input.onkeydown = e => { if (e.key === 'Enter') add.click(); };
        const grid = h('div', { class: 'lib-icons' }, ...COMMON.map(row => {
          const r = l.cls(row[l.col]);
          const b = h('button', { class: 'lib-ico', title: `${row[0]} — ${r.cls}${r.text ? ' ' + r.text : ''}`, disabled: !doc || null, html: `<${r.tag} class="${esc(r.cls)}" aria-hidden="true">${esc(r.text)}</${r.tag}>` });
          b.onclick = () => { m.close(); insertIcon(l, row[l.col]); };
          return b;
        }));
        return h('section', { class: 'lib-card' },
          h('div', { class: 'lib-head' },
            h('b', {}, l.name), h('span', { class: 'lib-lic' }, l.license),
            h('span', { class: 'spacer' }),
            on ? h('button', { class: 'btn small', onclick: () => { disconnect(l); render(); } }, '연결 빼기') : h('button', { class: 'btn small', disabled: !doc || null, onclick: () => { connect(l); render(); } }, '이 페이지에 연결'),
            h('a', { class: 'btn small', href: l.site, target: '_blank', rel: 'noopener' }, '아이콘 찾아보기 ↗')),
          h('p', { class: 'lib-note' }, (on ? '✓ 연결됨. ' : '') + l.note),
          grid,
          h('div', { class: 'lib-row' }, input, add));
      });
    }

    function fontsTab() {
      const doc = WB.canvasDoc();
      const name = h('input', { type: 'text', class: 'lib-name', placeholder: 'Google Fonts 글꼴 이름 (예: Gothic A1, Hahmlet, Lato)', spellcheck: 'false' });
      const kind = h('select', {}, ...[['sans-serif', '고딕 계열'], ['serif', '명조 계열'], ['monospace', '고정폭'], ['cursive', '손글씨']].map(([v, l]) => h('option', { value: v }, l)));
      const add = h('button', { class: 'btn small primary' }, '목록에 더하기');
      add.onclick = async () => { add.disabled = true; const n = await addGoogleFont(name.value, kind.value); add.disabled = false; if (n) render(); };
      name.onkeydown = e => { if (e.key === 'Enter') add.click(); };
      let mine = [];
      try { mine = JSON.parse(localStorage.getItem('wb.webFonts') || '[]'); } catch { /* 없음 */ }
      return [
        h('section', { class: 'lib-card' },
          h('div', { class: 'lib-head' }, h('b', {}, 'Google Fonts 에서 더하기'), h('span', { class: 'lib-lic' }, 'SIL OFL · Apache — 상업용 무료'), h('span', { class: 'spacer' }),
            h('a', { class: 'btn small', href: 'https://fonts.google.com/?subset=korean', target: '_blank', rel: 'noopener' }, '글꼴 찾아보기 ↗')),
          h('p', { class: 'lib-note' }, 'Google Fonts 의 글꼴은 모두 공개 라이선스예요. 이름을 적으면 실제로 있는지 확인하고 「CSS 디자인 → 글꼴」 목록에 더해요. 저장한 페이지는 Google 링크로 글꼴을 불러와서 글꼴 파일을 따로 올리지 않아도 돼요.'),
          h('div', { class: 'lib-row' }, name, kind, add),
          mine.length ? h('div', { class: 'lib-fonts' }, ...mine.map(([n, , fb]) => h('button', { class: 'btn small', disabled: !doc || null, style: `font-family:'${n}', ${fb}`, title: '고른 요소(없으면 페이지 전체)에 쓰기', onclick: () => { m.close(); useFont(`'${n}', ${fb}`); } }, n))) : null),
        ...WB.LINK_FONTS.map(f => {
          preload(f);
          const on = hasLib(doc, f);
          return h('section', { class: 'lib-card' },
            h('div', { class: 'lib-head' }, h('b', { style: `font-family:'${f.name}'` }, f.name), h('span', { class: 'lib-lic' }, f.license), h('span', { class: 'spacer' }),
              h('button', { class: 'btn small primary', disabled: !doc || null, onclick: () => { connect(f, true); m.close(); useFont(linkFontValue(f)); } }, '연결하고 쓰기'),
              on ? h('button', { class: 'btn small', onclick: () => { disconnect(f); render(); } }, '연결 빼기') : null),
            h('p', { class: 'lib-note', style: `font-family:'${f.name}'` }, (on ? '✓ 연결됨. ' : '') + f.note + ' 다람쥐 헌 쳇바퀴에 타고파 0123456789'));
        }),
        h('section', { class: 'lib-card' },
          h('div', { class: 'lib-head' }, h('b', {}, '유료 글꼴을 쓰고 싶을 때')),
          h('p', { class: 'lib-note' }, '컴퓨터에 깔린 글꼴(맑은 고딕 등)은 이름만 적는 것이라 괜찮지만, 보는 사람 컴퓨터에 없으면 다른 글꼴로 보여요. 유료 글꼴 파일을 웹에 올리려면 「웹폰트 라이선스」를 산 경우에만 그 회사가 준 링크(예: Adobe Fonts)를 쓰세요. 잘 모르겠으면 「저작권 검사」 탭에서 비슷한 무료 글꼴로 바꾸세요.')),
      ];
    }

    function checkTab() {
      const doc = WB.canvasDoc();
      if (!doc) return [h('p', { class: 'aw-empty' }, '페이지를 열면 검사할 수 있어요.')];
      const r = scan(doc);
      const out = [];
      const ok = !r.paid.length && !r.pro.length && !r.fontFiles.length && !r.kits.length;
      out.push(h('p', { class: ok ? 'lib-ok' : 'lib-warn' }, ok ? '✓ 문제될 만한 글꼴 · 아이콘을 찾지 못했어요.' : '아래를 확인하세요. 「모두 무료로 바꾸기」를 누르면 한 번에 바꿔요 (Ctrl+Z 로 되돌릴 수 있어요).'));
      out.push(h('p', { class: 'lib-disclaimer' }, '⚠ 이 검사는 널리 알려진 유료 글꼴 이름 · 링크만 찾는 간단한 검사라서 정확하지 않을 수 있어요. 목록에 없는 유료 글꼴이나 그림 · 사진 · 글의 저작권은 찾지 못해요. 문제없다고 나와도, 쓰는 글꼴 · 아이콘 · 그림의 라이선스는 만든 곳의 안내를 보고 직접 확인하세요. 법률 판단이 아닙니다.'));
      if (r.paid.length) out.push(h('section', { class: 'lib-card' }, h('div', { class: 'lib-head' }, h('b', {}, '웹 라이선스가 필요한 글꼴')),
        h('table', { class: 'lib-table' }, h('tr', {}, h('th', {}, '쓰인 글꼴'), h('th', {}, '쓰인 곳'), h('th', {}, '→ 무료 대체 (OFL)')),
          ...r.paid.map(p => h('tr', {}, h('td', {}, p.name), h('td', {}, p.count + '곳'), h('td', {}, p.alt))))));
      if (r.pro.length) out.push(h('section', { class: 'lib-card' }, h('div', { class: 'lib-head' }, h('b', {}, `Font Awesome Pro(유료) 모양 ${r.pro.length}개`)),
        h('p', { class: 'lib-note' }, 'fa-light · fa-thin · fa-duotone · fa-sharp 는 Pro 구독이 있어야 보여요. 무료 fa-solid 로 바꿔요.')));
      if (r.kits.length) out.push(h('section', { class: 'lib-card' }, h('div', { class: 'lib-head' }, h('b', {}, '계정이 필요한 글꼴 · 아이콘 링크')),
        h('p', { class: 'lib-note' }, 'Adobe Fonts · Font Awesome Kit 같은 링크는 그 계정의 라이선스로만 쓸 수 있어요. 내 계정 것이 맞는지 확인하세요.'), h('pre', { class: 'lib-pre' }, r.kits.join('\n'))));
      if (r.fontFiles.length) out.push(h('section', { class: 'lib-card' }, h('div', { class: 'lib-head' }, h('b', {}, '직접 넣은 글꼴 파일 (@font-face)')),
        h('p', { class: 'lib-note' }, '글꼴 파일을 웹에 올리는 것은 그 글꼴이 무료(OFL 등)이거나 웹폰트 라이선스가 있을 때만 괜찮아요. 출처를 확인하세요.'), h('pre', { class: 'lib-pre' }, r.fontFiles.join('\n'))));
      if (r.paid.length || r.pro.length) out.push(h('div', { class: 'lib-row' }, h('button', { class: 'btn primary', onclick: () => { fixAll(doc, r); WB.toast('무료 글꼴 · 아이콘으로 바꿨어요', 'ok'); render(); } }, '모두 무료로 바꾸기')));
      return out;
    }
    render();
  };
})();
