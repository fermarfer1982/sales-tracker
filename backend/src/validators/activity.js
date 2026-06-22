'use strict';

const Joi = require('joi');

const geoSchema = Joi.object({
  lat: Joi.number().required(),
  lng: Joi.number().required(),
  accuracyMeters: Joi.number().default(null),
  capturedAt: Joi.date().required(),
  status: Joi.string().valid('ok', 'denied', 'unavailable', 'timeout').default('ok'),
});

const saleSchema = Joi.object({
  isClosed: Joi.boolean().default(false),
  quantity: Joi.number().integer().positive().allow(null).default(null),
  unitPrice: Joi.number().min(0).allow(null).default(null),
  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().required(),
      quantity: Joi.number().integer().positive().required(),
      unit: Joi.string().valid('SE', 'PI', 'GR').required(),
      unitPrice: Joi.number().min(0).required(),
    })
  ).default([]),
  intermediaryClientIds: Joi.array().items(Joi.string()).default([]),
  orderNotes: Joi.string().allow(null, '').default(null),
}).custom((value, helpers) => {
  if (!value.isClosed) return value;
  const items = value.items || [];
  const hasLegacySingle = value.quantity != null || value.unitPrice != null;
  if (items.length === 0 && !hasLegacySingle) {
    return helpers.error('any.custom', { message: 'Debes informar al menos un producto vendido' });
  }
  if (items.length === 0) {
    if (!(value.quantity > 0)) {
      return helpers.error('any.custom', { message: 'La cantidad vendida debe ser mayor a 0' });
    }
    if (!(value.unitPrice >= 0)) {
      return helpers.error('any.custom', { message: 'El precio de venta no es válido' });
    }
  }
  return value;
}, 'sale items validation').messages({
  'any.custom': '{{#message}}',
});

const nextActionTypeSchema = Joi.string().valid('call', 'email', 'visit', 'other').allow(null, '').default(null);

const checkIn = Joi.object({
  clientId: Joi.string().required(),
  activityTypeId: Joi.string().required(),
  activityDate: Joi.date().required(),
  geo: geoSchema.required(),
});

const productIdsSchema = Joi.array().items(Joi.string()).min(1);

const checkOut = Joi.object({
  productId: Joi.string().allow(null, ''),
  productIds: productIdsSchema.required(),
  outcomeId: Joi.string().required(),
  notes: Joi.string().min(10).required(),
  durationMinutes: Joi.number().positive().allow(null).default(null),
  nextActionDate: Joi.date().allow(null).default(null),
  nextActionType: Joi.when('nextActionDate', {
    is: Joi.exist().not(null),
    then: Joi.string().valid('call', 'email', 'visit', 'other').required(),
    otherwise: nextActionTypeSchema,
  }),
  nextActionNotes: Joi.string().allow(null, '').default(null),
  sale: saleSchema.optional(),
  geo: geoSchema.required(),
});

const quickCreate = Joi.object({
  clientId: Joi.string().required(),
  activityTypeId: Joi.string().required(),
  productId: Joi.string().allow(null, ''),
  productIds: productIdsSchema.required(),
  outcomeId: Joi.string().required(),
  activityDate: Joi.date().required(),
  notes: Joi.string().min(10).required(),
  durationMinutes: Joi.number().positive().required(),
  nextActionDate: Joi.date().allow(null).default(null),
  nextActionType: Joi.when('nextActionDate', {
    is: Joi.exist().not(null),
    then: Joi.string().valid('call', 'email', 'visit', 'other').required(),
    otherwise: nextActionTypeSchema,
  }),
  nextActionNotes: Joi.string().allow(null, '').default(null),
  sale: saleSchema.optional(),
  geo: geoSchema.allow(null).default(null),
});

const scheduleCreate = Joi.object({
  clientId: Joi.string().required(),
  activityTypeId: Joi.string().required(),
  activityDate: Joi.date().required(),
  userId: Joi.string().optional(),
  notes: Joi.string().allow(null, '').default(null),
});

const scheduleUpdate = Joi.object({
  clientId: Joi.string().required(),
  activityTypeId: Joi.string().required(),
  activityDate: Joi.date().required(),
  notes: Joi.string().allow(null, '').default(null),
});

const updateActivity = Joi.object({
  notes: Joi.string().min(10),
  durationMinutes: Joi.number().positive(),
  nextActionDate: Joi.date().allow(null),
  nextActionType: nextActionTypeSchema,
  nextActionNotes: Joi.string().allow(null, ''),
  productId: Joi.string().allow(null, ''),
  productIds: productIdsSchema,
  outcomeId: Joi.string(),
  sale: saleSchema,
});

module.exports = { checkIn, checkOut, quickCreate, scheduleCreate, scheduleUpdate, updateActivity };
