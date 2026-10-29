const axios = require('axios');
const BaseProviderInterface = require('../provider.interface');
const { generateHmacSignature, timingSafeCompare } = require('../../../common/utils/crypto');
const AppError = require('../../../common/errors/app-error');
const ERROR_CODES = require('../../../common/errors/error-codes');
const { logger } = require('../../../common/logger/logger');

class CashfreeProvider extends BaseProviderInterface {
  getBaseUrl(credentials) {
    // If key starts with TEST or credentials indicate test environment
    const isSandbox = credentials.environment === 'TEST' || (credentials.keyId && credentials.keyId.toUpperCase().includes('TEST'));
    return isSandbox ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';
  }

  getHeaders(credentials) {
    if (!credentials || !credentials.keyId || !credentials.keySecret) {
      throw new AppError('Missing Cashfree Client ID or Secret Key', 400, ERROR_CODES.PROVIDER_ERROR);
    }
    return {
      'Content-Type': 'application/json',
      'x-client-id': credentials.keyId,
      'x-client-secret': credentials.keySecret,
      'x-api-version': '2023-08-01',
    };
  }

  async createOrder({ orderData, credentials }) {
    try {
      const baseUrl = this.getBaseUrl(credentials);
      const headers = this.getHeaders(credentials);

      // Cashfree takes rupees as decimal or float: amount in paise / 100
      const orderAmountRupees = (orderData.amount / 100).toFixed(2);
      const orderId = orderData.receipt || `order_${Date.now()}`;

      const payload = {
        order_id: orderId,
        order_amount: parseFloat(orderAmountRupees),
        order_currency: orderData.currency || 'INR',
        customer_details: {
          customer_id: orderData.notes?.customerId || `cust_${Date.now()}`,
          customer_name: orderData.notes?.customerName || 'Customer',
          customer_email: orderData.notes?.customerEmail || 'customer@pydah.edu.in',
          customer_phone: orderData.notes?.customerPhone || '9876543210',
        },
        order_meta: {
          return_url: orderData.notes?.returnUrl || '',
        },
        order_note: orderData.notes?.description || 'Pydah Gateway Payment',
      };

      const response = await axios.post(`${baseUrl}/orders`, payload, { headers, timeout: 10000 });
      const order = response.data;

      return {
        orderId: order.order_id,
        paymentSessionId: order.payment_session_id,
        amount: orderData.amount, // Keep in minor units paise internally
        currency: order.order_currency,
        status: order.order_status,
        rawResponse: order,
      };
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      logger.error('Cashfree order creation failed', { error: errMsg });
      throw new AppError(`Cashfree order creation failed: ${errMsg}`, 502, ERROR_CODES.PROVIDER_ERROR);
    }
  }

  async verifyPaymentSignature({ paymentData, credentials }) {
    try {
      const { orderId } = paymentData;
      if (!orderId) return false;

      // Authoritative verification by checking Cashfree order status directly
      const baseUrl = this.getBaseUrl(credentials);
      const headers = this.getHeaders(credentials);

      const response = await axios.get(`${baseUrl}/orders/${orderId}`, { headers, timeout: 10000 });
      const order = response.data;

      return order.order_status === 'PAID';
    } catch (error) {
      logger.error('Cashfree verification lookup failed', { error: error.message });
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
      logger.error('Cashfree webhook signature check failed', { error: error.message });
      return false;
    }
  }

  async getPaymentDetails({ providerPaymentId, credentials }) {
    try {
      const baseUrl = this.getBaseUrl(credentials);
      const headers = this.getHeaders(credentials);

      const response = await axios.get(`${baseUrl}/orders/${providerPaymentId}/payments`, {
        headers,
        timeout: 10000,
      });

      const payments = response.data || [];
      const successfulPayment = payments.find((p) => p.payment_status === 'SUCCESS') || payments[0];

      if (!successfulPayment) {
        throw new Error('No payments recorded for this Cashfree order');
      }

      return {
        status: successfulPayment.payment_status === 'SUCCESS' ? 'captured' : 'failed',
        amount: Math.round(successfulPayment.payment_amount * 100), // in paise
        currency: successfulPayment.payment_currency || 'INR',
        orderId: providerPaymentId,
        method: successfulPayment.payment_group || 'online',
        rawResponse: successfulPayment,
      };
    } catch (error) {
      logger.error('Cashfree payment details lookup error', { error: error.message });
      throw new AppError('Cashfree payment lookup failed: ' + error.message, 502);
    }
  }

  async refundPayment({ refundData, credentials }) {
    try {
      const baseUrl = this.getBaseUrl(credentials);
      const headers = this.getHeaders(credentials);

      const refundAmountRupees = (refundData.amount / 100).toFixed(2);
      const refundId = `rfnd_${Date.now()}`;

      const payload = {
        refund_id: refundId,
        refund_amount: parseFloat(refundAmountRupees),
        refund_note: refundData.reason || 'Pydah Gateway Refund',
      };

      const response = await axios.post(
        `${baseUrl}/orders/${refundData.paymentId}/refunds`,
        payload,
        { headers, timeout: 10000 }
      );

      return {
        refundId: response.data.refund_id,
        amount: refundData.amount,
        status: response.data.refund_status?.toLowerCase() || 'processed',
        rawResponse: response.data,
      };
    } catch (error) {
      logger.error('Cashfree refund failed', { error: error.message });
      throw new AppError(`Cashfree refund failed: ${error.response?.data?.message || error.message}`, 502);
    }
  }

  async verifyWebhookSignature({ rawBody, signature, credentials, headers = {} }) {
    if (!credentials || !credentials.keySecret) {
      return false;
    }
    try {
      const secret = credentials.webhookSecret || credentials.keySecret;
      const timestamp = headers['x-webhook-timestamp'] || '';
      const signString = timestamp ? `${timestamp}${rawBody}` : rawBody;
      const computed = generateHmacSignature(signString, secret, 'sha256');
      return timingSafeCompare(computed, signature);
    } catch (err) {
      logger.error('Cashfree signature verification error', { error: err.message });
      return false;
    }
  }

  async testConnection({ credentials }) {
    try {
      const baseUrl = this.getBaseUrl(credentials);
      const headers = this.getHeaders(credentials);

      // Safe non-mutating check
      await axios.get(`${baseUrl}/orders?limit=1`, { headers, timeout: 8000 });
      return {
        success: true,
        message: 'Successfully connected and verified Cashfree credentials',
      };
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      return {
        success: false,
        message: errMsg || 'Failed to authenticate with Cashfree',
      };
    }
  }
}

module.exports = CashfreeProvider;

