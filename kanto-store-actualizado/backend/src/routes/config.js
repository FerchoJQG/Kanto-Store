const router = require('express').Router();
const { auth, rol } = require('../middleware/auth');
const { wrap, fail } = require('../utils/helpers');
const { leerConfig, guardarConfig, bobPorUsd, paypalActivo } = require('../utils/config');

// Público: lo que el cliente necesita ver en el checkout
router.get('/pagos', wrap(async (_req, res) => {
  const c = await leerConfig();
  res.json({ ...c, qr_configurado: !!c.qr_imagen, paypal: paypalActivo(), bob_por_usd: bobPorUsd() });
}));

// Admin: sube el QR real y los datos bancarios
router.put('/admin/pagos', auth, rol('admin'), wrap(async (req, res) => {
  const { qr_imagen } = req.body;
  if (qr_imagen && (typeof qr_imagen !== 'string' || !/^data:image\/(png|jpe?g|webp);base64,/.test(qr_imagen))) fail(400, 'El QR debe ser una imagen PNG, JPG o WEBP');
  if (qr_imagen && qr_imagen.length > 2_500_000) fail(413, 'La imagen del QR es demasiado grande');
  await guardarConfig(req.body);
  res.json({ ok: true });
}));

// Promociones editoriales públicas; solo el administrador puede modificarlas.
router.get('/promociones', wrap(async (_req, res) => {
  const db = require('../db');
  const [rows] = await db.query("SELECT valor FROM configuracion WHERE clave = 'promociones' LIMIT 1");
  let promociones = [];
  try { promociones = JSON.parse(rows[0]?.valor || '[]'); } catch (_) {}
  res.json(Array.isArray(promociones) ? promociones.filter(p => p.activa) : []);
}));
router.get('/admin/promociones', auth, rol('admin'), wrap(async (_req, res) => {
  const db = require('../db');
  const [rows] = await db.query("SELECT valor FROM configuracion WHERE clave = 'promociones' LIMIT 1");
  let promociones = [];
  try { promociones = JSON.parse(rows[0]?.valor || '[]'); } catch (_) {}
  res.json(Array.isArray(promociones) ? promociones : []);
}));
router.put('/admin/promociones', auth, rol('admin'), wrap(async (req, res) => {
  const db = require('../db');
  const items = req.body?.promociones;
  if (!Array.isArray(items) || items.length > 20) fail(400, 'Máximo 20 promociones');
  const clean = items.map((p, i) => ({
    id: String(p.id || i).slice(0, 64),
    titulo: String(p.titulo || '').trim().slice(0, 90),
    descripcion: String(p.descripcion || '').trim().slice(0, 250),
    imagen: String(p.imagen || '').trim().slice(0, 500),
    enlace: String(p.enlace || '').trim().slice(0, 250),
    activa: !!p.activa,
  }));
  if (clean.some(p => !p.titulo || (p.enlace && !/^\/(?!\/)[a-zA-Z0-9/?=&_%#.-]*$/.test(p.enlace)))) fail(400, 'Título obligatorio; enlaces deben ser rutas internas /...');
  await db.query("INSERT INTO configuracion (clave, valor) VALUES ('promociones', ?) ON DUPLICATE KEY UPDATE valor=VALUES(valor)", [JSON.stringify(clean)]);
  res.json({ ok: true });
}));
module.exports = router;
