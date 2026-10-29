const {
  PAYMENT_STATUS,
  ALLOWED_STATUS_TRANSITIONS,
} = require('../../src/config/constants');

describe('Payment State Machine Transitions', () => {
  test('CREATED should allow transitioning to PENDING or SUCCEEDED or FAILED', () => {
    const allowed = ALLOWED_STATUS_TRANSITIONS[PAYMENT_STATUS.CREATED];
    expect(allowed).toContain(PAYMENT_STATUS.PENDING);
    expect(allowed).toContain(PAYMENT_STATUS.SUCCEEDED);
    expect(allowed).toContain(PAYMENT_STATUS.FAILED);
    expect(allowed).toContain(PAYMENT_STATUS.CANCELLED);
  });

  test('SUCCEEDED cannot transition backwards to CREATED or PENDING', () => {
    const allowed = ALLOWED_STATUS_TRANSITIONS[PAYMENT_STATUS.SUCCEEDED];
    expect(allowed).not.toContain(PAYMENT_STATUS.CREATED);
    expect(allowed).not.toContain(PAYMENT_STATUS.PENDING);
    expect(allowed).not.toContain(PAYMENT_STATUS.FAILED);
    // Allowed transitions from SUCCEEDED are refunds
    expect(allowed).toContain(PAYMENT_STATUS.REFUND_PENDING);
    expect(allowed).toContain(PAYMENT_STATUS.REFUNDED);
  });

  test('Terminal states (FAILED, CANCELLED, REFUNDED) have no allowed transitions', () => {
    expect(ALLOWED_STATUS_TRANSITIONS[PAYMENT_STATUS.FAILED]).toEqual([]);
    expect(ALLOWED_STATUS_TRANSITIONS[PAYMENT_STATUS.CANCELLED]).toEqual([]);
    expect(ALLOWED_STATUS_TRANSITIONS[PAYMENT_STATUS.REFUNDED]).toEqual([]);
  });
});

