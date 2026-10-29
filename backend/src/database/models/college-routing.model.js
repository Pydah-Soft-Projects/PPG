const mongoose = require('mongoose');
const { generateId } = require('../../common/utils/id');

const collegeRoutingSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => generateId('crt', 16),
    },
    applicationId: {
      type: String,
      ref: 'Application',
      default: null,
      index: true,
    },
    collegeId: {
      type: Number,
      required: true,
      index: true,
    },
    collegeCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    collegeName: {
      type: String,
      required: true,
      trim: true,
    },
    courseId: {
      type: Number,
      default: null,
      index: true,
    },
    courseCode: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    courseName: {
      type: String,
      trim: true,
      default: null,
    },
    providerConfigurationId: {
      type: String,
      required: true,
      ref: 'ProviderConfiguration',
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

// Unique routing rule: a specific application + college + course mapping
collegeRoutingSchema.index({ applicationId: 1, collegeCode: 1, courseCode: 1 }, { unique: true });

const CollegeRouting = mongoose.model('CollegeRouting', collegeRoutingSchema);

module.exports = CollegeRouting;

