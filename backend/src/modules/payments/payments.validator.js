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
      name: z.string().max(100).optional().or(z.literal('')),
      email: z.string().email('Invalid email format').optional().or(z.literal('')),
      phone: z.string().max(20).optional().or(z.literal('')),
    })
    .optional(),
  notes: z.record(z.string()).optional(),
  idempotencyKey: z.string().min(4).max(128).optional(),
  providerConfigurationId: z.string().optional(),
  returnUrl: z.string().url('returnUrl must be a valid URL').optional().or(z.literal('')),
  college: z
    .union([
      z.string(),
      z.number(),
      z.object({
        id: z.number().optional(),
        code: z.string().optional(),
        name: z.string().optional(),
      }),
    ])
    .optional(),
  course: z
    .union([
      z.string(),
      z.number(),
      z.object({
        id: z.number().optional(),
        code: z.string().optional(),
        name: z.string().optional(),
      }),
    ])
    .optional(),
  collegeCode: z.string().optional(),
  courseCode: z.string().optional(),
  collegeId: z.number().optional(),
  courseId: z.number().optional(),
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

