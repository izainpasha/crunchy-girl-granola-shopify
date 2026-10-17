/* Mobile-only behavior for the brand product page (brand-product.liquid):
   gallery pagination dots, the "Read more" description toggle, the
   collapsible "Customize Your Granola" mix-ins, and the sticky Buy Now bar.
   Desktop layout is untouched: every element driven here is hidden (or
   always expanded) at 750px and up via brand-product-page.css. */
(function () {
  const mobileQuery = window.matchMedia('(max-width: 749px)');

  function initGalleryDots(root) {
    const dots = root.querySelector('[data-gallery-dots]');
    if (!dots || dots.dataset.ready) return;
    const list = document.getElementById(dots.dataset.galleryList);
    if (!list) return;
    dots.dataset.ready = 'true';

    const slides = () =>
      Array.from(list.querySelectorAll('.product__media-item')).filter((slide) => slide.offsetParent !== null);

    let buttons = [];
    function render() {
      const count = slides().length;
      dots.innerHTML = '';
      buttons = [];
      dots.hidden = count < 2;
      for (let i = 0; i < count; i += 1) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'brand-product__gallery-dot';
        button.setAttribute('aria-label', `Show image ${i + 1} of ${count}`);
        button.addEventListener('click', () => {
          list.scrollTo({ left: i * list.clientWidth, behavior: 'smooth' });
        });
        dots.appendChild(button);
        buttons.push(button);
      }
      update();
    }

    function update() {
      if (!buttons.length) return;
      const index = Math.min(buttons.length - 1, Math.max(0, Math.round(list.scrollLeft / list.clientWidth)));
      buttons.forEach((button, i) => {
        const active = i === index;
        button.classList.toggle('is-active', active);
        if (active) {
          button.setAttribute('aria-current', 'true');
        } else {
          button.removeAttribute('aria-current');
        }
      });
    }

    let frame;
    list.addEventListener(
      'scroll',
      () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(update);
      },
      { passive: true }
    );
    mobileQuery.addEventListener('change', render);
    render();
  }

  function initLead(root) {
    const wrap = root.querySelector('[data-brand-lead]');
    if (!wrap || wrap.dataset.ready) return;
    wrap.dataset.ready = 'true';
    const lead = wrap.querySelector('.brand-product__lead');
    const toggle = wrap.querySelector('[data-brand-lead-toggle]');

    function measure() {
      if (wrap.classList.contains('is-expanded')) return;
      const clamped = mobileQuery.matches && lead.scrollHeight > lead.clientHeight + 2;
      wrap.classList.toggle('is-clamped', clamped);
      toggle.hidden = !clamped;
    }

    toggle.addEventListener('click', () => {
      const expanded = wrap.classList.toggle('is-expanded');
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.textContent = expanded ? 'Read less' : 'Read more';
    });
    mobileQuery.addEventListener('change', measure);
    window.addEventListener('load', measure);
    measure();
  }

  function initMixIns(root) {
    const fieldset = root.querySelector('[data-brand-mix-ins]');
    if (!fieldset || fieldset.dataset.ready) return;
    fieldset.dataset.ready = 'true';
    const toggle = fieldset.querySelector('[data-mix-ins-toggle]');
    const count = fieldset.querySelector('[data-mix-ins-count]');
    const helper = fieldset.querySelector('[data-mix-ins-helper]');

    toggle?.addEventListener('click', () => {
      const open = fieldset.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    function updateCount() {
      const selected = fieldset.querySelectorAll('[data-mix-in-input]:checked').length;
      if (!count) return;
      count.hidden = selected === 0;
      count.textContent = selected ? `${selected} added` : '';
      if (helper) helper.hidden = selected > 0;
    }
    fieldset.addEventListener('change', updateCount);
    updateCount();
  }

  function initStickyBuy(root) {
    const bar = root.querySelector('[data-brand-sticky-buy]');
    if (!bar || bar.dataset.ready) return;
    bar.dataset.ready = 'true';
    const sectionId = bar.dataset.sectionId;
    const mainButtons = root.querySelector('.product-form__buttons');
    const footer = document.querySelector('.footer');

    let buttonsVisible = true;
    let footerVisible = false;
    function setVisible() {
      const show = mobileQuery.matches && !buttonsVisible && !footerVisible;
      bar.classList.toggle('is-visible', show);
      bar.toggleAttribute('inert', !show);
      bar.setAttribute('aria-hidden', String(!show));
    }

    if ('IntersectionObserver' in window) {
      if (mainButtons) {
        new IntersectionObserver(([entry]) => {
          buttonsVisible = entry.isIntersecting;
          setVisible();
        }).observe(mainButtons);
      }
      if (footer) {
        new IntersectionObserver(([entry]) => {
          footerVisible = entry.isIntersecting;
          setVisible();
        }).observe(footer);
      }
    }
    mobileQuery.addEventListener('change', setVisible);

    // Size changes re-render the section server-side; copy the sticky bar's
    // freshly rendered size + price so it always matches the selection.
    if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
      subscribe(PUB_SUB_EVENTS.variantChange, (event) => {
        if (!event?.data || event.data.sectionId !== sectionId || !event.data.html) return;
        const source = event.data.html.getElementById(`BrandStickyBuyInfo-${sectionId}`);
        const destination = document.getElementById(`BrandStickyBuyInfo-${sectionId}`);
        if (source && destination) destination.innerHTML = source.innerHTML;
      });
    }
  }

  function init(scope) {
    scope.querySelectorAll('product-info.brand-product-page').forEach((root) => {
      initGalleryDots(root);
      initLead(root);
      initMixIns(root);
      initStickyBuy(root);
    });
  }

  init(document);
  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();
