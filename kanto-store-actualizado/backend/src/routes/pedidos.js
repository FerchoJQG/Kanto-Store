const router = require('express').Router();
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const db = require('../db');
const { auth, authOpcional, rol } = require('../middleware/auth');
const { wrap, fail, METODOS_PAGO, genCodigo, genPin } = require('../utils/helpers');
const { leerConfig, bobPorUsd } = require('../utils/config');
const P = require('../utils/pedidos');

const COLS = `p.id, p.codigo, p.usuario_id, p.nombre_cliente, p.email, p.telefono, p.direccion, p.metodo_entrega, p.metodo_pago,
  p.estado, p.total, p.repartidor_id, p.empacador_id, p.expira_en, p.comprobante_ref, p.pagado_en, p.empacado_en, p.entregado_en,
  p.monto_cobrado, p.nota_entrega, p.creado_en, (p.comprobante_pago IS NOT NULL) AS tiene_comprobante`;
const JOINS = `FROM pedidos p LEFT JOIN usuarios r ON r.id = p.repartidor_id LEFT JOIN usuarios e ON e.id = p.empacador_id`;
const NOMBRES = 'r.nombre AS repartidor, e.nombre AS empacador';

const montoUsd = (total) => (Number(total) / bobPorUsd()).toFixed(2);

async function generarQRDemo(p) {
  const txt = `DEMO|REF:${p.codigo}|MONTO:${Number(p.total).toFixed(2)} BOB`;
  return QRCode.toDataURL(txt, { margin: 1, width: 280 });
}

// Datos que el cliente necesita para pagar su pedido.
async function datosPago(p) {
  const cfg = await leerConfig();
  const out = { instrucciones: cfg.instrucciones };
  if (p.metodo_pago === 'qr') { out.qr = cfg.qr_imagen || await generarQRDemo(p); out.qr_es_real = !!cfg.qr_imagen; }
  if (p.metodo_pago === 'transferencia') out.datos_transferencia = { banco: cfg.banco, cuenta: cfg.cuenta, titular: cfg.titular, referencia: p.codigo };
  if (p.metodo_pago === 'paypal') out.paypal = { monto_usd: montoUsd(p.total), tipo_cambio: bobPorUsd() };
  return out;
}

async function listar(where, params, extra = '') {
  const [rows] = await db.query(`SELECT ${COLS}, ${NOMBRES} ${JOINS} ${where} ${extra}`, params);
  for (const p of rows) p.items = await P.itemsDe(p.id);
  return rows;
}

