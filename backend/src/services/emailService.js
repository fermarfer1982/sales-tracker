'use strict';

const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!config.smtp.host) {
    console.warn('[Email] SMTP no configurado, emails desactivados');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
  return transporter;
}

async function sendMail({ to, subject, html }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[Email] (simulado) Para: ${to} | Asunto: ${subject}`);
    return { simulated: true };
  }
  return t.sendMail({ from: config.smtp.from, to, subject, html });
}

function buildComplianceEmailHtml({ userName, date, status, appUrl = '' }) {
  const statusLabel = status === 'red' ? 'SIN ACTIVIDADES' : 'ACTIVIDADES INCOMPLETAS';
  const color = status === 'red' ? '#dc3545' : '#ffc107';
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Recordatorio de reporte de actividades</h2>
      <p>Hola <strong>${userName}</strong>,</p>
      <p>Hoy <strong>${date}</strong> tienes el estado de cumplimiento:</p>
      <div style="padding: 12px 20px; background: ${color}; color: #333; border-radius: 4px; display: inline-block; font-weight: bold; font-size: 18px;">
        ${statusLabel}
      </div>
      <p>Por favor accede a la aplicación y registra tus actividades del día:</p>
      ${appUrl ? `<a href="${appUrl}/activities/today" style="background:#0d6efd;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;">Registrar actividades</a>` : ''}
      <hr style="margin-top:30px;" />
      <p style="font-size:12px;color:#666;">Este es un email automático del sistema de registro de actividades comerciales.</p>
    </div>
  `;
}

module.exports = { sendMail, buildComplianceEmailHtml };
