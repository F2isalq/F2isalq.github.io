// QClips website 4: real screenshots on glass. Pointer tilt, scroll parallax, the tour's changing screen, the Alt+Z
// demo, the editor reel, counters and the sync comparison. No tracking, no cookies, no network requests of its own.
// With prefers-reduced-motion (or ?motion=off in the address) nothing moves on its own and everything is shown as is.
(function () {
  'use strict';
  var doc = document, root = doc.documentElement, win = window;
  root.classList.add('js');
  var AR = root.lang === 'ar';
  var mq = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var forced = /[?&]motion=off\b/.test(location.search);
  if (forced || mq.matches) root.classList.add('rm');
  if (mq.addEventListener) mq.addEventListener('change', function () { root.classList.toggle('rm', forced || mq.matches); });
  function still() { return forced || mq.matches; }
  var fine = win.matchMedia ? win.matchMedia('(hover: hover) and (pointer: fine)') : { matches: true };

  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  var IO = 'IntersectionObserver' in win;

  var T = AR ? {
    open: 'افتح اللوحة', close: 'أغلق اللوحة', opened: 'انفتحت لوحة Alt+Z.', closed: 'انقفلت اللوحة.',
    saved: 'انحفظ المقطع، آخر 30 ثانية.', trimOn: 'المقطع مفتوح في المشغّل للقص السريع.', trimOff: 'انقفل المشغّل.',
    pause: 'إيقاف مؤقت', play: 'تشغيل', mix: function (p) { return 'المقارنة على ' + p + '%'; }
  } : {
    open: 'Open the panel', close: 'Close the panel', opened: 'The Alt+Z panel is open.', closed: 'The panel is closed.',
    saved: 'Clip saved, last 30 seconds.', trimOn: 'The clip is open in the player for a quick trim.', trimOff: 'The player is closed.',
    pause: 'Pause', play: 'Play', mix: function (p) { return 'Comparison at ' + p + '%'; }
  };

  /* ---------- menu ---------- */
  var menuBtn = $('.menu-btn'), nav = $('#nav');
  if (menuBtn && nav) {
    var closeMenu = function () { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); };
    menuBtn.addEventListener('click', function () {
      var o = !nav.classList.contains('open');
      nav.classList.toggle('open', o); menuBtn.setAttribute('aria-expanded', String(o));
      if (o) { var f = $('a', nav); if (f) f.focus(); }
    });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', closeMenu); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) { closeMenu(); menuBtn.focus(); } });
  }

  /* ---------- reveal on scroll ---------- */
  var reveals = $$('[data-reveal]');
  if (IO && !still()) {
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    reveals.forEach(function (el) { rio.observe(el); });
  } else reveals.forEach(function (el) { el.classList.add('in'); });

  /* ---------- one animation loop for pointer tilt and scroll parallax ---------- */
  var px = 0, py = 0, tx = 0, ty = 0, sy = win.scrollY, raf = 0;
  var stack = $('#stack'), heroSec = $('.hero'), layers = $$('.stack .px'), tilts = $$('[data-tilt]');
  var hoverEl = null, hx = 0, hy = 0;
  function frame() {
    raf = 0;
    var moving = false;
    tx = lerp(tx, px, .08); ty = lerp(ty, py, .08);
    if (Math.abs(tx - px) > .001 || Math.abs(ty - py) > .001) moving = true;
    if (stack && heroSec) {
      var r = heroSec.getBoundingClientRect(), vh = win.innerHeight;
      if (r.bottom > 0 && r.top < vh) {
        var base = AR ? 10 : -10;
        stack.style.setProperty('--ry', (base + tx * 7).toFixed(2) + 'deg');
        stack.style.setProperty('--rx', (4 - ty * 4).toFixed(2) + 'deg');
        var p = clamp(-r.top / Math.max(1, r.height), 0, 1);
        layers.forEach(function (l) {
          var d = parseFloat(l.getAttribute('data-depth')) || 0;
          l.style.transform = 'translate3d(' + (tx * d * .12).toFixed(1) + 'px,' + (ty * d * .08 - p * d * 1.2).toFixed(1) + 'px,0)';
        });
        $$('.screen, .chip', stack).forEach(function (s) { s.style.setProperty('--sheen', (60 + tx * 25).toFixed(1) + '%'); });
      }
    }
    if (moving) schedule();
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(frame); }
  if (!still()) {
    if (fine.matches) doc.addEventListener('pointermove', function (e) {
      px = (e.clientX / win.innerWidth) * 2 - 1; py = (e.clientY / win.innerHeight) * 2 - 1; schedule();
    }, { passive: true });
    win.addEventListener('scroll', function () { sy = win.scrollY; schedule(); }, { passive: true });
    schedule();
  }

  /* cards and screens that lean toward the pointer */
  if (!still() && fine.matches) tilts.forEach(function (el) {
    var target = $('.screen', el) || el, rr = 0;
    function apply() {
      rr = 0;
      target.style.transform = 'perspective(1200px) rotateX(' + (-hy * 5).toFixed(2) + 'deg) rotateY(' + (hx * 6).toFixed(2) + 'deg) translateZ(0)';
      target.style.setProperty('--sheen', (50 + hx * 40).toFixed(1) + '%');
    }
    el.addEventListener('pointermove', function (e) {
      var b = el.getBoundingClientRect();
      hx = ((e.clientX - b.left) / b.width) * 2 - 1; hy = ((e.clientY - b.top) / b.height) * 2 - 1;
      if (!rr) rr = requestAnimationFrame(apply);
    });
    el.addEventListener('pointerleave', function () { hx = hy = 0; target.style.transform = ''; target.style.removeProperty('--sheen'); });
  });

  /* ---------- the tour: the screen follows the step in view ---------- */
  var steps = $$('.step'), stage = $('#stage');
  if (steps.length && stage) {
    var imgs = $$('.frames img', stage), dots = $$('.dots i', stage), cap = $('#stageCap'), active = -1;
    var navLinks = $$('#nav a[href^="#"]');
    var setStep = function (i) {
      if (i === active) return;
      active = i;
      imgs.forEach(function (im, k) {
        im.classList.toggle('on', k === i);
        if (k === i && im.loading === 'lazy') im.loading = 'eager';
      });
      dots.forEach(function (d, k) { d.classList.toggle('on', k === i); });
      if (cap) cap.textContent = imgs[i] ? imgs[i].getAttribute('data-cap') : '';
      // the next picture is fetched ahead of time
      if (imgs[i + 1] && imgs[i + 1].loading === 'lazy') imgs[i + 1].loading = 'eager';
    };
    setStep(0);
    if (IO) {
      var sio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) setStep(steps.indexOf(e.target)); });
      }, { rootMargin: '-45% 0px -45% 0px' });
      steps.forEach(function (s) { sio.observe(s); });
    }
    // the menu shows where you are
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
  }

  /* ---------- counters ---------- */
  $$('[data-count]').forEach(function (el) {
    var to = parseFloat(el.getAttribute('data-count')), done = false;
    function run() {
      if (done) return; done = true;
      if (still()) { el.textContent = String(to); return; }
      var t0 = performance.now(), dur = 1300;
      (function step(now) {
        var t = clamp((now - t0) / dur, 0, 1);
        el.textContent = String(Math.round(to * easeOut(t)));
        if (t < 1) requestAnimationFrame(step);
      })(t0);
    }
    if (IO && !still()) {
      el.textContent = '0';
      var cio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { run(); cio.disconnect(); } }, { threshold: .6 });
      cio.observe(el);
    } else run();
  });

  /* ---------- Alt+Z demo: the real panel slides in over the game ---------- */
  var az = $('#azScreen');
  if (az) {
    var azBtn = $('#azBtn'), saveBtn = $('#azSave'), trimBtn = $('#azTrim'), azStatus = $('#azStatus'), inView = false, toastT = 0;
    var lazyAll = function () { $$('img[loading="lazy"]', az).forEach(function (im) { im.loading = 'eager'; }); };
    var setOpen = function (o, quiet) {
      az.classList.toggle('open', o);
      if (!o) { az.classList.remove('trim'); trimBtn.setAttribute('aria-pressed', 'false'); }
      azBtn.setAttribute('aria-pressed', String(o));
      azBtn.querySelector('span').textContent = o ? T.close : T.open;
      trimBtn.disabled = !o;
      if (!quiet) azStatus.textContent = o ? T.opened : T.closed;
    };
    var toggle = function () { lazyAll(); setOpen(!az.classList.contains('open')); };
    azBtn.addEventListener('click', toggle);
    trimBtn.addEventListener('click', function () {
      var o = !az.classList.contains('trim');
      az.classList.toggle('trim', o); trimBtn.setAttribute('aria-pressed', String(o));
      azStatus.textContent = o ? T.trimOn : T.trimOff;
    });
    saveBtn.addEventListener('click', function () {
      lazyAll();
      az.classList.add('saved'); azStatus.textContent = T.saved;
      clearTimeout(toastT); toastT = setTimeout(function () { az.classList.remove('saved'); }, 3200);
    });
    trimBtn.disabled = true;
    if (IO) new IntersectionObserver(function (es) {
      inView = es[0].isIntersecting;
      if (inView) lazyAll();
    }, { rootMargin: '200px 0px' }).observe(az);
    doc.addEventListener('keydown', function (e) {
      if (!inView) return;
      var k = (e.key || '').toLowerCase();
      if (e.altKey && (k === 'z' || e.code === 'KeyZ')) { e.preventDefault(); toggle(); }
      else if (e.altKey && k === 'f10') { e.preventDefault(); saveBtn.click(); }
      else if (k === 'escape' && az.classList.contains('open')) setOpen(false);
    });
  }

  /* ---------- editor reel: the real editor, screen by screen ---------- */
  var reel = $('#reel');
  if (reel) {
    var tabs = $$('[role="tab"]', reel), figs = $$('.reel-frames figure', reel), rcap = $('#reelCap'), pauseBtn = $('#reelPause');
    var cur = 0, timer = 0, paused = still(), visible = false, held = false, DUR = 6000;
    var show = function (i, focus) {
      cur = (i + figs.length) % figs.length;
      figs.forEach(function (f, k) {
        f.classList.toggle('on', k === cur);
        var im = $('img', f); if (k === cur || k === (cur + 1) % figs.length) im.loading = 'eager';
      });
      tabs.forEach(function (t, k) {
        var on = k === cur;
        t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
        var bar = $('i', t); if (bar) { bar.classList.remove('run'); if (on && running()) { void bar.offsetWidth; bar.classList.add('run'); } }
      });
      if (rcap) rcap.textContent = figs[cur].getAttribute('data-cap');
      if (focus) tabs[cur].focus();
      arm();
    };
    var running = function () { return !paused && visible && !held; };
    var arm = function () { clearTimeout(timer); if (running()) timer = setTimeout(function () { show(cur + 1); }, DUR); };
    var refresh = function () {
      var bar = $('i', tabs[cur]);
      if (bar) { bar.classList.remove('run'); if (running()) { void bar.offsetWidth; bar.classList.add('run'); } }
      arm();
    };
    reel.style.setProperty('--dur', DUR / 1000 + 's');
    tabs.forEach(function (t, k) {
      t.addEventListener('click', function () { show(k); });
      t.addEventListener('keydown', function (e) {
        var d = { ArrowRight: AR ? -1 : 1, ArrowLeft: AR ? 1 : -1, Home: -cur, End: figs.length - 1 - cur }[e.key];
        if (d != null) { e.preventDefault(); show(cur + d, true); }
      });
    });
    var setPaused = function (p) {
      paused = p;
      pauseBtn.setAttribute('aria-pressed', String(p));
      $('span', pauseBtn).textContent = p ? T.play : T.pause;
      pauseBtn.querySelector('.ic-pause').style.display = p ? 'none' : '';
      pauseBtn.querySelector('.ic-play').style.display = p ? '' : 'none';
      refresh();
    };
    pauseBtn.addEventListener('click', function () { setPaused(!paused); });
    reel.addEventListener('pointerenter', function () { held = true; refresh(); });
    reel.addEventListener('pointerleave', function () { held = false; refresh(); });
    reel.addEventListener('focusin', function () { held = true; refresh(); });
    reel.addEventListener('focusout', function (e) { if (!reel.contains(e.relatedTarget)) { held = false; refresh(); } });
    if (IO) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; refresh(); }, { threshold: .35 }).observe(reel);
    setPaused(paused);
    show(0);
  }

  /* ---------- sync comparison ---------- */
  var cmp = $('#cmp');
  if (cmp) {
    $$('.snd', cmp).forEach(function (el) {
      var spikes = (el.getAttribute('data-spike') || '').split(',').map(parseFloat), html = '';
      for (var i = 0; i < 120; i++) {
        var x = i / 120, h = 6 + 10 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * .37));
        spikes.forEach(function (s) { var d = Math.abs(x - s); if (d < .02) h = Math.max(h, 58 - d * 1500); });
        html += '<i style="left:' + (x * 100).toFixed(2) + '%;height:' + h.toFixed(0) + 'px"></i>';
      }
      el.innerHTML = html;
    });
    var range = $('#cmpRange');
    range.addEventListener('input', function () { cmp.style.setProperty('--pos', range.value + '%'); range.setAttribute('aria-valuetext', T.mix(range.value)); });
  }
})();
