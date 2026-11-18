'use strict';
/* 내 컴퓨터의 이미지 넣기
   - 파일 탐색기에서 작업 공간으로 끌어다 놓기 (놓은 자리에, 여러 장이면 나란히)
   - 오른쪽 클릭 → 「이미지 넣기…」, 이미지를 골랐으면 「이미지 바꾸기…」
   - 복사한 이미지(캡처 등)를 Ctrl+V 로 붙여넣기
   프로젝트에 저장한 페이지면 images/ 폴더로 복사하고, 아니면 페이지 안에 넣음 (큰 사진은 줄여서) */
(() => {
  const isImage = f => f && /^image\//.test(f.type);
  const BIG = 1.5 * 1024 * 1024;

  /** 프로젝트 밖(페이지 안에 넣는 경우)의 큰 사진은 긴 쪽 2000px · WebP 로 줄여서 페이지가 무거워지지 않게 */
  async function shrink(file) {
    const doc = WB.canvasDoc();
    const toProject = doc?.handle && WB.explorer?.root;
    if (toProject || file.size <= BIG || /gif|svg/.test(file.type)) return file;
    try {
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
      const c = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) });
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise(r => c.toBlob(r, 'image/webp', 0.86));
      if (!blob || blob.size >= file.size) return file;
      WB.toast(`큰 사진이라 줄여서 넣었어요 (${Math.round(file.size / 1024)}KB → ${Math.round(blob.size / 1024)}KB)`);
      return new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' });
    } catch { return file; }
  }
  const altOf = f => f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || '이미지';
  async function srcOf(file) { return WB.importAsset(await shrink(file)); }

  /** 이미지 요소 만들기 (바로 보이게 임시 주소를 쓰고, 파일을 다 읽으면 진짜 주소로 바꿈) */
  function makeImg(file) {
    const node = WB.paletteItem('img').make();
    node.attrs.src = URL.createObjectURL(file);
    node.attrs.alt = altOf(file);
    return node;
  }
  async function finish(pairs) {
    for (const [node, file] of pairs) {
      try {
        const src = await srcOf(file);
        WB.setAttr(node.id, 'src', src, `imgsrc:${node.id}`);
      } catch (err) {
        WB.toast('이미지를 넣지 못했어요: ' + err.message, 'error');
        WB.removeNode(node.id);
      }
    }
  }

  /** 첫 장이 놓인 뒤 나머지를 바로 뒤에 (자유 배치면 조금씩 비켜서) */
  function placeRest(first, files) {
    const doc = WB.canvasDoc();
    const f = WB.find(doc.root, first.id);
    if (!f || !files.length) return [];
    const nodes = files.map(makeImg);
    WB.commit(d => {
      const g = WB.find(d.root, first.id);
      nodes.forEach((n, i) => {
        if (g.node.style.position === 'absolute') {
          Object.assign(n.style, { position: 'absolute', left: (parseFloat(g.node.style.left) || 0) + 24 * (i + 1) + 'px', top: (parseFloat(g.node.style.top) || 0) + 24 * (i + 1) + 'px', width: g.node.style.width || '' });
        }
        g.parent.children.splice(g.index + 1 + i, 0, n);
      });
    }, `imgs:${Date.now()}`);
    return nodes.map((n, i) => [n, files[i]]);
  }

  /** 고른 곳에 넣기: 상자를 골랐으면 그 안, 다른 요소면 바로 뒤, 없으면 맨 끝 */
  WB.insertImages = files => {
    files = [...files].filter(isImage);
    const doc = WB.canvasDoc();
    if (!doc) return WB.toast('먼저 HTML 페이지를 여세요');
    if (!files.length) return WB.toast('이미지 파일(png · jpg · gif · webp · svg)이 아니에요', 'error');
    const first = makeImg(files[0]);
    const sel = WB.selectedNode();
    if (sel && sel.id !== 'root' && WB.kindOf(sel) === 'container' && !WB.ACCEPTS[sel.tag]) WB.insertNode(first, sel.id);
    else if (sel && sel.id !== 'root') { const f = WB.find(doc.root, sel.id); WB.insertNode(first, f.parent.id, f.index + 1); }
    else WB.insertNode(first, 'root');
    const rest = placeRest(first, files.slice(1));
    WB.select(first.id);
    WB.emit('reveal', first.id);
    finish([[first, files[0]], ...rest]);
  };
  /** 캔버스에 끌어다 놓은 이미지 (canvas.js 가 놓을 자리를 정하고 부름) */
  WB.dropImages = (first, files) => {
    const rest = placeRest(first, files.slice(1));
    finish([[first, files[0]], ...rest]);
  };
  WB.imageNodeFor = makeImg;

  function pick(multiple) {
    return new Promise(res => {
      const input = document.getElementById('file-picker');
      input.accept = 'image/*';
      input.multiple = multiple;
      input.value = '';
      input.onchange = () => { res([...input.files]); input.multiple = false; };
      input.click();
    });
  }
  WB.pickImages = async () => { const files = await pick(true); if (files.length) WB.insertImages(files); };
  WB.replaceImage = async id => {
    const [file] = await pick(false);
    if (!file) return;
    if (!isImage(file)) return WB.toast('이미지 파일이 아니에요', 'error');
    try { WB.setAttr(id, 'src', await srcOf(file), `imgsrc:${id}:${Date.now()}`); WB.toast('이미지를 바꿨어요', 'ok'); }
    catch (err) { WB.toast('이미지를 넣지 못했어요: ' + err.message, 'error'); }
  };

  /* 복사한 이미지 붙여넣기 · 편집기 안에서 복사한 요소 붙여넣기 (Ctrl+V) */
  document.addEventListener('paste', e => {
    const t = e.composedPath()[0];
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (!WB.canvasDoc() || document.querySelector('.modal-overlay')) return;
    const files = [...(e.clipboardData?.files || [])].filter(isImage);
    if (files.length) { clearTimeout(WB.pendingPaste); WB.pendingPaste = null; e.preventDefault(); WB.insertImages(files.map((f, i) => (f.name && f.name !== 'image.png' ? f : new File([f], `붙여넣은 이미지${i ? ' ' + (i + 1) : ''}.png`, { type: f.type })))); return; }
    // 요소 붙여넣기는 Ctrl+V 키에서 잠깐 뒤에 함 (app.js) — 키 없이 온 붙여넣기(메뉴 등)만 여기서
    if (!WB.pendingPaste && WB.hasClipboard()) { e.preventDefault(); WB.pasteNode(); }
  });

  // 캔버스 밖에 파일을 떨어뜨려도 브라우저가 그 파일로 넘어가지 않게
  addEventListener('dragover', e => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault(); });
  addEventListener('drop', e => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault(); });
})();
