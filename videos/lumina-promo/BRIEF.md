---
workflow: product-launch-video
flow: automation
storyboard: no
message: "六个项目，两个角色，一间工坊——全部跑在你自己的机器里。"
destination: bilibili-xiaohongshu
aspect: 1920x1080
language: zh
length: 65s
angle: one-shot-workshop
---

## Intent

A 65-second, silent-by-design film for the Lumina series (AI Core, Engine, Voice, Artist,
Animate, AR) — the site's six instruments as six islands in the dark, joined by one light
line. Apple-style grammar: one unbroken camera move, full stops at each island, content
woken by the line instead of panned across. The person asked for music rather than a
voiceover, and for the picture to stay refined rather than simple: paper-thin hairlines,
tiny mono annotations, ruler ticks on the wire, real character sprites, no decoration for
decoration's sake. Claim: 能离线就离线，能本地就本地，联网只是一个选项.

## Assets

- `assets/img/pixel-girl.png`, `assets/img/pixel-boy.png` — Ewin and Miya, rasterised at 3×
  from the pixel sprites in `D:/Lumina-Animate/task-2` (source read-only, never edited).
- `assets/img/mark.svg` — the site mark, used once at the close.
- `assets/img/artist-logo.png` — the real Lumina Artist badge, copied from
  `D:/Lumina-Artist/.promo/film/assets/lumina-logo.png`; the only colour in the film.
- Six series-card logo graphics — inlined from the site's own `<svg>` marks (AI Core,
  Engine, Voice, Artist, Animate, AR). No invented marks.
- `capture/screenshots/*.png` — real 1920×1080 captures of the live site; used as the
  reference for type, values and the English sublines.
- BGM: `assets/audio/bgm.wav`, composed locally in `scripts/make-bgm-v4.mjs` (65.0 s,
  84 BPM, A minor, section boundaries on the cuts). The HeyGen catalogue needs a sign-in
  this machine does not have.

## Customizations

- Single camera rig (`x`, `scale`) + three parallax layers (0.3 / 0.7 / 1.0).
- Progressive reveal in a fixed order per studio, caption always last.
- Engine is visualised, not tabulated: the wire breaks into 88 zeroes and ones on a jittered
  grid that fills the frame, dim and drifting like dust, and every bit falls back into the beam
  on the way out (no charts, no count-up). Its real figures (+42.5 % pp32 · 1.07 GiB · 5.71 ppl ·
  14 变体) are read at frame scale while the bits are loose, never as margin annotations.
- Voice turns the wire into a spectrum: 37 bars stand on it and breathe, then collapse into one
  short line as the mark arrives.
- AR draws an empty rectangle whose bottom edge *is* the wire — no table, no stool — and the
  two characters rise out of the wire through that edge, clipped by the frame rather than faded,
  and come to a stop standing on it.
- All six studios sit on the frame centre line and one vertical rhythm; the camera never drifts
  sideways inside a stop. Colour is rationed to the site's status accents (a 6 px dot per node,
  the pool of light under the wire, the spectrum's rose, the badge's gold).
- Close holds on the mark with no fade to black, then the project site
  `https://happy-380.github.io/Lumina-Website` fades in under a 1 px blue rule and stays up for the
  last 3.5 s.

## Notes

- The CLI capture path reported a false access-protection 403 on this machine; the
  project's own DevTools helper (`scripts/shoot-site.mjs`) took the real shots instead.
- Rendering needs FFmpeg and FFprobe. On this machine the pair that work:
  `C:/Users/seewo/AppData/Local/Programs/Python/Python311/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe`
  and `D:/Lumina-Artist/.promo/tools/node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe`;
  point `HYPERFRAMES_FFMPEG_PATH` / `HYPERFRAMES_FFPROBE_PATH` at them before `render`.
  `HYPERFRAMES_FFMPEG_PATH` / `HYPERFRAMES_FFPROBE_PATH` at it before `render`.
  Output: `renders/lumina-promo.mp4` (65.0 s, 1920×1080, 30 fps, h264 + AAC stereo).
- Landscape 1920×1080 only. Chinese on screen; English only as the small subline.
