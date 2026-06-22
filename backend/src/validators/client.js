'use strict';

const Joi = require('joi');

const geoSchema = Joi.object({
  label: Joi.string().trim().allow(null, '').default(null),
  lat: Joi.number().required(),
  lng: Joi.number().required(),
  accuracyMeters: Joi.number().allow(null).default(null),
  capturedAt: Joi.date().allow(null).default(null),
});

const locationsSchema = Joi.array().items(geoSchema).default([]);
const updateLocationsSchema = Joi.array().items(geoSchema);

const createClient = Joi.object({
  legalName: Joi.string().trim().required(),
  clientType: Joi.string().valid('direct', 'indirect').default('direct'),
  taxId: Joi.when('clientType', {
    is: 'indirect',
    then: Joi.string().trim().allow(null, '').default(null),
    otherwise: Joi.string().trim().required(),
  }),
  province: Joi.string().trim().required(),
  city: Joi.string().trim().required(),
  zoneId: Joi.string().required(),
  segmentId: Joi.string().required(),
  phone: Joi.when('clientType', {
    is: 'indirect',
    then: Joi.string().trim().required(),
    otherwise: Joi.string().allow(null, '').default(null),
  }),
  email: Joi.string().email().lowercase().allow(null, '').default(null),
  notes: Joi.string().allow(null, '').default(null),
  geo: geoSchema.allow(null).default(null),
  locations: locationsSchema,
});

const updateClient = Joi.object({
  legalName: Joi.string().trim(),
  clientType: Joi.string().valid('direct', 'indirect'),
  taxId: Joi.string().trim().allow(null, ''),
  province: Joi.string().trim(),
  city: Joi.string().trim(),
  zoneId: Joi.string(),
  segmentId: Joi.string(),
  phone: Joi.string().allow(null, ''),
  email: Joi.string().email().lowercase().allow(null, ''),
  notes: Joi.string().allow(null, ''),
  geo: geoSchema.allow(null),
  locations: updateLocationsSchema,
}).custom((value, helpers) => {
  const type = value.clientType;
  if (type === 'direct' && Object.prototype.hasOwnProperty.call(value, 'taxId') && !value.taxId) {
    return helpers.error('any.custom', { message: 'El CIF/NIF es obligatorio para clientes directos' });
  }
  if (type === 'indirect' && Object.prototype.hasOwnProperty.call(value, 'phone') && !value.phone) {
    return helpers.error('any.custom', { message: 'El teléfono es obligatorio para clientes indirectos' });
  }
  return value;
}, 'client type validation').messages({
  'any.custom': '{{#message}}',
});

const setLocation = Joi.object({
  label: Joi.string().trim().allow(null, '').default(null),
  lat: Joi.number().required(),
  lng: Joi.number().required(),
  accuracyMeters: Joi.number().default(null),
  capturedAt: Joi.date().default(() => new Date()),
});

module.exports = { createClient, updateClient, setLocation };
