'use strict';

const Joi = require('joi');
const emailField = Joi.string().email({ tlds: { allow: false } }).lowercase();

function validateEmailList(value, helpers) {
  if (value == null || value === '') return value;
  const emails = String(value)
    .split(/[;,\n]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const invalid = emails.find((email) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email));
  if (invalid) return helpers.error('any.custom', { message: `Email pedidos inválido: ${invalid}` });
  return emails.join(', ');
}
const emailListField = Joi.string().allow(null, '').custom(validateEmailList, 'email list validation').messages({ 'any.custom': '{{#message}}' });

const createUser = Joi.object({
  name: Joi.string().trim().required(),
  email: emailField.required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('sales', 'manager', 'admin').required(),
  zoneId: Joi.string().allow(null, '').default(null),
  managerUserId: Joi.string().allow(null, '').default(null),
  canViewAllSales: Joi.boolean().default(false),
  orderEmail: emailListField.default(null),
});

const updateUser = Joi.object({
  name: Joi.string().trim(),
  email: emailField,
  role: Joi.string().valid('sales', 'manager', 'admin'),
  zoneId: Joi.string().allow(null, ''),
  managerUserId: Joi.string().allow(null, ''),
  password: Joi.string().min(8),
  canViewAllSales: Joi.boolean(),
  orderEmail: emailListField,
  isActive: Joi.boolean(),
});

module.exports = { createUser, updateUser };
