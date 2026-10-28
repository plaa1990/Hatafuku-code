/* fx.js — ฟังก์ชันประมวลผลภาพล้วนๆ (มาสก์ ไม้กายสิทธิ์ เบลอ ปรับสี)
   ไม่แตะ DOM ทดสอบด้วย Node ได้
   มาสก์ = Uint8Array ขนาด W*H ค่า 0–255 (255 = เลือกเต็ม) */
(function (G) {
  'use strict';

  const emptyM = (W, H) => new Uint8Array(W * H);

  /* ---------- มาสก์พื้นฐาน ---------- */
  function maskIsEmpty(m) { if (!m) return true; for (let i = 0; i < m.length; i++) if (m[i]) return false; return true; }
  function invertMask(m) { const o = new Uint8Array(m.length); for (let i = 0; i < m.length; i++) o[i] = 255 - m[i]; return o; }
  function combineMask(old, nw, mode) {
    if (!old || mode === 'rep' || !mode) return nw;
    const o = new Uint8Array(old.length);
    if (mode === 'add') for (let i = 0; i < o.length; i++) o[i] = Math.max(old[i], nw[i]);
    else if (mode === 'sub') for (let i = 0; i < o.length; i++) o[i] = Math.round(old[i] * (255 - nw[i]) / 255);
    else if (mode === 'int') for (let i = 0; i < o.length; i++) o[i] = Math.min(old[i], nw[i]);
    else return nw;
    return o;
  }
  function maskBounds(m, W, H) {
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m[y * W + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }
  function contentBounds(d, W, H, thr) {
    thr = thr == null ? 8 : thr;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > thr) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }

  /* ---------- ไม้กายสิทธิ์ ---------- */
  /** tol 0–100; contig=true เลือกเฉพาะส่วนที่ติดกัน, false เลือกสีใกล้เคียงทั้งภาพ */
  function wand(d, W, H, sx, sy, tol, contig) {
    const n = W * H, m = new Uint8Array(n), i0 = (sy * W + sx) * 4;
    const tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2], thr = Math.max(0, tol) * 2.55, thr2 = thr * thr * 3;
    const ok = k => {
      const i = k * 4; if (d[i + 3] < 8) return false;
      const dr = d[i] - tr, dg = d[i + 1] - tg, db = d[i + 2] - tb;
      return dr * dr + dg * dg + db * db <= thr2;
    };
    if (!contig) { for (let k = 0; k < n; k++) if (ok(k)) m[k] = 255; return m; }
    const stack = new Int32Array(n + 8); let sp = 0;
    stack[sp++] = sy * W + sx; m[sy * W + sx] = 255;
    while (sp) {
      const q = stack[--sp], x = q % W, y = (q / W) | 0;
      if (x > 0 && !m[q - 1] && ok(q - 1)) { m[q - 1] = 255; stack[sp++] = q - 1; }
      if (x < W - 1 && !m[q + 1] && ok(q + 1)) { m[q + 1] = 255; stack[sp++] = q + 1; }
      if (y > 0 && !m[q - W] && ok(q - W)) { m[q - W] = 255; stack[sp++] = q - W; }
      if (y < H - 1 && !m[q + W] && ok(q + W)) { m[q + W] = 255; stack[sp++] = q + W; }
    }
    return m;
  }

  /* ---------- ขยาย/หดมาสก์ (n>0 ขยาย, n<0 หด) ---------- */
  function growMask(m, W, H, n) {
    n = Math.round(n || 0); if (!n) return m;
    const grow = n > 0; let a = new Uint8Array(m), b = new Uint8Array(m.length);
    for (let it = 0; it < Math.abs(n); it++) {
      const diag = it % 2 === 1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const k = y * W + x; let v = a[k];
        const t = (xx, yy) => { if (xx < 0 || yy < 0 || xx >= W || yy >= H) return grow ? 0 : 255; return a[yy * W + xx]; };
        if (grow) {
          v = Math.max(v, t(x - 1, y), t(x + 1, y), t(x, y - 1), t(x, y + 1));
          if (diag) v = Math.max(v, t(x - 1, y - 1), t(x + 1, y - 1), t(x - 1, y + 1), t(x + 1, y + 1));
        } else {
          v = Math.min(v, t(x - 1, y), t(x + 1, y), t(x, y - 1), t(x, y + 1));
          if (diag) v = Math.min(v, t(x - 1, y - 1), t(x + 1, y - 1), t(x - 1, y + 1), t(x + 1, y + 1));
        }
        b[k] = v;
      }
      const t = a; a = b; b = t;
    }
    return a;
  }

  /* ---------- เบลอกล่อง (ใช้ซ้ำ) ---------- */
  /** เบลอ Float32Array 1 ช่อง ในที่เดิม 3 รอบ (ใกล้เคียง Gaussian) ใช้ tmp เป็นที่พัก */
  function boxBlurF(a, W, H, r, tmp, passes) {
    r = Math.max(1, Math.round(r)); passes = passes || 3;
    const w = 2 * r + 1;
    for (let p = 0; p < passes; p++) {
      for (let y = 0; y < H; y++) { // แนวนอน a -> tmp
        const o = y * W; let s = 0;
        for (let k = -r; k <= r; k++) s += a[o + Math.min(W - 1, Math.max(0, k))];
        for (let x = 0; x < W; x++) {
          tmp[o + x] = s / w;
          s += a[o + Math.min(W - 1, x + r + 1)] - a[o + Math.max(0, x - r)];
        }
      }
      for (let x = 0; x < W; x++) { // แนวตั้ง tmp -> a
        let s = 0;
        for (let k = -r; k <= r; k++) s += tmp[Math.min(H - 1, Math.max(0, k)) * W + x];
        for (let y = 0; y < H; y++) {
          a[y * W + x] = s / w;
          s += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x];
        }
      }
    }
  }
  function featherMask(m, W, H, r) {
    if (!(r > 0)) return m;
    const a = new Float32Array(m.length), tmp = new Float32Array(m.length);
    for (let i = 0; i < m.length; i++) a[i] = m[i];
    boxBlurF(a, W, H, Math.max(1, r / 1.5), tmp, 3);
    const o = new Uint8Array(m.length); for (let i = 0; i < o.length; i++) o[i] = Math.round(a[i]);
    return o;
  }
  /** ลบพิกเซลตามมาสก์: inside=true ลบด้านใน, false ลบด้านนอก (ปรับ alpha ตามค่ามาสก์ จึงนุ่มเมื่อเกลี่ยขอบ) */
  function eraseByMask(d, m, inside) {
    for (let k = 0; k < m.length; k++) {
      const a = m[k] / 255, f = inside ? 1 - a : a;
      if (f < 1) d[k * 4 + 3] = Math.round(d[k * 4 + 3] * f);
    }
    return d;
  }
  function mixMask(out, base, sel) {
    for (let k = 0; k < sel.length; k++) {
      const m = sel[k] / 255; if (m >= 1) continue;
      const i = k * 4;
      for (let c = 0; c < 4; c++) out[i + c] = Math.round(base[i + c] + (out[i + c] - base[i + c]) * m);
    }
    return out;
  }

  /* ---------- วาดพื้นที่เลือก (เส้นประ + สีฟ้าจาง) ---------- */
  function selectionOverlay(m, W, H, out) {
    const t = Math.max(1, Math.round(Math.max(W, H) / 700)), sel = k => m[k] > 127;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = y * W + x; if (!sel(k)) continue;
      const i = k * 4;
      const edge = x < t || y < t || x >= W - t || y >= H - t || !sel(k - t) || !sel(k + t) || !sel(k - t * W) || !sel(k + t * W);
      if (edge) { const v = ((x + y) >> 3) & 1 ? 255 : 0; out[i] = out[i + 1] = out[i + 2] = v; out[i + 3] = 255; }
      else { out[i] = 0; out[i + 1] = 136; out[i + 2] = 255; out[i + 3] = 64; }
    }
    return out;
  }

  /* ---------- เกลี่ยขอบให้นุ่ม (เบลอเฉพาะช่องโปร่งใส) ---------- */
  function softenEdges(d, W, H, r) {
    const n = W * H, out = new Uint8ClampedArray(d), A = new Float32Array(n), tmp = new Float32Array(n);
    for (let k = 0; k < n; k++) A[k] = d[k * 4 + 3];
    boxBlurF(A, W, H, Math.max(1, r / 2), tmp, 3);
    const P = [0, 1, 2].map(() => new Float32Array(n));
    for (let k = 0; k < n; k++) { const a = d[k * 4 + 3] / 255; for (let c = 0; c < 3; c++) P[c][k] = d[k * 4 + c] * a; }
    P.forEach(p => boxBlurF(p, W, H, Math.max(1, r / 2), tmp, 3));
    for (let k = 0; k < n; k++) {
      const i = k * 4, a = A[k];
      if (d[i + 3] === 255 && a > 254.5) continue; // เนื้อในไม่เปลี่ยน
      out[i + 3] = Math.round(a);
      if (a > 0.5) for (let c = 0; c < 3; c++) out[i + c] = Math.min(255, Math.round(P[c][k] / (a / 255)));
    }
    return out;
  }

  /* ---------- เบลอภาพ RGBA (ถ่วงน้ำหนักด้วย alpha กันขอบเป็นสีดำ) ---------- */
  function blurRGBA(d, W, H, r) {
    if (!(r > 0)) return d;
    const n = W * H, out = new Uint8ClampedArray(d.length), A = new Float32Array(n), tmp = new Float32Array(n), C = new Float32Array(n);
    for (let k = 0; k < n; k++) A[k] = d[k * 4 + 3];
    boxBlurF(A, W, H, r, tmp, 3);
    for (let c = 0; c < 3; c++) {
      for (let k = 0; k < n; k++) C[k] = d[k * 4 + c] * d[k * 4 + 3] / 255;
      boxBlurF(C, W, H, r, tmp, 3);
      for (let k = 0; k < n; k++) out[k * 4 + c] = A[k] > 0.01 ? Math.min(255, C[k] * 255 / A[k]) : 0;
    }
    for (let k = 0; k < n; k++) out[k * 4 + 3] = A[k];
    return out;
  }
  /** Unsharp mask: amount ~0–2.5, radius พิกเซล */
  function sharpen(d, W, H, amount, radius) {
    if (!(amount > 0)) return d;
    const bl = blurRGBA(d, W, H, Math.max(1, radius || 1)), out = new Uint8ClampedArray(d);
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      for (let c = 0; c < 3; c++) out[i + c] = d[i + c] + (d[i + c] - bl[i + c]) * amount;
    }
    return out;
  }

  /* ---------- ปรับสว่าง/คอนทราสต์/อิ่มตัว/เฉดสี ---------- */
  function adjust(d, v) {
    const br = (v.br || 0) * 2.55, c = (v.ct || 0) * 2.55, cf = (259 * (c + 255)) / (255 * (259 - c));
    const sat = 1 + (v.sat || 0) / 100, hue = (v.hue || 0) / 360, useHS = !!(v.sat || v.hue);
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      let r = d[i], g = d[i + 1], b = d[i + 2];
      if (v.ct) { r = cf * (r - 128) + 128; g = cf * (g - 128) + 128; b = cf * (b - 128) + 128; }
      r += br; g += br; b += br;
      if (useHS) {
        r = Math.min(255, Math.max(0, r)) / 255; g = Math.min(255, Math.max(0, g)) / 255; b = Math.min(255, Math.max(0, b)) / 255;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dl = mx - mn;
        let h = 0, s = 0;
        if (dl) { s = dl / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / dl) % 6 : mx === g ? (b - r) / dl + 2 : (r - g) / dl + 4; h /= 6; }
        h = ((h + hue) % 1 + 1) % 1; s = Math.min(1, Math.max(0, s * sat));
        const cc = (1 - Math.abs(2 * l - 1)) * s, hp = h * 6, x = cc * (1 - Math.abs(hp % 2 - 1)), m = l - cc / 2;
        const rgb = hp < 1 ? [cc, x, 0] : hp < 2 ? [x, cc, 0] : hp < 3 ? [0, cc, x] : hp < 4 ? [0, x, cc] : hp < 5 ? [x, 0, cc] : [cc, 0, x];
        r = (rgb[0] + m) * 255; g = (rgb[1] + m) * 255; b = (rgb[2] + m) * 255;
      }
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
    return d;
  }

  const FX = { emptyM, maskIsEmpty, invertMask, combineMask, maskBounds, contentBounds, wand, growMask, featherMask, eraseByMask, mixMask, selectionOverlay, softenEdges, blurRGBA, sharpen, adjust, boxBlurF };
  if (typeof module !== 'undefined' && module.exports) module.exports = FX; else G.FX = FX;
})(typeof window !== 'undefined' ? window : globalThis);
