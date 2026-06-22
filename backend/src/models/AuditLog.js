'use strict';

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    entityName: { type: String, required: true },
    entityId: { type: String, required: true },
    action: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
    at: { type: Date, default: () => new Date() },
  },
  { versionKey: false }
);

auditLogSchema.index({ entityName: 1, entityId: 1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ at: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
