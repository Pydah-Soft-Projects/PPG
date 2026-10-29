const ApplicationCredential = require('../database/models/application-credential.model');
const Application = require('../database/models/application.model');
const AppError = require('../common/errors/app-error');
const ERROR_CODES = require('../common/errors/error-codes');
const { verifySecret } = require('../common/utils/crypto');

/**
 * Server-to-server Application Authentication Middleware
 * Identifies and authenticates the calling PydahSoft application backend.
 */
async function appAuthMiddleware(req, res, next) {
  try {
    const keyId = req.headers['x-app-key'];
    const secret = req.headers['x-app-secret'];

    if (!keyId || !secret) {
      return next(
        new AppError(
          'Missing application authentication credentials (X-App-Key and X-App-Secret required)',
          401,
          ERROR_CODES.UNAUTHORIZED
        )
      );
    }

    // Find active credential
    const credential = await ApplicationCredential.findOne({
      keyId,
      status: 'ACTIVE',
    });

    if (!credential) {
      return next(
        new AppError('Invalid application credentials', 401, ERROR_CODES.UNAUTHORIZED)
      );
    }

    // Verify secret
    const isValid = verifySecret(secret, credential.hashedSecret);
    if (!isValid) {
      return next(
        new AppError('Invalid application credentials', 401, ERROR_CODES.UNAUTHORIZED)
      );
    }

    // Fetch parent application
    const application = await Application.findById(credential.applicationId);
    if (!application || application.status !== 'ACTIVE') {
      return next(
        new AppError('Application is deactivated or not found', 403, ERROR_CODES.FORBIDDEN)
      );
    }

    // Update credential last used timestamp asynchronously
    ApplicationCredential.updateOne(
      { _id: credential._id },
      { $set: { lastUsedAt: new Date() } }
    ).exec();

    // Attach verified application identity to request
    req.application = application;
    req.applicationCredential = credential;

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = appAuthMiddleware;

