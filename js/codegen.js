'use strict';
/* 코드로 변환 — 문서 모델 ↔ HTML 코드 */
(() => {
  const VOID_HTML = new Set(['img', 'input', 'hr', 'br']);
  const BOOL_ATTRS = new Set(['controls', 'autoplay', 'muted', 'loop', 'checked', 'required', 'disabled', 'readonly', 'multiple', 'selected', 'allowfullscreen']);
  const SKIP_TAGS = new Set(['script', 'style', 'link', 'meta', 'noscript', 'template']);
  const GENERATOR = '블록 웹 편집기'; // <meta name="generator"> — 이 편집기로 만든 파일인지 알아보는 표시
  const escText = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const decls = (style, ind) =>
    Object.entries(style || {})
      .filter(([, v]) => v !== '' && v != null)
      .map(([k, v]) => `${ind}${k}: ${v};`)
      .join('\n');

  /** 문서 → 완성된 HTML 파일 내용.
      스타일은 <style data-wb> 안의 클래스로 모음. 스타일이 똑같은 요소는 같은 클래스를 함께 씀.
      클래스 이름: 이름표(class)가 같은 요소끼리 스타일도 같으면 그 이름표를 그대로 (.card, .nav-item),
      아니면 태그 종류 + 번호 (.title_1, .row_3 …) — 번호 붙은 이름은 편집기가 다시 열 때 지우고 새로 매김 */
  const MOBILE_MEDIA = '@media (max-width: 640px)';
  const TABLET_MEDIA = '@media (max-width: 1024px)';
  const GEN_CLASS = /^([a-z][a-z-]*_\d+|c\d+)$/; // 편집기가 붙이는 클래스 이름 (c1 은 예전 모양)
  const CLASS_BASE = { span: 'text', p: 'text', h1: 'title', h2: 'title', h3: 'title', h4: 'title', h5: 'title', h6: 'title', a: 'link', img: 'image', li: 'item', ul: 'list', ol: 'list', td: 'cell', th: 'head-cell', tr: 'row-line', svg: 'icon', textarea: 'input', select: 'input', hr: 'line', strong: 'text', em: 'text', b: 'text', small: 'text' };
  const classBase = n => {
    if (n.tag === 'div') {
      if (WB.isFree(n)) return 'free';
      if (n.style.display === 'grid') return 'grid';
      if ((n.style.display || '').includes('flex')) return n.style['flex-direction'] === 'column' ? 'col' : 'row';
      return 'box';
    }
    return CLASS_BASE[n.tag] || n.tag.replace(/[^a-z-]/g, '') || 'el';
  };
  /** 글자 → HTML (줄바꿈은 <br>, *강조* 는 <span class="hl">) */
  const textHTML = text => escText(text || '')
    .replace(/ {2,}/g, m => ' ' + '&nbsp;'.repeat(m.length - 1)) // 연속 공백은 HTML 에서 하나로 줄어들어서
    .replace(WB.HL_RE, '<span class="hl">$1</span>').split('\n').join('<br>');

  /** opts.classMap: Map 을 주면 요소 id → 코드에서 붙는 스타일 클래스를 채워 줌 */
  WB.generateHTML = function (doc, opts = {}) {
    const extra = doc.extra || WB.emptyExtra();
    // 색 팔레트: 이 색과 똑같은 값은 var(--이름) 으로
    const palette = (extra.vars || []).filter(p => p.name && p.value);
    const varOf = new Map(palette.map(p => [p.value.toLowerCase(), p.name]));
    const useVars = v => (varOf.size ? String(v).replace(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi, m => (varOf.has(m.toLowerCase()) ? `var(--${varOf.get(m.toLowerCase())})` : m)) : v);
    const D = (style, ind) => decls(Object.fromEntries(Object.entries(style || {}).map(([k, v]) => [k, useVars(v)])), ind);
    const hovers = new Set();
    const fonts = new Set();
    let reveal = false, hl = false, calc = false, drag = false, ui = false;

    /* 1) 요소마다 스타일 열쇠(기본 · 태블릿 · 휴대폰 · 마우스 올림) → 같은 열쇠끼리 한 클래스 */
    const keyOf = new Map(), byKey = new Map(), byLabel = new Map();
    // 형식: 구성원이 함께 쓰는 모양은 .형식이름 규칙으로, 요소마다 다른 부분(크기 · 위치)만 요소 클래스로
    const formats = Object.fromEntries(Object.entries(doc.formats || {}).filter(([k]) => WB.FORMAT_NAME.test(k) && !GEN_CLASS.test(k)));
    const fmtOf = n => { const g = WB.groupOf(n); return g && Object.hasOwn(formats, g) ? g : ''; };
    const SKEYS = ['style', 'styleTablet', 'styleMobile', 'styleHover'];
    const restOf = (n, look) => SKEYS.map(k => Object.fromEntries(Object.entries(n[k] || {}).filter(([p, v]) => look[k]?.[p] !== v)));
    const parts = n => {
      const f = fmtOf(n);
      const [s, t, m, hv] = f ? restOf(n, formats[f]) : SKEYS.map(k => n[k]);
      return [D(s, '      '), D(t, '        '), D(m, '        '), D(hv, '      ')];
    };
    for (const look of Object.values(formats)) for (const k of SKEYS) for (const p of ['font-family', '--hl-font']) if (look[k]?.[p]) WB.webFontsIn(look[k][p]).forEach(f => fonts.add(f));
    WB.walk(doc.root, n => {
      for (const s of [n.style, n.styleTablet, n.styleMobile, n.styleHover]) for (const k of ['font-family', '--hl-font']) if (s?.[k]) WB.webFontsIn(s[k]).forEach(f => fonts.add(f));
      if (n.id === 'root') return;
      const p = parts(n);
      if (!p.some(Boolean)) return;
      const key = p.join('||');
      keyOf.set(n, key);
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(n);
      const label = WB.groupOf(n);
      if (label) { if (!byLabel.has(label)) byLabel.set(label, []); byLabel.get(label).push(n); }
    });
    const nameOf = new Map(), used = new Set(), counters = {};
    const rules = [], hoverRules = [], tabletRules = [], mobileRules = [];
    for (const [name, look] of Object.entries(formats)) {
      used.add(name);
      const [d, dt, dm, dh] = [D(look.style, '      '), D(look.styleTablet, '        '), D(look.styleMobile, '        '), D(look.styleHover, '      ')];
      if (d) rules.push(`    .${name} {\n${d}\n    }`);
      if (dh) hoverRules.push(`    .${name}:hover {\n${dh}\n    }`);
      if (dt) tabletRules.push(`      .${name} {\n${dt}\n      }`);
      if (dm) mobileRules.push(`      .${name} {\n${dm}\n      }`);
    }
    for (const [key, nodes] of byKey) {
      const label = WB.groupOf(nodes[0]);
      const same = label && /^[a-z_][\w-]*$/i.test(label) && !GEN_CLASS.test(label) && !used.has(label)
        && byLabel.get(label).length === nodes.length && byLabel.get(label).every(x => keyOf.get(x) === key);
      let name = label;
      if (!same) {
        const base = classBase(nodes[0]);
        do name = `${base}_${(counters[base] = (counters[base] || 0) + 1)}`; while (used.has(name));
      }
      used.add(name);
      nameOf.set(key, { name, own: same });
      const [d, dt, dm, dh] = key.split('||');
      if (d) rules.push(`    .${name} {\n${d}\n    }`);
      if (dh) hoverRules.push(`    .${name}:hover {\n${dh}\n    }`);
      if (dt) tabletRules.push(`      .${name} {\n${dt}\n      }`);
      if (dm) mobileRules.push(`      .${name} {\n${dm}\n      }`);
    }

    function attrString(node, cls) {
      const out = [];
      const classes = [cls, node.attrs.class].filter(Boolean).join(' ');
      if (classes) out.push(`class="${escAttr(classes)}"`);
      for (const [k, v] of Object.entries(node.attrs)) {
        if (k === 'class' || v == null || v === false) continue;
        out.push(BOOL_ATTRS.has(k) ? k : `${k}="${escAttr(v)}"`);
      }
      return out.length ? ' ' + out.join(' ') : '';
    }

    /* 2) 요소 → HTML */
    function el(node, depth, inCalc = false) {
      const ind = '  '.repeat(depth);
      if (node.tag === 'table' && node.attrs['data-calc'] != null) inCalc = calc = true;
      if (node.attrs['data-drag'] || node.attrs['data-resize']) drag = true;
      if (node.attrs['data-ui']) ui = true;
      const named = nameOf.get(keyOf.get(node));
      if (named || fmtOf(node)) opts.classMap?.set(node.id, named ? named.name : fmtOf(node));
      const cls = named && !named.own ? named.name : ''; // 이름표 이름을 그대로 쓰면 더 붙일 것이 없음
      if (inCalc && WB.kindOf(node) === 'text' && /^=/.test((node.text || '').trim())) {
        // 계산 칸: 수식은 data-formula 로, 글자는 페이지가 열릴 때 계산해서 채움
        node = { ...node, attrs: { ...node.attrs, 'data-formula': node.text.trim() }, text: '' };
      }
      if (node.attrs['data-hover']) hovers.add(node.attrs['data-hover']);
      if (node.attrs['data-reveal']) reveal = true;
      const open = `<${node.tag}${attrString(node, cls)}>`;
      if (node.tag === 'svg' && node.raw != null) return `${ind}<svg${attrString(node, cls)}>${node.raw}</svg>`; // 가져온 아이콘 · 아이콘 모음은 그대로
      if (node.tag === 'svg') return `${ind}<svg${attrString(node, cls)} viewBox="0 0 320 200" role="img">${WB.chartInner(node.attrs)}</svg>`;
      if (VOID_HTML.has(node.tag)) return ind + open;
      const kind = WB.kindOf(node);
      if (kind === 'container') {
        if (!node.children.length) return `${ind}${open}</${node.tag}>`;
        return `${ind}${open}\n${node.children.map(c => el(c, depth + 1, inCalc)).join('\n')}\n${ind}</${node.tag}>`;
      }
      if (kind === 'text') {
        if (WB.hasHL(node.text)) hl = true;
        return `${ind}${open}${textHTML(node.text)}</${node.tag}>`;
      }
      return `${ind}${open}</${node.tag}>`;
    }

    const body = doc.root.children.map(c => el(c, 1)).join('\n');
    const bodyDecls = D(doc.root.style, '      ');
    const bodyTablet = D(doc.root.styleTablet, '        ');
    const bodyMobile = D(doc.root.styleMobile, '        ');
    if (bodyTablet) tabletRules.unshift(`      body {\n${bodyTablet}\n      }`);
    if (bodyMobile) mobileRules.unshift(`      body {\n${bodyMobile}\n      }`);
    const ind4 = s => s.split('\n').map(l => (l ? '    ' + l : '')).join('\n');
    const css = [
      extra.cssTop ? ind4(extra.cssTop) : '', // @import 등은 맨 앞에 있어야 해서
      palette.length ? `    /* 색 팔레트 */\n    :root {\n${palette.map(p => `      --${p.name}: ${p.value};`).join('\n')}\n    }` : '',
      '    *, *::before, *::after {\n      box-sizing: border-box;\n    }',
      bodyDecls ? `    body {\n${bodyDecls}\n    }` : '',
      ...rules,
      ...hoverRules,
      hl ? WB.HL_CSS('    ') : '',
      WB.hoverCSS(hovers, '    '),
      ui ? WB.UI_CSS('    ') : '',
      tabletRules.length ? `    /* 태블릿 화면 */\n    ${TABLET_MEDIA} {\n${tabletRules.join('\n')}\n    }` : '',
      mobileRules.length ? `    /* 휴대폰 화면 */\n    ${MOBILE_MEDIA} {\n${mobileRules.join('\n')}\n    }` : '',
    ].filter(Boolean).join('\n');
    // 가져온 CSS · 직접 쓴 CSS (요소 스타일로 바꿀 수 없는 :hover 조합, 다른 화면 크기, 애니메이션 …) 는 따로 — 뒤에 두어야 원래처럼 이김
    const extraStyle = extra.css ? `\n  <style>\n    /* 가져온 CSS · 직접 쓴 CSS (설정 → 페이지) */\n${ind4(extra.css)}\n  </style>` : '';
    // 웹 글꼴: 쓰인 글꼴만 Google Fonts 에서 (편집기가 다시 만드는 링크라 data-wb 표시)
    const fontLink = fonts.size ? `\n  <link rel="stylesheet" href="${escAttr(WB.fontsURL([...fonts]))}" data-wb>` : '';

    // 탭5 블록 → <script>. 블록 모양 자체도 JSON 으로 함께 넣어서 다시 열 때 되살림
    // 편집기가 만든 <script> 에는 data-wb 를 붙여서, 다시 열 때 가져온 스크립트와 구별함
    let scripts = extra.scripts.map(s => '\n  ' + s).join(''); // 가져온 외부 스크립트 (src) 등은 먼저
    const js = [WB.generateJS(doc.blocks), reveal ? WB.revealJS() + '\n' : '', calc ? WB.calcJS() + '\n' : '', drag ? WB.dragJS() + '\n' : ''].filter(Boolean).join('\n');
    if (js) scripts += `\n  <script data-wb>\n${js.trimEnd().split('\n').map(l => (l ? '    ' + l : '')).join('\n')}\n  </script>`;
    const userCode = (doc.blocks?.code || '').trim();
    if (userCode) {
      // 따로 넣어서, 직접 쓴 코드에 실수가 있어도 블록 코드는 그대로 돌아감
      const safe = userCode.replace(/<\/script/gi, '<\\/script');
      scripts += `\n  <script data-wb>\n    // 직접 쓴 코드 (탭5 「코드」)\n${safe.split('\n').map(l => (l ? '    ' + l : '')).join('\n')}\n  </script>`;
    }
    if (doc.blocks?.scripts.length || userCode) {
      // 블록 id 는 열 때 새로 매기므로 저장하지 않음
      const data = JSON.stringify(doc.blocks, (k, v) => (k === 'id' || (k === 'code' && !v) ? undefined : v)).replace(/</g, '\\u003c');
      scripts += `\n  <script type="application/json" id="wb-blocks">${data}</script>`;
    }
    // 형식 목록 (다시 열 때 「함께 바뀌는 요소」를 되살림)
    if (Object.keys(formats).length) scripts += `\n  <script type="application/json" id="wb-formats">${JSON.stringify(formats).replace(/</g, '\\u003c')}</script>`;

    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="${GENERATOR}">
  <title>${escText(doc.title || '')}</title>${extra.head.map(s => '\n  ' + s).join('')}${fontLink}
  <style data-wb>
${css}
  </style>${extraStyle}
</head>
<body>
${body}${scripts}
</body>
</html>
`;
  };

  /** 코드로 변환했을 때 이 요소에 붙는 스타일 클래스 (고칠 때마다 다시 셈) */
  let classCache = { key: '', map: null };
  WB.codeClassOf = (doc, id) => {
    const key = doc.id + '|' + doc.undo.length + '|' + doc.redo.length + '|' + doc.lastTime;
    if (classCache.key !== key) {
      const map = new Map();
      WB.generateHTML(doc, { classMap: map });
      classCache = { key, map };
    }
    return classCache.map.get(id) || '';
  };
  /** 선택한 요소의 id · 이름표 · 코드 클래스를 한눈에 (작은 꼬리표들) */
  WB.idClassChips = (doc, node) => {
    if (!node || node.id === 'root') return '';
    const chips = [];
    if (node.attrs.id) chips.push(`<span class="chip chip-id" data-chip="id" title="요소 이름 (id) — 블록과 CSS에서 #${escAttr(node.attrs.id)}">#${escText(node.attrs.id)}</span>`);
    for (const c of (node.attrs.class || '').split(/\s+/).filter(Boolean)) chips.push(`<span class="chip chip-cls" data-chip="class" title="이름표 (class)">.${escText(c)}</span>`);
    const code = WB.codeClassOf(doc, node.id);
    if (code) chips.push(`<span class="chip chip-code" title="코드로 변환하면 이 요소의 스타일이 들어가는 클래스 (편집기가 자동으로 붙임)">.${code}</span>`);
    return chips.join('');
  };

  /* ---------- HTML 코드 → 문서 모델 (파일 열기) ---------- */

  /** "a: 1; b: url(x;y)" 처럼 괄호·따옴표 안의 ; 는 건너뛰며 나눔 */
  function parseDecls(text) {
    const out = {};
    let depth = 0, quote = '', cur = '';
    const flush = () => {
      const i = cur.indexOf(':');
      if (i > 0) {
        const k = cur.slice(0, i).trim().toLowerCase();
        const v = cur.slice(i + 1).trim();
        if (k && v) out[k] = v;
      }
      cur = '';
    };
    for (const ch of text) {
      if (quote) { if (ch === quote) quote = ''; }
      else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === ';' && depth <= 0) { flush(); continue; }
      cur += ch;
    }
    flush();
    return out;
  }

  /** <style> 을 규칙들로: { sel, variant, decls } · 휴대폰(640px) · 태블릿(1024px) @media 안은 variant 표시
      그 밖의 @ 규칙(@media 다른 크기, @keyframes, @import …)은 { at, raw, top } 로 원문 그대로 */
  function parseRules(css, variant = '') {
    css = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const rules = [];
    let i = 0;
    while (i < css.length) {
      const open = css.indexOf('{', i);
      const semi = css.indexOf(';', i);
      const head = css.slice(i, open < 0 ? undefined : open).trim();
      // @import url(x); 처럼 { } 없이 ; 로 끝나는 @ 문장
      if (head.startsWith('@') && semi >= 0 && (open < 0 || semi < open)) {
        const raw = css.slice(i, semi + 1).trim();
        rules.push({ at: true, top: /^@(import|charset|namespace)\b/i.test(raw), raw });
        i = semi + 1;
        continue;
      }
      if (open < 0) break;
      let depth = 1, j = open + 1;
      while (j < css.length && depth) {
        if (css[j] === '{') depth++;
        else if (css[j] === '}') depth--;
        j++;
      }
      if (!head.startsWith('@')) rules.push({ sel: head, variant, decls: parseDecls(css.slice(open + 1, j - 1)) });
      else if (!variant && /^@media\s*\(\s*max-width:\s*640px\s*\)$/.test(head)) rules.push(...parseRules(css.slice(open + 1, j - 1), 'mobile'));
      else if (!variant && /^@media\s*\(\s*max-width:\s*1024px\s*\)$/.test(head)) rules.push(...parseRules(css.slice(open + 1, j - 1), 'tablet'));
      else rules.push({ at: true, raw: dedent(css.slice(i, j)) });
      i = j;
    }
    return rules;
  }
  /** 둘째 줄부터 공통 들여쓰기를 빼서 모양을 고정 (저장할 때마다 들여쓰기가 늘지 않게) */
  function dedent(raw) {
    const lines = raw.trim().split('\n').map(l => l.replace(/\s+$/, ''));
    const rest = lines.slice(1).filter(l => l.trim());
    const min = Math.min(...rest.map(l => l.match(/^\s*/)[0].length));
    return [lines[0].trim(), ...lines.slice(1).map(l => l.slice(Math.min(min, l.match(/^\s*/)[0].length)))].join('\n');
  }
  /** 쉼표로 나눔 (괄호 안의 쉼표는 그대로: :is(a, b)) */
  function splitSelectors(sel) {
    const out = [];
    let depth = 0, cur = '';
    for (const ch of sel) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (ch === ',' && !depth) { out.push(cur.trim()); cur = ''; } else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  /** CSS 우선순위 (#id 100 · .클래스 [속성] :상태 10 · 태그 1 — 대략) */
  function specificity(sel) {
    const s = sel.replace(/\([^)]*\)/g, '');
    const ids = (s.match(/#[\w-]+/g) || []).length;
    const cls = (s.match(/\.[\w-]+|\[[^\]]*\]|(^|[^:]):[\w-]+/g) || []).length;
    const tags = (s.match(/(^|[\s>+~])[a-z][\w-]*/gi) || []).length + (s.match(/::[\w-]+/g) || []).length;
    return ids * 10000 + cls * 100 + tags;
  }
  // 마우스 · 입력 상태에 따라 바뀌는 규칙: 요소 스타일로 옮길 수 없음
  const DYNAMIC = /:(hover|focus|focus-within|focus-visible|active|visited|link|target|checked|disabled|enabled|invalid|valid|placeholder-shown|empty)\b|::?(before|after|placeholder|selection|first-letter|first-line|marker|backdrop)\b|::-(webkit|moz)-/i;
  // 편집기가 만드는 규칙 모양 (다시 열 때 다시 만들므로 건너뜀)
  const OWN_RULE = /^(\*|\*::before|\*::after|\.hl|\[data-hover[^\s]*|\[data-ui[^\s]*.*)$/;
  const GEN_SCRIPT = /^\s*\/\/ (도우미 함수|변수 · 대답 · 신호|스크롤해서 화면에 보이면|표 계산|끌어서 옮기기|직접 쓴 코드)/;

  function textOf(el) {
    let s = '';
    for (const ch of el.childNodes) {
      if (ch.nodeType === 3) s += ch.data;
      else if (ch.nodeName === 'BR') s += '\u0000';
      else if (ch.nodeType === 1 && ch.classList.contains('hl')) s += '*' + textOf(ch) + '*'; // 강조 글자
      else if (ch.nodeType === 1) s += textOf(ch);
    }
    return s;
  }
  // &nbsp;( ) 는 줄이지 않고 보통 공백으로 되돌림 → 연속 공백이 그대로 살아남
  const cleanText = s => s.replace(/[ \t\r\n\f]+/g, ' ').trim().replace(/ /g, ' ').replace(/ ?\u0000 ?/g, '\n');

  /** HTML 코드 → 문서 모델.
      다른 곳에서 만든 페이지도 최대한 살림:
      - CSS 규칙(#id, nav a, .a .b, h1 …)은 맞는 요소마다 스타일로 옮김 (우선순위 순서대로, style="" 이 마지막)
      - :hover · 다른 화면 크기 @media · @keyframes 처럼 옮길 수 없는 것은 extra.css 로 그대로 보존
      - 글자 태그 안의 링크 · 굵게 · 그림은 그 태그를 상자로 바꿔서 보존
      - <script> 는 탭5 「코드」로, 외부 스크립트 · <head> 의 링크 · meta 는 그대로 보존 */
  WB.parseHTML = function (source) {
    const d = new DOMParser().parseFromString(source, 'text/html');
    const madeHere = !!d.querySelector(`meta[name="generator"][content="${GENERATOR}"]`) || !!d.getElementById('wb-blocks');
    let savedFormats = {};
    try { savedFormats = JSON.parse(d.getElementById('wb-formats')?.textContent || '{}') || {}; } catch { /* 형식 정보가 깨졌으면 형식 없이 */ }
    const report = { inlined: 0, kept: 0, scripts: 0, rich: 0 };
    let ownShape = true; // 규칙이 모두 편집기가 만드는 모양인지 (예전 파일 알아보기)

    /* --- CSS: 맞는 요소마다 쌓아 두었다가 walk 에서 순서대로 적용 --- */
    const matched = new Map(); // 요소 → [{ spec, order, decls, variant }]
    const genClasses = new Set(); // 편집기가 붙인 클래스 (.title_1 · 예전 .c1) — 다시 열 때 지우고 스타일로
    const keep = [], keepTop = [];
    const vars = []; // 색 팔레트 (:root { --이름: 색 })
    let order = 0;
    const serial = (sel, decls) => `${sel} {\n${Object.entries(decls).map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}`;
    const MEDIA = { mobile: MOBILE_MEDIA, tablet: TABLET_MEDIA };
    // 새 모양 파일: 편집기가 만든 규칙은 <style data-wb>, 사용자가 쓴 CSS 는 다른 <style> 에 있음
    const newShape = !!d.querySelector('style[data-wb]');
    for (const st of d.querySelectorAll('style')) {
      const own = newShape && st.hasAttribute('data-wb');
      for (const r of parseRules(st.textContent)) {
        order++;
        if (r.at) {
          (r.top ? keepTop : keep).push(r.raw);
          ownShape = false;
          continue;
        }
        const left = []; // 요소 스타일로 못 옮긴 선택자
        for (const part of splitSelectors(r.sel)) {
          if (OWN_RULE.test(part) && (part[0] !== '*' || Object.keys(r.decls).every(k => k === 'box-sizing'))) continue;
          if (own && part === ':root') { // 색 팔레트
            for (const [k, v] of Object.entries(r.decls)) if (k.startsWith('--')) vars.push({ name: k.slice(2), value: v });
            continue;
          }
          // 사용자가 쓴 CSS (새 모양 파일의 다른 <style>) 는 손대지 않고 그대로
          if (newShape && !own && madeHere) { left.push(part); continue; }
          // .이름:hover 처럼 단순한 마우스 올림 규칙은 그 요소의 「마우스 올림」 스타일로
          const hm = /^(.*[^\s:]):hover$/.exec(part);
          const sel = hm && !DYNAMIC.test(hm[1]) ? hm[1] : part;
          const variant = hm && sel !== part ? 'hover' : r.variant;
          const genName = /^\.([\w-]+)$/.exec(sel)?.[1];
          if (genName && GEN_CLASS.test(genName) && (own || /^c\d+$/.test(genName))) genClasses.add(genName);
          else if (!own && part !== 'body') {
            ownShape = false;
            // 예전 모양의 편집기 파일: .c1 · body 말고는 사용자가 「추가 CSS」에 쓴 규칙 → 그대로
            if (madeHere && !newShape) { left.push(part); continue; }
          }
          // 상태에 따라 바뀌는 규칙, 그리고 모든 요소에 거는 * 규칙(초기화)은 그대로 둠 (요소마다 넣으면 탭2 가 지저분해짐)
          if (DYNAMIC.test(sel) || sel === '*') { left.push(part); continue; }
          let els;
          try { els = [...d.querySelectorAll(sel)].filter(e => e === d.body || d.body.contains(e)); } catch { els = []; }
          if (!els.length) {
            // 맞는 요소가 없음 (스크립트가 나중에 만드는 요소 등) → 그대로 둠. 단, 쓰는 요소가 없는 형식 규칙은 형식 목록에서 다시 만들어짐
            if (!(own && sel[0] === '.' && Object.hasOwn(savedFormats, sel.slice(1)))) left.push(part);
            continue;
          }
          const spec = specificity(sel);
          for (const e of els) {
            if (!matched.has(e)) matched.set(e, []);
            matched.get(e).push({ spec, order, decls: r.decls, variant });
          }
          if (!own) report.inlined++;
        }
        if (left.length) {
          const text = serial(left.join(', '), r.decls);
          keep.push(MEDIA[r.variant] ? `${MEDIA[r.variant]} {\n${text.split('\n').map(l => '  ' + l).join('\n')}\n}` : text);
          if (!own) report.kept++;
        }
      }
    }
    // var(--팔레트) 는 모델에서는 실제 색으로 (저장할 때 다시 var 로 바뀜)
    const varMap = Object.fromEntries(vars.map(v => [v.name, v.value]));
    const unvar = decls => (vars.length ? Object.fromEntries(Object.entries(decls).map(([k, v]) => [k, String(v).replace(/var\(--([\w-]+)\)/g, (m, n) => varMap[n] ?? m)])) : decls);
    const applyRules = (el, node) => {
      for (const m of (matched.get(el) || []).sort((a, b) => a.spec - b.spec || a.order - b.order)) {
        if (!m.variant) Object.assign(node.style, unvar(m.decls));
        else {
          const key = WB.VARIANT_KEYS[m.variant];
          node[key] = { ...(node[key] || {}), ...unvar(m.decls) };
        }
      }
    };

    /* --- 요소 --- */
    const isRich = el => [...el.children].some(c =>
      c.nodeName !== 'BR' && !(c.nodeName === 'SPAN' && c.classList.contains('hl') && !c.children.length) && !SKIP_TAGS.has(c.nodeName.toLowerCase()));
    function walk(el) {
      const tag = el.tagName.toLowerCase();
      if (SKIP_TAGS.has(tag)) return null;
      const node = { id: WB.newId(), tag, attrs: {}, style: {} };
      applyRules(el, node);
      const chart = tag === 'svg' && el.hasAttribute('data-chart');
      for (const a of el.attributes) {
        if (a.name === 'class') {
          const cls = a.value.split(/\s+/).filter(c => c && !genClasses.has(c));
          if (cls.length) node.attrs.class = cls.join(' ');
        } else if (a.name === 'style') Object.assign(node.style, parseDecls(a.value));
        else if (chart && !/^(data-|id$)/.test(a.name)) continue; // 차트는 data-* 로 다시 그림
        else if (!/^on/i.test(a.name)) node.attrs[a.name] = a.value;
      }
      if (tag === 'svg' && !chart) { node.raw = el.innerHTML.trim(); return node; } // 아이콘 등은 그대로
      const kind = WB.kindOf(tag);
      const rich = kind === 'text' && isRich(el);
      if (rich) report.rich++;
      if (kind === 'container' || rich) node.children = childrenOf(el);
      else if (kind === 'text') node.text = cleanText(textOf(el));
      if (node.attrs['data-formula'] != null && kind === 'text') {
        // 표 계산 칸: 모델에서는 글자 자리에 수식을 그대로 둠
        node.text = node.attrs['data-formula'];
        delete node.attrs['data-formula'];
      }
      return node;
    }
    function childrenOf(el) {
      const out = [];
      for (const ch of el.childNodes) {
        // 브라우저가 표에 저절로 끼워 넣는 <tbody> 는 벗겨 냄
        if (ch.nodeName === 'TBODY' && !ch.attributes.length && el.nodeName === 'TABLE') {
          out.push(...childrenOf(ch));
          continue;
        }
        if (ch.nodeType === 1 && ch.nodeName === 'SPAN' && ch.classList.contains('hl') && !ch.children.length && !ch.attributes[1]) {
          out.push(WB.makeNode('span', { text: '*' + cleanText(ch.textContent) + '*' })); // 강조 글자
        } else if (ch.nodeType === 1) {
          const n = walk(ch);
          if (n) out.push(n);
        } else if (ch.nodeType === 3 && ch.data.trim()) {
          out.push(WB.makeNode('span', { text: cleanText(ch.data) }));
        }
      }
      return out;
    }

    const root = WB.newRoot();
    root.style = {};
    applyRules(d.body, root);
    if (d.body.getAttribute('style')) Object.assign(root.style, parseDecls(d.body.getAttribute('style')));
    root.children = childrenOf(d.body);

    /* --- 스크립트 · <head> 의 링크 · meta --- */
    let code = '';
    const scripts = [], head = [];
    for (const s of d.querySelectorAll('script')) {
      if (s.id === 'wb-blocks' || s.id === 'wb-formats' || s.hasAttribute('data-wb')) continue;
      const type = (s.getAttribute('type') || '').toLowerCase();
      const classic = !type || /^(text|application)\/javascript$/.test(type);
      if (s.hasAttribute('src') || !classic) { scripts.push(s.outerHTML); continue; } // 외부 · module 스크립트는 그대로
      if (madeHere || GEN_SCRIPT.test(s.textContent)) continue; // 편집기가 만든 코드 (블록에서 다시 만듦)
      if (!s.textContent.trim()) continue;
      code += (code ? '\n\n' : '') + '// ── 원래 페이지의 스크립트 ──\n' + dedent(s.textContent);
      report.scripts++;
    }
    for (const e of d.querySelectorAll('link, meta, base')) {
      if (e.tagName === 'META' && (e.hasAttribute('charset') || /^(viewport|generator)$/i.test(e.getAttribute('name') || ''))) continue;
      if (e.hasAttribute('data-wb')) continue; // 편집기가 만든 웹 글꼴 링크 (저장할 때 다시 만듦)
      head.push(e.outerHTML);
    }

    let blocks = null;
    try {
      const raw = d.getElementById('wb-blocks');
      if (raw) blocks = WB.reIdBlocks(JSON.parse(raw.textContent));
    } catch { /* 블록 정보가 깨졌으면 블록 없이 열기 */ }
    if (code) blocks = WB.reIdBlocks({ ...(blocks || {}), code: [blocks?.code, code].filter(Boolean).join('\n\n') });
    const extra = { cssTop: keepTop.join('\n'), css: keep.join('\n'), head, scripts, vars };
    const foreign = !madeHere && (!ownShape || report.rich > 0 || !!code || scripts.length > 0 || head.length > 0);
    // 형식: 저장해 둔 목록을 되살림 (모양은 첫 구성원 기준). 다른 곳에서 만든 페이지는 같은 클래스 · 같은 모양인 요소 묶음을 형식으로
    const groups = new Map();
    WB.walk(root, n => { const g = n.id !== 'root' && WB.groupOf(n); if (g) { if (!groups.has(g)) groups.set(g, []); groups.get(g).push(n); } });
    const formats = {};
    for (const [name, look] of Object.entries(savedFormats)) {
      if (!WB.FORMAT_NAME.test(name)) continue;
      formats[name] = groups.has(name) ? WB.lookOf(groups.get(name)[0]) : look && typeof look === 'object' ? look : { style: {} };
    }
    if (!madeHere) for (const [name, list] of groups) {
      if (list.length < 2 || !WB.FORMAT_NAME.test(name) || GEN_CLASS.test(name)) continue;
      const key = WB.lookKey(WB.lookOf(list[0]));
      if (key !== WB.lookKey({ style: {} }) && list.every(n => WB.lookKey(WB.lookOf(n)) === key)) formats[name] = WB.lookOf(list[0]);
    }
    report.formats = Object.keys(formats).length;
    return { title: d.title, root, blocks, extra, foreign, report, formats };
  };

  /* ---------- 코드 색칠 (코드 보기 창) ---------- */
  function hlTag(raw) {
    const m = raw.match(/^(<\/?)([a-zA-Z][\w-]*)([\s\S]*?)(\/?>)$/);
    if (!m) return WB.esc(raw);
    const attrs = m[3].replace(/([^\s=]+)(?:(=)("[^"]*"|'[^']*'|[^\s>]+))?/g, (all, name, eq, val) =>
      `<span class="hl-attr">${WB.esc(name)}</span>${eq ? '<span class="hl-p">=</span>' : ''}${val ? `<span class="hl-str">${WB.esc(val)}</span>` : ''}`);
    return `<span class="hl-p">${WB.esc(m[1])}</span><span class="hl-tag">${m[2]}</span>${attrs}<span class="hl-p">${WB.esc(m[4])}</span>`;
  }
  function hlCSS(text) {
    return text.split('\n').map(line => {
      let m;
      if ((m = line.match(/^(\s*)([\w-]+)(\s*:\s*)(.*?)(;?)$/)))
        return `${m[1]}<span class="hl-prop">${m[2]}</span><span class="hl-p">${m[3]}</span><span class="hl-val">${WB.esc(m[4])}</span><span class="hl-p">${m[5]}</span>`;
      if ((m = line.match(/^(\s*)(.*?)(\s*\{)$/))) return `${m[1]}<span class="hl-sel">${WB.esc(m[2])}</span><span class="hl-p">${m[3]}</span>`;
      return `<span class="hl-p">${WB.esc(line)}</span>`;
    }).join('\n');
  }
  WB.highlightHTML = code => {
    let out = '';
    let inStyle = false;
    for (const m of code.matchAll(/<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<\/?[a-zA-Z][^>]*>|[^<]+|</gi)) {
      const t = m[0];
      if (t.startsWith('<!--')) out += `<span class="hl-cm">${WB.esc(t)}</span>`;
      else if (/^<!DOCTYPE/i.test(t)) out += `<span class="hl-dt">${WB.esc(t)}</span>`;
      else if (/^<\/?[a-zA-Z]/.test(t)) {
        out += hlTag(t);
        if (/^<style/i.test(t)) inStyle = true;
        if (/^<\/style/i.test(t)) inStyle = false;
      } else out += inStyle ? hlCSS(t) : WB.esc(t);
    }
    return out;
  };
})();
