'use strict';

const Activity = require('../models/Activity');
const Client = require('../models/Client');
const User = require('../models/User');
const { ActivityType, Product, Outcome, Zone, Segment } = require('../models/Catalog');
const { apiResponse, apiError } = require('../utils/response');
const { canViewAllSales, getAccessibleSalesUserIds } = require('../utils/salesScope');

async function factActivities(req, res) {
  try {
    const { from, to } = req.query;
    const filter = { deletedAt: null, status: 'completed' };
    if (from || to) {
      filter.activityDate = {};
      if (from) filter.activityDate.$gte = new Date(from);
      if (to) filter.activityDate.$lte = new Date(to + 'T23:59:59');
    }
    if (req.user.role === 'manager' && !canViewAllSales(req.user)) {
      filter.userId = { $in: await getAccessibleSalesUserIds(req.user, { isActive: true }) };
    }
    const activities = await Activity.find(filter)
      .select('-checkIn -checkOut -__v')
      .populate({ path: 'userId', select: 'name email role zoneId', populate: { path: 'zoneId', select: 'name' } })
      .populate({
        path: 'clientId',
        select: 'legalName taxId province city zoneId segmentId',
        populate: [
          { path: 'zoneId', select: 'name' },
          { path: 'segmentId', select: 'name' },
        ],
      })
      .populate('activityTypeId', 'name')
      .populate('productId', 'name').populate('productIds', 'name')
      .populate('outcomeId', 'name')
      .populate('sale.items.productId', 'name')
      .populate({
        path: 'sale.intermediaryClientIds',
        select: 'legalName taxId province city zoneId segmentId',
        populate: [
          { path: 'zoneId', select: 'name' },
          { path: 'segmentId', select: 'name' },
        ],
      });

    const rows = activities.map((activity) => {
      const intermediaryClients = activity.sale?.intermediaryClientIds || [];
      const saleItems = activity.sale?.items || [];

      return {
        activity_id: activity._id,
        activity_date: activity.activityDate,
        created_at: activity.createdAt,
        updated_at: activity.updatedAt,
        status: activity.status,
        duration_minutes: activity.durationMinutes,
        notes: activity.notes,
        next_action_date: activity.nextActionDate,
        next_action_type: activity.nextActionType || null,
        next_action_notes: activity.nextActionNotes,

        sales_user_id: activity.userId?._id || null,
        sales_user_name: activity.userId?.name || null,
        sales_user_email: activity.userId?.email || null,
        sales_user_role: activity.userId?.role || null,
        sales_representative_id: activity.userId?.zoneId?._id || activity.userId?.zoneId || null,
        sales_representative_name: activity.userId?.zoneId?.name || null,

        client_id: activity.clientId?._id || null,
        client_name: activity.clientId?.legalName || null,
        client_tax_id: activity.clientId?.taxId || null,
        client_city: activity.clientId?.city || null,
        client_province: activity.clientId?.province || null,
        client_representative_id: activity.clientId?.zoneId?._id || activity.clientId?.zoneId || null,
        client_representative_name: activity.clientId?.zoneId?.name || null,
        client_segment_id: activity.clientId?.segmentId?._id || activity.clientId?.segmentId || null,
        client_segment_name: activity.clientId?.segmentId?.name || null,

        activity_type_id: activity.activityTypeId?._id || null,
        activity_type_name: activity.activityTypeId?.name || null,
        product_id: activity.productId?._id || null,
        product_name: activity.productId?.name || null,
        product_ids: (activity.productIds || []).map((product) => product?._id || product || null),
        product_names: (activity.productIds || []).map((product) => product?.name || null),
        product_names_summary: (activity.productIds || []).map((product) => product?.name || null).filter(Boolean).join(' | '),
        outcome_id: activity.outcomeId?._id || null,
        outcome_name: activity.outcomeId?.name || null,

        venta_cerrada: Boolean(activity.sale?.isClosed),
        cantidad_vendida: activity.sale?.quantity ?? null,
        precio_unitario_venta: activity.sale?.unitPrice ?? null,
        importe_total_venta: activity.sale?.totalAmount ?? null,
        productos_vendidos_count: saleItems.length,
        productos_vendidos_ids: saleItems.map((item) => item.productId?._id || item.productId || null),
        productos_vendidos_nombres: saleItems.map((item) => item.productId?.name || null),
        productos_vendidos_cantidades: saleItems.map((item) => item.quantity ?? null),
        productos_vendidos_unidades: saleItems.map((item) => item.unit || null),
        productos_vendidos_precios: saleItems.map((item) => item.unitPrice ?? null),
        productos_vendidos_importes: saleItems.map((item) => item.totalAmount ?? null),
        productos_vendidos_resumen: saleItems.map((item) => `${item.productId?.name || 'Producto'} x ${item.quantity} ${item.unit || ''} @ ${item.unitPrice}`).join(' | '),
        clientes_intermediarios_count: intermediaryClients.length,
        clientes_intermediarios_ids: intermediaryClients.map((client) => client._id),
        clientes_intermediarios_nombres: intermediaryClients.map((client) => client.legalName),
        clientes_intermediarios_tax_ids: intermediaryClients.map((client) => client.taxId),
        clientes_intermediarios_resumen: intermediaryClients.map((client) => client.legalName).join(' | '),
      };
    });

    return apiResponse(res, 200, rows);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function dimClients(req, res) {
  try {
    const filter = { deletedAt: null };
    if (req.user.role === 'manager' && !canViewAllSales(req.user)) {
      filter.createdBy = { $in: await getAccessibleSalesUserIds(req.user, { isActive: true }) };
    }
    const clients = await Client.find(filter)
      .populate('zoneId', 'name').populate('segmentId', 'name').populate('createdBy', 'name email');
    return apiResponse(res, 200, clients);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function dimUsers(req, res) {
  try {
    const filter = {};
    if (req.user.role === 'manager' && !canViewAllSales(req.user)) {
      filter._id = { $in: await getAccessibleSalesUserIds(req.user, { isActive: true }) };
    }
    const users = await User.find(filter).select('-passwordHash')
      .populate('zoneId', 'name').populate('managerUserId', 'name email');
    return apiResponse(res, 200, users);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function dimCatalogs(req, res) {
  try {
    const [activityTypes, products, outcomes, zones, segments] = await Promise.all([
      ActivityType.find({}),
      Product.find({}),
      Outcome.find({}),
      Zone.find({}),
      Segment.find({}),
    ]);
    return apiResponse(res, 200, { activityTypes, products, outcomes, zones, segments });
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

module.exports = { factActivities, dimClients, dimUsers, dimCatalogs };
