const {
  validateMinorUnits,
  rupeesToPaise,
  paiseToRupees,
  formatCurrency,
} = require('../../src/common/utils/amount');

describe('Amount & Currency Unit Tests', () => {
  test('should validate minor units (paise) correctly', () => {
    expect(validateMinorUnits(100)).toBe(100);
    expect(validateMinorUnits(1300000)).toBe(1300000);

    // Negative amounts must throw
    expect(() => validateMinorUnits(-50)).toThrow();
    // Zero must throw
    expect(() => validateMinorUnits(0)).toThrow();
    // Float amounts must throw
    expect(() => validateMinorUnits(99.5)).toThrow();
    // Strings must throw
    expect(() => validateMinorUnits('1000')).toThrow();
  });

  test('should convert rupees to paise accurately', () => {
    expect(rupeesToPaise(13000)).toBe(1300000);
    expect(rupeesToPaise(10.5)).toBe(1050);
    expect(rupeesToPaise(0)).toBe(0);
  });

  test('should convert paise to rupees accurately', () => {
    expect(paiseToRupees(1300000)).toBe(13000);
    expect(paiseToRupees(1050)).toBe(10.5);
  });

  test('should format currency cleanly', () => {
    const formatted = formatCurrency(1300000, 'INR');
    expect(formatted).toContain('13,000');
  });
});

