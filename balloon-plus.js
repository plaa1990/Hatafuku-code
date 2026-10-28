/* balloon-plus.js
 * PG_BL_SHAPE_HTML : ส่วนควบคุม "รูปทรงลูกโป่งใหญ่" และชุดสีสำเร็จรูปที่แทรกในหน้าลูกโป่ง
 * PG_BL_PLUS       : ฟังก์ชันที่ถูกฉีดเข้า iframe ลูกโป่ง (Function.toString())
 */
window.PG_BL_SHAPE_HTML =
  '<h2>🫧 รูปทรงลูกโป่งใหญ่ & ชุดสีสำเร็จ</h2>' +
  '<label>รูปทรงลูกโป่งรองหลัง</label>' +
  '<select id="bshape">' +
    '<option value="none">ไม่ใช้ (ตัวอักษรลูกโป่งอย่างเดียว)</option>' +
    '<option value="circle">⚪ วงกลม</option>' +
    '<option value="roundrect">🔲 สี่เหลี่ยมมุมมน</option>' +
    '<option value="cloud">☁️ ก้อนเมฆ</option>' +
    '<option value="heart">❤️ หัวใจ</option>' +
    '<option value="star">⭐ ดาว</option>' +
  '</select>' +
  '<div class="row" style="margin-top:8px"><label>สีรูปทรงลูกโป่ง</label><input type="color" id="bshapeCol" value="#bfe3ff"></div>' +
  '<div style="margin-top:10px">' +
    '<label style="font-weight:700;font-size:12px;color:var(--fg);display:block;margin-bottom:6px">🎨 ชุดสีแนะนำสำเร็จรูป (คลิกเพื่อเปลี่ยนทันที):</label>' +
    '<div id="pgPaletteList" style="display:flex;flex-wrap:wrap;gap:6px"></div>' +
  '</div>' +
  '<p style="font-size:12px;color:var(--mut);margin:8px 0 0">ตัวอักษรใช้ “สีหลัก/สีเงา” ส่วนรูปทรงใช้สีนี้ สามารถสลับเลือกชุดสีสำเร็จด้านบนได้ทันที</p>';

