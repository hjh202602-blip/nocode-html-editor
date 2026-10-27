'use strict';
/* 코드로 변환 — 문서 모델 ↔ HTML 코드 */
(() => {
  const VOID_HTML = new Set(['img', 'input', 'hr', 'br']);
  const BOOL_ATTRS = new Set(['controls', 'autoplay', 'muted', 'loop', 'checked', 'required', 'disabled', 'readonly', 'multiple', 'selected', 'allowfullscreen']);
  const SKIP_TAGS = new Set(['script', 'style', 'link', 'meta', 'noscript', 'template']);
  const escText = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const decls = (style, ind) =>
    Object.entries(style || {})
      .filter(([, v]) => v !== '' && v != null)
      .map(([k, v]) => `${ind}${k}: ${v};`)
      .join('\n');

  /** 문서 → 완성된 HTML 파일 내용. 스타일은 <style> 안의 클래스(.c1, .c2 …)로 모음 */
  WB.generateHTML = function (doc) {
    let seq = 0;
    const rules = [];
    const classOf = new Map(); // 스타일이 똑같은 요소는 같은 클래스를 함께 씀

    function attrString(node, cls) {
      const parts = [];
      const classes = [cls, node.attrs.class].filter(Boolean).join(' ');
      if (classes) parts.push(`class="${escAttr(classes)}"`);
      for (const [k, v] of Object.entries(node.attrs)) {
        if (k === 'class' || v == null || v === false) continue;
        parts.push(BOOL_ATTRS.has(k) ? k : `${k}="${escAttr(v)}"`);
      }
      return parts.length ? ' ' + parts.join(' ') : '';
    }

    function el(node, depth) {
      const ind = '  '.repeat(depth);
      let cls = '';
      const d = decls(node.style, '      ');
      if (d) {
        cls = classOf.get(d);
        if (!cls) {
          cls = 'c' + ++seq;
          classOf.set(d, cls);
          rules.push(`    .${cls} {\n${d}\n    }`);
        }
      }
      const open = `<${node.tag}${attrString(node, cls)}>`;
      if (VOID_HTML.has(node.tag)) return ind + open;
      const kind = WB.kindOf(node.tag);
      if (kind === 'container') {
        if (!node.children.length) return `${ind}${open}</${node.tag}>`;
        return `${ind}${open}\n${node.children.map(c => el(c, depth + 1)).join('\n')}\n${ind}</${node.tag}>`;
      }
      if (kind === 'text') return `${ind}${open}${escText(node.text || '').split('\n').join('<br>')}</${node.tag}>`;
      return `${ind}${open}</${node.tag}>`;
    }

    const body = doc.root.children.map(c => el(c, 1)).join('\n');
    const bodyDecls = decls(doc.root.style, '      ');
    const css = [
      '    *, *::before, *::after {\n      box-sizing: border-box;\n    }',
      bodyDecls ? `    body {\n${bodyDecls}\n    }` : '',
      ...rules,
    ].filter(Boolean).join('\n');

    // 탭5 블록 → <script>. 블록 모양 자체도 JSON 으로 함께 넣어서 다시 열 때 되살림
    let scripts = '';
    const js = WB.generateJS(doc.blocks);
    if (js) scripts += `\n  <script>\n${js.trimEnd().split('\n').map(l => (l ? '    ' + l : '')).join('\n')}\n  </script>`;
    if (doc.blocks?.scripts.length) {
      // 블록 id 는 열 때 새로 매기므로 저장하지 않음
      const data = JSON.stringify(doc.blocks, (k, v) => (k === 'id' ? undefined : v)).replace(/</g, '\\u003c');
      scripts += `\n  <script type="application/json" id="wb-blocks">${data}</script>`;
    }

    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escText(doc.title || '')}</title>
  <style>
${css}
  </style>
</head>
<body>
${body}${scripts}
</body>
</html>
`;
  };

  /* ---------- HTML 코드 → 문서 모델 (파일 열기) ---------- */

  /** "a: 1; b: url(x;y)" 처럼 괄호·따옴표 안의 ; 는 건너뛰며 나눔 */
  function parseDecls(text) {
    const out = {};
    let depth = 0, quote = '', cur = '';
    const flush = () => {
      const i = cur.indexOf(':');
      if (i > 0) {
        const k = cur.slice(0, i).trim().toLowerCase();
        const v = cur.slice(i + 1).trim();
        if (k && v) out[k] = v;
      }
      cur = '';
    };
    for (const ch of text) {
      if (quote) { if (ch === quote) quote = ''; }
      else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === ';' && depth <= 0) { flush(); continue; }
      cur += ch;
    }
    flush();
    return out;
  }

  /** <style> 안에서 'body' 와 '.클래스' 규칙만 골라냄 (@media 등은 건너뜀) */
  function parseRules(css) {
    css = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const rules = [];
    let i = 0;
    while (i < css.length) {
      const open = css.indexOf('{', i);
      if (open < 0) break;
      const sel = css.slice(i, open).trim();
      let depth = 1, j = open + 1;
      while (j < css.length && depth) {
        if (css[j] === '{') depth++;
        else if (css[j] === '}') depth--;
        j++;
      }
      if (!sel.startsWith('@')) rules.push({ sel, decls: parseDecls(css.slice(open + 1, j - 1)) });
      i = j;
    }
    return rules;
  }

  function textOf(el) {
    let s = '';
    for (const ch of el.childNodes) {
      if (ch.nodeType === 3) s += ch.data;
      else if (ch.nodeName === 'BR') s += '\u0000';
      else if (ch.nodeType === 1) s += textOf(ch);
    }
    return s;
  }
  const cleanText = s => s.replace(/\s+/g, ' ').trim().replace(/ ?\u0000 ?/g, '\n');

  WB.parseHTML = function (source) {
    const d = new DOMParser().parseFromString(source, 'text/html');
    const classRules = {};
    let bodyStyle = null;
    d.querySelectorAll('style').forEach(st => {
      for (const r of parseRules(st.textContent)) {
        for (const sel of r.sel.split(',').map(s => s.trim())) {
          if (sel === 'body') bodyStyle = { ...(bodyStyle || {}), ...r.decls };
          else if (/^\.[\w-]+$/.test(sel)) classRules[sel.slice(1)] = { ...(classRules[sel.slice(1)] || {}), ...r.decls };
        }
      }
    });

    function walk(el) {
      const tag = el.tagName.toLowerCase();
      if (SKIP_TAGS.has(tag)) return null;
      const node = { id: WB.newId(), tag, attrs: {}, style: {} };
      for (const a of el.attributes) {
        if (a.name === 'class') {
          const keep = [];
          for (const c of a.value.split(/\s+/).filter(Boolean)) {
            if (classRules[c]) Object.assign(node.style, classRules[c]);
            else keep.push(c);
          }
          if (keep.length) node.attrs.class = keep.join(' ');
        } else if (a.name === 'style') Object.assign(node.style, parseDecls(a.value));
        else if (!/^on/i.test(a.name)) node.attrs[a.name] = a.value;
      }
      const kind = WB.kindOf(tag);
      if (kind === 'container') node.children = childrenOf(el);
      else if (kind === 'text') node.text = cleanText(textOf(el));
      return node;
    }
    function childrenOf(el) {
      const out = [];
      for (const ch of el.childNodes) {
        if (ch.nodeType === 1) {
          const n = walk(ch);
          if (n) out.push(n);
        } else if (ch.nodeType === 3 && ch.data.trim()) {
          out.push(WB.makeNode('span', { text: cleanText(ch.data) }));
        }
      }
      return out;
    }

    const root = WB.newRoot();
    root.style = bodyStyle || {};
    if (d.body.getAttribute('style')) Object.assign(root.style, parseDecls(d.body.getAttribute('style')));
    root.children = childrenOf(d.body);
    let blocks = null;
    try {
      const raw = d.getElementById('wb-blocks');
      if (raw) blocks = WB.reIdBlocks(JSON.parse(raw.textContent));
    } catch { /* 블록 정보가 깨졌으면 블록 없이 열기 */ }
    return { title: d.title, root, blocks };
  };

  /* ---------- 코드 색칠 (코드 보기 창) ---------- */
  function hlTag(raw) {
    const m = raw.match(/^(<\/?)([a-zA-Z][\w-]*)([\s\S]*?)(\/?>)$/);
    if (!m) return WB.esc(raw);
    const attrs = m[3].replace(/([^\s=]+)(?:(=)("[^"]*"|'[^']*'|[^\s>]+))?/g, (all, name, eq, val) =>
      `<span class="hl-attr">${WB.esc(name)}</span>${eq ? '<span class="hl-p">=</span>' : ''}${val ? `<span class="hl-str">${WB.esc(val)}</span>` : ''}`);
    return `<span class="hl-p">${WB.esc(m[1])}</span><span class="hl-tag">${m[2]}</span>${attrs}<span class="hl-p">${WB.esc(m[4])}</span>`;
  }
  function hlCSS(text) {
    return text.split('\n').map(line => {
      let m;
      if ((m = line.match(/^(\s*)([\w-]+)(\s*:\s*)(.*?)(;?)$/)))
        return `${m[1]}<span class="hl-prop">${m[2]}</span><span class="hl-p">${m[3]}</span><span class="hl-val">${WB.esc(m[4])}</span><span class="hl-p">${m[5]}</span>`;
      if ((m = line.match(/^(\s*)(.*?)(\s*\{)$/))) return `${m[1]}<span class="hl-sel">${WB.esc(m[2])}</span><span class="hl-p">${m[3]}</span>`;
      return `<span class="hl-p">${WB.esc(line)}</span>`;
    }).join('\n');
  }
  WB.highlightHTML = code => {
    let out = '';
    let inStyle = false;
    for (const m of code.matchAll(/<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<\/?[a-zA-Z][^>]*>|[^<]+|</gi)) {
      const t = m[0];
      if (t.startsWith('<!--')) out += `<span class="hl-cm">${WB.esc(t)}</span>`;
      else if (/^<!DOCTYPE/i.test(t)) out += `<span class="hl-dt">${WB.esc(t)}</span>`;
      else if (/^<\/?[a-zA-Z]/.test(t)) {
        out += hlTag(t);
        if (/^<style/i.test(t)) inStyle = true;
        if (/^<\/style/i.test(t)) inStyle = false;
      } else out += inStyle ? hlCSS(t) : WB.esc(t);
    }
    return out;
  };
})();
