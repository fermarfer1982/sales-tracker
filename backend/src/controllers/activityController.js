'use strict';

const mongoose = require('mongoose');
const Activity = require('../models/Activity');
const Client = require('../models/Client');
const AppSetting = require('../models/AppSetting');
const { haversineDistance } = require('../utils/haversine');
const { apiResponse, apiError } = require('../utils/response');
const { audit } = require('../utils/audit');
const { hasZoneAccessToClient, hasSalesZone, isSales } = require('../utils/zoneAccess');

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


function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value));
}

async function getGeofenceRadius() {
  const setting = await AppSetting.findOne({ key: 'geofenceRadiusMeters' });
  return setting ? Number(setting.value) : 300;
}


async function validateSalesClientZone(user, clientId) {
  if (!isSales(user)) return null;
  if (!hasSalesZone(user)) return { ok: false, code: 422, message: 'Tu usuario comercial no tiene zona asignada' };
  const client = await Client.findOne({ _id: clientId, deletedAt: null }).select('zoneId');
  if (!client) return { ok: false, code: 404, message: 'Cliente no encontrado' };
  if (!hasZoneAccessToClient(user, client)) {
    return { ok: false, code: 403, message: 'No autorizado para registrar actividad en clientes fuera de tu zona' };
  }
  return { ok: true, client };
}