window.PG_BL_PLUS = function () {
  const $ = id => document.getElementById(id);
  if (window.__bsM) return;

  /* ชุดสีแนะนำสำเร็จรูป (พาสเทล / สดใส / เรียบหรู) */
  const PALETTES = [
    { name: '🌸 ซากุระพาสเทล', main: '#ff758c', shadow: '#c43d57', shape: '#ffe5ec' },
    { name: '🩵 เบบี้บลู', main: '#3a86ff', shadow: '#1d55b8', shape: '#e0f0ff' },
    { name: '💜 ลาเวนเดอร์', main: '#9d4edd', shadow: '#61219b', shape: '#f3e8ff' },
    { name: '🍵 มินต์ซอร์เบต์', main: '#06d6a0', shadow: '#028563', shape: '#dcfce7' },
    { name: '🍋 เลมอนวานิลลา', main: '#ffb703', shadow: '#bd8000', shape: '#fef9c3' },
    { name: '🔥 สตรอว์เบอร์รีนีออน', main: '#ff0054', shadow: '#9e0034', shape: '#ffe0ec' },
    { name: '🍊 ส้มซันไชน์', main: '#fb5607', shadow: '#a33300', shape: '#ffedd5' },
    { name: '💎 ฟ้าครามสดใส', main: '#00b4d8', shadow: '#006a85', shape: '#caf0f8' },
    { name: '🍏 เขียวจี๊ดสดใส', main: '#70e000', shadow: '#428500', shape: '#d9f99d' },
    { name: '👑 โกลเด้นพรีเมียม', main: '#d4af37', shadow: '#8a6e14', shape: '#fffbe8' },
    { name: '🌹 โรสโกลด์', main: '#b76e79', shadow: '#773741', shape: '#fae8eb' },
    { name: '🌌 มิดไนท์บลู', main: '#1d3557', shadow: '#0b1626', shape: '#e2eafc' }
  ];

  /* สร้างชิปชุดสีสำเร็จรูป */
  const palBox = $('pgPaletteList');
  if (palBox && !palBox.children.length) {
    PALETTES.forEach(p => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sec';
      b.style.cssText = 'font-size:11px;padding:4px 8px;border-radius:12px;display:inline-flex;align-items:center;gap:4px;cursor:pointer;background:#fff;border:1px solid var(--line);box-shadow:0 1px 3px rgba(0,0,0,0.05);';
      b.innerHTML = '<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:' + p.main + ';border:1px solid ' + p.shadow + '"></span>' +
                    '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + p.shape + ';border:1px solid #ccc"></span>' +
                    '<span>' + p.name + '</span>';
      b.onclick = () => {
        if ($('color')) { $('color').value = p.main; $('color').dispatchEvent(new Event('input')); }
        if ($('color2')) { $('color2').value = p.shadow; $('color2').dispatchEvent(new Event('input')); }
        if ($('bshapeCol')) { $('bshapeCol').value = p.shape; $('bshapeCol').dispatchEvent(new Event('input')); }
        if (typeof go === 'function') go();
      };
      palBox.appendChild(b);
    });
  }

  /* ขนาดของรูปทรง → ใช้ขยาย canvas ให้พอดีกับข้อความ */
  window.__bsM = function (maxW, nL, lh, size, depth, stk) {
    const el = $('bshape');
    const t = el ? el.value : 'none';
    if (!el || t === 'none') return null;
    const th = nL * lh;
    const K = { circle: 1.5, roundrect: 1.55, cloud: 1.58, heart: 1.9, star: 2.2 }[t] || 1.5;
    let bw = maxW * K + size * 1.1, bh = th * K + size * 1.3;
    if (t === 'heart') bh = Math.max(bh, bw * 0.9);
    if (t === 'star') bh = Math.max(bh, bw * 0.82);
    if (t === 'cloud') bh = Math.max(bh, bw * 0.5);
    if (t === 'circle') bh = Math.max(bh, bw * 0.5);
    if (t === 'roundrect') bh = Math.max(bh, bw * 0.45);
    const m = Math.ceil(depth * 1.5 + stk + size * 0.25);
    const padX0 = size * 1.3 + depth * 2 + stk;
    const H00 = size * 2.6 + depth * 3 + stk * 2 + (nL - 1) * lh;
    const padX = Math.max(padX0, (bw + 2 * m - maxW) / 2);
    const H0 = Math.max(H00, Math.ceil(bh + 2 * m));
    return { t, padX, H0, m };
  };

  /* วาดรูปทรงเป็นชิ้นลูกโป่ง 3D */
  window.__bsPiece = function (bs, c) {
    const W = c.W, H0 = c.H0, size = c.size, depth = c.depth;
    const col = $('bshapeCol') ? $('bshapeCol').value : '#bfe3ff';
    const B = c.hex(col), S = c.hex(c.shadeOf(col));
    const bw = Math.max(20, Math.ceil(W - 2 * bs.m)), bh = Math.max(20, Math.ceil(H0 - 2 * bs.m));
    const x0 = Math.round(W / 2 - bw / 2), y0 = Math.round(H0 / 2 - bh / 2);
    const lw = Math.max(2, size * 0.1), t = bs.t;
    const draw = mc => {
      const cx = bw / 2, cy = bh / 2, rx = bw / 2 - lw, ry = bh / 2 - lw;
      mc.lineWidth = lw; mc.lineJoin = 'round';
      mc.beginPath();
      if (t === 'circle') {
        mc.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      } else if (t === 'roundrect') {
        const rad = Math.min(rx, ry) * 0.32;
        const x1 = cx - rx, y1 = cy - ry, w2 = rx * 2, h2 = ry * 2;
        if (mc.roundRect) {
          mc.roundRect(x1, y1, w2, h2, rad);
        } else {
          mc.moveTo(x1 + rad, y1);
          mc.lineTo(x1 + w2 - rad, y1);
          mc.arcTo(x1 + w2, y1, x1 + w2, y1 + rad, rad);
          mc.lineTo(x1 + w2, y1 + h2 - rad);
          mc.arcTo(x1 + w2, y1 + h2, x1 + w2 - rad, y1 + h2, rad);
          mc.lineTo(x1 + rad, y1 + h2);
          mc.arcTo(x1, y1 + h2, x1, y1 + h2 - rad, rad);
          mc.lineTo(x1, y1 + rad);
          mc.arcTo(x1, y1, x1 + rad, y1, rad);
        }
      } else if (t === 'cloud') {
        mc.moveTo(cx + rx * 0.78, cy);
        mc.ellipse(cx, cy, rx * 0.78, ry * 0.78, 0, 0, Math.PI * 2);
        const n = 9, r0 = Math.min(rx, ry) * 0.36;
        for (let i = 0; i < n; i++) {
          const a = i / n * Math.PI * 2 - Math.PI / 2;
          const px = cx + Math.cos(a) * rx * 0.62, py = cy + Math.sin(a) * ry * 0.6, r = r0 * (i % 2 ? 1 : 1.12);
          mc.moveTo(px + r, py); mc.arc(px, py, r, 0, Math.PI * 2);
        }
      } else if (t === 'heart') {
        for (let i = 0; i <= 160; i++) {
          const a = i / 160 * Math.PI * 2;
          const x = 16 * Math.pow(Math.sin(a), 3);
          const y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
          const px = cx + x / 16 * rx, py = cy + (y - 2.5) / 14.5 * ry;
          if (i) mc.lineTo(px, py); else mc.moveTo(px, py);
        }
        mc.closePath();
      } else if (t === 'star') {
        const cyS = cy + ry * 0.095;
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? 0.56 : 1, a = -Math.PI / 2 + i * Math.PI / 5;
          const px = cx + Math.cos(a) * r * rx * 1.0, py = cyS + Math.sin(a) * r * ry * 1.0;
          if (i) mc.lineTo(px, py); else mc.moveTo(px, py);
        }
        mc.closePath();
      }
      mc.fill(); mc.stroke();
    };
    const key = ['bshape', t, bw, bh, col, c.mat0, depth.toFixed(2), c.glint ? 1 : 0].join('|');
    return c.makePiece(x0, bw, draw, c.glint ? { x: bw * 0.3, y: bh * 0.24, r: Math.min(bw, bh) * 0.12 } : null,
      { exact: 1, local: 1, h: bh, y0, key, B, S, tt: 0 });
  };

  /* บันทึก/โหลดชุดตั้งค่าของแอปเดิมให้จำรูปทรงด้วย */
  try { if (typeof IDS !== 'undefined') ['bshape', 'bshapeCol'].forEach(i => { if (!IDS.includes(i)) IDS.push(i); }); } catch (e) {}

  /* ช่องโค้ดสี Hex / RGB */
  if (typeof PG_COLOR_FIELDS === 'function') { /* เผื่อถูกฉีดมาแล้ว */ }
  if (window.__pgColorFields) window.__pgColorFields(document);

  /* เพิ่มปุ่มส่งออกเสริม */
  const exp = $('exportBtn');
  if (exp && !$('pgTransBtn')) {
    // 1. ปุ่ม PNG โปร่งใส
    const bTrans = document.createElement('button');
    bTrans.id = 'pgTransBtn'; bTrans.className = 'sec'; bTrans.type = 'button';
    bTrans.textContent = '🧩 PNG โปร่งใส';
    bTrans.title = 'ส่งออกพื้นหลังโปร่งใส ตัดขอบพอดีรูป';
    exp.insertAdjacentElement('afterend', bTrans);

    bTrans.onclick = async () => {
      const bg = $('bgOn'), xf = $('xfmt');
      const was = [bg.checked, xf.value];
      bg.checked = false; xf.value = 'orig'; window.__pgTrim = true;
      try { await exportStill(); }
      finally {
        window.__pgTrim = false; bg.checked = was[0]; xf.value = was[1];
        if (typeof go === 'function') go();
      }
    };

    // 2. ปุ่มสติกเกอร์ LINE 320x320 px มาตรฐาน
    const bLine = document.createElement('button');
    bLine.id = 'pgLineStickerBtn'; bLine.className = 'sec'; bLine.type = 'button';
    bLine.textContent = '📐 สติกเกอร์ LINE (320×320)';
    bLine.title = 'ส่งออกขนาด 320×320 px พื้นหลังโปร่งใส จัดกึ่งกลางพอดีมาตรฐานสติกเกอร์ LINE';
    bLine.style.cssText = 'background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;font-weight:700;';
    bTrans.insertAdjacentElement('afterend', bLine);

    bLine.onclick = async () => {
      const bg = $('bgOn'), wasBg = bg.checked;
      bg.checked = false;
      try {
        if (typeof lock === 'function') await lock();
        if ($('msg')) $('msg').textContent = 'กำลังประมวลผลขนาด 320×320 px สำหรับ LINE...';
        await render();
        const bb = (typeof bboxOf === 'function') ? bboxOf(cv) : { x: 0, y: 0, w: cv.width, h: cv.height };
        const srcW = Math.max(1, bb.w), srcH = Math.max(1, bb.h);
        const target = document.createElement('canvas');
        target.width = 320; target.height = 320;
        const ctx = target.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        // ขอบปลอดภัย LINE Sticker: เว้นขอบประมาณ 10px ด้านละข้าง (ขนาดสูงสุด 300x300)
        const scale = Math.min(300 / srcW, 300 / srcH);
        const destW = Math.round(srcW * scale);
        const destH = Math.round(srcH * scale);
        const destX = Math.round((320 - destW) / 2);
        const destY = Math.round((320 - destH) / 2);
        ctx.drawImage(cv, bb.x, bb.y, bb.w, bb.h, destX, destY, destW, destH);
        const b = await new Promise(res => target.toBlob(res, 'image/png'));
        const safe = ($('text').value.trim() || 'sticker').replace(/[\\/:*?"<>|]/g, '_').slice(0, 16);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = `line_sticker_320x320_${safe}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 15000);
        if ($('msg')) $('msg').textContent = '✓ บันทึกสติกเกอร์ LINE (320×320 px) เรียบร้อยแล้ว';
      } catch (err) {
        console.error(err);
        if ($('msg')) $('msg').textContent = 'เกิดข้อผิดพลาดในการส่งออก';
      } finally {
        bg.checked = wasBg;
        if (typeof unlock === 'function') unlock();
        if (typeof go === 'function') go();
      }
    };

    // 3. ปุ่มสร้างชุดหลายรูปพร้อมกัน (Batch Multi-image)
    const bBatch = document.createElement('button');
    bBatch.id = 'pgBatchBtn'; bBatch.className = 'sec'; bBatch.type = 'button';
    bBatch.textContent = '📦 สร้างชุดหลายรูป';
    bBatch.title = 'พิมพ์ข้อความหลายบรรทัด แล้วสร้างรูปทุกบรรทัดพร้อมกันเป็นชุด';
    bBatch.style.cssText = 'background:#f5f3ff;border:1px solid #ddd6fe;color:#5b21b6;font-weight:700;';
    bLine.insertAdjacentElement('afterend', bBatch);

    bBatch.onclick = () => {
      // เลื่อนลงไปที่ส่วนชุดสติกเกอร์ (pack) และไฮไลต์
      const pk = $('pack');
      if (pk) {
        pk.scrollIntoView({ behavior: 'smooth', block: 'center' });
        pk.focus();
        pk.style.boxShadow = '0 0 0 4px #c4b5fd';
        setTimeout(() => { pk.style.boxShadow = ''; }, 2500);
        if ($('msg')) $('msg').textContent = '💡 พิมพ์ข้อความบรรทัดละ 1 รูป ในช่องนี้ แล้วกด "สร้างชุดสติกเกอร์ (ZIP)" ได้เลย';
      }
    };

    // 4. ปุ่มส่งคำไปสตูดิโอธีม LINE
    const lt = document.createElement('button');
    lt.id = 'pgLineThemeBtn'; lt.className = 'sec'; lt.type = 'button';
    lt.textContent = '🎨 ส่งไปทำธีม LINE';
    lt.title = 'นำคำนี้และชุดสีไปทำธีม LINE สไตล์เยลลี่ 3D ทันที';
    lt.style.cssText = 'background:#fff4ed;border:1px solid #fed2c3;color:#b94e2e;font-weight:700;';
    bBatch.insertAdjacentElement('afterend', lt);

    lt.onclick = () => {
      const curTxt = ($('text') ? $('text').value : '').trim() || 'OK';
      const col = $('color') ? $('color').value : null;
      const col2 = $('color2') ? $('color2').value : null;
      const font = $('font') ? $('font').value : null;
      const pack = $('pack') ? $('pack').value : '';
      const payload = { text: curTxt, color: col, color2: col2, font: font, pack: pack, timestamp: Date.now() };
      try { localStorage.setItem('lineTheme_importedWord', JSON.stringify(payload)); } catch(e){}
      if (window.parent && window.parent !== window) {
        window.parent.location.hash = '#linetheme';
        window.parent.postMessage({ type: 'linetheme:apply-word', payload: payload }, '*');
      } else {
        location.hash = '#linetheme';
      }
    };
  }

  if (typeof go === 'function') go();
};
