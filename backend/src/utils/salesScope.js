'use strict';

const User = require('../models/User');

function canViewAllSales(user) {
  return Boolean(user && (user.role === 'admin' || (user.role === 'manager' && user.canViewAllSales)));
}

async function getAccessibleSalesUserIds(user, options = {}) {
  const { zoneId, isActive = true } = options;

  if (user.role === 'admin' || canViewAllSales(user)) {
    const filter = { role: 'sales' };
    if (typeof isActive === 'boolean') filter.isActive = isActive;
    if (zoneId) filter.zoneId = zoneId;
    const users = await User.find(filter).select('_id');
    return users.map((item) => item._id);
  }

  if (user.role === 'manager') {
    const filter = { managerUserId: user._id };
    if (typeof isActive === 'boolean') filter.isActive = isActive;
    if (zoneId) filter.zoneId = zoneId;
    const users = await User.find(filter).select('_id');
    return users.map((item) => item._id);
  }

  if (user.role === 'sales') return [user._id];
  return [];
}

module.exports = {
  canViewAllSales,
  getAccessibleSalesUserIds,
};
