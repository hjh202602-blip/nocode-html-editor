'use strict';
/* 피그마 · 캔바에서 쓰는 단축키 (app.js 의 기본 단축키보다 먼저 봄)
   Ctrl+/ 또는 ? 로 모든 단축키 보기 */
(() => {
  const { h } = WB;
  const cv = WB._cv;

  /* ---------- 도우미 ---------- */
  const doc = () => WB.canvasDoc();
  const selNode = () => { const n = WB.selectedNode(); return n && n.id !== 'root' ? n : null; };
  const isAbs = n => n?.style?.position === 'absolute';

  /** 고른 요소 하나를 부모 상자 안에서 맞추기 (피그마처럼) — 자유 배치 요소만 */
  function alignToParent(how) {
    const n = selNode();
    if (!isAbs(n)) return WB.toast('맞추기는 자유 배치에 띄워 놓은 요소에서 돼요 (여러 개면 서로 맞춤)');
    const el = cv.elFor(n.id), p = el.offsetParent || el.parentElement;
    const W = p.clientWidth, H = p.clientHeight, w = el.offsetWidth, hh = el.offsetHeight;
    const pos = { x: el.offsetLeft, y: el.offsetTop };
    if (how === 'left') pos.x = 0;
    if (how === 'hcenter') pos.x = Math.round((W - w) / 2);
    if (how === 'right') pos.x = W - w;
    if (how === 'top') pos.y = 0;
    if (how === 'vcenter') pos.y = Math.round((H - hh) / 2);
    if (how === 'bottom') pos.y = H - hh;
    WB.commit(d => {
      const m = WB.find(d.root, n.id).node;
      delete m.style.right; delete m.style.bottom;
      m.style.left = Math.max(0, pos.x) + 'px';
      m.style.top = Math.max(0, pos.y) + 'px';
    }, `align1:${Date.now()}`);
  }
  function align(how) {
    const ids = WB.multiIds();
    if (ids.length > 1) WB.alignMulti(ids, how);
    else if (!/space/.test(how)) alignToParent(how);
  }

  /** 레이어 순서: 같은 상자 안에서 앞(위) · 뒤(아래)로 — 뒤에 있는 요소가 위에 그려짐 */
  function order(dir, all) {
    const n = selNode();
    if (!n) return;
    const f = WB.find(doc().root, n.id);
    const last = f.parent.children.length - 1;
    const to = all ? (dir > 0 ? last : 0) : f.index + dir;
    if (to < 0 || to > last || to === f.index) return;
    WB.commit(d => {
      const g = WB.find(d.root, n.id);
      g.parent.children.splice(g.index, 1);
      g.parent.children.splice(to, 0, g.node);
    }, `order:${Date.now()}`);
    WB.toast(dir > 0 ? (all ? '맨 앞으로' : '한 칸 앞으로') : (all ? '맨 뒤로' : '한 칸 뒤로'));
  }

  /** 형제 사이 이동 (Tab · Shift+Tab) */
  function sibling(dir) {
    const n = selNode();
    const d = doc();
    if (!n) { if (d.root.children[0]) WB.select(d.root.children[0].id); return; }
    const f = WB.find(d.root, n.id);
    const list = f.parent.children;
    WB.select(list[(f.index + dir + list.length) % list.length].id);
    WB.emit('reveal', WB.selectedId());
  }

  function toggleStyle(prop, on, off = '') {
    const n = selNode();
    if (!n) return;
    const cur = getComputedStyle(cv.elFor(n.id)).getPropertyValue(prop);
    const isOn = prop === 'font-weight' ? Number(cur) >= 600 : cur.includes(on);
    WB.setStyles(n.id, { [prop]: isOn ? off : on }, `t:${prop}:${Date.now()}`);
  }
  function fontSize(delta) {
    const n = selNode();
    if (!n) return;
    const px = parseFloat(getComputedStyle(cv.elFor(n.id)).fontSize) || 16;
    const v = Math.max(1, Math.round(px + delta));
    WB.setStyles(n.id, { 'font-size': v + 'px' }, `fs:${n.id}`);
    WB.toast(`글자 크기 ${v}px`);
  }
  async function link() {
    const n = selNode();
    if (!n || WB.kindOf(n) !== 'text') return WB.toast('글자 요소를 고르고 눌러 주세요');
    const url = await WB.ask('링크 걸기', n.attrs.href || 'https://', 'https://example.com', '걸기', '누르면 이 주소로 가요. #이름 이면 그 요소로 이동');
    if (url == null || url === '') return;
    WB.commit(d => {
      const m = WB.find(d.root, n.id).node;
      if (m.tag !== 'a' && m.tag !== 'button') m.tag = 'a';
      if (m.tag === 'button') { WB.toast('버튼은 「클릭했을 때 동작」으로 이동을 만들어요'); return; }
      m.attrs.href = url;
    }, `link:${Date.now()}`);
  }

  /** 한 글자 도구: 피그마 · 캔바처럼 T 글자, R 네모, O · C 원, L 선, F 자유 배치(프레임) */
  const TOOLS = { t: 'p', r: 'shape-rect', o: 'shape-circle', c: 'shape-circle', l: 'shape-line', f: 'free' };
  function tool(k) {
    WB.addFromPalette(TOOLS[k]);
    if (k === 't') setTimeout(() => WB.startEditSelected(), 50);
  }

  /* ---------- 스페이스 + 끌기: 작업 공간 움직이기 ---------- */
  let space = false, pan = null;
  addEventListener('keydown', e => {
    if (e.code !== 'Space' || e.repeat || space || isTypingTarget(e) || !doc() || WB.isEditingText()) return;
    space = true;
    cv.scroller.classList.add('panning');
  }, true);
  addEventListener('keyup', e => {
    if (e.code !== 'Space') return;
    space = false;
    cv.scroller.classList.remove('panning');
  }, true);
  addEventListener('blur', () => { space = false; cv.scroller.classList.remove('panning'); });
  addEventListener('mousedown', e => {
    const middle = e.button === 1;
    if (!(space && e.button === 0) && !middle) return;
    if (!e.composedPath().includes(cv.scroller)) return;
    e.preventDefault();
    e.stopPropagation(); // 사각형 고르기 · 끌어 옮기기 대신
    pan = { x: e.clientX, y: e.clientY, l: cv.scroller.scrollLeft, t: cv.scroller.scrollTop };
    cv.scroller.classList.add('panning', 'grabbing');
  }, true);
  addEventListener('mousemove', e => {
    if (!pan) return;
    cv.scroller.scrollLeft = pan.l - (e.clientX - pan.x);
    cv.scroller.scrollTop = pan.t - (e.clientY - pan.y);
  }, true);
  addEventListener('mouseup', () => {
    if (!pan) return;
    pan = null;
    cv.skipClick = true;
    setTimeout(() => (cv.skipClick = false));
    cv.scroller.classList.remove('grabbing');
    if (!space) cv.scroller.classList.remove('panning');
  }, true);
  cv.shadow.addEventListener('dragstart', e => { if (space) e.preventDefault(); }, true);
  function isTypingTarget(e) {
    const t = e.composedPath()[0];
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  }

  /* ---------- 단축키 표 (도움말 창에도 그대로 씀) ---------- */
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  const K = s => (isMac ? s.replace(/Ctrl/g, '⌘').replace(/Alt/g, '⌥') : s);
  WB.SHORTCUTS = [
    ['웹사이트 빌더', [
      ['Ctrl+E · Ctrl+Shift+P', '명령 찾기 (넣기 · 기능 · 페이지 · 요소)'], ['Ctrl+F / Ctrl+H', '찾기 / 찾아 바꾸기'],
      ['Ctrl+Shift+1 · 2 · 3 · 4', '화면: 작업 폭 · 태블릿 · 휴대폰 · 넓은 PC'], ['Ctrl+Tab · Ctrl+Alt+] / [', '다음 · 이전 페이지 탭'],
      ['Ctrl+Alt+N', '새 페이지'], ['Ctrl+Shift+H', '지금 화면 크기에서 숨기기 · 보이기'], ['Ctrl+Shift+X', 'X-ray (윤곽선 + 여백)'],
      ['Ctrl+L', '잠그기 · 풀기'], ['Ctrl+Alt+Z', '실행 기록'], ['Ctrl+Shift+E', '내보내기 (zip · HTML)'],
    ]],
    ['마우스와 함께', [
      ['Alt+끌기', '복제해서 놓기'], ['Shift+끌기 (옮길 때)', '가로나 세로로만'], ['Ctrl 을 누른 채 끌기', '그동안 스냅 끄기'],
      ['Shift+모서리 끌기', '비율 그대로 크기 조절'], ['Alt+손잡이 끌기', '가운데 기준으로 크기 조절'], ['Shift+테두리 끌기', '10px 씩'],
    ]],
    ['코드 칸 (VS Code 처럼)', [
      ['Ctrl+/', '주석 넣기 · 빼기'], ['Shift+Alt+F', '코드 정리 (들여쓰기)'], ['Alt+↑ / Alt+↓', '줄 옮기기'], ['Shift+Alt+↑ / ↓', '줄 복제'],
      ['Ctrl+D', '같은 단어 다음 것 고르기'], ['Tab / Shift+Tab', '들여쓰기 / 내어쓰기'], ['Ctrl+Enter', '적용'],
    ]],
    ['고르기', [
      ['클릭 · 빈 곳에서 끌기', '고르기 · 사각형으로 여러 개 고르기'], ['Shift+클릭 · 요소 위에서 Shift+끌기', '여러 개에 더하기 · 빼기'],
      ['Ctrl+A', '모두 고르기'], ['Esc', '바깥 상자 · 고르기 풀기'], ['Shift+Enter', '바깥 상자 고르기'],
      ['Enter', '안의 요소들 고르기 (글자는 고치기)'], ['Tab / Shift+Tab', '다음 · 이전 요소'],
    ]],
    ['편집', [
      ['Ctrl+Z / Ctrl+Shift+Z · Ctrl+Y', '되돌리기 / 다시 하기'], ['Ctrl+C · X · V', '복사 · 잘라내기 · 붙여넣기'], ['Ctrl+D', '복제'],
      ['Delete · Backspace', '삭제'], ['Ctrl+G / Ctrl+Shift+G', '묶기 / 풀기'], ['Ctrl+Alt+C / Ctrl+Alt+V', '모양 복사 / 붙여넣기 (Ctrl+Shift+C · V 도)'],
      ['Ctrl+] / Ctrl+[', '한 칸 앞으로 / 뒤로'], ['Ctrl+Shift+] / Ctrl+Shift+[', '맨 앞으로 / 맨 뒤로'], ['Alt+↑ / Alt+↓', '순서 위로 / 아래로'],
      ['화살표 (Shift: 10px)', '자유 배치 요소 옮기기'], ['Ctrl+K', '링크 걸기'],
    ]],
    ['맞추기 (자유 배치)', [
      ['Alt+A / Alt+H / Alt+D', '왼쪽 / 가로 가운데 / 오른쪽'], ['Alt+W / Alt+V / Alt+S', '위 / 세로 가운데 / 아래'],
      ['Alt+Shift+H / Alt+Shift+V', '가로 · 세로로 같은 간격'],
    ]],
    ['글자', [
      ['Ctrl+I · Ctrl+U', '기울임 · 밑줄'], ['Ctrl+Shift+B', '굵게 (Ctrl+B 는 왼쪽 탭 접기)'], ['Ctrl+Shift+. / Ctrl+Shift+,', '글자 크게 / 작게'],
      ['Ctrl+Alt+L / T / R', '왼쪽 / 가운데 / 오른쪽 정렬'], ['F2', '글자 고치기'],
    ]],
    ['넣기', [
      ['T', '글자'], ['R', '네모'], ['O · C', '원'], ['L', '선'], ['F', '자유 배치 상자 (프레임)'],
    ]],
    ['보기', [
      ['Ctrl+= / Ctrl+-', '크게 / 작게 보기 (Ctrl+휠)'], ['Shift+0 · Ctrl+0', '100%'], ['Shift+1', '페이지 폭에 맞추기'], ['Shift+2', '고른 요소로 이동'],
      ['Space+끌기 · 휠 버튼 끌기', '작업 공간 움직이기'], ['Shift+R', '눈금자 · 여백 보기'], ['Ctrl+Alt+P', '미리보기'],
      ['Ctrl+B / Ctrl+J', '왼쪽 · 아래 탭 접기'], ['Ctrl+1 · 2 · 3', 'HTML · CSS · JS'], ['Ctrl+S', '저장'], ['Ctrl+/ · ?', '이 단축키 표'],
    ]],
  ];
  WB.openShortcuts = () => {
    const mine = WB.changedKeys?.() || [];
    const table = mine.length ? [['내가 바꾼 단축키 (설정 → 단축키)', mine.map(([name, def, now]) => [now, `${name} (기본 ${def})`])], ...WB.SHORTCUTS] : WB.SHORTCUTS;
    const content = h('div', { class: 'sc-grid' }, ...table.map(([title, rows]) =>
      h('section', { class: 'sc-sec' }, h('h4', {}, title), ...rows.map(([k, d]) => h('div', { class: 'sc-row' }, h('kbd', {}, K(k)), h('span', {}, d))))));
    const m = WB.modal({ title: '단축키', sub: '피그마 · 캔바와 같은 단축키를 쓸 수 있어요', wide: true, content, actions: [{ label: '닫기', onClick: c => c() }] });
    m.box.classList.add('sc-modal');
  };

  /* ---------- 키 처리 (app.js 에서 부름) ---------- */
  WB.extraKey = (e, mod, key) => {
    const code = e.code;
    const go = fn => { e.preventDefault(); fn(); return true; };
    // 도움말 · 보기
    if ((mod && (key === '/' || code === 'Slash')) || (!mod && !e.altKey && e.key === '?')) return go(WB.openShortcuts);
    if (mod && !e.shiftKey && (key === '=' || key === '+' || code === 'Equal' || code === 'NumpadAdd')) return go(() => WB.setZoom((WB.settings.zoom || 1) * 1.25));
    if (mod && !e.shiftKey && (key === '-' || code === 'Minus' || code === 'NumpadSubtract')) return go(() => WB.setZoom((WB.settings.zoom || 1) / 1.25));
    if (mod && !e.shiftKey && code === 'Digit0') return go(() => WB.setZoom(1));
    if (!mod && !e.altKey && e.shiftKey && code === 'Digit0') return go(() => WB.setZoom(1));
    if (!mod && !e.altKey && e.shiftKey && code === 'Digit1') return go(() => WB.setZoom('fit'));
    if (!mod && !e.altKey && e.shiftKey && code === 'Digit2') return go(() => { const id = WB.selectedId() || WB.multiIds()[0]; if (id && id !== 'root') WB.emit('reveal', id); });
    if (!mod && !e.altKey && e.shiftKey && key === 'r') return go(() => document.querySelector('[data-tool="rulers"]')?.click());
    if (mod && e.altKey && key === 'p') return go(() => WB.preview());
    // 순서
    if (mod && !e.altKey && (code === 'BracketRight' || code === 'BracketLeft')) return go(() => order(code === 'BracketRight' ? 1 : -1, e.shiftKey));
    // 모양 복사 · 붙여넣기 (피그마 · 캔바: Ctrl+Alt+C / V)
    if (mod && e.altKey && key === 'c') return go(WB.copyStyle);
    if (mod && e.altKey && key === 'v') return go(WB.pasteStyle);
    // 글자 정렬 (피그마: Ctrl+Alt+L · T · R)
    if (mod && e.altKey && ['l', 't', 'r'].includes(key)) return go(() => { const n = selNode(); if (n) WB.setStyles(n.id, { 'text-align': { l: 'left', t: 'center', r: 'right' }[key] }, `ta:${Date.now()}`); });
    // 맞추기 (피그마: Alt+A · H · D · W · V · S, 같은 간격 Alt+Shift+H · V)
    if (e.altKey && !mod) {
      const how = e.shiftKey ? { h: 'hspace', v: 'vspace' }[key] : { a: 'left', h: 'hcenter', d: 'right', w: 'top', v: 'vcenter', s: 'bottom' }[key];
      if (how) return go(() => align(how));
    }
    // 글자 모양
    if (mod && !e.altKey && !e.shiftKey && key === 'i' && selNode()) return go(() => toggleStyle('font-style', 'italic', 'normal'));
    if (mod && !e.altKey && !e.shiftKey && key === 'u' && selNode()) return go(() => toggleStyle('text-decoration-line', 'underline', 'none'));
    if (mod && e.shiftKey && !e.altKey && key === 'b' && selNode()) return go(() => toggleStyle('font-weight', '700', '400'));
    if (mod && e.shiftKey && (code === 'Period' || code === 'Comma') && selNode()) return go(() => fontSize(code === 'Period' ? 1 : -1));
    if (mod && !e.shiftKey && !e.altKey && key === 'k') return go(link);
    // 고르기
    if (e.key === 'Tab' && !mod && !e.altKey) return go(() => sibling(e.shiftKey ? -1 : 1));
    if (e.key === 'Enter' && e.shiftKey && !mod) return go(WB.selectParent);
    if (e.key === 'Enter' && !e.shiftKey && !mod) {
      const n = selNode() || (WB.selectedId() === 'root' ? doc().root : null);
      if (n && n.children?.length) return go(() => WB.selectMany(n.children.map(c => c.id)));
    }
    // 한 글자 도구
    if (!mod && !e.altKey && !e.shiftKey && TOOLS[key] && e.key.length === 1) return go(() => tool(key));
    return false;
  };
})();
