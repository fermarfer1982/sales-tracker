'use strict';

const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { apiResponse, apiError } = require('../utils/response');
const { audit } = require('../utils/audit');

async function listUsers(req, res) {
  try {
    const users = await User.find({}).select('-passwordHash').populate('zoneId', 'name').populate('managerUserId', 'name email');
    return apiResponse(res, 200, users);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function createUser(req, res) {
  try {
    const { name, email, password, role, zoneId, managerUserId } = req.body;
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return apiError(res, 409, 'Email ya registrado');
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash, role, zoneId: zoneId || null, managerUserId: managerUserId || null });
    await audit({ entityName: 'User', entityId: String(user._id), action: 'CREATE', userId: req.user._id, after: user.toSafeObject() });
    return apiResponse(res, 201, user.toSafeObject());
  } catch (err) {
    if (err.code === 11000) return apiError(res, 409, 'Email ya registrado');
    return apiError(res, 500, err.message);
  }
}

async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return apiError(res, 404, 'Usuario no encontrado');
    const before = user.toSafeObject();
    const { password, ...rest } = req.body;
    if (password) rest.passwordHash = await bcrypt.hash(password, 12);
    Object.assign(user, rest);
    await user.save();
    await audit({ entityName: 'User', entityId: id, action: 'UPDATE', userId: req.user._id, before, after: user.toSafeObject() });
    return apiResponse(res, 200, user.toSafeObject());
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function setActive(active) {
  return async function (req, res) {
    try {
      const user = await User.findByIdAndUpdate(req.params.id, { isActive: active }, { new: true }).select('-passwordHash');
      if (!user) return apiError(res, 404, 'Usuario no encontrado');
      await audit({ entityName: 'User', entityId: req.params.id, action: active ? 'ACTIVATE' : 'DEACTIVATE', userId: req.user._id });
      return apiResponse(res, 200, user);
    } catch (err) {
      return apiError(res, 500, err.message);
    }
  };
}

async function setRole(req, res) {
  try {
    const { role } = req.body;
    if (!['sales', 'manager', 'admin'].includes(role)) return apiError(res, 422, 'Rol inválido');
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-passwordHash');
    if (!user) return apiError(res, 404, 'Usuario no encontrado');
    await audit({ entityName: 'User', entityId: req.params.id, action: 'ROLE_CHANGE', userId: req.user._id, after: { role } });
    return apiResponse(res, 200, user);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function setManager(req, res) {
  try {
    const { managerUserId } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { managerUserId: managerUserId || null }, { new: true }).select('-passwordHash');
    if (!user) return apiError(res, 404, 'Usuario no encontrado');
    return apiResponse(res, 200, user);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

module.exports = { listUsers, createUser, updateUser, activateUser: setActive(true), deactivateUser: setActive(false), setRole, setManager };
