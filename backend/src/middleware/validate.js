'use strict';

const { apiError } = require('../utils/response');

function validate(schema, target = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[target], { abortEarly: false, stripUnknown: true });
    if (error) {
      const errors = error.details.map((d) => d.message);
      return apiError(res, 422, 'Error de validación', errors);
    }
    req[target] = value;
    next();
  };
}

module.exports = { validate };
