'use strict';
/* 단축키 바꾸기 (설정 → 단축키)
   바꾼 키를 누르면 원래 키를 누른 것처럼 다시 보내는 방식이라, 각 기능 코드는 그대로 둠.
   기본 키를 다른 기능에 넘겼으면 그 기본 키는 더 이상 그 기능을 하지 않음 (브라우저 기본 동작으로 돌아감).
   키는 'Ctrl+Shift+KeyE' 처럼 수식키 + 물리 키(code) 로 저장 (한/영 상태와 상관없게) */
(() => {
  const { h, esc } = WB;
  // [id, 묶음, 이름, 기본 키]
  const A = (group, list) => list.map(([id, name, key]) => ({ id, group, name, key }));
  WB.KEYMAP = [
    ...A('편집', [
      ['undo', '되돌리기', 'Ctrl+KeyZ'], ['redo', '다시 하기', 'Ctrl+KeyY'], ['copy', '요소 복사', 'Ctrl+KeyC'], ['cut', '잘라내기', 'Ctrl+KeyX'],
      ['dup', '복제', 'Ctrl+KeyD'], ['del', '삭제', 'Delete'], ['group', '묶기', 'Ctrl+KeyG'], ['ungroup', '묶음 풀기', 'Ctrl+Shift+KeyG'],
      ['all', '모두 고르기', 'Ctrl+KeyA'], ['cstyle', '모양 복사', 'Ctrl+Alt+KeyC'], ['pstyle', '모양 붙여넣기', 'Ctrl+Alt+KeyV'],
      ['fwd', '한 칸 앞으로', 'Ctrl+BracketRight'], ['bwd', '한 칸 뒤로', 'Ctrl+BracketLeft'], ['front', '맨 앞으로', 'Ctrl+Shift+BracketRight'], ['back', '맨 뒤로', 'Ctrl+Shift+BracketLeft'],
      ['link', '링크 걸기', 'Ctrl+KeyK'], ['edit', '글자 고치기', 'F2'], ['parent', '바깥 상자 고르기', 'Shift+Enter'], ['next', '다음 요소', 'Tab'], ['prev', '이전 요소', 'Shift+Tab'],
      ['lock', '잠그기 · 풀기', 'Ctrl+KeyL'], ['hide', '숨기기 · 보이기', 'Ctrl+Shift+KeyH'],
    ]),
    ...A('맞추기', [
      ['al', '왼쪽', 'Alt+KeyA'], ['ac', '가로 가운데', 'Alt+KeyH'], ['ar', '오른쪽', 'Alt+KeyD'], ['at', '위', 'Alt+KeyW'], ['am', '세로 가운데', 'Alt+KeyV'], ['ab', '아래', 'Alt+KeyS'],
      ['dh', '가로로 같은 간격', 'Alt+Shift+KeyH'], ['dv', '세로로 같은 간격', 'Alt+Shift+KeyV'],
    ]),
    ...A('글자', [
      ['it', '기울임', 'Ctrl+KeyI'], ['ul', '밑줄', 'Ctrl+KeyU'], ['bd', '굵게', 'Ctrl+Shift+KeyB'], ['big', '글자 크게', 'Ctrl+Shift+Period'], ['small', '글자 작게', 'Ctrl+Shift+Comma'],
      ['tl', '왼쪽 정렬', 'Ctrl+Alt+KeyL'], ['tc', '가운데 정렬', 'Ctrl+Alt+KeyT'], ['tr', '오른쪽 정렬', 'Ctrl+Alt+KeyR'],
    ]),
    ...A('넣기', [['t', '글자', 'KeyT'], ['r', '네모', 'KeyR'], ['o', '원', 'KeyO'], ['l', '선', 'KeyL'], ['f', '자유 배치 상자', 'KeyF']]),
    ...A('보기 · 창', [
      ['zin', '크게 보기', 'Ctrl+Equal'], ['zout', '작게 보기', 'Ctrl+Minus'], ['z100', '100%', 'Shift+Digit0'], ['fit', '폭에 맞추기', 'Shift+Digit1'], ['tosel', '고른 요소로', 'Shift+Digit2'],
      ['rulers', '눈금자', 'Shift+KeyR'], ['xray', 'X-ray', 'Ctrl+Shift+KeyX'], ['preview', '미리보기', 'Ctrl+Alt+KeyP'], ['save', '저장', 'Ctrl+KeyS'],
      ['w1', '왼쪽 탭 접기', 'Ctrl+KeyB'], ['w5', '아래 탭 접기', 'Ctrl+KeyJ'], ['m1', 'HTML 모드', 'Ctrl+Digit1'], ['m2', 'CSS 모드', 'Ctrl+Digit2'], ['m3', 'JS 모드', 'Ctrl+Digit3'],
      ['d1', '화면: 작업 폭', 'Ctrl+Shift+Digit1'], ['d2', '화면: 태블릿', 'Ctrl+Shift+Digit2'], ['d3', '화면: 휴대폰', 'Ctrl+Shift+Digit3'], ['d4', '화면: 넓은 PC', 'Ctrl+Shift+Digit4'],
    ]),
    ...A('찾기 · 페이지', [
      ['cmd', '명령 찾기', 'Ctrl+KeyE'], ['find', '찾기', 'Ctrl+KeyF'], ['replace', '찾아 바꾸기', 'Ctrl+KeyH'], ['ntab', '다음 페이지 탭', 'Ctrl+Alt+BracketRight'], ['ptab', '이전 페이지 탭', 'Ctrl+Alt+BracketLeft'],
      ['new', '새 페이지', 'Ctrl+Alt+KeyN'], ['hist', '실행 기록', 'Ctrl+Alt+KeyZ'], ['export', '내보내기', 'Ctrl+Shift+KeyE'], ['help', '단축키 표', 'Ctrl+Slash'],
    ]),
  ];
  const byId = new Map(WB.KEYMAP.map(a => [a.id, a]));
  const custom = () => WB.settings.keymap || {};
  const keyOf = a => custom()[a.id] || a.key;

  /* ---------- 키 이름 ---------- */
  const MODS = ['Ctrl', 'Alt', 'Shift'];
  const comboOf = e => {
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key) || !e.code) return null;
    return [e.ctrlKey || e.metaKey ? 'Ctrl' : '', e.altKey ? 'Alt' : '', e.shiftKey ? 'Shift' : '', e.code].filter(Boolean).join('+');
  };
  const CODE_LABEL = { BracketRight: ']', BracketLeft: '[', Slash: '/', Backslash: '\\', Equal: '=', Minus: '-', Period: '.', Comma: ',', Semicolon: ';', Quote: "'", Backquote: '`', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Space', Escape: 'Esc' };
  const codeLabel = c => CODE_LABEL[c] || c.replace(/^Key|^Digit|^Numpad/, '');
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  WB.keyLabel = combo => combo.split('+').map(p => (MODS.includes(p) ? (isMac ? { Ctrl: '⌘', Alt: '⌥', Shift: '⇧' }[p] : p) : codeLabel(p))).join(isMac ? '' : '+');
  // code → 그 키를 눌렀을 때의 e.key (다시 보낼 때 씀)
  const CODE_KEY = { BracketRight: ']', BracketLeft: '[', Slash: '/', Backslash: '\\', Equal: '=', Minus: '-', Period: '.', Comma: ',', Semicolon: ';', Quote: "'", Backquote: '`', Space: ' ' };
  const keyForCode = (code, shift) => {
    if (/^Key[A-Z]$/.test(code)) return shift ? code[3] : code[3].toLowerCase();
    if (/^Digit\d$/.test(code)) return code[5];
    return CODE_KEY[code] ?? code; // Enter · Tab · Delete · F2 · ArrowUp …
  };

  /* ---------- 바꾼 키 → 원래 키로 다시 보내기 ---------- */
  let passing = false;
  addEventListener('keydown', e => {
    if (passing || e.isComposing) return;
    const map = custom();
    if (!Object.keys(map).length) return;
    const t = e.composedPath()[0];
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable || t.closest?.('.keymap'))) return;
    const combo = comboOf(e);
    if (!combo) return;
    const hit = WB.KEYMAP.find(a => map[a.id] === combo);
    if (hit) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const parts = hit.key.split('+'), code = parts.pop();
      const ev = new KeyboardEvent('keydown', { key: keyForCode(code, parts.includes('Shift')), code, ctrlKey: parts.includes('Ctrl'), altKey: parts.includes('Alt'), shiftKey: parts.includes('Shift'), bubbles: true, cancelable: true, composed: true });
      passing = true;
      try { (t || document.body).dispatchEvent(ev); } finally { passing = false; }
      return;
    }
    // 다른 키로 옮긴 기능의 원래 키: 편집기는 무시 (브라우저 기본 동작은 그대로)
    if (WB.KEYMAP.some(a => map[a.id] && a.key === combo)) e.stopImmediatePropagation();
  }, true);

  /* ---------- 설정 화면 ---------- */
  WB.renderKeymap = box => {
    box.classList.add('keymap');
    const search = h('input', { type: 'text', placeholder: '기능 찾기 (예: 복제, 미리보기)', spellcheck: 'false' });
    const reset = h('button', { class: 'btn small', type: 'button' }, '모두 기본값으로');
    const list = h('div', { class: 'km-list' });
    let recording = null;
    const save = m => { WB.settings.keymap = m; WB.saveSettings(); };
    const render = () => {
      const q = search.value.trim().toLowerCase();
      const used = new Map();
      for (const a of WB.KEYMAP) { const k = keyOf(a); used.set(k, [...(used.get(k) || []), a.id]); }
      list.replaceChildren();
      let group = '';
      for (const a of WB.KEYMAP) {
        if (q && !(a.name + ' ' + a.group + ' ' + WB.keyLabel(keyOf(a))).toLowerCase().includes(q)) continue;
        if (a.group !== group) { group = a.group; list.append(h('div', { class: 'km-group' }, group)); }
        const k = keyOf(a), changed = !!custom()[a.id], clash = used.get(k).length > 1;
        const btn = h('button', { type: 'button', class: 'km-key' + (changed ? ' changed' : '') + (clash ? ' clash' : '') + (recording === a.id ? ' rec' : ''), title: clash ? '다른 기능과 같은 키예요: ' + used.get(k).filter(x => x !== a.id).map(x => byId.get(x).name).join(', ') : '누르고 새 키 조합을 입력 (Esc: 취소, Backspace: 기본값)' }, recording === a.id ? '키를 누르세요…' : WB.keyLabel(k));
        btn.onclick = () => { recording = recording === a.id ? null : a.id; render(); list.querySelector('.rec')?.focus(); };
        btn.onkeydown = e => {
          if (recording !== a.id) return;
          e.preventDefault(); e.stopPropagation();
          if (e.key === 'Escape') { recording = null; render(); return; }
          const m = { ...custom() };
          if (e.key === 'Backspace' && !e.ctrlKey && !e.altKey && !e.shiftKey) delete m[a.id];
          else {
            const c = comboOf(e);
            if (!c) return; // 수식키만 누른 상태: 기다림
            if (c === a.key) delete m[a.id]; else m[a.id] = c;
          }
          save(m);
          recording = null;
          render();
          const now = keyOf(a), other = WB.KEYMAP.filter(x => x.id !== a.id && keyOf(x) === now);
          if (other.length) WB.toast(`「${WB.keyLabel(now)}」 는 「${other.map(x => x.name).join(', ')}」 에도 쓰여요. 그쪽도 바꿔 주세요`, 'error');
        };
        const undo = changed ? h('button', { type: 'button', class: 'km-undo', title: '기본값 ' + WB.keyLabel(a.key) + ' 로' }, '↺') : null;
        if (undo) undo.onclick = () => { const m = { ...custom() }; delete m[a.id]; save(m); render(); };
        list.append(h('div', { class: 'km-row' }, h('span', {}, a.name), h('span', { class: 'km-def' }, changed ? '기본 ' + WB.keyLabel(a.key) : ''), btn, undo || h('span', { class: 'km-undo-space' })));
      }
    };
    search.addEventListener('input', render);
    reset.onclick = () => { if (!Object.keys(custom()).length || confirm('바꾼 단축키를 모두 기본값으로 되돌릴까요?')) { save({}); render(); } };
    box.replaceChildren(h('div', { class: 'lib-row' }, search, reset), list,
      h('p', { class: 'hint' }, '키 칸을 누르고 새 조합을 누르면 바뀌어요 (Esc 취소 · Backspace 기본값). 빨간 칸은 다른 기능과 겹치는 키예요. Ctrl+N · Ctrl+T · Ctrl+W 처럼 브라우저가 먼저 가져가는 키는 쓸 수 없어요. 코드 칸 안의 키(Ctrl+/ 주석 등)는 그대로예요.'));
    render();
  };
  /** 단축키 표에서 쓰는: 기본 키 이름 → 바꾼 키 이름 (바뀐 것만) */
  WB.changedKeys = () => WB.KEYMAP.filter(a => custom()[a.id]).map(a => [a.name, WB.keyLabel(a.key), WB.keyLabel(custom()[a.id])]);
})();
