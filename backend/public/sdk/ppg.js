(function (window) {
  'use strict';

  var activeModal = null;
  var messageListener = null;

  var PPG = {
    /**
     * Opens an in-page checkout modal overlay
     * @param {Object} options
     * @param {string} options.checkoutUrl - URL returned by Gateway POST /payments
     * @param {Function} [options.onSuccess] - Callback when payment succeeds
     * @param {Function} [options.onFailure] - Callback when payment fails
     * @param {Function} [options.onClose] - Callback when modal is closed
     */
    openCheckout: function (options) {
      if (!options || !options.checkoutUrl) {
        console.error('[PPG SDK] checkoutUrl is required to open checkout.');
        return;
      }

      // Close any existing modal
      if (activeModal) {
        PPG.close();
      }

      var isMobile = window.innerWidth <= 600;

      // 1. Build Overlay Backdrop
      var backdrop = document.createElement('div');
      backdrop.id = 'ppg-checkout-backdrop';
      backdrop.style.position = 'fixed';
      backdrop.style.inset = '0';
      backdrop.style.zIndex = '999999';
      backdrop.style.backgroundColor = 'rgba(15, 23, 42, 0.55)';
      backdrop.style.backdropFilter = 'blur(6px)';
      backdrop.style.webkitBackdropFilter = 'blur(6px)';
      backdrop.style.display = 'flex';
      backdrop.style.alignItems = 'center';
      backdrop.style.justifyContent = 'center';
      backdrop.style.padding = isMobile ? '0' : '16px';
      backdrop.style.transition = 'all 0.2s ease';

      // 2. Light Theme Container (Mobile Optimized)
      var container = document.createElement('div');
      container.id = 'ppg-checkout-container';
      container.style.position = 'relative';
      container.style.width = '100%';
      container.style.maxWidth = isMobile ? '100%' : '460px';
      container.style.height = isMobile ? '100%' : '660px';
      container.style.maxHeight = isMobile ? '100%' : '92vh';
      container.style.backgroundColor = '#ffffff';
      container.style.borderRadius = isMobile ? '0' : '24px';
      container.style.overflow = 'hidden';
      container.style.boxShadow = isMobile ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)';
      container.style.border = isMobile ? 'none' : '1px solid #e2e8f0';

      // 3. Crisp Light Theme Close Button
      var closeBtn = document.createElement('button');
      closeBtn.innerHTML = '&times;';
      closeBtn.setAttribute('aria-label', 'Close Payment');
      closeBtn.style.position = 'absolute';
      closeBtn.style.top = '12px';
      closeBtn.style.right = '14px';
      closeBtn.style.zIndex = '10';
      closeBtn.style.backgroundColor = '#f1f5f9';
      closeBtn.style.border = '1px solid #e2e8f0';
      closeBtn.style.color = '#64748b';
      closeBtn.style.fontSize = '22px';
      closeBtn.style.lineHeight = '1';
      closeBtn.style.width = '34px';
      closeBtn.style.height = '34px';
      closeBtn.style.borderRadius = '50%';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.display = 'flex';
      closeBtn.style.alignItems = 'center';
      closeBtn.style.justifyContent = 'center';
      closeBtn.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
      closeBtn.style.transition = 'all 0.15s ease';

      closeBtn.onmouseover = function () {
        closeBtn.style.backgroundColor = '#e2e8f0';
        closeBtn.style.color = '#0f172a';
      };
      closeBtn.onmouseout = function () {
        closeBtn.style.backgroundColor = '#f1f5f9';
        closeBtn.style.color = '#64748b';
      };
      closeBtn.onclick = function () {
        PPG.close();
        if (typeof options.onClose === 'function') {
          options.onClose();
        }
      };

      // 4. Iframe pointing to checkoutUrl
      var iframeUrl = options.checkoutUrl;
      if (iframeUrl.indexOf('?') === -1) {
        iframeUrl += '?embedded=true';
      } else {
        iframeUrl += '&embedded=true';
      }

      var iframe = document.createElement('iframe');
      iframe.src = iframeUrl;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.borderRadius = isMobile ? '0' : '24px';
      iframe.setAttribute('allow', 'payment');

      container.appendChild(closeBtn);
      container.appendChild(iframe);
      backdrop.appendChild(container);
      document.body.appendChild(backdrop);

      activeModal = backdrop;

      // 5. PostMessage listener for payment completion
      messageListener = function (event) {
        if (!event.data || typeof event.data !== 'object') return;

        if (event.data.type === 'PPG_PAYMENT_SUCCESS') {
          setTimeout(function () {
            PPG.close();
            if (typeof options.onSuccess === 'function') {
              options.onSuccess(event.data);
            }
          }, 400);
        } else if (event.data.type === 'PPG_PAYMENT_FAILED') {
          if (typeof options.onFailure === 'function') {
            options.onFailure(event.data);
          }
        } else if (event.data.type === 'PPG_MODAL_CLOSE') {
          PPG.close();
          if (typeof options.onClose === 'function') {
            options.onClose();
          }
        }
      };

      window.addEventListener('message', messageListener);
    },

    close: function () {
      if (activeModal && activeModal.parentNode) {
        activeModal.parentNode.removeChild(activeModal);
        activeModal = null;
      }
      if (messageListener) {
        window.removeEventListener('message', messageListener);
        messageListener = null;
      }
    },
  };

  window.PPG = PPG;
})(window);
