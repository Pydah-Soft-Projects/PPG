const axios = require('axios');
const Application = require('../../database/models/application.model');
const PaymentNotification = require('../../database/models/payment-notification.model');
const { NOTIFICATION_STATUS } = require('../../config/constants');
const { generateHmacSignature } = require('../../common/utils/crypto');
const env = require('../../config/env');
const { logger } = require('../../common/logger/logger');
const AppError = require('../../common/errors/app-error');

const RETRY_DELAYS_MS = [60 * 1000, 5 * 60 * 1000, 15 * 60 * 1000, 60 * 60 * 1000];

class NotificationsService {
  /**
   * Dispatches or schedules an outbound webhook notification to the application
   */
  async notifyPaymentEvent(payment, eventType = 'payment.updated') {
    try {
      const application = await Application.findById(payment.applicationId);
      if (!application || !application.notificationWebhookUrl) {
        logger.info('No webhook URL configured for application, skipping notification', {
          applicationId: payment.applicationId,
          paymentId: payment._id,
        });
        return null;
      }

      const payload = {
        event: eventType,
        timestamp: new Date().toISOString(),
        data: {
          paymentId: payment._id,
          businessReference: payment.businessReference,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          provider: payment.provider,
          providerPaymentId: payment.providerPaymentId || null,
          paidAt: payment.paidAt || null,
        },
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateHmacSignature(
        payloadString,
        env.NOTIFICATION_SIGNING_SECRET
      );

      const notification = await PaymentNotification.create({
        paymentId: payment._id,
        applicationId: payment.applicationId,
        eventType,
        destinationUrl: application.notificationWebhookUrl,
        payload,
        signature: `t=${Date.now()},v1=${signature}`,
        status: NOTIFICATION_STATUS.PENDING,
        attemptsCount: 0,
      });

      // Attempt immediate delivery
      return await this.deliverNotification(notification._id);
    } catch (error) {
      logger.error('Failed to initialize payment notification', {
        error: error.message,
        paymentId: payment._id,
      });
      return null;
    }
  }

  /**
   * Executes HTTP delivery attempt for a stored notification
   */
  async deliverNotification(notificationId) {
    const notification = await PaymentNotification.findById(notificationId);
    if (!notification) return null;

    notification.attemptsCount += 1;
    notification.lastAttemptAt = new Date();

    try {
      const response = await axios.post(
        notification.destinationUrl,
        notification.payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-PPG-Signature': notification.signature,
            'User-Agent': 'Pydah-Payment-Gateway-Notifier/1.0',
          },
          timeout: 5000,
        }
      );

      notification.status = NOTIFICATION_STATUS.DELIVERED;
      notification.responseStatus = response.status;
      notification.responseBody =
        typeof response.data === 'string'
          ? response.data.slice(0, 500)
          : JSON.stringify(response.data).slice(0, 500);
      notification.nextRetryAt = null;

      logger.info('Notification delivered successfully', {
        notificationId: notification._id,
        destinationUrl: notification.destinationUrl,
      });
    } catch (error) {
      notification.status = NOTIFICATION_STATUS.FAILED;
      notification.responseStatus = error.response ? error.response.status : 0;
      notification.responseBody = error.message.slice(0, 500);

      const attemptIndex = notification.attemptsCount - 1;
      if (attemptIndex < RETRY_DELAYS_MS.length) {
        notification.nextRetryAt = new Date(Date.now() + RETRY_DELAYS_MS[attemptIndex]);
      } else {
        notification.nextRetryAt = null; // Reached maximum automated retries
      }

      logger.warn('Notification delivery failed', {
        notificationId: notification._id,
        error: error.message,
        nextRetryAt: notification.nextRetryAt,
      });
    }

    await notification.save();
    return notification;
  }

  async retry(notificationId) {
    const notification = await PaymentNotification.findById(notificationId);
    if (!notification) {
      throw AppError.notFound('Notification record not found');
    }
    return this.deliverNotification(notificationId);
  }

  async listNotifications({ paymentId, applicationId, status, page = 1, limit = 50 }) {
    const filter = {};
    if (paymentId) filter.paymentId = paymentId;
    if (applicationId) filter.applicationId = applicationId;
    if (status) filter.status = status;

    const skip = (Math.max(1, page) - 1) * limit;

    const [items, total] = await Promise.all([
      PaymentNotification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      PaymentNotification.countDocuments(filter),
    ]);

    return {
      notifications: items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new NotificationsService();

