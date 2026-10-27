'use strict';
/* 탭1 — 탐색기: 내 컴퓨터의 폴더를 열고 파일·폴더를 만들고, 열고, 이름을 바꾸고, 지움
   (Chrome · Edge 의 File System Access API 사용) */
(() => {
  const { $, h, esc, icon } = WB;
  const treeEl = $('#ex-tree');
  const rootEl = $('#ex-root');
  const actionsEl = $('#ex-actions');
  const supported = 'showDirectoryPicker' in window;

  /** tree 노드: { name, kind:'file'|'directory', handle, parent, path, children, expanded } */
  const ex = (WB.explorer = { root: null, tree: null, selected: null, supported });
  let savedHandle = null;

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
    ex.root = handle;
    ex.tree = { name: handle.name, kind: 'directory', handle, parent: null, path: '', children: null, expanded: true };
    ex.selected = null;
    await loadChildren(ex.tree);
    render();
    idbSet('root', handle).catch(() => {});
    WB.emit('folder');
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
    rootEl.innerHTML = `${icon('folderOpen', 14)}<span>${esc(ex.tree.name)}</span>`;
    rootEl.title = '열린 폴더: ' + ex.tree.name;
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

  function renderEmpty() {
    rootEl.innerHTML = '';
    treeEl.innerHTML = '';
    const box = h('div', { class: 'ex-empty' });
    if (!supported) {
      box.innerHTML = `<p class="warn">이 브라우저는 내 컴퓨터 폴더 열기를 지원하지 않아요.</p>
        <p>Chrome 이나 Edge 에서 열어 주세요. 지금은 [코드로 변환] → 다운로드로 저장할 수 있어요.</p>`;
    } else {
      box.innerHTML = `<p>열린 폴더가 없어요.</p>`;
      box.append(h('button', { class: 'btn primary', onclick: () => openFolder(), html: icon('folderOpen', 15) + ' 폴더 열기' }));
      if (savedHandle) box.append(h('button', { class: 'btn', onclick: reopen, html: `최근 폴더 다시 열기<small>${esc(savedHandle.name)}</small>` }));
      box.append(h('p', { class: 'hint' }, '폴더를 열면 그 안에 HTML 파일을 만들고, 열고, 저장할 수 있어요. VS Code 의 탐색기와 같아요.'));
    }
    treeEl.append(box);
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
    ['open', 'folderOpen', '폴더 열기'],
    ['newFile', 'filePlus', '새 파일'],
    ['newFolder', 'folderPlus', '새 폴더'],
    ['refresh', 'refresh', '새로 고침'],
    ['collapse', 'collapse', '모두 접기'],
  ].map(([act, ic, t]) => `<button class="icon-btn" data-act="${act}" title="${t}">${icon(ic)}</button>`).join('');
  actionsEl.addEventListener('click', e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    if (!supported) return WB.toast('Chrome 이나 Edge 에서만 폴더를 열 수 있어요', 'error');
    if (act === 'open') return openFolder();
    if (!ex.tree) return WB.toast('먼저 폴더를 열어 주세요');
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

  WB.on('doc', () => ex.tree && render());

  /* ---------- 시작 ---------- */
  render();
  if (supported) {
    idbGet('root').then(async handle => {
      if (!handle) return;
      savedHandle = handle;
      // 이미 권한이 있으면 바로 열고, 아니면 [최근 폴더 다시 열기] 버튼을 보여줌
      if ((await handle.queryPermission({ mode: 'readwrite' })) === 'granted') openFolder(handle);
      else render();
    }).catch(() => {});
  }
})();
