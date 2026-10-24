/* ==========================================================================
   Lumina Series — interface behaviour
   Vanilla JS. No dependencies, no network calls.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var fineQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  var darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
  var reduce = reduceQuery.matches;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function store(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }
  function read(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function uiLang() { return root.dataset.lang === "en" ? "en" : "zh"; }
  function reduced() { return reduceQuery.matches; }
  function finePointer() { return fineQuery.matches; }

  /* ---------------------------------------------------------------------
     Language
     --------------------------------------------------------------------- */
  var META = {
    zh: {
      title: "Lumina — 一间属于你自己的 AI 工坊",
      desc: "Lumina 系列：AI Core、Engine、Voice、Artist 与 AR。全部跑在本地，围绕两个原创角色展开。"
    },
    en: {
      title: "Lumina — A workshop of light",
      desc: "The Lumina series: AI Core, Engine, Voice, Artist and AR. Local-first tools built around two original characters."
    }
  };

  function applyLanguage(lang) {
    var isZh = lang !== "en";
    root.dataset.lang = isZh ? "zh" : "en";
    root.lang = isZh ? "zh-CN" : "en";
    store("lumina-lang", root.dataset.lang);

    $$("[data-zh]").forEach(function (el) {
      var text = isZh ? el.getAttribute("data-zh") : el.getAttribute("data-en");
      if (text != null) el.textContent = text;
    });
    $$("[data-zh-aria]").forEach(function (el) {
      var text = isZh ? el.getAttribute("data-zh-aria") : el.getAttribute("data-en-aria");
      if (text != null) el.setAttribute("aria-label", text);
    });
    $$("[data-zh-alt]").forEach(function (el) {
      var text = isZh ? el.getAttribute("data-zh-alt") : el.getAttribute("data-en-alt");
      if (text != null) el.setAttribute("alt", text);
    });
    $$("[data-lang-set]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.getAttribute("data-lang-set") === root.dataset.lang));
    });

    document.title = isZh ? META.zh.title : META.en.title;
    var desc = $('meta[name="description"]');
    if (desc) desc.setAttribute("content", isZh ? META.zh.desc : META.en.desc);

    syncCopyLabel();
    updatePlayerLabels();
    updatePlayLabel();
  }

  $$("[data-lang-set]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var next = btn.getAttribute("data-lang-set");
      if (next !== root.dataset.lang) applyLanguage(next);
    });
  });

  applyLanguage(uiLang());

  /* ---------------------------------------------------------------------
     Theme
     --------------------------------------------------------------------- */
  var themeColor = $('meta[name="theme-color"]');
  var flash = $(".theme-flash");
  var themeOrigin = $(".theme-seg button[data-theme-set]");
  var vtRunning = false;

  function resolveTheme(mode) {
    if (mode === "light" || mode === "dark") return mode;
    return darkQuery.matches ? "dark" : "light";
  }

  function paintTheme(theme, mode) {
    root.dataset.theme = theme;
    root.dataset.themeMode = mode;
    if (themeColor) themeColor.setAttribute("content", theme === "dark" ? "#0a0b0f" : "#f3f0e9");
    $$("[data-theme-set]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.getAttribute("data-theme-set") === mode));
    });
    store("lumina-theme", mode);
  }

  function playFlash(x, y, nextTheme) {
    if (!flash || reduced()) return;
    flash.style.setProperty("--fx", x + "px");
    flash.style.setProperty("--fy", y + "px");
    flash.style.background = nextTheme === "dark"
      ? "radial-gradient(62vmax 62vmax at var(--fx) var(--fy), rgba(126,172,255,.30), transparent 62%)"
      : "radial-gradient(62vmax 62vmax at var(--fx) var(--fy), rgba(255,246,220,.55), transparent 64%)";
    flash.animate(
      [{ opacity: 0 }, { opacity: 0.75, offset: 0.2 }, { opacity: 0 }],
      { duration: 900, easing: "ease-out" }
    );
  }

  function setTheme(mode, origin) {
    var nextTheme = resolveTheme(mode);
    var changed = nextTheme !== root.dataset.theme;
    var target = origin || themeOrigin || root;

    if (!changed) {
      paintTheme(nextTheme, mode);
      return;
    }
    if (reduced() || typeof document.startViewTransition !== "function") {
      if (typeof document.startViewTransition !== "function" && !reduced()) {
        root.classList.add("theme-fade");
        paintTheme(nextTheme, mode);
        window.setTimeout(function () { root.classList.remove("theme-fade"); }, 520);
      } else {
        paintTheme(nextTheme, mode);
      }
      return;
    }

    var rect = target.getBoundingClientRect();
    var x = rect.left + rect.width / 2;
    var y = rect.top + rect.height / 2;
    var far = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    var radius = far * 1.2;

    root.style.setProperty("--vt-x", x + "px");
    root.style.setProperty("--vt-y", y + "px");
    playFlash(x, y, nextTheme);

    if (vtRunning) {
      paintTheme(nextTheme, mode);
      return;
    }
    vtRunning = true;

    var vt = document.startViewTransition(function () {
      paintTheme(nextTheme, mode);
    });

    vt.ready.then(function () {
      var frames = [];
      var steps = 20;
      for (var i = 0; i <= steps; i++) {
        var t = i / steps;
        var s = radius * 2 * t;
        frames.push({
          maskSize: s + "px " + s + "px",
          maskPosition: (x - s / 2) + "px " + (y - s / 2) + "px"
        });
      }
      document.documentElement.animate(frames, {
        duration: 780,
        easing: "cubic-bezier(0.77, 0, 0.175, 1)",
        pseudoElement: "::view-transition-new(root)"
      });
    }).catch(function () {});

    vt.finished.then(function () {
      vtRunning = false;
      root.style.removeProperty("--vt-x");
      root.style.removeProperty("--vt-y");
    }).catch(function () {
      vtRunning = false;
    });
  }

  $$("[data-theme-set]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setTheme(btn.getAttribute("data-theme-set"), btn);
    });
  });

  var onSystemTheme = function () {
    if (root.dataset.themeMode === "auto") {
      setTheme("auto", $('.theme-seg button[data-theme-set="auto"]'));
    }
  };
  if (typeof darkQuery.addEventListener === "function") darkQuery.addEventListener("change", onSystemTheme);
  else if (typeof darkQuery.addListener === "function") darkQuery.addListener(onSystemTheme);

  reduceQuery.addEventListener("change", function () { reduce = reduceQuery.matches; });

  paintTheme(root.dataset.theme || resolveTheme(root.dataset.themeMode || "auto"), root.dataset.themeMode || "auto");

  /* ---------------------------------------------------------------------
     Header: scroll state, progress, active section
     --------------------------------------------------------------------- */
  var head = $(".site-head");
  var progress = $(".head-progress");
  var sections = ["series", "engine", "voice", "characters", "about"]
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
  var navLinks = $$("[data-nav]");
  var railLinks = $$("[data-rail]");
  var ticking = false;

  function setActive(id) {
    navLinks.forEach(function (a) {
      var on = a.getAttribute("data-nav") === id;
      if (on) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    railLinks.forEach(function (a) {
      var on = a.getAttribute("data-rail") === id;
      if (on) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
  }

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (head) head.classList.toggle("is-scrolled", y > 14);
    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
    }

    var probe = y + window.innerHeight * 0.36;
    var current = "";
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].offsetTop <= probe) current = sections[i].id;
    }
    setActive(current);
    ticking = false;
  }

  window.addEventListener("scroll", function () {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  }, { passive: true });
  window.addEventListener("resize", function () {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  });
  onScroll();

  /* ---------------------------------------------------------------------
     Mobile menu
     --------------------------------------------------------------------- */
  var menuBtn = $(".menu-btn");
  var menu = $("#mobile-menu");
  var menuOpen = false;
  var closeTimer = null;

  function openMenu() {
    if (!menu || menuOpen) return;
    window.clearTimeout(closeTimer);
    menuOpen = true;
    menu.hidden = false;
    document.body.classList.add("is-locked");
    menuBtn.setAttribute("aria-expanded", "true");
    requestAnimationFrame(function () {
      menu.classList.add("is-open");
      var first = menu.querySelector("a");
      if (first) first.focus({ preventScroll: true });
    });
  }

  function closeMenu(restoreFocus) {
    if (!menu || !menuOpen) return;
    menuOpen = false;
    menu.classList.remove("is-open");
    menuBtn.setAttribute("aria-expanded", "false");
    document.body.classList.remove("is-locked");
    if (restoreFocus) menuBtn.focus({ preventScroll: true });
    closeTimer = window.setTimeout(function () { menu.hidden = true; }, 240);
  }

  if (menuBtn && menu) {
    menuBtn.addEventListener("click", function () {
      if (menuOpen) closeMenu(true); else openMenu();
    });
    $$("a", menu).forEach(function (a) {
      a.addEventListener("click", function () { closeMenu(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menuOpen) closeMenu(true);
      if (e.key === "Tab" && menuOpen) {
        var focusables = $$("a, button", menu);
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 980 && menuOpen) closeMenu(false);
    });
  }

  /* ---------------------------------------------------------------------
     Scroll reveal
     --------------------------------------------------------------------- */
  var revealEls = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !reduced()) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------------------------------------------------------------------
     Hero: pointer parallax + soft glow
     --------------------------------------------------------------------- */
  var hero = $(".hero");
  var heroArt = $(".hero-art");
  var glow = $(".hero-glow");
  var targetX = 0, targetY = 0, currentX = 0, currentY = 0;
  var parallaxRaf = 0;

  function parallaxTick() {
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;
    if (heroArt) heroArt.style.translate = currentX.toFixed(2) + "px " + currentY.toFixed(2) + "px";
    if (Math.abs(targetX - currentX) > 0.06 || Math.abs(targetY - currentY) > 0.06) {
      parallaxRaf = requestAnimationFrame(parallaxTick);
    } else {
      parallaxRaf = 0;
    }
  }

  if (hero && finePointer() && !reduced()) {
    hero.addEventListener("pointermove", function (e) {
      var nx = e.clientX / window.innerWidth - 0.5;
      var ny = e.clientY / window.innerHeight - 0.5;
      targetX = nx * 18;
      targetY = ny * 14;
      if (glow) {
        glow.style.setProperty("--gx", e.clientX + "px");
        glow.style.setProperty("--gy", e.clientY + "px");
        glow.classList.add("is-on");
      }
      if (!parallaxRaf) parallaxRaf = requestAnimationFrame(parallaxTick);
    }, { passive: true });
    hero.addEventListener("pointerleave", function () {
      targetX = 0;
      targetY = 0;
      if (glow) glow.classList.remove("is-on");
      if (!parallaxRaf) parallaxRaf = requestAnimationFrame(parallaxTick);
    });
  }

  /* ---------------------------------------------------------------------
     Copy the engine command
     --------------------------------------------------------------------- */
  var copyBtn = $(".copy-btn");
  var copyTimer = 0;

  function copyLabelDefault() {
    if (!copyBtn) return;
    var span = copyBtn.querySelector("span");
    if (!span) return;
    span.textContent = span.getAttribute(uiLang() === "zh" ? "data-zh" : "data-en") || span.textContent;
  }
  function syncCopyLabel() {
    if (!copyBtn) return;
    if (copyBtn.getAttribute("data-copied") === "true") {
      var span = copyBtn.querySelector("span");
      if (span) span.textContent = uiLang() === "zh" ? "已复制" : "Copied";
    } else {
      copyLabelDefault();
    }
  }

  function legacyCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:-1000px;left:-1000px;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var text = copyBtn.getAttribute("data-copy") || "";
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(function () { legacyCopy(text); });
      } else {
        legacyCopy(text);
      }
      copyBtn.setAttribute("data-copied", "true");
      syncCopyLabel();
      window.clearTimeout(copyTimer);
      copyTimer = window.setTimeout(function () {
        copyBtn.setAttribute("data-copied", "false");
        syncCopyLabel();
      }, 1700);
    });
  }

  /* ---------------------------------------------------------------------
     Voice player
     --------------------------------------------------------------------- */
  var tracks = window.LUMINA_TRACKS || null;
  var player = $("#player");
  var audio = $("#audio");
  var playBtn = $("#play-btn");
  var wave = $("#wave");
  var waveBase = $("#wave-base");
  var wavePlayed = $("#wave-played");
  var waveCursor = $("#wave-cursor");
  var timeDisplay = $("#time-display");
  var trackLabel = $("#track-label");
  var playerNote = $("#player-note");
  var langBtns = $$("[data-track-lang]");
  var toneBtns = $$("[data-track-tone]");
  var state = { lang: "zh", tone: "raw" };
  var progressRaf = 0;
  var lastAria = -1;

  function currentKey() { return state.lang + "-" + state.tone; }
  function currentTrack() { return tracks ? tracks[currentKey()] : null; }

  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function trackNames() {
    var isZh = uiLang() === "zh";
    var zh = state.lang === "zh";
    var rvc = state.tone === "rvc";
    if (isZh) {
      return {
        label: (zh ? "中文" : "English") + " · " + (rvc ? "RVC ずんだもん" : "原始"),
        note: (zh ? "中文样音" : "English 样音") + (rvc ? " · ずんだもん 音色" : " · 未做音色转换")
      };
    }
    return {
      label: (zh ? "Chinese" : "English") + " · " + (rvc ? "RVC Zundamon" : "Raw"),
      note: (zh ? "Chinese sample" : "English sample") + (rvc ? " · Zundamon timbre" : " · no voice conversion")
    };
  }

  function updatePlayerLabels() {
    if (!player) return;
    var n = trackNames();
    if (trackLabel) trackLabel.textContent = n.label;
    if (playerNote) playerNote.textContent = n.note;
  }

  function updatePlayLabel() {
    if (!playBtn) return;
    var playing = audio && !audio.paused && !audio.ended;
    playBtn.classList.toggle("is-playing", playing);
    var label = uiLang() === "zh"
      ? (playing ? "暂停" : "播放")
      : (playing ? "Pause" : "Play");
    playBtn.setAttribute("aria-label", label);
  }

  function renderWave(peaks) {
    if (!peaks) return;
    var html = peaks.map(function (h) {
      return '<i style="--h:' + Math.round(h * 1000) / 10 + '"></i>';
    }).join("");
    if (waveBase) waveBase.innerHTML = html;
    if (wavePlayed) wavePlayed.innerHTML = html;
  }

  function updateProgress() {
    if (!audio) return;
    var track = currentTrack();
    var duration = isFinite(audio.duration) && audio.duration > 0
      ? audio.duration
      : (track ? track.duration : 0);
    var p = duration > 0 ? Math.min(1, audio.currentTime / duration) : 0;
    if (wavePlayed) wavePlayed.style.clipPath = "inset(0 " + (100 - p * 100).toFixed(2) + "% 0 0)";
    if (waveCursor && wave) waveCursor.style.transform = "translateX(" + (p * wave.clientWidth).toFixed(1) + "px)";
    if (timeDisplay) timeDisplay.textContent = fmt(audio.currentTime) + " / " + fmt(duration);
    var pct = Math.round(p * 100);
    if (wave && pct !== lastAria) {
      wave.setAttribute("aria-valuenow", String(pct));
      wave.setAttribute("aria-valuetext", fmt(audio.currentTime) + " / " + fmt(duration));
      lastAria = pct;
    }
  }

  function progressLoop() {
    updateProgress();
    if (audio && !audio.paused) progressRaf = requestAnimationFrame(progressLoop);
  }

  function play() {
    if (!audio) return;
    if (audio.ended) audio.currentTime = 0;
    var pr = audio.play();
    if (pr && pr.catch) pr.catch(function () { updatePlayLabel(); });
  }

  function pause() {
    if (audio) audio.pause();
  }

  function setTrack(lang, tone, keepPlaying) {
    state.lang = lang;
    state.tone = tone;
    var key = currentKey();
    var track = tracks && tracks[key];
    if (langBtns.length) langBtns.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-track-lang") === lang));
    });
    toneBtns.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-track-tone") === tone));
    });
    updatePlayerLabels();
    if (!audio || !track) return;

    var wasPlaying = keepPlaying && !audio.paused;
    if (wasPlaying) audio.pause();
    audio.src = "assets/audio/" + track.file;
    audio.load();
    audio.currentTime = 0;
    renderWave(track.peaks);
    if (player) player.classList.add("is-loading");
    if (timeDisplay) timeDisplay.textContent = "0:00 / " + fmt(track.duration);
    if (wave) wave.setAttribute("aria-valuenow", "0");
    lastAria = 0;
    updateProgress();
    updatePlayLabel();
    if (wasPlaying) {
      audio.play().catch(function () { updatePlayLabel(); });
    }
  }

  if (player && audio && tracks) {
    renderWave(tracks["zh-raw"].peaks);
    updatePlayerLabels();

    langBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var lang = btn.getAttribute("data-track-lang");
        if (lang !== state.lang) setTrack(lang, state.tone, true);
      });
    });
    toneBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tone = btn.getAttribute("data-track-tone");
        if (tone !== state.tone) setTrack(state.lang, tone, true);
      });
    });

    playBtn.addEventListener("click", function () {
      if (audio.paused) play(); else pause();
    });
    audio.addEventListener("play", function () {
      updatePlayLabel();
      if (!progressRaf) progressRaf = requestAnimationFrame(progressLoop);
    });
    audio.addEventListener("pause", function () {
      updatePlayLabel();
      updateProgress();
      if (progressRaf) { cancelAnimationFrame(progressRaf); progressRaf = 0; }
    });
    audio.addEventListener("ended", function () {
      updatePlayLabel();
      updateProgress();
      if (progressRaf) { cancelAnimationFrame(progressRaf); progressRaf = 0; }
    });
    audio.addEventListener("loadedmetadata", function () {
      if (player) player.classList.remove("is-loading");
      updateProgress();
    });
    audio.addEventListener("canplay", function () {
      if (player) player.classList.remove("is-loading");
    });
    audio.addEventListener("timeupdate", updateProgress);

    var seeking = false;
    function seekFromEvent(e) {
      var track = currentTrack();
      var duration = isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : (track ? track.duration : 0);
      if (!duration) return;
      var rect = wave.getBoundingClientRect();
      var p = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      audio.currentTime = p * duration;
      updateProgress();
    }
    wave.addEventListener("pointerdown", function (e) {
      seeking = true;
      wave.setPointerCapture && wave.setPointerCapture(e.pointerId);
      seekFromEvent(e);
    });
    wave.addEventListener("pointermove", function (e) {
      if (seeking) seekFromEvent(e);
    });
    wave.addEventListener("pointerup", function (e) {
      seeking = false;
      if (wave.releasePointerCapture && wave.hasPointerCapture && wave.hasPointerCapture(e.pointerId)) {
        wave.releasePointerCapture(e.pointerId);
      }
    });
    wave.addEventListener("pointercancel", function () { seeking = false; });
    wave.addEventListener("keydown", function (e) {
      var track = currentTrack();
      var duration = isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : (track ? track.duration : 0);
      if (!duration) return;
      var step = duration * 0.05;
      if (e.key === "ArrowLeft") { e.preventDefault(); audio.currentTime = Math.max(0, audio.currentTime - step); updateProgress(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); audio.currentTime = Math.min(duration, audio.currentTime + step); updateProgress(); }
      else if (e.key === "Home") { e.preventDefault(); audio.currentTime = 0; updateProgress(); }
      else if (e.key === "End") { e.preventDefault(); audio.currentTime = duration; updateProgress(); }
      else if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (audio.paused) play(); else pause(); }
    });

    setTrack("zh", "raw", false);
    audio.preload = "metadata";
  }

  /* ---------------------------------------------------------------------
     Reward QR dialog
     --------------------------------------------------------------------- */
  var qrOpen = $("#qr-open");
  var qrDialog = $("#qr-dialog");
  var qrClose = $("#qr-close");
  var qrReturnFocus = null;

  if (qrOpen && qrDialog && typeof qrDialog.showModal === "function") {
    qrOpen.addEventListener("click", function () {
      qrReturnFocus = qrOpen;
      qrDialog.showModal();
      document.body.classList.add("is-locked");
    });
    function closeQr() {
      qrDialog.close();
    }
    qrClose.addEventListener("click", closeQr);
    qrDialog.addEventListener("click", function (e) {
      if (e.target === qrDialog) closeQr();
    });
    qrDialog.addEventListener("close", function () {
      document.body.classList.remove("is-locked");
      if (qrReturnFocus) qrReturnFocus.focus({ preventScroll: true });
    });
  }

  /* ---------------------------------------------------------------------
     Small niceties
     --------------------------------------------------------------------- */
  // Keep the footer language/theme buttons in sync when the header is used.
  $$(".foot-lang button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var next = btn.getAttribute("data-lang-set");
      if (next !== root.dataset.lang) applyLanguage(next);
    });
  });

  // Title stroke: re-draw once the page is ready if the browser deferred it.
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && audio && audio.paused) updatePlayLabel();
  });

})();
