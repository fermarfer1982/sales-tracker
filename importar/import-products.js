#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const mongoose = require('../backend/node_modules/mongoose');

require('../backend/node_modules/dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const config = require('../backend/src/config');
const { Product } = require('../backend/src/models/Catalog');

const CSV_PATH = path.resolve(__dirname, 'data.csv');
const DEMO_PRODUCTS = ['Producto A', 'Producto B', 'Producto C'];

function normalizeCell(value) {
  return String(value || '')
    .replace(/\uFEFF/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDelimitedLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ';' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map(normalizeCell);
}

function loadProductsFromCsv() {
  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error('El CSV no contiene filas de datos');

  const [headerLine, ...dataLines] = lines;
  const headers = parseDelimitedLine(headerLine);
  const tipoIndex = headers.findIndex((value) => value.toUpperCase() === 'TIPO');
  const variedadIndex = headers.findIndex((value) => value.toUpperCase() === 'VARIEDAD');

  if (tipoIndex === -1 || variedadIndex === -1) {
    throw new Error('El CSV debe tener columnas TIPO y VARIEDAD');
  }

  const names = [];
  for (const line of dataLines) {
    const values = parseDelimitedLine(line);
    const tipo = normalizeCell(values[tipoIndex]);
    const variedad = normalizeCell(values[variedadIndex]);
    if (!tipo || !variedad) continue;
    names.push(`${tipo} - ${variedad}`);
  }

  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
}

async function run() {
  const productNames = loadProductsFromCsv();
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });

  const existing = await Product.find({}).select('name isActive');
  const existingMap = new Map(existing.map((item) => [item.name, item]));

  let created = 0;
  let reactivated = 0;

  for (const name of productNames) {
    const current = existingMap.get(name);
    if (!current) {
      const createdItem = await Product.create({ name, isActive: true });
      existingMap.set(name, createdItem);
      created += 1;
      continue;
    }

    if (!current.isActive) {
      current.isActive = true;
      await current.save();
      reactivated += 1;
    }
  }

  const demoItems = await Product.find({ name: { $in: DEMO_PRODUCTS } });
  let deactivatedDemo = 0;
  for (const item of demoItems) {
    if (item.isActive) {
      item.isActive = false;
      await item.save();
      deactivatedDemo += 1;
    }
  }

  console.log(`Productos en CSV: ${productNames.length}`);
  console.log(`Productos creados: ${created}`);
  console.log(`Productos reactivados: ${reactivated}`);
  console.log(`Productos demo desactivados: ${deactivatedDemo}`);
  console.log('Importación completada.');

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('Error importando productos:', err.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
