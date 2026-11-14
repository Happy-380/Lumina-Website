// Local review harness: seek the composition timeline and grab frames over CDP.
// Usage: node scripts/seek-shot.mjs 4.6,9.2,16.4 [outPrefix]
import http from "node:http";
import fs from "node:fs";
const PORT = Number(process.env.CDP_PORT || 9334);
const times = (process.argv[2] || "0").split(",").map(Number);
const prefix = process.argv[3] || "snaps/f";
const getJSON = (p) => new Promise((res, rej) => {
  http.get({ host: "127.0.0.1", port: PORT, path: p }, (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(JSON.parse(d))); }).on("error", rej);
});
const targets = await getJSON("/json");
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let seq = 0; const pending = new Map(); const logs = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result); }
  if (m.method === "Runtime.exceptionThrown") logs.push("EXC: " + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
};
const send = (method, params = {}) => { const id = ++seq; return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); }); };
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + " " + (r.exceptionDetails.exception?.description || ""));
  return r.result.value;
};
await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
const url = "file:///C:/Users/p8613/Documents/GitHub/Lumina-Website/videos/lumina-promo/index.html";
await send("Page.navigate", { url });
await new Promise((r) => setTimeout(r, 3000));
const info = await evaluate(`JSON.stringify({tl: Object.keys(window.__timelines||{}), dur: window.__timelines && window.__timelines.main ? window.__timelines.main.duration() : null, studios: document.querySelectorAll('.studio').length})`);
console.log(info);
fs.mkdirSync(prefix.split("/").slice(0, -1).join("/") || "snaps", { recursive: true });
for (const t of times) {
  await evaluate(`window.__timelines.main.seek(${t}, false); window.__render && window.__render(); document.fonts.ready.then(()=>true)`);
  await new Promise((r) => setTimeout(r, 450));
  const shot = await send("Page.captureScreenshot", { format: "png" });
  const f = `${prefix}-${t}.png`;
  fs.writeFileSync(f, Buffer.from(shot.data, "base64"));
  console.log("wrote", f);
}
if (logs.length) console.log(logs.slice(0, 5).join("\n"));
ws.close();
