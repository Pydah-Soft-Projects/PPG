const { PROVIDER_TYPE } = require('../../config/constants');
const RazorpayProvider = require('./razorpay/razorpay.provider');
const CashfreeProvider = require('./cashfree/cashfree.provider');
const MockProvider = require('./mock/mock.provider');
const AppError = require('../../common/errors/app-error');
const ERROR_CODES = require('../../common/errors/error-codes');

const providerInstances = {
  [PROVIDER_TYPE.RAZORPAY]: new RazorpayProvider(),
  [PROVIDER_TYPE.CASHFREE]: new CashfreeProvider(),
  [PROVIDER_TYPE.MOCK]: new MockProvider(),
};

/**
 * Returns the provider adapter for the requested provider type
 * @param {string} providerType
 * @returns {import('./provider.interface')}
 */
function getProviderAdapter(providerType = PROVIDER_TYPE.RAZORPAY) {
  const adapter = providerInstances[providerType];
  if (!adapter) {
    throw new AppError(
      `Unsupported payment provider type: '${providerType}'`,
      400,
      ERROR_CODES.PROVIDER_ERROR
    );
  }
  return adapter;
}

module.exports = {
  getProviderAdapter,
};

