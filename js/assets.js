'use strict';
/* 편집기가 직접 주는 무료 에셋 — 모두 이 편집기에서 새로 그린 SVG 라서 어디에 써도 됨 (출처 표시 필요 없음)
   그림: <img> 로 넣고 「그림 맞추기」로 자르기 · 배경: 상자 · 슬라이드의 배경 그림으로
   파일이 필요 없게 그림 자체를 data: 주소로 페이지 안에 넣음 */
(() => {
  const url = svg => 'data:image/svg+xml,' + encodeURIComponent(svg.replace(/\s*\n\s*/g, ' ').trim());
  const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`;
  const range = n => Array.from({ length: n }, (_, i) => i);

  /* ---------- 그림 (일러스트) ---------- */
  const ILLUST = {
    mountain: ['산과 해', '노을 진 하늘과 겹겹이 산', svg(800, 500, `
      <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb37a"/><stop offset="1" stop-color="#ffe3c2"/></linearGradient></defs>
      <rect width="800" height="500" fill="url(#s)"/><circle cx="560" cy="210" r="70" fill="#fff4dc"/>
      <path d="M0 330 L150 200 L260 300 L390 170 L560 330 L800 220 V500 H0z" fill="#e9876b"/>
      <path d="M0 390 L180 280 L330 380 L500 270 L680 380 L800 330 V500 H0z" fill="#b8566b"/>
      <path d="M0 450 L220 370 L420 440 L620 380 L800 430 V500 H0z" fill="#6d3a5e"/>`)],
    city: ['밤 도시', '불 켜진 건물이 늘어선 밤', svg(800, 500, `
      <rect width="800" height="500" fill="#1d2440"/><circle cx="640" cy="90" r="36" fill="#f6e7b8"/>
      ${range(40).map(i => `<circle cx="${(i * 137) % 800}" cy="${(i * 53) % 220}" r="${i % 3 ? 1 : 2}" fill="#fff" opacity=".7"/>`).join('')}
      ${[[20, 220, 90], [120, 170, 70], [200, 250, 110], [320, 140, 80], [410, 210, 100], [520, 180, 70], [600, 260, 120], [730, 200, 70]].map(([x, y, w], i) => `<rect x="${x}" y="${y}" width="${w}" height="${500 - y}" fill="${i % 2 ? '#2e3a66' : '#3a4a80'}"/>${range(Math.floor((500 - y) / 40)).map(r => range(Math.floor(w / 26)).map(c => `<rect x="${x + 10 + c * 26}" y="${y + 16 + r * 40}" width="12" height="18" fill="${(r + c + i) % 3 ? '#ffd76a' : '#4d5b90'}"/>`).join('')).join('')}`).join('')}`)],
    ocean: ['바다', '파도와 돛단배', svg(800, 500, `
      <rect width="800" height="500" fill="#bfe8f5"/><circle cx="160" cy="120" r="54" fill="#fff6c8"/>
      <path d="M520 300 L600 180 L600 300z" fill="#ffffff"/><path d="M610 300 L610 200 L660 300z" fill="#ffe1d0"/><path d="M500 305 H690 L660 335 H530z" fill="#c2593f"/>
      <path d="M0 320 Q100 290 200 320 T400 320 T600 320 T800 320 V500 H0z" fill="#58b4d8"/>
      <path d="M0 380 Q100 350 200 380 T400 380 T600 380 T800 380 V500 H0z" fill="#2f8dbf"/>
      <path d="M0 440 Q100 410 200 440 T400 440 T600 440 T800 440 V500 H0z" fill="#1d6a9a"/>`)],
    forest: ['숲', '둥근 나무와 길', svg(800, 500, `
      <rect width="800" height="500" fill="#e6f3dc"/><path d="M0 330 Q400 270 800 330 V500 H0z" fill="#a8d08d"/>
      <path d="M360 500 Q400 420 380 330 L420 330 Q430 420 470 500z" fill="#e9d8b4"/>
      ${[[90, 300, 70], [200, 280, 90], [300, 310, 55], [520, 300, 65], [620, 270, 95], [730, 305, 60]].map(([x, y, r], i) => `<rect x="${x - 7}" y="${y}" width="14" height="${110 - i * 3}" fill="#7a5537"/><circle cx="${x}" cy="${y - r * 0.6}" r="${r}" fill="${['#5c9e4f', '#4a8a43', '#6db35a'][i % 3]}"/>`).join('')}`)],
    space: ['우주', '고리 행성과 별', svg(800, 500, `
      <defs><radialGradient id="p" cx=".35" cy=".35"><stop offset="0" stop-color="#ffb48a"/><stop offset="1" stop-color="#d4507a"/></radialGradient></defs>
      <rect width="800" height="500" fill="#1a1033"/>
      ${range(70).map(i => `<circle cx="${(i * 97) % 800}" cy="${(i * 61) % 500}" r="${(i % 3) * 0.7 + 0.8}" fill="#fff" opacity="${0.35 + (i % 5) / 8}"/>`).join('')}
      <circle cx="420" cy="260" r="120" fill="url(#p)"/>
      <ellipse cx="420" cy="260" rx="200" ry="38" fill="none" stroke="#ffd166" stroke-width="10" transform="rotate(-16 420 260)"/>
      <circle cx="660" cy="110" r="22" fill="#8ec5ff"/>`)],
    rocket: ['로켓', '하늘로 올라가는 로켓', svg(600, 600, `
      <rect width="600" height="600" fill="#e8f0ff"/><circle cx="300" cy="300" r="230" fill="#d4e2ff"/>
      <path d="M300 90 C370 150 380 260 360 380 H240 C220 260 230 150 300 90z" fill="#ffffff" stroke="#24305e" stroke-width="10"/>
      <circle cx="300" cy="220" r="34" fill="#7fb2ff" stroke="#24305e" stroke-width="10"/>
      <path d="M240 330 L180 410 L245 395z M360 330 L420 410 L355 395z" fill="#ff6b5b" stroke="#24305e" stroke-width="10" stroke-linejoin="round"/>
      <path d="M262 390 Q300 520 338 390z" fill="#ffb43a"/><path d="M280 390 Q300 470 320 390z" fill="#ffe08a"/>`)],
    idea: ['아이디어', '빛나는 전구', svg(600, 600, `
      <rect width="600" height="600" fill="#fff7d6"/>
      ${range(8).map(i => `<line x1="300" y1="250" x2="${300 + 210 * Math.cos(i * Math.PI / 4)}" y2="${250 + 210 * Math.sin(i * Math.PI / 4)}" stroke="#ffd34d" stroke-width="14" stroke-linecap="round" stroke-dasharray="40 200" stroke-dashoffset="-140"/>`).join('')}
      <path d="M300 120 C380 120 430 180 430 250 C430 310 390 340 370 380 H230 C210 340 170 310 170 250 C170 180 220 120 300 120z" fill="#ffe066" stroke="#3b3a36" stroke-width="12"/>
      <rect x="235" y="390" width="130" height="30" rx="8" fill="#9aa3ad" stroke="#3b3a36" stroke-width="10"/><rect x="250" y="425" width="100" height="30" rx="8" fill="#9aa3ad" stroke="#3b3a36" stroke-width="10"/>`)],
    team: ['함께 일하기', '책상에 둘러앉은 세 사람', svg(800, 500, `
      <rect width="800" height="500" fill="#eef4ff"/><rect x="120" y="300" width="560" height="26" rx="8" fill="#8a6a4f"/><rect x="160" y="326" width="16" height="140" fill="#8a6a4f"/><rect x="624" y="326" width="16" height="140" fill="#8a6a4f"/>
      ${[[230, '#ff8a65', '#3a3a5a'], [400, '#6fbf73', '#5a3a2a'], [570, '#5c8dff', '#2a2a2a']].map(([x, shirt, hair]) => `<path d="M${x - 70} 300 Q${x - 70} 210 ${x} 210 Q${x + 70} 210 ${x + 70} 300z" fill="${shirt}"/><circle cx="${x}" cy="160" r="44" fill="#f5c6a5"/><path d="M${x - 46} 158 Q${x - 44} 108 ${x} 110 Q${x + 46} 108 ${x + 46} 158 Q${x + 20} 132 ${x - 46} 158z" fill="${hair}"/>`).join('')}
      <rect x="340" y="262" width="120" height="40" rx="6" fill="#33415c"/><rect x="350" y="268" width="100" height="26" rx="3" fill="#a9c7ff"/>`)],
    growth: ['성장 그래프', '오르는 막대와 화살표', svg(800, 500, `
      <rect width="800" height="500" fill="#f2fbf6"/>
      ${range(5).map(i => `<rect x="${150 + i * 110}" y="${400 - (i + 1) * 55}" width="70" height="${(i + 1) * 55}" rx="10" fill="${i === 4 ? '#22a06b' : '#a6dfc4'}"/>`).join('')}
      <path d="M130 360 L260 300 L370 320 L480 220 L640 110" fill="none" stroke="#14532d" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M600 100 L650 104 L640 152" fill="none" stroke="#14532d" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="110" y1="400" x2="720" y2="400" stroke="#14532d" stroke-width="6"/>`)],
    globe: ['지구', '대륙이 보이는 지구와 궤도', svg(600, 600, `
      <rect width="600" height="600" fill="#e8f6ff"/><ellipse cx="300" cy="300" rx="250" ry="70" fill="none" stroke="#9ccfee" stroke-width="6" transform="rotate(-20 300 300)"/>
      <circle cx="300" cy="300" r="170" fill="#4aa3df"/>
      <path d="M200 190 Q250 160 290 200 Q300 250 250 260 Q220 300 180 270 Q160 220 200 190z M330 300 Q390 280 420 320 Q420 380 370 420 Q330 410 340 360z M300 150 Q340 140 370 170 Q340 190 300 180z" fill="#7cc576"/>
      <circle cx="510" cy="210" r="16" fill="#ffd166"/>`)],
    book: ['책', '펼친 책과 연필', svg(800, 500, `
      <rect width="800" height="500" fill="#fdf3e7"/>
      <path d="M400 150 Q300 110 160 130 V390 Q300 370 400 410z" fill="#ffffff" stroke="#5b4636" stroke-width="8" stroke-linejoin="round"/>
      <path d="M400 150 Q500 110 640 130 V390 Q500 370 400 410z" fill="#fffaf0" stroke="#5b4636" stroke-width="8" stroke-linejoin="round"/>
      ${range(5).map(i => `<path d="M200 ${180 + i * 38} Q290 ${170 + i * 38} 370 ${190 + i * 38}" stroke="#d8c7b2" stroke-width="6" fill="none"/><path d="M430 ${190 + i * 38} Q510 ${170 + i * 38} 600 ${180 + i * 38}" stroke="#d8c7b2" stroke-width="6" fill="none"/>`).join('')}
      <g transform="rotate(-35 640 420)"><rect x="560" y="405" width="170" height="26" fill="#ffc94d"/><path d="M730 405 L765 418 L730 431z" fill="#f2d2a9"/><rect x="540" y="405" width="20" height="26" fill="#ff8a8a"/></g>`)],
    chat: ['대화', '말풍선 두 개', svg(600, 500, `
      <rect width="600" height="500" fill="#f3f0ff"/>
      <path d="M80 90 H360 Q390 90 390 120 V250 Q390 280 360 280 H170 L110 330 L120 280 H80 Q50 280 50 250 V120 Q50 90 80 90z" fill="#7c5cff"/>
      ${range(3).map(i => `<rect x="${90}" y="${130 + i * 44}" width="${240 - i * 60}" height="18" rx="9" fill="#e0d7ff"/>`).join('')}
      <path d="M260 230 H520 Q550 230 550 260 V370 Q550 400 520 400 H480 L490 450 L430 400 H260 Q230 400 230 370 V260 Q230 230 260 230z" fill="#ffffff" stroke="#c9bdff" stroke-width="6"/>
      ${range(2).map(i => `<rect x="270" y="${275 + i * 48}" width="${220 - i * 70}" height="18" rx="9" fill="#c9bdff"/>`).join('')}`)],
  };

  /* ---------- 배경 (상자 · 슬라이드 배경) ---------- */
  const BG = {
    blobs: ['둥근 물방울', '부드러운 색 덩어리 세 개', svg(1280, 720, `
      <rect width="1280" height="720" fill="#f6f4ff"/><circle cx="160" cy="120" r="260" fill="#c7d2fe" opacity=".7"/><circle cx="1130" cy="600" r="320" fill="#fbcfe8" opacity=".7"/><circle cx="900" cy="90" r="160" fill="#bae6fd" opacity=".8"/>`)],
    waves: ['물결', '아래쪽 물결 세 겹', svg(1280, 720, `
      <rect width="1280" height="720" fill="#f0f9ff"/><path d="M0 520 Q320 440 640 520 T1280 520 V720 H0z" fill="#bae6fd"/><path d="M0 590 Q320 520 640 590 T1280 590 V720 H0z" fill="#7dd3fc"/><path d="M0 650 Q320 600 640 650 T1280 650 V720 H0z" fill="#38bdf8"/>`)],
    dots: ['점 무늬', '연한 점이 고르게', svg(1280, 720, `
      <defs><pattern id="d" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="3" fill="#cbd5e1"/></pattern></defs><rect width="1280" height="720" fill="#ffffff"/><rect width="1280" height="720" fill="url(#d)"/>`)],
    grid: ['모눈', '연한 모눈종이', svg(1280, 720, `
      <defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0 H0 V40" fill="none" stroke="#e2e8f0" stroke-width="2"/></pattern></defs><rect width="1280" height="720" fill="#ffffff"/><rect width="1280" height="720" fill="url(#g)"/>`)],
    sunset: ['노을 그라데이션', '주황에서 보라로', svg(1280, 720, `
      <defs><linearGradient id="n" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb38a"/><stop offset=".5" stop-color="#f472b6"/><stop offset="1" stop-color="#6d28d9"/></linearGradient></defs><rect width="1280" height="720" fill="url(#n)"/>`)],
    night: ['밤하늘', '남색 하늘에 별', svg(1280, 720, `
      <defs><linearGradient id="k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1026"/><stop offset="1" stop-color="#27306b"/></linearGradient></defs><rect width="1280" height="720" fill="url(#k)"/>
      ${range(120).map(i => `<circle cx="${(i * 211) % 1280}" cy="${(i * 97) % 720}" r="${(i % 4) * 0.5 + 0.6}" fill="#fff" opacity="${0.3 + (i % 6) / 8}"/>`).join('')}`)],
    corner: ['모서리 장식', '왼쪽 위 · 오른쪽 아래에 색 띠', svg(1280, 720, `
      <rect width="1280" height="720" fill="#ffffff"/><path d="M0 0 H420 L0 260z" fill="#2563eb"/><path d="M0 0 H300 L0 180z" fill="#60a5fa"/><path d="M1280 720 H860 L1280 460z" fill="#2563eb"/><path d="M1280 720 H980 L1280 540z" fill="#93c5fd"/>`)],
    paper: ['종이 질감', '따뜻한 미색 종이', svg(1280, 720, `
      <defs><filter id="f"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .45  0 0 0 0 .3  0 0 0 .08 0"/></filter></defs><rect width="1280" height="720" fill="#fbf6ec"/><rect width="1280" height="720" filter="url(#f)"/>`)],
  };

  WB.ASSET_ILLUST = Object.entries(ILLUST).map(([k, [name, desc, s]]) => ({ key: k, name, desc, src: url(s) }));
  WB.ASSET_BG = Object.entries(BG).map(([k, [name, desc, s]]) => ({ key: k, name, desc, src: url(s) }));
  /** 배경 그림으로 쓸 때의 CSS */
  WB.bgStyle = src => ({ 'background-image': `url("${src}")`, 'background-size': 'cover', 'background-position': 'center' });
})();
