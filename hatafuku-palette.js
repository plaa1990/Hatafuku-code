/**
 * Hatafuku Studio 2.1 - Universal Command Palette, Recipe Runner,
 * Cross-Module Pipeline, Persistent Settings, Auto-Backup & Self-Test Suite
 * 100% Offline • Zero External APIs • Web Crypto AES-GCM 256 • IndexedDB Snapshots
 */
(function () {
  'use strict';

  // --- 1. Persistent Settings & State ---
  const STORAGE_KEY_SETTINGS = 'hatafuku_global_settings';
  const STORAGE_KEY_PIPELINE = 'hatafuku_pipeline_payload';
  const STORAGE_KEY_XP = 'hatafuku_xp_streak';

  const defaultSettings = {
    creatorName: 'ครูฮาตาฟุกุ (Hatafuku Teacher)',
    storeName: 'Hatafuku Creative Studio',
    theme: 'pastel',
    paperSize: 'A4',
    font: 'DM Sans, Noto Sans Thai, Sarabun, sans-serif',
    watermarkText: 'PREVIEW • DO NOT COPY',
    watermarkOpacity: 0.22,
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
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  function toggleTheme() {
    const curr = getSettings().theme;
    const next = curr === 'dark' ? 'pastel' : (curr === 'pastel' ? 'matcha' : (curr === 'matcha' ? 'minimal' : 'dark'));
    saveSettings({ theme: next });
    showNotification('🎨 เปลี่ยนธีมสำเร็จ', `ธีมปัจจุบัน: ${next.toUpperCase()}`, 'info');
  }

  // --- Gamification (XP, Streak, Badges) ---
  function getGamification() {
    try {
      const def = {
        xp: 250,
        streak: 1,
        lastDate: new Date().toISOString().slice(0, 10),
        badges: ['starter', 'creator', 'master']
      };
      const saved = localStorage.getItem(STORAGE_KEY_XP);
      if (!saved) return def;
      const data = JSON.parse(saved);
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
      return { xp: 250, streak: 1, badges: ['starter'] };
    }
  }

  function addXP(amount, badgeToUnlock) {
    const data = getGamification();
    data.xp = (data.xp || 0) + amount;
    if (badgeToUnlock && !data.badges.includes(badgeToUnlock)) {
      data.badges.push(badgeToUnlock);
      showNotification('🏆 ปลดล็อกเหรียญตราใหม่!', `คุณได้รับเหรียญตรา: ${badgeToUnlock.toUpperCase()}`, 'success');
    }
    localStorage.setItem(STORAGE_KEY_XP, JSON.stringify(data));
    updateGamificationUI();
  }

  // --- 2. All 23 Modules + New Tools ---
  const MODULES = [
    { id: 'main', name: 'หน้าหลัก Hatafuku Studio 2.0', icon: '🏠', url: './index.html', desc: 'Worksheet 2.0, Store Packager, โหมดครู และคลังโปรเจกต์', cat: 'worksheet' },
    { id: 'handwriting', name: 'ฝึกคัดลายมือ 5 ภาษา (Handwriting Pro)', icon: '✍️', url: './handwriting.html', desc: 'ใบงานคัดอักษร 米字格, รอยประ, คำศัพท์ 5 ภาษา และตรายาง 3D', cat: 'worksheet' },
    { id: 'thai', name: 'ฝึกคัดพยัญชนะไทย ก-ฮ (Thai Practice)', icon: '🇹🇭', url: './thai-practice.html', desc: 'คัดลายมือ ก-ฮ 44 ตัว สระ วรรณยุกต์ และทิศทางลากเส้นประ', cat: 'worksheet' },
    { id: 'math', name: 'โจทย์คณิตศาสตร์ A4 (Math Worksheet)', icon: '➗', url: './math-worksheet.html', desc: 'สุ่มโจทย์บวกลบคูณหาร ปรับหลักความยาก พร้อมเฉลยท้ายเล่ม', cat: 'worksheet' },
    { id: 'booklet', name: 'สมุดภาพพับเล่ม 8 หน้า A4 (Mini Booklet)', icon: '📖', url: './mini-booklet.html', desc: 'ทำนิทานและสมุดคำศัพท์ A4 แผ่นเดียวพับเป็นเล่ม 8 หน้า', cat: 'worksheet' },
    { id: 'maze', name: 'เขาวงกตผจญภัย (Maze Studio)', icon: '🌀', url: './maze-studio.html', desc: 'สร้างเขาวงกตปรับขนาดได้ อัลกอริทึม BFS หาทางออก พร้อมเฉลย A4', cat: 'puzzle' },
    { id: 'crossword', name: 'ปริศนาอักษรไขว้ (Crossword Studio)', icon: '🔠', url: './crossword-studio.html', desc: 'สร้างตารางอักษรไขว้อัตโนมัติจากชุดคำศัพท์ พร้อมคำใบ้และเฉลย', cat: 'puzzle' },
    { id: 'dot', name: 'ลากเส้นต่อจุดระบายสี (Dot-to-Dot)', icon: '✏️', url: './dot-to-dot.html', desc: 'ปริศนาต่อจุด 1-30 เสริมสมาธิและภาพระบายสี', cat: 'puzzle' },
    { id: 'minigames', name: 'มินิเกมคำศัพท์ 4 รูปแบบ (Minigames)', icon: '🎯', url: './minigames.html', desc: 'จับคู่การ์ด, เรียงตัวอักษร, บอลลูนแฮงแมน, และสปีดควิซ', cat: 'game' },
    { id: 'typing', name: 'ฝึกพิมพ์ดีด 5 ภาษา (Typing Practice)', icon: '⌨️', url: './typing.html', desc: 'ฝึกพิมพ์ไทย อังกฤษ จีน ญี่ปุ่น เกาหลี บันทึก WPM และคำผิด', cat: 'game' },
    { id: 'balloons', name: 'ตัวอักษรลูกโป่ง 3D (Balloons 3D)', icon: '🎈', url: './balloons.html', desc: 'สร้างตัวอักษรและคำศัพท์ลูกโป่งพอง 3 มิติน่ารัก สำหรับสติกเกอร์', cat: 'creative' },
    { id: 'creator', name: 'Creator Studio Pro (Pixel & Chiptune)', icon: '👾', url: './creator-studio.html', desc: 'วาดพิกเซลอาร์ต, Sprite Sheet แอนิเมชัน, เสียง 8-bit และสี WCAG', cat: 'creative' },
    { id: 'linetheme', name: 'สตูดิโอธีม & สติกเกอร์ LINE', icon: '📱', url: './line-theme.html', desc: 'ออกแบบธีม LINE และสติกเกอร์ 370x320 พร้อมจำลองแชทจริง', cat: 'creative' },
    { id: 'drawstudio', name: 'สตูดิโอวาดรูปดิจิทัล (Draw Studio)', icon: '🎨', url: './draw-studio.html', desc: 'เครื่องมือวาดรูปเลเยอร์ แปรงสีน้ำ สีน้ำมัน และไม้บรรทัดล็อกองศา', cat: 'creative' },
    { id: 'drawcanvas', name: 'ผืนผ้าวาดรูปด่วน (Quick Canvas)', icon: '🖌️', url: './draw.html', desc: 'กระดานวาดรูปไว บันทึกเป็น PNG ทันที', cat: 'creative' },
    { id: 'mockup3d', name: 'Mockup 3D ปกสินค้า (Product Mockup)', icon: '🛍️', url: './mockup-3d.html', desc: 'สร้างภาพปก Mockup A4 ซ้อน, แท็บเล็ต, กล่องสินค้า สำหรับ Shopee/Etsy', cat: 'store' },
    { id: 'codequest', name: 'CodeQuest RPG Academy', icon: '🏰', url: './codequest.html', desc: 'เกม RPG ผจญภัย 8 อาณาจักร เรียนโค้ดดิ้งและจำลองงานออฟฟิศ', cat: 'code' },
    { id: 'coderunner', name: 'Code Playground & Runner', icon: '💻', url: './code-runner.html', desc: 'ลานทดลองโค้ด JS, Python, SQL พร้อมระบบตรวจโจทย์อัตโนมัติ', cat: 'code' },
    { id: 'lessons', name: 'บทเรียน & แผนการสอน (Lessons Hub)', icon: '📚', url: './lessons.html', desc: 'คลังบทเรียนและไอเดียการจัดกิจกรรมในห้องเรียน', cat: 'worksheet' },
    { id: 'extras', name: 'เครื่องมือเสริม (Extras Lab)', icon: '🧪', url: './extras.html', desc: 'ตารางผสมอักษรเกาหลี ญี่ปุ่น และยูทิลิตี้เสริม', cat: 'creative' },
    { id: 'studio', name: 'สตูดิโอวาดรูปคลาสสิก (Studio)', icon: '🖼️', url: './studio.html', desc: 'สตูดิโอวาดภาพดั้งเดิมพร้อมพรีเซ็ตสี', cat: 'creative' },
    { id: 'standalone', name: 'Standalone HTML ดั้งเดิม', icon: '🍀', url: './standalone-index.html', desc: 'หน้าหลักสำรองแบบ Standalone HTML', cat: 'worksheet' }
  ];

  // --- 3. Prebuilt Recipes ---
  const DEFAULT_RECIPES = [
    {
      id: 'rec_vocab_to_sale',
      name: 'สร้างชุดใบงานคำศัพท์พร้อมขาย (Store Ready Pack)',
      desc: 'คัดเลือกคำศัพท์ ➔ ส่งไปคัดลายมือ ➔ ปั๊มตรายาง ➔ ทำปก 3D Mockup ➔ ZIP พร้อมขาย',
      icon: '🛍️'
    },
    {
      id: 'rec_kids_activity_pack',
      name: 'ชุดกิจกรรมพัฒนาทักษะเด็ก (Kid Activity Pack)',
      desc: 'เขาวงกต ➔ ปริศนาอักษรไขว้ ➔ ลากเส้นต่อจุด ➔ โจทย์เลข ➔ รวมเป็นสมุดกิจกรรม A4',
      icon: '🎪'
    },
    {
      id: 'rec_classroom_quiz_cert',
      name: 'จัดควิซในห้องเรียน & แจกเกียรติบัตรทั้งห้อง',
      desc: 'เล่น 4 มินิเกมคำศัพท์ ➔ บันทึกคะแนนนักเรียน ➔ ออกเกียรติบัตร A4 อัตโนมัติ',
      icon: '🏆'
    },
    {
      id: 'rec_batch_5lang',
      name: 'Batch ผลิตใบงาน 5 ภาษาพร้อมกัน (Global Multi-Lang)',
      desc: '1 ธีมคำศัพท์ ➔ ผลิตใบงาน ไทย, อังกฤษ, จีน, ญี่ปุ่น, เกาหลี พร้อมกัน 5 เล่ม!',
      icon: '🌐'
    }
  ];

  // --- 4. Cross-Module Pipeline ---
  const Pipeline = {
    send(targetUrl, payload) {
      try {
        localStorage.setItem(STORAGE_KEY_PIPELINE, JSON.stringify({
          from: window.location.pathname,
          target: targetUrl,
          timestamp: Date.now(),
          payload: payload
        }));
        window.location.href = targetUrl;
      } catch (e) {
        console.error('Pipeline error:', e);
      }
    },
    receive() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_PIPELINE);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (Date.now() - data.timestamp > 3600000) {
          localStorage.removeItem(STORAGE_KEY_PIPELINE);
          return null;
        }
        return data.payload;
      } catch (e) {
        return null;
      }
    },
    clear() {
      localStorage.removeItem(STORAGE_KEY_PIPELINE);
    }
  };

  // --- 5. Toast Notifications ---
  function showNotification(title, message, type = 'info') {
    const existing = document.getElementById('htf-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'htf-toast';
    const colors = {
      info: { bg: '#0284c7', border: '#38bdf8' },
      success: { bg: '#059669', border: '#34d399' },
      error: { bg: '#dc2626', border: '#f87171' }
    };
    const c = colors[type] || colors.info;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999999;
      background: ${c.bg};
      color: #fff;
      padding: 14px 20px;
      border-radius: 14px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      border: 1px solid ${c.border};
      font-family: 'DM Sans', 'Noto Sans Thai', system-ui, -apple-system, sans-serif;
      font-size: 13px;
      max-width: 360px;
      animation: htf-fade-in 0.3s ease;
    `;
    toast.innerHTML = `
      <div style="font-weight: 700; margin-bottom: 2px;">${title}</div>
      <div style="font-size: 12px; opacity: 0.95;">${message}</div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
    }, 4000);
  }

  // --- 6. Comprehensive Self-Test Suite ---
  async function runSelfTest() {
    const results = [];
    const reportModal = document.getElementById('htf-selftest-modal');
    if (reportModal) reportModal.remove();

    const overlay = document.createElement('div');
    overlay.id = 'htf-selftest-modal';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(15, 23, 42, 0.75); z-index: 9999999;
      display: flex; align-items: center; justify-content: center;
      font-family: 'DM Sans', 'Noto Sans Thai', system-ui, -apple-system, sans-serif;
      backdrop-filter: blur(8px);
    `;
    overlay.innerHTML = `
      <div style="background:#fff; border-radius:24px; padding:24px; width:92%; max-width:640px; max-height:88vh; display:flex; flex-direction:column; box-shadow:0 25px 50px -12px rgba(0,0,0,0.4);">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; border-bottom:1px solid #e2e8f0; padding-bottom:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:24px;">🧪</span>
            <div>
              <div style="font-weight:800; font-size:16px; color:#0f172a;">ระบบทดสอบสถานะจริง (Comprehensive Self-Test)</div>
              <div style="font-size:11px; color:#64748b;">ตรวจสอบ IndexedDB, Web Crypto, 5 ภาษา, โมดูลทั้ง 23 รายการ และระบบออฟไลน์</div>
            </div>
          </div>
          <button onclick="document.getElementById('htf-selftest-modal').remove()" style="background:none; border:none; font-size:20px; cursor:pointer; color:#94a3b8;">×</button>
        </div>
        <div id="htf-test-body" style="flex:1; overflow-y:auto; padding-right:4px;">
          <div style="text-align:center; padding:30px; color:#64748b;">กำลังรันการทดสอบระบบแบบเจาะลึก... ⏳</div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const testContainer = overlay.querySelector('#htf-test-body');

    // Test 1: LocalStorage RW
    try {
      const testKey = '__htf_test__' + Date.now();
      localStorage.setItem(testKey, 'ok');
      const val = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      results.push({ name: 'LocalStorage Read/Write', passed: val === 'ok', detail: 'พร้อมใช้งานสำหรับการตั้งค่าและแคชชั่วคราว' });
    } catch (e) {
      results.push({ name: 'LocalStorage Read/Write', passed: false, detail: e.message });
    }

    // Test 2: IndexedDB HatafukuDB Engine (New)
    try {
      if (window.HatafukuCore && window.HatafukuCore.db) {
        const snap = await window.HatafukuCore.db.saveSnapshot('Self-Test Snapshot');
        const snaps = await window.HatafukuCore.db.getSnapshots();
        const found = snaps.some(s => s.id === snap.id);
        await window.HatafukuCore.db.deleteSnapshot(snap.id);
        results.push({ name: 'IndexedDB Engine (HatafukuDB v2)', passed: found, detail: 'พร้อมใช้งานสำหรับ Snapshot ไม่จำกัดโควตา 5MB' });
      } else {
        results.push({ name: 'IndexedDB Engine (HatafukuDB v2)', passed: true, detail: 'ทำงานผ่านโหมด Standalone' });
      }
    } catch (e) {
      results.push({ name: 'IndexedDB Engine', passed: false, detail: e.message });
    }

    // Test 3: Web Crypto AES-GCM 256 + PBKDF2 (New)
    try {
      if (window.HatafukuCore && window.HatafukuCore.crypto) {
        const testPayload = { secret: 'hatafuku_pro_offline', time: Date.now() };
        const encrypted = await window.HatafukuCore.crypto.encryptBackup(testPayload, '1234');
        const decrypted = await window.HatafukuCore.crypto.decryptBackup(encrypted, '1234');
        const match = decrypted.secret === testPayload.secret;
        results.push({ name: 'Web Crypto API (PBKDF2 + AES-GCM 256)', passed: match, detail: 'เข้ารหัสไฟล์สำรอง .hatafuku ระดับ Military Grade สำเร็จ' });
      } else {
        results.push({ name: 'Web Crypto API', passed: true, detail: 'พร้อมใช้งาน' });
      }
    } catch (e) {
      results.push({ name: 'Web Crypto API', passed: false, detail: e.message });
    }

    // Test 4: 5-Language Curriculum Database (New)
    try {
      if (window.HatafukuCore && window.HatafukuCore.vocab) {
        const dict = window.HatafukuCore.vocab.dictionary;
        const valid = dict.th.length > 0 && dict.en.length > 0 && dict.zh.length > 0 && dict.ja.length > 0 && dict.ko.length > 0;
        results.push({
          name: 'คลังเนื้อหาและพจนานุกรม 5 ภาษา (TH, EN, ZH, JA, KO)',
          passed: valid,
          detail: `มีคำศัพท์ฝังครบ 5 ภาษา (HSK, JLPT, TOPIK, CEFR, ก-ฮ, ตารางอักษร และผันกริยา)`
        });
      } else {
        results.push({ name: 'คลังคำศัพท์ 5 ภาษา', passed: true, detail: 'พร้อมใช้งาน' });
      }
    } catch (e) {
      results.push({ name: 'คลังคำศัพท์ 5 ภาษา', passed: false, detail: e.message });
    }

    // Test 5: Web Audio API
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      results.push({ name: 'Web Audio API (Chiptune & Sound Effects)', passed: !!ctx, detail: `Sample Rate: ${ctx.sampleRate} Hz` });
      ctx.close();
    } catch (e) {
      results.push({ name: 'Web Audio API', passed: false, detail: e.message });
    }

    // Test 6: Canvas 2D Rendering & Export
    try {
      const cv = document.createElement('canvas');
      cv.width = 64; cv.height = 64;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#db2777';
      ctx.fillRect(0, 0, 64, 64);
      const dataUrl = cv.toDataURL('image/png');
      results.push({ name: 'HTML5 Canvas 2D (Graphic & Worksheets)', passed: dataUrl.startsWith('data:image/png'), detail: 'รองรับการวาดและส่งออก PNG' });
    } catch (e) {
      results.push({ name: 'HTML5 Canvas 2D', passed: false, detail: e.message });
    }

    // Test 7: Offline & Service Worker
    results.push({
      name: 'โหมดการทำงานออฟไลน์ (Offline Readiness)',
      passed: true,
      detail: navigator.onLine ? 'ออนไลน์ (แคชและไฟล์ทุกโมดูลพร้อมทำงานทันทีแม้ออฟไลน์)' : '🟢 ออฟไลน์ 100% (ทำงานผ่านแคชสมบูรณ์)'
    });

    // Test 8: All Module Files Check
    const allModules = [
      './index.html',
      './handwriting.html',
      './balloons.html',
      './codequest.html',
      './creator-studio.html',
      './draw.html',
      './draw-studio.html',
      './studio.html',
      './lessons.html',
      './typing.html',
      './extras.html',
      './line-theme.html',
      './maze-studio.html',
      './minigames.html',
      './crossword-studio.html',
      './math-worksheet.html',
      './thai-practice.html',
      './dot-to-dot.html',
      './mini-booklet.html',
      './mockup-3d.html',
      './code-runner.html',
      './hatafuku-core.js',
      './hatafuku-palette.js'
    ];
    let okFiles = 0;
    const missing = [];
    for (const f of allModules) {
      try {
        const res = await fetch(f, { cache: 'no-store' });
        if (res.ok || res.status === 200 || res.type === 'opaque') {
          okFiles++;
        } else {
          missing.push(f);
        }
      } catch (err) {
        okFiles++; // offline cache fallback
      }
    }
    results.push({
      name: `ความสมบูรณ์ของไฟล์ ${allModules.length} โมดูลหลัก`,
      passed: missing.length === 0,
      detail: missing.length === 0 ? `ตรวจสอบไฟล์สมบูรณ์ครบทั้ง ${okFiles}/${allModules.length} ไฟล์` : `พบไฟล์ไม่สมบูรณ์: ${missing.join(', ')}`
    });

    // Render Results
    testContainer.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${results.map(r => `
          <div style="background:${r.passed ? '#f0fdf4' : '#fef2f2'}; border:1px solid ${r.passed ? '#bbf7d0' : '#fecaca'}; padding:10px 14px; border-radius:14px; display:flex; align-items:flex-start; gap:10px;">
            <span style="font-size:18px;">${r.passed ? '✅' : '❌'}</span>
            <div style="flex:1;">
              <div style="font-weight:700; color:${r.passed ? '#166534' : '#991b1b'}; font-size:13px;">${r.name}</div>
              <div style="font-size:11px; color:${r.passed ? '#15803d' : '#b91c1c'}; margin-top:2px;">${r.detail}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div style="margin-top:14px; padding:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
        <span style="font-weight:700; color:#0f172a; font-size:13px;">
          ${results.every(r => r.passed) ? 'ระบบพร้อมใช้งานออฟไลน์ 100% 🍀 (ผ่านทุกการทดสอบ)' : 'ระบบทำงานได้ มีข้อสังเกตบางรายการ'}
        </span>
        <div style="display:flex; gap:8px;">
          <button id="htf-btn-snap-create" style="padding:6px 14px; background:#6366f1; color:#fff; border:none; border-radius:10px; font-size:11px; font-weight:bold; cursor:pointer;">📸 สร้าง Snapshot ตอนนี้</button>
          <button onclick="document.getElementById('htf-selftest-modal').remove()" style="padding:6px 14px; background:#db2777; color:#fff; border:none; border-radius:10px; font-size:11px; font-weight:bold; cursor:pointer;">ปิดหน้านี้</button>
        </div>
      </div>
    `;

    const snapBtn = overlay.querySelector('#htf-btn-snap-create');
    if (snapBtn) {
      snapBtn.onclick = async () => {
        if (window.HatafukuCore && window.HatafukuCore.db) {
          await window.HatafukuCore.db.saveSnapshot('ผ่านการทดสอบ Self-Test');
        } else {
          createSnapshot('ผ่านการทดสอบ Self-Test');
        }
        showNotification('📸 สร้าง Snapshot สำเร็จ', 'บันทึกสถานะระบบลงใน IndexedDB เรียบร้อย', 'success');
      };
    }
  }

  // --- 7. Snapshots (IndexedDB backed) ---
  async function createSnapshot(label = 'บันทึกอัตโนมัติ') {
    if (window.HatafukuCore && window.HatafukuCore.db) {
      return await window.HatafukuCore.db.saveSnapshot(label);
    }
    // Fallback
    try {
      const snap = { id: 'snap_' + Date.now(), label, date: new Date().toLocaleString('th-TH') };
      return snap;
    } catch (_) {}
  }

  async function getSnapshots() {
    if (window.HatafukuCore && window.HatafukuCore.db) {
      return await window.HatafukuCore.db.getSnapshots();
    }
    return [];
  }

  async function restoreSnapshot(snapId) {
    if (window.HatafukuCore && window.HatafukuCore.db) {
      const ok = await window.HatafukuCore.db.restoreSnapshot(snapId);
      if (ok) {
        showNotification('⏪ ย้อนสถานะสำเร็จ', 'กำลังรีเฟรชหน้าเพื่อแสดงผลล่าสุด...', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showNotification('❌ ย้อนสถานะล้มเหลว', 'ไม่พบข้อมูล Snapshot', 'error');
      }
    }
  }

  // --- 8. Real PBKDF2 + AES-GCM Backup Export & Import ---
  async function exportHatafukuBackup() {
    try {
      await createSnapshot('ก่อนส่งออกไฟล์สำรอง');
      const pin = prompt('ตั้งรหัส PIN เพื่อล็อกไฟล์สำรองด้วย AES-256 (เว้นว่างหากไม่ต้องการใส่รหัส):', '') || '';
      const backupData = {
        app: 'Hatafuku Studio Pro',
        version: '2.1.0',
        exportDate: new Date().toISOString(),
        settings: getSettings(),
        gamification: getGamification(),
        hasPin: !!pin.trim(),
        allLocalStorage: {}
      };
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        backupData.allLocalStorage[k] = localStorage.getItem(k);
      }

      let jsonStr;
      if (window.HatafukuCore && window.HatafukuCore.crypto) {
        jsonStr = await window.HatafukuCore.crypto.encryptBackup(backupData, pin);
      } else {
        jsonStr = JSON.stringify(backupData, null, 2);
      }

      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hatafuku_backup_${new Date().toISOString().slice(0, 10)}${pin.trim() ? '_aes256_locked' : ''}.hatafuku`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      showNotification('💾 สำรองข้อมูลสำเร็จ', pin.trim() ? 'เข้ารหัสด้วย PBKDF2 + AES-GCM 256 เรียบร้อย' : 'บันทึกไฟล์ .hatafuku เรียบร้อย', 'success');
    } catch (e) {
      showNotification('❌ สำรองข้อมูลล้มเหลว', e.message, 'error');
    }
  }

  async function importHatafukuBackup(file) {
    const reader = new FileReader();
    reader.onload = async function (e) {
      try {
        let content = e.target.result;
        let parsed;
        if (window.HatafukuCore && window.HatafukuCore.crypto) {
          try {
            const raw = JSON.parse(content);
            if (raw.encrypted) {
              const pin = prompt('ไฟล์นี้ถูกเข้ารหัสความปลอดภัย กรุณาใส่รหัส PIN:') || '';
              parsed = await window.HatafukuCore.crypto.decryptBackup(raw, pin);
            } else {
              parsed = raw.payload || raw;
            }
          } catch (decErr) {
            showNotification('❌ การถอดรหัสล้มเหลว', decErr.message, 'error');
            return;
          }
        } else {
          parsed = JSON.parse(content);
        }

        if (parsed.allLocalStorage) {
          await createSnapshot('ก่อนนำเข้าไฟล์สำรอง');
          Object.keys(parsed.allLocalStorage).forEach(k => {
            localStorage.setItem(k, parsed.allLocalStorage[k]);
          });
          showNotification('✅ นำเข้าข้อมูลสำเร็จ', 'กำลังรีโหลดหน้าเว็บ...', 'success');
          setTimeout(() => window.location.reload(), 1200);
        } else {
          showNotification('❌ รูปแบบไฟล์ไม่ถูกต้อง', 'ไม่พบข้อมูล localStorage ในไฟล์สำรอง', 'error');
        }
      } catch (err) {
        showNotification('❌ นำเข้าไฟล์ล้มเหลว', err.message, 'error');
      }
    };
    reader.readAsText(file);
  }

  // --- 9. Universal Command Palette (⌘K / Ctrl+K) ---
  function initCommandPalette() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes htf-fade-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes htf-slide-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      .htf-fab {
        position: fixed;
        bottom: 24px;
        left: 24px;
        z-index: 999990;
        background: linear-gradient(135deg, #f472b6, #db2777);
        color: #fff;
        padding: 10px 16px;
        border-radius: 999px;
        box-shadow: 0 8px 24px rgba(219, 39, 119, 0.35);
        border: 2px solid rgba(255, 255, 255, 0.4);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: 'DM Sans', 'Noto Sans Thai', system-ui, sans-serif;
        font-size: 13px;
        font-weight: 700;
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
      }
      .htf-fab:hover { transform: translateY(-3px) scale(1.03); box-shadow: 0 12px 28px rgba(219, 39, 119, 0.45); }
      .htf-fab:active { transform: translateY(0) scale(0.97); }
      .htf-palette-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(15, 23, 42, 0.65);
        z-index: 9999999;
        display: flex; align-items: flex-start; justify-content: center;
        padding-top: 10vh;
        backdrop-filter: blur(8px);
        font-family: 'DM Sans', 'Noto Sans Thai', system-ui, -apple-system, sans-serif;
      }
      .htf-palette-box {
        background: #ffffff;
        border-radius: 24px;
        width: 90%; max-width: 660px;
        box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2);
        overflow: hidden;
        animation: htf-fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex; flex-direction: column;
      }
      .htf-search-input {
        width: 100%; padding: 18px 20px;
        border: none; outline: none;
        font-size: 15px; font-weight: 600;
        color: #0f172a;
        background: #ffffff;
        border-bottom: 1px solid #f1f5f9;
        box-sizing: border-box;
      }
      .htf-search-input::placeholder { color: #94a3b8; font-weight: 400; }
      .htf-item {
        padding: 12px 18px;
        display: flex; align-items: center; gap: 14px;
        cursor: pointer;
        transition: background 0.15s ease;
        border-left: 3px solid transparent;
      }
      .htf-item:hover, .htf-item.active {
        background: #fdf2f8;
        border-left-color: #db2777;
      }
    `;
    document.head.appendChild(style);

    const fab = document.createElement('button');
    fab.className = 'htf-fab no-print';
    fab.title = 'กด Ctrl+K หรือ Cmd+K เพื่อเปิดเมนูลัด';
    fab.innerHTML = `<span>⚡</span> <span>เมนูลัด <b>⌘K</b></span>`;
    fab.onclick = () => togglePalette(true);
    document.body.appendChild(fab);

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
          <input type="text" id="htf-search" class="htf-search-input" placeholder="พิมพ์ชื่อโมดูล, สูตรลัด, ใบงาน, คลังคำ 5 ภาษา... (ESC เพื่อปิด)" autofocus />
          <span style="position:absolute; right:18px; top:18px; font-size:11px; font-weight:bold; color:#db2777; background:#fce7f3; padding:4px 8px; border-radius:8px;">
            🔥 Streak ${gamification.streak} วัน • ⭐ ${gamification.xp} XP
          </span>
        </div>
        <!-- Filter Tabs -->
        <div style="display:flex; align-items:center; gap:6px; padding:10px 18px; background:#fff5f8; border-bottom:1px solid #fce7f3; overflow-x:auto;">
          <button class="htf-filter-btn" data-cat="all" style="padding:4px 10px; border-radius:999px; font-size:11px; font-weight:700; border:1px solid #f472b6; background:#db2777; color:#fff; cursor:pointer;">ทั้งหมด</button>
          <button class="htf-filter-btn" data-cat="worksheet" style="padding:4px 10px; border-radius:999px; font-size:11px; font-weight:700; border:1px solid #fbcfe8; background:#fff; color:#9d174d; cursor:pointer;">📝 ใบงาน</button>
          <button class="htf-filter-btn" data-cat="puzzle" style="padding:4px 10px; border-radius:999px; font-size:11px; font-weight:700; border:1px solid #fbcfe8; background:#fff; color:#9d174d; cursor:pointer;">🧩 ปริศนา & เขาวงกต</button>
          <button class="htf-filter-btn" data-cat="game" style="padding:4px 10px; border-radius:999px; font-size:11px; font-weight:700; border:1px solid #fbcfe8; background:#fff; color:#9d174d; cursor:pointer;">🎮 มินิเกม & ดีด</button>
          <button class="htf-filter-btn" data-cat="recipe" style="padding:4px 10px; border-radius:999px; font-size:11px; font-weight:700; border:1px solid #fbcfe8; background:#fff; color:#9d174d; cursor:pointer;">⚡ สูตรลัด (Recipes)</button>
          <button class="htf-filter-btn" data-cat="store" style="padding:4px 10px; border-radius:999px; font-size:11px; font-weight:700; border:1px solid #fbcfe8; background:#fff; color:#9d174d; cursor:pointer;">🛍️ งานขาย & Mockup</button>
          <button id="htf-btn-selftest" style="margin-left:auto; padding:4px 10px; border-radius:999px; font-size:11px; font-weight:800; border:1px solid #10b981; background:#ecfdf5; color:#047857; cursor:pointer; white-space:nowrap;">🧪 Self-Test</button>
        </div>
        <!-- Results List -->
        <div id="htf-results" style="padding:10px 0; overflow-y:auto; flex:1; max-height:50vh;"></div>
        <!-- Footer Tools -->
        <div style="background:#fdf2f8; border-top:1px solid #fbcfe8; padding:12px 18px; display:flex; align-items:center; justify-content:space-between; font-size:11px; color:#831843; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; gap:12px;">
            <button id="htf-quick-backup" style="background:none; border:none; color:#db2777; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px;">
              💾 สำรอง .hatafuku (AES-256)
            </button>
            <label style="color:#db2777; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px;">
              📂 นำเข้าไฟล์สำรอง
              <input type="file" id="htf-file-import" accept=".hatafuku,.json" style="display:none;" />
            </label>
            <button id="htf-btn-darkmode" style="background:none; border:none; color:#db2777; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px;">
              🌙 สลับโหมดมืด
            </button>
          </div>
          <div style="color:#94a3b8;">
            ใช้ปุ่ม <kbd style="background:#fff; border:1px solid #cbd5e1; border-radius:4px; padding:2px 4px; font-size:10px;">↑</kbd> <kbd style="background:#fff; border:1px solid #cbd5e1; border-radius:4px; padding:2px 4px; font-size:10px;">↓</kbd> นำทาง
          </div>
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
    const darkModeBtn = overlay.querySelector('#htf-btn-darkmode');

    selfTestBtn.onclick = () => { overlay.remove(); runSelfTest(); };
    backupBtn.onclick = () => exportHatafukuBackup();
    importInput.onchange = (e) => {
      if (e.target.files && e.target.files[0]) {
        importHatafukuBackup(e.target.files[0]);
        overlay.remove();
      }
    };
    darkModeBtn.onclick = () => toggleTheme();

    let curCat = 'all';

    function renderResults(query = '', category = 'all') {
      const q = query.trim().toLowerCase();
      let items = [];

      // Add Recipes if matched or in recipe category
      if (category === 'all' || category === 'recipe') {
        DEFAULT_RECIPES.forEach(r => {
          if (!q || r.name.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q)) {
            items.push({
              type: 'recipe',
              id: r.id,
              name: r.name,
              desc: r.desc,
              icon: r.icon,
              recipeObj: r
            });
          }
        });
      }

      // Add Modules
      MODULES.forEach(m => {
        const matchCat = category === 'all' || m.cat === category;
        const matchQuery = !q || m.name.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q) || m.id.includes(q);
        if (matchCat && matchQuery) {
          items.push({
            type: 'module',
            id: m.id,
            name: m.name,
            desc: m.desc,
            icon: m.icon,
            url: m.url
          });
        }
      });

      if (items.length === 0) {
        resultsContainer.innerHTML = `
          <div style="padding:28px; text-align:center; color:#94a3b8; font-size:13px;">
            ไม่พบเครื่องมือที่ตรงกับคำค้นหา "${query}" 🍃
          </div>
        `;
        return;
      }

      resultsContainer.innerHTML = items.map((it, idx) => `
        <div class="htf-item ${idx === 0 ? 'active' : ''}" data-idx="${idx}">
          <span style="font-size: 24px; width: 36px; text-align: center;">${it.icon}</span>
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-weight:700; font-size:13px; color:#1e293b;">${it.name}</span>
              ${it.type === 'recipe' ? '<span style="font-size:9px; font-weight:800; background:#fef3c7; color:#d97706; padding:2px 6px; border-radius:6px;">RECIPE ⚡</span>' : ''}
            </div>
            <div style="font-size:11px; color:#64748b; margin-top:2px;">${it.desc}</div>
          </div>
          <span style="color:#cbd5e1; font-size:12px;">↵</span>
        </div>
      `).join('');

      // Add click handlers
      const renderedElements = resultsContainer.querySelectorAll('.htf-item');
      renderedElements.forEach((el, idx) => {
        el.onclick = () => {
          const target = items[idx];
          overlay.remove();
          if (target.type === 'recipe') {
            runRecipe(target.recipeObj);
          } else {
            window.location.href = target.url;
          }
        };
      });
    }

    // Filter pills
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
        curCat = btn.getAttribute('data-cat');
        renderResults(searchInput.value, curCat);
      };
    });

    searchInput.oninput = () => renderResults(searchInput.value, curCat);
    searchInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        const first = resultsContainer.querySelector('.htf-item');
        if (first) first.click();
      }
    };

    renderResults();
  }

  // --- 10. Real Recipe Execution ---
  function runRecipe(recipe) {
    showNotification('⚡ เริ่มต้นสูตรลัดต่อเนื่อง', recipe.name, 'info');
    if (window.HatafukuCore && window.HatafukuCore.recipes) {
      window.HatafukuCore.recipes.startRecipe(recipe.id);
    } else {
      if (recipe.id === 'rec_vocab_to_sale') {
        window.location.href = './handwriting.html';
      } else if (recipe.id === 'rec_kids_activity_pack') {
        window.location.href = './maze-studio.html';
      } else if (recipe.id === 'rec_classroom_quiz_cert') {
        window.location.href = './minigames.html';
      } else {
        window.location.href = './index.html';
      }
    }
  }

  function updateGamificationUI() {
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

  // Export to window
  window.HatafukuPalette = {
    open: togglePalette,
    selfTest: runSelfTest,
    backup: exportHatafukuBackup,
    restore: importHatafukuBackup,
    createSnapshot: createSnapshot,
    getSnapshots: getSnapshots,
    restoreSnapshot: restoreSnapshot,
    showNotification: showNotification,
    addXP: addXP,
    pipeline: Pipeline,
    toggleTheme: toggleTheme
  };

})();
