const BaseProviderInterface = require('../provider.interface');
const { generateHmacSignature, timingSafeCompare } = require('../../../common/utils/crypto');
const AppError = require('../../../common/errors/app-error');
const ERROR_CODES = require('../../../common/errors/error-codes');
const { logger } = require('../../../common/logger/logger');

let RazorpaySDK;
try {
  RazorpaySDK = require('razorpay');
} catch (e) {
  // If razorpay is not yet installed in node_modules, it will be loaded once npm install runs
  RazorpaySDK = null;
}

class RazorpayProvider extends BaseProviderInterface {
  /**
   * Helper to instantiate a Razorpay client
   * @param {{ keyId: string, keySecret: string }} credentials
   */
  getClient(credentials) {
    if (!credentials || !credentials.keyId || !credentials.keySecret) {
      throw new AppError(
        'Missing Razorpay Key ID or Key Secret',
        400,
        ERROR_CODES.PROVIDER_ERROR
      );
    }
    if (!RazorpaySDK) {
      RazorpaySDK = require('razorpay');
    }
    return new RazorpaySDK({
      key_id: credentials.keyId,
      key_secret: credentials.keySecret,
    });
  }

  async createOrder({ orderData, credentials }) {
    try {
      const client = this.getClient(credentials);
      const options = {
        amount: orderData.amount, // in paise
        currency: orderData.currency || 'INR',
        receipt: orderData.receipt,
        notes: orderData.notes || {},
      };

      const order = await client.orders.create(options);

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        rawResponse: order,
      };
    } catch (error) {
      logger.error('Razorpay order creation failed', { error: error.message });
      throw new AppError(
        `Razorpay order creation failed: ${error.error?.description || error.message}`,
        502,
        ERROR_CODES.PROVIDER_ERROR,
        error.error || null
      );
    }
  }

  async verifyPaymentSignature({ paymentData, credentials }) {
    try {
      const { orderId, paymentId, signature } = paymentData;
      if (!orderId || !paymentId || !signature) {
        return false;
      }
      const expected = generateHmacSignature(
        `${orderId}|${paymentId}`,
        credentials.keySecret
      );
      return timingSafeCompare(signature, expected);
    } catch (error) {
      logger.error('Razorpay payment signature verification error', { error: error.message });
      return false;
    }
  }

  async verifyWebhookSignature({ rawBody, signature, credentials }) {
    try {
      if (!rawBody || !signature || !credentials.webhookSecret) {
        return false;
      }
      const expected = generateHmacSignature(rawBody, credentials.webhookSecret);
      return timingSafeCompare(signature, expected);
    } catch (error) {
      logger.error('Razorpay webhook signature verification error', { error: error.message });
      return false;
    }
  }

  async getPaymentDetails({ providerPaymentId, credentials }) {
    try {
      const client = this.getClient(credentials);
      const payment = await client.payments.fetch(providerPaymentId);
      return {
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        orderId: payment.order_id,
        method: payment.method,
        rawResponse: payment,
      };
    } catch (error) {
      logger.error('Razorpay fetch payment details failed', { error: error.message });
      throw new AppError(
        `Razorpay payment lookup failed: ${error.error?.description || error.message}`,
        502,
        ERROR_CODES.PROVIDER_ERROR
      );
    }
  }

  async refundPayment({ refundData, credentials }) {
    try {
      const client = this.getClient(credentials);
      const refundOptions = {
        amount: refundData.amount, // in paise
        notes: refundData.notes || {},
      };
      const refund = await client.payments.refund(refundData.paymentId, refundOptions);
      return {
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status,
        rawResponse: refund,
      };
    } catch (error) {
      logger.error('Razorpay refund request failed', { error: error.message });
      throw new AppError(
        `Razorpay refund failed: ${error.error?.description || error.message}`,
        502,
        ERROR_CODES.PROVIDER_ERROR,
        error.error || null
      );
    }
  }

  async testConnection({ credentials }) {
    try {
      const client = this.getClient(credentials);
      // Safe non-mutating check: fetching latest orders (count: 1)
      await client.orders.all({ count: 1 });
      return {
        success: true,
        message: 'Successfully connected and verified Razorpay credentials',
      };
    } catch (error) {
      return {
        success: false,
        message: error.error?.description || error.message,
      };
    }
  }
}

module.exports = RazorpayProvider;

