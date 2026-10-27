'use strict';
/* 탭5 블록 코딩 — 블록 종류 · 블록 데이터 다루기 · 블록 → JavaScript 코드
   blocks = { scripts: [{ x, y, blocks: [block, …] }] }
   block  = { id, type, args: { 이름: 글자 | 값 블록 }, body: [...], body2: [...] } */
(() => {
  WB.BLOCK_CATS = [
    { id: 'event', name: '이벤트', c: '#d9a400' },
    { id: 'action', name: '동작', c: '#4c97ff' },
    { id: 'control', name: '제어', c: '#ff9f1a' },
    { id: 'value', name: '값', c: '#45b35a' },
  ];

  /* shape: hat(시작) · stack(한 줄) · c(감싸기) · c2(아니면 있는 감싸기) · rep(값) · bool(참/거짓)
     args 의 type: el(캔버스 요소 고르기) · text · num · choice · color · bool */
  const SHOW_MODES = [['hide', '숨기기'], ['show', '보이기'], ['toggle', '보이기/숨기기 바꾸기']];
  WB.BLOCK_DEFS = {
    onClick: { cat: 'event', shape: 'hat', text: '{el} 을(를) 클릭했을 때', args: { el: { type: 'el', filter: 'any' } } },
    onInput: { cat: 'event', shape: 'hat', text: '{el} 에 입력했을 때', args: { el: { type: 'el', filter: 'input' } } },
    onSubmit: { cat: 'event', shape: 'hat', text: '{el} 양식을 보냈을 때', args: { el: { type: 'el', filter: 'form' } } },
    onLoad: { cat: 'event', shape: 'hat', text: '페이지가 열렸을 때', args: {} },

    alert: { cat: 'action', shape: 'stack', text: '알림 띄우기 {msg}', args: { msg: { type: 'text', def: '안녕하세요!' } } },
    setText: { cat: 'action', shape: 'stack', text: '{el} 의 글자를 {v} 로 바꾸기', args: { el: { type: 'el', filter: 'text' }, v: { type: 'text', def: '반가워요!' } } },
    setValue: { cat: 'action', shape: 'stack', text: '{el} 의 값을 {v} 로 바꾸기', args: { el: { type: 'el', filter: 'input' }, v: { type: 'text', def: '' } } },
    showHide: { cat: 'action', shape: 'stack', text: '{el} {mode}', args: { el: { type: 'el', filter: 'any' }, mode: { type: 'choice', options: SHOW_MODES, def: 'hide' } } },
    setColor: { cat: 'action', shape: 'stack', text: '{el} 의 {prop} 을 {color} 로 바꾸기', args: { el: { type: 'el', filter: 'any' }, prop: { type: 'choice', options: [['color', '글자색'], ['backgroundColor', '배경색']], def: 'color' }, color: { type: 'color', def: '#e11d48' } } },
    goto: { cat: 'action', shape: 'stack', text: '{url} 로 이동하기', args: { url: { type: 'text', def: 'https://' } } },

    if: { cat: 'control', shape: 'c', text: '만약 {cond} 이라면', args: { cond: { type: 'bool' } } },
    ifElse: { cat: 'control', shape: 'c2', text: '만약 {cond} 이라면', text2: '아니면', args: { cond: { type: 'bool' } } },
    repeat: { cat: 'control', shape: 'c', text: '{n} 번 반복하기', args: { n: { type: 'num', def: '3' } } },
    wait: { cat: 'control', shape: 'stack', text: '{n} 초 기다리기', args: { n: { type: 'num', def: '1' } } },

    getValue: { cat: 'value', shape: 'rep', text: '{el} 의 값', args: { el: { type: 'el', filter: 'input' } } },
    getText: { cat: 'value', shape: 'rep', text: '{el} 의 글자', args: { el: { type: 'el', filter: 'text' } } },
    join: { cat: 'value', shape: 'rep', text: '{a} 와 {b} 붙이기', args: { a: { type: 'text', def: '안녕 ' }, b: { type: 'text', def: '친구' } } },
    checked: { cat: 'value', shape: 'bool', text: '{el} 가 선택됨', args: { el: { type: 'el', filter: 'check' } } },
    isEmpty: { cat: 'value', shape: 'bool', text: '{a} 이(가) 비어 있음', args: { a: { type: 'text', def: '' } } },
    equals: { cat: 'value', shape: 'bool', text: '{a} = {b}', args: { a: { type: 'text', def: '' }, b: { type: 'text', def: '' } } },
    greater: { cat: 'value', shape: 'bool', text: '{a} > {b}', args: { a: { type: 'num', def: '10' }, b: { type: 'num', def: '5' } } },
    not: { cat: 'value', shape: 'bool', text: '{a} 이(가) 아님', args: { a: { type: 'bool' } } },
  };
  const DEFS = WB.BLOCK_DEFS;
  WB.blockColor = type => WB.BLOCK_CATS.find(c => c.id === DEFS[type].cat).c;
  WB.isValueBlock = b => ['rep', 'bool'].includes(DEFS[b.type].shape);

  /* ---------- 블록 데이터 다루기 ---------- */
  let seq = 0;
  const newBid = () => 'b' + ++seq;
  WB.newBlock = type => {
    const def = DEFS[type];
    const b = { id: newBid(), type, args: {} };
    for (const [k, spec] of Object.entries(def.args)) b.args[k] = spec.def ?? '';
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
  WB.reIdBlocks = blocks => {
    const data = blocks && Array.isArray(blocks.scripts) ? blocks : { scripts: [] };
    data.scripts = data.scripts.filter(s => Array.isArray(s.blocks) && s.blocks.every(b => DEFS[b?.type]));
    data.scripts.forEach(s => s.blocks.forEach(b => WB.walkBlock(b, x => (x.id = newBid()))));
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
    el: 'const el = id => document.getElementById(id);',
    on: 'const on = (id, type, fn) => el(id)?.addEventListener(type, fn);',
    val: "const val = id => el(id)?.value ?? '';",
    text: "const text = id => el(id)?.textContent ?? '';",
    checked: 'const checked = id => !!el(id)?.checked;',
    setText: 'const setText = (id, v) => { if (el(id)) el(id).textContent = v; };',
    setValue: 'const setValue = (id, v) => { if (el(id)) el(id).value = v; };',
    show: "const show = (id, mode) => {\n  const e = el(id);\n  if (!e) return;\n  const hide = mode === 'hide' || (mode === 'toggle' && e.style.display !== 'none');\n  e.style.display = hide ? 'none' : '';\n};",
    setStyle: 'const setStyle = (id, prop, v) => { if (el(id)) el(id).style[prop] = v; };',
    wait: 'const wait = sec => new Promise(done => setTimeout(done, sec * 1000));',
  };

  /** 블록을 사람이 읽는 한 줄로 (코드 주석용) */
  WB.describeBlock = b => DEFS[b.type].text.replace(/\{(\w+)\}/g, (_, k) => {
    const v = b.args[k];
    if (v && typeof v === 'object') return `(${WB.describeBlock(v)})`;
    const spec = DEFS[b.type].args[k];
    if (spec.type === 'choice') return (spec.options.find(o => o[0] === v) || [, v])[1];
    if (spec.type === 'el') return v ? '#' + v : '(요소)';
    return `"${v}"`;
  });

  WB.generateJS = data => {
    const used = new Set();
    const q = s => JSON.stringify(String(s ?? ''));
    const use = (...names) => names.forEach(n => used.add(n));

    function val(a, kind) {
      if (a && typeof a === 'object') return expr(a);
      if (kind === 'num') return String(Number(a) || 0);
      if (kind === 'bool') return 'false';
      return q(a);
    }
    function expr(b) {
      const A = b.args;
      switch (b.type) {
        case 'getValue': use('el', 'val'); return `val(${q(A.el)})`;
        case 'getText': use('el', 'text'); return `text(${q(A.el)})`;
        case 'join': return `(String(${val(A.a)}) + String(${val(A.b)}))`;
        case 'checked': use('el', 'checked'); return `checked(${q(A.el)})`;
        case 'isEmpty': return `(String(${val(A.a)}).trim() === '')`;
        case 'equals': return `(String(${val(A.a)}) === String(${val(A.b)}))`;
        case 'greater': return `(Number(${val(A.a, 'num')}) > Number(${val(A.b, 'num')}))`;
        case 'not': return `!${val(A.a, 'bool')}`;
      }
      return 'undefined';
    }
    /** 블록 목록 → 들여쓴 줄들 (끝에 줄바꿈 포함) */
    function lines(list, depth) {
      return list.map(b => stmt(b, depth)).filter(Boolean).map(s => s + '\n').join('');
    }
    function stmt(b, depth) {
      const A = b.args, p = '  '.repeat(depth);
      switch (b.type) {
        case 'alert': return `${p}alert(${val(A.msg)});`;
        case 'setText': use('el', 'setText'); return `${p}setText(${q(A.el)}, ${val(A.v)});`;
        case 'setValue': use('el', 'setValue'); return `${p}setValue(${q(A.el)}, ${val(A.v)});`;
        case 'showHide': use('el', 'show'); return `${p}show(${q(A.el)}, ${q(A.mode)});`;
        case 'setColor': use('el', 'setStyle'); return `${p}setStyle(${q(A.el)}, ${q(A.prop)}, ${q(A.color)});`;
        case 'goto': return `${p}location.href = ${val(A.url)};`;
        case 'wait': use('wait'); return `${p}await wait(${val(A.n, 'num')});`;
        case 'if': return `${p}if (${val(A.cond, 'bool')}) {\n${lines(b.body, depth + 1)}${p}}`;
        case 'ifElse': return `${p}if (${val(A.cond, 'bool')}) {\n${lines(b.body, depth + 1)}${p}} else {\n${lines(b.body2, depth + 1)}${p}}`;
        case 'repeat': return `${p}for (let i = 0; i < ${val(A.n, 'num')}; i++) {\n${lines(b.body, depth + 1)}${p}}`;
      }
      return '';
    }

    const parts = [];
    for (const s of data?.scripts || []) {
      const [hat, ...rest] = s.blocks;
      if (!hat || DEFS[hat.type].shape !== 'hat') continue; // 시작 블록이 없는 묶음은 실행되지 않음
      const body = lines(rest, 1);
      const comment = `// ${WB.describeBlock(hat)}`;
      const A = hat.args;
      if (hat.type === 'onLoad') parts.push(`${comment}\n(async () => {\n${body}})();`);
      else {
        use('el', 'on');
        const type = { onClick: 'click', onInput: 'input', onSubmit: 'submit' }[hat.type];
        const pre = hat.type === 'onSubmit' ? '  event.preventDefault(); // 페이지가 새로 고쳐지지 않게\n' : '';
        parts.push(`${comment}\non(${q(A.el)}, '${type}', async (event) => {\n${pre}${body}});`);
      }
    }
    if (!parts.length) return '';
    const helpers = Object.keys(HELPERS).filter(k => used.has(k)).map(k => HELPERS[k]);
    return (helpers.length ? '// 도우미 함수\n' + helpers.join('\n') + '\n\n' : '') + parts.join('\n\n') + '\n';
  };
})();
