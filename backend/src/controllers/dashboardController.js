'use strict';

const Activity = require('../models/Activity');
const User = require('../models/User');
const Client = require('../models/Client');
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

async function getKpis(req, res) {
  try {
    const { from, to } = req.query;
    const start = from ? startOfDay(from) : startOfDay(new Date());
    const end = to ? endOfDay(to) : endOfDay(new Date());

    let userFilter = { isActive: true };
    if (req.user.role === 'manager') userFilter.managerUserId = req.user._id;

    const users = await User.find(userFilter).select('_id name');
    const userIds = users.map(u => u._id);

    const [activities, newClients] = await Promise.all([
      Activity.find({ userId: { $in: userIds }, activityDate: { $gte: start, $lte: end }, deletedAt: null }),
      Client.countDocuments({ createdBy: { $in: userIds }, createdAt: { $gte: start, $lte: end }, deletedAt: null }),
    ]);

    const completed = activities.filter(a => a.status === 'completed');
    const totalDuration = completed.reduce((s, a) => s + (a.durationMinutes || 0), 0);

    return apiResponse(res, 200, {
      totalUsers: userIds.length,
      totalActivities: activities.length,
      completedActivities: completed.length,
      completionRate: activities.length > 0 ? ((completed.length / activities.length) * 100).toFixed(1) : 0,
      totalDurationMinutes: totalDuration,
      newClients,
    });
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function getMissing(req, res) {
  try {
    const { date } = req.query;
    const day = date ? startOfDay(date) : startOfDay(new Date());
    const endDay = endOfDay(date || new Date());

    let userFilter = { isActive: true, role: 'sales' };
    if (req.user.role === 'manager') userFilter.managerUserId = req.user._id;

    const users = await User.find(userFilter).select('_id name email');
    const activities = await Activity.find({
      userId: { $in: users.map(u => u._id) },
      activityDate: { $gte: day, $lte: endDay },
      deletedAt: null,
    }).select('userId status');

    const missing = users.filter(u => {
      const userActs = activities.filter(a => String(a.userId) === String(u._id));
      return !userActs.some(a => a.status === 'completed');
    });
    return apiResponse(res, 200, missing);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function getCommercialStatus(req, res) {
  try {
    const { date } = req.query;
    const day = date ? startOfDay(date) : startOfDay(new Date());
    const endDay = endOfDay(date || new Date());

    let userFilter = { isActive: true, role: 'sales' };
    if (req.user.role === 'manager') userFilter.managerUserId = req.user._id;

    const users = await User.find(userFilter).select('_id name email');
    const activities = await Activity.find({
      userId: { $in: users.map(u => u._id) },
      activityDate: { $gte: day, $lte: endDay },
      deletedAt: null,
    }).select('userId status activityDate');

    const result = users.map(u => {
      const userActs = activities.filter(a => String(a.userId) === String(u._id));
      let status = 'red';
      if (userActs.some(a => a.status === 'completed')) status = 'green';
      else if (userActs.length > 0) status = 'yellow';
      return { user: { _id: u._id, name: u.name, email: u.email }, status, activityCount: userActs.length };
    });
    return apiResponse(res, 200, result);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

module.exports = { getKpis, getMissing, getCommercialStatus };
