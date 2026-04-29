/* =========================================================
   JM Fencing & Gardening — script.js
   Single-viewport modal-deck site:
     - Hero canvas frame sequence (kept) drives the backdrop
       through the first 22% of body scroll.
     - Cards pop in/out as the user scrolls further.
     - Mouse parallax tilts the backdrop and deck on desktop.
   ========================================================= */

(() => {
  const FRAME_COUNT = 61;
  const framePath = (i) => `frames/frame-${String(i + 1).padStart(3, '0')}.jpg`;

  // The hero canvas + overlays own the first viewport-height of body
  // scroll. After that, the entire .deck__strip translates upward as
  // one rigid unit at exactly 1:1 with scroll, so each card passes
  // through the viewport in sequence. No overlap is ever possible.
  const CARD_IDS = ['about', 'work', 'services', 'process', 'faq', 'contact'];
  // Hero scroll budget = one viewport.
  const heroPx = () => window.innerHeight;
  // Strip travel = the actual rendered height of .deck__strip. On
  // desktop each card is fixed at 100vh so this equals N × 100vh; on
  // mobile cards grow to fit their content so the strip is taller —
  // either way, a touch on a panel never traps scroll because the
  // panel itself never scrolls. The conveyor still moves 1:1 with
  // body scroll because the .scroll-track height is sized to match.
  const stripPx = () => {
    const strip = document.getElementById('deck-strip');
    return strip ? strip.offsetHeight : CARD_IDS.length * window.innerHeight;
  };

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarse = matchMedia('(pointer: coarse), (max-width: 820px)').matches;

  const ready = (fn) => (document.readyState !== 'loading') ? fn() : document.addEventListener('DOMContentLoaded', fn);
  ready(init);

  function init() {
    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();

    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
    }

    sizeTrack();
    setupHero();
    setupNav();
    setupDeck();
    setupParallax();
    setupFAQ();
    setupLightbox();
    setupNavLinks();
    setupBackToTop();

    // Resize: re-size the scroll-track first (in case mobile cards
    // changed height due to a new viewport width), then refresh
    // ScrollTrigger so all start/end positions recompute.
    let trackResizeRAF = null;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(trackResizeRAF);
      trackResizeRAF = requestAnimationFrame(() => {
        sizeTrack();
        if (window.ScrollTrigger) ScrollTrigger.refresh();
      });
    });

    // Final refresh so every ScrollTrigger picks up correct dimensions
    // after layout settles (loader fade, fonts, frame preload promises).
    if (window.ScrollTrigger) {
      requestAnimationFrame(() => { sizeTrack(); ScrollTrigger.refresh(); });
      // And once more after a beat in case async work shifts layout.
      setTimeout(() => {
        if (!window.ScrollTrigger) return;
        sizeTrack();
        ScrollTrigger.refresh();
      }, 800);
    }
  }

  /* Body scroll = hero scroll budget + measured strip travel + one
     viewport of trailing buffer (so the last card can fully scroll
     into view). The .scroll-track div is the only thing generating
     body height, so setting its height controls body scrollability. */
  function sizeTrack() {
    const track = document.getElementById('scroll-track');
    const strip = document.getElementById('deck-strip');
    if (!track || !strip) return;
    const total = heroPx() + strip.offsetHeight + window.innerHeight;
    track.style.height = `${total}px`;
  }

  /* Resolve the scroll-track once, lazily.
     Function declarations (not const arrows) so they're hoisted above
     the call sites inside setupHero/setupDeck/setupNav. */
  function scrollTrackEl() {
    return document.getElementById('scroll-track');
  }
  function trackH() {
    const el = scrollTrackEl();
    return el ? el.offsetHeight : window.innerHeight * 8;
  }

  /* -----------------------------------------------------------
     Hero canvas + scroll-linked frame sequence
     ----------------------------------------------------------- */
  function setupHero() {
    const track = scrollTrackEl();
    const canvas = document.getElementById('hero-canvas');
    const loader = document.getElementById('hero-loader');
    if (!track || !canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    const images = new Array(FRAME_COUNT);
    let currentIndex = 0;     // last successfully drawn frame
    let expectedIndex = 0;    // most recent frame index ScrollTrigger asked for
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const preload = (i) => new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = framePath(i);
      img.onload = () => {
        images[i] = img;
        // If this newly-loaded frame is the one ScrollTrigger most
        // recently asked for (but couldn't draw because the image
        // wasn't ready), draw it now. Without this, the canvas sticks
        // on whatever frame was last successfully drawn until the
        // user scrolls again.
        if (i === expectedIndex && i !== currentIndex) drawFrame(i);
        resolve();
      };
      img.onerror = () => resolve();
    });

    // Show the site as soon as the FIRST frame is decoded — don't make
    // the user wait for all 121 (~386 MB) over the network. The remaining
    // frames stream in the background; drawFrame() is already a no-op for
    // any frame index whose image hasn't arrived yet, so the canvas just
    // holds the last successfully-drawn frame until the next one lands.
    preload(0).then(() => {
      sizeCanvas();
      drawFrame(0);

      if (window.gsap) {
        gsap.to(loader, { opacity: 0, duration: 0.55, ease: 'power2.out', onComplete: () => loader.classList.add('is-hidden') });
        gsap.to(canvas, { opacity: 1, duration: 0.7, ease: 'power2.out' });
      } else {
        loader.classList.add('is-hidden');
        canvas.style.opacity = 1;
      }
      bindScrollSequence();
      bindOverlays();

      // Background-stream the remaining 120 frames. Refresh ScrollTrigger
      // once they're all in so any cached layout that depended on them
      // is up to date (defensive — the deck doesn't actually depend on
      // frame load state).
      const rest = [];
      for (let i = 1; i < FRAME_COUNT; i++) rest.push(preload(i));
      Promise.all(rest).then(() => {
        if (window.ScrollTrigger) ScrollTrigger.refresh();
      });
    });

    function sizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    }

    function drawFrame(i) {
      // Always record what was requested, even if we can't draw it
      // yet — preload's onload checks this to know whether to
      // retroactively redraw once the image arrives.
      expectedIndex = i;
      const img = images[i];
      if (!img) return;
      const W = canvas.width, H = canvas.height;
      ctx.fillStyle = '#2e3a26';
      ctx.fillRect(0, 0, W, H);
      const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      const dx = (W - dw) / 2;
      const dy = (H - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
      currentIndex = i;
    }

    /* Frame sequence runs over the first viewport of body scroll. */
    function bindScrollSequence() {
      if (!window.ScrollTrigger) return;
      const obj = { frame: 0 };
      gsap.to(obj, {
        frame: FRAME_COUNT - 1,
        ease: 'none',
        snap: 'frame',
        scrollTrigger: {
          trigger: track,
          start: 'top top',
          end: () => `top+=${heroPx()}px top`,
          scrub: 0.55,
          invalidateOnRefresh: true,
          onUpdate: () => {
            const idx = Math.max(0, Math.min(FRAME_COUNT - 1, Math.round(obj.frame)));
            if (idx !== currentIndex) drawFrame(idx);
          }
        }
      });
    }

    /* Hero text overlays — four equal slices across the first viewport
       of scroll. The static "Your garden, reimagined." starts visible
       and scales out; the three numbered lines scale in and back out. */
    function bindOverlays() {
      if (!window.ScrollTrigger) return;
      const overlays = document.querySelectorAll('.hero-overlay');

      const config = [
        { isStatic: true, range: [0.00, 0.25] },
        {                 range: [0.25, 0.50] },
        {                 range: [0.50, 0.75] },
        {                 range: [0.75, 1.00] }
      ];

      overlays.forEach((el, i) => {
        const cfg = config[i];
        if (!cfg) return;
        const isStatic = !!cfg.isStatic;
        const [s, e] = cfg.range;

        gsap.set(el, {
          scale: isStatic ? 1 : 0.5,
          opacity: isStatic ? 1 : 0,
          transformOrigin: '50% 50%'
        });

        if (isStatic) {
          gsap.to(el, {
            opacity: 0, scale: 1.7,
            ease: 'power2.in',
            scrollTrigger: {
              trigger: track,
              start: () => `top+=${heroPx() * s}px top`,
              end:   () => `top+=${heroPx() * e}px top`,
              scrub: 0.5
            }
          });
        } else {
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: track,
              start: () => `top+=${heroPx() * s}px top`,
              end:   () => `top+=${heroPx() * e}px top`,
              scrub: 0.5
            }
          });
          tl.to(el, { scale: 1,   opacity: 1, ease: 'power1.out', duration: 0.5 });
          tl.to(el, { scale: 1.7, opacity: 0, ease: 'power1.in',  duration: 0.5 });
        }
      });
    }

    let resizeRAF = null;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(resizeRAF);
      resizeRAF = requestAnimationFrame(() => {
        sizeCanvas();
        drawFrame(currentIndex);
        if (window.ScrollTrigger) ScrollTrigger.refresh();
      });
    });
  }

  /* -----------------------------------------------------------
     Deck — the strip is one rigid element. We translate it upward as
     a single unit. At scroll = heroPx(), strip is at translateY(0)
     and the first card sits exactly one viewport below the visible
     area. Each additional viewport of scroll advances the strip by
     one viewport, bringing the next card into centre while the
     previous card slides off the top. 1:1 with body scroll, linear,
     no easing — a real conveyor.
     ----------------------------------------------------------- */
  function setupDeck() {
    if (!window.gsap || !window.ScrollTrigger) return;
    const track = scrollTrackEl();
    const strip = document.getElementById('deck-strip');
    if (!track || !strip) return;

    gsap.set(strip, { y: 0 });

    gsap.to(strip, {
      y: () => -stripPx(),
      ease: 'none',
      scrollTrigger: {
        trigger: track,
        start: () => `top+=${heroPx()}px top`,
        end:   () => `top+=${heroPx() + stripPx()}px top`,
        scrub: 0.25,
        invalidateOnRefresh: true
      }
    });
  }

  /* -----------------------------------------------------------
     Mouse parallax — backdrop drifts opposite the cursor; deck drifts
     toward the cursor with a subtle 3D tilt. Disabled on touch / reduced motion.
     ----------------------------------------------------------- */
  function setupParallax() {
    if (reduceMotion || isCoarse) return;
    const stageBg = document.getElementById('stage-bg');
    const deck = document.getElementById('deck');
    if (!stageBg || !deck) return;

    let tx = 0, ty = 0, sx = 0, sy = 0;

    window.addEventListener('pointermove', (e) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    let lastSx = 0, lastSy = 0;
    const tick = () => {
      sx += (tx - sx) * 0.06;
      sy += (ty - sy) * 0.06;
      // Skip repaints when motion is sub-pixel.
      if (Math.abs(sx - lastSx) > 0.001 || Math.abs(sy - lastSy) > 0.001) {
        // 2D translate only — no rotation, no preserve-3d perspective.
        // The 3D variants caused cards to render at low effective
        // opacity / clip oddly when they had inline transforms.
        stageBg.style.transform = `translate3d(${sx * -6}px, ${sy * -6}px, 0) scale(1.03)`;
        deck.style.transform    = `translate3d(${sx * 10}px, ${sy * 10}px, 0)`;
        lastSx = sx; lastSy = sy;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* -----------------------------------------------------------
     Nav — hide while hero owns the screen, show once cards take over.
     ----------------------------------------------------------- */
  function setupNav() {
    if (!window.ScrollTrigger) return;
    const nav = document.getElementById('nav');
    const track = scrollTrackEl();
    if (!nav || !track) return;

    // Nav is visible on initial load (logo + hamburger), hides as
    // soon as the user starts scrolling into the hero, then returns
    // once the hero is nearly done so it's available across modals.
    ScrollTrigger.create({
      trigger: track,
      start: () => `top+=30px top`,
      end:   () => `top+=${Math.max(60, heroPx() - 60)}px top`,
      onEnter:     () => nav.classList.add('nav--hidden'),
      onLeave:     () => nav.classList.remove('nav--hidden'),
      onEnterBack: () => nav.classList.add('nav--hidden'),
      onLeaveBack: () => nav.classList.remove('nav--hidden')
    });
  }

  /* -----------------------------------------------------------
     FAQ — close other items when one opens.
     ----------------------------------------------------------- */
  function setupFAQ() {
    const items = document.querySelectorAll('.qa');
    items.forEach((d) => {
      d.addEventListener('toggle', () => {
        if (d.open) items.forEach((other) => { if (other !== d) other.open = false; });
      });
    });
  }

  /* -----------------------------------------------------------
     Lightbox for gallery tiles.
     ----------------------------------------------------------- */
  function setupLightbox() {
    const tiles = document.querySelectorAll('.tile');
    const box = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    const cap = document.getElementById('lightbox-cap');
    const close = document.getElementById('lightbox-close');
    if (!box) return;

    const open = (src, caption) => {
      img.src = src;
      img.alt = caption || '';
      cap.textContent = caption || '';
      box.hidden = false;
      document.body.style.overflow = 'hidden';
      close.focus();
    };
    const shut = () => {
      box.hidden = true;
      img.src = '';
      document.body.style.overflow = '';
    };

    tiles.forEach((t) => {
      t.addEventListener('click', () => open(t.dataset.src, t.dataset.cap));
      t.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(t.dataset.src, t.dataset.cap); }
      });
    });
    close.addEventListener('click', shut);
    box.addEventListener('click', (e) => { if (e.target === box) shut(); });
    document.addEventListener('keydown', (e) => { if (!box.hidden && e.key === 'Escape') shut(); });
  }

  /* -----------------------------------------------------------
     Nav anchor links — scroll body to the matching card's hold range
     instead of jumping to the section's DOM position.
     ----------------------------------------------------------- */
  function setupNavLinks() {
    const toggle = document.getElementById('nav-toggle');

    // Map each card id to its index in the strip — index N means the
    // card is centred when the strip has translated up by (N+1) viewports.
    const indexById = Object.fromEntries(CARD_IDS.map((id, i) => [id, i]));

    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      const href = a.getAttribute('href');
      if (!href || href === '#' || href === '#top') return;

      const id = href.slice(1);
      const idx = indexById[id];
      if (idx === undefined) return; // anchor doesn't match a card

      a.addEventListener('click', (e) => {
        e.preventDefault();
        if (toggle) toggle.checked = false; // close mobile menu if open
        // Use the actual measured position of the card so this works
        // both for desktop (fixed-height cards) and mobile (variable
        // content-sized cards). Centre the card in viewport.
        const cardEl = document.querySelector(`[data-card="${id}"]`);
        if (!cardEl) return;
        const target = heroPx()
          + (window.innerHeight * 0.5)
          + cardEl.offsetTop
          + (cardEl.offsetHeight / 2);
        smoothScrollTo(target);
      });
    });

    // Close mobile menu on any nav link click (covers anchors that
    // didn't match a card too).
    if (toggle) {
      document.querySelectorAll('.nav__links a').forEach((a) => {
        a.addEventListener('click', () => { toggle.checked = false; });
      });
    }
  }

  /* -----------------------------------------------------------
     Back-to-top — visible only after the hero has scrolled past;
     click smooth-scrolls the body back to 0.
     ----------------------------------------------------------- */
  function setupBackToTop() {
    const btn = document.getElementById('back-to-top');
    if (!btn) return;

    btn.addEventListener('click', () => smoothScrollTo(0));

    if (window.ScrollTrigger) {
      ScrollTrigger.create({
        trigger: scrollTrackEl(),
        start: () => `top+=${Math.max(0, heroPx() - 60)}px top`,
        end: 'bottom bottom',
        onEnter:     () => btn.classList.add('is-visible'),
        onEnterBack: () => btn.classList.add('is-visible'),
        onLeaveBack: () => btn.classList.remove('is-visible')
      });
    } else {
      // Fallback: plain scroll listener if GSAP didn't load.
      const onScroll = () => {
        if (window.scrollY > heroPx() - 60) btn.classList.add('is-visible');
        else btn.classList.remove('is-visible');
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  }

  /* Custom smooth-scroll so we can tune duration without touching CSS. */
  function smoothScrollTo(targetY) {
    const startY = window.scrollY;
    const dist = targetY - startY;
    if (Math.abs(dist) < 2) return;
    const duration = Math.min(1200, Math.max(420, Math.abs(dist) * 0.4));
    const startTime = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3); // ease-out cubic

    const step = (now) => {
      const t = Math.min(1, (now - startTime) / duration);
      window.scrollTo(0, startY + dist * ease(t));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
})();
