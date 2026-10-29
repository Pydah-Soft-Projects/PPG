const { z } = require('zod');
const { PROVIDER_TYPE, PROVIDER_ENVIRONMENT } = require('../../config/constants');

const createProviderConfigSchema = z.object({
  name: z.string().min(2).max(100),
  accountNumber: z.string().max(100).optional().or(z.literal('')),
  provider: z.nativeEnum(PROVIDER_TYPE).default(PROVIDER_TYPE.RAZORPAY),
  environment: z.nativeEnum(PROVIDER_ENVIRONMENT).default(PROVIDER_ENVIRONMENT.TEST),
  keyId: z.string().min(4).max(100),
  keySecret: z.string().min(8).max(200),
  webhookSecret: z.string().min(6).max(200).optional().or(z.literal('')),
  allowedApplicationIds: z.array(z.string()).optional(),
  notes: z.string().max(1000).optional(),
});

const updateProviderConfigSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  accountNumber: z.string().max(100).optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  allowedApplicationIds: z.array(z.string()).optional(),
  notes: z.string().max(1000).optional().or(z.literal('')),
  keyId: z.string().min(3).max(100).optional().or(z.literal('')),
  keySecret: z.string().min(6).max(200).optional().or(z.literal('')),
  webhookSecret: z.string().max(200).optional().or(z.literal('')),
});

const rotateProviderCredentialsSchema = z.object({
  keyId: z.string().min(4).max(100).optional(),
  keySecret: z.string().min(8).max(200),
  webhookSecret: z.string().min(6).max(200).optional().or(z.literal('')),
});

const assignApplicationsSchema = z.object({
  allowedApplicationIds: z.array(z.string()),
});

module.exports = {
  createProviderConfigSchema,
  updateProviderConfigSchema,
  rotateProviderCredentialsSchema,
  assignApplicationsSchema,
};

