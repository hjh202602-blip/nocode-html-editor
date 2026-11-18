'use strict';
/* 웹사이트 빌더(웹플로우 · 프레이머 · 윅스) · 코드 편집기(VS Code)에서 쓰는 기능과 단축키
   - Ctrl+E · Ctrl+Shift+P: 명령 찾기 창 (요소 넣기 · 기능 실행 · 페이지 이동 · 요소 찾아 고르기)
   - Ctrl+F / Ctrl+H: 찾기 / 찾아 바꾸기
   - Ctrl+Shift+1~4: 화면 크기, Ctrl+Tab · Ctrl+Alt+] [: 페이지 탭 이동, Ctrl+Alt+N: 새 페이지
   - Ctrl+Shift+H: 지금 화면 크기에서 숨기기, Ctrl+Shift+X: X-ray (윤곽선 + 여백), Ctrl+L: 잠그기
   - Ctrl+Alt+Z: 실행 기록, Ctrl+Shift+E: 내보내기
   - 코드 칸: Ctrl+/ 주석, Shift+Alt+F 정리, Alt+↑↓ 줄 옮기기, Shift+Alt+↑↓ 줄 복제, Ctrl+D 같은 단어 다음 것, Shift+Tab 내어쓰기 */
(() => {
  const { h, esc } = WB;
  const doc = () => WB.canvasDoc();
  const selNode = () => { const n = WB.selectedNode(); return n && n.id !== 'root' ? n : null; };
  const tool = t => document.querySelector(`[data-tool="${t}"]`)?.click();

  /* ---------- 화면 크기 · 탭 · 새 페이지 ---------- */
  const DEVICES = ['desktop', 'tablet', 'mobile', 'wide'];
  const DEVICE_NAME = { desktop: '작업 공간 폭', tablet: '태블릿 (768px)', mobile: '휴대폰 (390px)', wide: '넓은 PC (1280px)' };
  function device(d) {
    if (!doc()) return;
    tool(d);
    WB.toast('화면 크기: ' + DEVICE_NAME[d]);
  }
  function switchTab(dir) {
    const docs = WB.state.docs;
    if (docs.length < 2) return;
    const i = docs.findIndex(d => d.id === WB.state.activeId);
    WB.activateDoc(docs[(i + dir + docs.length) % docs.length].id);
  }

  /* ---------- 숨기기 · X-ray · 잠그기 ---------- */
  /** 지금 보고 있는 화면 크기에서만 숨기기 · 보이기 (PC 면 모든 화면에서) */
  function hide() {
    const n = selNode();
    if (!n) return WB.toast('숨길 요소를 먼저 고르세요');
    const v = WB.editVariant();
    const k = v === 'mobile' ? 'styleMobile' : v === 'tablet' ? 'styleTablet' : 'style';
    const where = v === 'mobile' ? '휴대폰에서' : v === 'tablet' ? '태블릿에서' : '모든 화면에서';
    const hidden = n[k]?.display === 'none';
    WB.commit(d => {
      const m = WB.find(d.root, n.id).node;
      const s = { ...(m[k] || {}) };
      if (hidden) delete s.display; else s.display = 'none';
      if (k === 'style' || Object.keys(s).length) m[k] = s; else delete m[k];
    }, `hide:${Date.now()}`);
    WB.toast(hidden ? `${where} 다시 보이게 했어요` : `${where} 숨겼어요 — 다시 보이게 하려면 「구조」에서 골라 Ctrl+Shift+H`);
  }
  function xray() {
    const on = !(WB.settings.guides && WB.settings.rulers);
    if (!!WB.settings.guides !== on) tool('guides');
    if (!!WB.settings.rulers !== on) tool('rulers');
    WB.toast(on ? 'X-ray: 모든 상자 윤곽선과 고른 요소의 여백을 보여요' : 'X-ray 끔');
  }
  function lock() {
    const ids = WB.multiIds().length > 1 ? WB.multiIds() : selNode() ? [selNode().id] : [];
    if (!ids.length) return WB.toast('잠글 요소를 먼저 고르세요');
    const locked = ids.every(id => WB.find(doc().root, id).node.attrs['data-lock'] != null);
    WB.commit(d => ids.forEach(id => {
      const m = WB.find(d.root, id).node;
      if (locked) delete m.attrs['data-lock']; else m.attrs['data-lock'] = '';
    }), `lock:${Date.now()}`);
    WB.toast(locked ? '잠금을 풀었어요' : '잠갔어요 — 끌어 옮기기 · 크기 조절 · 사각형 고르기에서 빠져요 (풀기: Ctrl+L)');
  }

  /* ---------- 내보내기 ---------- */
  function exportNow() {
    if (WB.explorer?.root) return WB.exportZip();
    if (doc()) return WB.showCode();
    WB.toast('내보낼 페이지나 프로젝트가 없어요');
  }

  /* ---------- 실행 기록 ---------- */
  const KEY_NAME = [
    [/^resize/, '크기 조절'], [/^(nudge|align|free|place|move)/, '위치 옮기기'], [/^group/, '묶기'], [/^unwrap/, '상자 풀기'],
    [/^(dup)/, '복제'], [/^del/, '삭제'], [/^(fmt|cls|ids)/, '이름표 · 형식'], [/^(t:|fs:|ta:|font)/, '글자 모양'],
    [/^(look|paste-style)/, '모양 붙여넣기'], [/^(hide|mhide)/, '숨기기'], [/^lock/, '잠그기'], [/^lib/, '아이콘 · 글꼴 연결'],
    [/^(template|mine)/, '에셋 열기'], [/^(bg)/, '배경'], [/^tag/, '태그 바꾸기'], [/^replace/, '찾아 바꾸기'], [/^order/, '순서'],
    [/^(text|edit)/, '글자 고치기'], [/^blk/, '블록 코드'], [/^(style|css)/, '스타일'], [/^(link)/, '링크'],
  ];
  const keyName = k => (KEY_NAME.find(([re]) => re.test(k || '')) || [, k ? k.split(':')[0] : '편집'])[1];
  function history() {
    const d = doc();
    if (!d) return;
    const und = (d.undoInfo || []).map((x, i) => ({ ...x, n: d.undo.length - i })).reverse();
    const red = (d.redoInfo || []).map((x, i) => ({ ...x, n: d.redo.length - i })).reverse();
    const t = ms => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const list = h('div', { class: 'hist-list' });
    let m;
    const row = (label, cls, time, onClick) => { const b = h('button', { class: 'hist-row ' + cls }, h('span', {}, label), h('small', {}, time ? t(time) : '')); b.onclick = onClick; return b; };
    // 다시 하기 쪽 (위) · 지금 · 되돌리기 쪽 (아래)
    [...red].reverse().forEach((x, i) => list.append(row(keyName(x.key), 'redo', x.time, () => { for (let k = 0; k < red.length - i; k++) WB.redo(); m.close(); })));
    list.append(row('● 지금', 'now', 0, () => m.close()));
    und.forEach((x, i) => list.append(row(keyName(x.key), '', x.time, () => { for (let k = 0; k <= i; k++) WB.undo(); m.close(); })));
    if (!und.length && !red.length) list.append(h('p', { class: 'hint' }, '아직 바꾼 것이 없어요.'));
    m = WB.modal({ title: '실행 기록', sub: '누르면 그 일을 하기 전으로 돌아가요 (회색은 되돌린 일 — 누르면 다시 하기)', content: list, actions: [{ label: '닫기', onClick: c => c() }] });
  }

  /* ---------- 찾기 · 찾아 바꾸기 ---------- */
  function findReplace(withReplace) {
    const d = doc();
    if (!d) return;
    const q = h('input', { type: 'text', placeholder: '찾을 글자 · 태그 · #id · .이름표', spellcheck: 'false' });
    const r = h('input', { type: 'text', placeholder: '바꿀 글자', spellcheck: 'false', hidden: !withReplace || null });
    const cs = h('label', { class: 'inline' }, h('input', { type: 'checkbox' }), ' 대소문자 구분');
    const all = h('button', { class: 'btn small primary', hidden: !withReplace || null }, '모두 바꾸기');
    const list = h('div', { class: 'cmd-list' });
    const results = () => {
      const s = q.value;
      if (!s) return [];
      const norm = v => (cs.firstChild.checked ? String(v) : String(v).toLowerCase());
      const n = norm(s);
      const out = [];
      WB.walk(doc().root, node => {
        if (node.id === 'root') return;
        const text = node.text || '', cls = node.attrs?.class || '', id = node.attrs?.id || '';
        const hitText = norm(text).includes(n);
        const hit = hitText || (!withReplace && (node.tag === n.replace(/^<|>$/g, '') || (n.startsWith('#') && norm(id) === n.slice(1)) || (n.startsWith('.') && norm(cls).split(/\s+/).includes(n.slice(1)))));
        if (hit) out.push({ node, hitText });
      });
      return out;
    };
    const render = () => {
      const res = results();
      list.replaceChildren(...res.slice(0, 200).map(({ node }) => {
        const b = h('button', { class: 'cmd-item' }, h('span', { class: 'cmd-kind' }, WB.labelOf(node)), h('span', {}, (node.text || '').slice(0, 80) || `<${node.tag}>`), h('small', {}, (node.attrs?.id ? '#' + node.attrs.id + ' ' : '') + (node.attrs?.class ? '.' + node.attrs.class.split(/\s+/).join(' .') : '')));
        b.onclick = () => { WB.select(node.id); WB.emit('reveal', node.id); };
        return b;
      }));
      if (q.value && !res.length) list.append(h('p', { class: 'hint' }, '찾지 못했어요.'));
      count.textContent = q.value ? `${res.length}개` : '';
      all.disabled = !res.some(x => x.hitText) || null;
    };
    const count = h('span', { class: 'hint' });
    all.onclick = () => {
      const s = q.value, to = r.value;
      if (!s) return;
      const re = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), cs.firstChild.checked ? 'g' : 'gi');
      let n = 0;
      WB.commit(dd => WB.walk(dd.root, node => {
        if (node.id === 'root' || typeof node.text !== 'string' || !re.test(node.text)) return;
        re.lastIndex = 0;
        n += (node.text.match(re) || []).length;
        node.text = node.text.replace(re, to);
      }), `replace:${Date.now()}`);
      WB.toast(`${n}곳을 바꿨어요 (Ctrl+Z 로 되돌리기)`, 'ok');
      render();
    };
    q.addEventListener('input', render);
    cs.addEventListener('change', render);
    q.addEventListener('keydown', e => { if (e.key === 'Enter') { const b = list.querySelector('.cmd-item'); if (b) b.click(); } });
    r.addEventListener('keydown', e => { if (e.key === 'Enter') all.click(); });
    WB.modal({
      title: withReplace ? '찾아 바꾸기' : '찾기', sub: withReplace ? '페이지의 글자를 한꺼번에 바꿔요' : '글자 · 태그(예: button) · #id · .이름표로 찾고, 누르면 그 요소를 골라요',
      content: h('div', { class: 'find-box' }, h('div', { class: 'lib-row' }, q, count), h('div', { class: 'lib-row' }, r, all), cs, list),
      actions: [{ label: '닫기', onClick: c => c() }],
    });
    setTimeout(() => q.focus());
  }

  /* ---------- 명령 찾기 창 ---------- */
  function commands() {
    const C = (name, run, kbd = '', kind = '기능') => ({ name, run, kbd, kind });
    const list = [
      C('미리보기', () => WB.preview(), 'Ctrl+Alt+P'), C('저장', () => WB.saveDoc(WB.activeDoc()), 'Ctrl+S'),
      C('내보내기 (zip · HTML)', exportNow, 'Ctrl+Shift+E'), C('새 페이지', () => WB.newPage(), 'Ctrl+Alt+N'),
      C('찾기', () => findReplace(false), 'Ctrl+F'), C('찾아 바꾸기', () => findReplace(true), 'Ctrl+H'),
      C('실행 기록', history, 'Ctrl+Alt+Z'), C('되돌리기', WB.undo, 'Ctrl+Z'), C('다시 하기', WB.redo, 'Ctrl+Y'),
      C('X-ray (윤곽선 + 여백)', xray, 'Ctrl+Shift+X'), C('요소 윤곽선', () => tool('guides')), C('눈금자 · 여백', () => tool('rulers'), 'Shift+R'),
      ...DEVICES.map((d, i) => C('화면: ' + DEVICE_NAME[d], () => device(d), 'Ctrl+Shift+' + (i + 1))),
      C('100% 보기', () => WB.setZoom(1), 'Shift+0'), C('페이지 폭에 맞추기', () => WB.setZoom('fit'), 'Shift+1'),
      C('고른 요소 숨기기 · 보이기', hide, 'Ctrl+Shift+H'), C('잠그기 · 풀기', lock, 'Ctrl+L'),
      C('묶기', () => WB.groupSelected?.(), 'Ctrl+G'), C('모두 고르기', () => WB.selectMany(doc().root.children.map(n => n.id)), 'Ctrl+A'),
      C('에셋 가져오기', () => WB.openAssets()), C('아이콘 · 글꼴 가져오기', () => WB.openLibs()), C('단축키 보기', () => WB.openShortcuts(), 'Ctrl+/'),
      C('구조 보기', () => { WB.setTool('html'); WB.setPaletteMode('tree'); }), C('HTML 태그', () => WB.setTool('html'), 'Ctrl+1'),
      C('CSS 디자인', () => WB.setTool('css'), 'Ctrl+2'), C('JS 동작', () => WB.setTool('js'), 'Ctrl+3'), C('HTML 코드 보기', () => WB.showCode()),
    ];
    for (const g of WB.PALETTE) for (const it of g.items) list.push(C(it.name, () => WB.addFromPalette(it.key), '', '넣기 · ' + g.cat));
    for (const d of WB.state.docs) list.push(C(d.name, () => WB.activateDoc(d.id), '', '페이지'));
    if (doc()) WB.walk(doc().root, n => {
      if (n.id === 'root' || !(n.attrs?.id || n.text)) return;
      list.push(C((n.attrs?.id ? '#' + n.attrs.id + ' ' : '') + (n.text || '').slice(0, 40), () => { WB.select(n.id); WB.emit('reveal', n.id); }, '', '요소 · ' + WB.labelOf(n)));
    });

    const input = h('input', { type: 'text', class: 'cmd-input', placeholder: '무엇을 할까요? (예: 버튼, 미리보기, 휴대폰, 찾기, 페이지 이름)', spellcheck: 'false' });
    const box = h('div', { class: 'cmd-list' });
    let shown = [], at = 0;
    const score = (c, q) => {
      const s = (c.name + ' ' + c.kind + ' ' + WB.t(c.name)).toLowerCase();
      if (!q) return c.kind === '기능' ? 1 : 0;
      if (s.startsWith(q)) return 3;
      if (s.includes(q)) return 2;
      let i = 0; for (const ch of s) if (ch === q[i]) i++; // 글자가 순서대로 들어 있으면 (vs → visible)
      return i === q.length ? 1 : 0;
    };
    const render = () => {
      const q = input.value.trim().toLowerCase();
      shown = list.map(c => [c, score(c, q)]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).slice(0, 60).map(([c]) => c);
      at = Math.min(at, Math.max(0, shown.length - 1));
      box.replaceChildren(...shown.map((c, i) => {
        const b = h('button', { class: 'cmd-item' + (i === at ? ' on' : '') }, h('span', { class: 'cmd-kind' }, c.kind), h('span', {}, c.name), c.kbd ? h('kbd', {}, c.kbd) : null);
        b.onclick = () => run(c);
        return b;
      }));
      if (!shown.length) box.append(h('p', { class: 'hint' }, '맞는 것이 없어요.'));
      box.querySelector('.on')?.scrollIntoView({ block: 'nearest' });
    };
    const run = c => { m.close(); setTimeout(c.run); };
    input.addEventListener('input', () => { at = 0; render(); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); at = Math.min(at + 1, shown.length - 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); at = Math.max(at - 1, 0); render(); }
      else if (e.key === 'Enter' && shown[at]) { e.preventDefault(); run(shown[at]); }
    });
    const m = WB.modal({ title: '명령 찾기', sub: '이름을 쳐서 요소 넣기 · 기능 실행 · 페이지 이동 · 요소 고르기 (↑↓ 고르기, Enter 실행)', content: h('div', { class: 'cmd-box' }, input, box) });
    m.box.classList.add('cmd-modal');
    render();
    setTimeout(() => input.focus());
  }
  WB.openCommands = commands;
  WB.openFind = findReplace;
  WB.openHistory = history;

  /* ---------- 키 (app.js 에서 shortcuts.js 다음에 부름) ---------- */
  WB.siteKey = (e, mod, key) => {
    const code = e.code;
    const go = fn => { e.preventDefault(); fn(); return true; };
    if (mod && !e.altKey && (key === 'e' && !e.shiftKey || key === 'p' && e.shiftKey)) return go(commands);
    if (mod && !e.altKey && !e.shiftKey && key === 'f') return go(() => findReplace(false));
    if (mod && !e.altKey && !e.shiftKey && key === 'h') return go(() => findReplace(true));
    if (mod && e.shiftKey && !e.altKey && /^Digit[1-4]$/.test(code)) return go(() => device(DEVICES[code.slice(5) - 1]));
    if (mod && !e.altKey && e.key === 'Tab') return go(() => switchTab(e.shiftKey ? -1 : 1));
    if (mod && e.altKey && (code === 'BracketRight' || code === 'BracketLeft')) return go(() => switchTab(code === 'BracketRight' ? 1 : -1));
    if (mod && e.altKey && key === 'n') return go(() => WB.newPage());
    if (mod && e.shiftKey && !e.altKey && key === 'h') return go(hide);
    if (mod && e.shiftKey && !e.altKey && key === 'x') return go(xray);
    if (mod && !e.shiftKey && !e.altKey && key === 'l') return go(lock);
    if (mod && e.altKey && key === 'z') return go(history);
    if (mod && e.shiftKey && !e.altKey && key === 'e') return go(exportNow);
    return false;
  };

  /* ---------- 코드 칸 단축키 (VS Code 처럼) ---------- */
  const COMMENT = { html: ['<!-- ', ' -->'], css: ['/* ', ' */'], js: ['// ', ''] };
  /** ta: textarea, lang: 'html' | 'css' | 'js' (함수면 그때그때 물어봄) */
  WB.codeKeys = (ta, lang) => {
    const L = () => (typeof lang === 'function' ? lang() : lang) || 'js';
    const changed = () => ta.dispatchEvent(new Event('input'));
    // 고른 부분이 걸친 줄 전체 [시작, 끝]
    const lineRange = () => {
      const v = ta.value, a = ta.selectionStart, b = Math.max(a, ta.selectionEnd - (ta.selectionEnd > a && v[ta.selectionEnd - 1] === '\n' ? 1 : 0));
      const s = v.lastIndexOf('\n', a - 1) + 1;
      let e = v.indexOf('\n', b); if (e < 0) e = v.length;
      return [s, e];
    };
    const replaceLines = (s, e, text, selA, selB) => { ta.setRangeText(text, s, e, 'select'); if (selA != null) ta.setSelectionRange(selA, selB); changed(); };
    ta.addEventListener('keydown', e => {
      const mod = e.ctrlKey || e.metaKey;
      const v = ta.value;
      // Ctrl+/ 주석 넣기 · 빼기
      if (mod && (e.key === '/' || e.code === 'Slash')) {
        e.preventDefault(); e.stopPropagation();
        const [s, en] = lineRange(), [a, b] = COMMENT[L()];
        const lines = v.slice(s, en).split('\n');
        const isC = lines.filter(l => l.trim()).every(l => l.trim().startsWith(a.trim()) && (!b || l.trim().endsWith(b.trim())));
        const out = lines.map(l => {
          if (!l.trim()) return l;
          const ind = l.match(/^\s*/)[0], body = l.slice(ind.length);
          if (isC) return ind + body.replace(new RegExp('^' + a.trim().replace(/[*/]/g, '\\$&') + ' ?'), '').replace(b ? new RegExp(' ?' + b.trim().replace(/[*/]/g, '\\$&') + '$') : /$^/, '');
          return ind + a + body + b;
        }).join('\n');
        replaceLines(s, en, out);
        return;
      }
      // Alt+↑↓ 줄 옮기기, Shift+Alt+↑↓ 줄 복제
      if (e.altKey && !mod && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault(); e.stopPropagation();
        const [s, en] = lineRange(), block = v.slice(s, en), a0 = ta.selectionStart - s, b0 = ta.selectionEnd - s;
        if (e.shiftKey) { ta.setRangeText(block + '\n' + block, s, en, 'end'); const ns = e.key === 'ArrowDown' ? s + block.length + 1 : s; ta.setSelectionRange(ns + a0, ns + b0); changed(); return; }
        if (e.key === 'ArrowUp') {
          if (s === 0) return;
          const ps = v.lastIndexOf('\n', s - 2) + 1, prev = v.slice(ps, s - 1);
          replaceLines(ps, en, block + '\n' + prev, ps + a0, ps + b0);
        } else {
          if (en >= v.length) return;
          let ne = v.indexOf('\n', en + 1); if (ne < 0) ne = v.length;
          const next = v.slice(en + 1, ne);
          replaceLines(s, ne, next + '\n' + block, s + next.length + 1 + a0, s + next.length + 1 + b0);
        }
        return;
      }
      // Ctrl+D: 고른 단어 (없으면 커서의 단어) → 같은 단어 다음 것으로 (글 칸은 커서가 하나라 다음 것으로 옮겨 감)
      if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault(); e.stopPropagation();
        let a = ta.selectionStart, b = ta.selectionEnd;
        if (a === b) {
          while (a > 0 && /[\w$-]/.test(v[a - 1])) a--;
          while (b < v.length && /[\w$-]/.test(v[b])) b++;
          if (a !== b) ta.setSelectionRange(a, b);
          return;
        }
        const word = v.slice(a, b);
        let i = v.indexOf(word, b); if (i < 0) i = v.indexOf(word);
        if (i >= 0) { ta.setSelectionRange(i, i + word.length); const before = v.slice(0, i).split('\n').length; ta.scrollTop = Math.max(0, (before - 5) * (parseFloat(getComputedStyle(ta).lineHeight) || 18)); }
        return;
      }
      // Shift+Tab 내어쓰기, 여러 줄을 고르고 Tab 이면 들여쓰기
      if (e.key === 'Tab' && (e.shiftKey || v.slice(ta.selectionStart, ta.selectionEnd).includes('\n'))) {
        e.preventDefault(); e.stopImmediatePropagation();
        const [s, en] = lineRange();
        const out = v.slice(s, en).split('\n').map(l => (e.shiftKey ? l.replace(/^ {1,2}|^\t/, '') : '  ' + l)).join('\n');
        replaceLines(s, en, out);
        return;
      }
      // Shift+Alt+F 코드 정리 (들여쓰기 맞추기)
      if (e.shiftKey && e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault(); e.stopPropagation();
        const a = ta.selectionStart;
        ta.value = WB.formatCode(v, L());
        ta.setSelectionRange(Math.min(a, ta.value.length), Math.min(a, ta.value.length));
        changed();
        WB.toast('코드를 정리했어요 (들여쓰기)');
      }
    }, true);
  };
  /** 들여쓰기 다시 맞추기: { } ( ) [ ] 와 HTML 태그 깊이로. 줄바꿈 · 내용은 바꾸지 않음 */
  WB.formatCode = (src, lang) => {
    let depth = 0;
    const VOID = /^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/i;
    return src.split('\n').map(raw => {
      const line = raw.trim();
      if (!line) return '';
      let open = 0, close = 0, lead = 0;
      if (lang === 'html') {
        const tags = [...line.matchAll(/<(\/?)([a-zA-Z][\w-]*)[^>]*?(\/?)>/g)];
        for (const [, sl, name, self] of tags) { if (self || VOID.test(name)) continue; if (sl) close++; else open++; }
        const m = line.match(/^(<\/[^>]+>\s*)+/); lead = m ? (m[0].match(/<\//g) || []).length : 0;
      } else {
        const code = line.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""').replace(/\/\/.*$|\/\*.*?\*\//g, '');
        open = (code.match(/[{([]/g) || []).length; close = (code.match(/[})\]]/g) || []).length;
        lead = (code.match(/^[})\]]+/) || [''])[0].length;
      }
      const ind = Math.max(0, depth - lead);
      depth = Math.max(0, depth + open - close);
      return '  '.repeat(ind) + line;
    }).join('\n');
  };
})();