// ---------- Crear pedido (cliente registrado o invitado) ----------
router.post('/', authOpcional, wrap(async (req, res) => {
  const { items, nombre_cliente, email, telefono, direccion, metodo_pago } = req.body;
  const metodo_entrega = req.body.metodo_entrega || 'envio';
  if (!Array.isArray(items) || !items.length) fail(400, 'El carrito está vacío');
  if (!nombre_cliente || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) fail(400, 'Nombre y email válidos son obligatorios');
  if (!METODOS_PAGO.includes(metodo_pago)) fail(400, 'Método de pago inválido');
  if (!['envio', 'retiro'].includes(metodo_entrega)) fail(400, 'Método de entrega inválido');
  if (metodo_entrega === 'envio' && !direccion) fail(400, 'La dirección es obligatoria para envío');
  if (metodo_pago === 'paypal' && !(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET)) fail(400, 'PayPal no está configurado en el servidor');

  const mapa = new Map();
  for (const it of items) {
    const id = Number(it.producto_id), c = Number(it.cantidad);
    if (!Number.isInteger(id) || !Number.isInteger(c) || c < 1) fail(400, 'Ítems inválidos');
    mapa.set(id, (mapa.get(id) || 0) + c);
  }
  const ids = [...mapa.keys()].sort((a, b) => a - b);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [prods] = await conn.query('SELECT id, nombre, precio, stock, activo FROM productos WHERE id IN (?) ORDER BY id FOR UPDATE', [ids]);
    if (prods.length !== ids.length) fail(400, 'Hay productos que ya no existen');
    let total = 0;
    for (const p of prods) {
      const c = mapa.get(p.id);
      if (!p.activo || p.stock < c) fail(409, `Stock insuficiente para "${p.nombre}" (disponible: ${p.activo ? p.stock : 0})`);
      total += p.precio * c;
    }
    const codigo = genCodigo();
    const contra = metodo_pago === 'contra_entrega';
    const horas = Number(process.env.PEDIDO_EXPIRA_HORAS || 24);
    const [r] = await conn.query(
      `INSERT INTO pedidos (codigo, usuario_id, nombre_cliente, email, telefono, direccion, metodo_entrega, metodo_pago, estado, total, pin_entrega, expira_en)
       VALUES (?,?,?,?,?,?,?,?,?,?,?, ${contra ? 'NULL' : 'DATE_ADD(NOW(), INTERVAL ? HOUR)'})`,
      [codigo, req.user?.id || null, nombre_cliente, email, telefono || null, metodo_entrega === 'envio' ? direccion : null,
        metodo_entrega, metodo_pago, contra ? 'pagado' : 'pendiente', total.toFixed(2), genPin(), ...(contra ? [] : [horas])]);
    const pedidoId = r.insertId;
    for (const p of prods) {
      const c = mapa.get(p.id);
      await conn.query('INSERT INTO pedido_items (pedido_id, producto_id, nombre, precio_unitario, cantidad) VALUES (?,?,?,?,?)', [pedidoId, p.id, p.nombre, p.precio, c]);
      await conn.query('UPDATE productos SET stock = stock - ? WHERE id = ?', [c, p.id]); // RF08
      await P.registrarMovimiento(conn, { producto_id: p.id, tipo: 'venta', cantidad: -c, stock: p.stock - c, usuario_id: req.user?.id, pedido_id: pedidoId, nota: `Pedido ${codigo}` });
    }
    await P.historial(conn, pedidoId, 'pendiente', req.user?.id, 'Pedido creado');
    if (contra) await P.historial(conn, pedidoId, 'pagado', null, 'Pedido confirmado: se cobra contra entrega');
    await conn.commit();
    const [[ped]] = await db.query('SELECT * FROM pedidos WHERE id = ?', [pedidoId]);
    res.status(201).json({ id: pedidoId, codigo, estado: ped.estado, total: Number(total.toFixed(2)), metodo_pago, metodo_entrega, pin_entrega: ped.pin_entrega, ...(await datosPago(ped)) });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));

// ---------- Cliente ----------
router.get('/mis', auth, wrap(async (req, res) => {
  const [pedidos] = await db.query(`SELECT ${COLS}, p.pin_entrega ${JOINS} WHERE p.usuario_id = ? ORDER BY p.creado_en DESC`, [req.user.id]);
  for (const p of pedidos) { p.items = await P.itemsDe(p.id); if (['entregado', 'cancelado'].includes(p.estado)) delete p.pin_entrega; }
  res.json(pedidos);
}));

router.get('/seguimiento/:codigo', authOpcional, wrap(async (req, res) => {
  const p = await P.accesoPedido(req, req.params.codigo);
  if (p === null) fail(404, 'Pedido no encontrado');
  if (p === undefined) fail(403, 'Indica el email con el que compraste');
  const out = P.publico(p);
  out.items = await P.itemsDe(p.id);
  const [h] = await db.query('SELECT estado, nota, creado_en FROM pedido_historial WHERE pedido_id = ? ORDER BY id', [p.id]);
  out.historial = h;
  if (['entregado', 'cancelado'].includes(p.estado)) delete out.pin_entrega;
  if (p.estado === 'pendiente' || p.estado === 'por_verificar') Object.assign(out, await datosPago(p));
  res.json(out);
}));

// El cliente sube la foto de su depósito/transferencia/pago QR
router.post('/seguimiento/:codigo/comprobante', authOpcional, wrap(async (req, res) => {
  const p0 = await P.accesoPedido(req, req.params.codigo);
  if (p0 === null) fail(404, 'Pedido no encontrado');
  if (p0 === undefined) fail(403, 'Acceso denegado');
  const { imagen, referencia } = req.body;
  if (!['qr', 'transferencia'].includes(p0.metodo_pago)) fail(400, 'Este pedido no se paga con QR o depósito');
  if (typeof imagen !== 'string' || !/^data:image\/(png|jpe?g|webp);base64,/.test(imagen)) fail(400, 'Sube una imagen (PNG, JPG o WEBP)');
  if (imagen.length > 2_500_000) fail(413, 'La imagen es demasiado grande (máx. ~1.8 MB)');
  await P.conPedido(p0.id, async (conn, p) => {
    if (!['pendiente', 'por_verificar'].includes(p.estado)) fail(400, 'El pedido ya no admite comprobantes');
    await P.cambiarEstado(conn, p, 'por_verificar', req.user?.id, `Comprobante enviado${referencia ? ` (ref. ${String(referencia).slice(0, 40)})` : ''}`,
      { comprobante_pago: imagen, comprobante_ref: referencia ? String(referencia).slice(0, 80) : null });
  });
  res.json({ ok: true });
}));

router.post('/seguimiento/:codigo/cancelar', authOpcional, wrap(async (req, res) => {
  const p0 = await P.accesoPedido(req, req.params.codigo);
  if (p0 === null) fail(404, 'Pedido no encontrado');
  if (p0 === undefined) fail(403, 'Acceso denegado');
  await P.conPedido(p0.id, async (conn, p) => {
    if (!['pendiente', 'por_verificar'].includes(p.estado)) fail(400, 'Solo puedes cancelar pedidos que aún no se pagaron');
    await P.cancelarPedido(conn, p, req.user?.id, 'Cancelado por el cliente');
  });
  res.json({ ok: true });
}));

// RF10 — comprobante PDF
router.get('/comprobante/:codigo', authOpcional, wrap(async (req, res) => {
  const p = await P.accesoPedido(req, req.params.codigo);
  if (p === null) fail(404, 'Pedido no encontrado');
  if (p === undefined) fail(403, 'Acceso denegado');
  const items = await P.itemsDe(p.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="comprobante-${p.codigo}.pdf"`);
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);
  doc.fontSize(22).text('Kanto Store', { align: 'center' });
  doc.fontSize(10).fillColor('#666').text('Comprobante de compra — prototipo académico', { align: 'center' }).moveDown();
  doc.fillColor('#000').fontSize(12)
    .text(`Pedido: ${p.codigo}`).text(`Fecha: ${new Date(p.creado_en).toLocaleString('es-BO')}`)
    .text(`Cliente: ${p.nombre_cliente} (${p.email})`)
    .text(`Pago: ${p.metodo_pago.replace('_', ' ')}   Entrega: ${p.metodo_entrega}${p.direccion ? ` — ${p.direccion}` : ''}`)
    .text(`Estado: ${p.estado.replace('_', ' ')}`).moveDown();
  doc.fontSize(11).text('Detalle', { underline: true }).moveDown(0.5);
  items.forEach((i) => doc.text(`${i.cantidad} x ${i.nombre}   Bs ${i.precio_unitario.toFixed(2)}   =   Bs ${(i.cantidad * i.precio_unitario).toFixed(2)}`));
  doc.moveDown().fontSize(14).text(`TOTAL: Bs ${Number(p.total).toFixed(2)}`, { align: 'right' });
  doc.moveDown(2).fontSize(8).fillColor('#888')
    .text('Pokémon y sus marcas pertenecen a Nintendo, Game Freak y The Pokémon Company. Proyecto académico sin transacciones reales.', { align: 'center' });
  doc.end();
}));

// ---------- Admin ----------
router.get('/admin/todos', auth, rol('admin'), wrap(async (req, res) => {
  const { estado } = req.query;
  res.json(await listar(estado ? 'WHERE p.estado = ?' : '', estado ? [estado] : [], 'ORDER BY p.creado_en DESC LIMIT 200'));
}));

router.get('/admin/repartidores', auth, rol('admin'), wrap(async (_req, res) => {
  const [rows] = await db.query("SELECT id, nombre FROM usuarios WHERE rol = 'repartidor' AND activo = 1");
  res.json(rows);
}));

router.get('/:id/comprobante-pago', auth, rol('admin'), wrap(async (req, res) => {
  const [[p]] = await db.query('SELECT comprobante_pago, comprobante_ref FROM pedidos WHERE id = ?', [req.params.id]);
  if (!p || !p.comprobante_pago) fail(404, 'Este pedido no tiene comprobante');
  res.json({ imagen: p.comprobante_pago, referencia: p.comprobante_ref });
}));

// Verificación del pago (QR / depósito / transferencia)
router.post('/:id/confirmar-pago', auth, rol('admin'), wrap(async (req, res) => {
  await P.conPedido(req.params.id, async (conn, p) => {
    if (!['pendiente', 'por_verificar'].includes(p.estado)) fail(400, 'El pedido no está pendiente de pago');
    if (!['qr', 'transferencia', 'paypal'].includes(p.metodo_pago)) fail(400, 'Este pedido no requiere verificación de pago');
    await P.cambiarEstado(conn, p, 'pagado', req.user.id, 'Pago verificado y confirmado', { pagado_en: new Date(), expira_en: null });
  });
  res.json({ ok: true });
}));

router.post('/:id/rechazar-pago', auth, rol('admin'), wrap(async (req, res) => {
  const motivo = String(req.body.motivo || '').trim();
  if (!motivo) fail(400, 'Indica el motivo del rechazo');
  await P.conPedido(req.params.id, async (conn, p) => {
    if (p.estado !== 'por_verificar') fail(400, 'No hay un comprobante por verificar');
    await P.cambiarEstado(conn, p, 'pendiente', req.user.id, `Comprobante rechazado: ${motivo}`, { comprobante_pago: null, comprobante_ref: null });
  });
  res.json({ ok: true });
}));

router.post('/:id/cancelar', auth, rol('admin'), wrap(async (req, res) => {
  await P.conPedido(req.params.id, async (conn, p) => {
    if (p.estado === 'en_transito') fail(400, 'El pedido ya salió a entrega');
    await P.cancelarPedido(conn, p, req.user.id, req.body.motivo ? `Cancelado: ${req.body.motivo}` : 'Cancelado por el administrador');
  });
  res.json({ ok: true });
}));

router.patch('/:id/repartidor', auth, rol('admin'), wrap(async (req, res) => {
  const [[u]] = await db.query("SELECT id, nombre FROM usuarios WHERE id = ? AND rol = 'repartidor' AND activo = 1", [req.body.repartidor_id]);
  if (!u) fail(400, 'Repartidor inválido');
  await P.conPedido(req.params.id, async (conn, p) => {
    if (['en_transito', 'entregado', 'cancelado'].includes(p.estado)) fail(400, 'Ya no se puede cambiar el repartidor');
    if (p.metodo_entrega !== 'envio') fail(400, 'Este pedido es de retiro en tienda');
    await conn.query('UPDATE pedidos SET repartidor_id = ? WHERE id = ?', [u.id, p.id]);
    await P.historial(conn, p.id, p.estado, req.user.id, `Repartidor asignado: ${u.nombre}`);
  });
  res.json({ ok: true });
}));

// ---------- Preparación y empaque (rol empacador) ----------
router.get('/preparacion', auth, rol('empacador', 'admin'), wrap(async (_req, res) => {
  res.json(await listar(
    "WHERE p.estado IN ('pagado','preparando') OR (p.estado = 'empacado' AND p.metodo_entrega = 'retiro')", [], 'ORDER BY p.pagado_en, p.creado_en'));
}));

router.post('/:id/preparar', auth, rol('empacador', 'admin'), wrap(async (req, res) => {
  await P.conPedido(req.params.id, async (conn, p) => {
    if (p.estado !== 'pagado') fail(400, 'Solo se pueden preparar pedidos con pago confirmado');
    await P.cambiarEstado(conn, p, 'preparando', req.user.id, 'Preparación iniciada', { empacador_id: req.user.id });
  });
  res.json({ ok: true });
}));

router.patch('/:id/items/:itemId', auth, rol('empacador', 'admin'), wrap(async (req, res) => {
  await P.conPedido(req.params.id, async (conn, p) => {
    if (p.estado !== 'preparando') fail(400, 'El pedido no está en preparación');
    if (req.user.rol !== 'admin' && p.empacador_id !== req.user.id) fail(403, 'Este pedido lo prepara otro empacador');
    const [r] = await conn.query('UPDATE pedido_items SET verificado = ? WHERE id = ? AND pedido_id = ?', [req.body.verificado ? 1 : 0, req.params.itemId, p.id]);
    if (!r.affectedRows) fail(404, 'Ítem no encontrado');
  });
  res.json({ ok: true });
}));

router.post('/:id/empacar', auth, rol('empacador', 'admin'), wrap(async (req, res) => {
  await P.conPedido(req.params.id, async (conn, p) => {
    if (p.estado !== 'preparando') fail(400, 'El pedido no está en preparación');
    if (req.user.rol !== 'admin' && p.empacador_id !== req.user.id) fail(403, 'Este pedido lo prepara otro empacador');
    const [[{ pend }]] = await conn.query('SELECT COUNT(*) pend FROM pedido_items WHERE pedido_id = ? AND verificado = 0', [p.id]);
    if (pend > 0) fail(400, `Faltan ${pend} ítem(s) por verificar en el checklist`);
    await P.cambiarEstado(conn, p, 'empacado', req.user.id, 'Pedido verificado y empacado', { empacado_en: new Date() });
  });
  res.json({ ok: true });
}));

// ---------- Entrega ----------
router.get('/entregas', auth, rol('repartidor', 'admin'), wrap(async (req, res) => {
  const admin = req.user.rol === 'admin';
  res.json(await listar(
    `WHERE p.metodo_entrega = 'envio' AND p.estado IN ('empacado','en_transito') ${admin ? '' : 'AND p.repartidor_id = ?'}`,
    admin ? [] : [req.user.id], 'ORDER BY p.creado_en'));
}));

function puedeEntregar(user, p) {
  if (user.rol === 'admin') return;
  if (user.rol !== 'repartidor' || p.repartidor_id !== user.id) fail(403, 'Este pedido no está asignado a ti');
}

router.post('/:id/salir', auth, rol('repartidor', 'admin'), wrap(async (req, res) => {
  await P.conPedido(req.params.id, async (conn, p) => {
    puedeEntregar(req.user, p);
    if (p.metodo_entrega !== 'envio') fail(400, 'Este pedido es de retiro en tienda');
    if (p.estado !== 'empacado') fail(400, 'El pedido todavía no está empacado');
    if (!p.repartidor_id) fail(400, 'Asigna un repartidor primero');
    await P.cambiarEstado(conn, p, 'en_transito', req.user.id, 'Salió a entrega');
  });
  res.json({ ok: true });
}));

async function cerrarEntrega(req, res, esRetiro) {
  await P.conPedido(req.params.id, async (conn, p) => {
    if (esRetiro) {
      if (p.metodo_entrega !== 'retiro') fail(400, 'Este pedido es con envío');
      if (p.estado !== 'empacado') fail(400, 'El pedido todavía no está empacado');
      if (!['admin', 'empacador'].includes(req.user.rol)) fail(403, 'Sin permiso');
    } else {
      puedeEntregar(req.user, p);
      if (p.estado !== 'en_transito') fail(400, 'El pedido no está en tránsito');
    }
    // PIN: lo tiene el cliente; el admin puede forzar el cierre
    if (req.user.rol !== 'admin' && p.pin_entrega && String(req.body.pin || '').trim() !== p.pin_entrega) fail(400, 'PIN de entrega incorrecto');
    let monto = null;
    if (p.metodo_pago === 'contra_entrega') {
      monto = Number(req.body.monto_cobrado);
      if (!(monto >= Number(p.total))) fail(400, `Debes registrar el cobro de Bs ${Number(p.total).toFixed(2)}`);
    }
    await P.cambiarEstado(conn, p, 'entregado', req.user.id,
      `${esRetiro ? 'Retirado en tienda' : 'Entregado al cliente'}${monto !== null ? ` · cobrado Bs ${monto.toFixed(2)}` : ''}`,
      { entregado_en: new Date(), monto_cobrado: monto, nota_entrega: req.body.nota ? String(req.body.nota).slice(0, 250) : null });
  });
  res.json({ ok: true });
}
router.post('/:id/entregar', auth, rol('repartidor', 'admin'), wrap((req, res) => cerrarEntrega(req, res, false)));
router.post('/:id/retirar', auth, rol('empacador', 'admin'), wrap((req, res) => cerrarEntrega(req, res, true)));

module.exports = router;
