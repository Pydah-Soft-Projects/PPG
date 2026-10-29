/**
 * Base abstract Provider Interface.
 * All payment provider adapters (Razorpay, Mock, etc.) must implement these methods.
 */
class BaseProviderInterface {
  /**
   * Creates an order with the provider
   * @param {Object} params
   * @param {Object} params.orderData { receipt, amount, currency, notes }
   * @param {Object} params.credentials { keyId, keySecret }
   * @returns {Promise<{ orderId: string, amount: number, currency: string, status: string, rawResponse: any }>}
   */
  async createOrder(params) {
    throw new Error('createOrder must be implemented by provider adapter');
  }

  /**
   * Verifies the client checkout response signature server-side
   * @param {Object} params
   * @param {Object} params.paymentData { orderId, paymentId, signature }
   * @param {Object} params.credentials { keyId, keySecret }
   * @returns {Promise<boolean>}
   */
  async verifyPaymentSignature(params) {
    throw new Error('verifyPaymentSignature must be implemented by provider adapter');
  }

  /**
   * Verifies the incoming webhook signature against raw request buffer
   * @param {Object} params
   * @param {Buffer|string} params.rawBody
   * @param {string} params.signature
   * @param {Object} params.credentials { webhookSecret }
   * @returns {Promise<boolean>}
   */
  async verifyWebhookSignature(params) {
    throw new Error('verifyWebhookSignature must be implemented by provider adapter');
  }

  /**
   * Fetches authoritative payment details from the provider
   * @param {Object} params
   * @param {string} params.providerPaymentId
   * @param {Object} params.credentials { keyId, keySecret }
   * @returns {Promise<{ status: string, amount: number, currency: string, orderId: string, method: string, rawResponse: any }>}
   */
  async getPaymentDetails(params) {
    throw new Error('getPaymentDetails must be implemented by provider adapter');
  }

  /**
   * Requests a refund for a payment
   * @param {Object} params
   * @param {Object} params.refundData { paymentId, amount, reason }
   * @param {Object} params.credentials { keyId, keySecret }
   * @returns {Promise<{ refundId: string, amount: number, status: string, rawResponse: any }>}
   */
  async refundPayment(params) {
    throw new Error('refundPayment must be implemented by provider adapter');
  }

  /**
   * Tests connectivity and credential validity without charging
   * @param {Object} params
   * @param {Object} params.credentials { keyId, keySecret }
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async testConnection(params) {
    throw new Error('testConnection must be implemented by provider adapter');
  }
}

module.exports = BaseProviderInterface;

