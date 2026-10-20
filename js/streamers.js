// "For streamers" page: builds the overlay link from the form, keeps the live preview in step and copies the link.
// No network requests of its own.
(function () {
  'use strict';
  var form = document.getElementById('st-form');
  if (!form) return;
  var AR = document.documentElement.lang === 'ar';
  var out = document.getElementById('st-link');
  var copy = document.getElementById('st-copy');
  var frame = document.getElementById('st-frame');
  var size = document.getElementById('st-size');
  var note = document.getElementById('st-size-note');
  var base = new URL(form.getAttribute('data-base'), location.href).href;
  // must match overlay.js
  var BOX = { mini: [600, 188], badge: [420, 136], notify: [560, 124], tile: [300, 372] };
  var FULL = [1920, 1080];
  var ALWAYS = { badge: 1, tile: 1, scene: 1 };
  var HOLD = { mini: '10', notify: '7', ticker: '15' };
  var POS = {
    bar: AR ? [['bottom', 'أسفل الشاشة'], ['top', 'أعلى الشاشة']] : [['bottom', 'Bottom'], ['top', 'Top']],
    card: AR
      ? [['br', 'أسفل اليمين'], ['bl', 'أسفل اليسار'], ['tr', 'أعلى اليمين'], ['tl', 'أعلى اليسار']]
      : [['br', 'Bottom right'], ['bl', 'Bottom left'], ['tr', 'Top right'], ['tl', 'Top left']],
    side: AR ? [['left', 'يسار الشاشة'], ['right', 'يمين الشاشة']] : [['right', 'Right'], ['left', 'Left']]
  };
  POS.ticker = POS.bar;
  function posDefault(l) { return l === 'card' ? (val('lang') === 'ar' ? 'bl' : 'br') : l === 'side' ? (val('lang') === 'ar' ? 'left' : 'right') : 'bottom'; }

  function val(name) { return form.elements[name].value; }
  function field(name) { return form.elements[name].closest('.st-field'); }
  function isSmall() { return !!BOX[val('layout')]; }
  function show(name, on) { field(name).hidden = !on; }

  function fillPos() {
    var sel = form.elements.pos, keep = sel.value, list = POS[val('layout')];
    field('pos').hidden = !list;
    if (!list) return;
    sel.innerHTML = '';
    list.forEach(function (p) { sel.add(new Option(p[1], p[0])); });
    var ok = list.some(function (p) { return p[0] === keep; });
    sel.value = ok ? keep : posDefault(val('layout'));
  }

  var lastLayout = val('layout');
  function layoutChanged() {
    var l = val('layout'), every = form.elements.every, hold = form.elements.hold;
    // the small ones are meant to come often, the big ones rarely; each has its own usual time on screen
    var often = { mini: '120', notify: '300' };
    if (every.value !== '0') every.value = often[l] || '600';
    hold.value = HOLD[l] || '12';
    show('every', !ALWAYS[l]); show('hold', !ALWAYS[l]);
    show('scale', ['bar', 'card', 'ticker', 'side'].indexOf(l) >= 0);
    show('shot', ['bar', 'card', 'side'].indexOf(l) >= 0);
    show('from', ['bar', 'card', 'mini', 'badge'].indexOf(l) >= 0);
    show('title', l === 'scene');
    lastLayout = l;
  }

  function params(extra) {
    var l = val('layout'), q = new URLSearchParams();
    q.set('lang', val('lang'));
    if (l !== 'bar') q.set('layout', l);
    if (POS[l] && val('pos') !== posDefault(l)) q.set('pos', val('pos'));
    if (val('from') && !field('from').hidden) q.set('from', val('from'));
    if (!ALWAYS[l]) {
      if (val('every') !== '600') q.set('every', val('every'));
      if (val('hold') !== (HOLD[l] || '12')) q.set('hold', val('hold'));
    }
    if (l === 'scene' && val('title') !== 'brb') q.set('title', val('title'));
    // look: only what differs from the defaults
    if (val('accent')) q.set('accent', val('accent'));
    if (val('theme') !== 'dark') q.set('theme', val('theme'));
    if (val('corners') !== 'round') q.set('corners', val('corners'));
    if (val('enter') !== 'slide') q.set('enter', val('enter'));
    if (!field('scale').hidden && val('scale') !== '1') q.set('scale', val('scale'));
    if (!field('shot').hidden && val('shot') === '0') q.set('shot', '0');
    for (var k in extra) q.set(k, extra[k]);
    return q.toString();
  }

  var timer = 0;
  function update() {
    var l = val('layout'), box = BOX[l] || FULL, small = isSmall();
    out.value = base + '?' + params({});
    size.textContent = box[0] + ' × ' + box[1];
    note.textContent = note.getAttribute(small ? 'data-small' : 'data-full');
    // small layouts are previewed at their own shape
    frame.style.aspectRatio = box[0] + ' / ' + box[1];
    frame.style.maxWidth = small ? box[0] + 'px' : '';
    clearTimeout(timer);
    timer = setTimeout(function () {
      frame.style.opacity = '0'; // hide the blank page while the next preview loads
      var extra = { delay: '0.4', bg: '1' };
      if (!ALWAYS[l]) extra.every = String(Number(val('hold')) + 4);
      // navigate the frame itself: changing src again is ignored by some browsers once it has loaded
      var next = base + '?' + params(extra);
      try { if (frame.contentWindow && frame.getAttribute('src')) { frame.contentWindow.location.replace(next); return; } } catch (e) { /* not reachable yet */ }
      frame.src = next;
    }, 150);
  }
  frame.style.transition = 'opacity .3s';
  frame.addEventListener('load', function () { frame.style.opacity = '1'; });

  form.addEventListener('change', function (e) {
    if (e.target.name === 'layout') layoutChanged();
    if (e.target.name === 'layout' || e.target.name === 'lang') fillPos();
    update();
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  copy.addEventListener('click', function () {
    var done = function () {
      var label = copy.textContent;
      copy.textContent = AR ? 'تم النسخ' : 'Copied';
      setTimeout(function () { copy.textContent = label; }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(out.value).then(done, function () { out.select(); });
    else { out.select(); try { document.execCommand('copy'); done(); } catch (err) { /* the link stays selected */ } }
  });

  layoutChanged();
  fillPos();
  update();
})();
