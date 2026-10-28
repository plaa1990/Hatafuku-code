const CACHE_NAME = 'hatafuku-v61';
const APP_FILES = [
  './',
  './index.html',
  './standalone-index.html',
  './handwriting.html',
  './balloons.html',
  './codequest.html',
  './draw.html',
  './draw-studio.html',
  './studio.html',
  './lessons.html',
  './typing.html',
  './extras.html',
  './line-theme.html',
  './app.css',
  './app.js',
  './hatafuku-theme.css',
  './cozy-theme.css',
  './theme.css',
  './worksheet-extras.js',
  './worksheet-free.js',
  './balloon-plus.js',
  './pg-color-fields.js',
  './studio-ext.js',
  './studio-plus.js',
  './fx.js',
  './io.js',
  './html2canvas.min.js',
  './jszip.min.js',
  './qrcode.min.js',
  './manifest.webmanifest',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon.svg',
  './favicon.ico',
  './favicon.png'
];
// ไลบรารี/ฟอนต์จากภายนอก: พยายามแคชตอนติดตั้ง ถ้าโหลดไม่ได้ก็ข้ามได้ (ไม่ทำให้การติดตั้งล้ม)
const EXTERNAL_FILES = [
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];
const EXTERNAL_HOSTS = [
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_FILES);
    await Promise.all(EXTERNAL_FILES.map(async url => {
      try {
        const res = await fetch(new Request(url, { mode: 'no-cors' }));
        await cache.put(url, res);
      } catch (e) { /* ออฟไลน์ตอนติดตั้ง: จะแคชเองเมื่อถูกใช้งานครั้งแรกขณะออนไลน์ */ }
    }));
  })());
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // ภายนอก (CDN / Google Fonts): ใช้ของในแคชก่อน แล้วอัปเดตเบื้องหลัง
  if (EXTERNAL_HOSTS.includes(url.hostname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);
      const network = fetch(event.request).then(res => {
        if (res && (res.ok || res.type === 'opaque')) cache.put(event.request, res.clone());
        return res;
      }).catch(() => null);
      return cached || (await network) || Response.error();
    })());
    return;
  }

  if (url.origin !== self.location.origin) return;

  // ไฟล์ของแอป: ลองออนไลน์ก่อน ถ้าไม่ได้ใช้แคช
  event.respondWith(
    fetch(event.request).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(event.request);
      return cached || caches.match('./index.html');
    })
  );
});
