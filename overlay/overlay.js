/* QClips stream overlay. One cycle = slide in, hold, slide out; it repeats every `every` seconds.
   Everything that moves is one Web Animation per element over the whole cycle, so ?t=<ms> (and QClipsOverlay.seek)
   can show any moment exactly, which tools/overlay-render.ps1 uses to export the video.

   Address options (all optional):
     lang=en|ar|mix        text language (default en); mix alternates: Arabic first, then English, and so on
                           (each appearance, or for always-on styles every lap / 30 s)
     layout=bar|card|mini|badge
                           bar: lower third; card: a card in a corner (both on a full 1920x1080 source);
                           mini: a small strip for under the webcam (source 600x188);
                           badge: a small always-on badge (source 420x136), it slides in once and stays.
                           mini and badge fill their own small source, so streamers place them anywhere in OBS.
     pos=bottom|top        bar position (default bottom); tl|tr|bl|br card corner (default br, bl for ar)
     align=center|start|end  bar alignment (default center)
     from=left|right       side it comes in from (default: right for ar, left for en; a card comes from its corner side)
     hold=12               seconds on screen (5-60; mini default 10)
     every=600             seconds between appearances (at least 10); 0 = once each time the source is shown or
                           refreshed. Not used by badge.
     opacity=1             overall opacity (0.4-1), e.g. 0.85 for a quieter badge
     delay=2               seconds before the first appearance
     scale=1               size (0.5-1.5)
     accent=1a8cff         accent colour (hex, no #); the builder offers the app's accents
     theme=dark|light|neon look of the panel (default dark)
     corners=round|square  (default round)
     enter=slide|pop|fade|flip  how it comes in and goes out (default slide)
     shot=0                bar and card without the gameplay screen
     bg=1 / checker=1      preview over a game picture / a checkerboard
     t=<ms>                stop at that moment of the cycle */
