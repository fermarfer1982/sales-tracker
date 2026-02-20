'use strict';

function errorHandler(err, req, res, next) {
  console.error('[Error]', err.message);
  if (err.name === 'ValidationError') {
    return res.status(422).json({ success: false, message: err.message });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'campo';
    return res.status(409).json({ success: false, message: `Valor duplicado en el campo: ${field}` });
  }
  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Error interno del servidor';
  return res.status(status).json({ success: false, message });
}

module.exports = { errorHandler };
