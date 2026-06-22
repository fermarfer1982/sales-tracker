'use strict';

const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Client = require('../models/Client');
const { apiResponse, apiError } = require('../utils/response');
const { audit } = require('../utils/audit');
const { getAccessibleSalesUserIds } = require('../utils/salesScope');
const { parseCsvText } = require('../utils/csv');

function normalizeOrderEmails(value) {
  return String(value || '')
    .split(/[;,\n]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
    .join(', ');
}

function invalidOrderEmail(value) {
  return String(value || '')
    .split(/[;,\n]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
    .find((email) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email));
}

async function listUsers(req, res) {
  try {
    const users = await User.find({}).select('-passwordHash').populate('zoneId', 'name').populate('managerUserId', 'name email');
    return apiResponse(res, 200, users);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function listVisibleSalesUsers(req, res) {
  try {
    const userIds = await getAccessibleSalesUserIds(req.user, { isActive: true });
    const users = await User.find({ _id: { $in: userIds } })
      .select('-passwordHash')
      .populate('zoneId', 'name')
      .populate('managerUserId', 'name email');
    return apiResponse(res, 200, users);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function createUser(req, res) {
  try {
    const { name, email, password, role, zoneId, managerUserId, canViewAllSales, orderEmail } = req.body;
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return apiError(res, 409, 'Email ya registrado');
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      zoneId: role === 'admin' ? null : (zoneId || null),
      managerUserId: role === 'sales' ? (managerUserId || null) : null,
      canViewAllSales: role === 'manager' ? Boolean(canViewAllSales) : false,
      orderEmail: normalizeOrderEmails(orderEmail) || null,
    });
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
    if (String(user._id) === String(req.user._id) && req.body.isActive === false) {
      return apiError(res, 422, 'No puedes desactivarte a ti mismo');
    }

    const before = user.toSafeObject();
    const { password, email, role, managerUserId, zoneId, canViewAllSales, ...rest } = req.body;
    const updates = { ...rest };

    if (email && email.toLowerCase() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: id } }).select('_id');
      if (existing) return apiError(res, 409, 'Email ya registrado');
      updates.email = email.toLowerCase();
    }

    if (role) updates.role = role;
    updates.zoneId = zoneId || null;
    updates.managerUserId = managerUserId || null;
    updates.canViewAllSales = Boolean(canViewAllSales);

    if ((role || user.role) !== 'sales') updates.managerUserId = null;
    if ((role || user.role) === 'admin') updates.zoneId = null;
    if ((role || user.role) !== 'manager') updates.canViewAllSales = false;

    if (password) updates.passwordHash = await bcrypt.hash(password, 12);
    Object.assign(user, updates);
    await user.save();
    await audit({ entityName: 'User', entityId: id, action: 'UPDATE', userId: req.user._id, before, after: user.toSafeObject() });
    return apiResponse(res, 200, user.toSafeObject());
  } catch (err) {
    if (err.code === 11000) return apiError(res, 409, 'Email ya registrado');
    return apiError(res, 500, err.message);
  }
}

