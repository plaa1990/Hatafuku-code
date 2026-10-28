/* io.js — ตัวเข้ารหัสไฟล์ส่งออก: PDF, GIF แอนิเมชัน, SVG (ฝังภาพ / แปลงเป็นเวกเตอร์)
   ไม่แตะ DOM ทดสอบด้วย Node ได้ */
(function (G) {
  'use strict';
  const enc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : { encode: s => Uint8Array.from(Buffer.from(s, 'utf8')) };

  function concat(parts) {
    let n = 0; parts.forEach(p => n += p.length);
    const o = new Uint8Array(n); let k = 0; parts.forEach(p => { o.set(p, k); k += p.length; });
    return o;
  }

  /* ---------------- PDF (ฝังภาพ JPEG 1 หน้า) ---------------- */
  /** jpg: Uint8Array ไฟล์ JPEG, page: 'img' ขนาดตามภาพ | 'a4' พอดีหน้า A4 */
  function makePDF(jpg, w, h, page) {
    const f = v => (+v).toFixed(2).replace(/\.?0+$/, '');
    let pw, ph, iw, ih, x = 0, y = 0;
    if (page === 'a4') {
      pw = 595.28; ph = 841.89; if (w > h) { const t = pw; pw = ph; ph = t; }
      const m = 28, sc = Math.min((pw - 2 * m) / w, (ph - 2 * m) / h); iw = w * sc; ih = h * sc; x = (pw - iw) / 2; y = (ph - ih) / 2;
    } else { pw = w * .75; ph = h * .75; iw = pw; ih = ph; }
    const content = enc.encode('q ' + f(iw) + ' 0 0 ' + f(ih) + ' ' + f(x) + ' ' + f(y) + ' cm /Im0 Do Q');
    const objs = [
      enc.encode('<< /Type /Catalog /Pages 2 0 R >>'),
      enc.encode('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
      enc.encode('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + f(pw) + ' ' + f(ph) + '] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>'),
      concat([enc.encode('<< /Type /XObject /Subtype /Image /Width ' + w + ' /Height ' + h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpg.length + ' >>\nstream\n'), jpg, enc.encode('\nendstream')]),
      concat([enc.encode('<< /Length ' + content.length + ' >>\nstream\n'), content, enc.encode('\nendstream')])
    ];
    const parts = [Uint8Array.from([37, 80, 68, 70, 45, 49, 46, 52, 10, 37, 226, 227, 207, 211, 10])], off = [];
    let pos = parts[0].length;
    objs.forEach((o, i) => {
      off.push(pos);
      const a = enc.encode((i + 1) + ' 0 obj\n'), b = enc.encode('\nendobj\n');
      parts.push(a, o, b); pos += a.length + o.length + b.length;
    });
    let xr = 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
    off.forEach(o => xr += String(o).padStart(10, '0') + ' 00000 n \n');
    xr += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + pos + '\n%%EOF\n';
    parts.push(enc.encode(xr));
    return concat(parts);
  }

  /* ---------------- ลดสีเป็นจานสี (median cut) ใช้ร่วมกับ GIF และ SVG ---------------- */
  /** คืน {pal:[[r,g,b]...], map: Int16Array(32768) ดัชนีจานสีที่ใกล้ที่สุดของสี 15 บิต} */
  function quantize(samples, n, maxColors) {
    // samples: Uint8ClampedArray RGBA, อ่านทุก ๆ step พิกเซล; พิกเซลโปร่งใส (a<128) ข้าม
    const hist = new Uint32Array(32768), step = Math.max(1, Math.floor(n / 60000));
    for (let p = 0; p < n; p += step) { const i = p * 4; if (samples[i + 3] < 128) continue; hist[((samples[i] >> 3) << 10) | ((samples[i + 1] >> 3) << 5) | (samples[i + 2] >> 3)]++; }
    const cols = []; for (let c = 0; c < 32768; c++) if (hist[c]) cols.push(c);
    const rr = c => (c >> 10) & 31, gg = c => (c >> 5) & 31, bb = c => c & 31;
    if (!cols.length) cols.push(0);
    let boxes = [cols];
    const range = (bx) => { let r0 = 31, r1 = 0, g0 = 31, g1 = 0, b0 = 31, b1 = 0; bx.forEach(c => { const r = rr(c), g = gg(c), b = bb(c); if (r < r0) r0 = r; if (r > r1) r1 = r; if (g < g0) g0 = g; if (g > g1) g1 = g; if (b < b0) b0 = b; if (b > b1) b1 = b; }); return [r1 - r0, g1 - g0, b1 - b0]; };
    while (boxes.length < maxColors) {
      let bi = -1, bs = 0, bch = 0;
      boxes.forEach((bx, i) => { if (bx.length < 2) return; const r = range(bx), m = Math.max(r[0], r[1], r[2]); let tot = 0; bx.forEach(c => tot += hist[c]); const sc = m * Math.sqrt(tot); if (sc > bs) { bs = sc; bi = i; bch = r[0] >= r[1] && r[0] >= r[2] ? 0 : r[1] >= r[2] ? 1 : 2; } });
      if (bi < 0) break;
      const bx = boxes[bi], key = bch === 0 ? rr : bch === 1 ? gg : bb;
      bx.sort((a, b) => key(a) - key(b));
      let tot = 0; bx.forEach(c => tot += hist[c]);
      let acc = 0, cut = 1; for (let i = 0; i < bx.length; i++) { acc += hist[bx[i]]; if (acc >= tot / 2) { cut = Math.min(bx.length - 1, Math.max(1, i + 1)); break; } }
      boxes.splice(bi, 1, bx.slice(0, cut), bx.slice(cut));
    }
    const pal = boxes.map(bx => { let r = 0, g = 0, b = 0, t = 0; bx.forEach(c => { const k = hist[c]; r += rr(c) * k; g += gg(c) * k; b += bb(c) * k; t += k; }); t = t || 1; return [Math.round(r / t * 8 + 3.5), Math.round(g / t * 8 + 3.5), Math.round(b / t * 8 + 3.5)].map(v => Math.min(255, v)); });
    const map = new Int16Array(32768).fill(-1);
    return { pal, map, nearest(c) { let v = map[c]; if (v >= 0) return v; const r = ((c >> 10) & 31) * 8 + 4, g = ((c >> 5) & 31) * 8 + 4, b = (c & 31) * 8 + 4; let bd = 1e9; v = 0; for (let i = 0; i < pal.length; i++) { const dr = pal[i][0] - r, dg = pal[i][1] - g, db = pal[i][2] - b, dd = dr * dr * 2 + dg * dg * 4 + db * db * 3; if (dd < bd) { bd = dd; v = i; } } map[c] = v; return v; } };
  }

  /* ---------------- GIF ---------------- */
  function lzw(idx, minBits) {
    const clear = 1 << minBits, eoi = clear + 1, out = [];
    let bits = 0, nb = 0, size = minBits + 1, next = eoi + 1, dict = new Map();
    const emit = code => { bits |= code << nb; nb += size; while (nb >= 8) { out.push(bits & 255); bits >>>= 8; nb -= 8; } };
    emit(clear);
    let prefix = idx[0];
    for (let i = 1; i < idx.length; i++) {
      const k = idx[i], key = prefix * 256 + k, v = dict.get(key);
      if (v !== undefined) { prefix = v; continue; }
      emit(prefix);
      if (next < 4096) { dict.set(key, next++); if (next > (1 << size) && size < 12) size++; }
      else { emit(clear); dict = new Map(); next = eoi + 1; size = minBits + 1; }
      prefix = k;
    }
    emit(prefix); emit(eoi);
    if (nb > 0) out.push(bits & 255);
    return out;
  }
  /** frames: [{d: RGBA Uint8ClampedArray, delay: มิลลิวินาที}] ขนาด w×h เท่ากันทุกเฟรม */
  function makeGIF(frames, w, h, loops) {
    const o = [], b = a => a.forEach(x => o.push(x)), le = v => [v & 255, (v >> 8) & 255];
    b([71, 73, 70, 56, 57, 97]); b(le(w)); b(le(h)); b([0, 0, 0]);
    b([0x21, 0xFF, 0x0B, 78, 69, 84, 83, 67, 65, 80, 69, 50, 46, 48, 3, 1]); b(le(loops || 0)); b([0]);
    frames.forEach(fr => {
      const n = w * h, q = quantize(fr.d, n, 256), idx = new Uint8Array(n);
      for (let p = 0; p < n; p++) { const i = p * 4; idx[p] = q.nearest(((fr.d[i] >> 3) << 10) | ((fr.d[i + 1] >> 3) << 5) | (fr.d[i + 2] >> 3)); }
      const bitsN = Math.max(1, Math.ceil(Math.log2(Math.max(2, q.pal.length)))), tsz = 1 << bitsN;
      b([0x21, 0xF9, 4, 0x04]); b(le(Math.max(2, Math.round((fr.delay || 100) / 10)))); b([0, 0]);
      b([0x2C, 0, 0, 0, 0]); b(le(w)); b(le(h)); b([0x80 | (bitsN - 1)]);
      for (let i = 0; i < tsz; i++) { const c = q.pal[i] || [0, 0, 0]; b(c); }
      const minBits = Math.max(2, bitsN); b([minBits]);
      const data = lzw(idx, minBits);
      for (let i = 0; i < data.length; i += 255) { const ch = data.slice(i, i + 255); o.push(ch.length); b(ch); }
      o.push(0);
    });
    o.push(0x3B);
    return Uint8Array.from(o);
  }

  /* ---------------- SVG ---------------- */
  function svgEmbed(pngDataUrl, w, h) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><image width="' + w + '" height="' + h + '" xlink:href="' + pngDataUrl + '"/></svg>';
  }
  function dpSimplify(pts, eps) {
    if (pts.length < 4) return pts;
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
    const st = [[0, pts.length - 1]];
    while (st.length) {
      const [a, b] = st.pop(); let md = 0, mi = -1;
      const ax = pts[a][0], ay = pts[a][1], dx = pts[b][0] - ax, dy = pts[b][1] - ay, L = Math.hypot(dx, dy) || 1e-9;
      for (let i = a + 1; i < b; i++) { const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / L; if (d > md) { md = d; mi = i; } }
      if (md > eps && mi > 0) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
    }
    return pts.filter((_, i) => keep[i]);
  }
  /** ลดจุดของวงปิด: แบ่งที่จุดไกลสุดจากจุดแรกก่อน (Douglas–Peucker ตรงๆ กับวงปิดจะยุบเหลือจุดเดียว) */
  function simplifyRing(r, eps) {
    if (r.length < 4) return r;
    let k = 0, md = -1;
    for (let i = 1; i < r.length; i++) { const dx = r[i][0] - r[0][0], dy = r[i][1] - r[0][1], d = dx * dx + dy * dy; if (d > md) { md = d; k = i; } }
    const a = dpSimplify(r.slice(0, k + 1), eps), b = dpSimplify(r.slice(k).concat([r[0]]), eps);
    return a.slice(0, -1).concat(b.slice(0, -1));
  }
  /** ลากเส้นขอบของมาสก์ทวิภาค -> รายการวงปิด [[x,y]...] */
  function traceMask(mask, w, h) {
    const W1 = w + 1, nv = W1 * (h + 1), head = new Int32Array(nv).fill(-1), nxt = [], st = [], dr = [];
    const add = (vx, vy, dir) => { const k = vy * W1 + vx; nxt.push(head[k]); head[k] = nxt.length - 1; st.push(k); dr.push(dir); };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      if (y === 0 || !mask[(y - 1) * w + x]) add(x, y, 0);
      if (x === w - 1 || !mask[y * w + x + 1]) add(x + 1, y, 1);
      if (y === h - 1 || !mask[(y + 1) * w + x]) add(x + 1, y + 1, 2);
      if (x === 0 || !mask[y * w + x - 1]) add(x, y + 1, 3);
    }
    const delta = [1, W1, -1, -W1], used = new Uint8Array(st.length), loops = [];
    for (let e0 = 0; e0 < st.length; e0++) {
      if (used[e0]) continue;
      const ring = []; let e = e0, lastDir = -1;
      for (;;) {
        used[e] = 1; const k = st[e];
        if (dr[e] !== lastDir) { ring.push([k % W1, (k / W1) | 0]); lastDir = dr[e]; }
        const endk = k + delta[dr[e]]; let ne = -1;
        // เลือกเลี้ยวขวาก่อน เพื่อแยกมุมที่แตะกันแนวทแยง
        let best = -1, bestScore = -9;
        for (let c = head[endk]; c >= 0; c = nxt[c]) { if (used[c] && c !== e0) continue; if (used[c] && c === e0) { ne = e0; best = c; bestScore = 9; break; } const turn = (dr[c] - dr[e] + 4) % 4, score = turn === 1 ? 3 : turn === 0 ? 2 : turn === 3 ? 1 : 0; if (score > bestScore) { bestScore = score; best = c; } }
        ne = best;
        if (ne < 0 || ne === e0) break;
        e = ne;
      }
      if (ring.length >= 3) loops.push(ring);
    }
    return loops;
  }
  /** แปลงภาพเป็น SVG เวกเตอร์ (ลดสี + ลากเส้นขอบ) opt: {colors, maxSide, eps, minArea, bg} */
  function traceSVG(d, w, h, opt) {
    opt = opt || {}; const K = Math.max(2, Math.min(32, opt.colors || 8)), maxSide = opt.maxSide || 640;
    const s = Math.min(1, maxSide / Math.max(w, h)), sw = Math.max(1, Math.round(w * s)), sh = Math.max(1, Math.round(h * s)), n = sw * sh;
    // ย่อภาพแบบเฉลี่ยกล่อง (premultiplied)
    const small = new Uint8ClampedArray(n * 4);
    for (let y = 0; y < sh; y++) {
      const y0 = Math.floor(y * h / sh), y1 = Math.max(y0 + 1, Math.floor((y + 1) * h / sh));
      for (let x = 0; x < sw; x++) {
        const x0 = Math.floor(x * w / sw), x1 = Math.max(x0 + 1, Math.floor((x + 1) * w / sw));
        let r = 0, g = 0, b = 0, a = 0, c = 0;
        for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const i = (yy * w + xx) * 4, al = d[i + 3]; r += d[i] * al; g += d[i + 1] * al; b += d[i + 2] * al; a += al; c++; }
        const o = (y * sw + x) * 4; if (a > 0) { small[o] = r / a; small[o + 1] = g / a; small[o + 2] = b / a; } small[o + 3] = a / c;
      }
    }
    const q = quantize(small, n, K), lab = new Int16Array(n);
    for (let p = 0; p < n; p++) { const i = p * 4; lab[p] = small[i + 3] < 128 ? -1 : q.nearest(((small[i] >> 3) << 10) | ((small[i + 1] >> 3) << 5) | (small[i + 2] >> 3)); }
    // กรองเสียงรบกวน: ใช้ค่าฐานนิยม 3×3 หนึ่งรอบ
    const lab2 = new Int16Array(lab), cnt = new Int16Array(K + 2);
    for (let y = 1; y < sh - 1; y++) for (let x = 1; x < sw - 1; x++) {
      cnt.fill(0); let bv = lab[y * sw + x], bc = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const v = lab[(y + j) * sw + x + i]; const c = ++cnt[v + 1]; if (c > bc) { bc = c; bv = v; } }
      if (bc >= 5) lab2[y * sw + x] = bv;
    }
    const area = new Array(q.pal.length).fill(0); for (let p = 0; p < n; p++) if (lab2[p] >= 0) area[lab2[p]]++;
    const order = area.map((a, i) => i).filter(i => area[i] > 0).sort((a, b) => area[b] - area[a]);
    const eps = opt.eps || 0.9, minA = opt.minArea || 6, k = 1 / s, hexc = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
    const fx = v => Math.round(v * k * 10) / 10;
    let body = '';
    order.forEach((ci, oi) => {
      const mask = new Uint8Array(n); for (let p = 0; p < n; p++) if (lab2[p] === ci) mask[p] = 1;
      let dstr = '';
      traceMask(mask, sw, sh).forEach(r0 => {
        let a2 = 0; for (let i = 0; i < r0.length; i++) { const p = r0[i], q2 = r0[(i + 1) % r0.length]; a2 += p[0] * q2[1] - q2[0] * p[1]; }
        if (Math.abs(a2) / 2 < minA) return;
        const simp = simplifyRing(r0, eps);
        if (simp.length < 3) return;
        dstr += 'M' + simp.map(p => fx(p[0]) + ' ' + fx(p[1])).join('L') + 'Z';
      });
      if (dstr) { const c = hexc(q.pal[ci]); body += '<path fill="' + c + '" stroke="' + c + '" stroke-width="' + (Math.round(k * 6) / 10) + '" stroke-linejoin="round" fill-rule="evenodd" d="' + dstr + '"/>'; }
    });
    const bg = opt.bg ? '<rect width="' + w + '" height="' + h + '" fill="' + opt.bg + '"/>' : '';
    return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' + bg + body + '</svg>';
  }

  const IO = { makePDF, makeGIF, svgEmbed, traceSVG, quantize, lzw };
  if (typeof module !== 'undefined' && module.exports) module.exports = IO; else G.IO = IO;
})(typeof window !== 'undefined' ? window : globalThis);
