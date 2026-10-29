const ProviderConfiguration = require('../../database/models/provider-configuration.model');
const { encryptSecret, decryptSecret } = require('../../common/utils/crypto');
const { getProviderAdapter } = require('../providers/provider.factory');
const AppError = require('../../common/errors/app-error');
const auditService = require('../audit/audit.service');
const { AUDIT_ACTION, PROVIDER_ENVIRONMENT } = require('../../config/constants');
const { logger } = require('../../common/logger/logger');

class ProviderConfigurationsService {
  async createConfiguration(data, actorContext = {}) {
    // Safety rule: LIVE environment cannot be active upon initial creation unless explicitly confirmed
    const status =
      data.environment === PROVIDER_ENVIRONMENT.LIVE ? 'INACTIVE' : 'ACTIVE';

    const encryptedKeySecret = encryptSecret(data.keySecret);
    const encryptedWebhookSecret = data.webhookSecret
      ? encryptSecret(data.webhookSecret)
      : null;

    const config = await ProviderConfiguration.create({
      name: data.name,
      accountNumber: data.accountNumber || '',
      provider: data.provider,
      environment: data.environment,
      keyId: data.keyId,
      encryptedKeySecret,
      encryptedWebhookSecret,
      status,
      allowedApplicationIds: data.allowedApplicationIds || [],
      notes: data.notes || '',
      createdBy: actorContext.actorId || 'SYSTEM',
      updatedBy: actorContext.actorId || 'SYSTEM',
    });

    await auditService.log({
      action: AUDIT_ACTION.PROVIDER_CREATED,
      actorType: 'ADMIN',
      actorId: actorContext.actorId || 'SYSTEM',
      targetType: 'PROVIDER_CONFIGURATION',
      targetId: config._id,
      ipAddress: actorContext.ip,
      userAgent: actorContext.userAgent,
      metadata: {
        name: config.name,
        provider: config.provider,
        environment: config.environment,
      },
    });

    return config.toSafeObject();
  }

  async listConfigurations({ environment, provider } = {}) {
    const filter = {};
    if (environment) filter.environment = environment;
    if (provider) filter.provider = provider;

    const configs = await ProviderConfiguration.find(filter).sort({ createdAt: -1 });
    return configs.map((c) => c.toSafeObject());
  }

  async getConfigurationById(id) {
    const config = await ProviderConfiguration.findById(id);
    if (!config) {
      throw AppError.notFound('Provider configuration not found');
    }
    return config.toSafeObject();
  }

  async updateConfiguration(id, updates, actorContext = {}) {
    const config = await ProviderConfiguration.findById(id);
    if (!config) {
      throw AppError.notFound('Provider configuration not found');
    }

    if (updates.name !== undefined) config.name = updates.name;
    if (updates.accountNumber !== undefined) config.accountNumber = updates.accountNumber;
    if (updates.status !== undefined) config.status = updates.status;
    if (updates.allowedApplicationIds !== undefined)
      config.allowedApplicationIds = updates.allowedApplicationIds;
    if (updates.notes !== undefined) config.notes = updates.notes;

    if (updates.keyId && updates.keyId.trim()) {
      config.keyId = updates.keyId.trim();
    }
    if (updates.keySecret && updates.keySecret.trim()) {
      config.encryptedKeySecret = encryptSecret(updates.keySecret.trim());
      config.lastCredentialRotationAt = new Date();
    }
    if (updates.webhookSecret !== undefined) {
      config.encryptedWebhookSecret = updates.webhookSecret.trim()
        ? encryptSecret(updates.webhookSecret.trim())
        : null;
    }

    config.updatedBy = actorContext.actorId || 'SYSTEM';

    await config.save();

    await auditService.log({
      action: AUDIT_ACTION.PROVIDER_UPDATED,
      actorType: 'ADMIN',
      actorId: actorContext.actorId || 'SYSTEM',
      targetType: 'PROVIDER_CONFIGURATION',
      targetId: config._id,
      ipAddress: actorContext.ip,
      userAgent: actorContext.userAgent,
      metadata: updates,
    });

    return config.toSafeObject();
  }

  async rotateCredentials(id, data, actorContext = {}) {
    const config = await ProviderConfiguration.findById(id);
    if (!config) {
      throw AppError.notFound('Provider configuration not found');
    }

    if (data.keyId) {
      config.keyId = data.keyId;
    }

    config.encryptedKeySecret = encryptSecret(data.keySecret);
    if (data.webhookSecret) {
      config.encryptedWebhookSecret = encryptSecret(data.webhookSecret);
    }
    config.lastCredentialRotationAt = new Date();
    config.updatedBy = actorContext.actorId || 'SYSTEM';

    await config.save();

    await auditService.log({
      action: AUDIT_ACTION.PROVIDER_CREDENTIALS_ROTATED,
      actorType: 'ADMIN',
      actorId: actorContext.actorId || 'SYSTEM',
      targetType: 'PROVIDER_CONFIGURATION',
      targetId: config._id,
      ipAddress: actorContext.ip,
      userAgent: actorContext.userAgent,
      metadata: { rotatedAt: config.lastCredentialRotationAt },
    });

    return config.toSafeObject();
  }

  async assignApplications(id, allowedApplicationIds, actorContext = {}) {
    const config = await ProviderConfiguration.findById(id);
    if (!config) {
      throw AppError.notFound('Provider configuration not found');
    }

    config.allowedApplicationIds = allowedApplicationIds;
    config.updatedBy = actorContext.actorId || 'SYSTEM';
    await config.save();

    await auditService.log({
      action: AUDIT_ACTION.PROVIDER_APPLICATIONS_ASSIGNED,
      actorType: 'ADMIN',
      actorId: actorContext.actorId || 'SYSTEM',
      targetType: 'PROVIDER_CONFIGURATION',
      targetId: config._id,
      ipAddress: actorContext.ip,
      userAgent: actorContext.userAgent,
      metadata: { count: allowedApplicationIds.length },
    });

    return config.toSafeObject();
  }

  async testConnection(id) {
    const config = await ProviderConfiguration.findById(id);
    if (!config) {
      throw AppError.notFound('Provider configuration not found');
    }

    const credentials = this.getDecryptedCredentials(config);
    const adapter = getProviderAdapter(config.provider);

    const testResult = await adapter.testConnection({ credentials });
    return testResult;
  }

  /**
   * Internal helper: safely decrypts secrets for provider communications.
   * NEVER pass this result to an API response!
   */
  getDecryptedCredentials(config) {
    const keySecret = decryptSecret(config.encryptedKeySecret);
    const webhookSecret = config.encryptedWebhookSecret
      ? decryptSecret(config.encryptedWebhookSecret)
      : null;

    return {
      keyId: config.keyId,
      keySecret,
      webhookSecret,
    };
  }
}

module.exports = new ProviderConfigurationsService();

