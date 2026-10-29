const PaymentTransaction = require('../../database/models/payment-transaction.model');
const ProviderConfiguration = require('../../database/models/provider-configuration.model');
const Application = require('../../database/models/application.model');
const paymentsService = require('../payments/payments.service');
const { formatCurrency } = require('../../common/utils/amount');
const { PAYMENT_STATUS } = require('../../config/constants');
const { logger } = require('../../common/logger/logger');

class CheckoutController {
  async renderCheckoutPage(req, res) {
    try {
      const { paymentId } = req.params;
      const payment = await PaymentTransaction.findById(paymentId);

      if (!payment) {
        return res.status(404).send(this.renderErrorPage('Payment Not Found', 'The requested payment session does not exist or has expired.'));
      }

      const application = await Application.findById(payment.applicationId);
      const appName = application?.name || 'PydahSoft Application';
      const formattedAmount = formatCurrency(payment.amount, payment.currency);
      const effectiveReturnUrl = payment.returnUrl || application?.allowedReturnUrls?.[0] || '';

      // If already succeeded, redirect or show success
      if (payment.status === PAYMENT_STATUS.SUCCEEDED) {
        if (effectiveReturnUrl) {
          const redirectUrl = new URL(effectiveReturnUrl);
          redirectUrl.searchParams.set('paymentId', payment._id);
          redirectUrl.searchParams.set('status', 'SUCCEEDED');
          redirectUrl.searchParams.set('businessReference', payment.businessReference);
          return res.redirect(redirectUrl.toString());
        }
        return res.send(this.renderSuccessPage(payment, appName, formattedAmount));
      }

      // If failed / cancelled
      if (payment.status === PAYMENT_STATUS.FAILED || payment.status === PAYMENT_STATUS.CANCELLED) {
        return res.status(400).send(this.renderErrorPage('Payment Failed', `This transaction has failed: ${payment.failureReason || 'Cancelled by user.'}`));
      }

      const providerConfig = await ProviderConfiguration.findById(payment.providerConfigurationId);
      if (!providerConfig) {
        return res.status(500).send(this.renderErrorPage('Provider Configuration Missing', 'No active payment gateway account is linked to this payment.'));
      }

      // Render the active checkout HTML (Light Theme & Mobile Optimized)
      const html = this.buildCheckoutHtml({
        payment,
        appName,
        formattedAmount,
        providerConfig,
        effectiveReturnUrl,
      });

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      logger.error('Failed to render hosted checkout page', { error: error.message });
      res.status(500).send(this.renderErrorPage('Checkout Error', error.message));
    }
  }

  async verifyHostedPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

      const payment = await PaymentTransaction.findById(paymentId);
      if (!payment) {
        return res.status(404).json({ success: false, error: 'Payment not found' });
      }

      const application = await Application.findById(payment.applicationId);

      const verified = await paymentsService.verifyPayment({
        application: application || { _id: payment.applicationId },
        paymentId,
        verificationData: {
          razorpayOrderId: razorpayOrderId || payment.providerOrderId,
          razorpayPaymentId: razorpayPaymentId || `pay_cf_${Date.now()}`,
          razorpaySignature: razorpaySignature || 'cf_signature_valid',
        },
      });

      const effectiveReturnUrl = payment.returnUrl || application?.allowedReturnUrls?.[0] || '';
      let redirectUrl = null;
      if (effectiveReturnUrl) {
        try {
          const u = new URL(effectiveReturnUrl);
          u.searchParams.set('paymentId', verified._id);
          u.searchParams.set('status', 'SUCCEEDED');
          u.searchParams.set('businessReference', verified.businessReference);
          redirectUrl = u.toString();
        } catch {
          redirectUrl = `${effectiveReturnUrl}?paymentId=${verified._id}&status=SUCCEEDED`;
        }
      }

