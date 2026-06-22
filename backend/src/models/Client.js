'use strict';

const mongoose = require('mongoose');

const geoSubSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: null },
    lat: Number,
    lng: Number,
    accuracyMeters: Number,
    capturedAt: Date,
  },
  { _id: true }
);

const clientSchema = new mongoose.Schema(
  {
    legalName: { type: String, required: true, trim: true },
    clientType: { type: String, enum: ['direct', 'indirect'], default: 'direct' },
    taxId: { type: String, uppercase: true, trim: true, default: null },
    province: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone', required: true },
    segmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Segment', required: true },
    phone: { type: String, trim: true, default: null },
    email: { type: String, trim: true, lowercase: true, default: null },
    notes: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    geo: {
      type: {
        lat: Number,
        lng: Number,
        accuracyMeters: Number,
        capturedAt: Date,
      },
      default: null,
    },
    locations: { type: [geoSubSchema], default: [] },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

clientSchema.index({ legalName: 'text' });
clientSchema.index(
  { taxId: 1 },
  { unique: true, partialFilterExpression: { taxId: { $type: 'string' }, deletedAt: null } }
);

module.exports = mongoose.model('Client', clientSchema);
