const Application = require('../../database/models/application.model');
const ApplicationCredential = require('../../database/models/application-credential.model');
const { generateAppKeyId, generateAppSecret } = require('../../common/utils/id');
const { hashSecret } = require('../../common/utils/crypto');
const AppError = require('../../common/errors/app-error');
const auditService = require('../audit/audit.service');
const { AUDIT_ACTION } = require('../../config/constants');

class ApplicationsService {
  async createApplication(data, actorContext = {}) {
    const existing = await Application.findOne({ code: data.code.toLowerCase() });
    if (existing) {
      throw AppError.conflict(`An application with code '${data.code}' already exists`);
    }

    const application = await Application.create({
      name: data.name,
      code: data.code.toLowerCase(),
      description: data.description || '',
      notificationWebhookUrl: data.notificationWebhookUrl || '',
      allowedReturnUrls: data.allowedReturnUrls || [],
      assignedProviderConfigurations: data.assignedProviderConfigurations || [],
      status: 'ACTIVE',
    });

    // Generate initial credentials
    const keyId = generateAppKeyId();
    const rawSecret = generateAppSecret();
    const hashedSecret = hashSecret(rawSecret);

    await ApplicationCredential.create({
      applicationId: application._id,
      keyId,
      hashedSecret,
      status: 'ACTIVE',
    });

    await auditService.log({
      action: AUDIT_ACTION.APPLICATION_CREATED,
      actorType: 'ADMIN',
      actorId: actorContext.actorId || 'SYSTEM',
      targetType: 'APPLICATION',
      targetId: application._id,
      ipAddress: actorContext.ip,
      userAgent: actorContext.userAgent,
      metadata: { name: application.name, code: application.code },
    });

    return {
      application,
      credentials: {
        keyId,
        secret: rawSecret, // Displayed only ONCE to the administrator
      },
    };
  }

  async rotateCredentials(applicationId, actorContext = {}) {
    const application = await Application.findById(applicationId);
    if (!application) {
      throw AppError.notFound('Application not found');
    }

    // Revoke all current active credentials
    await ApplicationCredential.updateMany(
      { applicationId, status: 'ACTIVE' },
      { $set: { status: 'REVOKED', revokedAt: new Date() } }
    );

    // Generate fresh credentials
    const keyId = generateAppKeyId();
    const rawSecret = generateAppSecret();
    const hashedSecret = hashSecret(rawSecret);

    await ApplicationCredential.create({
      applicationId,
      keyId,
      hashedSecret,
      status: 'ACTIVE',
    });

    await auditService.log({
      action: AUDIT_ACTION.APPLICATION_CREDENTIALS_ROTATED,
      actorType: 'ADMIN',
      actorId: actorContext.actorId || 'SYSTEM',
      targetType: 'APPLICATION',
      targetId: applicationId,
      ipAddress: actorContext.ip,
      userAgent: actorContext.userAgent,
      metadata: { newKeyId: keyId },
    });

    return {
      keyId,
      secret: rawSecret, // Displayed only ONCE to the administrator
    };
  }

  async listApplications() {
    const applications = await Application.find().sort({ createdAt: -1 });

    // Fetch active credential keyId for each application
    const appIds = applications.map((a) => a._id);
    const activeCredentials = await ApplicationCredential.find({
      applicationId: { $in: appIds },
      status: 'ACTIVE',
    });

    const credMap = {};
    activeCredentials.forEach((c) => {
      credMap[c.applicationId] = {
        keyId: c.keyId,
        createdAt: c.createdAt,
        lastUsedAt: c.lastUsedAt,
      };
    });

    return applications.map((app) => ({
      ...app.toObject(),
      activeCredential: credMap[app._id] || null,
    }));
  }

  async getApplicationById(id) {
    const application = await Application.findById(id);
    if (!application) {
      throw AppError.notFound('Application not found');
    }

    const credentials = await ApplicationCredential.find({ applicationId: id }).sort({
      createdAt: -1,
    });

    return {
      application,
      credentials: credentials.map((c) => ({
        id: c._id,
        keyId: c.keyId,
        status: c.status,
        lastUsedAt: c.lastUsedAt,
        createdAt: c.createdAt,
        revokedAt: c.revokedAt,
      })),
    };
  }

  async updateApplication(id, updates, actorContext = {}) {
    const application = await Application.findById(id);
    if (!application) {
      throw AppError.notFound('Application not found');
    }

    if (updates.name !== undefined) application.name = updates.name;
    if (updates.description !== undefined) application.description = updates.description;
    if (updates.notificationWebhookUrl !== undefined)
      application.notificationWebhookUrl = updates.notificationWebhookUrl;
    if (updates.allowedReturnUrls !== undefined)
      application.allowedReturnUrls = updates.allowedReturnUrls;
    if (updates.status !== undefined) application.status = updates.status;
    if (updates.assignedProviderConfigurations !== undefined)
      application.assignedProviderConfigurations = updates.assignedProviderConfigurations;

    await application.save();

    await auditService.log({
      action: AUDIT_ACTION.APPLICATION_UPDATED,
      actorType: 'ADMIN',
      actorId: actorContext.actorId || 'SYSTEM',
      targetType: 'APPLICATION',
      targetId: application._id,
      ipAddress: actorContext.ip,
      userAgent: actorContext.userAgent,
      metadata: updates,
    });

    return application;
  }
}

module.exports = new ApplicationsService();

