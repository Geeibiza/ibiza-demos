/* Local-business site helpers. No cookies, no tracking, no external requests
   until the visitor clicks the map or a WhatsApp link.
   Config: window.SITE = { whatsapp, phone, mapQuery, waText: {es, en} }
   Opening hours are read from the JSON-LD block (openingHoursSpecification). */
(function () {
  var S = window.SITE || {};
  var root = document.documentElement;
  root.classList.add('js');

  var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var DAY_NAMES = {
    es: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
    en: DAYS
  };
  var T = {
    es: { open: 'Abierto ahora', closed: 'Cerrado ahora', shut: 'Cerrado', toggle: 'EN', aria: 'Switch to English' },
    en: { open: 'Open now', closed: 'Closed now', shut: 'Closed', toggle: 'ES', aria: 'Cambiar a español' }
  };

  function lang() { return root.getAttribute('data-lang') || 'es'; }

  function initialLang() {
    try {
      var saved = localStorage.getItem('lang');
      if (saved === 'es' || saved === 'en') return saved;
    } catch (e) {}
    return (navigator.language || 'es').toLowerCase().indexOf('es') === 0 ? 'es' : 'en';
  }

  function setLang(l) {
    root.setAttribute('data-lang', l);
    root.lang = l;
    try { localStorage.setItem('lang', l); } catch (e) {}
    document.querySelectorAll('[data-es][data-en]').forEach(function (el) {
      el.textContent = el.getAttribute('data-' + l);
    });
    document.querySelectorAll('[data-es-placeholder]').forEach(function (el) {
      el.placeholder = el.getAttribute('data-' + l + '-placeholder') || '';
    });
    document.querySelectorAll('[data-lang-toggle]').forEach(function (b) {
      b.textContent = T[l].toggle;
      b.setAttribute('aria-label', T[l].aria);
    });
    renderHours();
    updateWhatsApp();
  }

  /* ---------- Opening hours ---------- */
  function schedule() {
    var m = {};
    DAYS.forEach(function (d) { m[d] = []; });
    var el = document.querySelector('script[type="application/ld+json"]');
    var data = {};
    try { data = JSON.parse(el.textContent); } catch (e) {}
    (data.openingHoursSpecification || []).forEach(function (s) {
      [].concat(s.dayOfWeek).forEach(function (d) {
        d = String(d).replace(/^https?:\/\/schema\.org\//, '');
        if (m[d]) m[d].push([s.opens, s.closes]);
      });
    });
    return m;
  }

  function toMin(t) { var p = t.split(':'); return +p[0] * 60 + +p[1]; }

  function madridNow() {
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Madrid', weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date());
    var g = {};
    parts.forEach(function (p) { g[p.type] = p.value; });
    return { day: DAYS.indexOf(g.weekday), min: (+g.hour % 24) * 60 + +g.minute };
  }

  function isOpen(m, now) {
    var today = m[DAYS[now.day]] || [];
    var yesterday = m[DAYS[(now.day + 6) % 7]] || [];
    var openToday = today.some(function (r) {
      var o = toMin(r[0]), c = toMin(r[1]);
      if (c <= o) c += 1440; // closes after midnight
      return now.min >= o && now.min < c;
    });
    var openFromYesterday = yesterday.some(function (r) {
      var o = toMin(r[0]), c = toMin(r[1]);
      return c <= o && now.min < c;
    });
    return openToday || openFromYesterday;
  }

  function renderHours() {
    var m = schedule();
    var l = lang();
    var now = madridNow();
    document.querySelectorAll('[data-hours]').forEach(function (list) {
      list.innerHTML = '';
      DAYS.forEach(function (d, i) {
        var row = document.createElement('li');
        if (i === now.day) row.className = 'today';
        var name = document.createElement('span');
        name.textContent = DAY_NAMES[l][i];
        var time = document.createElement('span');
        time.textContent = m[d].length
          ? m[d].map(function (r) { return r[0] + '–' + r[1]; }).join(', ')
          : T[l].shut;
        row.appendChild(name);
        row.appendChild(time);
        list.appendChild(row);
      });
    });
    var open = isOpen(m, now);
    document.querySelectorAll('[data-open-status]').forEach(function (el) {
      el.textContent = open ? T[l].open : T[l].closed;
      el.classList.toggle('is-open', open);
      el.classList.toggle('is-closed', !open);
    });
  }

  /* ---------- WhatsApp, phone, directions ---------- */
  function waUrl(text) {
    return 'https://wa.me/' + S.whatsapp + (text ? '?text=' + encodeURIComponent(text) : '');
  }

  function updateWhatsApp() {
    var l = lang();
    document.querySelectorAll('[data-wa]').forEach(function (a) {
      var text = a.getAttribute('data-wa-' + l) || (S.waText && S.waText[l]) || '';
      a.href = waUrl(text);
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }

  document.querySelectorAll('[data-tel]').forEach(function (a) {
    a.href = 'tel:' + String(S.phone || '').replace(/\s/g, '');
  });
  document.querySelectorAll('[data-tel-text]').forEach(function (el) {
    el.textContent = S.phone || '';
  });
  document.querySelectorAll('[data-directions]').forEach(function (a) {
    a.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(S.mapQuery || '');
    a.target = '_blank';
    a.rel = 'noopener';
  });

  // Forms are sent as a WhatsApp message: nothing is stored by the website.
  document.querySelectorAll('form[data-wa-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var l = lang();
      var lines = [form.getAttribute('data-wa-' + l) || ''];
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || !el.value) return;
        var label = form.querySelector('label[for="' + el.id + '"] [lang="' + l + '"]');
        var value = el.tagName === 'SELECT' ? el.options[el.selectedIndex].text : el.value;
        lines.push((label ? label.textContent : el.name) + ': ' + value);
      });
      window.open(waUrl(lines.join('\n')), '_blank', 'noopener');
    });
  });

  /* ---------- Map: loads Google only after a click ---------- */
  document.querySelectorAll('[data-map]').forEach(function (box) {
    var btn = box.querySelector('button');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = 'https://www.google.com/maps?q=' + encodeURIComponent(S.mapQuery || '') + '&output=embed';
      f.title = 'Google Maps';
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      f.setAttribute('allowfullscreen', '');
      box.innerHTML = '';
      box.appendChild(f);
    });
  });

  /* ---------- Legal dialog ---------- */
  var legal = document.getElementById('legal');
  document.querySelectorAll('[data-open-legal]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      if (!legal) return;
      legal.showModal();
      var id = b.getAttribute('data-open-legal');
      var target = document.getElementById(lang() === 'en' ? id + '-en' : id);
      if (target) target.scrollIntoView();
    });
  });
  if (legal) {
    legal.addEventListener('click', function (e) { if (e.target === legal) legal.close(); });
    legal.querySelectorAll('[data-close-legal]').forEach(function (b) {
      b.addEventListener('click', function () { legal.close(); });
    });
  }

  /* ---------- Nav, language toggle, year, reveal ---------- */
  document.querySelectorAll('[data-nav-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var open = root.classList.toggle('nav-open');
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    a.addEventListener('click', function () { root.classList.remove('nav-open'); });
  });
  document.querySelectorAll('[data-lang-toggle]').forEach(function (b) {
    b.addEventListener('click', function () { setLang(lang() === 'es' ? 'en' : 'es'); });
  });
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // Anything already on screen shows immediately; the rest fades in on scroll.
  var reveals = Array.prototype.filter.call(document.querySelectorAll('.reveal'), function (el) {
    if (el.getBoundingClientRect().top < window.innerHeight) { el.classList.add('in'); return false; }
    return true;
  });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  setLang(initialLang());
  setInterval(renderHours, 60000);
})();
