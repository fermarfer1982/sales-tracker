'use strict';

const Joi = require('joi');

const createUser = Joi.object({
  name: Joi.string().trim().required(),
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('sales', 'manager', 'admin').required(),
  zoneId: Joi.string().allow(null, '').default(null),
  managerUserId: Joi.string().allow(null, '').default(null),
});

const updateUser = Joi.object({
  name: Joi.string().trim(),
  email: Joi.string().email().lowercase(),
  zoneId: Joi.string().allow(null, ''),
  managerUserId: Joi.string().allow(null, ''),
  password: Joi.string().min(8),
});

module.exports = { createUser, updateUser };
