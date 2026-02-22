'use strict';

const Joi = require('joi');

const login = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().required(),
});

module.exports = { login };
