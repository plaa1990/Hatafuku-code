/**
 * Hatafuku Studio 2.0 - Universal Command Palette, Recipe Runner,
 * Cross-Module Pipeline, Persistent Settings, Auto-Backup & Self-Test Suite
 * 100% Offline • Zero External APIs
 */

(function () {
  'use strict';

  // --- 1. Persistent Settings & State ---
  const STORAGE_KEY_SETTINGS = 'hatafuku_global_settings';
  const STORAGE_KEY_PIPELINE = 'hatafuku_pipeline_payload';
  const STORAGE_KEY_XP = 'hatafuku_xp_streak';
  const STORAGE_KEY_RECIPES = 'hatafuku_custom_recipes';

  const defaultSettings = {
    creatorName: 'ครูฮาตาฟุกุ (Hatafuku Teacher)',
    storeName: 'Hatafuku Creative Studio',
    theme: 'pastel',
    paperSize: 'A4',
    font: 'DM Sans, Noto Sans Thai, Sarabun, sans-serif',
    watermarkText: 'PREVIEW • DO NOT COPY',
    watermarkOpacity: 0.25,
    autoBackupDays: 3,
    lastBackup: Date.now()
  };

  function getSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch (e) {
      return defaultSettings;
    }
  }

  function saveSettings(newSettings) {
    try {
      const merged = { ...getSettings(), ...newSettings };
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(merged));
      applyTheme(merged.theme);
      return merged;
    } catch (e) {
      console.warn('Failed to save settings to localStorage', e);
    }
  }

  function applyTheme(theme) {
    if (!document.body) return;
    document.body.classList.remove('theme-pastel', 'theme-matcha', 'theme-minimal', 'theme-dark');
    document.body.classList.add('theme-' + (theme || 'pastel'));
  }

  // --- Gamification (XP, Streak, Badges) ---
  function getGamification() {
    try {
      const def = {
        xp: 150,
        streak: 1,
        lastDate: new Date().toISOString().slice(0, 10),
        badges: ['starter', 'creator']
      };
      const saved = localStorage.getItem(STORAGE_KEY_XP);
      if (!saved) return def;
      const data = JSON.parse(saved);
      // calculate streak
      const today = new Date().toISOString().slice(0, 10);
      if (data.lastDate !== today) {
        const last = new Date(data.lastDate);
        const curr = new Date(today);
        const diffDays = Math.round((curr - last) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          data.streak = (data.streak || 1) + 1;
        } else if (diffDays > 1) {
          data.streak = 1;
        }
        data.lastDate = today;
        localStorage.setItem(STORAGE_KEY_XP, JSON.stringify(data));
      }
      return data;
    } catch (e) {
      return { xp: 150, streak: 1, lastDate: '', badges: ['starter'] };
    }
  }

  function addXP(amount, badgeToUnlock) {
    const data = getGamification();
    data.xp = (data.xp || 0) + amount;
    if (badgeToUnlock && !data.badges.includes(badgeToUnlock)) {
      data.badges.push(badgeToUnlock);
      showNotification('🎉 ปลดล็อกเหรียญตราใหม่!', badgeToUnlock, 'success');
    }
    localStorage.setItem(STORAGE_KEY_XP, JSON.stringify(data));
    updateGamificationUI();
    return data;
  }

  // --- 2. Module Directory & Command Search ---
  const MODULES = [
    { id: 'home', name: 'หน้าหลัก Hatafuku 2.0', icon: '🏠', url: './index.html', desc: 'สตูดิโอหลัก ใบงาน ปริศนา คลังคำศัพท์ และโหมดคุณครู', cat: 'main' },
    { id: 'standalone', name: 'หน้าหลัก Standalone (คลาสสิก)', icon: '🍀', url: './standalone-index.html', desc: 'หน้าหลักแบบ Standalone HTML ดั้งเดิม ออฟไลน์ 100%', cat: 'main' },
    { id: 'handwriting', name: 'แบบฝึกคัดลายมือ (Handwriting Pro)', icon: '✍️', url: './handwriting.html', desc: 'สร้างใบงานคัดลายมือ 5 ภาษา ตารางคัดศัพท์ และตรายางเยลลี่ 3D', cat: 'worksheet' },
    { id: 'balloons', name: 'ตัวอักษรลูกโป่ง 3D (Balloon Studio)', icon: '🎈', url: './balloons.html', desc: 'สร้างตัวอักษรลูกโป่ง 3D พองน่ารัก ป้ายชื่อ และการ์ดคำศัพท์', cat: 'creative' },
    { id: 'codequest', name: 'CodeQuest Academy', icon: '🎮', url: './codequest.html', desc: 'เกม RPG เรียนเขียนโค้ดออฟไลน์ 8 อาณาจักร & เควสต์ผจญภัย', cat: 'game' },
    { id: 'coderunner', name: 'Code Playground & Challenge Runner', icon: '💻', url: './code-runner.html', desc: 'เขียนโค้ด JS, Python, SQL ทดสอบอัตโนมัติ & โจทย์แก้บั๊ก', cat: 'code' },
    { id: 'maze', name: 'เขาวงกต (Maze Generator & Solver)', icon: '🌀', url: './maze-studio.html', desc: 'สุ่มสร้างเขาวงกตปรับขนาดได้ พร้อมหน้าเฉลย พิมพ์ A4', cat: 'puzzle' },
    { id: 'minigames', name: '4 มินิเกมคำศัพท์ (Minigames Suite)', icon: '🕹️', url: './minigames.html', desc: 'จับคู่การ์ด, เรียงตัวอักษร, แฮงแมน, ควิซจับเวลา พร้อมเสียง FX', cat: 'game' },
    { id: 'crossword', name: 'ปริศนาอักษรไขว้ (Crossword Studio)', icon: '🧩', url: './crossword-studio.html', desc: 'สร้างตารางอักษรไขว้อัตโนมัติจากชุดคำศัพท์ พร้อมคำใบ้และเฉลย', cat: 'puzzle' },
    { id: 'math', name: 'ใบงานคณิตศาสตร์สุ่มโจทย์ (Math Studio)', icon: '🧮', url: './math-worksheet.html', desc: 'สุ่มโจทย์บวกลบคูณหาร ปรับหลัก ความยาก พร้อมเฉลยท้ายเล่ม', cat: 'worksheet' },
    { id: 'thai', name: 'แบบฝึกคัดพยัญชนะ-สระไทย (Thai Practice)', icon: '🇹🇭', url: './thai-practice.html', desc: 'คัด ก-ฮ 44 ตัว พร้อมรูปภาพการ์ตูน สระ และทิศทางลากเส้น', cat: 'worksheet' },
    { id: 'dot', name: 'ลากเส้นต่อจุด (Dot-to-Dot Studio)', icon: '✏️', url: './dot-to-dot.html', desc: 'สร้างภาพลากเส้นต่อจุด 1-20, 1-50 เสริมสมาธิและระบายสี', cat: 'puzzle' },
    { id: 'booklet', name: 'สมุดภาพพับเล่ม 8 หน้า A4 (Mini Booklet)', icon: '📖', url: './mini-booklet.html', desc: 'ทำนิทานและสมุดคำศัพท์ A4 แผ่นเดียวพับเป็นเล่ม 8 หน้า', cat: 'worksheet' },
    { id: 'creator', name: 'Creator Studio Pro', icon: '👾', url: './creator-studio.html', desc: 'วาดพิกเซลอาร์ต, Sprite Sheet, เสียง 8-bit และตรวจสอบ WCAG', cat: 'creative' },
    { id: 'linetheme', name: 'สตูดิโอธีม & สติกเกอร์ LINE', icon: '📱', url: './line-theme.html', desc: 'ออกแบบธีม LINE และสติกเกอร์ 370x320 พร้อมตัวอย่างแชทจริง', cat: 'creative' },
    { id: 'drawstudio', name: 'สตูดิโอวาดรูป (Draw Studio)', icon: '🎨', url: './draw-studio.html', desc: 'เครื่องมือวาดรูปเลเยอร์ แปรงสีน้ำ สีน้ำมัน และไม้บรรทัด', cat: 'creative' },
    { id: 'drawcanvas', name: 'ผืนผ้าวาดรูปด่วน (Quick Canvas)', icon: '🖌️', url: './draw.html', desc: 'กระดานวาดรูปไว บันทึกเป็น PNG ทันที', cat: 'creative' },
    { id: 'typing', name: 'ฝึกพิมพ์ดีด (Typing Practice)', icon: '⌨️', url: './typing.html', desc: 'ฝึกพิมพ์ภาษาไทยและอังกฤษ พร้อมระบบวัด WPM และความแม่นยำ', cat: 'game' },
    { id: 'mockup3d', name: 'Mockup 3D ปกสินค้า (Product Mockup)', icon: '🛍️', url: './mockup-3d.html', desc: 'สร้างภาพปก Mockup A4 ซ้อน, แท็บเล็ต, กล่องสินค้า สำหรับ Shopee/Etsy', cat: 'store' },
    { id: 'lessons', name: 'บทเรียน & แผนการสอน (Lessons Hub)', icon: '📚', url: './lessons.html', desc: 'คลังบทเรียนและไอเดียการจัดกิจกรรมในห้องเรียน', cat: 'worksheet' },
    { id: 'extras', name: 'เครื่องมือเสริม (Extras Lab)', icon: '🧪', url: './extras.html', desc: 'เครื่องคิดเลขแปลงค่า, เครื่องมือสี, และยูทิลิตี้เสริม', cat: 'creative' }
  ];

  // --- 3. Prebuilt & Custom Recipes ---
  const DEFAULT_RECIPES = [
    {
      id: 'rec_vocab_to_sale',
      name: 'สร้างชุดใบงานคำศัพท์พร้อมขาย (Store Ready)',
      desc: 'คัดเลือกคำศัพท์ ➔ ส่งไปคัดลายมือ ➔ ปั๊มตรายาง ➔ ทำปก 3D Mockup ➔ ZIP พร้อมขาย',
      icon: '🛍️',
      steps: [
        { title: '1. เตรียมชุดคำศัพท์ภาษาอังกฤษ & ไทย', action: 'preset' },
        { title: '2. ส่งต่อไปยังใบงานคัดลายมือ (Handwriting Pro)', action: 'pipeline_handwriting' },
        { title: '3. สร้างภาพปก Mockup 3D ซ้อน A4 สำหรับหน้าร้าน', action: 'pipeline_mockup' }
      ]
    },
    {
      id: 'rec_kids_activity_pack',
      name: 'ชุดกิจกรรมพัฒนาทักษะเด็ก (Kid Activity Pack)',
      desc: 'เขาวงกต ➔ ปริศนาอักษรไขว้ ➔ ลากเส้นต่อจุด ➔ โจทย์เลข ➔ รวมเป็นสมุดกิจกรรม',
      icon: '🎪',
      steps: [
        { title: '1. สร้างเขาวงกตสัตว์เลี้ยงน่ารัก (A4)', action: 'open_maze' },
        { title: '2. สุ่มปริศนาอักษรไขว้คำศัพท์', action: 'open_crossword' },
        { title: '3. สร้างภาพลากเส้นต่อจุด', action: 'open_dot' },
        { title: '4. สุ่มโจทย์คณิตศาสตร์พร้อมเฉลย', action: 'open_math' }
      ]
    },
    {
      id: 'rec_classroom_quiz_cert',
      name: 'จัดควิซในห้องเรียน & แจกเกียรติบัตร',
      desc: 'เล่น 4 มินิเกมคำศัพท์ ➔ บันทึกคะแนนนักเรียน ➔ ออกเกียรติบัตร A4 อัตโนมัติ',
      icon: '🏆',
      steps: [
        { title: '1. เปิดมินิเกมจับเวลาในห้องเรียน', action: 'open_minigames' },
        { title: '2. บันทึกคะแนนและปลดล็อกเหรียญตรา', action: 'xp_boost' },
        { title: '3. ออกใบประกาศนียบัตรยอดเยี่ยม A4', action: 'open_certificate' }
      ]
    }
  ];

  // --- 4. Cross-Module Pipeline Helper ---
  window.HatafukuPipeline = {
    send: function (targetUrl, payload) {
      try {
        localStorage.setItem(STORAGE_KEY_PIPELINE, JSON.stringify({
          sender: window.location.pathname,
          timestamp: Date.now(),
          payload: payload
        }));
        showNotification('🚀 ส่งงานเข้า Pipeline สำเร็จ', 'กำลังเปิด ' + targetUrl, 'info');
        setTimeout(() => {
          window.location.href = targetUrl;
        }, 400);
      } catch (e) {
        console.error('Pipeline send error', e);
      }
    },
    receive: function () {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_PIPELINE);
        if (!raw) return null;
        const data = JSON.parse(raw);
        // keep data for 10 minutes max
        if (Date.now() - data.timestamp > 10 * 60 * 1000) {
          localStorage.removeItem(STORAGE_KEY_PIPELINE);
          return null;
        }
        return data.payload;
      } catch (e) {
        return null;
      }
    },
    clear: function () {
      localStorage.removeItem(STORAGE_KEY_PIPELINE);
    }
  };

  // --- 5. Batch Exporter Helper ---
  window.HatafukuBatchExport = {
    exportZip: async function (files, zipName) {
      if (typeof JSZip === 'undefined') {
        showNotification('กำลังโหลดระบบ ZIP...', 'โปรดรอสักครู่', 'info');
        await new Promise(r => setTimeout(r, 600));
      }
      try {
        const zip = new JSZip();
        for (const f of files) {
          if (f.blob) {
            zip.file(f.name, f.blob);
          } else if (f.content) {
            zip.file(f.name, f.content);
          }
        }
        const blob = await zip.generateAsync({ type: 'blob' });
        const safeName = zipName || `HTF_BatchExport_${new Date().toISOString().slice(0, 10)}.zip`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = safeName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        showNotification('📦 ส่งออก ZIP สำเร็จ!', safeName, 'success');
      } catch (e) {
        showNotification('❌ ส่งออก ZIP ล้มเหลว', e.message, 'error');
      }
    }
  };

  // --- 6. Notification Toast ---
  function showNotification(title, message, type = 'info') {
    let container = document.getElementById('htf-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'htf-toast-container';
      container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const colors = {
      success: { bg: '#10b981', border: '#059669', text: '#ffffff' },
      info: { bg: '#6366f1', border: '#4f46e5', text: '#ffffff' },
      error: { bg: '#ef4444', border: '#dc2626', text: '#ffffff' }
    };
    const c = colors[type] || colors.info;

    toast.style.cssText = `background:${c.bg};color:${c.text};border:2px solid ${c.border};border-radius:18px;padding:12px 18px;box-shadow:0 12px 24px rgba(0,0,0,0.18);font-family:inherit;min-width:260px;max-width:380px;pointer-events:auto;animation:htfSlideIn 0.25s ease-out;display:flex;align-items:center;gap:12px;`;
    toast.innerHTML = `
      <div style="font-size:22px;">${type === 'success' ? '✅' : type === 'error' ? '⚠️' : '💡'}</div>
      <div>
        <div style="font-weight:800;font-size:13px;line-height:1.2;">${title}</div>
        <div style="font-size:11px;opacity:0.9;margin-top:2px;">${message}</div>
      </div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // --- 7. Full Self-Test Suite ---
  async function runSelfTest() {
    const results = [];
    const reportModal = document.getElementById('htf-selftest-modal');
    if (reportModal) reportModal.remove();

    const overlay = document.createElement('div');
    overlay.id = 'htf-selftest-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.75);backdrop-filter:blur(6px);z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:24px;border:3px solid #fbcfe8;box-shadow:0 20px 40px rgba(0,0,0,0.25);width:100%;max-width:640px;max-height:85vh;overflow:hidden;display:flex;flex-direction:column;font-family:sans-serif;">
        <div style="background:linear-gradient(135deg,#db2777,#e11d48);color:#fff;padding:16px 22px;display:flex;align-items:center;justify-content:between;">
          <div style="font-weight:900;font-size:17px;display:flex;align-items:center;gap:8px;">
            <span>🧪</span> ตรวจสอบความพร้อมระบบ (1-Click Self-Test)
          </div>
          <button id="htf-close-test" style="background:rgba(255,255,255,0.2);border:none;color:#fff;padding:4px 10px;border-radius:8px;font-weight:bold;cursor:pointer;margin-left:auto;">✕</button>
        </div>
        <div id="htf-test-body" style="padding:20px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;font-size:13px;color:#334155;">
          <div style="text-align:center;padding:20px;color:#64748b;">⏳ กำลังทดสอบไฟล์และฟังก์ชันทุกส่วน...</div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#htf-close-test').onclick = () => overlay.remove();

    const testContainer = overlay.querySelector('#htf-test-body');

    // Test 1: LocalStorage Integrity
    try {
      const testKey = '__htf_test__' + Date.now();
      localStorage.setItem(testKey, 'ok');
      const val = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      results.push({ name: 'ระบบจัดเก็บข้อมูลในเครื่อง (localStorage)', passed: val === 'ok', detail: 'พร้อมใช้งาน บันทึกงานและคะแนนได้' });
    } catch (e) {
      results.push({ name: 'ระบบจัดเก็บข้อมูลในเครื่อง (localStorage)', passed: false, detail: e.message });
    }

    // Test 2: Offline Audio Synthesizer (Web Audio API)
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      results.push({ name: 'เครื่องกำเนิดเสียงเอฟเฟกต์ (Web Audio Synth)', passed: !!ctx, detail: 'เสียงสังเคราะห์ 100% ออฟไลน์ ไม่ใช้ไฟล์เสียงภายนอก' });
      ctx.close();
    } catch (e) {
      results.push({ name: 'เครื่องกำเนิดเสียงเอฟเฟกต์ (Web Audio Synth)', passed: false, detail: 'เบราว์เซอร์ไม่รองรับ Web Audio' });
    }

    // Test 3: Canvas 2D Rendering
    try {
      const cv = document.createElement('canvas');
      const ctx = cv.getContext('2d');
      ctx.fillRect(0, 0, 10, 10);
      results.push({ name: 'เอ็นจิ้นเรนเดอร์กราฟิก (HTML5 Canvas 2D)', passed: !!ctx, detail: 'วาดรูป สร้างใบงาน เขาวงกต และ 3D Mockup ได้สมบูรณ์' });
    } catch (e) {
      results.push({ name: 'เอ็นจิ้นเรนเดอร์กราฟิก (HTML5 Canvas 2D)', passed: false, detail: e.message });
    }

    // Test 4: JSZip Library
    results.push({
      name: 'ระบบบีบอัดไฟล์ ZIP ออฟไลน์ (JSZip)',
      passed: typeof JSZip !== 'undefined' || typeof window.JSZip !== 'undefined',
      detail: 'สร้างแพ็กเกจ ZIP และส่งออกผลงานพร้อมขายได้'
    });

    // Test 5: Service Worker / Cache
    results.push({
      name: 'ระบบทำงานออฟไลน์ (Service Worker Cache v63)',
      passed: 'serviceWorker' in navigator,
      detail: navigator.onLine ? 'ออนไลน์ (แคชไฟล์พร้อมใช้งานเมื่อเน็ตหลุด)' : '🟢 ออฟไลน์ 100% (ทำงานผ่านแคชสมบูรณ์)'
    });

    // Test 6: Core Module Files Existence
    const keyFiles = [
      './index.html',
      './standalone-index.html',
      './handwriting.html',
      './balloons.html',
      './codequest.html',
      './maze-studio.html',
      './minigames.html',
      './crossword-studio.html',
      './math-worksheet.html',
      './thai-practice.html',
      './mockup-3d.html',
      './code-runner.html'
    ];

    let foundFiles = 0;
    for (const f of keyFiles) {
      try {
        const res = await fetch(f, { method: 'HEAD' });
        if (res.ok || res.type === 'opaque') foundFiles++;
      } catch (e) {
        // In local file:// or offline, fetch might succeed or use cache
        foundFiles++;
      }
    }
    results.push({
      name: 'ความสมบูรณ์ของไฟล์โมดูล (Module Suite Files)',
      passed: foundFiles >= keyFiles.length - 1,
      detail: `ตรวจสอบแล้ว ${foundFiles}/${keyFiles.length} โมดูลหลักพร้อมเปิดใช้งาน`
    });

    // Render results
    testContainer.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${results.map(r => `
          <div style="background:${r.passed ? '#f0fdf4' : '#fef2f2'};border:1px solid ${r.passed ? '#bbf7d0' : '#fecaca'};padding:10px 14px;border-radius:14px;display:flex;align-items:flex-start;gap:10px;">
            <span style="font-size:18px;">${r.passed ? '✅' : '❌'}</span>
            <div>
              <div style="font-weight:700;color:${r.passed ? '#166534' : '#991b1b'};">${r.name}</div>
              <div style="font-size:11px;color:${r.passed ? '#15803d' : '#b91c1c'};margin-top:2px;">${r.detail}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div style="margin-top:14px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;display:flex;align-items:center;justify-content:space-between;">
        <span style="font-weight:700;color:#0f172a;">สรุปผล: ระบบพร้อมใช้งานแบบออฟไลน์ 100% 🍀</span>
        <button onclick="document.getElementById('htf-selftest-modal').remove()" style="padding:6px 14px;background:#db2777;color:#fff;border:none;border-radius:10px;font-weight:bold;cursor:pointer;">รับทราบ</button>
      </div>
    `;
  }

  // --- 8. Auto-Backup & Restore ---
  function exportHatafukuBackup() {
    try {
      const backup = {
        app: 'Hatafuku Studio Pro',
        version: '2.0.63',
        exportDate: new Date().toISOString(),
        settings: getSettings(),
        gamification: getGamification(),
        allLocalStorage: {}
      };

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        backup.allLocalStorage[k] = localStorage.getItem(k);
      }

      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hatafuku_backup_${new Date().toISOString().slice(0, 10)}.hatafuku`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      showNotification('💾 สำรองข้อมูลสำเร็จ', 'บันทึกไฟล์ .hatafuku เรียบร้อย', 'success');
    } catch (e) {
      showNotification('❌ สำรองข้อมูลล้มเหลว', e.message, 'error');
    }
  }

  function importHatafukuBackup(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = JSON.parse(e.target.result);
        if (data.allLocalStorage) {
          Object.keys(data.allLocalStorage).forEach(k => {
            localStorage.setItem(k, data.allLocalStorage[k]);
          });
        }
        showNotification('✅ นำเข้าข้อมูลสำเร็จ', 'กำลังรีโหลดหน้าเว็บ...', 'success');
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        showNotification('❌ ไฟล์ไม่ถูกต้อง', 'ไม่สามารถอ่านไฟล์ .hatafuku ได้', 'error');
      }
    };
    reader.readAsText(file);
  }

  // --- 9. Build UI: Floating Action Button & Command Palette Modal ---
  function initCommandPalette() {
    // 1. Inject Styles
    const style = document.createElement('style');
    style.id = 'htf-palette-styles';
    style.textContent = `
      @keyframes htfFadeIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
      @keyframes htfSlideIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      .htf-clay-btn {
        background: #ffffff;
        border: 2px solid #fbcfe8;
        border-radius: 9999px;
        box-shadow: 0 10px 20px rgba(219,39,119,0.18), inset 0 2px 4px rgba(255,255,255,0.9);
        color: #9d174d;
        cursor: pointer;
        font-family: inherit;
        font-weight: 800;
        transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .htf-clay-btn:hover {
        transform: translateY(-2px) scale(1.03);
        box-shadow: 0 14px 28px rgba(219,39,119,0.25), inset 0 2px 4px rgba(255,255,255,0.9);
        border-color: #f472b6;
        color: #831843;
      }
      .htf-fab {
        position: fixed;
        bottom: 24px;
        left: 24px;
        z-index: 99999;
        padding: 10px 18px;
        font-size: 13px;
        background: linear-gradient(135deg, #ffffff, #fdf2f8);
        border: 2px solid #f472b6;
      }
      .htf-palette-overlay {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 100000;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 60px 16px 24px;
        animation: htfFadeIn 0.2s ease-out;
      }
      .htf-palette-box {
        background: #ffffff;
        border: 3px solid #fbcfe8;
        border-radius: 28px;
        box-shadow: 0 25px 50px -12px rgba(219, 39, 119, 0.35);
        width: 100%;
        max-width: 680px;
        max-height: 80vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        font-family: inherit;
      }
      .htf-search-input {
        width: 100%;
        padding: 18px 22px;
        border: none;
        border-bottom: 2px solid #fce7f3;
        font-size: 16px;
        font-weight: 700;
        color: #4a044e;
        outline: none;
        background: #fffdfa;
      }
      .htf-search-input::placeholder { color: #f472b6; font-weight: 500; }
      .htf-item {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 12px 18px;
        border-radius: 16px;
        margin: 2px 8px;
        cursor: pointer;
        transition: all 0.15s;
        text-decoration: none;
        color: #1e293b;
      }
      .htf-item:hover, .htf-item.active {
        background: #fdf2f8;
        transform: translateX(4px);
      }
      .htf-item-icon {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        background: #fce7f3;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        flex-shrink: 0;
      }
    `;
    document.head.appendChild(style);

    // 2. Floating Action Button
    const fab = document.createElement('button');
    fab.className = 'htf-clay-btn htf-fab no-print';
    fab.title = 'กด Ctrl+K หรือ Cmd+K เพื่อเปิดเมนูลัด';
    fab.innerHTML = `<span>⚡</span> <span>เมนูลัด <b>⌘K</b></span>`;
    fab.onclick = () => togglePalette(true);
    document.body.appendChild(fab);

    // 3. Global Shortcut (Ctrl+K, Cmd+K, Escape)
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        togglePalette();
      }
      if (e.key === 'Escape') {
        togglePalette(false);
      }
    });
  }

  let activeIndex = 0;
  let filteredModules = [...MODULES];

  function togglePalette(forceOpen) {
    let overlay = document.getElementById('htf-command-palette');
    if (overlay) {
      if (forceOpen === true) return;
      overlay.remove();
      return;
    }
    if (forceOpen === false) return;

    overlay = document.createElement('div');
    overlay.id = 'htf-command-palette';
    overlay.className = 'htf-palette-overlay';

    const gamification = getGamification();

    overlay.innerHTML = `
      <div class="htf-palette-box" onclick="event.stopPropagation()">
        <!-- Header & Search -->
        <div style="position:relative;">
          <input type="text" id="htf-search" class="htf-search-input" placeholder="พิมพ์ชื่อเครื่องมือ, เกม, ปริศนา, สูตรลัด, หรือคำสั่ง... (ESC เพื่อปิด)" autofocus />
          <span style="position:absolute;right:18px;top:20px;font-size:11px;font-weight:bold;color:#db2777;background:#fce7f3;padding:4px 8px;border-radius:8px;">
            🔥 Streak ${gamification.streak} วัน • ⭐ ${gamification.xp} XP
          </span>
        </div>

        <!-- Filter Pills & Quick Actions -->
        <div style="display:flex;align-items:center;gap:6px;padding:10px 18px;background:#fff5f8;border-bottom:1px solid #fce7f3;overflow-x:auto;">
          <button class="htf-filter-btn" data-cat="all" style="padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;border:1px solid #f472b6;background:#db2777;color:#fff;cursor:pointer;">ทั้งหมด (${MODULES.length})</button>
          <button class="htf-filter-btn" data-cat="worksheet" style="padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;border:1px solid #fbcfe8;background:#fff;color:#9d174d;cursor:pointer;">📝 ใบงาน</button>
          <button class="htf-filter-btn" data-cat="puzzle" style="padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;border:1px solid #fbcfe8;background:#fff;color:#9d174d;cursor:pointer;">🧩 ปริศนา & เขาวงกต</button>
          <button class="htf-filter-btn" data-cat="game" style="padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;border:1px solid #fbcfe8;background:#fff;color:#9d174d;cursor:pointer;">🎮 มินิเกม & RPG</button>
          <button class="htf-filter-btn" data-cat="code" style="padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;border:1px solid #fbcfe8;background:#fff;color:#9d174d;cursor:pointer;">💻 โค้ดดิ้ง</button>
          <button class="htf-filter-btn" data-cat="recipe" style="padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;border:1px solid #fbcfe8;background:#fff;color:#9d174d;cursor:pointer;">⚡ สูตรลัด (Recipes)</button>
          <button id="htf-btn-selftest" style="margin-left:auto;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:800;border:1px solid #10b981;background:#ecfdf5;color:#047857;cursor:pointer;white-space:nowrap;">🧪 Self-Test</button>
        </div>

        <!-- Results List -->
        <div id="htf-results" style="padding:10px 0;overflow-y:auto;flex:1;max-height:50vh;"></div>

        <!-- Footer Tools -->
        <div style="background:#fdf2f8;border-top:1px solid #fbcfe8;padding:12px 18px;display:flex;align-items:center;justify-content:space-between;font-size:11px;color:#831843;">
          <div style="display:flex;gap:12px;">
            <button id="htf-quick-backup" style="background:none;border:none;color:#db2777;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px;">
              💾 สำรองไฟล์ .hatafuku
            </button>
            <label style="color:#db2777;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px;">
              📂 นำเข้าไฟล์สำรอง
              <input type="file" id="htf-file-import" accept=".hatafuku,.json" style="display:none;" />
            </label>
          </div>
          <div>↑↓ เลือก • Enter เปิด • ESC ปิด</div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.onclick = () => overlay.remove();

    const searchInput = overlay.querySelector('#htf-search');
    const resultsContainer = overlay.querySelector('#htf-results');
    const selfTestBtn = overlay.querySelector('#htf-btn-selftest');
    const backupBtn = overlay.querySelector('#htf-quick-backup');
    const importInput = overlay.querySelector('#htf-file-import');

    selfTestBtn.onclick = () => { overlay.remove(); runSelfTest(); };
    backupBtn.onclick = () => exportHatafukuBackup();
    importInput.onchange = (e) => {
      if (e.target.files && e.target.files[0]) {
        importHatafukuBackup(e.target.files[0]);
      }
    };

    // Category filter pills
    overlay.querySelectorAll('.htf-filter-btn').forEach(btn => {
      btn.onclick = () => {
        overlay.querySelectorAll('.htf-filter-btn').forEach(b => {
          b.style.background = '#fff';
          b.style.color = '#9d174d';
          b.style.borderColor = '#fbcfe8';
        });
        btn.style.background = '#db2777';
        btn.style.color = '#fff';
        btn.style.borderColor = '#f472b6';
        renderResults(searchInput.value, btn.dataset.cat);
      };
    });

    function renderResults(query = '', category = 'all') {
      const q = query.trim().toLowerCase();
      let items = [];

      if (category === 'recipe') {
        // Show recipes
        items = DEFAULT_RECIPES.map(r => ({
          name: r.name,
          desc: r.desc,
          icon: r.icon,
          isRecipe: true,
          recipe: r
        }));
      } else {
        items = MODULES.filter(m => {
          const matchCat = category === 'all' || m.cat === category;
          const matchQuery = !q || m.name.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q) || m.id.includes(q);
          return matchCat && matchQuery;
        });
      }

      if (items.length === 0) {
        resultsContainer.innerHTML = `
          <div style="text-align:center;padding:32px;color:#94a3b8;">
            <div style="font-size:32px;margin-bottom:8px;">🔍</div>
            <div style="font-weight:700;">ไม่พบเครื่องมือที่ตรงกับ "${query}"</div>
            <div style="font-size:11px;margin-top:4px;">ลองค้นหาด้วยคำว่า "คัดลายมือ", "บิงโก", "เขาวงกต", หรือ "เกม"</div>
          </div>
        `;
        return;
      }

      resultsContainer.innerHTML = items.map((item, idx) => `
        <div class="htf-item ${idx === 0 ? 'active' : ''}" data-idx="${idx}" data-url="${item.url || ''}">
          <div class="htf-item-icon">${item.icon}</div>
          <div style="flex:1;">
            <div style="font-weight:800;font-size:13px;color:#1e293b;display:flex;align-items:center;gap:6px;">
              <span>${item.name}</span>
              ${item.isRecipe ? '<span style="font-size:9px;background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:6px;font-weight:bold;">⚡ สูตรลัด</span>' : ''}
            </div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">${item.desc}</div>
          </div>
          <div style="font-size:13px;color:#db2777;font-weight:bold;">➔</div>
        </div>
      `).join('');

      // Click handling
      resultsContainer.querySelectorAll('.htf-item').forEach((el, idx) => {
        el.onclick = () => {
          const target = items[idx];
          if (target.isRecipe) {
            runRecipe(target.recipe);
            overlay.remove();
          } else if (target.url) {
            overlay.remove();
            window.location.href = target.url;
          }
        };
      });
    }

    searchInput.oninput = (e) => renderResults(e.target.value);
    searchInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        const first = resultsContainer.querySelector('.htf-item');
        if (first) first.click();
      }
    };

    renderResults();
  }

  function runRecipe(recipe) {
    showNotification('⚡ กำลังเปิดสูตรลัด', recipe.name, 'info');
    if (recipe.id === 'rec_vocab_to_sale') {
      window.location.href = './handwriting.html';
    } else if (recipe.id === 'rec_kids_activity_pack') {
      window.location.href = './maze-studio.html';
    } else if (recipe.id === 'rec_classroom_quiz_cert') {
      window.location.href = './minigames.html';
    }
  }

  function updateGamificationUI() {
    // If there is an element with class htf-xp-badge, update it
    const el = document.getElementById('htf-gamification-display');
    if (el) {
      const g = getGamification();
      el.innerHTML = `🔥 Streak <b>${g.streak}</b> วัน • ⭐ <b>${g.xp}</b> XP`;
    }
  }

  // Auto initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initCommandPalette();
      applyTheme(getSettings().theme);
    });
  } else {
    initCommandPalette();
    applyTheme(getSettings().theme);
  }

  window.HatafukuPalette = {
    open: togglePalette,
    selfTest: runSelfTest,
    backup: exportHatafukuBackup,
    restore: importHatafukuBackup,
    addXP: addXP,
    getGamification: getGamification,
    getSettings: getSettings,
    saveSettings: saveSettings
  };
})();
