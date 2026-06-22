'use strict';

function normalizeId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  return String(value);
}

function isSales(user) {
  return user && user.role === 'sales';
}

function hasSalesZone(user) {
  return Boolean(normalizeId(user?.zoneId));
}

function hasZoneAccessToClient(user, client) {
  if (!isSales(user)) return true;
  const userZoneId = normalizeId(user.zoneId);
  const clientZoneId = normalizeId(client?.zoneId);
  if (!userZoneId || !clientZoneId) return false;
  return userZoneId === clientZoneId;
}

function applyClientZoneFilterForUser(user, filter = {}) {
  if (!isSales(user)) return { ...filter };
  const userZoneId = normalizeId(user.zoneId);
  if (!userZoneId) return { ...filter, _id: null };
  return { ...filter, zoneId: userZoneId };
}

module.exports = {
  isSales,
  hasSalesZone,
  hasZoneAccessToClient,
  applyClientZoneFilterForUser,
};
