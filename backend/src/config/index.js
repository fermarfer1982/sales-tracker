'use strict';

require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3001,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/sales_tracker',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_in_prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    secure: process.env.SMTP_SECURE === 'true',
    from: process.env.MAIL_FROM || 'no-reply@empresa.local',
  },
  adminAlertEmail: process.env.ADMIN_ALERT_EMAIL,
  tz: process.env.TZ || 'Europe/Madrid',
  reportCutoffHour: parseInt(process.env.REPORT_CUTOFF_HOUR, 10) || 19,
  reportCutoffMinute: parseInt(process.env.REPORT_CUTOFF_MINUTE, 10) || 30,
  geofenceRadiusMeters: parseInt(process.env.GEOFENCE_RADIUS_METERS, 10) || 300,
};
