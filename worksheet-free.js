/* worksheet-free.js
 * PG_WS_FREE : ฟังก์ชันที่ถูกฉีดเข้า iframe ใบงาน (Function.toString()) ห้ามอ้างตัวแปรนอกฟังก์ชัน
 *  - โหมดจัดวาง: อัตโนมัติ / อิสระ (ลากบล็อกไปวางเองได้ จำตำแหน่งไว้)
 *  - สีพื้นหลังกระดาษ (มีช่อง Hex/RGB)
 *  - คลังคำศัพท์เพิ่ม ไทย / จีน / ญี่ปุ่น (ครบ 5 ภาษากับเกาหลีและอังกฤษที่มีอยู่แล้ว)
 *  - แบบร่าง: บันทึกทั้งใบงาน (ค่าตั้ง + คำศัพท์ + ตำแหน่งที่จัด) ตั้งชื่อเก็บไว้เปิดแก้ต่อได้
 */
window.PG_WS_FREE = function () {
  const $ = id => document.getElementById(id);
  if ($('pgLayoutMode')) return;
  const controls = document.querySelector('.controls');
  const pagesBox = $('pagesContainer');
  if (!controls || !pagesBox) return;
  const root = document.documentElement;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- คลังคำ 5 ภาษา (เพิ่มไทย จีน ญี่ปุ่น) ---------- */
  const NEW_PRESETS = [
    ['th-animals', '🇹🇭 หมวดสัตว์ภาษาไทย', 'lines',
      'แมว|maew|แมว|🐱||Cat\nสุนัข|su-nak|สุนัข|🐶||Dog\nนก|nok|นก|🐦||Bird\nปลา|bpla|ปลา|🐟||Fish\nช้าง|chaang|ช้าง|🐘||Elephant\nม้า|maa|ม้า|🐴||Horse\nวัว|wua|วัว|🐮||Cow\nหมู|moo|หมู|🐷||Pig\nไก่|gai|ไก่|🐔||Chicken\nเป็ด|bpet|เป็ด|🦆||Duck'],
    ['th-fruit', '🇹🇭 หมวดผลไม้ภาษาไทย', 'lines',
      'กล้วย|gluay|กล้วย|🍌||Banana\nส้ม|som|ส้ม|🍊||Orange\nองุ่น|a-ngun|องุ่น|🍇||Grape\nแตงโม|dtaeng-moh|แตงโม|🍉||Watermelon\nมะม่วง|ma-muang|มะม่วง|🥭||Mango\nสับปะรด|sap-bpa-rot|สับปะรด|🍍||Pineapple\nแอปเปิ้ล|aep-bpern|แอปเปิ้ล|🍎||Apple\nสตรอว์เบอร์รี|sa-dtror-boe-ri|สตรอว์เบอร์รี|🍓||Strawberry'],
    ['th-consonant', '🇹🇭 พยัญชนะไทย ก–ฎ (พร้อมคำประจำตัว)', 'lines',
      'ก|gor gai|ก ไก่|🐔||Chicken\nข|kor kai|ข ไข่|🥚||Egg\nค|kor kwai|ค ควาย|🐃||Buffalo\nง|ngor ngu|ง งู|🐍||Snake\nจ|jor jaan|จ จาน|🍽️||Plate\nช|chor chaang|ช ช้าง|🐘||Elephant\nม|mor maa|ม ม้า|🐴||Horse\nย|yor yak|ย ยักษ์|👹||Giant\nร|ror rua|ร เรือ|⛵||Boat\nล|lor ling|ล ลิง|🐒||Monkey'],
    ['zh-basic', '🇨🇳 ภาษาจีนพื้นฐาน', 'cross',
      '你好|nǐ hǎo|สวัสดี|👋||Hello\n谢谢|xiè xie|ขอบคุณ|🙏||Thank you\n再见|zài jiàn|ลาก่อน|🖐️||Goodbye\n水|shuǐ|น้ำ|💧||Water\n火|huǒ|ไฟ|🔥||Fire\n山|shān|ภูเขา|⛰️||Mountain\n人|rén|คน|🧑||Person\n大|dà|ใหญ่|🐘||Big\n小|xiǎo|เล็ก|🐜||Small\n爱|ài|รัก|❤️||Love'],
    ['zh-animals', '🇨🇳 หมวดสัตว์ภาษาจีน', 'cross',
      '猫|māo|แมว|🐱||Cat\n狗|gǒu|สุนัข|🐶||Dog\n鸟|niǎo|นก|🐦||Bird\n鱼|yú|ปลา|🐟||Fish\n兔|tù|กระต่าย|🐰||Rabbit\n马|mǎ|ม้า|🐴||Horse\n牛|niú|วัว|🐮||Cow\n猪|zhū|หมู|🐷||Pig\n鸡|jī|ไก่|🐔||Chicken\n熊猫|xióng māo|แพนด้า|🐼||Panda'],
    ['ja-hira', '🇯🇵 ฮิรางานะ: คำพื้นฐาน', 'cross',
      'ねこ|neko|แมว|🐱||Cat\nいぬ|inu|สุนัข|🐶||Dog\nとり|tori|นก|🐦||Bird\nさかな|sakana|ปลา|🐟||Fish\nりんご|ringo|แอปเปิ้ล|🍎||Apple\nみず|mizu|น้ำ|💧||Water\nやま|yama|ภูเขา|⛰️||Mountain\nはな|hana|ดอกไม้|🌸||Flower\nありがとう|arigatou|ขอบคุณ|🙏||Thank you\nこんにちは|konnichiwa|สวัสดี|👋||Hello'],
    ['ja-kata', '🇯🇵 คาตากานะ: คำยืม', 'cross',
      'コーヒー|kōhī|กาแฟ|☕||Coffee\nパン|pan|ขนมปัง|🍞||Bread\nケーキ|kēki|เค้ก|🍰||Cake\nバナナ|banana|กล้วย|🍌||Banana\nテレビ|terebi|โทรทัศน์|📺||TV\nバス|basu|รถบัส|🚌||Bus\nカメラ|kamera|กล้อง|📷||Camera\nピアノ|piano|เปียโน|🎹||Piano']
  ];
  const presetSel = $('preset');
  if (presetSel && typeof PRESETS !== 'undefined') {
    const og = document.createElement('optgroup');
    og.label = '➕ ไทย / จีน / ญี่ปุ่น';
    NEW_PRESETS.forEach(p => {
      PRESETS[p[0]] = p[3];
      const o = document.createElement('option'); o.value = p[0]; o.textContent = p[1];
      og.appendChild(o);
    });
    presetSel.appendChild(og);
    presetSel.addEventListener('change', () => {
      const p = NEW_PRESETS.find(x => x[0] === presetSel.value);
      if (!p) return;
      const st = $('style');
      if (st && st.value !== p[2]) { st.value = p[2]; st.dispatchEvent(new Event('change', { bubbles: true })); }
    });
  }

  /* ---------- ส่วนควบคุม ---------- */
  const sec = document.createElement('section');
  sec.id = 'pgFreeSection';
  sec.style.cssText = 'margin-top:20px;padding:14px;background:#f5f7f4;border:1px solid #d9e2dc;border-radius:14px';
  sec.innerHTML =
    '<h3 style="margin:0 0 8px;font-size:16px">📐 การจัดวาง · พื้นหลัง · แบบร่าง</h3>' +
    '<label for="pgLayoutMode">โหมดจัดวางบนกระดาษ</label>' +
    '<select id="pgLayoutMode"><option value="auto">อัตโนมัติ (จัดให้เรียบร้อย)</option><option value="free">อิสระ (ลากวางตำแหน่งเอง)</option></select>' +
    '<div id="pgFreeTools" style="display:none">' +
    '<label class="checkbox-group"><input type="checkbox" id="pgSnap" checked><span>ดูดเข้าตาราง (วางตรงแนวง่ายขึ้น)</span></label>' +
    '<div style="font-size:12px;color:#6b7280;margin:4px 0 8px">ไปที่แท็บ “ดูหน้ากระดาษ” แล้วลากบล็อกที่มีเส้นประสีม่วงไปวางได้เลย ระบบจำตำแหน่งให้ในเครื่องนี้</div>' +
    '<button type="button" id="pgFreeReset" style="min-width:0;padding:9px 14px;background:#e5e7eb;color:#374151">↺ รีเซ็ตตำแหน่งทั้งหมด</button></div>' +
    '<div class="row" style="margin-top:12px"><div><label for="pgPaperBg">สีพื้นหลังกระดาษ</label><input type="color" id="pgPaperBg" value="#ffffff"></div></div>' +
    '<label style="margin-top:14px">📝 แบบร่าง (เก็บทั้งใบงาน รวมคำศัพท์และตำแหน่งที่จัด)</label>' +
    '<div class="row" style="gap:8px;flex-wrap:nowrap"><select id="pgDraftSel" style="flex:1"></select>' +
    '<button type="button" id="pgDraftLoad" style="flex:0 0 auto;min-width:0;padding:10px 14px">เปิด</button>' +
    '<button type="button" id="pgDraftDel" style="flex:0 0 auto;min-width:0;padding:10px 14px;background:#e5e7eb;color:#374151">ลบ</button></div>' +
    '<div class="row" style="gap:8px;margin-top:8px;flex-wrap:nowrap"><input type="text" id="pgDraftName" placeholder="ชื่อแบบร่าง เช่น ใบงานสัตว์ ป.1" style="flex:1">' +
    '<button type="button" id="pgDraftSave" class="btn-image" style="flex:0 0 auto;min-width:0;padding:10px 14px">บันทึกแบบร่าง</button></div>';
  controls.appendChild(sec);

  const css = document.createElement('style');
  css.textContent =
    'html.pg-free .pg-free-content{position:relative!important;display:block!important}' +
    'html.pg-free .pg-fb{position:absolute!important;margin:0!important;box-sizing:border-box;touch-action:none}' +
    'html.pg-free:not(.pg-exporting) .pg-fb{outline:2px dashed #8d7bd8;outline-offset:2px;cursor:grab}' +
    'html.pg-free:not(.pg-exporting) .pg-fb.pg-drag{outline-style:solid;cursor:grabbing;z-index:20;box-shadow:0 8px 24px rgba(0,0,0,.18)}' +
    'html.pg-free:not(.pg-exporting) .pg-fb *{user-select:none;-webkit-user-select:none}' +
    '@media print{html.pg-free .pg-fb{outline:none!important;box-shadow:none!important}html.pg-free .pg-free-content{height:calc(var(--paper-height,297mm) - 78mm)!important}}';
  document.head.appendChild(css);

  /* ---------- ที่เก็บตำแหน่ง ---------- */
  const PK = 'pgFreePos', MK = 'pgFreeMode', BK = 'pgPaperBg';
  let pos = {};
  try { pos = JSON.parse(localStorage.getItem(PK) || '{}') || {}; } catch (e) { pos = {}; }
  const savePos = () => { try { localStorage.setItem(PK, JSON.stringify(pos)); } catch (e) {} };
  const mode = $('pgLayoutMode'), bg = $('pgPaperBg');
  try { mode.value = localStorage.getItem(MK) || 'auto'; } catch (e) {}
  try { bg.value = localStorage.getItem(BK) || '#ffffff'; } catch (e) {}

  const isFree = () => mode.value === 'free';
  const applyBg = () => { root.style.setProperty('--bg-color', bg.value); };
  const syncTools = () => { $('pgFreeTools').style.display = isFree() ? '' : 'none'; root.classList.toggle('pg-free', isFree()); };

  /* ---------- แปลงบล็อกเป็นตำแหน่งอิสระ ---------- */
  function applyFree() {
    syncTools();
    if (!isFree()) return;
    pagesBox.querySelectorAll('.page-a4').forEach(page => {
      const pc = page.querySelector('.page-content');
      if (!pc || pc.dataset.pgFree === '1') return;
      const W = pc.offsetWidth, H = pc.offsetHeight;
      if (!W || !H) return; /* ยังซ่อนอยู่ (แท็บตั้งค่าบนมือถือ) ไว้ค่อยแปลงตอนเปิด */
      const pr = pc.getBoundingClientRect(), sc = pr.width / W || 1;
      const kids = Array.prototype.slice.call(pc.children);
      const rects = kids.map(k => { const r = k.getBoundingClientRect(); return { l: (r.left - pr.left) / sc, t: (r.top - pr.top) / sc, w: r.width / sc, h: r.height / sc }; });
      pc.dataset.pgFree = '1';
      pc.classList.add('pg-free-content');
      kids.forEach((k, i) => {
        const key = (page.dataset.page || '0') + ':' + i, b = rects[i], p = pos[key];
        k.classList.add('pg-fb'); k.dataset.pgKey = key;
        k.style.width = (b.w / W * 100) + '%';
        k.style.height = (b.h / H * 100) + '%';
        k.style.left = (p ? p.x : b.l / W * 100) + '%';
        k.style.top = (p ? p.y : b.t / H * 100) + '%';
      });
    });
  }
  let raf = 0;
  const later = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => requestAnimationFrame(applyFree)); };
  new MutationObserver(later).observe(pagesBox, { childList: true });

  mode.addEventListener('change', () => {
    try { localStorage.setItem(MK, mode.value); } catch (e) {}
    syncTools();
    if (typeof render === 'function') render();
    later();
  });
  bg.addEventListener('input', () => { try { localStorage.setItem(BK, bg.value); } catch (e) {} applyBg(); });
  $('pgFreeReset').onclick = () => { pos = {}; savePos(); if (typeof render === 'function') render(); later(); };

  /* ---------- ลากวาง ---------- */
  let drag = null;
  document.addEventListener('pointerdown', e => {
    if (!isFree()) return;
    const t = e.target;
    const k = t.closest && t.closest('.pg-fb');
    if (!k || (t.closest && t.closest('input,button,select,textarea,a'))) return;
    const pc = k.parentElement, pr = pc.getBoundingClientRect(), W = pc.offsetWidth, H = pc.offsetHeight;
    drag = { k, W, H, sc: pr.width / W || 1, sx: e.clientX, sy: e.clientY, L: parseFloat(k.style.left) || 0, T: parseFloat(k.style.top) || 0, id: e.pointerId };
    try { k.setPointerCapture(e.pointerId); } catch (x) {}
    k.classList.add('pg-drag');
    e.preventDefault();
  }, true);
  document.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const snap = $('pgSnap').checked;
    let L = drag.L + (e.clientX - drag.sx) / drag.sc / drag.W * 100;
    let T = drag.T + (e.clientY - drag.sy) / drag.sc / drag.H * 100;
    if (snap) { L = Math.round(L / 2.5) * 2.5; T = Math.round(T / 2.5) * 2.5; }
    L = Math.max(-5, Math.min(98, L)); T = Math.max(-5, Math.min(98, T));
    drag.k.style.left = L + '%'; drag.k.style.top = T + '%';
  });
  const endDrag = e => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const k = drag.k;
    k.classList.remove('pg-drag');
    pos[k.dataset.pgKey] = { x: parseFloat(k.style.left), y: parseFloat(k.style.top) };
    savePos();
    drag = null;
  };
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);

  /* ---------- ส่งออกต้องไม่ติดเส้นประ และต้องแปลงบล็อกก่อนเสมอ ---------- */
  if (typeof capture === 'function') {
    const oc = capture;
    capture = async function () {
      if (isFree()) {
        const hidden = getComputedStyle(pagesBox).display === 'none';
        if (hidden) pagesBox.style.cssText = 'display:flex;position:fixed;left:-99999px;top:0;height:auto;overflow:visible';
        applyFree();
        if (hidden) pagesBox.style.cssText = '';
      }
      root.classList.add('pg-exporting');
      try { return await oc.apply(this, arguments); } finally { root.classList.remove('pg-exporting'); }
    };
  }
  if (typeof switchTab === 'function') {
    const os = switchTab;
    switchTab = function () { const r = os.apply(this, arguments); later(); return r; };
  }
  addEventListener('beforeprint', () => { if (isFree()) { applyFree(); root.classList.add('pg-exporting'); } });
  addEventListener('afterprint', () => root.classList.remove('pg-exporting'));
  addEventListener('resize', later);

  /* ---------- แบบร่าง ---------- */
  const DK = 'pgWsDrafts';
  const dGet = () => { try { return JSON.parse(localStorage.getItem(DK) || '{}') || {}; } catch (e) { return {}; } };
  const dPut = o => { try { localStorage.setItem(DK, JSON.stringify(o)); return true; } catch (e) { alert('พื้นที่เก็บข้อมูลเต็ม ลบแบบร่างเก่าก่อนนะ'); return false; } };
  const dDraw = v => {
    const o = dGet(), names = Object.keys(o).sort((a, b) => (o[b].t || 0) - (o[a].t || 0));
    $('pgDraftSel').innerHTML = '<option value="">-- เลือกแบบร่าง --</option>' + names.map(n => '<option value="' + esc(n) + '">' + esc(n) + ' · ' + new Date(o[n].t || 0).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) + '</option>').join('');
    if (v) $('pgDraftSel').value = v;
  };
  $('pgDraftSave').onclick = () => {
    const n = $('pgDraftName').value.trim();
    if (!n) { alert('ตั้งชื่อแบบร่างก่อนนะ'); return; }
    const s = {};
    if (typeof inputsToSave !== 'undefined') inputsToSave.forEach(id => { const e = $(id); if (e) s[id] = e.type === 'checkbox' ? e.checked : e.value; });
    const o = dGet();
    o[n] = { t: Date.now(), s, pos: JSON.parse(JSON.stringify(pos)), mode: mode.value, bg: bg.value };
    if (dPut(o)) { dDraw(n); $('pgDraftName').value = ''; }
  };
  $('pgDraftLoad').onclick = () => {
    const d = dGet()[$('pgDraftSel').value];
    if (!d) return;
    Object.keys(d.s || {}).forEach(id => { const e = $(id); if (e) { if (e.type === 'checkbox') e.checked = d.s[id]; else e.value = d.s[id]; } });
    pos = d.pos || {}; savePos();
    mode.value = d.mode || 'auto'; bg.value = d.bg || '#ffffff';
    try { localStorage.setItem(MK, mode.value); localStorage.setItem(BK, bg.value); } catch (e) {}
    applyBg(); syncTools();
    if (typeof render === 'function') render();
    if (typeof saveSettings === 'function') saveSettings();
    later();
  };
  $('pgDraftDel').onclick = () => {
    const n = $('pgDraftSel').value; if (!n) return;
    if (!confirm('ลบแบบร่าง "' + n + '" ?')) return;
    const o = dGet(); delete o[n]; dPut(o); dDraw();
  };
  dDraw();

  if (window.__pgColorFields) window.__pgColorFields(sec);
  applyBg(); syncTools(); later();
};