function setActive(active) {
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
    const updates = { role };
    if (role !== 'sales') updates.managerUserId = null;
    if (role === 'admin') updates.zoneId = null;
    if (role !== 'manager') updates.canViewAllSales = false;
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-passwordHash');
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

async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    if (String(id) === String(req.user._id)) return apiError(res, 422, 'No puedes borrar tu propio usuario');

    const user = await User.findById(id).select('-passwordHash');
    if (!user) return apiError(res, 404, 'Usuario no encontrado');

    const [activityCount, clientCount, managedCount] = await Promise.all([
      Activity.countDocuments({ userId: id, deletedAt: null }),
      Client.countDocuments({ createdBy: id, deletedAt: null }),
      User.countDocuments({ managerUserId: id }),
    ]);

    if (activityCount > 0 || clientCount > 0 || managedCount > 0) {
      return apiError(
        res,
        409,
        'No se puede borrar el usuario porque tiene datos relacionados. Desactivalo o reasigna sus dependencias primero.'
      );
    }

    const before = user.toObject();
    await User.findByIdAndDelete(id);
    await audit({ entityName: 'User', entityId: id, action: 'DELETE', userId: req.user._id, before });
    return apiResponse(res, 200, { message: 'Usuario eliminado' });
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function parseUserImportRows(csvText) {
  const rows = parseCsvText(csvText);
  const managers = await User.find({ role: 'manager' }).select('_id name email');
  const zones = await User.db.model('Zone').find({}).select('_id name');
  const managerByEmail = new Map(managers.map((manager) => [manager.email.toLowerCase(), manager]));
  const zoneByName = new Map(zones.map((zone) => [zone.name.toLowerCase(), zone]));

  const parsed = [];
  for (const row of rows) {
    const errors = [];
    const name = row.nombre || row.name || '';
    const email = (row.email || '').trim().toLowerCase();
    const password = row.password || row.contrasena || row['contraseña'] || '';
    const role = (row.rol || row.role || '').trim().toLowerCase();
    const zoneName = (row.representante || row.zona || row.zone || '').trim();
    const managerEmail = (row.manager_email || row.manager || '').trim().toLowerCase();
    const canViewAllSales = ['si', 'sí', 'true', '1'].includes(String(row.ver_toda_la_red || row.canviewallsales || '').trim().toLowerCase());
    const isActive = !['no', 'false', '0'].includes(String(row.activo || row.isactive || 'si').trim().toLowerCase());
    const orderEmail = normalizeOrderEmails(row.email_pedidos || row.order_email || row.orderemail || '');

    if (!name) errors.push('Nombre requerido');
    if (!email) errors.push('Email requerido');
    if (!password || password.length < 8) errors.push('Contraseña mínima de 8 caracteres');
    if (!['sales', 'manager', 'admin'].includes(role)) errors.push('Rol inválido');
    const badOrderEmail = invalidOrderEmail(orderEmail);
    if (badOrderEmail) errors.push(`Email pedidos inválido: ${badOrderEmail}`);

    const zone = zoneName ? zoneByName.get(zoneName.toLowerCase()) : null;
    if (zoneName && !zone) errors.push(`Representante no encontrado: ${zoneName}`);

    const manager = managerEmail ? managerByEmail.get(managerEmail) : null;
    if (managerEmail && !manager) errors.push(`Manager no encontrado: ${managerEmail}`);
    if (role !== 'sales' && managerEmail) errors.push('Solo los usuarios sales pueden tener manager');

    const existing = email ? await User.findOne({ email }).select('_id') : null;
    if (existing) errors.push(`Email ya registrado: ${email}`);

    parsed.push({
      row: row.__row,
      valid: errors.length === 0,
      errors,
      data: {
        name,
        email,
        password,
        role,
        zoneId: zone ? zone._id : null,
        managerUserId: manager ? manager._id : null,
        canViewAllSales: role === 'manager' ? canViewAllSales : false,
        orderEmail: normalizeOrderEmails(orderEmail) || null,
        isActive,
      },
    });
  }
  return parsed;
}

async function previewUserImport(req, res) {
  try {
    const parsed = await parseUserImportRows(req.body.csvText);
    return apiResponse(res, 200, {
      total: parsed.length,
      valid: parsed.filter((item) => item.valid).length,
      invalid: parsed.filter((item) => !item.valid).length,
      rows: parsed,
    });
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function importUsers(req, res) {
  try {
    const parsed = await parseUserImportRows(req.body.csvText);
    const invalidRows = parsed.filter((item) => !item.valid);
    if (invalidRows.length > 0) {
      return apiError(res, 422, 'El CSV contiene filas inválidas', invalidRows.map((item) => `Fila ${item.row}: ${item.errors.join(', ')}`));
    }

    const created = [];
    for (const item of parsed) {
      const passwordHash = await bcrypt.hash(item.data.password, 12);
      const user = await User.create({
        name: item.data.name,
        email: item.data.email,
        passwordHash,
        role: item.data.role,
        zoneId: item.data.role === 'admin' ? null : item.data.zoneId,
        managerUserId: item.data.role === 'sales' ? item.data.managerUserId : null,
        canViewAllSales: item.data.canViewAllSales,
        isActive: item.data.isActive,
      });
      created.push(user.toSafeObject());
    }

    await audit({ entityName: 'User', entityId: 'bulk-import', action: 'IMPORT', userId: req.user._id, after: { total: created.length } });
    return apiResponse(res, 201, { totalCreated: created.length, created });
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

module.exports = { listUsers, listVisibleSalesUsers, createUser, updateUser, activateUser: setActive(true), deactivateUser: setActive(false), setRole, setManager, deleteUser, previewUserImport, importUsers };
