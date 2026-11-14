// Capture the local Lumina site over the Chrome DevTools Protocol (port 9222).
// The hyperframes CLI capture is blocked by an anti-bot false positive on this
// machine, so this takes the "provide source assets directly" path: a 1x
// full-page plate plus one 1920x1080 viewport shot per section, plus tokens,
// visible text and the brand image assets.
//
// Usage: node scripts/shoot-site.mjs [url] [outDir]
import fs from "node:fs";
import path from "node:path";
import http from "node:http";

const url = process.argv[2] || "http://127.0.0.1:5180/";
const outDir = process.argv[3] || "capture";
const shotsDir = path.join(outDir, "screenshots");
const assetsDir = path.join(outDir, "assets");
const extractedDir = path.join(outDir, "extracted");
for (const d of [shotsDir, assetsDir, extractedDir]) fs.mkdirSync(d, { recursive: true });

const port = Number(process.env.CDP_PORT || 9333);
const getJSON = (p) =>
  new Promise((resolve, reject) => {
    http
      .get({ host: "127.0.0.1", port, path: p }, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve(JSON.parse(data)));
      })
      .on("error", reject);
  });

const targets = await getJSON("/json");
const origin = new URL(url).origin;
const pick = () =>
  targets.find((t) => t.type === "page" && t.url.startsWith(origin)) ||
  targets.find((t) => t.type === "page" && t.url === "about:blank") ||
  targets.find((t) => t.type === "page");
let page = pick();
if (!page) throw new Error(`no page target on ${port}`);
console.log("target", page.url);

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => {
  ws.onopen = r;
  ws.onerror = j;
});

let seq = 0;
const pending = new Map();
const events = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  } else if (msg.method === "Page.loadEventFired") events.push(msg);
};
const send = (method, params = {}) => {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
};
const evaluate = async (expression) => {
  const res = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.text);
  return res.result.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1920,
  height: 1080,
  deviceScaleFactor: 1,
  mobile: false,
});

await send("Page.navigate", { url });
await sleep(2500);

// Settle entrance state: reveal everything, stop looping animations, pin theme.
await evaluate(`(async () => {
  document.documentElement.dataset.theme = 'light';
  document.documentElement.dataset.themeMode = 'light';
  document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'));
  // Entrance animations are one-shot with forwards fill; let them finish, then pin
  // their end state so the plate is deterministic regardless of timing.
  document.querySelectorAll('.hero-enter, .hero-title .ltr').forEach((el) => {
    el.style.animation = 'none';
    el.style.opacity = '1';
    el.style.transform = 'none';
  });
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    el.style.opacity = '1';
    el.style.transform = 'none';
  });
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 1200));
  window.scrollTo(0, 0);
  return true;
})()`);
await sleep(800);

// ---------- tokens / text ----------
const meta = await evaluate(`(() => {
  const cs = getComputedStyle(document.documentElement);
  const body = getComputedStyle(document.body);
  return {
    title: document.title,
    description: (document.querySelector('meta[name="description"]') || {}).content || '',
    fonts: [body.fontFamily, cs.getPropertyValue('--serif').trim(), cs.getPropertyValue('--mono').trim(), cs.getPropertyValue('--hand').trim()],
    colors: {
      bg: cs.getPropertyValue('--bg').trim(),
      bgSoft: cs.getPropertyValue('--bg-soft').trim(),
      card: cs.getPropertyValue('--card').trim(),
      ink: cs.getPropertyValue('--ink').trim(),
      ink2: cs.getPropertyValue('--ink-2').trim(),
      ink3: cs.getPropertyValue('--ink-3').trim(),
      blue: cs.getPropertyValue('--blue').trim(),
      cyan: cs.getPropertyValue('--cyan').trim(),
      rose: cs.getPropertyValue('--rose').trim(),
      gold: cs.getPropertyValue('--gold').trim(),
      teal: cs.getPropertyValue('--teal').trim(),
      panel: cs.getPropertyValue('--panel').trim(),
      panelInk: cs.getPropertyValue('--panel-ink').trim(),
      panelAccent: cs.getPropertyValue('--panel-accent').trim(),
    }
  };
})()`);
fs.writeFileSync(
  path.join(extractedDir, "tokens.json"),
  JSON.stringify({ title: meta.title, description: meta.description, colors: meta.colors, fonts: meta.fonts }, null, 2)
);

const text = await evaluate(`document.body.innerText`);
fs.writeFileSync(path.join(extractedDir, "visible-text.txt"), text);

// ---------- full-page plate ----------
const metrics = await send("Page.getLayoutMetrics");
const fullH = Math.ceil(metrics.cssContentSize.height);
const fullW = Math.ceil(metrics.cssContentSize.width);
console.log("content size", fullW, fullH);
{
  const r = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: fullW, height: fullH, scale: 1 },
  });
  fs.writeFileSync(path.join(shotsDir, "full-page.png"), Buffer.from(r.data, "base64"));
}

// ---------- section viewport shots ----------
const sections = [
  ["01-hero", ".hero"],
  ["02-manifesto", "#manifesto"],
  ["03-series", "#series"],
  ["04-engine", "#engine"],
  ["05-voice", "#voice"],
  ["06-characters", "#characters"],
  ["07-about", "#about"],
  ["08-footer", "footer"],
];

const positions = {};
for (const [name, sel] of sections) {
  const found = await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(sel)});
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top + window.scrollY, height: r.height };
  })()`);
  if (!found) {
    console.log("missing", sel);
    continue;
  }
  positions[name] = found;
  const target = Math.max(0, Math.round(found.top - 40));
  await evaluate(`window.scrollTo(0, ${target})`);
  await sleep(700);
  const r = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(shotsDir, `${name}.png`), Buffer.from(r.data, "base64"));
  console.log("shot", name, "scrollY", target, "h", Math.round(found.height));
}
fs.writeFileSync(path.join(extractedDir, "section-positions.json"), JSON.stringify(positions, null, 2));

// ---------- brand image assets ----------
const imgUrls = await evaluate(`(() => {
  return [...document.images].map((i) => ({ src: i.currentSrc || i.src, w: i.naturalWidth, h: i.naturalHeight, alt: i.alt }));
})()`);
const assets = [];
for (const img of imgUrls) {
  const u = new URL(img.src);
  const rel = u.pathname.replace(/^\//, "");
  const dest = path.join(assetsDir, rel.replace(/\//g, "__"));
  if (!fs.existsSync(dest)) {
    const res = await fetch(img.src);
    if (res.ok) fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  }
  assets.push({ file: path.basename(dest), source: rel, width: img.w, height: img.h, alt: img.alt });
}
fs.writeFileSync(path.join(extractedDir, "images.json"), JSON.stringify(assets, null, 2));
console.log("assets", assets.length);

await evaluate(`window.scrollTo(0, 0)`);
ws.close();
console.log("done");
