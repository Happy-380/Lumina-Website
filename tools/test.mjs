// Interaction smoke tests + state screenshots via CDP.
import fs from "node:fs";
import http from "node:http";

function getJSON(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: "127.0.0.1", port: 9222, path }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve(JSON.parse(d)));
    }).on("error", reject);
  });
}

const targets = await getJSON("/json");
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });

let seq = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
  }
};
function send(method, params = {}) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function evalJS(expression) {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + " " + JSON.stringify(r.exceptionDetails.exception));
  return r.result.value;
}
async function shot(name, w = 1440, h = 1000) {
  const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  fs.writeFileSync(`preview/${name}.png`, Buffer.from(r.data, "base64"));
}

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: "http://127.0.0.1:5173/?theme=light&lang=zh" });
await wait(2600);

const results = {};
results.initial = await evalJS(`({
  theme: document.documentElement.dataset.theme,
  mode: document.documentElement.dataset.themeMode,
  lang: document.documentElement.lang,
  title: document.title,
  bars: document.querySelectorAll('#wave-base i').length,
  label: document.getElementById('track-label').textContent,
  vt: typeof document.startViewTransition,
  notes: document.querySelector('.manifesto-side .hand').textContent,
  audioSrc: document.getElementById('audio').getAttribute('src')
})`);

// language switch
await evalJS(`document.querySelector('[data-lang-set="en"]').click()`);
await wait(300);
results.english = await evalJS(`({
  lang: document.documentElement.lang,
  title: document.title,
  notes: document.querySelector('.manifesto-side .hand').textContent,
  cta: document.querySelector('.hero-actions .btn span').textContent,
  player: document.getElementById('track-label').textContent,
  navAria: document.querySelector('.nav').getAttribute('aria-label'),
  meta: document.querySelector('meta[name="description"]').content
})`);

// play + switch timbre
await evalJS(`document.getElementById('play-btn').click()`);
await wait(1200);
results.played = await evalJS(`({
  paused: document.getElementById('audio').paused,
  time: document.getElementById('audio').currentTime,
  playingClass: document.getElementById('play-btn').classList.contains('is-playing'),
  playLabel: document.getElementById('play-btn').getAttribute('aria-label'),
  progress: document.getElementById('wave').getAttribute('aria-valuenow')
})`);
await evalJS(`document.querySelector('[data-track-tone="rvc"]').click()`);
await wait(900);
results.rvc = await evalJS(`({
  label: document.getElementById('track-label').textContent,
  note: document.getElementById('player-note').textContent,
  src: document.getElementById('audio').getAttribute('src'),
  paused: document.getElementById('audio').paused
})`);
await evalJS(`document.getElementById('audio').pause()`);

// QR dialog
await evalJS(`document.getElementById('qr-open').click()`);
await wait(350);
results.dialog = await evalJS(`({
  open: document.getElementById('qr-dialog').open,
  locked: document.body.classList.contains('is-locked')
})`);
await shot("state-dialog");
await evalJS(`document.getElementById('qr-close').click()`);
await wait(250);
results.dialogClosed = await evalJS(`({
  open: document.getElementById('qr-dialog').open,
  locked: document.body.classList.contains('is-locked'),
  focus: document.activeElement.id
})`);

// copy
await evalJS(`document.querySelector('.copy-btn').click()`);
await wait(200);
results.copy = await evalJS(`({
  copied: document.querySelector('.copy-btn').dataset.copied,
  text: document.querySelector('.copy-btn span').textContent
})`);

// theme switch — capture mid-view-transition
await evalJS(`document.querySelector('.theme-seg [data-theme-set="dark"]').click()`);
await wait(320);
await shot("state-vt-mid");
await wait(1000);
results.dark = await evalJS(`({
  theme: document.documentElement.dataset.theme,
  mode: document.documentElement.dataset.themeMode,
  pressed: document.querySelector('.theme-seg [data-theme-set="dark"]').getAttribute('aria-pressed')
})`);
await shot("state-dark-hero");

// back to auto
await evalJS(`document.querySelector('.theme-seg [data-theme-set="auto"]').click()`);
await wait(1200);
results.auto = await evalJS(`({
  theme: document.documentElement.dataset.theme,
  mode: document.documentElement.dataset.themeMode
})`);

// mobile: menu + hero
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await wait(500);
await evalJS(`window.scrollTo(0,0)`);
await evalJS(`document.querySelector('.menu-btn').click()`);
await wait(400);
results.menu = await evalJS(`({
  expanded: document.querySelector('.menu-btn').getAttribute('aria-expanded'),
  hidden: document.getElementById('mobile-menu').hidden,
  open: document.getElementById('mobile-menu').classList.contains('is-open'),
  locked: document.body.classList.contains('is-locked')
})`);
await shot("state-menu", 390, 844);
await evalJS(`document.querySelector('.menu-btn').click()`);
await wait(400);
await shot("state-mobile-hero", 390, 844);

// reduced motion emulation + reload
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
await send("Page.navigate", { url: "http://127.0.0.1:5173/?theme=light&lang=zh" });
await wait(1500);
results.reduce = await evalJS(`({
  match: matchMedia('(prefers-reduced-motion: reduce)').matches,
  revealVisible: getComputedStyle(document.querySelector('.product')).opacity,
  ltr: getComputedStyle(document.querySelector('.hero-title .ltr')).opacity,
  grain: getComputedStyle(document.querySelector('.grain')).display
})`);
await send("Emulation.setEmulatedMedia", { features: [] });

console.log(JSON.stringify(results, null, 2));
ws.close();
