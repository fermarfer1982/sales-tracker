#!/usr/bin/env node
'use strict';

const path = require('path');
const dotenv = require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv'));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });
const mongoose = require(path.join(__dirname, '..', 'backend', 'node_modules', 'mongoose'));
const config = require('../backend/src/config');
const Client = require('../backend/src/models/Client');
const Activity = require('../backend/src/models/Activity');
const { ActivityType, Outcome } = require('../backend/src/models/Catalog');

async function upsertActive(Model, name) {
  await Model.findOneAndUpdate(
    { name: new RegExp(`^${name}$`, 'i') },
    { $set: { name, isActive: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function syncCatalogs() {
  await upsertActive(ActivityType, 'comida');
  await upsertActive(Outcome, 'impago');
  await Outcome.updateMany({ name: /^sin_contacto$/i }, { $set: { isActive: false } });
}

async function syncClientIndexes() {
  try {
    await Client.collection.dropIndex('taxId_1');
    console.log('[sync] Índice taxId_1 anterior eliminado');
  } catch (err) {
    if (err.codeName !== 'IndexNotFound' && err.code !== 27) throw err;
  }

  await Client.collection.createIndex(
    { taxId: 1 },
    {
      unique: true,
      partialFilterExpression: { taxId: { $type: 'string' }, deletedAt: null },
      name: 'taxId_1',
    }
  );
  console.log('[sync] Índice taxId_1 parcial creado');
}


async function syncSalesQuantities() {
  const activities = await Activity.find({
    deletedAt: null,
    'sale.isClosed': true,
    'sale.items.0': { $exists: true },
    'sale.items.normalizedQuantity': { $exists: false },
  });

  let updatedCount = 0;
  for (const activity of activities) {
    let totalQuantity = 0;
    let changed = false;
    activity.sale.items = activity.sale.items.map((item) => {
      if (item.quantity == null || item.normalizedQuantity != null) {
        totalQuantity += Number(item.quantity || 0);
        return item;
      }
      const normalizedQuantity = Number(item.quantity);
      const realQuantity = Math.round(normalizedQuantity * 1000);
      totalQuantity += realQuantity;
      changed = true;
      return {
        ...(item.toObject?.() || item),
        quantity: realQuantity,
        normalizedQuantity,
      };
    });
    if (changed) {
      activity.sale.quantity = totalQuantity;
      await activity.save();
      updatedCount += 1;
    }
  }
  console.log(`[sync] Ventas antiguas migradas a cantidad real: ${updatedCount}`);
}

async function syncClients() {
  const typeResult = await Client.updateMany({ clientType: { $exists: false } }, { $set: { clientType: 'direct' } });
  const nullTaxResult = await Client.updateMany({ taxId: '' }, { $set: { taxId: null } });
  const clientsWithGeo = await Client.find({ geo: { $ne: null }, $or: [{ locations: { $exists: false } }, { locations: { $size: 0 } }] });
  for (const client of clientsWithGeo) {
    client.locations = [{
      label: 'finca1',
      lat: client.geo.lat,
      lng: client.geo.lng,
      accuracyMeters: client.geo.accuracyMeters ?? null,
      capturedAt: client.geo.capturedAt || client.updatedAt || new Date(),
    }];
    await client.save();
  }
  console.log(`[sync] Clientes con tipo por defecto: ${typeResult.modifiedCount || 0}`);
  console.log(`[sync] TaxId vacíos normalizados: ${nullTaxResult.modifiedCount || 0}`);
  console.log(`[sync] Clientes con geo migrada a finca1: ${clientsWithGeo.length}`);
}

async function main() {
  await mongoose.connect(config.mongoUri);
  await syncCatalogs();
  await syncClients();
  await syncSalesQuantities();
  await syncClientIndexes();
  await mongoose.disconnect();
  console.log('[sync] Cambios operativos aplicados');
}

main().catch(async (err) => {
  console.error('[sync] Error:', err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
