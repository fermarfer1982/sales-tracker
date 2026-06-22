'use strict';

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

function buildScheduledDuplicateFilter({ userId, clientId, activityDate, excludeId = null }) {
  const filter = {
    userId,
    clientId,
    deletedAt: null,
    status: 'draft',
    activityDate: {
      $gte: startOfDay(activityDate),
      $lte: endOfDay(activityDate),
    },
  };

  if (excludeId) filter._id = { $ne: excludeId };
  return filter;
}

function buildScheduledCheckInMatchFilter({ userId, clientId, activityTypeId, activityDate }) {
  return {
    userId,
    clientId,
    activityTypeId,
    deletedAt: null,
    status: 'draft',
    activityDate: {
      $gte: startOfDay(activityDate),
      $lte: endOfDay(activityDate),
    },
  };
}

module.exports = { buildScheduledDuplicateFilter, buildScheduledCheckInMatchFilter };
