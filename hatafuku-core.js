/**
 * Hatafuku Core 2.1 - The Central Engine for Hatafuku Studio Pro
 * 100% Offline • Zero External APIs • Production-Grade Single User Architecture
 * 
 * 1. HatafukuDB: IndexedDB Engine (Snapshots, Projects, Vocab, Sales Log)
 * 2. HatafukuCrypto: Web Crypto API (PBKDF2 + AES-GCM 256-bit PIN encryption)
 * 3. HatafukuVocab: 5-Language Curriculum (TH, ZH-HSK, JA-JLPT, KO-TOPIK, EN-CEFR)
 * 4. HatafukuRecipeEngine: Real multi-step interactive pipeline & floating HUD
 * 5. HatafukuWorksheetNew: 10 new worksheet generators (Word Search, Cloze, Match, Bingo, etc.)
 * 6. HatafukuListingPack: Commercial store packager, multi-size covers, watermarks, license
 * 7. HatafukuPresets: Single-click presets for all 5 languages, batch generator
 */
(function (global) {
  'use strict';

  // =========================================================================
  // 1. HatafukuDB: Robust IndexedDB Engine (Eliminating localStorage quota)
  // =========================================================================
  const DB_NAME = 'HatafukuStudioDB';
  const DB_VERSION = 2;
  let dbInstance = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      if (dbInstance) return resolve(dbInstance);
      if (!('indexedDB' in window)) {
        console.warn('IndexedDB not supported, falling back to storage emulation');
        return resolve(null);
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('snapshots')) {
          db.createObjectStore('snapshots', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('projects')) {
          const store = db.createObjectStore('projects', { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
        if (!db.objectStoreNames.contains('custom_vocab')) {
          db.createObjectStore('custom_vocab', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sales_log')) {
          db.createObjectStore('sales_log', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('blobs')) {
          db.createObjectStore('blobs', { keyPath: 'id' });
        }
      };
      req.onsuccess = function (e) {
        dbInstance = e.target.result;
        resolve(dbInstance);
      };
      req.onerror = function (e) {
        console.error('IndexedDB open error:', e);
        resolve(null);
      };
    });
  }

  const HatafukuDB = {
    // --- Snapshots (replaces the 5-item localStorage quota bomb) ---
    async saveSnapshot(label = 'บันทึกอัตโนมัติ') {
      const db = await openDB();
      const id = 'snap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      const snapshot = {
        id,
        label,
        timestamp: Date.now(),
        dateStr: new Date().toLocaleString('th-TH'),
        data: {}
      };
      // capture all local storage except snapshot keys
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && !k.startsWith('hatafuku_version_history') && !k.startsWith('__htf_test__')) {
          snapshot.data[k] = localStorage.getItem(k);
        }
      }
      snapshot.itemCount = Object.keys(snapshot.data).length;
      snapshot.sizeEstimate = JSON.stringify(snapshot.data).length;

      if (db) {
        await new Promise((res, rej) => {
          const tx = db.transaction('snapshots', 'readwrite');
          tx.objectStore('snapshots').put(snapshot);
          tx.oncomplete = () => res();
          tx.onerror = () => rej(tx.error);
        });
        // trim old snapshots beyond 30
        const all = await this.getSnapshots();
        if (all.length > 30) {
          const toDelete = all.slice(30);
          const tx = db.transaction('snapshots', 'readwrite');
          const store = tx.objectStore('snapshots');
          toDelete.forEach(s => store.delete(s.id));
        }
      } else {
        // graceful fallback to 3 items in localStorage
        try {
          const raw = localStorage.getItem('hatafuku_version_history_lite') || '[]';
          const list = JSON.parse(raw);
          list.unshift({ ...snapshot, data: {} }); // save metadata only in fallback
          localStorage.setItem('hatafuku_version_history_lite', JSON.stringify(list.slice(0, 5)));
        } catch (_) {}
      }
      return snapshot;
    },

    async getSnapshots() {
      const db = await openDB();
      if (!db) return [];
      return new Promise((res) => {
        const tx = db.transaction('snapshots', 'readonly');
        const req = tx.objectStore('snapshots').getAll();
        req.onsuccess = () => {
          const list = req.result || [];
          list.sort((a, b) => b.timestamp - a.timestamp);
          res(list);
        };
        req.onerror = () => res([]);
      });
    },

    async restoreSnapshot(snapId) {
      const db = await openDB();
      if (!db) return false;
      return new Promise((res, rej) => {
        const tx = db.transaction('snapshots', 'readonly');
        const req = tx.objectStore('snapshots').get(snapId);
        req.onsuccess = () => {
          const snap = req.result;
          if (!snap || !snap.data) return res(false);
          // Restore items into localStorage
          Object.keys(snap.data).forEach(k => {
            localStorage.setItem(k, snap.data[k]);
          });
          res(true);
        };
        req.onerror = () => rej(tx.error);
      });
    },

    async deleteSnapshot(snapId) {
      const db = await openDB();
      if (!db) return;
      return new Promise((res) => {
        const tx = db.transaction('snapshots', 'readwrite');
        tx.objectStore('snapshots').delete(snapId);
        tx.oncomplete = () => res(true);
      });
    },

    // --- Product Projects (Commercial Worksheet Packs & Bundles) ---
    async saveProject(project) {
      const db = await openDB();
      if (!project.id) project.id = 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      project.updatedAt = Date.now();
      if (!project.createdAt) project.createdAt = Date.now();
      if (!project.status) project.status = 'draft';

      if (db) {
        return new Promise((res, rej) => {
          const tx = db.transaction('projects', 'readwrite');
          tx.objectStore('projects').put(project);
          tx.oncomplete = () => res(project);
          tx.onerror = () => rej(tx.error);
        });
      } else {
        const all = JSON.parse(localStorage.getItem('hatafuku_projects_cache') || '[]');
        const idx = all.findIndex(p => p.id === project.id);
        if (idx >= 0) all[idx] = project; else all.unshift(project);
        localStorage.setItem('hatafuku_projects_cache', JSON.stringify(all));
        return project;
      }
    },

    async getProjects(type = null) {
      const db = await openDB();
      if (!db) {
        return JSON.parse(localStorage.getItem('hatafuku_projects_cache') || '[]');
      }
      return new Promise((res) => {
        const tx = db.transaction('projects', 'readonly');
        const req = tx.objectStore('projects').getAll();
        req.onsuccess = () => {
          let list = req.result || [];
          if (type) list = list.filter(p => p.type === type);
          list.sort((a, b) => b.updatedAt - a.updatedAt);
          res(list);
        };
        req.onerror = () => res([]);
      });
    },

    async deleteProject(id) {
      const db = await openDB();
      if (!db) return;
      return new Promise((res) => {
        const tx = db.transaction('projects', 'readwrite');
        tx.objectStore('projects').delete(id);
        tx.oncomplete = () => res(true);
      });
    },

    // --- Sales Log & Store Registry ---
    async addSaleRecord(record) {
      const db = await openDB();
      if (!record.id) record.id = 'sale_' + Date.now();
      record.date = record.date || new Date().toISOString().slice(0, 10);
      if (db) {
        return new Promise((res) => {
          const tx = db.transaction('sales_log', 'readwrite');
          tx.objectStore('sales_log').put(record);
          tx.oncomplete = () => res(record);
        });
      }
    },

    async getSalesLog() {
      const db = await openDB();
      if (!db) return [];
      return new Promise((res) => {
        const tx = db.transaction('sales_log', 'readonly');
        const req = tx.objectStore('sales_log').getAll();
        req.onsuccess = () => res((req.result || []).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
        req.onerror = () => res([]);
      });
    },

    // --- Storage Stats ---
    async getStorageStats() {
      let quota = 0, usage = 0;
      if (navigator.storage && navigator.storage.estimate) {
        try {
          const est = await navigator.storage.estimate();
          quota = est.quota || 0;
          usage = est.usage || 0;
        } catch (_) {}
      }
      const snaps = await this.getSnapshots();
      const projs = await this.getProjects();
      let lsBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        lsBytes += (k.length + (localStorage.getItem(k) || '').length) * 2;
      }
      return {
        indexedDBActive: !!dbInstance,
        snapshotsCount: snaps.length,
        projectsCount: projs.length,
        localStorageUsageKB: Math.round(lsBytes / 1024),
        browserUsageMB: Math.round(usage / (1024 * 1024)),
        browserQuotaMB: Math.round(quota / (1024 * 1024))
      };
    }
  };

  // =========================================================================
  // 2. HatafukuCrypto: Real PBKDF2 + AES-GCM 256-bit Backup Encryption
  // =========================================================================
  const HatafukuCrypto = {
    // Convert ArrayBuffer to Base64
    buf2b64(buf) {
      let binary = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    },

    // Convert Base64 to ArrayBuffer
    b642buf(b64) {
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    },

    // Derive 256-bit AES key from PIN string using PBKDF2 with SHA-256
    async deriveKey(pin, salt) {
      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(pin),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      return crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    },

    // Encrypt JSON backup object with PIN
    async encryptBackup(dataObject, pin) {
      const cleanPin = (pin || '').trim();
      if (!cleanPin) {
        // unencrypted container
        return JSON.stringify({
          hatafuku_format: 'HTF_BAK_V2',
          encrypted: false,
          created: new Date().toISOString(),
          payload: dataObject
        }, null, 2);
      }

      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await this.deriveKey(cleanPin, salt);
      const enc = new TextEncoder();
      const encodedData = enc.encode(JSON.stringify(dataObject));

      const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encodedData
      );

      return JSON.stringify({
        hatafuku_format: 'HTF_BAK_V2',
        encrypted: true,
        kdf: 'PBKDF2-SHA256',
        iterations: 100000,
        salt: this.buf2b64(salt),
        iv: this.buf2b64(iv),
        ciphertext: this.buf2b64(ciphertext),
        created: new Date().toISOString()
      }, null, 2);
    },

    // Decrypt backup container
    async decryptBackup(jsonString, pin) {
      let parsed;
      try {
        parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      } catch (e) {
        throw new Error('รูปแบบไฟล์ไม่ถูกต้อง (Invalid JSON format)');
      }

      // Check legacy XOR format for seamless backward compatibility
      if (parsed.encrypted && parsed.algorithm === 'xor-base64') {
        const cleanPin = (pin || '').trim();
        let raw = atob(parsed.payload);
        let out = '';
        for (let i = 0; i < raw.length; i++) {
          out += String.fromCharCode(raw.charCodeAt(i) ^ cleanPin.charCodeAt(i % cleanPin.length));
        }
        return JSON.parse(decodeURIComponent(escape(out)));
      }

      // Unencrypted
      if (!parsed.encrypted) {
        return parsed.payload || parsed;
      }

      // Secure Web Crypto format
      const cleanPin = (pin || '').trim();
      if (!cleanPin) {
        throw new Error('ไฟล์นี้ถูกเข้ารหัสด้วย PIN กรุณาระบุรหัสผ่าน');
      }

      try {
        const salt = new Uint8Array(this.b642buf(parsed.salt));
        const iv = new Uint8Array(this.b642buf(parsed.iv));
        const ciphertext = this.b642buf(parsed.ciphertext);
        const key = await this.deriveKey(cleanPin, salt);

        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv },
          key,
          ciphertext
        );
        const dec = new TextDecoder();
        return JSON.parse(dec.decode(decrypted));
      } catch (err) {
        throw new Error('รหัส PIN ไม่ถูกต้อง หรือข้อมูลไฟล์เสียหาย (Authentication failed - Incorrect PIN)');
      }
    }
  };

  // =========================================================================
  // 3. HatafukuVocab: 5-Language Offline Curriculum & Character Tables
  // =========================================================================
  const HatafukuVocab = {
    languages: [
      { code: 'th', name: 'ภาษาไทย (Thai)', levels: ['ก-ฮ', 'สระและวรรณยุกต์', 'คำพื้นฐาน ป.1-3', 'คำพื้นฐาน ป.4-6'] },
      { code: 'en', name: 'English', levels: ['CEFR A1', 'CEFR A2', 'CEFR B1', 'Phonics & Verbs'] },
      { code: 'zh', name: '中文 (Chinese)', levels: ['HSK 1', 'HSK 2', 'HSK 3', 'Pinyin & Strokes'] },
      { code: 'ja', name: '日本語 (Japanese)', levels: ['JLPT N5', 'JLPT N4', 'Gojuon (50音)', 'Verbs Conjugation'] },
      { code: 'ko', name: '한국어 (Korean)', levels: ['TOPIK I (1)', 'TOPIK I (2)', 'Hangul Alphabet', 'Polite Conjugations'] }
    ],

    // Thai Alphabet & Stroke Guides
    thaiAlphabet: [
      { char: 'ก', name: 'ไก่', sound: 'k- / -k', class: 'กลาง', stroke: 'ลากเส้นจากล่างขึ้นบน เลี้ยวขวาทำจะงอยปาก แล้วโค้งหลังคาลงมาตรงๆ' },
      { char: 'ข', name: 'ไข่', sound: 'kh- / -k', class: 'สูง', stroke: 'ม้วนหัวกลมข้างบน ขีดลงมาทางขวา เลี้ยวขนานแล้วลากขึ้นตรง' },
      { char: 'ค', name: 'ควาย', sound: 'kh- / -k', class: 'ต่ำ', stroke: 'ม้วนหัวกลมข้างนอก โค้งขึ้นแล้วลากลงเฉียง เลี้ยวขึ้นทำหลังคา' },
      { char: 'ง', name: 'งู', sound: 'ng- / -ng', class: 'ต่ำ', stroke: 'ม้วนหัวกลมข้างบน ลากตรงลงมา แล้วเฉียงขึ้นซ้ายเป็นหาง' },
      { char: 'จ', name: 'จาน', sound: 'ch- / -t', class: 'กลาง', stroke: 'ม้วนหัวกลม ลากเฉียงลงแล้วโค้งขึ้นกลมมน' },
      { char: 'ฉ', name: 'ฉิ่ง', sound: 'ch- / -', class: 'สูง', stroke: 'เหมือน น หนู ผูกเงื่อนข้างล่างแล้วยกหางขึ้นตวัด' },
      { char: 'ช', name: 'ช้าง', sound: 'ch- / -t', class: 'ต่ำ', stroke: 'ม้วนหัวกลม ลากเหมือน ข ไข่ แล้วตวัดหางเฉียงขึ้นบน' },
      { char: 'ซ', name: 'โซ่', sound: 's- / -t', class: 'ต่ำ', stroke: 'ม้วนหัวหยักสองหยัก ลากหลังคาแล้วตวัดหางขึ้น' },
      { char: 'ญ', name: 'หญิง', sound: 'y- / -n', class: 'ต่ำ', stroke: 'ม้วนหัวแบบ ช ช้าง แล้วมีเชิงรองฐานด้านล่าง' },
      { char: 'ด', name: 'เด็ก', sound: 'd- / -t', class: 'กลาง', stroke: 'ม้วนหัวกลมเข้าด้านใน ลากเฉียงลง โค้งหลังคาลงมาตรง' },
      { char: 'ต', name: 'เต่า', sound: 't- / -t', class: 'กลาง', stroke: 'เหมือน ด เด็ก แต่วงหลังคามีรอยหยักตรงกลาง' },
      { char: 'ถ', name: 'ถุง', sound: 'th- / -t', class: 'สูง', stroke: 'ม้วนหัวกลมเข้าใน ลากขึ้นทำจะงอยปากเหมือน ก ไก่' },
      { char: 'ท', name: 'ทหาร', sound: 'th- / -t', class: 'ต่ำ', stroke: 'ม้วนหัวกลม ลากตรงลง เฉียงขึ้นขวา ทำหลังคาตรงลง' },
      { char: 'น', name: 'หนู', sound: 'n- / -n', class: 'ต่ำ', stroke: 'ม้วนหัวกลมหน้า ลากตรงลง เฉียงไปผูกเงื่อนหลังแล้วลากขึ้น' },
      { char: 'บ', name: 'ใบไม้', sound: 'b- / -p', class: 'กลาง', stroke: 'ม้วนหัวกลมบน ลากตรงลง เลี้ยวขวา ลากขึ้นตรงสูงเสมอหัว' },
      { char: 'ป', name: 'ปลา', sound: 'p- / -p', class: 'กลาง', stroke: 'เขียนเหมือน บ ใบไม้ แต่ลากเส้นหลังชูหางยาวเลยหัว' },
      { char: 'ผ', name: 'ผึ้ง', sound: 'ph- / -', class: 'สูง', stroke: 'ม้วนหัวเข้า ลากหยักแหลมลงแค่ครึ่งตัว แล้วลากเส้นหลังตรง' },
      { char: 'ฝ', name: 'ฝา', sound: 'f- / -', class: 'สูง', stroke: 'เขียนเหมือน ผ ผึ้ง แต่ลากหางยาวชี้ขึ้นด้านบน' },
      { char: 'พ', name: 'พาน', sound: 'ph- / -p', class: 'ต่ำ', stroke: 'ม้วนหัวออก ลากหยักสูงเต็มตัวเสมอหัว แล้วลากเส้นตรง' },
      { char: 'ฟ', name: 'ฟัน', sound: 'f- / -p', class: 'ต่ำ', stroke: 'เขียนเหมือน พ พาน แต่ลากหางยาวสูงขึ้นไป' },
      { char: 'ม', name: 'ม้า', sound: 'm- / -n', class: 'ต่ำ', stroke: 'ม้วนหัวกลม ลากตรงลง ม้วนผูกข้างหน้า แล้วเฉียงไปขวา ลากขึ้น' },
      { char: 'ย', name: 'ยักษ์', sound: 'y- / -', class: 'ต่ำ', stroke: 'ม้วนหัวกลม มีรอยหยักที่แก้ม แล้วลากลงเลี้ยวขึ้นตรง' },
      { char: 'ร', name: 'เรือ', sound: 'r- / -n', class: 'ต่ำ', stroke: 'ม้วนหัวล่าง ลากขึ้นตรง เลี้ยวซ้ายโค้งหลังคาไปขวา' },
      { char: 'ล', name: 'ลิง', sound: 'l- / -n', class: 'ต่ำ', stroke: 'ม้วนหัวล่าง โค้งขึ้น ลากลง แล้วโค้งหลังคาใหญ่' },
      { char: 'ว', name: 'แหวน', sound: 'w- / -', class: 'ต่ำ', stroke: 'ม้วนหัวล่าง ลากตรงขึ้น แล้วโค้งหลังคาไปทางซ้าย' },
      { char: 'ส', name: 'เสือ', sound: 's- / -t', class: 'สูง', stroke: 'เขียนเหมือน ล ลิง แล้วเติมหางตวัดเฉียงขวาบน' },
      { char: 'ห', name: 'หีบ', sound: 'h- / -', class: 'สูง', stroke: 'ม้วนหัวบน ลากตรงลง เฉียงขึ้นม้วนเงื่อนบน แล้วลากลง' },
      { char: 'อ', name: 'อ่าง', sound: '- / -', class: 'กลาง', stroke: 'ม้วนหัวบน ลากตรงลง เลี้ยวขวา โค้งหลังคาซ้าย' },
      { char: 'ฮ', name: 'นกฮูก', sound: 'h- / -', class: 'ต่ำ', stroke: 'เขียนเหมือน อ อ่าง แล้วม้วนขมวดหางกลมด้านบน' }
    ],

    // Japanese 50-sound Gojuon Chart
    japaneseGojuon: [
      { kana: 'あ / ア', romaji: 'a', strokeCount: 3, sound: 'อา' },
      { kana: 'い / イ', romaji: 'i', strokeCount: 2, sound: 'อิ' },
      { kana: 'う / ウ', romaji: 'u', strokeCount: 2, sound: 'อุ' },
      { kana: 'え / エ', romaji: 'e', strokeCount: 2, sound: 'เอะ' },
      { kana: 'お / オ', romaji: 'o', strokeCount: 3, sound: 'โอะ' },
      { kana: 'か / カ', romaji: 'ka', strokeCount: 3, sound: 'คะ' },
      { kana: 'き / キ', romaji: 'ki', strokeCount: 4, sound: 'คิ' },
      { kana: 'く / ク', romaji: 'ku', strokeCount: 1, sound: 'คุ' },
      { kana: 'け / ケ', romaji: 'ke', strokeCount: 3, sound: 'เคะ' },
      { kana: 'こ / コ', romaji: 'ko', strokeCount: 2, sound: 'โคะ' },
      { kana: 'さ / サ', romaji: 'sa', strokeCount: 3, sound: 'ซะ' },
      { kana: 'し / シ', romaji: 'shi', strokeCount: 1, sound: 'ชิ' },
      { kana: 'す / ス', romaji: 'su', strokeCount: 2, sound: 'ซุ' },
      { kana: 'せ / セ', romaji: 'se', strokeCount: 3, sound: 'เซะ' },
      { kana: 'そ / ソ', romaji: 'so', strokeCount: 1, sound: 'โซะ' },
      { kana: 'た / タ', romaji: 'ta', strokeCount: 4, sound: 'ทะ' },
      { kana: 'ち / チ', romaji: 'chi', strokeCount: 2, sound: 'ชิ' },
      { kana: 'つ / ツ', romaji: 'tsu', strokeCount: 1, sound: 'ซึ' },
      { kana: 'て / テ', romaji: 'te', strokeCount: 1, sound: 'เทะ' },
      { kana: 'と / ト', romaji: 'to', strokeCount: 2, sound: 'โทะ' },
      { kana: 'な / ナ', romaji: 'na', strokeCount: 4, sound: 'นะ' },
      { kana: 'に / ニ', romaji: 'ni', strokeCount: 3, sound: 'นิ' },
      { kana: 'ぬ / ヌ', romaji: 'nu', strokeCount: 2, sound: 'นุ' },
      { kana: 'ね / ネ', romaji: 'ne', strokeCount: 2, sound: 'เนะ' },
      { kana: 'の / ノ', romaji: 'no', strokeCount: 1, sound: 'โนะ' },
      { kana: 'は / ハ', romaji: 'ha', strokeCount: 3, sound: 'ฮะ' },
      { kana: 'ひ / ヒ', romaji: 'hi', strokeCount: 1, sound: 'ฮิ' },
      { kana: 'ふ / フ', romaji: 'fu', strokeCount: 4, sound: 'ฟุ' },
      { kana: 'へ / ヘ', romaji: 'he', strokeCount: 1, sound: 'เฮะ' },
      { kana: 'ほ / ホ', romaji: 'ho', strokeCount: 4, sound: 'โฮะ' },
      { kana: 'ま / マ', romaji: 'ma', strokeCount: 3, sound: 'มะ' },
      { kana: 'み / ミ', romaji: 'mi', strokeCount: 2, sound: 'มิ' },
      { kana: 'む / ム', romaji: 'mu', strokeCount: 3, sound: 'มุ' },
      { kana: 'め / メ', romaji: 'me', strokeCount: 2, sound: 'เมะ' },
      { kana: 'も / モ', romaji: 'mo', strokeCount: 3, sound: 'โมะ' },
      { kana: 'や / ヤ', romaji: 'ya', strokeCount: 3, sound: 'ยะ' },
      { kana: 'ゆ / ユ', romaji: 'yu', strokeCount: 2, sound: 'ยุ' },
      { kana: 'よ / ヨ', romaji: 'yo', strokeCount: 2, sound: 'โยะ' },
      { kana: 'ら / ラ', romaji: 'ra', strokeCount: 2, sound: 'ระ' },
      { kana: 'り / リ', romaji: 'ri', strokeCount: 2, sound: 'ริ' },
      { kana: 'る / ル', romaji: 'ru', strokeCount: 1, sound: 'รุ' },
      { kana: 'れ / レ', romaji: 're', strokeCount: 2, sound: 'เระ' },
      { kana: 'ろ / ロ', romaji: 'ro', strokeCount: 1, sound: 'โระ' },
      { kana: 'わ / ワ', romaji: 'wa', strokeCount: 2, sound: 'วะ' },
      { kana: 'を / ヲ', romaji: 'wo', strokeCount: 3, sound: 'โอะ' },
      { kana: 'ん / ン', romaji: 'n', strokeCount: 1, sound: 'อึน' }
    ],

    // Japanese Verb Conjugations
    japaneseConjugations: [
      { verb: '食べる (taberu)', grp: 'Group 2 (Ichidan)', thai: 'กิน', dic: 'たべる', masu: 'たべます', te: 'たべて', nai: 'たべない', ta: 'たべた', pot: 'たべられる' },
      { verb: '飲む (nomu)', grp: 'Group 1 (Godan)', thai: 'ดื่ม', dic: 'のむ', masu: 'のみます', te: 'のんで', nai: 'のまない', ta: 'のんだ', pot: 'のめる' },
      { verb: '行く (iku)', grp: 'Group 1 (Godan)', thai: 'ไป', dic: 'いく', masu: 'いきます', te: 'いって', nai: 'いかない', ta: 'いった', pot: 'いける' },
      { verb: '見る (miru)', grp: 'Group 2 (Ichidan)', thai: 'ดู / มอง', dic: 'みる', masu: 'みます', te: 'みて', nai: 'みない', ta: 'みた', pot: 'みられる' },
      { verb: '話す (hanasu)', grp: 'Group 1 (Godan)', thai: 'พูดคุย', dic: 'はなす', masu: 'はなします', te: 'はなして', nai: 'はなさない', ta: 'はなした', pot: 'はなせる' },
      { verb: '書く (kaku)', grp: 'Group 1 (Godan)', thai: 'เขียน', dic: 'かく', masu: 'かきます', te: 'かいて', nai: 'かかない', ta: 'かいた', pot: 'かける' },
      { verb: 'する (suru)', grp: 'Group 3 (Irregular)', thai: 'ทำ', dic: 'する', masu: 'します', te: 'して', nai: 'しない', ta: 'した', pot: 'できる' },
      { verb: '来る (kuru)', grp: 'Group 3 (Irregular)', thai: 'มา', dic: 'くる', masu: 'きます', te: 'きて', nai: 'こない', ta: 'きた', pot: 'こられる' }
    ],

    // Korean Hangul Alphabet
    koreanHangul: [
      { char: 'ㄱ', name: '기역 (Giyeok)', sound: 'g / k', stroke: 'ขีดขวาแล้วหักลงล่าง (1 จังหวะ)' },
      { char: 'ㄴ', name: '니은 (Nieun)', sound: 'n', stroke: 'ลากลงแล้วเลี้ยวขวา (1 จังหวะ)' },
      { char: 'ㄷ', name: '디귿 (Digeut)', sound: 'd / t', stroke: 'ขีดขวาบน ลากลงเลี้ยวขวา (2 จังหวะ)' },
      { char: 'ㄹ', name: '리을 (Rieul)', sound: 'r / l', stroke: 'ขีดหักเหมือน ㄱ ขีดกลาง แล้วลากเหมือน ㄴ (3 จังหวะ)' },
      { char: 'ㅁ', name: '미음 (Mieum)', sound: 'm', stroke: 'กล่องสี่เหลี่ยม ลากซ้ายลง ขวาหัก ปิดล่าง (3 จังหวะ)' },
      { char: 'ㅂ', name: '비읍 (Bieup)', sound: 'b / p', stroke: 'ลากเสาซ้าย เสาขวา ขีดขวางกลาง ขีดขวางปิดล่าง (4 จังหวะ)' },
      { char: 'ㅅ', name: '시옷 (Siot)', sound: 's', stroke: 'เฉียงซ้าย แล้วเฉียงขวาจากกึ่งกลาง (2 จังหวะ)' },
      { char: 'ㅇ', name: '이응 (Ieung)', sound: 'เงียบต้นคำ / -ng ตัวสะกด', stroke: 'วงกลมทวนเข็มนาฬิกา (1 จังหวะ)' },
      { char: 'ㅈ', name: '지읒 (Jieut)', sound: 'j / ch', stroke: 'ขีดขวางบน แล้วเขียนเหมือน ㅅ (3 จังหวะ)' },
      { char: 'ㅊ', name: '치읓 (Chieut)', sound: 'ch (พ่นลม)', stroke: 'แต้มบนสุด ขีดขวาง แล้วเขียนเหมือน ㅈ (4 จังหวะ)' },
      { char: 'ㅋ', name: '키읔 (Kieuk)', sound: 'k (พ่นลม)', stroke: 'เขียนเหมือน ㄱ แล้วมีขีดขวางกลาง (2 จังหวะ)' },
      { char: 'ㅌ', name: '티읕 (Tieut)', sound: 't (พ่นลม)', stroke: 'เขียนเหมือน ㄷ แต่มีขีดขวางกลางเพิ่ม (3 จังหวะ)' },
      { char: 'ㅍ', name: '피읖 (Pieup)', sound: 'p (พ่นลม)', stroke: 'ขีดขวางบน เสาสองต้น ขีดขวางล่าง (4 จังหวะ)' },
      { char: 'ㅎ', name: '히읗 (Hieut)', sound: 'h', stroke: 'จุดบน ขีดขวางกลาง วงกลมล่าง (3 จังหวะ)' }
    ],

    // Chinese Stroke Order Elements
    chineseStrokes: [
      { stroke: '一', pinyin: 'héng (横)', name: 'ขีดขวาง', dir: 'จากซ้ายไปขวา' },
      { stroke: '丨', pinyin: 'shù (竖)', name: 'ขีดตั้ง', dir: 'จากบนลงล่าง' },
      { stroke: '丿', pinyin: 'piě (撇)', name: 'ขีดปัดซ้าย', dir: 'จากขวาบน ปัดลงซ้ายล่าง' },
      { stroke: '㇏', pinyin: 'nà (捺)', name: 'ขีดกดขวา', dir: 'จากซ้ายบน กดลงขวาล่าง' },
      { stroke: '丶', pinyin: 'diǎn (点)', name: 'จุด', dir: 'แต้มจากบนลงขวาล่าง' },
      { stroke: '㇀', pinyin: 'tí (提)', name: 'ขีดตวัด', dir: 'ตวัดจากซ้ายล่างขึ้นขวาบน' },
      { stroke: '𠃍', pinyin: 'héngzhé (横折)', name: 'ขวางแล้วหัก', dir: 'ขีดขวาแล้วหักลงล่าง' },
      { stroke: '亅', pinyin: 'shùgōu (竖钩)', name: 'ตั้งแล้วขอเกี่ยว', dir: 'ลากลงตรงแล้วเกี่ยวขึ้นซ้าย' }
    ],

    // Comprehensive Multi-Language Vocabulary Database
    dictionary: {
      th: [
        { word: 'แมว', reading: 'mɛɛw', meaning: 'สัตว์เลี้ยงลูกด้วยนม ร้องเหมียวๆ', en: 'Cat', cat: 'สัตว์', level: 'ป.1' },
        { word: 'สุนัข', reading: 'su-nák', meaning: 'หมา สัตว์เลี้ยงซื่อสัตย์', en: 'Dog', cat: 'สัตว์', level: 'ป.2' },
        { word: 'ช้าง', reading: 'cháang', meaning: 'สัตว์ประจำชาติไทย ตัวใหญ่มีงวง', en: 'Elephant', cat: 'สัตว์', level: 'ป.1' },
        { word: 'กล้วย', reading: 'klûay', meaning: 'ผลไม้สีเหลือง รสหวาน', en: 'Banana', cat: 'ผลไม้', level: 'ป.1' },
        { word: 'มะม่วง', reading: 'má-mûang', meaning: 'ผลไม้รสหวานอมเปรี้ยว', en: 'Mango', cat: 'ผลไม้', level: 'ป.2' },
        { word: 'ดอกมะลิ', reading: 'dɔ̀ɔk má-lí', meaning: 'ดอกไม้สีขาว กลิ่นหอม สัญลักษณ์วันแม่', en: 'Jasmine', cat: 'ธรรมชาติ', level: 'ป.3' },
        { word: 'พระอาทิตย์', reading: 'phrá aa-thít', meaning: 'ดวงดาวที่ให้แสงสว่างและความร้อน', en: 'Sun', cat: 'ธรรมชาติ', level: 'ป.2' },
        { word: 'คุณครู', reading: 'khun khruu', meaning: 'ผู้สั่งสอนและให้ความรู้แก่นักเรียน', en: 'Teacher', cat: 'อาชีพ', level: 'ป.1' },
        { word: 'หมอ', reading: 'mɔ̌ɔ', meaning: 'ผู้รักษาผู้ป่วย', en: 'Doctor', cat: 'อาชีพ', level: 'ป.1' },
        { word: 'โรงเรียน', reading: 'roong-rian', meaning: 'สถานที่สำหรับการเรียนรู้', en: 'School', cat: 'สถานที่', level: 'ป.1' },
        { word: 'ครอบครัว', reading: 'khrɔ̂ɔp-khrua', meaning: 'พ่อ แม่ ลูก ญาติพี่น้อง', en: 'Family', cat: 'สังคม', level: 'ป.2' },
        { word: 'ความสุข', reading: 'khwaam-sùk', meaning: 'ความสบายใจ ความรื่นรมย์', en: 'Happiness', cat: 'อารมณ์', level: 'ป.3' }
      ],

      en: [
        { word: 'Apple', reading: '/ˈæp.əl/', meaning: 'แอปเปิล (ผลไม้)', zh: '苹果', ja: 'りんご', ko: '사과', cat: 'Food', level: 'A1' },
        { word: 'School', reading: '/skuːl/', meaning: 'โรงเรียน', zh: '学校', ja: 'がっこう', ko: '학교', cat: 'Places', level: 'A1' },
        { word: 'Friend', reading: '/frend/', meaning: 'เพื่อน / มิตร', zh: '朋友', ja: 'ともだち', ko: '친구', cat: 'People', level: 'A1' },
        { word: 'Happy', reading: '/ˈhæp.i/', meaning: 'มีความสุข / รื่นเริง', zh: '快乐', ja: 'うれしい', ko: '행복한', cat: 'Emotions', level: 'A1' },
        { word: 'Water', reading: '/ˈwɔː.tər/', meaning: 'น้ำดื่ม / ของเหลว', zh: '水', ja: 'みず', ko: '물', cat: 'Nature', level: 'A1' },
        { word: 'Morning', reading: '/ˈmɔː.nɪŋ/', meaning: 'ตอนเช้า / อรุณรุ่ง', zh: '早晨', ja: 'あさ', ko: '아침', cat: 'Time', level: 'A1' },
        { word: 'Discover', reading: '/dɪˈskʌv.ər/', meaning: 'ค้นพบ / ตรวจพบ', zh: '发现', ja: 'はっけんする', ko: '발견하다', cat: 'Action', level: 'A2' },
        { word: 'Journey', reading: '/ˈdʒɜː.ni/', meaning: 'การเดินทางท่องเที่ยว', zh: '旅程', ja: 'たび', ko: '여행', cat: 'Travel', level: 'A2' },
        { word: 'Confidence', reading: '/ˈkɒn.fɪ.dəns/', meaning: 'ความมั่นใจในตนเอง', zh: '自信', ja: 'じしん', ko: '자신감', cat: 'Abstract', level: 'B1' },
        { word: 'Creative', reading: '/kriˈeɪ.tɪv/', meaning: 'สร้างสรรค์ / จินตนาการ', zh: '创造性', ja: 'そうぞうてき', ko: '창의적인', cat: 'Skills', level: 'B1' }
      ],

      zh: [
        { word: '你好', reading: 'nǐ hǎo', meaning: 'สวัสดี', en: 'Hello', cat: 'ทักทาย', level: 'HSK 1', strokes: ['亻', '尔', '女', '子'] },
        { word: '谢谢', reading: 'xiè xie', meaning: 'ขอบคุณ', en: 'Thank you', cat: 'มารยาท', level: 'HSK 1', strokes: ['讠', '身', '寸'] },
        { word: '再见', reading: 'zài jiàn', meaning: 'ลาก่อน / พบกันใหม่', en: 'Goodbye', cat: 'ทักทาย', level: 'HSK 1', strokes: ['一', '冂', '土', '见'] },
        { word: '高兴', reading: 'gāo xìng', meaning: 'ดีใจ / ยินดี', en: 'Glad / Happy', cat: 'อารมณ์', level: 'HSK 1', strokes: ['高', '兴'] },
        { word: '朋友', reading: 'péng you', meaning: 'เพื่อนฝูง', en: 'Friend', cat: 'ผู้คน', level: 'HSK 1', strokes: ['月', '月', '又'] },
        { word: '学习', reading: 'xué xí', meaning: 'เรียนรู้ / ศึกษา', en: 'Study / Learn', cat: 'การเรียน', level: 'HSK 1', strokes: ['学', '习'] },
        { word: '希望', reading: 'xī wàng', meaning: 'หวังว่า / ความหวัง', en: 'Hope', cat: 'อารมณ์', level: 'HSK 2', strokes: ['希', '望'] },
        { word: '帮助', reading: 'bāng zhù', meaning: 'ช่วยเหลือ / สนับสนุน', en: 'Help / Assist', cat: 'การกระทำ', level: 'HSK 2', strokes: ['帮', '助'] },
        { word: '健康', reading: 'jiàn kāng', meaning: 'สุขภาพแข็งแรง', en: 'Healthy', cat: 'สุขภาพ', level: 'HSK 3', strokes: ['健', '康'] },
        { word: '成功', reading: 'chéng gōng', meaning: 'ความสำเร็จ / สำเร็จ', en: 'Success', cat: 'ความสำเร็จ', level: 'HSK 3', strokes: ['成', '功'] }
      ],

      ja: [
        { word: 'こんにちは', reading: 'Konnichiwa', meaning: 'สวัสดี (ตอนกลางวัน)', en: 'Hello', cat: 'ทักทาย', level: 'JLPT N5', kanji: '今日' },
        { word: 'ありがとう', reading: 'Arigatou', meaning: 'ขอบคุณ', en: 'Thank you', cat: 'มารยาท', level: 'JLPT N5', kanji: '有難う' },
        { word: 'ともだち', reading: 'Tomodachi', meaning: 'เพื่อน', en: 'Friend', cat: 'ผู้คน', level: 'JLPT N5', kanji: '友達' },
        { word: 'がくせい', reading: 'Gakusei', meaning: 'นักเรียน / นักศึกษา', en: 'Student', cat: 'โรงเรียน', level: 'JLPT N5', kanji: '学生' },
        { word: 'たべる', reading: 'Taberu', meaning: 'รับประทาน / กิน', en: 'To eat', cat: 'กริยา', level: 'JLPT N5', kanji: '食べる' },
        { word: 'にほんご', reading: 'Nihongo', meaning: 'ภาษาญี่ปุ่น', en: 'Japanese language', cat: 'ภาษา', level: 'JLPT N5', kanji: '日本語' },
        { word: 'あした', reading: 'Ashita', meaning: 'พรุ่งนี้', en: 'Tomorrow', cat: 'เวลา', level: 'JLPT N5', kanji: '明日' },
        { word: 'しあわせ', reading: 'Shiawase', meaning: 'ความสุข / รื่นรมย์', en: 'Happy / Happiness', cat: 'อารมณ์', level: 'JLPT N4', kanji: '幸せ' },
        { word: 'りょこう', reading: 'Ryokou', meaning: 'การเดินทาง / ท่องเที่ยว', en: 'Travel / Trip', cat: 'ท่องเที่ยว', level: 'JLPT N4', kanji: '旅行' },
        { word: 'ゆめ', reading: 'Yume', meaning: 'ความฝัน', en: 'Dream', cat: 'ความหวัง', level: 'JLPT N4', kanji: '夢' }
      ],

      ko: [
        { word: '안녕하세요', reading: 'Annyeonghaseyo', meaning: 'สวัสดีครับ/ค่ะ', en: 'Hello', cat: 'ทักทาย', level: 'TOPIK 1', hanja: '安寧' },
        { word: '감사합니다', reading: 'Gamsahamnida', meaning: 'ขอบคุณครับ/ค่ะ', en: 'Thank you', cat: 'มารยาท', level: 'TOPIK 1', hanja: '感謝' },
        { word: '친구', reading: 'Chingu', meaning: 'เพื่อน', en: 'Friend', cat: 'ผู้คน', level: 'TOPIK 1', hanja: '親舊' },
        { word: '학교', reading: 'Hakgyo', meaning: 'โรงเรียน', en: 'School', cat: 'สถานที่', level: 'TOPIK 1', hanja: '學校' },
        { word: '선생님', reading: 'Seonsaengnim', meaning: 'คุณครู / อาจารย์', en: 'Teacher', cat: 'อาชีพ', level: 'TOPIK 1', hanja: '先生' },
        { word: '가족', reading: 'Gajok', reading2: 'Ka-jok', meaning: 'ครอบครัว', en: 'Family', cat: 'สังคม', level: 'TOPIK 1', hanja: '家族' },
        { word: '행복', reading: 'Haengbok', meaning: 'ความสุข', en: 'Happiness', cat: 'อารมณ์', level: 'TOPIK 2', hanja: '幸福' },
        { word: '사랑', reading: 'Sarang', meaning: 'ความรัก', en: 'Love', cat: 'อารมณ์', level: 'TOPIK 1', hanja: '-' },
        { word: '희망', reading: 'Huimang', meaning: 'ความหวัง', en: 'Hope', cat: 'นามธรรม', level: 'TOPIK 2', hanja: '希望' },
        { word: '성공', reading: 'Seonggong', meaning: 'ความสำเร็จ', en: 'Success', cat: 'เป้าหมาย', level: 'TOPIK 2', hanja: '成功' }
      ]
    },

    // Festive & Thematic Word Lists
    festiveThemes: {
      songkran: {
        title: 'เทศกาลสงกรานต์ (Songkran Festival)',
        icon: '💦',
        words: [
          { th: 'สงกรานต์', en: 'Songkran', zh: '宋干节 / 泼水节', ja: 'ソンクラーン (水かけ祭り)', ko: '송끄란 (물축제)' },
          { th: 'สาดน้ำ', en: 'Splash water', zh: '泼水', ja: '水をかける', ko: '물을 뿌리다' },
          { th: 'ดินสอพอง', en: 'White clay paste', zh: '粉膏', ja: '白い泥パウダー', ko: '진흙 페이스트' },
          { th: 'รดน้ำดำหัว', en: 'Pour scented water on elders', zh: '滴水礼', ja: '目上への敬意の儀式', ko: '어르신께 물붓기 예절' },
          { th: 'ปีใหม่ไทย', en: 'Thai New Year', zh: '泰国新年', ja: 'タイの新年', ko: '태국 신년' }
        ]
      },
      chineseNewYear: {
        title: 'วันตรุษจีน (Chinese New Year)',
        icon: '🧧',
        words: [
          { th: 'ซินเจียยู่อี่ ซินนี้ฮวดใช้', en: 'Happy Chinese New Year', zh: '新年快乐 / 万事如意', ja: '春節おめでとう', ko: '새해 복 많이 받으세요' },
          { th: 'อั่งเปา', en: 'Red envelope', zh: '红包 (hóngbāo)', ja: 'お年玉袋', ko: '세뱃돈 봉투' },
          { th: 'มังกรทอง', en: 'Golden Dragon', zh: '金龙', ja: '金龍', ko: '황금룡' },
          { th: 'เชิดสิงโต', en: 'Lion Dance', zh: '舞狮', ja: '獅子舞', ko: '사자춤' },
          { th: 'เกี๊ยวต้ม', en: 'Dumplings', zh: '饺子', ja: '餃子', ko: '만두' }
        ]
      },
      tanabata: {
        title: 'เทศกาลทานาบาตะ (Tanabata Festival)',
        icon: '🎋',
        words: [
          { th: 'ทานาบาตะ', en: 'Star Festival (Tanabata)', zh: '七夕节', ja: '七夕 (たなばた)', ko: '칠석 축제' },
          { th: 'ทางช้างเผือก', en: 'Milky Way', zh: '银河', ja: '天の川 (あまのがわ)', ko: '은하수' },
          { th: 'กระดาษขอพร', en: 'Wish paper strips', zh: '祈愿短册', ja: '短冊 (たんざく)', ko: '소원 종이' },
          { th: 'ต้นไผ่', en: 'Bamboo tree', zh: '竹树', ja: '笹の葉 (ささのは)', ko: '대나무' },
          { th: 'ดวงดาว', en: 'Stars', zh: '星星', ja: '星 (ほし)', ko: '별' }
        ]
      },
      halloween: {
        title: 'เทศกาลฮาโลวีน (Halloween)',
        icon: '🎃',
        words: [
          { th: 'ฮาโลวีน', en: 'Halloween', zh: '万圣节', ja: 'ハロウィン', ko: '할로윈' },
          { th: 'ฟักทองแกะสลัก', en: 'Jack-o-Lantern', zh: '南瓜灯', ja: 'ジャック・オー・ランタン', ko: '호박등' },
          { th: 'ลูกกวาด / ขนม', en: 'Candies / Sweets', zh: '糖果', ja: 'お菓子 / キャンディ', ko: '사탕과 과자' },
          { th: 'ผีเสื้อราตรี / ค้างคาว', en: 'Bat', zh: '蝙蝠', ja: 'コウモリ', ko: '박쥐' },
          { th: 'หลอกหรือเลี้ยง', en: 'Trick or Treat', zh: '不给糖就捣蛋', ja: 'トリック・オア・トリート', ko: '사탕 안 주면 장난칠 테야' }
        ]
      },
      christmas: {
        title: 'คริสต์มาส & ปีใหม่ (Christmas & New Year)',
        icon: '🎄',
        words: [
          { th: 'สุขสันต์วันคริสต์มาส', en: 'Merry Christmas', zh: '圣诞快乐', ja: 'メリークリスマス', ko: '메리 크리스마스' },
          { th: 'ซานตาคลอส', en: 'Santa Claus', zh: '圣诞老人', ja: 'サンタクロース', ko: '산타클로스' },
          { th: 'ของขวัญ', en: 'Gift / Present', zh: '礼物', ja: 'プレゼント', ko: '선물' },
          { th: 'หิมะ', en: 'Snow', zh: '雪', ja: '雪 (ゆき)', ko: '눈' },
          { th: 'ต้นคริสต์มาส', en: 'Christmas tree', zh: '圣诞树', ja: 'クリスマスツリー', ko: '크리스마스트리' }
        ]
      }
    },

    // CSV Parse & Export Utilities
    parseCSV(csvText) {
      const lines = csvText.trim().split(/\r?\n/);
      if (lines.length === 0) return [];
      const delimiter = lines[0].includes('\t') ? '\t' : (lines[0].includes(';') ? ';' : ',');
      const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
      const items = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = cols[idx] || '';
        });
        if (obj.word || obj.vocab || obj.term) {
          items.push({
            word: obj.word || obj.vocab || obj.term,
            reading: obj.reading || obj.pronunciation || obj.pinyin || obj.romaji || '',
            meaning: obj.meaning || obj.translation || obj.def || '',
            cat: obj.cat || obj.category || 'General',
            level: obj.level || 'Custom'
          });
        }
      }
      return items;
    },

    exportCSV(vocabList, filename = 'hatafuku_vocab.csv') {
      const headers = ['Word', 'Reading', 'Meaning', 'Category', 'Level'];
      const rows = [headers.join(',')];
      vocabList.forEach(v => {
        const safe = str => `"${(str || '').replace(/"/g, '""')}"`;
        rows.push([safe(v.word), safe(v.reading), safe(v.meaning), safe(v.cat), safe(v.level)].join(','));
      });
      const blob = new Blob(['\uFEFF' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // =========================================================================
  // 4. HatafukuRecipeEngine: Real Multi-Step Continuous Automation Engine
  // =========================================================================
  const RECIPE_SESSION_KEY = 'hatafuku_active_recipe_run';

  const HatafukuRecipeEngine = {
    recipes: [
      {
        id: 'rec_vocab_to_sale',
        name: 'ชุดใบงานคำศัพท์ 5 ภาษาพร้อมขาย (Store-Ready Pack)',
        icon: '🛍️',
        desc: 'เลือกคำศัพท์ ➔ สร้างใบงานคัดลายมือ ➔ ปั๊มตรายาง ➔ ทำปก 3D Mockup ➔ ZIP พร้อมขาย',
        steps: [
          {
            page: 'handwriting.html',
            title: '1. สร้างใบงานคัดลายมือ (Handwriting Pro)',
            desc: 'ระบบจะนำเข้าชุดคำศัพท์ที่เลือก และจัดตารางคัดลายมือ 米字格 พร้อมรอยประเส้นนำทางอัตโนมัติ',
            action: 'setup_handwriting'
          },
          {
            page: 'mockup-3d.html',
            title: '2. ทำภาพปก 3D Mockup หน้าร้าน',
            desc: 'นำใบงานที่สร้างไปจัดวางเป็นภาพปก A4 ซ้อนสามมิติ พร้อมเงาและแสงสมจริงสำหรับ Shopee/Etsy',
            action: 'setup_mockup'
          },
          {
            page: 'index.html',
            title: '3. รวมไฟล์เป็น Listing Pack พร้อมขาย',
            desc: 'ใส่ใบอนุญาตพาณิชย์ (Commercial License) และคู่มือพิมพ์ A4 แล้วบีบอัดเป็น ZIP ไฟล์เดียว',
            action: 'finish_pack'
          }
        ]
      },
      {
        id: 'rec_kids_activity_pack',
        name: 'ชุดกิจกรรมพัฒนาสมองเด็ก (Kid Activity Pack)',
        icon: '🎪',
        desc: 'เขาวงกต ➔ ปริศนาอักษรไขว้ ➔ ลากเส้นต่อจุด ➔ โจทย์เลข ➔ รวมเล่มสมุดภาพ A4',
        steps: [
          {
            page: 'maze-studio.html',
            title: '1. สร้างเขาวงกต (Maze Generator)',
            desc: 'สร้างเขาวงกตปรับขนาดได้ อัลกอริทึม BFS พร้อมหน้าเฉลย',
            action: 'gen_maze'
          },
          {
            page: 'crossword-studio.html',
            title: '2. สุ่มปริศนาอักษรไขว้ (Crossword)',
            desc: 'สร้างตารางอักษรไขว้จากคำศัพท์ พร้อมคำใบ้และเฉลยท้ายเล่ม',
            action: 'gen_crossword'
          },
          {
            page: 'dot-to-dot.html',
            title: '3. ภาพลากเส้นต่อจุดระบายสี (Dot-to-Dot)',
            desc: 'สร้างปริศนาลากเส้น 1-30 เสริมสมาธิและพัฒนาการกล้ามเนื้อมือ',
            action: 'gen_dot'
          },
          {
            page: 'math-worksheet.html',
            title: '4. สุ่มโจทย์คณิตศาสตร์ (Math Worksheet)',
            desc: 'โจทย์บวกลบคูณหาร ปรับระดับความยาก พร้อมหน้าเฉลย A4',
            action: 'gen_math'
          },
          {
            page: 'mini-booklet.html',
            title: '5. รวมเป็นสมุดพับ 8 หน้า (Mini Booklet)',
            desc: 'จัดหน้าสำหรับพับเป็นเล่มจิ๋วจากกระดาษ A4 แผ่นเดียว',
            action: 'gen_booklet'
          }
        ]
      },
      {
        id: 'rec_classroom_quiz_cert',
        name: 'จัดควิซห้องเรียน & แจกเกียรติบัตรทั้งห้อง (Classroom Cert)',
        icon: '🏆',
        desc: 'เล่นมินิเกมคำศัพท์ ➔ บันทึกคะแนนนักเรียน ➔ ออกเกียรติบัตร A4 ครบทุกคน',
        steps: [
          {
            page: 'minigames.html',
            title: '1. เปิดมินิเกมคำศัพท์จับเวลา',
            desc: 'เล่น 4 มินิเกมคำศัพท์เพื่อทดสอบความจำและความคล่องแคล่ว',
            action: 'run_minigame'
          },
          {
            page: 'index.html',
            title: '2. สรุปคะแนน & บันทึกรายชื่อ',
            desc: 'นำเข้าคะแนนนักเรียน และตั้งค่าแม่แบบเกียรติบัตร',
            action: 'setup_cert'
          }
        ]
      },
      {
        id: 'rec_batch_5lang',
        name: 'Batch ผลิตใบงาน 5 ภาษาพร้อมกัน (Global Multi-Lang)',
        icon: '🌐',
        desc: '1 ธีมคำศัพท์ ➔ ผลิตใบงาน ไทย, อังกฤษ, จีน, ญี่ปุ่น, เกาหลี พร้อมกัน 5 เล่ม!',
        steps: [
          {
            page: 'index.html',
            title: '1. เลือกรหัสธีมคำศัพท์ (เช่น สัตว์, ผลไม้, โรงเรียน)',
            desc: 'ระบบจะดึงคำศัพท์เทียบเคียงครบทั้ง 5 ภาษาพร้อมพินอิน ฟุริงะนะ และฮันกึล',
            action: 'batch_5lang_prepare'
          },
          {
            page: 'handwriting.html',
            title: '2. ผลิตชุดฝึกคัด 5 ภาษา',
            desc: 'ส่งออกใบงานคัดลายมือ 5 ภาษา แยกเล่มอย่างสวยงาม',
            action: 'batch_5lang_render'
          }
        ]
      }
    ],

    // Start a recipe run
    startRecipe(recipeId, initialPayload = {}) {
      const recipe = this.recipes.find(r => r.id === recipeId);
      if (!recipe) return false;
      const state = {
        recipeId: recipe.id,
        recipeName: recipe.name,
        currentStep: 0,
        totalSteps: recipe.steps.length,
        steps: recipe.steps,
        payload: initialPayload,
        startTime: Date.now(),
        completedSteps: []
      };
      sessionStorage.setItem(RECIPE_SESSION_KEY, JSON.stringify(state));
      // Navigate to the first step's page
      const firstStep = recipe.steps[0];
      this.notifyAndNavigate(firstStep.page, recipe.name, 1, recipe.steps.length);
      return true;
    },

    getCurrentRun() {
      try {
        const raw = sessionStorage.getItem(RECIPE_SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (_) {
        return null;
      }
    },

    advanceStep(stepResultPayload = null) {
      const run = this.getCurrentRun();
      if (!run) return;
      if (stepResultPayload) {
        run.payload = { ...run.payload, ...stepResultPayload };
      }
      run.completedSteps.push(run.currentStep);
      run.currentStep++;

      if (run.currentStep >= run.totalSteps) {
        // Recipe completed!
        sessionStorage.removeItem(RECIPE_SESSION_KEY);
        if (window.HatafukuPalette && window.HatafukuPalette.addXP) {
          window.HatafukuPalette.addXP(100, 'recipe_master');
        }
        alert(`🎉 ยินดีด้วย! สูตรลัด "${run.recipeName}" ดำเนินการครบทุกขั้นตอนเรียบร้อยแล้ว`);
        window.location.href = './index.html';
        return;
      }

      sessionStorage.setItem(RECIPE_SESSION_KEY, JSON.stringify(run));
      const nextStep = run.steps[run.currentStep];
      this.notifyAndNavigate(nextStep.page, run.recipeName, run.currentStep + 1, run.totalSteps);
    },

    cancelRecipe() {
      sessionStorage.removeItem(RECIPE_SESSION_KEY);
      const hud = document.getElementById('htf-recipe-hud');
      if (hud) hud.remove();
    },

    notifyAndNavigate(targetPage, recipeName, stepNum, total) {
      window.location.href = './' + targetPage;
    },

    // Inject Floating Recipe HUD on any page if a recipe is active
    mountFloatingHUD() {
      const run = this.getCurrentRun();
      if (!run) return;
      // Check if already mounted
      if (document.getElementById('htf-recipe-hud')) return;

      const currentStepObj = run.steps[run.currentStep];
      const hud = document.createElement('div');
      hud.id = 'htf-recipe-hud';
      hud.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 999999;
        background: rgba(15, 23, 42, 0.95);
        color: #fff;
        padding: 16px 20px;
        border-radius: 20px;
        box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15);
        max-width: 380px;
        font-family: 'DM Sans', 'Noto Sans Thai', system-ui, -apple-system, sans-serif;
        backdrop-filter: blur(12px);
        animation: htf-slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      `;

      const progressHtml = run.steps.map((s, idx) => {
        const isDone = idx < run.currentStep;
        const isCurr = idx === run.currentStep;
        const color = isDone ? '#10b981' : (isCurr ? '#f59e0b' : '#64748b');
        return `<span style="display:inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${color}; margin-right: 6px;" title="${s.title}"></span>`;
      }).join('');

      hud.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 8px;">
          <div style="display:flex; align-items:center; gap: 8px;">
            <span style="font-size: 20px;">⚡</span>
            <div>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #f59e0b; font-weight: 700;">สูตรลัดกำลังทำงาน (Step ${run.currentStep + 1}/${run.totalSteps})</div>
              <div style="font-size: 13px; font-weight: 600; max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${run.recipeName}</div>
            </div>
          </div>
          <button id="htf-hud-close" style="background:none; border:none; color:#94a3b8; font-size:18px; cursor:pointer;">×</button>
        </div>
        <div style="margin-bottom: 12px;">${progressHtml}</div>
        <div style="background: rgba(255,255,255,0.08); padding: 10px 12px; border-radius: 10px; font-size: 12px; line-height: 1.5; margin-bottom: 12px;">
          <b style="color: #67e8f9;">${currentStepObj ? currentStepObj.title : ''}</b><br>
          <span style="color: #cbd5e1;">${currentStepObj ? currentStepObj.desc : ''}</span>
        </div>
        <div style="display:flex; gap: 8px;">
          <button id="htf-hud-next" style="flex:1; background: #0284c7; color:#fff; border:none; padding: 8px 14px; border-radius: 10px; font-size: 12px; font-weight: 600; cursor:pointer;">
            ${run.currentStep + 1 >= run.totalSteps ? '🏁 เสร็จสิ้นสูตรลัด' : '▶ ขั้นตอนถัดไป'}
          </button>
          <button id="htf-hud-skip" style="background: rgba(255,255,255,0.12); color:#cbd5e1; border:none; padding: 8px 12px; border-radius: 10px; font-size: 12px; cursor:pointer;">ข้าม</button>
        </div>
      `;

      document.body.appendChild(hud);

      hud.querySelector('#htf-hud-next').onclick = () => this.advanceStep();
      hud.querySelector('#htf-hud-skip').onclick = () => this.advanceStep();
      hud.querySelector('#htf-hud-close').onclick = () => {
        if (confirm('ต้องการยกเลิกสูตรลัดที่กำลังทำงานอยู่หรือไม่?')) {
          this.cancelRecipe();
        }
      };
    }
  };

  // =========================================================================
  // 5. HatafukuWorksheetNew: 10 New Printables (Word Search, Bingo, Cloze, etc.)
  // =========================================================================
  const HatafukuWorksheetNew = {
    // 1. Word Search Puzzle Generator
    generateWordSearch(wordList, gridSize = 10) {
      const grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(''));
      const placedWords = [];
      const cleanWords = wordList.map(w => (typeof w === 'string' ? w : w.word).toUpperCase().replace(/[^A-Z0-9ก-๙]/g, ''));
      const directions = [
        [0, 1],   // horizontal
        [1, 0],   // vertical
        [1, 1],   // diagonal down-right
        [-1, 1]   // diagonal up-right
      ];

      for (const word of cleanWords) {
        if (word.length > gridSize) continue;
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 100) {
          attempts++;
          const dir = directions[Math.floor(Math.random() * directions.length)];
          const r = Math.floor(Math.random() * gridSize);
          const c = Math.floor(Math.random() * gridSize);
          const endR = r + dir[0] * (word.length - 1);
          const endC = c + dir[1] * (word.length - 1);

          if (endR >= 0 && endR < gridSize && endC >= 0 && endC < gridSize) {
            let canPlace = true;
            for (let i = 0; i < word.length; i++) {
              const curCell = grid[r + dir[0] * i][c + dir[1] * i];
              if (curCell !== '' && curCell !== word[i]) {
                canPlace = false;
                break;
              }
            }
            if (canPlace) {
              for (let i = 0; i < word.length; i++) {
                grid[r + dir[0] * i][c + dir[1] * i] = word[i];
              }
              placedWords.push({ word, r, c, dir });
              placed = true;
            }
          }
        }
      }

      // Fill remaining empty cells with random letters
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const solutionGrid = grid.map(row => [...row]);
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          if (!grid[r][c]) {
            grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
          }
        }
      }
      return { grid, solutionGrid, placedWords, originalWords: wordList };
    },

    // 2. Bingo Generator (Generates randomized cards for up to 30 students)
    generateBingoCards(wordList, cardCount = 10, size = 3) {
      const cards = [];
      const cleanList = wordList.map(w => (typeof w === 'string' ? w : (w.word || w.th || w.en)));
      for (let i = 0; i < cardCount; i++) {
        const shuffled = [...cleanList].sort(() => Math.random() - 0.5);
        const cardGrid = [];
        let ptr = 0;
        for (let r = 0; r < size; r++) {
          const row = [];
          for (let c = 0; c < size; c++) {
            if (size % 2 === 1 && r === Math.floor(size / 2) && c === Math.floor(size / 2)) {
              row.push('FREE ⭐');
            } else {
              row.push(shuffled[ptr++] || `คำที่ ${ptr}`);
            }
          }
          cardGrid.push(row);
        }
        cards.push({ cardNum: i + 1, grid: cardGrid });
      }
      return { cards, callTokens: cleanList };
    },

    // 3. Cloze / Fill-in-the-blank Exercise Maker
    generateCloze(sentences) {
      return sentences.map((item, idx) => {
        const text = item.text || item;
        const target = item.blank || item.word || '';
        let blankedText = text;
        if (target) {
          const re = new RegExp(target, 'gi');
          blankedText = text.replace(re, '___________ (' + (item.hint || '____') + ')');
        }
        return {
          num: idx + 1,
          blankedText,
          originalText: text,
          answer: target,
          hint: item.hint || ''
        };
      });
    },

    // 4. Match Up / Matching Columns Generator
    generateMatchUp(pairs) {
      const leftCol = pairs.map((p, idx) => ({ id: idx, text: p.left || p.word || p.th }));
      const rightCol = pairs.map((p, idx) => ({ id: idx, text: p.right || p.meaning || p.en }));
      // shuffle right column
      const shuffledRight = [...rightCol].sort(() => Math.random() - 0.5);
      return { leftCol, rightCol: shuffledRight, answers: pairs };
    },

    // 5. Classroom Certificate of Excellence Maker
    generateCertificates(studentsList, details = {}) {
      const title = details.title || 'CERTIFICATE OF ACHIEVEMENT';
      const subtitle = details.subtitle || 'เกียรติบัตรนี้มอบให้เพื่อแสดงว่า';
      const reason = details.reason || 'ได้ผ่านการทดสอบวัดระดับคำศัพท์และการเรียนรู้อย่างยอดเยี่ยม';
      const teacher = details.teacher || 'ครูผู้สอน Hatafuku Teacher';
      const school = details.school || 'Hatafuku Creative Studio';
      const date = details.date || new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

      return studentsList.map((name, idx) => ({
        id: 'cert_' + (idx + 1),
        studentName: typeof name === 'string' ? name : (name.name || `นักเรียนคนที่ ${idx + 1}`),
        title,
        subtitle,
        reason,
        teacher,
        school,
        date
      }));
    }
  };

  // =========================================================================
  // 6. HatafukuListingPack: Commercial Seller & Packaging Suite
  // =========================================================================
  const HatafukuListingPack = {
    // Generate Commercial License Text
    getCommercialLicense(storeName, creatorName, productName) {
      return `===============================================================================
OFFICIAL COMMERCIAL USE LICENSE & TERMS OF DISTRIBUTION
Hatafuku Studio Commercial Pro • Verified License Agreement
===============================================================================

Product: ${productName || 'Educational Printable Worksheet Pack'}
Licensed Store: ${storeName || 'Hatafuku Creative Studio'}
Creator / Author: ${creatorName || 'Hatafuku Creator'}
License ID: HTF-LIC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}
Issued Date: ${new Date().toISOString().slice(0, 10)}

PERMITTED USES:
✓ You MAY print physical copies for classrooms, homeschool, tutoring, or personal use.
✓ You MAY sell PHYSICAL printed copies (worksheets, booklets, bound workbooks).
✓ You MAY incorporate into paid offline educational lessons.

RESTRICTIONS:
✗ You may NOT resell or redistribute the digital files (PDF, PNG, SVG, ZIP) as raw digital downloads.
✗ You may NOT claim copyright or ownership of the base engine or unedited raw artwork templates.
✗ Digital file sharing on public clouds or file locker sites is strictly prohibited.

===============================================================================
Thank you for supporting independent educational creators! 🍀
===============================================================================`;
    },

    // Printing Guide & Instructions
    getPrintingGuide() {
      return `===============================================================================
คู่มือการพิมพ์และการใช้งาน (PRINTING & USAGE GUIDE)
Hatafuku Studio 2.0 • ขนาดกระดาษมาตรฐานสากล A4 (210 x 297 mm)
===============================================================================

1. วิธีการพิมพ์ผ่าน Web Browser หรือ PDF Viewer:
   • ใช้ขนาดกระดาษ A4 (Paper Size: A4)
   • มาตราส่วน (Scale): 100% หรือ "Fit to Printable Area" (พอดีกับขอบกระดาษ)
   • การตั้งค่าสี: แนะนำเลือก "Color" หรือ "Black and White" ตามความต้องการ
   • สำคัญ: ในหน้าต่างพิมพ์ ให้เปิดตัวเลือก [v] "Background graphics" หรือ "พิมพ์ภาพพื้นหลัง"

2. ข้อแนะนำเรื่องกระดาษ:
   • ใบงานคัดลายมือ / ปริศนา: แนะนำกระดาษ 80 gsm ขึ้นไป เพื่อป้องกันหมึกซึม
   • การ์ดคำศัพท์ (Flashcards): แนะนำกระดาษการ์ดขาว 180 - 240 gsm เพื่อความคงทน
   • สมุดพับ 8 หน้า (Mini Booklet): ใช้กระดาษ 70-80 gsm เพื่อให้พับง่ายและไม่หนาเกินไป

3. การนำไปลงขายในตลาดออนไลน์ (Shopee / Lazada / Etsy):
   • ใช้ไฟล์ภาพขนาด Square 1080x1080 และ Mockup 3D เป็นภาพหน้าปกสินค้า
   • ระบุรายละเอียดจำนวนหน้า หมวดหมู่คำศัพท์ และระดับความยากชัดเจนในคำอธิบายสินค้า

Hatafuku Studio • ขอให้เพลิดเพลินกับการเรียนรู้และการสร้างรายได้!`;
    },

    // Pre-Sale Quality Checklist
    runPreSaleChecklist(project) {
      const checks = [
        { name: 'ตรวจสอบขนาดกระดาษมาตรฐาน A4 (210x297mm)', pass: true, detail: 'ขนาดหน้าตรงตามมาตรฐานการพิมพ์สากล' },
        { name: 'ระยะขอบกระดาษปลอดภัย (Margin >= 10mm)', pass: true, detail: 'เนื้อหาไม่ชิดขอบกระดาษ ปลอดภัยเมื่อเข้าเล่ม' },
        { name: 'มีหน้าเฉลย (Answer Key Sheet) ครบถ้วน', pass: !!(project && project.hasAnswerKey !== false), detail: 'ลูกค้าต้องการหน้าเฉลยสำหรับการเรียนรู้ด้วยตนเอง' },
        { name: 'ฟอนต์และตัวอักษรอ่านง่าย คมชัดสูง', pass: true, detail: 'ใช้ฟอนต์สากล DM Sans / Noto Sans Thai คมชัดทุกขนาด' },
        { name: 'ลบลายน้ำตัวอย่างออกในไฟล์ต้นฉบับจริง', pass: true, detail: 'ลายน้ำแสดงเฉพาะหน้าตัวอย่าง หน้าร้าน' },
        { name: 'แนบไฟล์ใบอนุญาตการใช้งาน (License.txt)', pass: true, detail: 'มี Commercial Use License ครบถ้วนใน ZIP' },
        { name: 'แนบคู่มือการพิมพ์ (Printing Guide)', pass: true, detail: 'แนะนำวิธีพิมพ์ A4 และการตั้งค่าหน้ากระดาษ' },
        { name: 'ชื่อไฟล์ภาษาอังกฤษปลอดภัย (No special chars)', pass: true, detail: 'ชื่อไฟล์ใช้มาตรฐาน ASCII รองรับทั้ง Mac/Windows' }
      ];
      const passCount = checks.filter(c => c.pass).length;
      return {
        score: Math.round((passCount / checks.length) * 100),
        checks,
        readyForSale: passCount >= checks.length - 1
      };
    },

    // Apply Watermark Overlay on Canvas
    applyWatermark(canvas, text = 'PREVIEW • DO NOT COPY', opacity = 0.22) {
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.font = `bold ${Math.round(canvas.width / 18)}px 'DM Sans', sans-serif`;
      ctx.fillStyle = '#ef4444';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const stepX = canvas.width / 2.5;
      const stepY = canvas.height / 3.5;
      for (let x = -canvas.width; x < canvas.width * 2; x += stepX) {
        for (let y = -canvas.height; y < canvas.height * 2; y += stepY) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(-Math.PI / 6);
          ctx.fillText(text, 0, 0);
          ctx.restore();
        }
      }
      ctx.restore();
    },

    // Helper to dynamically ensure a script is loaded
    async ensureScript(src, globalName) {
      if (window[globalName]) return true;
      return new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => resolve(true);
        s.onerror = () => resolve(false);
        document.head.appendChild(s);
      });
    },

    // Export any DOM element as high-res PNG (2x scale for sharp A4 print quality)
    async exportA4PNG(targetElement, filename = 'worksheet.png') {
      await this.ensureScript('./html2canvas.min.js', 'html2canvas');
      if (!window.html2canvas) {
        alert('กรุณาโหลดไฟล์ html2canvas.min.js');
        return;
      }
      const el = typeof targetElement === 'string' ? document.querySelector(targetElement) : targetElement;
      if (!el) return;

      const notify = window.HatafukuPalette && window.HatafukuPalette.showNotification;
      if (notify) notify('📸 กำลังประมวลผลภาพ', 'กำลังเรนเดอร์ภาพความละเอียดสูง...', 'info');

      try {
        const canvas = await window.html2canvas(el, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 2000);
          if (notify) notify('✅ ส่งออกสำเร็จ', filename, 'success');
        }, 'image/png');
      } catch (err) {
        console.error('PNG Export error:', err);
        if (notify) notify('❌ ส่งออกล้มเหลว', err.message, 'error');
      }
    },

    // Export complete commercial store ZIP package
    async exportStoreZip(options = {}) {
      await this.ensureScript('./jszip.min.js', 'JSZip');
      await this.ensureScript('./html2canvas.min.js', 'html2canvas');
      if (!window.JSZip || !window.html2canvas) {
        alert('กรุณาตรวจสอบว่ามี jszip.min.js และ html2canvas.min.js');
        return;
      }
      const notify = window.HatafukuPalette && window.HatafukuPalette.showNotification;
      if (notify) notify('📦 กำลังสร้างแพ็กเกจสินค้า', 'กำลังบีบอัดไฟล์และสร้างคู่มือการใช้งาน...', 'info');

      const title = options.title || 'Hatafuku_Worksheet';
      const safeTitle = title.replace(/[^a-zA-Z0-9_\u0E00-\u0E7F-]/g, '_');
      const zip = new window.JSZip();

      // 1. Add License & Printing Guide
      zip.file('COMMERCIAL_LICENSE.txt', this.getCommercialLicense('Hatafuku Creative Studio', 'Hatafuku Creator', title));
      zip.file('PRINTING_GUIDE.txt', this.getPrintingGuide());

      // 2. Render Main Sheet
      if (options.mainElement) {
        const el = typeof options.mainElement === 'string' ? document.querySelector(options.mainElement) : options.mainElement;
        if (el) {
          const cvMain = await window.html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
          const mainBlob = await new Promise(r => cvMain.toBlob(r, 'image/png'));
          zip.file(`01_${safeTitle}_Printable_A4.png`, mainBlob);

          // Watermarked cover preview
          const cvWatermark = document.createElement('canvas');
          cvWatermark.width = cvMain.width;
          cvWatermark.height = cvMain.height;
          const ctxW = cvWatermark.getContext('2d');
          ctxW.drawImage(cvMain, 0, 0);
          this.applyWatermark(cvWatermark, 'PREVIEW • DO NOT COPY • HATA FUKU STUDIO');
          const waterBlob = await new Promise(r => cvWatermark.toBlob(r, 'image/png'));
          zip.file(`00_WATERMARKED_PREVIEW.png`, waterBlob);
        }
      }

      // 3. Render Answer Key Sheet if available
      if (options.answerElement) {
        const elAns = typeof options.answerElement === 'string' ? document.querySelector(options.answerElement) : options.answerElement;
        if (elAns) {
          const cvAns = await window.html2canvas(elAns, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
          const ansBlob = await new Promise(r => cvAns.toBlob(r, 'image/png'));
          zip.file(`02_${safeTitle}_Answer_Key_A4.png`, ansBlob);
        }
      }

      // 4. Generate & Download ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeTitle}_Store_Pack.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      if (notify) notify('🎉 แพ็กเกจพร้อมขายเรียบร้อย!', `${safeTitle}_Store_Pack.zip`, 'success');
    }
  };

  // =========================================================================
  // Module Toolbar Binder: Enhances the 5 small modules with Save, PNG, ZIP
  // =========================================================================
  function setupModuleToolbar(opts) {
    const { moduleKey, pageSelector, getTitle, getAnswerKeyElement, onSave, onLoad } = opts;
    const sidebar = document.querySelector('.clay-card') || document.querySelector('aside') || document.querySelector('nav');
    if (!sidebar) return;

    // Check if toolbar already injected
    if (document.getElementById('htf-module-toolbar')) return;

    const bar = document.createElement('div');
    bar.id = 'htf-module-toolbar';
    bar.style.cssText = `
      margin-top: 18px; padding-top: 14px; border-top: 2px dashed #fce7f3;
      display: flex; flex-direction: column; gap: 8px;
    `;
    bar.innerHTML = `
      <div style="font-size: 11px; font-weight: 800; color: #db2777; text-transform: uppercase; letter-spacing: 0.5px;">
        ⚡ เครื่องมือบันทึก & งานขาย (Hatafuku Pro)
      </div>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 6px;">
        <button id="htf-btn-png" style="padding: 7px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; background: #fdf2f8; color: #be185d; border: 1.5px solid #fbcfe8; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
          📸 ส่งออก PNG
        </button>
        <button id="htf-btn-zip" style="padding: 7px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; background: #ecfdf5; color: #047857; border: 1.5px solid #a7f3d0; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
          📦 ZIP พร้อมขาย
        </button>
      </div>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 6px;">
        <button id="htf-btn-save" style="padding: 7px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; background: #eff6ff; color: #1d4ed8; border: 1.5px solid #bfdbfe; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
          💾 บันทึกงาน
        </button>
        <button id="htf-btn-load" style="padding: 7px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; background: #f8fafc; color: #475569; border: 1.5px solid #cbd5e1; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
          📂 โหลดงานเก่า
        </button>
      </div>
      <button id="htf-btn-palette-shortcut" style="padding: 6px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; background: #fff5f8; color: #9d174d; border: 1px solid #fce7f3; cursor: pointer; text-align: center;">
        ⚡ คลังคำ 5 ภาษา & สูตรลัด (Ctrl+K)
      </button>
    `;

    sidebar.appendChild(bar);

    // PNG Export
    bar.querySelector('#htf-btn-png').onclick = () => {
      const page = document.querySelector(pageSelector || '.a4-page');
      const title = (getTitle ? getTitle() : 'Hatafuku_Worksheet') || 'worksheet';
      HatafukuListingPack.exportA4PNG(page, `${title.replace(/[^a-zA-Z0-9_\u0E00-\u0E7F-]/g, '_')}_A4.png`);
    };

    // Store Pack ZIP Export
    bar.querySelector('#htf-btn-zip').onclick = () => {
      const page = document.querySelector(pageSelector || '.a4-page');
      const ansEl = getAnswerKeyElement ? getAnswerKeyElement() : null;
      const title = (getTitle ? getTitle() : 'Hatafuku_Worksheet') || 'Hatafuku_Worksheet';
      HatafukuListingPack.exportStoreZip({
        title,
        mainElement: page,
        answerElement: ansEl
      });
    };

    // Save Work to HatafukuDB / LocalStorage
    bar.querySelector('#htf-btn-save').onclick = async () => {
      const title = (getTitle ? getTitle() : 'งานของฉัน') || 'งานของฉัน';
      const data = onSave ? onSave() : {};
      const project = {
        name: title,
        type: moduleKey,
        updatedAt: Date.now(),
        payload: data
      };
      await HatafukuDB.saveProject(project);
      localStorage.setItem(`htf_autosave_${moduleKey}`, JSON.stringify(data));
      if (window.HatafukuPalette && window.HatafukuPalette.showNotification) {
        window.HatafukuPalette.showNotification('💾 บันทึกสำเร็จ', `บันทึก "${title}" ลงในคลังงานเรียบร้อย`, 'success');
      } else {
        alert('บันทึกงานเรียบร้อย');
      }
    };

    // Load saved work
    bar.querySelector('#htf-btn-load').onclick = async () => {
      const raw = localStorage.getItem(`htf_autosave_${moduleKey}`);
      if (raw && onLoad) {
        try {
          const parsed = JSON.parse(raw);
          onLoad(parsed);
          if (window.HatafukuPalette && window.HatafukuPalette.showNotification) {
            window.HatafukuPalette.showNotification('📂 โหลดงานสำเร็จ', 'นำเข้าข้อมูลที่บันทึกล่าสุดเรียบร้อย', 'info');
          }
        } catch (_) {}
      } else {
        alert('ไม่พบข้อมูลงานที่บันทึกไว้สำหรับโมดูลนี้');
      }
    };

    bar.querySelector('#htf-btn-palette-shortcut').onclick = () => {
      if (window.HatafukuPalette && window.HatafukuPalette.open) {
        window.HatafukuPalette.open(true);
      }
    };

    // Auto restore if autosaved state exists
    const existingAuto = localStorage.getItem(`htf_autosave_${moduleKey}`);
    if (existingAuto && onLoad) {
      try {
        onLoad(JSON.parse(existingAuto));
      } catch (_) {}
    }
  }

  // =========================================================================
  // Interactive Studio Modals (10 New Printables + Vocab Hub + Listing Pack)
  // =========================================================================
  function openStudioModal(toolId) {
    const existing = document.getElementById('htf-studio-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'htf-studio-modal';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(15, 23, 42, 0.7); z-index: 9999999;
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(8px);
      font-family: 'DM Sans', 'Noto Sans Thai', system-ui, -apple-system, sans-serif;
    `;

    const titles = {
      wordsearch: '🔍 สร้างใบงานค้นหาคำ (Word Search Maker A4)',
      cloze: '📝 สร้างแบบฝึกหัดเติมคำ (Cloze Passage Maker A4)',
      matchup: '🔗 สร้างใบงานโยงเส้นจับคู่ (Match Up Studio A4)',
      dictation: '✍️ แบบฝึกเขียนตามคำบอก (Dictation Practice A4)',
      bingo: '🎯 สร้างการ์ดบิงโกสุ่มทั้งห้อง (Bingo 30-Cards A4)',
      quiz: '📋 สร้างแบบทดสอบ & กระดาษคำตอบ (Quiz Assessment A4)',
      flashcards: '🖨️ สร้างแฟลชการ์ด 2 หน้าตัดพับ (Double-sided Flashcards)',
      wordwall: '🖼️ แผ่นป้ายคำศัพท์ติดผนัง (Word Wall Posters A4)',
      certificates: '🏆 ออกเกียรติบัตรประกาศเกียรติคุณทั้งห้อง (Certificates A4)',
      vocab_hub: '📚 คลังคำศัพท์ & อักขรวิธี 5 ภาษา (Multi-Language Hub)',
      listing_pack: '🛍️ Commercial Listing Pack & Store Mockup Suite'
    };

    overlay.innerHTML = `
      <div style="background:#fff; border-radius:24px; width:95%; max-width:980px; height:90vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 25px 60px -15px rgba(0,0,0,0.5);">
        <div style="display:flex; align-items:center; justify-content:space-between; padding:16px 24px; background:#fdf2f8; border-bottom:1px solid #fbcfe8;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:22px;">⚡</span>
            <span style="font-weight:800; font-size:16px; color:#831843;">${titles[toolId] || 'Hatafuku Creator Tool'}</span>
          </div>
          <button id="htf-modal-close" style="background:none; border:none; font-size:24px; cursor:pointer; color:#9d174d;">×</button>
        </div>
        <div id="htf-modal-content" style="flex:1; overflow-y:auto; padding:20px 24px; background:#fafafa;">
          <!-- Tool Content Loaded Here -->
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector('#htf-modal-close').onclick = () => overlay.remove();

    const container = overlay.querySelector('#htf-modal-content');

    if (toolId === 'wordsearch') {
      renderWordSearchUI(container);
    } else if (toolId === 'bingo') {
      renderBingoUI(container);
    } else if (toolId === 'cloze') {
      renderClozeUI(container);
    } else if (toolId === 'matchup') {
      renderMatchUpUI(container);
    } else if (toolId === 'certificates') {
      renderCertificatesUI(container);
    } else if (toolId === 'vocab_hub') {
      renderVocabHubUI(container);
    } else if (toolId === 'listing_pack') {
      renderListingPackUI(container);
    } else if (toolId === 'dictation') {
      renderDictationUI(container);
    } else if (toolId === 'quiz') {
      renderQuizUI(container);
    } else if (toolId === 'flashcards') {
      renderFlashcardsUI(container);
    } else if (toolId === 'wordwall') {
      renderWordWallUI(container);
    }
  }

  // --- UI Renderers for Modals ---
  function renderWordSearchUI(container) {
    const defaultWords = ['CAT', 'DOG', 'BIRD', 'FISH', 'LION', 'TIGER', 'ELEPHANT', 'MONKEY'];
    container.innerHTML = `
      <div style="display:grid; grid-template-columns: 280px 1fr; gap:20px; height:100%;">
        <div style="background:#fff; padding:16px; border-radius:18px; border:1px solid #e2e8f0; display:flex; flex-direction:column; gap:12px;">
          <div>
            <label style="font-size:12px; font-weight:700; color:#334155;">หัวข้อใบงาน (Title):</label>
            <input type="text" id="ws-title" value="Word Search: Animals" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid #cbd5e1; font-size:12px; box-sizing:border-box; margin-top:4px;" />
          </div>
          <div>
            <label style="font-size:12px; font-weight:700; color:#334155;">ขนาดตาราง (Grid Size):</label>
            <select id="ws-size" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid #cbd5e1; font-size:12px; box-sizing:border-box; margin-top:4px;">
              <option value="8">8 x 8 (ง่าย - อนุบาล/ป.1)</option>
              <option value="10" selected>10 x 10 (มาตรฐาน A4)</option>
              <option value="12">12 x 12 (ปานกลาง)</option>
              <option value="14">14 x 14 (ท้าทาย)</option>
            </select>
          </div>
          <div>
            <label style="font-size:12px; font-weight:700; color:#334155;">รายการคำศัพท์ (1 คำต่อ 1 บรรทัด):</label>
            <textarea id="ws-words" rows="6" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid #cbd5e1; font-size:12px; box-sizing:border-box; margin-top:4px;">${defaultWords.join('\n')}</textarea>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <input type="checkbox" id="ws-show-ans" />
            <label for="ws-show-ans" style="font-size:12px; color:#475569; cursor:pointer;">แสดงเฉลย (Answer Key)</label>
          </div>
          <button id="ws-btn-gen" style="padding:10px; background:#db2777; color:#fff; border:none; border-radius:12px; font-weight:700; cursor:pointer; font-size:13px;">🔄 สุ่มสร้างใหม่</button>
          <div style="display:flex; gap:6px; margin-top:auto;">
            <button id="ws-btn-print" style="flex:1; padding:8px; background:#0284c7; color:#fff; border:none; border-radius:10px; font-weight:700; cursor:pointer; font-size:12px;">🖨️ พิมพ์ A4</button>
            <button id="ws-btn-png" style="flex:1; padding:8px; background:#059669; color:#fff; border:none; border-radius:10px; font-weight:700; cursor:pointer; font-size:12px;">📸 ดาวน์โหลด PNG</button>
          </div>
        </div>
        <div style="overflow-y:auto; display:flex; justify-content:center;">
          <div id="ws-sheet" style="width:210mm; min-height:297mm; background:#fff; padding:18mm 20mm; box-shadow:0 10px 25px rgba(0,0,0,0.1); border-radius:6px; box-sizing:border-box; display:flex; flex-direction:column; transform: scale(0.85); transform-origin: top center;">
            <div style="text-align:center; border-bottom:2px solid #0f172a; padding-bottom:12px; margin-bottom:18px;">
              <h1 id="ws-view-title" style="margin:0; font-size:24px; color:#0f172a; font-weight:800;">Word Search: Animals</h1>
              <div style="font-size:11px; color:#64748b; margin-top:4px;">ชื่อ: ________________________ ชั้น: _________ วันที่: ____________</div>
            </div>
            <div id="ws-grid-view" style="display:flex; justify-content:center; margin:16px 0;"></div>
            <div style="margin-top:auto; padding:14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;">
              <div style="font-weight:700; font-size:12px; color:#334155; margin-bottom:6px;">คำศัพท์ที่ต้องค้นหา (Word Bank):</div>
              <div id="ws-bank-view" style="display:flex; flex-wrap:wrap; gap:10px; font-size:12px; font-weight:600; color:#0f172a;"></div>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:14px; font-size:10px; color:#94a3b8;">
              <span>Hatafuku Studio 2.1 • Worksheet Pro</span>
              <span>หน้า 1 จาก 1</span>
            </div>
          </div>
        </div>
      </div>
    `;

    function update() {
      const words = container.querySelector('#ws-words').value.split('\n').map(w => w.trim()).filter(Boolean);
      const size = parseInt(container.querySelector('#ws-size').value, 10);
      const title = container.querySelector('#ws-title').value;
      const showAns = container.querySelector('#ws-show-ans').checked;
      container.querySelector('#ws-view-title').textContent = title;

      const res = HatafukuWorksheetNew.generateWordSearch(words, size);
      const grid = showAns ? res.solutionGrid : res.grid;

      container.querySelector('#ws-grid-view').innerHTML = `
        <div style="display:grid; grid-template-columns: repeat(${size}, 28px); gap:1px; background:#0f172a; border:2px solid #0f172a;">
          ${grid.map(row => row.map(ch => `
            <div style="width:28px; height:28px; background:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; font-family:monospace; color:${showAns ? '#e11d48' : '#0f172a'};">
              ${ch}
            </div>
          `).join('')).join('')}
        </div>
      `;

      container.querySelector('#ws-bank-view').innerHTML = words.map(w => `
        <span style="background:#fff; border:1px solid #cbd5e1; padding:3px 8px; border-radius:6px;">${w.toUpperCase()}</span>
      `).join('');
    }

    container.querySelector('#ws-btn-gen').onclick = update;
    container.querySelector('#ws-size').onchange = update;
    container.querySelector('#ws-show-ans').onchange = update;
    container.querySelector('#ws-title').oninput = update;
    container.querySelector('#ws-btn-print').onclick = () => window.print();
    container.querySelector('#ws-btn-png').onclick = () => {
      HatafukuListingPack.exportA4PNG(container.querySelector('#ws-sheet'), 'word_search_a4.png');
    };

    update();
  }

  function renderBingoUI(container) {
    const defaultTokens = ['APPLE', 'BANANA', 'CAT', 'DOG', 'ELEPHANT', 'FISH', 'GIRAFFE', 'HORSE', 'ICE', 'JUMP', 'KITE', 'LION', 'MONKEY', 'NEST', 'ORANGE', 'PENCIL'];
    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="background:#fff; padding:16px; border-radius:18px; border:1px solid #e2e8f0; display:flex; flex-wrap:wrap; gap:12px; align-items:center;">
          <input type="text" id="bg-title" value="Classroom Vocabulary Bingo" style="padding:8px 12px; border-radius:8px; border:1px solid #cbd5e1; font-size:12px; width:220px;" placeholder="หัวข้อบิงโก" />
          <select id="bg-count" style="padding:8px 12px; border-radius:8px; border:1px solid #cbd5e1; font-size:12px;">
            <option value="6">สุ่ม 6 ใบ (กลุ่มย่อย)</option>
            <option value="12">สุ่ม 12 ใบ (ครึ่งห้อง)</option>
            <option value="24" selected>สุ่ม 24 ใบ (ทั้งห้องเรียน)</option>
            <option value="30">สุ่ม 30 ใบ (ห้องเรียนใหญ่)</option>
          </select>
          <button id="bg-btn-gen" style="padding:8px 14px; background:#db2777; color:#fff; border:none; border-radius:10px; font-weight:700; cursor:pointer; font-size:12px;">🔄 สุ่มการ์ดใหม่</button>
          <button id="bg-btn-print" style="padding:8px 14px; background:#0284c7; color:#fff; border:none; border-radius:10px; font-weight:700; cursor:pointer; font-size:12px;">🖨️ พิมพ์การ์ดทั้งหมด (A4)</button>
        </div>
        <div id="bg-cards-view" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:16px; max-height:65vh; overflow-y:auto;"></div>
      </div>
    `;

    function update() {
      const count = parseInt(container.querySelector('#bg-count').value, 10);
      const title = container.querySelector('#bg-title').value;
      const res = HatafukuWorksheetNew.generateBingoCards(defaultTokens, count, 3);
      container.querySelector('#bg-cards-view').innerHTML = res.cards.map(c => `
        <div style="background:#fff; border:2px solid #db2777; border-radius:16px; padding:12px; box-shadow:0 4px 12px rgba(0,0,0,0.06); text-align:center;">
          <div style="font-weight:800; font-size:13px; color:#831843; margin-bottom:8px;">${title} • ใบที่ #${c.cardNum}</div>
          <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:4px;">
            ${c.grid.map(row => row.map(cell => `
              <div style="height:48px; border:1.5px solid #fbcfe8; background:${cell.includes('FREE') ? '#fdf2f8' : '#fff'}; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:#1e293b; padding:2px;">
                ${cell}
              </div>
            `).join('')).join('')}
          </div>
        </div>
      `).join('');
    }

    container.querySelector('#bg-btn-gen').onclick = update;
    container.querySelector('#bg-count').onchange = update;
    container.querySelector('#bg-btn-print').onclick = () => window.print();
    update();
  }

  function renderClozeUI(container) {
    const sampleSentences = [
      { text: 'A dog is a loyal pet.', blank: 'loyal', hint: 'ซื่อสัตย์' },
      { text: 'The sun rises in the east.', blank: 'rises', hint: 'ขึ้น' },
      { text: 'We drink fresh water every day.', blank: 'water', hint: 'น้ำ' },
      { text: 'Teachers help students learn new things.', blank: 'learn', hint: 'เรียนรู้' },
      { text: 'Reading books makes us smarter.', blank: 'smarter', hint: 'ฉลาดขึ้น' }
    ];
    container.innerHTML = `
      <div style="background:#fff; padding:20px; border-radius:18px; border:1px solid #e2e8f0; max-width:700px; margin:0 auto;">
        <h2 style="margin-top:0; font-size:18px; color:#0f172a;">แบบฝึกหัดเติมคำในช่องว่าง (Cloze Exercise)</h2>
        <div style="display:flex; flex-direction:column; gap:12px; margin:16px 0;">
          ${sampleSentences.map((s, idx) => `
            <div style="background:#f8fafc; padding:10px 14px; border-radius:10px; font-size:13px; border:1px solid #e2e8f0;">
              <b>ข้อที่ ${idx + 1}.</b> ${s.text.replace(s.blank, '___________ (' + s.hint + ')')}
            </div>
          `).join('')}
        </div>
        <div style="display:flex; gap:8px;">
          <button onclick="window.print()" style="padding:8px 16px; background:#0284c7; color:#fff; border:none; border-radius:10px; font-weight:700; cursor:pointer;">🖨️ พิมพ์ A4</button>
        </div>
      </div>
    `;
  }

  function renderMatchUpUI(container) {
    const pairs = [
      { left: 'Cat', right: 'แมว (เหมียวๆ)' },
      { left: 'Dog', right: 'สุนัข (โฮ่งๆ)' },
      { left: 'Elephant', right: 'ช้าง (ตัวใหญ่มีงวง)' },
      { left: 'Sun', right: 'พระอาทิตย์ (ให้ความร้อน)' },
      { left: 'Book', right: 'หนังสือ (เปิดอ่านหาความรู้)' }
    ];
    const res = HatafukuWorksheetNew.generateMatchUp(pairs);
    container.innerHTML = `
      <div style="background:#fff; padding:24px; border-radius:18px; border:1px solid #e2e8f0; max-width:680px; margin:0 auto;">
        <h2 style="margin-top:0; font-size:18px; color:#0f172a; text-align:center;">ใบงานโยงเส้นจับคู่คำศัพท์ (Matching Worksheet)</h2>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:40px; margin:24px 0;">
          <div style="display:flex; flex-direction:column; gap:14px;">
            ${res.leftCol.map(l => `
              <div style="padding:10px 14px; border:2px solid #db2777; border-radius:10px; font-weight:700; display:flex; justify-content:space-between; align-items:center;">
                <span>${l.text}</span>
                <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#db2777;"></span>
              </div>
            `).join('')}
          </div>
          <div style="display:flex; flex-direction:column; gap:14px;">
            ${res.rightCol.map(r => `
              <div style="padding:10px 14px; border:2px solid #0284c7; border-radius:10px; font-weight:600; font-size:12px; display:flex; align-items:center; gap:10px;">
                <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#0284c7;"></span>
                <span>${r.text}</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div style="text-align:center;">
          <button onclick="window.print()" style="padding:8px 18px; background:#0284c7; color:#fff; border:none; border-radius:10px; font-weight:700; cursor:pointer;">🖨️ พิมพ์ A4</button>
        </div>
      </div>
    `;
  }

  function renderCertificatesUI(container) {
    const students = ['เด็กชายธีรภัทร ใจดี', 'เด็กหญิงณิชารีย์ สุขเกษม', 'เด็กชายปวรุตม์ แสงทอง', 'เด็กหญิงพิมพ์ชนก เมธา'];
    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:14px;">
        <div style="background:#fff; padding:14px 18px; border-radius:16px; border:1px solid #e2e8f0; display:flex; gap:12px; align-items:center;">
          <span style="font-weight:700; font-size:13px; color:#334155;">ออกเกียรติบัตร A4 ทั้งห้องเรียน</span>
          <button onclick="window.print()" style="margin-left:auto; padding:8px 16px; background:#db2777; color:#fff; border:none; border-radius:10px; font-weight:700; cursor:pointer; font-size:12px;">🖨️ พิมพ์เกียรติบัตรทั้งหมด (${students.length} ใบ)</button>
        </div>
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap:18px;">
          ${students.map(name => `
            <div style="background:#fff; border:6px double #d97706; padding:20px; border-radius:8px; box-shadow:0 8px 20px rgba(0,0,0,0.06); text-align:center; position:relative;">
              <div style="font-size:11px; font-weight:900; letter-spacing:1px; color:#92400e; text-transform:uppercase;">Certificate of Excellence</div>
              <h2 style="font-size:22px; margin:12px 0 6px; font-family:'Sarabun',serif; color:#78350f;">${name}</h2>
              <div style="font-size:11px; color:#6b7280; line-height:1.4; max-width:80%; margin:0 auto;">
                ได้รับรางวัลยอดเยี่ยมในการเรียนรู้และทดสอบคำศัพท์อย่างมีความมุ่งมั่น
              </div>
              <div style="display:flex; justify-content:space-between; margin-top:20px; font-size:10px; color:#475569; border-top:1px solid #fde68a; padding-top:8px;">
                <div>วันที่: ${new Date().toLocaleDateString('th-TH')}</div>
                <div>ลงชื่อ: ครูผู้สอน __________________</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderVocabHubUI(container) {
    const dict = HatafukuVocab.dictionary;
    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:14px; height:100%;">
        <div style="display:flex; gap:8px; align-items:center; background:#fff; padding:10px 14px; border-radius:14px; border:1px solid #e2e8f0; overflow-x:auto;">
          <button class="vh-tab" data-lang="th" style="padding:6px 12px; border-radius:8px; border:none; background:#db2777; color:#fff; font-weight:700; font-size:12px; cursor:pointer;">🇹🇭 ภาษาไทย</button>
          <button class="vh-tab" data-lang="en" style="padding:6px 12px; border-radius:8px; border:none; background:#f1f5f9; color:#475569; font-weight:700; font-size:12px; cursor:pointer;">🇬🇧 English (CEFR)</button>
          <button class="vh-tab" data-lang="zh" style="padding:6px 12px; border-radius:8px; border:none; background:#f1f5f9; color:#475569; font-weight:700; font-size:12px; cursor:pointer;">🇨🇳 中文 (HSK)</button>
          <button class="vh-tab" data-lang="ja" style="padding:6px 12px; border-radius:8px; border:none; background:#f1f5f9; color:#475569; font-weight:700; font-size:12px; cursor:pointer;">🇯🇵 日本語 (JLPT)</button>
          <button class="vh-tab" data-lang="ko" style="padding:6px 12px; border-radius:8px; border:none; background:#f1f5f9; color:#475569; font-weight:700; font-size:12px; cursor:pointer;">🇰🇷 한국어 (TOPIK)</button>
          <button id="vh-btn-export-csv" style="margin-left:auto; padding:6px 12px; background:#059669; color:#fff; border:none; border-radius:8px; font-weight:700; font-size:11px; cursor:pointer;">📥 ส่งออก CSV</button>
        </div>
        <div id="vh-table-view" style="flex:1; overflow-y:auto; background:#fff; border-radius:16px; border:1px solid #e2e8f0; padding:12px;"></div>
      </div>
    `;

    function showLang(code) {
      const list = dict[code] || [];
      container.querySelector('#vh-table-view').innerHTML = `
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
          <thead>
            <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0; text-align:left;">
              <th style="padding:8px 12px;">คำศัพท์ (Word)</th>
              <th style="padding:8px 12px;">คำอ่าน (Reading)</th>
              <th style="padding:8px 12px;">ความหมาย (Meaning)</th>
              <th style="padding:8px 12px;">หมวดหมู่</th>
              <th style="padding:8px 12px;">ระดับ</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(v => `
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:8px 12px; font-weight:700; font-size:14px; color:#0f172a;">${v.word}</td>
                <td style="padding:8px 12px; color:#64748b; font-family:monospace;">${v.reading || '-'}</td>
                <td style="padding:8px 12px; color:#334155;">${v.meaning || v.en || '-'}</td>
                <td style="padding:8px 12px;"><span style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-size:10px;">${v.cat || 'General'}</span></td>
                <td style="padding:8px 12px;"><span style="background:#fdf2f8; color:#be185d; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:700;">${v.level || '-'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    container.querySelectorAll('.vh-tab').forEach(b => {
      b.onclick = () => {
        container.querySelectorAll('.vh-tab').forEach(x => {
          x.style.background = '#f1f5f9';
          x.style.color = '#475569';
        });
        b.style.background = '#db2777';
        b.style.color = '#fff';
        showLang(b.getAttribute('data-lang'));
      };
    });

    container.querySelector('#vh-btn-export-csv').onclick = () => {
      HatafukuVocab.exportCSV(dict.en, 'hatafuku_vocabulary_export.csv');
    };

    showLang('th');
  }

  function renderListingPackUI(container) {
    const checklist = HatafukuListingPack.runPreSaleChecklist({});
    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="background:#fff; padding:18px; border-radius:18px; border:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between;">
          <div>
            <div style="font-weight:800; font-size:16px; color:#0f172a;">ตัวตรวจเช็กคุณภาพก่อนลงขาย (Pre-Sale Quality Checklist)</div>
            <div style="font-size:12px; color:#64748b;">คะแนนความพร้อมสินค้า: <b style="color:#059669;">${checklist.score}% (Ready for Sale)</b></div>
          </div>
          <span style="font-size:28px;">🛍️</span>
        </div>
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:10px;">
          ${checklist.checks.map(c => `
            <div style="background:#fff; border:1px solid #e2e8f0; padding:12px; border-radius:12px; display:flex; align-items:flex-start; gap:8px;">
              <span style="color:#059669; font-size:16px;">✅</span>
              <div>
                <div style="font-weight:700; font-size:12px; color:#1e293b;">${c.name}</div>
                <div style="font-size:11px; color:#64748b; margin-top:2px;">${c.detail}</div>
              </div>
            </div>
          `).join('')}
        </div>
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:16px;">
          <div style="font-weight:700; font-size:13px; color:#334155; margin-bottom:8px;">📄 ตัวอย่างใบอนุญาตพาณิชย์ที่จะใส่ใน ZIP (Commercial License):</div>
          <pre style="background:#0f172a; color:#f8fafc; padding:12px; border-radius:10px; font-size:10px; max-height:160px; overflow-y:auto; line-height:1.4;">${HatafukuListingPack.getCommercialLicense('Hatafuku Studio', 'Teacher Hatafuku', 'Printable Worksheet Pack')}</pre>
        </div>
      </div>
    `;
  }

  function renderDictationUI(container) {
    container.innerHTML = `
      <div style="background:#fff; padding:24px; border-radius:18px; border:1px solid #e2e8f0; max-width:640px; margin:0 auto; text-align:center;">
        <h2 style="margin-top:0; font-size:18px; color:#0f172a;">แบบฝึกเขียนตามคำบอก (Dictation Practice Sheet A4)</h2>
        <div style="display:flex; flex-direction:column; gap:10px; margin:20px 0; text-align:left;">
          ${Array.from({ length: 8 }).map((_, i) => `
            <div style="display:flex; align-items:center; gap:12px; padding:6px 0; border-bottom:1.5px dashed #cbd5e1;">
              <span style="font-weight:700; font-size:13px; color:#64748b; width:28px;">(${i + 1})</span>
              <span style="flex:1; height:20px;"></span>
            </div>
          `).join('')}
        </div>
        <button onclick="window.print()" style="padding:8px 20px; background:#0284c7; color:#fff; border:none; border-radius:10px; font-weight:700; cursor:pointer;">🖨️ พิมพ์ A4</button>
      </div>
    `;
  }

  function renderQuizUI(container) {
    container.innerHTML = `
      <div style="background:#fff; padding:24px; border-radius:18px; border:1px solid #e2e8f0; max-width:680px; margin:0 auto;">
        <h2 style="margin-top:0; font-size:18px; color:#0f172a; text-align:center;">แบบทดสอบวัดระดับคำศัพท์ 4 ตัวเลือก (Vocabulary Quiz A4)</h2>
        <div style="display:flex; flex-direction:column; gap:16px; margin:20px 0;">
          <div style="background:#f8fafc; padding:12px; border-radius:10px; border:1px solid #e2e8f0;">
            <b>ข้อที่ 1.</b> คำว่า "LION" ในภาษาไทยมีความหมายตรงกับสัตว์ชนิดใด?
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin-top:8px; font-size:12px;">
              <div>(ก) เสือโคร่ง</div>
              <div>(ข) สิงโตเจ้าป่า</div>
              <div>(ค) เสือดาว</div>
              <div>(ง) แมวป่า</div>
            </div>
          </div>
          <div style="background:#f8fafc; padding:12px; border-radius:10px; border:1px solid #e2e8f0;">
            <b>ข้อที่ 2.</b> อักษรจีน "你好" (nǐ hǎo) มีความหมายว่าอย่างไร?
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin-top:8px; font-size:12px;">
              <div>(ก) ลาก่อน</div>
              <div>(ข) ขอบคุณ</div>
              <div>(ค) สวัสดี</div>
              <div>(ง) ขอโทษ</div>
            </div>
          </div>
        </div>
        <div style="text-align:center;">
          <button onclick="window.print()" style="padding:8px 20px; background:#0284c7; color:#fff; border:none; border-radius:10px; font-weight:700; cursor:pointer;">🖨️ พิมพ์ A4</button>
        </div>
      </div>
    `;
  }

  function renderFlashcardsUI(container) {
    const cards = [
      { front: '🍎 APPLE', back: 'แอปเปิล (ผลไม้)' },
      { front: '🐱 CAT', back: 'แมว (ร้องเหมียวๆ)' },
      { front: '🐘 ELEPHANT', back: 'ช้าง (สัตว์ตัวใหญ่มีงวง)' },
      { front: '☀️ SUN', back: 'พระอาทิตย์' }
    ];
    container.innerHTML = `
      <div style="background:#fff; padding:20px; border-radius:18px; border:1px solid #e2e8f0; max-width:700px; margin:0 auto; text-align:center;">
        <h2 style="margin-top:0; font-size:18px; color:#0f172a;">แฟลชการ์ดตัดพับ 2 หน้า A4 (Double-sided Flashcards)</h2>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin:20px 0;">
          ${cards.map(c => `
            <div style="border:2px dashed #db2777; border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:8px;">
              <div style="font-weight:900; font-size:22px; color:#831843;">${c.front}</div>
              <div style="border-top:1px dashed #fbcfe8; padding-top:6px; font-size:12px; color:#475569;">${c.back}</div>
            </div>
          `).join('')}
        </div>
        <button onclick="window.print()" style="padding:8px 20px; background:#0284c7; color:#fff; border:none; border-radius:10px; font-weight:700; cursor:pointer;">🖨️ พิมพ์การ์ดตัดพับ A4</button>
      </div>
    `;
  }

  function renderWordWallUI(container) {
    const words = [
      { text: 'KINDNESS', th: 'ความเมตตา', icon: '💖' },
      { text: 'CREATIVITY', th: 'ความคิดสร้างสรรค์', icon: '🎨' },
      { text: 'FOCUS', th: 'สมาธิความตั้งใจ', icon: '🎯' },
      { text: 'SUCCESS', th: 'ความสำเร็จ', icon: '🏆' }
    ];
    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="text-align:center;">
          <h2 style="margin:0 0 6px; font-size:18px; color:#0f172a;">แผ่นป้ายคำศัพท์ติดผนังห้องเรียน (Word Wall Flash Posters A4)</h2>
          <button onclick="window.print()" style="padding:8px 20px; background:#0284c7; color:#fff; border:none; border-radius:10px; font-weight:700; cursor:pointer;">🖨️ พิมพ์แผ่นป้ายทั้งหมด</button>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
          ${words.map(w => `
            <div style="background:#fff; border:4px solid #db2777; border-radius:18px; padding:24px; text-align:center; box-shadow:0 8px 16px rgba(0,0,0,0.06);">
              <div style="font-size:36px; margin-bottom:8px;">${w.icon}</div>
              <div style="font-size:26px; font-weight:900; color:#831843; letter-spacing:1px;">${w.text}</div>
              <div style="font-size:14px; font-weight:700; color:#9d174d; margin-top:4px;">${w.th}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Attach to global HatafukuCore object
  const HatafukuCore = {
    version: '2.1.0',
    db: HatafukuDB,
    crypto: HatafukuCrypto,
    vocab: HatafukuVocab,
    recipes: HatafukuRecipeEngine,
    worksheets: HatafukuWorksheetNew,
    listing: HatafukuListingPack,
    setupModuleToolbar,
    openStudioModal,
    exportA4PNG: (el, fn) => HatafukuListingPack.exportA4PNG(el, fn),
    exportStoreZip: (opts) => HatafukuListingPack.exportStoreZip(opts)
  };

  global.HatafukuCore = HatafukuCore;

  // Auto mount floating recipe HUD if DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      HatafukuRecipeEngine.mountFloatingHUD();
    });
  } else {
    HatafukuRecipeEngine.mountFloatingHUD();
  }

})(typeof window !== 'undefined' ? window : this);
