'use strict';

const Activity = require('../models/Activity');
const User = require('../models/User');
const { apiResponse, apiError } = require('../utils/response');

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

async function getUserIds(req) {
  if (req.user.role === 'sales') return [req.user._id];
  if (req.user.role === 'manager') {
    const members = await User.find({ managerUserId: req.user._id, isActive: true }).select('_id');
    return members.map(u => u._id);
  }
  const all = await User.find({ isActive: true }).select('_id');
  return all.map(u => u._id);
}

async function complianceStatus(userId, date) {
  const activities = await Activity.find({
    userId,
    activityDate: { $gte: startOfDay(date), $lte: endOfDay(date) },
    deletedAt: null,
  });
  if (activities.some(a => a.status === 'completed')) return 'green';
  if (activities.length > 0) return 'yellow';
  return 'red';
}

async function getToday(req, res) {
  try {
    const today = new Date();
    const userIds = await getUserIds(req);
    const users = await User.find({ _id: { $in: userIds }, isActive: true }).select('name email role');
    const result = await Promise.all(
      users.map(async (u) => ({
        user: { _id: u._id, name: u.name, email: u.email },
        status: await complianceStatus(u._id, today),
      }))
    );
    return apiResponse(res, 200, result);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function getRange(req, res) {
  try {
    const { from, to } = req.query;
    if (!from || !to) return apiError(res, 422, 'Parámetros from y to requeridos');
    const userIds = await getUserIds(req);
    const users = await User.find({ _id: { $in: userIds }, isActive: true }).select('name email');

    const start = startOfDay(from);
    const end = endOfDay(to);
    const activities = await Activity.find({
      userId: { $in: userIds },
      activityDate: { $gte: start, $lte: end },
      deletedAt: null,
    }).select('userId activityDate status');

    const result = users.map((u) => {
      const userActs = activities.filter(a => String(a.userId) === String(u._id));
      const byDate = {};
      const cursor = new Date(start);
      while (cursor <= end) {
        const key = cursor.toISOString().split('T')[0];
        const dayActs = userActs.filter(a => a.activityDate.toISOString().split('T')[0] === key);
        if (dayActs.some(a => a.status === 'completed')) byDate[key] = 'green';
        else if (dayActs.length > 0) byDate[key] = 'yellow';
        else byDate[key] = 'red';
        cursor.setDate(cursor.getDate() + 1);
      }
      return { user: { _id: u._id, name: u.name, email: u.email }, days: byDate };
    });
    return apiResponse(res, 200, result);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function getKpis(req, res) {
  try {
    const { from, to, scope = 'my' } = req.query;
    const start = from ? startOfDay(from) : startOfDay(new Date());
    const end = to ? endOfDay(to) : endOfDay(new Date());

    let userIds;
    if (scope === 'my' || req.user.role === 'sales') {
      userIds = [req.user._id];
    } else if (scope === 'team' || req.user.role === 'manager') {
      const members = await User.find({ managerUserId: req.user._id, isActive: true }).select('_id');
      userIds = members.map(u => u._id);
    } else {
      const all = await User.find({ isActive: true }).select('_id');
      userIds = all.map(u => u._id);
    }

    const activities = await Activity.find({
      userId: { $in: userIds },
      activityDate: { $gte: start, $lte: end },
      deletedAt: null,
    }).populate('activityTypeId', 'name');

    const completed = activities.filter(a => a.status === 'completed');
    const totalDurationMinutes = completed.reduce((s, a) => s + (a.durationMinutes || 0), 0);
    const byType = {};
    completed.forEach(a => {
      const typeName = a.activityTypeId ? a.activityTypeId.name : 'Sin tipo';
      byType[typeName] = (byType[typeName] || 0) + 1;
    });

    return apiResponse(res, 200, {
      totalActivities: activities.length,
      completedActivities: completed.length,
      totalDurationMinutes,
      byType,
    });
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

module.exports = { getToday, getRange, getKpis, complianceStatus };
