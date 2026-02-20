'use strict';

const AuditLog = require('../models/AuditLog');
const { apiResponse, apiError } = require('../utils/response');

async function listAudit(req, res) {
  try {
    const { entity, userId, from, to, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (entity) filter.entityName = entity;
    if (userId) filter.userId = userId;
    if (from || to) {
      filter.at = {};
      if (from) filter.at.$gte = new Date(from);
      if (to) filter.at.$lte = new Date(to + 'T23:59:59');
    }
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ at: -1 }).skip(skip).limit(parseInt(limit, 10))
        .populate('userId', 'name email'),
      AuditLog.countDocuments(filter),
    ]);
    return apiResponse(res, 200, logs, { total, page: parseInt(page, 10), limit: parseInt(limit, 10), pages: Math.ceil(total / parseInt(limit, 10)) });
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

module.exports = { listAudit };