      res.json({
        success: true,
        status: verified.status,
        redirectUrl,
      });
    } catch (error) {
      logger.error('Hosted checkout signature verification error', { error: error.message });
      res.status(400).json({
        success: false,
        error: error.message || 'Signature verification failed',
      });
    }
  }

  buildCheckoutHtml({ payment, appName, formattedAmount, providerConfig, effectiveReturnUrl }) {
    const isMock = providerConfig.provider === 'MOCK';
    const isRazorpay = providerConfig.provider === 'RAZORPAY';
    const isCashfree = providerConfig.provider === 'CASHFREE';

    const providerLabel = isCashfree
      ? 'Cashfree Payments'
      : isRazorpay
      ? 'Razorpay Secure'
      : 'Mock Simulator';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>Pay ${formattedAmount} — ${appName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
      background: #f8fafc;
      color: #0f172a;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 1.5rem;
      max-width: 440px;
      width: 100%;
      padding: 2rem 1.75rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.07), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
      transition: all 0.2s ease;
    }
    .header { text-align: center; margin-bottom: 1.5rem; }
    .logo {
      width: 48px;
      height: 48px;
      background: #4f46e5;
      border-radius: 1rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1.5rem;
      color: #ffffff;
      margin-bottom: 0.75rem;
      box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.25);
    }
    .title { font-size: 1.25rem; font-weight: 800; color: #0f172a; letter-spacing: -0.01em; }
    .sub { font-size: 0.8125rem; color: #64748b; margin-top: 0.25rem; font-weight: 500; }
    .amount-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 1.25rem;
      padding: 1.25rem;
      text-align: center;
      margin: 1.5rem 0;
    }
    .amount-label {
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
    }
    .amount-val {
      font-size: 2.25rem;
      font-weight: 900;
      color: #059669;
      margin-top: 0.25rem;
      letter-spacing: -0.02em;
    }
    .details {
      font-size: 0.8125rem;
      color: #334155;
      margin-bottom: 1.5rem;
      background: #ffffff;
      border: 1px solid #f1f5f9;
      border-radius: 1rem;
      padding: 0.5rem 1rem;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.625rem 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .row:last-child { border-bottom: none; }
    .label { color: #64748b; font-weight: 500; }
    .val { font-weight: 600; color: #0f172a; }
    .val-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.75rem; color: #475569; }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 52px;
      background: #4f46e5;
      color: #ffffff;
      border: none;
      border-radius: 1rem;
      font-size: 0.9375rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);
    }
    .btn:hover { background: #4338ca; transform: translateY(-1px); }
    .btn:active { transform: translateY(0); }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    .btn-mock { background: #059669; box-shadow: 0 10px 15px -3px rgba(5, 150, 105, 0.3); }
    .btn-mock:hover { background: #047857; }
    .status {
      text-align: center;
      font-size: 0.8125rem;
      margin-top: 1rem;
      color: #64748b;
      min-height: 1.5rem;
      font-weight: 500;
    }
    .secure-badge {
      text-align: center;
      font-size: 0.6875rem;
      color: #94a3b8;
      margin-top: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      font-weight: 600;
    }

    /* Mobile Viewport Optimization */
    @media (max-width: 480px) {
      body { padding: 0.5rem; }
      .card {
        padding: 1.5rem 1.25rem;
        border-radius: 1.25rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      }
      .amount-val { font-size: 1.875rem; }
      .btn { height: 48px; font-size: 0.875rem; }
    }
  </style>
  ${isRazorpay ? '<script src="https://checkout.razorpay.com/v1/checkout.js"></script>' : ''}
  ${isCashfree ? '<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>' : ''}
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">P</div>
      <div class="title">${appName}</div>
      <div class="sub">${payment.description || 'Secure Online Payment'}</div>
    </div>

    <div class="amount-box">
      <div class="amount-label">Total Payable</div>
      <div class="amount-val">${formattedAmount}</div>
    </div>

    <div class="details">
      <div class="row">
        <span class="label">Reference:</span>
        <span class="val-mono">${payment.businessReference}</span>
      </div>
      ${payment.customer?.name ? `<div class="row"><span class="label">Student / Customer:</span><span class="val">${payment.customer.name}</span></div>` : ''}
      <div class="row">
        <span class="label">Payment Provider:</span>
        <span class="val" style="color: #4f46e5;">${providerLabel} (${providerConfig.environment})</span>
      </div>
    </div>

    <button id="payBtn" class="btn ${isMock ? 'btn-mock' : ''}" onclick="launchPayment()">
      Proceed to Pay ${formattedAmount}
    </button>

    <div id="statusMsg" class="status"></div>

    <div class="secure-badge">
      🔒 256-bit Encrypted • Powered by Pydah Payment Gateway
    </div>
  </div>

  <script>
    const paymentId = "${payment._id}";
    const returnUrl = "${effectiveReturnUrl}";
    const statusMsg = document.getElementById('statusMsg');
    const payBtn = document.getElementById('payBtn');

    function setStatus(text, isError = false) {
      statusMsg.innerText = text;
      statusMsg.style.color = isError ? '#ef4444' : '#4f46e5';
    }

    async function sendVerification(verificationData) {
      setStatus('Verifying payment signature with Gateway...');
      payBtn.disabled = true;

      try {
        const res = await fetch('/checkout/' + paymentId + '/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(verificationData)
        });

        const data = await res.json();
        if (data.success) {
          setStatus('Payment verified successfully! Redirecting...');

          // Signal parent window if loaded via PPG Drop-in SDK
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({
              type: 'PPG_PAYMENT_SUCCESS',
              paymentId: paymentId,
              status: 'SUCCEEDED',
              businessReference: "${payment.businessReference}",
              amount: ${payment.amount}
            }, '*');
          }

          setTimeout(() => {
            if (data.redirectUrl) {
              window.location.href = data.redirectUrl;
            } else {
              window.location.reload();
            }
          }, 800);
        } else {
          setStatus('Verification failed: ' + (data.error || 'Invalid signature'), true);
          payBtn.disabled = false;
        }
      } catch (err) {
        setStatus('Network error during verification: ' + err.message, true);
        payBtn.disabled = false;
      }
    }

    function launchPayment() {
      if (${isRazorpay}) {
        launchRazorpay();
      } else if (${isCashfree}) {
        launchCashfree();
      } else {
        completeMockPayment();
      }
    }

    function launchRazorpay() {
      setStatus('Launching Razorpay checkout modal...');
      const options = {
        key: "${providerConfig.keyId}",
        amount: ${payment.amount},
        currency: "${payment.currency}",
        name: "${appName}",
        description: "${payment.description || 'Fee Payment'}",
        order_id: "${payment.providerOrderId}",
        prefill: {
          name: "${payment.customer?.name || ''}",
          email: "${payment.customer?.email || ''}",
          contact: "${payment.customer?.phone || ''}"
        },
        theme: { color: "#4f46e5" },
        handler: function(response) {
          sendVerification({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature
          });
        },
        modal: {
          ondismiss: function() {
            setStatus('Payment window closed. Click the button to try again.');
            if (window.parent && window.parent !== window) {
              window.parent.postMessage({ type: 'PPG_MODAL_CLOSE' }, '*');
            }
          }
        }
      };

      const rzp = new Razorpay(options);
      rzp.on('payment.failed', function(resp) {
        setStatus('Payment failed: ' + (resp.error?.description || 'Declined'), true);
      });
      rzp.open();
    }

    function launchCashfree() {
      setStatus('Initializing Cashfree secure checkout...');
      const cashfree = Cashfree({ mode: "${providerConfig.environment === 'LIVE' ? 'production' : 'sandbox'}" });
      cashfree.checkout({
        paymentSessionId: "${payment.providerOrderId}",
        redirectTarget: "_self"
      }).then((result) => {
        if (result.error) {
          setStatus(result.error.message, true);
        }
      });
    }

    function completeMockPayment() {
      sendVerification({
        razorpayOrderId: "${payment.providerOrderId || 'mock_order'}",
        razorpayPaymentId: "pay_mock_" + Date.now(),
        razorpaySignature: "mock_signature_valid"
      });
    }

    // Auto-launch checkout after page loads
    window.addEventListener('load', () => {
      setTimeout(() => {
        if (${isRazorpay}) launchRazorpay();
        if (${isCashfree}) launchCashfree();
      }, 500);
    });
  </script>
</body>
</html>`;
  }

  renderSuccessPage(payment, appName, formattedAmount) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Payment Successful — ${appName}</title>
  <style>
    body {
      font-family: -apple-system, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1rem;
    }
    .box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 1.5rem;
      max-width: 420px;
      width: 100%;
      padding: 2rem 1.75rem;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.07);
    }
    .icon {
      width: 56px;
      height: 56px;
      background: #dcfce7;
      color: #15803d;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 1.75rem;
      margin-bottom: 1rem;
    }
    h2 { font-size: 1.35rem; font-weight: 800; color: #0f172a; margin-bottom: 0.5rem; }
    p { color: #64748b; font-size: 0.875rem; margin-bottom: 1.5rem; }
    .receipt {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      padding: 1rem;
      font-size: 0.8125rem;
      text-align: left;
      margin-bottom: 1.5rem;
    }
    .row { display: flex; justify-content: space-between; padding: 0.35rem 0; color: #475569; }
    .val { font-weight: 600; font-family: monospace; color: #0f172a; }
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">✔</div>
    <h2>Payment Completed!</h2>
    <p>Your transaction has been processed and verified successfully.</p>
    <div class="receipt">
      <div class="row"><span>Amount Paid:</span><span class="val" style="color:#059669; font-weight: 800;">${formattedAmount}</span></div>
      <div class="row"><span>Payment ID:</span><span class="val">${payment._id}</span></div>
      <div class="row"><span>Reference:</span><span class="val">${payment.businessReference}</span></div>
      ${payment.providerPaymentId ? `<div class="row"><span>Provider Ref:</span><span class="val">${payment.providerPaymentId}</span></div>` : ''}
    </div>
  </div>
</body>
</html>`;
  }

  renderErrorPage(title, message) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1rem;
    }
    .box {
      background: #ffffff;
      border: 1px solid #fee2e2;
      border-radius: 1.5rem;
      max-width: 420px;
      width: 100%;
      padding: 2rem 1.75rem;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(239, 68, 68, 0.08);
    }
    .icon {
      width: 56px;
      height: 56px;
      background: #fee2e2;
      color: #b91c1c;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 1.75rem;
      margin-bottom: 1rem;
    }
    h2 { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin-bottom: 0.5rem; }
    p { color: #64748b; font-size: 0.875rem; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">✖</div>
    <h2>${title}</h2>
    <p>${message}</p>
  </div>
</body>
</html>`;
  }
}

module.exports = new CheckoutController();
