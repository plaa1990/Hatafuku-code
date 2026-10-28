/* Polyglot worksheet extras
 * PG_WS_HALF1 / PG_WS_HALF2 : ฟังก์ชันที่ถูกฉีดเข้าไปในสตูดิโอใบงาน (iframe)
 *    ถูกแปลงเป็นข้อความด้วย Function.toString() ดังนั้นห้ามอ้างตัวแปรนอกฟังก์ชัน
 */
/* ---------- ฉีดเข้า iframe ใบงาน ---------- */
window.PG_WS_HALF1 = function () {
  const box = document.getElementById('polyglotWorksheetExtras');
  if (!box || document.getElementById('pgHideSection')) return;
  const $ = id => document.getElementById(id);

  const OPTS = [
    ['hRoman', 'ซ่อนคำอ่าน (romanization)'],
    ['hMeaning', 'ซ่อนคำแปล'],
    ['hIcon', 'ซ่อนอิโมจิ / รูป'],
    ['hWord', 'ซ่อนคำหลักในช่องตัวอย่าง (แบบเดิม)'],
    ['hSub', 'ซ่อนหัวข้อย่อย / ชื่อสถาบัน'],
    ['hInstr', 'ซ่อนคำสั่งกิจกรรม (กล่องสีฟ้า)'],
    ['hPageNo', 'ซ่อนเลขหน้า'],
    ['hFooter', 'ซ่อนข้อความท้ายกระดาษ'],
    ['hMetaName', 'ซ่อนช่อง “ชื่อ”'],
    ['hMetaClass', 'ซ่อนช่อง “ชั้น”'],
    ['hMetaNo', 'ซ่อนช่อง “เลขที่”'],
    ['hMetaDate', 'ซ่อนช่อง “วันที่”']
  ];
  const ids = OPTS.map(o => 'pgHide_' + o[0]);
  const s2 = document.getElementById('pgHalf2Section');
  if (s2) box.appendChild(s2);

  const css = document.createElement('style');
  css.textContent =
    'html.pg-h-hRoman .example-sub,html.pg-h-hRoman .cmp-pron{display:none!important}' +
    'html.pg-h-hMeaning .example-th,html.pg-h-hMeaning .cmp-name,html.pg-h-hMeaning .cmp-th{display:none!important}' +
    'html.pg-h-hIcon .example-icon,html.pg-h-hIcon .stroke-image,html.pg-h-hIcon .cmp-emoji,html.pg-h-hIcon .cmp-img{display:none!important}' +
    'html.pg-h-hWord .example-main{visibility:hidden}' +
    'html.pg-h-hSub .page-title p:not(.pg-teach){display:none!important}' +
    'html.pg-h-hInstr .match-instructions{display:none!important}' +
    'html.pg-h-hPageNo .page-footer-right{visibility:hidden}' +
    'html.pg-h-hFooter .page-footer-left{visibility:hidden}' +
    '#pgHideSection{margin-top:14px;padding-top:12px;border-top:1px dashed #cbd5d1}' +
    '#pgHideSection h4{margin:0 0 6px;font-size:15px}' +
    '#pgHideSection .pg-quick{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}' +
    '#pgHideSection .pg-quick button{min-width:0;flex:1 1 140px;padding:9px 10px;font-size:13px;background:#e5e7eb;color:#374151}' +
    '.pg-focus-btn{position:fixed;top:10px;right:10px;z-index:1200;min-width:0;flex:none;padding:8px 14px;font-size:13px;background:#374151;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.25)}' +
    'html.pg-focus .controls-container{display:none!important}' +
    '.pg-jelly-stamp{position:absolute;top:6mm;right:10mm;transform:rotate(-4deg);display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:999px;font-weight:700;font-size:13px;line-height:1;box-shadow:0 6px 16px rgba(0,0,0,.12),inset 0 2px 2px rgba(255,255,255,.8),inset 0 -2px 4px rgba(0,0,0,.15);border:2px solid rgba(255,255,255,.9);pointer-events:none;z-index:10;user-select:none;transition:transform .2s}' +
    '.pg-jelly-gold{background:linear-gradient(135deg,#ffe082,#ffb300);color:#5d4037}' +
    '.pg-jelly-coral{background:linear-gradient(135deg,#ffab91,#e64a19);color:#fff}' +
    '.pg-jelly-rose{background:linear-gradient(135deg,#f8bbd0,#ec407a);color:#fff}' +
    '.pg-jelly-teal{background:linear-gradient(135deg,#a7f3d0,#059669);color:#064e3b}' +
    '.pg-jelly-sky{background:linear-gradient(135deg,#bae6fd,#0284c7);color:#fff}' +
    '.pg-jelly-purple{background:linear-gradient(135deg,#e9d5ff,#9333ea);color:#fff}' +
    '.pg-speech-btn{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:#e0f2fe;color:#0284c7;border:1px solid #bae6fd;cursor:pointer;font-size:13px;padding:0;margin-left:6px;vertical-align:middle;transition:all .15s}' +
    '.pg-speech-btn:hover{background:#0284c7;color:#fff;transform:scale(1.1)}' +
    '@media print{.pg-speech-btn{display:none!important}}' +
    '@media(max-width:900px){.pg-focus-btn{display:none!important}}' +
    '@media print{.pg-focus-btn{display:none!important}}';
  document.head.appendChild(css);

  const sec = document.createElement('div');
  sec.id = 'pgHideSection';
  sec.innerHTML =
    '<h4>👁️ ซ่อน / แสดงส่วนต่าง ๆ ในใบงาน</h4>' +
    OPTS.map(o => '<label class="checkbox-group"><input type="checkbox" id="pgHide_' + o[0] + '"><span>' + o[1] + '</span></label>').join('') +
    '<div class="pg-quick">' +
    '<button type="button" id="pgHideHints">ซ่อนคำอ่าน+แปล+รูป</button>' +
    '<button type="button" id="pgHideChrome">ซ่อนหัว-ท้ายกระดาษ</button>' +
    '<button type="button" id="pgShowAll">แสดงทั้งหมด</button></div>' +
    '<div id="pgStampSection" style="margin-top:14px;padding-top:12px;border-top:1px dashed #cbd5d1">' +
    '<h4 style="margin:0 0 6px;font-size:15px">🏷️ ตรายาง 3D เยลลี่ / ตราประทับตรวจการบ้าน</h4>' +
    '<select id="pgStampChoice" style="width:100%;padding:10px;border-radius:12px;border:1px solid #d1d5db;background:#fff;font-size:14px">' +
    '<option value="none">-- ไม่มีตราประทับ --</option>' +
    '<option value="gold|เก่งมาก 🌟">🌟 เก่งมาก (สีทองหวาน)</option>' +
    '<option value="coral|ดีเยี่ยม 💯">💯 ดีเยี่ยม (สีคอรัล)</option>' +
    '<option value="rose|ผ่านฉลุย 💕">💕 ผ่านฉลุย (สีชมพูพาสเทล)</option>' +
    '<option value="teal|เกรด A+ 👑">👑 เกรด A+ (สีเขียวเอเมอรัลด์)</option>' +
    '<option value="purple|ตรวจแล้ว ✨">✨ ตรวจแล้ว (สีม่วงลาเวนเดอร์)</option>' +
    '<option value="sky|ยอดเยี่ยม 🚀">🚀 ยอดเยี่ยม (สีฟ้าสดใส)</option>' +
    '<option value="custom">✏️ พิมพ์ข้อความเอง...</option>' +
    '</select>' +
    '<div id="pgCustomStampWrap" style="display:none;margin-top:8px">' +
    '<input type="text" id="pgCustomStampText" placeholder="ข้อความตรายาง เช่น ยอดเยี่ยมมาก 👏" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:10px;font-size:13px">' +
    '</div></div>';
  box.appendChild(sec);

  ids.forEach(id => { if (typeof inputsToSave !== 'undefined' && !inputsToSave.includes(id)) inputsToSave.push(id); });

  const FIELDS = {
    name: 'ชื่อ: <input type="text">',
    cls: 'ชั้น: <input type="text" size="6">',
    no: 'เลขที่: <input type="text" size="4">',
    date: 'วันที่: <input type="text" size="8">'
  };

  function speakText(txt) {
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(txt.trim());
      if (/[\u0E00-\u0E7F]/.test(txt)) u.lang = 'th-TH';
      else if (/[\uAC00-\uD7AF]/.test(txt)) u.lang = 'ko-KR';
      else if (/[\u3040-\u30FF\u4E00-\u9FAF]/.test(txt)) u.lang = 'ja-JP';
      else if (/[\u4E00-\u9FFF]/.test(txt)) u.lang = 'zh-CN';
      else u.lang = 'en-US';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    } catch(e) {}
  }

  function applyEnhancements() {
    const root = document.documentElement, on = {};
    OPTS.forEach(o => {
      const e = $('pgHide_' + o[0]), v = !!(e && e.checked);
      on[o[0]] = v;
      root.classList.toggle('pg-h-' + o[0], v);
    });
    if (on.hMetaName || on.hMetaClass || on.hMetaNo || on.hMetaDate) {
      const row1 = on.hMetaName ? '' : FIELDS.name;
      const row2 = [on.hMetaClass ? '' : FIELDS.cls, on.hMetaNo ? '' : FIELDS.no, on.hMetaDate ? '' : FIELDS.date].filter(Boolean).join(' ');
      const html = [row1, row2].filter(Boolean).join('<br>');
      document.querySelectorAll('.page-meta').forEach(m => {
        m.innerHTML = html;
        m.style.display = html ? '' : 'none';
      });
    }

    // 3D Jelly stamp injection
    const sc = $('pgStampChoice');
    const stampVal = sc ? sc.value : 'none';
    let stampText = '', stampColor = 'coral';
    if (stampVal === 'custom') {
      const ct = $('pgCustomStampText');
      stampText = ct ? ct.value.trim() : '';
      stampColor = 'rose';
    } else if (stampVal && stampVal !== 'none') {
      const parts = stampVal.split('|');
      stampColor = parts[0];
      stampText = parts[1] || '';
    }

    document.querySelectorAll('.page-header').forEach(h => {
      let st = h.querySelector('.pg-jelly-stamp');
      if (!stampText) {
        if (st) st.remove();
      } else {
        if (!st) {
          st = document.createElement('div');
          h.appendChild(st);
        }
        st.className = 'pg-jelly-stamp pg-jelly-' + stampColor;
        st.innerHTML = '<span>' + stampText + '</span>';
      }
    });

    // Pronunciation Speaker Button injection (non-print)
    document.querySelectorAll('.example-card').forEach(c => {
      const main = c.querySelector('.example-main');
      if (!main || main.querySelector('.pg-speech-btn')) return;
      const word = main.textContent.trim();
      if (!word) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pg-speech-btn';
      btn.title = 'ฟังเสียงอ่าน: ' + word;
      btn.textContent = '🔊';
      btn.onclick = e => { e.stopPropagation(); speakText(word); };
      main.appendChild(btn);
    });

    document.querySelectorAll('.cmp-card').forEach(c => {
      const txt = c.querySelector('.cmp-txt');
      if (!txt || txt.querySelector('.pg-speech-btn')) return;
      const word = txt.textContent.trim();
      if (!word) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pg-speech-btn';
      btn.title = 'ฟังเสียงอ่าน: ' + word;
      btn.textContent = '🔊';
      btn.onclick = e => { e.stopPropagation(); speakText(word); };
      txt.appendChild(btn);
    });
  }

  const baseRender = render;
  render = function () { baseRender(); applyEnhancements(); };

  ids.forEach(id => { const e = $(id); if (e) e.addEventListener('change', () => render()); });
  const setMany = (keys, val) => { keys.forEach(k => { const e = $('pgHide_' + k); if (e) e.checked = val; }); render(); };
  $('pgHideHints').onclick = () => setMany(['hRoman', 'hMeaning', 'hIcon'], true);
  $('pgHideChrome').onclick = () => setMany(['hSub', 'hPageNo', 'hFooter'], true);
  $('pgShowAll').onclick = () => setMany(OPTS.map(o => o[0]), false);

  if ($('pgStampChoice')) {
    $('pgStampChoice').addEventListener('change', e => {
      if ($('pgCustomStampWrap')) $('pgCustomStampWrap').style.display = e.target.value === 'custom' ? 'block' : 'none';
      render();
    });
  }
  if ($('pgCustomStampText')) {
    $('pgCustomStampText').addEventListener('input', () => render());
  }

  /* ปุ่มซ่อนแผงตั้งค่าเพื่อดูใบงานเต็มจอ (เดสก์ท็อป) */
  const fb = document.createElement('button');
  fb.type = 'button';
  fb.className = 'pg-focus-btn';
  const setFb = () => { fb.textContent = document.documentElement.classList.contains('pg-focus') ? '⚙️ แสดงแผงตั้งค่า' : '🙈 ซ่อนแผงตั้งค่า'; };
  fb.onclick = () => { document.documentElement.classList.toggle('pg-focus'); setFb(); if (typeof fitPreview === 'function') fitPreview(); };
  setFb();
  document.body.appendChild(fb);

  render();
};

