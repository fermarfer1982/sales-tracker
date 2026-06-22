'use strict';

function apiResponse(res, statusCode, data, meta = null) {
  const payload = { success: statusCode < 400, data };
  if (meta) payload.meta = meta;
  return res.status(statusCode).json(payload);
}

function apiError(res, statusCode, message, errors = null) {
  const payload = { success: false, message };
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
}

module.exports = { apiResponse, apiError };
