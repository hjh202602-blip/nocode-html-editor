'use strict';
/* 캔버스와 코드 변환이 함께 쓰는 꾸밈 기능:
   마우스 올렸을 때 효과 · 스크롤하면 나타나기 · 글자 일부 강조 · 차트 그리기 */
(() => {
  /* ---------- 마우스 올렸을 때 (data-hover="lift" 등) ---------- */
  WB.HOVERS = [
    ['', '없음'],
    ['lift', '살짝 떠오르기', 'transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0, 0, 0, 0.18);'],
    ['grow', '조금 커지기', 'transform: scale(1.05);'],
    ['bright', '밝아지기', 'filter: brightness(1.15);'],
    ['dim', '흐려지기', 'opacity: 0.7;'],
    ['underline', '밑줄', 'text-decoration: underline;'],
  ];
  /** 쓰인 효과만 CSS 규칙으로 (들여쓰기 ind) */
  WB.hoverCSS = (used, ind = '') => {
    const rows = WB.HOVERS.filter(([k]) => k && used.has(k));
    if (!rows.length) return '';
    return [
      `${ind}[data-hover] {\n${ind}  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease, opacity 0.2s ease;\n${ind}}`,
      ...rows.map(([k, , css]) => `${ind}[data-hover="${k}"]:hover {\n${css.split('; ').map(d => `${ind}  ${d.replace(/;?$/, ';')}`).join('\n')}\n${ind}}`),
    ].join('\n');
  };

  /* ---------- 스크롤해서 화면에 보이면 나타나기 (data-reveal="fade" 등) ---------- */
  WB.REVEALS = [
    ['', '없음'],
    ['fade', '서서히 나타나기'],
    ['up', '아래에서 올라오기'],
    ['left', '왼쪽에서 들어오기'],
    ['right', '오른쪽에서 들어오기'],
    ['zoom', '커지며 나타나기'],
  ];
  WB.REVEAL_FRAMES = {
    fade: [{ opacity: 0 }, { opacity: 1 }],
    up: [{ opacity: 0, transform: 'translateY(40px)' }, { opacity: 1, transform: 'none' }],
    left: [{ opacity: 0, transform: 'translateX(-60px)' }, { opacity: 1, transform: 'none' }],
    right: [{ opacity: 0, transform: 'translateX(60px)' }, { opacity: 1, transform: 'none' }],
    zoom: [{ opacity: 0, transform: 'scale(0.85)' }, { opacity: 1, transform: 'none' }],
  };
  /** 내보낸 페이지에 넣는 짧은 스크립트 */
  WB.revealJS = () => `// 스크롤해서 화면에 보이면 나타나기
const revealFrames = ${JSON.stringify(WB.REVEAL_FRAMES)};
const revealer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.animate(revealFrames[entry.target.dataset.reveal] || revealFrames.fade, { duration: 700, easing: 'ease-out', fill: 'both' });
    revealer.unobserve(entry.target);
  }
}, { threshold: 0.15 });
document.querySelectorAll('[data-reveal]').forEach(e => { e.style.opacity = 0; revealer.observe(e); });`;

  /* ---------- 표 계산: <table data-calc> 안의 칸에 =A1+B1, =SUM(A1:A9) ----------
     칸 주소는 td 칸만 셈 (제목 칸 th 는 빼고). 캔버스와 내보낸 페이지가 같은 함수를 씀 (toString 으로 넣음) */
  function wbCalc(root) {
    const colIndex = s => { let n = 0; for (const ch of s) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
    const show = v => (typeof v === 'number' ? (isFinite(v) ? String(Math.round(v * 1e10) / 1e10) : '#0으로 나눔') : String(v));
    for (const table of (root || document).querySelectorAll('table[data-calc]')) {
      const grid = [...table.rows].map(r => [...r.cells].filter(c => c.tagName === 'TD')).filter(r => r.length);
      const at = (col, row) => grid[row]?.[col] || null;
      const memo = new Map(), busy = new Set();
      const value = cell => {
        if (!cell) return 0;
        if (memo.has(cell)) return memo.get(cell);
        let v;
        const f = cell.dataset.formula;
        if (!f) { const s = cell.textContent.trim(); v = s === '' ? 0 : isNaN(s) ? s : Number(s); }
        else if (busy.has(cell)) v = '#순환';
        else { busy.add(cell); v = evaluate(f.slice(1)); busy.delete(cell); }
        memo.set(cell, v);
        return v;
      };
      const num = v => (typeof v === 'number' ? v : Number(v) || 0);
      const cellsOf = ref => {
        const [a, b = a] = ref.split(':').map(x => /^([A-Z]+)(\d+)$/.exec(x));
        const c1 = colIndex(a[1]), c2 = colIndex(b[1]), r1 = a[2] - 1, r2 = b[2] - 1;
        const out = [];
        for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) out.push(at(c, r));
        return out;
      };
      const FN = {
        SUM: a => a.reduce((s, v) => s + num(v), 0),
        AVERAGE: a => (a.length ? FN.SUM(a) / a.length : 0),
        MIN: a => Math.min(...a.map(num)),
        MAX: a => Math.max(...a.map(num)),
        COUNT: a => a.filter(v => typeof v === 'number').length,
      };
      FN.AVG = FN.AVERAGE;
      function evaluate(src) {
        const toks = src.toUpperCase().match(/\d+(?:\.\d+)?|[A-Z]+\d+(?::[A-Z]+\d+)?|[A-Z]+|[-+*/(),%]/g) || [];
        let i = 0;
        const peek = () => toks[i], next = () => toks[i++];
        const primary = () => {
          const t = next();
          if (t === '(') { const v = sum(); next(); return v; }
          if (t === '-') return -num(primary());
          if (/^\d/.test(t)) return Number(t);
          if (/^[A-Z]+\d+$/.test(t)) return value(cellsOf(t)[0]);
          if (FN[t] && next() === '(') {
            const args = [];
            while (i < toks.length && peek() !== ')') {
              if (/:/.test(peek())) args.push(...cellsOf(next()).map(value));
              else args.push(sum());
              if (peek() === ',') next();
            }
            next();
            return FN[t](args);
          }
          throw new Error(t);
        };
        const term = () => {
          let v = primary();
          while (['*', '/', '%'].includes(peek())) {
            const o = next(), r = num(primary());
            v = o === '*' ? num(v) * r : o === '/' ? num(v) / r : num(v) % r;
          }
          return v;
        };
        const sum = () => {
          let v = term();
          while (peek() === '+' || peek() === '-') v = next() === '+' ? num(v) + num(term()) : num(v) - num(term());
          return v;
        };
        try {
          const v = sum();
          return i < toks.length ? '#오류' : v;
        } catch {
          return '#오류';
        }
      }
      for (const row of grid) for (const cell of row) {
        if (cell.dataset.formula && !cell.hasAttribute('data-editing')) cell.textContent = show(value(cell));
      }
    }
  }
  WB.calcTables = wbCalc;
  /** 내보낸 페이지용: 계산 + 고칠 때 수식 보이기 · 다시 계산 */
  WB.calcJS = () => `// 표 계산 (=A1+B1, =SUM(A1:A9))
${wbCalc.toString()}
document.addEventListener('focusin', e => {
  const c = e.target.closest?.('table[data-calc] td');
  if (!c || !c.dataset.formula) return;
  c.setAttribute('data-editing', '');
  c.textContent = c.dataset.formula; // 고치는 동안에는 수식을 보여 줌
});
document.addEventListener('focusout', e => {
  const c = e.target.closest?.('table[data-calc] td');
  if (!c) return;
  c.removeAttribute('data-editing');
  const s = c.textContent.trim();
  if (s.startsWith('=')) c.dataset.formula = s;
  else delete c.dataset.formula;
  wbCalc();
});
document.addEventListener('input', e => { if (e.target.closest?.('table[data-calc]')) wbCalc(); });
wbCalc();`;

  /* ---------- 끌어서 옮기기 (data-drag="x|y|xy") · 양 끝 잡아 길이 조절 (data-resize="x") ----------
     놓으면 'wb-drop' 이벤트 → 블록 「끌어서 놓았을 때」 */
  function wbDrag() {
    let d = null;
    const style = document.createElement('style');
    style.textContent = '[data-drag] { cursor: grab; touch-action: none; user-select: none; } [data-resize] { touch-action: none; user-select: none; }';
    document.head.append(style);
    const edgeOf = (t, x) => {
      if (!t.dataset.resize) return '';
      const r = t.getBoundingClientRect();
      return x > r.right - 8 ? 'r' : x < r.left + 8 ? 'l' : '';
    };
    document.addEventListener('pointermove', e => {
      if (d) return;
      const t = e.target.closest?.('[data-resize]');
      if (t) t.style.cursor = edgeOf(t, e.clientX) ? 'ew-resize' : t.dataset.drag ? 'grab' : '';
    });
    document.addEventListener('pointerdown', e => {
      const t = e.target.closest?.('[data-drag], [data-resize]');
      if (!t || e.button !== 0) return;
      const edge = edgeOf(t, e.clientX);
      if (!edge && !t.dataset.drag) return;
      const cs = getComputedStyle(t);
      if (cs.position === 'static') t.style.position = 'relative';
      const abs = cs.position === 'absolute';
      if (abs) { t.style.left = t.offsetLeft + 'px'; t.style.right = 'auto'; t.style.top = t.offsetTop + 'px'; t.style.bottom = 'auto'; }
      d = { t, edge, abs, x: e.clientX, y: e.clientY, left: parseFloat(t.style.left || cs.left) || 0, top: parseFloat(t.style.top || cs.top) || 0, w: t.offsetWidth, axis: t.dataset.drag || '', moved: false };
      t.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    });
    document.addEventListener('pointermove', e => {
      if (!d) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (!d.moved && Math.hypot(dx, dy) < 3) return;
      d.moved = true;
      const t = d.t, p = t.offsetParent;
      const maxX = d.abs && p ? p.clientWidth : Infinity;
      if (d.edge === 'r') t.style.width = Math.max(12, Math.min(d.w + dx, maxX - d.left)) + 'px';
      else if (d.edge === 'l') {
        const nx = Math.max(d.abs ? 0 : -Infinity, Math.min(d.left + dx, d.left + d.w - 12));
        t.style.left = nx + 'px';
        t.style.width = d.w - (nx - d.left) + 'px';
      } else {
        if (d.axis.includes('x')) t.style.left = Math.max(d.abs ? 0 : -Infinity, Math.min(d.left + dx, maxX - d.w)) + 'px';
        if (d.axis.includes('y')) t.style.top = Math.max(d.abs ? 0 : -Infinity, d.top + dy) + 'px';
      }
    });
    const end = () => {
      if (d?.moved) d.t.dispatchEvent(new CustomEvent('wb-drop', { bubbles: true }));
      d = null;
    };
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
  }
  WB.dragJS = () => `// 끌어서 옮기기 · 양 끝 잡아 길이 조절\n(${wbDrag.toString()})();`;

  /* ---------- 글자 일부 강조: *이렇게* 감싼 부분 ---------- */
  WB.HL_RE = /\*([^*\n]+)\*/g;
  WB.hasHL = text => /\*[^*\n]+\*/.test(text || '');
  // 글꼴 · 모양은 요소에 --hl-font · --hl-style 을 정했을 때만 (없으면 그대로 물려받음)
  WB.HL_CSS = ind => `${ind}.hl {\n${ind}  color: var(--hl-color, #e11d48);\n${ind}  font-family: var(--hl-font);\n${ind}  font-style: var(--hl-style);\n${ind}}`;

  /* ---------- 웹 글꼴 (Google Fonts) ----------
     [이름, 굵기 · 기울임 지정, 대신 쓸 글꼴 종류] — 쓰인 글꼴만 저장할 때 <link> 하나로 불러옴 */
  WB.WEB_FONTS = [
    ['Noto Sans KR', 'wght@400;500;700;900', 'sans-serif'], ['Nanum Gothic', 'wght@400;700;800', 'sans-serif'], ['Nanum Myeongjo', 'wght@400;700;800', 'serif'],
    ['Gowun Dodum', '', 'sans-serif'], ['Gowun Batang', 'wght@400;700', 'serif'], ['IBM Plex Sans KR', 'wght@400;500;700', 'sans-serif'],
    ['Black Han Sans', '', 'sans-serif'], ['Do Hyeon', '', 'sans-serif'], ['Jua', '', 'sans-serif'],
    ['Inter', 'wght@400;500;600;700;800', 'sans-serif'], ['Roboto', 'wght@400;500;700', 'sans-serif'], ['Poppins', 'wght@400;500;600;700', 'sans-serif'],
    ['Montserrat', 'wght@400;500;700;800', 'sans-serif'], ['Nunito', 'wght@400;600;700;800', 'sans-serif'], ['DM Sans', 'wght@400;500;700', 'sans-serif'],
    ['Geist', 'wght@400;500;600;700', 'sans-serif'], ['Anton', '', 'sans-serif'], ['Bebas Neue', '', 'sans-serif'], ['Oswald', 'wght@400;500;700', 'sans-serif'],
    ['Playfair Display', 'ital,wght@0,400;0,700;1,400', 'serif'], ['Instrument Serif', 'ital@0;1', 'serif'], ['DM Serif Display', 'ital@0;1', 'serif'], ['Lora', 'ital,wght@0,400;0,700;1,400', 'serif'],
    ['Geist Mono', 'wght@400;500', 'monospace'], ['JetBrains Mono', 'wght@400;500', 'monospace'],
  ];
  const FONT_SPEC = new Map(WB.WEB_FONTS.map(([n, s]) => [n.toLowerCase(), [n, s]]));
  /** font-family 값 안의 웹 글꼴 이름들 */
  WB.webFontsIn = value => String(value).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(n => FONT_SPEC.has(n.toLowerCase())).map(n => FONT_SPEC.get(n.toLowerCase())[0]);
  WB.fontsURL = names => 'https://fonts.googleapis.com/css2?' + [...new Set(names)].sort().map(n => 'family=' + n.replace(/ /g, '+') + (FONT_SPEC.get(n.toLowerCase())[1] ? ':' + FONT_SPEC.get(n.toLowerCase())[1] : '')).join('&') + '&display=swap';
  /** 탭2 글꼴 목록용 [값, 이름] */
  WB.webFontOptions = () => WB.WEB_FONTS.map(([n, , fb]) => [`'${n}', ${fb}`, n + ' (웹)']);

  /* ---------- 부품: 스위치 (data-ui="switch") — <label><input type="checkbox"><span></span></label>
     JS 없이 CSS :checked 로 켜고 끔. 색은 요소의 --switch-on · --switch-off 로 */
  WB.UI_CSS = ind => [
    '[data-ui="switch"] {', '  position: relative;', '  display: inline-block;', '  width: 36px;', '  height: 20px;', '  flex-shrink: 0;', '  vertical-align: middle;', '  cursor: pointer;', '}',
    '[data-ui="switch"] input {', '  position: absolute;', '  opacity: 0;', '  width: 0;', '  height: 0;', '}',
    '[data-ui="switch"] span {', '  position: absolute;', '  inset: 0;', '  border-radius: 999px;', '  background-color: var(--switch-off, #c4c4cc);', '  transition: background-color 0.2s;', '}',
    "[data-ui=\"switch\"] span::after {", "  content: '';", '  position: absolute;', '  top: 2px;', '  left: 2px;', '  height: calc(100% - 4px);', '  aspect-ratio: 1;', '  border-radius: 999px;', '  background-color: #ffffff;', '  transition: left 0.2s, transform 0.2s;', '}',
    '[data-ui="switch"] input:checked + span {', '  background-color: var(--switch-on, #4a86e8);', '}',
    '[data-ui="switch"] input:checked + span::after {', '  left: calc(100% - 2px);', '  transform: translateX(-100%);', '}',
    '[data-ui="switch"] input:focus-visible + span {', '  outline: 2px solid var(--switch-on, #4a86e8);', '  outline-offset: 2px;', '}',
  ].map(l => ind + l).join('\n');

  /* ---------- 아이콘 모음 (선 아이콘, 24×24) — 색은 글자색(currentColor), 크기는 너비 · 높이 ---------- */
  WB.ICON_SET = {
    home: ['집', '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'],
    search: ['찾기', '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'],
    bell: ['알림', '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>'],
    user: ['사람', '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'],
    users: ['사람들', '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3.1-5.5 7-5.5s7 2 7 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.6c2.4.6 4 2.4 4 5.4"/>'],
    settings: ['설정', '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9L7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/>'],
    sliders: ['조절', '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'],
    mail: ['메일', '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'],
    chat: ['대화', '<path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12z"/>'],
    video: ['영상', '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-4v12l-6-4z"/>'],
    phone: ['전화', '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>'],
    pin: ['위치', '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>'],
    calendar: ['달력', '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'],
    chart: ['차트', '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'],
    grid: ['격자', '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'],
    contact: ['연락처', '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.5-1.5 1.7-2.2 3-2.2s2.5.7 3 2.2M14 10h4M14 14h3"/>'],
    folder: ['폴더', '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'],
    file: ['파일', '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>'],
    clipboard: ['보고서', '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6"/>'],
    target: ['과녁', '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'],
    monitor: ['화면', '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>'],
    info: ['안내', '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>'],
    help: ['도움말', '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5M12 17.5h.01"/>'],
    shield: ['보안', '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>'],
    lock: ['잠금', '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'],
    wallet: ['결제', '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/>'],
    logout: ['나가기', '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'],
    heart: ['하트', '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>'],
    star: ['별', '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>'],
    cart: ['장바구니', '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.5L22 8H6"/>'],
    menu: ['메뉴', '<path d="M3 6h18M3 12h18M3 18h18"/>'],
    close: ['닫기', '<path d="M18 6L6 18M6 6l12 12"/>'],
    plus: ['더하기', '<path d="M12 5v14M5 12h14"/>'],
    check: ['확인', '<path d="M20 6L9 17l-5-5"/>'],
    arrow: ['화살표', '<path d="M5 12h14M13 5l7 7-7 7"/>'],
    arrowUpRight: ['바깥으로', '<path d="M7 17L17 7M8 7h9v9"/>'],
    chevronDown: ['아래 꺾쇠', '<path d="M6 9l6 6 6-6"/>'],
    chevronLeft: ['왼쪽 꺾쇠', '<path d="M15 18l-6-6 6-6"/>'],
    eye: ['보기', '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'],
    download: ['내려받기', '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>'],
  };
  // 브라우저가 다시 읽을 때 쓰는 모양(<path …></path>)으로 맞춰 둠 → 저장할 때마다 바뀌지 않게
  for (const v of Object.values(WB.ICON_SET)) v[1] = v[1].replace(/<(\w+)([^<>]*?)\s*\/>/g, '<$1$2></$1>');
  WB.iconNode = name => ({
    id: WB.newId(), tag: 'svg', raw: WB.ICON_SET[name][1],
    attrs: { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', 'data-icon': name },
    style: { width: '20px', height: '20px', 'flex-shrink': '0' },
  });
  WB.switchNode = (on = false) => ({
    id: WB.newId(), tag: 'label', attrs: { 'data-ui': 'switch', title: '켜기 / 끄기' }, style: {},
    children: [WB.makeNode('input', { attrs: { type: 'checkbox', ...(on ? { checked: '' } : {}) } }), WB.makeNode('span', { text: '' })],
  });

  /* ---------- 차트 (svg) ----------
     data-chart: bar | line | area | donut | pie
     data-values: "10,20,30" (여러 묶음은 ; 로 "10,20;30,40")
     data-labels: "1월,2월,3월"   data-colors: "#2f80ed,#f97316" */
  const PALETTE = ['#2f80ed', '#f97316', '#14b8a6', '#f5b800', '#ef4444', '#8b5cf6', '#ec4899'];
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  WB.chartData = attrs => {
    const series = String(attrs['data-values'] || '').split(';').map(s => s.split(',').map(v => parseFloat(v) || 0)).filter(s => s.length);
    const labels = String(attrs['data-labels'] || '').split(',').map(s => s.trim()).filter(Boolean);
    const colors = String(attrs['data-colors'] || '').split(',').map(s => s.trim()).filter(Boolean);
    return { type: attrs['data-chart'] || 'bar', series: series.length ? series : [[0]], labels, color: i => colors[i] || PALETTE[i % PALETTE.length] };
  };
  /** svg 안쪽 내용 (viewBox 0 0 320 200) */
  WB.chartInner = attrs => {
    const { type, series, labels, color } = WB.chartData(attrs);
    const out = [];
    const T = (x, y, t, anchor = 'middle') => `<text x="${x}" y="${y}" font-size="10" fill="#9ca3af" text-anchor="${anchor}">${esc(t)}</text>`;
    if (type === 'donut' || type === 'pie') {
      const vals = series[0];
      const total = vals.reduce((a, b) => a + b, 0) || 1;
      const r = type === 'pie' ? 40 : 60, w = type === 'pie' ? 80 : 26, C = 2 * Math.PI * r;
      let off = 0;
      vals.forEach((v, i) => {
        const len = (v / total) * C;
        out.push(`<circle cx="100" cy="100" r="${r}" fill="none" stroke="${color(i)}" stroke-width="${w}" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 100 100)"/>`);
        off += len;
      });
      vals.forEach((v, i) => {
        const y = 40 + i * 22;
        out.push(`<rect x="200" y="${y - 8}" width="10" height="10" rx="5" fill="${color(i)}"/>`, T(216, y, `${labels[i] || i + 1} ${Math.round((v / total) * 100)}%`, 'start'));
      });
      return out.join('');
    }
    const n = Math.max(labels.length, ...series.map(s => s.length));
    const max = Math.max(1, ...series.flat());
    const X0 = 34, X1 = 312, Y0 = 170, Y1 = 12;
    const y = v => Y0 - (v / max) * (Y0 - Y1);
    for (let g = 0; g <= 4; g++) {
      const v = (max / 4) * g;
      out.push(`<line x1="${X0}" x2="${X1}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="#e5e7eb" stroke-width="1"/>`, T(X0 - 6, y(v) + 3, Math.round(v), 'end'));
    }
    const step = (X1 - X0) / n;
    labels.slice(0, n).forEach((l, i) => out.push(T(X0 + step * (i + 0.5), 190, l)));
    if (type === 'bar') {
      const bw = Math.min(18, (step * 0.7) / series.length);
      series.forEach((s, si) => s.forEach((v, i) => {
        const x = X0 + step * (i + 0.5) - (bw * series.length) / 2 + bw * si;
        out.push(`<rect x="${x.toFixed(1)}" y="${y(v).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${(Y0 - y(v)).toFixed(1)}" rx="2" fill="${color(si)}"/>`);
      }));
    } else {
      series.forEach((s, si) => {
        const pts = s.map((v, i) => `${(X0 + step * (i + 0.5)).toFixed(1)},${y(v).toFixed(1)}`);
        if (type === 'area') {
          const first = (X0 + step * 0.5).toFixed(1), last = (X0 + step * (s.length - 0.5)).toFixed(1);
          out.push(`<polygon points="${first},${Y0} ${pts.join(' ')} ${last},${Y0}" fill="${color(si)}" fill-opacity="0.25"/>`);
        }
        out.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${color(si)}" stroke-width="2.5" stroke-linejoin="round"/>`);
        if (type === 'line') pts.forEach(p => { const [cx, cy] = p.split(','); out.push(`<circle cx="${cx}" cy="${cy}" r="3.5" fill="${color(si)}"/>`); });
      });
    }
    return out.join('');
  };
})();
