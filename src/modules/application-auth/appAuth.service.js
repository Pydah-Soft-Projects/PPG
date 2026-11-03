const crypto = require('crypto');
const Application = require('../applications/application.model');
const ApplicationCredential = require('./applicationCredential.model');
const { hashAppSecret, safeCompare } = require('../../common/crypto');
const { UnauthorizedError, NotFoundError, ForbiddenError } = require('../../common/errors');

class AppAuthService {
  /**
   * Generates a new credential pair for an application.
   * The plain secret is returned ONLY ONCE in this response.
   */
  static async createCredentials(applicationId, label = 'Primary Key') {
    const app = await Application.findById(applicationId);
    if (!app) {
      throw new NotFoundError('Application not found');
    }

    const envPrefix = app.defaultProviderEnvironment === 'LIVE' ? 'app_live' : 'app_test';
    const appKey = `${envPrefix}_${crypto.randomBytes(12).toString('hex')}`;
    const plainSecret = `sec_${crypto.randomBytes(24).toString('hex')}`;
    const secretHash = hashAppSecret(plainSecret);

    const credential = await ApplicationCredential.create({
      applicationId: app._id,
      appKey,
      secretHash,
      label,
      status: 'ACTIVE',
    });

    return {
      credentialId: credential._id,
      appKey,
      appSecret: plainSecret, // Display once!
      createdAt: credential.createdAt,
    };
  }

  /**
   * Authenticates an application from incoming request headers
   */
  static async authenticate(appKey, plainSecret) {
    if (!appKey || !plainSecret) {
      throw new UnauthorizedError('Missing X-App-Key or X-App-Secret headers');
    }

    const credential = await ApplicationCredential.findOne({ appKey, status: 'ACTIVE' });
    if (!credential) {
      throw new UnauthorizedError('Invalid application credentials');
    }

    const expectedHash = hashAppSecret(plainSecret);
    const isValid = safeCompare(credential.secretHash, expectedHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid application credentials');
    }

    const application = await Application.findById(credential.applicationId);
    if (!application) {
      throw new UnauthorizedError('Associated application no longer exists');
    }

    if (application.status !== 'ACTIVE') {
      throw new ForbiddenError(`Application is ${application.status.toLowerCase()}`);
    }

    // Update lastUsedAt asynchronously
    ApplicationCredential.updateOne({ _id: credential._id }, { lastUsedAt: new Date() }).exec();

    return {
      application,
      credential,
    };
  }

  /**
   * Revokes an existing credential and issues a replacement
   */
  static async rotateCredentials(applicationId, currentAppKey, label = 'Rotated Key') {
    const existing = await ApplicationCredential.findOne({
      applicationId,
      appKey: currentAppKey,
      status: 'ACTIVE',
    });

    if (existing) {
      existing.status = 'REVOKED';
      await existing.save();
    }

    return this.createCredentials(applicationId, label);
  }
}

module.exports = AppAuthService;

