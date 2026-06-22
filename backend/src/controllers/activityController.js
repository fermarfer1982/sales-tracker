'use strict';

const Activity = require('../models/Activity');
const Client = require('../models/Client');
const AppSetting = require('../models/AppSetting');
const { ActivityType, Outcome } = require('../models/Catalog');
const { haversineDistance } = require('../utils/haversine');
const { apiResponse, apiError } = require('../utils/response');
const { audit } = require('../utils/audit');
const { hasZoneAccessToClient, hasSalesZone, isSales } = require('../utils/zoneAccess');
const User = require('../models/User');
const { canViewAllSales, getAccessibleSalesUserIds } = require('../utils/salesScope');
const { buildScheduledDuplicateFilter, buildScheduledCheckInMatchFilter } = require('../utils/schedule');
const { sendMail, buildOrderEmailHtml } = require('../services/emailService');

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

function dateKey(value) {
  if (!value) return null;
  return startOfDay(value).toISOString();
}

function buildEmptySale() {
  return {
    isClosed: false,
    quantity: null,
    unitPrice: null,
    totalAmount: null,
    items: [],
    orderNotes: null,
    orderEmail: { status: 'none', recipientEmail: null, sentAt: null, error: null },
    intermediaryClientIds: [],
  };
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function normalizeNextActionType(nextActionDate, nextActionType) {
  if (!nextActionDate) return null;
  if (!nextActionType) return null;
  return String(nextActionType).trim().toLowerCase();
}

function normalizePrimaryProductIds(rawProductIds, fallbackProductId = null) {
  const ids = Array.isArray(rawProductIds)
    ? [...new Set(rawProductIds.filter(Boolean).map((id) => String(id)))]
    : [];
  if (!ids.length && fallbackProductId) ids.push(String(fallbackProductId));
  return ids;
}

function normalizeSaleQuantityToThousands(value) {
  return roundMoney(Number(value) / 1000);
}

async function normalizeSalePayload(user, clientId, rawSale, fallbackProductId = null) {
  if (!rawSale || !rawSale.isClosed) return { ok: true, sale: buildEmptySale() };

  const orderNotes = rawSale.orderNotes ? String(rawSale.orderNotes).trim() : null;
  const intermediaryClientIds = [...new Set((rawSale.intermediaryClientIds || []).filter(Boolean).map(String))];
  if (intermediaryClientIds.includes(String(clientId))) {
    return {
      ok: false,
      code: 422,
      message: 'Los clientes intermediarios no pueden incluir el cliente principal de la venta',
    };
  }

  if (intermediaryClientIds.length > 0) {
    const intermediaryClients = await Client.find({
      _id: { $in: intermediaryClientIds },
      deletedAt: null,
    }).select('_id zoneId');

    if (intermediaryClients.length !== intermediaryClientIds.length) {
      return { ok: false, code: 404, message: 'Uno o varios clientes intermediarios no existen' };
    }

    if (isSales(user)) {
      const unauthorizedClient = intermediaryClients.find((client) => !hasZoneAccessToClient(user, client));
      if (unauthorizedClient) {
        return {
          ok: false,
          code: 403,
          message: 'No autorizado para asociar clientes intermediarios fuera de tu representante',
        };
      }
    }
  }

  let items = Array.isArray(rawSale.items)
    ? rawSale.items
      .map((item) => ({
        productId: item?.productId ? String(item.productId) : '',
        quantity: Number(item?.quantity),
        unit: item?.unit ? String(item.unit).trim().toUpperCase() : '',
        unitPrice: Number(item?.unitPrice),
      }))
      .filter((item) => item.productId || item.quantity || item.unitPrice)
    : [];

  if (items.length === 0 && fallbackProductId && rawSale.quantity != null && rawSale.unitPrice != null) {
    items = [{
      productId: String(fallbackProductId),
      quantity: Number(rawSale.quantity),
      unit: rawSale.unit ? String(rawSale.unit).trim().toUpperCase() : '',
      unitPrice: Number(rawSale.unitPrice),
    }];
  }

  if (items.length === 0) {
    return { ok: false, code: 422, message: 'Debes informar al menos un producto vendido' };
  }

  const seenProducts = new Set();
  const normalizedItems = [];
  for (const item of items) {
    if (!item.productId) return { ok: false, code: 422, message: 'Cada línea de venta debe tener producto' };
    if (seenProducts.has(item.productId)) {
      return { ok: false, code: 422, message: 'No repitas el mismo producto en varias líneas de venta' };
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
      return { ok: false, code: 422, message: 'La cantidad vendida debe ser un número entero mayor a 0' };
    }
    if (!['SE', 'PI', 'GR'].includes(item.unit)) {
      return { ok: false, code: 422, message: 'La unidad de venta debe ser SE, PI o GR' };
    }
    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      return { ok: false, code: 422, message: 'El precio de venta no es válido' };
    }
    seenProducts.add(item.productId);
    normalizedItems.push({
      productId: item.productId,
      quantity: item.quantity,
      normalizedQuantity: normalizeSaleQuantityToThousands(item.quantity),
      unit: item.unit,
      unitPrice: roundMoney(item.unitPrice),
      totalAmount: roundMoney(normalizeSaleQuantityToThousands(item.quantity) * item.unitPrice),
    });
  }

  const totalQuantity = roundMoney(normalizedItems.reduce((sum, item) => sum + item.quantity, 0));
  const totalAmount = roundMoney(normalizedItems.reduce((sum, item) => sum + item.totalAmount, 0));

  return {
    ok: true,
    sale: {
      isClosed: true,
      quantity: totalQuantity,
      unitPrice: normalizedItems.length === 1 ? normalizedItems[0].unitPrice : null,
      totalAmount,
      items: normalizedItems,
      orderNotes,
      orderEmail: rawSale.orderEmail || { status: 'none', recipientEmail: null, sentAt: null, error: null },
      intermediaryClientIds,
    },
  };
}


