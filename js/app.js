    (function () {
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Theme switcher: cycle Auto → Light → Dark. 'auto' leaves data-theme unset so CSS follows the OS
      // (and keeps following live OS changes); Light/Dark set it explicitly. Remembered per-browser.
      (function () {
        var btn = document.querySelector('.theme-toggle');
        if (!btn) return;
        var root = document.documentElement;
        var modes = ['auto', 'light', 'dark'];
        var labels = { auto: 'System', light: 'Light', dark: 'Dark' };
        var get = function () { try { var t = localStorage.getItem('theme'); return (t === 'light' || t === 'dark') ? t : 'auto'; } catch (e) { return 'auto'; } };
        var apply = function (m) {
          if (m === 'auto') root.removeAttribute('data-theme');
          else root.setAttribute('data-theme', m);
          btn.setAttribute('data-mode', m);
          var next = modes[(modes.indexOf(m) + 1) % 3];
          btn.setAttribute('aria-label', 'Theme: ' + labels[m] + '. Click for ' + labels[next] + '.');
          btn.setAttribute('title', 'Theme: ' + labels[m]);
          try { window.dispatchEvent(new CustomEvent('themechange')); } catch (e) {}
        };
        apply(get());
        btn.addEventListener('click', function () {
          var m = modes[(modes.indexOf(get()) + 1) % 3];
          try { m === 'auto' ? localStorage.removeItem('theme') : localStorage.setItem('theme', m); } catch (e) {}
          apply(m);
        });
      })();

      // Scroll-reveal
      var els = document.querySelectorAll('.reveal');
      if (reduce || !('IntersectionObserver' in window)) {
        els.forEach(function (el) { el.classList.add('in'); });
      } else {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
          });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
        els.forEach(function (el) { io.observe(el); });
      }

      // Pause each looping animation while its section is off-screen, so only the section in view animates
      // (perf + calm — the hero demo and the mesh never run at the same time). Skipped under reduced motion.
      if (!reduce && 'IntersectionObserver' in window) {
        var animSections = document.querySelectorAll('.hero, .mesh-band');
        var animIo = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { e.target.classList.toggle('anim-paused', !e.isIntersecting); });
        }, { threshold: 0 });
        animSections.forEach(function (el) { animIo.observe(el); });
      }

      // Shared-element brand: one wordmark. #brandFlip renders it, sitting exactly over the
      // ghost <h1> at the top; as you scroll it shrinks + moves up into the header brand slot,
      // and grows back on scroll up. A single element travelling between the two positions.
      var header = document.querySelector('.site-header');
      var headerInner = document.querySelector('.header-inner');
      var brand = document.querySelector('.brand');
      var ghost = document.querySelector('.hero-word--ghost');
      var flip = document.querySelector('.hero-word--flip');
      var DOCK_TOP = 17, DOCK_FONT = 17, DOCK_LEFT = 28;    // header brand slot; left is measured (frame is centered)
      var TRAVEL = 260;                                     // scroll distance over which it docks
      var src = null;                                       // measured hero position (viewport, at scroll 0)
      var shadowStart = 1e9;                                // scrollY past which the hero sheet has cleared the header (shadow may show)
      var brandWpx = 132;                                   // measured docked-wordmark slot width (px)

      // scene layers that drift up + fade as the brand docks (started together, on scroll)
      var heroStage = document.querySelector('.hero-stage');   // the cube + orbital rings
      var sceneEls = [document.querySelector('.hero-midlist'), document.querySelector('.hero-how'), document.querySelector('.hero-foot')];
      var SCENE = 500;                                          // scroll distance over which the scene recedes
      var sceneActive = false;                                  // so we only clear inline styles once, at the top

      // size the wordmark so it spans the full (inset) panel width, like the reference
      var fitWord = function () {
        if (!ghost) return;
        var head = ghost.parentElement;                    // the white head block (has side padding)
        if (!head) return;
        ghost.style.fontSize = '';                         // back to the CSS clamp to measure
        var cur = parseFloat(getComputedStyle(ghost).fontSize);
        var range = document.createRange(); range.selectNodeContents(ghost);
        var tw = range.getBoundingClientRect().width;
        var hs = getComputedStyle(head);
        var avail = head.clientWidth - parseFloat(hs.paddingLeft) - parseFloat(hs.paddingRight);
        // floor low enough that the wordmark can shrink to SPAN a narrow phone (else it overflows)
        if (tw > 0 && avail > 0) ghost.style.fontSize = Math.max(22, cur * avail / tw) + 'px';
      };

      var measure = function () {
        if (!ghost || !flip) return;
        fitWord();
        var y = window.scrollY;
        if (brand) {
          var br = brand.getBoundingClientRect();       // the real (centered) header brand slot
          DOCK_LEFT = br.left;                          // content-left (frame gutter + padding)
          // vertical-center the docked wordmark on the slot; the flip's line-height (.82) seats
          // its glyphs high in its box, so offset by half that line box to match the nav pill.
          DOCK_TOP = br.top + br.height / 2 - DOCK_FONT * 0.41;
        }
        var r = ghost.getBoundingClientRect();
        src = { left: r.left, top: r.top + y, font: parseFloat(getComputedStyle(ghost).fontSize) };
        flip.style.fontSize = src.font + 'px';
        // the header's lift shadow must stay off until the white hero sheet has scrolled behind it,
        // else the shadow casts a band across the continuous surface (the "two sections" seam)
        var hh = ghost.parentElement;
        if (hh && headerInner) shadowStart = hh.getBoundingClientRect().bottom + y - headerInner.getBoundingClientRect().bottom;
        // reserve the header brand slot to the ACTUAL docked wordmark width, so it never overlaps the nav
        var wr = document.createRange(); wr.selectNodeContents(ghost);
        var textW = wr.getBoundingClientRect().width;
        if (textW > 0) header.style.setProperty('--brand-w', Math.ceil(textW * DOCK_FONT / src.font + 12) + 'px');
        flip.classList.add('ready');
        if (!reduce) render();
      };
      var lerp = function (a, b, t) { return a + (b - a) * t; };
      // easeInOutCubic — accelerate out of the hero, decelerate into the header slot
      var easeInOut = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

      // Drive the hand-off directly from scroll (tight — no laggy inertia). The flip starts from the
      // wordmark's NATURAL scrolled position (src.top - y) so it overlays the resting <h1> exactly at
      // all times, then eases up + shrinks into the header slot. The eased curve gives it weight; the
      // exact overlay makes the shared element seamless (no jump when the overlay takes over).
      var wraf = null;
      var render = function () {
        if (!src) return;
        var y = window.scrollY;
        var p = Math.min(1, Math.max(0, y / TRAVEL));
        var e = easeInOut(p);
        var es = easeInOut(Math.min(1, p / 0.62));         // scale LEADS the arc: shrink early so the wordmark is small by the time the curve reaches the nav row (no mid-flight overlap)
        // the brand's BACKGROUND (the header sheet) morphs on the same eased progress as the
        // wordmark — flush opaque sheet → frosted bar (see .header-inner --dock in CSS). The lift
        // shadow is held on --float until the hero sheet clears, so header + hero stay one surface.
        if (headerInner) {
          headerInner.style.setProperty('--dock', e.toFixed(3));
          headerInner.style.setProperty('--float', Math.min(1, Math.max(0, (y - shadowStart) / 60)).toFixed(3));
        }
        // Open the nav's brand slot as the wordmark nears the top (dock > .4) so the nav glides clear
        // of the docking wordmark — no overlap at any point, and no empty gap at the top (dock < .4).
        if (brand) brand.style.width = (brandWpx * Math.min(1, Math.max(0, (e - 0.4) / 0.6))).toFixed(1) + 'px';
        // CURVED hand-off: instead of a straight line, the wordmark rides a quadratic bézier. The
        // control point sits at (dock-x, start-y) so the path curves horizontally toward the slot
        // FIRST (staying low, shrinking) then sweeps UP into place at the end — a graceful arc that
        // also keeps the still-large wordmark clear of the top-centre nav the whole way. Endpoints
        // stay exact (e=0 rests over the ghost, e=1 lands in the slot); only the middle curves.
        var natTop = src.top - y;                          // where the resting wordmark sits as the page scrolls
        var P0x = src.left, P0y = natTop, P1x = DOCK_LEFT, P1y = DOCK_TOP;
        var Cx = P1x, Cy = P0y;                            // corner control point → left-and-low, then up
        var mt = 1 - e;
        var tx = mt * mt * P0x + 2 * mt * e * Cx + e * e * P1x;
        var ty = mt * mt * P0y + 2 * mt * e * Cy + e * e * P1y;
        var sc = lerp(1, DOCK_FONT / src.font, es);
        flip.style.transform = 'translate3d(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px,0) scale(' + sc.toFixed(4) + ')';
        // flip fades in exactly over the identical resting wordmark it overlays — no visible swap
        var vis = Math.min(1, p * 10);
        flip.style.opacity = vis;
        ghost.style.opacity = 1 - vis;

        // The scene recedes WITH the brand: the cube + bottom sections drift up and fade as you scroll,
        // beginning the moment the brand starts docking. Cleared back to defaults at the very top so the
        // cube's own fade-in and the "How it works?" hover still work.
        var sp = Math.min(1, y / SCENE);
        if (sp > 0.0005) {
          sceneActive = true;
          var op = (1 - sp).toFixed(3);
          var cubeLift = (-sp * 130).toFixed(1);           // the cube rises noticeably — reads as "moving up"
          var textLift = (-sp * 84).toFixed(1);            // bottom sections rise a bit less → parallax depth
          if (heroStage) { heroStage.style.opacity = op; heroStage.style.transform = 'translate3d(0,' + cubeLift + 'px,0) scale(' + (1 - sp * 0.05).toFixed(3) + ')'; }
          for (var i = 0; i < sceneEls.length; i++) if (sceneEls[i]) { sceneEls[i].style.opacity = op; sceneEls[i].style.transform = 'translate3d(0,' + textLift + 'px,0)'; }
        } else if (sceneActive) {
          sceneActive = false;
          if (heroStage) { heroStage.style.opacity = ''; heroStage.style.transform = ''; }
          for (var j = 0; j < sceneEls.length; j++) if (sceneEls[j]) { sceneEls[j].style.opacity = ''; sceneEls[j].style.transform = ''; }
        }
      };
      var onScroll = function () {
        var y = window.scrollY;
        header.classList.toggle('scrolled', y > TRAVEL * 0.6);
        if (!src || !flip || reduce) return;               // reduced-motion path handled in CSS
        if (!wraf) wraf = requestAnimationFrame(function () { wraf = null; render(); });
      };

      if (reduce && flip) { flip.style.display = 'none'; if (ghost) ghost.style.opacity = '1'; }
      measure();
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', function () { measure(); onScroll(); }, { passive: true });
      if (document.fonts && document.fonts.ready) { document.fonts.ready.then(function () { measure(); onScroll(); }); }

      // Scale each fixed coordinate stage ([data-fit]=base width) to fit its wrap,
      // so every pixel offset-path stays aligned with its devices/nodes.
      document.querySelectorAll('[data-fit]').forEach(function (el) {
        var base = +el.getAttribute('data-fit');
        var wrap = el.parentNode;
        var fit = function () { el.style.setProperty('--s', Math.min(1, wrap.clientWidth / base).toFixed(4)); };
        fit();
        if ('ResizeObserver' in window) { new ResizeObserver(fit).observe(wrap); }
        else { window.addEventListener('resize', fit, { passive: true }); }
      });
    })();