/* ---------- ครึ่งหลัง: โหมดกิจกรรมใหม่ + ตัวเลือกใบงานเพิ่มเติม (ฉีดเข้า iframe ก่อน worksheetCode) ---------- */
window.PG_WS_HALF2 = function () {
  const $ = id => document.getElementById(id);
  const controls = document.querySelector('.controls');
  const modeSel = $('worksheetMode');
  if (!controls || !modeSel || $('pgHalf2Section')) return;
  const esc = escapeHtml, h = stableHash;

  /* ----- โหมดใหม่ ----- */
  const NEWMODES = [
    ['cloze', 'เติมคำในประโยค (Cloze)'],
    ['mcq', 'ปรนัยเลือกคำตอบ'],
    ['tf', 'ถูก / ผิด'],
    ['dictation', 'ฟังแล้วเขียน (ครูอ่านให้)'],
    ['wordsearch', 'ค้นหาคำศัพท์ (Word Search)'],
    ['crossword', 'อักษรไขว้ (Crossword)'],
    ['grid', '▦ ตารางคัดทีละตัว (แบบใบคัดลายมือ)']
  ];
  NEWMODES.forEach(m => { const o = document.createElement('option'); o.value = m[0]; o.textContent = m[1]; modeSel.appendChild(o); });
  const isNew = v => NEWMODES.some(m => m[0] === v);

  /* ----- แผงตั้งค่า ----- */
  const sec = document.createElement('div');
  sec.id = 'pgHalf2Section';
  const row = (inner) => '<div class="row">' + inner + '</div>';
  const fld = (label, inner) => '<div><label>' + label + '</label>' + inner + '</div>';
  const sel = (id, opts, val) => '<select id="pg2_' + id + '">' + opts.map(o => '<option value="' + o[0] + '"' + (o[0] === val ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>';
  sec.innerHTML =
    '<h4 style="margin:14px 0 6px;font-size:15px">🧩 กิจกรรมใหม่และตัวเลือกใบงาน</h4>' +
    row(fld('ชื่อวิชา / หัวข้อ', '<input type="text" id="pg2_subject" placeholder="เช่น ภาษาอังกฤษ ป.3">') + fld('ชื่อครู', '<input type="text" id="pg2_teacher" placeholder="เช่น ครูสมชาย">')) +
    row(fld('ชุดข้อสอบ', sel('version', [['', 'ไม่ระบุ'], ['A', 'ชุด A (ลำดับเดิม)'], ['B', 'ชุด B (สลับลำดับ)'], ['C', 'ชุด C (สลับลำดับ)'], ['D', 'ชุด D (สลับลำดับ)']], '')) + fld('ชื่อไฟล์ที่บันทึก', '<input type="text" id="pg2_filename" placeholder="worksheet">')) +
    '<label class="checkbox-group"><input type="checkbox" id="pg2_shuffle" checked><span>ชุด B/C/D ให้สลับลำดับคำอัตโนมัติ (กันลอกกัน)</span></label>' +
    row(fld('ความหนาเส้น: <strong><span id="pg2_lineWV">1</span> px</strong>', '<input type="range" id="pg2_lineW" min="1" max="4" step="0.5" value="1">')) +
    '<label class="checkbox-group"><input type="checkbox" id="pg2_fade"><span>ตัวอย่างค่อยๆ จางลงทีละแถว (ใช้กับโหมดคัดตามรอย)</span></label>' +
    /* ตัวเลือกเฉพาะโหมด */
    '<div data-pg2="cloze mcq tf dictation">' + row(fld('ข้อต่อหน้า', sel('items', [['', 'อัตโนมัติ'], ['4', '4'], ['6', '6'], ['8', '8'], ['10', '10'], ['12', '12']], ''))) + '</div>' +
    '<div data-pg2="mcq">' + row(fld('จำนวนตัวเลือก', sel('choices', [['3', '3'], ['4', '4'], ['5', '5']], '4')) + fld('รูปแบบโจทย์', sel('dir', [['w2m', 'ให้คำ → เลือกคำแปล'], ['m2w', 'ให้คำแปล → เลือกคำ']], 'w2m'))) + '</div>' +
    '<div data-pg2="cloze"><label>ประโยคตัวอย่าง (1 ประโยคต่อบรรทัด ต้องมีคำศัพท์อยู่ในประโยค) — ถ้าไม่ใส่ จะใช้คำแปลเป็นโจทย์แทน</label><textarea id="pg2_sentences" rows="4" style="font-size:14px" placeholder="I have a cat.&#10;The dog is big."></textarea><label class="checkbox-group"><input type="checkbox" id="pg2_bank" checked><span>แสดงกรอบคำให้เลือกบนหัวหน้า</span></label></div>' +
    '<div data-pg2="dictation">' + row(fld('จำนวนบรรทัดต่อคำ', sel('dictLines', [['1', '1'], ['2', '2']], '1'))) + '<label class="checkbox-group"><input type="checkbox" id="pg2_dictHint"><span>แสดงคำแปล/อิโมจิเป็นคำใบ้</span></label></div>' +
    '<div data-pg2="wordsearch">' + row(fld('ขนาดตาราง', sel('wsSize', [['10', '10×10'], ['12', '12×12'], ['14', '14×14']], '12')) + fld('จำนวนคำต่อตาราง', sel('wsCount', [['6', '6'], ['8', '8'], ['10', '10'], ['12', '12']], '8'))) +
    row(fld('ระดับความยาก', sel('wsLevel', [['easy', 'ง่าย (→ ↓)'], ['medium', 'กลาง (+ แนวทแยง)'], ['hard', 'ยาก (ทุกทิศ รวมย้อนกลับ)']], 'easy'))) +
    '<label class="checkbox-group"><input type="checkbox" id="pg2_wsHint"><span>รายการด้านล่างแสดงคำแปลแทนคำศัพท์ (ยากขึ้น)</span></label></div>' +
    '<div data-pg2="crossword">' + row(fld('จำนวนคำต่อใบ', sel('cwCount', [['6', '6'], ['8', '8'], ['10', '10'], ['12', '12']], '8'))) + '</div>' +
    '<div data-pg2="grid"><h4 style="margin:12px 0 6px;font-size:14px">▦ ตารางคัดทีละตัว: 1 บรรทัดในรายการคำ = 1 แถว</h4>' +
    row(fld('รูปแบบตาราง', sel('gLayout', [['char', 'ทีละตัวอักษร (พยัญชนะ/อักษรจีน/ฮิรางานะ)'], ['vocab', 'ตารางคัดคำศัพท์ (รูป + คำ + คัดตามรอย)'], ['lcwc', 'ดู–ปิด–เขียน–ตรวจ (ฝึกสะกดคำ)'], ['meaning', 'ดูคำแปลแล้วเขียนคำเอง (ทดสอบ)'], ['notes', 'สมุดจดคำศัพท์ (คำ/คำอ่าน/แปล/ประโยค)']], 'char'))) +
    row(fld('📚 ชุดสำเร็จรูป', sel('gPreset', [['', '-- เลือกชุด --'], ['th', 'ไทย: พยัญชนะ ก–ฮ'], ['en', 'อังกฤษ: Aa–Zz'], ['zh', 'จีน: อักษรพื้นฐาน 汉字'], ['ja', 'ญี่ปุ่น: ฮิรางานะ 46 ตัว'], ['ko', 'เกาหลี: พยัญชนะและสระ']], ''))) +
    row(fld('ป้ายกำกับซ้าย', sel('gLabel', [['thai', 'คำแปลไทย'], ['pron', 'คำอ่าน'], ['english', 'อังกฤษ'], ['none', 'ไม่มี']], 'thai')) + fld('รูปแบบช่อง', sel('gCell', [['auto', 'อัตโนมัติตามภาษา'], ['lines', 'เส้นบรรทัด'], ['mi', 'ช่องมีเส้นทแยง 米字格'], ['cross', 'ช่องกากบาท 十字'], ['plain', 'ช่องเปล่า']], 'auto'))) +
    row(fld('ลากตามรอย', sel('gTrace', [['0', '0'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4']], '3')) + fld('เขียนเอง', sel('gBlank', [['0', '0'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['6', '6'], ['8', '8'], ['10', '10']], '4')) + fld('แถวต่อหน้า', sel('gRows', [['', 'อัตโนมัติ'], ['10', '10'], ['12', '12'], ['15', '15'], ['20', '20'], ['26', '26']], ''))) +
    row(fld('ผสมพยัญชนะ + สระไทย (พิมพ์พยัญชนะ)', '<input type="text" id="pg2_gCons" value="กข" placeholder="เช่น กขค">') + '<div style="flex:0 0 auto;min-width:0"><label>&nbsp;</label><button type="button" id="pg2_gMixBtn" style="min-width:0;padding:10px 14px">สร้างรายการ</button></div>') + '</div>' +
    '<div class="pg-quick" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button type="button" id="pg2_printKey" style="min-width:0;flex:1 1 180px;padding:10px;font-size:13px;background:#e5e7eb;color:#374151">🖨️ พิมพ์เฉพาะหน้าเฉลย</button></div>' +
    '<p class="hint" style="font-size:12px;color:#6b7280;margin-top:6px">โหมดใหม่จะมีหน้าเฉลยเมื่อติ๊ก “เพิ่มหน้าเฉลยท้ายไฟล์” ด้านบน</p>';
  controls.appendChild(sec);

  const P2 = ['gLayout', 'gLabel', 'gCell', 'gTrace', 'gBlank', 'gRows', 'subject', 'teacher', 'version', 'filename', 'shuffle', 'lineW', 'fade', 'items', 'choices', 'dir', 'sentences', 'bank', 'dictLines', 'dictHint', 'wsSize', 'wsCount', 'wsLevel', 'wsHint', 'cwCount'].map(x => 'pg2_' + x);
  P2.forEach(id => { if (typeof inputsToSave !== 'undefined' && !inputsToSave.includes(id)) inputsToSave.push(id); });

  /* ----- CSS ----- */
  const css = document.createElement('style');
  css.textContent =
    '.trace-lines div{height:var(--pg-line-w,1px)}.trace-lines::after{height:var(--pg-line-w,1px)!important}.trace-cell-cross{border-width:var(--pg-line-w,1px)}' +
    '.pg-teach{font-size:12px;color:#374151;margin-top:2px}' +
    '.pg-q{display:grid;grid-template-columns:30px minmax(0,1fr);gap:6px;padding:8px 0;border-bottom:1px dashed #cbd5e1;break-inside:avoid}' +
    '.pg-qn{font-weight:700;color:#475569}.pg-qt{font-size:18px;font-weight:700;overflow-wrap:anywhere;font-family:"Noto Sans KR","Malgun Gothic","Apple SD Gothic Neo",Tahoma,sans-serif}' +
    '.pg-opts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px 16px;margin-top:6px;font-size:15px}' +
    '.pg-opt{display:flex;gap:7px;align-items:flex-start;overflow-wrap:anywhere}.pg-opt i{flex:none;width:16px;height:16px;border:2px solid #64748b;border-radius:50%;margin-top:3px}' +
    '.pg-tf{display:flex;justify-content:space-between;gap:12px;align-items:center}.pg-tfo{display:flex;gap:16px;font-size:15px;white-space:nowrap}.pg-tfo i{display:inline-block;width:16px;height:16px;border:2px solid #64748b;border-radius:50%;vertical-align:-3px;margin-right:5px}' +
    '.pg-blank{display:inline-block;min-width:90px;border-bottom:2px solid #334155;height:1.1em;vertical-align:baseline;margin:0 4px}.pg-blank.wide{min-width:180px}' +
    '.pg-sent{font-size:18px;line-height:1.7;overflow-wrap:anywhere}.pg-hint{font-size:14px;color:#6b7280}' +
    '.pg-bank{border:1.5px solid #94a3b8;border-radius:8px;padding:8px 12px;font-size:16px;display:flex;flex-wrap:wrap;gap:6px 18px;background:#f8fafc}.pg-bank b{font-weight:700}' +
    '.pg-wl{height:45px}.pg-wl .trace-lines{max-width:none}.pg-dh{font-size:15px;color:#475569;margin-bottom:2px}' +
    '.pg-ws{display:grid;margin:6px auto;width:min(100%,var(--ws-w,120mm));border-left:1px solid #94a3b8;border-top:1px solid #94a3b8}' +
    '.pg-ws span{aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;border-right:1px solid #94a3b8;border-bottom:1px solid #94a3b8;font-weight:600;font-family:"Noto Sans KR","Malgun Gothic",Tahoma,sans-serif}' +
    '.pg-ws span.hit{background:#fde68a}' +
    '.pg-wlist{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px 14px;margin-top:10px;font-size:15px}.pg-wlist div{display:flex;gap:6px;align-items:center;overflow-wrap:anywhere}.pg-wlist i{flex:none;width:13px;height:13px;border:2px solid #64748b;border-radius:3px}' +
    '.pg-cw{display:grid;margin:6px auto;justify-content:center}.pg-cw div{position:relative;border:1.5px solid #334155;background:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-family:"Noto Sans KR","Malgun Gothic",Tahoma,sans-serif}.pg-cw div.e{border:none;background:transparent}.pg-cw small{position:absolute;top:1px;left:2px;font-size:9px;font-weight:600;color:#475569}' +
    '.pg-clues{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;margin-top:10px;font-size:14px}.pg-clues h4{margin:0 0 4px;font-size:14px;border-bottom:1px solid #cbd5e1}.pg-clues div{padding:2px 0;overflow-wrap:anywhere}' +
    '@media print{html.pg-only-key .page-a4:not(.pg-keypage){display:none!important}}';
  document.head.appendChild(css);

  /* ----- helpers ----- */
  const rng = seed => { let a = h(String(seed)) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const mean = r => r.thai || r.english || '';
  const chunk = (arr, n) => { const o = []; for (let i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n)); return o; };
  const LET = i => String.fromCharCode(65 + i);
  const parse = () => $('wordsInput').value.split(/\r?\n/).filter(l => l.trim()).map(line => {
    const p = line.split('|').map(x => x.trim());
    return { word: p[0] || '', pron: p[1] || '', thai: p[2] || '', emoji: p[3] || '', img: p[4] || '', english: p[5] || '', sentence: p[6] || '' };
  }).filter(r => r.word);
  const norm = w => [...String(w).replace(/[\s\-'’.,!?\/()·]+/g, '')].map(c => c.toUpperCase());
  const note = t => '<div class="match-instructions" style="margin-top:8px">' + t + '</div>';
  const keyPages = (items, render) => chunk(items, 24).map(part => ({ key: true, html: '<div class="match-instructions">เฉลย</div><div class="answer-key-list">' + part.map(render).join('') + '</div>' }));

  /* ----- ตัวสร้างแต่ละโหมด ----- */
  function mcq(recs) {
    const dir = $('pg2_dir').value, nCh = parseInt($('pg2_choices').value) || 4;
    const pool = recs.filter(r => mean(r));
    const items = [];
    pool.forEach(r => {
      const correct = dir === 'w2m' ? mean(r) : r.word;
      const stem = dir === 'w2m' ? r.word : (r.emoji ? r.emoji + ' ' : '') + mean(r);
      const seen = new Set([correct]), dist = [];
      pool.filter(o => o !== r).sort((a, b) => h(r.word + '|' + a.word) - h(r.word + '|' + b.word)).forEach(o => {
        const t = dir === 'w2m' ? mean(o) : o.word;
        if (dist.length < nCh - 1 && !seen.has(t)) { seen.add(t); dist.push(t); }
      });
      if (!dist.length) return;
      const opts = [correct, ...dist].sort((a, b) => h(r.word + '#' + a) - h(r.word + '#' + b));
      items.push({ stem, opts, ans: opts.indexOf(correct), r });
    });
    const per = parseInt($('pg2_items').value) || (nCh >= 5 ? 6 : 8);
    let n = 0;
    const pages = chunk(items, per).map(part => ({
      html: '<div class="match-instructions">เลือกคำตอบที่ถูกต้องที่สุด 1 ข้อ</div>' + part.map(it => {
        n++;
        return '<div class="pg-q"><span class="pg-qn">' + n + '.</span><div><div class="pg-qt">' + esc(it.stem) + '</div><div class="pg-opts">' +
          it.opts.map((o, i) => '<div class="pg-opt"><i></i><span>' + LET(i) + '. ' + esc(o) + '</span></div>').join('') + '</div></div></div>';
      }).join('')
    }));
    if (recs.length > items.length) pages.length && (pages[pages.length - 1].html += note('ข้าม ' + (recs.length - items.length) + ' คำที่ไม่มีคำแปลหรือตัวเลือกไม่พอ'));
    const key = items.map((it, i) => ({ i: i + 1, it }));
    return { pages, keys: keyPages(key, k => '<div class="answer-key-item"><b>' + k.i + '.</b> ' + LET(k.it.ans) + '. ' + esc(k.it.opts[k.it.ans]) + '</div>') };
  }

  function tf(recs) {
    const pool = recs.filter(r => mean(r));
    const items = pool.map(r => {
      let truth = h('tf|' + r.word) % 2 === 0, shown = mean(r);
      if (!truth) {
        const alt = pool.filter(o => mean(o) !== mean(r)).sort((a, b) => h(r.word + '~' + a.word) - h(r.word + '~' + b.word))[0];
        if (alt) shown = mean(alt); else truth = true;
      }
      return { r, shown, truth };
    });
    const per = parseInt($('pg2_items').value) || 12;
    let n = 0;
    const pages = chunk(items, per).map(part => ({
      html: '<div class="match-instructions">อ่านแล้วทำเครื่องหมายว่าข้อความถูกหรือผิด</div>' + part.map(it => {
        n++;
        return '<div class="pg-q"><span class="pg-qn">' + n + '.</span><div class="pg-tf"><span class="pg-qt">' + esc(it.r.word) + ' = ' + esc(it.shown) + '</span><span class="pg-tfo"><span><i></i>ถูก</span><span><i></i>ผิด</span></span></div></div>';
      }).join('')
    }));
    if (recs.length > items.length) pages.length && (pages[pages.length - 1].html += note('ข้าม ' + (recs.length - items.length) + ' คำที่ไม่มีคำแปล'));
    return { pages, keys: keyPages(items.map((it, i) => ({ i: i + 1, it })), k => '<div class="answer-key-item"><b>' + k.i + '.</b> ' + (k.it.truth ? 'ถูก' : 'ผิด → ' + esc(k.it.r.word) + ' = ' + esc(mean(k.it.r))) + '</div>') };
  }

  function findSentence(r, sents) {
    if (r.sentence) return r.sentence;
    const w = r.word.toLowerCase();
    const latin = /^[a-z0-9' -]+$/i.test(w);
    return sents.find(s => latin ? new RegExp('(^|[^a-z0-9])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9])', 'i').test(s) : s.indexOf(r.word) >= 0) || '';
  }
  function blankSentence(s, word) {
    const w = word.toLowerCase(), latin = /^[a-z0-9' -]+$/i.test(w);
    let idx = -1;
    if (latin) { const m = new RegExp('(^|[^a-z0-9])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9])', 'i').exec(s); if (m) idx = m.index + m[1].length; }
    else idx = s.indexOf(word);
    if (idx < 0) return null;
    return esc(s.slice(0, idx)) + '<span class="pg-blank"></span>' + esc(s.slice(idx + word.length));
  }
  function cloze(recs) {
    const sents = $('pg2_sentences').value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    const per = parseInt($('pg2_items').value) || 8, bank = $('pg2_bank').checked;
    let n = 0, fallback = 0;
    const pages = chunk(recs, per).map(part => {
      const words = part.map(r => r.word).sort((a, b) => h('bk' + a) - h('bk' + b));
      return {
        html: '<div class="match-instructions">เติมคำศัพท์ที่เหมาะสมลงในช่องว่าง</div>' + (bank ? '<div class="pg-bank">' + words.map(w => '<b>' + esc(w) + '</b>').join('') + '</div>' : '') +
          part.map(r => {
            n++;
            const s = findSentence(r, sents), b = s ? blankSentence(s, r.word) : null;
            let body;
            if (b) body = '<div class="pg-sent">' + b + '</div>' + (mean(r) ? '<div class="pg-hint">(' + esc(mean(r)) + ')</div>' : '');
            else { fallback++; body = '<div class="pg-sent">' + (r.emoji ? esc(r.emoji) + ' ' : '') + '<span class="pg-hint">' + esc(mean(r) || '—') + '</span> → <span class="pg-blank wide"></span></div>'; }
            return '<div class="pg-q"><span class="pg-qn">' + n + '.</span><div>' + body + '</div></div>';
          }).join('')
      };
    });
    if (fallback && pages.length) pages[pages.length - 1].html += note(fallback + ' ข้อไม่มีประโยคตัวอย่างที่ตรงกัน จึงใช้คำแปลเป็นโจทย์ — เพิ่มประโยคในช่อง “ประโยคตัวอย่าง” ได้');
    return { pages, keys: keyPages(recs.map((r, i) => ({ i: i + 1, r })), k => '<div class="answer-key-item"><b>' + k.i + '.</b> ' + esc(k.r.word) + '</div>') };
  }

  function dictation(recs) {
    const per = parseInt($('pg2_items').value) || 6, lines = parseInt($('pg2_dictLines').value) || 1, hint = $('pg2_dictHint').checked;
    let n = 0;
    const line = '<div class="trace-row-lines pg-wl"><div class="trace-lines"><div class="top"></div><div class="mid"></div><div class="bot"></div></div></div>';
    const pages = chunk(recs, per).map(part => ({
      html: '<div class="match-instructions">ฟังครูอ่านออกเสียงแล้วเขียนคำศัพท์ลงในบรรทัด</div>' + part.map(r => {
        n++;
        return '<div class="pg-q"><span class="pg-qn">' + n + '.</span><div>' + (hint ? '<div class="pg-dh">' + esc(r.emoji || '') + ' ' + esc(mean(r)) + '</div>' : '') + line.repeat(lines) + '</div></div>';
      }).join('')
    }));
    return { pages, keys: keyPages(recs.map((r, i) => ({ i: i + 1, r })), k => '<div class="answer-key-item"><b>' + k.i + '.</b> ' + esc(k.r.word) + (k.r.pron ? ' <small>[' + esc(k.r.pron) + ']</small>' : '') + '</div>') };
  }

  function wordsearch(recs) {
    const size = parseInt($('pg2_wsSize').value) || 12, per = parseInt($('pg2_wsCount').value) || 8, lvl = $('pg2_wsLevel').value, hint = $('pg2_wsHint').checked;
    const DIRS = { easy: [[0, 1], [1, 0]], medium: [[0, 1], [1, 0], [1, 1]], hard: [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]] }[lvl] || [[0, 1], [1, 0]];
    const cand = recs.map(r => ({ r, ch: norm(r.word) })).filter(x => x.ch.length >= 2 && x.ch.length <= size);
    const skipped = recs.length - cand.length;
    const pages = [], keys = [];
    chunk(cand, per).forEach((grp, gi) => {
      const rand = rng(grp.map(x => x.r.word).join('|') + size + lvl);
      const g = new Array(size * size).fill(''), hit = new Array(size * size).fill(false), ok = [], miss = [];
      grp.slice().sort((a, b) => b.ch.length - a.ch.length).forEach(x => {
        for (let t = 0; t < 400; t++) {
          const d = DIRS[Math.floor(rand() * DIRS.length)], r0 = Math.floor(rand() * size), c0 = Math.floor(rand() * size);
          const r1 = r0 + d[0] * (x.ch.length - 1), c1 = c0 + d[1] * (x.ch.length - 1);
          if (r1 < 0 || c1 < 0 || r1 >= size || c1 >= size) continue;
          let fit = true;
          for (let i = 0; i < x.ch.length; i++) { const v = g[(r0 + d[0] * i) * size + c0 + d[1] * i]; if (v && v !== x.ch[i]) { fit = false; break; } }
          if (!fit) continue;
          for (let i = 0; i < x.ch.length; i++) { const k = (r0 + d[0] * i) * size + c0 + d[1] * i; g[k] = x.ch[i]; hit[k] = true; }
          ok.push(x); return;
        }
        miss.push(x);
      });
      const allLat = grp.every(x => x.ch.every(c => /^[A-Z]$/.test(c)));
      const pool = allLat ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('') : [...new Set(grp.flatMap(x => x.ch))];
      const cells = g.map(v => v || pool[Math.floor(rand() * pool.length)]);
      const fs = size >= 14 ? 16 : size >= 12 ? 18 : 20;
      const gridHtml = hl => '<div class="pg-ws" style="--ws-w:' + (size * 9.5) + 'mm;grid-template-columns:repeat(' + size + ',1fr);font-size:' + fs + 'px">' + cells.map((c, i) => '<span' + (hl && hit[i] ? ' class="hit"' : '') + '>' + esc(c) + '</span>').join('') + '</div>';
      const listHtml = '<div class="pg-wlist">' + ok.map(x => '<div><i></i>' + esc(hint ? (mean(x.r) || x.r.word) + ' (' + x.ch.length + ')' : x.r.word) + '</div>').join('') + '</div>';
      pages.push({ html: '<div class="match-instructions">หาคำศัพท์ในตารางให้พบ แล้ววงรอบคำ' + (lvl === 'easy' ? ' (อ่านจากซ้ายไปขวา หรือบนลงล่าง)' : lvl === 'medium' ? ' (ซ้าย→ขวา, บน→ล่าง และแนวทแยง)' : ' (อ่านได้ทุกทิศทาง รวมถึงย้อนกลับ)') + '</div>' + gridHtml(false) + listHtml + (miss.length ? note('วางคำเหล่านี้ลงตารางไม่ได้: ' + miss.map(x => esc(x.r.word)).join(', ')) : '') });
      keys.push({ key: true, html: '<div class="match-instructions">เฉลยตารางที่ ' + (gi + 1) + ' (ช่องสีเหลืองคือคำตอบ)</div>' + gridHtml(true) + '<div class="pg-wlist">' + ok.map(x => '<div><i></i>' + esc(x.r.word) + '</div>').join('') + '</div>' });
    });
    if (skipped && pages.length) pages[pages.length - 1].html += note('ข้าม ' + skipped + ' คำที่สั้นกว่า 2 ตัวอักษรหรือยาวเกินตาราง');
    return { pages, keys };
  }

  function crossword(recs) {
    const per = parseInt($('pg2_cwCount').value) || 8;
    const cand = recs.map(r => ({ r, ch: norm(r.word) })).filter(x => x.ch.length >= 2 && x.ch.length <= 14 && mean(x.r));
    const skipped = recs.length - cand.length;
    const pages = [], keys = [];
    chunk(cand, per).forEach((grp, gi) => {
      const N = 41, g = new Array(N * N).fill(''), get = (r, c) => (r < 0 || c < 0 || r >= N || c >= N) ? '' : g[r * N + c];
      const canPlace = (ch, r, c, d) => {
        const dr = d ? 1 : 0, dc = d ? 0 : 1, n = ch.length;
        if (r < 0 || c < 0 || r + dr * (n - 1) >= N || c + dc * (n - 1) >= N) return -1;
        if (get(r - dr, c - dc) || get(r + dr * n, c + dc * n)) return -1;
        let cross = 0;
        for (let i = 0; i < n; i++) {
          const rr = r + dr * i, cc = c + dc * i, cur = get(rr, cc);
          if (cur) { if (cur !== ch[i]) return -1; cross++; }
          else if (get(rr + dc, cc + dr) || get(rr - dc, cc - dr)) return -1;
        }
        return cross;
      };
      const put = (x, r, c, d) => { x.pos = { r, c, d }; for (let i = 0; i < x.ch.length; i++) g[(r + (d ? i : 0)) * N + c + (d ? 0 : i)] = x.ch[i]; };
      const sorted = grp.slice().sort((a, b) => b.ch.length - a.ch.length);
      put(sorted[0], 20, 20 - Math.floor(sorted[0].ch.length / 2), 0);
      let rest = sorted.slice(1), progress = true;
      while (rest.length && progress) {
        progress = false;
        const left = [];
        rest.forEach(x => {
          let best = null;
          sorted.filter(p => p.pos).forEach(p => {
            for (let i = 0; i < p.ch.length; i++) for (let j = 0; j < x.ch.length; j++) {
              if (p.ch[i] !== x.ch[j]) continue;
              const d = p.pos.d ? 0 : 1;
              const r = p.pos.d ? p.pos.r + i : p.pos.r - j + 0, c = p.pos.d ? p.pos.c - j : p.pos.c + i;
              const rr = d ? (p.pos.r - j) : r, cc = d ? (p.pos.c + i) : c;
              const sc = canPlace(x.ch, rr, cc, d);
              if (sc > 0 && (!best || sc > best.sc)) best = { sc, r: rr, c: cc, d };
            }
          });
          if (best) { put(x, best.r, best.c, best.d); progress = true; } else left.push(x);
        });
        rest = left;
      }
      const placed = sorted.filter(x => x.pos);
      let r0 = N, r1 = 0, c0 = N, c1 = 0;
      placed.forEach(x => { const e = { r: x.pos.r + (x.pos.d ? x.ch.length - 1 : 0), c: x.pos.c + (x.pos.d ? 0 : x.ch.length - 1) }; r0 = Math.min(r0, x.pos.r); c0 = Math.min(c0, x.pos.c); r1 = Math.max(r1, e.r); c1 = Math.max(c1, e.c); });
      const rows = r1 - r0 + 1, cols = c1 - c0 + 1;
      const starts = placed.slice().sort((a, b) => (a.pos.r - b.pos.r) || (a.pos.c - b.pos.c));
      const numAt = {}; let nn = 0;
      starts.forEach(x => { const k = x.pos.r + ',' + x.pos.c; if (!numAt[k]) numAt[k] = ++nn; x.num = numAt[k]; });
      const cs = Math.max(6, Math.min(10, 160 / Math.max(rows, cols)));
      const gridHtml = show => {
        let o = '<div class="pg-cw" style="grid-template-columns:repeat(' + cols + ',' + cs + 'mm);grid-auto-rows:' + cs + 'mm;font-size:' + Math.round(cs * 2.2) + 'px">';
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
          const v = g[r * N + c], n = numAt[r + ',' + c];
          o += v ? '<div>' + (n ? '<small>' + n + '</small>' : '') + (show ? esc(v) : '') + '</div>' : '<div class="e"></div>';
        }
        return o + '</div>';
      };
      const clue = x => '<div><b>' + x.num + '.</b> ' + (x.r.emoji ? esc(x.r.emoji) + ' ' : '') + esc(mean(x.r)) + ' (' + x.ch.length + ')</div>';
      const across = placed.filter(x => !x.pos.d).sort((a, b) => a.num - b.num), down = placed.filter(x => x.pos.d).sort((a, b) => a.num - b.num);
      const clues = '<div class="pg-clues"><div><h4>แนวนอน →</h4>' + across.map(clue).join('') + '</div><div><h4>แนวตั้ง ↓</h4>' + down.map(clue).join('') + '</div></div>';
      const unplaced = grp.filter(x => !x.pos);
      pages.push({ html: '<div class="match-instructions">ใช้คำใบ้ (คำแปล) เติมคำศัพท์ลงในตาราง ตัวเลขในวงเล็บคือจำนวนตัวอักษร</div>' + gridHtml(false) + clues + (unplaced.length ? note('จัดวางไม่ได้: ' + unplaced.map(x => esc(x.r.word)).join(', ')) : '') });
      keys.push({ key: true, html: '<div class="match-instructions">เฉลยอักษรไขว้ใบที่ ' + (gi + 1) + '</div>' + gridHtml(true) + '<div class="pg-clues"><div>' + across.map(x => '<div><b>' + x.num + '.</b> ' + esc(x.r.word) + '</div>').join('') + '</div><div>' + down.map(x => '<div><b>' + x.num + '.</b> ' + esc(x.r.word) + '</div>').join('') + '</div></div>' });
    });
    if (skipped && pages.length) pages[pages.length - 1].html += note('ข้าม ' + skipped + ' คำที่ไม่มีคำแปลเป็นคำใบ้ หรือสั้น/ยาวเกินไป');
    return { pages, keys };
  }

  /* ----- ▦ ตารางคัดทีละตัว (ตามแบบ PDF ใบคัดลายมือ) ----- */
  const gcss = document.createElement('style');
  gcss.textContent =
    '.pg-g{border-top:1px solid #dccbc6;border-left:1px solid #dccbc6;margin-top:2mm}.pg-g-r{display:grid}' +
    '.pg-g-r>div{border-right:1px solid #dccbc6;border-bottom:1px solid #dccbc6;min-width:0;overflow:hidden;display:flex;align-items:center;justify-content:center;line-height:1;font-weight:600;color:#1f1f1f;font-family:"Noto Sans Thai",Sarabun,"Noto Sans KR","Malgun Gothic","Noto Sans JP","Noto Sans SC",Tahoma,sans-serif}' +
    '.pg-g-r>.lb{font-size:3.3mm;font-weight:400;color:#444;text-align:center;padding:0 1mm;line-height:1.2;background:#fff}' +
    '.pg-g-r>.ex{background-color:#fde8e1}' +
    '.pg-g-r>.l{align-items:flex-start;padding-top:calc(var(--rh) * .2);background-image:linear-gradient(#e6aaa0,#e6aaa0),repeating-linear-gradient(90deg,#d8c6c1 0,#d8c6c1 1.2mm,transparent 1.2mm,transparent 2.4mm);background-size:100% 1px;background-repeat:no-repeat;background-position:0 68%,0 20%}' +
    '.pg-g-r>.x,.pg-g-r>.m{background-image:linear-gradient(#e8b9b0,#e8b9b0),linear-gradient(#e8b9b0,#e8b9b0);background-size:1px 100%,100% 1px;background-position:50% 0,0 50%;background-repeat:no-repeat}' +
    '.pg-g-r>.m{background-image:linear-gradient(#e8b9b0,#e8b9b0),linear-gradient(#e8b9b0,#e8b9b0),linear-gradient(to top right,transparent calc(50% - .5px),#efc9c2 calc(50% - .5px),#efc9c2 calc(50% + .5px),transparent calc(50% + .5px)),linear-gradient(to bottom right,transparent calc(50% - .5px),#efc9c2 calc(50% - .5px),#efc9c2 calc(50% + .5px),transparent calc(50% + .5px));background-size:1px 100%,100% 1px,100% 100%,100% 100%;background-position:50% 0,0 50%,0 0,0 0}' +
    '.pg-g-r>.in{flex-direction:column;align-items:flex-start;justify-content:center;gap:.5mm;padding:0 1.5mm;font-weight:400;text-align:left}.pg-g-r>.in b{font-size:4.4mm;font-weight:700;line-height:1.15}.pg-g-r>.in i{font-size:2.8mm;color:#777;font-style:normal}.pg-g-r>.in span{font-size:3.2mm;color:#444;line-height:1.15}.pg-g-r>.nm{font-size:3.2mm;font-weight:400;color:#888}.pg-g-r>.ck{color:#e3d3ce;font-size:4mm}.pg-g-r>.pc{font-size:6mm}.pg-g-r>.pc img{max-width:88%;max-height:88%;object-fit:contain}.pg-g-r>.tx{justify-content:flex-start;padding:0 1.5mm;font-weight:400;font-size:3.8mm}.pg-g-r.hd>div{background:#f6ece8;font-size:3mm;color:#6b5b55;font-weight:600;line-height:1.2;text-align:center;padding:0 .5mm}.pg-g-lg{display:flex;gap:3mm;align-items:center;font-size:3.2mm;color:#555}.pg-g-lg .b{display:inline-flex;align-items:center;justify-content:center;width:5.5mm;height:5.5mm;border:1px solid #dccbc6;font-size:3.4mm;color:#1f1f1f}.pg-g-lg .b.ex{background:#fde8e1}' +
    [['caveat', 'Caveat'], ['nanum-pen', 'Nanum Pen Script'], ['klee-one', 'Klee One'], ['yomogi', 'Yomogi'], ['ma-shan-zheng', 'Ma Shan Zheng']].map(f => '.font-' + f[0] + ' .pg-g-r>div:not(.lb){font-family:"' + f[1] + '",cursive}').join('');
  document.head.appendChild(gcss);

  function vocabGrid(recs, lay) {
    const PZ = { a4: [210, 297], a5: [148, 210], letter: [215.9, 279.4] }[$('paperSize').value] || [210, 297];
    const uw = PZ[0] - 20, uh = PZ[1] - 58 - 7;
    let nT = +$('pg2_gTrace').value, nB = +$('pg2_gBlank').value;
    if (lay === 'meaning') nT = 0;
    if (lay === 'notes') { nT = 0; nB = 0; }
    const rows = parseInt($('pg2_gRows').value) || { vocab: 12, lcwc: 14, meaning: 12, notes: 16 }[lay];
    const rh = Math.floor(uh / rows * 10) / 10;
    const OP = [.5, .3, .18, .1];
    const cjk = w => /[\u3040-\u9fff\uac00-\ud7ff]/.test(w);
    const pic = r => { const u = r.img && typeof cmpImgSrc === 'function' ? cmpImgSrc(r.img) : ''; return u ? '<img src="' + esc(u) + '" alt="">' : esc(r.emoji || ''); };
    const C = (w, head) => ({ w, head });
    let cols, cellW = 30;
    const fs = (w, cw) => Math.min(rh * .52, cw * .9 / (Math.max(1, [...w].length) * (cjk(w) ? 1 : .55))).toFixed(2) + 'mm';
    const guide = w => cjk(w) ? 'x' : 'l';
    const trace = (r, t) => '<div class="' + guide(r.word) + '" style="font-size:' + fs(r.word, cellW) + ';color:rgba(31,31,31,' + OP[Math.min(t, 3)] + ')">' + esc(r.word) + '</div>';
    const blank = r => '<div class="' + guide(r.word) + '"></div>';
    const info = r => '<div class="in"><b>' + esc(r.word) + '</b>' + (r.pron ? '<i>' + esc(r.pron) + '</i>' : '') + (mean(r) ? '<span>' + esc(mean(r)) + '</span>' : '') + '</div>';
    const fl = [];
    for (let t = 0; t < nT; t++) fl.push(['tr', t]);
    for (let b = 0; b < nB; b++) fl.push(['bl', b]);
    const flexHeads = fl.map(f => f[0] === 'tr' ? 'ลากตามรอย' : lay === 'lcwc' ? 'ปิดแล้วเขียน ' + (f[1] + 1) : lay === 'meaning' ? 'เขียนคำ' : 'เขียนเอง');
    let fixedW, lead;
    if (lay === 'vocab') { fixedW = 8 + 14 + 38; lead = [['8mm', '#', (r, i) => '<div class="nm">' + (i + 1) + '</div>'], ['14mm', 'รูป', r => '<div class="pc">' + pic(r) + '</div>'], ['38mm', 'คำศัพท์', info]]; }
    else if (lay === 'lcwc') { fixedW = 8 + 42 + 10; lead = [['8mm', '#', (r, i) => '<div class="nm">' + (i + 1) + '</div>'], ['42mm', 'ดู (ตัวอย่าง)', r => '<div class="ex in"><b>' + esc(r.word) + '</b>' + (mean(r) ? '<span>' + esc(mean(r)) + '</span>' : '') + '</div>']]; }
    else if (lay === 'meaning') { fixedW = 8 + 14 + 42 + 10; lead = [['8mm', '#', (r, i) => '<div class="nm">' + (i + 1) + '</div>'], ['14mm', 'รูป', r => '<div class="pc">' + pic(r) + '</div>'], ['42mm', 'คำแปล', r => '<div class="in"><b>' + esc(mean(r) || r.pron) + '</b></div>']]; }
    else { fixedW = 0; lead = null; }
    const tail = lay === 'lcwc' || lay === 'meaning' ? [['10mm', 'ตรวจ', () => '<div class="ck">✓</div>']] : [];
    if (fl.length) cellW = Math.max(8, (uw - fixedW) / fl.length);
    let head, tpl, one;
    if (lay === 'notes') {
      tpl = '8mm 1.1fr 1fr 1fr 1.7fr'; head = ['#', 'คำศัพท์', 'คำอ่าน', 'คำแปล', 'ตัวอย่างประโยค / บันทึก'];
      one = (r, i) => '<div class="nm">' + (i + 1) + '</div><div class="tx"><b>' + esc(r ? r.word : '') + '</b></div><div class="tx">' + esc(r ? r.pron : '') + '</div><div class="tx">' + esc(r ? mean(r) : '') + '</div><div class="p"></div>';
    } else {
      tpl = lead.map(c => c[0]).concat(fl.map(() => '1fr'), tail.map(c => c[0])).join(' ');
      head = lead.map(c => c[1]).concat(flexHeads, tail.map(c => c[1]));
      one = (r, i) => lead.map(c => c[2](r, i)).join('') + fl.map(f => f[0] === 'tr' ? trace(r, f[1]) : blank(r)).join('') + tail.map(c => c[2]()).join('');
    }
    const row = (inner, h, extra) => '<div class="pg-g-r' + (extra || '') + '" style="--rh:' + h + 'mm;height:' + h + 'mm;grid-template-columns:' + tpl + '">' + inner + '</div>';
    const hd = row(head.map(t => '<div>' + esc(t) + '</div>').join(''), 7, ' hd');
    const pages = [];
    for (let i = 0; i < recs.length; i += rows) {
      const part = recs.slice(i, i + rows), pad = lay === 'notes' ? rows - part.length : 0;
      pages.push({ html: '<div class="pg-g" style="margin-top:0">' + hd + part.map((r, j) => row(one(r, i + j), rh)).join('') + Array.from({ length: pad }, (_, j) => row(one(null, i + part.length + j), rh)).join('') + '</div>' });
    }
    return { pages, keys: [] };
  }

  function grid(recs) {
    const lay = $('pg2_gLayout').value;
    ['pg2_gPreset', 'pg2_gLabel', 'pg2_gCons'].forEach(id => { const e = $(id), r = e && e.closest('.row'); if (r) r.style.display = lay === 'char' ? '' : 'none'; });
    if (lay !== 'char') return vocabGrid(recs, lay);
    const PZ = { a4: [210, 297], a5: [148, 210], letter: [215.9, 279.4] }[$('paperSize').value] || [210, 297];
    const uw = PZ[0] - 20, uh = PZ[1] - 58;
    const nT = +$('pg2_gTrace').value, nB = +$('pg2_gBlank').value, lab = $('pg2_gLabel').value, cols = 1 + nT + nB;
    const fixed = parseInt($('pg2_gRows').value) || 0;
    const labs = recs.map(r => lab === 'none' ? '' : lab === 'pron' ? r.pron : lab === 'english' ? r.english : r.thai);
    const lw = lab === 'none' ? 0 : Math.max(18, Math.min(52, Math.max(0, ...labs.map(t => [...t].length)) * 2.6 + 4));
    const cw = (uw - lw) / cols;
    let k = $('pg2_gCell').value;
    if (k === 'auto') { const w = recs[0] ? recs[0].word : ''; k = /[\u4e00-\u9fff]/.test(w) ? 'mi' : /[\u3040-\u30ff\u3130-\u318f\uac00-\ud7ff]/.test(w) ? 'cross' : 'lines'; }
    const sq = k === 'mi' || k === 'cross';
    let rows, rh;
    if (sq) { rh = Math.floor(cw * 10) / 10; rows = Math.max(1, Math.floor(uh / rh)); if (fixed) rows = Math.min(fixed, rows); }
    else { rows = fixed || (recs[0] && /^[A-Za-z]/.test(recs[0].word) ? 26 : 20); rh = Math.floor(uh / rows * 10) / 10; }
    const cls = { lines: 'l', mi: 'm', cross: 'x', plain: 'p' }[k];
    const OP = [.5, .3, .18, .1];
    const one = (r, i) => {
      const n = [...r.word].length, fs = ((sq ? cw : rh) * (sq ? .62 : .6) * (n > 2 ? Math.max(.35, 2.2 / n) : 1)).toFixed(2) + 'mm';
      let h = '<div class="pg-g-r" style="--rh:' + rh + 'mm;height:' + rh + 'mm;grid-template-columns:' + (lw ? lw + 'mm ' : '') + 'repeat(' + cols + ',1fr)">';
      if (lw) h += '<div class="lb">' + esc(labs[i]) + '</div>';
      h += '<div class="ex ' + cls + '" style="font-size:' + fs + '">' + esc(r.word) + '</div>';
      for (let t = 0; t < nT; t++) h += '<div class="' + cls + '" style="font-size:' + fs + ';color:rgba(31,31,31,' + OP[Math.min(t, 3)] + ')">' + esc(r.word) + '</div>';
      for (let b = 0; b < nB; b++) h += '<div class="' + cls + '"></div>';
      return h + '</div>';
    };
    const g0 = recs[0] ? [...recs[0].word][0] : 'ก';
    const legend = '<div class="pg-g-lg"><span class="b ex">' + esc(g0) + '</span>ตัวอย่าง<span class="b" style="color:#bbb">' + esc(g0) + '</span>ลากตามรอย<span class="b"></span>เขียนเอง</div>';
    const pages = [];
    for (let i = 0; i < recs.length; i += rows) pages.push({ html: legend + '<div class="pg-g">' + recs.slice(i, i + rows).map((r, j) => one(r, i + j)).join('') + '</div>' });
    return { pages, keys: [] };
  }

  const GP = {
    th: ['คัดไทย: พยัญชนะ ก–ฮ', 'thai', 'lines', 'กไก่ ขไข่ ฃขวด คควาย ฅคน ฆระฆัง งงู จจาน ฉฉิ่ง ชช้าง ซโซ่ ฌเฌอ ญหญิง ฎชฎา ฏปฏัก ฐฐาน ฑมณโฑ ฒผู้เฒ่า ณเณร ดเด็ก ตเต่า ถถุง ททหาร ธธง นหนู บใบไม้ ปปลา ผผึ้ง ฝฝา พพาน ฟฟัน ภสำเภา มม้า ยยักษ์ รเรือ ลลิง วแหวน ศศาลา ษฤๅษี สเสือ หหีบ ฬจุฬา ออ่าง ฮนกฮูก', 1],
    en: ['คัดอังกฤษ: Aa–Zz', 'none', 'lines', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 2],
    zh: ['คัดจีน: อักษรพื้นฐาน 汉字', 'pron', 'mi', '一yī 二èr 三sān 十shí 人rén 大dà 小xiǎo 山shān 口kǒu 日rì 月yuè 水shuǐ 火huǒ 木mù 土tǔ', 3],
    ja: ['คัดญี่ปุ่น: ฮิรางานะ ひらがな', 'pron', 'cross', 'あa いi うu えe おo かka きki くku けke こko さsa しshi すsu せse そso たta ちchi つtsu てte とto なna にni ぬnu ねne のno はha ひhi ふfu へhe ほho まma みmi むmu めme もmo やya ゆyu よyo らra りri るru れre ろro わwa をwo んn', 4],
    ko: ['คัดเกาหลี: พยัญชนะและสระ 한글', 'pron', 'cross', 'ㄱ기역 ㄴ니은 ㄷ디귿 ㄹ리을 ㅁ미음 ㅂ비읍 ㅅ시옷 ㅇ이응 ㅈ지읒 ㅊ치읓 ㅋ키읔 ㅌ티읕 ㅍ피읖 ㅎ히읗 ㅏ아 ㅑ야 ㅓ어 ㅕ여 ㅗ오 ㅛ요 ㅜ우 ㅠ유 ㅡ으 ㅣ이', 5]
  };
  const setV = (id, v) => { const e = $(id); if (e) e.value = v; };
  function applyGrid(title, sub, lab, cell, lines) {
    setV('headerTitle', title); setV('headerSub', sub); setV('pg2_gLabel', lab); setV('pg2_gCell', cell);
    setV('pg2_gTrace', 3); setV('pg2_gBlank', cell === 'lines' ? 4 : 8); setV('pg2_gRows', '');
    $('wordsInput').value = lines.join('\n'); render();
  }
  $('pg2_gPreset').addEventListener('change', e => {
    const g = GP[e.target.value]; if (!g) return;
    const toks = g[3].indexOf(' ') > -1 || g[1] !== 'none' ? g[3].split(' ') : [...g[3]].map(c => c + c.toLowerCase());
    const lines = toks.map(t => { const a = [...t], w = a.shift(), r = a.join(''); return g[1] === 'none' ? t + '|||' : g[1] === 'thai' ? w + '||' + r : w + '|' + r; });
    applyGrid(g[0], 'ใบคัดลายมือ · ชุดที่ ' + g[4], g[1], g[2], lines);
  });
  const LD = { char: [3, 4], vocab: [2, 2], lcwc: [1, 3], meaning: [0, 2], notes: [0, 0] };
  $('pg2_gLayout').addEventListener('change', e => { const d = LD[e.target.value]; setV('pg2_gTrace', d[0]); setV('pg2_gBlank', d[1]); setV('pg2_gRows', ''); });
  $('pg2_gMixBtn').onclick = () => {
    const V = [['า', '-า', 'อา'], ['ิ', '◌ิ', 'อิ'], ['ี', '◌ี', 'อี'], ['ึ', '◌ึ', 'อึ'], ['ื', '◌ื', 'อือ'], ['ุ', '◌ุ', 'อุ'], ['ู', '◌ู', 'อู'], ['เ', 'เ-', 'เอ', 1], ['แ', 'แ-', 'แอ', 1], ['โ', 'โ-', 'โอ', 1], ['ใ', 'ใ-', 'ไม้ม้วน', 1], ['ไ', 'ไ-', 'ไม้มลาย', 1]];
    const cs = [...$('pg2_gCons').value.replace(/\s/g, '')]; if (!cs.length) return;
    applyGrid('ผสมพยัญชนะ + สระ: ภาษาไทย', 'ใบคัดผสมคำ · ชุดที่ 1', 'pron', 'lines', cs.flatMap(c => V.map(v => (v[3] ? v[0] + c : c + v[0]) + '|' + c + ' + ' + v[1] + ' ' + v[2])));
    setV('pg2_gBlank', 4);
  };

  const BUILD = { cloze, mcq, tf, dictation, wordsearch, crossword, grid };

  function buildNew(mode) {
    const recs = parse(), title = $('headerTitle').value, sub = $('headerSub').value;
    const res = BUILD[mode](recs);
    const list = res.pages.map(p => ({ html: p.html, key: false }));
    if ($('answerKeyAll').checked) res.keys.forEach(k => list.push({ html: k.html, key: true }));
    const total = list.length;
    $('pagesContainer').innerHTML = total ? list.map((p, i) =>
      '<div class="page-a4" data-page="' + (i + 1) + '"><div class="page-header"><div class="page-title"><h2>' + esc(title) + (p.key ? ' — เฉลย' : '') + '</h2><p>' + esc(sub) + '</p></div>' +
      '<div class="page-meta">ชื่อ: <input type="text"><br>ชั้น: <input type="text" size="6"> เลขที่: <input type="text" size="4"> วันที่: <input type="text" size="8"></div></div>' +
      '<div class="page-content">' + p.html + '</div><div class="page-footer"><div class="page-footer-left">Created with PolyglotWorksheet &amp; StudioPro</div><div class="page-footer-right">Page ' + (i + 1) + ' / ' + total + '</div></div></div>').join('')
      : '<div class="page-a4"><div class="page-content"><div class="match-instructions">ไม่มีคำที่ใช้กับกิจกรรมนี้ได้ — ตรวจรายการคำศัพท์ (ต้องมีคำแปลสำหรับบางโหมด)</div></div></div>';
  }

  /* ----- ห่อ render ----- */
  const baseRender = render;
  render = function () {
    const field = $('wordsInput'), orig = field.value, ver = $('pg2_version').value;
    try {
      if (ver && ver !== 'A' && $('pg2_shuffle').checked) {
        const ls = orig.split(/\r?\n/).filter(x => x.trim());
        field.value = ls.sort((a, b) => h(ver + '|' + a) - h(ver + '|' + b)).join('\n');
      }
      clampAllAround(baseRender);
      const mode = modeSel.value;
      if (isNew(mode)) buildNew(mode);
      post(mode, ver);
    } finally { field.value = orig; }
    if (typeof fitPreview === 'function') requestAnimationFrame(fitPreview);
  };

  function post(mode, ver) {
    document.documentElement.style.setProperty('--pg-line-w', ($('pg2_lineW').value || 1) + 'px');
    $('pg2_lineWV').textContent = $('pg2_lineW').value;
    sec.querySelectorAll('[data-pg2]').forEach(d => { d.style.display = d.getAttribute('data-pg2').split(' ').includes(mode) ? '' : 'none'; });
    const extra = [$('pg2_subject').value.trim() && 'วิชา: ' + $('pg2_subject').value.trim(), $('pg2_teacher').value.trim() && 'ครู: ' + $('pg2_teacher').value.trim()].filter(Boolean).join(' · ');
    document.querySelectorAll('.page-a4').forEach(pg => {
      const h2 = pg.querySelector('.page-title h2'), title = pg.querySelector('.page-title');
      if (h2 && /เฉลย/.test(h2.textContent)) pg.classList.add('pg-keypage');
      if (h2 && ver) h2.textContent += ' (ชุด ' + ver + ')';
      if (title && extra) { const p = document.createElement('p'); p.className = 'pg-teach'; p.textContent = extra; title.appendChild(p); }
    });
    if ($('pg2_fade').checked) {
      document.querySelectorAll('.trace-area-cross,.trace-area-lines').forEach(area => {
        [...area.children].forEach((rowEl, i) => { const o = Math.max(0.12, 1 - i * 0.22); rowEl.querySelectorAll('.char-example').forEach(e => { e.style.opacity = o; }); });
      });
    }
  }

  /* ----- ช่องเลื่อน → ช่องตัวเลข (ขยายขีดจำกัด) : [min, max, ค่าเริ่มต้น, step] ----- */
  const NUMS = { rowCount: [1, 30, 4], colCount: [1, 40, 12], rowGap: [0, 100, 10], letterGap: [-20, 100, 0], fontSize: [8, 150, 22], cellSize: [10, 100, 100], pg2_lineW: [1, 10, 1, 0.5] };
  const clampVal = id => {
    const e = $(id), n = NUMS[id]; let v = parseFloat(e.value);
    if (isNaN(v)) return null;
    v = Math.min(n[1], Math.max(n[0], v));
    return n[3] ? v : Math.round(v);
  };
  Object.keys(NUMS).forEach(id => {
    const e = $(id); if (!e) return;
    const n = NUMS[id];
    e.type = 'number'; e.min = n[0]; e.max = n[1]; e.step = n[3] || 1; e.setAttribute('inputmode', 'decimal');
    e.style.textAlign = 'center';
    e.addEventListener('change', () => { const v = clampVal(id); e.value = v === null ? n[2] : v; render(); });
  });
  const clampAllAround = fn => {
    const raw = {};
    Object.keys(NUMS).forEach(id => {
      const e = $(id); if (!e) return;
      raw[id] = e.value;
      const v = clampVal(id), use = v === null ? NUMS[id][2] : v;
      if (String(use) !== e.value) e.value = use;
    });
    try { fn(); } finally { Object.keys(raw).forEach(id => { const e = $(id); if (e && e.value !== raw[id] && document.activeElement === e) e.value = raw[id]; }); }
  };

  /* ตัวเลือกเดิมถูกผูกกับ render รุ่นเก่า → ผูกซ้ำให้เรียก render ตัวที่ห่อแล้ว (ไม่งั้นโหมดใหม่/ตัวเลือกเพิ่มเติมไม่ทำงานเมื่อกดเลือกจริง) */
  controls.querySelectorAll('input,select,textarea').forEach(el => {
    if (!el.id || el.id === 'preset' || el.type === 'file' || el.id.indexOf('pg2_') === 0 || el.id.indexOf('pgHide_') === 0) return;
    const ev = (el.type === 'range' || el.type === 'number' || el.type === 'text' || el.tagName === 'TEXTAREA') ? 'input' : 'change';
    el.addEventListener(ev, () => render());
  });

  /* ----- เหตุการณ์ ----- */
  P2.forEach(id => { const e = $(id); if (!e) return; e.addEventListener(e.type === 'checkbox' || e.tagName === 'SELECT' ? 'change' : 'input', () => render()); });
  $('pg2_fade').addEventListener('change', e => { if (e.target.checked && $('exampleMode').value !== 'all') { $('exampleMode').value = 'all'; render(); } });
  $('pg2_printKey').onclick = () => {
    if (!document.querySelector('.pg-keypage')) { alert('ยังไม่มีหน้าเฉลย — ติ๊ก “เพิ่มหน้าเฉลยท้ายไฟล์” (หรือ “เพิ่มหน้าเฉลยในไฟล์ที่พิมพ์”) ก่อน'); return; }
    document.documentElement.classList.add('pg-only-key');
    const done = () => { document.documentElement.classList.remove('pg-only-key'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
    setTimeout(done, 4000);
  };
  const baseSave = saveOut;
  saveOut = function (data, name, mime) {
    const c = ($('pg2_filename').value || '').trim().replace(/[\\\/:*?"<>|\s]+/g, '-').slice(0, 60);
    return baseSave(data, c ? name.replace(/^worksheet/, c) : name, mime);
  };
};
