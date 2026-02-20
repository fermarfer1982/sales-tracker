'use strict';

const mongoose = require('mongoose');

const geoSubSchema = new mongoose.Schema(
  {
    lat: Number,
    lng: Number,
    accuracyMeters: Number,
    capturedAt: Date,
  },
  { _id: false }
);

const clientSchema = new mongoose.Schema(
  {
    legalName: { type: String, required: true, trim: true },
    taxId: { type: String, required: true, uppercase: true, trim: true },
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
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

clientSchema.index({ legalName: 'text' });
clientSchema.index(
  { taxId: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);

module.exports = mongoose.model('Client', clientSchema);