(function () {
  "use strict";

  var q = new URLSearchParams(location.search);
  function num(name, def, min, max) {
    var v = parseFloat(q.get(name));
    if (!isFinite(v)) return def;
    return Math.min(max, Math.max(min, v));
  }
  function pick(name, list, def) {
    var v = (q.get(name) || "").toLowerCase();
    return list.indexOf(v) >= 0 ? v : def;
  }

  var mix = pick("lang", ["mix", "both"], "") !== "";
  var lang = mix ? (q.get("cur") === "en" ? "en" : "ar") : pick("lang", ["en", "ar"], "en");
  var baseLang = mix ? "ar" : lang; // defaults that place things stay put while the language alternates
  if (mix && !q.has("cur") && q.get("every") === "0") {
    try { lang = sessionStorage.getItem("qclipsMixNext") === "en" ? "en" : "ar"; } catch (e) { /* no storage */ }
  }
  var layout = pick("layout", ["bar", "card", "mini", "badge", "ticker", "side", "notify", "tile", "scene", "circle"], "bar");
  // small ones fill their own small source (placed anywhere in OBS); the rest use a 1920x1080 source
  var small = ["mini", "badge", "notify", "tile", "circle"].indexOf(layout) >= 0;
  var alwaysOn = ["badge", "tile", "scene", "circle"].indexOf(layout) >= 0; // come in once and stay
  var BOX = { mini: [600, 188], badge: [420, 136], notify: [560, 124], tile: [300, 372], circle: [420, 420] }[layout] || [1920, 1080];
  var pos = layout === "bar" || layout === "ticker" ? pick("pos", ["bottom", "top"], "bottom")
    : layout === "side" ? pick("pos", ["left", "right"], baseLang === "ar" ? "left" : "right")
    : pick("pos", ["tl", "tr", "bl", "br"], baseLang === "ar" ? "bl" : "br");
  var align = pick("align", ["center", "start", "end"], "center");
  var cornerSide = layout === "card" ? (pos.charAt(1) === "l" ? "left" : "right") : layout === "side" ? pos : null;
  var from = pick("from", ["left", "right"], cornerSide || (baseLang === "ar" ? "right" : "left"));
  var title = pick("title", ["brb", "soon", "none"], "brb");
  var hold = num("hold", { mini: 10, notify: 7, ticker: 15 }[layout] || 12, 5, 60) * 1000;
  var every = q.get("every") === "0" ? 0 : num("every", 600, 10, 7200) * 1000;
  var delay = num("delay", 2, 0, 600) * 1000;
  var scale = small || layout === "scene" ? 1 : num("scale", 1, 0.5, 1.5);
  var opacity = num("opacity", 1, 0.4, 1);
  var accent = /^[0-9a-f]{6}$/i.test(q.get("accent") || "") ? q.get("accent").toLowerCase() : null;
  var theme = pick("theme", ["dark", "light", "neon"], "dark");
  var corners = pick("corners", ["round", "square"], "round");
  var enter = pick("enter", ["slide", "pop", "fade", "flip"], "slide");
  var noShot = q.get("shot") === "0" && (layout === "bar" || layout === "card" || layout === "side");
  var seekTo = q.has("t") ? num("t", 0, 0, 1e7) : null;

  var IN = small || layout === "ticker" ? 900 : 1100, OUT = small || layout === "ticker" ? 650 : 800;
  if (alwaysOn) { hold = 0; OUT = 0; IN = layout === "scene" ? 2000 : 1600; } // only the entrance, then it stays
  var D = IN + hold + OUT;
  var MID = IN + hold * 0.5;

  var ICON = {
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z"/><path d="M8.8 12.2l2.2 2.2 4.3-4.6"/></svg>'
  };
  var KEYS = '<span class="ltr"><kbd>Alt</kbd>+<kbd>F10</kbd></span>';

  var TEXT = {
    en: {
      badge: "Free for Windows",
      headline: ["Play", "first.", "*Clip", "*it", "*after."],
      sub: "Keeps your last minutes. One word or key saves the moment.",
      scan: "Scan to download",
      feats: [
        ["mic", "Say “clip it” and it’s saved", "Say “clip it”"],
        ["key", KEYS + " saves the last minutes", KEYS + " to save"],
        ["shield", "Free · No account · Anti-cheat safe", "Free · Anti-cheat safe"]
      ],
      lines: ["Free game clipping for Windows", "Say “clip it” and it’s saved", KEYS + " saves the moment"],
      ticker: ["Play first. Clip it after.", "Say “clip it” and it’s saved", KEYS + " saves the last minutes",
        "Free · No account · Anti-cheat safe", "Download free at <b class=\"ltr\">qclips.app</b>"],
      note: ["Clip your best plays, free", "QClips for Windows · qclips.app"],
      title: { brb: "Be right back", soon: "Starting soon" },
      circle: { line: "Play first.<br><span class=\"hi\">Clip it after.</span>", clip: "Saved with one word", app: "Trim it. Share it." }
    },
    ar: {
      badge: "مجاني لويندوز",
      headline: ["العب", "أول،", "*وسجّل", "*بعدين."],
      sub: "يحتفظ بآخر دقائق من لعبتك، وتحفظ اللحظة بكلمة أو زر.",
      scan: "امسح وحمّل مجاناً",
      feats: [
        ["mic", "قل «سجّل» وتنحفظ اللقطة", "قل «سجّل»"],
        ["key", KEYS + " يحفظ آخر الدقائق", KEYS + " للحفظ"],
        ["shield", "مجاني · بدون حساب · آمن مع الأنتي-تشيت", "مجاني وآمن مع الأنتي-تشيت"]
      ],
      lines: ["حفظ لقطات الألعاب مجاناً", "قل «سجّل» وتنحفظ اللقطة", KEYS + " يحفظ اللحظة"],
      ticker: ["العب أول، وسجّل بعدين", "قل «سجّل» وتنحفظ اللقطة", KEYS + " يحفظ آخر الدقائق",
        "مجاني · بدون حساب · آمن مع الأنتي-تشيت", "حمّله مجاناً من <b class=\"ltr\">qclips.app</b>"],
      note: ["احفظ أحلى لقطاتك مجاناً", "مجاني لويندوز · <span class=\"ltr\">qclips.app</span>"],
      title: { brb: "راجع بعد شوي", soon: "البث يبدأ بعد شوي" },
      circle: { line: "العب أول،<br><span class=\"hi\">وسجّل بعدين.</span>", clip: "انحفظت بكلمة وحدة", app: "قصّها وشاركها" }
    }
  };

  var root = document.documentElement;
  root.lang = lang;
  root.dir = lang === "ar" ? "rtl" : "ltr";
  if (q.get("bg") === "1") document.body.classList.add("bg");
  if (q.get("checker") === "1") document.body.classList.add("checker");

  /* From one accent colour: a light tint (a1), the colour (a2), a deeper shade (a3) and a neighbouring hue (b)
     for the second light, as the default blue set does with cyan and violet. */
  function setAccent(hex) {
    var rgb = [0, 2, 4].map(function (i) { return parseInt(hex.substr(i, 2), 16); });
    var mix = function (c, w, f) { return c.map(function (v) { return Math.round(v + (w - v) * f); }); };
    var a1 = mix(rgb, 255, 0.45), a3 = mix(rgb, 0, 0.12);
    var r = rgb[0] / 255, g = rgb[1] / 255, bl = rgb[2] / 255, mx = Math.max(r, g, bl), mn = Math.min(r, g, bl);
    var h = 0, l = (mx + mn) / 2, s = mx === mn ? 0 : (l > 0.5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn));
    if (mx !== mn) h = mx === r ? (g - bl) / (mx - mn) + (g < bl ? 6 : 0) : mx === g ? (bl - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4;
    h = (h * 60 + 40) % 360;
    var hsl = function (p, q2, t) { t = (t + 1) % 1; return t < 1 / 6 ? p + (q2 - p) * 6 * t : t < 1 / 2 ? q2 : t < 2 / 3 ? p + (q2 - p) * (2 / 3 - t) * 6 : p; };
    var q2 = l < 0.5 ? l * (1 + s) : l + s - l * s, p2 = 2 * l - q2, hh = h / 360;
    var b = [hh + 1 / 3, hh, hh - 1 / 3].map(function (t) { return Math.round(hsl(p2, q2, t) * 255); });
    var css = function (c) { return "rgb(" + c.join(",") + ")"; };
    [["--a1", css(a1)], ["--a1-rgb", a1.join(",")], ["--a2", css(rgb)], ["--a2-rgb", rgb.join(",")],
      ["--a3", css(a3)], ["--b-rgb", b.join(",")]].forEach(function (v) { root.style.setProperty(v[0], v[1]); });
  }

  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };

  var t = TEXT[lang];
  var stage = $("#stage"), ad = $("#qc");
  if (accent && accent !== "1a8cff") setAccent(accent);
  root.classList.add("t-" + theme);
  if (corners === "square") root.classList.add("sq");
  if (theme === "light") $(".logo").src = "logo-light.svg";
  if (noShot) ad.classList.add("noshot");
  ad.classList.add(layout, "pos-" + pos, "align-" + align);
  $$("[data-t]").forEach(function (el) { el.textContent = t[el.getAttribute("data-t")]; });
  $(".headline").innerHTML = t.headline.map(function (w) {
    return w.charAt(0) === "*" ? '<span class="w hi">' + w.slice(1) + "</span>" : '<span class="w">' + w + "</span>";
  }).join(" ");
  // tall layouts: the second sentence on its own line
  /* circle: four slides that take turns forever (brand, gameplay, QR code, the app), with a ring that fills */
  if (layout === "circle") {
    var cvid = $("video.s1");
    var cs = document.createElement("div");
    cs.className = "cs";
    cs.innerHTML =
      '<div class="slide s-brand"><img class="cmark" src="mark.svg" alt=""><img class="clogo" src="' + (theme === "light" ? "logo-light.svg" : "logo.svg") + '" alt="QClips">' +
        '<div class="cline">' + t.circle.line + '</div><span class="ctag">' + t.badge + '</span></div>' +
      '<div class="slide s-clip"><div class="cvid"></div><img class="ctoast" src="../img/toast.webp" alt=""><span class="ccap">' + t.circle.clip + '</span></div>' +
      '<div class="slide s-qr"><div class="cqr"><img src="qr-' + lang + '.svg" alt=""></div><span class="cscan">' + t.scan + '</span><span class="curl">qclips.app</span></div>' +
      '<div class="slide s-app"><img class="capp" src="../img/editor-simple-800.webp" alt=""><span class="ccap">' + t.circle.app + '</span><span class="curl small">qclips.app</span></div>' +
      '<svg class="cring" viewBox="0 0 400 400" aria-hidden="true"><defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--a1)"/><stop offset="1" style="stop-color:var(--a2)"/></linearGradient></defs>' +
        '<circle class="ctrack" cx="200" cy="200" r="196"/><circle class="cprog" cx="200" cy="200" r="196"/></svg>';
    $(".panel").appendChild(cs);
    if (cvid) $(".s-clip .cvid", cs).appendChild(cvid);
  }
  if (layout === "scene" || layout === "side") {
    var first = $$(".headline .w").filter(function (w) { return !w.classList.contains("hi"); }).pop();
    if (first) first.insertAdjacentHTML("afterend", "<br>");
  }
  $(".feats").innerHTML = t.feats.map(function (f) {
    return '<li><span class="ico">' + ICON[f[0]] + "</span><span>" + (layout === "bar" || layout === "scene" ? f[1] : f[2]) + "</span></li>";
  }).join("");
  // ticker: the line twice, so it can scroll without a seam
  var tickOnce = '<span class="tick-set">' + t.ticker.map(function (x) { return "<span>" + x + "</span><i></i>"; }).join("") + "</span>";
  $(".tick-track").innerHTML = tickOnce + tickOnce;
  $(".note .n1").textContent = t.note[0];
  $(".note .n2").innerHTML = t.note[1];
  $(".title").textContent = title === "none" ? "" : t.title[title];
  if (title === "none") $(".title").hidden = true;
  $(".lines").innerHTML = t.lines.map(function (l) { return "<li>" + l + "</li>"; }).join("");
  stage.style.width = BOX[0] + "px";
  stage.style.height = BOX[1] + "px";
  if (small) stage.classList.add("small");
  if (opacity < 1) ad.style.opacity = opacity;
  $(".qr .code").src = "qr-" + lang + ".svg";
  document.title = lang === "ar" ? "QClips: أوفرلاي البث" : "QClips stream overlay";

  if (scale !== 1) {
    ad.style.transform = "scale(" + scale + ")";
    var oy = layout === "bar" || layout === "ticker" ? (pos === "top" ? "0" : "100%") : layout === "side" ? "50%" : (pos.charAt(0) === "t" ? "0" : "100%");
    var ox = layout === "bar" ? (align === "start" ? "0" : align === "end" ? "100%" : "50%") : layout === "ticker" ? "50%" : (cornerSide === "left" ? "0" : "100%");
    ad.style.transformOrigin = ox + " " + oy;
  }

  var stageScale = 1;
  function fit() {
    stageScale = Math.min(innerWidth / BOX[0], innerHeight / BOX[1]) || 1;
    stage.style.transform = "scale(" + stageScale + ")";
  }
  fit();
  addEventListener("resize", fit);

  /* track(el, [[ms, {props}, easing?], ...]): one animation over the whole cycle. */
  var anims = [];
  function track(el, frames) {
    if (!el) return;
    if (frames[0][0] > 0) frames.unshift([0, frames[0][1]]);
    if (frames[frames.length - 1][0] < D) frames.push([D, frames[frames.length - 1][1]]);
    var kf = frames.map(function (f) {
      var k = {};
      for (var p in f[1]) k[p] = f[1][p];
      k.offset = Math.min(1, Math.max(0, f[0] / D));
      k.easing = f[2] || "linear";
      return k;
    });
    var a = el.animate(kf, { duration: D, fill: "both" });
    a.pause();
    anims.push(a);
  }

  var OUT_EXPO = "cubic-bezier(.16,1,.3,1)";
  var BACK = "cubic-bezier(.2,1.2,.35,1)";
  var IN_QUAD = "cubic-bezier(.55,0,.75,.25)";

  function build() {
    if (layout === "circle") return buildCircle();
    if (alwaysOn) return buildBadge();
    var frame = $(".frame", ad);
    var r = frame.getBoundingClientRect();
    var k = stageScale * scale;
    var left = r.left / stageScale, right = r.right / stageScale;
    var sgn = from === "left" ? -1 : 1;
    var W = BOX[0], gap = small ? 24 : 80, skew = small ? 5 : 8;
    // distances in the frame's own (unscaled) pixels; the bar and the mini strip leave on the other side
    var dxIn = (from === "left" ? -(right + gap) : (W - left + gap)) * stageScale / k;
    var dxOut = layout !== "card" && layout !== "side" ? (from === "left" ? (W - left + gap) : -(right + gap)) * stageScale / k : dxIn;
    var w = frame.offsetWidth;

    var t1 = small ? 850 : 1000;
    var vertical = layout === "ticker" || layout === "notify"; // these slide in from the screen edge above or below
    if (enter === "slide" && vertical) {
      var top = layout === "notify" || pos === "top";
      var dy = (top ? -1 : 1) * (frame.offsetHeight + 40);
      track(frame, [
        [0, { transform: "translateY(" + dy + "px)", opacity: 1 }, OUT_EXPO],
        [t1, { transform: "translateY(0)", opacity: 1 }],
        [IN + hold, { transform: "translateY(0)", opacity: 1 }, IN_QUAD],
        [D, { transform: "translateY(" + dy + "px)", opacity: 1 }]
      ]);
    } else if (enter === "slide") {
      track(frame, [
        [0, { transform: "translateX(" + dxIn + "px) skewX(" + (sgn * skew) + "deg)", opacity: 1 }, BACK],
        [t1, { transform: "translateX(0) skewX(0deg)", opacity: 1 }],
        [IN + hold, { transform: "translateX(0) skewX(0deg)", opacity: 1 }, IN_QUAD],
        [D, { transform: "translateX(" + dxOut + "px) skewX(" + (dxOut < 0 ? skew : -skew) + "deg)", opacity: 1 }]
      ]);
    } else {
      frameEnter(frame, t1, true);
    }
    glowPulse();

    var streak = $(".streak", ad);
    if (enter !== "slide" || vertical || layout === "side") streak.style.display = "none";
    if (layout === "ticker") tickerLoop(0);
    if (layout === "notify") {
      track($(".note", ad), [[350, { transform: "translateY(8px)", opacity: 0 }, OUT_EXPO], [900, { transform: "translateY(0)", opacity: 1 }]]);
      track($(".mark", ad), [[150, { transform: "scale(.6) rotate(-20deg)", opacity: 0 }, BACK], [750, { transform: "scale(1) rotate(0deg)", opacity: 1 }]]);
    }
    var sx = from === "left" ? -1 : 1;
    track(streak, [
      [0, { transform: "translateX(" + (sx * 900) + "px) scaleX(.4)", opacity: 0 }, "ease-out"],
      [180, { transform: "translateX(" + (sx * 450) + "px) scaleX(1)", opacity: 1 }, "ease-out"],
      [750, { transform: "translateX(" + (-sx * 500) + "px) scaleX(.6)", opacity: 0 }],
      [IN + hold - 50, { transform: "translateX(0) scaleX(.6)", opacity: 0 }, "ease-in"],
      [IN + hold + 250, { transform: "translateX(" + (dxOut < 0 ? 300 : -300) + "px) scaleX(1)", opacity: .9 }, "ease-out"],
      [D, { transform: "translateX(" + (dxOut < 0 ? -900 : 900) + "px) scaleX(.4)", opacity: 0 }]
    ]);

    var sheen = $(".sheen", ad);
    var sh0 = "translateX(-300px) skewX(-18deg)", sh1 = "translateX(" + (w + 300) + "px) skewX(-18deg)";
    track(sheen, [
      [1000, { transform: sh0 }, "ease-in-out"], [1900, { transform: sh1 }],
      [MID + 200, { transform: sh0 }, "ease-in-out"], [MID + 1100, { transform: sh1 }]
    ]);

    var drift = [["l1", 260, 50], ["l2", -220, -40], ["l3", -140, 70]];
    drift.forEach(function (d) {
      track($(".lights ." + d[0], ad), [
        [0, { transform: "translate(0,0)" }, "ease-in-out"],
        [D * 0.5, { transform: "translate(" + d[1] + "px," + d[2] + "px)" }, "ease-in-out"],
        [D, { transform: "translate(0,0)" }]
      ]);
    });

    var tilt = layout === "card" ? 0 : (lang === "ar" ? -1 : 1);
    track($(".screen", ad), [
      [250, { transform: "rotateY(" + (tilt * 34) + "deg) rotateX(" + (layout === "card" ? 18 : 0) + "deg) scale(.82)", opacity: 0 }, OUT_EXPO],
      [1350, { transform: "rotateY(" + (tilt * 12) + "deg) rotateX(0deg) scale(1)", opacity: 1 }],
      [IN + hold, { transform: "rotateY(" + (tilt * 6) + "deg) rotateX(0deg) scale(1)", opacity: 1 }]
    ]);
    track($(".screen .s1", ad), [
      [0, { transform: "scale(1.16)", opacity: 1 }],
      [MID - 300, { transform: "scale(1.03)", opacity: 1 }, "ease-in-out"],
      [MID + 300, { transform: "scale(1.0)", opacity: 0 }]
    ]);
    track($(".screen .s2", ad), [
      [MID - 300, { transform: "scale(1.14)", opacity: 0 }, "ease-in-out"],
      [MID + 300, { transform: "scale(1.12)", opacity: 1 }],
      [D, { transform: "scale(1.0)", opacity: 1 }]
    ]);
    track($(".screen .toast", ad), [
      [1900, { transform: "translateY(-18px) scale(.85)", opacity: 0 }, BACK],
      [2350, { transform: "translateY(0) scale(1)", opacity: 1 }],
      [MID - 600, { transform: "translateY(0) scale(1)", opacity: 1 }, "ease-in"],
      [MID - 250, { transform: "translateY(-12px) scale(.95)", opacity: 0 }]
    ]);

    track($(".brand", ad), [
      [350, { transform: "translateY(12px)", opacity: 0 }, OUT_EXPO], [950, { transform: "translateY(0)", opacity: 1 }]
    ]);
    $$(".headline .w", ad).forEach(function (el, i) {
      var t0 = 500 + i * 90;
      track(el, [
        [t0, { transform: "translateY(28px) rotate(" + (lang === "ar" ? -4 : 4) + "deg)", opacity: 0 }, OUT_EXPO],
        [t0 + 700, { transform: "translateY(0) rotate(0deg)", opacity: 1 }]
      ]);
    });
    track($(".sub", ad), [
      [900, { transform: "translateY(10px)", opacity: 0 }, OUT_EXPO], [1500, { transform: "translateY(0)", opacity: 1 }]
    ]);

    var feats = $$(".feats li", ad), f0 = 1300, seg = (IN + hold - f0) / feats.length;
    feats.forEach(function (el, i) {
      var tin = f0 + i * seg;
      var fr = [
        [tin, { transform: "translateY(26px) scale(.96)", opacity: 0 }, OUT_EXPO],
        [tin + 500, { transform: "translateY(0) scale(1)", opacity: 1 }]
      ];
      if (i < feats.length - 1) {
        fr.push([tin + seg - 350, { transform: "translateY(0) scale(1)", opacity: 1 }, "ease-in"]);
        fr.push([tin + seg, { transform: "translateY(-20px) scale(.97)", opacity: 0 }]);
      }
      track(el, fr);
    });

    track($(".qr", ad), [
      [700, { transform: "scale(.5) rotate(-8deg)", opacity: 0 }, BACK],
      [1300, { transform: "scale(1.06) rotate(0deg)", opacity: 1 }, "ease-out"],
      [1550, { transform: "scale(1) rotate(0deg)", opacity: 1 }],
      [MID - 100, { transform: "scale(1) rotate(0deg)", opacity: 1 }, "ease-out"],
      [MID + 150, { transform: "scale(1.05) rotate(0deg)", opacity: 1 }, "ease-in-out"],
      [MID + 450, { transform: "scale(1) rotate(0deg)", opacity: 1 }]
    ]);
    track($(".qr .ring", ad), [
      [1450, { transform: "scale(1)", opacity: 0 }], [1500, { transform: "scale(1)", opacity: .9 }, "ease-out"],
      [2400, { transform: "scale(1.3)", opacity: 0 }],
      [MID + 150, { transform: "scale(1)", opacity: 0 }], [MID + 200, { transform: "scale(1)", opacity: .9 }, "ease-out"],
      [MID + 1100, { transform: "scale(1.3)", opacity: 0 }]
    ]);
    var qh = $(".qr", ad).offsetHeight - 26;
    track($(".qr .scan", ad), [
      [1700, { transform: "translateY(0)", opacity: 0 }], [1800, { transform: "translateY(0)", opacity: 1 }, "ease-in-out"],
      [2700, { transform: "translateY(" + qh + "px)", opacity: 1 }], [2800, { transform: "translateY(" + qh + "px)", opacity: 0 }],
      [MID + 300, { transform: "translateY(0)", opacity: 0 }], [MID + 400, { transform: "translateY(0)", opacity: 1 }, "ease-in-out"],
      [MID + 1300, { transform: "translateY(" + qh + "px)", opacity: 1 }], [MID + 1400, { transform: "translateY(" + qh + "px)", opacity: 0 }]
    ]);
    [".link", ".card-url"].forEach(function (sel) {
      track($(sel, ad), [
        [1100, { transform: "translateY(10px)", opacity: 0 }, OUT_EXPO], [1700, { transform: "translateY(0)", opacity: 1 }]
      ]);
    });
    track($(".timer", ad), [
      [IN, { transform: "scaleX(1)", opacity: 1 }], [IN + hold, { transform: "scaleX(0)", opacity: 1 }]
    ]);
  }

  /* loop(el, [[offset, {props}], ...], period, startMs): an endless animation that starts after the entrance
     (the badge's quiet life: rotating lines, a sheen and a QR ring now and then). */
  function loop(el, frames, period, start) {
    if (!el) return;
    var kf = frames.map(function (f) {
      var k = {};
      for (var p in f[1]) k[p] = f[1][p];
      k.offset = f[0];
      k.easing = f[2] || "linear";
      return k;
    });
    var a = el.animate(kf, { duration: period, delay: start, iterations: Infinity, fill: "none" });
    a.pause();
    a.loop = true;
    anims.push(a);
  }

  /* pop, fade and flip: the panel appears in place (with an exit unless it is the badge) */
  function frameEnter(frame, t1, withExit) {
    var top = layout === "bar" ? pos === "top" : layout === "card" ? pos.charAt(0) === "t" : false;
    var a = {
      pop: ["scale(.55)", "scale(1)", "scale(.88)", BACK],
      fade: ["translateY(" + (top ? -26 : 26) + "px)", "translateY(0)", "translateY(" + (top ? -12 : 12) + "px)", OUT_EXPO],
      flip: ["perspective(1400px) rotateX(" + (top ? 80 : -80) + "deg)", "perspective(1400px) rotateX(0deg)",
        "perspective(1400px) rotateX(" + (top ? -70 : 70) + "deg)", BACK]
    }[enter];
    frame.style.transformOrigin = top ? "50% 0" : "50% 100%";
    var fr = [[0, { transform: a[0], opacity: 0 }, a[3]], [t1, { transform: a[1], opacity: 1 }]];
    if (withExit) fr.push([IN + hold, { transform: a[1], opacity: 1 }, IN_QUAD], [D, { transform: a[2], opacity: 0 }]);
    track(frame, fr);
  }

  /* neon: the glow around the edge breathes */
  function glowPulse() {
    if (theme !== "neon") return;
    loop($(".glow", ad), [[0, { opacity: 0.25 }, "ease-in-out"], [0.5, { opacity: 0.95 }, "ease-in-out"], [1, { opacity: 0.25 }]], 2600, 0);
  }

  /* ticker: the line scrolls at an even speed (it is written twice, so one set's width is one lap) */
  function tickerLoop(start) {
    var set = $(".tick-set", ad), w2 = set.offsetWidth, rtl = lang === "ar";
    loop($(".tick-track", ad), [
      [0, { transform: "translateX(0)" }],
      [1, { transform: "translateX(" + (rtl ? w2 : -w2) + "px)" }]
    ], w2 / 0.09, start);
  }

  /* circle: pop in, then the slides take turns for good (each 6 s, crossfading), the ring filling once per slide */
  var CSLOT = 6000, CSLIDES = 4, CP = CSLOT * CSLIDES;
  function buildCircle() {
    track($(".frame", ad), [[0, { transform: "scale(.6) rotate(-25deg)", opacity: 0 }, BACK], [1000, { transform: "scale(1) rotate(0deg)", opacity: 1 }]]);
    glowPulse();
    var slides = $$(".cs .slide", ad), f = 500 / CP;
    slides.forEach(function (el, i) {
      var s = i * CSLOT / CP, e = (i + 1) * CSLOT / CP;
      var on = { transform: "scale(1)", opacity: 1 }, inn = { transform: "scale(1.08)", opacity: 0 }, out = { transform: "scale(.94)", opacity: 0 };
      // the first slide is shown during the entrance too
      track(el, i === 0 ? [[0, on]] : [[0, inn]]);
      loop(el, i === 0
        ? [[0, on], [e - f, on, "ease-in"], [e, out], [1 - f, inn, "ease-out"], [1, on]]
        : [[0, inn], [s, inn, "ease-out"], [s + f, on], [e - f, on, "ease-in"], [e, out], [1, out]], CP, IN);
    });
    var C = 2 * Math.PI * 196;
    var prog = $(".cprog", ad);
    prog.style.strokeDasharray = C;
    track(prog, [[0, { strokeDashoffset: C }], [IN, { strokeDashoffset: C }]]);
    loop(prog, [[0, { strokeDashoffset: C }], [1, { strokeDashoffset: 0 }]], CSLOT, IN);
    // a little life inside each slide
    loop($(".cmark", ad), [[0, { transform: "translateY(0) rotate(0deg)" }, "ease-in-out"], [.5, { transform: "translateY(-6px) rotate(-4deg)" }, "ease-in-out"], [1, { transform: "translateY(0) rotate(0deg)" }]], 3000, 0);
    loop($(".capp", ad), [[0, { transform: "scale(1.35) translate(6%, 4%)" }], [.25, { transform: "scale(1.05) translate(0, 0)" }], [1, { transform: "scale(1.05) translate(0, 0)" }]], CP, IN + 3 * CSLOT - 500);
    loop($(".ctoast", ad), [[0, { transform: "translateY(-30px) scale(.9)", opacity: 0 }], [.06, { transform: "translateY(0) scale(1)", opacity: 1 }, "ease-out"], [.22, { transform: "translateY(0) scale(1)", opacity: 1 }], [.25, { transform: "translateY(-10px) scale(.96)", opacity: 0 }], [1, { transform: "translateY(-30px) scale(.9)", opacity: 0 }]], CP, IN + CSLOT + 400);
    loop($(".cqr", ad), [[0, { transform: "scale(.85)" }], [.03, { transform: "scale(1.04)" }, "ease-out"], [.05, { transform: "scale(1)" }], [1, { transform: "scale(1)" }]], CP, IN + 2 * CSLOT);
  }

  /* badge, QR tile and break screen: an entrance, then a quiet life of their own */
  function buildBadge() {
    var sgn = from === "left" ? -1 : 1;
    if (enter === "slide") {
      track($(".frame", ad), [
        [0, { transform: "translateX(" + (sgn * 48) + "px)", opacity: 0 }, OUT_EXPO],
        [900, { transform: "translateX(0)", opacity: 1 }]
      ]);
    } else {
      frameEnter($(".frame", ad), 900, false);
    }
    glowPulse();
    track($(".brand", ad), [[250, { transform: "translateY(6px)", opacity: 0 }, OUT_EXPO], [850, { transform: "translateY(0)", opacity: 1 }]]);
    track($(".qr", ad), [[300, { transform: "scale(.7)", opacity: 0 }, BACK], [950, { transform: "scale(1)", opacity: 1 }]]);
    track($(".card-url", ad), [[550, { transform: "translateY(6px)", opacity: 0 }, OUT_EXPO], [1150, { transform: "translateY(0)", opacity: 1 }]]);
    if (layout === "tile" || layout === "scene") {
      track($(".link", ad), [[600, { transform: "translateY(8px)", opacity: 0 }, OUT_EXPO], [1200, { transform: "translateY(0)", opacity: 1 }]]);
      var qh = $(".qr", ad).offsetHeight - 26;
      loop($(".qr .scan", ad), [
        [0, { transform: "translateY(0)", opacity: 0 }], [0.01, { transform: "translateY(0)", opacity: 1 }, "ease-in-out"],
        [0.08, { transform: "translateY(" + qh + "px)", opacity: 1 }], [0.09, { transform: "translateY(" + qh + "px)", opacity: 0 }],
        [1, { transform: "translateY(" + qh + "px)", opacity: 0 }]
      ], 12000, IN + 600);
    }
    if (layout === "scene") {
      track($(".title", ad), [[300, { transform: "translateY(14px)", opacity: 0 }, OUT_EXPO], [1000, { transform: "translateY(0)", opacity: 1 }]]);
      $$(".headline .w", ad).forEach(function (el, i) {
        track(el, [[500 + i * 100, { transform: "translateY(36px)", opacity: 0 }, OUT_EXPO], [1300 + i * 100, { transform: "translateY(0)", opacity: 1 }]]);
      });
      track($(".sub", ad), [[900, { transform: "translateY(12px)", opacity: 0 }, OUT_EXPO], [1600, { transform: "translateY(0)", opacity: 1 }]]);
      $$(".feats li", ad).forEach(function (el, i) {
        track(el, [[1100 + i * 150, { transform: "translateX(" + (lang === "ar" ? 24 : -24) + "px)", opacity: 0 }, OUT_EXPO], [1700 + i * 150, { transform: "translateX(0)", opacity: 1 }]]);
      });
      track($(".screen", ad), [[200, { transform: "perspective(1600px) rotateY(" + (lang === "ar" ? 24 : -24) + "deg) scale(.85)", opacity: 0 }, OUT_EXPO],
        [1500, { transform: "perspective(1600px) rotateY(" + (lang === "ar" ? 8 : -8) + "deg) scale(1)", opacity: 1 }]]);
      [".lights .l1", ".lights .l2", ".lights .l3"].forEach(function (sel, i) {
        loop($(sel, ad), [[0, { transform: "translate(0,0)" }, "ease-in-out"], [0.5, { transform: "translate(" + [320, -260, -180][i] + "px," + [120, -90, 140][i] + "px)" }, "ease-in-out"], [1, { transform: "translate(0,0)" }]], 22000 + i * 5000, 0);
      });
    }

    var lines = $$(".lines li", ad), slot = 6000, P = slot * lines.length, fade = 450;
    lines.forEach(function (el, i) {
      track(el, i === 0
        ? [[600, { transform: "translateY(8px)", opacity: 0 }, OUT_EXPO], [1200, { transform: "translateY(0)", opacity: 1 }]]
        : [[0, { transform: "translateY(0)", opacity: 0 }]]);
      var s = i * slot / P, e = (i + 1) * slot / P, f = fade / P;
      var on = { transform: "translateY(0)", opacity: 1 }, offIn = { transform: "translateY(8px)", opacity: 0 }, offOut = { transform: "translateY(-8px)", opacity: 0 };
      loop(el, i === 0
        ? [[0, on], [e - f, on, "ease-in"], [e, offOut], [1 - f, offIn, "ease-out"], [1, on]]
        : [[0, offIn], [s, offIn, "ease-out"], [s + f, on], [e - f, on, "ease-in"], [e, offOut], [1, offOut]],
        P, IN);
    });

    var w = $(".frame", ad).offsetWidth;
    loop($(".sheen", ad), [
      [0, { transform: "translateX(-300px) skewX(-18deg)" }, "ease-in-out"],
      [0.06, { transform: "translateX(" + (w + 300) + "px) skewX(-18deg)" }],
      [1, { transform: "translateX(" + (w + 300) + "px) skewX(-18deg)" }]
    ], 20000, IN + 2500);
    loop($(".qr .ring", ad), [
      [0, { transform: "scale(1)", opacity: 0 }], [0.004, { transform: "scale(1)", opacity: .85 }, "ease-out"],
      [0.05, { transform: "scale(1.3)", opacity: 0 }], [1, { transform: "scale(1.3)", opacity: 0 }]
    ], 20000, IN + 3100);
  }

  /* The gameplay montage in the screen (bar and card) plays from the start of each cycle. seek() also moves it
     and resolves once that frame is ready, so renders get the right picture. */
  var video = $("video.s1", ad);
  var useVideo = video && ["bar", "card", "side", "scene", "circle"].indexOf(layout) >= 0 && !noShot;
  // Loaded whole (3 MB) into memory: seeking and looping then work on any server, even one without byte ranges.
  // Safari (WebKit) cannot play a video from a blob, so it gets the file's address straight away.
  var webkitOnly = /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|Edg|OPR|Firefox/.test(navigator.userAgent);
  var fetchCtl = window.AbortController ? new AbortController() : null;
  var videoReady = !useVideo ? Promise.resolve() : (webkitOnly ? Promise.reject(new Error("webkit")) : Promise.race([
    // the whole download, body included, has a ceiling; a stalled one is cancelled so the direct load can go ahead
    fetch(video.getAttribute("data-src"), fetchCtl ? { signal: fetchCtl.signal } : {})
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); }),
    new Promise(function (_, no) { if (seekTo === null) setTimeout(function () { if (fetchCtl) fetchCtl.abort(); no(new Error("slow")); }, 3500); })]))
    .then(function (b) { video.src = URL.createObjectURL(b); }, function () { video.src = video.getAttribute("data-src"); })
    .then(function () {
      return new Promise(function (done) {
        if (video.readyState >= 2) return done();
        if (seekTo === null) setTimeout(done, 3000); // live: never hold the overlay back for the video
        video.addEventListener("loadeddata", done, { once: true });
        video.addEventListener("error", function onErr() {
          // Safari cannot play a video from a blob it fetched itself: use the file's address (the host serves ranges)
          if (video.src.indexOf("blob:") === 0) { video.src = video.getAttribute("data-src"); return; }
          video.removeEventListener("error", onErr); done();
        });
        setTimeout(done, 5000);
      });
    });
  var videoStop = 0;

  function seek(ms) {
    anims.forEach(function (a) { a.pause(); a.currentTime = a.loop ? Math.max(0, ms) : Math.min(D, Math.max(0, ms)); });
    if (!useVideo || !video.duration) return Promise.resolve();
    video.pause();
    var to = ((alwaysOn ? Math.max(0, ms) : Math.min(D, Math.max(0, ms))) / 1000) % video.duration;
    if (Math.abs(video.currentTime - to) < 0.001) return Promise.resolve();
    return new Promise(function (done) {
      var finished = false;
      var finish = function () { if (!finished) { finished = true; done(); } };
      // wait for the seek, then until the new frame is on screen (not just decoded)
      video.addEventListener("seeked", function () {
        if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(finish);
        setTimeout(finish, 250);
      }, { once: true });
      setTimeout(finish, 3000);
      video.currentTime = to;
    });
  }
  var videoOn = false;
  function play() {
    anims.forEach(function (a) { a.currentTime = 0; a.play(); });
    if (useVideo) {
      clearTimeout(videoStop);
      videoOn = true;
      try { video.currentTime = 0; } catch (e) { /* no source yet */ }
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
      if (!alwaysOn) videoStop = setTimeout(function () { videoOn = false; video.pause(); }, D); // nothing to decode while the overlay is away
    }
  }
  // a video that arrives after the overlay is already on screen starts right away
  if (useVideo) videoReady.then(function () {
    if (seekTo === null && videoOn && video.paused) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
  });

  var timer = 0;
  /* lang=mix: the page reloads itself in the other language between appearances (when nothing is on screen), or,
     for the always-on styles, after a lap of the circle / 30 s, which replays the entrance in the new language. */
  function switchLang(delayMs) {
    var u = new URLSearchParams(location.search);
    u.set("cur", lang === "ar" ? "en" : "ar");
    u.set("delay", String(Math.max(0, Math.round(delayMs) / 1000)));
    location.replace(location.pathname + "?" + u.toString());
  }
  function cycle() {
    play();
    if (mix && seekTo === null) {
      clearTimeout(timer);
      if (alwaysOn) timer = setTimeout(function () { switchLang(300); }, layout === "circle" ? IN + CP : 30000);
      else if (every > 0) timer = setTimeout(function () { switchLang(Math.max(every, D + 1000) - D - 500); }, D + 500);
      else try { sessionStorage.setItem("qclipsMixNext", lang === "ar" ? "en" : "ar"); } catch (e) { /* no storage */ }
      return;
    }
    if (every > 0 && !alwaysOn) timer = setTimeout(cycle, Math.max(every, D + 1000));
  }
  function start() {
    clearTimeout(timer);
    seek(0);
    timer = setTimeout(cycle, delay);
  }

  // Live, nothing may hold the overlay back for long: some browsers never settle an image decode or a big fetch
  // (seen in Firefox and WebKit), so each wait has a ceiling. Renders (?t=) still wait for everything.
  function capped(p, ms) { return seekTo !== null ? p : Promise.race([p, new Promise(function (r) { setTimeout(r, ms); })]); }
  function loaded() {
    var imgs = $$("img", ad).map(function (img) {
      return capped(img.decode ? img.decode().catch(function () {}) : Promise.resolve(), 2500);
    });
    imgs.push(videoReady);
    // Ask for the fonts by name: a font only starts loading once text needs it, so fonts.ready alone can resolve
    // before the Arabic face arrives, and the text then jumps to the real font in the middle of the motion.
    var fonts = !document.fonts ? [] : [
      document.fonts.load('800 50px "Archivo"', "QClips Play first"),
      document.fonts.load('600 20px "Archivo"', "qclips.app")
    ].concat(lang === "ar" ? [
      document.fonts.load('800 44px "Noto Kufi Arabic"', "العب أول"),
      document.fonts.load('600 18px "Noto Kufi Arabic"', "العب أول")
    ] : []).map(function (p) { return p.catch(function () {}); });
    var wait = Promise.all(fonts).then(function () { return document.fonts ? document.fonts.ready : null; });
    return capped(Promise.all([wait].concat(imgs)), 4000);
  }

  var ready = loaded().then(function () {
    ad.hidden = false;
    build();
    if (seekTo !== null) seek(seekTo);
    else start();
  });

  // OBS browser sources fire this when the source is shown or hidden
  addEventListener("obsSourceVisibleChanged", function (e) {
    if (seekTo !== null) return;
    if (e.detail && e.detail.visible) start();
    else { clearTimeout(timer); clearTimeout(videoStop); seek(0); }
  });

  // replay(): show it again now (the streamers page preview uses it)
  window.QClipsOverlay = { duration: D, seek: seek, ready: ready, box: BOX, layout: layout,
    loop: layout === "circle" ? { start: IN, length: CP } : null,
    replay: function () { clearTimeout(timer); clearTimeout(videoStop); cycle(); } };
})();
