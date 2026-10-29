const { z } = require('zod');

const createPaymentSchema = z.object({
  businessReference: z.string().min(1).max(100),
  amount: z
    .number()
    .int('Amount must be an integer minor unit (e.g. paise)')
    .positive('Amount must be positive'),
  currency: z.string().length(3).default('INR'),
  description: z.string().max(500).optional(),
  customer: z
    .object({
      name: z.string().max(100).optional(),
      email: z.string().email().optional(),
      phone: z.string().max(20).optional(),
    })
    .optional(),
  notes: z.record(z.string()).optional(),
  idempotencyKey: z.string().min(4).max(128).optional(),
  providerConfigurationId: z.string().optional(),
});

const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

module.exports = {
  createPaymentSchema,
  verifyPaymentSchema,
};

