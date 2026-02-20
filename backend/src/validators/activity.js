'use strict';

const Joi = require('joi');

const geoSchema = Joi.object({
  lat: Joi.number().required(),
  lng: Joi.number().required(),
  accuracyMeters: Joi.number().default(null),
  capturedAt: Joi.date().required(),
  status: Joi.string().valid('ok', 'denied', 'unavailable', 'timeout').default('ok'),
});

const checkIn = Joi.object({
  clientId: Joi.string().required(),
  activityTypeId: Joi.string().required(),
  activityDate: Joi.date().required(),
  geo: geoSchema.required(),
});

const checkOut = Joi.object({
  productId: Joi.string().required(),
  outcomeId: Joi.string().required(),
  notes: Joi.string().min(10).required(),
  durationMinutes: Joi.number().positive().allow(null).default(null),
  nextActionDate: Joi.date().allow(null).default(null),
  nextActionNotes: Joi.string().allow(null, '').default(null),
  geo: geoSchema.required(),
});

const quickCreate = Joi.object({
  clientId: Joi.string().required(),
  activityTypeId: Joi.string().required(),
  productId: Joi.string().required(),
  outcomeId: Joi.string().required(),
  activityDate: Joi.date().required(),
  notes: Joi.string().min(10).required(),
  durationMinutes: Joi.number().positive().required(),
  nextActionDate: Joi.date().allow(null).default(null),
  nextActionNotes: Joi.string().allow(null, '').default(null),
  geo: geoSchema.required(),
});

const updateActivity = Joi.object({
  notes: Joi.string().min(10),
  durationMinutes: Joi.number().positive(),
  nextActionDate: Joi.date().allow(null),
  nextActionNotes: Joi.string().allow(null, ''),
  productId: Joi.string(),
  outcomeId: Joi.string(),
});

module.exports = { checkIn, checkOut, quickCreate, updateActivity };
