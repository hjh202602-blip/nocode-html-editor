'use strict';
/* 데이터로 반복해서 만들기: 카드 하나를 틀로 삼아, 표에 적은 줄 수만큼 카드를 만들어 줌
   (같은 모양의 옆 요소들은 이미 만든 복사본으로 보고 표에 미리 채워 둠. 엑셀에서 붙여넣기 가능) */
(() => {
  const { h } = WB;

  /** 요소 모양 지문: 태그 구조가 같으면 같은 카드로 봄 */
  const sig = n => n.tag + (n.children ? '(' + n.children.map(sig).join(',') + ')' : '');

  /** 틀 안에서 바꿀 수 있는 칸: 글자, 그림 주소, 링크 주소 */
  function fieldsOf(tpl) {
    const out = [];
    const walk = (n, path) => {
      const kind = WB.kindOf(n);
      if (kind === 'text' && n.tag !== 'option') out.push({ path, key: 'text', label: WB.labelOf(n) });
      if (n.tag === 'img') out.push({ path, key: 'src', label: '그림 주소' });
      if (n.tag === 'a') out.push({ path, key: 'href', label: '링크 주소' });
      (n.children || []).forEach((c, i) => walk(c, [...path, i]));
    };
    walk(tpl, []);
    return out;
  }
  const at = (n, path) => path.reduce((x, i) => x.children[i], n);
  const getVal = (n, f) => (f.key === 'text' ? at(n, f.path).text : at(n, f.path).attrs[f.key]) || '';
  function setVal(n, f, v) {
    const t = at(n, f.path);
    if (f.key === 'text') t.text = v;
    else t.attrs[f.key] = v;
  }

  WB.openRepeater = id => {
    const doc = WB.canvasDoc();
    const found = doc && WB.find(doc.root, id);
    if (!found || !found.parent) return WB.toast('반복할 요소(예: 카드)를 먼저 고르세요');
    const tpl = found.node, parent = found.parent;
    const s = sig(tpl);
    const copies = parent.children.filter(c => sig(c) === s);
    const fields = fieldsOf(tpl);
    if (!fields.length) return WB.toast('이 요소 안에는 바꿀 글자나 그림이 없어요');

    // 표 (한 줄 = 카드 하나)
    const table = h('table', { class: 'rep-table' });
    const head = h('tr', {}, h('th', {}, '#'), ...fields.map((f, i) => h('th', { title: f.key === 'text' ? '글자' : f.key }, `${i + 1}. ${f.label}`)), h('th'));
    const tbody = h('tbody');
    table.append(h('thead', {}, head), tbody);
    const addRow = vals => {
      const tr = h('tr', {}, h('td', { class: 'num' }));
      fields.forEach((f, i) => tr.append(h('td', {}, h('input', { type: 'text', value: vals ? vals[i] ?? '' : '', spellcheck: 'false' }))));
      const del = h('button', { class: 'icon-btn', title: '이 줄 지우기', html: WB.icon('x', 14) });
      del.onclick = () => { tr.remove(); renumber(); };
      tr.append(h('td', {}, del));
      tbody.append(tr);
      renumber();
      return tr;
    };
    const renumber = () => [...tbody.rows].forEach((r, i) => (r.cells[0].textContent = i + 1));
    copies.forEach(c => addRow(fields.map(f => getVal(c, f))));

    // 엑셀 · 구글 시트에서 여러 칸을 복사해 붙여넣으면 표에 나눠 채움
    tbody.addEventListener('paste', e => {
      const text = e.clipboardData.getData('text/plain');
      if (!/[\t\n]/.test(text)) return;
      e.preventDefault();
      const inp = e.target.closest('input');
      let r = [...tbody.rows].indexOf(inp.closest('tr'));
      const c0 = [...inp.closest('tr').cells].indexOf(inp.closest('td')) - 1;
      for (const line of text.replace(/\r/g, '').replace(/\n$/, '').split('\n')) {
        const row = tbody.rows[r] || addRow();
        line.split('\t').forEach((v, k) => { const cell = row.cells[c0 + k + 1]?.querySelector('input'); if (cell) cell.value = v; });
        r++;
      }
    });

    const add = h('button', { class: 'btn small', html: WB.icon('plus', 14) + ' 줄 추가' });
    add.onclick = () => addRow(fields.map(() => ''))?.querySelector('input')?.focus();
    const body = h('div', { class: 'rep' },
      h('p', { class: 'hint' }, `「${WB.labelOf(tpl)}」 모양으로 한 줄에 하나씩 만들어요. 지금 같은 모양 ${copies.length}개가 표에 들어 있어요. 엑셀에서 여러 칸을 복사해 붙여넣어도 돼요.`),
      h('div', { class: 'rep-scroll' }, table),
      add);

    WB.modal({
      title: '데이터로 반복해서 만들기',
      content: body,
      wide: true,
      actions: [
        { label: '취소', onClick: close => close() },
        {
          label: '만들기', primary: true, onClick: close => {
            const rows = [...tbody.rows].map(r => [...r.querySelectorAll('input')].map(i => i.value));
            if (!rows.length) return WB.toast('줄이 하나 이상 있어야 해요', 'error');
            WB.commit(d => {
              const p = WB.find(d.root, parent.id).node;
              const t = WB.find(d.root, tpl.id).node;
              const first = p.children.findIndex(c => sig(c) === s);
              const made = rows.map((vals, i) => {
                const n = i === 0 ? t : WB.cloneNode(t);
                fields.forEach((f, k) => setVal(n, f, vals[k]));
                return n;
              });
              const rest = p.children.filter(c => sig(c) !== s);
              rest.splice(Math.min(first, rest.length), 0, ...made);
              p.children = rest;
            }, `repeat:${Date.now()}`);
            WB.toast(`${rows.length}개를 만들었어요`, 'ok');
            close();
          },
        },
      ],
    });
  };
})();
