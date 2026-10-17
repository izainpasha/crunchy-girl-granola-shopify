if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector('form');
        this.variantIdInput.disabled = false;
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.submitButton = this.querySelector('[type="submit"]');
        this.submitButtonText = this.submitButton.querySelector('span');

        if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');

        this.hideErrors = this.dataset.hideErrors === 'true';

        // Returning from checkout via the back button restores this page from
        // the bfcache with the Buy Now button still in its loading state.
        window.addEventListener('pageshow', (event) => {
          if (!event.persisted) return;
          this.redirectingToCheckout = false;
          this.buyNowButtons.forEach((button) => this.setButtonLoading(button, false));
        });
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        // Buy Now buttons (in-form and the sticky mobile bar, linked via the
        // `form` attribute) submit this same form, so size, mix-ins and the
        // Seal selling plan are added exactly as Add to Cart would add them.
        const buyNowButton = evt.submitter?.hasAttribute('data-brand-buy-now') ? evt.submitter : null;
        const activeButton = buyNowButton || this.submitButton;
        if (activeButton.getAttribute('aria-disabled') === 'true' || this.redirectingToCheckout) return;

        this.handleErrorMessage();

        this.setButtonLoading(activeButton, true);

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(this.form);
        const productInfo = this.closest('product-info');
        const mixInFieldset = productInfo?.querySelector('[data-brand-mix-ins]');
        const selectedMixIns = mixInFieldset
          ? Array.from(mixInFieldset.querySelectorAll('[data-mix-in-input]:checked'))
          : [];
        const sellingPlanId = formData.get('selling_plan');
        const lineProperties = {};
        for (const [key, value] of formData.entries()) {
          const match = key.match(/^properties\[(.*)\]$/);
          if (match && value !== '') lineProperties[match[1]] = value;
        }
        const mainItem = {
          id: Number(formData.get('id')),
          quantity: parseInt(formData.get('quantity')) || 1,
        };
        if (sellingPlanId) mainItem.selling_plan = Number(sellingPlanId);
        // Shared hidden id so the cart shows the granola and its mix-ins as one
        // bundle (see snippets/brand-cart-bundle.liquid and cart.js). It also
        // keeps each bundle on its own cart line instead of merging into an
        // identical granola added without mix-ins.
        const bundleId = selectedMixIns.length
          ? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
          : null;
        if (bundleId) lineProperties._bundle_id = bundleId;
        if (Object.keys(lineProperties).length) mainItem.properties = lineProperties;

        const cartItems = [mainItem];
        selectedMixIns.forEach((input) => {
          const item = {
            id: Number(input.dataset.variantId),
            quantity: mainItem.quantity,
            // Native nested cart line: Shopify shows the mix-in under its
            // granola in checkout, order confirmation and the admin order.
            parent_id: mainItem.id,
            properties: { '_Mix-in for': mixInFieldset.dataset.parentProduct || 'Granola', _bundle_id: bundleId },
          };
          const supportedPlanIds = (input.dataset.sellingPlanIds || '').split(',').filter(Boolean);
          if (sellingPlanId && supportedPlanIds.includes(String(sellingPlanId))) {
            item.selling_plan = Number(sellingPlanId);
          }
          cartItems.push(item);
        });

        const sectionIds = this.cart && !buyNowButton
          ? this.cart.getSectionsToRender().map((section) => section.id)
          : [];
        if (this.cart && !buyNowButton) {
          this.cart.setActiveElement(document.activeElement);
        }

        if (selectedMixIns.length) {
          config.headers['Content-Type'] = 'application/json';
          config.body = JSON.stringify({
            items: cartItems,
            ...(sectionIds.length ? { sections: sectionIds, sections_url: window.location.pathname } : {}),
          });
        } else {
          if (sectionIds.length) {
            formData.append('sections', sectionIds);
            formData.append('sections_url', window.location.pathname);
          }
          config.body = formData;
        }

        const variantId = formData.get('id');
        const quantity = parseInt(formData.get('quantity')) || 1;
        const linesUpdateDeferred = this.createCartLinesUpdateEvent(
          cartItems.map((item) => ({ merchandiseId: String(item.id), quantity: item.quantity }))
        );

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'product-form',
                productVariantId: variantId,
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleErrorMessage(response.description);
              this.dispatchCartErrorEvent(response.description || response.message, 'INVALID');
              linesUpdateDeferred?.reject(new Error(response.description || response.message));

              const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
              if (!soldOutMessage) return;
              this.submitButton.setAttribute('aria-disabled', true);
              this.submitButtonText.classList.add('hidden');
              soldOutMessage.classList.remove('hidden');
              this.error = true;
              return;
            } else if (buyNowButton) {
              this.error = false;
              this.redirectingToCheckout = true;
              this.resolveCartLinesUpdate(linesUpdateDeferred);
              window.location.href = this.checkoutUrl;
              return;
            } else if (!this.cart) {
              this.resolveCartLinesUpdate(linesUpdateDeferred);
              window.location = window.routes.cart_url;
              return;
            }

            this.resolveCartLinesUpdate(linesUpdateDeferred);

            const startMarker = CartPerformance.createStartingMarker('add:wait-for-subscribers');
            if (!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-form',
                productVariantId: variantId,
                cartData: response,
              }).then(() => {
                CartPerformance.measureFromMarker('add:wait-for-subscribers', startMarker);
              });
            this.error = false;
            const quickAddModal = this.closest('quick-add-modal');
            if (quickAddModal) {
              document.body.addEventListener(
                'modalClosed',
                () => {
                  setTimeout(() => {
                    CartPerformance.measure("add:paint-updated-sections", () => {
                      this.cart.renderContents(response);
                    });
                  });
                },
                { once: true }
              );
              quickAddModal.hide(true);
            } else {
              CartPerformance.measure("add:paint-updated-sections", () => {
                this.cart.renderContents(response);
              });
            }
          })
          .catch((e) => {
            console.error(e);
            this.dispatchCartErrorEvent(e.message || 'Network error', 'SERVICE_UNAVAILABLE');
            linesUpdateDeferred?.reject(e);
          })
          .finally(() => {
            // Keep the Buy Now spinner up while the browser navigates to checkout.
            if (this.redirectingToCheckout) return;

            if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
            if (this.error && activeButton === this.submitButton) {
              activeButton.classList.remove('loading');
              activeButton.querySelector('.loading__spinner')?.classList.add('hidden');
            } else {
              this.setButtonLoading(activeButton, false);
            }

            CartPerformance.measureFromEvent("add:user-action", evt);
          });
      }

      setButtonLoading(button, isLoading) {
        button.classList.toggle('loading', isLoading);
        button.querySelector('.loading__spinner')?.classList.toggle('hidden', !isLoading);
        if (isLoading) {
          button.setAttribute('aria-disabled', true);
        } else {
          button.removeAttribute('aria-disabled');
        }
      }

      get buyNowButtons() {
        const formId = this.form.id;
        const linked = formId ? document.querySelectorAll(`[data-brand-buy-now][form="${formId}"]`) : [];
        return [...this.form.querySelectorAll('[data-brand-buy-now]'), ...linked];
      }

      get checkoutUrl() {
        return `${window.Shopify?.routes?.root || '/'}checkout`;
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
        if (!this.errorMessageWrapper) return;
        this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }

      toggleSubmitButton(disable = true, text) {
        if (disable) {
          this.submitButton.setAttribute('disabled', 'disabled');
          if (text) this.submitButtonText.textContent = text;
        } else {
          this.submitButton.removeAttribute('disabled');
          this.submitButtonText.textContent = window.variantStrings.addToCart;
        }

        this.buyNowButtons.forEach((button) => {
          button.toggleAttribute('disabled', disable);
          const label = button.querySelector('[data-buy-now-label]');
          if (!label) return;
          if (!disable) {
            label.textContent = label.dataset.defaultLabel;
          } else if (text) {
            label.textContent = text;
          }
        });
      }

      createCartLinesUpdateEvent(lines) {
        const { CartLinesUpdateEvent } = window.StandardEvents || {};
        if (!CartLinesUpdateEvent) return null;

        const deferred = CartLinesUpdateEvent.createPromise();
        this.dispatchEvent(
          new CartLinesUpdateEvent({
            action: 'add',
            context: 'product',
            lines,
            promise: deferred.promise,
          })
        );
        return deferred;
      }

      resolveCartLinesUpdate(deferred) {
        if (!deferred) return;
        const { CartLinesUpdateEvent } = window.StandardEvents || {};
        if (!CartLinesUpdateEvent) return;

        const pendingCartDataPromise = typeof CartItems !== 'undefined'
          ? CartItems.fetchCartData()
          : fetch(`${routes.cart_url}.json`).then((response) => response.json());

        pendingCartDataPromise
          .then((cart) => {
            if (!cart?.currency) return deferred.reject(new Error('Missing currency in cart response'));
            deferred.resolve({ cart: CartLinesUpdateEvent.createCartFromAjaxResponse(cart) });
          })
          .catch((e) => deferred.reject(e));
      }

      dispatchCartErrorEvent(message, code) {
        const { CartErrorEvent } = window.StandardEvents || {};
        if (!CartErrorEvent) return;
        this.dispatchEvent(new CartErrorEvent({ error: message, code }));
      }

      get variantIdInput() {
        return this.form.querySelector('[name=id]');
      }
    }
  );
}
