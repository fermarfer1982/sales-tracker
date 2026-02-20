'use strict';

const mongoose = require('mongoose');

function makeCatalogModel(name) {
  const schema = new mongoose.Schema(
    {
      name: { type: String, required: true, unique: true, trim: true },
      isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
  );
  return mongoose.model(name, schema);
}

const ActivityType = makeCatalogModel('ActivityType');
const Product = makeCatalogModel('Product');
const Outcome = makeCatalogModel('Outcome');
const Zone = makeCatalogModel('Zone');
const Segment = makeCatalogModel('Segment');

module.exports = { ActivityType, Product, Outcome, Zone, Segment };
