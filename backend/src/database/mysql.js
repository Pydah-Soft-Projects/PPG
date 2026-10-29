let mysql;
try {
  mysql = require('mysql2/promise');
} catch {
  mysql = null;
}

const env = require('../config/env');
const { logger } = require('../common/logger/logger');

let pool = null;

function getPool() {
  if (!pool && mysql) {
    if (!env.MYSQL.password) {
      logger.warn('MySQL DB_PASSWORD not set in .env. College/course direct queries will be disabled until configured.');
      return null;
    }

    try {
      pool = mysql.createPool({
        host: env.MYSQL.host,
        port: env.MYSQL.port,
        user: env.MYSQL.user,
        password: env.MYSQL.password,
        database: env.MYSQL.database,
        ssl: env.MYSQL.ssl,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 8000,
      });

      logger.info('Initialized MySQL connection pool for Student Database', {
        host: env.MYSQL.host,
        database: env.MYSQL.database,
      });
    } catch (err) {
      logger.error('Failed to create MySQL pool', { error: err.message });
      pool = null;
    }
  }
  return pool;
}

const mysqlDb = {
  /**
   * Fetches active colleges from MySQL
   */
  async getColleges() {
    const p = getPool();
    if (!p) return [];

    try {
      // Intentionally omitting heavy longblob image fields (header_image, footer_image) for high performance
      const [rows] = await p.query(
        'SELECT id, name, code, address, website, contact, is_active, created_at, updated_at FROM colleges WHERE is_active = 1 ORDER BY name ASC'
      );
      return rows;
    } catch (error) {
      logger.error('MySQL query error (getColleges)', { error: error.message });
      throw new Error(`Failed to fetch colleges from Student Database: ${error.message}`);
    }
  },

  /**
   * Fetches active courses for a specific college (or all courses)
   */
  async getCourses(collegeId = null) {
    const p = getPool();
    if (!p) return [];

    try {
      let query = 'SELECT id, college_id, name, code, level, total_years, semesters_per_year, is_active, created_at, updated_at FROM courses WHERE is_active = 1';
      const params = [];

      if (collegeId) {
        query += ' AND college_id = ?';
        params.push(collegeId);
      }
      query += ' ORDER BY name ASC';

      const [rows] = await p.query(query, params);
      return rows;
    } catch (error) {
      logger.error('MySQL query error (getCourses)', { error: error.message });
      throw new Error(`Failed to fetch courses from Student Database: ${error.message}`);
    }
  },

  /**
   * Finds college by code or id
   */
  async findCollege(identifier) {
    const p = getPool();
    if (!p) return null;

    try {
      const isNum = !isNaN(identifier) && Number.isInteger(Number(identifier));
      const query = isNum
        ? 'SELECT id, name, code FROM colleges WHERE id = ? LIMIT 1'
        : 'SELECT id, name, code FROM colleges WHERE code = ? LIMIT 1';

      const [rows] = await p.query(query, [identifier]);
      return rows[0] || null;
    } catch (error) {
      logger.warn('MySQL lookup error (findCollege)', { error: error.message, identifier });
      return null;
    }
  },

  /**
   * Finds course by code or id
   */
  async findCourse(identifier, collegeId = null) {
    const p = getPool();
    if (!p) return null;

    try {
      const isNum = !isNaN(identifier) && Number.isInteger(Number(identifier));
      let query = isNum
        ? 'SELECT id, college_id, name, code, level FROM courses WHERE id = ?'
        : 'SELECT id, college_id, name, code, level FROM courses WHERE code = ?';
      const params = [identifier];

      if (collegeId) {
        query += ' AND college_id = ?';
        params.push(collegeId);
      }
      query += ' LIMIT 1';

      const [rows] = await p.query(query, params);
      return rows[0] || null;
    } catch (error) {
      logger.warn('MySQL lookup error (findCourse)', { error: error.message, identifier });
      return null;
    }
  },
};

module.exports = mysqlDb;

