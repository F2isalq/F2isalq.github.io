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
  var BOX = { bar: [1920, 1080], card: [1920, 1080], mini: [600, 188], badge: [420, 136] };
  var POS = {
    bar: AR ? [['bottom', 'أسفل الشاشة'], ['top', 'أعلى الشاشة']] : [['bottom', 'Bottom'], ['top', 'Top']],
    card: AR
      ? [['br', 'أسفل اليمين'], ['bl', 'أسفل اليسار'], ['tr', 'أعلى اليمين'], ['tl', 'أعلى اليسار']]
      : [['br', 'Bottom right'], ['bl', 'Bottom left'], ['tr', 'Top right'], ['tl', 'Top left']]
  };

  function val(name) { return form.elements[name].value; }
  function field(name) { return form.elements[name].closest('.st-field'); }
  function isSmall() { return val('layout') === 'mini' || val('layout') === 'badge'; }

  function fillPos() {
    var sel = form.elements.pos, keep = sel.value, list = POS[val('layout')];
    field('pos').hidden = !list;
    if (!list) return;
    sel.innerHTML = '';
    list.forEach(function (p) { sel.add(new Option(p[1], p[0])); });
    var ok = list.some(function (p) { return p[0] === keep; });
    sel.value = ok ? keep : (val('layout') === 'card' && val('lang') === 'ar' ? 'bl' : list[0][0]);
  }

  var lastLayout = val('layout');
  function layoutChanged() {
    var l = val('layout'), every = form.elements.every, hold = form.elements.hold;
    // the mini strip is meant to come often, the big ones rarely
    if (l === 'mini' && lastLayout !== 'mini' && Number(every.value) >= 600) every.value = '120';
    if (l !== 'mini' && lastLayout === 'mini' && every.value !== '0' && Number(every.value) < 600) every.value = '600';
    if (l === 'mini' && hold.value === '12') hold.value = '10';
    if (l !== 'mini' && lastLayout === 'mini' && hold.value === '10') hold.value = '12';
    field('every').hidden = field('hold').hidden = l === 'badge';
    field('scale').hidden = field('shot').hidden = l === 'mini' || l === 'badge';
    lastLayout = l;
  }

  function params(extra) {
    var l = val('layout'), q = new URLSearchParams();
    q.set('lang', val('lang'));
    if (l !== 'bar') q.set('layout', l);
    if (POS[l] && val('pos') !== (l === 'bar' ? 'bottom' : (val('lang') === 'ar' ? 'bl' : 'br'))) q.set('pos', val('pos'));
    if (val('from')) q.set('from', val('from'));
    if (l !== 'badge') {
      if (val('every') !== '600') q.set('every', val('every'));
      if (val('hold') !== (l === 'mini' ? '10' : '12')) q.set('hold', val('hold'));
    }
    // look: only what differs from the defaults
    if (val('accent')) q.set('accent', val('accent'));
    if (val('theme') !== 'dark') q.set('theme', val('theme'));
    if (val('corners') !== 'round') q.set('corners', val('corners'));
    if (val('enter') !== 'slide') q.set('enter', val('enter'));
    if (l === 'bar' || l === 'card') {
      if (val('scale') !== '1') q.set('scale', val('scale'));
      if (val('shot') === '0') q.set('shot', '0');
    }
    for (var k in extra) q.set(k, extra[k]);
    return q.toString();
  }

  var timer = 0;
  function update() {
    var l = val('layout'), box = BOX[l], small = isSmall();
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
      if (l !== 'badge') extra.every = String(Number(val('hold')) + 4);
      frame.src = base + '?' + params(extra);
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
