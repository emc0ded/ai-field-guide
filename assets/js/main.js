/* =========================================================
   AI FIELD GUIDE — scroll reveals with GSAP + ScrollTrigger
   Respects prefers-reduced-motion. Falls back gracefully.
   ========================================================= */

(function () {
  'use strict';

  // flag html so CSS can show content if JS never runs / is blocked
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('has-js');

  const prefersReduced =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // wait for GSAP (loaded via CDN <script> before this file)
  const ready = () => {
    if (typeof window.gsap === 'undefined' ||
        typeof window.ScrollTrigger === 'undefined') {
      // no GSAP — just un-hide everything
      document.querySelectorAll('.reveal, .reveal-word, .reveal-char')
        .forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
      document.querySelectorAll('.reveal-rule')
        .forEach(el => { el.style.transform = 'none'; });
      return;
    }

    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);

    if (prefersReduced) {
      gsap.set('.reveal, .reveal-word, .reveal-char', { opacity: 1, y: 0 });
      gsap.set('.reveal-rule', { scaleX: 1 });
      return;
    }

    // 1. Split hero title into words for staggered entrance
    document.querySelectorAll('[data-split="words"]').forEach(el => {
      const text = el.textContent;
      el.textContent = '';
      text.split(/(\s+)/).forEach(chunk => {
        if (/^\s+$/.test(chunk)) {
          el.appendChild(document.createTextNode(chunk));
        } else if (chunk) {
          const span = document.createElement('span');
          span.className = 'reveal-word';
          span.textContent = chunk;
          el.appendChild(span);
        }
      });
    });

    // 2. On-load hero animation
    const heroTitle = document.querySelector('.hero__title');
    if (heroTitle) {
      gsap.to(heroTitle.querySelectorAll('.reveal-word'), {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.06,
        delay: 0.15,
      });
    }

    // 3. On-load hero supporting content
    gsap.utils.toArray('.hero .reveal').forEach((el, i) => {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power2.out',
        delay: 0.6 + i * 0.1,
      });
    });

    // 4. Signature rule draws in
    document.querySelectorAll('.hero .reveal-rule, .sig__rule').forEach(el => {
      gsap.fromTo(el,
        { scaleX: 0, transformOrigin: 'left center' },
        {
          scaleX: 1,
          duration: 0.9,
          ease: 'power3.out',
          delay: 0.3,
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
            once: true,
          },
        }
      );
    });

    // 5. Scroll reveal on everything else
    gsap.utils.toArray('.reveal:not(.hero .reveal)').forEach(el => {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.85,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          once: true,
        },
      });
    });

    // 6. Signature header: subtle parallax on model pages
    const sigName = document.querySelector('.sig__name');
    if (sigName) {
      gsap.from(sigName, {
        y: 40,
        opacity: 0,
        duration: 1.2,
        ease: 'power3.out',
      });
      gsap.from('.sig__label', {
        y: 12,
        opacity: 0,
        duration: 0.7,
        ease: 'power2.out',
        delay: 0.1,
      });
      gsap.from('.sig__meta', {
        opacity: 0,
        duration: 0.7,
        ease: 'power2.out',
        delay: 0.5,
      });
    }

    // 7. Prompt block headline reveal (staggered)
    gsap.utils.toArray('.prompt').forEach(block => {
      const number = block.querySelector('.prompt__number');
      const title = block.querySelector('.prompt__title');
      const question = block.querySelector('.prompt__question');

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: block,
          start: 'top 80%',
          once: true,
        },
      });
      if (number) tl.from(number, { opacity: 0, y: 10, duration: 0.45, ease: 'power2.out' });
      if (title) tl.from(title, { opacity: 0, y: 24, duration: 0.7, ease: 'power3.out' }, '-=0.1');
      if (question) tl.from(question, { opacity: 0, y: 18, duration: 0.6, ease: 'power2.out' }, '-=0.3');
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready);
  } else {
    ready();
  }
})();


