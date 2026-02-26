'use strict';

const Activity = require('../models/Activity');
const Client = require('../models/Client');
const User = require('../models/User');
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
function toDateOnly(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
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

async function canManageScheduledActivity(user, activity) {
  if (user.role === 'admin') return true;
  if (user.role === 'manager') {
    const member = await User.findOne({ _id: activity.userId, managerUserId: user._id }).select('_id');
    return Boolean(member);
  }
  return String(activity.userId) === String(user._id);
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
    const activity = await Activity.findOne({ _id: req.params.id, deletedAt: null });
    if (!activity) return apiError(res, 404, 'Actividad no encontrada');
    if (activity.status === 'completed') return apiError(res, 409, 'La actividad ya está completada');
    if (String(activity.userId) !== String(req.user._id) && req.user.role === 'sales') return apiError(res, 403, 'No autorizado');

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

async function scheduleCreate(req, res) {
  try {
    const { clientId, activityTypeId, activityDate, notes } = req.body;
    const zoneValidation = await validateSalesClientZone(req.user, clientId);
    if (zoneValidation && !zoneValidation.ok) return apiError(res, zoneValidation.code, zoneValidation.message);

    const scheduledDate = toDateOnly(activityDate);
    if (scheduledDate < toDateOnly(new Date())) return apiError(res, 422, 'Solo se pueden agendar visitas para hoy o fechas futuras');

    const activity = await Activity.create({
      userId: req.user._id,
      clientId,
      activityTypeId,
      activityDate: scheduledDate,
      status: 'draft',
      notes: notes || null,
      isDraft: true,
    });

    await audit({ entityName: 'Activity', entityId: String(activity._id), action: 'SCHEDULE', userId: req.user._id, after: activity.toObject() });
    return apiResponse(res, 201, activity);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function scheduleUpdate(req, res) {
  try {
    const activity = await Activity.findOne({ _id: req.params.id, deletedAt: null });
    if (!activity) return apiError(res, 404, 'Registro agendado no encontrado');
    if (activity.status !== 'draft') return apiError(res, 409, 'Solo se pueden editar visitas agendadas pendientes');

    const allowed = await canManageScheduledActivity(req.user, activity);
    if (!allowed) return apiError(res, 403, 'No autorizado');

    const { clientId, activityTypeId, activityDate, notes } = req.body;
    const zoneValidation = await validateSalesClientZone(req.user, clientId);
    if (zoneValidation && !zoneValidation.ok) return apiError(res, zoneValidation.code, zoneValidation.message);

    const scheduledDate = toDateOnly(activityDate);
    if (scheduledDate < toDateOnly(new Date())) return apiError(res, 422, 'Solo se pueden agendar visitas para hoy o fechas futuras');

    const before = activity.toObject();
    activity.clientId = clientId;
    activity.activityTypeId = activityTypeId;
    activity.activityDate = scheduledDate;
    activity.notes = notes || null;
    await activity.save();

    await audit({ entityName: 'Activity', entityId: String(activity._id), action: 'SCHEDULE_UPDATE', userId: req.user._id, before, after: activity.toObject() });
    return apiResponse(res, 200, activity);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function scheduleDelete(req, res) {
  try {
    if (req.user.role !== 'admin') return apiError(res, 403, 'Solo admin puede borrar registros agendados');
    const activity = await Activity.findOne({ _id: req.params.id, deletedAt: null });
    if (!activity) return apiError(res, 404, 'Registro agendado no encontrado');
    const before = activity.toObject();
    activity.deletedAt = new Date();
    await activity.save();
    await audit({ entityName: 'Activity', entityId: String(activity._id), action: 'SCHEDULE_DELETE', userId: req.user._id, before });
    return apiResponse(res, 200, { message: 'Registro agendado eliminado' });
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function calendar(req, res) {
  try {
    const { from, to, userId } = req.query;
    const start = from ? startOfDay(from) : startOfDay(new Date());
    const end = to ? endOfDay(to) : endOfDay(new Date());

    let userIds = [];
    if (req.user.role === 'sales') {
      userIds = [req.user._id];
    } else if (req.user.role === 'manager') {
      const teamMembers = await User.find({ managerUserId: req.user._id, isActive: true }).select('_id');
      const ids = teamMembers.map(u => String(u._id));
      if (userId && ids.includes(String(userId))) userIds = [userId];
      else userIds = teamMembers.map(u => u._id);
    } else {
      if (userId) userIds = [userId];
      else {
        const allUsers = await User.find({ isActive: true, role: 'sales' }).select('_id');
        userIds = allUsers.map(u => u._id);
      }
    }

    const visits = await Activity.find({ userId: { $in: userIds }, activityDate: { $gte: start, $lte: end }, deletedAt: null, status: 'draft' })
      .sort({ activityDate: 1 })
      .populate('userId', 'name email')
      .populate('clientId', 'legalName city zoneId')
      .populate('activityTypeId', 'name');

    const today = toDateOnly(new Date());
    const alerts = visits
      .filter(v => toDateOnly(v.activityDate).getTime() === today.getTime())
      .map(v => ({
        type: 'visit_today',
        activityId: v._id,
        title: `Visita agendada para hoy: ${v.clientId?.legalName || 'Cliente'}`,
        date: v.activityDate,
      }));

    return apiResponse(res, 200, { visits, alerts });
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

async function teamActivities(req, res) {
  try {
    const { from, to, userId, page = 1, limit = 50 } = req.query;
    const filter = { deletedAt: null };
    if (req.user.role === 'manager') {
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
    const activity = await Activity.findOne({ _id: req.params.id, deletedAt: null })
      .populate('clientId', 'legalName taxId city province').populate('userId', 'name email')
      .populate('activityTypeId', 'name').populate('productId', 'name').populate('outcomeId', 'name');
    if (!activity) return apiError(res, 404, 'Actividad no encontrada');
    if (req.user.role === 'sales' && String(activity.userId._id) !== String(req.user._id)) return apiError(res, 403, 'No autorizado');
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
    const activity = await Activity.findOne({ _id: req.params.id, deletedAt: null });
    if (!activity) return apiError(res, 404, 'Actividad no encontrada');
    if (req.user.role === 'sales' && String(activity.userId) !== String(req.user._id)) return apiError(res, 403, 'No autorizado');
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
    const activity = await Activity.findOne({ _id: req.params.id, deletedAt: null });
    if (!activity) return apiError(res, 404, 'Actividad no encontrada');
    if (req.user.role === 'sales' && String(activity.userId) !== String(req.user._id)) return apiError(res, 403, 'No autorizado');
    const before = activity.toObject();
    activity.deletedAt = new Date();
    await activity.save();
    await audit({ entityName: 'Activity', entityId: String(activity._id), action: 'DELETE', userId: req.user._id, before });
    return apiResponse(res, 200, { message: 'Actividad eliminada' });
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

module.exports = {
  checkIn,
  checkOut,
  quickCreate,
  scheduleCreate,
  scheduleUpdate,
  scheduleDelete,
  calendar,
  myActivities,
  teamActivities,
  getActivity,
  updateActivity,
  deleteActivity,
};
