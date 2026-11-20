---
format: 1920x1080
duration: 65s
message: "六个项目，两个角色，一间工坊——全部跑在你自己的机器里。"
arc: Scattered light → one light line → six islands → the line gathers again
audience: Bilibili / Xiaohongshu followers of 380, local-AI and indie-dev people
mode: autonomous
music: warm analog pad, 84 BPM, section boundaries on the cuts; no narration
captions: skipped (silent by design)
---

# Lumina — 六座岛，一条光

One continuous camera move, no cuts. Six studios sit on six islands; between them are
dark travel beats where only the light line is visible. The line leads the camera, and
each studio is woken up by it in the same order:

**line change → anchor graphic → logo mark + `Lumina [Studio]` wordmark → secondary
graphic → caption last.**

## Video direction

- **Stage:** near-black (`#06070b`) with a faint dot grid on the 0.3× layer, a soft
  vignette and 5 % grain. Nothing is pure black and nothing is flat.
- **Camera:** one rig (`x`, `scale`) for the whole film. Engine is the closest shot
  (`scale 1.17`), AR the farthest (`0.92 → 0.60`), everything else sits between. Stops are
  1.5–2 s and always ease in and out.
- **Depth:** three parallax layers — far stations 0.3×, studios 0.7×, the light line and
  everything it draws at 1.0×.
- **The wire:** a single continuous line at `y = 560`, drawn ahead of the camera with a
  glowing head dot, a soft bloom riding on that head, and faint ruler ticks. It changes shape
  inside each studio and never leaves frame.
- **One axis, one rhythm:** every studio is composed on the frame centre line (960) and on the
  same vertical rhythm — node label, mark, gesture on the wire, wordmark, caption. During a
  stop the camera holds its `x` exactly on the studio (only the scale drifts), so no studio
  ever sits off centre.
- **Type:** Inter for captions (300/400 at 40 px), EB Garamond for the wordmarks, JetBrains
  Mono for the indexical layer (nodes, metrics, detail columns, the English subline).
- **Restraint:** no charts, no counting numbers, no spinning, no glow on logos, no camera
  shake, no cut, no fade to black at the end. Colour arrives only as the site's six status
  accents: a 6 px dot on each node label, its hue in the pool of light under the wire, the
  rose top of the Voice spectrum, the gold behind the Artist badge.

## Frame plan

| # | Time | Studio | What the line does | Content |
| --- | --- | --- | --- | --- |
| 1 | 0 – 7.5 | Opening | 24 scattered dots gather (far ones first) into one point; **only once the words have landed** does the line run out to the right and keep going | 把光，留在自己的机器里。 |
| 2 | 7.5 – 13.3 | 01 AI Core | ripples like a voice, then opens a bubble outline | logo seal inside the bubble, `Lumina AI Core`, 会聊天的那一层。 |
| 3 | 14.5 – 23.3 | 02 Engine | **breaks apart into a field of 0s and 1s** — 88 glyphs on a jittered grid across the whole frame, dim, each one drifting like dust | the real figures read at frame scale while the bits are loose (14 个 CPU 变体 · per-128 激活 · 寄存器分块 GEMM / +42.5% pp32 · 1.07 GiB · 5.71 ppl), then fade; every bit falls back into the wire and the beam re-forms; 把 1-bit，塞进 CPU。 |
| 4 | 24 – 30.2 | 03 Voice | **becomes an audio spectrum** — 37 bars standing on the wire, each breathing on its own beat, then collapsing into one short line | `Lumina Voice`, the six languages evenly spaced under the spectrum, 断网，也能开口。 |
| 5 | 31 – 37.6 | 04 Artist | folds and leaves a trace | the brush stroke draws, a thin ring draws itself around **the real Lumina Artist badge** (from `D:/Lumina-Artist/.promo/film/assets/lumina-logo.png`), SD/Flux/Wan on the left and LoRA/.lumina on the right, 没有显卡，也能出图。 |
| 6 | 38.5 – 45.6 | 05 Animate | becomes the ground the characters stand on | Ewin + Miya walk in (pixel sprites, centred as a pair), stop, bob, logo above their heads, 把角色，做成会动的小人。 |
| 7 | 46.5 – 57.2 | 06 AR | draws an empty rectangle whose **bottom edge is the wire**, and keeps going | no furniture — the frame stays a marker space; the same two characters rise out of the wire and come to stand on that bottom edge, logo in the corner, 迟早，站上你的桌面。 |
| 8 | 57 – 65 | Close | retracts from the left, gathers into one light | six distant stations dim behind, mark + `Lumina`, 能离线就离线，能本地就本地。, then the project site `https://happy-380.github.io/Lumina-Website` (3.5 s on screen). Hold, no fade. |

Travel beats: 6–7.5, 13.3–14.5, 23.3–24, 30.2–31, 37.6–38.5, 45.6–46.5, 57.2–58.5. During a
beat the studio just left dissolves and the next station glows faintly on the 0.3× layer.

## Sources

- Logos: the six series-card SVG marks from the site itself (no invented marks).
- Characters: pixel sprites rasterised from `D:\Lumina-Animate\task-2` (read-only source),
  saved as `assets/img/pixel-girl.png` / `pixel-boy.png`.
- Numbers: the Engine project's own figures (+42.5 % pp32, 1.07 GiB, 5.71 ppl, 14 variants), read at frame scale while the 0/1 field is loose.
- Music: composed for this cut (`scripts/make-bgm-v4.mjs` → `assets/audio/bgm.wav`, 65.0 s,
  section boundaries on 7.5 / 14.5 / 24 / 31 / 38.5 / 46.5 / 58.5).
