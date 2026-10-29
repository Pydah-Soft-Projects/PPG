const collegesService = require('./colleges.service');

class CollegesController {
  async getDbStatus(req, res, next) {
    try {
      const status = await collegesService.getDbStatus();
      res.json({ success: true, data: status });
    } catch (err) {
      next(err);
    }
  }

  async listColleges(req, res, next) {
    try {
      const colleges = await collegesService.listColleges();
      res.json({ success: true, data: colleges });
    } catch (err) {
      next(err);
    }
  }

  async listCourses(req, res, next) {
    try {
      const { collegeId } = req.params;
      const courses = await collegesService.listCourses(collegeId ? Number(collegeId) : null);
      res.json({ success: true, data: courses });
    } catch (err) {
      next(err);
    }
  }

  async listRoutingRules(req, res, next) {
    try {
      const rules = await collegesService.listRoutingRules();
      res.json({ success: true, data: rules });
    } catch (err) {
      next(err);
    }
  }

  async upsertRoutingRule(req, res, next) {
    try {
      const rule = await collegesService.upsertRoutingRule(req.body);
      res.status(200).json({
        success: true,
        message: 'College routing rule saved successfully',
        data: rule,
      });
    } catch (err) {
      next(err);
    }
  }

  async batchUpsertRoutingRules(req, res, next) {
    try {
      const rules = await collegesService.batchUpsertRoutingRules(req.body);
      res.status(200).json({
        success: true,
        message: `Successfully configured ${rules.length} routing rule(s)`,
        data: rules,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteRoutingRule(req, res, next) {
    try {
      const { id } = req.params;
      const result = await collegesService.deleteRoutingRule(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CollegesController();
