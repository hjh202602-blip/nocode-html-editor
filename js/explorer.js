'use strict';
/* 탭1 — 프로젝트: 브라우저 안 프로젝트(어느 브라우저나) 또는 내 컴퓨터 폴더(Chrome · Edge)를 열고
   파일·폴더를 만들고, 열고, 이름을 바꾸고, 지움. zip 으로 내보내기 · 가져오기.
   브라우저 프로젝트는 vfs.js 가 폴더 핸들과 같은 모양으로 만들어 주므로 아래 코드는 둘 다 똑같이 다룸 */
(() => {
  const { $, h, esc, icon } = WB;
  const treeEl = $('#ex-tree');
  const rootEl = $('#ex-root');
  const actionsEl = $('#ex-actions');
  const supported = 'showDirectoryPicker' in window;

  /** tree 노드: { name, kind:'file'|'directory', handle, parent, path, children, expanded } */
  const ex = (WB.explorer = { root: null, tree: null, selected: null, supported });
  let savedHandle = null;
  let lastRoot = null; // 마지막으로 연 프로젝트 · 폴더 (목록 화면에서도 기억)

  /* ---------- 마지막 폴더 기억 (IndexedDB) ---------- */
  const idb = () => new Promise((res, rej) => {
    const r = indexedDB.open('wb-editor', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  async function idbGet(key) {
    const db = await idb();
    return new Promise(res => {
      const q = db.transaction('kv').objectStore('kv').get(key);
      q.onsuccess = () => res(q.result);
      q.onerror = () => res(null);
    });
  }
  async function idbSet(key, val) {
    const db = await idb();
    db.transaction('kv', 'readwrite').objectStore('kv').put(val, key);
  }

  /* ---------- 폴더 읽기 ---------- */
  const childPath = (dir, name) => (dir.path ? dir.path + '/' + name : name);
  const mk = (handle, parent) => ({ name: handle.name, kind: handle.kind, handle, parent, path: childPath(parent, handle.name), children: null, expanded: false });
  const sortNodes = list => list.sort((a, b) =>
    a.kind === b.kind ? a.name.localeCompare(b.name, 'ko', { numeric: true }) : a.kind === 'directory' ? -1 : 1);

  async function loadChildren(dir) {
    const list = [];
    for await (const handle of dir.handle.values()) {
      if (handle.name === '.git') continue;
      list.push(mk(handle, dir));
    }
    sortNodes(list);
    if (dir.children) {
      // 펼쳐 두었던 폴더는 계속 펼친 채로
      const old = new Map(dir.children.filter(c => !c.temp).map(c => [c.kind + ':' + c.name, c]));
      for (const c of list) {
        const o = old.get(c.kind + ':' + c.name);
        if (o && o.expanded) {
          c.expanded = true;
          c.children = o.children; // 안쪽 폴더의 펼침 · 선택 상태도 이어받도록
          await loadChildren(c);
        }
        if (ex.selected === o) ex.selected = c;
      }
      list.unshift(...dir.children.filter(c => c.temp)); // 이름 입력 중인 칸은 남겨 둠
    }
    dir.children = list;
  }

  async function openFolder(handle) {
    if (!handle) {
      try {
        handle = await window.showDirectoryPicker({ id: 'wb-root', mode: 'readwrite' });
      } catch (e) {
        if (e.name !== 'AbortError') WB.toast('폴더를 열지 못했어요: ' + e.message, 'error');
        return;
      }
    }
    // 다른 프로젝트 · 폴더로 바꾸면 앞의 것에서 연 파일 탭은 닫음 (저장 안 한 것은 물어봄)
    const prev = ex.root || lastRoot; // 프로젝트 목록을 거쳐 와도 앞의 것과 비교
    if (prev && !(await sameRoot(prev, handle)) && !WB.closeFileDocs()) return;
    ex.root = lastRoot = handle;
    ex.tree = { name: handle.name, kind: 'directory', handle, parent: null, path: '', children: null, expanded: true };
    ex.selected = null;
    await loadChildren(ex.tree);
    render();
    idbSet('root', handle.isVirtual ? { vproject: handle.pid } : handle).catch(() => {});
    WB.emit('folder');
  }
  async function sameRoot(a, b) {
    if (!!a.isVirtual !== !!b.isVirtual) return false;
    try { return await a.isSameEntry(b); } catch { return false; }
  }
  ex.isVirtual = () => !!ex.root?.isVirtual;

  /* ---------- 브라우저 프로젝트 ---------- */
  async function openProject(id) {
    const p = await WB.projects.get(id);
    if (!p) return WB.toast('프로젝트를 찾지 못했어요', 'error');
    await openFolder(WB.projects.root(p));
  }
  /** 이름 묻기 창 → 이름 (취소하면 null) */
  function promptName(title, value = '', placeholder = '') {
    return new Promise(resolve => {
      const input = h('input', { type: 'text', value, placeholder, spellcheck: 'false', style: 'width:100%;height:32px' });
      let finished = false;
      const finish = (close, v) => { if (finished) return; finished = true; close(); resolve(v); };
      const m = WB.modal({
        title,
        content: input,
        actions: [
          { label: '취소', onClick: close => finish(close, null) },
          { label: '확인', primary: true, onClick: close => finish(close, input.value.trim() || null) },
        ],
      });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') finish(m.close, input.value.trim() || null); });
      setTimeout(() => { input.focus(); input.select(); });
    });
  }
  ex.promptName = promptName;
  const firstPage = title => new Blob([WB.generateHTML({
    title,
    root: { ...WB.newRoot(), children: [WB.makeNode('h1', { text: title }), WB.makeNode('p', { text: '글자를 두 번 클릭하면 고칠 수 있어요.' })] },
    blocks: WB.emptyBlocks(),
  })], { type: 'text/html' });
  async function newProject() {
    const name = await promptName('새 프로젝트', '', '예: 우리 가게 홈페이지');
    if (!name) return;
    const p = await WB.projects.create(name, [{ path: 'index.html', blob: firstPage(name) }]);
    await openProject(p.id);
    const node = ex.tree?.children.find(c => c.name === 'index.html');
    if (node) { ex.selected = node; render(); WB.openFileNode(node); }
    WB.toast(`프로젝트 '${name}' 을(를) 만들었어요`, 'ok');
  }
  /** 저장할 곳이 없을 때: 최근 프로젝트를 열거나 새로 만듦 */
  ex.ensureRoot = async () => {
    if (ex.root) return ex.root;
    const list = await WB.projects.list();
    if (list.length) await openProject(list[0].id);
    else await openFolder(WB.projects.root(await WB.projects.create('내 프로젝트')));
    return ex.root;
  };
  async function renameProject() {
    if (!ex.isVirtual()) return;
    const name = await promptName('프로젝트 이름 바꾸기', ex.tree.name);
    if (!name) return;
    await WB.projects.rename(ex.root.pid, name);
    ex.root.name = ex.tree.name = name;
    render();
  }
  async function deleteProject() {
    if (!ex.isVirtual()) return;
    if (!confirm(`프로젝트 '${ex.tree.name}' 과(와) 그 안의 모든 페이지 · 그림을 삭제할까요?\n이 작업은 되돌릴 수 없어요. (먼저 zip 으로 내보내 두면 안전해요)`)) return;
    if (!WB.closeFileDocs()) return;
    await WB.projects.remove(ex.root.pid);
    closeRoot();
    WB.toast('프로젝트를 삭제했어요');
  }
  function closeRoot() {
    ex.root = ex.tree = ex.selected = null;
    idbSet('root', null).catch(() => {});
    render();
  }
  ex.showProjects = closeRoot;

  /* ---------- zip 내보내기 · 가져오기 ---------- */
  async function exportZip() {
    if (!ex.root) return WB.toast('먼저 프로젝트를 열어 주세요');
    for (const d of WB.state.docs) if (d.dirty && d.handle) await WB.saveDoc(d); // 저장 안 한 것부터 저장
    const files = await WB.projects.readAll(ex.root);
    if (!files.length) return WB.toast('내보낼 파일이 없어요');
    WB.download(ex.tree.name + '.zip', await WB.makeZip(files), 'application/zip');
    WB.toast(`파일 ${files.length}개를 zip 으로 내려받았어요`, 'ok');
  }
  function importFiles() {
    const input = $('#file-picker');
    input.accept = '.zip,.html,.htm,.css,.js,image/*';
    input.multiple = true;
    input.value = '';
    input.onchange = async () => {
      const list = [...input.files];
      input.multiple = false;
      if (!list.length) return;
      try {
        const zips = list.filter(f => /\.zip$/i.test(f.name));
        // zip 은 하나하나 새 프로젝트로
        let lastId = null;
        for (const z of zips) lastId = (await WB.projects.create(z.name.replace(/\.zip$/i, ''), await WB.readZip(z))).id;
        // 나머지(페이지 · 그림)는 지금 프로젝트에 (그림은 images/ 안으로)
        const loose = list.filter(f => !/\.zip$/i.test(f.name)).map(f => ({ path: (/^image\//.test(f.type) ? 'images/' : '') + f.name, blob: f }));
        if (loose.length) {
          const root = ex.root || (lastId ? null : await ex.ensureRoot());
          if (root) {
            for (const f of loose) await WB.projects.writePath(root, f.path, f.blob);
            await ex.refresh();
          } else await WB.projects.create('가져온 파일', loose);
        }
        if (lastId && !loose.length) await openProject(lastId);
        else render();
        WB.toast(`${zips.length ? `zip ${zips.length}개를 프로젝트로, ` : ''}${loose.length ? `파일 ${loose.length}개를 가져왔어요` : '가져왔어요'}`, 'ok');
      } catch (e) {
        WB.toast('가져오지 못했어요: ' + e.message, 'error');
      }
    };
    input.click();
  }
  /** 편집기와 함께 있는 예제를 프로젝트로 (서버에 examples 폴더가 있을 때) */
  const EXAMPLES = ['naver-clone/index.html', 'naver-clone/login.html', 'practice-sites/shop.html', 'practice-sites/dashboard.html', 'practice-sites/portfolio.html', 'practice-sites/sheet.html', 'practice-sites/video-editor.html', 'practice-sites/offcut.html', 'practice-sites/settings.html'];
  async function addExamples() {
    try {
      const files = [];
      for (const path of EXAMPLES) {
        const r = await fetch('examples/' + path);
        if (r.ok) files.push({ path, blob: await r.blob() });
      }
      if (!files.length) throw new Error('예제 파일이 없어요');
      const p = await WB.projects.create('연습 예제', files);
      await openProject(p.id);
      WB.toast(`예제 ${files.length}개로 프로젝트를 만들었어요`, 'ok');
    } catch (e) {
      WB.toast('예제를 불러오지 못했어요: ' + e.message, 'error');
    }
  }

  /** 프로젝트 메뉴 (탭1 위쪽 버튼 · 프로젝트 이름 클릭) */
  function projectMenu(x, y) {
    const items = [
      { label: '프로젝트 목록', icon: 'box', action: closeRoot },
      { label: '새 프로젝트', icon: 'plus', action: newProject },
      'sep',
      { label: 'zip 으로 내보내기 (백업 · 옮기기)', icon: 'download', action: exportZip },
      { label: '가져오기 (zip · 페이지 · 그림)', icon: 'upload', action: importFiles },
    ];
    if (ex.isVirtual()) items.push('sep', { label: '프로젝트 이름 바꾸기', icon: 'edit', action: renameProject }, { label: '프로젝트 삭제', icon: 'trash', danger: true, action: deleteProject });
    if (supported) items.push('sep', { label: '내 컴퓨터 폴더 열기 (Chrome · Edge)', icon: 'folderOpen', action: () => openFolder() });
    WB.menu(x, y, items);
  }
  async function reopen() {
    if (!savedHandle) return;
    try {
      if ((await savedHandle.requestPermission({ mode: 'readwrite' })) === 'granted') await openFolder(savedHandle);
    } catch (e) {
      WB.toast('폴더를 다시 열지 못했어요. [폴더 열기]로 골라 주세요.', 'error');
    }
  }
  ex.openFolder = handle => openFolder(handle);

  ex.refresh = async () => {
    if (!ex.tree) return;
    await loadChildren(ex.tree);
    render();
  };

  /* ---------- 경로로 찾기 ---------- */
  async function dirHandleAt(path, create = false) {
    let d = ex.root;
    for (const seg of path.split('/').filter(Boolean)) d = await d.getDirectoryHandle(seg, { create });
    return d;
  }
  ex.fileHandleAt = async path => {
    const parts = path.split('/');
    const name = parts.pop();
    return (await dirHandleAt(parts.join('/'))).getFileHandle(name);
  };
  ex.fileAt = async path => (await ex.fileHandleAt(path)).getFile();
  /** 파일 핸들이 열린 폴더 안에 있으면 'a/b.html' 같은 경로, 아니면 null */
  ex.pathOf = async handle => {
    if (!ex.root) return null;
    const parts = await ex.root.resolve(handle);
    return parts ? parts.join('/') : null;
  };
  /** 그림 등을 dirPath/images/ 에 복사하고 상대 경로를 돌려줌 */
  ex.saveAsset = async (dirPath, file) => {
    const dir = await dirHandleAt(dirPath);
    const imgDir = await dir.getDirectoryHandle('images', { create: true });
    const dot = file.name.lastIndexOf('.');
    const base = dot > 0 ? file.name.slice(0, dot) : file.name;
    const ext = dot > 0 ? file.name.slice(dot) : '';
    let name = file.name;
    for (let n = 2; await exists(imgDir, name); n++) name = `${base}-${n}${ext}`;
    const fh = await imgDir.getFileHandle(name, { create: true });
    const w = await fh.createWritable();
    await w.write(file);
    await w.close();
    ex.refresh();
    return 'images/' + name;
  };
  async function exists(dirHandle, name) {
    try { await dirHandle.getFileHandle(name); return true; } catch (e) { return e.name === 'TypeMismatchError'; }
  }

  /* ---------- 그리기 ---------- */
  function fileBadge(name) {
    const ext = WB.extOf(name);
    if (ext === 'html' || ext === 'htm') return '<span class="fb html">&lt;&gt;</span>';
    if (ext === 'css') return '<span class="fb css">#</span>';
    if (ext === 'js' || ext === 'mjs') return '<span class="fb js">JS</span>';
    if (ext === 'json') return '<span class="fb json">{}</span>';
    if (ext === 'md') return '<span class="fb md">M↓</span>';
    if (/^(png|jpe?g|gif|svg|webp|bmp|ico|avif)$/.test(ext)) return `<span class="fb img">${icon('image', 14)}</span>`;
    return `<span class="fb">${icon('file', 14)}</span>`;
  }
  const isOpen = node => node.kind === 'file' && WB.state.docs.some(d => d.path === node.path && d.id === WB.state.activeId);

  function render() {
    if (!ex.tree) return renderEmpty();
    const v = ex.isVirtual();
    rootEl.innerHTML = `${icon(v ? 'box' : 'folderOpen', 14)}<span>${esc(ex.tree.name)}</span><small class="ex-where">${v ? '브라우저' : '내 컴퓨터'}</small>${icon('chevron', 12)}`;
    rootEl.title = (v ? '브라우저 안 프로젝트: ' : '내 컴퓨터 폴더: ') + ex.tree.name + ' — 눌러서 프로젝트 메뉴';
    treeEl.replaceChildren(...rows(ex.tree, 0));
    if (!ex.tree.children.length) treeEl.append(h('div', { class: 'ex-empty' }, h('p', { class: 'hint' }, '빈 폴더예요. 위의 [새 파일] 버튼으로 HTML 파일을 만들어 보세요.')));
  }
  function rows(dir, depth) {
    const out = [];
    for (const c of dir.children || []) {
      if (c.temp) { out.push(inputRow(c, depth)); continue; }
      out.push(row(c, depth));
      if (c.kind === 'directory' && c.expanded) out.push(...rows(c, depth + 1));
    }
    return out;
  }
  function row(c, depth) {
    const el = h('div', { class: 'ex-row' + (ex.selected === c ? ' sel' : '') + (isOpen(c) ? ' open' : ''), style: `padding-left:${6 + depth * 14}px`, title: c.path });
    const lead = c.kind === 'directory'
      ? `<span class="tw ${c.expanded ? 'x' : ''}">${icon('chevron', 14)}</span>${icon(c.expanded ? 'folderOpen' : 'folder', 16)}`
      : `<span class="tw"></span>${fileBadge(c.name)}`;
    el.innerHTML = lead;
    if (c.renaming) el.append(nameInput(c.name, c.renaming));
    else el.append(h('span', { class: 'nm' }, c.name));
    el._node = c;
    return el;
  }
  function inputRow(t, depth) {
    const el = h('div', { class: 'ex-row editing', style: `padding-left:${6 + depth * 14}px` });
    el.innerHTML = `<span class="tw"></span>${t.kind === 'directory' ? icon('folder', 16) : fileBadge('a.html')}`;
    el.append(nameInput('', t.done, t.kind === 'file' ? '파일 이름 (예: index.html)' : '폴더 이름'));
    return el;
  }
  /** 이름 입력 칸: Enter 로 확정, Esc 로 취소 */
  function nameInput(value, done, placeholder = '') {
    const input = h('input', { class: 'ex-input', type: 'text', value, placeholder, spellcheck: 'false' });
    let finished = false;
    const finish = v => {
      if (finished) return;
      finished = true;
      done(v);
    };
    input.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter') finish(input.value.trim() || null);
      if (e.key === 'Escape') finish(null);
    });
    input.addEventListener('blur', () => finish(input.value.trim() || null));
    input.addEventListener('click', e => e.stopPropagation());
    requestAnimationFrame(() => {
      input.focus();
      const dot = value.lastIndexOf('.');
      input.setSelectionRange(0, dot > 0 ? dot : value.length);
    });
    return input;
  }

  /** 열린 프로젝트가 없을 때: 내 프로젝트 목록 + 새로 만들기 · 가져오기 · (Chrome · Edge) 내 컴퓨터 폴더 */
  let listSeq = 0;
  async function renderEmpty() {
    const seq = ++listSeq;
    rootEl.innerHTML = '';
    const box = h('div', { class: 'ex-empty' });
    box.append(
      h('button', { class: 'btn primary', onclick: newProject, html: icon('plus', 15) + ' 새 프로젝트' }),
      h('div', { class: 'ex-two' },
        h('button', { class: 'btn', onclick: importFiles, title: 'zip 은 새 프로젝트로, 페이지 · 그림은 지금 프로젝트로', html: icon('upload', 14) + ' 가져오기' }),
        h('button', { class: 'btn', onclick: addExamples, title: '네이버 · 쇼핑몰 · 대시보드 · 포트폴리오 · 스프레드시트 · 영상 편집 예제', html: icon('file', 14) + ' 예제' })),
      h('p', { class: 'ex-sec' }, '내 프로젝트'));
    const listEl = h('div', { class: 'ex-projects' }, h('p', { class: 'hint' }, '불러오는 중…'));
    box.append(listEl);
    if (supported) {
      box.append(h('p', { class: 'ex-sec' }, '내 컴퓨터 폴더 (Chrome · Edge)'));
      box.append(h('button', { class: 'btn', onclick: () => openFolder(), html: icon('folderOpen', 15) + ' 폴더 열기' }));
      if (savedHandle) box.append(h('button', { class: 'btn', onclick: reopen, html: `최근 폴더 다시 열기<small>${esc(savedHandle.name)}</small>` }));
    }
    box.append(h('p', { class: 'hint' }, '프로젝트는 이 브라우저 안에 저장돼요. 다른 컴퓨터로 옮기거나 백업하려면 프로젝트 메뉴에서 zip 으로 내보내세요.'));
    treeEl.replaceChildren(box);
    let list = [];
    try { list = await WB.projects.list(); } catch (e) { listEl.replaceChildren(h('p', { class: 'warn' }, '브라우저 저장소를 열지 못했어요: ' + e.message)); return; }
    if (seq !== listSeq || ex.tree) return; // 그 사이 다른 화면으로 바뀜
    const when = t => new Date(t).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    listEl.replaceChildren(...(list.length ? list.map(p => {
      const card = h('button', { class: 'ex-proj', title: '열기' },
        h('span', { class: 'pj-ico', html: icon('box', 16) }),
        h('span', { class: 'pj-txt' }, h('b', {}, p.name), h('small', {}, `페이지 ${p.pages}개 · ${when(p.updated)}`)));
      card.onclick = () => openProject(p.id);
      return card;
    }) : [h('p', { class: 'hint' }, '아직 프로젝트가 없어요. [새 프로젝트]로 시작하거나 [예제]를 불러와 보세요.')]));
  }

  /* ---------- 만들기 · 이름 바꾸기 · 지우기 ---------- */
  const BAD_NAME = /[\\/:*?"<>|]/;
  function targetDir() {
    const s = ex.selected;
    if (!s) return ex.tree;
    return s.kind === 'directory' ? s : s.parent;
  }
  async function askName(dir, kind) {
    if (!dir.expanded || !dir.children) {
      dir.expanded = true;
      if (!dir.children) await loadChildren(dir);
    }
    return new Promise(resolve => {
      const temp = {
        temp: true,
        kind,
        done: v => {
          // 그 사이 새로 고침이 있었을 수 있으니 트리 전체에서 지움
          WB.walk(ex.tree, n => { if (n.children) n.children = n.children.filter(x => x !== temp); });
          render();
          resolve(v);
        },
      };
      dir.children.unshift(temp);
      render();
    });
  }
  /** 새로 고침 뒤에도 같은 폴더 노드를 쓰도록 경로로 다시 찾음 */
  function nodeAt(path) {
    let found = null;
    WB.walk(ex.tree, n => { if (!found && !n.temp && n.kind === 'directory' && n.path === path) found = n; });
    return found;
  }
  function validName(dir, name, self) {
    if (BAD_NAME.test(name)) { WB.toast('이름에 \\ / : * ? " < > | 는 쓸 수 없어요', 'error'); return false; }
    if (dir.children.some(c => !c.temp && c !== self && c.name.toLowerCase() === name.toLowerCase())) {
      WB.toast(`'${name}' 은(는) 이미 있어요`, 'error');
      return false;
    }
    return true;
  }

  async function newFile(dir = targetDir()) {
    if (!dir) return;
    let name = await askName(dir, 'file');
    if (!name) return;
    dir = nodeAt(dir.path) || dir;
    if (!name.includes('.')) name += '.html';
    if (!validName(dir, name)) return;
    try {
      const fh = await dir.handle.getFileHandle(name, { create: true });
      const ext = WB.extOf(name);
      if (ext === 'html' || ext === 'htm') {
        const w = await fh.createWritable();
        await w.write(WB.generateHTML({ title: name.replace(/\.html?$/i, ''), root: WB.newRoot() }));
        await w.close();
      }
      await loadChildren(dir);
      const node = dir.children.find(c => c.name === name);
      ex.selected = node;
      render();
      if (node) WB.openFileNode(node);
    } catch (e) {
      WB.toast('파일을 만들지 못했어요: ' + e.message, 'error');
    }
  }
  async function newFolder(dir = targetDir()) {
    if (!dir) return;
    const name = await askName(dir, 'directory');
    if (!name) return;
    dir = nodeAt(dir.path) || dir;
    if (!validName(dir, name)) return;
    try {
      await dir.handle.getDirectoryHandle(name, { create: true });
      await loadChildren(dir);
      ex.selected = dir.children.find(c => c.name === name) || null;
      render();
    } catch (e) {
      WB.toast('폴더를 만들지 못했어요: ' + e.message, 'error');
    }
  }

  async function copyFile(src, dstDir, name) {
    const file = await src.getFile();
    const nh = await dstDir.getFileHandle(name, { create: true });
    const w = await nh.createWritable();
    await w.write(file);
    await w.close();
  }
  async function copyDir(src, dstParent, name) {
    const dst = await dstParent.getDirectoryHandle(name, { create: true });
    for await (const hd of src.values()) {
      if (hd.kind === 'file') await copyFile(hd, dst, hd.name);
      else await copyDir(hd, dst, hd.name);
    }
  }

  function rename(node) {
    if (!node || !node.parent) return;
    node.renaming = async newName => {
      delete node.renaming;
      render();
      if (!newName || newName === node.name || !validName(node.parent, newName, node)) return;
      const parent = node.parent;
      const oldPath = node.path;
      try {
        let moved = false;
        if (node.handle.move) {
          try { await node.handle.move(newName); moved = true; } catch { /* 지원하지 않으면 복사 후 삭제 */ }
        }
        if (!moved) {
          if (node.kind === 'file') await copyFile(node.handle, parent.handle, newName);
          else await copyDir(node.handle, parent.handle, newName);
          await parent.handle.removeEntry(node.name, { recursive: true });
        }
        await loadChildren(parent);
        ex.selected = parent.children.find(c => c.name === newName) || null;
        render();
        await WB.relinkDocs(oldPath, childPath(parent, newName));
      } catch (e) {
        WB.toast('이름을 바꾸지 못했어요: ' + e.message, 'error');
        ex.refresh();
      }
    };
    render();
  }

  async function remove(node) {
    if (!node || !node.parent) return;
    const what = node.kind === 'directory' ? `폴더 '${node.name}' 과(와) 그 안의 모든 파일` : `'${node.name}'`;
    if (!confirm(`${what}을(를) 삭제할까요?\n이 작업은 되돌릴 수 없어요.`)) return;
    try {
      await node.parent.handle.removeEntry(node.name, { recursive: true });
      WB.closeDocsUnder(node.path);
      if (ex.selected === node) ex.selected = null;
      await loadChildren(node.parent);
      render();
    } catch (e) {
      WB.toast('삭제하지 못했어요: ' + e.message, 'error');
    }
  }

  function collapseAll() {
    if (!ex.tree) return;
    WB.walk(ex.tree, n => { if (n !== ex.tree) n.expanded = false; });
    render();
  }

  /* ---------- 사용자 동작 ---------- */
  actionsEl.innerHTML = [
    ['projects', 'box', '프로젝트 메뉴 (목록 · 새로 만들기 · zip 내보내기 · 가져오기)'],
    ['newFile', 'filePlus', '새 페이지'],
    ['newFolder', 'folderPlus', '새 폴더'],
    ['refresh', 'refresh', '새로 고침'],
    ['collapse', 'collapse', '모두 접기'],
  ].map(([act, ic, t]) => `<button class="icon-btn" data-act="${act}" title="${t}">${icon(ic)}</button>`).join('');
  actionsEl.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    const act = btn?.dataset.act;
    if (!act) return;
    if (act === 'projects') { const r = btn.getBoundingClientRect(); return projectMenu(r.left, r.bottom + 2); }
    if (!ex.tree) return WB.toast('먼저 프로젝트를 열어 주세요');
    if (act === 'newFile') newFile();
    else if (act === 'newFolder') newFolder();
    else if (act === 'refresh') ex.refresh();
    else if (act === 'collapse') collapseAll();
  });

  treeEl.addEventListener('click', async e => {
    const r = e.target.closest('.ex-row');
    if (!r || !r._node) {
      if (e.target === treeEl) { ex.selected = null; render(); }
      return;
    }
    const node = r._node;
    ex.selected = node;
    if (node.kind === 'directory') {
      node.expanded = !node.expanded;
      if (node.expanded && !node.children) {
        try { await loadChildren(node); } catch (err) { WB.toast(err.message, 'error'); }
      }
      render();
    } else {
      render();
      WB.openFileNode(node);
    }
  });

  treeEl.addEventListener('contextmenu', e => {
    if (!ex.tree) return;
    e.preventDefault();
    const node = e.target.closest('.ex-row')?._node;
    if (node) { ex.selected = node; render(); }
    const dir = node ? (node.kind === 'directory' ? node : node.parent) : ex.tree;
    const items = [];
    if (node && node.kind === 'file') items.push({ label: '열기', icon: 'file', action: () => WB.openFileNode(node) }, 'sep');
    items.push(
      { label: '새 파일', icon: 'filePlus', action: () => newFile(dir) },
      { label: '새 폴더', icon: 'folderPlus', action: () => newFolder(dir) },
    );
    if (node) {
      items.push('sep',
        { label: '이름 바꾸기', icon: 'edit', kbd: 'F2', action: () => rename(node) },
        { label: '삭제', icon: 'trash', kbd: 'Del', danger: true, action: () => remove(node) });
    } else items.push('sep', { label: '새로 고침', icon: 'refresh', action: () => ex.refresh() });
    WB.menu(e.clientX, e.clientY, items);
  });

  treeEl.addEventListener('keydown', e => {
    const node = ex.selected;
    if (!node) return;
    if (e.key === 'F2') { e.preventDefault(); rename(node); }
    else if (e.key === 'Delete') { e.preventDefault(); remove(node); }
    else if (e.key === 'Enter' && node.kind === 'file') WB.openFileNode(node);
  });

  rootEl.addEventListener('click', () => {
    const r = rootEl.getBoundingClientRect();
    projectMenu(r.left + 8, r.bottom);
  });

  WB.on('doc', () => ex.tree && render());

  /* ---------- 시작: 마지막에 연 프로젝트 · 폴더 ---------- */
  render();
  idbGet('root').then(async last => {
    if (!last) return;
    if (last.vproject) {
      if (await WB.projects.get(last.vproject)) openProject(last.vproject);
      return;
    }
    if (!supported) return;
    savedHandle = last;
    // 이미 권한이 있으면 바로 열고, 아니면 [최근 폴더 다시 열기] 버튼을 보여줌
    if ((await last.queryPermission({ mode: 'readwrite' })) === 'granted') openFolder(last);
    else render();
  }).catch(() => {});
})();
