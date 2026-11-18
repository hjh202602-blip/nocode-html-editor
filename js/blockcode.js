'use strict';
/* 탭5 블록 코딩 (엔트리 방식) — 블록 종류 · 블록 데이터 다루기 · 블록 → JavaScript 코드
   blocks = { scripts: [{ x, y, blocks: [block, …] }], vars: ['점수'], signals: ['게임 시작'] }
   block  = { id, type, args: { 이름: 글자 | 값 블록 }, body: [...], body2: [...] } */
(() => {
  /* 엔트리와 같은 분류 · 색 */
  WB.BLOCK_CATS = [
    { id: 'start', name: '이벤트', c: '#c8862a', icon: '▶' },
    { id: 'flow', name: '흐름', c: '#3f8fc4', icon: '⟳' },
    { id: 'looks', name: '화면', c: '#2f9e8f', icon: '✦' },
    { id: 'moving', name: '움직임', c: '#8472c9', icon: '✥' },
    { id: 'sound', name: '소리', c: '#7d9440', icon: '♪' },
    { id: 'judgement', name: '조건', c: '#5b72d6', icon: '?' },
    { id: 'calc', name: '계산 · 글자', c: '#6b7c93', icon: '±' },
    { id: 'variable', name: '데이터', c: '#b0609a', icon: '▤' },
    { id: 'func', name: '함수', c: '#c06a4a', icon: 'ƒ' },
    { id: 'adv', name: '고급', c: '#8a8f98', icon: '{}' },
  ];

  const KEYS = [
    [' ', '스페이스'], ['Enter', '엔터'], ['ArrowUp', '위쪽 화살표'], ['ArrowDown', '아래쪽 화살표'],
    ['ArrowLeft', '왼쪽 화살표'], ['ArrowRight', '오른쪽 화살표'],
    ['Tab', '탭'], ['Escape', 'Esc'], ['Backspace', '백스페이스'], ['Delete', 'Delete'],
    ...'abcdefghijklmnopqrstuvwxyz0123456789'.split('').map(k => [k, k.toUpperCase()]),
  ];

  /** 요소 칸에 고를 수 있는 특별한 값 (실행할 때 정해짐) */
  WB.SPECIAL_EL = { '@this': '이 요소 (방금 누르거나 바뀐 요소)', '@picked': '고른 요소', '@made': '방금 복제한 요소' };
  const GROUP_EVENTS = [['click', '클릭했을'], ['dblclick', '두 번 클릭했을'], ['input', '고쳤을'], ['focusin', '고르기 시작했을'], ['wb-drop', '끌어서 놓았을']];
  /* 블록으로 바꿀 수 있는 스타일 (숫자만 쓰면 px 이 붙는 것: PX_PROPS) */
  const STYLE_PROPS = [
    ['width', '너비'], ['height', '높이'], ['fontWeight', '굵기 (400 / 700)'], ['fontStyle', '기울임 (normal / italic)'],
    ['textDecoration', '밑줄 (none / underline)'], ['textAlign', '글자 정렬 (left / center / right)'],
    ['border', '테두리 (예: 1px solid #ccc)'], ['borderColor', '테두리 색'], ['outline', '강조 테두리 (예: 2px solid red)'],
    ['borderRadius', '둥글게'], ['padding', '안쪽 여백'], ['left', '왼쪽 위치'], ['top', '위쪽 위치'],
    ['fontSize', '글자 크기'], ['display', '표시 방식 (none / block / flex)'], ['cursor', '마우스 모양 (pointer / grab)'],
  ];
  const PX_PROPS = ['width', 'height', 'borderRadius', 'padding', 'left', 'top', 'fontSize'];

  /* 움직임 효과 [값, 이름] → 아래 ANIM_FRAMES */
  const ANIMS = [['fade', '서서히 나타나기'], ['up', '아래에서 올라오기'], ['left', '왼쪽에서 들어오기'], ['zoom', '커지며 나타나기'], ['shake', '흔들기'], ['bounce', '통통 튀기'], ['spin', '한 바퀴 돌기'], ['out', '서서히 사라지기']];
  const ANIM_FRAMES = {
    fade: [{ opacity: 0 }, { opacity: 1 }],
    up: [{ opacity: 0, transform: 'translateY(40px)' }, { opacity: 1, transform: 'none' }],
    left: [{ opacity: 0, transform: 'translateX(-60px)' }, { opacity: 1, transform: 'none' }],
    zoom: [{ opacity: 0, transform: 'scale(0.8)' }, { opacity: 1, transform: 'none' }],
    shake: [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(0)' }],
    bounce: [{ transform: 'translateY(0)' }, { transform: 'translateY(-16px)' }, { transform: 'translateY(0)' }, { transform: 'translateY(-6px)' }, { transform: 'translateY(0)' }],
    spin: [{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }],
    out: [{ opacity: 1 }, { opacity: 0 }],
  };

  /* shape: hat(시작) · stack(한 줄) · c(감싸기) · c2(아니면 있는 감싸기) · rep(값) · bool(참/거짓)
     args 의 type: el(캔버스 요소) · text · num · choice · color · bool · var(변수) · signal(신호)
     hidden: 예전 파일을 열 수 있게 남겨 두었지만 목록에는 안 보이는 블록 */
  WB.BLOCK_DEFS = {
    // 시작
    onLoad: { cat: 'start', shape: 'hat', icon: '▶', text: '페이지가 열렸을 때', args: {} },
    onClick: { cat: 'start', shape: 'hat', icon: '↖', text: '{el} 을(를) 클릭했을 때', args: { el: { type: 'el', filter: 'any' } } },
    onInput: { cat: 'start', shape: 'hat', icon: '✎', text: '{el} 에 입력했을 때', args: { el: { type: 'el', filter: 'input' } } },
    onSubmit: { cat: 'start', shape: 'hat', icon: '✉', text: '{el} 양식을 보냈을 때', args: { el: { type: 'el', filter: 'form' } } },
    onKey: { cat: 'start', shape: 'hat', icon: '⌨', text: '{key} 키를 눌렀을 때 ({when})', args: { key: { type: 'choice', options: KEYS, def: ' ' }, when: { type: 'choice', options: [['free', '글자 입력 중이 아닐 때만'], ['always', '언제나']], def: 'free' } } },
    onGroup: { cat: 'start', shape: 'hat', icon: '⁂', text: '이름표 {cls} 요소를 {ev} 때', args: { cls: { type: 'cls' }, ev: { type: 'choice', options: GROUP_EVENTS, def: 'click' } } },
    onDrop: { cat: 'start', shape: 'hat', icon: '✥', text: '{el} 을(를) 끌어서 놓았을 때', args: { el: { type: 'el', filter: 'any' } } },
    onVisible: { cat: 'start', shape: 'hat', icon: '◉', text: '{el} 이(가) 화면에 보일 때', args: { el: { type: 'el', filter: 'any' } } },
    onSignal: { cat: 'start', shape: 'hat', icon: '◎', text: '{sig} 신호를 받았을 때', args: { sig: { type: 'signal' } }, needs: 'signals' },
    sendSignal: { cat: 'start', shape: 'stack', text: '{sig} 신호 보내기', args: { sig: { type: 'signal' } }, needs: 'signals' },
    onEvent: { cat: 'start', shape: 'hat', icon: '◆', text: '{el} {ev} 때', args: { el: { type: 'el', filter: 'any' }, ev: { type: 'choice', options: [['dblclick', '을(를) 두 번 클릭했을'], ['mouseenter', '에 마우스를 올렸을'], ['mouseleave', '에서 마우스가 벗어났을'], ['change', '의 값이 바뀌었을'], ['focus', '에 입력을 시작했을'], ['blur', '의 입력을 마쳤을'], ['contextmenu', '을(를) 오른쪽 클릭했을']], def: 'mouseenter' } } },
    onTimer: { cat: 'start', shape: 'hat', icon: '◷', text: '{n} 초마다', args: { n: { type: 'num', def: '1' } } },
    onScroll: { cat: 'start', shape: 'hat', icon: '↕', text: '페이지를 스크롤했을 때', args: {} },

    // 흐름
    wait: { cat: 'flow', shape: 'stack', text: '{n} 초 기다리기', args: { n: { type: 'num', def: '2' } } },
    repeat: { cat: 'flow', shape: 'c', text: '{n} 번 반복하기', args: { n: { type: 'num', def: '10' } }, loop: true },
    forever: { cat: 'flow', shape: 'c', text: '계속 반복하기', args: {}, loop: true },
    repeatUntil: { cat: 'flow', shape: 'c', text: '{cond} 이(가) 될 때까지 반복하기', args: { cond: { type: 'bool' } }, loop: true },
    breakLoop: { cat: 'flow', shape: 'stack', text: '반복 중단하기', args: {} },
    if: { cat: 'flow', shape: 'c', text: '만일 {cond} (이)라면', args: { cond: { type: 'bool' } } },
    ifElse: { cat: 'flow', shape: 'c2', text: '만일 {cond} (이)라면', text2: '아니면', args: { cond: { type: 'bool' } } },
    waitUntil: { cat: 'flow', shape: 'stack', text: '{cond} 이(가) 될 때까지 기다리기', args: { cond: { type: 'bool' } } },
    goto: { cat: 'flow', shape: 'stack', text: '{url} 페이지로 이동하기', args: { url: { type: 'text', def: 'https://' } } },
    scrollTo: { cat: 'flow', shape: 'stack', text: '{el} (으)로 부드럽게 스크롤하기', args: { el: { type: 'el', filter: 'any' } } },
    openUrl: { cat: 'flow', shape: 'stack', text: '{url} 을(를) 새 탭에서 열기', args: { url: { type: 'text', def: 'https://' } } },
    forEach: { cat: 'flow', shape: 'c', text: '{var} 목록의 항목마다 반복하기', args: { var: { type: 'var' } }, loop: true, needs: 'vars' },
    loopItem: { cat: 'flow', shape: 'rep', text: '지금 항목', args: {} },
    loopIndex: { cat: 'flow', shape: 'rep', text: '반복 순번 (1부터)', args: {} },
    stopScript: { cat: 'flow', shape: 'stack', text: '이 묶음 여기서 끝내기', args: {} },

    // 움직임 (웹페이지에서 y 는 아래로 갈수록 커짐)
    moveBy: { cat: 'moving', shape: 'stack', text: '{el} 을(를) x: {x} y: {y} 만큼 움직이기', args: { el: { type: 'el', filter: 'any' }, x: { type: 'num', def: '10' }, y: { type: 'num', def: '0' } } },
    moveTo: { cat: 'moving', shape: 'stack', text: '{el} 을(를) x: {x} y: {y} 위치로 이동하기', args: { el: { type: 'el', filter: 'any' }, x: { type: 'num', def: '0' }, y: { type: 'num', def: '0' } } },
    rotate: { cat: 'moving', shape: 'stack', text: '{el} 을(를) {deg} 도 회전하기', args: { el: { type: 'el', filter: 'any' }, deg: { type: 'num', def: '90' } } },
    rotateTo: { cat: 'moving', shape: 'stack', text: '{el} 의 각도를 {deg} 도로 정하기', args: { el: { type: 'el', filter: 'any' }, deg: { type: 'num', def: '0' } } },
    scaleTo: { cat: 'moving', shape: 'stack', text: '{el} 의 크기 배율을 {n} % 로 정하기', args: { el: { type: 'el', filter: 'any' }, n: { type: 'num', def: '100' } } },
    animate: { cat: 'moving', shape: 'stack', text: '{el} 에 {fx} 효과 주기 ({n} 초)', args: { el: { type: 'el', filter: 'any' }, fx: { type: 'choice', options: ANIMS.map(([k, l]) => [k, l]), def: 'fade' }, n: { type: 'num', def: '0.6' } } },
    animateGroup: { cat: 'moving', shape: 'stack', text: '이름표 {cls} 요소 모두 {fx} 효과 주기 ({n} 초)', args: { cls: { type: 'cls' }, fx: { type: 'choice', options: ANIMS.map(([k, l]) => [k, l]), def: 'up' }, n: { type: 'num', def: '0.6' } } },

    // 생김새
    alert: { cat: 'looks', shape: 'stack', text: '알림창에 {msg} 띄우기', args: { msg: { type: 'text', def: '안녕!' } } },
    setText: { cat: 'looks', shape: 'stack', text: '{el} 의 글자를 {v} (으)로 바꾸기', args: { el: { type: 'el', filter: 'text' }, v: { type: 'text', def: '반가워요!' } } },
    showHide: { cat: 'looks', shape: 'stack', text: '{el} {mode}', args: { el: { type: 'el', filter: 'any' }, mode: { type: 'choice', options: [['show', '보이기'], ['hide', '숨기기'], ['toggle', '보이기/숨기기 바꾸기']], def: 'hide' } } },
    setColor: { cat: 'looks', shape: 'stack', text: '{el} 의 {prop} 을 {color} (으)로 정하기', args: { el: { type: 'el', filter: 'any' }, prop: { type: 'choice', options: [['color', '글자색'], ['backgroundColor', '배경색']], def: 'color' }, color: { type: 'color', def: '#ff3a61' } } },
    setSize: { cat: 'looks', shape: 'stack', text: '{el} 의 글자 크기를 {n} 로 정하기', args: { el: { type: 'el', filter: 'any' }, n: { type: 'num', def: '24' } } },
    toggleText: { cat: 'looks', shape: 'stack', text: '{el} 의 글자를 {a} ↔ {b} 로 번갈아 바꾸기', args: { el: { type: 'el', filter: 'text' }, a: { type: 'text', def: '♡' }, b: { type: 'text', def: '♥' } } },
    groupShow: { cat: 'looks', shape: 'stack', text: '이름표 {cls} 요소 모두 {mode}', args: { cls: { type: 'cls' }, mode: { type: 'choice', options: [['show', '보이기'], ['hide', '숨기기']], def: 'show' } } },
    filterGroup: { cat: 'looks', shape: 'stack', text: '이름표 {cls} 중에서 이름표 {cls2} 도 있는 것만 보이기', args: { cls: { type: 'cls' }, cls2: { type: 'cls' } } },
    sortGroup: { cat: 'looks', shape: 'stack', text: '{el} 안의 요소를 이름표 {cls} 의 숫자로 {order} 정렬', args: { el: { type: 'el', filter: 'box' }, cls: { type: 'cls' }, order: { type: 'choice', options: [['asc', '작은 것부터'], ['desc', '큰 것부터']], def: 'asc' } } },
    activeOnly: { cat: 'looks', shape: 'stack', text: '이름표 {cls} 중 {el} 만 {prop} 을 {color} 로 (나머지는 원래대로)', args: { cls: { type: 'cls' }, el: { type: 'el', filter: 'any' }, prop: { type: 'choice', options: [['backgroundColor', '배경색'], ['color', '글자색'], ['outline', '테두리 강조']], def: 'backgroundColor' }, color: { type: 'color', def: '#dde7f7' } } },
    setOpacity: { cat: 'looks', shape: 'stack', text: '{el} 의 투명도를 {n} % 로 정하기', args: { el: { type: 'el', filter: 'any' }, n: { type: 'num', def: '50' } } },
    setCss: { cat: 'looks', shape: 'stack', text: '{el} 의 {prop} 을(를) {v} (으)로 정하기', args: { el: { type: 'el', filter: 'any' }, prop: { type: 'choice', options: STYLE_PROPS, def: 'width' }, v: { type: 'text', def: '200' } } },
    toggleCss: { cat: 'looks', shape: 'stack', text: '{el} 의 {prop} 을(를) {a} ↔ {b} 로 번갈아 바꾸기', args: { el: { type: 'el', filter: 'any' }, prop: { type: 'choice', options: STYLE_PROPS, def: 'fontWeight' }, a: { type: 'text', def: '400' }, b: { type: 'text', def: '700' } } },
    pick: { cat: 'looks', shape: 'stack', text: '{el} 을(를) 고른 요소로 정하기 (파란 테두리)', args: { el: { type: 'el', filter: 'any' } } },
    pickMove: { cat: 'looks', shape: 'stack', text: '고른 요소를 {dir} 옆으로 옮기기', args: { dir: { type: 'choice', options: [['up', '위'], ['down', '아래'], ['left', '왼쪽'], ['right', '오른쪽']], def: 'down' } } },
    cloneEl: { cat: 'looks', shape: 'stack', text: '{el} 을(를) 복제해서 {where} 넣기', args: { el: { type: 'el', filter: 'any' }, where: { type: 'choice', options: [['after', '바로 뒤에'], ['before', '바로 앞에'], ['end', '안쪽 맨 끝에']], def: 'after' } } },
    removeEl: { cat: 'looks', shape: 'stack', text: '{el} 지우기', args: { el: { type: 'el', filter: 'any' } } },
    setClass: { cat: 'looks', shape: 'stack', text: '{el} 에 이름표 · 형식 {cls} {mode}', args: { el: { type: 'el', filter: 'any' }, cls: { type: 'cls' }, mode: { type: 'choice', options: [['add', '붙이기'], ['remove', '떼기'], ['toggle', '붙이기/떼기 바꾸기']], def: 'toggle' } } },
    setAttrB: { cat: 'looks', shape: 'stack', text: '{el} 의 속성 {name} 을(를) {v} (으)로 정하기', args: { el: { type: 'el', filter: 'any' }, name: { type: 'text', def: 'src' }, v: { type: 'text', def: '' } } },
    setCssAny: { cat: 'looks', shape: 'stack', text: '{el} 의 CSS {prop} 을(를) {v} (으)로 정하기', args: { el: { type: 'el', filter: 'any' }, prop: { type: 'text', def: 'background' }, v: { type: 'text', def: 'gold' } } },
    dialog: { cat: 'looks', shape: 'stack', text: '팝업 창 {el} {mode}', args: { el: { type: 'el', filter: 'any' }, mode: { type: 'choice', options: [['open', '열기'], ['close', '닫기']], def: 'open' } } },
    focusEl: { cat: 'looks', shape: 'stack', text: '{el} 에 커서 두기', args: { el: { type: 'el', filter: 'any' } } },
    tableEdit: { cat: 'looks', shape: 'stack', text: '{el} 칸 기준으로 표에 {act}', args: { el: { type: 'el', filter: 'any' }, act: { type: 'choice', options: [['rowAbove', '위에 줄 넣기'], ['rowBelow', '아래에 줄 넣기'], ['colLeft', '왼쪽에 칸 넣기'], ['colRight', '오른쪽에 칸 넣기'], ['rowDel', '이 줄 지우기'], ['colDel', '이 세로줄 지우기']], def: 'rowBelow' } } },

    // 소리
    media: { cat: 'sound', shape: 'stack', text: '{el} {mode}', args: { el: { type: 'el', filter: 'media' }, mode: { type: 'choice', options: [['play', '재생하기'], ['pause', '멈추기'], ['restart', '처음부터 재생하기']], def: 'play' } } },
    beep: { cat: 'sound', shape: 'stack', text: '삐 소리 {n} 초 내기', args: { n: { type: 'num', def: '0.3' } } },

    // 판단
    compare: { cat: 'judgement', shape: 'bool', text: '{a} {op} {b}', args: { a: { type: 'text', def: '10' }, op: { type: 'choice', options: [['=', '='], ['!=', '≠'], ['>', '>'], ['<', '<'], ['>=', '≥'], ['<=', '≤']], def: '=' }, b: { type: 'text', def: '10' } } },
    andOr: { cat: 'judgement', shape: 'bool', text: '{a} {op} {b}', args: { a: { type: 'bool' }, op: { type: 'choice', options: [['&&', '그리고'], ['||', '또는']], def: '&&' }, b: { type: 'bool' } } },
    not: { cat: 'judgement', shape: 'bool', text: '{a} (이)가 아니다', args: { a: { type: 'bool' } } },
    isEmpty: { cat: 'judgement', shape: 'bool', text: '{a} 이(가) 비어 있는가?', args: { a: { type: 'text', def: '' } } },
    checked: { cat: 'judgement', shape: 'bool', text: '{el} 이(가) 선택되었는가?', args: { el: { type: 'el', filter: 'check' } } },
    hasClass: { cat: 'judgement', shape: 'bool', text: '{el} 에 이름표 {cls} 이(가) 붙어 있는가?', args: { el: { type: 'el', filter: 'any' }, cls: { type: 'cls' } } },
    contains: { cat: 'judgement', shape: 'bool', text: '{a} 안에 {b} 이(가) 들어 있는가?', args: { a: { type: 'text', def: '안녕하세요' }, b: { type: 'text', def: '안녕' } } },
    confirm: { cat: 'judgement', shape: 'bool', text: '{msg} 확인 창에서 [확인]을 눌렀는가?', args: { msg: { type: 'text', def: '정말 지울까요?' } } },
    listHas: { cat: 'judgement', shape: 'bool', text: '{var} 목록에 {v} 이(가) 있는가?', args: { var: { type: 'var' }, v: { type: 'text', def: '' } }, needs: 'vars' },
    keyPressed: { cat: 'judgement', shape: 'bool', text: '{key} 키가 눌러져 있는가?', args: { key: { type: 'choice', options: KEYS, def: ' ' } } },

    // 계산
    calc: { cat: 'calc', shape: 'rep', text: '{a} {op} {b}', args: { a: { type: 'num', def: '10' }, op: { type: 'choice', options: [['+', '+'], ['-', '-'], ['*', 'x'], ['/', '/'], ['%', '나누기 나머지'], ['//', '나누기 몫']], def: '+' }, b: { type: 'num', def: '10' } } },
    pad: { cat: 'calc', shape: 'rep', text: '{n} 을(를) {k} 자리로 맞추기 (앞을 0으로)', args: { n: { type: 'num', def: '7' }, k: { type: 'num', def: '2' } } },
    random: { cat: 'calc', shape: 'rep', text: '{a} 부터 {b} 사이의 무작위 수', args: { a: { type: 'num', def: '1' }, b: { type: 'num', def: '10' } } },
    join: { cat: 'calc', shape: 'rep', text: '{a} 과(와) {b} 를 합치기', args: { a: { type: 'text', def: '안녕' }, b: { type: 'text', def: '하세요' } } },
    math: { cat: 'calc', shape: 'rep', text: '{n} 을(를) {fn}', args: { n: { type: 'num', def: '3.7' }, fn: { type: 'choice', options: [['round', '반올림'], ['floor', '내림'], ['ceil', '올림'], ['abs', '절댓값'], ['sqrt', '제곱근']], def: 'round' } } },
    numFormat: { cat: 'calc', shape: 'rep', text: '{n} 에 쉼표 넣기 (1,234,567)', args: { n: { type: 'num', def: '1234567' } } },
    strLen: { cat: 'calc', shape: 'rep', text: '{a} 의 글자 수', args: { a: { type: 'text', def: '안녕하세요' } } },
    strPart: { cat: 'calc', shape: 'rep', text: '{a} 의 {from} 번째부터 {to} 번째 글자', args: { a: { type: 'text', def: '안녕하세요' }, from: { type: 'num', def: '1' }, to: { type: 'num', def: '2' } } },
    strReplace: { cat: 'calc', shape: 'rep', text: '{a} 에서 {b} 을(를) {c} (으)로 바꾼 글자', args: { a: { type: 'text', def: '안녕하세요' }, b: { type: 'text', def: '안녕' }, c: { type: 'text', def: '반갑' } } },
    dateNow: { cat: 'calc', shape: 'rep', text: '지금 {part}', args: { part: { type: 'choice', options: [['year', '연도'], ['month', '월'], ['day', '일'], ['hour', '시'], ['minute', '분'], ['second', '초'], ['weekday', '요일'], ['date', '날짜 (2026. 1. 2.)'], ['time', '시각 (오후 3:04)'], ['stamp', '시간 값 (1/1000초)']], def: 'hour' } } },
    mousePos: { cat: 'calc', shape: 'rep', text: '마우스 {axis} 위치', args: { axis: { type: 'choice', options: [['x', '가로(x)'], ['y', '세로(y)']], def: 'x' } } },
    scrollPos: { cat: 'calc', shape: 'rep', text: '스크롤한 거리', args: {} },
    winSize: { cat: 'calc', shape: 'rep', text: '화면 {dim}', args: { dim: { type: 'choice', options: [['w', '너비'], ['h', '높이']], def: 'w' } } },

    // 자료
    ask: { cat: 'variable', shape: 'stack', text: '{q} 을(를) 묻고 대답 기다리기', args: { q: { type: 'text', def: '이름이 뭐예요?' } } },
    answer: { cat: 'variable', shape: 'rep', text: '대답', args: {} },
    getValue: { cat: 'variable', shape: 'rep', text: '{el} 의 입력값', args: { el: { type: 'el', filter: 'input' } } },
    getText: { cat: 'variable', shape: 'rep', text: '{el} 의 글자', args: { el: { type: 'el', filter: 'text' } } },
    setValue: { cat: 'variable', shape: 'stack', text: '{el} 의 입력값을 {v} (으)로 정하기', args: { el: { type: 'el', filter: 'input' }, v: { type: 'text', def: '' } } },
    getVar: { cat: 'variable', shape: 'rep', text: '{var} 값', args: { var: { type: 'var' } }, needs: 'vars' },
    setVar: { cat: 'variable', shape: 'stack', text: '{var} 를 {v} (으)로 정하기', args: { var: { type: 'var' }, v: { type: 'text', def: '0' } }, needs: 'vars' },
    changeVar: { cat: 'variable', shape: 'stack', text: '{var} 에 {v} 만큼 더하기', args: { var: { type: 'var' }, v: { type: 'num', def: '1' } }, needs: 'vars' },
    listAdd: { cat: 'variable', shape: 'stack', text: '{var} 목록에 {v} 추가하기', args: { var: { type: 'var' }, v: { type: 'text', def: '사과' } }, needs: 'vars' },
    listRemove: { cat: 'variable', shape: 'stack', text: '{var} 목록의 {n} 번째 항목 지우기', args: { var: { type: 'var' }, n: { type: 'num', def: '1' } }, needs: 'vars' },
    listClear: { cat: 'variable', shape: 'stack', text: '{var} 목록 비우기', args: { var: { type: 'var' } }, needs: 'vars' },
    listItem: { cat: 'variable', shape: 'rep', text: '{var} 목록의 {n} 번째 항목', args: { var: { type: 'var' }, n: { type: 'num', def: '1' } }, needs: 'vars' },
    listLen: { cat: 'variable', shape: 'rep', text: '{var} 목록의 항목 수', args: { var: { type: 'var' } }, needs: 'vars' },
    listJoin: { cat: 'variable', shape: 'rep', text: '{var} 목록을 {sep} (으)로 이어 붙인 글자', args: { var: { type: 'var' }, sep: { type: 'text', def: ', ' } }, needs: 'vars' },
    saveLocal: { cat: 'variable', shape: 'stack', text: '{key} 이름으로 {v} 저장하기 (다시 열어도 남음)', args: { key: { type: 'text', def: '점수' }, v: { type: 'text', def: '0' } } },
    loadLocal: { cat: 'variable', shape: 'rep', text: '저장해 둔 {key} 값', args: { key: { type: 'text', def: '점수' } } },
    fetchJson: { cat: 'variable', shape: 'stack', text: '{url} 에서 자료를 받아 {var} 에 넣기', args: { url: { type: 'text', def: 'data.json' }, var: { type: 'var' } }, needs: 'vars' },
    jsonGet: { cat: 'variable', shape: 'rep', text: '{var} 자료의 {path} 값', args: { var: { type: 'var' }, path: { type: 'text', def: 'items.0.name' } }, needs: 'vars' },
    getAttr: { cat: 'variable', shape: 'rep', text: '{el} 의 속성 {name}', args: { el: { type: 'el', filter: 'any' }, name: { type: 'text', def: 'href' } } },
    elCount: { cat: 'variable', shape: 'rep', text: '이름표 {cls} 요소의 수', args: { cls: { type: 'cls' } } },
    cellAddr: { cat: 'variable', shape: 'rep', text: '{el} 의 표 칸 주소 (A1)', args: { el: { type: 'el', filter: 'any' } } },
    getFormula: { cat: 'variable', shape: 'rep', text: '{el} 의 수식', args: { el: { type: 'el', filter: 'any' } } },
    setFormula: { cat: 'variable', shape: 'stack', text: '{el} 칸에 {v} 쓰기 (=로 시작하면 수식)', args: { el: { type: 'el', filter: 'any' }, v: { type: 'text', def: '=A1+B1' } } },

    // 함수: 여러 곳에서 다시 쓰는 블록 묶음 (값을 하나 받고, 결과를 돌려줄 수 있음)
    defFn: { cat: 'func', shape: 'hat', icon: 'ƒ', text: '함수 {fn} 을(를) 실행하면', args: { fn: { type: 'func' } }, needs: 'funcs' },
    callFn: { cat: 'func', shape: 'stack', text: '함수 {fn} 실행하기 (넘길 값 {v} )', args: { fn: { type: 'func' }, v: { type: 'text', def: '' } }, needs: 'funcs' },
    callFnVal: { cat: 'func', shape: 'rep', text: '함수 {fn} 의 결과 (넘길 값 {v} )', args: { fn: { type: 'func' }, v: { type: 'text', def: '' } }, needs: 'funcs' },
    fnInput: { cat: 'func', shape: 'rep', text: '넘겨받은 값', args: {}, needs: 'funcs' },
    fnReturn: { cat: 'func', shape: 'stack', text: '결과로 {v} 돌려주고 끝내기', args: { v: { type: 'text', def: '0' } }, needs: 'funcs' },

    // 고급: 블록에 없는 것은 JavaScript 한 줄로
    jsRun: { cat: 'adv', shape: 'stack', text: 'JS 실행 {code}', args: { code: { type: 'code', def: "document.title = '안녕'" } } },
    jsValue: { cat: 'adv', shape: 'rep', text: 'JS 값 {code}', args: { code: { type: 'code', def: 'Math.PI * 2' } } },
    log: { cat: 'adv', shape: 'stack', text: '기록 남기기 {v} (개발자 도구 콘솔)', args: { v: { type: 'text', def: '확인' } } },
    comment: { cat: 'adv', shape: 'stack', text: '메모: {t}', args: { t: { type: 'code', def: '여기서 하는 일' } } },
    tryCatch: { cat: 'adv', shape: 'c2', text: '시도하기', text2: '오류가 나면', args: {} },
    errorMsg: { cat: 'adv', shape: 'rep', text: '오류 내용', args: {} },
    copyText: { cat: 'adv', shape: 'stack', text: '{v} 을(를) 클립보드에 복사하기', args: { v: { type: 'text', def: '복사할 글자' } } },

    // 예전 버전 블록 (다시 열기용)
    equals: { cat: 'judgement', shape: 'bool', hidden: true, text: '{a} = {b}', args: { a: { type: 'text', def: '' }, b: { type: 'text', def: '' } } },
    greater: { cat: 'judgement', shape: 'bool', hidden: true, text: '{a} > {b}', args: { a: { type: 'num', def: '10' }, b: { type: 'num', def: '5' } } },
  };
  const DEFS = WB.BLOCK_DEFS;
  const catOf = type => WB.BLOCK_CATS.find(c => c.id === DEFS[type].cat);
  WB.blockColor = type => catOf(type).c;
  WB.blockCatIcon = type => catOf(type).icon;
  WB.isValueBlock = b => ['rep', 'bool'].includes(DEFS[b.type].shape);

  /* ---------- 블록 데이터 다루기 ---------- */
  let seq = 0;
  const newBid = () => 'b' + ++seq;
  WB.emptyBlocks = () => ({ scripts: [], vars: [], signals: [], funcs: [], code: '' }); // code: 탭5 「코드」에 직접 쓴 JavaScript
  /** data 를 주면 변수 · 신호 칸을 첫 번째 것으로 채움 */
  WB.newBlock = (type, data) => {
    const def = DEFS[type];
    const b = { id: newBid(), type, args: {} };
    for (const [k, spec] of Object.entries(def.args)) {
      if (spec.type === 'var') b.args[k] = data?.vars?.[0] ?? '';
      else if (spec.type === 'signal') b.args[k] = data?.signals?.[0] ?? '';
      else if (spec.type === 'func') b.args[k] = data?.funcs?.[0] ?? '';
      else b.args[k] = spec.def ?? '';
    }
    if (def.shape === 'c' || def.shape === 'c2') b.body = [];
    if (def.shape === 'c2') b.body2 = [];
    return b;
  };
  /** 블록과 그 안의 모든 블록 */
  WB.walkBlock = (b, fn) => {
    fn(b);
    for (const v of Object.values(b.args)) if (v && typeof v === 'object') WB.walkBlock(v, fn);
    for (const c of [...(b.body || []), ...(b.body2 || [])]) WB.walkBlock(c, fn);
  };
  const known = b => {
    let ok = true;
    WB.walkBlock(b, x => { if (!DEFS[x?.type]) ok = false; });
    return ok;
  };
  WB.reIdBlocks = blocks => {
    const data = { ...WB.emptyBlocks(), ...(blocks && typeof blocks === 'object' ? blocks : {}) };
    data.scripts = (Array.isArray(data.scripts) ? data.scripts : []).filter(s => Array.isArray(s.blocks) && s.blocks.every(known));
    data.vars = Array.isArray(data.vars) ? data.vars.map(String) : [];
    data.signals = Array.isArray(data.signals) ? data.signals.map(String) : [];
    data.funcs = Array.isArray(data.funcs) ? data.funcs.map(String) : [];
    data.code = typeof data.code === 'string' ? data.code : '';
    data.scripts.forEach(s => s.blocks.forEach(b => WB.walkBlock(b, x => {
      x.id = newBid();
      // 나중에 생긴 칸은 기본값으로 (예전 파일의 키 블록에 「언제」 칸이 없음)
      for (const [k, spec] of Object.entries(DEFS[x.type].args)) if (x.args[k] === undefined && spec.def !== undefined) x.args[k] = spec.def;
    })));
    return data;
  };
  WB.cloneBlock = b => {
    const c = JSON.parse(JSON.stringify(b));
    WB.walkBlock(c, x => (x.id = newBid()));
    return c;
  };

  /** id 블록이 어디 있는지: 목록 안({ list, index }) 또는 값 칸 안({ parent, name }) */
  WB.locateBlock = (data, id) => {
    const inList = list => {
      for (let i = 0; i < list.length; i++) {
        const b = list[i];
        if (b.id === id) return { list, index: i };
        const r = inBlock(b);
        if (r) return r;
      }
      return null;
    };
    const inBlock = b => {
      for (const [name, v] of Object.entries(b.args)) {
        if (!v || typeof v !== 'object') continue;
        if (v.id === id) return { parent: b, name };
        const r = inBlock(v);
        if (r) return r;
      }
      return (b.body && inList(b.body)) || (b.body2 && inList(b.body2)) || null;
    };
    for (const s of data.scripts) {
      const r = inList(s.blocks);
      if (r) return { ...r, script: s };
    }
    return null;
  };
  /** 'script:2' 또는 'blockId:body' 로 블록 목록 찾기 */
  WB.listAt = (data, path) => {
    const [a, b] = path.split(':');
    if (a === 'script') return data.scripts[+b]?.blocks || null;
    const loc = WB.locateBlock(data, a);
    const blk = loc && (loc.list ? loc.list[loc.index] : loc.parent.args[loc.name]);
    return blk ? blk[b] : null;
  };

  /* ---------- 블록 → JavaScript ---------- */
  const HELPERS = {
    el: "const el = id => (id && typeof id === 'object' ? id : document.getElementById(id));",
    on: 'const on = (id, type, fn) => el(id)?.addEventListener(type, fn);',
    val: "const val = id => el(id)?.value ?? '';",
    text: "const text = id => (el(id)?.textContent ?? '').replace(/\\s+/g, ' ').trim(); // 코드 들여쓰기 공백은 빼고",
    checked: 'const checked = id => !!el(id)?.checked;',
    setText: 'const setText = (id, v) => { if (el(id)) el(id).textContent = v; };',
    setValue: 'const setValue = (id, v) => { if (el(id)) el(id).value = v; };',
    show: "const show = (id, mode) => {\n  const e = el(id);\n  if (!e) return;\n  const hide = mode === 'hide' || (mode === 'toggle' && e.style.display !== 'none');\n  e.style.display = hide ? 'none' : '';\n};",
    setStyle: 'const setStyle = (id, prop, v) => { if (el(id)) el(id).style[prop] = v; };',
    wait: 'const wait = sec => new Promise(done => setTimeout(done, sec * 1000));',
    frame: 'const frame = () => new Promise(done => requestAnimationFrame(done));',
    move: "const place = e => { if (getComputedStyle(e).position === 'static') e.style.position = 'relative'; };\n" +
      "const moveBy = (id, dx, dy) => {\n  const e = el(id);\n  if (!e) return;\n  place(e);\n  e.style.left = (parseFloat(getComputedStyle(e).left) || 0) + dx + 'px';\n  e.style.top = (parseFloat(getComputedStyle(e).top) || 0) + dy + 'px';\n};\n" +
      "const moveTo = (id, x, y) => {\n  const e = el(id);\n  if (!e) return;\n  place(e);\n  e.style.left = x + 'px';\n  e.style.top = y + 'px';\n};",
    xform: "const xform = (e, key, v) => {\n  e.dataset[key] = v;\n  e.style.transform = 'rotate(' + (Number(e.dataset.angle) || 0) + 'deg) scale(' + (e.dataset.scale ?? 1) + ')';\n};",
    rotate: "const rotate = (id, deg, exact) => {\n  const e = el(id);\n  if (e) xform(e, 'angle', (exact ? 0 : Number(e.dataset.angle) || 0) + deg);\n};",
    scaleTo: "const scaleTo = (id, pct) => { const e = el(id); if (e) xform(e, 'scale', pct / 100); };",
    css: "const PX = new Set(" + JSON.stringify(PX_PROPS) + ");\nconst css = (id, prop, v) => {\n  const e = el(id);\n  if (!e) return;\n  if (PX.has(prop) && String(v).trim() !== '' && !isNaN(v)) v += 'px'; // 숫자만 쓰면 px\n  e.style[prop] = v;\n};\nconst toggleCss = (id, prop, a, b) => {\n  const e = el(id);\n  if (!e) return;\n  const now = String(e.style[prop] || getComputedStyle(e)[prop]);\n  css(e, prop, now.startsWith(String(a)) ? b : a);\n};",
    pick: "const pick = id => {\n  const e = el(id);\n  if (!e) return;\n  if (!document.getElementById('wb-pick-style')) document.head.append(Object.assign(document.createElement('style'), { id: 'wb-pick-style', textContent: '[data-picked] { outline: 2px solid #1a73e8; outline-offset: -2px; }' }));\n  picked?.removeAttribute('data-picked');\n  picked = e;\n  e.setAttribute('data-picked', '');\n};",
    pickMove: "const pickMove = dir => {\n  const e = picked;\n  if (!e) return;\n  const cell = e.closest('td, th');\n  let to;\n  if (cell && (dir === 'up' || dir === 'down')) {\n    const rows = [...cell.closest('table').rows];\n    to = rows[rows.indexOf(cell.parentElement) + (dir === 'up' ? -1 : 1)]?.cells[cell.cellIndex];\n  } else to = dir === 'left' || dir === 'up' ? e.previousElementSibling : e.nextElementSibling;\n  if (!to || (cell && to.tagName !== cell.tagName)) return; // 표에서는 제목 칸으로 넘어가지 않음\n  pick(to);\n  if (to.isContentEditable || to.matches('input, textarea, select')) to.focus();\n};",
    cloneEl: "const cloneEl = (id, where) => {\n  const e = el(id);\n  if (!e) return;\n  const c = e.cloneNode(true);\n  [c, ...c.querySelectorAll('[id]')].forEach(x => x.removeAttribute('id')); // id 는 겹치면 안 돼서 지움\n  c.removeAttribute('data-picked');\n  if (where === 'before') e.before(c);\n  else if (where === 'end') e.append(c);\n  else e.after(c);\n  made = c;\n};",
    removeEl: 'const removeEl = id => {\n  const e = el(id);\n  if (e && e.contains(picked)) picked = null;\n  e?.remove();\n};',
    colName: "const colName = n => { let s = ''; for (n++; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };",
    tableEdit: "const tableEdit = (id, act) => {\n  const cell = el(id)?.closest('td, th');\n  if (!cell) return;\n  const table = cell.closest('table'), row = cell.parentElement, ci = cell.cellIndex;\n  const blank = c => {\n    const n = c.cloneNode(false);\n    ['id', 'data-picked', 'data-formula'].forEach(a => n.removeAttribute(a));\n    return n;\n  };\n  if (act === 'rowAbove' || act === 'rowBelow') {\n    const nr = row.cloneNode(false);\n    [...row.cells].forEach(c => nr.append(blank(c)));\n    if (act === 'rowAbove') row.before(nr);\n    else row.after(nr);\n  } else if (act === 'colLeft' || act === 'colRight') {\n    [...table.rows].forEach(r => { const c = r.cells[ci]; if (c) c[act === 'colLeft' ? 'before' : 'after'](blank(c)); });\n  } else if (act === 'rowDel' && table.rows.length > 1) {\n    if (row.contains(picked)) picked = null;\n    row.remove();\n  } else if (act === 'colDel') {\n    [...table.rows].forEach(r => { const c = r.cells[ci]; if (c && c.contains(picked)) picked = null; c?.remove(); });\n  }\n  // 제목 줄(A, B, C …)과 번호 칸(1, 2, 3 …)은 다시 매김\n  const rows = [...table.rows];\n  const head = rows[0] && [...rows[0].cells].every(c => c.tagName === 'TH');\n  if (head) {\n    const corner = rows[0].cells[0]?.textContent.trim() === '';\n    [...rows[0].cells].forEach((c, i) => {\n      const n = corner ? i - 1 : i;\n      if (n >= 0 && /^[A-Z]*$/.test(c.textContent.trim())) c.textContent = colName(n);\n    });\n  }\n  rows.forEach((r, i) => {\n    const c = r.cells[0];\n    if (c && c.tagName === 'TH' && (!head || i) && /^[0-9]*$/.test(c.textContent.trim())) c.textContent = head ? i : i + 1;\n  });\n  if (typeof wbCalc === 'function') wbCalc();\n};",
    cellAddr: "const cellAddr = id => {\n  const c = el(id)?.closest('td');\n  if (!c) return '';\n  const rows = [...c.closest('table').rows].filter(r => [...r.cells].some(x => x.tagName === 'TD'));\n  const cols = [...c.parentElement.cells].filter(x => x.tagName === 'TD');\n  return colName(cols.indexOf(c)) + (rows.indexOf(c.parentElement) + 1);\n};",
    formula: "const formulaOf = id => { const e = el(id); return e ? e.dataset.formula || e.textContent : ''; };\nconst setFormula = (id, v) => {\n  const e = el(id);\n  if (!e) return;\n  v = String(v);\n  if (v.startsWith('=')) e.dataset.formula = v;\n  else { delete e.dataset.formula; e.textContent = v; }\n  if (typeof wbCalc === 'function') wbCalc();\n};",
    media: "const media = (id, mode) => {\n  const e = el(id);\n  if (!e || !e.play) return;\n  if (mode === 'pause') return e.pause();\n  if (mode === 'restart') e.currentTime = 0;\n  e.play();\n};",
    beep: "const beep = sec => {\n  const ctx = new AudioContext(), osc = ctx.createOscillator();\n  osc.connect(ctx.destination);\n  osc.start();\n  osc.stop(ctx.currentTime + sec);\n  return wait(sec);\n};",
    keys: "const keys = new Set();\naddEventListener('keydown', e => keys.add(e.key));\naddEventListener('keyup', e => keys.delete(e.key));",
    random: 'const random = (a, b) => {\n  const [lo, hi] = a < b ? [a, b] : [b, a];\n  return Number.isInteger(lo) && Number.isInteger(hi) ? lo + Math.floor(Math.random() * (hi - lo + 1)) : lo + Math.random() * (hi - lo);\n};',
    all: 'const all = cls => [...document.getElementsByClassName(cls)];',
    groupShow: "const groupShow = (cls, mode) => all(cls).forEach(e => (e.style.display = mode === 'hide' ? 'none' : ''));",
    filterGroup: "const filterGroup = (cls, keep) => all(cls).forEach(e => (e.style.display = e.classList.contains(keep) ? '' : 'none'));",
    sortGroup: "const sortGroup = (id, cls, order) => {\n  const box = el(id);\n  if (!box) return;\n  const num = e => parseFloat((e.getElementsByClassName(cls)[0]?.textContent || '').replace(/[^0-9.-]/g, '')) || 0;\n  [...box.children].sort((a, b) => (order === 'asc' ? num(a) - num(b) : num(b) - num(a))).forEach(c => box.appendChild(c));\n};",
    activeOnly: "const activeOnly = (cls, id, prop, v) => {\n  const set = (e, x) => {\n    if (prop !== 'outline') return (e.style[prop] = x);\n    e.style.outline = x ? '2px solid ' + x : '';\n    e.style.outlineOffset = x ? '-2px' : '';\n  };\n  all(cls).forEach(e => set(e, '')); // 나머지는 원래 스타일로\n  if (el(id)) set(el(id), v);\n};",
    animate: 'const animFrames = ' + JSON.stringify(ANIM_FRAMES) + ";\nconst animate = (e, fx, sec) => e?.animate(animFrames[fx], { duration: sec * 1000, easing: 'ease-out', fill: fx === 'out' ? 'forwards' : 'none' });",
    toggleText: 'const toggleText = (id, a, b) => { if (el(id)) el(id).textContent = el(id).textContent === a ? b : a; };',
    whenVisible: 'const whenVisible = (id, fn) => {\n  const e = el(id);\n  if (e) new IntersectionObserver(es => es.forEach(x => x.isIntersecting && fn()), { threshold: 0.2 }).observe(e);\n};',
    scrollToEl: "const scrollToEl = id => el(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });",
    mouse: "const mouse = { x: 0, y: 0 };\naddEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });",
    store: "const saveLocal = (key, v) => { try { localStorage.setItem('wb:' + key, JSON.stringify(v)); } catch { /* 저장소를 못 쓰는 환경 */ } };\nconst loadLocal = key => { try { return JSON.parse(localStorage.getItem('wb:' + key)) ?? ''; } catch { return ''; } };",
    jsonGet: "const jsonGet = (data, path) => {\n  let v = data;\n  for (const k of String(path).split('.').filter(Boolean)) v = v?.[k];\n  return v ?? '';\n};",
    same: "const same =(a, b) => (a !== '' && b !== '' && !isNaN(a) && !isNaN(b) ? Number(a) === Number(b) : String(a) === String(b));",
  };
  const NEEDS = { rotate: ['el', 'xform'], scaleTo: ['el', 'xform'], css: ['el'], pick: ['el'], pickMove: ['pick', 'el'], cloneEl: ['el'], removeEl: ['el'], tableEdit: ['el', 'colName'], cellAddr: ['el', 'colName'], formula: ['el'], groupShow: ['all'], filterGroup: ['all'], activeOnly: ['all', 'el'], sortGroup: ['el'], toggleText: ['el'], whenVisible: ['el'], scrollToEl: ['el'],show: ['el'], setStyle: ['el'], move: ['el'], media: ['el'], beep: ['wait'], on: ['el'], val: ['el'], text: ['el'], checked: ['el'], setText: ['el'], setValue: ['el'] };

  /** 블록을 사람이 읽는 한 줄로 (코드 주석용) */
  WB.describeBlock = b => DEFS[b.type].text.replace(/\{(\w+)\}/g, (_, k) => {
    const v = b.args[k];
    if (v && typeof v === 'object') return `(${WB.describeBlock(v)})`;
    const spec = DEFS[b.type].args[k];
    if (spec.type === 'choice') return (spec.options.find(o => o[0] === v) || [, v])[1];
    if (spec.type === 'el') return v ? (WB.SPECIAL_EL[v] ? `[${WB.SPECIAL_EL[v]}]` : '#' + v) : '(요소)';
    if (spec.type === 'var' || spec.type === 'signal' || spec.type === 'func') return `[${v}]`;
    if (spec.type === 'cls') return v ? '.' + v : '(이름표)';
    return `"${v}"`;
  });

  WB.generateJS = data => {
    const used = new Set();
    let usesVars = false, usesSignals = false, usesAnswer = false, usesPicked = false, usesFns = false;
    /** 직접 쓴 JS 한 줄: 문법이 틀리면 전체 코드가 멈추지 않게 주석으로 바꿈 */
    const jsOk = (code, asValue) => { try { new Function(asValue ? `return (async () => (${code}\n))` : `return (async () => {${code}\n})`); return true; } catch { return false; } };
    const DATE = { year: 'getFullYear()', month: 'getMonth() + 1', day: 'getDate()', hour: 'getHours()', minute: 'getMinutes()', second: 'getSeconds()', stamp: 'getTime()', date: 'toLocaleDateString()', time: "toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })" };
    const q = s => JSON.stringify(String(s ?? ''));
    /** 요소 칸 값 → JS: id 글자, 또는 그때그때 정해지는 요소(이 요소 · 고른 요소 · 방금 복제한 요소) */
    const R = v => {
      if (v === '@this') return 'thisEl';
      if (v === '@picked' || v === '@made') { usesPicked = true; return v.slice(1) === 'made' ? 'made' : 'picked'; }
      return q(v);
    };
    const use = (...names) => names.forEach(n => { used.add(n); (NEEDS[n] || []).forEach(m => used.add(m)); });
    const isNum = s => /^-?\d+(\.\d+)?$/.test(String(s).trim());

    function val(a, kind) {
      if (a && typeof a === 'object') return expr(a);
      if (kind === 'num') return String(Number(a) || 0);
      if (kind === 'bool') return 'false';
      return isNum(a) ? String(Number(a)) : q(a);
    }
    const num = a => (a && typeof a === 'object' ? `Number(${expr(a)})` : val(a, 'num'));
    const varRef = name => { usesVars = true; return `vars[${q(name)}]`; };

    function expr(b) {
      const A = b.args;
      switch (b.type) {
        case 'getValue': use('val'); return `val(${R(A.el)})`;
        case 'getText': use('text'); return `text(${R(A.el)})`;
        case 'join': return `(String(${val(A.a)}) + String(${val(A.b)}))`;
        case 'calc': return A.op === '//' ? `Math.floor(${num(A.a)} / ${num(A.b)})` : `(${num(A.a)} ${A.op} ${num(A.b)})`;
        case 'pad': return `String(Math.trunc(${num(A.n)})).padStart(${num(A.k)}, '0')`;
        case 'cellAddr': use('cellAddr'); return `cellAddr(${R(A.el)})`;
        case 'getFormula': use('formula'); return `formulaOf(${R(A.el)})`;
        case 'random': use('random'); return `random(${num(A.a)}, ${num(A.b)})`;
        case 'answer': usesAnswer = true; return 'answer';
        case 'getVar': return varRef(A.var);
        case 'checked': use('checked'); return `checked(${R(A.el)})`;
        case 'isEmpty': return `(String(${val(A.a)}).trim() === '')`;
        case 'compare':
          if (A.op === '=' || A.op === '!=') { use('same'); return `${A.op === '!=' ? '!' : ''}same(${val(A.a)}, ${val(A.b)})`; }
          return `(${num(A.a)} ${A.op} ${num(A.b)})`;
        case 'andOr': return `(${val(A.a, 'bool')} ${A.op} ${val(A.b, 'bool')})`;
        case 'not': return `!${val(A.a, 'bool')}`;
        case 'keyPressed': use('keys'); return `keys.has(${q(A.key)})`;
        case 'equals': use('same'); return `same(${val(A.a)}, ${val(A.b)})`;
        case 'loopItem': return "(typeof item === 'undefined' ? '' : item)";
        case 'loopIndex': return "(typeof i === 'undefined' ? 0 : i + 1)";
        case 'hasClass': use('el'); return `!!el(${R(A.el)})?.classList.contains(${q(A.cls)})`;
        case 'contains': return `String(${val(A.a)}).includes(String(${val(A.b)}))`;
        case 'confirm': return `confirm(${val(A.msg)})`;
        case 'listHas': return `(Array.isArray(${varRef(A.var)}) && ${varRef(A.var)}.some(x => String(x) === String(${val(A.v)})))`;
        case 'math': return `Math.${A.fn}(${num(A.n)})`;
        case 'numFormat': return `Number(${num(A.n)}).toLocaleString()`;
        case 'strLen': return `String(${val(A.a)}).length`;
        case 'strPart': return `String(${val(A.a)}).slice(${num(A.from)} - 1, ${num(A.to)})`;
        case 'strReplace': return `String(${val(A.a)}).split(String(${val(A.b)})).join(String(${val(A.c)}))`;
        case 'dateNow': return A.part === 'weekday' ? "'일월화수목금토'[new Date().getDay()]" : `new Date().${DATE[A.part] || DATE.stamp}`;
        case 'mousePos': use('mouse'); return `mouse.${A.axis === 'y' ? 'y' : 'x'}`;
        case 'scrollPos': return 'Math.round(scrollY)';
        case 'winSize': return A.dim === 'h' ? 'innerHeight' : 'innerWidth';
        case 'listItem': return `((${varRef(A.var)})?.[${num(A.n)} - 1] ?? '')`;
        case 'listLen': return `(Array.isArray(${varRef(A.var)}) ? ${varRef(A.var)}.length : 0)`;
        case 'listJoin': return `(Array.isArray(${varRef(A.var)}) ? ${varRef(A.var)}.join(String(${val(A.sep)})) : '')`;
        case 'loadLocal': use('store'); return `loadLocal(${val(A.key)})`;
        case 'jsonGet': use('jsonGet'); return `jsonGet(${varRef(A.var)}, ${val(A.path)})`;
        case 'getAttr': use('el'); return `(el(${R(A.el)})?.getAttribute(${q(A.name)}) ?? '')`;
        case 'elCount': return `document.getElementsByClassName(${q(A.cls)}).length`;
        case 'callFnVal': usesFns = true; return `(await fns[${q(A.fn)}]?.(${val(A.v)}))`;
        case 'fnInput': return "(typeof input === 'undefined' ? '' : input)";
        case 'jsValue': return jsOk(A.code, true) && String(A.code).trim() ? `(${A.code})` : 'undefined /* JS 값: 문법 오류 */';
        case 'errorMsg': return "(typeof error === 'undefined' ? '' : String(error?.message ?? error))";
        case 'greater': return `(${num(A.a)} > ${num(A.b)})`;
      }
      return 'undefined';
    }
    /** 블록 목록 → 들여쓴 줄들 (끝에 줄바꿈 포함). inLoop: 반복 안인지 (반복 중단하기용) */
    function lines(list, depth, inLoop) {
      return list.map(b => stmt(b, depth, inLoop)).filter(Boolean).map(s => s + '\n').join('');
    }
    function stmt(b, depth, inLoop) {
      const A = b.args, p = '  '.repeat(depth);
      const body = (key, loop = inLoop) => lines(b[key], depth + 1, loop);
      switch (b.type) {
        case 'sendSignal': usesSignals = true; return `${p}signals.dispatchEvent(new Event(${q(A.sig)}));`;
        case 'wait': use('wait'); return `${p}await wait(${num(A.n)});`;
        case 'repeat': return `${p}for (let i = 0; i < ${num(A.n)}; i++) {\n${body('body', true)}${p}}`;
        case 'forever': use('frame'); return `${p}while (true) {\n${body('body', true)}${p}  await frame(); // 화면이 멈추지 않게 한 번 쉬기\n${p}}`;
        case 'repeatUntil': use('frame'); return `${p}while (!${val(A.cond, 'bool')}) {\n${body('body', true)}${p}  await frame();\n${p}}`;
        case 'breakLoop': return inLoop ? `${p}break;` : `${p}// 반복 중단하기: 반복 블록 안에서만 쓸 수 있어요`;
        case 'if': return `${p}if (${val(A.cond, 'bool')}) {\n${body('body')}${p}}`;
        case 'ifElse': return `${p}if (${val(A.cond, 'bool')}) {\n${body('body')}${p}} else {\n${body('body2')}${p}}`;
        case 'waitUntil': use('frame'); return `${p}while (!${val(A.cond, 'bool')}) await frame();`;
        case 'goto': return `${p}location.href = ${val(A.url)};`;
        case 'scrollTo': use('scrollToEl'); return `${p}scrollToEl(${R(A.el)});`;
        case 'animate': use('animate', 'el'); return `${p}animate(el(${R(A.el)}), ${q(A.fx)}, ${num(A.n)});`;
        case 'animateGroup': use('animate', 'all'); return `${p}{ const sec = ${num(A.n)}; all(${q(A.cls)}).forEach((e, n) => setTimeout(() => animate(e, ${q(A.fx)}, sec), n * 80)); }`;
        case 'toggleText': use('toggleText'); return `${p}toggleText(${R(A.el)}, ${val(A.a)}, ${val(A.b)});`;
        case 'groupShow': use('groupShow'); return `${p}groupShow(${q(A.cls)}, ${q(A.mode)});`;
        case 'filterGroup': use('filterGroup'); return `${p}filterGroup(${q(A.cls)}, ${q(A.cls2)});`;
        case 'sortGroup': use('sortGroup'); return `${p}sortGroup(${R(A.el)}, ${q(A.cls)}, ${q(A.order)});`;
        case 'activeOnly': use('activeOnly'); return `${p}activeOnly(${q(A.cls)}, ${R(A.el)}, ${q(A.prop)}, ${q(A.color)});`;
        case 'moveBy': use('move'); return `${p}moveBy(${R(A.el)}, ${num(A.x)}, ${num(A.y)});`;
        case 'moveTo': use('move'); return `${p}moveTo(${R(A.el)}, ${num(A.x)}, ${num(A.y)});`;
        case 'rotate': use('rotate'); return `${p}rotate(${R(A.el)}, ${num(A.deg)});`;
        case 'rotateTo': use('rotate'); return `${p}rotate(${R(A.el)}, ${num(A.deg)}, true);`;
        case 'scaleTo': use('scaleTo'); return `${p}scaleTo(${R(A.el)}, ${num(A.n)});`;
        case 'setCss': use('css'); return `${p}css(${R(A.el)}, ${q(A.prop)}, ${val(A.v)});`;
        case 'toggleCss': use('css'); return `${p}toggleCss(${R(A.el)}, ${q(A.prop)}, ${val(A.a)}, ${val(A.b)});`;
        case 'pick': use('pick'); usesPicked = true; return `${p}pick(${R(A.el)});`;
        case 'pickMove': use('pickMove'); usesPicked = true; return `${p}pickMove(${q(A.dir)});`;
        case 'cloneEl': use('cloneEl'); usesPicked = true; return `${p}cloneEl(${R(A.el)}, ${q(A.where)});`;
        case 'removeEl': use('removeEl'); usesPicked = true; return `${p}removeEl(${R(A.el)});`;
        case 'tableEdit': use('tableEdit'); usesPicked = true; return `${p}tableEdit(${R(A.el)}, ${q(A.act)});`;
        case 'setFormula': use('formula'); return `${p}setFormula(${R(A.el)}, ${val(A.v)});`;
        case 'alert': return `${p}alert(${val(A.msg)});`;
        case 'setText': use('setText'); return `${p}setText(${R(A.el)}, ${val(A.v)});`;
        case 'showHide': use('show'); return `${p}show(${R(A.el)}, ${q(A.mode)});`;
        case 'setColor': use('setStyle'); return `${p}setStyle(${R(A.el)}, ${q(A.prop)}, ${q(A.color)});`;
        case 'setSize': use('setStyle'); return `${p}setStyle(${R(A.el)}, 'fontSize', ${num(A.n)} + 'px');`;
        case 'setOpacity': use('setStyle'); return `${p}setStyle(${R(A.el)}, 'opacity', 1 - ${num(A.n)} / 100);`;
        case 'media': use('media'); return `${p}media(${R(A.el)}, ${q(A.mode)});`;
        case 'beep': use('beep'); return `${p}await beep(${num(A.n)});`;
        case 'ask': usesAnswer = true; return `${p}answer = prompt(${val(A.q)}) ?? '';`;
        case 'setValue': use('setValue'); return `${p}setValue(${R(A.el)}, ${val(A.v)});`;
        case 'setVar': return `${p}${varRef(A.var)} = ${val(A.v)};`;
        case 'changeVar': return `${p}${varRef(A.var)} = Number(${varRef(A.var)}) + ${num(A.v)};`;
        case 'openUrl': return `${p}window.open(${val(A.url)}, '_blank');`;
        case 'forEach': return `${p}for (const [i, item] of (Array.isArray(${varRef(A.var)}) ? [...${varRef(A.var)}] : []).entries()) {\n${body('body', true)}${p}}`;
        case 'stopScript': return `${p}return;`;
        case 'setClass': use('el'); return `${p}el(${R(A.el)})?.classList.${['add', 'remove'].includes(A.mode) ? A.mode : 'toggle'}(${q(A.cls)});`;
        case 'setAttrB': use('el'); return `${p}el(${R(A.el)})?.setAttribute(${q(A.name)}, ${val(A.v)});`;
        case 'setCssAny': use('el'); return `${p}el(${R(A.el)})?.style.setProperty(${q(A.prop)}, String(${val(A.v)}));`;
        case 'dialog': use('el'); return `${p}el(${R(A.el)})?.${A.mode === 'close' ? 'close' : 'showModal'}?.();`;
        case 'focusEl': use('el'); return `${p}el(${R(A.el)})?.focus();`;
        case 'listAdd': return `${p}(Array.isArray(${varRef(A.var)}) ? ${varRef(A.var)} : (${varRef(A.var)} = [])).push(${val(A.v)});`;
        case 'listRemove': return `${p}if (Array.isArray(${varRef(A.var)})) ${varRef(A.var)}.splice(${num(A.n)} - 1, 1);`;
        case 'listClear': return `${p}${varRef(A.var)} = [];`;
        case 'saveLocal': use('store'); return `${p}saveLocal(${val(A.key)}, ${val(A.v)});`;
        case 'fetchJson': return `${p}try { ${varRef(A.var)} = await (await fetch(${val(A.url)})).json(); } catch { ${varRef(A.var)} = ''; }`;
        case 'callFn': usesFns = true; return `${p}await fns[${q(A.fn)}]?.(${val(A.v)});`;
        case 'fnReturn': return `${p}return ${val(A.v)};`;
        case 'jsRun': return !String(A.code).trim() ? '' : jsOk(A.code) ? `${p}${String(A.code).trim().replace(/;?$/, ';')}` : `${p}// JS 실행: 문법 오류 → ${String(A.code).replace(/\n/g, ' ')}`;
        case 'log': return `${p}console.log(${val(A.v)});`;
        case 'comment': return `${p}// ${String(A.t).replace(/\n/g, ' ')}`;
        case 'tryCatch': return `${p}try {\n${body('body')}${p}} catch (error) {\n${body('body2')}${p}}`;
        case 'copyText': return `${p}navigator.clipboard?.writeText(String(${val(A.v)}));`;
      }
      return '';
    }

    const parts = [];
    const fnParts = []; // 함수 정의는 맨 앞에 (어디서든 부를 수 있게)
    const onLoads = []; // 「페이지가 열렸을 때」는 다른 시작 블록이 모두 준비된 뒤 맨 마지막에 실행
    for (const s of data?.scripts || []) {
      const [hat, ...rest] = s.blocks;
      if (!hat || DEFS[hat.type].shape !== 'hat') continue; // 시작 블록이 없는 묶음은 실행되지 않음
      let body = lines(rest, 1, false);
      const comment = `// ${WB.describeBlock(hat)}`;
      const A = hat.args;
      // 「이 요소」를 쓰면 시작 블록마다 무엇인지 정해 줌
      const THIS = { onClick: 'event.currentTarget', onInput: 'event.currentTarget', onSubmit: 'event.currentTarget', onDrop: 'event.currentTarget', onEvent: 'event.currentTarget', onKey: 'event.target', onVisible: `el(${R(A.el)})` };
      if (/\bthisEl\b/.test(body) && hat.type !== 'onGroup') {
        if (hat.type === 'onVisible') use('el');
        body = `  const thisEl = ${THIS[hat.type] || 'null'};\n` + body;
      }
      if (hat.type === 'defFn') { usesFns = true; fnParts.push(`${comment}\nfns[${q(A.fn)}] = async (input) => {\n${body}};`); }
      else if (hat.type === 'onTimer') parts.push(`${comment}\nsetInterval(async () => {\n${body}}, ${num(A.n)} * 1000);`);
      else if (hat.type === 'onScroll') parts.push(`${comment}\naddEventListener('scroll', async (event) => {\n${body}}, { passive: true });`);
      else if (hat.type === 'onLoad') onLoads.push(`${comment}\n(async () => {\n${body}})();`);
      else if (hat.type === 'onKey') {
        // 글자를 입력하는 중에는 (입력칸 · 고칠 수 있는 칸) 키 블록이 움직이지 않게
        const guard = A.when === 'always' ? '' : "  if (event.target.isContentEditable || event.target.matches?.('input, textarea, select')) return;\n";
        const special = A.when === 'always' ? /^(Arrow|Enter$|Tab$| $)/ : /^(Arrow| $)/;
        const stop = special.test(A.key) ? '  event.preventDefault(); // 화면이 스크롤되거나, 버튼이 눌리거나, 칸에 줄바꿈이 들어가지 않게\n' : '';
        parts.push(`${comment}\naddEventListener('keydown', async (event) => {\n  if (event.key !== ${q(A.key)}) return;\n${guard}${stop}${body}});`);
      } else if (hat.type === 'onGroup') {
        parts.push(`${comment}\ndocument.addEventListener(${q(A.ev)}, async (event) => {\n  const thisEl = event.target.closest?.('.' + CSS.escape(${q(A.cls)}));\n  if (!thisEl) return;\n${body}});`);
      } else if (hat.type === 'onVisible') {
        use('whenVisible');
        parts.push(`${comment}\nwhenVisible(${R(A.el)}, async () => {\n${body}});`);
      } else if (hat.type === 'onSignal') {
        usesSignals = true;
        parts.push(`${comment}\nsignals.addEventListener(${q(A.sig)}, async () => {\n${body}});`);
      } else {
        use('on');
        const type = { onClick: 'click', onInput: 'input', onSubmit: 'submit', onDrop: 'wb-drop' }[hat.type] || String(A.ev).replace(/[^a-z]/g, '');
        const pre = hat.type === 'onSubmit' ? '  event.preventDefault(); // 페이지가 새로 고쳐지지 않게\n' : '';
        parts.push(`${comment}\non(${R(A.el)}, '${type}', async (event) => {\n${pre}${body}});`);
      }
    }
    parts.unshift(...fnParts);
    parts.push(...onLoads);
    // 직접 쓴 코드가 있으면 그 코드에서도 el() · on() · vars 를 쓸 수 있게 준비 (코드 자체는 따로 <script> 로)
    const userCode = !!(data?.code || '').trim();
    if (userCode) {
      use('on');
      if ((data.vars || []).length) usesVars = true;
    }
    if (!parts.length && !userCode) return '';
    const head = [];
    const helpers = Object.keys(HELPERS).filter(k => used.has(k)).map(k => HELPERS[k]);
    if (helpers.length) head.push('// 도우미 함수\n' + helpers.join('\n'));
    const state = [];
    if (usesVars) state.push(`const vars = { ${(data.vars || []).map(v => `${q(v)}: 0`).join(', ')} };`);
    if (usesAnswer) state.push("let answer = '';");
    if (usesSignals) state.push('const signals = new EventTarget();');
    if (usesPicked) state.push('let picked = null, made = null; // 고른 요소 · 방금 복제한 요소');
    if (usesFns) state.push('const fns = {}; // 함수');
    if (state.length) head.push('// 변수 · 대답 · 신호\n' + state.join('\n'));
    return [...head, ...parts].join('\n\n') + '\n';
  };
})();
