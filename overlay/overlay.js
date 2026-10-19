/* QClips stream overlay. One cycle = slide in, hold, slide out; it repeats every `every` seconds.
   Everything that moves is one Web Animation per element over the whole cycle, so ?t=<ms> (and QClipsOverlay.seek)
   can show any moment exactly, which tools/overlay-render.ps1 uses to export the video.

   Address options (all optional):
     lang=en|ar            text language (default en)
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
     accent=1a8cff         accent colour (hex, no #)
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

  var lang = pick("lang", ["en", "ar"], "en");
  var layout = pick("layout", ["bar", "card", "mini", "badge"], "bar");
  var small = layout === "mini" || layout === "badge";
  // full-screen layouts use a 1920x1080 stage; mini and badge a stage the size of the source
  var BOX = { bar: [1920, 1080], card: [1920, 1080], mini: [600, 188], badge: [420, 136] }[layout];
  var pos = layout === "bar"
    ? pick("pos", ["bottom", "top"], "bottom")
    : pick("pos", ["tl", "tr", "bl", "br"], lang === "ar" ? "bl" : "br");
  var align = pick("align", ["center", "start", "end"], "center");
  var cornerSide = layout === "card" ? (pos.charAt(1) === "l" ? "left" : "right") : null;
  var from = pick("from", ["left", "right"], cornerSide || (lang === "ar" ? "right" : "left"));
  var hold = num("hold", layout === "mini" ? 10 : 12, 5, 60) * 1000;
  var every = q.get("every") === "0" ? 0 : num("every", 600, 10, 7200) * 1000;
  var delay = num("delay", 2, 0, 600) * 1000;
  var scale = small ? 1 : num("scale", 1, 0.5, 1.5);
  var opacity = num("opacity", 1, 0.4, 1);
  var accent = /^[0-9a-f]{6}$/i.test(q.get("accent") || "") ? "#" + q.get("accent") : null;
  var seekTo = q.has("t") ? num("t", 0, 0, 1e7) : null;

  var IN = small ? 900 : 1100, OUT = small ? 650 : 800;
  if (layout === "badge") { hold = 0; OUT = 0; IN = 1600; } // the badge only has its entrance, then stays
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
      lines: ["Free game clipping for Windows", "Say “clip it” and it’s saved", KEYS + " saves the moment"]
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
      lines: ["حفظ لقطات الألعاب مجاناً", "قل «سجّل» وتنحفظ اللقطة", KEYS + " يحفظ اللحظة"]
    }
  };

  var root = document.documentElement;
  root.lang = lang;
  root.dir = lang === "ar" ? "rtl" : "ltr";
  if (q.get("bg") === "1") document.body.classList.add("bg");
  if (q.get("checker") === "1") document.body.classList.add("checker");
  if (accent) root.style.setProperty("--accent", accent);

  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };

  var t = TEXT[lang];
  var stage = $("#stage"), ad = $("#ad");
  ad.classList.add(layout, "pos-" + pos, "align-" + align);
  $$("[data-t]").forEach(function (el) { el.textContent = t[el.getAttribute("data-t")]; });
  $(".headline").innerHTML = t.headline.map(function (w) {
    return w.charAt(0) === "*" ? '<span class="w hi">' + w.slice(1) + "</span>" : '<span class="w">' + w + "</span>";
  }).join(" ");
  $(".feats").innerHTML = t.feats.map(function (f) {
    return '<li><span class="ico">' + ICON[f[0]] + "</span><span>" + (layout === "bar" ? f[1] : f[2]) + "</span></li>";
  }).join("");
  $(".lines").innerHTML = t.lines.map(function (l) { return "<li>" + l + "</li>"; }).join("");
  stage.style.width = BOX[0] + "px";
  stage.style.height = BOX[1] + "px";
  if (small) stage.classList.add("small");
  if (opacity < 1) ad.style.opacity = opacity;
  $(".qr .code").src = "qr-" + lang + ".svg";
  document.title = lang === "ar" ? "QClips: أوفرلاي البث" : "QClips stream overlay";

  if (scale !== 1) {
    ad.style.transform = "scale(" + scale + ")";
    var oy = layout === "bar" ? (pos === "top" ? "0" : "100%") : (pos.charAt(0) === "t" ? "0" : "100%");
    var ox = layout === "bar" ? (align === "start" ? "0" : align === "end" ? "100%" : "50%") : (cornerSide === "left" ? "0" : "100%");
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
    if (layout === "badge") return buildBadge();
    var frame = $(".frame", ad);
    var r = frame.getBoundingClientRect();
    var k = stageScale * scale;
    var left = r.left / stageScale, right = r.right / stageScale;
    var sgn = from === "left" ? -1 : 1;
    var W = BOX[0], gap = small ? 24 : 80, skew = small ? 5 : 8;
    // distances in the frame's own (unscaled) pixels; the bar and the mini strip leave on the other side
    var dxIn = (from === "left" ? -(right + gap) : (W - left + gap)) * stageScale / k;
    var dxOut = layout !== "card" ? (from === "left" ? (W - left + gap) : -(right + gap)) * stageScale / k : dxIn;
    var w = frame.offsetWidth;

    track(frame, [
      [0, { transform: "translateX(" + dxIn + "px) skewX(" + (sgn * skew) + "deg)", opacity: 1 }, BACK],
      [small ? 850 : 1000, { transform: "translateX(0) skewX(0deg)", opacity: 1 }],
      [IN + hold, { transform: "translateX(0) skewX(0deg)", opacity: 1 }, IN_QUAD],
      [D, { transform: "translateX(" + dxOut + "px) skewX(" + (dxOut < 0 ? skew : -skew) + "deg)", opacity: 1 }]
    ]);

    var streak = $(".streak", ad);
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

  function buildBadge() {
    var sgn = from === "left" ? -1 : 1;
    track($(".frame", ad), [
      [0, { transform: "translateX(" + (sgn * 48) + "px)", opacity: 0 }, OUT_EXPO],
      [900, { transform: "translateX(0)", opacity: 1 }]
    ]);
    track($(".brand", ad), [[250, { transform: "translateY(6px)", opacity: 0 }, OUT_EXPO], [850, { transform: "translateY(0)", opacity: 1 }]]);
    track($(".qr", ad), [[300, { transform: "scale(.7)", opacity: 0 }, BACK], [950, { transform: "scale(1)", opacity: 1 }]]);
    track($(".card-url", ad), [[550, { transform: "translateY(6px)", opacity: 0 }, OUT_EXPO], [1150, { transform: "translateY(0)", opacity: 1 }]]);

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
  var video = $(".screen video", ad);
  var useVideo = video && (layout === "bar" || layout === "card");
  // Loaded whole (3 MB) into memory: seeking and looping then work on any server, even one without byte ranges.
  var videoReady = !useVideo ? Promise.resolve() : fetch(video.getAttribute("data-src"))
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
    .then(function (b) { video.src = URL.createObjectURL(b); }, function () { video.src = video.getAttribute("data-src"); })
    .then(function () {
      return new Promise(function (done) {
        if (video.readyState >= 2) return done();
        video.addEventListener("loadeddata", done, { once: true });
        video.addEventListener("error", done, { once: true });
        setTimeout(done, 5000);
      });
    });
  var videoStop = 0;

  function seek(ms) {
    anims.forEach(function (a) { a.pause(); a.currentTime = a.loop ? Math.max(0, ms) : Math.min(D, Math.max(0, ms)); });
    if (!useVideo || !video.duration) return Promise.resolve();
    video.pause();
    var to = (Math.min(D, Math.max(0, ms)) / 1000) % video.duration;
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
  function play() {
    anims.forEach(function (a) { a.currentTime = 0; a.play(); });
    if (useVideo) {
      clearTimeout(videoStop);
      video.currentTime = 0;
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
      videoStop = setTimeout(function () { video.pause(); }, D); // nothing to decode while the overlay is away
    }
  }

  var timer = 0;
  function cycle() {
    play();
    if (every > 0 && layout !== "badge") timer = setTimeout(cycle, Math.max(every, D + 1000));
  }
  function start() {
    clearTimeout(timer);
    seek(0);
    timer = setTimeout(cycle, delay);
  }

  function loaded() {
    var imgs = $$("img", ad).map(function (img) {
      return img.decode ? img.decode().catch(function () {}) : Promise.resolve();
    });
    imgs.push(videoReady);
    return Promise.all([document.fonts ? document.fonts.ready : null].concat(imgs));
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

  window.QClipsOverlay = { duration: D, seek: seek, ready: ready, box: BOX, layout: layout };
})();
