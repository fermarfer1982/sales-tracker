'use strict';

const Joi = require('joi');

const INTERNAL_EMAIL_REGEX = /^[^\s@]+@[^\s@]+$/;

const login = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .pattern(INTERNAL_EMAIL_REGEX)
    .required()
    .messages({ 'string.pattern.base': 'Email inválido' }),
  password: Joi.string().required(),
});

module.exports = { login };
