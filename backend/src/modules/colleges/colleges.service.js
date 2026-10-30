const mysqlDb = require('../../database/mysql');
const CollegeRouting = require('../../database/models/college-routing.model');
const ProviderConfiguration = require('../../database/models/provider-configuration.model');
const AppError = require('../../common/errors/app-error');
const ERROR_CODES = require('../../common/errors/error-codes');
const { logger } = require('../../common/logger/logger');
const env = require('../../config/env');

class CollegesService {
  /**
   * Check connection status to MySQL RDS
   */
  async getDbStatus() {
    const hasPassword = Boolean(env.MYSQL.password);
    if (!hasPassword) {
      return {
        configured: false,
        connected: false,
        host: env.MYSQL.host,
        database: env.MYSQL.database,
        message: 'MySQL DB_PASSWORD is not set in backend/.env. Direct RDS query is inactive.',
      };
    }

    try {
      const colleges = await mysqlDb.getColleges();
      return {
        configured: true,
        connected: true,
        host: env.MYSQL.host,
        database: env.MYSQL.database,
        totalColleges: colleges.length,
        message: 'Connected to AWS RDS student database successfully.',
      };
    } catch (err) {
      return {
        configured: true,
        connected: false,
        host: env.MYSQL.host,
        database: env.MYSQL.database,
        message: `Failed to query RDS MySQL: ${err.message}`,
      };
    }
  }

  /**
   * Fetch active colleges from RDS MySQL
   */
  async listColleges() {
    try {
      const colleges = await mysqlDb.getColleges();
      return colleges;
    } catch (err) {
      logger.warn('Could not query colleges from MySQL', { error: err.message });
      return [];
    }
  }

  /**
   * Fetch courses for a specific college (or all courses) from RDS MySQL
   */
  async listCourses(collegeId = null) {
    try {
      const courses = await mysqlDb.getCourses(collegeId);
      return courses;
    } catch (err) {
      logger.warn('Could not query courses from MySQL', { error: err.message, collegeId });
      return [];
    }
  }

  /**
   * List all configured college & course routing rules
   */
  async listRoutingRules() {
    const rules = await CollegeRouting.find()
      .populate('providerConfigurationId', 'name accountNumber provider environment status keyId')
      .populate('applicationId', 'name code')
      .sort({ collegeName: 1, courseName: 1 });
    return rules;
  }

  /**
   * Upsert a single college/course payment routing rule
   */
  async upsertRoutingRule({
    applicationId = null,
    collegeId,
    collegeCode,
    collegeName,
    courseId = null,
    courseCode = null,
    courseName = null,
    providerConfigurationId,
    status = 'ACTIVE',
    notes = '',
  }) {
    const cleanProviderConfigId = String(providerConfigurationId || '').trim();
    const providerConfig = await ProviderConfiguration.findById(cleanProviderConfigId);
    if (!providerConfig) {
      throw AppError.notFound(`Payment Account '${cleanProviderConfigId}' not found`, ERROR_CODES.PROVIDER_NOT_FOUND);
    }

    const cleanCourseCode = courseCode ? courseCode.trim() : null;
    const cleanCourseId = courseId !== undefined && courseId !== null ? Number(courseId) : null;
    const cleanCollegeCode = collegeCode.trim();
    const cleanAppId = applicationId ? String(applicationId).trim() : null;

    const filter = {
      applicationId: cleanAppId,
      collegeCode: cleanCollegeCode,
      courseCode: cleanCourseCode,
    };

    const update = {
      applicationId: cleanAppId,
      collegeId: Number(collegeId),
      collegeCode: cleanCollegeCode,
      collegeName: collegeName.trim(),
      courseId: cleanCourseId,
      courseCode: cleanCourseCode,
      courseName: courseName ? courseName.trim() : null,
      providerConfigurationId,
      status,
      notes: notes || '',
    };

    const rule = await CollegeRouting.findOneAndUpdate(filter, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    })
      .populate('providerConfigurationId', 'name accountNumber provider environment status')
      .populate('applicationId', 'name code');

    logger.info('Upserted college routing rule', {
      ruleId: rule._id,
      applicationId: cleanAppId,
      collegeCode: cleanCollegeCode,
      courseCode: cleanCourseCode,
      providerConfigurationId,
    });

