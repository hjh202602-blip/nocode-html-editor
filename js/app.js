'use strict';
/* 전체 연결: 탭 크기 조절, 열린 문서(탭3 위쪽 탭), 열기·저장, 코드로 변환, 설정, 단축키 */
(() => {
  const { $, $$, h, esc, icon } = WB;
  const app = $('#app');
  const S = WB.state;

  /* =========================================================
     탭 크기 조절 (VS Code 처럼 경계선을 끌어서 조절, 두 번 클릭하면 접기/펴기)
     ========================================================= */
  /* 배치: 1 프로젝트(w1) | 2 작업 공간 | 3 설정 + 4 도구(w5, HTML · CSS · JS) */
  const LAYOUT_DEFAULT = { w1: 240, w5: 400 };
  const LIMITS = { w1: [140, 600], w5: [280, 1200] };
  let layout = { ...LAYOUT_DEFAULT, ...WB.load('wb.layout', {}) };
  delete layout.h2;
  delete layout.h4;
  const before = WB.load('wb.layout.prev', {});
  if (WB.load('wb.layout.ver', 0) < 3) {
    // 배치를 바꿔서 오른쪽 도구 탭에 디자인 설정까지 들어감 → 예전 폭이 좁으면 넓혀 줌
    if (layout.w5 > 0) layout.w5 = Math.max(layout.w5, LAYOUT_DEFAULT.w5);
    WB.store('wb.layout.ver', 3);
  }

  function applyLayout() {
    for (const k of Object.keys(LAYOUT_DEFAULT)) app.style.setProperty('--' + k, layout[k] + 'px');
    // 접을 때 안의 내용은 펼친 폭 그대로 두어서 옆으로 밀려 들어가는 것처럼 보이게
    app.style.setProperty('--w1o', (layout.w1 || before.w1 || LAYOUT_DEFAULT.w1) + 'px');
    app.style.setProperty('--w5o', (layout.w5 || before.w5 || LAYOUT_DEFAULT.w5) + 'px');
    app.classList.toggle('no-w1', !layout.w1);
    app.classList.toggle('no-w5', !layout.w5);
    $('#btn-side1')?.classList.toggle('on', !!layout.w1);
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
  /** 블록 작업할 때 탭5 를 크게 (다시 누르면 원래대로) */
  WB.toggleBlockMax = () => {
    const big = Math.max(640, innerWidth - layout.w1 - 360);
    if (layout.w5 < big - 20) { before.w5max = layout.w5; layout.w5 = Math.min(big, innerWidth - layout.w1 - 220); }
    else layout.w5 = before.w5max || LAYOUT_DEFAULT.w5;
    applyLayout();
    saveLayout();
    return layout.w5 >= big - 20;
  };
  WB.togglePanel = k => {
    if (layout[k] > 0) { before[k] = layout[k]; layout[k] = 0; }
    else layout[k] = before[k] || LAYOUT_DEFAULT[k];
    app.classList.add('sliding'); // 접고 펼 때만 부드럽게 (경계선을 끌 때는 바로)
    clearTimeout(WB._slideT);
    WB._slideT = setTimeout(() => { app.classList.remove('sliding'); WB.emit('layout'); }, 260);
    applyLayout();
    saveLayout();
  };

  /* 4번 탭: HTML 태그 · CSS 디자인 · JS 동작 중 하나 */
  const TOOL_MODES = ['html', 'css', 'js'];
  WB.setTool = (m, start) => {
    if (!TOOL_MODES.includes(m)) m = 'html';
    WB.settings.tool = m;
    WB.saveSettings();
    $$('#tools [data-tm]').forEach(b => b.classList.toggle('on', b.dataset.tm === m));
    $$('#tools [data-pane]').forEach(p => (p.hidden = p.dataset.pane !== m));
    if (!layout.w5 && !start) WB.togglePanel('w5'); // 접혀 있으면 펼침
    WB.emit('tool', m);
  };
  $('#tools .tool-mode').addEventListener('click', e => {
    const b = e.target.closest('[data-tm]');
    if (b) WB.setTool(b.dataset.tm);
  });
  $('#btn-side1').innerHTML = icon('folder');
  $('#btn-side1').onclick = () => WB.togglePanel('w1');

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
      const sign = k === 'w5' ? -1 : 1;
      const [min, max] = LIMITS[k];
      const move = ev => {
        let v = startVal + sign * ((vertical ? ev.clientX : ev.clientY) - start);
        // 가운데 작업 공간은 최소 크기를 남김
        const room = innerWidth - 320 - (k === 'w1' ? layout.w5 : layout.w1);
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
  /** 프로젝트 · 폴더를 바꿀 때: 파일에서 연 탭을 모두 닫음. 저장 안 한 것을 닫지 않겠다고 하면 false */
  WB.closeFileDocs = () => {
    for (const d of S.docs.filter(x => x.handle)) closeDoc(d);
    return !S.docs.some(x => x.handle);
  };
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
        const original = await file.text();
        const dir = node.path.split('/').slice(0, -1).join('/');
        const { html, inlined } = await inlineLocalFiles(original, dir);
        const parsed = WB.parseHTML(html);
        doc = WB.newPageDoc({ name: node.name, handle: node.handle, path: node.path, title: parsed.title || node.name.replace(/\.html?$/i, ''), root: parsed.root, blocks: parsed.blocks, extra: parsed.extra, formats: parsed.formats, foreign: parsed.foreign, original });
        if (parsed.foreign) importNotice(node.name, parsed.report, inlined);
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

  /** 다른 곳에서 만든 페이지: 같은 프로젝트에 있는 CSS · JS 파일(<link> · <script src>)을 페이지 안으로 읽어 들임
      (CSS 안의 url(그림) 주소는 페이지 위치 기준으로 고침). 못 읽은 것은 그대로 남아서 보존됨 */
  async function inlineLocalFiles(html, dir) {
    const isLocal = u => u && !/^([a-z]+:|\/\/|#)/i.test(u);
    if (!WB.explorer.root || !/<link[^>]+stylesheet|<script[^>]+src=/i.test(html)) return { html, inlined: [] };
    const d = new DOMParser().parseFromString(html, 'text/html');
    const inlined = [];
    for (const l of d.querySelectorAll('link[rel~="stylesheet"][href]')) {
      const href = l.getAttribute('href');
      if (!isLocal(href)) continue;
      try {
        const path = joinPath(dir, href.split(/[?#]/)[0]);
        const cssDir = path.split('/').slice(0, -1).join('/');
        const css = (await (await WB.explorer.fileAt(path)).text())
          .replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => (isLocal(u) && !u.startsWith('/') ? `url("${relPath(dir, joinPath(cssDir, u))}")` : m));
        const st = d.createElement('style');
        st.textContent = css;
        l.replaceWith(st);
        inlined.push(href);
      } catch { /* 없는 파일은 링크 그대로 */ }
    }
    for (const s of d.querySelectorAll('script[src]')) {
      const src = s.getAttribute('src');
      if (!isLocal(src) || (s.type && s.type !== 'text/javascript')) continue;
      try {
        s.textContent = await (await WB.explorer.fileAt(joinPath(dir, src.split(/[?#]/)[0]))).text();
        s.removeAttribute('src');
        inlined.push(src);
      } catch { /* 없는 파일은 그대로 */ }
    }
    return { html: inlined.length ? '<!DOCTYPE html>\n' + d.documentElement.outerHTML : html, inlined };
  }
  /** fromDir 폴더에서 본 toPath 의 상대 주소 */
  function relPath(fromDir, toPath) {
    const a = fromDir.split('/').filter(Boolean), b = toPath.split('/').filter(Boolean);
    let i = 0;
    while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
    return '../'.repeat(a.length - i) + b.slice(i).join('/');
  }
  /** 가져온 페이지를 열 때: 무엇을 어떻게 바꿨는지 알려 줌 */
  function importNotice(name, r, inlined) {
    const lines = [
      `다른 곳에서 만든 페이지라 편집기에 맞게 바꿨어요.`,
      r.inlined ? `· CSS 규칙 ${r.inlined}개를 요소 스타일로 옮겼어요` : '',
      r.kept ? `· :hover · 다른 화면 크기 같은 규칙 ${r.kept}개는 「가져온 CSS」로 그대로 보존해요 (설정 → 페이지)` : '',
      r.rich ? `· 링크 · 굵게 · 그림을 담은 글자 요소 ${r.rich}개는 상자로 바꿔 안의 요소를 살렸어요` : '',
      r.scripts ? `· 스크립트 ${r.scripts}개는 「JS 동작」의 「코드」로 옮겼어요` : '',
      inlined.length ? `· 같은 프로젝트의 ${inlined.join(', ')} 을(를) 페이지 안으로 읽어 들였어요` : '',
      `처음 저장할 때 원본을 '${name.replace(/\.html?$/i, '')}.원본.html' 로 남겨 둘게요.`,
    ].filter(Boolean);
    WB.toast(lines.join('\n'), 'ok', 9000);
  }

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
      if (!doc.handle && !saveAs) {
        // 아직 파일이 아니면 지금 프로젝트(없으면 최근 프로젝트 · 새 프로젝트)에 이름을 정해 저장
        const root = await WB.explorer.ensureRoot();
        let name = await WB.explorer.promptName(`'${root.name}' 에 저장할 이름`, doc.name, '예: index.html');
        if (!name) return false;
        if (doc.kind === 'page' && !/\.html?$/i.test(name)) name += '.html';
        if (/[\\/:*?"<>|]/.test(name)) { WB.toast('이름에 \\ / : * ? " < > | 는 쓸 수 없어요', 'error'); return false; }
        try {
          await root.getFileHandle(name);
          if (!confirm(`'${name}' 이(가) 이미 있어요. 덮어쓸까요?`)) return false;
        } catch { /* 없으면 새로 만듦 */ }
        doc.handle = await root.getFileHandle(name, { create: true });
        doc.name = name;
        doc.path = name;
      } else if (saveAs) {
        // 다른 이름으로 저장 (Ctrl+Shift+S): 내 컴퓨터에 파일로
        if (!window.showSaveFilePicker) {
          WB.download(doc.name, content);
          doc.dirty = false;
          renderTabs();
          WB.toast('다운로드 폴더에 저장했어요', 'ok');
          return true;
        }
        const handle = await window.showSaveFilePicker({
          suggestedName: doc.name,
          startIn: (!WB.explorer.isVirtual() && WB.explorer.root) || 'documents',
          types: doc.kind === 'page' ? [{ description: 'HTML 파일', accept: { 'text/html': ['.html', '.htm'] } }] : undefined,
        });
        doc.handle = handle;
        doc.name = handle.name;
        doc.path = await WB.explorer.pathOf(handle);
      }
      // 다른 곳에서 만든 페이지는 처음 덮어쓰기 전에 원본을 '이름.원본.html' 로 남김
      let backup = '';
      if (doc.foreign && doc.original != null && doc.path != null && WB.explorer.root) {
        backup = doc.path.replace(/\.html?$/i, '') + '.원본.html';
        let exists = true;
        try { await WB.explorer.fileAt(backup); } catch { exists = false; }
        if (!exists) await WB.projects.writePath(WB.explorer.root, backup, new Blob([doc.original], { type: 'text/html' }));
        else backup = '';
        doc.foreign = false;
      }
      await writeFile(doc.handle, content);
      doc.dirty = false;
      saveDrafts();
      renderTabs();
      WB.toast(`'${doc.name}' 저장했어요` + (backup ? ` (원본은 '${backup.split('/').pop()}' 로 남겨 두었어요)` : ''), 'ok', backup ? 5000 : 2400);
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
    if (file.size > 5 * 1024 * 1024) throw new Error('5MB 보다 큰 파일은 먼저 페이지를 프로젝트에 저장(Ctrl+S)한 뒤 넣어 주세요');
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
      const drafts = S.docs.filter(d => d.kind === 'page' && !d.handle).map(d => ({ name: d.name, title: d.title, root: d.root, blocks: d.blocks, extra: d.extra, formats: d.formats }));
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
      <button class="icon-btn ${dev === 'wide' ? 'on' : ''}" data-tool="wide" title="넓은 PC 화면 (1280px 고정) — 실제 사이트처럼 보기">${icon('wide')}</button>
      <button class="icon-btn ${dev === 'desktop' ? 'on' : ''}" data-tool="desktop" title="작업 공간 폭에 맞추기">${icon('monitor')}</button>
      <button class="icon-btn ${dev === 'tablet' ? 'on' : ''}" data-tool="tablet" title="태블릿 화면 (768px)">${icon('tablet')}</button>
      <button class="icon-btn ${dev === 'mobile' ? 'on' : ''}" data-tool="mobile" title="휴대폰 화면 (390px) — 여기서 고친 스타일은 휴대폰에서만 적용돼요">${icon('phone')}</button>
      <span class="sep"></span>
      <button class="icon-btn" data-tool="zoomOut" title="작게 보기 (Ctrl + 휠)">−</button>
      <button class="icon-btn zoom-val" data-tool="zoomFit" title="눌러서 작업 공간 폭에 맞추기 · 두 번 누르면 100%">${Math.round((WB.settings.zoom || 1) * 100)}%</button>
      <button class="icon-btn" data-tool="zoomIn" title="크게 보기 (Ctrl + 휠)">+</button>
      <span class="sep"></span>
      <button class="icon-btn ${WB.settings.guides ? 'on' : ''}" data-tool="guides" title="요소 윤곽선 보기">${icon('guides')}</button>
      <button class="icon-btn ${WB.settings.rulers ? 'on' : ''}" data-tool="rulers" title="눈금자 · 여백 보기 (고른 요소의 바깥 여백은 주황, 안쪽 여백은 초록)">${icon('ruler')}</button>
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
    else if (t === 'zoomIn' || t === 'zoomOut') WB.setZoom((WB.settings.zoom || 1) * (t === 'zoomIn' ? 1.25 : 0.8));
    else if (t === 'zoomFit') WB.setZoom(e.detail > 1 ? 1 : 'fit'); // 한 번: 폭에 맞추기 · 두 번: 100%
    else if (t === 'rulers') {
      WB.settings.rulers = !WB.settings.rulers;
      WB.saveSettings();
      WB.emit('rulers');
      renderTools();
    } else if (t === 'guides') {
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

  WB.on('zoom', renderTools);
  /* 색 고르기 칸에 페이지 색 팔레트를 추천으로 (<datalist id="wb-palette">) */
  const paletteList = h('datalist', { id: 'wb-palette' });
  document.body.append(paletteList);
  const renderPaletteList = () => paletteList.replaceChildren(...(WB.canvasDoc()?.extra?.vars || []).filter(v => /^#[0-9a-f]{6}$/i.test(v.value)).map(v => h('option', { value: v.value })));
  WB.on('doc', renderPaletteList);

  WB.preview = preview;
  async function preview() {
    const doc = WB.canvasDoc();
    if (!doc) return;
    const win = window.open('', '_blank'); // 팝업 차단을 피하려고 창부터 엶
    const made = [];
    const html = await withProjectFiles(WB.generateHTML(doc), WB.dirPathOf(doc), new Map(), 0, made);
    const url = blobUrl(html, 'text/html;charset=utf-8', made);
    if (win) win.location = url;
    else window.open(url, '_blank');
    setTimeout(() => made.forEach(u => URL.revokeObjectURL(u)), 10 * 60000);
  }
  const blobUrl = (data, type, made) => {
    const u = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }));
    made.push(u);
    return u;
  };
  function joinPath(dir, rel) {
    const parts = rel.startsWith('/') ? [] : dir.split('/').filter(Boolean);
    for (const seg of decodeURI(rel).split('/')) {
      if (!seg || seg === '.') continue;
      if (seg === '..') parts.pop();
      else parts.push(seg);
    }
    return parts.join('/');
  }
  /** 미리보기 창에는 프로젝트 파일 주소가 없어서: 그림 · 다른 페이지 링크를 임시 주소(blob:)로 바꿈 (페이지는 두 단계까지) */
  async function withProjectFiles(html, dir, pages, depth, made) {
    if (dir == null || !WB.explorer.root) return html;
    const refs = new Set();
    // src="…", href="…", 블록의 location.href = "…", CSS url("…")
    for (const m of html.matchAll(/(?:src|href)\s*=\s*"([^"]+)"|url\("([^"]+)"\)/g)) {
      const r = m[1] || m[2];
      if (!/^([a-z]+:|\/\/|#)/i.test(r)) refs.add(r);
    }
    for (const ref of refs) {
      const path = joinPath(dir, ref.split(/[?#]/)[0]);
      let url = null;
      try {
        if (/\.html?$/i.test(path)) {
          if (depth >= 2 || pages.get(path) === null) continue; // 너무 깊거나 서로 가리키는 페이지는 그대로
          if (!pages.has(path)) {
            pages.set(path, null);
            const text = await (await WB.explorer.fileAt(path)).text();
            pages.set(path, blobUrl(await withProjectFiles(text, path.split('/').slice(0, -1).join('/'), pages, depth + 1, made), 'text/html;charset=utf-8', made));
          }
          url = pages.get(path);
        } else url = blobUrl(await WB.explorer.fileAt(path), '', made);
      } catch { continue; } // 없는 파일은 그대로
      if (url) html = html.split(`"${ref}"`).join(`"${url}"`);
    }
    return html;
  }

  /* =========================================================
     3: 설정 · 코드로 변환 · 테마
     ========================================================= */
  $('#btn-settings').innerHTML = `${icon('settings', 14)}<span>설정</span>`;
  $('#btn-settings').title = '설정 (페이지 · 편집기 · 단축키)';
  $('#btn-convert').innerHTML = `${icon('code', 14)}<span>코드로 변환</span>`;
  $('#btn-theme').innerHTML = '◐';
  $('#btn-theme').onclick = () => {
    WB.settings.theme = WB.settings.theme === 'light' ? 'dark' : 'light';
    WB.saveSettings();
    applyTheme();
  };
  $('#btn-convert').title = '코드로 변환 — 만든 화면을 HTML 코드로 보기';
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
      <p class="hint">내용 최대 너비를 정하면 넓은 화면에서 내용이 가운데에 모여요.</p>
      <label class="frow top"><span>가져온 CSS</span><textarea name="extracss" rows="6" spellcheck="false" placeholder="예: .btn:hover { opacity: .8; }">${esc([doc.extra?.cssTop, doc.extra?.css].filter(Boolean).join('\n'))}</textarea></label>
      <p class="hint">다른 곳에서 가져온 페이지의 :hover · 다른 화면 크기(@media) · 애니메이션처럼 요소 스타일로 바꿀 수 없는 CSS 가 여기 그대로 남아 있어요. 직접 써 넣어도 돼요.</p>
      <label class="frow top"><span>색 팔레트<br><button class="btn small" type="button" data-findcolors style="margin-top:6px">페이지에서 찾기</button></span><textarea name="palette" rows="5" spellcheck="false" placeholder="이름: 색 (한 줄에 하나)&#10;blue: #2b2df2&#10;cream: #f2eee6">${esc((doc.extra?.vars || []).map(v => `${v.name}: ${v.value}`).join('\n'))}</textarea></label>
      <p class="hint">코드에서 이 색들은 <code>var(--이름)</code> 으로 바뀌어 한곳(:root)에서 고칠 수 있어요. 여기서 색 값을 바꾸면 그 색을 쓰는 요소가 모두 함께 바뀌어요. 「CSS 디자인」 색 고르기에도 추천으로 나와요.</p>
      <label class="frow"><span>페이지 설명</span><input type="text" name="desc" value="${esc((((doc.extra?.head || []).find(s => /<meta[^>]+name="description"/i.test(s)) || '').match(/content="([^"]*)"/) || [])[1] || '')}" placeholder="검색 결과 · 링크 미리보기에 나오는 한 줄 소개"></label>
      <label class="frow top"><span>&lt;head&gt; 코드</span><textarea name="head" rows="3" spellcheck="false" placeholder='예: &lt;link rel="icon" href="images/favicon.png"&gt;'>${esc((doc.extra?.head || []).filter(s => !/<meta[^>]+name="description"/i.test(s)).join('\n'))}</textarea></label>
      <p class="hint">파비콘 · 공유 미리보기(og:) 같은 태그를 한 줄에 하나씩. 웹 글꼴 링크는 「CSS 디자인」에서 글꼴을 고르면 자동으로 들어가요.</p>`
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
        <kbd>Enter</kbd> 글자 고치기 · <kbd>Esc</kbd> 바깥 상자 선택 · <kbd>Ctrl</kbd>+<kbd>B</kbd> 프로젝트 탭 열기/닫기 · <kbd>Ctrl</kbd>+<kbd>J</kbd> 도구 탭 열기/닫기 ·
        <kbd>Ctrl</kbd>+<kbd>1</kbd> HTML 태그 · <kbd>Ctrl</kbd>+<kbd>2</kbd> CSS 디자인 · <kbd>Ctrl</kbd>+<kbd>3</kbd> JS 동작 (<kbd>Alt</kbd>+<kbd>1</kbd>~<kbd>3</kbd> 도 같아요)
      </p>`;
    form.querySelector('[name=theme]').value = WB.settings.theme;
    form.querySelector('[name=theme]').onchange = e => { WB.settings.theme = e.target.value; WB.saveSettings(); applyTheme(); };
    form.querySelector('[name=guides]').onchange = e => { WB.settings.guides = e.target.checked; WB.saveSettings(); WB.renderCanvas(); renderTools(); };
    form.querySelector('[data-reset]').onclick = () => WB.resetLayout();
    // 색 팔레트 자동으로: 페이지에서 세 번 이상 쓰인 색을 많이 쓴 순서로
    form.querySelector('[data-findcolors]')?.addEventListener('click', () => {
      const count = new Map();
      WB.walk(doc.root, n => {
        for (const s of [n.style, n.styleTablet, n.styleMobile, n.styleHover]) for (const v of Object.values(s || {}))
          for (const c of String(v).match(/#[0-9a-f]{6}\b/gi) || []) count.set(c.toLowerCase(), (count.get(c.toLowerCase()) || 0) + 1);
      });
      const ta = form.querySelector('[name=palette]');
      const have = new Set(ta.value.split('\n').map(l => l.split(':')[1]?.trim().toLowerCase()).filter(Boolean));
      const add = [...count].filter(([c, n]) => n >= 3 && !have.has(c)).sort((a, b) => b[1] - a[1]).slice(0, 10);
      ta.value = [ta.value.trim(), ...add.map(([c], i) => `color-${have.size + i + 1}: ${c}`)].filter(Boolean).join('\n');
      if (!add.length) WB.toast('세 번 이상 쓰인 새 색이 없어요');
    });

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
            // @import 같은 문장은 맨 앞으로
            const all = form.querySelector('[name=extracss]').value.trim().split('\n');
            const isTop = l => /^\s*@(import|charset|namespace)\b/i.test(l);
            d.extra = { ...(d.extra || WB.emptyExtra()), cssTop: all.filter(isTop).join('\n').trim(), css: all.filter(l => !isTop(l)).join('\n').trim() };
            // 색 팔레트: 값이 바뀐 색은 그 색을 쓰던 요소도 모두 새 색으로
            const oldVars = new Map((d.extra.vars || []).map(x => [x.name, x.value]));
            const vars = form.querySelector('[name=palette]').value.split('\n').map(l => l.match(/^\s*([a-z][\w-]*)\s*:\s*(.+?)\s*;?\s*$/i)).filter(Boolean).map(m => ({ name: m[1], value: m[2] }));
            for (const x of vars) {
              const old = oldVars.get(x.name);
              if (!old || old.toLowerCase() === x.value.toLowerCase()) continue;
              const re = new RegExp(old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
              WB.walk(d.root, n => {
                for (const s of [n.style, n.styleTablet, n.styleMobile, n.styleHover]) if (s) for (const k of Object.keys(s)) s[k] = String(s[k]).replace(re, x.value);
              });
            }
            d.extra.vars = vars;
            // <head>: 설명 + 직접 쓴 줄들
            const desc = v('desc');
            d.extra.head = [
              ...(desc ? [`<meta name="description" content="${desc.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">`] : []),
              ...form.querySelector('[name=head]').value.split('\n').map(s => s.trim()).filter(Boolean),
            ];
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
      <button class="btn" data-empty="open">${icon('box', 15)} 프로젝트 열기</button>
    </div>
    <ul>
      <li>아래 <b>HTML 태그</b>에서 요소를 클릭하거나 가운데로 끌어오세요</li>
      <li>요소를 클릭하면 위쪽 <b>설정 줄</b>에서 색·크기·모양을 바꿀 수 있어요</li>
      <li><b>코드로 변환</b>을 누르면 완성된 HTML 코드가 나와요</li>
    </ul>`;
  views.empty.addEventListener('click', e => {
    const a = e.target.closest('[data-empty]')?.dataset.empty;
    if (a === 'new') WB.newPage();
    if (a === 'open') {
      // 탭1 을 펼치고 프로젝트 목록을 보여 줌
      if (!WB.explorer.root) WB.explorer.showProjects();
      document.querySelector('#tab1 .ex-proj, #tab1 .btn')?.focus();
      WB.toast('왼쪽 「프로젝트」에서 프로젝트를 고르거나 새로 만드세요');
    }
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
    if (mod && key === 'j') { e.preventDefault(); WB.togglePanel('w5'); return; }
    // 4번 탭 모드: Ctrl+1 · 2 · 3 (브라우저가 가로채는 환경을 위해 Alt+1 · 2 · 3 도)
    const digit = /^Digit([123])$/.exec(e.code)?.[1];
    if (digit && (mod || e.altKey) && !e.shiftKey) { e.preventDefault(); WB.setTool(TOOL_MODES[digit - 1]); return; }
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
      // 오른쪽 · 아래 기준이면 거꾸로 셈
      const hx = st.right && !st.left ? 'right' : 'left', vy = st.bottom && !st.top ? 'bottom' : 'top';
      const mx = hx === 'right' ? -dx : dx, my = vy === 'bottom' ? -dy : dy;
      WB.setStyles(id, { [hx]: Math.max(0, (parseFloat(st[hx]) || 0) + mx) + 'px', [vy]: Math.max(0, (parseFloat(st[vy]) || 0) + my) + 'px' }, `nudge:${id}`);
    }
    else if (mod && e.shiftKey && key === 'c') { e.preventDefault(); WB.copyStyle(); }
    else if (mod && e.shiftKey && key === 'v') { e.preventDefault(); WB.pasteStyle(); }
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
  /* 스타일 복사 · 붙여넣기 (위치 정보는 빼고) */
  let styleClip = null;
  const NO_COPY = new Set(['position', 'left', 'top', 'right', 'bottom']);
  WB.copyStyle = () => {
    const n = WB.selectedNode();
    if (!n) return;
    styleClip = Object.fromEntries(Object.entries(WB.styleOf(n)).filter(([k]) => !NO_COPY.has(k)));
    WB.toast('스타일을 복사했어요 — 다른 요소를 고르고 붙여넣기 (Ctrl+Shift+V)');
  };
  WB.pasteStyle = () => {
    const id = WB.selectedId();
    if (!id || !styleClip) return WB.toast('먼저 스타일을 복사해 주세요 (Ctrl+Shift+C)');
    WB.setStyles(id, styleClip, `paste-style:${Date.now()}`);
    WB.toast('스타일을 붙여넣었어요');
  };

  function pasteNode() {
    const doc = WB.canvasDoc();
    const node = WB.cloneNode(clipboard);
    const sel = WB.selectedNode();
    let parentId = 'root', index;
    if (sel && sel.id !== 'root') {
      const f = WB.find(doc.root, sel.id);
      if (WB.kindOf(sel) === 'container') parentId = sel.id;
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
  WB.setTool(WB.settings.tool, true);
  WB.applyDevice();

  const drafts = WB.load('wb.drafts', []);
  if (Array.isArray(drafts) && drafts.length) {
    for (const dr of drafts) {
      const doc = WB.newPageDoc({ name: dr.name, title: dr.title, root: WB.reId(dr.root), blocks: WB.reIdBlocks(dr.blocks), extra: dr.extra, formats: dr.formats });
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
      N('p', { text: '글자를 두 번 클릭하면 고칠 수 있어요. 오른쪽 「HTML 태그」에서 요소를 끌어다 놓아 보세요.' }),
      WB.paletteItem('button').make(),
    );
    activate(doc.id);
  }
})();
