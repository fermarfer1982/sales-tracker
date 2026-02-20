'use strict';

const AppSetting = require('../models/AppSetting');
const { apiResponse, apiError } = require('../utils/response');
const { audit } = require('../utils/audit');

const DEFAULT_SETTINGS = [
  { key: 'reportCutoffHour', value: 19, description: 'Hora de corte para notificaciones (0-23)' },
  { key: 'reportCutoffMinute', value: 30, description: 'Minuto de corte para notificaciones (0-59)' },
  { key: 'timezone', value: 'Europe/Madrid', description: 'Zona horaria del servidor' },
  { key: 'geofenceRadiusMeters', value: 300, description: 'Radio en metros para validar geofence en checkout' },
  { key: 'adminAlertEmail', value: '', description: 'Email de alerta para administrador' },
];

async function getSettings(req, res) {
  try {
    const settings = await AppSetting.find({});
    const map = {};
    settings.forEach(s => { map[s.key] = s.value; });
    DEFAULT_SETTINGS.forEach(d => {
      if (!(d.key in map)) map[d.key] = d.value;
    });
    return apiResponse(res, 200, map);
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

async function updateSettings(req, res) {
  try {
    const entries = req.body;
    const ops = Object.entries(entries).map(([key, value]) => ({
      updateOne: {
        filter: { key },
        update: { $set: { value, updatedBy: req.user._id } },
        upsert: true,
      },
    }));
    await AppSetting.bulkWrite(ops);
    await audit({ entityName: 'AppSetting', entityId: 'settings', action: 'UPDATE', userId: req.user._id, after: entries });
    return apiResponse(res, 200, { message: 'Configuración actualizada' });
  } catch (err) {
    return apiError(res, 500, err.message);
  }
}

module.exports = { getSettings, updateSettings, DEFAULT_SETTINGS };
