const PaymentTransaction = require('../../database/models/payment-transaction.model');
const Refund = require('../../database/models/refund.model');
const { PAYMENT_STATUS } = require('../../config/constants');

class ReportsService {
  async getOverviewStats() {
    const [statusCounts, totalRefunded, recentTransactions] = await Promise.all([
      PaymentTransaction.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
          },
        },
      ]),
      Refund.aggregate([
        { $match: { status: 'SUCCEEDED' } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      PaymentTransaction.find().sort({ createdAt: -1 }).limit(10),
    ]);

    let totalVolumePaise = 0;
    let succeededVolumePaise = 0;
    let succeededCount = 0;
    let pendingCount = 0;
    let failedCount = 0;
    let createdCount = 0;

    statusCounts.forEach((sc) => {
      totalVolumePaise += sc.totalAmount;
      if (sc._id === PAYMENT_STATUS.SUCCEEDED) {
        succeededVolumePaise = sc.totalAmount;
        succeededCount = sc.count;
      } else if (sc._id === PAYMENT_STATUS.PENDING) {
        pendingCount = sc.count;
      } else if (sc._id === PAYMENT_STATUS.FAILED) {
        failedCount = sc.count;
      } else if (sc._id === PAYMENT_STATUS.CREATED) {
        createdCount = sc.count;
      }
    });

    const refundedPaise = totalRefunded[0]?.totalAmount || 0;
    const refundedCount = totalRefunded[0]?.count || 0;
    const netVolumePaise = succeededVolumePaise - refundedPaise;

    return {
      totals: {
        totalVolumePaise,
        succeededVolumePaise,
        refundedPaise,
        netVolumePaise,
      },
      counts: {
        succeeded: succeededCount,
        pending: pendingCount,
        failed: failedCount,
        created: createdCount,
        refunded: refundedCount,
      },
      recentTransactions,
    };
  }

  async getTransactionsList({
    applicationId,
    status,
    providerConfigurationId,
    businessReference,
    collegeCode,
    courseCode,
    search,
    page = 1,
    limit = 20,
  }) {
    const filter = {};
    if (applicationId) filter.applicationId = applicationId;
    if (status) filter.status = status;
    if (providerConfigurationId) filter.providerConfigurationId = providerConfigurationId;
    if (collegeCode) filter['college.code'] = collegeCode;
    if (courseCode) filter['course.code'] = courseCode;
    if (businessReference) filter.businessReference = new RegExp(businessReference, 'i');
    if (search) {
      filter.$or = [
        { _id: search },
        { businessReference: new RegExp(search, 'i') },
        { providerOrderId: search },
        { providerPaymentId: search },
        { 'customer.email': new RegExp(search, 'i') },
        { 'customer.name': new RegExp(search, 'i') },
        { 'college.code': new RegExp(search, 'i') },
        { 'college.name': new RegExp(search, 'i') },
        { 'course.code': new RegExp(search, 'i') },
        { 'course.name': new RegExp(search, 'i') },
      ];
    }

    const skip = (Math.max(1, page) - 1) * limit;

    const [transactions, total] = await Promise.all([
      PaymentTransaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      PaymentTransaction.countDocuments(filter),
    ]);

    return {
      transactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new ReportsService();