/* =========================================================
   PAGE TRANSITION — model card click grows the logo to
   fill the viewport, then shrinks back on the new page.
   Respects prefers-reduced-motion. Uses sessionStorage to
   pass intent across the navigation.
   ========================================================= */
(function () {
  'use strict';

  const prefersReduced =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const STORAGE_KEY = 'aifg_incoming_model';
  const PARCHMENT = '#F5F2EB';

  const MODEL_PAGES = {
    'chatgpt.html':    'assets/images/logo-chatgpt.png',
    'claude.html':     'assets/images/logo-claude.png',
    'gemini.html':     'assets/images/logo-gemini.png',
    'grok.html':       'assets/images/logo-grok.png',
    'llama.html':      'assets/images/logo-llama.png',
    'perplexity.html': 'assets/images/logo-perplexity.png',
  };

  function getFile(href) {
    if (!href) return '';
    try {
      const u = new URL(href, window.location.href);
      return u.pathname.split('/').pop();
    } catch (e) { return ''; }
  }

  /* ---------- INCOMING: fly the logo down to its spot in the sig header ---------- */
  (function runIncoming() {
    let incoming = null;
    try { incoming = sessionStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (!incoming) return;
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
    if (prefersReduced) return;

    const here = window.location.pathname.split('/').pop() || 'index.html';
    if (here !== incoming) return;

    const logoSrc = MODEL_PAGES[incoming];
    if (!logoSrc) return;

    // Where should the logo land? On the signature-header mark, if it exists.
    const sigMark = document.querySelector('.sig__mark img');

    // Start large and centered; if there's nothing to land on, shrink in place.
    const startSize = Math.min(window.innerWidth, window.innerHeight) * 0.7;
    const startTop  = (window.innerHeight - startSize) / 2;
    const startLeft = (window.innerWidth  - startSize) / 2;

    const overlay = document.createElement('div');
    overlay.className = 'aifg-page-transition';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      pointer-events: none; background: ${PARCHMENT};
      will-change: opacity;
    `;

    const img = document.createElement('img');
    img.src = logoSrc;
    img.alt = '';
    img.style.cssText = `
      position: absolute;
      top: ${startTop}px; left: ${startLeft}px;
      width: ${startSize}px; height: ${startSize}px;
      object-fit: contain;
      transform-origin: 50% 50%;
      will-change: top, left, width, height, transform;
    `;

    overlay.appendChild(img);
    document.body.appendChild(overlay);

    const playLanding = () => {
      // re-measure inside the next frame in case fonts/layout settled
      const targetRect = sigMark ? sigMark.getBoundingClientRect() : null;

      if (window.gsap) {
        const tl = window.gsap.timeline();
        if (targetRect && targetRect.width > 0 && targetRect.height > 0) {
          // Step 1: rotate to upright while staying large and centered
          tl.fromTo(img,
            { rotation: -270 },
            {
              rotation: 0,
              duration: 0.6,
              ease: 'power3.out',
            }
          )
          // Brief pause so the icon is visibly upright before shrinking
          // Step 2: shrink and fly into the sig mark position (starts 0.18s after rotation ends)
          .to(img, {
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            duration: 0.75,
            ease: 'power3.inOut',
          }, '+=0.18')
          // fade the parchment in parallel so the page settles under the landing logo
          .to(overlay, { opacity: 0, duration: 0.55, ease: 'power2.in' }, '-=0.55')
          .add(() => overlay.remove());
        } else {
          // fallback: shrink + fade in place
          tl.to(img, { scale: 0.25, rotation: 270, duration: 0.85, ease: 'power3.inOut' })
            .to(overlay, { opacity: 0, duration: 0.5, ease: 'power2.in' }, '-=0.5')
            .add(() => overlay.remove());
        }
      } else if (targetRect) {
        // Step 1: rotate to upright (decelerate into 0deg)
        img.style.transition = 'transform 0.6s cubic-bezier(.22,.61,.36,1)';
        img.style.transform = 'rotate(-270deg)';
        requestAnimationFrame(() => { img.style.transform = 'rotate(0deg)'; });
        // Step 2: after rotation completes + brief pause, shrink into position
        setTimeout(() => {
          img.style.transition =
            'top 0.75s cubic-bezier(.65,.05,.36,1), ' +
            'left 0.75s cubic-bezier(.65,.05,.36,1), ' +
            'width 0.75s cubic-bezier(.65,.05,.36,1), ' +
            'height 0.75s cubic-bezier(.65,.05,.36,1)';
          overlay.style.transition = 'opacity 0.55s ease 0.2s';
          img.style.top = `${targetRect.top}px`;
          img.style.left = `${targetRect.left}px`;
          img.style.width = `${targetRect.width}px`;
          img.style.height = `${targetRect.height}px`;
          overlay.style.opacity = '0';
        }, 780);
        setTimeout(() => overlay.remove(), 1650);
      } else {
        img.style.transition = 'transform 0.85s cubic-bezier(.65,.05,.36,1)';
        overlay.style.transition = 'opacity 0.5s ease 0.35s';
        requestAnimationFrame(() => {
          img.style.transform = 'scale(0.25) rotate(270deg)';
          overlay.style.opacity = '0';
        });
        setTimeout(() => overlay.remove(), 1000);
      }
    };
    // wait one frame so layout is settled before measuring sig__mark
    requestAnimationFrame(() => requestAnimationFrame(playLanding));
  })();

  /* ---------- OUTGOING: card click → grow logo → navigate ---------- */
  if (!prefersReduced) {
    document.addEventListener('click', function (e) {
      const link = e.target.closest('a');
      if (!link) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      const tgt = link.getAttribute('target');
      if (tgt && tgt !== '_self') return;

      const file = getFile(link.getAttribute('href'));
      const logoSrc = MODEL_PAGES[file];
      if (!logoSrc) return;

      // only intercept when the click is inside a card link
      const card = link.classList.contains('card')
        ? link
        : link.closest('.card');
      if (!card) return;

      e.preventDefault();

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const targetSize = Math.min(vw, vh) * 0.7;
      const targetTop  = (vh - targetSize) / 2;
      const targetLeft = (vw - targetSize) / 2;

      const startEl =
        link.querySelector('.card__mark img') ||
        link.querySelector('.card__mark') ||
        card;
      const r = startEl.getBoundingClientRect();

      const overlay = document.createElement('div');
      overlay.className = 'aifg-page-transition';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 9999;
        pointer-events: none; background: ${PARCHMENT};
        opacity: 0; will-change: opacity;
      `;

      const img = document.createElement('img');
      img.src = logoSrc;
      img.alt = '';
      img.style.cssText = `
        position: absolute;
        top: ${r.top}px; left: ${r.left}px;
        width: ${r.width}px; height: ${r.height}px;
        object-fit: contain;
        transform-origin: 50% 50%;
        will-change: top, left, width, height, transform;
      `;

      overlay.appendChild(img);
      document.body.appendChild(overlay);

      try { sessionStorage.setItem(STORAGE_KEY, file); } catch (err) {}

      const navigate = () => { window.location.href = link.href; };

      if (window.gsap) {
        const tl = window.gsap.timeline();
        tl.to(overlay, { opacity: 1, duration: 0.3, ease: 'power2.out' })
          .to(img, {
            top: targetTop,
            left: targetLeft,
            width: targetSize,
            height: targetSize,
            rotation: 270,
            duration: 0.75,
            ease: 'power3.inOut',
          }, '-=0.18')
          .add(navigate);
      } else {
        overlay.style.transition = 'opacity 0.3s ease';
        img.style.transition =
          'top 0.75s cubic-bezier(.65,.05,.36,1), ' +
          'left 0.75s cubic-bezier(.65,.05,.36,1), ' +
          'width 0.75s cubic-bezier(.65,.05,.36,1), ' +
          'height 0.75s cubic-bezier(.65,.05,.36,1), ' +
          'transform 0.75s cubic-bezier(.65,.05,.36,1)';
        requestAnimationFrame(() => {
          overlay.style.opacity = '1';
          img.style.top = `${targetTop}px`;
          img.style.left = `${targetLeft}px`;
          img.style.width = `${targetSize}px`;
          img.style.height = `${targetSize}px`;
          img.style.transform = 'rotate(270deg)';
        });
        setTimeout(navigate, 850);
      }
    });
  }

  /* ---------- PAGE TURN TRANSITION — all non-logo links ---------- */
  // Uses clip-path: a polygon that starts as a point at the bottom-right
  // corner and sweeps diagonally across the viewport, then retreats on arrival.
  const PAGE_TURN_KEY = 'aifg_page_turn';
  const PT_CLOSED = 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)';
  const PT_OPEN   = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';

  // INCOMING: parchment covers the screen; peel it back toward bottom-right
  (function runPageTurnIn() {
    let hasTurn = false;
    try { hasTurn = sessionStorage.getItem(PAGE_TURN_KEY); } catch (e) {}
    if (!hasTurn) return;
    try { sessionStorage.removeItem(PAGE_TURN_KEY); } catch (e) {}
    if (prefersReduced) return;

    const overlay = document.createElement('div');
    overlay.className = 'aifg-page-transition';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      pointer-events: none; background: ${PARCHMENT};
      clip-path: ${PT_OPEN}; will-change: clip-path;
    `;
    document.body.appendChild(overlay);

    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (window.gsap) {
        gsap.to(overlay, {
          clipPath: PT_CLOSED,
          duration: 0.6,
          ease: 'power2.inOut',
          onComplete: () => overlay.remove(),
        });
      } else {
        overlay.style.transition = 'clip-path 0.6s cubic-bezier(.65,.05,.36,1)';
        requestAnimationFrame(() => { overlay.style.clipPath = PT_CLOSED; });
        setTimeout(() => overlay.remove(), 650);
      }
    }));
  })();

  // OUTGOING: grow a parchment overlay from bottom-right across the screen
  if (!prefersReduced) {
    document.addEventListener('click', function (e) {
      const link = e.target.closest('a');
      if (!link) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      const tgt = link.getAttribute('target');
      if (tgt && tgt !== '_self') return;
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:')) return;
      // skip external links
      try { if (new URL(href).origin !== window.location.origin) return; } catch (e) {}

      const file = getFile(href);
      // skip if this is a model-card link (logo transition handles those)
      const isModelCard = MODEL_PAGES[file] &&
        (link.classList.contains('card') || !!link.closest('.card'));
      if (isModelCard) return;

      e.preventDefault();
      try { sessionStorage.setItem(PAGE_TURN_KEY, '1'); } catch (err) {}

      const overlay = document.createElement('div');
      overlay.className = 'aifg-page-transition';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 9999;
        pointer-events: none; background: ${PARCHMENT};
        clip-path: ${PT_CLOSED}; will-change: clip-path;
      `;
      document.body.appendChild(overlay);

      const navigate = () => { window.location.href = href; };

      if (window.gsap) {
        gsap.to(overlay, {
          clipPath: PT_OPEN,
          duration: 0.55,
          ease: 'power2.inOut',
          onComplete: navigate,
        });
      } else {
        overlay.style.transition = 'clip-path 0.55s cubic-bezier(.65,.05,.36,1)';
        requestAnimationFrame(() => { overlay.style.clipPath = PT_OPEN; });
        setTimeout(navigate, 580);
      }
    });
  }

  /* ---------- CLEANUP: kill leftover overlays on bfcache restore ---------- */
  // When the user hits the back button, the browser may restore this page
  // from the back-forward cache with our outgoing-transition overlay still
  // attached to the DOM. Strip the overlay on pagehide (before the snapshot
  // is stored) and again on pageshow (as a backup). Do NOT touch the storage
  // flag here — that flag was just set to tell the next page to play its
  // entrance animation, and clearing it would cancel that.
  function clearTransitionOverlays() {
    document.querySelectorAll('.aifg-page-transition').forEach(el => el.remove());
  }
  window.addEventListener('pagehide', clearTransitionOverlays);
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) clearTransitionOverlays();
  });
})();
