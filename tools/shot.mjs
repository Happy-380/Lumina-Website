// Full-page screenshots through the Chrome DevTools Protocol.
// Usage: node tools/shot.mjs <url> <out-prefix> [width] [viewportHeight]
import fs from "node:fs";
import http from "node:http";

const url = process.argv[2] || "http://127.0.0.1:5173/";
const out = process.argv[3] || "preview/shot";
const width = Number(process.argv[4] || 1440);
const vh = Number(process.argv[5] || 1000);

function getJSON(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: "127.0.0.1", port: 9222, path }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });
}

const targets = await getJSON("/json");
const page = targets.find((t) => t.type === "page");
if (!page) throw new Error("no page target");

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });

let seq = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  }
};
function send(method, params = {}) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width, height: vh, deviceScaleFactor: 1, mobile: false
});
await send("Page.navigate", { url });
await new Promise((r) => setTimeout(r, 2200));
// let entrance animations finish and force every reveal to its final state
await send("Runtime.evaluate", {
  expression: `(async () => {
    document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-in'));
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 1200));
    document.querySelectorAll('*').forEach(el => {
      const a = getComputedStyle(el).animationName;
      if (a === 'plate-bob') el.style.animation = 'none';
    });
  })()`,
  awaitPromise: true
});

const metrics = await send("Page.getLayoutMetrics");
const fullH = Math.ceil(metrics.cssContentSize.height);
const contentW = Math.ceil(metrics.cssContentSize.width);
console.log("content", contentW, fullH);

const scale = Math.min(1, 1400 / contentW);
let y = 0;
let i = 0;
while (y < fullH) {
  const h = Math.min(1600, fullH - y);
  const res = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { x: 0, y, width: contentW, height: h, scale }
  });
  fs.writeFileSync(`${out}-${String(i).padStart(2, "0")}.png`, Buffer.from(res.data, "base64"));
  y += h;
  i++;
}
console.log("wrote", i, "slices");
ws.close();
