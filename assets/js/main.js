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
