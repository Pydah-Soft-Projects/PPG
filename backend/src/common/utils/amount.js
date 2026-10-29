const AppError = require('../errors/app-error');
const ERROR_CODES = require('../errors/error-codes');

/**
 * Validates that an amount is a valid positive integer representing minor units (e.g. paise).
 * @param {any} amount
 * @returns {number}
 */
function validateMinorUnits(amount) {
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
    throw new AppError(
      'Amount must be a positive integer representing minor units (e.g., paise for INR).',
      400,
      ERROR_CODES.BAD_REQUEST,
      { received: amount }
    );
  }
  return amount;
}

/**
 * Converts major units (e.g. Rupees) to minor units (Paise).
 * Rounds to nearest integer to avoid float inaccuracies.
 * @param {number} rupees
 * @returns {number}
 */
function rupeesToPaise(rupees) {
  if (typeof rupees !== 'number' || isNaN(rupees) || rupees < 0) {
    throw new AppError('Rupee amount must be a valid non-negative number', 400);
  }
  return Math.round(rupees * 100);
}

/**
 * Converts minor units (Paise) to major units (Rupees).
 * @param {number} paise
 * @returns {number}
 */
function paiseToRupees(paise) {
  validateMinorUnits(paise);
  return paise / 100;
}

/**
 * Formats minor units into readable currency string (e.g., "₹1,500.00")
 * @param {number} paise
 * @param {string} [currency='INR']
 * @returns {string}
 */
function formatCurrency(paise, currency = 'INR') {
  if (typeof paise !== 'number') return '0.00';
  const major = paise / 100;
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(major);
  }
  return `${currency} ${major.toFixed(2)}`;
}

module.exports = {
  validateMinorUnits,
  rupeesToPaise,
  paiseToRupees,
  formatCurrency,
};