    return rule;
  }

  /**
   * Batch upsert routing rules for multiple selected colleges and courses
   */
  async batchUpsertRoutingRules({
    applicationId = null,
    colleges = [],
    courses = [],
    providerConfigurationId,
    status = 'ACTIVE',
    notes = '',
  }) {
    const cleanProviderConfigId = String(providerConfigurationId || '').trim();
    const providerConfig = await ProviderConfiguration.findById(cleanProviderConfigId);
    if (!providerConfig) {
      throw AppError.notFound(`Payment Account '${cleanProviderConfigId}' not found`, ERROR_CODES.PROVIDER_NOT_FOUND);
    }

    const createdRules = [];
    const cleanAppId = applicationId ? String(applicationId).trim() : null;

    for (const college of colleges) {
      // Find courses selected that belong to this college
      const collegeCourses = courses.filter(
        (c) => !c.collegeId || Number(c.collegeId) === Number(college.id)
      );

      if (collegeCourses.length > 0) {
        // Create rule for each selected course
        for (const course of collegeCourses) {
          const rule = await this.upsertRoutingRule({
            applicationId: cleanAppId,
            collegeId: college.id,
            collegeCode: college.code,
            collegeName: college.name,
            courseId: course.id,
            courseCode: course.code,
            courseName: course.name,
            providerConfigurationId,
            status,
            notes,
          });
          createdRules.push(rule);
        }
      } else {
        // Create college-wide rule (all courses)
        const rule = await this.upsertRoutingRule({
          applicationId: cleanAppId,
          collegeId: college.id,
          collegeCode: college.code,
          collegeName: college.name,
          courseId: null,
          courseCode: null,
          courseName: null,
          providerConfigurationId,
          status,
          notes,
        });
        createdRules.push(rule);
      }
    }

    return createdRules;
  }

  /**
   * Update an existing routing rule (e.g. status, provider, notes)
   */
  async updateRoutingRule(id, updates) {
    const rule = await CollegeRouting.findById(id);
    if (!rule) {
      throw AppError.notFound('Routing rule not found', ERROR_CODES.NOT_FOUND);
    }

    // Application is intentionally immutable during edit (cannot be changed)

    if (updates.collegeCode && updates.collegeName) {
      rule.collegeId = updates.collegeId ? Number(updates.collegeId) : rule.collegeId;
      rule.collegeCode = updates.collegeCode.trim();
      rule.collegeName = updates.collegeName.trim();
    }

    if (updates.courseScope === 'ALL' || updates.courseCode === null) {
      rule.courseId = null;
      rule.courseCode = null;
      rule.courseName = null;
    } else if (updates.courseCode) {
      rule.courseId = updates.courseId ? Number(updates.courseId) : null;
      rule.courseCode = updates.courseCode.trim();
      rule.courseName = updates.courseName ? updates.courseName.trim() : null;
    }

    if (updates.providerConfigurationId) {
      const cleanProvId = String(updates.providerConfigurationId).trim();
      const prov = await ProviderConfiguration.findById(cleanProvId);
      if (!prov) {
        throw AppError.notFound(`Payment Account '${cleanProvId}' not found`, ERROR_CODES.PROVIDER_NOT_FOUND);
      }
      rule.providerConfigurationId = cleanProvId;
    }
    if (updates.status) {
      rule.status = updates.status;
    }
    if (updates.notes !== undefined) {
      rule.notes = updates.notes;
    }

    await rule.save();

    const populated = await CollegeRouting.findById(rule._id)
      .populate('providerConfigurationId', 'name accountNumber provider environment status keyId')
      .populate('applicationId', 'name code');

    logger.info('Updated college routing rule', { ruleId: rule._id, status: rule.status });
    return populated;
  }

  /**
   * Delete a routing rule
   */
  async deleteRoutingRule(id) {
    const deleted = await CollegeRouting.findByIdAndDelete(id);
    if (!deleted) {
      throw AppError.notFound('Routing rule not found', ERROR_CODES.NOT_FOUND);
    }
    return { success: true, message: 'Routing rule deleted successfully' };
  }

  /**
   * Resolve provider configuration for a college and course
   * Hierarchy:
   * 1. Application-specific Course Rule
   * 2. Global Course Rule (applicationId: null)
   * 3. Application-specific College-Wide Rule
   * 4. Global College-Wide Rule (applicationId: null)
   * 5. Null (fallback to application default)
   */
  async resolveProviderConfiguration({ applicationId = null, collegeIdentifier, courseIdentifier }) {
    if (!collegeIdentifier) return null;

    let collegeCode = typeof collegeIdentifier === 'string' ? collegeIdentifier.trim() : null;
    let collegeId = typeof collegeIdentifier === 'number' ? collegeIdentifier : null;

    let courseCode = typeof courseIdentifier === 'string' ? courseIdentifier.trim() : null;
    let courseId = typeof courseIdentifier === 'number' ? courseIdentifier : null;

    let collegeMeta = null;
    let courseMeta = null;

    try {
      collegeMeta = await mysqlDb.findCollege(collegeIdentifier);
      if (collegeMeta) {
        collegeCode = collegeMeta.code;
        collegeId = collegeMeta.id;
      }
    } catch {
      // MySQL error or offline - ignore
    }

    if (courseIdentifier) {
      try {
        courseMeta = await mysqlDb.findCourse(courseIdentifier, collegeId);
        if (courseMeta) {
          courseCode = courseMeta.code;
          courseId = courseMeta.id;
        }
      } catch {
        // MySQL error or offline
      }
    }

    const appIdsToTry = applicationId ? [applicationId, null] : [null];

    // 1. If specific course was requested, check ONLY for that course's routing rule
    if (courseCode || courseId) {
      for (const appId of appIdsToTry) {
        const courseQuery = {
          status: 'ACTIVE',
          applicationId: appId,
          $or: [
            ...(collegeCode ? [{ collegeCode }] : []),
            ...(collegeId ? [{ collegeId }] : []),
          ],
          $and: [
            {
              $or: [
                ...(courseCode ? [{ courseCode }] : []),
                ...(courseId ? [{ courseId }] : []),
              ],
            },
          ],
        };

        const courseRule = await CollegeRouting.findOne(courseQuery);
        if (courseRule) {
          logger.info('Resolved provider config via College+Course rule', {
            applicationId: appId,
            collegeCode,
            courseCode,
            providerConfigId: courseRule.providerConfigurationId,
          });
          return {
            providerConfigurationId: courseRule.providerConfigurationId,
            college: collegeMeta || { id: collegeId, code: collegeCode, name: courseRule.collegeName },
            course: courseMeta || { id: courseId, code: courseCode, name: courseRule.courseName },
          };
        }
      }

      // Explicit rule: If course is specified but no account is configured for that course,
      // STOP HERE! Do not check or fall back to college-wide account.
      logger.warn('Course specified in payment but no payment account configured for this course. Stopping resolution.', {
        collegeCode,
        courseCode: courseCode || courseId,
      });
      return {
        courseRoutingMissing: true,
        college: collegeMeta || (collegeCode ? { id: collegeId, code: collegeCode } : null),
        course: courseMeta || (courseCode ? { id: courseId, code: courseCode } : null),
      };
    }

    // 2. Only check College-Wide rule when NO specific course was requested (college-only payments)
    for (const appId of appIdsToTry) {
      const collegeQuery = {
        status: 'ACTIVE',
        applicationId: appId,
        courseCode: null,
        $or: [
          ...(collegeCode ? [{ collegeCode }] : []),
          ...(collegeId ? [{ collegeId }] : []),
        ],
      };

      const collegeRule = await CollegeRouting.findOne(collegeQuery);
      if (collegeRule) {
        logger.info('Resolved provider config via College-Wide rule', {
          applicationId: appId,
          collegeCode,
          providerConfigId: collegeRule.providerConfigurationId,
        });
        return {
          providerConfigurationId: collegeRule.providerConfigurationId,
          college: collegeMeta || { id: collegeId, code: collegeCode, name: collegeRule.collegeName },
          course: courseMeta || (courseCode ? { id: courseId, code: courseCode } : null),
        };
      }
    }

    return {
      providerConfigurationId: null,
      college: collegeMeta || (collegeCode ? { id: collegeId, code: collegeCode } : null),
      course: courseMeta || (courseCode ? { id: courseId, code: courseCode } : null),
    };
  }
}

module.exports = new CollegesService();
