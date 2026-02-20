'use strict';

const Joi = require('joi');

const createClient = Joi.object({
  legalName: Joi.string().trim().required(),
  taxId: Joi.string().trim().required(),
  province: Joi.string().trim().required(),
  city: Joi.string().trim().required(),
  zoneId: Joi.string().required(),
  segmentId: Joi.string().required(),
  phone: Joi.string().allow(null, '').default(null),
  email: Joi.string().email().lowercase().allow(null, '').default(null),
  notes: Joi.string().allow(null, '').default(null),
  geo: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required(),
    accuracyMeters: Joi.number().default(null),
    capturedAt: Joi.date().default(null),
  }).allow(null).default(null),
});

const updateClient = Joi.object({
  legalName: Joi.string().trim(),
  province: Joi.string().trim(),
  city: Joi.string().trim(),
  zoneId: Joi.string(),
  segmentId: Joi.string(),
  phone: Joi.string().allow(null, ''),
  email: Joi.string().email().lowercase().allow(null, ''),
  notes: Joi.string().allow(null, ''),
});

const setLocation = Joi.object({
  lat: Joi.number().required(),
  lng: Joi.number().required(),
  accuracyMeters: Joi.number().default(null),
  capturedAt: Joi.date().default(() => new Date()),
});

module.exports = { createClient, updateClient, setLocation };
