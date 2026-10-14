/* なっとく数Ⅱ の通知係（service worker）
   通知の中身は空で届く。届いたら、記録先（GAS）に北野先生の返事を取りに行き、通知に出す。
   登録するとき sw.js?dev=端末ID&api=記録先URL を渡している。 */
const Q = new URL(self.location.href).searchParams;
const DEV = Q.get("dev") || "", API = Q.get("api") || "";
const HOME = new URL("./", self.location.href).href;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

function withTimeout(p, ms){ return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]); }

async function latestReply(){
  if (!API || !DEV) return null;
  try {
    const r = await withTimeout(fetch(API + "?mode=replies&dev=" + encodeURIComponent(DEV)), 5000);
    const d = await r.json();
    const items = (d && d.items) || [];
    return items.length ? items[items.length - 1] : null;
  } catch (e) { return null; }
}

self.addEventListener("push", e => {
  e.waitUntil((async () => {
    const it = await latestReply();
    const body = it ? `第${it.lesson}回：${String(it.reply).slice(0, 80)}` : "アプリを開いて見てみよう。";
    await self.registration.showNotification("北野先生から返事がきたよ", {
      body, icon: "icon-192.png", badge: "icon-192.png", tag: "nattoku-reply", data: {url: HOME}
    });
  })());
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || HOME;
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({type: "window", includeUncontrolled: true});
    for (const c of list) { if (c.url.startsWith(HOME) && "focus" in c) return c.focus(); }
    return self.clients.openWindow(url);
  })());
});
