'use strict';
/* 탭2 — 스타일 설정: 선택한 요소의 글자·모양·강조·배치·속성을 바꿈 */
(() => {
  const { $, h, esc, icon } = WB;
  const insp = $('#inspector');

  const FONTS = [
    ['', '기본'], ["'Malgun Gothic', sans-serif", '맑은 고딕'], ["'Nanum Gothic', sans-serif", '나눔고딕'],
    ["'Gulim', sans-serif", '굴림'], ["'Batang', serif", '바탕'], ['Arial, sans-serif', 'Arial'],
    ['Georgia, serif', 'Georgia'], ["'Courier New', monospace", 'Courier New'],
  ];
  const SHADOWS = [
    ['', '없음'], ['0 1px 3px rgba(0, 0, 0, 0.15)', '약하게'],
    ['0 4px 12px rgba(0, 0, 0, 0.15)', '보통'], ['0 12px 32px rgba(0, 0, 0, 0.22)', '강하게'],
  ];
  const PRESETS = {
    card: { label: '카드', style: { padding: '20px', 'border-radius': '12px', 'box-shadow': SHADOWS[2][0], 'background-color': '#ffffff' } },
    pill: { label: '알약 버튼', style: { padding: '10px 22px', 'border-radius': '999px', 'border-style': 'none', 'background-color': '#2563eb', color: '#ffffff', 'font-weight': '700' } },
    mark: { label: '형광펜', style: { 'background-color': '#fff59d', padding: '0 4px' } },
    accent: { label: '빨간 강조', style: { color: '#dc2626', 'font-weight': '700' } },
    center: { label: '가운데 놓기', style: { 'text-align': 'center', 'max-width': '720px', margin: '0 auto' } },
  };

  const GROUPS = [
    { id: 'text', title: '텍스트', ctls: [
      { type: 'select', prop: 'font-family', cap: '글꼴', options: FONTS },
      { type: 'num', prop: 'font-size', cap: '크기', unit: 'px', min: 1 },
      { type: 'color', prop: 'color', cap: '글자색' },
      { type: 'toggles', cap: '모양', items: [['font-weight', '700', '<b>B</b>', '굵게'], ['font-style', 'italic', '<i>I</i>', '기울임'], ['text-decoration', 'underline', '<u>U</u>', '밑줄']] },
      { type: 'seg', prop: 'text-align', cap: '정렬', items: [['left', icon('alignL', 14), '왼쪽'], ['center', icon('alignC', 14), '가운데'], ['right', icon('alignR', 14), '오른쪽']] },
      { type: 'num', prop: 'line-height', cap: '줄 간격', step: 0.1, min: 0 },
    ] },
    { id: 'box', title: '모양', ctls: [
      { type: 'color', prop: 'background-color', cap: '배경색' },
      { type: 'size', prop: 'width', cap: '너비' },
      { type: 'size', prop: 'height', cap: '높이' },
      { type: 'size', prop: 'padding', cap: '안쪽 여백' },
      { type: 'size', prop: 'margin', cap: '바깥 여백' },
      { type: 'num', prop: 'border-radius', cap: '둥글게', unit: 'px', min: 0 },
      { type: 'num', prop: 'border-width', cap: '테두리', unit: 'px', min: 0 },
      { type: 'select', prop: 'border-style', cap: '선 모양', options: [['', '—'], ['solid', '실선'], ['dashed', '점선'], ['dotted', '점'], ['none', '없음']] },
      { type: 'color', prop: 'border-color', cap: '테두리색' },
    ] },
    { id: 'fx', title: '강조', ctls: [
      { type: 'select', prop: 'box-shadow', cap: '그림자', options: SHADOWS },
      { type: 'range', prop: 'opacity', cap: '진하기' },
      { type: 'presets', cap: '빠른 꾸미기' },
    ] },
    { id: 'layout', title: '배치', containerOnly: true, ctls: [
      { type: 'dir', cap: '방향' },
      { type: 'size', prop: 'gap', cap: '간격' },
      { type: 'select', prop: 'justify-content', cap: '가로 맞춤', options: [['', '기본'], ['flex-start', '처음'], ['center', '가운데'], ['flex-end', '끝'], ['space-between', '양끝 벌리기'], ['space-around', '고르게']] },
      { type: 'select', prop: 'align-items', cap: '세로 맞춤', options: [['', '기본'], ['flex-start', '처음'], ['center', '가운데'], ['flex-end', '끝'], ['stretch', '늘이기']] },
      { type: 'check', prop: 'flex-wrap', on: 'wrap', cap: '자리 없으면 줄바꿈' },
    ] },
    { id: 'pos', title: '위치 (자유 배치)', ctls: [
      { type: 'size', prop: 'left', cap: '왼쪽에서' },
      { type: 'size', prop: 'top', cap: '위에서' },
    ] },
    { id: 'attrs', title: '속성' },
  ];

  /* ---------- 화면 만들기 ---------- */
  const opts = list => list.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('');
  function ctlHTML(c) {
    const cap = `<span class="cap">${c.cap}</span>`;
    switch (c.type) {
      case 'num':
        return `<label class="ctl">${cap}<span class="field"><input type="number" data-prop="${c.prop}" data-unit="${c.unit || ''}" min="${c.min ?? ''}" step="${c.step || 1}" placeholder="—">${c.unit ? `<i>${c.unit}</i>` : ''}</span></label>`;
      case 'size':
        return `<label class="ctl" title="숫자만 쓰면 px, 100% 나 auto 도 가능">${cap}<input type="text" data-prop="${c.prop}" data-size placeholder="자동" spellcheck="false"></label>`;
      case 'color':
        return `<div class="ctl">${cap}<span class="field color" data-colorbox="${c.prop}"><input type="color" data-prop="${c.prop}"><button class="clr" data-clear="${c.prop}" title="색 지우기">×</button></span></div>`;
      case 'select':
        return `<label class="ctl">${cap}<select data-prop="${c.prop}">${opts(c.options)}</select></label>`;
      case 'toggles':
        return `<div class="ctl">${cap}<div class="seg">${c.items.map(([p, v, lab, t]) => `<button data-toggle="${p}" data-on="${v}" title="${t}">${lab}</button>`).join('')}</div></div>`;
      case 'seg':
        return `<div class="ctl">${cap}<div class="seg">${c.items.map(([v, lab, t]) => `<button data-set="${c.prop}" data-value="${v}" title="${t}">${lab}</button>`).join('')}</div></div>`;
      case 'range':
        return `<label class="ctl">${cap}<input type="range" min="5" max="100" data-prop="${c.prop}" data-range></label>`;
      case 'check':
        return `<label class="ctl check"><input type="checkbox" data-check="${c.prop}" data-on="${c.on}"><span class="cap">${c.cap}</span></label>`;
      case 'dir':
        return `<div class="ctl">${cap}<div class="seg"><button data-dir="block" title="원래대로 (위에서 아래로)">기본</button><button data-dir="row" title="옆으로 나란히">가로</button><button data-dir="column" title="위아래로 간격 두고">세로</button><button data-dir="free" title="마우스로 아무 위치에나 놓기">자유</button></div></div>`;
      case 'presets':
        return `<label class="ctl">${cap}<select data-preset><option value="">고르기…</option>${Object.entries(PRESETS).map(([k, p]) => `<option value="${k}">${p.label}</option>`).join('')}</select></label>`;
    }
    return '';
  }

  insp.innerHTML = `
    <div class="insp-target">
      <span class="t-name">선택 없음</span>
      <span class="t-tag"></span>
      <span class="t-hint">캔버스에서 요소를 클릭하세요</span>
      <button class="t-reset" hidden>꾸미기 모두 지우기</button>
    </div>
    ${GROUPS.map(g => `<div class="insp-group" data-group="${g.id}"><div class="g-title">${g.title}</div><div class="g-row">${(g.ctls || []).map(ctlHTML).join('')}</div></div>`).join('')}`;

  const tName = insp.querySelector('.t-name');
  const tTag = insp.querySelector('.t-tag');
  const tHint = insp.querySelector('.t-hint');
  const tReset = insp.querySelector('.t-reset');
  const attrRow = insp.querySelector('[data-group="attrs"] .g-row');
  const layoutGroup = insp.querySelector('[data-group="layout"]');
  const posGroup = insp.querySelector('[data-group="pos"]');

  /* ---------- 값 읽고 쓰기 ---------- */
  const colorCtx = document.createElement('canvas').getContext('2d');
  function toHex(v) {
    if (!v) return '#000000';
    if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
    colorCtx.fillStyle = '#000000';
    colorCtx.fillStyle = v;
    return /^#[0-9a-f]{6}$/i.test(colorCtx.fillStyle) ? colorCtx.fillStyle : '#000000';
  }
  const normSize = v => (/^-?\d+(\.\d+)?$/.test(v.trim()) ? v.trim() + 'px' : v.trim());

  function readCtl(t) {
    if (t.type === 'number') return t.value === '' ? '' : t.value + (t.dataset.unit || '');
    if (t.dataset.size !== undefined) return normSize(t.value);
    if (t.dataset.range !== undefined) return t.value === '100' ? '' : String(t.value / 100);
    return t.value;
  }
  function writeCtl(t, v) {
    if (t.type === 'number') t.value = v ? parseFloat(v) || '' : '';
    else if (t.type === 'color') {
      t.value = toHex(v);
      t.closest('.field').classList.toggle('empty', !v);
    } else if (t.dataset.range !== undefined) t.value = v === '' || v == null ? 100 : Math.round(parseFloat(v) * 100);
    else if (t.tagName === 'SELECT') {
      if (v && ![...t.options].some(o => o.value === v)) t.append(new Option(v, v)); // 목록에 없는 값도 보여줌
      t.value = v || '';
    } else t.value = v || '';
  }

  /* ---------- 속성(태그별) 칸 ---------- */
  const INPUT_TYPES = [['text', '글자'], ['password', '비밀번호'], ['email', '이메일'], ['number', '숫자'], ['tel', '전화번호'], ['date', '날짜'], ['checkbox', '체크박스'], ['radio', '라디오'], ['color', '색'], ['range', '슬라이더'], ['file', '파일'], ['submit', '제출 버튼']];
  function attrFields(node) {
    if (node.id === 'root') return [{ kind: 'title', cap: '페이지 제목 (브라우저 탭에 보임)', wide: true }];
    const f = [];
    if (WB.kindOf(node.tag) === 'text' && node.tag !== 'option') f.push({ kind: 'text', cap: '글자', wide: true });
    switch (node.tag) {
      case 'a':
        f.push({ attr: 'href', cap: '링크 주소', ph: 'https://', wide: true }, { attr: 'target', check: '_blank', cap: '새 탭에서 열기' });
        break;
      case 'img':
        f.push({ attr: 'src', cap: '이미지 주소', ph: 'https:// 또는 images/사진.png', wide: true, pick: 'image/*' }, { attr: 'alt', cap: '그림 설명 (alt)' });
        break;
      case 'video':
        f.push({ attr: 'src', cap: '동영상 주소', wide: true, pick: 'video/*' }, { attr: 'controls', bool: true, cap: '조작 버튼' }, { attr: 'autoplay', bool: true, cap: '자동 재생' }, { attr: 'muted', bool: true, cap: '소리 끔' }, { attr: 'loop', bool: true, cap: '반복' });
        break;
      case 'audio':
        f.push({ attr: 'src', cap: '소리 파일 주소', wide: true, pick: 'audio/*' }, { attr: 'controls', bool: true, cap: '조작 버튼' }, { attr: 'autoplay', bool: true, cap: '자동 재생' }, { attr: 'loop', bool: true, cap: '반복' });
        break;
      case 'iframe':
        f.push({ attr: 'src', cap: '넣을 웹 주소', ph: 'https://', wide: true });
        break;
      case 'input':
        f.push({ attr: 'type', cap: '종류', options: INPUT_TYPES });
        if (!['checkbox', 'radio', 'submit', 'color', 'range', 'file'].includes(node.attrs.type)) f.push({ attr: 'placeholder', cap: '안내 글자' });
        f.push({ attr: 'value', cap: '처음 값' }, { attr: 'name', cap: '이름 (name)' });
        if (['checkbox', 'radio'].includes(node.attrs.type)) f.push({ attr: 'checked', bool: true, cap: '처음부터 선택' });
        f.push({ attr: 'required', bool: true, cap: '꼭 입력' });
        break;
      case 'textarea':
        f.push({ attr: 'placeholder', cap: '안내 글자', wide: true }, { attr: 'rows', cap: '줄 수' }, { attr: 'name', cap: '이름 (name)' });
        break;
      case 'select':
        f.push({ kind: 'options', cap: '선택 항목 (한 줄에 하나씩)', wide: true }, { attr: 'name', cap: '이름 (name)' });
        break;
      case 'button':
        f.push({ attr: 'type', cap: '종류', options: [['button', '일반 버튼'], ['submit', '양식 제출'], ['reset', '양식 비우기']] });
        break;
      case 'label':
        f.push({ attr: 'for', cap: '연결할 입력칸 id' });
        break;
      case 'form':
        f.push({ attr: 'action', cap: '보낼 주소' }, { attr: 'method', cap: '보내는 방법', options: [['', '기본(get)'], ['post', 'post']] });
        break;
    }
    f.push({ attr: 'id', cap: '요소 이름 (id)', ph: '예: name-input' });
    return f;
  }

  function fieldHTML(f) {
    const cls = 'ctl' + (f.wide ? ' wide' : '');
    const cap = `<span class="cap">${f.cap}</span>`;
    if (f.kind === 'text') return `<label class="${cls}">${cap}<input type="text" data-node-text spellcheck="false"></label>`;
    if (f.kind === 'title') return `<label class="${cls}">${cap}<input type="text" data-doc-title spellcheck="false"></label>`;
    if (f.kind === 'options') return `<label class="${cls}">${cap}<textarea data-options rows="1" spellcheck="false"></textarea></label>`;
    if (f.bool) return `<label class="ctl check"><input type="checkbox" data-attr-bool="${f.attr}"><span class="cap">${f.cap}</span></label>`;
    if (f.check) return `<label class="ctl check"><input type="checkbox" data-attr-check="${f.attr}" data-on="${f.check}"><span class="cap">${f.cap}</span></label>`;
    if (f.options) return `<label class="ctl">${cap}<select data-attr="${f.attr}">${opts(f.options)}</select></label>`;
    const pick = f.pick ? `<button class="btn small pick" data-pick="${f.pick}" data-pick-attr="${f.attr}" title="내 컴퓨터에서 파일 고르기">파일…</button>` : '';
    return `<div class="${cls}">${cap}<span class="field"><input type="text" data-attr="${f.attr}" placeholder="${esc(f.ph || '')}" spellcheck="false">${pick}</span></div>`;
  }

  /* ---------- 새로 고침 ---------- */
  let attrKey = '';
  function refresh() {
    const doc = WB.canvasDoc();
    const node = WB.selectedNode() || (doc && doc.selectedId === 'root' ? doc.root : null);
    insp.classList.toggle('is-disabled', !node);
    tReset.hidden = !node;
    if (!node) {
      tName.textContent = '선택 없음';
      tTag.textContent = '';
      tHint.textContent = doc ? '캔버스에서 요소를 클릭하세요' : 'HTML 페이지를 열면 쓸 수 있어요';
      attrRow.innerHTML = '';
      attrKey = '';
      return;
    }
    tName.textContent = WB.labelOf(node);
    tTag.textContent = node.id === 'root' ? '<body>' : `<${node.tag}>`;
    tHint.textContent = '';

    const isContainer = WB.kindOf(node.tag) === 'container';
    layoutGroup.classList.toggle('hidden', !isContainer);
    const st = node.style;
    const focused = document.activeElement;
    insp.querySelectorAll('[data-prop]').forEach(t => { if (t !== focused) writeCtl(t, st[t.dataset.prop]); });
    insp.querySelectorAll('[data-toggle]').forEach(b => b.classList.toggle('on', st[b.dataset.toggle] === b.dataset.on || (b.dataset.toggle === 'font-weight' && st['font-weight'] === 'bold')));
    insp.querySelectorAll('[data-set]').forEach(b => b.classList.toggle('on', st[b.dataset.set] === b.dataset.value));
    insp.querySelectorAll('[data-check]').forEach(c => (c.checked = st[c.dataset.check] === c.dataset.on));
    const dir = WB.isFree(node) ? 'free' : !(st.display || '').includes('flex') ? 'block' : st['flex-direction'] === 'column' ? 'column' : 'row';
    insp.querySelectorAll('[data-dir]').forEach(b => b.classList.toggle('on', b.dataset.dir === dir));
    layoutGroup.querySelectorAll('.ctl:not(:first-child)').forEach(c => (c.style.opacity = dir === 'block' || dir === 'free' ? '.4' : ''));
    posGroup.classList.toggle('hidden', st.position !== 'absolute');
    const [jc, ai] = layoutGroup.querySelectorAll('select[data-prop] ');
    jc.previousElementSibling.textContent = dir === 'column' ? '세로 맞춤' : '가로 맞춤';
    ai.previousElementSibling.textContent = dir === 'column' ? '가로 맞춤' : '세로 맞춤';

    const key = node.id + '|' + node.tag + '|' + (node.attrs.type || '');
    if (key !== attrKey) {
      attrKey = key;
      attrRow.innerHTML = attrFields(node).map(fieldHTML).join('');
    }
    attrRow.querySelectorAll('[data-attr]').forEach(t => { if (t !== focused) writeCtl(t, node.attrs[t.dataset.attr]); });
    attrRow.querySelectorAll('[data-attr-bool]').forEach(c => (c.checked = node.attrs[c.dataset.attrBool] != null));
    attrRow.querySelectorAll('[data-attr-check]').forEach(c => (c.checked = node.attrs[c.dataset.attrCheck] === c.dataset.on));
    const tx = attrRow.querySelector('[data-node-text]');
    if (tx && tx !== focused) tx.value = (node.text || '').replace(/\n/g, ' ⏎ ');
    const tt = attrRow.querySelector('[data-doc-title]');
    if (tt && tt !== focused) tt.value = doc.title;
    const op = attrRow.querySelector('[data-options]');
    if (op && op !== focused) {
      op.value = node.children.map(c => c.text).join('\n');
      op.rows = Math.min(3, Math.max(1, node.children.length));
    }
  }

  /* ---------- 입력 처리 ---------- */
  const targetId = () => {
    const doc = WB.canvasDoc();
    return doc && doc.selectedId;
  };

  function onEdit(e) {
    const t = e.target;
    const id = targetId();
    if (!id) return;
    const isChange = e.type === 'change';
    const changeOnly = t.tagName === 'SELECT' || t.type === 'checkbox';
    if (changeOnly !== isChange) return;

    if (t.dataset.prop) {
      const prop = t.dataset.prop;
      const v = readCtl(t);
      if (prop === 'border-width' && v) {
        // 테두리 두께만 정해도 바로 보이도록 선 모양·색을 함께 채움
        const st = WB.selectedNode()?.style || {};
        WB.setStyles(id, { 'border-width': v, 'border-style': st['border-style'] && st['border-style'] !== 'none' ? st['border-style'] : 'solid', 'border-color': st['border-color'] || '#cccccc' }, `style:${id}:border-width`);
      } else WB.setStyle(id, prop, v);
    } else if (t.dataset.check) {
      WB.setStyle(id, t.dataset.check, t.checked ? t.dataset.on : '');
    } else if (t.dataset.preset !== undefined) {
      if (t.value) WB.setStyles(id, PRESETS[t.value].style);
      t.value = '';
    } else if (t.dataset.attr) {
      const v = t.value;
      WB.setAttr(id, t.dataset.attr, v === '' && t.dataset.attr !== 'alt' ? null : v);
    } else if (t.dataset.attrBool) {
      WB.setAttr(id, t.dataset.attrBool, t.checked ? '' : null);
    } else if (t.dataset.attrCheck) {
      WB.setAttr(id, t.dataset.attrCheck, t.checked ? t.dataset.on : null);
    } else if (t.dataset.nodeText !== undefined) {
      WB.setText(id, t.value.replace(/ ?⏎ ?/g, '\n'));
    } else if (t.dataset.docTitle !== undefined) {
      WB.commit(doc => (doc.title = t.value), 'doc-title');
    } else if (t.dataset.options !== undefined) {
      const lines = t.value.split('\n').map(s => s.trim()).filter(Boolean);
      WB.commit(doc => {
        const n = WB.find(doc.root, id).node;
        n.children = lines.map((text, i) => {
          const old = n.children[i];
          return old ? { ...old, text } : WB.makeNode('option', { text });
        });
      }, `options:${id}`);
    }
  }
  insp.addEventListener('input', onEdit);
  insp.addEventListener('change', onEdit);
  insp.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.target.blur(); });

  insp.addEventListener('click', e => {
    const b = e.target.closest('button');
    const id = targetId();
    if (!b || !id) return;
    const st = (WB.selectedNode() || WB.canvasDoc().root).style;
    if (b.dataset.clear) WB.setStyle(id, b.dataset.clear, '');
    else if (b.dataset.toggle) {
      const p = b.dataset.toggle;
      WB.setStyle(id, p, b.classList.contains('on') ? '' : b.dataset.on, `toggle:${id}:${p}:${Date.now()}`);
    } else if (b.dataset.set) {
      const p = b.dataset.set;
      WB.setStyle(id, p, st[p] === b.dataset.value ? '' : b.dataset.value, `set:${id}:${p}:${Date.now()}`);
    } else if (b.dataset.dir) setDirection(id, b.dataset.dir); else if (b.dataset.pick) pickFile(id, b.dataset.pick, b.dataset.pickAttr);
    else if (b === tReset) WB.setStyles(id, Object.fromEntries(Object.keys(st).map(k => [k, ''])));
  });

  /** 상자의 배치 방향 바꾸기. '자유'로 바꾸면 안의 요소들이 지금 보이는 자리에 그대로 고정됨 */
  function setDirection(id, dir) {
    const FLEX = ['display', 'flex-direction', 'gap', 'justify-content', 'align-items', 'flex-wrap'];
    const pos = dir === 'free' ? WB.measureChildren(id) : [];
    WB.commit(doc => {
      const n = WB.find(doc.root, id).node;
      const wasFree = WB.isFree(n);
      if (wasFree && dir !== 'free') {
        delete n.attrs['data-layout'];
        if (n.style.position === 'relative') delete n.style.position;
        n.children.forEach(WB.unfree);
      }
      if (dir === 'block') FLEX.forEach(k => delete n.style[k]);
      else if (dir === 'free') {
        if (wasFree) return;
        FLEX.forEach(k => delete n.style[k]);
        n.attrs['data-layout'] = 'free';
        n.style.position = 'relative';
        const bottom = Math.max(160, ...pos.map(p => p.y + 60));
        if (!n.style['min-height'] && !n.style.height) n.style['min-height'] = bottom + 'px';
        for (const c of n.children) {
          const p = pos.find(q => q.id === c.id);
          if (p) Object.assign(c.style, { position: 'absolute', left: p.x + 'px', top: p.y + 'px' });
          if (p && !c.style.width && WB.kindOf(c.tag) !== 'void') c.style.width = p.w + 'px'; // 꺼내도 폭이 그대로 보이게
        }
      } else Object.assign(n.style, { display: 'flex', 'flex-direction': dir, gap: n.style.gap || '12px' });
    }, `dir:${id}:${Date.now()}`);
  }

  /** 내 컴퓨터의 파일 고르기 → 열린 폴더 안이면 images/ 에 복사, 아니면 파일 안에 넣음 */
  function pickFile(id, accept, attr) {
    const input = $('#file-picker');
    input.accept = accept;
    input.value = '';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const src = await WB.importAsset(file);
        WB.setAttr(id, attr, src, `pick:${Date.now()}`);
      } catch (err) {
        WB.toast('파일을 넣지 못했어요: ' + err.message, 'error');
      }
    };
    input.click();
  }

  WB.on('select', refresh);
  WB.on('change', refresh);
  WB.on('doc', refresh);
  WB.on('focus-text', () => {
    const t = attrRow.querySelector('[data-node-text]');
    if (t) { t.focus(); t.select(); }
  });
  refresh();
})();
