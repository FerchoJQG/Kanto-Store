// Kanto Fase 9: extensión de la aplicación EXISTENTE con MySQL (mysql2/promise).
// Se monta ANTES de routes/pedidos para proteger la ruta original de confirmación.
'use strict';
const router = require('express').Router();
const db = require('../db');
const { auth, authOpcional, rol } = require('../middleware/auth');
const { wrap, fail } = require('../utils/helpers');
const P = require('../utils/pedidos');

const estadosConFotos = new Set(['pagado', 'preparando', 'empacado', 'en_transito', 'entregado']);
const etapas = new Set(['producto', 'empaque', 'entrega']);
function cents(n) {
  const s = String(n ?? '').trim();
  if (!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(s)) fail(400, 'El importe debe tener como máximo dos decimales');
  const [a, b=''] = s.split('.');
  return Number(a) * 100 + Number(b.padEnd(2, '0'));
}
function orderId(req) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) fail(400, 'Pedido inválido');
  return id;
}
function readImage(image) {
  if (typeof image !== 'string' || !/^data:image\/(?:png|jpe?g|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)) fail(400, 'Solo imágenes JPG, PNG o WebP');
  if (image.length > 1_750_000) fail(413, 'Foto demasiado grande. Reduce la imagen antes de enviarla');
  return image;
}
function checkStaffForOrder(user, order, etapa, writing) {
  if (user.rol === 'admin') return;
  if (user.rol === 'empacador' && order.empacador_id === user.id) {
    if (!writing || etapa !== 'entrega') return;
  }
  if (user.rol === 'repartidor' && order.repartidor_id === user.id) {
    if (!writing || etapa === 'entrega') return;
  }
  fail(403, 'Este pedido no está asignado a tu usuario');
}

// Reemplaza la confirmación anterior, que no exigía una comprobación de importe.
// Aquí se registra una REVISIÓN MANUAL del estado de cuenta, NO una detección automática bancaria.
router.post('/pedidos/:id/confirmar-pago', auth, rol('admin'), wrap(async (req, res) => {
  const id = orderId(req);
  const ref = String(req.body?.referencia_bancaria || '').trim().toUpperCase();
  const centsReceived = cents(req.body?.monto_acreditado);
  if (!/^[A-Z0-9][A-Z0-9_.\/-]{5,99}$/.test(ref)) fail(400, 'Escribe la referencia bancaria real (6 a 100 caracteres, sin espacios)');
  if (req.body?.confirmacion_abono_real !== true) fail(400, 'Debes comprobar el abono real en tu banco antes de confirmar');
  try {
    await P.conPedido(id, async (conn, pedido) => {
      if (pedido.metodo_pago !== 'qr' && pedido.metodo_pago !== 'transferencia') fail(400, 'Este pedido no es QR ni depósito. PayPal se confirma por su API');
      if (pedido.estado !== 'por_verificar' || !pedido.comprobante_pago) fail(409, 'El pedido necesita un comprobante pendiente de verificar');
      const centsExpected = cents(Number(pedido.total).toFixed(2));
      if (centsExpected !== centsReceived) fail(409, `Importe distinto: el pedido requiere Bs ${(centsExpected/100).toFixed(2)}`);
      // La referencia se reserva con índice UNIQUE para impedir reutilizarla en otro pedido.
      await conn.query(
        'INSERT INTO verificaciones_bancarias (pedido_id, usuario_id, metodo, referencia_bancaria, monto_acreditado) VALUES (?,?,?,?,?)',
        [pedido.id, req.user.id, pedido.metodo_pago, ref, (centsReceived / 100).toFixed(2)]);
      await P.cambiarEstado(conn, pedido, 'pagado', req.user.id,
        `Pago ${pedido.metodo_pago} comprobado en banco · Ref. ${ref}`, { pagado_en: new Date(), expira_en: null });
    });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') fail(409, 'Referencia bancaria repetida o pedido verificado anteriormente');
    throw e;
  }
  res.json({ ok: true, verificacion: 'manual', referencia_bancaria: ref });
}));

