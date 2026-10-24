# Lumina — series site

A hand-built static site for the Lumina series: AI Core, Engine, Voice, Artist and AR.

## Run it

No build step, no dependencies.

```bat
python -m http.server 5173 --bind 127.0.0.1
```

Then open <http://127.0.0.1:5173/>. You can also double-click `index.html`; every script is local and there are no external requests.

## What is in here

```
index.html                  one page, all five sections
assets/css/style.css        tokens, light/dark palette, layout, motion
assets/js/main.js           i18n, theme + view-transition wipe, nav, reveals
assets/js/tracks.js         voice sample metadata (player removed from the page)
assets/img/                 OC art plates, reward QR, favicon mark
assets/audio/               Lumina Voice samples for the player (currently unlinked)
tools/prepare-assets.py     one-off asset builder (uses local source paths)
tools/shot.mjs / test.mjs   local DevTools screenshot + smoke-test helpers
```

## Features

- **Bilingual** zh / en, persisted in `localStorage`, defaulting to the system language.
- **Light / dark / auto**, with a manual three-state control. Theme changes use a soft radial View Transition from the button, plus a color glow. Browsers without View Transitions get a full color crossfade.
- **Accessible**: skip link, real buttons, focus styles, translated `aria-label`s, `prefers-reduced-motion`, `prefers-contrast`.
- **No third-party requests**: system fonts only; no analytics, CDN, or webfonts.
- OC illustrations are shown as art-print plates (white paper ground) rather than keyed cutouts.
- The Voice sample player is intentionally not rendered while the engine is still being finished; its integration and audio assets are kept in the repo for later.

## Credits

- Series, code and OC: [380](https://github.com/Happy-380) · [Bilibili](https://space.bilibili.com/3546376302496335)
- Lumina Engine builds on [llama.cpp](https://github.com/ggml-org/llama.cpp) (MIT).
- Lumina Voice builds on [MeloTTS](https://github.com/myshell-ai/MeloTTS) (MIT).
- Site content and illustrations © 380. Code under AGPL-3.0 unless noted.
