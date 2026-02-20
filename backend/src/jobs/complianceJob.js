'use strict';

const cron = require('node-cron');
const User = require('../models/User');
const Activity = require('../models/Activity');
const AppSetting = require('../models/AppSetting');
const { sendMail, buildComplianceEmailHtml } = require('../services/emailService');
const config = require('../config');

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

async function getSetting(key, fallback) {
  const setting = await AppSetting.findOne({ key });
  return setting ? setting.value : fallback;
}

async function runComplianceJob() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  // Solo lunes a viernes (1-5)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    console.log('[ComplianceJob] Fin de semana, no se ejecuta');
    return;
  }

  const dateStr = today.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' });
  const appUrl = process.env.APP_URL || '';
  const adminEmail = await getSetting('adminAlertEmail', config.adminAlertEmail);

  const salesUsers = await User.find({ role: 'sales', isActive: true }).populate('managerUserId', 'email name');

  for (const user of salesUsers) {
    const activities = await Activity.find({
      userId: user._id,
      activityDate: { $gte: startOfDay(today), $lte: endOfDay(today) },
      deletedAt: null,
    });

    let status = 'red';
    if (activities.some(a => a.status === 'completed')) status = 'green';
    else if (activities.length > 0) status = 'yellow';

    if (status === 'green') continue;

    const html = buildComplianceEmailHtml({ userName: user.name, date: dateStr, status, appUrl });
    const subject = status === 'red'
      ? `[Sales Tracker] Sin actividades hoy - ${user.name}`
      : `[Sales Tracker] Actividades incompletas hoy - ${user.name}`;

    const ccList = [];
    if (user.managerUserId && user.managerUserId.email) ccList.push(user.managerUserId.email);
    if (adminEmail) ccList.push(adminEmail);

    await sendMail({ to: user.email, subject, html });
    console.log(`[ComplianceJob] Email enviado a ${user.email} (status: ${status})`);

    if (status === 'red' && ccList.length > 0) {
      await sendMail({ to: ccList.join(','), subject: `[CC] ${subject}`, html });
    }
  }
  console.log('[ComplianceJob] Completado');
}

async function initComplianceJob() {
  const hour = await getSetting('reportCutoffHour', config.reportCutoffHour);
  const minute = await getSetting('reportCutoffMinute', config.reportCutoffMinute);
  const expression = `${minute} ${hour} * * 1-5`;
  console.log(`[ComplianceJob] Programado: ${expression} (${config.tz})`);
  cron.schedule(expression, runComplianceJob, { timezone: config.tz });
}

module.exports = { initComplianceJob, runComplianceJob };
