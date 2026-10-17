/*
  Crunchy Girl Granola — GSAP scroll choreography.
  One entrance per homepage section; every block is guarded so pages
  without that section skip it. Entrance tweens clear their inline
  transforms on complete so nothing is left skewed after the animation runs.
*/
(() => {
  if (!window.gsap || !window.ScrollTrigger) return;
  if (window.Shopify && Shopify.designMode) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.registerPlugin(ScrollTrigger);

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const CLEAR = 'transform,opacity,clipPath';

  const enter = (targets, trigger, vars) => {
    const list = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
    if (!list.length) return;
    gsap.from(list, {
      duration: 1,
      ease: 'power3.out',
      clearProps: CLEAR,
      scrollTrigger: { trigger, start: 'top 82%', once: true },
      ...vars,
    });
  };

  /* ---------------- Hero: load-in + media parallax ---------------- */
  const hero = $('.brand-hero-full');
  if (hero) {
    const loadTargets = [
      '.brand-hero__eyebrow',
      '.brand-hero__heading',
      '.brand-hero__subheading',
      '.brand-hero__actions',
    ]
      .map((s) => $(s, hero))
      .filter(Boolean);
    gsap.from(loadTargets, {
      y: 40,
      opacity: 0,
      duration: 1.1,
      ease: 'power3.out',
      stagger: 0.15,
      delay: 0.15,
      clearProps: CLEAR,
    });

    const ratingCard = $('.brand-hero-full__rating-card', hero);
    if (ratingCard) {
      gsap.from(ratingCard, {
        y: 30,
        opacity: 0,
        rotation: 6,
        duration: 1,
        ease: 'power3.out',
        delay: 0.55,
        clearProps: CLEAR,
      });
    }

    const heroImg = $('.brand-hero-full__media img', hero);
    if (heroImg) {
      gsap.fromTo(
        heroImg,
        { yPercent: -8, scale: 1.2 },
        {
          yPercent: 8,
          scale: 1.2,
          ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
        }
      );
    }
  }

  /* ---------------- Trust badges: cascade in together ---------------- */
  const badgesGrid = $('.brand-badges__grid');
  if (badgesGrid) {
    enter($$('.brand-badge', badgesGrid), badgesGrid, {
      y: 28,
      opacity: 0,
      stagger: 0.08,
    });
  }

  /* ---------------- Difference: intro fades up, feature cards cascade ---------------- */
  const differenceIntro = $('.brand-difference__intro');
  if (differenceIntro) {
    enter($$('.brand-difference__intro > *', differenceIntro), differenceIntro, {
      y: 32,
      opacity: 0,
      stagger: 0.1,
    });
  }
  const differenceGrid = $('.brand-difference__grid');
  if (differenceGrid) {
    enter($$('.brand-feature-card', differenceGrid), differenceGrid, {
      y: 48,
      opacity: 0,
      scale: 0.96,
      stagger: 0.1,
    });
  }

  /* ---------------- Products: header fades up, cards cascade ---------------- */
  const productsHeader = $('.brand-products__header');
  if (productsHeader) {
    enter($$('.brand-products__header > *', productsHeader), productsHeader, {
      y: 32,
      opacity: 0,
      stagger: 0.1,
    });
  }
  const productsGrid = $('.brand-products__grid');
  if (productsGrid) {
    enter($$('.brand-product-card', productsGrid), productsGrid, {
      y: 56,
      opacity: 0,
      scale: 0.96,
      stagger: 0.1,
    });
  }

  /* ---------------- Testimonials: header fades up, cards cascade ---------------- */
  const testimonialsHeader = $('.brand-testimonials__header');
  if (testimonialsHeader) {
    enter($$('.brand-testimonials__header > *', testimonialsHeader), testimonialsHeader, {
      y: 32,
      opacity: 0,
      stagger: 0.1,
    });
  }
  const testimonialsGrid = $('.brand-testimonials__grid');
  if (testimonialsGrid) {
    enter($$('.brand-testimonial-card', testimonialsGrid), testimonialsGrid, {
      y: 48,
      opacity: 0,
      scale: 0.97,
      stagger: 0.1,
    });
  }

  /* ---------------- Newsletter: text rises, form pops ---------------- */
  const newsletter = $('.brand-newsletter');
  if (newsletter) {
    enter($('.brand-newsletter__text', newsletter), newsletter, { y: 36, opacity: 0 });
    enter($('.brand-newsletter__form', newsletter), newsletter, {
      y: 24,
      opacity: 0,
      scale: 0.97,
      delay: 0.2,
    });
  }
})();
