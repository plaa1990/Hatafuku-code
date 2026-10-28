/* studio-ext.js — ฟีเจอร์เสริมสตูดิโอ v11 (ครึ่งแรก)
   ลบพื้นหลัง · นำเข้า/ส่งออก/สำรอง · แก้ไขภาพ/ครอป/กำหนดขนาดผืนผ้า · จัดกลุ่มเลเยอร์ · ประวัติเวอร์ชัน
   โหลดหลังสคริปต์หลักใน studio.html จึงใช้ตัวแปรร่วม (LY, W, H, cv, ...) ได้โดยตรง */
(() => {
  'use strict';
  const S = { bgm: 'wand', mode: 'rep', sel: null, oc: null, drag: null, crop: null, aj: null, ajBusy: false, lastAuto: {}, vbusy: false };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const so = $('so'), sg = so.getContext('2d');
  const kpx = () => W / st.offsetWidth / V.s; // พิกเซลผืนผ้าต่อพิกเซลหน้าจอ
  const okLayer = () => { const l = LY[act]; if (!l || !l.v || l.lk) { toast('ชั้นถูกซ่อนหรือล็อกอยู่'); return false; } return true; };
  const tol = () => +$('bgt').value, feaV = () => +$('bgf').value, groV = () => +$('bgg').value;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const pickFile = (accept, cb, multiple) => { const f = document.createElement('input'); f.type = 'file'; f.accept = accept; if (multiple) f.multiple = true; f.onchange = () => f.files.length && cb(multiple ? [...f.files] : f.files[0]); f.click(); };
  const blobToURL = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
  const toBlob = (c, type, q) => new Promise(r => c.toBlob(r, type, q));
  const docName = () => { const m = DX.find(d => d.id == CUR); return ((m && m.n) || 'drawing').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'drawing'; };
  const stamp = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()); };

  /* =========================================================
     พื้นที่เลือก (บ่วง / กรอบ) และการลบ
     ========================================================= */
  function drawSel() {
    if (!S.sel) { S.oc = null; sg.clearRect(0, 0, so.width, so.height); $('sbar').hidden = true; return; }
    const oc = document.createElement('canvas'); oc.width = W; oc.height = H;
    const im = oc.getContext('2d').createImageData(W, H); FX.selectionOverlay(S.sel, W, H, im.data); oc.getContext('2d').putImageData(im, 0, 0);
    S.oc = oc; sg.clearRect(0, 0, so.width, so.height); sg.drawImage(oc, 0, 0); $('sbar').hidden = false;
  }
  function setSel(m, mode) {
    S.sel = FX.combineMask(S.sel, m, mode || S.mode);
    if (FX.maskIsEmpty(S.sel)) S.sel = null;
    drawSel();
  }
  function clearSel() { S.sel = null; drawSel(); }
  function polyMask(d) {
    const c = mk(), g = c.getContext('2d'); g.fillStyle = '#000'; g.beginPath();
    if (d.t === 'lasso') d.pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y));
    else g.rect(Math.min(d.a.x, d.b.x), Math.min(d.a.y, d.b.y), Math.abs(d.b.x - d.a.x), Math.abs(d.b.y - d.a.y));
    g.closePath(); g.fill();
    const px = g.getImageData(0, 0, W, H).data, m = new Uint8Array(W * H);
    for (let i = 0; i < m.length; i++) m[i] = px[i * 4 + 3];
    return m;
  }
  function dragPreview() {
    sg.clearRect(0, 0, so.width, so.height); if (S.oc) sg.drawImage(S.oc, 0, 0);
    const d = S.drag; if (!d) return; const lw = 2 * kpx(); sg.lineJoin = 'round';
    const path = () => { sg.beginPath(); if (d.t === 'lasso') d.pts.forEach((p, i) => i ? sg.lineTo(p.x, p.y) : sg.moveTo(p.x, p.y)); else sg.rect(d.a.x, d.a.y, d.b.x - d.a.x, d.b.y - d.a.y); };
    path(); sg.lineWidth = lw * 1.8; sg.strokeStyle = '#000'; sg.setLineDash([]); sg.stroke();
    path(); sg.lineWidth = lw; sg.strokeStyle = '#fff'; sg.setLineDash([6 * lw, 6 * lw]); sg.stroke(); sg.setLineDash([]);
  }
  function eraseMasked(mask, inside) {
    if (!okLayer()) return false;
    if (FL) selCommit();
    const g = gc(), im = g.getImageData(0, 0, W, H);
    snap();
    let m = FX.growMask(mask, W, H, inside ? groV() : -groV());
    const f = feaV() > 0 ? FX.featherMask(m, W, H, feaV()) : m;
    FX.eraseByMask(im.data, f, inside);
    g.putImageData(im, 0, 0); render(); saveSoon(); return true;
  }
  function wandDo(e, contig) {
    if (!okLayer()) return;
    if (FL) selCommit();
    const p = pt(e), x = p.x | 0, y = p.y | 0; if (x < 0 || y < 0 || x >= W || y >= H) return;
    const im = gc().getImageData(0, 0, W, H);
    if (im.data[(y * W + x) * 4 + 3] < 8) return toast('จุดนี้โปร่งใสอยู่แล้ว แตะที่ส่วนที่ต้องการลบ');
    const m = FX.wand(im.data, W, H, x, y, tol(), contig);
    let n = 0; for (let i = 0; i < m.length; i++) if (m[i]) n++;
    if (eraseMasked(m, true)) toast('ลบแล้ว ' + Math.max(1, Math.round(n / m.length * 100)) + '% ของภาพ — ↶ เพื่อย้อนกลับ');
  }
  function delSel(inside) {
    if (!S.sel) return toast('ยังไม่ได้เลือกพื้นที่ (ใช้บ่วงเลือกหรือกรอบเลือก)');
    if (eraseMasked(S.sel, inside)) { clearSel(); toast(inside ? 'ลบด้านในแล้ว' : 'ลบด้านนอกแล้ว'); }
  }

  /* ---------- ตัด คัดลอก วาง ---------- */
  function region() {
    const l = LY[act]; if (!l) return null;
    const bb = S.sel ? FX.maskBounds(S.sel, W, H) : { x: 0, y: 0, w: W, h: H }; if (!bb) return null;
    const c = document.createElement('canvas'); c.width = bb.w; c.height = bb.h; const g = c.getContext('2d');
    g.drawImage(l.c, bb.x, bb.y, bb.w, bb.h, 0, 0, bb.w, bb.h);
    if (S.sel) { const im = g.getImageData(0, 0, bb.w, bb.h), d = im.data; for (let y = 0; y < bb.h; y++) for (let x = 0; x < bb.w; x++) { const m = S.sel[(bb.y + y) * W + bb.x + x]; if (m < 255) d[(y * bb.w + x) * 4 + 3] *= m / 255; } g.putImageData(im, 0, 0); }
    return c;
  }
  async function copySel(quiet) {
    if (FL) selCommit();
    const c = region(); if (!c) return false; CB = c;
    try { if (navigator.clipboard && window.ClipboardItem) await navigator.clipboard.write([new ClipboardItem({ 'image/png': toBlob(c, 'image/png') })]); } catch (e) { /* ไม่มีสิทธิ์คลิปบอร์ดระบบ ใช้คลิปบอร์ดในแอปแทน */ }
    if (!quiet) toast(S.sel ? 'คัดลอกพื้นที่เลือกแล้ว' : 'คัดลอกทั้งชั้นแล้ว'); return true;
  }
  async function cutSel() {
    if (!okLayer()) return;
    if (!(await copySel(true))) return;
    if (FL) selCommit();
    snap(); const g = gc();
    if (S.sel) { const im = g.getImageData(0, 0, W, H); FX.eraseByMask(im.data, S.sel, true); g.putImageData(im, 0, 0); clearSel(); } else g.clearRect(0, 0, W, H);
    render(); saveSoon(); toast('ตัดแล้ว (วางได้ที่ 📋)');
  }
  function viewCenter() { const r = vp.getBoundingClientRect(), p = pt({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }); return { x: Math.min(W, Math.max(0, p.x)), y: Math.min(H, Math.max(0, p.y)) }; }
  function floatImage(c, name, x, y) {
    if (FL) selCommit();
    if (LY.length < MAXL) { LY.push({ c: mk(), v: true, o: 1, n: name }); act = LY.length - 1; }
    else if (!okLayer()) return;
    list(); snap();
    FL = { c, cx: x, cy: y, w: c.width, h: c.height, sc: 1, rot: 0, fx: 1 };
    $('fs').value = 100; $('fr').value = 0; $('fb').hidden = false; mkS(); selB('sel'); render();
    toast('ลากเพื่อย้าย ปรับขนาด/หมุนที่แถบด้านล่าง แล้วกด ✓');
  }
  async function pasteSel() {
    let c = CB;
    if (!c) {
      try {
        const items = await navigator.clipboard.read();
        for (const it of items) { const t = it.types.find(x => x.startsWith('image/')); if (t) { c = await blobToCanvas(await it.getType(t)); break; } }
      } catch (e) { /* ignore */ }
    }
    if (!c) return toast('ยังไม่มีอะไรให้วาง — คัดลอกก่อน หรือคัดลอกรูปจากแอปอื่น');
    const p = viewCenter(); floatImage(c, 'วาง ' + (LY.length + 1), p.x, p.y);
  }

  /* ---------- นำเข้ารูป ---------- */
  async function loadBitmap(file) {
    try { return await createImageBitmap(file); } catch (e) {
      return await new Promise((res, rej) => { const u = URL.createObjectURL(file), i = new Image(); i.onload = () => { res(i); }; i.onerror = () => rej(new Error('อ่านรูปไม่ได้')); i.src = u; });
    }
  }
  const imgSize = i => [i.width || i.naturalWidth, i.height || i.naturalHeight];
  async function blobToCanvas(b) { const bm = await loadBitmap(b), [w, h] = imgSize(bm), c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(bm, 0, 0); return c; }
  async function importToLayer(file) {
    try {
      const bm = await loadBitmap(file), [bw, bh] = imgSize(bm), k = Math.min(1, W * .9 / bw, H * .9 / bh), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(bw * k)); c.height = Math.max(1, Math.round(bh * k));
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(bm, 0, 0, c.width, c.height);
      floatImage(c, 'รูปนำเข้า', W / 2, H / 2);
    } catch (e) { toast('เปิดรูปนี้ไม่ได้ (ลอง PNG / JPG / WEBP)'); }
  }
  async function importAsDoc(file) {
    try {
      const bm = await loadBitmap(file); let [bw, bh] = imgSize(bm);
      const k = Math.min(1, 4096 / bw, 4096 / bh, Math.sqrt(6e6 / (bw * bh))); const w = Math.max(64, Math.round(bw * k)), h = Math.max(64, Math.round(bh * k));
      await newDoc(w, h, 't');
      const g = LY[0].c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(bm, 0, 0, w, h);
      const m = DX.find(d => d.id == CUR); if (m) { m.n = (file.name || 'รูป').replace(/\.[^.]+$/, '').slice(0, 40); await idb('put', 'idx', DX); }
      render(); saveSoon(); selB(S.bgm); mkS($('sheet3')); toast('เปิดรูปเป็นผืนผ้าใหม่แล้ว — แตะพื้นหลังเพื่อลบได้เลย');
    } catch (e) { toast('เปิดรูปนี้ไม่ได้ (ลอง PNG / JPG / WEBP)'); }
  }
  const isImg = f => f && (/^image\//.test(f.type) || /\.(png|jpe?g|webp|gif|bmp|avif|heic)$/i.test(f.name || ''));
  addEventListener('paste', e => {
    if (/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) return;
    const it = [...(e.clipboardData ? e.clipboardData.items : [])].find(i => i.type.startsWith('image/'));
    if (it) { e.preventDefault(); const p = viewCenter(); blobToCanvas(it.getAsFile()).then(c => floatImage(c, 'วาง ' + (LY.length + 1), p.x, p.y)); }
    else if (CB) { e.preventDefault(); pasteSel(); }
  });
  vp.addEventListener('dragover', e => { if ([...(e.dataTransfer ? e.dataTransfer.types : [])].includes('Files')) e.preventDefault(); });
  vp.addEventListener('drop', e => { const f = e.dataTransfer && e.dataTransfer.files[0]; if (!f) return; e.preventDefault(); if (isImg(f)) importToLayer(f); else if (/\.json$/i.test(f.name)) importProject(f); });

  /* =========================================================
     เครื่องมือบนผืนผ้า: ไม้กายสิทธิ์ / บ่วง / กรอบ / ครอป
     ========================================================= */
  XT.down = e => {
    const k = cur;
    if (k === 'wand' || k === 'cwand') return wandDo(e, k === 'wand');
    if (k === 'lasso' || k === 'lrect') { const p = pt(e); S.drag = { t: k, pts: [p], a: p, b: p, sx: e.clientX, sy: e.clientY, mv: 0 }; return; }
    if (k === 'crop') cropDown(e);
  };
  XT.move = e => {
    if (cur === 'crop') return cropMove(e);
    const d = S.drag; if (!d) return; const p = pt(e);
    d.mv = Math.max(d.mv, Math.hypot(e.clientX - d.sx, e.clientY - d.sy));
    if (d.t === 'lasso') { const l = d.pts[d.pts.length - 1]; if (Math.hypot(p.x - l.x, p.y - l.y) >= 1.5 * kpx()) d.pts.push(p); } else d.b = p;
    dragPreview();
  };
  XT.up = e => {
    if (cur === 'crop') return cropUp();
    const d = S.drag; S.drag = null; if (!d) return;
    if (e.type === 'pointercancel') { dragPreview(); return; }
    if (d.mv < 8 || (d.t === 'lasso' && d.pts.length < 3)) { clearSel(); return toast('ยกเลิกการเลือกแล้ว'); }
    if (d.t === 'lrect') { d.b = pt(e); }
    setSel(polyMask(d)); if (S.sel) toast('เลือกแล้ว — กด "ลบด้านใน" หรือ "ลบด้านนอก"');
  };
  XT.cancel = () => { if (S.drag) { S.drag = null; dragPreview(); } if (S.crop) S.crop.mode = null; };
  XT.busy = () => !!S.aj;

  const HINT = {
    wand: 'แตะที่พื้นหลัง (หรือสีที่ต้องการลบ) จะลบเฉพาะส่วนที่ติดกัน เพิ่มความไวสีถ้ายังเหลือขอบ',
    cwand: 'แตะสีที่ต้องการ จะลบสีใกล้เคียงนั้นทั้งภาพ รวมส่วนที่ไม่ติดกัน (เช่น ช่องว่างระหว่างนิ้ว)',
    lasso: 'ลากวงรอบบริเวณที่ต้องการ ปล่อยแล้วกด "ลบด้านใน" หรือ "ลบด้านนอก" แตะเฉยๆ เพื่อยกเลิกเลือก',
    lrect: 'ลากกรอบสี่เหลี่ยม ปล่อยแล้วกด "ลบด้านใน" หรือ "ลบด้านนอก" แตะเฉยๆ เพื่อยกเลิกเลือก'
  };
  const showHint = () => $('bgh').textContent = HINT[S.bgm];
  XT.onTool = k => {
    $('crb').hidden = k !== 'crop'; $('cr').hidden = k !== 'crop';
    if (k !== 'crop') S.crop = null;
    if (XT.tools.includes(k) && k !== 'crop') {
      S.bgm = k; document.querySelectorAll('#bgm button').forEach(b => b.classList.toggle('on', b.dataset.k === k)); showHint();
    }
  };
  XT.resize = () => { so.width = W; so.height = H; S.sel = null; S.oc = null; S.drag = null; $('sbar').hidden = true; if (S.crop) { S.crop = null; $('crb').hidden = true; $('cr').hidden = true; if (cur === 'crop') selB(lastB); } };
  XT.reset = () => { if (S.aj) { S.aj = null; $('adj').hidden = true; } XT.resize(); $('dbt').checked = BG === 't'; };

  /* ---------- แผงลบพื้นหลัง ---------- */
  $('tbg').onclick = () => { const open = !$('sheet3').hidden && XT.tools.includes(cur) && cur !== 'crop'; if (open) { mkS(); return; } mkS($('sheet3')); selB(S.bgm); $('dbt').checked = BG === 't'; };
  $('c3').onclick = () => mkS();
  document.querySelectorAll('#bgm button').forEach(b => b.onclick = () => selB(b.dataset.k));
  document.querySelectorAll('#selm button').forEach(b => b.onclick = () => { S.mode = b.dataset.m; document.querySelectorAll('#selm button').forEach(x => x.classList.toggle('on', x === b)); });
  [['bgt', 'bgto'], ['bgf', 'bgfo'], ['bgg', 'bggo']].forEach(([a, o]) => { const sync = () => $(o).textContent = $(a).value; $(a).oninput = sync; sync(); });
  $('bsi').onclick = () => delSel(true); $('bso').onclick = () => delSel(false); $('bsx').onclick = () => { clearSel(); };
  $('sdi').onclick = () => delSel(true); $('sdo').onclick = () => delSel(false); $('sxx').onclick = clearSel;
  $('sin').onclick = () => { if (S.sel) { S.sel = FX.invertMask(S.sel); drawSel(); } };
  $('sct').onclick = cutSel; $('scp').onclick = () => copySel();
  $('bsf').onclick = () => {
    if (!okLayer()) return; if (FL) selCommit();
    const g = gc(), im = g.getImageData(0, 0, W, H); snap();
    g.putImageData(new ImageData(FX.softenEdges(im.data, W, H, feaV() || 4), W, H), 0, 0); render(); saveSoon(); toast('เกลี่ยขอบให้นุ่มแล้ว (ปรับระดับด้วย "เกลี่ยขอบ")');
  };
  document.querySelectorAll('#pvb button').forEach(b => b.onclick = () => {
    PV = b.dataset.p; stBG(); render();
    document.querySelectorAll('#pvb button').forEach(x => x.classList.toggle('on', x === b));
    if (PV !== 'a' && BG !== 't') toast('ดูตัวอย่างเท่านั้น — ถ้าจะส่งออกพื้นโปร่งใส ให้ติ๊ก "ผืนผ้านี้พื้นโปร่งใส"');
  });
  $('dbt').onchange = async () => {
    BG = $('dbt').checked ? 't' : 'w'; const m = DX.find(d => d.id == CUR); if (m) { m.bg = BG; await idb('put', 'idx', DX); }
    stBG(); render(); saveSoon();
  };

  /* ---------- แผงแก้ไขภาพ ---------- */
  $('ted').onclick = () => mkS($('sheet4').hidden ? $('sheet4') : null);
  $('c4').onclick = () => mkS();
  $('ecut').onclick = cutSel; $('ecp').onclick = () => copySel(); $('epa').onclick = pasteSel;
  function flipLayer(horiz) {
    const all = $('efa').checked, tg2 = all ? LY.map((_, i) => i).filter(i => !LY[i].lk) : [act];
    if (!all && !okLayer()) return; if (FL) selCommit();
    if (all) snapAll(); else snap();
    tg2.forEach(i => { const l = LY[i], t = mk(), g = t.getContext('2d'); g.save(); if (horiz) { g.translate(W, 0); g.scale(-1, 1); } else { g.translate(0, H); g.scale(1, -1); } g.drawImage(l.c, 0, 0); g.restore(); const lg = l.c.getContext('2d'); lg.clearRect(0, 0, W, H); lg.drawImage(t, 0, 0); });
    clearSel(); render(); saveSoon(); toast(horiz ? 'พลิกซ้าย-ขวาแล้ว' : 'พลิกบน-ล่างแล้ว');
  }
  $('efh').onclick = () => flipLayer(true); $('efv').onclick = () => flipLayer(false);

  /* ---------- ปรับภาพ (เบลอ คมชัด สี สว่าง คอนทราสต์) ---------- */
  const AJ = [['ab', ''], ['ac', ''], ['as', ''], ['ahu', '°'], ['abl', ' px'], ['ash', '']];
  const ajVals = () => ({ br: +$('ab').value, ct: +$('ac').value, sat: +$('as').value, hue: +$('ahu').value, blur: +$('abl').value, sharp: +$('ash').value });
  function ajLabels() { AJ.forEach(([id, u]) => { $(id).parentNode.querySelector('output').textContent = $(id).value + u; }); }
  function ajRender() {
    if (!S.aj || S.ajBusy) return; S.ajBusy = true;
    requestAnimationFrame(() => {
      S.ajBusy = false; if (!S.aj) return;
      const v = ajVals(), base = S.aj.base.data; let out = new Uint8ClampedArray(base);
      if (v.br || v.ct || v.sat || v.hue) out = FX.adjust(out, v);
      if (v.blur > 0) out = FX.blurRGBA(out, W, H, v.blur);
      if (v.sharp > 0) out = FX.sharpen(out, W, H, v.sharp / 40, 1.3);
      if (S.sel) FX.mixMask(out, base, S.sel);
      gc().putImageData(new ImageData(out, W, H), 0, 0); render();
      if (S.aj.dirty) { S.aj.dirty = false; ajRender(); }
    });
    if (S.aj) S.aj.dirty = false;
  }
  function ajChanged() { ajLabels(); if (S.aj && S.ajBusy) S.aj.dirty = true; ajRender(); }
  AJ.forEach(([id]) => { $(id).oninput = ajChanged; });
  function ajOpen() {
    if (!okLayer()) return; if (FL) selCommit();
    mkS(); S.aj = { base: gc().getImageData(0, 0, W, H) }; snap();
    AJ.forEach(([id]) => $(id).value = 0); ajLabels(); $('adn').textContent = S.sel ? 'ใช้เฉพาะพื้นที่เลือก' : 'ใช้กับทั้งชั้นนี้'; $('adj').hidden = false;
  }
  function ajClose(ok) {
    if (!S.aj) return;
    if (ok) { const v = ajVals(); if (!(v.br || v.ct || v.sat || v.hue || v.blur || v.sharp)) ok = false; }
    if (!ok) { gc().putImageData(S.aj.base, 0, 0); ud.pop(); render(); } else saveSoon();
    S.aj = null; $('adj').hidden = true;
  }
  $('eadj').onclick = ajOpen; $('aok').onclick = () => ajClose(true); $('axx').onclick = () => ajClose(false);
  $('arz').onclick = () => { AJ.forEach(([id]) => $(id).value = 0); ajChanged(); };

  /* ---------- ครอป ---------- */
  const CH = 26; // รัศมีจับมุม (พิกเซลหน้าจอ)
  function crShow() {
    const c = S.crop, el = $('cr'); if (!c) { el.hidden = true; return; }
    el.hidden = false; el.style.left = c.x / W * 100 + '%'; el.style.top = c.y / H * 100 + '%'; el.style.width = c.w / W * 100 + '%'; el.style.height = c.h / H * 100 + '%';
    if (!el.firstChild) el.innerHTML = '<i style="left:0;top:0"></i><i style="left:100%;top:0"></i><i style="left:0;top:100%"></i><i style="left:100%;top:100%"></i><i style="left:50%;top:0"></i><i style="left:50%;top:100%"></i><i style="left:0;top:50%"></i><i style="left:100%;top:50%"></i>';
  }
  function cropBegin(rect) {
    S.crop = { x: 0, y: 0, w: W, h: H, ratio: 0, mode: null }; if (rect) Object.assign(S.crop, rect);
    document.querySelectorAll('#crb [data-r]').forEach(b => b.classList.toggle('on', +b.dataset.r === 0));
    mkS(); selB('crop'); crShow(); toast('ลากมุม/ขอบเพื่อปรับกรอบ ลากด้านในเพื่อย้าย แล้วกด ✓ ครอป');
  }
  function cropHit(p) {
    const c = S.crop, t = CH * kpx(), nx = (a, b) => Math.abs(a - b) <= t;
    const l = nx(p.x, c.x), r = nx(p.x, c.x + c.w), tp = nx(p.y, c.y), b = nx(p.y, c.y + c.h);
    if (l && tp) return 'tl'; if (r && tp) return 'tr'; if (l && b) return 'bl'; if (r && b) return 'br';
    const inX = p.x > c.x - t && p.x < c.x + c.w + t, inY = p.y > c.y - t && p.y < c.y + c.h + t;
    if (tp && inX) return 't'; if (b && inX) return 'b'; if (l && inY) return 'l'; if (r && inY) return 'r';
    if (p.x > c.x && p.x < c.x + c.w && p.y > c.y && p.y < c.y + c.h) return 'mv';
    return 'new';
  }
  function cropDown(e) { if (!S.crop) return; const p = pt(e), m = cropHit(p); S.crop.mode = m; S.crop.p0 = p; S.crop.r0 = { x: S.crop.x, y: S.crop.y, w: S.crop.w, h: S.crop.h }; }
  function cropMove(e) {
    const c = S.crop; if (!c || !c.mode) return; const p = pt(e), r0 = c.r0, dx = p.x - c.p0.x, dy = p.y - c.p0.y, m = c.mode, MIN = 16;
    let x0 = r0.x, y0 = r0.y, x1 = r0.x + r0.w, y1 = r0.y + r0.h;
    const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    if (m === 'new') { x0 = cl(Math.min(c.p0.x, p.x), 0, W); x1 = cl(Math.max(c.p0.x, p.x), 0, W); y0 = cl(Math.min(c.p0.y, p.y), 0, H); y1 = cl(Math.max(c.p0.y, p.y), 0, H); }
    else if (m === 'mv') { const w = r0.w, h = r0.h; x0 = cl(r0.x + dx, 0, W - w); y0 = cl(r0.y + dy, 0, H - h); x1 = x0 + w; y1 = y0 + h; }
    else {
      if (m.includes('l')) x0 = cl(r0.x + dx, 0, x1 - MIN); if (m.includes('r')) x1 = cl(r0.x + r0.w + dx, x0 + MIN, W);
      if (m.includes('t')) y0 = cl(r0.y + dy, 0, y1 - MIN); if (m.includes('b')) y1 = cl(r0.y + r0.h + dy, y0 + MIN, H);
    }
    if (c.ratio > 0 && m !== 'mv') {
      let w = x1 - x0, h = y1 - y0; const horiz = m === 'new' || m.includes('l') || m.includes('r');
      if (horiz) h = w / c.ratio; else w = h * c.ratio;
      const fitK = Math.min(1, W / w, H / h); w *= fitK; h *= fitK;
      if (m === 'new') { const sx = p.x < c.p0.x ? -1 : 1, sy = p.y < c.p0.y ? -1 : 1; x0 = sx > 0 ? c.p0.x : c.p0.x - w; y0 = sy > 0 ? c.p0.y : c.p0.y - h; }
      else { if (m.includes('l')) x0 = x1 - w; else if (m.includes('r')) x1 = x0 + w; else { const cxm = (x0 + x1) / 2; x0 = cxm - w / 2; } if (m.includes('t')) y0 = y1 - h; else if (m.includes('b')) y1 = y0 + h; else if (horiz) { const cym = (y0 + y1) / 2; y0 = cym - h / 2; } }
      if (m !== 'new' && !m.includes('l') && !m.includes('r')) { x1 = x0 + w; }
      if (m !== 'new' && !m.includes('t') && !m.includes('b')) { y1 = y0 + h; }
      if (m === 'new') { x1 = x0 + w; y1 = y0 + h; }
      x0 = cl(x0, 0, W - w); y0 = cl(y0, 0, H - h); x1 = x0 + w; y1 = y0 + h;
    }
    c.x = Math.round(x0); c.y = Math.round(y0); c.w = Math.max(1, Math.round(x1 - x0)); c.h = Math.max(1, Math.round(y1 - y0)); crShow();
  }
  function cropUp() { const c = S.crop; if (!c) return; if (c.w < 16 || c.h < 16) { c.x = 0; c.y = 0; c.w = W; c.h = H; crShow(); } c.mode = null; }
  document.querySelectorAll('#crb [data-r]').forEach(b => b.onclick = () => {
    const c = S.crop; if (!c) return; c.ratio = +b.dataset.r; document.querySelectorAll('#crb [data-r]').forEach(x => x.classList.toggle('on', x === b));
    if (c.ratio > 0) { const cxm = c.x + c.w / 2, cym = c.y + c.h / 2; let w = Math.min(c.w, c.h * c.ratio), h = w / c.ratio; w = Math.round(w); h = Math.round(h); c.w = w; c.h = h; c.x = Math.round(Math.max(0, Math.min(W - w, cxm - w / 2))); c.y = Math.round(Math.max(0, Math.min(H - h, cym - h / 2))); }
    crShow();
  });
  function cropApply() {
    const c = S.crop; if (!c) return; const { x, y, w, h } = c;
    if (w < 16 || h < 16) return toast('กรอบเล็กเกินไป');
    if (FL) selCommit();
    if (w === W && h === H) { selB(lastB); return toast('กรอบเท่ากับผืนผ้าเดิม ไม่มีอะไรเปลี่ยน'); }
    snapAll();
    const nl = LY.map(l => { const n = document.createElement('canvas'); n.width = w; n.height = h; n.getContext('2d').drawImage(l.c, -x, -y); return n; });
    W = w; H = h; cv.width = W; cv.height = H; tc = tg = null;
    LY.forEach((l, i) => l.c = nl[i]);
    const m = DX.find(d => d.id == CUR); if (m) { m.w = W; m.h = H; }
    XT.resize(); fit(); render(); list(); saveSoon(); selB(lastB); toast('ครอปเหลือ ' + W + '×' + H + ' แล้ว — ↶ เพื่อย้อนกลับ');
  }
  $('cro').onclick = cropApply; $('crx').onclick = () => { S.crop = null; selB(lastB); };
  function trimBounds() {
    const c = document.createElement('canvas'); c.width = W; c.height = H; compose(c.getContext('2d'));
    const b = FX.contentBounds(c.getContext('2d').getImageData(0, 0, W, H).data, W, H, 8);
    if (!b) return toast('ไม่พบเนื้อหาที่ไม่โปร่งใส'); cropBegin(b);
  }
  $('ecr').onclick = () => cropBegin(); $('etr').onclick = trimBounds; $('crt').onclick = trimBounds;

  /* =========================================================
     จัดกลุ่มเลเยอร์
     ========================================================= */
  XT.groupNew = () => {
    if (LY.length < 2) return toast('ต้องมีอย่างน้อย 2 ชั้นจึงจะจัดกลุ่มได้');
    const m = modal('<h2>จัดกลุ่มเลเยอร์</h2><input id="gnm" value="กลุ่ม ' + (GR.length + 1) + '" aria-label="ชื่อกลุ่ม" style="width:100%;background:var(--bg);color:var(--tx);border:1px solid var(--line);border-radius:10px;padding:8px;font:inherit;min-height:44px"><fieldset><legend>เลือกชั้นที่จะรวมเป็นกลุ่ม</legend>' +
      LY.map((l, i) => '<label><input type="checkbox" value="' + i + '"' + (i === act ? ' checked' : '') + '> ' + esc(l.n) + (l.g ? ' <small>(อยู่ในกลุ่มอื่น)</small>' : '') + '</label>').reverse().join('') + '</fieldset><small>กลุ่มซ่อน/แสดง ปรับความโปร่ง และพับเก็บได้ทั้งกลุ่ม ชั้นในกลุ่มจะผสมกันเองก่อนวางบนชั้นอื่น</small><p><button class="b" id="gok">สร้างกลุ่ม</button> <button class="b" id="gxx">ปิด (Esc)</button></p>');
    m.querySelector('#gxx').onclick = m.close;
    m.querySelector('#gok').onclick = () => {
      const sel = [...m.querySelectorAll('input[type=checkbox]:checked')].map(x => +x.value); if (!sel.length) return toast('เลือกอย่างน้อย 1 ชั้น');
      const id = 'g' + Date.now().toString(36), a0 = LY[act], top = Math.max(...sel), chosen = sel.map(i => LY[i]), rest = LY.filter((_, i) => !sel.includes(i));
      const pos = LY.slice(0, top).filter((_, i) => !sel.includes(i)).length;
      chosen.forEach(l => l.g = id); LY = [...rest.slice(0, pos), ...chosen, ...rest.slice(pos)]; act = LY.indexOf(a0);
      GR.push({ id, n: (m.querySelector('#gnm').value || '').trim().slice(0, 40) || 'กลุ่ม ' + (GR.length + 1), v: true, o: 1, x: false });
      ud = []; rd = []; m.close(); render(); list(); saveSoon(); toast('จัดกลุ่มแล้ว');
    };
  };
  XT.groupPick = i => {
    const l = LY[i];
    const m = modal('<h2>ชั้น "' + esc(l.n) + '"</h2><fieldset><legend>อยู่ในกลุ่ม</legend><label><input type="radio" name="gp" value="" ' + (l.g ? '' : 'checked') + '> ไม่อยู่ในกลุ่ม</label>' + GR.map(g => '<label><input type="radio" name="gp" value="' + g.id + '" ' + (l.g === g.id ? 'checked' : '') + '> ' + esc(g.n) + '</label>').join('') + '</fieldset><p><button class="b" id="gok">ตกลง</button> <button class="b" id="gxx">ปิด (Esc)</button></p>');
    m.querySelector('#gxx').onclick = m.close;
    m.querySelector('#gok').onclick = () => {
      const v = m.querySelector('input[name=gp]:checked').value, a0 = LY[act];
      if (!v) delete l.g; else if (l.g !== v) {
        l.g = v; LY.splice(i, 1); let top = -1; LY.forEach((x, k) => { if (x.g === v) top = k; });
        LY.splice(top + 1, 0, l); act = LY.indexOf(a0);
      }
      ud = []; rd = []; m.close(); render(); list(); saveSoon();
    };
  };
  $('agr').onclick = XT.groupNew;

  /* =========================================================
     ส่งออก แชร์ พิมพ์
     ========================================================= */
  const FMT = {
    png: { n: 'PNG (คมชัด รองรับโปร่งใส)', ext: 'png', mime: 'image/png' },
    jpg: { n: 'JPG (ไฟล์เล็ก พื้นขาว)', ext: 'jpg', mime: 'image/jpeg' },
    webp: { n: 'WEBP (ไฟล์เล็ก รองรับโปร่งใส)', ext: 'webp', mime: 'image/webp' },
    pdf: { n: 'PDF (1 หน้า)', ext: 'pdf', mime: 'application/pdf' },
    svg1: { n: 'SVG แบบฝังภาพ', ext: 'svg', mime: 'image/svg+xml' },
    svg2: { n: 'SVG แบบเวกเตอร์ (ประมาณจากภาพ)', ext: 'svg', mime: 'image/svg+xml' },
    gif: { n: 'GIF แอนิเมชัน (ไทม์แลปส์การวาด)', ext: 'gif', mime: 'image/gif' }
  };
  const OPT = (() => { try { return JSON.parse(localStorage.getItem('sh4xo')) || {}; } catch (e) { return {}; } })();
  const saveOpt = () => { try { localStorage.setItem('sh4xo', JSON.stringify(OPT)); } catch (e) { /* ignore */ } };
  XT.finishCanvas = c => { // ลายน้ำ: ใส่มุมขวาล่างเมื่อส่งออก
    let wm = ''; try { wm = localStorage.getItem('sh4wm') || ''; } catch (e) {}
    if (!wm) return c;
    const o = document.createElement('canvas'); o.width = c.width; o.height = c.height;
    const x = o.getContext('2d'); x.drawImage(c, 0, 0);
    const fs = Math.max(12, Math.round(c.width / 40)); x.font = fs + 'px Sarabun,"Noto Sans Thai",sans-serif';
    x.textAlign = 'right'; x.textBaseline = 'bottom'; x.lineWidth = Math.max(2, fs / 6);
    x.strokeStyle = 'rgba(0,0,0,.45)'; x.strokeText(wm, c.width - fs / 2, c.height - fs / 2);
    x.fillStyle = 'rgba(255,255,255,.85)'; x.fillText(wm, c.width - fs / 2, c.height - fs / 2);
    return o;
  };

  async function buildExport(fmt, o, prog) {
    if (FL) selCommit();
    o = Object.assign({ q: 92, page: 'img', colors: 8 }, o || {});
    const f = FMT[fmt];
    if (fmt === 'png') { const c = XT.finishCanvas(flat()); return await toBlob(c, 'image/png'); }
    if (fmt === 'jpg') { const c = XT.finishCanvas(flat(true)); return await toBlob(c, 'image/jpeg', o.q / 100); }
    if (fmt === 'webp') { const b = await toBlob(XT.finishCanvas(flat()), 'image/webp', o.q / 100); if (b && b.type !== 'image/webp') toast('เบราว์เซอร์นี้ยังเข้ารหัส WEBP ไม่ได้ จึงได้ไฟล์ PNG แทน'); return b; }
    if (fmt === 'pdf') { const jb = await toBlob(XT.finishCanvas(flat(true)), 'image/jpeg', .93), bytes = new Uint8Array(await jb.arrayBuffer()); return new Blob([IO.makePDF(bytes, W, H, o.page)], { type: f.mime }); }
    if (fmt === 'svg1') { const url = await blobToURL(await toBlob(XT.finishCanvas(flat()), 'image/png')); return new Blob([IO.svgEmbed(url, W, H)], { type: f.mime }); }
    if (fmt === 'svg2') {
      prog && prog('กำลังแปลงเป็นเวกเตอร์…'); await wait(30);
      const c = XT.finishCanvas(flat()), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      return new Blob([IO.traceSVG(d, c.width, c.height, { colors: +o.colors, maxSide: Math.min(900, Math.max(c.width, c.height)), bg: BG !== 't' || PV !== 'a' && BG !== 't' ? '#ffffff' : null })], { type: f.mime });
    }
    if (fmt === 'gif') {
      if (TL.length < 2) { toast('ยังมีภาพไทม์แลปส์ไม่พอ วาดต่ออีกนิด'); return null; }
      const n = Math.min(100, TL.length), pick = Array.from({ length: n }, (_, i) => TL[Math.round(i * (TL.length - 1) / Math.max(1, n - 1))]), frames = [];
      let gw = 0, gh = 0;
      for (let i = 0; i < pick.length; i++) {
        prog && prog('กำลังทำ GIF ' + Math.round(i / pick.length * 100) + '%'); await wait(0);
        const bm = await createImageBitmap(await (await fetch(pick[i])).blob());
        if (!gw) { gw = bm.width; gh = bm.height; }
        const c = document.createElement('canvas'); c.width = gw; c.height = gh; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, gw, gh); g.drawImage(bm, 0, 0, gw, gh);
        frames.push({ d: g.getImageData(0, 0, gw, gh).data, delay: Math.max(40, Math.min(200, Math.round(6000 / n))) });
      }
      frames[frames.length - 1].delay = 1800;
      prog && prog('กำลังบีบอัด GIF…'); await wait(30);
      return new Blob([IO.makeGIF(frames, gw, gh, 0)], { type: f.mime });
    }
  }
  function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(a.href); }, 4e4); }
  async function deliver(blob, name, mode) {
    if (mode === 'share') {
      const file = new File([blob], name, { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: name }); return true; } catch (e) { if (e && e.name === 'AbortError') return false; } }
      toast('เครื่องนี้แชร์ไฟล์ตรงๆ ไม่ได้ จึงบันทึกเป็นไฟล์แทน');
    }
    download(blob, name); return true;
  }
  XT.exportAs = async (fmt, mode, o, prog) => {
    const b = await buildExport(fmt, o || OPT[fmt] || {}, prog || (t => toast(t)));
    if (!b) return false; const ok = await deliver(b, docName() + '.' + FMT[fmt].ext, mode || 'save');
    if (ok) toast('บันทึกแล้ว: ' + docName() + '.' + FMT[fmt].ext); return ok;
  };
  async function printDoc() {
    if (FL) selCommit();
    const url = URL.createObjectURL(await toBlob(XT.finishCanvas(flat(true)), 'image/png')), fr = document.createElement('iframe');
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'; document.body.append(fr);
    const d = fr.contentDocument; d.open(); d.write('<!doctype html><title>' + esc(docName()) + '</title><style>@page{margin:8mm}html,body{margin:0}img{display:block;max-width:100%;max-height:96vh;margin:0 auto;object-fit:contain}</style><img src="' + url + '">'); d.close();
    const im = d.querySelector('img'), go = () => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { toast('สั่งพิมพ์ไม่สำเร็จ'); } setTimeout(() => { fr.remove(); URL.revokeObjectURL(url); }, 6e4); };
    if (im.complete) go(); else im.onload = go;
  }

  /* =========================================================
     สำรอง / นำเข้าโครงการ
     ========================================================= */
  async function docRecord(id) {
    if (id === CUR) { if (FL) selCommit(); await saveNow(); }
    const m = DX.find(d => d.id === id), d = await idb('get', 'd:' + id); if (!m || !d || !d.b) return null;
    return { n: m.n, w: m.w, h: m.h, bg: m.bg, act: d.act || 0, m: d.m, gr: d.gr || [], layers: await Promise.all(d.b.map(blobToURL)) };
  }
  async function exportProject(all) {
    const ids = all ? DX.map(d => d.id) : [CUR], docs = [];
    for (const id of ids) { const r = await docRecord(id); if (r) docs.push(r); }
    if (!docs.length) return toast('ไม่มีภาพให้สำรอง');
    const blob = new Blob(['{"app":"skillhub-studio","v":1,"t":' + Date.now() + ',"docs":[', ...docs.map((d, i) => (i ? ',' : '') + JSON.stringify(d)), ']}'], { type: 'application/json' });
    download(blob, 'skillhub-' + (all ? 'ทั้งหมด' : docName()) + '-' + stamp() + '.skillhub.json'); toast('สำรองแล้ว ' + docs.length + ' ผืนผ้า (' + Math.max(1, Math.round(blob.size / 1024)) + ' KB)');
  }
  const num = (v, lo, hi, def) => (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def);
  async function importProject(file) {
    let j; try { j = JSON.parse(await file.text()); } catch (e) { return toast('ไฟล์นี้ไม่ใช่ไฟล์โครงการ'); }
    if (!j || j.app !== 'skillhub-studio' || !Array.isArray(j.docs) || !j.docs.length) return toast('ไฟล์นี้ไม่ใช่ไฟล์โครงการของสตูดิโอ');
    if (FL) selCommit(); await saveNow();
    const added = [];
    for (const [k, d] of j.docs.entries()) {
      try {
        const w = Math.round(d.w), h = Math.round(d.h);
        if (!(w >= 64 && h >= 64 && w <= 4096 && h <= 4096 && w * h <= 16e6) || !Array.isArray(d.layers) || !d.layers.length || d.layers.length > MAXL || d.layers.some(u => typeof u !== 'string' || !u.startsWith('data:image/'))) continue;
        const b = await Promise.all(d.layers.map(u => fetch(u).then(r => r.blob())));
        const mm = d.layers.map((_, i) => { const x = (d.m && d.m[i]) || {}; return { v: x.v !== false, o: num(x.o, 0, 1, 1), n: String(x.n || 'ชั้น ' + (i + 1)).slice(0, 40), lk: !!x.lk, bl: Math.round(num(x.bl, 0, BL.length - 1, 0)), k: !!x.k, g: typeof x.g === 'string' ? x.g.slice(0, 30) : undefined }; });
        const gr = (Array.isArray(d.gr) ? d.gr : []).filter(g => g && typeof g.id === 'string').map(g => ({ id: g.id.slice(0, 30), n: String(g.n || 'กลุ่ม').slice(0, 40), v: g.v !== false, o: num(g.o, 0, 1, 1), x: !!g.x }));
        const id = 'd' + Date.now() + '_' + k;
        DX.push({ id, n: String(d.n || 'ผืนผ้า').slice(0, 40) + ' (นำเข้า)', w, h, bg: d.bg === 't' ? 't' : 'w' });
        await idb('put', 'd:' + id, { m: mm, b, act: Math.min(Math.max(0, d.act | 0), b.length - 1), gr, w, h }); added.push(id);
      } catch (e) { /* ข้ามผืนผ้าที่เสีย */ }
    }
    if (!added.length) return toast('อ่านภาพในไฟล์ไม่ได้');
    await idb('put', 'idx', DX); await openDoc(added[0], true); toast('นำเข้าแล้ว ' + added.length + ' ผืนผ้า');
  }

  /* =========================================================
     ประวัติเวอร์ชัน
     ========================================================= */
  const VMAX = 20, vk = (id, t) => 'vd:' + id + ':' + t;
  async function vIndex(id) { return (await idb('get', 'vi:' + id)) || []; }
  async function addVersion(rec, label, auto) {
    const id = CUR, t = Date.now(), th = document.createElement('canvas'); th.width = 120; th.height = Math.max(1, Math.round(120 * H / W));
    const g = th.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, th.width, th.height); g.drawImage(flat(), 0, 0, th.width, th.height);
    const m = DX.find(d => d.id === id), idx = await vIndex(id);
    await idb('put', vk(id, t), { m: rec.m, b: rec.b, act: rec.act, gr: rec.gr, w: rec.w, h: rec.h, bg: m ? m.bg : 'w' });
    idx.push({ t, label, auto: !!auto, th: th.toDataURL('image/jpeg', .6), w: rec.w, h: rec.h });
    while (idx.length > VMAX) { let k = idx.findIndex(v => v.auto); if (k < 0) k = 0; const [old] = idx.splice(k, 1); await idb('put', vk(id, old.t), null); }
    await idb('put', 'vi:' + id, idx); return t;
  }
  XT.autoVersion = async rec => {
    if (S.vbusy || !CUR) return; const id = CUR;
    if (S.lastAuto[id] === undefined) { const idx = await vIndex(id); S.lastAuto[id] = idx.length ? idx[idx.length - 1].t : 0; if (!idx.length) { S.lastAuto[id] = Date.now() - 6e5 + 6e4; } }
    if (Date.now() - S.lastAuto[id] < 6e5) return;
    S.vbusy = true; try { S.lastAuto[id] = Date.now(); await addVersion(rec, 'บันทึกอัตโนมัติ', true); } catch (e) { /* ไม่เต็มพื้นที่ก็ข้าม */ } S.vbusy = false;
  };
  XT.dropVersions = async id => { const idx = await vIndex(id); for (const v of idx) await idb('put', vk(id, v.t), null); await idb('put', 'vi:' + id, null); delete S.lastAuto[id]; };
  async function saveVersionNow(label) {
    if (FL) selCommit(); const rec = await saveNow(); if (!rec) return;
    try { await addVersion(rec, label || 'บันทึกเอง', false); S.lastAuto[CUR] = Date.now(); toast('บันทึกเวอร์ชันแล้ว'); } catch (e) { toast('พื้นที่เก็บข้อมูลเต็ม บันทึกเวอร์ชันไม่ได้'); }
  }
  async function restoreVersion(t, asNew) {
    const rec = await idb('get', vk(CUR, t)); if (!rec) return toast('ไม่พบข้อมูลเวอร์ชันนี้');
    if (asNew) {
      if (FL) selCommit(); await saveNow();
      const id = 'd' + Date.now(), m = DX.find(d => d.id === CUR);
      DX.push({ id, n: ((m && m.n) || 'ผืนผ้า') + ' (เวอร์ชันเก่า)', w: rec.w, h: rec.h, bg: rec.bg || 'w' }); await idb('put', 'd:' + id, rec); await idb('put', 'idx', DX); await openDoc(id, true); return toast('เปิดเวอร์ชันนี้เป็นผืนผ้าใหม่แล้ว');
    }
    if (FL) selCommit(); const cur = await saveNow(); if (cur) { try { await addVersion(cur, 'ก่อนกู้คืน', false); } catch (e) { /* ignore */ } }
    const m = DX.find(d => d.id === CUR); if (m) { m.w = rec.w; m.h = rec.h; m.bg = rec.bg || m.bg; await idb('put', 'idx', DX); }
    await idb('put', 'd:' + CUR, rec); await openDoc(CUR, true); toast('กู้คืนเวอร์ชันแล้ว');
  }
  async function openHistory() {
    const m = modal('<h2>ประวัติเวอร์ชัน</h2><p><button class="b" id="hsv">+ บันทึกเวอร์ชันตอนนี้</button></p><small>ระบบบันทึกอัตโนมัติทุก ~10 นาทีที่มีการวาด เก็บสูงสุด ' + VMAX + ' เวอร์ชันต่อผืนผ้า (ลบอันอัตโนมัติเก่าสุดก่อน)</small><div id="hli"></div><p><button class="b" id="hxx">ปิด (Esc)</button></p>');
    const rn = async () => {
      const idx = (await vIndex(CUR)).slice().reverse();
      $('hli').innerHTML = idx.length ? idx.map(v => '<div class="vh"><img src="' + v.th + '" alt=""><span><b>' + esc(v.label) + '</b><br>' + new Date(v.t).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) + '<br>' + v.w + '×' + v.h + '</span><button data-r="' + v.t + '">กู้คืน</button><button data-n="' + v.t + '" aria-label="เปิดเป็นผืนผ้าใหม่">⧉ ใหม่</button><button data-x="' + v.t + '" aria-label="ลบ">🗑</button></div>').join('') : '<p>ยังไม่มีเวอร์ชันที่บันทึกไว้</p>';
      $('hli').querySelectorAll('[data-r]').forEach(b => b.onclick = async () => { if (confirm('กู้คืนเวอร์ชันนี้? (ระบบจะเก็บสถานะปัจจุบันไว้เป็นเวอร์ชัน "ก่อนกู้คืน" ให้)')) { m.close(); await restoreVersion(+b.dataset.r); } });
      $('hli').querySelectorAll('[data-n]').forEach(b => b.onclick = async () => { m.close(); await restoreVersion(+b.dataset.n, true); });
      $('hli').querySelectorAll('[data-x]').forEach(b => b.onclick = async () => { const t = +b.dataset.x, ix = await vIndex(CUR); await idb('put', vk(CUR, t), null); await idb('put', 'vi:' + CUR, ix.filter(v => v.t !== t)); rn(); });
    };
    m.querySelector('#hxx').onclick = m.close; m.querySelector('#hsv').onclick = async () => { await saveVersionNow(); rn(); }; rn();
  }

  /* =========================================================
     หน้าต่าง "ไฟล์"
     ========================================================= */
  XT.openFile = () => {
    const m = modal('<h2>ไฟล์</h2><h3>นำเข้า</h3><div class="mr"><button class="b" id="fi1">🖼 รูป → ชั้นใหม่</button><button class="b" id="fi2">📄 รูป → ผืนผ้าใหม่</button><button class="b" id="fi3">📦 เปิดไฟล์โครงการ</button></div>' +
      '<small>รูป → ชั้นใหม่: ลากย้าย/ย่อขยาย/หมุนได้ก่อนยืนยัน · รูป → ผืนผ้าใหม่: ขนาดเท่ารูป พร้อมลบพื้นหลัง · วางรูป (Ctrl+V) หรือลากไฟล์มาวางบนผืนผ้าได้เช่นกัน</small>' +
      '<h3>ส่งออก</h3><select id="xf" aria-label="รูปแบบไฟล์" style="max-width:100%">' + Object.entries(FMT).map(([k, f]) => '<option value="' + k + '">' + f.n + '</option>').join('') + '</select>' +
      '<div id="xo"></div><div class="mr"><button class="b" id="xs">⬇ บันทึกไฟล์</button><button class="b" id="xh">📤 แชร์</button><button class="b" id="xp">🖨 พิมพ์</button></div>' +
      '<h3>สำรองภาพวาด</h3><div class="mr"><button class="b" id="fb1">สำรองผืนผ้านี้</button><button class="b" id="fb2">สำรองทุกผืนผ้า</button></div><small>ได้ไฟล์ .skillhub.json เก็บทุกเลเยอร์ กลุ่ม และโหมดผสม เปิดกลับได้ด้วย "เปิดไฟล์โครงการ" (ความคืบหน้าบทเรียนสำรองที่หน้าหลัก)</small>' +
      '<h3>ประวัติเวอร์ชัน</h3><div class="mr"><button class="b" id="fv1">+ บันทึกเวอร์ชันตอนนี้</button><button class="b" id="fv2">ดูประวัติ / กู้คืน</button></div>' +
      '<p><button class="b" id="fxx">ปิด (Esc)</button></p>');
    const fmt = () => $('xf').value;
    const drawOpt = () => {
      const k = fmt(), o = OPT[k] || {}; let h = '';
      if (k === 'jpg' || k === 'webp') h = '<label>คุณภาพ <output id="xqo">' + (o.q || (k === 'jpg' ? 92 : 90)) + '</output>%<input id="xq" type="range" min="40" max="100" value="' + (o.q || (k === 'jpg' ? 92 : 90)) + '"></label>';
      if (k === 'pdf') h = '<label>ขนาดหน้า <select id="xpg"><option value="img"' + (o.page !== 'a4' ? ' selected' : '') + '>ตามขนาดภาพ</option><option value="a4"' + (o.page === 'a4' ? ' selected' : '') + '>A4 พอดีหน้า (มีขอบ)</option></select></label>';
      if (k === 'svg1') h = '<small>ฝังภาพ PNG ไว้ในไฟล์ SVG — เปิดในโปรแกรมเวกเตอร์ได้ แต่ยังเป็นภาพพิกเซล</small>';
      if (k === 'svg2') h = '<label>จำนวนสี <select id="xcl">' + [4, 6, 8, 12, 16, 24].map(n => '<option' + ((o.colors || 8) === n ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label><small>ลดสีแล้วลากเส้นขอบเป็นรูปทรง เหมาะกับการ์ตูน โลโก้ ลายเส้น ภาพถ่ายจะกลายเป็นแผ่นสี</small>';
      if (k === 'gif') h = '<small>' + (TL.length >= 2 ? 'สร้างจากภาพไทม์แลปส์ ' + TL.length + ' เฟรม (ใช้สูงสุด 100 เฟรม ขนาดกว้าง 480 px)' : 'ยังไม่มีภาพไทม์แลปส์ — วาดต่ออีกนิดก่อน') + '</small>';
      if (k === 'png') h = '<small>' + (BG === 't' ? 'พื้นโปร่งใสจะคงไว้' : 'ผืนผ้านี้พื้นขาว (ติ๊กพื้นโปร่งใสในแผง "ลบพื้นหลัง" ถ้าต้องการ PNG โปร่งใส)') + '</small>';
      $('xo').innerHTML = h;
      if ($('xq')) $('xq').oninput = () => $('xqo').textContent = $('xq').value;
    };
    const readOpt = () => { const k = fmt(), o = {}; if ($('xq')) o.q = +$('xq').value; if ($('xpg')) o.page = $('xpg').value; if ($('xcl')) o.colors = +$('xcl').value; OPT[k] = o; saveOpt(); OPT.last = k; saveOpt(); return o; };
    $('xf').value = OPT.last && FMT[OPT.last] ? OPT.last : 'png'; $('xf').onchange = drawOpt; drawOpt();
    const run = async (mode, btn) => {
      const o = readOpt(), label = btn.textContent; btn.disabled = true;
      try { await XT.exportAs(fmt(), mode, o, t => btn.textContent = t); } catch (e) { toast('ส่งออกไม่สำเร็จ ลองลดขนาดหรือเปลี่ยนรูปแบบ'); }
      btn.disabled = false; btn.textContent = label;
    };
    $('xs').onclick = () => run('save', $('xs')); $('xh').onclick = () => run('share', $('xh')); $('xp').onclick = () => { printDoc(); };
    $('fi1').onclick = () => pickFile('image/*', f => { m.close(); importToLayer(f); });
    $('fi2').onclick = () => pickFile('image/*', f => { m.close(); importAsDoc(f); });
    $('fi3').onclick = () => pickFile('.json,application/json', f => { m.close(); importProject(f); });
    $('fb1').onclick = () => exportProject(false); $('fb2').onclick = () => exportProject(true);
    $('fv1').onclick = () => saveVersionNow(); $('fv2').onclick = () => { m.close(); openHistory(); };
    $('fxx').onclick = m.close;
  };
  $('fm').onclick = XT.openFile;

  /* =========================================================
     กำหนดขนาดผืนผ้าเอง
     ========================================================= */
  function resizeApply(nw, nh, mode) {
    if (!(nw >= 64 && nh >= 64 && nw <= 4096 && nh <= 4096)) return toast('ขนาดต้องอยู่ระหว่าง 64–4096 px');
    if (nw * nh > 16e6) return toast('ใหญ่เกินไป (รวมไม่เกิน 16 ล้านพิกเซล)');
    if (nw === W && nh === H) return toast('ขนาดเท่าเดิม');
    if (FL) selCommit();
    snapAll();
    const ox = mode === 'c' ? Math.round((nw - W) / 2) : 0, oy = mode === 'c' ? Math.round((nh - H) / 2) : 0;
    const nl = LY.map(l => { const n = document.createElement('canvas'); n.width = nw; n.height = nh; const g = n.getContext('2d'); g.imageSmoothingQuality = 'high'; if (mode === 'scale') g.drawImage(l.c, 0, 0, nw, nh); else g.drawImage(l.c, ox, oy); return n; });
    W = nw; H = nh; cv.width = W; cv.height = H; tc = tg = null;
    LY.forEach((l, i) => l.c = nl[i]);
    const m = DX.find(d => d.id == CUR); if (m) { m.w = W; m.h = H; }
    XT.resize(); fit(); render(); list(); saveSoon(); toast('ปรับขนาดเป็น ' + W + '×' + H + ' แล้ว — ↶ เพื่อย้อนกลับ');
    return true;
  }
  function resizeOpen() {
    mkS();
    const m = modal('<h2>กำหนดขนาดผืนผ้า</h2><p>ตอนนี้ ' + W + '×' + H + ' px</p><div class="mr"><label>กว้าง <input id="rzw" type="number" min="64" max="4096" value="' + W + '" style="width:96px"></label><label>สูง <input id="rzh" type="number" min="64" max="4096" value="' + H + '" style="width:96px"></label></div>' +
      '<label><input id="rzl" type="checkbox" checked> ล็อกสัดส่วน</label><label>วิธีปรับ <select id="rzm" style="max-width:100%"><option value="scale">ย่อ/ขยายภาพตามขนาดใหม่</option><option value="c">คงขนาดภาพ วางกึ่งกลาง (เพิ่มหรือตัดขอบ)</option><option value="tl">คงขนาดภาพ ชิดมุมบนซ้าย</option></select></label>' +
      '<small>ไม่เกิน 4096 px ต่อด้าน และรวมไม่เกิน 16 ล้านพิกเซล</small><p><button class="b" id="rzok">ตกลง</button> <button class="b" id="rzx">ปิด (Esc)</button></p>');
    const r = W / H;
    m.querySelector('#rzw').oninput = () => { if (m.querySelector('#rzl').checked) m.querySelector('#rzh').value = Math.round(+m.querySelector('#rzw').value / r) || ''; };
    m.querySelector('#rzh').oninput = () => { if (m.querySelector('#rzl').checked) m.querySelector('#rzw').value = Math.round(+m.querySelector('#rzh').value * r) || ''; };
    m.querySelector('#rzx').onclick = m.close;
    m.querySelector('#rzok').onclick = () => { const w = Math.round(+m.querySelector('#rzw').value), h = Math.round(+m.querySelector('#rzh').value), md = m.querySelector('#rzm').value; if (resizeApply(w, h, md)) m.close(); };
  }
  $('ers').onclick = resizeOpen;

  /* =========================================================
     คีย์ลัด
     ========================================================= */
  addEventListener('keydown', e => {
    const t = e.target, typing = t && (/INPUT|TEXTAREA|SELECT/.test(t.tagName) && t.type !== 'range' && t.type !== 'checkbox' || t.isContentEditable);
    if (typing || document.querySelector('.md')) return;
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (e.key === 'Escape') { if (S.crop) { S.crop = null; selB(lastB); } else if (S.aj) ajClose(false); else if (S.sel) clearSel(); return; }
    if (e.key === 'Enter') { if (S.aj) { ajClose(true); e.preventDefault(); } else if (S.crop) { cropApply(); e.preventDefault(); } else if (FL) { selCommit(); e.preventDefault(); } return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && S.sel) { e.preventDefault(); delSel(true); return; }
    if (!mod) return;
    if (k === 'z') { e.preventDefault(); (e.shiftKey ? $('redo') : $('undo')).click(); }
    else if (k === 'y') { e.preventDefault(); $('redo').click(); }
    else if (k === 'c') { e.preventDefault(); copySel(); }
    else if (k === 'x') { e.preventDefault(); cutSel(); }
    else if (k === 'v' && !navigator.clipboard) { e.preventDefault(); pasteSel(); }
  });

  XT.reset(); // ตั้งค่าเริ่มต้นของ #so
})();
