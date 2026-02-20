'use strict';

const mongoose = require('mongoose');
const config = require('./index');

let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log('[MongoDB] Conectado:', config.mongoUri);
  } catch (err) {
    console.error('[MongoDB] Error de conexión:', err.message);
    process.exit(1);
  }
}

module.exports = { connectDB };
