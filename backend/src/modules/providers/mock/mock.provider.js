const crypto = require('crypto');
const BaseProviderInterface = require('../provider.interface');
const { generateHmacSignature, timingSafeCompare } = require('../../../common/utils/crypto');

class MockProvider extends BaseProviderInterface {
  async createOrder({ orderData, credentials }) {
    const orderId = `order_mock_${crypto.randomBytes(8).toString('hex')}`;
    return {
      orderId,
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      status: 'created',
      rawResponse: {
        id: orderId,
        entity: 'order',
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        receipt: orderData.receipt,
        status: 'created',
      },
    };
  }

  async verifyPaymentSignature({ paymentData, credentials }) {
    const { orderId, paymentId, signature } = paymentData;
    const expected = generateHmacSignature(
      `${orderId}|${paymentId}`,
      credentials.keySecret || 'mock_secret'
    );
    return timingSafeCompare(signature, expected);
  }

  async verifyWebhookSignature({ rawBody, signature, credentials }) {
    const expected = generateHmacSignature(
      rawBody,
      credentials.webhookSecret || 'mock_webhook_secret'
    );
    return timingSafeCompare(signature, expected);
  }

  async getPaymentDetails({ providerPaymentId, credentials }) {
    return {
      status: 'captured',
      amount: 10000,
      currency: 'INR',
      orderId: 'order_mock_123',
      method: 'card',
      rawResponse: {
        id: providerPaymentId,
        status: 'captured',
        amount: 10000,
        currency: 'INR',
      },
    };
  }

  async refundPayment({ refundData, credentials }) {
    const refundId = `rfnd_mock_${crypto.randomBytes(8).toString('hex')}`;
    return {
      refundId,
      amount: refundData.amount,
      status: 'processed',
      rawResponse: {
        id: refundId,
        payment_id: refundData.paymentId,
        amount: refundData.amount,
        status: 'processed',
      },
    };
  }

  async testConnection({ credentials }) {
    if (!credentials.keyId || !credentials.keySecret) {
      return { success: false, message: 'Missing mock credentials' };
    }
    return { success: true, message: 'Mock provider connection successful' };
  }
}

module.exports = MockProvider;

