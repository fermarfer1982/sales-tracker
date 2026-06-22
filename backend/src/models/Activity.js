'use strict';

const mongoose = require('mongoose');

const geoCheckSchema = new mongoose.Schema(
  {
    lat: Number,
    lng: Number,
    accuracyMeters: Number,
    capturedAt: Date,
    serverReceivedAt: { type: Date, default: () => new Date() },
    status: {
      type: String,
      enum: ['ok', 'denied', 'unavailable', 'timeout'],
      default: 'ok',
    },
  },
  { _id: false }
);

const checkInSchema = new mongoose.Schema(
  {
    at: Date,
    geo: geoCheckSchema,
  },
  { _id: false }
);

const checkOutSchema = new mongoose.Schema(
  {
    at: Date,
    geo: {
      type: geoCheckSchema,
    },
    distanceToClientMeters: { type: Number, default: null },
    withinExpectedArea: { type: Boolean, default: null },
  },
  { _id: false }
);

const saleItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: null },
    normalizedQuantity: { type: Number, default: null },
    unit: { type: String, enum: ['SE', 'PI', 'GR', null], default: null },
    unitPrice: { type: Number, default: null },
    totalAmount: { type: Number, default: null },
  },
  { _id: false }
);

const orderEmailSchema = new mongoose.Schema(
  {
    recipientEmail: { type: String, trim: true, lowercase: true, default: null },
    status: { type: String, enum: ['none', 'sent', 'failed'], default: 'none' },
    sentAt: { type: Date, default: null },
    error: { type: String, default: null },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    isClosed: { type: Boolean, default: false },
    quantity: { type: Number, default: null },
    unitPrice: { type: Number, default: null },
    totalAmount: { type: Number, default: null },
    items: { type: [saleItemSchema], default: [] },
    orderNotes: { type: String, default: null },
    orderEmail: { type: orderEmailSchema, default: () => ({ status: 'none' }) },
    intermediaryClientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Client' }],
  },
  { _id: false }
);

const activitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    activityDate: { type: Date, required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    activityTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'ActivityType', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    productIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], default: [] },
    outcomeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Outcome', default: null },
    notes: { type: String, default: null },
    durationMinutes: { type: Number, default: null },
    nextActionDate: { type: Date, default: null },
    nextActionType: {
      type: String,
      enum: ['call', 'email', 'visit', 'other', null],
      default: null,
    },
    nextActionNotes: { type: String, default: null },
    followUpScheduledActivityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', default: null },
    followUpSourceActivityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', default: null },
    isDraft: { type: Boolean, default: false },
    checkIn: { type: checkInSchema, default: null },
    checkOut: { type: checkOutSchema, default: null },
    sale: {
      type: saleSchema,
      default: () => ({
        isClosed: false,
        quantity: null,
        unitPrice: null,
        totalAmount: null,
        items: [],
        orderNotes: null,
        orderEmail: { status: 'none' },
        intermediaryClientIds: [],
      }),
    },
    status: {
      type: String,
      enum: ['draft', 'in_progress', 'completed'],
      default: 'draft',
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

activitySchema.index({ userId: 1, activityDate: 1 });
activitySchema.index({ clientId: 1, activityDate: 1 });

module.exports = mongoose.model('Activity', activitySchema);
