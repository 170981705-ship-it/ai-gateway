/* 发卡工具离线缓存（与「个人工作台」同一套写法）
   - 主页面（navigate）走 network-first：你改了 HTML，手机下次打开就是新版，不用手动升缓存号
   - 离线时回落缓存：夜间没网也能开，照样出码
   - activate 时清掉上一版缓存，避免旧 SW 残留
   改版时把 CACHE_VERSION 加大（v1→v2）可强制重试一次。
   注意：Service Worker 只在 https / localhost 注册；局域网 http://192.168.x.x 装不上（浏览器规则，改不了）。 */
var CACHE_VERSION = 'v1';
var CACHE = 'phone-keygen-' + CACHE_VERSION;
var PRECACHE = [
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-180.png',
  './icon-192.png',
  './sw.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(PRECACHE).catch(function () {
        return c.addAll(['./phone_keygen.html', './sw.js']);
      });
    }).then(function () { self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k.indexOf('phone-keygen-') === 0 && k !== CACHE;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;

  // 主页面：先问网络，拿得到就更新缓存；拿不到（离线/超时）才回落到缓存
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(function (resp) {
        if (resp && resp.ok) {
          var copy = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return resp;
      }).catch(function () { return caches.match(e.request); })
    );
    return;
  }

  // 静态资源：缓存优先（manifest / icon 不会频繁变）
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (resp) {
        if (resp && resp.ok) {
          var copy = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return resp;
      }).catch(function () { return hit; });
    })
  );
});
