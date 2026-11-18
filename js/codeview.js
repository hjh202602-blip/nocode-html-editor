'use strict';
/* 4번 도구 탭의 「비코더 | 코드」: HTML · CSS · JS 를 화면 조작 대신 코드로 직접 쓰기
   HTML 코드: <body> 안의 내용 · CSS 코드: 편집기가 만든 스타일 + 직접 쓰는 CSS · JS 코드: 탭5 「코드」(직접 쓴 JavaScript)
   HTML · CSS 는 고친 뒤 「적용」(Ctrl+Enter)을 누르면 페이지 전체를 다시 읽어 캔버스에 반영 (되돌리기 Ctrl+Z 가능) */
(() => {
  const { $, h } = WB;
  const SPLIT = '/* ===== 아래는 직접 쓰는 CSS (편집기가 손대지 않음) ===== */';
  const dedent = (s, n) => s.split('\n').map(l => (l.startsWith(' '.repeat(n)) ? l.slice(n) : l.trimStart())).join('\n');
  const indent = (s, n) => s.split('\n').map(l => (l ? ' '.repeat(n) + l : l)).join('\n');
  const PANES = { html: '#tab4', css: '#tab2' };
  const boxes = {};

  for (const [mode, sel] of Object.entries(PANES)) {
    const pane = $(sel);
    const gutter = h('pre', { class: 'blk-code-gutter' }, '1');
    const ta = h('textarea', { class: 'blk-code', spellcheck: 'false' });
    const status = h('span', { class: 'cv-status' });
    const apply = h('button', { class: 'btn small primary', title: '고친 코드를 페이지에 반영 (Ctrl+Enter)' }, '적용');
    const reset = h('button', { class: 'btn small', title: '고치던 것을 버리고 지금 페이지의 코드로 다시' }, '되돌리기');
    const hint = mode === 'html'
      ? '페이지 <body> 안의 HTML 이에요. 태그를 고치고 「적용」을 누르면 캔버스에 반영돼요. class 를 붙이면 「CSS」 코드에서 꾸밀 수 있어요.'
      : '편집기가 만든 스타일이에요. 값을 고치거나 규칙을 더하고 「적용」을 누르세요. 맨 아래 줄 아래는 그대로 남는 「직접 쓰는 CSS」 (마우스 올림 조합 · 애니메이션 등)';
    const box = h('div', { class: 'cv-box', hidden: true },
      h('div', { class: 'blk-code-hint' }, hint),
      h('div', { class: 'blk-code-wrap' }, gutter, ta),
      h('div', { class: 'cv-foot' }, status, h('span', { class: 'spacer' }), reset, apply));
    pane.append(box);
    boxes[mode] = { pane, box, ta, gutter, status, dirty: false };
    const B = boxes[mode];
    const lines = () => (gutter.textContent = Array.from({ length: ta.value.split('\n').length }, (_, i) => i + 1).join('\n'));
    ta.addEventListener('input', () => { B.dirty = true; status.textContent = '고치는 중 — 「적용」을 누르면 반영돼요'; status.className = 'cv-status warn'; lines(); });
    ta.addEventListener('scroll', () => (gutter.scrollTop = ta.scrollTop));
    ta.addEventListener('keydown', e => {
      if (e.key === 'Tab') { e.preventDefault(); ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); }
      else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); applyCode(mode); }
    });
    apply.onclick = () => applyCode(mode);
    reset.onclick = () => { B.dirty = false; sync(mode, true); };
    B.lines = lines;
  }

  /** 지금 문서 → 코드 칸 */
  function sync(mode, force) {
    const B = boxes[mode];
    const doc = WB.canvasDoc();
    if (!B || B.box.hidden || (B.dirty && !force) || document.activeElement === B.ta) return;
    B.ta.disabled = !doc;
    if (!doc) { B.ta.value = ''; B.lines(); return; }
    const parts = {};
    WB.generateHTML(doc, { parts });
    B.ta.value = mode === 'html' ? dedent(parts.body, 2) : dedent(parts.css, 4) + '\n\n' + SPLIT + '\n' + (parts.extraCss || '');
    B.lines();
    B.status.textContent = '지금 페이지의 코드';
    B.status.className = 'cv-status';
  }

  /** 코드 칸 → 문서 (페이지 전체 HTML 을 다시 만들어 읽음) */
  function applyCode(mode) {
    const B = boxes[mode];
    const doc = WB.canvasDoc();
    if (!doc) return;
    const parts = {};
    let html = WB.generateHTML(doc, { parts });
    if (mode === 'html') {
      html = html.replace(parts.body, () => indent(B.ta.value.replace(/\s+$/, ''), 2));
    } else {
      const [mine, ...rest] = B.ta.value.split(SPLIT);
      const extra = rest.join(SPLIT).trim();
      html = html.replace(parts.cssBlock, () => `<style data-wb>\n${indent(mine.trim(), 4)}\n  </style>`);
      if (parts.extraBlock) html = html.replace(parts.extraBlock, () => '');
      if (extra) html = html.replace('\n</head>', () => `\n  <style>\n    /* 가져온 CSS · 직접 쓴 CSS (설정 → 페이지) */\n${indent(extra, 4)}\n  </style>\n</head>`);
    }
    let p;
    try { p = WB.parseHTML(html); } catch (err) { B.status.textContent = '읽지 못했어요: ' + err.message; B.status.className = 'cv-status err'; return; }
    WB.commit(d => {
      d.title = p.title || d.title;
      d.root = p.root;
      d.extra = { ...d.extra, ...p.extra };
      d.formats = p.formats || {};
      if (p.blocks) d.blocks = p.blocks;
    }, `code-${mode}:${Date.now()}`);
    WB.select(null);
    B.dirty = false;
    sync(mode, true);
    B.status.textContent = '반영했어요 (Ctrl+Z 로 되돌리기)';
    B.status.className = 'cv-status ok';
  }

  /* ---------- 비코더 | 코드 바꾸기 (모드마다 따로 기억) ---------- */
  const seg = $('#tools .code-mode');
  WB.codeMode = m => !!(WB.settings.codeModes || {})[m];
  WB.setCodeMode = (m, on) => {
    WB.settings.codeModes = { ...(WB.settings.codeModes || {}), [m]: !!on };
    WB.saveSettings();
    show();
  };
  function show() {
    const m = WB.settings.tool || 'html';
    const on = WB.codeMode(m);
    seg.querySelectorAll('[data-cm]').forEach(b => b.classList.toggle('on', (b.dataset.cm === 'code') === on));
    for (const [mode, B] of Object.entries(boxes)) {
      const coding = mode === m && on;
      B.pane.classList.toggle('coding', coding);
      B.box.hidden = !coding;
      if (coding) sync(mode, true);
    }
    if (m === 'js') WB.setBlockMode?.(on ? 'code' : 'blocks');
  }
  seg.addEventListener('click', e => {
    const b = e.target.closest('[data-cm]');
    if (b) WB.setCodeMode(WB.settings.tool || 'html', b.dataset.cm === 'code');
  });
  WB.on('tool', show);
  WB.on('change', () => { sync('html'); sync('css'); });
  WB.on('doc', () => { for (const B of Object.values(boxes)) B.dirty = false; sync('html', true); sync('css', true); });
  WB.on('blockmode', m => { // 탭5 안의 「블록 | 코드」를 눌러도 위쪽 표시가 맞게
    const want = m === 'code';
    if (WB.codeMode('js') !== want) { WB.settings.codeModes = { ...(WB.settings.codeModes || {}), js: want }; WB.saveSettings(); }
    if ((WB.settings.tool || 'html') === 'js') seg.querySelectorAll('[data-cm]').forEach(b => b.classList.toggle('on', (b.dataset.cm === 'code') === want));
  });
  show();
})();
