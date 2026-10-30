const { z } = require('zod');

const upsertRoutingRuleSchema = z.object({
  applicationId: z.string().nullable().optional(),
  collegeId: z.number().int('collegeId must be an integer'),
  collegeCode: z.string().min(1, 'collegeCode is required'),
  collegeName: z.string().min(1, 'collegeName is required'),
  courseId: z.number().int().nullable().optional(),
  courseCode: z.string().nullable().optional(),
  courseName: z.string().nullable().optional(),
  providerConfigurationId: z.string().min(1, 'providerConfigurationId is required'),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
  notes: z.string().optional().default(''),
});

const batchUpsertRoutingRulesSchema = z.object({
  applicationId: z.string().nullable().optional(),
  colleges: z
    .array(
      z.object({
        id: z.number().int(),
        code: z.string().min(1),
        name: z.string().min(1),
      })
    )
    .min(1, 'Select at least one college'),
  courses: z
    .array(
      z.object({
        id: z.number().int(),
        collegeId: z.number().int().optional().nullable(),
        code: z.string().min(1),
        name: z.string().min(1),
      })
    )
    .optional()
    .default([]),
  providerConfigurationId: z.string().min(1, 'Payment Account is required'),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
  notes: z.string().optional().default(''),
});

const updateRoutingRuleSchema = z.object({
  collegeId: z.number().int().optional(),
  collegeCode: z.string().min(1).optional(),
  collegeName: z.string().min(1).optional(),
  courseScope: z.enum(['ALL', 'SPECIFIC']).optional(),
  courseId: z.number().int().nullable().optional(),
  courseCode: z.string().nullable().optional(),
  courseName: z.string().nullable().optional(),
  providerConfigurationId: z.string().min(1).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  notes: z.string().optional().default(''),
});

module.exports = {
  upsertRoutingRuleSchema,
  batchUpsertRoutingRulesSchema,
  updateRoutingRuleSchema,
};
