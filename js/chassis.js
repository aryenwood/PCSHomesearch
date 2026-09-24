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