async function syncDirectOrderEmail(activity) {
  if (!activity?.sale?.isClosed) return activity;
  if (activity.sale?.orderEmail?.status === 'sent') return activity;
  if ((activity.sale?.intermediaryClientIds || []).length > 0) return activity;

  const [client, commercial, populatedActivity] = await Promise.all([
    Client.findById(activity.clientId).select('legalName taxId city province clientType deletedAt'),
    User.findById(activity.userId).select('name email orderEmail'),
    Activity.findById(activity._id).populate('sale.items.productId', 'name'),
  ]);

  if (!client || client.clientType !== 'direct') return activity;

  const recipientEmail = commercial?.orderEmail || null;
  if (!recipientEmail) {
    activity.sale.orderEmail = {
      status: 'failed',
      recipientEmail: null,
      sentAt: null,
      error: 'El comercial no tiene email de pedidos configurado',
    };
    await activity.save();
    return activity;
  }

  const saleItems = (populatedActivity.sale?.items || []).map((item) => ({
    productName: item.productId?.name || 'Producto',
    quantity: item.quantity ?? '-',
    unit: item.unit || '-',
    unitPrice: item.unitPrice != null ? Number(item.unitPrice).toFixed(2) : '-',
    totalAmount: item.totalAmount != null ? Number(item.totalAmount).toFixed(2) : '-',
  }));

  try {
    await sendMail({
      to: recipientEmail,
      subject: `Nuevo pedido - ${client.legalName}`,
      html: buildOrderEmailHtml({ commercial, client, activity: populatedActivity, saleItems }),
    });
    activity.sale.orderEmail = {
      status: 'sent',
      recipientEmail,
      sentAt: new Date(),
      error: null,
    };
  } catch (err) {
    activity.sale.orderEmail = {
      status: 'failed',
      recipientEmail,
      sentAt: null,
      error: err.message || 'No se pudo enviar el email de pedido',
    };
  }

  await activity.save();
  return activity;
}

async function resolveVisitActivityTypeId(fallbackActivityTypeId) {
  const visitType = await ActivityType.findOne({ name: /^visita$/i }).select('_id');
  return visitType?._id || fallbackActivityTypeId;
}

async function resolveFollowUpCompletionMetadata(activity) {
  const normalizedType = normalizeNextActionType(activity.nextActionDate || new Date(), activity.nextActionType);
  let activityTypeName = null;
  if (normalizedType === 'call') activityTypeName = /^llamada$/i;
  if (normalizedType === 'email') activityTypeName = /^email$/i;
  if (normalizedType === 'visit') activityTypeName = /^visita$/i;

  const [resolvedActivityType, resolvedOutcome] = await Promise.all([
    activityTypeName ? ActivityType.findOne({ name: activityTypeName }).select('_id name') : Promise.resolve(null),
    Outcome.findOne({ name: /^seguimiento$/i }).select('_id name'),
  ]);

  return {
    activityTypeId: resolvedActivityType?._id || activity.activityTypeId,
    outcomeId: resolvedOutcome?._id || activity.outcomeId || null,
  };
}

