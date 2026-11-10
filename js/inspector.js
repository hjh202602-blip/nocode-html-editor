'use strict';
/* 탭2 — 스타일 설정: 선택한 요소의 글자·모양·강조·배치·속성을 바꿈 */
(() => {
  const { $, h, esc, icon } = WB;
  const insp = $('#inspector');

  const FONTS = [
    ['', '기본'], ["'Malgun Gothic', sans-serif", '맑은 고딕'], ["'Nanum Gothic', sans-serif", '나눔고딕'],
    ["'Gulim', sans-serif", '굴림'], ["'Batang', serif", '바탕'], ['Arial, sans-serif', 'Arial'],
    ['Georgia, serif', 'Georgia'], ["'Courier New', monospace", 'Courier New'],
    ...WB.webFontOptions(), // Google 웹 글꼴: 저장한 페이지와 캔버스에서 자동으로 불러옴
  ];
  const SHADOWS = [
    ['', '없음'], ['0 1px 3px rgba(0, 0, 0, 0.15)', '약하게'],
    ['0 4px 12px rgba(0, 0, 0, 0.15)', '보통'], ['0 12px 32px rgba(0, 0, 0, 0.22)', '강하게'],
  ];
  const SIDES = [['all', '네 면'], ['top', '위'], ['bottom', '아래'], ['left', '왼쪽'], ['right', '오른쪽']];
  const SIDE_INDEX = { top: 0, right: 1, bottom: 2, left: 3 };
  const GRAD_DIRS = [['', '없음'], ['to right', '→'], ['to bottom', '↓'], ['135deg', '↘']];
  /** 'border-width' 값 → { w: 두께, side } ('0 0 2px 0' 이면 아래쪽만) */
  function parseBorder(v) {
    const parts = String(v || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 4) {
      const nz = parts.map((x, i) => [parseFloat(x) || 0, i]).filter(([n]) => n > 0);
      if (nz.length === 1) return { w: nz[0][0], side: Object.keys(SIDE_INDEX)[nz[0][1]] };
      return { w: Math.max(0, ...parts.map(x => parseFloat(x) || 0)), side: 'all' };
    }
    return { w: parts.length ? parseFloat(parts[0]) || 0 : '', side: 'all' };
  }
  function makeBorder(w, side) {
    if (side === 'all') return w + 'px';
    const arr = ['0', '0', '0', '0'];
    arr[SIDE_INDEX[side]] = w + 'px';
    return arr.join(' ');
  }
  const GRAD_RE = /^linear-gradient\((to right|to bottom|135deg),\s*(.+?),\s*([^,]+)\)$/;
  const makeGrad = (dir, from, to) => `linear-gradient(${dir}, ${from || '#ffffff'}, ${to})`;

  /* 그림자: 모양 [값(크기), 이름, 진하기] + 색 → 'box-shadow' */
  const SHADOW_SHAPES = [['', '없음'], ['0 1px 3px', '약하게', 0.15], ['0 4px 12px', '보통', 0.15], ['0 12px 32px', '강하게', 0.22], ['0 0 18px', '빛나기', 0.6]];
  const SHADOW_RE = /^(0 \d+(?:px)? \d+px)\s+(.+)$/;
  function parseShadow(v) {
    const m = String(v || '').match(SHADOW_RE);
    if (!m) return { shape: '', color: '#000000' };
    const c = m[2].match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    const hex = c ? '#' + [c[1], c[2], c[3]].map(x => (+x).toString(16).padStart(2, '0')).join('') : toHex(m[2]);
    return { shape: m[1], color: hex };
  }
  function makeShadow(shape, hex) {
    const row = SHADOW_SHAPES.find(r => r[0] === shape);
    if (!row || !shape) return '';
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    return `${shape} rgba(${r}, ${g}, ${b}, ${row[2]})`;
  }

  /* 배치 방향 [값, 아이콘, 이름, 설명] */
  const DIRS = [
    ['block', '□', '기본', '원래대로 (위에서 아래로 쌓기)'],
    ['column', '↓', '세로', '위아래로 간격을 두고 나란히'],
    ['row', '→', '가로', '옆으로 나란히'],
    ['wrap', '↵', '줄바꿈', '옆으로 놓다가 자리가 없으면 다음 줄로'],
    ['grid', '▦', '격자', '표처럼 칸을 나눠 차례로 채우기'],
    ['free', '✥', '자유', '마우스로 아무 위치에나 놓기'],
  ];
  const ALIGN_NAMES = ['왼쪽 위', '가운데 위', '오른쪽 위', '왼쪽 가운데', '정가운데', '오른쪽 가운데', '왼쪽 아래', '가운데 아래', '오른쪽 아래'];
  const SIZE_MODES = [['fixed', '고정', '고정: 정한 크기 그대로'], ['hug', '맞춤', '맞춤: 내용만큼만'], ['fill', '채우기', '채우기: 남은 자리를 가득'], ['screen', '화면', '화면: 브라우저 화면 높이(너비)만큼 — 편집 프로그램처럼 한 화면을 꽉 채울 때']];
  const SCREEN = { w: '100vw', h: '100vh' };
  /** 'padding' → [위, 오른쪽, 아래, 왼쪽] */
  function parsePad(v) {
    const p = String(v || '0').trim().split(/\s+/);
    const [t, r = t, b = t, l = r] = p;
    return [t, r, b, l];
  }
  function makePad([t, r, b, l]) {
    const z = x => (parseFloat(x) || 0) === 0;
    if ([t, r, b, l].every(z)) return '';
    if (t === b && r === l) return t === r ? t : `${t} ${r}`;
    return `${t} ${r} ${b} ${l}`;
  }

  const PRESETS = {
    card: { label: '카드', style: { padding: '20px', 'border-radius': '12px', 'box-shadow': SHADOWS[2][0], 'background-color': '#ffffff' } },
    pill: { label: '알약 버튼', style: { padding: '10px 22px', 'border-radius': '999px', 'border-style': 'none', 'background-color': '#2563eb', color: '#ffffff', 'font-weight': '700' } },
    mark: { label: '형광펜', style: { 'background-color': '#fff59d', padding: '0 4px' } },
    accent: { label: '빨간 강조', style: { color: '#dc2626', 'font-weight': '700' } },
    center: { label: '가운데 놓기', style: { 'text-align': 'center', 'max-width': '720px', margin: '0 auto' } },
  };

  const WEIGHTS = [['', '기본'], ['300', '얇게'], ['400', '보통'], ['600', '조금 굵게'], ['700', '굵게'], ['900', '아주 굵게']];
  const TEXT_SHADOWS = [
    ['', '없음'], ['0 1px 2px rgba(0, 0, 0, 0.25)', '약하게'],
    ['0 2px 6px rgba(0, 0, 0, 0.45)', '진하게'], ['0 0 8px rgba(255, 255, 255, 0.9)', '빛나게'],
  ];

  const GROUPS = [
    { id: 'text', title: '텍스트', ctls: [
      { type: 'select', prop: 'font-family', cap: '글꼴', options: FONTS },
      { type: 'size', prop: 'font-size', cap: '크기', ph: '16', title: '숫자만 쓰면 px. 2rem, 5vw, clamp(32px, 6vw, 96px) 도 돼요' },
      { type: 'select', prop: 'font-weight', cap: '굵기', options: WEIGHTS },
      { type: 'color', prop: 'color', cap: '글자색' },
      { type: 'toggles', cap: '모양', items: [['font-style', 'italic', '<i>I</i>', '기울임'], ['text-decoration', 'underline', '<u>U</u>', '밑줄'], ['text-decoration', 'line-through', '<s>S</s>', '취소선']] },
      { type: 'seg', prop: 'text-align', cap: '정렬', items: [['left', icon('alignL', 14), '왼쪽'], ['center', icon('alignC', 14), '가운데'], ['right', icon('alignR', 14), '오른쪽'], ['justify', icon('alignJ', 14), '양쪽 맞춤']] },
      { type: 'num', prop: 'line-height', cap: '줄 간격', step: 0.1, min: 0 },
      { type: 'num', prop: 'letter-spacing', cap: '글자 간격', unit: 'px', step: 0.5 },
      { type: 'select', prop: 'text-shadow', cap: '글자 그림자', options: TEXT_SHADOWS },
      { type: 'wraptext', cap: '줄바꿈' },
      { type: 'select', prop: 'text-transform', cap: '영문 대소문자', options: [['', '그대로'], ['uppercase', 'ABC'], ['lowercase', 'abc'], ['capitalize', 'Abc']] },
      { type: 'select', prop: 'vertical-align', cap: '세로 위치', options: [['', '기본'], ['super', '위첨자'], ['sub', '아래첨자'], ['middle', '가운데'], ['top', '위'], ['bottom', '아래']], title: 'Work⁰⁵ 처럼 글자를 위로 올리기 (위첨자) 등' },
      { type: 'color', prop: '--hl-color', cap: '강조 글자색', title: '글자 중 *이렇게* 별표로 감싼 부분의 색' },
      { type: 'select', prop: '--hl-font', cap: '강조 글꼴', options: FONTS, title: '*별표* 부분만 다른 글꼴로 (예: IDEAS WITH *visual impact.*)' },
      { type: 'select', prop: '--hl-style', cap: '강조 모양', options: [['', '그대로'], ['italic', '기울임'], ['normal', '바로']] },
    ] },
    { id: 'size', title: '크기 · 여백', ctls: [
      { type: 'sizemode', axis: 'w', cap: '너비' },
      { type: 'sizemode', axis: 'h', cap: '높이' },
      { type: 'pad', cap: '안쪽 여백' },
      { type: 'size', prop: 'margin', cap: '바깥 여백' },
      { type: 'select', prop: 'object-fit', cap: '그림 맞추기', cls: 'ctl-fit', options: [['', '늘이기'], ['cover', '꽉 채우기 (잘림)'], ['contain', '전부 보이기']] },
      { type: 'check', prop: 'flex-shrink', on: '0', cap: '줄어들지 않게', cls: 'ctl-shrink', title: '가로/세로 배치 안에서 자리가 모자라도 이 크기를 지켜요' },
      { type: 'size', prop: 'max-width', cap: '최대 너비', ph: '없음', title: '넓은 화면에서도 이보다 커지지 않아요 (예: 720, 60%)' },
      { type: 'size', prop: 'min-height', cap: '최소 높이', ph: '없음' },
      { type: 'text', prop: 'aspect-ratio', cap: '가로세로 비율', ph: '16 / 9', title: '너비에 맞춰 높이가 정해져요 (예: 1, 4 / 3, 16 / 9)' },
    ] },
    { id: 'layout', title: '배치 (Auto layout)', containerOnly: true, ctls: [
      { type: 'dir', cap: '방향' },
      { type: 'align', cap: '정렬' },
      { type: 'num', prop: 'gap', cap: '간격', unit: 'px', min: 0 },
      { type: 'check', prop: 'justify-content', on: 'space-between', cap: '양끝 벌리기', cls: 'ctl-between', title: '처음과 끝에 붙이고 사이를 똑같이 벌려요' },
      { type: 'check', prop: 'align-items', on: 'baseline', cap: '글자 기준선 맞춤', cls: 'ctl-baseline', title: '가로 배치에서 크기 · 글꼴이 다른 글자들의 밑줄 높이를 맞춰요' },
      { type: 'cols', cap: '한 줄 칸 수' },
    ] },
    { id: 'box', title: '모양', ctls: [
      { type: 'color', prop: 'background-color', cap: '배경색' },
      { type: 'size', prop: 'border-radius', cap: '둥글게', ph: '0', title: '숫자만 쓰면 px. 50% 는 원. 모서리 따로: 왼쪽위 오른쪽위 오른쪽아래 왼쪽아래 (예: 8 8 0 0)' },
      { type: 'border', cap: '테두리' },
      { type: 'select', prop: 'border-style', cap: '선 모양', options: [['', '—'], ['solid', '실선'], ['dashed', '점선'], ['dotted', '점'], ['none', '없음']] },
      { type: 'color', prop: 'border-color', cap: '테두리색' },
      { type: 'check', prop: 'overflow', on: 'hidden', cap: '넘치는 부분 숨기기', title: '안의 그림이 둥근 모서리 밖으로 나가지 않아요' },
      { type: 'color', prop: 'accent-color', cap: '체크 색', cls: 'ctl-accent', title: '체크박스 · 라디오 · 슬라이더의 색' },
      { type: 'color', prop: '--switch-on', cap: '켜짐 색', cls: 'ctl-switch' },
      { type: 'color', prop: '--switch-off', cap: '꺼짐 색', cls: 'ctl-switch' },
    ] },
    { id: 'fx', title: '강조 · 움직임', ctls: [
      { type: 'shadow', cap: '그림자' },
      { type: 'attrsel', attr: 'data-hover', cap: '마우스 올리면', options: WB.HOVERS },
      { type: 'attrsel', attr: 'data-reveal', cap: '스크롤하면 나타나기', options: WB.REVEALS },
      { type: 'sticky', cap: '스크롤해도 붙어 있기' },
      { type: 'overlay', cap: '띄워서 겹치기', title: '이 요소만 제자리에서 띄워 다른 요소 위에 겹쳐 놓아요 (나머지는 그대로). 아래 「위치」에서 옮기고, 화살표 키로도 옮겨요' },
      { type: 'attrsel', attr: 'data-drag', cap: '보는 사람이 끌어서 옮기기', options: [['', '안 됨'], ['x', '가로로만'], ['y', '세로로만'], ['xy', '아무 방향']] },
      { type: 'attrcheck', attr: 'data-resize', on: 'x', cap: '양 끝을 끌어 길이 조절', title: '보는 사람이 왼쪽·오른쪽 끝을 잡아 길이를 늘이고 줄여요 (영상 클립처럼)' },
      { type: 'gradient', cap: '그라데이션' },
      { type: 'bgimg', cap: '배경 그림' },
      { type: 'range', prop: 'opacity', cap: '진하기' },
      { type: 'select', prop: 'transition', cap: '부드럽게 바뀌기', options: [['', '바로'], ['all 0.15s ease', '빠르게 (0.15초)'], ['all 0.3s ease', '보통 (0.3초)'], ['all 0.6s ease', '천천히 (0.6초)']] },
      { type: 'num', prop: 'rotate', cap: '회전', unit: 'deg', step: 5 },
      { type: 'fnnum', prop: 'filter', fn: 'blur', unit: 'px', cap: '흐리게', title: '요소를 뿌옇게 (예: 4)' },
      { type: 'fnnum', prop: 'backdrop-filter', fn: 'blur', unit: 'px', cap: '뒤 배경 흐리게', title: '반투명 배경색과 함께 쓰면 유리처럼 보여요 (예: 12)' },
      { type: 'select', prop: 'mix-blend-mode', cap: '겹침 방식', options: [['', '보통'], ['multiply', '곱하기 (어둡게)'], ['screen', '스크린 (밝게)'], ['overlay', '오버레이'], ['difference', '차이']] },
      { type: 'select', prop: 'cursor', cap: '마우스 모양', options: [['', '기본'], ['pointer', '손가락 (누를 수 있음)'], ['grab', '잡기'], ['text', '글자'], ['not-allowed', '금지']] },
      { type: 'presets', cap: '빠른 꾸미기' },
    ] },
    { id: 'pos', title: '위치 (자유 배치 · 띄운 요소)', ctls: [
      { type: 'anchor', axis: 'x', cap: '가로 기준' },
      { type: 'anchor', axis: 'y', cap: '세로 기준' },
      { type: 'num', prop: 'z-index', cap: '앞뒤 순서', title: '숫자가 클수록 앞에 보여요 (예: 1, 10). 겹친 요소의 순서' },
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
        return `<label class="ctl" title="${esc(c.title || '숫자만 쓰면 px, 100% 나 auto 도 가능')}">${cap}<input type="text" data-prop="${c.prop}" data-size placeholder="${esc(c.ph || '자동')}" spellcheck="false"></label>`;
      case 'text':
        return `<label class="ctl" title="${esc(c.title || '')}">${cap}<input type="text" data-prop="${c.prop}" placeholder="${esc(c.ph || '')}" spellcheck="false"></label>`;
      case 'color':
        // 색 + 진하기(%): 100 보다 작으면 rgba(…) 로 반투명
        return `<div class="ctl ${c.cls || ''}" title="${c.title || ''}">${cap}<span class="field color" data-colorbox="${c.prop}"><input type="color" data-prop="${c.prop}" list="wb-palette"><input type="number" class="alpha" data-alpha min="0" max="100" placeholder="100" title="진하기 % (낮추면 반투명)"><button class="clr" data-clear="${c.prop}" title="색 지우기">×</button></span></div>`;
      case 'overlay':
        return `<label class="ctl check ctl-overlay" title="${esc(c.title)}"><input type="checkbox" data-overlay><span class="cap">${c.cap}</span></label>`;
      case 'select':
        return `<label class="ctl ${c.cls || ''}">${cap}<select data-prop="${c.prop}">${opts(c.options)}</select></label>`;
      case 'toggles':
        return `<div class="ctl">${cap}<div class="seg">${c.items.map(([p, v, lab, t]) => `<button data-toggle="${p}" data-on="${v}" title="${t}">${lab}</button>`).join('')}</div></div>`;
      case 'seg':
        return `<div class="ctl">${cap}<div class="seg">${c.items.map(([v, lab, t]) => `<button data-set="${c.prop}" data-value="${v}" title="${t}">${lab}</button>`).join('')}</div></div>`;
      case 'range':
        return `<label class="ctl">${cap}<input type="range" min="5" max="100" data-prop="${c.prop}" data-range></label>`;
      case 'check':
        return `<label class="ctl check ${c.cls || ''}" title="${c.title || ''}"><input type="checkbox" data-check="${c.prop}" data-on="${c.on}"><span class="cap">${c.cap}</span></label>`;
      case 'border':
        return `<div class="ctl">${cap}<span class="field"><input type="number" data-bw min="0" placeholder="—"><i>px</i><select data-bside title="테두리를 그릴 쪽">${opts(SIDES)}</select></span></div>`;
      case 'gradient':
        return `<div class="ctl" title="배경색에서 이 색으로 자연스럽게 바뀌어요">${cap}<span class="field color" data-colorbox="grad"><select data-grad-dir>${opts(GRAD_DIRS)}</select><input type="color" data-grad-end value="#ffffff"></span></div>`;
      case 'bgimg':
        return `<div class="ctl">${cap}<span class="field"><button class="btn small pick" data-bgimg>그림…</button><button class="clr" data-bgimg-clear title="배경 그림 지우기">×</button></span></div>`;
      case 'cols':
        return `<label class="ctl ctl-cols">${cap}<input type="number" data-cols min="1" max="12"></label>`;
      case 'dir':
        return `<div class="ctl">${cap}<div class="seg dir-seg">${DIRS.map(([d, ic, lab, t]) => `<button data-dir="${d}" title="${t}"><b>${ic}</b>${lab}</button>`).join('')}</div></div>`;
      case 'align':
        // 피그마처럼: 9개 점 중 하나를 누르면 안의 요소가 그 자리로 모임
        return `<div class="ctl">${cap}<div class="align-grid" title="안의 요소를 모을 자리">${[...Array(9)].map((_, i) => `<button data-al="${i}" title="${ALIGN_NAMES[i]}"></button>`).join('')}</div></div>`;
      case 'sizemode':
        return `<div class="ctl ctl-size">${cap}<span class="field"><div class="seg mini">${SIZE_MODES.map(([m, lab, t]) => `<button data-sz="${c.axis}" data-mode="${m}" title="${t}">${lab}</button>`).join('')}</div><input type="text" data-szval="${c.axis}" placeholder="자동" spellcheck="false" title="숫자만 쓰면 px (예: 200, 50%)"></span></div>`;
      case 'pad':
        return `<div class="ctl" title="안쪽 여백: 가로(왼쪽·오른쪽) / 세로(위·아래)">${cap}<span class="field"><i class="pi">↔</i><input type="number" data-pad="x" min="0" placeholder="0"><i class="pi">↕</i><input type="number" data-pad="y" min="0" placeholder="0"></span></div>`;
      case 'shadow':
        return `<div class="ctl" title="그림자 모양과 색 (빛나기는 색이 퍼져요)">${cap}<span class="field color" data-colorbox="shadow"><select data-shadow-shape>${opts(SHADOW_SHAPES.map(([v, l]) => [v, l]))}</select><input type="color" data-shadow-color value="#000000"></span></div>`;
      case 'attrsel':
        return `<label class="ctl">${cap}<select data-attr-style="${c.attr}">${opts(c.options.map(([v, l]) => [v, l]))}</select></label>`;
      case 'sticky':
        return `<label class="ctl" title="스크롤해도 화면(또는 스크롤 상자) 위쪽·왼쪽에 붙어 있어요. 메뉴 줄, 표의 제목 줄·번호 칸에 좋아요">${cap}<select data-sticky><option value="">없음</option><option value="top">위에 붙기</option><option value="left">왼쪽에 붙기</option><option value="fixed-top">화면 위에 고정</option><option value="fixed-bottom">화면 아래에 고정</option><option value="fixed-br">화면 오른쪽 아래에 떠 있기</option></select></label>`;
      case 'attrcheck':
        return `<label class="ctl check" title="${c.title || ''}"><input type="checkbox" data-attr-flag="${c.attr}" data-on="${c.on}"><span class="cap">${c.cap}</span></label>`;
      case 'anchor': {
        const sides = c.axis === 'x' ? [['left', '왼쪽'], ['right', '오른쪽']] : [['top', '위'], ['bottom', '아래']];
        return `<div class="ctl">${cap}<span class="field"><div class="seg mini">${sides.map(([v, l]) => `<button data-anchor="${c.axis}" data-side="${v}" title="${l}에서 잰 거리">${l}</button>`).join('')}</div><input type="text" data-anchorval="${c.axis}" placeholder="0" spellcheck="false"></span></div>`;
      }
      case 'fnnum':
        return `<label class="ctl" title="${esc(c.title || '')}">${cap}<span class="field"><input type="number" data-fnprop="${c.prop}" data-fn="${c.fn}" data-unit="${c.unit}" min="0" step="${c.step || 1}" placeholder="—"><i>${c.unit}</i></span></label>`;
      case 'wraptext':
        return `<label class="ctl">${cap}<select data-wraptext><option value="">기본</option><option value="nowrap">한 줄로</option><option value="ellipsis">넘치면 …</option></select></label>`;
      case 'presets':
        return `<label class="ctl">${cap}<select data-preset><option value="">고르기…</option>${Object.entries(PRESETS).map(([k, p]) => `<option value="${k}">${p.label}</option>`).join('')}</select></label>`;
    }
    return '';
  }

  insp.innerHTML = `
    <div class="insp-target">
      <span class="t-name">선택 없음</span>
      <span class="t-tag"></span>
      <select class="t-fmt" data-fmt title="형식: 같은 형식을 쓰는 요소는 모양이 함께 바뀌어요 (「HTML 태그」의 「형식 · 이름」)"></select>
      <div class="seg mini t-state" title="마우스를 올렸을 때(:hover)의 스타일을 따로 정해요">
        <button data-state="">기본</button><button data-state="hover">마우스 올림</button>
      </div>
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
  // 숫자만 쓴 칸은 px (여러 값도: '8 8 0 0' → '8px 8px 0px 0px')
  const normSize = v => v.trim().split(/\s+/).map(t => (/^-?\d+(\.\d+)?$/.test(t) ? t + 'px' : t)).join(' ');
  /** 색 값 → { hex, a } (rgba 의 진하기 포함) */
  function parseColor(v) {
    if (!v) return { hex: '#000000', a: 1 };
    colorCtx.fillStyle = '#000000';
    colorCtx.fillStyle = v;
    const s = colorCtx.fillStyle;
    if (s.startsWith('#')) return { hex: s, a: 1 };
    const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
    return m ? { hex: '#' + [m[1], m[2], m[3]].map(x => (+x).toString(16).padStart(2, '0')).join(''), a: m[4] == null ? 1 : +m[4] } : { hex: '#000000', a: 1 };
  }

  function readCtl(t) {
    if (t.type === 'color') {
      const a = t.closest('.field')?.querySelector('[data-alpha]')?.value;
      if (a === '' || a == null || +a >= 100) return t.value;
      const [r, g, b] = [1, 3, 5].map(i => parseInt(t.value.slice(i, i + 2), 16));
      return `rgba(${r}, ${g}, ${b}, ${Math.max(0, +a) / 100})`;
    }
    if (t.type === 'number') return t.value === '' ? '' : t.value + (t.dataset.unit || '');
    if (t.dataset.size !== undefined) return normSize(t.value);
    if (t.dataset.range !== undefined) return t.value === '100' ? '' : String(t.value / 100);
    return t.value;
  }
  function writeCtl(t, v) {
    if (t.type === 'number') t.value = v ? parseFloat(v) || '' : '';
    else if (t.type === 'color') {
      const c = parseColor(v);
      t.value = c.hex;
      const al = t.closest('.field').querySelector('[data-alpha]');
      if (al && al !== document.activeElement) al.value = v && c.a < 1 ? Math.round(c.a * 100) : '';
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
    if (WB.kindOf(node) === 'text' && node.tag !== 'option') {
      f.push({ kind: 'text', cap: '글자', wide: true });
      if (node.tag !== 'button') f.push({ attr: 'contenteditable', check: 'true', cap: '보는 사람이 글자를 고칠 수 있게' });
    }
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
      case 'svg':
        if (node.attrs['data-icon']) f.push({ kind: 'icon', cap: '아이콘 바꾸기' });
        if (node.raw != null) break; // 가져온 아이콘은 차트가 아님
        f.push(
          { attr: 'data-chart', cap: '차트 종류', options: [['bar', '막대'], ['line', '선'], ['area', '영역'], ['donut', '도넛'], ['pie', '원']] },
          { attr: 'data-values', cap: '값 (쉼표로, 여러 묶음은 ; 로)', ph: '10,20,30;15,25,35', wide: true },
          { attr: 'data-labels', cap: '이름 (쉼표로)', ph: '1월,2월,3월', wide: true },
          { attr: 'data-colors', cap: '색 (쉼표로, 비우면 기본색)', ph: '#2f80ed,#f97316' },
        );
        break;
    }
    if (node.attrs['data-ui'] === 'switch') f.push({ kind: 'switch', cap: '처음에 켜짐' });
    if (['table', 'tr', 'td', 'th'].includes(node.tag)) f.push({ kind: 'table', cap: '표 편집' });
    if (node.tag === 'table') f.push({ attr: 'data-calc', bool: true, cap: '표 계산 (칸에 =A1+B1, =SUM(A1:A9) 쓰기)' });
    f.push({ attr: 'id', cap: '요소 이름 (id)', ph: '예: name-input' });
    f.push({ attr: 'class', cap: '이름표 (class, 띄어 써서 여러 개)', ph: '예: card', list: 'wb-classes' });
    return f;
  }

  function fieldHTML(f) {
    const cls = 'ctl' + (f.wide ? ' wide' : '');
    const cap = `<span class="cap">${f.cap}</span>`;
    if (f.kind === 'text') return `<label class="${cls}">${cap}<input type="text" data-node-text spellcheck="false"></label>`;
    if (f.kind === 'title') return `<label class="${cls}">${cap}<input type="text" data-doc-title spellcheck="false"></label>`;
    if (f.kind === 'options') return `<label class="${cls}">${cap}<textarea data-options rows="1" spellcheck="false"></textarea></label>`;
    if (f.kind === 'link') return `<label class="ctl check" title="이 요소의 스타일을 바꾸면 이름표가 같은 요소도 모두 똑같이 바뀌어요"><input type="checkbox" data-linkgroup><span class="cap">같은 이름표 요소에 함께 적용</span></label>`;
    if (f.kind === 'icon') return `<label class="ctl">${cap}<select data-icon-pick>${Object.entries(WB.ICON_SET).map(([k, [l]]) => `<option value="${k}">${esc(l)} (${k})</option>`).join('')}</select></label>`;
    if (f.kind === 'switch') return `<label class="ctl check"><input type="checkbox" data-switch-on><span class="cap">${f.cap}</span></label>`;
    if (f.kind === 'table') return `<div class="ctl">${cap}<div class="seg tbl-seg">${TABLE_ACTS.map(([a, l, t]) => `<button data-tbl="${a}" title="${t}">${l}</button>`).join('')}</div></div>`;
    if (f.bool) return `<label class="ctl check"><input type="checkbox" data-attr-bool="${f.attr}"><span class="cap">${f.cap}</span></label>`;
    if (f.check) return `<label class="ctl check"><input type="checkbox" data-attr-check="${f.attr}" data-on="${f.check}"><span class="cap">${f.cap}</span></label>`;
    if (f.options) return `<label class="ctl">${cap}<select data-attr="${f.attr}">${opts(f.options)}</select></label>`;
    const pick = f.pick ? `<button class="btn small pick" data-pick="${f.pick}" data-pick-attr="${f.attr}" title="내 컴퓨터에서 파일 고르기">파일…</button>` : '';
    return `<div class="${cls}">${cap}<span class="field"><input type="text" data-attr="${f.attr}" placeholder="${esc(f.ph || '')}" spellcheck="false"${f.list ? ` list="${f.list}"` : ''}>${pick}</span></div>`;
  }

  /* ---------- 표 편집 ---------- */
  const TABLE_ACTS = [
    ['rowAbove', '줄↑', '위에 줄 넣기'], ['rowBelow', '줄↓', '아래에 줄 넣기'], ['rowDel', '줄×', '이 줄 지우기'],
    ['colLeft', '칸←', '왼쪽에 칸 넣기'], ['colRight', '칸→', '오른쪽에 칸 넣기'], ['colDel', '칸×', '이 칸(세로줄) 지우기'],
    ['head', '제목칸', '이 줄을 제목 칸(th) ↔ 일반 칸(td)으로 바꾸기'],
    ['size', '크기…', '줄 수 × 칸 수를 한 번에 정하기 (스프레드시트처럼 A, B, C 제목 줄과 1, 2, 3 번호 칸도)'],
  ];
  const colName = n => { let s = ''; for (n++; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
  /** 표 크기 한 번에: 있던 칸 글자는 그대로 두고 모자라면 만들고 남으면 지움 */
  function tableSize(id) {
    const doc = WB.canvasDoc();
    const path = WB.pathTo(doc.root, id);
    const table = [...path].reverse().find(n => n.tag === 'table');
    if (!table) return;
    const rows = table.children.filter(n => n.tag === 'tr');
    const isHead = r => r.children.length && r.children.every(c => c.tag === 'th');
    const hasHead = rows[0] && isHead(rows[0]);
    const dataRows = rows.filter(r => !isHead(r));
    const hasNums = dataRows.length > 0 && dataRows.every(r => r.children[0]?.tag === 'th');
    const cellsOf = r => r.children.filter(c => c.tag === 'td');
    const nR = h('input', { type: 'number', min: '1', max: '500', value: String(dataRows.length || 3) });
    const nC = h('input', { type: 'number', min: '1', max: '52', value: String(Math.max(1, ...dataRows.map(r => cellsOf(r).length))) });
    const head = h('input', { type: 'checkbox', checked: hasHead || null });
    const nums = h('input', { type: 'checkbox', checked: hasNums || null });
    const body = h('div', { class: 'tbl-size' },
      h('label', {}, '줄 수 ', nR), h('label', {}, '칸 수 ', nC),
      h('label', { class: 'check' }, head, ' 맨 위에 A, B, C … 제목 줄'),
      h('label', { class: 'check' }, nums, ' 맨 왼쪽에 1, 2, 3 … 번호 칸'),
      h('p', { class: 'hint' }, '있던 칸의 글자는 그대로 남아요. 칸 수를 줄이면 오른쪽부터, 줄 수를 줄이면 아래부터 지워져요.'));
    WB.modal({
      title: '표 크기 정하기',
      content: body,
      actions: [
        { label: '취소', onClick: close => close() },
        { label: '정하기', primary: true, onClick: close => {
          const R = Math.max(1, Math.min(500, parseInt(nR.value) || 1)), C = Math.max(1, Math.min(52, parseInt(nC.value) || 1));
          WB.commit(d => {
            const t = WB.find(d.root, table.id).node;
            const trs = t.children.filter(n => n.tag === 'tr');
            const oldHead = trs[0] && isHead(trs[0]) ? trs[0] : null;
            const data = trs.filter(r => !isHead(r));
            const tplTd = data.flatMap(cellsOf)[0];
            const tplTh = oldHead?.children[0] || data.find(r => r.children[0]?.tag === 'th')?.children[0];
            const thStyle = { ...(tplTh?.style || { 'background-color': '#f8f9fa', color: '#444746', 'border-width': '1px', 'border-style': 'solid', 'border-color': '#e1e3e1', padding: '4px', 'text-align': 'center' }) };
            const newTd = () => WB.makeNode('td', { text: '', style: { ...(tplTd?.style || { 'border-width': '1px', 'border-style': 'solid', 'border-color': '#e1e3e1', padding: '4px 8px' }) } });
            const tdAttrs = Object.fromEntries(Object.entries(tplTd?.attrs || {}).filter(([k]) => k !== 'id'));
            const out = [];
            if (head.checked) {
              const hr = oldHead || WB.makeNode('tr', { children: [] });
              hr.children = [...(nums.checked ? [WB.makeNode('th', { text: '', style: { ...thStyle } })] : []),
                ...Array.from({ length: C }, (_, j) => WB.makeNode('th', { text: colName(j), style: { ...thStyle } }))];
              out.push(hr);
            }
            for (let i = 0; i < R; i++) {
              const old = data[i];
              const tds = old ? cellsOf(old) : [];
              const cells = Array.from({ length: C }, (_, j) => tds[j] || Object.assign(newTd(), { attrs: { ...tdAttrs } }));
              const tr = old || WB.makeNode('tr', { children: [] });
              const num = old?.children[0]?.tag === 'th' ? old.children[0] : WB.makeNode('th', { text: '', style: { ...thStyle } });
              if (nums.checked) num.text = String(i + 1);
              tr.children = [...(nums.checked ? [num] : []), ...cells];
              out.push(tr);
            }
            t.children = out;
          }, `table-size:${Date.now()}`);
          close();
        } },
      ],
    });
  }
  function tableAction(id, act) {
    if (act === 'size') return tableSize(id);
    WB.commit(doc => {
      const path = WB.pathTo(doc.root, id);
      const table = [...path].reverse().find(n => n.tag === 'table');
      const tr = [...path].reverse().find(n => n.tag === 'tr');
      const cell = [...path].reverse().find(n => n.tag === 'td' || n.tag === 'th');
      if (!table) return;
      const rows = table.children.filter(n => n.tag === 'tr');
      const ri = tr ? rows.indexOf(tr) : rows.length - 1;
      const ci = tr && cell ? tr.children.indexOf(cell) : -1;
      const like = c => WB.makeNode('td', { text: '', style: { ...(c?.style || {}) } });
      if (act === 'rowAbove' || act === 'rowBelow') {
        const base = rows[ri] || rows[0];
        const nr = WB.makeNode('tr', { children: (base ? base.children : [null]).map(c => like(c)) });
        table.children.splice(table.children.indexOf(base) + (act === 'rowBelow' ? 1 : 0), 0, nr);
      } else if (act === 'rowDel' && tr && rows.length > 1) table.children.splice(table.children.indexOf(tr), 1);
      else if (act === 'colLeft' || act === 'colRight') {
        const at = ci < 0 ? Infinity : ci + (act === 'colRight' ? 1 : 0);
        for (const r of rows) r.children.splice(Math.min(at, r.children.length), 0, Object.assign(like(r.children[Math.max(0, Math.min(ci, r.children.length - 1))]), { tag: r.children[0]?.tag === 'th' ? 'th' : 'td' }));
      } else if (act === 'colDel' && ci >= 0 && tr.children.length > 1) for (const r of rows) r.children.splice(ci, 1);
      else if (act === 'head' && tr) {
        const to = tr.children[0]?.tag === 'th' ? 'td' : 'th';
        tr.children.forEach(c => (c.tag = to));
      }
    }, `table:${Date.now()}`);
    const doc = WB.canvasDoc();
    if (!WB.find(doc.root, id)) WB.select(null);
  }

  /* ---------- 새로 고침 ---------- */
  const dirOf = node => {
    const st = WB.styleOf(node);
    if (WB.isFree(node)) return 'free';
    if (st.display === 'grid') return 'grid';
    if (!(st.display || '').includes('flex')) return 'block';
    if (st['flex-direction'] === 'column') return 'column';
    return st['flex-wrap'] === 'wrap' ? 'wrap' : 'row';
  };

  /* ---------- 정렬 9칸 (피그마 Auto layout 처럼) ----------
     가로 배치: 가로 = justify-content, 세로 = align-items
     세로 배치: 세로 = justify-content, 가로 = align-items
     격자:      가로 = justify-items,   세로 = align-items */
  const FLEX_VALS = ['flex-start', 'center', 'flex-end'];
  const GRID_VALS = ['start', 'center', 'end'];
  const valIndex = v => ({ 'flex-start': 0, start: 0, center: 1, 'flex-end': 2, end: 2 })[v] ?? 0;
  function alignProps(dir) {
    if (dir === 'column') return { x: 'align-items', y: 'justify-content', main: 'y' };
    if (dir === 'grid') return { x: 'justify-items', y: 'align-items', main: null };
    if (dir === 'row' || dir === 'wrap') return { x: 'justify-content', y: 'align-items', main: 'x' };
    return null;
  }
  function alignState(node) {
    const P = alignProps(dirOf(node));
    if (!P) return null;
    const st = WB.styleOf(node);
    const between = !!P.main && st['justify-content'] === 'space-between';
    return { x: valIndex(st[P.x]), y: valIndex(st[P.y]), main: P.main, between };
  }
  function setAlign(id, i) {
    let node = WB.find(WB.canvasDoc().root, id).node;
    const d = dirOf(node);
    if (d === 'free') return WB.toast('자유 배치에서는 요소를 직접 끌어서 놓아요');
    if (d === 'block') { setDirection(id, 'column'); node = WB.find(WB.canvasDoc().root, id).node; } // 정렬하려면 세로 배치로
    const dir = dirOf(node), P = alignProps(dir);
    const vals = dir === 'grid' ? GRID_VALS : FLEX_VALS;
    const s = { [P.x]: vals[i % 3], [P.y]: vals[Math.floor(i / 3)] };
    if (P.main && WB.styleOf(node)['justify-content'] === 'space-between') delete s['justify-content']; // 양끝 벌리기면 교차축만
    WB.setStyles(id, s, `align:${id}:${Date.now()}`);
  }

  /* ---------- 크기: 고정 · 맞춤 · 채우기 ----------
     채우기는 부모 배치에 따라: 가로/세로 배치의 주축이면 flex-grow, 교차축이면 align-self: stretch, 아니면 100% */
  function axisInfo(parent, axis) {
    const ps = WB.styleOf(parent);
    const flex = (ps.display || '').includes('flex');
    const row = flex && ps['flex-direction'] !== 'column';
    return { flex, main: flex && (axis === 'w') === row, prop: axis === 'w' ? 'width' : 'height' };
  }
  function sizeMode(node, parent, axis) {
    const { flex, main, prop } = axisInfo(parent, axis);
    const st = WB.styleOf(node);
    if (flex && main && st['flex-grow'] === '1') return 'fill';
    if (flex && !main && st['align-self'] === 'stretch') return 'fill';
    if (st[prop] === '100%') return 'fill';
    if (st[prop] === 'fit-content') return 'hug';
    if (st[prop] === SCREEN[axis]) return 'screen';
    if (st[prop] && st[prop] !== 'auto') return 'fixed';
    return '';
  }
  function setSize(id, axis, mode, value) {
    const doc = WB.canvasDoc();
    const f = WB.find(doc.root, id);
    const { flex, main, prop } = axisInfo(f.parent, axis);
    const s = { [prop]: '' };
    if (main) Object.assign(s, { 'flex-grow': '', [axis === 'w' ? 'min-width' : 'min-height']: '' });
    if (flex && !main) s['align-self'] = '';
    if (mode === 'fixed') {
      const r = WB.measureEl(id);
      s[prop] = value || (r ? Math.round(axis === 'w' ? r.width : r.height) + 'px' : '');
    } else if (mode === 'hug') s[prop] = 'fit-content';
    else if (mode === 'screen') s[prop] = SCREEN[axis];
    else if (mode === 'fill') {
      if (flex && main) Object.assign(s, { 'flex-grow': '1', [axis === 'w' ? 'min-width' : 'min-height']: '0' });
      else if (flex) s['align-self'] = 'stretch';
      else s[prop] = '100%';
    }
    WB.setStyles(id, s, `size:${id}:${axis}:${Date.now()}`);
  }
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
    tTag.innerHTML = esc(node.id === 'root' ? '<body>' : `<${node.tag}>`) + WB.idClassChips(doc, node);
    tHint.textContent = '';

    const isContainer = WB.kindOf(node) === 'container';
    layoutGroup.classList.toggle('hidden', !isContainer);
    const st = WB.styleOf(node);
    const focused = document.activeElement;
    insp.querySelectorAll('[data-prop]').forEach(t => { if (t !== focused) writeCtl(t, st[t.dataset.prop]); });
    insp.querySelectorAll('[data-toggle]').forEach(b => b.classList.toggle('on', st[b.dataset.toggle] === b.dataset.on || (b.dataset.toggle === 'font-weight' && st['font-weight'] === 'bold')));
    insp.querySelectorAll('[data-set]').forEach(b => b.classList.toggle('on', st[b.dataset.set] === b.dataset.value));
    insp.querySelectorAll('[data-check]').forEach(c => (c.checked = st[c.dataset.check] === c.dataset.on));
    const dir = dirOf(node);
    insp.querySelectorAll('[data-dir]').forEach(b => b.classList.toggle('on', b.dataset.dir === dir));
    layoutGroup.querySelectorAll('.ctl:not(:first-child)').forEach(c => (c.style.opacity = dir === 'block' || dir === 'free' ? '.4' : ''));
    layoutGroup.querySelector('.ctl-cols').hidden = dir !== 'grid';
    const cols = insp.querySelector('[data-cols]');
    if (cols !== focused) cols.value = (String(st['grid-template-columns'] || '').match(/repeat\((\d+)/) || [])[1] || '';

    // 테두리 (두께 + 그릴 쪽)
    const bd = parseBorder(st['border-width']);
    const bw = insp.querySelector('[data-bw]');
    if (bw !== focused) bw.value = bd.w;
    insp.querySelector('[data-bside]').value = bd.side;
    // 그라데이션
    const gm = String(st['background-image'] || '').match(GRAD_RE);
    insp.querySelector('[data-grad-dir]').value = gm ? gm[1] : '';
    const ge = insp.querySelector('[data-grad-end]');
    if (ge !== focused) ge.value = gm ? toHex(gm[3]) : '#ffffff';
    ge.closest('.field').classList.toggle('empty', !gm);
    posGroup.classList.toggle('hidden', st.position !== 'absolute');

    // 정렬 9칸: 지금 모여 있는 자리 표시
    const al = alignState(node);
    insp.querySelectorAll('[data-al]').forEach(b => {
      const i = +b.dataset.al, x = i % 3, y = Math.floor(i / 3);
      const on = al && (al.between ? (al.main === 'x' ? y === al.y : x === al.x) : x === al.x && y === al.y);
      b.classList.toggle('on', !!on);
    });
    layoutGroup.querySelector('.ctl-between').hidden = !['row', 'column', 'wrap'].includes(dir);

    // 크기 (고정 · 맞춤 · 채우기)
    const parent = node.id === 'root' ? null : WB.find(doc.root, node.id)?.parent;
    insp.querySelectorAll('.ctl-size').forEach(c => (c.hidden = !parent));
    for (const axis of ['w', 'h']) {
      const mode = parent ? sizeMode(node, parent, axis) : '';
      insp.querySelectorAll(`[data-sz="${axis}"]`).forEach(b => b.classList.toggle('on', b.dataset.mode === mode));
      const inp = insp.querySelector(`[data-szval="${axis}"]`);
      if (inp !== focused) {
        const v = st[axis === 'w' ? 'width' : 'height'];
        inp.value = mode === 'fixed' ? v || '' : '';
        inp.placeholder = mode === 'fill' ? '채우기' : mode === 'hug' ? '맞춤' : '자동';
      }
    }
    // 안쪽 여백 ↔ ↕
    const [pt, pr, pb, pl] = parsePad(st.padding);
    const px = insp.querySelector('[data-pad="x"]'), py = insp.querySelector('[data-pad="y"]');
    if (px !== focused) px.value = pl === pr ? parseFloat(pl) || '' : '';
    if (py !== focused) py.value = pt === pb ? parseFloat(pt) || '' : '';
    // 줄바꿈
    insp.querySelector('[data-wraptext]').value = st['text-overflow'] === 'ellipsis' ? 'ellipsis' : st['white-space'] === 'nowrap' ? 'nowrap' : '';
    // 그림 맞추기 · 줄어들지 않게: 해당될 때만
    insp.querySelector('.ctl-fit').hidden = !['img', 'video', 'iframe'].includes(node.tag);
    insp.querySelector('.ctl-shrink').hidden = !(parent && (WB.styleOf(parent).display || '').includes('flex'));
    // 그림자 (모양 + 색)
    const sh = parseShadow(st['box-shadow']);
    insp.querySelector('[data-shadow-shape]').value = sh.shape;
    const sc = insp.querySelector('[data-shadow-color]');
    if (sc !== focused) sc.value = sh.color;
    sc.closest('.field').classList.toggle('empty', !sh.shape);
    // 마우스 올리면 · 스크롤하면 나타나기 (속성)
    insp.querySelectorAll('[data-attr-style]').forEach(s => (s.value = node.attrs[s.dataset.attrStyle] || ''));
    insp.querySelector('[data-sticky]').value = st.position === 'fixed' ? (st.top === '0' ? 'fixed-top' : st.left === '0' ? 'fixed-bottom' : 'fixed-br') : st.position !== 'sticky' ? '' : st.left && !st.top ? 'left' : 'top';
    insp.querySelectorAll('[data-fnprop]').forEach(t => {
      if (t === focused) return;
      const m = String(st[t.dataset.fnprop] || '').match(new RegExp(t.dataset.fn + '\\(([\\d.]+)'));
      t.value = m ? m[1] : '';
    });
    // 형식 고르기
    const fsel = insp.querySelector('[data-fmt]');
    const fnames = Object.keys(doc.formats || {}), fnow = node.id === 'root' ? '' : WB.formatOf(doc, node);
    fsel.hidden = node.id === 'root';
    fsel.innerHTML = `<option value="">형식 없음</option>${fnames.map(n => `<option value="${esc(n)}">형식 .${esc(n)}</option>`).join('')}<option value="__new">＋ 이 모양으로 새 형식…</option>`;
    fsel.value = fnow;
    fsel.classList.toggle('on', !!fnow);
    let dl = document.getElementById('wb-classes');
    if (!dl) document.body.append((dl = h('datalist', { id: 'wb-classes' })));
    const cls = new Set(fnames);
    WB.walk(doc.root, n => (n.attrs?.class || '').split(/\s+/).filter(Boolean).forEach(c => cls.add(c)));
    dl.innerHTML = [...cls].map(c => `<option value="${esc(c)}">`).join('');
    insp.querySelectorAll('[data-attr-flag]').forEach(c => (c.checked = node.attrs[c.dataset.attrFlag] === c.dataset.on));
    // 자유 배치 위치: 기준(왼쪽/오른쪽, 위/아래) + 거리
    for (const [axis, a, b] of [['x', 'left', 'right'], ['y', 'top', 'bottom']]) {
      const side = st[b] && !st[a] ? b : a;
      insp.querySelectorAll(`[data-anchor="${axis}"]`).forEach(x => x.classList.toggle('on', x.dataset.side === side));
      const inp = insp.querySelector(`[data-anchorval="${axis}"]`);
      if (inp !== focused) inp.value = st[side] || '';
    }
    // 휴대폰 화면 전용으로 고치는 중이면 알려 줌
    const variant = WB.editVariant();
    tHint.textContent = { mobile: '📱 휴대폰 화면 전용으로 고치는 중', tablet: '📱 태블릿 화면 전용으로 고치는 중 (휴대폰에도 적용)', hover: '🖱 마우스를 올렸을 때 모습을 고치는 중' }[variant]
      || (fnow ? `🔗 요소 ${WB.formatMembers(doc, fnow).length}개가 모양을 함께 써요` : '');
    tHint.classList.toggle('mobile', !!variant);
    insp.querySelectorAll('[data-state]').forEach(b => b.classList.toggle('on', b.dataset.state === (WB.settings.state || '')));
    // 해당될 때만 보이는 칸들
    insp.querySelectorAll('.ctl-accent').forEach(c => (c.hidden = !(node.tag === 'input' && ['checkbox', 'radio', 'range'].includes(node.attrs.type))));
    insp.querySelectorAll('.ctl-switch').forEach(c => (c.hidden = node.attrs['data-ui'] !== 'switch'));
    layoutGroup.querySelector('.ctl-baseline').hidden = !['row', 'wrap'].includes(dir);
    const ovl = insp.querySelector('.ctl-overlay');
    ovl.hidden = !parent || WB.isFree(parent);
    ovl.querySelector('input').checked = st.position === 'absolute';

    const key = node.id + '|' + node.tag + '|' + (node.attrs.type || '') + '|' + !!node.attrs.class;
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
    const ip = attrRow.querySelector('[data-icon-pick]');
    if (ip) ip.value = node.attrs['data-icon'];
    const so = attrRow.querySelector('[data-switch-on]');
    if (so) so.checked = node.children?.some(c => c.tag === 'input' && c.attrs.checked != null);
    const lg = attrRow.querySelector('[data-linkgroup]');
    if (lg) lg.checked = !!WB.settings.linkGroup;
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
    let t = e.target;
    if (t.dataset.alpha !== undefined) t = t.closest('.field').querySelector('input[type=color]'); // 진하기를 바꾸면 그 색 칸을 다시 씀
    const id = targetId();
    if (!id) return;
    const isChange = e.type === 'change';
    const changeOnly = t.tagName === 'SELECT' || t.type === 'checkbox' || t.dataset.attr === 'class'; // 이름표는 다 쓴 뒤에 (쓰는 도중의 이름이 형식과 겹치지 않게)
    if (changeOnly !== isChange) return;

    const st = WB.selectedNode() ? WB.styleOf(WB.selectedNode()) : {};
    if (t.dataset.fmt !== undefined) {
      const doc = WB.canvasDoc();
      if (id === 'root') return;
      if (t.value === '__new') WB.formatCreateAsk();
      else if (t.value) WB.formatApply(t.value, id);
      else WB.formatDetach(id);
      refresh();
    } else if (t.dataset.fnprop) {
      const v = t.value === '' || +t.value === 0 ? '' : `${t.dataset.fn}(${t.value}${t.dataset.unit})`;
      WB.setStyle(id, t.dataset.fnprop, v);
    } else if (t.dataset.bw !== undefined || t.dataset.bside !== undefined) {
      // 테두리: 두께와 그릴 쪽을 함께 'border-width' 로. 두께만 정해도 바로 보이도록 선 모양·색도 채움
      const w = insp.querySelector('[data-bw]').value;
      const side = insp.querySelector('[data-bside]').value;
      if (w === '') WB.setStyle(id, 'border-width', '', `style:${id}:border-width`);
      else WB.setStyles(id, {
        'border-width': makeBorder(w, side),
        'border-style': st['border-style'] && st['border-style'] !== 'none' ? st['border-style'] : 'solid',
        'border-color': st['border-color'] || '#cccccc',
      }, `style:${id}:border-width`);
    } else if (t.dataset.gradDir !== undefined || t.dataset.gradEnd !== undefined) {
      const dirV = insp.querySelector('[data-grad-dir]').value || (t.dataset.gradEnd !== undefined ? 'to right' : '');
      const end = insp.querySelector('[data-grad-end]').value;
      WB.setStyle(id, 'background-image', dirV ? makeGrad(dirV, st['background-color'], end) : '', `style:${id}:grad`);
    } else if (t.dataset.shadowShape !== undefined || t.dataset.shadowColor !== undefined) {
      let shape = insp.querySelector('[data-shadow-shape]').value;
      if (!shape && t.dataset.shadowColor !== undefined) shape = SHADOW_SHAPES[2][0]; // 색만 고르면 '보통' 그림자로
      WB.setStyle(id, 'box-shadow', makeShadow(shape, insp.querySelector('[data-shadow-color]').value), `style:${id}:shadow`);
    } else if (t.dataset.attrStyle) {
      WB.setAttr(id, t.dataset.attrStyle, t.value || null, `attr:${id}:${t.dataset.attrStyle}:${Date.now()}`);
    } else if (t.dataset.sticky !== undefined) {
      const STICKY = {
        '': { position: '', top: '', left: '', 'z-index': '' },
        top: { position: 'sticky', top: '0', left: '', 'z-index': '10' },
        left: { position: 'sticky', left: '0', top: '', 'z-index': '5' },
        'fixed-top': { position: 'fixed', top: '0', left: '0', right: '0', bottom: '', 'z-index': '100' },
        'fixed-bottom': { position: 'fixed', bottom: '0', left: '0', right: '0', top: '', 'z-index': '100' },
        'fixed-br': { position: 'fixed', right: '24px', bottom: '24px', left: '', top: '', 'z-index': '100' },
      };
      if (!t.value) Object.assign(STICKY[''], { right: '', bottom: '' });
      WB.setStyles(id, STICKY[t.value]);
    } else if (t.dataset.attrFlag) {
      WB.setAttr(id, t.dataset.attrFlag, t.checked ? t.dataset.on : null);
    } else if (t.dataset.overlay !== undefined) {
      setOverlay(id, t.checked);
    } else if (t.dataset.iconPick !== undefined) {
      WB.commit(doc => {
        const n = WB.find(doc.root, id).node;
        n.attrs['data-icon'] = t.value;
        n.raw = WB.ICON_SET[t.value][1];
      }, `icon:${id}`);
    } else if (t.dataset.switchOn !== undefined) {
      WB.commit(doc => {
        const inp = WB.find(doc.root, id).node.children.find(c => c.tag === 'input');
        if (!inp) return;
        if (t.checked) inp.attrs.checked = '';
        else delete inp.attrs.checked;
      }, `switch:${id}`);
    } else if (t.dataset.anchorval) {
      const [a, b] = t.dataset.anchorval === 'x' ? ['left', 'right'] : ['top', 'bottom'];
      const side = st[b] && !st[a] ? b : a;
      WB.setStyle(id, side, normSize(t.value) || '0px', `style:${id}:${side}`);
    } else if (t.dataset.linkgroup !== undefined) {
      WB.settings.linkGroup = t.checked;
      WB.saveSettings();
      if (t.checked) WB.toast(`이제 이름표 '${WB.groupOf(WB.selectedNode())}' 요소들이 함께 바뀌어요`);
    } else if (t.dataset.szval) {
      // 크기 칸에 직접 쓰면 '고정'
      const v = normSize(t.value);
      if (v) setSize(id, t.dataset.szval, 'fixed', v);
      else setSize(id, t.dataset.szval, '');
    } else if (t.dataset.pad) {
      const p = parsePad(st.padding);
      const v = t.value === '' ? '0' : t.value + 'px';
      if (t.dataset.pad === 'x') p[1] = p[3] = v;
      else p[0] = p[2] = v;
      WB.setStyle(id, 'padding', makePad(p), `style:${id}:pad-${t.dataset.pad}`);
    } else if (t.dataset.wraptext !== undefined) {
      const m = t.value;
      WB.setStyles(id, {
        'white-space': m ? 'nowrap' : '',
        overflow: m === 'ellipsis' ? 'hidden' : '',
        'text-overflow': m === 'ellipsis' ? 'ellipsis' : '',
      });
    } else if (t.dataset.cols !== undefined) {
      const n = Math.max(1, Math.min(12, parseInt(t.value) || 1));
      WB.setStyle(id, 'grid-template-columns', `repeat(${n}, 1fr)`, `style:${id}:cols`);
    } else if (t.dataset.prop) {
      const prop = t.dataset.prop;
      const v = readCtl(t);
      const gm = String(st['background-image'] || '').match(GRAD_RE);
      if (prop === 'background-color' && gm) {
        // 그라데이션이 있으면 시작 색도 함께 바꿈
        WB.setStyles(id, { 'background-color': v, 'background-image': makeGrad(gm[1], v, gm[3]) }, `style:${id}:${prop}`);
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
  // 상태: 기본 / 마우스 올림 (:hover) — 고른 묶음에 스타일을 씀
  insp.querySelector('.t-state').addEventListener('click', e => {
    const b = e.target.closest('[data-state]');
    if (!b) return;
    WB.settings.state = b.dataset.state;
    WB.saveSettings();
    WB.renderCanvas();
    refresh();
  });
  // 꼬리표(#id · .이름표)를 누르면 속성의 그 칸으로
  tTag.addEventListener('click', e => {
    const which = e.target.closest('[data-chip]')?.dataset.chip;
    const f = which && attrRow.querySelector(`[data-attr="${which}"]`);
    if (!f) return;
    f.scrollIntoView({ block: 'nearest' });
    f.focus();
    f.select();
  });
  // 그룹 제목을 누르면 접기 / 펴기 (피그마 오른쪽 패널처럼)
  const shut = new Set(WB.settings.inspShut || []);
  insp.querySelectorAll('.insp-group').forEach(g => g.classList.toggle('shut', shut.has(g.dataset.group)));
  insp.addEventListener('click', e => {
    const t = e.target.closest('.g-title');
    if (!t) return;
    const g = t.closest('.insp-group');
    g.classList.toggle('shut');
    if (g.classList.contains('shut')) shut.add(g.dataset.group); else shut.delete(g.dataset.group);
    WB.settings.inspShut = [...shut];
    WB.saveSettings();
  });
  insp.addEventListener('input', onEdit);
  insp.addEventListener('change', onEdit);
  insp.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.target.blur(); });

  insp.addEventListener('click', e => {
    const b = e.target.closest('button');
    const id = targetId();
    if (!b || !id) return;
    const st = WB.styleOf(WB.selectedNode() || WB.canvasDoc().root);
    if (b.dataset.clear) WB.setStyle(id, b.dataset.clear, '');
    else if (b.dataset.toggle) {
      const p = b.dataset.toggle;
      WB.setStyle(id, p, b.classList.contains('on') ? '' : b.dataset.on, `toggle:${id}:${p}:${Date.now()}`);
    } else if (b.dataset.set) {
      const p = b.dataset.set;
      WB.setStyle(id, p, st[p] === b.dataset.value ? '' : b.dataset.value, `set:${id}:${p}:${Date.now()}`);
    } else if (b.dataset.dir) setDirection(id, b.dataset.dir);
    else if (b.dataset.al) setAlign(id, +b.dataset.al);
    else if (b.dataset.tbl) tableAction(id, b.dataset.tbl);
    else if (b.dataset.anchor) {
      // 기준 바꾸기: 화면에서 보이는 자리는 그대로 두고 거리만 다시 잼
      const [a, bb] = b.dataset.anchor === 'x' ? ['left', 'right'] : ['top', 'bottom'];
      const to = b.dataset.side, from = to === a ? bb : a;
      if (!st[from] && to === a) return;
      const doc = WB.canvasDoc();
      const parentId = WB.find(doc.root, id).parent.id;
      const me = WB.measureEl(id), box = WB.measureEl(parentId);
      if (!me || !box) return;
      const dist = b.dataset.anchor === 'x'
        ? (to === 'left' ? me.left - box.left : box.right - me.right)
        : (to === 'top' ? me.top - box.top : box.bottom - me.bottom);
      WB.setStyles(id, { [from]: '', [to]: Math.round(dist) + 'px' }, `anchor:${id}:${Date.now()}`);
    }
    else if (b.dataset.sz) setSize(id, b.dataset.sz, b.classList.contains('on') ? '' : b.dataset.mode);
    else if (b.dataset.pick) pickFile(id, b.dataset.pick, b.dataset.pickAttr);
    else if (b.dataset.bgimg !== undefined) pickFile(id, 'image/*', null);
    else if (b.dataset.bgimgClear !== undefined) WB.setStyles(id, { 'background-image': '', 'background-size': '', 'background-position': '' });
    else if (b === tReset) WB.setStyles(id, Object.fromEntries(Object.keys(st).map(k => [k, ''])));
  });

  /** 띄워서 겹치기: 지금 보이는 자리에 그대로 띄움 (부모는 기준이 되도록 position: relative) */
  function setOverlay(id, on) {
    const doc = WB.canvasDoc();
    const f = WB.find(doc.root, id);
    if (!f || !f.parent) return;
    if (!on) return WB.setStyles(id, { position: '', left: '', top: '', right: '', bottom: '', 'z-index': '' }, `overlay:${id}`);
    const me = WB.measureEl(id), box = WB.measureEl(f.parent.id);
    if (!me || !box) return;
    WB.commit(d => {
      const p = WB.find(d.root, f.parent.id).node, n = WB.find(d.root, id).node;
      const pst = p.id === 'root' ? null : p.style;
      if (pst && (!pst.position || pst.position === 'static')) pst.position = 'relative';
      Object.assign(n.style, { position: 'absolute', left: Math.round(me.left - box.left) + 'px', top: Math.round(me.top - box.top) + 'px', 'z-index': n.style['z-index'] || '2' });
      if (!n.style.width && WB.kindOf(n) !== 'void') n.style.width = Math.round(me.width) + 'px'; // 띄워도 폭이 그대로 보이게
      delete n.style.right;
      delete n.style.bottom;
    }, `overlay:${id}`);
  }

  /** 상자의 배치 방향 바꾸기. '자유'로 바꾸면 안의 요소들이 지금 보이는 자리에 그대로 고정됨 */
  function setDirection(id, dir) {
    const FLEX = ['display', 'flex-direction', 'gap', 'justify-content', 'align-items', 'flex-wrap', 'grid-template-columns', 'justify-items'];
    if (WB.mobileEdit()) {
      // 휴대폰 화면에서는 컴퓨터 화면 설정을 덮어쓰는 값으로 (예: 가로 → 세로로 쌓기)
      if (dir === 'free') return WB.toast('자유 배치는 컴퓨터 화면 보기에서 바꿔 주세요');
      const over = {
        block: { display: 'block' },
        column: { display: 'flex', 'flex-direction': 'column', 'flex-wrap': 'nowrap' },
        row: { display: 'flex', 'flex-direction': 'row', 'flex-wrap': 'nowrap' },
        wrap: { display: 'flex', 'flex-direction': 'row', 'flex-wrap': 'wrap' },
        grid: { display: 'grid', 'grid-template-columns': 'repeat(1, 1fr)' },
      }[dir];
      return WB.setStyles(id, over, `dir:${id}:${Date.now()}`);
    }
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
          if (p && !c.style.width && WB.kindOf(c) !== 'void') c.style.width = p.w + 'px'; // 꺼내도 폭이 그대로 보이게
        }
      } else if (dir === 'grid') {
        FLEX.forEach(k => k !== 'gap' && delete n.style[k]);
        Object.assign(n.style, { display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', gap: n.style.gap || '12px' });
      } else {
        delete n.style['grid-template-columns'];
        delete n.style['justify-items'];
        Object.assign(n.style, { display: 'flex', 'flex-direction': dir === 'wrap' ? 'row' : dir, gap: n.style.gap || '12px' });
        if (dir === 'wrap') n.style['flex-wrap'] = 'wrap';
        else delete n.style['flex-wrap'];
      }
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
        if (attr) WB.setAttr(id, attr, src, `pick:${Date.now()}`);
        else WB.setStyles(id, { 'background-image': `url("${src}")`, 'background-size': 'cover', 'background-position': 'center' }, `pick:${Date.now()}`); // 배경 그림
      } catch (err) {
        WB.toast('파일을 넣지 못했어요: ' + err.message, 'error');
      }
    };
    input.click();
  }

  WB.on('select', refresh);
  WB.on('change', refresh);
  WB.on('doc', refresh);
  WB.on('device', refresh);
  WB.on('focus-text', () => {
    if (WB.settings.tool !== 'css') WB.setTool('css'); // 글자 칸이 있는 CSS 디자인 탭으로
    const t = attrRow.querySelector('[data-node-text]');
    if (t) { t.focus(); t.select(); }
  });
  refresh();
})();
