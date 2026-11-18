'use strict';
/* 웹페이지 틀 5가지 — 편집기가 주는 무료 에셋. 누르면 그 틀로 새 페이지가 열림 (끌어 놓으면 지금 페이지에 통째로)
   글 · 그림은 모두 지어낸 내용이고, 그림은 편집기 무료 그림(js/assets.js)을 씀. 휴대폰 화면에서는 칸이 한 줄로 */
(() => {
  /** E(태그, 스타일, 글자 | [자식들], 속성, 휴대폰 스타일) */
  function E(tag, style = {}, content, attrs = {}, mobile) {
    const n = WB.makeNode(tag, { style: { ...style }, attrs: { ...attrs } });
    if (typeof content === 'string') n.text = content;
    else if (Array.isArray(content) && n.children) n.children = content.filter(Boolean);
    if (mobile) n.styleMobile = { ...mobile };
    return n;
  }
  const art = key => WB.ASSET_ILLUST.find(a => a.key === key)?.src || '';
  const bg = key => WB.ASSET_BG.find(a => a.key === key)?.src || '';
  const icon = (name, style) => Object.assign(WB.iconNode(name), { style: { width: '24px', height: '24px', 'flex-shrink': '0', ...style } });
  const row = (style, kids, mobile) => E('div', { display: 'flex', 'flex-direction': 'row', ...style }, kids, {}, mobile);
  const col = (style, kids, mobile) => E('div', { display: 'flex', 'flex-direction': 'column', ...style }, kids, {}, mobile);
  const grid = (n, style, kids, mobile = { 'grid-template-columns': 'repeat(1, 1fr)' }) => E('div', { display: 'grid', 'grid-template-columns': `repeat(${n}, 1fr)`, ...style }, kids, {}, mobile);
  const link = (text, style, href = '#') => E('a', { 'text-decoration': 'none', 'white-space': 'nowrap', ...style }, text, { href }); // 버튼 글자가 두 줄로 꺾이지 않게
  const PAD = { padding: '64px 48px' }, PAD_M = { padding: '40px 20px' };
  WB.tpl = { E, art, bg, icon, row, col, grid, link, PAD, PAD_M }; // 섹션 에셋(sections.js)도 같은 도구로

  /* ---------- 1. 카페 — 따뜻한 크림 · 갈색, 명조 ---------- */
  function cafe() {
    const brown = '#6b4226', cream = '#f7f1e8';
    const menu = [['오늘의 드립', '에티오피아 원두를 천천히 내린 한 잔', '5,500원'], ['흑당 라테', '직접 졸인 흑당과 우유', '6,000원'], ['버터 스콘', '매일 아침 굽는 스콘과 잼', '4,000원']];
    return {
      title: '온기 커피', style: { margin: '0', 'font-family': "'Gowun Batang', serif", color: '#3b2a1e', 'background-color': cream, 'line-height': '1.7' },
      children: [
        row({ 'justify-content': 'space-between', 'align-items': 'center', padding: '20px 48px' }, [
          E('strong', { 'font-size': '24px', color: brown }, '온기 커피'),
          row({ gap: '24px' }, ['메뉴', '오시는 길', '예약'].map(t => link(t, { color: '#3b2a1e' }))),
        ], { padding: '16px 20px' }),
        grid(2, { gap: '48px', 'align-items': 'center', ...PAD }, [
          col({ gap: '16px' }, [
            E('p', { margin: '0', 'letter-spacing': '3px', 'font-size': '14px', color: brown }, 'SINCE 2019 · 성수동'),
            E('h1', { margin: '0', 'font-size': 'clamp(36px, 5vw, 56px)', 'line-height': '1.25' }, '천천히 내린\n한 잔의 온기'),
            E('p', { margin: '0', 'font-size': '18px', color: '#6f5a48' }, '작은 골목의 오래된 집을 고쳐 만든 카페예요. 매일 아침 원두를 볶고, 빵을 굽습니다.'),
            row({ gap: '12px', 'margin-top': '8px' }, [link('메뉴 보기', { padding: '12px 24px', 'border-radius': '999px', 'background-color': brown, color: '#ffffff' }), link('예약하기', { padding: '12px 24px', 'border-radius': '999px', border: '1px solid ' + brown, color: brown })]),
          ]),
          E('img', { width: '100%', 'aspect-ratio': '4 / 3', 'object-fit': 'cover', 'border-radius': '24px' }, null, { src: art('forest'), alt: '카페 앞 숲길' }),
        ], { ...PAD_M, 'grid-template-columns': 'repeat(1, 1fr)' }),
        col({ ...PAD, gap: '32px', 'background-color': '#efe4d4' }, [
          E('h2', { margin: '0', 'text-align': 'center', 'font-size': '36px' }, '오늘의 메뉴'),
          grid(3, { gap: '20px' }, menu.map(([n, d, p]) => col({ gap: '8px', padding: '28px', 'background-color': '#fffaf2', 'border-radius': '16px' }, [
            E('h3', { margin: '0', 'font-size': '22px' }, n), E('p', { margin: '0', color: '#6f5a48' }, d), E('strong', { color: brown, 'font-size': '18px' }, p),
          ]))),
        ], PAD_M),
        grid(2, { gap: '48px', ...PAD }, [
          col({ gap: '8px' }, [E('h2', { margin: '0', 'font-size': '28px' }, '영업시간'), E('ul', { margin: '0', 'padding-left': '20px' }, ['평일 08:00 – 20:00', '주말 10:00 – 21:00', '매주 월요일 쉬어요'].map(t => E('li', {}, t)))]),
          col({ gap: '8px' }, [E('h2', { margin: '0', 'font-size': '28px' }, '오시는 길'), E('p', { margin: '0' }, '성수역 3번 출구에서 걸어서 5분, 붉은 벽돌 골목 끝 집이에요.'), link('지도 보기 →', { color: brown, 'font-weight': '700' })]),
        ], { ...PAD_M, 'grid-template-columns': 'repeat(1, 1fr)' }),
        E('p', { margin: '0', padding: '24px', 'text-align': 'center', 'font-size': '14px', color: '#8a7462', 'border-top': '1px solid #e3d6c3' }, '© 2026 온기 커피 · 연습용 예시 페이지'),
      ],
    };
  }

  /* ---------- 2. 서비스 소개 — 흰 바탕 · 보라 그라데이션, 현대적 ---------- */
  function saas() {
    const violet = '#6d28d9';
    const feats = [['chart', '한눈에 보는 진행 상황', '팀의 할 일을 보드 · 달력 · 표로 바꿔 가며 봐요.'], ['users', '함께 고치기', '같은 문서를 동시에 고치고 댓글로 이야기해요.'], ['bell', '알맞은 알림', '나와 관련된 일만 골라서 알려 줘요.']];
    const plans = [['무료', '0원', ['팀원 3명', '보드 5개']], ['팀', '9,900원', ['팀원 무제한', '보드 무제한', '자동화']], ['기업', '문의', ['전용 서버', '보안 점검', '담당 매니저']]];
    return {
      title: 'Flowly — 팀의 일을 한 화면에서', style: { margin: '0', 'font-family': "'Inter', 'Noto Sans KR', sans-serif", color: '#111827', 'background-color': '#ffffff', 'line-height': '1.6' },
      children: [
        row({ 'justify-content': 'space-between', 'align-items': 'center', padding: '18px 48px', 'border-bottom': '1px solid #eef0f4' }, [
          E('strong', { 'font-size': '22px', color: violet }, 'Flowly'),
          row({ gap: '28px', 'align-items': 'center' }, [...['기능', '가격', '자주 묻는 질문'].map(t => link(t, { color: '#374151' })), link('무료로 시작', { padding: '8px 16px', 'border-radius': '8px', 'background-color': violet, color: '#ffffff', 'font-weight': '600' })], { gap: '12px' }),
        ], { padding: '14px 20px' }),
        col({ 'align-items': 'center', 'text-align': 'center', gap: '20px', padding: '96px 24px 64px', 'background-image': 'linear-gradient(180deg, #f5f3ff, #ffffff)' }, [
          E('span', { padding: '6px 14px', 'border-radius': '999px', 'background-color': '#ede9fe', color: violet, 'font-size': '14px', 'font-weight': '600' }, '새 기능 · 회의록 자동 정리'),
          E('h1', { margin: '0', 'font-size': 'clamp(36px, 6vw, 64px)', 'line-height': '1.15', 'max-width': '820px' }, '팀의 일을\n한 화면에서'),
          E('p', { margin: '0', 'font-size': '19px', color: '#4b5563', 'max-width': '560px' }, '흩어진 메신저 · 문서 · 할 일을 한곳에 모아, 누가 무엇을 하고 있는지 바로 알 수 있어요.'),
          row({ gap: '12px' }, [link('무료로 시작하기', { padding: '14px 26px', 'border-radius': '10px', 'background-color': violet, color: '#ffffff', 'font-weight': '700' }), link('소개 영상 보기', { padding: '14px 26px', 'border-radius': '10px', border: '1px solid #d1d5db', color: '#111827' })]),
          E('img', { width: '760px', 'max-width': '100%', 'margin-top': '24px', 'border-radius': '16px', 'box-shadow': '0 24px 60px rgba(76, 29, 149, 0.18)' }, null, { src: art('growth'), alt: '서비스 화면' }),
        ]),
        grid(3, { gap: '24px', ...PAD }, feats.map(([ic, t, d]) => col({ gap: '10px', padding: '28px', border: '1px solid #eef0f4', 'border-radius': '16px' }, [
          icon(ic, { color: violet, width: '32px', height: '32px' }), E('h3', { margin: '0', 'font-size': '20px' }, t), E('p', { margin: '0', color: '#6b7280' }, d),
        ])), PAD_M),
        col({ gap: '32px', ...PAD, 'background-color': '#faf9ff' }, [
          E('h2', { margin: '0', 'text-align': 'center', 'font-size': '36px' }, '간단한 가격'),
          grid(3, { gap: '20px', 'align-items': 'stretch' }, plans.map(([n, p, list], i) => col({ gap: '12px', padding: '32px', 'border-radius': '16px', 'background-color': i === 1 ? violet : '#ffffff', color: i === 1 ? '#ffffff' : '#111827', border: '1px solid ' + (i === 1 ? violet : '#e5e7eb') }, [
            E('h3', { margin: '0', 'font-size': '18px' }, n), E('p', { margin: '0', 'font-size': '36px', 'font-weight': '800' }, p),
            E('ul', { margin: '0', 'padding-left': '20px', opacity: '0.85' }, list.map(t => E('li', {}, t))),
            link(i === 2 ? '문의하기' : '시작하기', { 'margin-top': 'auto', padding: '12px', 'text-align': 'center', 'border-radius': '10px', 'background-color': i === 1 ? '#ffffff' : '#f3f4f6', color: i === 1 ? violet : '#111827', 'font-weight': '700' }),
          ]))),
        ], PAD_M),
        col({ gap: '12px', ...PAD, 'max-width': '760px', margin: '0 auto' }, [
          E('h2', { margin: '0 0 12px', 'font-size': '32px' }, '자주 묻는 질문'),
          ...[['무료로 얼마나 쓸 수 있나요?', '팀원 3명까지는 기간 제한 없이 무료예요.'], ['다른 도구에서 옮길 수 있나요?', '엑셀 · 다른 할 일 앱의 파일을 그대로 가져올 수 있어요.'], ['언제든 해지할 수 있나요?', '네, 설정에서 바로 해지되고 남은 기간만큼 돌려드려요.']].map(([q, a]) =>
            E('details', { padding: '16px 20px', border: '1px solid #e5e7eb', 'border-radius': '12px' }, [E('summary', { 'font-weight': '700', cursor: 'pointer' }, q), E('p', { margin: '10px 0 0', color: '#4b5563' }, a)])),
        ], PAD_M),
        E('p', { margin: '0', padding: '28px', 'text-align': 'center', 'font-size': '14px', color: '#9ca3af', 'background-color': '#111827' }, '© 2026 Flowly · 지어낸 서비스의 연습용 예시 페이지'),
      ],
    };
  }

  /* ---------- 3. 포트폴리오 — 흑백, 큰 글자, 여백 많이 ---------- */
  function folio() {
    const works = [['city', '도시 지도 앱', '2026'], ['ocean', '해양 박물관 사이트', '2025'], ['idea', '스타트업 브랜딩', '2025'], ['book', '동네 서점 리뉴얼', '2024']];
    return {
      title: '김도윤 — 디자이너', style: { margin: '0', 'font-family': "'Inter', 'Noto Sans KR', sans-serif", color: '#111111', 'background-color': '#fafafa', 'line-height': '1.6' },
      children: [
        row({ 'justify-content': 'space-between', 'align-items': 'center', padding: '24px 48px' }, [
          E('strong', { 'font-size': '16px', 'letter-spacing': '2px' }, 'KIM DOYUN'),
          row({ gap: '24px' }, ['Work', 'About', 'Contact'].map(t => link(t, { color: '#111111' }))),
        ], { padding: '18px 20px' }),
        col({ gap: '24px', padding: '120px 48px 80px' }, [
          E('h1', { margin: '0', 'font-size': 'clamp(48px, 9vw, 120px)', 'line-height': '1', 'letter-spacing': '-3px', 'font-weight': '800' }, 'Designer &\nDeveloper'),
          E('p', { margin: '0', 'font-size': '20px', color: '#555555', 'max-width': '520px' }, '서울에서 브랜드와 웹사이트를 만듭니다. 쓰기 쉽고 오래 보아도 질리지 않는 화면을 좋아해요.'),
        ], { padding: '64px 20px 40px' }),
        grid(2, { gap: '40px 24px', padding: '0 48px 80px' }, works.map(([a, t, y]) => col({ gap: '12px' }, [
          E('img', { width: '100%', 'aspect-ratio': '4 / 3', 'object-fit': 'cover', 'background-color': '#eeeeee' }, null, { src: art(a), alt: t }),
          row({ 'justify-content': 'space-between' }, [E('strong', { 'font-size': '18px' }, t), E('span', { color: '#888888' }, y)]),
        ])), { padding: '0 20px 40px', 'grid-template-columns': 'repeat(1, 1fr)' }),
        grid(2, { gap: '48px', padding: '80px 48px', 'border-top': '1px solid #e5e5e5' }, [
          E('h2', { margin: '0', 'font-size': '40px' }, 'About'),
          E('p', { margin: '0', 'font-size': '18px', color: '#444444' }, '10년 동안 스타트업과 문화 기관의 웹사이트를 만들었어요. 지금은 작은 팀들과 함께 브랜드를 처음부터 다듬는 일을 합니다.'),
        ], { padding: '48px 20px', 'grid-template-columns': 'repeat(1, 1fr)' }),
        col({ gap: '12px', padding: '80px 48px 120px', 'background-color': '#111111' }, [
          E('p', { margin: '0', color: '#888888' }, '같이 일해요'),
          link('hello@example.com', { 'font-size': 'clamp(28px, 5vw, 56px)', 'font-weight': '700', color: '#ffffff', 'text-decoration': 'underline' }, 'mailto:hello@example.com'),
        ], { padding: '48px 20px 64px' }),
      ],
    };
  }

  /* ---------- 4. 페스티벌 — 어두운 바탕 · 네온 색, 굵은 글자 ---------- */
  function festival() {
    const pink = '#ff2e88', cyan = '#00e0ff';
    const lineup = ['새벽 라디오', '파란 고양이', 'HAN RIVER', '오늘의 날씨', '두 번째 여름', 'NOVA', '골목 밴드', '루프탑'];
    return {
      title: 'NEON NIGHT 2026', style: { margin: '0', 'font-family': "'Noto Sans KR', sans-serif", color: '#f5f5f5', 'background-color': '#0a0a12', 'line-height': '1.6' },
      children: [
        col({ gap: '20px', padding: '120px 48px 96px', ...WB.bgStyle(bg('night')) }, [
          E('p', { margin: '0', color: cyan, 'letter-spacing': '6px', 'font-weight': '700' }, 'MUSIC · LIGHT · SUMMER'),
          E('h1', { margin: '0', 'font-family': "'Anton', sans-serif", 'font-size': 'clamp(56px, 12vw, 160px)', 'line-height': '0.95', color: '#ffffff', 'text-shadow': `0 0 24px ${pink}` }, 'NEON\nNIGHT'),
          E('p', { margin: '0', 'font-size': '22px', 'font-weight': '700' }, '2026. 8. 14 – 16 · 한강 공원 특설 무대'),
          row({ gap: '12px', 'margin-top': '12px' }, [link('티켓 예매', { padding: '14px 28px', 'border-radius': '999px', 'background-color': pink, color: '#ffffff', 'font-weight': '800' }), link('라인업 보기', { padding: '14px 28px', 'border-radius': '999px', border: '2px solid ' + cyan, color: cyan, 'font-weight': '800' })]),
        ], { padding: '72px 20px 56px' }),
        grid(3, { 'text-align': 'center', padding: '48px', gap: '16px', 'background-image': `linear-gradient(90deg, ${pink}, #7a2cff, ${cyan})` }, [['3일', '밤새 이어지는 공연'], ['24팀', '국내외 아티스트'], ['2만 명', '함께하는 관객']].map(([n, l]) => col({ gap: '4px' }, [
          E('strong', { 'font-family': "'Black Han Sans', sans-serif", 'font-size': '48px', color: '#0a0a12' }, n), E('span', { color: '#0a0a12', 'font-weight': '700' }, l),
        ])), { padding: '32px 20px', 'grid-template-columns': 'repeat(1, 1fr)' }),
        col({ gap: '28px', ...PAD }, [
          E('h2', { margin: '0', 'font-family': "'Black Han Sans', sans-serif", 'font-size': '44px', color: cyan }, 'LINE UP'),
          grid(4, { gap: '14px' }, lineup.map((t, i) => E('p', { margin: '0', padding: '22px', 'text-align': 'center', 'font-size': '20px', 'font-weight': '800', border: '2px solid ' + (i % 2 ? cyan : pink), 'border-radius': '14px', color: i % 2 ? cyan : pink }, t)), { 'grid-template-columns': 'repeat(2, 1fr)' }),
        ], PAD_M),
        col({ gap: '24px', ...PAD, 'background-color': '#12121f' }, [
          E('h2', { margin: '0', 'font-family': "'Black Han Sans', sans-serif", 'font-size': '44px', color: pink }, 'TICKET'),
          grid(2, { gap: '20px' }, [['1일권', '59,000원', '원하는 하루를 골라요'], ['3일권', '139,000원', '사흘 내내 자유 입장']].map(([n, p, d], i) => col({ gap: '8px', padding: '32px', 'border-radius': '20px', 'background-color': i ? pink : '#1d1d33' }, [
            E('h3', { margin: '0', 'font-size': '22px' }, n), E('p', { margin: '0', 'font-size': '40px', 'font-weight': '900' }, p), E('p', { margin: '0', opacity: '0.8' }, d),
          ]))),
        ], PAD_M),
        E('p', { margin: '0', padding: '28px', 'text-align': 'center', 'font-size': '14px', color: '#77778a' }, '© 2026 NEON NIGHT · 지어낸 행사의 연습용 예시 페이지'),
      ],
    };
  }

  /* ---------- 5. 동네 매거진 — 신문처럼, 명조 · 가는 선 ---------- */
  function magazine() {
    const ink = '#1a1a1a', line = '1px solid #d8d2c4';
    const side = [['골목 빵집 지도', '아침 7시에 문 여는 빵집 여섯 곳을 걸어서 돌아봤다.'], ['오래된 시장의 새 얼굴', '청년 상인 열두 명이 빈 가게를 채웠다.'], ['주말 산책 길', '강변을 따라 걷는 한 시간짜리 코스.']];
    const reads = [['book', '동네 서점 주인의 추천 다섯 권'], ['team', '함께 쓰는 공유 부엌'], ['idea', '버려진 물건으로 만든 전시']];
    return {
      title: '주간 골목', style: { margin: '0', 'font-family': "'Nanum Myeongjo', serif", color: ink, 'background-color': '#fffdf7', 'line-height': '1.75' },
      children: [
        col({ 'align-items': 'center', gap: '6px', padding: '36px 48px 16px', 'border-bottom': '4px double ' + ink }, [
          E('p', { margin: '0', 'font-size': '13px', 'letter-spacing': '2px' }, '2026년 11월 셋째 주 · 제 128호'),
          E('h1', { margin: '0', 'font-size': 'clamp(44px, 8vw, 80px)', 'letter-spacing': '8px', 'line-height': '1.1' }, '주간 골목'),
          row({ gap: '20px', 'margin-top': '10px', 'flex-wrap': 'wrap', 'justify-content': 'center' }, ['동네 소식', '가게', '사람', '산책', '읽을거리'].map(t => link(t, { color: ink, 'font-size': '15px' }))),
        ], { padding: '24px 20px 12px' }),
        E('div', { display: 'grid', 'grid-template-columns': '2fr 1fr', gap: '40px', padding: '40px 48px' }, [
          col({ gap: '14px' }, [
            E('img', { width: '100%', 'aspect-ratio': '16 / 9', 'object-fit': 'cover' }, null, { src: art('city'), alt: '밤의 골목' }),
            E('h2', { margin: '0', 'font-size': '36px', 'line-height': '1.3' }, '불 꺼진 상가에 다시 불이 켜지기까지'),
            E('p', { margin: '0', 'font-size': '18px', color: '#3d3d3d' }, '3년 동안 비어 있던 골목 상가에 지난달부터 하나둘 불이 켜졌다. 주민들이 직접 모은 돈으로 첫 가게의 월세를 함께 냈고, 그 가게가 다음 가게를 불렀다. 기자가 한 달 동안 그 골목을 지켜봤다.'),
            E('p', { margin: '0', 'font-size': '14px', color: '#8a8475' }, '글 · 이서진 기자'),
          ]),
          col({ gap: '0' }, side.map(([t, d], i) => col({ gap: '6px', padding: '18px 0 18px 20px', 'border-left': line, 'border-bottom': i < 2 ? line : 'none' }, [E('h3', { margin: '0', 'font-size': '20px' }, t), E('p', { margin: '0', color: '#555049' }, d)]))),
        ], {}, { 'grid-template-columns': 'repeat(1, 1fr)', padding: '24px 20px' }),
        col({ gap: '20px', padding: '40px 48px', 'border-top': line }, [
          E('h2', { margin: '0', 'font-size': '24px', 'letter-spacing': '4px' }, '이번 주 읽을거리'),
          grid(3, { gap: '28px' }, reads.map(([a, t]) => col({ gap: '10px' }, [
            E('img', { width: '100%', 'aspect-ratio': '4 / 3', 'object-fit': 'cover', filter: 'grayscale(0.3)' }, null, { src: art(a), alt: t }),
            E('h3', { margin: '0', 'font-size': '20px', 'line-height': '1.4' }, t), E('p', { margin: '0', 'font-size': '15px', color: '#555049' }, '짧은 소개 글을 적어요. 두 번 클릭하면 바로 고칠 수 있어요.'),
          ]))),
        ], PAD_M),
        E('blockquote', { margin: '0', padding: '56px 48px', 'text-align': 'center', 'font-size': '28px', 'line-height': '1.6', 'background-color': '#f2ede0' }, '“골목은 지나가는 길이 아니라\n머무는 곳이 되어야 한다.”', {}, { padding: '36px 20px', 'font-size': '22px' }),
        E('p', { margin: '0', padding: '24px', 'text-align': 'center', 'font-size': '13px', color: '#8a8475', 'border-top': line }, '© 2026 주간 골목 · 지어낸 매거진의 연습용 예시 페이지'),
      ],
    };
  }

  /* ================= 자기소개 ================= */
  /** 링크 모음 프로필 — 파스텔 그라데이션, 가운데 카드 */
  function linkProfile() {
    const pink = '#f472b6';
    return {
      title: '하늘 · 링크 모음', style: { margin: '0', 'min-height': '100vh', 'font-family': "'Gowun Dodum', sans-serif", color: '#3b2f4a', 'background-image': 'linear-gradient(160deg, #fde2f3, #e0e7ff 55%, #dbf4ff)', 'line-height': '1.6' },
      children: [
        col({ 'align-items': 'center', gap: '14px', 'max-width': '440px', margin: '0 auto', padding: '64px 24px' }, [
          E('img', { width: '120px', height: '120px', 'border-radius': '50%', 'object-fit': 'cover', border: '4px solid #ffffff', 'box-shadow': '0 8px 24px rgba(120, 80, 160, 0.25)' }, null, { src: art('idea'), alt: '프로필 그림' }),
          E('h1', { margin: '0', 'font-size': '28px' }, '하늘'),
          E('p', { margin: '0', 'text-align': 'center', color: '#6b5b7b' }, '그림 그리고 글 쓰는 사람\n고양이 두 마리와 살아요'),
          col({ gap: '12px', width: '100%', 'margin-top': '12px' }, [['작업 모음 보기', '#ffffff'], ['그림 일기 블로그', '#ffffff'], ['작은 가게 (스티커 · 엽서)', '#ffffff'], ['함께 일하기 문의', pink]].map(([t, c]) =>
            link(t, { display: 'block', padding: '16px', 'text-align': 'center', 'border-radius': '16px', 'background-color': c, color: c === '#ffffff' ? '#3b2f4a' : '#ffffff', 'font-weight': '700', 'box-shadow': '0 4px 14px rgba(120, 80, 160, 0.12)' }))),
          row({ gap: '18px', 'margin-top': '16px', color: '#6b5b7b' }, ['mail', 'heart', 'star', 'chat'].map(n => icon(n))),
          E('p', { margin: '20px 0 0', 'font-size': '13px', color: '#9a8aa8' }, '© 2026 하늘 · 연습용 예시'),
        ]),
      ],
    };
  }
  /** 이력서 — 남색 · 명조, 기술 막대 · 경력 줄 */
  function resume() {
    const navy = '#1e3a5f';
    const skills = [['기획', 90], ['데이터 분석', 75], ['디자인 도구', 60], ['발표', 85]];
    const jobs = [['2024 – 지금', '작은 출판사 · 기획 팀장', '책 열두 권을 기획하고 독자 모임을 만들었어요.'], ['2021 – 2024', '교육 회사 · 콘텐츠 기획', '온라인 강의 40편을 만들었어요.'], ['2019 – 2021', '대학 신문사 · 편집장', '학생 기자 20명과 매주 신문을 냈어요.']];
    return {
      title: '이서윤 — 이력서', style: { margin: '0', 'font-family': "'Nanum Myeongjo', serif", color: '#1f2937', 'background-color': '#f4f6f9', 'line-height': '1.7' },
      children: [
        col({ gap: '6px', padding: '56px 64px 40px', 'background-color': navy, color: '#ffffff' }, [
          E('h1', { margin: '0', 'font-size': '44px', 'letter-spacing': '4px' }, '이서윤'),
          E('p', { margin: '0', 'font-size': '18px', color: '#c7d4e6' }, '콘텐츠 기획자 · 7년'),
          row({ gap: '20px', 'margin-top': '10px', 'flex-wrap': 'wrap', 'font-size': '15px', color: '#c7d4e6' }, ['seoyun@example.com', '010-0000-0000', '서울'].map(t => E('span', {}, t))),
        ], { padding: '40px 20px 28px' }),
        E('div', { display: 'grid', 'grid-template-columns': '1fr 2fr', gap: '48px', padding: '48px 64px' }, [
          col({ gap: '16px' }, [
            E('h2', { margin: '0', 'font-size': '20px', color: navy, 'border-bottom': '2px solid ' + navy, 'padding-bottom': '6px' }, '할 줄 아는 것'),
            ...skills.map(([n, v]) => col({ gap: '6px' }, [row({ 'justify-content': 'space-between', 'font-size': '15px' }, [E('span', {}, n), E('span', { color: '#6b7280' }, v + '%')]),
              E('div', { height: '8px', 'border-radius': '4px', 'background-color': '#dfe5ee' }, [E('div', { width: v + '%', height: '100%', 'border-radius': '4px', 'background-color': navy })])])),
            E('h2', { margin: '16px 0 0', 'font-size': '20px', color: navy, 'border-bottom': '2px solid ' + navy, 'padding-bottom': '6px' }, '배운 곳'),
            E('p', { margin: '0' }, '한국대학교 국어국문학과 (2019 졸업)'),
          ]),
          col({ gap: '0' }, [
            E('h2', { margin: '0 0 16px', 'font-size': '20px', color: navy, 'border-bottom': '2px solid ' + navy, 'padding-bottom': '6px' }, '일한 곳'),
            ...jobs.map(([y, t, d]) => col({ gap: '4px', padding: '0 0 24px 24px', 'border-left': '2px solid #c7d4e6' }, [E('span', { 'font-size': '14px', color: '#6b7280' }, y), E('h3', { margin: '0', 'font-size': '20px' }, t), E('p', { margin: '0', color: '#4b5563' }, d)])),
          ]),
        ], {}, { 'grid-template-columns': 'repeat(1, 1fr)', padding: '28px 20px' }),
      ],
    };
  }

  /* ================= 발표 (슬라이드) ================= */
  const at = (x, y, style = {}) => ({ position: 'absolute', left: x + 'px', top: y + 'px', margin: '0', ...style });
  const T = (tag, text, x, y, style) => E(tag, at(x, y, style), text);
  const slide = (bg, kids, notes) => E('section', { position: 'relative', width: '1280px', height: '720px', overflow: 'hidden', margin: '0 auto 32px', 'box-shadow': '0 2px 12px rgba(0, 0, 0, 0.12)', ...bg }, kids, { 'data-slide': '', ...(notes ? { 'data-notes': notes } : {}) });
  const num = color => E('span', at(1180, 664, { width: '60px', 'text-align': 'right', 'font-size': '16px', color }), '1', { 'data-slide-num': '' });
  const arrow = (x, y, color) => Object.assign(E('svg', at(x, y, { width: '60px', height: '40px', color }), null, { viewBox: '0 0 160 40', fill: 'none', 'data-shape': 'arrow' }), { raw: '<path d="M2 20 H150" stroke="currentColor" stroke-width="6" stroke-linecap="round"></path><path d="M136 6 L154 20 L136 34" stroke="currentColor" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>' });
  /** 미니멀 — 흰 바탕 · 검정 · 빨간 점 하나 */
  function deckMinimal() {
    const red = '#e11d48', W = { 'background-color': '#ffffff' };
    return {
      title: '작게 시작하기 — 발표', style: { margin: '0', padding: '32px 0', 'font-family': "'Inter', 'Noto Sans KR', sans-serif", color: '#111111', 'background-color': '#e5e5e5' },
      children: [
        slide(W, [E('div', at(80, 250, { width: '18px', height: '18px', 'border-radius': '50%', 'background-color': red })), T('h1', '작게 시작하기', 80, 290, { 'font-size': '88px', 'font-weight': '800', 'letter-spacing': '-3px' }), T('p', '새 프로젝트를 일주일 안에 띄우는 법 · 2026', 80, 420, { 'font-size': '24px', color: '#666666' })], '인사하고 오늘 이야기할 세 가지를 먼저 말하기'),
        slide(W, [T('h2', '세 가지만 기억하세요', 80, 80, { 'font-size': '48px', 'font-weight': '800' }),
          ...[['01', '하나만 만든다', '가장 작은 기능 하나로 시작해요.'], ['02', '바로 보여 준다', '완성 전에 사람들에게 보여요.'], ['03', '숫자로 본다', '느낌 대신 숫자로 판단해요.']].flatMap(([n, t, d], i) => [
            T('p', n, 80 + i * 380, 240, { 'font-size': '64px', 'font-weight': '800', color: red }), T('h3', t, 80 + i * 380, 340, { 'font-size': '28px' }), T('p', d, 80 + i * 380, 390, { 'font-size': '20px', color: '#666666', width: '320px' })]), num('#999999')]),
        slide(W, [T('h2', '첫 주의 방문자 수', 80, 70, { 'font-size': '44px', 'font-weight': '800' }), E('svg', at(80, 160, { width: '780px' }), null, { 'data-chart': 'bar', 'data-values': '12,30,26,58,71,96,120', 'data-labels': '월,화,수,목,금,토,일', 'data-colors': '#111111' }),
          T('p', '목요일에 처음 소개 글을 올리고 나서 방문자가 두 배로 늘었어요.', 920, 260, { 'font-size': '22px', width: '280px', color: '#444444' }), num('#999999')]),
        slide({ 'background-color': '#111111' }, [T('h1', '고맙습니다', 80, 280, { 'font-size': '96px', 'font-weight': '800', color: '#ffffff' }), E('div', at(80, 420, { width: '18px', height: '18px', 'border-radius': '50%', 'background-color': red })), T('p', 'hello@example.com', 120, 410, { 'font-size': '22px', color: '#aaaaaa' })]),
      ],
    };
  }
  /** 다크 테크 — 남색 · 하늘색 · 둥근 카드 */
  function deckTech() {
    const cyan = '#22d3ee', D = { 'background-image': 'linear-gradient(135deg, #0b1226, #13203f)' };
    return {
      title: '새 앱 출시 보고 — 발표', style: { margin: '0', padding: '32px 0', 'font-family': "'Pretendard', 'Noto Sans KR', sans-serif", color: '#e5edf7', 'background-color': '#05080f' },
      children: [
        slide(D, [E('img', at(700, 0, { width: '580px', height: '720px', 'object-fit': 'cover', opacity: '0.9' }), null, { src: art('space'), alt: '' }), T('p', 'PRODUCT LAUNCH · Q4', 80, 230, { 'font-family': "'Orbitron', sans-serif", 'font-size': '20px', 'letter-spacing': '4px', color: cyan }), T('h1', '모아 앱 2.0\n출시 보고', 80, 270, { 'font-size': '72px', 'line-height': '1.15', color: '#ffffff' }), T('p', '제품팀 · 2026년 11월', 80, 480, { 'font-size': '22px', color: '#8ea3c2' })]),
        slide(D, [T('h2', '출시 첫 달', 80, 70, { 'font-size': '44px', color: '#ffffff' }), ...[['12만', '내려받기'], ['4.8', '평균 별점'], ['31%', '다시 찾은 사람']].map(([n, l], i) =>
          E('div', at(80 + i * 380, 220, { width: '340px', height: '260px', padding: '36px', 'border-radius': '20px', 'background-color': 'rgba(34, 211, 238, 0.08)', border: '1px solid rgba(34, 211, 238, 0.35)' }), [E('p', { margin: '0', 'font-family': "'Orbitron', sans-serif", 'font-size': '60px', 'font-weight': '900', color: cyan }, n), E('p', { margin: '10px 0 0', 'font-size': '22px', color: '#c3d1e6' }, l)])), num('#5b6b85')]),
        slide(D, [T('h2', '다음 분기 계획', 80, 70, { 'font-size': '44px', color: '#ffffff' }), ...['의견 듣기', '고치기', '다시 내기'].flatMap((t, i) => [
          E('div', at(80 + i * 400, 300, { width: '300px', height: '150px', padding: '30px', 'border-radius': '18px', 'background-color': i === 1 ? cyan : '#1b2a4d' }), [E('p', { margin: '0', 'font-size': '15px', 'font-weight': '700', color: i === 1 ? '#0b1226' : cyan }, 'STEP ' + (i + 1)), E('p', { margin: '8px 0 0', 'font-size': '30px', 'font-weight': '800', color: i === 1 ? '#0b1226' : '#ffffff' }, t)]),
          ...(i < 2 ? [arrow(400 + i * 400, 355, cyan)] : [])]), num('#5b6b85')]),
        slide(D, [T('h1', '질문 받습니다', 80, 290, { 'font-size': '84px', color: '#ffffff' }), T('p', '제품팀 채널 #moa-app', 80, 410, { 'font-size': '22px', color: cyan })]),
      ],
    };
  }
  /** 파스텔 교실 — 크림 바탕 · 둥근 글꼴 · 그림 */
  function deckPastel() {
    const C = { 'background-color': '#fff8ec' };
    return {
      title: '물은 어디로 갈까? — 발표', style: { margin: '0', padding: '32px 0', 'font-family': "'Jua', sans-serif", color: '#4a3b2a', 'background-color': '#f2e6d3' },
      children: [
        slide(C, [E('img', at(700, 120, { width: '480px', height: '480px', 'object-fit': 'cover', 'border-radius': '48px' }), null, { src: art('ocean'), alt: '바다' }), T('p', '3학년 2반 과학 시간', 90, 220, { 'font-size': '26px', color: '#f08a5d' }), T('h1', '물은\n어디로 갈까?', 90, 270, { 'font-size': '84px', 'line-height': '1.2' }), T('p', '물의 여행 이야기', 90, 500, { 'font-size': '28px', color: '#8a7559' })]),
        slide(C, [T('h2', '물의 여행 네 정거장', 90, 70, { 'font-size': '52px' }), ...[['☁', '구름', '#bde0fe'], ['☂', '비', '#a2d2ff'], ['≈', '강', '#caffbf'], ['☀', '증발', '#ffd6a5']].map(([s, t, c], i) =>
          E('div', at(90 + i * 280, 230, { width: '240px', height: '300px', padding: '30px', 'border-radius': '40px', 'background-color': c, 'text-align': 'center' }), [E('p', { margin: '0', 'font-size': '90px', 'line-height': '1.4' }, s), E('p', { margin: '10px 0 0', 'font-size': '36px' }, t)])), num('#c4a87f')]),
        slide(C, [T('h2', '퀴즈!', 90, 70, { 'font-size': '60px', color: '#f08a5d' }), T('p', '바닷물이 하늘로 올라가는 것을\n무엇이라고 할까요?', 90, 200, { 'font-size': '44px', 'line-height': '1.5' }),
          ...['① 비', '② 증발', '③ 얼음'].map((t, i) => E('p', at(90 + i * 330, 430, { width: '290px', padding: '24px', 'border-radius': '28px', 'text-align': 'center', 'font-size': '34px', 'background-color': i === 1 ? '#ffd6a5' : '#ffffff', border: '4px solid #f2d4a8' }), t)), num('#c4a87f')], '정답은 ② 증발. 손을 들어 대답하게 하기'),
        slide({ 'background-color': '#ffd6a5' }, [T('h1', '오늘도 수고했어요!', 90, 280, { 'font-size': '84px' }), T('p', '다음 시간: 구름 만들기 실험', 90, 410, { 'font-size': '30px', color: '#8a5a2b' })]),
      ],
    };
  }

  /* ================= 웹 게임 ================= */
  /** 숫자 맞히기 — 옛날 게임기처럼 초록 화면 · 픽셀 글꼴 */
  function gameGuess() {
    const g = '#39ff88';
    return {
      title: '숫자 맞히기', style: { margin: '0', 'min-height': '100vh', 'font-family': "'Press Start 2P', monospace", color: g, 'background-color': '#071a0f', 'line-height': '1.8' },
      children: [
        col({ 'align-items': 'center', gap: '24px', padding: '72px 20px', 'text-align': 'center' }, [
          E('h1', { margin: '0', 'font-size': 'clamp(22px, 4vw, 40px)', 'text-shadow': `0 0 12px ${g}` }, 'NUMBER\nGUESS'),
          E('p', { margin: '0', 'font-size': '12px', color: '#9fffc6' }, '1 부터 100 사이의 숫자를 맞혀 보세요', { id: 'guess-msg' }),
          row({ gap: '12px' }, [
            E('input', { width: '140px', padding: '14px', 'font-family': 'inherit', 'font-size': '18px', 'text-align': 'center', color: g, 'background-color': '#000000', border: '3px solid ' + g }, null, { id: 'guess-input', type: 'number', min: '1', max: '100', placeholder: '?' }),
            E('button', { padding: '14px 20px', 'font-family': 'inherit', 'font-size': '14px', color: '#071a0f', 'background-color': g, border: '0', cursor: 'pointer' }, 'GO', { id: 'guess-btn', type: 'button' }),
          ]),
          E('p', { margin: '0', 'font-size': '12px' }, '시도 0번', { id: 'guess-count' }),
          E('button', { padding: '10px 16px', 'font-family': 'inherit', 'font-size': '11px', color: g, 'background-color': 'transparent', border: '2px dashed ' + g, cursor: 'pointer' }, 'NEW GAME', { id: 'guess-reset', type: 'button' }),
        ]),
      ],
      code: `// 숫자 맞히기: 1~100 사이 정답을 위 · 아래 힌트로 찾기
const $ = id => document.getElementById(id);
let answer = 0, tries = 0;
function newGame() {
  answer = Math.floor(Math.random() * 100) + 1;
  tries = 0;
  $('guess-msg').textContent = '1 부터 100 사이의 숫자를 맞혀 보세요';
  $('guess-count').textContent = '시도 0번';
  $('guess-input').value = '';
}
function check() {
  const v = Number($('guess-input').value);
  if (!v || v < 1 || v > 100) { $('guess-msg').textContent = '1 부터 100 사이 숫자를 넣어 주세요'; return; }
  tries++;
  $('guess-count').textContent = '시도 ' + tries + '번';
  if (v === answer) $('guess-msg').textContent = '정답! ' + tries + '번 만에 맞혔어요';
  else $('guess-msg').textContent = v < answer ? 'UP! 더 큰 수예요' : 'DOWN! 더 작은 수예요';
  $('guess-input').select();
}
$('guess-btn').addEventListener('click', check);
$('guess-input').addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
$('guess-reset').addEventListener('click', newGame);
newGame();`,
    };
  }
  /** 반응 속도 — 파스텔 · 동글동글, 움직이는 과녁 누르기 */
  function gameTap() {
    return {
      title: '콕콕 잡기', style: { margin: '0', 'min-height': '100vh', 'font-family': "'Jua', sans-serif", color: '#5b4b8a', 'background-image': 'linear-gradient(180deg, #fff1f8, #eef4ff)' },
      children: [
        col({ 'align-items': 'center', gap: '16px', padding: '40px 20px' }, [
          E('h1', { margin: '0', 'font-size': '48px' }, '콕콕 잡기'),
          E('p', { margin: '0', 'font-size': '18px', color: '#8a7bb8' }, '20초 동안 움직이는 별을 최대한 많이 누르세요!'),
          row({ gap: '16px', 'font-size': '22px' }, [E('span', { padding: '8px 18px', 'border-radius': '999px', 'background-color': '#ffffff' }, '점수 0', { id: 'score' }), E('span', { padding: '8px 18px', 'border-radius': '999px', 'background-color': '#ffffff' }, '남은 시간 20', { id: 'time' })]),
          E('div', { position: 'relative', width: '100%', 'max-width': '720px', height: '380px', 'border-radius': '32px', 'background-color': '#ffffff', 'box-shadow': '0 10px 30px rgba(91, 75, 138, 0.15)', overflow: 'hidden' }, [
            E('button', { position: 'absolute', left: '320px', top: '150px', width: '72px', height: '72px', 'border-radius': '50%', border: '0', 'background-color': '#ffd166', 'font-size': '34px', cursor: 'pointer', 'box-shadow': '0 6px 0 #f4a940' }, '★', { id: 'target', type: 'button' }),
          ], { id: 'arena' }),
          E('p', { margin: '0', 'font-size': '24px', color: '#f472b6' }, '', { id: 'result' }),
          E('button', { padding: '14px 36px', 'border-radius': '999px', border: '0', 'background-color': '#8b5cf6', color: '#ffffff', 'font-family': 'inherit', 'font-size': '22px', cursor: 'pointer', 'box-shadow': '0 6px 0 #6d3fd6' }, '시작!', { id: 'start-btn', type: 'button' }),
        ]),
      ],
      code: `// 콕콕 잡기: 20초 동안 움직이는 별 누르기
const $ = id => document.getElementById(id);
let score = 0, left = 0, timer = null;
function move() {
  const a = $('arena'), t = $('target');
  t.style.left = Math.random() * (a.clientWidth - t.offsetWidth) + 'px';
  t.style.top = Math.random() * (a.clientHeight - t.offsetHeight) + 'px';
}
$('target').style.display = 'none';
$('start-btn').addEventListener('click', () => {
  score = 0; left = 20;
  $('score').textContent = '점수 0';
  $('time').textContent = '남은 시간 20';
  $('result').textContent = '';
  $('target').style.display = 'block';
  move();
  clearInterval(timer);
  timer = setInterval(() => {
    left--;
    $('time').textContent = '남은 시간 ' + left;
    if (left <= 0) {
      clearInterval(timer);
      $('target').style.display = 'none';
      $('result').textContent = '끝! ' + score + '점이에요';
    }
  }, 1000);
});
$('target').addEventListener('click', () => { score++; $('score').textContent = '점수 ' + score; move(); });`,
    };
  }
  /** 기억력 카드 — 어두운 네온 · 카드 12장 */
  function gameMemory() {
    const cyan = '#22d3ee';
    return {
      title: '짝 맞추기', style: { margin: '0', 'min-height': '100vh', 'font-family': "'Orbitron', 'Noto Sans KR', sans-serif", color: '#e2e8f0', 'background-color': '#0f0a1e' },
      children: [
        col({ 'align-items': 'center', gap: '18px', padding: '48px 20px' }, [
          E('h1', { margin: '0', 'font-size': '40px', color: cyan, 'letter-spacing': '4px', 'text-shadow': `0 0 16px ${cyan}` }, 'MEMORY'),
          E('p', { margin: '0', color: '#a5b4fc' }, '같은 그림 두 장을 찾아요', { id: 'mem-msg' }),
          row({ gap: '8px', 'font-size': '18px' }, [E('span', {}, '뒤집은 횟수'), E('strong', { color: cyan }, '0', { id: 'moves' })]),
          E('div', { display: 'grid', 'grid-template-columns': 'repeat(4, 1fr)', gap: '12px', width: '100%', 'max-width': '440px' },
            range12().map(() => E('button', { 'aspect-ratio': '1', 'border-radius': '14px', border: '2px solid #4c1d95', 'background-color': '#1e1638', color: '#ffffff', 'font-size': '34px', cursor: 'pointer' }, '?', { class: 'mem-card', type: 'button' }))),
          E('button', { padding: '12px 28px', 'border-radius': '999px', border: '2px solid ' + cyan, 'background-color': 'transparent', color: cyan, 'font-family': 'inherit', 'font-size': '16px', cursor: 'pointer' }, 'RESTART', { id: 'mem-reset', type: 'button' }),
        ]),
      ],
      code: `// 짝 맞추기: 카드 12장 중 같은 그림 두 장 찾기
const $ = id => document.getElementById(id);
const cards = [...document.querySelectorAll('.mem-card')];
const symbols = ['★', '♥', '♦', '♣', '♠', '●'];
let open = [], found = 0, moves = 0;
function deal() {
  const deck = [...symbols, ...symbols].sort(() => Math.random() - 0.5);
  cards.forEach((c, i) => { c.dataset.v = deck[i]; c.textContent = '?'; c.disabled = false; c.style.backgroundColor = ''; });
  open = []; found = 0; moves = 0;
  $('moves').textContent = '0';
  $('mem-msg').textContent = '같은 그림 두 장을 찾아요';
}
cards.forEach(c => c.addEventListener('click', () => {
  if (open.length === 2 || c.disabled || open.includes(c)) return;
  c.textContent = c.dataset.v;
  open.push(c);
  if (open.length < 2) return;
  moves++;
  $('moves').textContent = moves;
  const [a, b] = open;
  if (a.dataset.v === b.dataset.v) {
    a.disabled = b.disabled = true;
    a.style.backgroundColor = b.style.backgroundColor = '#0e7490';
    open = [];
    if (++found === symbols.length) $('mem-msg').textContent = moves + '번 만에 다 찾았어요!';
  } else setTimeout(() => { a.textContent = b.textContent = '?'; open = []; }, 700);
}));
$('mem-reset').addEventListener('click', deal);
deal();`,
    };
  }
  const range12 = () => Array.from({ length: 12 }, (_, i) => i);

  /* ================= 로그인 (연습용 — 입력한 내용은 어디에도 보내지 않음) ================= */
  const LOGIN_CODE = `// 연습용 로그인: 입력한 내용은 어디에도 보내지 않아요
document.getElementById('login-form').addEventListener('submit', e => {
  e.preventDefault();
  document.getElementById('login-msg').textContent = '연습용 화면이에요. 입력한 내용은 어디에도 보내지 않아요.';
});`;
  const field = (label, type, ph, inputStyle, labelStyle) => col({ gap: '6px' }, [E('label', { 'font-size': '14px', ...labelStyle }, label), E('input', { padding: '12px 14px', 'font-size': '16px', 'border-radius': '10px', ...inputStyle }, null, { type, placeholder: ph })]);
  /** 깔끔한 가운데 카드 — 흰 · 파랑 */
  function loginCard() {
    const blue = '#2563eb', inp = { border: '1px solid #d1d5db', 'background-color': '#ffffff' };
    return {
      title: '로그인 — 카드형', style: { margin: '0', 'min-height': '100vh', 'font-family': "'Noto Sans KR', sans-serif", color: '#111827', 'background-color': '#f3f6fb', display: 'flex', 'align-items': 'center', 'justify-content': 'center' },
      children: [
        E('form', { display: 'flex', 'flex-direction': 'column', gap: '16px', width: '380px', 'max-width': '90vw', padding: '40px', 'border-radius': '20px', 'background-color': '#ffffff', 'box-shadow': '0 20px 50px rgba(15, 23, 42, 0.1)' }, [
          E('h1', { margin: '0', 'font-size': '28px' }, '다시 만나서 반가워요'), E('p', { margin: '0', color: '#6b7280' }, '아이디와 비밀번호를 넣어 주세요'),
          field('아이디', 'text', '아이디', inp), field('비밀번호', 'password', '비밀번호', inp),
          row({ 'justify-content': 'space-between', 'align-items': 'center', 'font-size': '14px' }, [row({ gap: '6px', 'align-items': 'center' }, [E('input', { 'accent-color': blue }, null, { type: 'checkbox' }), E('label', {}, '로그인 유지')]), link('비밀번호 찾기', { color: blue })]),
          E('button', { padding: '14px', 'border-radius': '10px', border: '0', 'background-color': blue, color: '#ffffff', 'font-size': '16px', 'font-weight': '700', cursor: 'pointer' }, '로그인', { type: 'submit' }),
          E('p', { margin: '0', 'text-align': 'center', 'font-size': '13px', color: '#dc2626' }, '', { id: 'login-msg' }),
          E('p', { margin: '0', 'text-align': 'center', 'font-size': '14px', color: '#6b7280' }, '처음이신가요? 회원가입'),
        ], { id: 'login-form' }),
      ],
      code: LOGIN_CODE,
    };
  }
  /** 반반 나누기 — 왼쪽 그림 · 오른쪽 어두운 폼 */
  function loginSplit() {
    const violet = '#a78bfa', inp = { border: '1px solid #3f3a5a', 'background-color': '#1c1930', color: '#ffffff' };
    return {
      title: '로그인 — 반반형', style: { margin: '0', 'min-height': '100vh', 'font-family': "'Inter', 'Noto Sans KR', sans-serif", color: '#ece9ff', 'background-color': '#12101f' },
      children: [
        E('div', { display: 'grid', 'grid-template-columns': '1fr 1fr', 'min-height': '100vh' }, [
          col({ 'justify-content': 'flex-end', gap: '12px', padding: '56px', ...WB.bgStyle(art('mountain')) }, [E('h2', { margin: '0', 'font-size': '40px', color: '#ffffff', 'text-shadow': '0 2px 12px rgba(0, 0, 0, 0.35)' }, '오늘도 한 걸음'), E('p', { margin: '0', color: '#fff4e6' }, '기록을 이어 가려면 로그인하세요')], { 'min-height': '220px', padding: '28px' }),
          col({ 'justify-content': 'center', padding: '56px' }, [
            E('form', { display: 'flex', 'flex-direction': 'column', gap: '18px', width: '100%', 'max-width': '380px' }, [
              E('h1', { margin: '0', 'font-size': '32px', color: '#ffffff' }, '로그인'),
              field('이메일', 'email', 'name@example.com', inp, { color: '#b9b3d9' }), field('비밀번호', 'password', '8자 이상', inp, { color: '#b9b3d9' }),
              E('button', { padding: '14px', 'border-radius': '10px', border: '0', 'background-image': `linear-gradient(90deg, ${violet}, #f472b6)`, color: '#12101f', 'font-size': '16px', 'font-weight': '800', cursor: 'pointer' }, '들어가기', { type: 'submit' }),
              E('p', { margin: '0', 'font-size': '13px', color: '#fca5a5' }, '', { id: 'login-msg' }),
              row({ 'justify-content': 'space-between', 'font-size': '14px' }, [link('회원가입', { color: violet }), link('비밀번호를 잊었어요', { color: '#b9b3d9' })]),
            ], { id: 'login-form' }),
          ], { padding: '32px 20px' }),
        ], {}, { 'grid-template-columns': 'repeat(1, 1fr)' }),
      ],
      code: LOGIN_CODE,
    };
  }
  /** 유리 효과 — 밤하늘 배경 위 반투명 카드 */
  function loginGlass() {
    const inp = { border: '1px solid rgba(255, 255, 255, 0.35)', 'background-color': 'rgba(255, 255, 255, 0.12)', color: '#ffffff' };
    return {
      title: '로그인 — 유리형', style: { margin: '0', 'min-height': '100vh', 'font-family': "'Gowun Dodum', sans-serif", color: '#ffffff', display: 'flex', 'align-items': 'center', 'justify-content': 'center', ...WB.bgStyle(bg('sunset')) },
      children: [
        E('form', { display: 'flex', 'flex-direction': 'column', gap: '16px', width: '360px', 'max-width': '90vw', padding: '40px 36px', 'border-radius': '28px', 'background-color': 'rgba(255, 255, 255, 0.16)', 'backdrop-filter': 'blur(14px)', border: '1px solid rgba(255, 255, 255, 0.4)', 'box-shadow': '0 20px 60px rgba(60, 20, 90, 0.35)' }, [
          E('h1', { margin: '0', 'font-size': '30px', 'text-align': 'center' }, 'Welcome'),
          field('아이디', 'text', '아이디', inp, { color: '#ffe8f4' }), field('비밀번호', 'password', '비밀번호', inp, { color: '#ffe8f4' }),
          E('button', { padding: '14px', 'border-radius': '999px', border: '0', 'background-color': '#ffffff', color: '#7c3aed', 'font-size': '16px', 'font-weight': '700', cursor: 'pointer' }, '로그인', { type: 'submit' }),
          E('p', { margin: '0', 'text-align': 'center', 'font-size': '13px', color: '#fff1a8' }, '', { id: 'login-msg' }),
          E('p', { margin: '0', 'text-align': 'center', 'font-size': '14px', color: '#ffe8f4' }, '계정 만들기 · 도움말'),
        ], { id: 'login-form' }),
      ],
      code: LOGIN_CODE,
    };
  }

  /* ================= 자유 ================= */
  /** 레시피 카드 — 초록 · 체크 목록 */
  function recipe() {
    const green = '#3f7d4e';
    return {
      title: '토마토 달걀 볶음 — 레시피', style: { margin: '0', 'font-family': "'Gowun Dodum', sans-serif", color: '#2f3a2f', 'background-color': '#f6f8f1', 'line-height': '1.7' },
      children: [
        E('div', { display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '40px', padding: '56px 48px', 'align-items': 'center' }, [
          col({ gap: '12px' }, [
            row({ gap: '8px' }, ['15분', '2인분', '쉬움'].map(t => E('span', { padding: '4px 12px', 'border-radius': '999px', 'background-color': '#e1ecd9', color: green, 'font-size': '14px' }, t))),
            E('h1', { margin: '0', 'font-size': '44px', 'line-height': '1.25' }, '토마토 달걀 볶음'),
            E('p', { margin: '0', color: '#5d6b5d', 'font-size': '18px' }, '냉장고에 있는 재료로 15분이면 끝나는 따뜻한 한 그릇.'),
          ]),
          E('img', { width: '100%', 'aspect-ratio': '4 / 3', 'object-fit': 'cover', 'border-radius': '24px' }, null, { src: art('forest'), alt: '요리 그림' }),
        ], {}, { 'grid-template-columns': 'repeat(1, 1fr)', padding: '32px 20px' }),
        E('div', { display: 'grid', 'grid-template-columns': '1fr 2fr', gap: '40px', padding: '0 48px 56px' }, [
          col({ gap: '10px', padding: '28px', 'border-radius': '20px', 'background-color': '#ffffff' }, [
            E('h2', { margin: '0 0 6px', 'font-size': '24px', color: green }, '재료'),
            ...['토마토 2개', '달걀 3개', '대파 반 대', '소금 · 설탕 조금', '식용유 2큰술'].map(t => row({ gap: '10px', 'align-items': 'center' }, [E('input', { 'accent-color': green, width: '18px', height: '18px' }, null, { type: 'checkbox' }), E('label', {}, t)])),
          ]),
          col({ gap: '10px' }, [
            E('h2', { margin: '0', 'font-size': '24px', color: green }, '만드는 순서'),
            E('ol', { margin: '0', 'padding-left': '22px', 'font-size': '18px' }, ['달걀을 소금 한 꼬집과 함께 풀어요.', '기름을 두르고 달걀을 반쯤 익혀 덜어요.', '토마토를 볶다가 설탕을 조금 넣어요.', '달걀을 다시 넣고 대파를 뿌려 마무리해요.'].map(t => E('li', { 'margin-bottom': '8px' }, t))),
            E('p', { margin: '8px 0 0', padding: '16px 20px', 'border-left': '4px solid ' + green, 'background-color': '#e9f1e3', 'border-radius': '0 12px 12px 0' }, '팁 · 토마토는 껍질에 칼집을 내고 데치면 더 부드러워요.'),
          ]),
        ], {}, { 'grid-template-columns': 'repeat(1, 1fr)', padding: '0 20px 32px' }),
      ],
    };
  }
  /** 여행 일기 — 종이 질감 · 손글씨 · 기울어진 사진 */
  function travel() {
    const photos = [['ocean', '바다 앞 첫날', '-4deg'], ['mountain', '노을 산책', '3deg'], ['city', '밤 골목', '-2deg']];
    return {
      title: '여름 바다 여행 일기', style: { margin: '0', 'font-family': "'Gaegu', cursive", color: '#4a3b2f', 'line-height': '1.6', ...WB.bgStyle(bg('paper')) },
      children: [
        col({ 'align-items': 'center', gap: '4px', padding: '56px 20px 24px', 'text-align': 'center' }, [
          E('p', { margin: '0', 'font-size': '22px', color: '#c2703d' }, '2026. 7. 21 – 7. 24'),
          E('h1', { margin: '0', 'font-family': "'Nanum Pen Script', cursive", 'font-size': 'clamp(48px, 8vw, 84px)', 'line-height': '1.1' }, '여름 바다 여행 일기'),
        ]),
        row({ 'justify-content': 'center', gap: '28px', 'flex-wrap': 'wrap', padding: '24px 32px 48px' }, photos.map(([a, cap, r]) => col({ gap: '10px', padding: '14px 14px 18px', 'background-color': '#ffffff', 'box-shadow': '0 8px 20px rgba(74, 59, 47, 0.18)', rotate: r, width: '260px' }, [
          E('img', { width: '100%', 'aspect-ratio': '1', 'object-fit': 'cover' }, null, { src: art(a), alt: cap }), E('p', { margin: '0', 'text-align': 'center', 'font-size': '22px' }, cap),
        ]))),
        col({ gap: '14px', 'max-width': '720px', margin: '0 auto', padding: '0 24px 72px', 'font-size': '22px' }, [
          E('h2', { margin: '0', 'font-family': "'Nanum Pen Script', cursive", 'font-size': '40px', color: '#c2703d' }, '첫째 날'),
          E('p', { margin: '0' }, '기차에서 내리자마자 바다 냄새가 났다. 숙소에 짐을 던져 두고 바로 모래사장으로 뛰어갔다. 물은 생각보다 차가웠지만 아무도 신경 쓰지 않았다.'),
          E('h2', { margin: '8px 0 0', 'font-family': "'Nanum Pen Script', cursive", 'font-size': '40px', color: '#c2703d' }, '가장 좋았던 순간'),
          E('p', { margin: '0', padding: '16px 20px', 'background-color': '#fff6c7', rotate: '-1deg', 'box-shadow': '0 4px 10px rgba(74, 59, 47, 0.12)' }, '셋째 날 저녁, 언덕 위에서 본 노을. 다음 여름에도 꼭 다시 오기!'),
        ], { padding: '0 20px 48px' }),
      ],
    };
  }

  /* ================= 에셋 목록 ================= */
  WB.ASSET_KINDS = [['intro', '자기소개'], ['deck', '발표'], ['game', '웹 게임'], ['login', '로그인'], ['general', '일반'], ['free', '자유']];
  WB.PAGE_ASSETS = [
    { key: 'folio', kind: 'intro', name: '포트폴리오', desc: '흑백 · 큰 글자 · 여백 — 작업 목록 · 소개 · 연락', swatch: ['#fafafa', '#111111'], build: folio },
    { key: 'links', kind: 'intro', name: '링크 프로필', desc: '파스텔 그라데이션 · 둥근 버튼 — 링크 모음 한 장', swatch: ['#fde2f3', '#f472b6'], build: linkProfile },
    { key: 'resume', kind: 'intro', name: '이력서', desc: '남색 · 명조 — 기술 막대 · 경력 줄', swatch: ['#f4f6f9', '#1e3a5f'], build: resume },
    { key: 'deck-min', kind: 'deck', name: '미니멀 발표', desc: '흰 바탕 · 검정 · 빨간 점 — 슬라이드 4장 (요점 3 · 차트)', swatch: ['#ffffff', '#e11d48'], build: deckMinimal },
    { key: 'deck-tech', kind: 'deck', name: '테크 발표', desc: '어두운 남색 · 하늘색 — 슬라이드 4장 (숫자 카드 · 과정)', swatch: ['#0b1226', '#22d3ee'], build: deckTech },
    { key: 'deck-pastel', kind: 'deck', name: '파스텔 수업', desc: '크림 · 둥근 글꼴 — 슬라이드 4장 (그림 · 퀴즈)', swatch: ['#fff8ec', '#f08a5d'], build: deckPastel },
    { key: 'game-guess', kind: 'game', name: '숫자 맞히기', desc: '옛날 게임기 초록 화면 · 픽셀 글꼴 — 위 · 아래 힌트', swatch: ['#071a0f', '#39ff88'], build: gameGuess },
    { key: 'game-tap', kind: 'game', name: '콕콕 잡기', desc: '파스텔 · 동글동글 — 20초 동안 움직이는 별 누르기', swatch: ['#fff1f8', '#8b5cf6'], build: gameTap },
    { key: 'game-memory', kind: 'game', name: '짝 맞추기', desc: '어두운 네온 — 카드 12장 기억력 게임', swatch: ['#0f0a1e', '#22d3ee'], build: gameMemory },
    { key: 'login-card', kind: 'login', name: '카드형 로그인', desc: '흰 · 파랑 — 가운데 카드 (연습용, 보내지 않음)', swatch: ['#f3f6fb', '#2563eb'], build: loginCard },
    { key: 'login-split', kind: 'login', name: '반반 로그인', desc: '왼쪽 그림 · 오른쪽 어두운 폼 (연습용)', swatch: ['#12101f', '#a78bfa'], build: loginSplit },
    { key: 'login-glass', kind: 'login', name: '유리 로그인', desc: '노을 배경 · 반투명 카드 (연습용)', swatch: ['#f472b6', '#ffffff'], build: loginGlass },
    { key: 'cafe', kind: 'general', name: '카페', desc: '따뜻한 크림 · 갈색 · 명조 — 메뉴 · 영업시간', swatch: ['#f7f1e8', '#6b4226'], build: cafe },
    { key: 'saas', kind: 'general', name: '서비스 소개', desc: '흰 바탕 · 보라 · 현대적 — 기능 · 가격표 · 자주 묻는 질문', swatch: ['#ffffff', '#6d28d9'], build: saas },
    { key: 'magazine', kind: 'general', name: '동네 매거진', desc: '신문처럼 명조 · 가는 선 — 머리기사 · 읽을거리', swatch: ['#fffdf7', '#1a1a1a'], build: magazine },
    { key: 'festival', kind: 'free', name: '페스티벌', desc: '어두운 바탕 · 네온 — 라인업 · 티켓', swatch: ['#0a0a12', '#ff2e88'], build: festival },
    { key: 'recipe', kind: 'free', name: '레시피', desc: '초록 · 체크 목록 — 재료 · 만드는 순서', swatch: ['#f6f8f1', '#3f7d4e'], build: recipe },
    { key: 'travel', kind: 'free', name: '여행 일기', desc: '종이 질감 · 손글씨 · 기울어진 사진', swatch: ['#fbf6ec', '#c2703d'], build: travel },
  ];
  WB.PAGE_TEMPLATES = WB.PAGE_ASSETS; // 예전 이름
  WB.assetKindName = k => (WB.ASSET_KINDS.find(x => x[0] === k) || [, ''])[1];
  /** 에셋 → 문서 조각 { title, root, blocks } */
  WB.buildAssetDoc = key => {
    const t = WB.PAGE_ASSETS.find(x => x.key === key);
    if (!t) return null;
    const page = t.build();
    const root = WB.newRoot();
    root.style = page.style;
    root.children = page.children;
    return { title: page.title, root, blocks: WB.reIdBlocks({ code: page.code || '' }), name: t.name };
  };
  /** 에셋으로 새 페이지 열기 */
  WB.openTemplate = key => {
    const a = WB.buildAssetDoc(key);
    if (!a) return;
    WB.newPage();
    WB.commit(d => {
      d.title = a.title;
      d.root = a.root;
      d.blocks = a.blocks;
    }, `template:${Date.now()}`);
    WB.select(null);
    WB.setZoom('fit');
    WB.toast(`「${a.name}」 에셋으로 새 페이지를 열었어요. 글자는 두 번 클릭해서 고치세요` + (a.blocks.code ? ' (움직이는 부분은 ▶ 미리보기에서)' : ''), 'ok');
  };
})();
