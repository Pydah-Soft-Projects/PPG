const { z } = require('zod');

const createApplicationSchema = z.object({
  name: z.string().min(2).max(100),
  code: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9_-]+$/, 'Code must be lowercase alphanumeric with underscores/hyphens'),
  description: z.string().max(500).optional(),
  notificationWebhookUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  allowedReturnUrls: z.array(z.string().url()).optional(),
  assignedProviderConfigurations: z.array(z.string()).optional(),
});

const updateApplicationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  notificationWebhookUrl: z.string().url().optional().or(z.literal('')),
  allowedReturnUrls: z.array(z.string().url()).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  assignedProviderConfigurations: z.array(z.string()).optional(),
});

module.exports = {
  createApplicationSchema,
  updateApplicationSchema,
};

