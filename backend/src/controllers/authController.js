'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');
const User = require('../models/User');
const { apiResponse, apiError } = require('../utils/response');
const { audit } = require('../utils/audit');

async function login(req, res) {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      await audit({ entityName: 'Auth', entityId: email, action: 'LOGIN_FAIL', metadata: { reason: 'user_not_found' } });
      return apiError(res, 401, 'Credenciales incorrectas');
    }
    if (!user.isActive) {
      return apiError(res, 403, 'Cuenta desactivada');
    }
    const valid = await user.comparePassword(password);
    if (!valid) {
      await audit({ entityName: 'Auth', entityId: String(user._id), action: 'LOGIN_FAIL', userId: user._id, metadata: { reason: 'wrong_password' } });
      return apiError(res, 401, 'Credenciales incorrectas');
    }
    const token = jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    await audit({ entityName: 'Auth', entityId: String(user._id), action: 'LOGIN_SUCCESS', userId: user._id });
    return apiResponse(res, 200, { token, user: user.toSafeObject() });
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function me(req, res) {
  return apiResponse(res, 200, req.user.toSafeObject ? req.user.toSafeObject() : req.user);
}

async function logout(req, res) {
  return apiResponse(res, 200, { message: 'Sesión cerrada' });
}

module.exports = { login, me, logout };
