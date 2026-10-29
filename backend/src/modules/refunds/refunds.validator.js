const { z } = require('zod');

const requestRefundSchema = z.object({
  amount: z
    .number()
    .int('Refund amount must be an integer in minor units (paise)')
    .positive('Refund amount must be positive'),
  reason: z.string().max(500).optional(),
  idempotencyKey: z.string().min(4).max(128).optional(),
});

module.exports = {
  requestRefundSchema,
};

