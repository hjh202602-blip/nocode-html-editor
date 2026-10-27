'use strict';
/* 전체 연결: 탭 크기 조절, 열린 문서(탭3 위쪽 탭), 열기·저장, 코드로 변환, 설정, 단축키 */
(() => {
  const { $, $$, h, esc, icon } = WB;
  const app = $('#app');
  const S = WB.state;

  /* =========================================================
     탭 크기 조절 (VS Code 처럼 경계선을 끌어서 조절, 두 번 클릭하면 접기/펴기)
     ========================================================= */
  const LAYOUT_DEFAULT = { w1: 240, w5: 280, h2: 128, h4: 210 };
  const LIMITS = { w1: [140, 600], w5: [180, 600], h2: [48, 320], h4: [80, 520] };
  let layout = WB.load('wb.layout', LAYOUT_DEFAULT);
  const before = WB.load('wb.layout.prev', {});

  function applyLayout() {
    for (const k of Object.keys(LAYOUT_DEFAULT)) app.style.setProperty('--' + k, layout[k] + 'px');
    WB.emit('layout');
  }
  function saveLayout() {
    WB.store('wb.layout', layout);
    WB.store('wb.layout.prev', before);
  }
  WB.resetLayout = () => {
    layout = { ...LAYOUT_DEFAULT };
    applyLayout();
    saveLayout();
  };
  WB.togglePanel = k => {
    if (layout[k] > 0) { before[k] = layout[k]; layout[k] = 0; }
    else layout[k] = before[k] || LAYOUT_DEFAULT[k];
    applyLayout();
    saveLayout();
  };

  $$('.splitter').forEach(sp => {
    const k = sp.dataset.split;
    const vertical = sp.classList.contains('sv');
    sp.addEventListener('dblclick', () => WB.togglePanel(k));
    sp.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      sp.setPointerCapture(e.pointerId);
      sp.classList.add('dragging');
      document.body.classList.add('resizing');
      document.body.classList.toggle('rows', !vertical);
      const start = vertical ? e.clientX : e.clientY;
      const startVal = layout[k];
      const sign = k === 'w5' || k === 'h4' ? -1 : 1;
      const [min, max] = LIMITS[k];
      const move = ev => {
        let v = startVal + sign * ((vertical ? ev.clientX : ev.clientY) - start);
        // 가운데 작업 공간은 최소 크기를 남김
        const room = vertical ? innerWidth - 320 - (k === 'w1' ? layout.w5 : layout.w1) : innerHeight - 160 - (k === 'h2' ? layout.h4 : layout.h2);
        v = Math.min(v, max, room);
        v = v < min / 2 ? 0 : Math.max(v, min); // 많이 줄이면 접힘
        layout[k] = Math.round(v);
        applyLayout();
      };
      const up = () => {
        sp.classList.remove('dragging');
        document.body.classList.remove('resizing', 'rows');
        sp.removeEventListener('pointermove', move);
        sp.removeEventListener('pointerup', up);
        sp.removeEventListener('pointercancel', up);
        saveLayout();
      };
      sp.addEventListener('pointermove', move);
      sp.addEventListener('pointerup', up);
      sp.addEventListener('pointercancel', up);
    });
  });
  addEventListener('resize', () => WB.emit('layout'));

  /* =========================================================
     테마 · 설정
     ========================================================= */
  function applyTheme() {
    document.documentElement.dataset.theme = WB.settings.theme;
  }

  /* =========================================================
     열린 문서 (탭3 위쪽 탭들)
     ========================================================= */
  const tabsEl = $('#doc-tabs');
  const views = { page: $('#canvas-scroll'), text: $('#text-editor'), image: $('#image-view'), empty: $('#empty-view') };
  const textEditor = views.text;
  const TEXT_EXT = new Set(['css', 'js', 'mjs', 'json', 'txt', 'md', 'xml', 'svg', 'csv', 'log', 'yml', 'yaml', 'ts']);
  const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'avif']);

  function docBadge(d) {
    if (d.kind === 'page') return '<span class="fb html">&lt;&gt;</span>';
    if (d.kind === 'image') return `<span class="fb img">${icon('image', 14)}</span>`;
    const ext = WB.extOf(d.name);
    return `<span class="fb ${ext}">${ext === 'css' ? '#' : ext === 'js' ? 'JS' : icon('file', 14)}</span>`;
  }

  function renderTabs() {
    tabsEl.innerHTML = '';
    for (const d of S.docs) {
      const t = h('div', {
        class: 'doc-tab' + (d.id === S.activeId ? ' active' : '') + (d.dirty ? ' dirty' : ''),
        title: d.path ? d.path : d.name + ' — 아직 파일로 저장하지 않음 (Ctrl+S)',
      });
      t.innerHTML = `${docBadge(d)}<span class="nm ${d.handle ? '' : 'untitled'}">${esc(d.name)}</span><button class="x" title="닫기">${icon('x', 14)}</button>`;
      t.addEventListener('click', e => {
        if (e.target.closest('.x')) closeDoc(d);
        else activate(d.id);
      });
      t.addEventListener('auxclick', e => { if (e.button === 1) closeDoc(d); });
      tabsEl.append(t);
    }
    document.title = (WB.activeDoc() ? WB.activeDoc().name + ' — ' : '') + '블록 웹 편집기';
  }

  function activate(id) {
    S.activeId = id;
    const d = WB.activeDoc();
    for (const [k, el] of Object.entries(views)) el.hidden = k !== (d ? d.kind : 'empty');
    $('#breadcrumb').hidden = !d || d.kind !== 'page';
    if (d && d.kind === 'text') textEditor.value = d.content;
    if (d && d.kind === 'image') views.image.querySelector('img').src = d.url;
    renderTabs();
    renderTools();
    WB.emit('doc', d);
  }

  function addDoc(doc) {
    // 손대지 않은 빈 새 페이지는 새로 연 파일로 바꿔치기
    const a = WB.activeDoc();
    if (a && a.kind === 'page' && !a.handle && !a.dirty && !a.root.children.length) S.docs.splice(S.docs.indexOf(a), 1, doc);
    else S.docs.push(doc);
    activate(doc.id);
  }

  WB.newPage = () => {
    let n = 1, name = '새 페이지.html';
    while (S.docs.some(d => d.name === name)) name = `새 페이지 ${++n}.html`;
    const doc = WB.newPageDoc({ name, title: name.replace(/\.html$/, '') });
    S.docs.push(doc);
    activate(doc.id);
    return doc;
  };

  function closeDoc(d) {
    if (d.dirty && d.handle && !confirm(`'${d.name}' 에 저장하지 않은 변경 사항이 있어요. 저장하지 않고 닫을까요?`)) return;
    if (d.dirty && !d.handle && d.root?.children.length && !confirm(`'${d.name}' 은(는) 아직 파일로 저장하지 않았어요. 닫으면 내용이 사라져요. 닫을까요?`)) return;
    const i = S.docs.indexOf(d);
    S.docs.splice(i, 1);
    if (d.url) URL.revokeObjectURL(d.url);
    saveDrafts();
    if (S.activeId === d.id) activate(S.docs[Math.min(i, S.docs.length - 1)]?.id || null);
    else renderTabs();
  }
  WB.closeDocsUnder = path => {
    for (const d of [...S.docs]) {
      if (d.path === path || (d.path && d.path.startsWith(path + '/'))) {
        d.dirty = false;
        closeDoc(d);
      }
    }
  };
  WB.relinkDocs = async (oldPath, newPath) => {
    for (const d of S.docs) {
      if (!d.path || !(d.path === oldPath || d.path.startsWith(oldPath + '/'))) continue;
      d.path = newPath + d.path.slice(oldPath.length);
      d.name = d.path.split('/').pop();
      try { d.handle = await WB.explorer.fileHandleAt(d.path); } catch { d.handle = null; }
    }
    renderTabs();
  };

  WB.openFileNode = async node => {
    const open = S.docs.find(d => d.handle && d.path === node.path);
    if (open) return activate(open.id);
    try {
      const file = await node.handle.getFile();
      const ext = WB.extOf(node.name);
      let doc;
      if (ext === 'html' || ext === 'htm') {
        const parsed = WB.parseHTML(await file.text());
        doc = WB.newPageDoc({ name: node.name, handle: node.handle, path: node.path, title: parsed.title || node.name.replace(/\.html?$/i, ''), root: parsed.root, blocks: parsed.blocks });
      } else if (IMAGE_EXT.has(ext)) {
        doc = { id: WB.newDocId(), kind: 'image', name: node.name, handle: node.handle, path: node.path, url: URL.createObjectURL(file), dirty: false };
      } else if (TEXT_EXT.has(ext) || file.type.startsWith('text/') || file.size < 512 * 1024) {
        doc = { id: WB.newDocId(), kind: 'text', name: node.name, handle: node.handle, path: node.path, content: await file.text(), dirty: false };
      } else {
        WB.toast('이 형식의 파일은 열 수 없어요', 'error');
        return;
      }
      addDoc(doc);
    } catch (e) {
      WB.toast('파일을 열지 못했어요: ' + e.message, 'error');
    }
  };

  textEditor.addEventListener('input', () => {
    const d = WB.activeDoc();
    if (!d || d.kind !== 'text') return;
    d.content = textEditor.value;
    if (!d.dirty) { d.dirty = true; renderTabs(); }
  });
  textEditor.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      textEditor.setRangeText('  ', textEditor.selectionStart, textEditor.selectionEnd, 'end');
      textEditor.dispatchEvent(new Event('input'));
    }
  });

  /* =========================================================
     저장
     ========================================================= */
  async function writeFile(handle, content) {
    const w = await handle.createWritable();
    await w.write(content);
    await w.close();
  }

  WB.saveDoc = async (doc = WB.activeDoc(), saveAs = false) => {
    if (!doc || doc.kind === 'image') return false;
    const content = doc.kind === 'page' ? WB.generateHTML(doc) : doc.content;
    try {
      if (!doc.handle || saveAs) {
        if (!window.showSaveFilePicker) {
          WB.download(doc.name, content);
          doc.dirty = false;
          renderTabs();
          WB.toast('다운로드 폴더에 저장했어요', 'ok');
          return true;
        }
        const handle = await window.showSaveFilePicker({
          suggestedName: doc.name,
          startIn: WB.explorer.root || 'documents',
          types: doc.kind === 'page' ? [{ description: 'HTML 파일', accept: { 'text/html': ['.html', '.htm'] } }] : undefined,
        });
        doc.handle = handle;
        doc.name = handle.name;
        doc.path = await WB.explorer.pathOf(handle);
      }
      await writeFile(doc.handle, content);
      doc.dirty = false;
      saveDrafts();
      renderTabs();
      WB.toast(`'${doc.name}' 저장했어요`, 'ok');
      if (doc.path != null) { WB.explorer.refresh(); WB.renderCanvas(); }
      return true;
    } catch (e) {
      if (e.name !== 'AbortError') WB.toast('저장하지 못했어요: ' + e.message, 'error');
      return false;
    }
  };

  /** 그림 파일 넣기: 문서가 열린 폴더 안에 있으면 images/ 로 복사, 아니면 파일 안에 직접 넣음 */
  WB.importAsset = async file => {
    const doc = WB.canvasDoc();
    const dir = doc && doc.handle ? WB.dirPathOf(doc) : null;
    if (dir != null && WB.explorer.root) {
      const src = await WB.explorer.saveAsset(dir, file);
      WB.toast(`'${src}' 로 복사했어요`, 'ok');
      return src;
    }
    if (file.size > 5 * 1024 * 1024) throw new Error('5MB 보다 큰 파일은 먼저 페이지를 폴더에 저장한 뒤 넣어 주세요');
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(r.error);
      r.readAsDataURL(file);
    });
  };

  /* ---------- 저장 안 한 새 페이지는 브라우저에 임시 보관 ---------- */
  let draftTimer;
  function saveDrafts() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      const drafts = S.docs.filter(d => d.kind === 'page' && !d.handle).map(d => ({ name: d.name, title: d.title, root: d.root, blocks: d.blocks }));
      WB.store('wb.drafts', drafts);
    }, 400);
  }

  WB.on('change', doc => {
    if (doc && !doc.handle) saveDrafts();
    const tab = tabsEl.children[S.docs.indexOf(doc)];
    if (tab && !tab.classList.contains('dirty')) renderTabs();
    renderTools();
  });

  /* =========================================================
     탭3 위쪽 도구 (되돌리기 · 기기 크기 · 윤곽선 · 미리보기)
     ========================================================= */
  const toolsEl = $('#doc-tools');
  function renderTools() {
    const doc = WB.canvasDoc();
    const dev = WB.settings.device;
    toolsEl.innerHTML = doc ? `
      <button class="icon-btn" data-tool="undo" title="되돌리기 (Ctrl+Z)" ${doc.undo.length ? '' : 'disabled'}>${icon('undo')}</button>
      <button class="icon-btn" data-tool="redo" title="다시 하기 (Ctrl+Y)" ${doc.redo.length ? '' : 'disabled'}>${icon('redo')}</button>
      <span class="sep"></span>
      <button class="icon-btn ${dev === 'desktop' ? 'on' : ''}" data-tool="desktop" title="컴퓨터 화면">${icon('monitor')}</button>
      <button class="icon-btn ${dev === 'tablet' ? 'on' : ''}" data-tool="tablet" title="태블릿 화면 (768px)">${icon('tablet')}</button>
      <button class="icon-btn ${dev === 'mobile' ? 'on' : ''}" data-tool="mobile" title="휴대폰 화면 (390px)">${icon('phone')}</button>
      <span class="sep"></span>
      <button class="icon-btn ${WB.settings.guides ? 'on' : ''}" data-tool="guides" title="요소 윤곽선 보기">${icon('guides')}</button>
      <button class="icon-btn" data-tool="preview" title="새 창에서 미리보기">${icon('eye')}</button>
      <button class="icon-btn" data-tool="save" title="저장 (Ctrl+S)">${icon('save')}</button>`
      : WB.activeDoc() && WB.activeDoc().kind === 'text'
        ? `<button class="icon-btn" data-tool="save" title="저장 (Ctrl+S)">${icon('save')}</button>` : '';
  }
  toolsEl.addEventListener('click', e => {
    const t = e.target.closest('[data-tool]')?.dataset.tool;
    if (!t) return;
    if (t === 'undo') WB.undo();
    else if (t === 'redo') WB.redo();
    else if (t === 'preview') preview();
    else if (t === 'save') WB.saveDoc();
    else if (t === 'guides') {
      WB.settings.guides = !WB.settings.guides;
      WB.saveSettings();
      WB.renderCanvas();
      renderTools();
    } else {
      WB.settings.device = t;
      WB.saveSettings();
      WB.applyDevice();
      renderTools();
    }
  });

  function preview() {
    const doc = WB.canvasDoc();
    if (!doc) return;
    const url = URL.createObjectURL(new Blob([WB.generateHTML(doc)], { type: 'text/html;charset=utf-8' }));
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  /* =========================================================
     탭2 오른쪽: 설정 · 코드로 변환
     ========================================================= */
  $('#btn-settings').innerHTML = `${icon('settings', 15)} 설정`;
  $('#btn-convert').innerHTML = `${icon('code', 15)} 코드로 변환`;
  $('#btn-convert').onclick = () => showCode();
  $('#btn-settings').onclick = () => showSettings();

  function showCode() {
    const doc = WB.canvasDoc();
    if (!doc) return WB.toast('HTML 페이지를 열었을 때 쓸 수 있어요');
    const code = WB.generateHTML(doc);
    const n = code.split('\n').length;
    const view = h('div', { class: 'code-view' },
      h('pre', { class: 'gutter' }, Array.from({ length: n }, (_, i) => i + 1).join('\n')),
      h('pre', { class: 'code', html: `<code>${WB.highlightHTML(code)}</code>` }));
    WB.modal({
      title: '코드로 변환',
      sub: `${doc.name} · ${n}줄`,
      content: view,
      wide: true,
      bodyClass: 'code',
      note: '캔버스에서 만든 화면이 이 HTML 코드가 돼요.',
      actions: [
        { label: '복사', icon: 'copy', onClick: async (close, b) => {
          try {
            await navigator.clipboard.writeText(code);
            b.innerHTML = icon('copy', 15) + '복사했어요';
          } catch { WB.toast('복사하지 못했어요', 'error'); }
        } },
        { label: '다운로드', icon: 'download', onClick: () => WB.download(doc.name.endsWith('.html') ? doc.name : doc.name + '.html', code) },
        { label: '미리보기', icon: 'eye', onClick: preview },
        { label: doc.handle ? '파일에 저장' : '파일로 저장…', icon: 'save', primary: true, onClick: async close => { if (await WB.saveDoc(doc)) close(); } },
      ],
    });
  }

  function showSettings() {
    const doc = WB.canvasDoc();
    const st = doc ? doc.root.style : {};
    const toHex = v => (/^#[0-9a-f]{6}$/i.test(v || '') ? v : null);
    const FONT_OPTS = [
      ["'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif", '맑은 고딕'], ["'Nanum Gothic', sans-serif", '나눔고딕'],
      ["'Batang', serif", '바탕'], ['Arial, sans-serif', 'Arial'], ['Georgia, serif', 'Georgia'],
    ];
    const curFont = st['font-family'] || '';
    const form = h('div', { class: 'form' });
    form.innerHTML = `
      <h4>페이지 ${doc ? `<span style="color:var(--text-faint);font-weight:400;letter-spacing:0">— ${esc(doc.name)}</span>` : ''}</h4>
      ${doc ? `
      <label class="frow"><span>페이지 제목</span><input type="text" name="title" value="${esc(doc.title)}"></label>
      <div class="frow"><span>배경색</span><span class="inline"><input type="color" name="bg" value="${toHex(st['background-color']) || '#ffffff'}"></span></div>
      <div class="frow"><span>기본 글자색</span><span class="inline"><input type="color" name="color" value="${toHex(st.color) || '#222222'}"></span></div>
      <label class="frow"><span>기본 글꼴</span><select name="font">${FONT_OPTS.map(([v, l]) => `<option value="${esc(v)}" ${v === curFont ? 'selected' : ''}>${l}</option>`).join('')}${curFont && !FONT_OPTS.some(([v]) => v === curFont) ? `<option value="${esc(curFont)}" selected>${esc(curFont)}</option>` : ''}</select></label>
      <label class="frow"><span>페이지 여백</span><input type="text" name="padding" value="${esc(st.padding || '')}" placeholder="예: 24px"></label>
      <label class="frow"><span>내용 최대 너비</span><input type="text" name="maxw" value="${esc(st['max-width'] || '')}" placeholder="비우면 화면 가득 (예: 960px)"></label>
      <p class="hint">내용 최대 너비를 정하면 넓은 화면에서 내용이 가운데에 모여요.</p>`
      : '<p class="hint">HTML 페이지를 열면 페이지 설정을 바꿀 수 있어요.</p>'}
      <hr>
      <h4>편집기</h4>
      <label class="frow"><span>화면 테마</span><select name="theme"><option value="dark">어둡게</option><option value="light">밝게</option></select></label>
      <label class="frow"><span>요소 윤곽선</span><span class="inline"><input type="checkbox" name="guides" ${WB.settings.guides ? 'checked' : ''}> 캔버스에서 요소마다 점선 테두리 보기</span></label>
      <div class="frow"><span>탭 배치</span><span class="inline"><button class="btn small" type="button" data-reset>처음 크기로 되돌리기</button></span></div>
      <hr>
      <h4>단축키</h4>
      <p class="hint" style="line-height:2">
        <kbd>Ctrl</kbd>+<kbd>S</kbd> 저장 · <kbd>Ctrl</kbd>+<kbd>Z</kbd> 되돌리기 · <kbd>Ctrl</kbd>+<kbd>Y</kbd> 다시 하기 · <kbd>Delete</kbd> 삭제 ·
        <kbd>Ctrl</kbd>+<kbd>D</kbd> 복제 · <kbd>Ctrl</kbd>+<kbd>C</kbd>/<kbd>V</kbd> 요소 복사·붙여넣기 · <kbd>Alt</kbd>+<kbd>↑↓</kbd> 순서 바꾸기 ·
        <kbd>Enter</kbd> 글자 고치기 · <kbd>Esc</kbd> 바깥 상자 선택 · <kbd>Ctrl</kbd>+<kbd>B</kbd> 탐색기 접기 · <kbd>Ctrl</kbd>+<kbd>J</kbd> 태그 패널 접기
      </p>`;
    form.querySelector('[name=theme]').value = WB.settings.theme;
    form.querySelector('[name=theme]').onchange = e => { WB.settings.theme = e.target.value; WB.saveSettings(); applyTheme(); };
    form.querySelector('[name=guides]').onchange = e => { WB.settings.guides = e.target.checked; WB.saveSettings(); WB.renderCanvas(); renderTools(); };
    form.querySelector('[data-reset]').onclick = () => WB.resetLayout();

    WB.modal({
      title: '설정',
      content: form,
      actions: doc ? [{
        label: '페이지에 적용', primary: true, onClick: close => {
          const v = n => form.querySelector(`[name=${n}]`).value.trim();
          const norm = s => (/^\d+(\.\d+)?$/.test(s) ? s + 'px' : s);
          const maxw = norm(v('maxw'));
          WB.commit(d => {
            d.title = v('title') || d.title;
            const s = d.root.style;
            s['background-color'] = v('bg');
            s.color = v('color');
            s['font-family'] = v('font');
            if (v('padding')) s.padding = norm(v('padding')); else delete s.padding;
            if (maxw) { s['max-width'] = maxw; s.margin = '0 auto'; } else { delete s['max-width']; s.margin = '0'; }
          });
          close();
        },
      }] : [{ label: '닫기', onClick: close => close() }],
    });
  }

  /* =========================================================
     빈 화면 (열린 문서가 없을 때)
     ========================================================= */
  views.empty.innerHTML = `
    <h2>블록 웹 편집기</h2>
    <p style="margin:0">코딩 없이 끌어다 놓아서 웹페이지를 만들어요.</p>
    <div class="row">
      <button class="btn primary" data-empty="new">${icon('plus', 15)} 새 페이지</button>
      <button class="btn" data-empty="open">${icon('folderOpen', 15)} 폴더 열기</button>
    </div>
    <ul>
      <li>아래 <b>HTML 태그</b>에서 요소를 클릭하거나 가운데로 끌어오세요</li>
      <li>요소를 클릭하면 위쪽 <b>설정 줄</b>에서 색·크기·모양을 바꿀 수 있어요</li>
      <li><b>코드로 변환</b>을 누르면 완성된 HTML 코드가 나와요</li>
    </ul>`;
  views.empty.addEventListener('click', e => {
    const a = e.target.closest('[data-empty]')?.dataset.empty;
    if (a === 'new') WB.newPage();
    if (a === 'open') WB.explorer.supported ? WB.explorer.openFolder() : WB.toast('Chrome 이나 Edge 에서만 폴더를 열 수 있어요', 'error');
  });

  /* =========================================================
     단축키
     ========================================================= */
  let clipboard = null;
  const isTyping = e => {
    const t = e.composedPath()[0];
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  };
  addEventListener('keydown', e => {
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (mod && key === 's') { e.preventDefault(); WB.saveDoc(WB.activeDoc(), e.shiftKey); return; }
    if (mod && key === 'b') { e.preventDefault(); WB.togglePanel('w1'); return; }
    if (mod && key === 'j') { e.preventDefault(); WB.togglePanel('h4'); return; }
    if (isTyping(e) || !WB.canvasDoc() || $('.modal-overlay') || e.target.closest?.('#tab1')) return;

    const id = WB.selectedId();
    if (mod && key === 'z' && !e.shiftKey) { e.preventDefault(); WB.undo(); }
    else if (mod && (key === 'y' || (key === 'z' && e.shiftKey))) { e.preventDefault(); WB.redo(); }
    else if (!id || id === 'root') {
      if (e.key === 'Escape') WB.select(null);
      if (mod && key === 'v' && clipboard) { e.preventDefault(); pasteNode(); }
    }
    else if (e.key.startsWith('Arrow') && !e.altKey && WB.selectedNode()?.style.position === 'absolute') {
      // 자유 배치 요소는 화살표로 1px (Shift: 10px) 씩 옮김
      e.preventDefault();
      const st = WB.selectedNode().style, step = e.shiftKey ? 10 : 1;
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      WB.setStyles(id, { left: Math.max(0, (parseFloat(st.left) || 0) + dx) + 'px', top: Math.max(0, (parseFloat(st.top) || 0) + dy) + 'px' }, `nudge:${id}`);
    }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); WB.removeNode(id); }
    else if (mod && key === 'd') { e.preventDefault(); WB.duplicateNode(id); }
    else if (mod && key === 'c') { clipboard = JSON.parse(JSON.stringify(WB.selectedNode())); WB.toast('요소를 복사했어요'); }
    else if (mod && key === 'x') { clipboard = JSON.parse(JSON.stringify(WB.selectedNode())); WB.removeNode(id); }
    else if (mod && key === 'v' && clipboard) { e.preventDefault(); pasteNode(); }
    else if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); WB.moveSibling(id, -1); }
    else if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); WB.moveSibling(id, 1); }
    else if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); WB.startEditSelected(); }
    else if (e.key === 'Escape') WB.selectParent();
  });
  function pasteNode() {
    const doc = WB.canvasDoc();
    const node = WB.cloneNode(clipboard);
    const sel = WB.selectedNode();
    let parentId = 'root', index;
    if (sel && sel.id !== 'root') {
      const f = WB.find(doc.root, sel.id);
      if (WB.kindOf(sel.tag) === 'container') parentId = sel.id;
      else { parentId = f.parent.id; index = f.index + 1; }
    }
    WB.insertNode(node, parentId, index);
    WB.select(node.id);
  }

  addEventListener('beforeunload', e => {
    if (S.docs.some(d => d.dirty && d.handle)) e.preventDefault();
  });

  /* =========================================================
     시작
     ========================================================= */
  applyTheme();
  applyLayout();
  WB.applyDevice();

  const drafts = WB.load('wb.drafts', []);
  if (Array.isArray(drafts) && drafts.length) {
    for (const dr of drafts) {
      const doc = WB.newPageDoc({ name: dr.name, title: dr.title, root: WB.reId(dr.root), blocks: WB.reIdBlocks(dr.blocks) });
      doc.dirty = dr.root.children.length > 0;
      S.docs.push(doc);
    }
    activate(S.docs[0].id);
  } else {
    // 처음 열면 간단한 예시로 시작
    const doc = WB.newPage();
    const N = WB.makeNode;
    doc.root.children.push(
      N('h1', { text: '나의 첫 웹페이지' }),
      N('p', { text: '글자를 두 번 클릭하면 고칠 수 있어요. 아래 「HTML 태그」에서 요소를 끌어다 놓아 보세요.' }),
      WB.paletteItem('button').make(),
    );
    activate(doc.id);
  }
})();