async function checkIn(req, res) {
  try {
    const { clientId, activityTypeId, activityDate, geo } = req.body;
    const zoneValidation = await validateSalesClientZone(req.user, clientId);
    if (zoneValidation && !zoneValidation.ok) return apiError(res, zoneValidation.code, zoneValidation.message);
    const activity = await Activity.create({
      userId: req.user._id,
      clientId,
      activityTypeId,
      activityDate: new Date(activityDate),
      status: 'in_progress',
      checkIn: {
        at: new Date(),
        geo: { ...geo, serverReceivedAt: new Date() },
      },
    });
    await audit({ entityName: 'Activity', entityId: String(activity._id), action: 'CHECKIN', userId: req.user._id, after: activity.toObject() });
    return apiResponse(res, 201, activity);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function checkOut(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) return apiError(res, 400, 'Id de actividad no válido');
    const activity = await Activity.findOne({ _id: req.params.id, deletedAt: null });
    if (!activity) return apiError(res, 404, 'Actividad no encontrada');
    if (activity.status === 'completed') return apiError(res, 409, 'La actividad ya está completada');
    if (String(activity.userId) !== String(req.user._id) && req.user.role === 'sales') {
      return apiError(res, 403, 'No autorizado');
    }
    const { productId, outcomeId, notes, durationMinutes, nextActionDate, nextActionNotes, geo } = req.body;

    let computedDuration = durationMinutes;
    if (activity.checkIn && activity.checkIn.at) {
      const diffMs = new Date() - new Date(activity.checkIn.at);
      const diffMin = Math.round(diffMs / 60000);
      if (diffMin > 0) computedDuration = diffMin;
    }

    const client = await Client.findById(activity.clientId);
    let distanceToClientMeters = null;
    let withinExpectedArea = null;
    if (client && client.geo && client.geo.lat) {
      const radius = await getGeofenceRadius();
      distanceToClientMeters = haversineDistance(geo.lat, geo.lng, client.geo.lat, client.geo.lng);
      withinExpectedArea = distanceToClientMeters <= radius;
    }

    activity.productId = productId;
    activity.outcomeId = outcomeId;
    activity.notes = notes;
    activity.durationMinutes = computedDuration || durationMinutes;
    activity.nextActionDate = nextActionDate || null;
    activity.nextActionNotes = nextActionNotes || null;
    activity.status = 'completed';
    activity.checkOut = {
      at: new Date(),
      geo: { ...geo, serverReceivedAt: new Date() },
      distanceToClientMeters,
      withinExpectedArea,
    };
    await activity.save();
    await audit({ entityName: 'Activity', entityId: String(activity._id), action: 'CHECKOUT', userId: req.user._id, after: activity.toObject() });
    return apiResponse(res, 200, activity);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function quickCreate(req, res) {
  try {
    const { clientId, activityTypeId, productId, outcomeId, activityDate, notes, durationMinutes, nextActionDate, nextActionNotes, geo } = req.body;

    const zoneValidation = await validateSalesClientZone(req.user, clientId);
    if (zoneValidation && !zoneValidation.ok) return apiError(res, zoneValidation.code, zoneValidation.message);

    const client = await Client.findById(clientId);
    let distanceToClientMeters = null;
    let withinExpectedArea = null;
    if (client && client.geo && client.geo.lat) {
      const radius = await getGeofenceRadius();
      distanceToClientMeters = haversineDistance(geo.lat, geo.lng, client.geo.lat, client.geo.lng);
      withinExpectedArea = distanceToClientMeters <= radius;
    }

    const now = new Date();
    const activity = await Activity.create({
      userId: req.user._id,
      clientId,
      activityTypeId,
      productId,
      outcomeId,
      activityDate: new Date(activityDate),
      notes,
      durationMinutes,
      nextActionDate: nextActionDate || null,
      nextActionNotes: nextActionNotes || null,
      status: 'completed',
      checkIn: { at: now, geo: { ...geo, serverReceivedAt: now } },
      checkOut: {
        at: now,
        geo: { ...geo, serverReceivedAt: now },
        distanceToClientMeters,
        withinExpectedArea,
      },
    });
    await audit({ entityName: 'Activity', entityId: String(activity._id), action: 'CREATE', userId: req.user._id, after: activity.toObject() });
    return apiResponse(res, 201, activity);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function myActivities(req, res) {
  try {
    const { from, to, page = 1, limit = 20 } = req.query;
    const filter = { userId: req.user._id, deletedAt: null };
    if (from || to) {
      filter.activityDate = {};
      if (from) filter.activityDate.$gte = startOfDay(from);
      if (to) filter.activityDate.$lte = endOfDay(to);
    }
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [activities, total] = await Promise.all([
      Activity.find(filter).sort({ activityDate: -1, createdAt: -1 }).skip(skip).limit(parseInt(limit, 10))
        .populate('clientId', 'legalName taxId city').populate('activityTypeId', 'name').populate('productId', 'name').populate('outcomeId', 'name'),
      Activity.countDocuments(filter),
    ]);
    return apiResponse(res, 200, activities, { total, page: parseInt(page, 10), limit: parseInt(limit, 10), pages: Math.ceil(total / parseInt(limit, 10)) });
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}


async function myAgenda(req, res) {
  try {
    const date = req.query.date || new Date();
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const todayFilter = {
      userId: req.user._id,
      deletedAt: null,
      activityDate: { $gte: dayStart, $lte: dayEnd },
    };

    const [todayActivities, followUpsRaw] = await Promise.all([
      Activity.find(todayFilter)
        .sort({ createdAt: -1 })
        .populate('clientId', 'legalName taxId city')
        .populate('activityTypeId', 'name'),
      Activity.find({
        userId: req.user._id,
        deletedAt: null,
        nextActionDate: { $gte: dayStart, $lte: dayEnd },
        status: 'completed',
      })
        .sort({ nextActionDate: 1, updatedAt: -1 })
        .populate('clientId', 'legalName taxId city')
        .populate('activityTypeId', 'name')
        .populate('outcomeId', 'name')
        .limit(20),
    ]);

    const inProgressActivity = todayActivities.find((activity) => activity.status === 'in_progress') || null;
    const completedToday = todayActivities.filter((activity) => activity.status === 'completed').length;
    const visitedTodayByClient = new Set(todayActivities.map((activity) => String(activity.clientId?._id || activity.clientId)));
    const followUpsDueToday = followUpsRaw.filter((activity) => !visitedTodayByClient.has(String(activity.clientId?._id || activity.clientId)));

    return apiResponse(res, 200, {
      date: dayStart,
      summary: {
        totalToday: todayActivities.length,
        completedToday,
        pendingToday: todayActivities.length - completedToday,
        followUpsDueToday: followUpsDueToday.length,
      },
      inProgressActivity,
      followUpsDueToday,
    });
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function teamActivities(req, res) {
  try {
    const { from, to, userId, page = 1, limit = 50 } = req.query;
    const filter = { deletedAt: null };
    if (req.user.role === 'manager') {
      const User = require('../models/User');
      const teamMembers = await User.find({ managerUserId: req.user._id }).select('_id');
      const ids = teamMembers.map(u => u._id);
      if (userId && ids.map(String).includes(userId)) filter.userId = userId;
      else filter.userId = { $in: ids };
    } else if (req.user.role === 'admin') {
      if (userId) filter.userId = userId;
    }
    if (from || to) {
      filter.activityDate = {};
      if (from) filter.activityDate.$gte = startOfDay(from);
      if (to) filter.activityDate.$lte = endOfDay(to);
    }
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [activities, total] = await Promise.all([
      Activity.find(filter).sort({ activityDate: -1 }).skip(skip).limit(parseInt(limit, 10))
        .populate('userId', 'name email').populate('clientId', 'legalName taxId city')
        .populate('activityTypeId', 'name').populate('productId', 'name').populate('outcomeId', 'name'),
      Activity.countDocuments(filter),
    ]);
    return apiResponse(res, 200, activities, { total, page: parseInt(page, 10), limit: parseInt(limit, 10), pages: Math.ceil(total / parseInt(limit, 10)) });
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function getActivity(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) return apiError(res, 400, 'Id de actividad no válido');
    const activity = await Activity.findOne({ _id: req.params.id, deletedAt: null })
      .populate('clientId', 'legalName taxId city province').populate('userId', 'name email')
      .populate('activityTypeId', 'name').populate('productId', 'name').populate('outcomeId', 'name');
    if (!activity) return apiError(res, 404, 'Actividad no encontrada');
    if (req.user.role === 'sales' && String(activity.userId._id) !== String(req.user._id)) {
      return apiError(res, 403, 'No autorizado');
    }
    if (isSales(req.user) && !hasZoneAccessToClient(req.user, activity.clientId)) {
      return apiError(res, 403, 'No autorizado para ver actividades de clientes fuera de tu zona');
    }
    return apiResponse(res, 200, activity);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function updateActivity(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) return apiError(res, 400, 'Id de actividad no válido');
    const activity = await Activity.findOne({ _id: req.params.id, deletedAt: null });
    if (!activity) return apiError(res, 404, 'Actividad no encontrada');
    if (req.user.role === 'sales' && String(activity.userId) !== String(req.user._id)) {
      return apiError(res, 403, 'No autorizado');
    }
    const before = activity.toObject();
    Object.assign(activity, req.body);
    await activity.save();
    await audit({ entityName: 'Activity', entityId: String(activity._id), action: 'UPDATE', userId: req.user._id, before, after: activity.toObject() });
    return apiResponse(res, 200, activity);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function deleteActivity(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) return apiError(res, 400, 'Id de actividad no válido');
    const activity = await Activity.findOne({ _id: req.params.id, deletedAt: null });
    if (!activity) return apiError(res, 404, 'Actividad no encontrada');
    if (req.user.role === 'sales' && String(activity.userId) !== String(req.user._id)) {
      return apiError(res, 403, 'No autorizado');
    }
    const before = activity.toObject();
    activity.deletedAt = new Date();
    await activity.save();
    await audit({ entityName: 'Activity', entityId: String(activity._id), action: 'DELETE', userId: req.user._id, before });
    return apiResponse(res, 200, { message: 'Actividad eliminada' });
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

module.exports = { checkIn, checkOut, quickCreate, myActivities, myAgenda, teamActivities, getActivity, updateActivity, deleteActivity };
