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


function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildOrderEmailHtml({ commercial, client, activity, saleItems }) {
  const rows = saleItems.map((item) => `
    <tr>
      <td style="padding:6px;border-bottom:1px solid #ddd;">${escapeHtml(item.productName)}</td>
      <td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;">${escapeHtml(item.quantity)}</td>
      <td style="padding:6px;border-bottom:1px solid #ddd;">${escapeHtml(item.unit)}</td>
      <td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;">${escapeHtml(item.unitPrice)} €</td>
      <td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;">${escapeHtml(item.totalAmount)} €</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 760px; margin: 0 auto; color:#222;">
      <h2>Nuevo pedido comercial</h2>
      <p>Se ha registrado una venta directa en Sales Tracker.</p>
      <h3>Cliente</h3>
      <p><strong>${escapeHtml(client.legalName)}</strong><br />
      CIF/NIF: ${escapeHtml(client.taxId || '-')}<br />
      Ciudad: ${escapeHtml(client.city || '-')} ${client.province ? `· ${escapeHtml(client.province)}` : ''}</p>
      <h3>Comercial</h3>
      <p>${escapeHtml(commercial.name)} (${escapeHtml(commercial.email)})</p>
      <h3>Productos vendidos</h3>
      <table style="border-collapse:collapse;width:100%;font-size:14px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:6px;border-bottom:2px solid #999;">Producto</th>
            <th style="text-align:right;padding:6px;border-bottom:2px solid #999;">Cantidad</th>
            <th style="text-align:left;padding:6px;border-bottom:2px solid #999;">Unidad</th>
            <th style="text-align:right;padding:6px;border-bottom:2px solid #999;">Precio</th>
            <th style="text-align:right;padding:6px;border-bottom:2px solid #999;">Importe</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p><strong>Importe total:</strong> ${escapeHtml(activity.sale?.totalAmount ?? '-')} €</p>
      <h3>Notas del pedido</h3>
      <p style="white-space:pre-line;">${escapeHtml(activity.sale?.orderNotes || '-')}</p>
      <h3>Notas de la actividad</h3>
      <p style="white-space:pre-line;">${escapeHtml(activity.notes || '-')}</p>
      <p style="font-size:12px;color:#666;margin-top:30px;">Email automático generado por Sales Tracker. ID actividad: ${escapeHtml(activity._id)}</p>
    </div>
  `;
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

module.exports = { sendMail, buildComplianceEmailHtml, buildOrderEmailHtml };