router.get('/pedidos/:id/verificacion-bancaria', auth, rol('admin'), wrap(async (req, res) => {
  const [rows] = await db.query('SELECT pedido_id, metodo, referencia_bancaria, monto_acreditado, verificado_en FROM verificaciones_bancarias WHERE pedido_id=? LIMIT 1', [orderId(req)]);
  res.json(rows[0] || null);
}));

// Preparación, fotografía del producto real, empaque y entrega/recogida.
router.get('/pedidos/:id/evidencias', auth, rol('admin', 'empacador', 'repartidor'), wrap(async (req,res) => {
  const id = orderId(req);
  const [[order]] = await db.query('SELECT id, empacador_id, repartidor_id FROM pedidos WHERE id=?', [id]);
  if (!order) fail(404, 'Pedido inexistente');
  checkStaffForOrder(req.user, order, '', false);
  const [rows] = await db.query('SELECT id, etapa, imagen, creado_en FROM pedido_evidencias WHERE pedido_id=? ORDER BY id', [id]);
  res.json(rows);
}));
router.post('/pedidos/:id/evidencias', auth, rol('admin','empacador','repartidor'), wrap(async (req, res) => {
  const id=orderId(req);
  const etapa=String(req.body?.etapa || '').trim();
  if (!etapas.has(etapa)) fail(400,'Etapa inválida');
  const image=readImage(req.body?.imagen);
  await P.conPedido(id, async (conn, order) => {
    checkStaffForOrder(req.user, order, etapa, true);
    if (!estadosConFotos.has(order.estado)) fail(409, 'El pedido aún no está en preparación o ya fue cancelado');
    if (etapa === 'entrega' && !['empacado', 'en_transito', 'entregado'].includes(order.estado)) fail(409,'Primero debe empacarse el pedido');
    if (etapa !== 'entrega' && !['pagado', 'preparando', 'empacado'].includes(order.estado)) fail(409,'El pedido ya salió de preparación');
    const [[{ n }]] = await conn.query('SELECT COUNT(*) AS n FROM pedido_evidencias WHERE pedido_id=?', [id]);
    if (Number(n) >= 12) fail(409, 'Máximo 12 fotografías por pedido');
    await conn.query('INSERT INTO pedido_evidencias (pedido_id, usuario_id, etapa, imagen) VALUES (?,?,?,?)', [id, req.user.id, etapa, image]);
    await P.historial(conn, id, order.estado, req.user.id, `Foto añadida: ${etapa}`);
  });
  res.status(201).json({ok:true});
}));
// Una evidencia solamente es visible al propietario del pedido / correo que lo creó.
router.get('/pedidos/seguimiento/:codigo/evidencias', authOpcional, wrap(async (req,res) => {
  const p = await P.accesoPedido(req, req.params.codigo);
  if (p === null) fail(404, 'Pedido inexistente');
  if (p === undefined) fail(403, 'Acceso denegado');
  const [rows] = await db.query('SELECT id, etapa, imagen, creado_en FROM pedido_evidencias WHERE pedido_id=? ORDER BY id', [p.id]);
  res.json(rows);
}));

router.get('/fase9/alertas', auth, rol('admin'), wrap(async (_req,res) => {
  const [[{ pendientes }]] = await db.query("SELECT COUNT(*) AS pendientes FROM pedidos WHERE estado = 'pendiente'");
  const [[{ pagos }]] = await db.query("SELECT COUNT(*) AS pagos FROM pedidos WHERE estado = 'por_verificar'");
  const [pedidos] = await db.query("SELECT id, codigo, nombre_cliente, estado, creado_en FROM pedidos WHERE creado_en >= DATE_SUB(NOW(), INTERVAL 48 HOUR) ORDER BY id DESC LIMIT 12");
  const [clientes] = await db.query("SELECT id, nombre, creado_en FROM usuarios WHERE rol='cliente' AND creado_en >= DATE_SUB(NOW(), INTERVAL 48 HOUR) ORDER BY id DESC LIMIT 12");
  res.set('Cache-Control','no-store');
  res.json({pendientes: Number(pendientes), pagos_por_verificar: Number(pagos), pedidos_recientes: pedidos, clientes_recientes: clientes, consultado_en: new Date().toISOString()});
}));
module.exports = router;
