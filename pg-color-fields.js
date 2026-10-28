/* pg-color-fields.js
 * PG_COLOR_FIELDS : ฟังก์ชันที่ถูกฉีดเข้าไปใน iframe (ใบงาน / ลูกโป่ง) ด้วย Function.toString()
 * เพิ่มช่องใส่โค้ดสี Hex และ R,G,B ข้างช่องเลือกสี (input[type=color]) ทุกช่อง
 * ห้ามอ้างตัวแปรนอกฟังก์ชัน
 */
window.PG_COLOR_FIELDS = function () {
  if (window.__pgColorFields) return;
  const parse = v => {
    v = String(v || '').trim().toLowerCase();
    let m;
    if ((m = v.match(/^#?([0-9a-f]{3})$/))) return '#' + m[1].split('').map(x => x + x).join('');
    if ((m = v.match(/^#?([0-9a-f]{6})$/))) return '#' + m[1];
    if ((m = v.match(/^(?:rgb\(?\s*)?(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*\)?$/))) {
      const a = [m[1], m[2], m[3]].map(Number);
      if (a.every(n => n >= 0 && n <= 255)) return '#' + a.map(n => n.toString(16).padStart(2, '0')).join('');
    }
    return null;
  };
  const rgbOf = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)).join(',');
  const css = document.createElement('style');
  css.textContent =
    '.pg-cf{display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap;margin:4px 0 0 0;vertical-align:middle}' +
    '.pg-cf input[type=text]{width:92px!important;min-width:0;max-width:100%;padding:6px 8px!important;font-size:13px!important;min-height:36px!important;font-family:ui-monospace,Menlo,Consolas,monospace;box-sizing:border-box}' +
    '.pg-cf input.pg-rgb{width:104px!important}' +
    '.pg-cf input.bad{outline:2px solid #e11d48}' +
    '@media print{.pg-cf{display:none!important}}';
  document.head.appendChild(css);

  function enhance(root) {
    (root || document).querySelectorAll('input[type=color]').forEach(c => {
      if (c.dataset.pgCf) return;
      c.dataset.pgCf = '1';
      const box = document.createElement('span');
      box.className = 'pg-cf';
      box.innerHTML = '<input type="text" class="pg-hex" maxlength="7" placeholder="#RRGGBB" aria-label="โค้ดสี Hex" spellcheck="false" autocomplete="off">' +
        '<input type="text" class="pg-rgb" placeholder="R,G,B" aria-label="โค้ดสี RGB" spellcheck="false" autocomplete="off">';
      c.insertAdjacentElement('afterend', box);
      const hx = box.querySelector('.pg-hex'), rg = box.querySelector('.pg-rgb');
      const show = () => { hx.value = c.value; rg.value = rgbOf(c.value); hx.classList.remove('bad'); rg.classList.remove('bad'); };
      const apply = (inp) => {
        const p = parse(inp.value);
        if (!p) { inp.classList.add('bad'); return; }
        inp.classList.remove('bad');
        if (c.value.toLowerCase() !== p) {
          c.value = p;
          c.dispatchEvent(new Event('input', { bubbles: true }));
          c.dispatchEvent(new Event('change', { bubbles: true }));
        }
        show();
      };
      hx.addEventListener('change', () => apply(hx));
      rg.addEventListener('change', () => apply(rg));
      hx.addEventListener('keydown', e => { if (e.key === 'Enter') apply(hx); });
      rg.addEventListener('keydown', e => { if (e.key === 'Enter') apply(rg); });
      c.addEventListener('input', show);
      c.addEventListener('change', show);
      /* ค่าอาจถูกตั้งจากโค้ดภายหลัง (โหลดชุดตั้งค่า / สุ่มธีม) */
      let last = c.value;
      setInterval(() => { if (c.value !== last) { last = c.value; show(); } }, 600);
      show();
    });
  }
  window.__pgColorFields = enhance;
  enhance(document);
};
