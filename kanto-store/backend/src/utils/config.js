// Configuración de cobros guardada en la BD (la ve el cliente en el checkout).
const db = require('../db');

const CLAVES = ['qr_imagen', 'banco', 'cuenta', 'titular', 'instrucciones'];

async function leerConfig() {
  const [rows] = await db.query('SELECT clave, valor FROM configuracion');
  const c = Object.fromEntries(rows.map((r) => [r.clave, r.valor]));
  return {
    qr_imagen: c.qr_imagen || null,
    banco: c.banco || process.env.QR_BANCO || '',
    cuenta: c.cuenta || process.env.QR_CUENTA || '',
    titular: c.titular || process.env.QR_TITULAR || 'Kanto Store',
    instrucciones: c.instrucciones || 'Realiza el pago por el monto exacto, indica el código del pedido como referencia y sube tu comprobante.',
  };
}

async function guardarConfig(datos) {
  for (const k of CLAVES) {
    if (datos[k] === undefined) continue;
    await db.query('INSERT INTO configuracion (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)', [k, datos[k] === null ? '' : String(datos[k])]);
  }
}

const bobPorUsd = () => Number(process.env.PAYPAL_BOB_POR_USD || 6.96);
const paypalActivo = () => !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET);
const webUrl = () => (process.env.WEB_URL || (process.env.CORS_ORIGIN || '').split(',')[0] || 'http://localhost:5173').trim().replace(/\/$/, '');

module.exports = { leerConfig, guardarConfig, bobPorUsd, paypalActivo, webUrl };
