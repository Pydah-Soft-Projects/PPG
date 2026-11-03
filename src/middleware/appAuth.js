const AppAuthService = require('../modules/application-auth/appAuth.service');
const { UnauthorizedError, ForbiddenError } = require('../common/errors');

async function appAuthMiddleware(req, res, next) {
  try {
    const appKey = req.headers['x-app-key'];
    const appSecret = req.headers['x-app-secret'];

    if (!appKey || !appSecret) {
      throw new UnauthorizedError('Authentication required: X-App-Key and X-App-Secret headers must be provided');
    }

    const { application, credential } = await AppAuthService.authenticate(appKey, appSecret);

    // Prevent body-level applicationId impersonation
    if (req.body && req.body.applicationId) {
      if (req.body.applicationId.toString() !== application._id.toString()) {
        throw new ForbiddenError('Mismatched applicationId in request body. Derived identity takes precedence.');
      }
    }

    // Attach authenticated application context
    req.application = application;
    req.credential = credential;

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = appAuthMiddleware;

