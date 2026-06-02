/* =====================================================
   NEW RIYADH MEDIA — animations & interactions
   ===================================================== */

(() => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  /* ---------- Smooth scroll (Lenis) ---------- */
  let lenis = null;
  if (window.Lenis && !prefersReduced) {
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
    });
    const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);

    if (window.gsap && window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
  }

  /* ---------- Anchor click handling ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(target, { offset: -10, duration: 1.2 });
      } else {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ---------- Custom cursor ---------- */
  const cursor = document.querySelector('.cursor');
  const dot = document.querySelector('.cursor__dot');
  const ring = document.querySelector('.cursor__ring');

  if (cursor && !isCoarse) {
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let dx = mx, dy = my, rx = mx, ry = my;

    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
    });

    const tick = () => {
      dx += (mx - dx) * 0.55;
      dy += (my - dy) * 0.55;
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      if (dot)  dot.style.transform  = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%)`;
      if (ring) ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    document.addEventListener('mouseenter', () => cursor.style.opacity = '1');
    document.addEventListener('mouseleave', () => cursor.style.opacity = '0');

    const hoverables = document.querySelectorAll('[data-hover], a, button, .service, .case');
    hoverables.forEach((el) => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
    });
  } else if (cursor) {
    cursor.style.display = 'none';
  }

  /* ---------- Loader ---------- */
  const loader = document.querySelector('.loader');
  const counter = document.querySelector('.loader__num');
  const bar = document.querySelector('.loader__bar span');
  const letters = document.querySelectorAll('.loader__letter');
  const nav = document.querySelector('.nav');

  const startSiteAnimations = () => {
    if (nav) nav.classList.add('is-ready');
    runHeroIntro();
    setupScrollReveals();
    setupCounters();
    setupNavScrollState();
    setupHeroVideo();
  };

  if (prefersReduced) {
    if (loader) loader.classList.add('is-done');
    startSiteAnimations();
  } else if (loader && window.gsap) {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.to(letters, {
      yPercent: -100,
      opacity: 1,
      stagger: 0.08,
      duration: 0.9,
      ease: 'expo.out',
    }, 0);

    const progress = { v: 0 };
    tl.to(progress, {
      v: 100,
      duration: 1.6,
      ease: 'power2.inOut',
      onUpdate: () => {
        const val = Math.round(progress.v);
        if (counter) counter.textContent = val;
        if (bar) bar.style.width = val + '%';
      },
    }, 0.1);

    tl.to('.loader__inner', { opacity: 0, y: -10, duration: 0.6, ease: 'power2.in' }, '+=0.15');
    tl.add(() => loader.classList.add('is-done'));
    tl.add(startSiteAnimations, '-=0.2');
  } else {
    if (loader) loader.classList.add('is-done');
    startSiteAnimations();
  }

  /* ---------- Hero intro reveal ---------- */
  function runHeroIntro() {
    if (!window.gsap) return;
    const heroWords = document.querySelectorAll('.hero .word');
    gsap.to(heroWords, {
      yPercent: -100,
      opacity: 1,
      duration: 1.1,
      ease: 'expo.out',
      stagger: 0.05,
      delay: 0.05,
    });

    gsap.fromTo('.hero__meta',
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: 'power2.out', delay: 0.1 }
    );
    gsap.fromTo('.hero__sub p, .hero__sub .btn-ghost',
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: 'power2.out', stagger: 0.08, delay: 0.7 }
    );
    gsap.fromTo('.hero__corners span',
      { y: 12, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, ease: 'power2.out', stagger: 0.08, delay: 1 }
    );
  }

  /* ---------- Scroll reveals (words, fades, etc) ---------- */
  function setupScrollReveals() {
    if (!window.gsap || !window.ScrollTrigger) {
      // fallback — show everything
      document.querySelectorAll('.word, .reveal-fade, .reveal-up').forEach(el => {
        el.classList.add('is-in');
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // Word-by-word reveals (skip hero, already handled)
    document.querySelectorAll('section:not(.hero) .line').forEach((line) => {
      const words = line.querySelectorAll('.word');
      if (!words.length) return;
      gsap.to(words, {
        yPercent: -100,
        opacity: 1,
        duration: 1.05,
        ease: 'expo.out',
        stagger: 0.06,
        scrollTrigger: {
          trigger: line,
          start: 'top 88%',
          once: true,
        },
      });
    });

    // Fade-in elements
    document.querySelectorAll('.reveal-fade').forEach((el) => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 90%',
        once: true,
        onEnter: () => el.classList.add('is-in'),
      });
    });

    // Slide-up elements (with subtle stagger when grouped)
    const groups = new Map();
    document.querySelectorAll('.reveal-up').forEach((el) => {
      const parent = el.parentElement;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push(el);
    });
    groups.forEach((els, parent) => {
      ScrollTrigger.create({
        trigger: parent,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          els.forEach((el, i) => {
            setTimeout(() => el.classList.add('is-in'), i * 90);
          });
        },
      });
    });

    // Parallax on case media
    document.querySelectorAll('.case__media').forEach((media) => {
      const inner = media.querySelector('.case__img');
      if (!inner) return;
      gsap.fromTo(inner,
        { yPercent: -6 },
        {
          yPercent: 6,
          ease: 'none',
          scrollTrigger: {
            trigger: media,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        }
      );
    });

    // Footer big text — slight horizontal drift
    const footerSpans = document.querySelectorAll('.footer__big span');
    if (footerSpans.length) {
      gsap.fromTo(footerSpans,
        { xPercent: (i) => (i === 0 ? -8 : i === 2 ? 8 : 0), opacity: 0.4 },
        {
          xPercent: 0,
          opacity: 1,
          ease: 'none',
          stagger: 0.05,
          scrollTrigger: {
            trigger: '.footer',
            start: 'top 90%',
            end: 'bottom bottom',
            scrub: 1,
          },
        }
      );
    }

    // Contact title fade-up
    ScrollTrigger.refresh();
  }

  /* ---------- Counters ---------- */
  function setupCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    counters.forEach((el) => {
      const end = parseInt(el.getAttribute('data-count'), 10) || 0;

      const animate = () => {
        if (window.gsap) {
          const obj = { v: 0 };
          gsap.to(obj, {
            v: end,
            duration: 2,
            ease: 'power3.out',
            onUpdate: () => { el.textContent = Math.round(obj.v); },
          });
        } else {
          // fallback
          let cur = 0;
          const step = Math.max(1, Math.floor(end / 40));
          const id = setInterval(() => {
            cur += step;
            if (cur >= end) { cur = end; clearInterval(id); }
            el.textContent = cur;
          }, 40);
        }
      };

      if (window.ScrollTrigger) {
        ScrollTrigger.create({
          trigger: el,
          start: 'top 85%',
          once: true,
          onEnter: animate,
        });
      } else {
        animate();
      }
    });
  }

  /* ---------- Hero background video ---------- */
  function setupHeroVideo() {
    const video = document.querySelector('.hero__video');
    const hero  = document.querySelector('.hero');

    // Scroll-driven bottom fade — invisible at top of page, fades in as you scroll
    if (hero) {
      let ticking = false;
      const updateFade = () => {
        const fade = Math.min(window.scrollY / 220, 1);
        hero.style.setProperty('--hero-fade', fade.toFixed(3));
        ticking = false;
      };
      const onScroll = () => {
        if (!ticking) {
          window.requestAnimationFrame(updateFade);
          ticking = true;
        }
      };
      updateFade();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    if (!video) return;

    // Pause when hero is offscreen, resume when it returns
    if (hero && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) video.play().catch(() => {});
          else video.pause();
        });
      }, { threshold: 0.05 });
      io.observe(hero);
    }

    // If the source can't load (file missing, format unsupported), remove the video
    // so the cream hero shows through cleanly.
    const handleError = () => {
      video.remove();
      const wash = document.querySelector('.hero__wash');
      if (wash) wash.remove();
    };
    video.addEventListener('error', handleError);
    video.querySelectorAll('source').forEach((s) => s.addEventListener('error', () => {
      // Only bail when all sources have failed
      const sources = Array.from(video.querySelectorAll('source'));
      if (sources.every((src) => src.dataset.failed === '1' || src === s)) {
        s.dataset.failed = '1';
        if (sources.every((src) => src.dataset.failed === '1')) handleError();
      } else {
        s.dataset.failed = '1';
      }
    }));

    // Try to start; some browsers block autoplay until user interaction
    const tryPlay = () => video.play().catch(() => {});
    tryPlay();
    document.addEventListener('click', tryPlay, { once: true, passive: true });
    document.addEventListener('touchstart', tryPlay, { once: true, passive: true });
  }

  /* ---------- Nav scrolled state ---------- */
  function setupNavScrollState() {
    if (!nav) return;
    // Hysteresis: reveal a little after scrolling, hide again only when fully back at the top.
    const SHOW_AT = 90;
    const HIDE_AT = 20;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > SHOW_AT) nav.classList.add('is-scrolled');
      else if (y < HIDE_AT) nav.classList.remove('is-scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Service panels ---------- */
  const backdrop = document.querySelector('.spanel-backdrop');
  const panels   = document.querySelectorAll('.spanel');
  let activePanel = null;

  // Stamp each panel's giant numeral with its Arabic-Indic counterpart
  const arabicDigits = { '0':'٠','1':'١','2':'٢','3':'٣','4':'٤','5':'٥','6':'٦','7':'٧','8':'٨','9':'٩' };
  document.querySelectorAll('.spanel__bignum').forEach((el) => {
    const ar = el.textContent.trim().split('').map(c => arabicDigits[c] || c).join('');
    el.dataset.ar = ar;
  });

  const openPanel = (id) => {
    const panel = document.getElementById('spanel-' + id);
    if (!panel) return;

    // close any open panel first
    if (activePanel && activePanel !== panel) closePanel(false);

    activePanel = panel;
    panel.hidden = false;
    panel.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        panel.classList.add('is-open');
        backdrop.classList.add('is-open');
      });
    });

    // trap focus
    panel.querySelector('.spanel__close')?.focus();
  };

  const closePanel = (restoreFocus = true) => {
    if (!activePanel) return;
    const panel = activePanel;
    panel.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    document.body.style.overflow = '';

    const onEnd = () => {
      panel.hidden = true;
      panel.removeEventListener('transitionend', onEnd);
    };
    panel.addEventListener('transitionend', onEnd);
    activePanel = null;
  };

  // Open on service row click / enter
  document.querySelectorAll('.service[data-service]').forEach((row) => {
    const id = row.dataset.service;
    const trigger = () => openPanel(id);
    row.addEventListener('click', trigger);
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trigger(); }
    });
  });

  // Close buttons
  document.querySelectorAll('.spanel__close').forEach((btn) => {
    btn.addEventListener('click', () => closePanel());
  });

  // Close on backdrop click or Escape
  backdrop?.addEventListener('click', () => closePanel());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activePanel) closePanel();
  });

  // Close panel CTA links — let them navigate then close
  document.querySelectorAll('.spanel__cta').forEach((a) => {
    a.addEventListener('click', () => setTimeout(() => closePanel(), 120));
  });

  /* ---------- Contact form ---------- */
  const cform = document.getElementById('contact-form');
  if (cform) {
    cform.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!cform.checkValidity()) {
        cform.reportValidity();
        return;
      }

      const data = new FormData(cform);
      const name    = (data.get('name')    || '').toString().trim();
      const email   = (data.get('email')   || '').toString().trim();
      const company = (data.get('company') || '').toString().trim();
      const service = (data.get('service') || '').toString().trim();
      const message = (data.get('message') || '').toString().trim();

      const subject = encodeURIComponent(`New project enquiry from ${name}`);
      const bodyLines = [
        `Name: ${name}`,
        `Email: ${email}`,
        company ? `Company: ${company}` : null,
        `Service: ${service}`,
        '',
        'Brief:',
        message,
      ].filter(Boolean);
      const body = encodeURIComponent(bodyLines.join('\n'));

      window.location.href = `mailto:hello@newriyadhmedia.com?subject=${subject}&body=${body}`;

      if (window.gsap) {
        gsap.to(cform, {
          opacity: 0,
          y: -8,
          duration: 0.35,
          ease: 'power2.in',
          onComplete: () => {
            cform.classList.add('is-sent');
            gsap.to(cform, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
          },
        });
      } else {
        cform.classList.add('is-sent');
      }
    });
  }

})();