async function syncFollowUpSchedule(activity, actorUserId) {
  const shouldCreateVisitDraft = false;

  let linkedDraft = null;
  if (activity.followUpScheduledActivityId) {
    linkedDraft = await Activity.findOne({
      _id: activity.followUpScheduledActivityId,
      deletedAt: null,
      status: 'draft',
    });
  }

  if (!shouldCreateVisitDraft) {
    if (linkedDraft) {
      const before = linkedDraft.toObject();
      linkedDraft.deletedAt = new Date();
      await linkedDraft.save();
      await audit({
        entityName: 'Activity',
        entityId: String(linkedDraft._id),
        action: 'FOLLOWUP_VISIT_DELETE',
        userId: actorUserId,
        before,
      });
    }
    if (activity.followUpScheduledActivityId) {
      activity.followUpScheduledActivityId = null;
      await activity.save();
    }
    return;
  }

  const followUpTypeId = await resolveVisitActivityTypeId(activity.activityTypeId);
  const nextActionDate = new Date(activity.nextActionDate);
  const nextActionNotes = activity.nextActionNotes || null;

  if (!linkedDraft) {
    linkedDraft = await Activity.findOne(
      buildScheduledDuplicateFilter({
        userId: activity.userId,
        clientId: activity.clientId,
        activityDate: nextActionDate,
      })
    ).sort({ createdAt: 1 });
  }

  if (linkedDraft) {
    const before = linkedDraft.toObject();
    linkedDraft.userId = activity.userId;
    linkedDraft.clientId = activity.clientId;
    linkedDraft.activityTypeId = followUpTypeId;
    linkedDraft.activityDate = nextActionDate;
    linkedDraft.notes = nextActionNotes;
    linkedDraft.followUpSourceActivityId = activity._id;
    await linkedDraft.save();

    if (String(activity.followUpScheduledActivityId || '') !== String(linkedDraft._id)) {
      activity.followUpScheduledActivityId = linkedDraft._id;
      await activity.save();
    }

    await audit({
      entityName: 'Activity',
      entityId: String(linkedDraft._id),
      action: before ? 'FOLLOWUP_VISIT_UPDATE' : 'FOLLOWUP_VISIT_CREATE',
      userId: actorUserId,
      before,
      after: linkedDraft.toObject(),
    });
    return;
  }

  const createdDraft = await Activity.create({
    userId: activity.userId,
    clientId: activity.clientId,
    activityTypeId: followUpTypeId,
    activityDate: nextActionDate,
    notes: nextActionNotes,
    followUpSourceActivityId: activity._id,
    status: 'draft',
    isDraft: true,
  });
  activity.followUpScheduledActivityId = createdDraft._id;
  await activity.save();
  await audit({
    entityName: 'Activity',
    entityId: String(createdDraft._id),
    action: 'FOLLOWUP_VISIT_CREATE',
    userId: actorUserId,
    after: createdDraft.toObject(),
  });
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

async function validateClientAccessForOwnerUser(ownerUserId, clientId) {
  const owner = await User.findOne({ _id: ownerUserId, isActive: true }).select('role zoneId');
  if (!owner) return { ok: false, code: 404, message: 'Comercial destino no encontrado o inactivo' };
  return validateSalesClientZone(owner, clientId) || { ok: true };
}

async function resolveManagedUserId(requester, requestedUserId) {
  if (requester.role === 'sales') return requester._id;
  if (!requestedUserId) return null;
  if (requester.role === 'admin') {
    const salesUser = await User.findOne({ _id: requestedUserId, role: 'sales', isActive: true }).select('_id');
    return salesUser ? salesUser._id : null;
  }
  if (requester.role !== 'manager') return null;
  if (canViewAllSales(requester)) {
    const salesUser = await User.findOne({ _id: requestedUserId, role: 'sales', isActive: true }).select('_id');
    return salesUser ? salesUser._id : null;
  }

  const teamMember = await User.findOne({ _id: requestedUserId, managerUserId: requester._id, isActive: true }).select('_id');
  if (!teamMember) return null;
  return teamMember._id;
}

async function canManageScheduledActivity(requester, activity) {
  if (requester.role === 'admin') return true;
  if (requester.role === 'manager') {
    if (canViewAllSales(requester)) {
      const salesUser = await User.findOne({ _id: activity.userId, role: 'sales', isActive: true }).select('_id');
      return Boolean(salesUser);
    }
    const teamMember = await User.findOne({ _id: activity.userId, managerUserId: requester._id, isActive: true }).select('_id');
    return Boolean(teamMember);
  }
  return String(activity.userId) === String(requester._id);
}

async function checkIn(req, res) {
  try {
    const { clientId, activityTypeId, activityDate, geo } = req.body;
    const zoneValidation = await validateSalesClientZone(req.user, clientId);
    if (zoneValidation && !zoneValidation.ok) return apiError(res, zoneValidation.code, zoneValidation.message);

    const checkInAt = new Date();
    const scheduledDraft = await Activity.findOne(
      buildScheduledCheckInMatchFilter({
        userId: req.user._id,
        clientId,
        activityTypeId,
        activityDate,
      })
    ).sort({ createdAt: 1 });

    let activity;
    let before = null;
    if (scheduledDraft) {
      before = scheduledDraft.toObject();
      scheduledDraft.activityDate = new Date(activityDate);
      scheduledDraft.status = 'in_progress';
      scheduledDraft.isDraft = false;
      scheduledDraft.checkIn = {
        at: checkInAt,
        geo: { ...geo, serverReceivedAt: checkInAt },
      };
      activity = await scheduledDraft.save();
    } else {
      activity = await Activity.create({
        userId: req.user._id,
        clientId,
        activityTypeId,
        activityDate: new Date(activityDate),
        status: 'in_progress',
        isDraft: false,
        checkIn: {
          at: checkInAt,
          geo: { ...geo, serverReceivedAt: checkInAt },
        },
      });
    }

    await audit({
      entityName: 'Activity',
      entityId: String(activity._id),
      action: 'CHECKIN',
      userId: req.user._id,
      ...(before ? { before } : {}),
      after: activity.toObject(),
    });
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
    if (String(activity.userId) !== String(req.user._id) && req.user.role === 'sales') {
      return apiError(res, 403, 'No autorizado');
    }
    const { productId, productIds, outcomeId, notes, durationMinutes, nextActionDate, nextActionType, nextActionNotes, geo, sale } = req.body;

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

    const normalizedProductIds = normalizePrimaryProductIds(productIds, productId || activity.productId);
    if (normalizedProductIds.length === 0) return apiError(res, 422, 'Selecciona al menos un producto');

    const normalizedSale = await normalizeSalePayload(req.user, activity.clientId, sale, normalizedProductIds[0] || activity.productId);
    if (!normalizedSale.ok) return apiError(res, normalizedSale.code, normalizedSale.message);

    activity.productIds = normalizedProductIds;
    activity.productId = normalizedProductIds[0] || null;
    activity.outcomeId = outcomeId;
    activity.notes = notes;
    activity.durationMinutes = computedDuration || durationMinutes;
    activity.nextActionDate = nextActionDate || null;
    activity.nextActionType = normalizeNextActionType(nextActionDate, nextActionType);
    activity.nextActionNotes = nextActionNotes || null;
    activity.sale = normalizedSale.sale;
    activity.status = 'completed';
    activity.checkOut = {
      at: new Date(),
      geo: { ...geo, serverReceivedAt: new Date() },
      distanceToClientMeters,
      withinExpectedArea,
    };
    await activity.save();
    await syncDirectOrderEmail(activity);
    await syncFollowUpSchedule(activity, req.user._id);
    await audit({ entityName: 'Activity', entityId: String(activity._id), action: 'CHECKOUT', userId: req.user._id, after: activity.toObject() });
    return apiResponse(res, 200, activity);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function quickCreate(req, res) {
  try {
    const { clientId, activityTypeId, productId, productIds, outcomeId, activityDate, notes, durationMinutes, nextActionDate, nextActionType, nextActionNotes, geo, sale } = req.body;

    const zoneValidation = await validateSalesClientZone(req.user, clientId);
    if (zoneValidation && !zoneValidation.ok) return apiError(res, zoneValidation.code, zoneValidation.message);

    const client = await Client.findById(clientId);
    let distanceToClientMeters = null;
    let withinExpectedArea = null;
    if (geo && client && client.geo && client.geo.lat) {
      const radius = await getGeofenceRadius();
      distanceToClientMeters = haversineDistance(geo.lat, geo.lng, client.geo.lat, client.geo.lng);
      withinExpectedArea = distanceToClientMeters <= radius;
    }

    const normalizedProductIds = normalizePrimaryProductIds(productIds, productId);
    if (normalizedProductIds.length === 0) return apiError(res, 422, 'Selecciona al menos un producto');

    const normalizedSale = await normalizeSalePayload(req.user, clientId, sale, normalizedProductIds[0]);
    if (!normalizedSale.ok) return apiError(res, normalizedSale.code, normalizedSale.message);

    const now = new Date();
    const activity = await Activity.create({
      userId: req.user._id,
      clientId,
      activityTypeId,
      productId: normalizedProductIds[0],
      productIds: normalizedProductIds,
      outcomeId,
      activityDate: new Date(activityDate),
      notes,
      durationMinutes,
      nextActionDate: nextActionDate || null,
      nextActionType: normalizeNextActionType(nextActionDate, nextActionType),
      nextActionNotes: nextActionNotes || null,
      sale: normalizedSale.sale,
      status: 'completed',
      checkIn: geo ? { at: now, geo: { ...geo, serverReceivedAt: now } } : null,
      checkOut: geo ? {
        at: now,
        geo: { ...geo, serverReceivedAt: now },
        distanceToClientMeters,
        withinExpectedArea,
      } : null,
    });
    await syncDirectOrderEmail(activity);
    await syncFollowUpSchedule(activity, req.user._id);
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
        .populate('clientId', 'legalName taxId city').populate('activityTypeId', 'name').populate('productId', 'name').populate('productIds', 'name').populate('outcomeId', 'name')
        .populate('sale.items.productId', 'name').populate('sale.intermediaryClientIds', 'legalName taxId city'),
      Activity.countDocuments(filter),
    ]);
    return apiResponse(res, 200, activities, { total, page: parseInt(page, 10), limit: parseInt(limit, 10), pages: Math.ceil(total / parseInt(limit, 10)) });
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function calendar(req, res) {
  try {
    const { from, to, userId } = req.query;
    const rangeStart = startOfDay(from || new Date());
    const rangeEnd = endOfDay(to || from || new Date());

    const filter = {
      deletedAt: null,
      activityDate: { $gte: rangeStart, $lte: rangeEnd },
    };

    if (req.user.role === 'sales') {
      filter.userId = req.user._id;
    } else if (req.user.role === 'manager') {
      const teamIds = (await getAccessibleSalesUserIds(req.user, { isActive: true })).map((member) => String(member));
      if (userId && teamIds.includes(String(userId))) {
        filter.userId = userId;
      } else {
        filter.userId = { $in: teamIds };
      }
    } else if (userId) {
      filter.userId = userId;
    }

    const [visits, pendingAlerts, followUpsRaw] = await Promise.all([
      Activity.find(filter)
        .sort({ activityDate: 1, createdAt: 1 })
        .populate('userId', 'name email')
        .populate('clientId', 'legalName taxId city')
        .populate('activityTypeId', 'name')
        .populate('outcomeId', 'name'),
      Activity.find({
        ...filter,
        status: { $ne: 'completed' },
      })
        .sort({ activityDate: 1 })
        .populate('userId', 'name email')
        .populate('clientId', 'legalName taxId city')
        .populate('activityTypeId', 'name')
        .select('_id activityDate status nextActionDate notes userId clientId activityTypeId'),
      Activity.find({
        deletedAt: null,
        status: 'completed',
        nextActionDate: { $ne: null, $lte: rangeEnd },
        ...(filter.userId ? { userId: filter.userId } : {}),
      })
        .sort({ nextActionDate: 1, updatedAt: -1 })
        .populate('userId', 'name email')
        .populate('clientId', 'legalName taxId city')
        .populate('activityTypeId', 'name')
        .select('_id activityDate nextActionDate nextActionType nextActionNotes notes outcomeId userId clientId activityTypeId'),
    ]);

    const mappedPendingAlerts = pendingAlerts.map((alert) => ({
      _id: alert._id,
      activityId: alert._id,
      kind: alert.status === 'in_progress' ? 'in_progress' : 'scheduled',
      activityDate: alert.activityDate,
      nextActionDate: alert.nextActionDate || null,
      userId: alert.userId,
      clientId: alert.clientId,
      activityTypeId: alert.activityTypeId || null,
      notes: alert.notes || null,
      status: alert.status,
      title: alert.status === 'in_progress'
        ? `Actividad en progreso: ${alert.clientId?.legalName || 'Cliente'}`
        : `Visita agendada: ${alert.clientId?.legalName || 'Cliente'}`,
      date: alert.nextActionDate || alert.activityDate,
    }));

    const scheduledClientDayKeys = new Set(
      visits
        .map((visit) => {
          const clientKey = String(visit.clientId?._id || visit.clientId || '');
          const day = dateKey(visit.activityDate);
          if (!clientKey || !day) return null;
          return `${clientKey}::${day}`;
        })
        .filter(Boolean)
    );

    const mappedFollowUps = followUpsRaw
      .filter((activity) => {
        const clientKey = String(activity.clientId?._id || activity.clientId || '');
        const followUpDay = dateKey(activity.nextActionDate);
        if (!clientKey || !followUpDay) return true;
        return !scheduledClientDayKeys.has(`${clientKey}::${followUpDay}`);
      })
      .map((activity) => {
        const followUpDate = activity.nextActionDate;
        const isOverdue = followUpDate && new Date(followUpDate) < rangeStart;
        return {
          _id: `followup-${activity._id}`,
          activityId: activity._id,
          kind: isOverdue ? 'overdue_followup' : 'due_followup',
          activityDate: activity.activityDate || null,
          nextActionDate: followUpDate,
          nextActionType: activity.nextActionType || null,
          nextActionNotes: activity.nextActionNotes || null,
          notes: activity.notes || null,
          outcomeId: activity.outcomeId || null,
          userId: activity.userId,
          clientId: activity.clientId,
          status: 'completed',
          title: isOverdue
            ? `Seguimiento vencido: ${activity.clientId?.legalName || 'Cliente'}`
            : `Seguimiento pendiente: ${activity.clientId?.legalName || 'Cliente'}`,
          date: followUpDate,
        };
      });

    const mappedAlerts = [...mappedPendingAlerts, ...mappedFollowUps].sort((a, b) => {
      const aDate = new Date(a.date || a.activityDate || 0).getTime();
      const bDate = new Date(b.date || b.activityDate || 0).getTime();
      return aDate - bDate;
    });

    return apiResponse(res, 200, { visits, alerts: mappedAlerts });
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function scheduleVisit(req, res) {
  try {
    const { clientId, activityTypeId, activityDate, notes, userId } = req.body;
    const ownerUserId = await resolveManagedUserId(req.user, userId);
    if (!ownerUserId) {
      return apiError(
        res,
        403,
        req.user.role === 'sales'
          ? 'No autorizado para agendar esta visita'
          : 'Debes seleccionar un comercial válido de tu equipo'
      );
    }

    const zoneValidation = await validateClientAccessForOwnerUser(ownerUserId, clientId);
    if (zoneValidation && !zoneValidation.ok) return apiError(res, zoneValidation.code, zoneValidation.message);

    const duplicateDraft = await Activity.findOne(
      buildScheduledDuplicateFilter({ userId: ownerUserId, clientId, activityDate })
    ).select('_id');
    if (duplicateDraft) {
      return apiError(res, 409, 'Ya existe una visita agendada para este comercial y cliente en esa fecha');
    }

    const scheduled = await Activity.create({
      userId: ownerUserId,
      clientId,
      activityTypeId,
      activityDate: new Date(activityDate),
      notes: notes || null,
      status: 'draft',
      isDraft: true,
    });

    await audit({
      entityName: 'Activity',
      entityId: String(scheduled._id),
      action: 'SCHEDULE_CREATE',
      userId: req.user._id,
      after: scheduled.toObject(),
    });

    return apiResponse(res, 201, scheduled);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function updateSchedule(req, res) {
  try {
    const activity = await Activity.findOne({ _id: req.params.id, deletedAt: null });
    if (!activity) return apiError(res, 404, 'Actividad no encontrada');
    if (activity.status !== 'draft') return apiError(res, 409, 'Solo se pueden editar actividades agendadas en borrador');
    const canManage = await canManageScheduledActivity(req.user, activity);
    if (!canManage) return apiError(res, 403, 'No autorizado');

    const zoneValidation = await validateClientAccessForOwnerUser(activity.userId, req.body.clientId);
    if (zoneValidation && !zoneValidation.ok) return apiError(res, zoneValidation.code, zoneValidation.message);

    const duplicateDraft = await Activity.findOne(
      buildScheduledDuplicateFilter({
        userId: activity.userId,
        clientId: req.body.clientId,
        activityDate: req.body.activityDate,
        excludeId: activity._id,
      })
    ).select('_id');
    if (duplicateDraft) {
      return apiError(res, 409, 'Ya existe otra visita agendada para este comercial y cliente en esa fecha');
    }

    const before = activity.toObject();
    activity.clientId = req.body.clientId;
    activity.activityTypeId = req.body.activityTypeId;
    activity.activityDate = new Date(req.body.activityDate);
    activity.notes = req.body.notes || null;
    await activity.save();

    await audit({
      entityName: 'Activity',
      entityId: String(activity._id),
      action: 'SCHEDULE_UPDATE',
      userId: req.user._id,
      before,
      after: activity.toObject(),
    });

    return apiResponse(res, 200, activity);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function deleteSchedule(req, res) {
  try {
    const activity = await Activity.findOne({ _id: req.params.id, deletedAt: null });
    if (!activity) return apiError(res, 404, 'Actividad no encontrada');
    if (activity.status !== 'draft') return apiError(res, 409, 'Solo se pueden eliminar actividades agendadas en borrador');
    const canManage = await canManageScheduledActivity(req.user, activity);
    if (!canManage) return apiError(res, 403, 'No autorizado');

    const before = activity.toObject();
    activity.deletedAt = new Date();
    await activity.save();

    await audit({
      entityName: 'Activity',
      entityId: String(activity._id),
      action: 'SCHEDULE_DELETE',
      userId: req.user._id,
      before,
    });

    return apiResponse(res, 200, { message: 'Visita agendada eliminada' });
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
      Activity.find(todayFilter).sort({ status: 1, checkIn: -1, createdAt: -1 })
        .populate('clientId', 'legalName taxId city')
        .populate('activityTypeId', 'name')
        .populate('productId', 'name').populate('productIds', 'name')
        .populate('outcomeId', 'name'),
      Activity.find({
        userId: req.user._id,
        deletedAt: null,
        nextActionDate: { $gte: dayStart, $lte: dayEnd },
        status: 'completed',
      }).sort({ nextActionDate: 1, updatedAt: -1 })
        .populate('clientId', 'legalName taxId city')
        .populate('activityTypeId', 'name')
        .populate('outcomeId', 'name')
        .select('_id nextActionDate nextActionType userId clientId activityTypeId outcomeId')
        .limit(20),
    ]);

    const inProgressActivity = todayActivities.find((activity) => activity.status === 'in_progress') || null;
    const completedToday = todayActivities.filter((activity) => activity.status === 'completed').length;

    const visitedTodayByClientDay = new Set(
      todayActivities
        .map((activity) => {
          const clientKey = String(activity.clientId?._id || activity.clientId || '');
          const day = dateKey(activity.activityDate);
          if (!clientKey || !day) return null;
          return `${clientKey}::${day}`;
        })
        .filter(Boolean)
    );
    const followUpsDueToday = followUpsRaw.filter((activity) => {
      const clientKey = String(activity.clientId?._id || activity.clientId || '');
      const followUpDay = dateKey(activity.nextActionDate);
      if (!clientKey || !followUpDay) return true;
      return !visitedTodayByClientDay.has(`${clientKey}::${followUpDay}`);
    });

    return apiResponse(res, 200, {
      date: dayStart,
      summary: {
        totalToday: todayActivities.length,
        completedToday,
        pendingToday: todayActivities.length - completedToday,
        followUpsDueToday: followUpsDueToday.length,
      },
      todayActivities,
      inProgressActivity,
      followUpsDueToday,
    });
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function teamActivities(req, res) {
  try {
    const { from, to, userId, zoneId, status, search, page = 1, limit = 50 } = req.query;
    const filter = { deletedAt: null };
    let userScope = null;
    if (req.user.role === 'manager') {
      const ids = await getAccessibleSalesUserIds(req.user, { zoneId });
      userScope = ids;
      if (userId && ids.map(String).includes(userId)) filter.userId = userId;
      else filter.userId = { $in: ids };
    } else if (req.user.role === 'admin') {
      if (userId) filter.userId = userId;
      else if (zoneId) {
        const zoneUsers = await User.find({ zoneId }).select('_id');
        userScope = zoneUsers.map((user) => user._id);
        filter.userId = { $in: userScope };
      }
    }
    if (status) filter.status = status;
    if (from || to) {
      filter.activityDate = {};
      if (from) filter.activityDate.$gte = startOfDay(from);
      if (to) filter.activityDate.$lte = endOfDay(to);
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      const [matchedUsers, matchedClients] = await Promise.all([
        User.find({ name: regex, ...(userScope ? { _id: { $in: userScope } } : {}) }).select('_id'),
        Client.find({
          deletedAt: null,
          $or: [
            { legalName: regex },
            { taxId: regex },
            { city: regex },
          ],
        }).select('_id'),
      ]);

      const userIds = matchedUsers.map((item) => item._id);
      const clientIds = matchedClients.map((item) => item._id);
      filter.$or = [
        { userId: { $in: userIds } },
        { clientId: { $in: clientIds } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [activities, total] = await Promise.all([
      Activity.find(filter).sort({ activityDate: -1 }).skip(skip).limit(parseInt(limit, 10))
        .populate('userId', 'name email').populate('clientId', 'legalName taxId city')
        .populate('activityTypeId', 'name').populate('productId', 'name').populate('productIds', 'name').populate('outcomeId', 'name')
        .populate('sale.items.productId', 'name').populate('sale.intermediaryClientIds', 'legalName taxId city'),
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
      .populate('clientId', 'legalName taxId city province zoneId').populate('userId', 'name email')
      .populate('activityTypeId', 'name').populate('productId', 'name').populate('productIds', 'name').populate('outcomeId', 'name')
      .populate('sale.items.productId', 'name').populate('sale.intermediaryClientIds', 'legalName taxId city province');
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
    const activity = await Activity.findOne({ _id: req.params.id, deletedAt: null });
    if (!activity) return apiError(res, 404, 'Actividad no encontrada');
    if (req.user.role === 'sales' && String(activity.userId) !== String(req.user._id)) {
      return apiError(res, 403, 'No autorizado');
    }
    const before = activity.toObject();
    if (Object.prototype.hasOwnProperty.call(req.body, 'sale')) {
      const saleFallbackProductId = (Array.isArray(req.body.productIds) && req.body.productIds.length ? req.body.productIds[0] : null) || req.body.productId || activity.productId;
      const normalizedSale = await normalizeSalePayload(req.user, req.body.clientId || activity.clientId, req.body.sale, saleFallbackProductId);
      if (!normalizedSale.ok) return apiError(res, normalizedSale.code, normalizedSale.message);
      req.body.sale = normalizedSale.sale;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'nextActionDate')
      || Object.prototype.hasOwnProperty.call(req.body, 'nextActionType')) {
      const nextActionDate = Object.prototype.hasOwnProperty.call(req.body, 'nextActionDate')
        ? req.body.nextActionDate
        : activity.nextActionDate;
      const nextActionType = Object.prototype.hasOwnProperty.call(req.body, 'nextActionType')
        ? req.body.nextActionType
        : activity.nextActionType;
      req.body.nextActionType = normalizeNextActionType(nextActionDate, nextActionType);
      if (!nextActionDate) req.body.nextActionNotes = null;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'productIds') || Object.prototype.hasOwnProperty.call(req.body, 'productId')) {
      const normalizedProductIds = normalizePrimaryProductIds(req.body.productIds, req.body.productId || activity.productId);
      if (normalizedProductIds.length === 0) return apiError(res, 422, 'Selecciona al menos un producto');
      req.body.productIds = normalizedProductIds;
      req.body.productId = normalizedProductIds[0] || null;
    }
    Object.assign(activity, req.body);
    await activity.save();
    if (Object.prototype.hasOwnProperty.call(req.body, 'sale')) await syncDirectOrderEmail(activity);
    await syncFollowUpSchedule(activity, req.user._id);
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

async function updateFollowUp(req, res) {
  try {
    const activity = await Activity.findOne({ _id: req.params.id, deletedAt: null });
    if (!activity) return apiError(res, 404, 'Actividad no encontrada');
    if (activity.status !== 'completed') return apiError(res, 409, 'Solo se pueden editar seguimientos de actividades completadas');
    if (req.user.role === 'sales' && String(activity.userId) !== String(req.user._id)) {
      return apiError(res, 403, 'No autorizado');
    }

    const before = activity.toObject();
    const nextActionDate = req.body.nextActionDate || null;
    const nextActionType = normalizeNextActionType(nextActionDate, req.body.nextActionType);

    activity.nextActionDate = nextActionDate;
    activity.nextActionType = nextActionType;
    activity.nextActionNotes = nextActionDate ? (req.body.nextActionNotes || null) : null;
    await activity.save();
    await syncFollowUpSchedule(activity, req.user._id);

    await audit({
      entityName: 'Activity',
      entityId: String(activity._id),
      action: 'FOLLOWUP_UPDATE',
      userId: req.user._id,
      before,
      after: activity.toObject(),
    });

    return apiResponse(res, 200, activity);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function completeFollowUp(req, res) {
  try {
    const activity = await Activity.findOne({ _id: req.params.id, deletedAt: null });
    if (!activity) return apiError(res, 404, 'Actividad no encontrada');
    if (activity.status !== 'completed') return apiError(res, 409, 'Solo se pueden completar seguimientos de actividades completadas');
    if (req.user.role === 'sales' && String(activity.userId) !== String(req.user._id)) {
      return apiError(res, 403, 'No autorizado');
    }

    const before = activity.toObject();
    const { activityTypeId, outcomeId } = await resolveFollowUpCompletionMetadata(activity);
    const completionNotes = [
      'Seguimiento completado desde agenda.',
      activity.nextActionType ? `Tipo previsto: ${activity.nextActionType}.` : null,
      activity.nextActionNotes ? `Notas: ${activity.nextActionNotes}` : null,
    ].filter(Boolean).join(' ');

    const completedFollowUpActivity = await Activity.create({
      userId: activity.userId,
      clientId: activity.clientId,
      activityTypeId,
      productId: activity.productId || null,
      productIds: activity.productIds || [],
      outcomeId,
      activityDate: new Date(),
      notes: completionNotes || 'Seguimiento completado desde agenda.',
      durationMinutes: null,
      status: 'completed',
      sale: buildEmptySale(),
    });

    activity.nextActionDate = null;
    activity.nextActionType = null;
    activity.nextActionNotes = null;
    await activity.save();
    await syncFollowUpSchedule(activity, req.user._id);

    await audit({
      entityName: 'Activity',
      entityId: String(activity._id),
      action: 'FOLLOWUP_COMPLETE',
      userId: req.user._id,
      before,
      after: activity.toObject(),
    });
    await audit({
      entityName: 'Activity',
      entityId: String(completedFollowUpActivity._id),
      action: 'FOLLOWUP_COMPLETE_ACTIVITY_CREATE',
      userId: req.user._id,
      after: completedFollowUpActivity.toObject(),
    });

    return apiResponse(res, 200, { sourceActivity: activity, completedActivity: completedFollowUpActivity });
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

module.exports = {
  checkIn,
  checkOut,
  quickCreate,
  myActivities,
  myAgenda,
  calendar,
  scheduleVisit,
  updateSchedule,
  deleteSchedule,
  teamActivities,
  getActivity,
  updateActivity,
  deleteActivity,
  updateFollowUp,
  completeFollowUp,
};
