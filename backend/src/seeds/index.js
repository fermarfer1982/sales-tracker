'use strict';

require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const config = require('../config');
const User = require('../models/User');
const Client = require('../models/Client');
const Activity = require('../models/Activity');
const { ActivityType, Product, Outcome, Zone, Segment } = require('../models/Catalog');
const AppSetting = require('../models/AppSetting');
const { DEFAULT_SETTINGS } = require('../controllers/settingsController');

async function seed() {
  await mongoose.connect(config.mongoUri);
  console.log('[Seed] Conectado a MongoDB');

  // Limpiar colecciones
  await Promise.all([
    User.deleteMany({}),
    Client.deleteMany({}),
    Activity.deleteMany({}),
    ActivityType.deleteMany({}),
    Product.deleteMany({}),
    Outcome.deleteMany({}),
    Zone.deleteMany({}),
    Segment.deleteMany({}),
    AppSetting.deleteMany({}),
  ]);
  console.log('[Seed] Colecciones limpiadas');

  // Catálogos
  const activityTypes = await ActivityType.insertMany([
    { name: 'visita' }, { name: 'llamada' }, { name: 'email' }, { name: 'viaje' }, { name: 'administracion' }, { name: 'feria' },
  ]);
  const outcomes = await Outcome.insertMany([
    { name: 'oferta' }, { name: 'pedido' }, { name: 'seguimiento' }, { name: 'incidencia' }, { name: 'sin_contacto' },
  ]);
  const zones = await Zone.insertMany([
    { name: 'Norte' }, { name: 'Centro' }, { name: 'Sur' },
  ]);
  const segments = await Segment.insertMany([
    { name: 'Distribuidor' }, { name: 'Tienda' }, { name: 'Cooperativa' },
  ]);
  const products = await Product.insertMany([
    { name: 'Producto A' }, { name: 'Producto B' }, { name: 'Producto C' },
  ]);
  console.log('[Seed] Catálogos creados');

  // AppSettings
  await AppSetting.insertMany(DEFAULT_SETTINGS);
  console.log('[Seed] Configuración por defecto creada');

  // Usuarios
  const hashPwd = await bcrypt.hash('Admin123!', 12);
  const adminUser = await User.create({
    name: 'Administrador BI',
    email: 'admin@empresa.local',
    passwordHash: hashPwd,
    role: 'admin',
    zoneId: zones[1]._id,
  });
  const managerUser = await User.create({
    name: 'Jefe de Ventas',
    email: 'jefe@empresa.local',
    passwordHash: hashPwd,
    role: 'manager',
    zoneId: zones[1]._id,
  });
  const comercial1 = await User.create({
    name: 'Comercial Uno',
    email: 'comercial1@empresa.local',
    passwordHash: hashPwd,
    role: 'sales',
    zoneId: zones[0]._id,
    managerUserId: managerUser._id,
  });
  const comercial2 = await User.create({
    name: 'Comercial Dos',
    email: 'comercial2@empresa.local',
    passwordHash: hashPwd,
    role: 'sales',
    zoneId: zones[2]._id,
    managerUserId: managerUser._id,
  });
  console.log('[Seed] Usuarios creados');

  // Clientes demo
  const clients = await Client.insertMany([
    {
      legalName: 'Distribuidora Norte S.L.',
      taxId: 'B12345674',
      province: 'Asturias',
      city: 'Oviedo',
      zoneId: zones[0]._id,
      segmentId: segments[0]._id,
      phone: '985123456',
      email: 'contacto@distrinorte.es',
      createdBy: comercial1._id,
      geo: { lat: 43.3614, lng: -5.8593, accuracyMeters: 10, capturedAt: new Date() },
    },
    {
      legalName: 'Cooperativa Agrícola del Centro',
      taxId: 'F28765432',
      province: 'Madrid',
      city: 'Alcalá de Henares',
      zoneId: zones[1]._id,
      segmentId: segments[2]._id,
      phone: '918765432',
      createdBy: adminUser._id,
    },
    {
      legalName: 'Tienda Gourmet Sur',
      taxId: 'B41234568',
      province: 'Sevilla',
      city: 'Sevilla',
      zoneId: zones[2]._id,
      segmentId: segments[1]._id,
      phone: '954321654',
      createdBy: comercial2._id,
      geo: { lat: 37.3882, lng: -5.9952, accuracyMeters: 15, capturedAt: new Date() },
    },
  ]);
  console.log('[Seed] Clientes creados');

  // Actividades demo
  const today = new Date();
  today.setHours(10, 0, 0, 0);
  await Activity.create({
    userId: comercial1._id,
    clientId: clients[0]._id,
    activityTypeId: activityTypes[0]._id,
    productId: products[0]._id,
    outcomeId: outcomes[1]._id,
    activityDate: today,
    notes: 'Reunión de presentación de nuevos productos. El cliente mostró interés.',
    durationMinutes: 60,
    status: 'completed',
    checkIn: {
      at: today,
      geo: { lat: 43.3614, lng: -5.8593, accuracyMeters: 10, capturedAt: today, serverReceivedAt: today, status: 'ok' },
    },
    checkOut: {
      at: new Date(today.getTime() + 60 * 60000),
      geo: { lat: 43.3614, lng: -5.8593, accuracyMeters: 10, capturedAt: new Date(today.getTime() + 60 * 60000), serverReceivedAt: new Date(), status: 'ok' },
      distanceToClientMeters: 5,
      withinExpectedArea: true,
    },
  });
  console.log('[Seed] Actividades demo creadas');

  console.log('\n[Seed] COMPLETADO ✓');
  console.log('----------------------------');
  console.log('Usuarios demo:');
  console.log('  admin@empresa.local     / Admin123!  (admin)');
  console.log('  jefe@empresa.local      / Admin123!  (manager)');
  console.log('  comercial1@empresa.local / Admin123! (sales)');
  console.log('  comercial2@empresa.local / Admin123! (sales)');
  console.log('----------------------------');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('[Seed] Error:', err.message);
  process.exit(1);
});
