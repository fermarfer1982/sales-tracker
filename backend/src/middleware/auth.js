'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const { apiError } = require('../utils/response');

async function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return apiError(res, 401, 'Token de autenticación requerido');
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user || !user.isActive) {
      return apiError(res, 401, 'Usuario no encontrado o inactivo');
    }
    req.user = user;
    next();
  } catch (err) {
    return apiError(res, 401, 'Token inválido o expirado');
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return apiError(res, 401, 'No autenticado');
    if (!roles.includes(req.user.role)) {
      return apiError(res, 403, 'No tienes permiso para esta acción');
    }
    next();
  };
}

module.exports = { authenticate, authorize };
