/* =========================================================
   ДНК — код жизни · логика страницы
   Без модулей и библиотек: работает при открытии файла напрямую.
   ========================================================= */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return [].slice.call((ctx || doc).querySelectorAll(sel)); };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasIO = 'IntersectionObserver' in window;

  var slides = $$('.slide');
  var current = 0;

  /* ---------- Утилиты ---------- */
  function formatNum(value, dec) {
    return value.toLocaleString('ru-RU', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function onVisible(el, cb, threshold) {
    if (!hasIO) { cb(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { io.disconnect(); cb(); }
      });
    }, { threshold: threshold || 0.3 });
    io.observe(el);
  }
  function svgEl(name, attrs) {
    var el = doc.createElementNS('http://www.w3.org/2000/svg', name);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  /* =========================================================
     Индикатор слайдов, меню, прогресс
     ========================================================= */
  var dotsList = $('#dots');
  var dots = slides.map(function (s, i) {
    var li = doc.createElement('li');
    var b = doc.createElement('button');
    var title = s.getAttribute('data-title') || ('Слайд ' + (i + 1));
    b.type = 'button';
    b.setAttribute('aria-label', (i + 1) + '. ' + title);
    b.innerHTML = '<span>' + title + '</span>';
    b.addEventListener('click', function () { goTo(i); });
    li.appendChild(b);
    dotsList.appendChild(li);
    return b;
  });
  $('#slide-total').textContent = String(slides.length).padStart(2, '0');

  var navLinks = $$('.nav a');
  var topbar = $('#topbar');
  var progressBar = $('#progress-bar');
  var slideNum = $('#slide-num');

  function setCurrent(i) {
    current = i;
    slideNum.textContent = String(i + 1).padStart(2, '0');
    dots.forEach(function (d, k) { d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
    var id = slides[i].id;
    navLinks.forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
    });
  }

  function detectCurrent() {
    var line = window.innerHeight * 0.45;
    var idx = 0;
    for (var i = 0; i < slides.length; i++) {
      if (slides[i].getBoundingClientRect().top <= line) idx = i;
    }
    // Внизу страницы — последний слайд
    if (window.innerHeight + window.scrollY >= root.scrollHeight - 4) idx = slides.length - 1;
    return idx;
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var max = root.scrollHeight - window.innerHeight;
      var p = max > 0 ? window.scrollY / max : 0;
      progressBar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      topbar.classList.toggle('is-solid', window.scrollY > 40);
      var idx = detectCurrent();
      if (idx !== current) setCurrent(idx);
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  setCurrent(detectCurrent());
  onScroll();

  // Бургер
  var burger = $('#burger');
  var nav = $('#nav');
  burger.addEventListener('click', function () {
    var open = burger.getAttribute('aria-expanded') !== 'true';
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    nav.classList.toggle('is-open', open);
  });
  navLinks.forEach(function (a) {
    a.addEventListener('click', function () {
      burger.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
    });
  });
  doc.addEventListener('click', function (e) {
    if (nav.classList.contains('is-open') && !nav.contains(e.target) && !burger.contains(e.target)) {
      burger.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
    }
  });

  /* =========================================================
     Режим презентации: клавиши и полный экран
     ========================================================= */
  var navTarget = 0;
  var navUntil = 0;

  function goTo(i) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    navTarget = i;
    navUntil = performance.now() + 900;
    slides[i].scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    setCurrent(i);
  }
  function baseIndex() {
    return performance.now() < navUntil ? navTarget : current;
  }
  function scrollByPage(dir) {
    window.scrollBy({ top: dir * window.innerHeight * 0.75, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  function next() {
    var i = baseIndex();
    var rect = slides[i].getBoundingClientRect();
    // Если слайд выше экрана (телефон / маленькое окно) — сначала докручиваем его
    if (performance.now() >= navUntil && rect.bottom > window.innerHeight + 40) { scrollByPage(1); return; }
    goTo(i + 1);
  }
  function prev() {
    var i = baseIndex();
    var rect = slides[i].getBoundingClientRect();
    if (performance.now() >= navUntil && rect.top < -40) { scrollByPage(-1); return; }
    goTo(i - 1);
  }

  function toggleFullscreen() {
    var fsEl = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (fsEl) {
      (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc);
    } else {
      var req = root.requestFullscreen || root.webkitRequestFullscreen;
      if (req) {
        var p = req.call(root);
        if (p && p.catch) p.catch(function () {});
      }
    }
  }

  var kbdHint = $('#kbd-hint');
  function hideHint() { kbdHint.classList.add('is-hidden'); }
  setTimeout(hideHint, 8000);

  doc.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target;
    var tag = t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable) return;
    var onControl = tag === 'BUTTON' || tag === 'A';

    // Цифры 1–4 отвечают в тесте, когда открыт его слайд
    if (slides[current] && slides[current].id === 'quiz' && /^[1-4]$/.test(e.key)) {
      if (quizAnswerByKey(+e.key - 1)) { e.preventDefault(); return; }
    }

    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case 'PageDown':
        e.preventDefault(); next(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
        e.preventDefault(); prev(); break;
      case ' ': case 'Spacebar':
        if (onControl) return;
        e.preventDefault(); if (e.shiftKey) prev(); else next(); break;
      case 'Home':
        e.preventDefault(); goTo(0); break;
      case 'End':
        e.preventDefault(); goTo(slides.length - 1); break;
      default:
        // e.code — работает и при русской раскладке (клавиша «А»)
        if (e.code === 'KeyF' || e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFullscreen(); }
        else return;
    }
    hideHint();
  });

  /* =========================================================
     Видео на главном экране
     ========================================================= */
  var hero = $('#hero');
  var video = $('#hero-video');
  var heroHint = $('#hero-hint');
  var rampId = 0;
  var MIN_RATE = 0.1;

  function setRate(r) {
    try { video.playbackRate = r; } catch (err) { /* старые браузеры */ }
  }
  function rampTo(target, duration, done) {
    cancelAnimationFrame(rampId);
    if (reduceMotion) { setRate(target); if (done) done(); return; }
    var from = video.playbackRate;
    var t0 = performance.now();
    function step(now) {
      var k = Math.min(1, (now - t0) / duration);
      var eased = 1 - Math.pow(1 - k, 3);
      setRate(Math.max(MIN_RATE, from + (target - from) * eased));
      if (k < 1) rampId = requestAnimationFrame(step);
      else if (done) done();
    }
    rampId = requestAnimationFrame(step);
  }

  var wantPlay = false;
  function startVideo() {
    wantPlay = true;
    hero.classList.add('is-playing');
    if (video.paused) {
      if (!reduceMotion) setRate(MIN_RATE);
      var p = video.play();
      if (p && p.catch) {
        p.catch(function () {
          wantPlay = false;
          hero.classList.remove('is-playing');
          if (!canHover) heroHint.textContent = 'Нажмите на экран, чтобы запустить молекулу';
        });
      }
    }
    rampTo(1, 800);
    updateHint();
  }
  function stopVideo(instant) {
    wantPlay = false;
    hero.classList.remove('is-playing');
    if (instant) { cancelAnimationFrame(rampId); video.pause(); updateHint(); return; }
    rampTo(MIN_RATE, 700, function () { if (!wantPlay) video.pause(); });
    updateHint();
  }
  function updateHint() {
    if (canHover) {
      heroHint.textContent = wantPlay ? 'Уберите курсор — молекула плавно остановится'
                                      : 'Наведите курсор, чтобы запустить молекулу';
    } else {
      heroHint.textContent = wantPlay ? 'Нажмите на экран, чтобы остановить'
                                      : 'Нажмите на экран, чтобы запустить молекулу';
    }
  }

  var heroVisible = true;
  if (canHover) {
    hero.addEventListener('mouseenter', function () { if (heroVisible) startVideo(); });
    hero.addEventListener('mouseleave', function () { stopVideo(false); });
    // Курсор уже над видео при загрузке — запуск по первому движению
    hero.addEventListener('mousemove', function () { if (!wantPlay && heroVisible) startVideo(); });
  } else {
    // Телефоны и планшеты: автозапуск без звука + управление касанием
    hero.classList.add('is-touch');
    var userPaused = reduceMotion; // при «меньше движения» — только по нажатию
    hero.addEventListener('click', function (e) {
      if (e.target.closest('a, button')) return;
      if (wantPlay) { userPaused = true; stopVideo(true); }
      else { userPaused = false; startVideo(); }
    });
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        heroVisible = entries[0].isIntersecting;
        if (heroVisible && !userPaused) startVideo();
        else if (!heroVisible && wantPlay) { video.pause(); wantPlay = false; hero.classList.remove('is-playing'); }
      }, { threshold: 0.35 }).observe(hero);
    } else if (!userPaused) {
      startVideo();
    }
  }
  if (canHover && hasIO) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      if (!heroVisible && wantPlay) stopVideo(true);
    }, { threshold: 0.2 }).observe(hero);
  }
  updateHint();

  /* =========================================================
     Фон: частицы и спираль (лёгкий canvas)
     ========================================================= */
  (function initCanvas() {
    if (reduceMotion) return;
    var c = $('#bg-canvas');
    var ctx = c.getContext && c.getContext('2d');
    if (!ctx) return;
    var colors = ['46,242,208', '139,92,246', '255,79,163'];
    var W = 0, H = 0, dpr = 1, parts = [];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = window.innerWidth; H = window.innerHeight;
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = W < 600 ? 26 : W < 1200 ? 44 : 60;
      parts = [];
      for (var i = 0; i < n; i++) {
        parts.push({
          x: Math.random() * W, y: Math.random() * H,
          r: 0.6 + Math.random() * 1.8,
          vx: (Math.random() - 0.5) * 0.18, vy: -0.05 - Math.random() * 0.22,
          c: colors[i % 3], a: 0.25 + Math.random() * 0.5, tw: Math.random() * Math.PI * 2
        });
      }
    }
    resize();
    window.addEventListener('resize', resize);

    function frame(t) {
      requestAnimationFrame(frame);
      // Пока главный экран закрывает фон — не рисуем
      if (window.scrollY < window.innerHeight * 0.3) return;
      ctx.clearRect(0, 0, W, H);

      // Спираль справа
      var x0 = W < 800 ? W * 0.92 : W * 0.9;
      var amp = W < 800 ? 18 : 42;
      var step = 22;
      for (var y = -step; y < H + step; y += step) {
        var ph = y * 0.011 + t * 0.00045;
        var s = Math.sin(ph), d = Math.cos(ph);
        var xa = x0 + s * amp, xb = x0 - s * amp;
        if (((y / step) | 0) % 2 === 0) {
          ctx.strokeStyle = 'rgba(255,255,255,0.05)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(xb, y); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(46,242,208,' + (0.12 + 0.18 * (d + 1) / 2).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(xa, y, 2 + d * 1.2, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(255,79,163,' + (0.12 + 0.18 * (1 - d) / 2).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(xb, y, 2 - d * 1.2, 0, 6.283); ctx.fill();
      }

      // Частицы и связи между близкими
      var i, j, p, q, dx, dy, dist;
      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        for (j = i + 1; j < parts.length; j++) {
          q = parts[j]; dx = p.x - q.x; dy = p.y - q.y; dist = dx * dx + dy * dy;
          if (dist < 12000) {
            ctx.strokeStyle = 'rgba(' + p.c + ',' + (0.08 * (1 - dist / 12000)).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
        var a = p.a * (0.6 + 0.4 * Math.sin(t * 0.002 + p.tw));
        ctx.fillStyle = 'rgba(' + p.c + ',' + (a * 0.18).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(' + p.c + ',' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
    }
    requestAnimationFrame(frame);
  })();

  /* =========================================================
     Появление при прокрутке + активные слайды
     ========================================================= */
  var reveals = $$('.reveal');
  if (hasIO && !reduceMotion) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); revealIO.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    reveals.forEach(function (el) { revealIO.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  if (hasIO) {
    var viewIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.target.classList.toggle('in-view', e.isIntersecting); });
    }, { threshold: 0.2 });
    slides.forEach(function (s) { viewIO.observe(s); });
  } else {
    slides.forEach(function (s) { s.classList.add('in-view'); });
  }

  /* =========================================================
     2. Клетка: подсветка органелл
     ========================================================= */
  var cell = $('.cell');
  var cellChips = $$('.cell .chip');
  var cellLocked = null;
  function focusPart(part) {
    cell.classList.toggle('is-focus', !!part);
    $$('.cell__part', cell).forEach(function (g) { g.classList.toggle('is-on', g.getAttribute('data-part') === part); });
    cellChips.forEach(function (ch) { ch.classList.toggle('is-on', ch.getAttribute('data-part') === part); });
  }
  cellChips.forEach(function (ch) {
    var part = ch.getAttribute('data-part');
    ch.addEventListener('mouseenter', function () { if (!cellLocked) focusPart(part); });
    ch.addEventListener('mouseleave', function () { if (!cellLocked) focusPart(null); });
    ch.addEventListener('click', function () {
      cellLocked = cellLocked === part ? null : part;
      focusPart(cellLocked);
    });
  });

  /* =========================================================
     3. Временная шкала
     ========================================================= */
  var events = [
    { y: '1869', t: 'Фридрих Мишер открывает «нуклеин»',
      p: 'Швейцарский врач выделил из ядер лейкоцитов новое вещество, богатое фосфором, и назвал его «нуклеин». Так впервые была получена ДНК.' },
    { y: '1944', t: 'Опыт Эйвери, Маклауда и Маккарти',
      p: 'В опытах на пневмококках учёные показали, что наследственные свойства передаёт именно ДНК, а не белок. ДНК — вещество наследственности.' },
    { y: '1950', t: 'Правила Чаргаффа',
      p: 'Эрвин Чаргафф установил: в ДНК количество аденина равно количеству тимина (А = Т), а гуанина — цитозина (Г = Ц).' },
    { y: '1952', t: '«Фото 51»',
      p: 'Розалинд Франклин и её аспирант Рэймонд Гослинг получили рентгенограмму ДНК, по которой видно, что молекула имеет форму спирали.' },
    { y: '1953', t: 'Модель двойной спирали',
      p: 'Джеймс Уотсон и Фрэнсис Крик опубликовали в журнале Nature модель ДНК: две цепи, закрученные в спираль, соединены парами А–Т и Г–Ц.' },
    { y: '1962', t: 'Нобелевская премия',
      p: 'Премию по физиологии и медицине получили Уотсон, Крик и Морис Уилкинс. Розалинд Франклин умерла в 1958 году, а посмертно Нобелевскую премию не присуждают.' },
    { y: '1983', t: 'Изобретение ПЦР',
      p: 'Кэри Муллис придумал полимеразную цепную реакцию — способ быстро получить миллионы копий нужного участка ДНК. В 1993 году — Нобелевская премия по химии.' },
    { y: '2003', t: 'Проект «Геном человека» завершён',
      p: 'Международный проект прочитал основную часть генома человека — около 92 %. Оставшиеся трудные участки дочитали в 2022 году.' },
    { y: '2020', t: 'Нобелевская премия за CRISPR/Cas9',
      p: 'Дженнифер Даудна и Эмманюэль Шарпантье получили Нобелевскую премию по химии за метод редактирования генома CRISPR/Cas9.' }
  ];
  var track = $('.timeline__track');
  var tlLine = $('.timeline__line');
  var tlFill = $('#timeline-fill');
  var tlPanel = $('#timeline-panel');
  var tlYear = $('#tl-year'), tlTitle = $('#tl-title'), tlText = $('#tl-text');
  var tlPlay = $('#tl-play');
  var tlIndex = -1;
  var tlTimer = 0;
  var tlPaused = reduceMotion;
  var tlBtns = events.map(function (ev, i) {
    var b = doc.createElement('button');
    b.type = 'button';
    b.className = 'tl-btn';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', 'false');
    b.innerHTML = '<i></i>' + ev.y;
    b.addEventListener('click', function () { setTlPaused(true); showEvent(i); });
    track.appendChild(b);
    return b;
  });

  function layoutLine() {
    var first = tlBtns[0], last = tlBtns[tlBtns.length - 1];
    var a = first.offsetLeft + first.offsetWidth / 2;
    var b = last.offsetLeft + last.offsetWidth / 2;
    tlLine.style.left = a + 'px';
    tlLine.style.right = 'auto';
    tlLine.style.width = (b - a) + 'px';
  }
  layoutLine();
  window.addEventListener('resize', layoutLine);

  function showEvent(i) {
    i = (i + events.length) % events.length;
    if (i === tlIndex) return;
    tlIndex = i;
    var ev = events[i];
    tlYear.textContent = ev.y;
    tlTitle.textContent = ev.t;
    tlText.textContent = ev.p;
    tlBtns.forEach(function (b, k) {
      b.setAttribute('aria-selected', k === i ? 'true' : 'false');
      b.classList.toggle('is-past', k < i);
    });
    tlFill.style.transform = 'scaleX(' + (i / (events.length - 1)) + ')';
    tlPanel.classList.remove('is-swap');
    void tlPanel.offsetWidth;
    tlPanel.classList.add('is-swap');
    // На телефоне держим активный год в поле зрения
    var b = tlBtns[i];
    if (track.scrollWidth > track.clientWidth) {
      track.scrollTo({ left: b.offsetLeft - track.clientWidth / 2 + b.offsetWidth / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }
  function setTlPaused(p) {
    tlPaused = p;
    tlPlay.classList.toggle('is-paused', p);
    tlPlay.setAttribute('aria-label', p ? 'Запустить автопрокрутку' : 'Пауза автопрокрутки');
  }
  setTlPaused(tlPaused);
  $('#tl-prev').addEventListener('click', function () { setTlPaused(true); showEvent(tlIndex - 1); });
  $('#tl-next').addEventListener('click', function () { setTlPaused(true); showEvent(tlIndex + 1); });
  tlPlay.addEventListener('click', function () { setTlPaused(!tlPaused); });
  showEvent(0);

  var historySlide = $('#history');
  tlTimer = setInterval(function () {
    if (tlPaused || doc.hidden) return;
    if (hasIO && !historySlide.classList.contains('in-view')) return;
    showEvent(tlIndex + 1);
  }, 5500);

  /* =========================================================
     4. Пары оснований и антипараллельные цепи
     ========================================================= */
  var BASES = {
    A: { ru: 'А', name: 'Аденин', pair: 'T', bonds: 2, color: '#2ef2d0', kind: 'пурин (два кольца)' },
    T: { ru: 'Т', name: 'Тимин', pair: 'A', bonds: 2, color: '#ff4fa3', kind: 'пиримидин (одно кольцо)' },
    G: { ru: 'Г', name: 'Гуанин', pair: 'C', bonds: 3, color: '#8b5cf6', kind: 'пурин (два кольца)' },
    C: { ru: 'Ц', name: 'Цитозин', pair: 'G', bonds: 3, color: '#ffc857', kind: 'пиримидин (одно кольцо)' }
  };

  // Лестница: верхняя цепь 5'→3', нижняя — комплементарная, 3'→5'
  var rungsG = $('#rungs');
  var topSeq = ['A', 'T', 'G', 'C', 'T', 'A', 'G', 'G'];
  topSeq.forEach(function (bk, i) {
    var x = 78 + i * 52;
    var b1 = BASES[bk], b2 = BASES[b1.pair];
    var g = svgEl('g', { 'class': 'rung', 'data-bases': bk + b1.pair });
    g.appendChild(svgEl('rect', { x: x, y: 40, width: 32, height: 44, rx: 6, fill: b1.color }));
    g.appendChild(svgEl('rect', { x: x, y: 86, width: 32, height: 44, rx: 6, fill: b2.color }));
    var t1 = svgEl('text', { x: x + 16, y: 68 }); t1.textContent = b1.ru;
    var t2 = svgEl('text', { x: x + 16, y: 114 }); t2.textContent = b2.ru;
    g.appendChild(t1); g.appendChild(t2);
    rungsG.appendChild(g);
  });

  var baseBtns = $$('.base');
  var pairL = $('#pair-l'), pairR = $('#pair-r');
  var pairLT = $('#pair-l-t'), pairRT = $('#pair-r-t');
  var bondsG = $('#pair-bonds');
  var pairInfo = $('#pair-info');
  var ladder = $('#ladder');
  var basesBox = $('.bases');

  function pickBase(key) {
    var b = BASES[key], p = BASES[b.pair];
    baseBtns.forEach(function (btn) {
      var k = btn.getAttribute('data-base');
      var on = k === key || k === b.pair;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', k === key ? 'true' : 'false');
    });
    basesBox.classList.add('has-pick');

    pairL.style.fill = b.color + '33'; pairL.style.stroke = b.color;
    pairR.style.fill = p.color + '33'; pairR.style.stroke = p.color;
    pairLT.textContent = b.ru; pairLT.style.fill = b.color;
    pairRT.textContent = p.ru; pairRT.style.fill = p.color;

    while (bondsG.firstChild) bondsG.removeChild(bondsG.firstChild);
    var n = b.bonds;
    for (var i = 0; i < n; i++) {
      var y = 60 + (i - (n - 1) / 2) * 20;
      var line = svgEl('line', { x1: 168, y1: y, x2: 232, y2: y, 'class': 'pair-bond' });
      line.style.animationDelay = (i * 0.12) + 's, 0s';
      bondsG.appendChild(line);
    }

    pairInfo.innerHTML = '<b>' + b.name + ' (' + b.ru + ') — ' + p.name + ' (' + p.ru + ')</b>: ' +
      n + ' водородные связи.<br>' + b.ru + ' — ' + b.kind + ', ' + p.ru + ' — ' + p.kind + '.';

    ladder.classList.add('has-pick');
    $$('.rung', ladder).forEach(function (g) {
      var s = g.getAttribute('data-bases');
      g.classList.toggle('is-on', s === key + b.pair || s === b.pair + key);
    });
  }
  baseBtns.forEach(function (btn) {
    btn.addEventListener('click', function () { pickBase(btn.getAttribute('data-base')); });
  });

  /* =========================================================
     5. Счётчики
     ========================================================= */
  var counters = $$('.counter');
  counters.forEach(function (el) {
    var to = parseFloat(el.getAttribute('data-to'));
    var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
    if (reduceMotion) { el.textContent = formatNum(to, dec); return; }
    el.textContent = formatNum(0, dec);
    onVisible(el, function () {
      var t0 = performance.now(), dur = 1800;
      function step(now) {
        var k = Math.min(1, (now - t0) / dur);
        var eased = 1 - Math.pow(1 - k, 4);
        el.textContent = formatNum(to * eased, dec);
        if (k < 1) requestAnimationFrame(step);
        else el.textContent = formatNum(to, dec);
      }
      requestAnimationFrame(step);
    }, 0.5);
  });

  /* =========================================================
     7. Чтение кодонов
     ========================================================= */
  var codons = $$('#codon-row .cod');
  var aaRow = $('#aa-row');
  var codonBtn = $('#codon-btn');
  var codonBusy = false;
  function translate() {
    if (codonBusy) return;
    codonBusy = true;
    codonBtn.disabled = true;
    aaRow.innerHTML = '';
    var i = 0;
    function stepCodon() {
      codons.forEach(function (c) { c.classList.remove('is-reading'); });
      if (i >= codons.length) {
        codonBusy = false;
        codonBtn.disabled = false;
        codonBtn.textContent = 'Ещё раз';
        return;
      }
      var c = codons[i];
      c.classList.add('is-reading');
      var aa = doc.createElement('span');
      var stop = c.classList.contains('cod--stop');
      aa.className = 'aa' + (stop ? ' aa--stop' : '');
      var note = c.getAttribute('data-note');
      aa.innerHTML = c.getAttribute('data-aa') + (note ? '<small>' + note + '</small>' : '');
      aaRow.appendChild(aa);
      i++;
      setTimeout(stepCodon, reduceMotion ? 0 : 750);
    }
    stepCodon();
  }
  codonBtn.addEventListener('click', translate);
  onVisible($('.codon'), function () { setTimeout(translate, reduceMotion ? 0 : 900); }, 0.6);

  /* =========================================================
     10. Мини-тест
     ========================================================= */
  var QUESTIONS = [
    { q: 'Какое азотистое основание комплементарно аденину (А) в ДНК?',
      o: ['Гуанин (Г)', 'Тимин (Т)', 'Цитозин (Ц)', 'Урацил (У)'], a: 1,
      e: 'Аденин всегда образует пару с тимином — двумя водородными связями.' },
    { q: 'Сколько водородных связей между гуанином и цитозином?',
      o: ['Одна', 'Две', 'Три', 'Четыре'], a: 2,
      e: 'Г–Ц соединены тремя водородными связями, а А–Т — двумя.' },
    { q: 'Сколько нуклеотидов составляют один кодон?',
      o: ['Один', 'Два', 'Три', 'Четыре'], a: 2,
      e: 'Кодон — это тройка нуклеотидов (триплет). Всего кодонов 64.' },
    { q: 'Кто получил рентгенограмму ДНК «Фото 51»?',
      o: ['Уотсон и Крик', 'Розалинд Франклин и Рэймонд Гослинг', 'Фридрих Мишер', 'Эрвин Чаргафф'], a: 1,
      e: 'Снимок получен в 1952 году в Королевском колледже Лондона.' },
    { q: 'Как называется синтез РНК по матрице ДНК?',
      o: ['Репликация', 'Транскрипция', 'Трансляция', 'Мутация'], a: 1,
      e: 'Транскрипция — «переписывание» гена в РНК. Трансляция — синтез белка на рибосоме.' },
    { q: 'Какие мутации меняют число хромосом?',
      o: ['Генные', 'Хромосомные', 'Геномные', 'Точечные'], a: 2,
      e: 'Геномные мутации меняют число хромосом, например трисомия 21 при синдроме Дауна.' },
    { q: 'Какой метод позволяет быстро получить миллионы копий участка ДНК?',
      o: ['ПЦР', 'Секвенирование', 'Рентгеноструктурный анализ', 'Микроскопия'], a: 0,
      e: 'Полимеразную цепную реакцию изобрёл Кэри Муллис в 1983 году.' }
  ];
  var quizBox = $('#quiz-box'), quizResult = $('#quiz-result');
  var qStep = $('#quiz-step'), qScore = $('#quiz-score'), qBar = $('#quiz-bar');
  var qText = $('#quiz-q'), qOpts = $('#quiz-opts'), qExplain = $('#quiz-explain'), qNext = $('#quiz-next');
  var qi = 0, score = 0, answered = false;

  function renderQuestion() {
    var item = QUESTIONS[qi];
    answered = false;
    qStep.textContent = 'Вопрос ' + (qi + 1) + ' из ' + QUESTIONS.length;
    qScore.textContent = score;
    qBar.style.width = (qi / QUESTIONS.length * 100) + '%';
    qText.textContent = item.q;
    qText.classList.remove('is-swap'); void qText.offsetWidth; qText.classList.add('is-swap');
    qExplain.textContent = '';
    qExplain.className = 'quiz__explain';
    qNext.hidden = true;
    qOpts.innerHTML = '';
    item.o.forEach(function (text, k) {
      var b = doc.createElement('button');
      b.type = 'button';
      b.className = 'opt';
      b.innerHTML = '<kbd>' + (k + 1) + '</kbd><span></span>';
      b.lastChild.textContent = text;
      b.addEventListener('click', function () { answer(k); });
      qOpts.appendChild(b);
    });
  }
  function answer(k) {
    if (answered) return;
    answered = true;
    var item = QUESTIONS[qi];
    var btns = $$('.opt', qOpts);
    var ok = k === item.a;
    if (ok) score++;
    btns.forEach(function (b, i) {
      b.disabled = true;
      if (i === item.a) b.classList.add('is-correct');
      else if (i === k) b.classList.add('is-wrong');
      else b.classList.add('is-dim');
    });
    qScore.textContent = score;
    qBar.style.width = ((qi + 1) / QUESTIONS.length * 100) + '%';
    qExplain.className = 'quiz__explain ' + (ok ? 'ok' : 'bad');
    qExplain.innerHTML = '<b>' + (ok ? 'Верно!' : 'Неверно.') + '</b> ';
    qExplain.appendChild(doc.createTextNode(item.e));
    qNext.textContent = qi < QUESTIONS.length - 1 ? 'Дальше' : 'Результат';
    qNext.hidden = false;
    qNext.focus({ preventScroll: true });
  }
  function quizAnswerByKey(k) {
    if (quizBox.hidden || answered || k >= QUESTIONS[qi].o.length) return false;
    answer(k);
    return true;
  }
  qNext.addEventListener('click', function () {
    if (qi < QUESTIONS.length - 1) { qi++; renderQuestion(); }
    else showResult();
  });
  function showResult() {
    quizBox.hidden = true;
    quizResult.hidden = false;
    var total = QUESTIONS.length;
    $('#res-score').textContent = score;
    $('#res-total').textContent = total;
    var msg;
    if (score === total) msg = 'Отлично! Вы настоящий знаток ДНК.';
    else if (score >= total - 2) msg = 'Хороший результат! Почти всё верно.';
    else if (score >= Math.ceil(total / 2)) msg = 'Неплохо, но стоит повторить пару разделов.';
    else msg = 'Попробуйте ещё раз — всё получится!';
    $('#res-msg').textContent = msg;
    var ring = $('#ring-fg');
    var len = 2 * Math.PI * 52;
    ring.style.strokeDashoffset = String(len);
    void ring.getBoundingClientRect();
    requestAnimationFrame(function () { ring.style.strokeDashoffset = String(len * (1 - score / total)); });
    $('#quiz-retry').focus({ preventScroll: true });
  }
  $('#quiz-retry').addEventListener('click', function () {
    qi = 0; score = 0;
    quizResult.hidden = true;
    quizBox.hidden = false;
    renderQuestion();
  });
  renderQuestion();
})();
