/* Crunchy Girl Granola — site-wide smooth scrolling. */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  if (reduceMotion.matches || !finePointer.matches) return;
  if (window.Shopify && Shopify.designMode) return;

  let current = window.scrollY;
  let target = current;
  let frame = 0;

  const limit = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const clamp = (value) => Math.max(0, Math.min(value, limit()));

  const canScroll = (element, delta) => {
    for (let node = element; node && node !== document.body; node = node.parentElement) {
      const style = window.getComputedStyle(node);
      const scrollable = /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight;
      if (!scrollable) continue;
      if (delta < 0 && node.scrollTop > 0) return true;
      if (delta > 0 && node.scrollTop + node.clientHeight < node.scrollHeight - 1) return true;
    }
    return false;
  };

  const render = () => {
    current += (target - current) * 0.105;

    if (Math.abs(target - current) < 0.35) {
      current = target;
      frame = 0;
    } else {
      frame = requestAnimationFrame(render);
    }

    window.scrollTo(0, current);
    if (window.ScrollTrigger) ScrollTrigger.update();
  };

  const start = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };

  window.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey || event.defaultPrevented || canScroll(event.target, event.deltaY)) return;

      event.preventDefault();
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      target = clamp(target + event.deltaY * scale);
      start();
    },
    { passive: false }
  );

  window.addEventListener(
    'scroll',
    () => {
      if (frame) return;
      current = window.scrollY;
      target = current;
    },
    { passive: true }
  );

  window.addEventListener('resize', () => {
    target = clamp(target);
    current = clamp(current);
  });

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href*="#"]');
    if (!link || link.target === '_blank' || link.origin !== window.location.origin || link.pathname !== window.location.pathname) return;

    const hash = link.hash;
    if (!hash || hash === '#') return;

    let destination;
    try {
      destination = document.querySelector(hash);
    } catch (_error) {
      return;
    }
    if (!destination) return;

    event.preventDefault();
    target = clamp(window.scrollY + destination.getBoundingClientRect().top);
    history.pushState(null, '', hash);
    start();
  });
})();
