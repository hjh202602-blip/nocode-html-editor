'use strict';
/* 브라우저 안 프로젝트 (IndexedDB)
   어떤 브라우저에서도 쓸 수 있게, 페이지 · 그림을 브라우저 저장소에 보관함.
   File System Access API 의 폴더 · 파일 핸들과 같은 모양(getFileHandle, values, createWritable …)으로 만들어서
   탐색기 · 저장 · 그림 넣기 코드를 내 컴퓨터 폴더와 똑같이 씀.
   + zip 내보내기 · 가져오기 (라이브러리 없이) */
(() => {
  /* ---------- 저장소 ---------- */
  let dbp = null;
  const db = () => (dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open('wb-projects', 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore('projects', { keyPath: 'id' });
      r.result.createObjectStore('entries', { keyPath: 'key' }); // key = '프로젝트id:경로'
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const done = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const store = async (name, mode = 'readonly') => (await db()).transaction(name, mode).objectStore(name);
  const K = (pid, path) => pid + ':' + path;
  const getEntry = async (pid, path) => done((await store('entries')).get(K(pid, path)));
  const putEntry = async e => done((await store('entries', 'readwrite')).put({ ...e, key: K(e.pid, e.path), mtime: Date.now() }));
  /** 경로 아래 전부 (prefix 로 시작하는 key) */
  const underPrefix = async prefix => done((await store('entries')).getAll(IDBKeyRange.bound(prefix, prefix + '￿')));
  async function listChildren(pid, dir) {
    const prefix = K(pid, dir ? dir + '/' : '');
    return (await underPrefix(prefix)).filter(e => {
      const rest = e.key.slice(prefix.length);
      return rest && !rest.includes('/');
    });
  }
  async function deleteTree(pid, path) {
    const s = await store('entries', 'readwrite');
    s.delete(K(pid, path));
    s.delete(IDBKeyRange.bound(K(pid, path + '/'), K(pid, path + '/￿')));
    await new Promise(r => (s.transaction.oncomplete = r));
  }
  async function touch(pid) {
    const s = await store('projects', 'readwrite');
    const p = await done(s.get(pid));
    if (p) { p.updated = Date.now(); s.put(p); }
  }

  const MIME = { html: 'text/html', htm: 'text/html', css: 'text/css', js: 'text/javascript', json: 'application/json', txt: 'text/plain', md: 'text/markdown', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', ico: 'image/x-icon', mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg', wav: 'audio/wav' };
  const typeOf = name => MIME[WB.extOf(name)] || '';
  const join = (a, b) => (a ? a + '/' + b : b);
  const notFound = n => new DOMException(`'${n}' 이(가) 없어요`, 'NotFoundError');

  /* ---------- 폴더 · 파일 핸들 (File System Access API 와 같은 모양) ---------- */
  class VDir {
    constructor(pid, path, name) { Object.assign(this, { kind: 'directory', pid, path, name, isVirtual: true }); }
    async getDirectoryHandle(name, opts = {}) { return this.#child(name, 'directory', opts.create); }
    async getFileHandle(name, opts = {}) { return this.#child(name, 'file', opts.create); }
    async #child(name, kind, create) {
      const p = join(this.path, name);
      const e = await getEntry(this.pid, p);
      if (e && e.kind !== kind) throw new DOMException(name, 'TypeMismatchError');
      if (!e) {
        if (!create) throw notFound(name);
        await putEntry({ pid: this.pid, path: p, kind, ...(kind === 'file' ? { blob: new Blob([], { type: typeOf(name) }) } : {}) });
        touch(this.pid);
      }
      return kind === 'file' ? new VFile(this.pid, p, name) : new VDir(this.pid, p, name);
    }
    async *values() {
      for (const e of await listChildren(this.pid, this.path)) {
        const name = e.path.split('/').pop();
        yield e.kind === 'directory' ? new VDir(this.pid, e.path, name) : new VFile(this.pid, e.path, name);
      }
    }
    async removeEntry(name, opts = {}) {
      const p = join(this.path, name);
      const e = await getEntry(this.pid, p);
      if (!e) throw notFound(name);
      if (e.kind === 'directory' && !opts.recursive && (await listChildren(this.pid, p)).length) throw new DOMException('폴더가 비어 있지 않아요', 'InvalidModificationError');
      await deleteTree(this.pid, p);
      touch(this.pid);
    }
    /** 이 폴더에서 handle 까지의 경로 조각 (밖이면 null) */
    async resolve(h) {
      if (!h || h.pid !== this.pid) return null;
      if (h.path === this.path) return [];
      if (!this.path) return h.path.split('/');
      return h.path.startsWith(this.path + '/') ? h.path.slice(this.path.length + 1).split('/') : null;
    }
    async isSameEntry(h) { return !!h && h.pid === this.pid && h.path === this.path && h.kind === this.kind; }
    async queryPermission() { return 'granted'; }
    async requestPermission() { return 'granted'; }
  }
  class VFile {
    constructor(pid, path, name) { Object.assign(this, { kind: 'file', pid, path, name, isVirtual: true }); }
    async getFile() {
      const e = await getEntry(this.pid, this.path);
      if (!e) throw notFound(this.name);
      return new File([e.blob], this.name, { type: e.blob.type || typeOf(this.name), lastModified: e.mtime });
    }
    async createWritable() {
      const parts = [];
      return {
        write: async d => { parts.push(d && d.type === 'write' ? d.data : d); },
        close: async () => {
          await putEntry({ pid: this.pid, path: this.path, kind: 'file', blob: new Blob(parts, { type: typeOf(this.name) }) });
          touch(this.pid);
        },
        abort: async () => {},
      };
    }
    async isSameEntry(h) { return !!h && h.pid === this.pid && h.path === this.path && h.kind === this.kind; }
    async queryPermission() { return 'granted'; }
  }

  /* ---------- 아무 폴더 핸들에 파일 쓰기 · 모두 읽기 (브라우저 프로젝트 · 내 컴퓨터 폴더 공용) ---------- */
  async function writePath(root, path, blob) {
    const parts = path.split('/').filter(Boolean);
    const name = parts.pop();
    let dir = root;
    for (const seg of parts) dir = await dir.getDirectoryHandle(seg, { create: true });
    const w = await (await dir.getFileHandle(name, { create: true })).createWritable();
    await w.write(blob);
    await w.close();
  }
  async function readAll(dir, base = '') {
    const out = [];
    for await (const h of dir.values()) {
      if (h.name === '.git' || h.name === 'node_modules') continue;
      const p = join(base, h.name);
      if (h.kind === 'file') out.push({ path: p, blob: await h.getFile() });
      else out.push(...(await readAll(h, p)));
    }
    return out;
  }

  /* ---------- 프로젝트 목록 ---------- */
  const P = (WB.projects = {
    async list() {
      const all = await done((await store('projects')).getAll());
      for (const p of all) p.pages = (await underPrefix(p.id + ':')).filter(e => e.kind === 'file' && /\.html?$/i.test(e.path)).length;
      return all.sort((a, b) => b.updated - a.updated);
    },
    get: async id => done((await store('projects')).get(id)),
    root: (p) => new VDir(p.id, '', p.name),
    /** files: [{ path, blob }] — 처음부터 넣을 파일들 */
    async create(name, files = []) {
      const p = { id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, created: Date.now(), updated: Date.now() };
      await done((await store('projects', 'readwrite')).put(p));
      await putEntry({ pid: p.id, path: '', kind: 'directory' });
      const root = P.root(p);
      for (const f of files) await writePath(root, f.path, f.blob);
      navigator.storage?.persist?.().catch(() => {}); // 브라우저가 저장 공간을 비울 때 지워지지 않게 부탁
      return p;
    },
    async rename(id, name) {
      const s = await store('projects', 'readwrite');
      const p = await done(s.get(id));
      if (p) { p.name = name; p.updated = Date.now(); await done(s.put(p)); }
      return p;
    },
    async remove(id) {
      const s = await store('entries', 'readwrite');
      s.delete(IDBKeyRange.bound(id + ':', id + ':￿'));
      await new Promise(r => (s.transaction.oncomplete = r));
      await done((await store('projects', 'readwrite')).delete(id));
    },
    writePath,
    readAll,
  });

  /* ---------- zip (압축 없이 담기 · 읽을 때는 일반 압축(deflate)도 풂) ---------- */
  const CRC = new Uint32Array(256).map((_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = u8 => {
    let c = 0xffffffff;
    for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  WB.makeZip = async files => {
    const enc = new TextEncoder();
    const now = new Date();
    const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const body = [], central = [];
    let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.path);
      const data = new Uint8Array(await f.blob.arrayBuffer());
      const crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [10, time, 2], [12, date, 2], [14, crc, 4], [18, data.length, 4], [22, data.length, 4], [26, name.length, 2]]
        .forEach(([o, v, n]) => (n === 4 ? lh.setUint32(o, v, true) : lh.setUint16(o, v, true)));
      body.push(lh.buffer, name, data);
      const ch = new DataView(new ArrayBuffer(46));
      [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [12, time, 2], [14, date, 2], [16, crc, 4], [20, data.length, 4], [24, data.length, 4], [28, name.length, 2], [42, offset, 4]]
        .forEach(([o, v, n]) => (n === 4 ? ch.setUint32(o, v, true) : ch.setUint16(o, v, true)));
      central.push(ch.buffer, name);
      offset += 30 + name.length + data.length;
    }
    const size = central.reduce((s, b) => s + b.byteLength, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, size, true);
    end.setUint32(16, offset, true);
    return new Blob([...body, ...central, end.buffer], { type: 'application/zip' });
  };
  WB.readZip = async blob => {
    const buf = new Uint8Array(await blob.arrayBuffer());
    const dv = new DataView(buf.buffer);
    let e = buf.length - 22;
    while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error('zip 파일이 아니에요');
    const count = dv.getUint16(e + 10, true);
    let p = dv.getUint32(e + 16, true);
    const utf8 = new TextDecoder('utf-8', { fatal: true });
    const decodeName = (bytes, flags) => {
      if (flags & 0x800) return new TextDecoder().decode(bytes);
      try { return utf8.decode(bytes); } catch { return new TextDecoder('euc-kr').decode(bytes); } // 윈도우에서 만든 zip 의 한글 이름
    };
    const out = [];
    for (let i = 0; i < count && dv.getUint32(p, true) === 0x02014b50; i++) {
      const flags = dv.getUint16(p + 8, true), method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), at = dv.getUint32(p + 42, true);
      const name = decodeName(buf.subarray(p + 46, p + 46 + nlen), flags);
      p += 46 + nlen + xlen + clen;
      if (name.endsWith('/') || /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db)/.test(name)) continue;
      const start = at + 30 + dv.getUint16(at + 26, true) + dv.getUint16(at + 28, true);
      const raw = buf.subarray(start, start + csize);
      let data;
      if (method === 0) data = raw;
      else if (method === 8) data = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      else continue; // 다른 압축 방식은 건너뜀
      out.push({ path: name.replace(/\\/g, '/'), blob: new Blob([data], { type: typeOf(name) }) });
    }
    // 모든 파일이 폴더 하나 안에 들어 있으면 그 폴더는 벗김
    const tops = new Set(out.map(f => f.path.split('/')[0]));
    if (tops.size === 1 && out.every(f => f.path.includes('/'))) out.forEach(f => (f.path = f.path.slice(f.path.indexOf('/') + 1)));
    return out;
  };
})();
