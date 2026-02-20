'use strict';

const AuditLog = require('../models/AuditLog');

async function audit({ entityName, entityId, action, userId = null, before = null, after = null, metadata = null }) {
  try {
    await AuditLog.create({
      entityName,
      entityId: String(entityId),
      action,
      userId: userId || null,
      before,
      after,
      metadata,
    });
  } catch (err) {
    console.error('[Audit] Error al guardar auditLog:', err.message);
  }
}

module.exports = { audit };
