// QClips website 5 (cinematic): the gameplay behind the hero and the scroll scenes (say it, Alt+Z, the editor).
// GSAP and ScrollTrigger are hosted with the site (js/vendor). Without them, or with reduced motion, every scene is
// shown finished.
(function () {
  'use strict';
  var doc = document, root = doc.documentElement, win = window;
  var still = root.classList.contains('rm') || /[?&]motion=off\b/.test(location.search) ||
    (win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var IO = 'IntersectionObserver' in win;
  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }

  /* films play only while on screen, never on their own with reduced motion, and stop for good with the hero button.
     On phones and with the browser's data saver they stay still pictures: 2 MB of video is not worth a mobile plan.
     Both films are the same clip, which the site lets the browser cache, so the second one plays from the cache. */
  var conn = navigator.connection || {};
  var lean = (win.matchMedia && win.matchMedia('(max-width: 900px)').matches) || conn.saveData === true;
  if (lean) root.classList.add('lean');
  var held = false, films = [];
  function play(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  function film(v, threshold) {
    if (!v || still || lean || !IO) return;
    var f = { v: v, seen: false };
    films.push(f);
    new IntersectionObserver(function (es) {
      f.seen = es[0].isIntersecting;
      if (f.seen && !held) play(v); else v.pause();
    }, { threshold: threshold }).observe(v);
  }
  film($('#heroFilm'), .1);
  film($('#sayFilm'), .2);
  var toggle = $('#filmToggle');
  if (toggle) toggle.addEventListener('click', function () {
    held = !held;
    toggle.setAttribute('aria-pressed', String(held));
    toggle.setAttribute('aria-label', toggle.getAttribute(held ? 'data-play' : 'data-pause'));
    films.forEach(function (f) { if (held) f.v.pause(); else if (f.seen) play(f.v); });
    if (!held && waveOn && !wraf) wraf = requestAnimationFrame(drawWave);
  });

  /* ---------- not on Windows (a phone opened from Discord, a Mac): the buttons save the link for the PC ---------- */
  var ua = navigator.userAgent || '';
  if (!/Windows NT/.test(ua) && /Android|iPhone|iPad|iPod|Macintosh|Linux|CrOS/.test(ua)) {
    var AR = root.lang === 'ar';
    var L = AR ? { save: 'احفظ الرابط لجهازك', copied: 'انتسخ الرابط، افتحه على جهاز ويندوز', note: 'QClips لويندوز. افتح qclips.app على جهازك عشان تنزّله.' }
      : { save: 'Save the link for your PC', copied: 'Link copied. Open it on your Windows PC', note: 'QClips is for Windows. Open qclips.app on your PC to download it.' };
    var pageUrl = location.origin + location.pathname.replace(/index\.html$/, '');
    var shareIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 12l4-4m-5.5 1.5L5 11a3 3 0 0 0 4.2 4.2l1.5-1.5m-1.4-7.4L10.8 5A3 3 0 0 1 15 9.2l-1.5 1.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    root.classList.add('not-windows');
    $$('a[href*="releases/latest/download/QClips-Setup"]').forEach(function (a) {
      a.innerHTML = shareIcon + '<span>' + L.save + '</span>';
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var label = $('span', a), done = function () { label.textContent = L.copied; setTimeout(function () { label.textContent = L.save; }, 3500); };
        if (navigator.share) navigator.share({ title: 'QClips', text: L.note, url: pageUrl }).catch(function () {});
        else if (navigator.clipboard) navigator.clipboard.writeText(pageUrl).then(done, function () {});
      });
    });
    var cta = $('.hero .cta');
    if (cta) { var p = doc.createElement('p'); p.className = 'pc-note'; p.textContent = L.note; cta.parentNode.insertBefore(p, cta.nextSibling); }
  }

  /* ---------- the microphone waveform ---------- */
  var canvas = $('#sayWave'), speak = 0, level = 0, waveOn = false, wraf = 0, t0 = performance.now();
  function drawWave(now) {
    wraf = 0;
    var ctx = canvas.getContext('2d'), dpr = Math.min(win.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    level += (speak - level) * .18;
    var n = Math.max(24, Math.floor(w / 9)), gap = w / n, bw = Math.max(2, gap * .45), t = ((now || t0) - t0) / 1000;
    ctx.fillStyle = level > .55 ? '#6fd8ff' : '#4da6ff';
    for (var i = 0; i < n; i++) {
      var x = i / n;
      var noise = .5 + .5 * Math.sin(i * 1.9 + t * 7.3) * Math.cos(i * .53 - t * 4.1);
      var shape = Math.sin(Math.PI * x);
      var amp = still ? .35 * shape : (.08 + level * .92 * shape) * (.35 + .65 * noise);
      var bh = Math.max(3, amp * h);
      var y = (h - bh) / 2, r = Math.min(bw / 2, bh / 2);
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(i * gap + (gap - bw) / 2, y, bw, bh, r); else ctx.rect(i * gap + (gap - bw) / 2, y, bw, bh);
      ctx.fill();
    }
    if (waveOn && !still && !held) wraf = requestAnimationFrame(drawWave);
  }
  if (canvas) {
    if (still || !IO) drawWave();
    else new IntersectionObserver(function (es) {
      waveOn = es[0].isIntersecting;
      if (waveOn && !wraf) wraf = requestAnimationFrame(drawWave); // with the films held this draws one still frame
    }).observe(canvas);
  }

  /* a section the keyboard enters is shown at once, so focus never lands on something still hidden */
  doc.addEventListener('focusin', function (e) {
    var r = e.target.closest && e.target.closest('[data-reveal]');
    if (r) r.classList.add('in');
  });

  /* the menu shows where you are */
  var navLinks = $$('#nav a[href^="#"]');
  if (IO && navLinks.length) {
    var secs = navLinks.map(function (a) { return doc.getElementById(a.getAttribute('href').slice(1)); });
    var nio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a, k) { if (secs[k] === e.target) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    secs.forEach(function (s) { if (s) nio.observe(s); });
  }

  /* ---------- the scenes, played by scroll ---------- */
  var gsap = win.gsap, ST = win.ScrollTrigger;
  if (still || !gsap || !ST) return;
  gsap.registerPlugin(ST);

  var words = $$('.say-words span'), accent = '#6fd8ff';
  // how loudly the player is talking at each point of the scene: the phrase is said between 10% and 55%
  function envelope(p) {
    if (p < .08 || p > .58) return 0;
    var e = Math.min(1, (p - .08) / .05, (.58 - p) / .05);
    return Math.max(.25, e * (.6 + .4 * Math.abs(Math.sin(p * 60))));
  }

  gsap.set(words, { opacity: .22 });
  gsap.set('.say-heard', { opacity: 0, y: 8 });
  gsap.set('.say-toast', { xPercent: 118, transformOrigin: '100% 0%' }); // the frame is always left to right, the notice at its right edge
  var rtl = root.dir === 'rtl';
  gsap.set('.say-lib', { opacity: 0, xPercent: rtl ? -14 : 14, rotateY: rtl ? 16 : -16 });

  var tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '.say-pin', start: 'top top', end: '+=160%', pin: true, scrub: .6, anticipatePin: 1,
      onUpdate: function (s) { speak = envelope(s.progress); }
    }
  });
  tl.to(words[0], { opacity: 1, duration: .12 }, .1)
    .to(words[1], { opacity: 1, duration: .08 }, .3)
    .to(words[2], { opacity: 1, duration: .08 }, .42)
    .to('.say-words .hot', { color: accent, duration: .04 }, .5)
    .to('.say-heard', { opacity: 1, y: 0, duration: .06, ease: 'power2.out' }, .56)
    .to('.say-toast', { xPercent: 0, duration: .12, ease: 'power3.out' }, .62)
    .to('.say-toast', { scale: 1.25, duration: .12, ease: 'power2.out' }, .7)
    .to('.say-screen', { scale: .8, duration: .2, ease: 'power2.inOut' }, .78)
    .to('.say-lib', { opacity: 1, xPercent: 0, rotateY: 0, duration: .2, ease: 'power2.out' }, .8)
    .to({}, { duration: .04 });

  // the headline of the scene rises from behind its line once
  gsap.from('.say h2 .m', { yPercent: 105, duration: 1, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: '.say', start: 'top 70%', once: true } });

  /* ---------- the editor: one part of the real editor at a time ---------- */
  function mark(list, i) { list.forEach(function (el, k) { el.classList.toggle('on', k === i); }); }
  var edFrames = $$('.eds-frames img'), edSteps = $$('.eds-steps li'), edRail = $$('.eds-rail i'), edCur = -1;
  function edShow(i) {
    if (i === edCur) return;
    edCur = i;
    mark(edFrames, i); mark(edSteps, i); mark(edRail, i);
    edFrames.forEach(function (im, k) { if (Math.abs(k - i) <= 1) im.loading = 'eager'; });
  }

  var mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', function () {
    root.classList.add('scenes');
    edShow(0);
    ST.create({
      trigger: '.eds-pin', start: 'top top', end: '+=200%', pin: true, anticipatePin: 1,
      onUpdate: function (s) { edShow(Math.min(3, Math.floor(s.progress * 4))); }
    });
    return function () { root.classList.remove('scenes'); };
  });
  // on a phone the editor reads as a list, each part with its screen

  // the headlines of the sections rise from behind their line once
  $$('.azs h2, .eds h2, .safe .sec-head h2, .sync h2').forEach(function (h) {
    gsap.from($$('.m', h), { yPercent: 105, duration: 1, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 85%', once: true } });
  });

  win.addEventListener('load', function () { ST.refresh(); });
})();
