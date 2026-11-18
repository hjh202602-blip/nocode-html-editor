'use strict';
/* 섹션 에셋 — 실제 웹페이지에 바로 끼워 쓰는 구역 (머리말 · 첫 화면 · 기능 · 가격 · 후기 · 자주 묻는 질문 · 문의 · 꼬리말 …)
   지금 페이지에 넣으면 고른 구역 바로 아래(없으면 맨 끝)에 들어감. 휴대폰 화면에서는 칸이 한 줄로.
   색은 흰 바탕 + 파랑(#2563eb) 기본이라 어느 페이지에나 어울리고, 형식(class)으로 묶어 두지 않아 고치기 쉬움 */
(() => {
  const { E, art, bg, icon, row, col, grid, link, PAD, PAD_M } = WB.tpl;
  const BLUE = '#2563eb', INK = '#0f172a', MUTED = '#64748b', LINE = '#e2e8f0';
  const btn = (t, solid = true, style = {}) => link(t, { display: 'inline-block', padding: '12px 22px', 'border-radius': '10px', 'font-weight': '700', ...(solid ? { 'background-color': BLUE, color: '#ffffff' } : { border: '1px solid #cbd5e1', color: INK }), ...style });
  const h2 = (t, style) => E('h2', { margin: '0', 'font-size': 'clamp(26px, 3.5vw, 36px)', 'line-height': '1.25', color: INK, ...style }, t);
  const sub = (t, style) => E('p', { margin: '0', 'font-size': '17px', color: MUTED, 'line-height': '1.7', ...style }, t);
  const head = (title, desc, center = true) => col({ gap: '10px', 'align-items': center ? 'center' : 'flex-start', 'text-align': center ? 'center' : 'left', 'max-width': '640px', margin: center ? '0 auto' : '0' }, [h2(title), desc && sub(desc)]);
  const section = (style, kids, mobile) => E('section', { ...PAD, 'background-color': '#ffffff', ...style }, kids, {}, { ...PAD_M, ...mobile });
  const avatar = (t, c) => E('span', { display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center', width: '48px', height: '48px', 'border-radius': '50%', 'background-color': c, color: '#ffffff', 'font-weight': '800', 'flex-shrink': '0' }, t);

  const S = [];
  const add = (kind, key, name, desc, build) => S.push({ kind, key, name, desc, build });

  /* ---------- 머리말 ---------- */
  add('nav', 'nav-simple', '기본 머리말', '로고 · 메뉴 · 버튼, 흰 바탕 · 아래 선 · 스크롤해도 위에 붙음', () =>
    E('header', { display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', gap: '16px', padding: '16px 48px', 'background-color': '#ffffff', 'border-bottom': '1px solid ' + LINE, position: 'sticky', top: '0', 'z-index': '10' }, [
      E('strong', { 'font-size': '20px', color: INK }, '브랜드'),
      E('nav', { display: 'flex', gap: '28px' }, ['소개', '서비스', '가격', '문의'].map(t => link(t, { color: '#334155' })), {}, { display: 'none' }),
      btn('시작하기', true, { padding: '9px 16px' }),
    ], {}, { padding: '12px 20px' }));
  add('nav', 'nav-dark', '어두운 머리말', '남색 바탕 · 가운데 메뉴 · 로그인 버튼', () =>
    E('header', { display: 'grid', 'grid-template-columns': '1fr auto 1fr', 'align-items': 'center', padding: '18px 48px', 'background-color': INK, color: '#ffffff' }, [
      E('strong', { 'font-size': '20px' }, 'BRAND'),
      E('nav', { display: 'flex', gap: '28px' }, ['제품', '고객 사례', '블로그', '채용'].map(t => link(t, { color: '#cbd5e1' }))),
      row({ 'justify-content': 'flex-end', gap: '10px' }, [link('로그인', { color: '#cbd5e1', padding: '8px 12px' }), btn('무료 체험', true, { padding: '8px 16px' })]),
    ], {}, { 'grid-template-columns': 'repeat(1, 1fr)', gap: '12px', padding: '16px 20px' }));
  add('nav', 'nav-center', '가운데 로고 머리말', '로고를 가운데 크게, 아래 메뉴 줄 — 가게 · 잡지', () =>
    E('header', { display: 'flex', 'flex-direction': 'column', 'align-items': 'center', gap: '10px', padding: '28px 24px 0', 'background-color': '#ffffff' }, [
      E('strong', { 'font-family': "'Playfair Display', serif", 'font-size': '34px', 'letter-spacing': '2px', color: INK }, 'Maison'),
      E('nav', { display: 'flex', gap: '28px', 'flex-wrap': 'wrap', 'justify-content': 'center', padding: '12px 0', width: '100%', 'border-top': '1px solid ' + LINE, 'border-bottom': '1px solid ' + LINE }, ['새로 나온', '거실', '부엌', '침실', '이야기'].map(t => link(t, { color: '#334155', 'font-size': '15px' }))),
    ]));

  /* ---------- 첫 화면 ---------- */
  add('hero', 'hero-center', '가운데 첫 화면', '작은 꼬리표 · 큰 제목 · 설명 · 버튼 두 개, 연한 그라데이션', () =>
    section({ 'text-align': 'center', padding: '96px 24px', 'background-image': 'linear-gradient(180deg, #eff6ff, #ffffff)' }, [col({ 'align-items': 'center', gap: '18px', 'max-width': '760px', margin: '0 auto' }, [
      E('span', { padding: '6px 14px', 'border-radius': '999px', 'background-color': '#dbeafe', color: '#1d4ed8', 'font-size': '14px', 'font-weight': '700' }, '새 소식 · 이번 달 업데이트'),
      E('h1', { margin: '0', 'font-size': 'clamp(36px, 6vw, 60px)', 'line-height': '1.15', color: INK }, '한 문장으로 말하는\n가장 중요한 약속'),
      sub('누구를 위한 무엇인지, 어떤 점이 좋은지 두 줄 안에 설명해요.', { 'font-size': '19px' }),
      row({ gap: '12px', 'justify-content': 'center', 'flex-wrap': 'wrap' }, [btn('지금 시작하기'), btn('더 알아보기', false)]),
    ])], { padding: '64px 20px' }));
  add('hero', 'hero-split', '반반 첫 화면', '왼쪽 글 · 오른쪽 그림, 휴대폰에서는 위아래로', () =>
    section({}, [grid(2, { gap: '48px', 'align-items': 'center', 'max-width': '1120px', margin: '0 auto' }, [
      col({ gap: '18px' }, [
        E('h1', { margin: '0', 'font-size': 'clamp(34px, 5vw, 52px)', 'line-height': '1.2', color: INK }, '복잡한 일을\n간단하게 바꿔요'),
        sub('핵심 장점 하나를 구체적으로 적어요. 숫자가 들어가면 더 좋아요.'),
        row({ gap: '12px', 'flex-wrap': 'wrap' }, [btn('무료로 써 보기'), btn('사례 보기', false)]),
        E('p', { margin: '0', 'font-size': '14px', color: MUTED }, '카드 등록 없이 14일 무료'),
      ]),
      E('img', { width: '100%', 'aspect-ratio': '4 / 3', 'object-fit': 'cover', 'border-radius': '20px' }, null, { src: art('growth'), alt: '서비스 그림' }),
    ])]));
  add('hero', 'hero-image', '배경 그림 첫 화면', '화면을 채우는 배경 그림 위 흰 글자', () =>
    section({ padding: '140px 48px', color: '#ffffff', ...WB.bgStyle(art('mountain')), 'background-color': '#7c3a52' }, [col({ gap: '16px', 'max-width': '640px' }, [
      E('h1', { margin: '0', 'font-size': 'clamp(36px, 6vw, 64px)', 'line-height': '1.15', 'text-shadow': '0 2px 16px rgba(0, 0, 0, 0.35)' }, '떠나고 싶은\n그곳으로'),
      E('p', { margin: '0', 'font-size': '19px', 'text-shadow': '0 1px 8px rgba(0, 0, 0, 0.35)' }, '계절마다 새로 고른 여행지를 소개해요.'),
      row({ gap: '12px' }, [btn('여행지 보기', true, { 'background-color': '#ffffff', color: INK })]),
    ])], { padding: '96px 20px' }));

  /* ---------- 기능 소개 ---------- */
  add('feature', 'feat-3', '기능 3칸', '아이콘 · 제목 · 설명 카드 세 개', () =>
    section({}, [col({ gap: '40px', 'max-width': '1120px', margin: '0 auto' }, [
      head('왜 우리를 고르나요?', '자주 듣는 세 가지 이유'),
      grid(3, { gap: '20px' }, [['star', '쉽게 시작', '설치 없이 브라우저에서 바로 써요.'], ['shield', '안전하게', '모든 자료는 암호화해서 보관해요.'], ['users', '함께 일하기', '팀원을 불러 같은 화면을 함께 봐요.']].map(([ic, t, d]) =>
        col({ gap: '10px', padding: '28px', border: '1px solid ' + LINE, 'border-radius': '16px' }, [icon(ic, { color: BLUE, width: '32px', height: '32px' }), E('h3', { margin: '0', 'font-size': '20px', color: INK }, t), sub(d, { 'font-size': '16px' })]))),
    ])]));
  add('feature', 'feat-alt', '그림 번갈아 소개', '그림과 글이 왼쪽 · 오른쪽 번갈아 두 줄', () =>
    section({}, [col({ gap: '56px', 'max-width': '1080px', margin: '0 auto' }, [['team', '함께 쓰는 작업 공간', '팀원이 무엇을 하고 있는지 한눈에 보여요. 회의 없이도 진행 상황을 알 수 있어요.'], ['chat', '바로 나누는 대화', '일과 대화를 한곳에서. 문서마다 댓글로 의견을 남겨요.']].map(([a, t, d], i) =>
      E('div', { display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '48px', 'align-items': 'center' }, [
        E('img', { width: '100%', 'aspect-ratio': '4 / 3', 'object-fit': 'cover', 'border-radius': '20px', order: i % 2 ? '2' : '0' }, null, { src: art(a), alt: t }, { order: '0' }),
        col({ gap: '12px' }, [h2(t), sub(d), link('자세히 보기 →', { color: BLUE, 'font-weight': '700' })]),
      ], {}, { 'grid-template-columns': 'repeat(1, 1fr)', gap: '20px' })))]));
  add('feature', 'feat-check', '체크 목록', '왼쪽 제목 · 오른쪽 체크 표시 목록 2열', () =>
    section({ 'background-color': '#f8fafc' }, [grid(2, { gap: '48px', 'max-width': '1080px', margin: '0 auto', 'align-items': 'start' }, [
      head('필요한 것은\n모두 들어 있어요', '추가 요금 없이 처음부터 쓸 수 있는 기능', false),
      E('div', { display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '16px 24px' }, ['무제한 페이지', '내 도메인 연결', '자동 백업', '팀원 초대', '방문자 통계', '24시간 상담'].map(t =>
        row({ gap: '10px', 'align-items': 'center' }, [icon('check', { color: '#16a34a' }), E('span', { color: INK, 'font-size': '17px' }, t)])), {}, { 'grid-template-columns': 'repeat(1, 1fr)' }),
    ])]));

  /* ---------- 가격 ---------- */
  add('pricing', 'pricing-3', '가격표 3단', '가운데 추천 요금제 강조, 기능 목록 · 버튼', () =>
    section({ 'background-color': '#f8fafc' }, [col({ gap: '40px', 'max-width': '1080px', margin: '0 auto' }, [
      head('알맞은 요금제를 고르세요', '언제든 바꾸거나 해지할 수 있어요'),
      grid(3, { gap: '20px', 'align-items': 'stretch' }, [['기본', '0원', ['프로젝트 3개', '기본 통계']], ['프로', '19,000원', ['프로젝트 무제한', '내 도메인', '팀원 5명']], ['팀', '49,000원', ['팀원 무제한', '권한 관리', '전담 상담']]].map(([n, p, list], i) =>
        col({ gap: '14px', padding: '32px', 'border-radius': '18px', 'background-color': '#ffffff', border: i === 1 ? '2px solid ' + BLUE : '1px solid ' + LINE, 'box-shadow': i === 1 ? '0 18px 40px rgba(37, 99, 235, 0.15)' : 'none' }, [
          row({ 'justify-content': 'space-between', 'align-items': 'center' }, [E('h3', { margin: '0', 'font-size': '18px', color: INK }, n), i === 1 && E('span', { padding: '4px 10px', 'border-radius': '999px', 'background-color': '#dbeafe', color: '#1d4ed8', 'font-size': '12px', 'font-weight': '700' }, '추천')]),
          row({ 'align-items': 'baseline', gap: '4px' }, [E('strong', { 'font-size': '36px', color: INK }, p), E('span', { color: MUTED }, '/ 월')]),
          E('ul', { margin: '0', 'padding-left': '20px', color: '#334155', 'line-height': '1.9' }, list.map(t => E('li', {}, t))),
          btn(i === 1 ? '프로 시작하기' : '시작하기', i === 1, { 'margin-top': 'auto', 'text-align': 'center' }),
        ]))),
    ])]));

  /* ---------- 후기 ---------- */
  add('review', 'testi-cards', '후기 카드 3개', '별점 · 한 줄 후기 · 이름 · 직업', () =>
    section({}, [col({ gap: '40px', 'max-width': '1120px', margin: '0 auto' }, [
      head('먼저 써 본 분들의 이야기'),
      grid(3, { gap: '20px' }, [['김', '#f97316', '김하늘', '카페 사장', '주문 받는 시간이 절반으로 줄었어요.'], ['이', '#8b5cf6', '이준호', '프리랜서 디자이너', '포트폴리오를 하루 만에 만들었어요.'], ['박', '#14b8a6', '박서연', '동네 학원 원장', '학부모 안내문을 보내기가 정말 쉬워요.']].map(([a, c, n, j, q]) =>
        col({ gap: '16px', padding: '28px', 'border-radius': '16px', 'background-color': '#f8fafc' }, [
          E('p', { margin: '0', color: '#f59e0b', 'letter-spacing': '2px' }, '★★★★★'), E('p', { margin: '0', 'font-size': '17px', color: INK, 'line-height': '1.7' }, '“' + q + '”'),
          row({ gap: '12px', 'align-items': 'center' }, [avatar(a, c), col({ gap: '0' }, [E('strong', { color: INK }, n), E('span', { 'font-size': '14px', color: MUTED }, j)])]),
        ]))),
    ])]));
  add('review', 'testi-big', '큰 후기 하나', '가운데 큰 따옴표 문장 · 사람', () =>
    section({ 'background-color': INK, color: '#ffffff', 'text-align': 'center' }, [col({ 'align-items': 'center', gap: '24px', 'max-width': '820px', margin: '0 auto' }, [
      E('p', { margin: '0', 'font-size': 'clamp(22px, 3vw, 32px)', 'line-height': '1.6' }, '“팀 전체가 같은 화면을 보게 된 뒤로\n회의가 절반으로 줄었습니다.”'),
      row({ gap: '12px', 'align-items': 'center' }, [avatar('정', BLUE), col({ gap: '0', 'text-align': 'left' }, [E('strong', {}, '정민지'), E('span', { color: '#94a3b8', 'font-size': '14px' }, '제품팀 리더')])]),
    ])]));

  /* ---------- 자주 묻는 질문 ---------- */
  add('faq', 'faq', '자주 묻는 질문', '누르면 펼쳐지는 질문 네 개 (JS 없이 <details>)', () =>
    section({}, [col({ gap: '14px', 'max-width': '760px', margin: '0 auto' }, [
      head('자주 묻는 질문', null, false),
      ...[['무료로 써 볼 수 있나요?', '네, 14일 동안 모든 기능을 무료로 써 볼 수 있어요.'], ['언제든 해지할 수 있나요?', '설정에서 바로 해지돼요. 남은 기간은 일할 계산해 돌려드려요.'], ['팀원은 몇 명까지 부를 수 있나요?', '요금제마다 달라요. 팀 요금제는 제한이 없어요.'], ['자료는 안전한가요?', '모든 자료를 암호화해서 보관하고 매일 백업해요.']].map(([q, a]) =>
        E('details', { padding: '18px 22px', border: '1px solid ' + LINE, 'border-radius': '12px' }, [E('summary', { 'font-weight': '700', color: INK, cursor: 'pointer' }, q), E('p', { margin: '10px 0 0', color: MUTED }, a)])),
    ])]));

  /* ---------- 행동 유도 ---------- */
  add('cta', 'cta-banner', '행동 유도 띠', '파란 바탕 · 한 문장 · 버튼 (페이지 끝에)', () =>
    section({ 'background-image': `linear-gradient(120deg, ${BLUE}, #7c3aed)`, color: '#ffffff' }, [E('div', { display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', gap: '24px', 'max-width': '1080px', margin: '0 auto', 'flex-wrap': 'wrap' }, [
      col({ gap: '6px' }, [E('h2', { margin: '0', 'font-size': 'clamp(24px, 3vw, 34px)' }, '오늘 바로 시작해 보세요'), E('p', { margin: '0', color: '#dbeafe' }, '설정은 5분이면 끝나요.')]),
      btn('무료로 시작하기', true, { 'background-color': '#ffffff', color: BLUE }),
    ])]));
  add('cta', 'newsletter', '소식 받기', '이메일 입력칸 + 구독 버튼', () =>
    section({ 'background-color': '#f8fafc', 'text-align': 'center' }, [col({ 'align-items': 'center', gap: '16px', 'max-width': '560px', margin: '0 auto' }, [
      icon('mail', { color: BLUE, width: '36px', height: '36px' }), h2('새 소식을 메일로 받아 보세요'), sub('한 달에 두 번, 쓸모 있는 소식만 보내요.'),
      E('form', { display: 'flex', gap: '8px', width: '100%', 'flex-wrap': 'wrap' }, [
        E('input', { flex: '1', 'min-width': '200px', padding: '14px 16px', 'font-size': '16px', border: '1px solid #cbd5e1', 'border-radius': '10px' }, null, { type: 'email', placeholder: 'name@example.com', 'aria-label': '이메일' }),
        E('button', { padding: '14px 22px', border: '0', 'border-radius': '10px', 'background-color': BLUE, color: '#ffffff', 'font-weight': '700', 'font-size': '16px', cursor: 'pointer' }, '구독하기', { type: 'button' }),
      ]),
    ])]));

  /* ---------- 문의 ---------- */
  add('contact', 'contact', '문의 양식', '왼쪽 연락처 · 오른쪽 이름 · 이메일 · 내용 입력칸', () =>
    section({}, [grid(2, { gap: '48px', 'max-width': '1080px', margin: '0 auto' }, [
      col({ gap: '16px' }, [head('문의하기', '궁금한 점을 남겨 주시면 하루 안에 답장해요.', false),
        ...[['mail', 'hello@example.com'], ['phone', '02-000-0000'], ['pin', '서울시 어딘가 123, 4층']].map(([ic, t]) => row({ gap: '10px', 'align-items': 'center', color: '#334155' }, [icon(ic, { color: BLUE }), E('span', {}, t)]))]),
      E('form', { display: 'flex', 'flex-direction': 'column', gap: '14px', padding: '28px', border: '1px solid ' + LINE, 'border-radius': '16px' }, [
        ...[['이름', 'text', '홍길동'], ['이메일', 'email', 'name@example.com']].map(([l, t, ph]) => col({ gap: '6px' }, [E('label', { 'font-size': '14px', color: '#334155', 'font-weight': '600' }, l), E('input', { padding: '12px 14px', 'font-size': '16px', border: '1px solid #cbd5e1', 'border-radius': '10px' }, null, { type: t, placeholder: ph })])),
        col({ gap: '6px' }, [E('label', { 'font-size': '14px', color: '#334155', 'font-weight': '600' }, '내용'), E('textarea', { padding: '12px 14px', 'font-size': '16px', border: '1px solid #cbd5e1', 'border-radius': '10px', 'min-height': '120px' }, null, { rows: '5', placeholder: '문의 내용을 적어 주세요' })]),
        E('button', { padding: '14px', border: '0', 'border-radius': '10px', 'background-color': BLUE, color: '#ffffff', 'font-weight': '700', 'font-size': '16px', cursor: 'pointer' }, '보내기', { type: 'button' }),
      ]),
    ])]));

  /* ---------- 알림 줄 · 꼬리말 ---------- */
  add('etc', 'notice-bar', '알림 줄', '페이지 맨 위 한 줄 공지 · 링크', () =>
    E('div', { display: 'flex', 'justify-content': 'center', 'align-items': 'center', gap: '10px', padding: '10px 16px', 'background-color': INK, color: '#ffffff', 'font-size': '14px', 'flex-wrap': 'wrap' }, [E('span', {}, '연말 맞이 모든 요금제 20% 할인 중'), link('자세히 →', { color: '#93c5fd', 'font-weight': '700' })]));
  add('footer', 'footer-cols', '꼬리말 4단', '로고 · 소개와 링크 세 묶음, 아래 저작권', () =>
    E('footer', { padding: '56px 48px 28px', 'background-color': INK, color: '#cbd5e1' }, [
      E('div', { display: 'grid', 'grid-template-columns': '2fr 1fr 1fr 1fr', gap: '32px', 'max-width': '1120px', margin: '0 auto' }, [
        col({ gap: '10px' }, [E('strong', { 'font-size': '20px', color: '#ffffff' }, '브랜드'), E('p', { margin: '0', 'font-size': '15px', 'line-height': '1.7' }, '더 쉬운 웹을 만드는 작은 팀이에요.')]),
        ...[['제품', ['기능', '가격', '업데이트']], ['회사', ['소개', '채용', '블로그']], ['도움', ['자주 묻는 질문', '문의', '이용 약관']]].map(([t, ls]) => col({ gap: '10px' }, [E('strong', { color: '#ffffff' }, t), ...ls.map(l => link(l, { color: '#94a3b8', 'font-size': '15px' }))])),
      ], {}, { 'grid-template-columns': 'repeat(2, 1fr)' }),
      E('p', { margin: '40px auto 0', 'max-width': '1120px', 'padding-top': '20px', 'border-top': '1px solid #1e293b', 'font-size': '13px', color: '#64748b' }, '© 2026 브랜드. All rights reserved.'),
    ], {}, { padding: '40px 20px 24px' }));

  WB.SECTION_KINDS = [['nav', '머리말'], ['hero', '첫 화면'], ['feature', '기능 소개'], ['pricing', '가격'], ['review', '후기'], ['faq', '자주 묻는 질문'], ['cta', '행동 유도'], ['contact', '문의'], ['etc', '알림'], ['footer', '꼬리말']];
  WB.SECTION_ASSETS = S;
  WB.sectionKindName = k => (WB.SECTION_KINDS.find(x => x[0] === k) || [, ''])[1];
  /** 섹션을 지금 페이지에: 고른 요소가 들어 있는 맨 바깥 구역 바로 아래 (없으면 맨 끝) */
  WB.insertSection = key => {
    const s = S.find(x => x.key === key), doc = WB.canvasDoc();
    if (!s || !doc) return;
    const node = s.build();
    const sel = WB.selectedId();
    const top = sel && sel !== 'root' ? WB.pathTo(doc.root, sel)[1] : null;
    const at = top ? doc.root.children.indexOf(top) + 1 : undefined;
    WB.insertNode(node, 'root', at);
    WB.select(node.id);
    WB.emit('reveal', node.id);
    WB.toast(`「${s.name}」 섹션을 넣었어요`, 'ok');
  };
  /** 섹션 미리보기용 문서 조각 */
  WB.sectionPreviewDoc = key => {
    const s = S.find(x => x.key === key);
    const root = WB.newRoot();
    root.style = { margin: '0', 'font-family': "'Noto Sans KR', sans-serif", color: INK, 'background-color': '#ffffff', 'line-height': '1.6' };
    root.children = [s.build()];
    return { title: s.name, root, blocks: WB.emptyBlocks() };
  };
})();
