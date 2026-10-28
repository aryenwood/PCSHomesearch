/* PCSHomes chassis behaviors — reveals, reading progress, the living contour ground.
   Source of truth: docs/design/chassis-spec.html. Motion lives in the ground, never on controls.
   Everything is guarded: a page without .rv, #prog, or canvas.ground pays nothing. */
document.documentElement.classList.add('js');
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // scroll reveals
  var els = document.querySelectorAll('.rv');
  if (els.length) {
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); }
    else {
      var seen = 0;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.style.transitionDelay = Math.min((seen++ % 5) * 55, 220) + 'ms';
          en.target.classList.add('in');
          io.unobserve(en.target);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
      els.forEach(function (e) {
        if (e.getBoundingClientRect().top < window.innerHeight) e.classList.add('in');
        else io.observe(e);
      });
    }
  }

  // hero choreography: eyebrow, headline, intro and photo rise in order on load
  document.querySelectorAll('.hero .rv').forEach(function (e, i) { e.style.transitionDelay = (i * 120) + 'ms'; });

  // cascades: rows and cards inside a list arrive one after another as the list scrolls in
  var lists = document.querySelectorAll('.resolve, .facts, .trio, .stage-grid, .right-row-list, .dist-rows, .places, .route-list, .pf-list');
  lists.forEach(function (l) { l.classList.add('cascade'); });
  if (reduce || !('IntersectionObserver' in window)) { lists.forEach(function (l) { l.classList.add('in'); }); }
  else {
    var lio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); lio.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    lists.forEach(function (l) { lio.observe(l); });
  }

  // numbers count up once when they scroll in. Screen readers get the final value only.
  // Only plain figures ($250,000, 4, $1,665/mo, 18) count; phone numbers and ranges are left alone.
  var nums = document.querySelectorAll('.facts .val, [data-count]');
  if (!reduce && 'IntersectionObserver' in window) {
    var nio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return; nio.unobserve(en.target);
        var el = en.target, shown = el.querySelector('[data-count-shown]'); if (!shown) return;
        var final = shown.textContent, m = final.match(/^(\D*)([\d,]+)(.*)$/); if (!m) return;
        var target = parseInt(m[2].replace(/,/g, ''), 10), t0 = null, dur = Math.min(1100, 500 + target / 300);
        (function tick(now) {
          if (t0 === null) t0 = now;
          var k = Math.min(1, (now - t0) / dur), v = Math.round(target * (1 - Math.pow(1 - k, 3)));
          shown.textContent = m[1] + v.toLocaleString('en-US') + m[3];
          if (k < 1) requestAnimationFrame(tick); else shown.textContent = final;
        })(performance.now());
      });
    }, { threshold: 0.4 });
    nums.forEach(function (el) {
      if (el.children.length) return;                      // links or markup inside: leave as is
      var txt = el.textContent.trim();
      if (!/^\$?[\d,]+(\/mo)?$/.test(txt)) return;           // not a plain figure
      el.innerHTML = '<span class="count-sr">' + txt + '</span><span aria-hidden="true" data-count-shown>' + txt + '</span>';
      nio.observe(el);
    });
  }

  // folds (phones only): a long section shows its heading and summary, and opens on a tap.
  // section[data-fold="Label"] folds everything after its first child; [data-fold-block="Label"] folds itself.
  // A link or address pointing inside a fold opens it. Desktop is untouched.
  if (window.matchMedia && window.matchMedia('(max-width: 780px)').matches) {
    var foldN = 0;
    function makeFold(after, nodes, label) {
      var body = document.createElement('div'); body.className = 'fold-body'; body.id = 'fold-' + (++foldN); body.hidden = true;
      nodes.forEach(function (n) { body.appendChild(n); });
      var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'fold-btn';
      btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', body.id); btn.textContent = label;
      after.parentNode.insertBefore(btn, after.nextSibling); btn.parentNode.insertBefore(body, btn.nextSibling);
      btn.addEventListener('click', function () {
        var open = body.hidden; body.hidden = !open; btn.setAttribute('aria-expanded', String(open)); btn.classList.toggle('open', open);
        if (open) body.querySelectorAll('.rv, .cascade').forEach(function (e) { e.classList.add('in'); });
      });
    }
    document.querySelectorAll('section[data-fold]').forEach(function (sec) {
      var kids = [].slice.call(sec.children); var head = kids.shift(); if (head && kids.length) makeFold(head, kids, sec.getAttribute('data-fold'));
    });
    document.querySelectorAll('[data-fold-block]').forEach(function (blk) {
      var mark = document.createElement('span'); blk.parentNode.insertBefore(mark, blk); makeFold(mark, [blk], blk.getAttribute('data-fold-block')); mark.remove();
    });
    function openFor(hash) {
      if (!hash || hash.length < 2) return;
      var t = document.getElementById(decodeURIComponent(hash.slice(1))); if (!t) return;
      var body = t.closest('.fold-body') || (t.matches('section[data-fold]') ? t.querySelector(':scope > .fold-body') : null);
      if (body && body.hidden) { var b = document.querySelector('[aria-controls="' + body.id + '"]'); if (b) b.click(); }
    }
    openFor(location.hash);
    window.addEventListener('hashchange', function () { openFor(location.hash); });
    document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a[href*="#"]'); if (a && a.pathname === location.pathname) openFor(a.hash); });
  }

  // reading progress (chapter pages carry #prog in the bar)
  var prog = document.getElementById('prog');
  if (prog) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        var d = document.documentElement;
        prog.style.width = (100 * window.scrollY / (d.scrollHeight - window.innerHeight)) + '%';
        ticking = false;
      });
    }, { passive: true });
  }

  // North Country ground: slow contour drift inside each navy plate.
  // Paused offscreen, DPR capped at 2, one static frame under reduced motion.
  document.querySelectorAll('canvas.ground').forEach(function (cv) {
    if (!cv.getContext) return;
    var ctx = cv.getContext('2d'), W = 0, H = 0, t = 0, running = false, raf = null;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    function size() {
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < 8; i++) {
        var y0 = H * (0.12 + i * 0.115);
        var amp = 12 + i * 5;
        var dir = (i % 2 ? 1 : -1);
        var ph = t * (0.00022 + i * 0.00004) * dir + i * 47;
        ctx.beginPath();
        for (var x = 0; x <= W; x += 7) {
          var y = y0 + Math.sin(x * 0.0075 + ph) * amp + Math.sin(x * 0.0026 - ph * 0.6 + i) * amp * 0.55;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = i === 4 ? 'rgba(217,180,91,0.20)' : 'rgba(198,206,219,' + (0.07 + 0.016 * i) + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    // ~30fps is plenty for a drift measured in tens of seconds, and halves the phone's paint work
    var last = 0;
    function loop(now) {
      if (now - last >= 33) { last = now; t = now; draw(); }
      if (running) raf = requestAnimationFrame(loop);
    }
    size();
    // Re-measure only when the plate itself changes size (an expander opening inside it).
    // window resize fires on every iPhone toolbar show/hide while scrolling; reallocating
    // the canvas there makes the plate flicker.
    if ('ResizeObserver' in window) {
      var lastW = cv.clientWidth, lastH = cv.clientHeight;
      new ResizeObserver(function () {
        if (cv.clientWidth === lastW && cv.clientHeight === lastH) return;
        lastW = cv.clientWidth; lastH = cv.clientHeight;
        size(); draw();
      }).observe(cv);
    } else {
      window.addEventListener('resize', function () { size(); draw(); }, { passive: true });
    }
    if (reduce) { draw(); }
    else if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && !running) { running = true; raf = requestAnimationFrame(loop); }
          else if (!en.isIntersecting && running) { running = false; if (raf) cancelAnimationFrame(raf); }
        });
      }, { threshold: 0.02 }).observe(cv);
    } else { draw(); }
  });
})();

// Lead forms carry where the visitor came from, so the person who calls knows the context.
// Values come from the address bar and referrer only; nothing is stored or sent elsewhere.
function pcshFillAttribution(form) {
  var q = new URLSearchParams(location.search);
  var set = function (name, value) {
    var el = form.elements[name];
    if (el) el.value = String(value || '').slice(0, 200);
  };
  set('source-page', location.pathname);
  set('referrer', document.referrer);
  set('utm-source', q.get('utm_source'));
  set('utm-medium', q.get('utm_medium'));
  set('utm-campaign', q.get('utm_campaign'));
}
