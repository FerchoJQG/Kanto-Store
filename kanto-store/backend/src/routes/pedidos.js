const router = require('express').Router();
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const db = require('../db');
const { auth, authOpcional, rol } = require('../middleware/auth');
const { wrap, ESTADOS_PEDIDO, genCodigo } = require('../utils/helpers');

const METODOS_PAGO = ['qr', 'transferencia', 'contra_entrega'];

async function generarQR(pedido) {
  const payload = [
    `BANCO:${process.env.QR_BANCO || 'Banco'}`,
    `CUENTA:${process.env.QR_CUENTA || '0000000000'}`,
    `TITULAR:${process.env.QR_TITULAR || 'Kanto Store'}`,
    `MONTO:${Number(pedido.total).toFixed(2)} BOB`,
    `REF:${pedido.codigo}`,
  ].join('|');
  return QRCode.toDataURL(payload, { margin: 1, width: 280 });
}

async function itemsDe(pedidoId) {
  const [items] = await db.query('SELECT nombre, precio_unitario, cantidad FROM pedido_items WHERE pedido_id = ?', [pedidoId]);
  return items;
}

// ---------- Crear pedido (cliente registrado o invitado) ----------
// RF06/RF07/RF08/RNF04: transacción con bloqueo de filas para no vender stock inexistente.
router.post('/', authOpcional, wrap(async (req, res) => {
  const { items, nombre_cliente, email, telefono, direccion, metodo_pago } = req.body;
  const metodo_entrega = req.body.metodo_entrega || 'envio';
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'El carrito está vacío' });
  if (!nombre_cliente || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) return res.status(400).json({ error: 'Nombre y email válidos son obligatorios' });
  if (!METODOS_PAGO.includes(metodo_pago)) return res.status(400).json({ error: 'Método de pago inválido' });
  if (!['envio', 'retiro'].includes(metodo_entrega)) return res.status(400).json({ error: 'Método de entrega inválido' });
  if (metodo_entrega === 'envio' && !direccion) return res.status(400).json({ error: 'La dirección es obligatoria para envío' });

  // Consolidar duplicados y validar cantidades
  const mapa = new Map();
  for (const it of items) {
    const id = Number(it.producto_id), c = Number(it.cantidad);
    if (!Number.isInteger(id) || !Number.isInteger(c) || c < 1) return res.status(400).json({ error: 'Ítems inválidos' });
    mapa.set(id, (mapa.get(id) || 0) + c);
  }
  const ids = [...mapa.keys()].sort((a, b) => a - b); // orden fijo => evita deadlocks

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [prods] = await conn.query(
      'SELECT id, nombre, precio, stock, activo FROM productos WHERE id IN (?) ORDER BY id FOR UPDATE', [ids]);
    if (prods.length !== ids.length) { await conn.rollback(); return res.status(400).json({ error: 'Hay productos que ya no existen' }); }
    let total = 0;
    for (const p of prods) {
      const c = mapa.get(p.id);
      if (!p.activo || p.stock < c) {
        await conn.rollback();
        return res.status(409).json({ error: `Stock insuficiente para "${p.nombre}" (disponible: ${p.activo ? p.stock : 0})` });
      }
      total += p.precio * c;
    }
    const codigo = genCodigo();
    const estado = metodo_pago === 'contra_entrega' ? 'preparando' : 'pendiente';
    const [r] = await conn.query(
      `INSERT INTO pedidos (codigo, usuario_id, nombre_cliente, email, telefono, direccion, metodo_entrega, metodo_pago, estado, total)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [codigo, req.user?.id || null, nombre_cliente, email, telefono || null,
        metodo_entrega === 'envio' ? direccion : null, metodo_entrega, metodo_pago, estado, total.toFixed(2)]);
    for (const p of prods) {
      const c = mapa.get(p.id);
      await conn.query('INSERT INTO pedido_items (pedido_id, producto_id, nombre, precio_unitario, cantidad) VALUES (?,?,?,?,?)',
        [r.insertId, p.id, p.nombre, p.precio, c]);
      await conn.query('UPDATE productos SET stock = stock - ? WHERE id = ?', [c, p.id]); // RF08
    }
    await conn.commit();
    const pedido = { id: r.insertId, codigo, estado, total: Number(total.toFixed(2)), metodo_pago };
    if (metodo_pago === 'qr') pedido.qr = await generarQR(pedido);
    if (metodo_pago === 'transferencia') {
      pedido.datos_transferencia = {
        banco: process.env.QR_BANCO, cuenta: process.env.QR_CUENTA, titular: process.env.QR_TITULAR, referencia: codigo,
      };
    }
    res.status(201).json(pedido);
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));

// ---------- Cliente: historial (RF11) ----------
router.get('/mis', auth, wrap(async (req, res) => {
  const [pedidos] = await db.query('SELECT * FROM pedidos WHERE usuario_id = ? ORDER BY creado_en DESC', [req.user.id]);
  for (const p of pedidos) p.items = await itemsDe(p.id);
  res.json(pedidos);
}));

// ---------- Admin ----------
router.get('/admin/todos', auth, rol('admin'), wrap(async (req, res) => {
  const { estado } = req.query;
  const [pedidos] = await db.query(
    `SELECT p.*, r.nombre AS repartidor FROM pedidos p LEFT JOIN usuarios r ON r.id = p.repartidor_id
     ${estado ? 'WHERE p.estado = ?' : ''} ORDER BY p.creado_en DESC LIMIT 200`, estado ? [estado] : []);
  for (const p of pedidos) p.items = await itemsDe(p.id);
  res.json(pedidos);
}));

router.get('/admin/repartidores', auth, rol('admin'), wrap(async (_req, res) => {
  const [rows] = await db.query("SELECT id, nombre FROM usuarios WHERE rol = 'repartidor' AND activo = 1");
  res.json(rows);
}));

// ---------- Repartidor ----------
router.get('/entregas', auth, rol('repartidor', 'admin'), wrap(async (req, res) => {
  const [pedidos] = await db.query(
    `SELECT * FROM pedidos WHERE repartidor_id = ? AND estado IN ('preparando','en_transito','pagado') ORDER BY creado_en`, [req.user.id]);
  for (const p of pedidos) p.items = await itemsDe(p.id);
  res.json(pedidos);
}));

// Confirmación de pago SIMULADA (restricción 4.3)
router.post('/:id/confirmar-pago', auth, rol('admin'), wrap(async (req, res) => {
  const [r] = await db.query("UPDATE pedidos SET estado = 'pagado' WHERE id = ? AND estado = 'pendiente'", [req.params.id]);
  if (!r.affectedRows) return res.status(400).json({ error: 'El pedido no está pendiente de pago' });
  res.json({ ok: true });
}));

router.patch('/:id/repartidor', auth, rol('admin'), wrap(async (req, res) => {
  const [[u]] = await db.query("SELECT id FROM usuarios WHERE id = ? AND rol = 'repartidor'", [req.body.repartidor_id]);
  if (!u) return res.status(400).json({ error: 'Repartidor inválido' });
  await db.query('UPDATE pedidos SET repartidor_id = ? WHERE id = ?', [u.id, req.params.id]);
  res.json({ ok: true });
}));

router.patch('/:id/estado', auth, rol('admin', 'repartidor'), wrap(async (req, res) => {
  const { estado } = req.body;
  if (!ESTADOS_PEDIDO.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[p]] = await conn.query('SELECT * FROM pedidos WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!p) { await conn.rollback(); return res.status(404).json({ error: 'Pedido no encontrado' }); }
    if (req.user.rol === 'repartidor') {
      if (p.repartidor_id !== req.user.id) { await conn.rollback(); return res.status(403).json({ error: 'Pedido no asignado a ti' }); }
      if (!['en_transito', 'entregado'].includes(estado)) { await conn.rollback(); return res.status(403).json({ error: 'Estado no permitido' }); }
    }
    if (p.estado === 'cancelado' || p.estado === 'entregado') { await conn.rollback(); return res.status(400).json({ error: 'El pedido ya está cerrado' }); }
    if (estado === 'cancelado') { // devolver stock
      await conn.query(
        `UPDATE productos pr JOIN pedido_items i ON i.producto_id = pr.id SET pr.stock = pr.stock + i.cantidad WHERE i.pedido_id = ?`, [p.id]);
    }
    // contra entrega se cobra al entregar
    const nuevo = estado === 'entregado' && p.metodo_pago === 'contra_entrega' ? 'entregado' : estado;
    await conn.query('UPDATE pedidos SET estado = ? WHERE id = ?', [nuevo, p.id]);
    await conn.commit();
    res.json({ ok: true });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));

// ---------- Seguimiento (invitado con código + email, o dueño) ----------
async function cargarAccesible(req) {
  const [[p]] = await db.query('SELECT * FROM pedidos WHERE codigo = ?', [req.params.codigo]);
  if (!p) return null;
  const u = req.user;
  const ok = (u && (u.rol === 'admin' || u.id === p.usuario_id)) ||
    (req.query.email && req.query.email.toLowerCase() === p.email.toLowerCase());
  return ok ? p : undefined;
}

router.get('/seguimiento/:codigo', authOpcional, wrap(async (req, res) => {
  const p = await cargarAccesible(req);
  if (p === null) return res.status(404).json({ error: 'Pedido no encontrado' });
  if (p === undefined) return res.status(403).json({ error: 'Indica el email con el que compraste' });
  p.items = await itemsDe(p.id);
  if (p.metodo_pago === 'qr' && p.estado === 'pendiente') p.qr = await generarQR(p);
  res.json(p);
}));

// RF10 — comprobante PDF
router.get('/comprobante/:codigo', authOpcional, wrap(async (req, res) => {
  const p = await cargarAccesible(req);
  if (p === null) return res.status(404).json({ error: 'Pedido no encontrado' });
  if (p === undefined) return res.status(403).json({ error: 'Acceso denegado' });
  const items = await itemsDe(p.id);
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
    .text(`Estado: ${p.estado}`).moveDown();
  doc.fontSize(11).text('Detalle', { underline: true }).moveDown(0.5);
  items.forEach((i) => doc.text(`${i.cantidad} x ${i.nombre}   Bs ${i.precio_unitario.toFixed(2)}   =   Bs ${(i.cantidad * i.precio_unitario).toFixed(2)}`));
  doc.moveDown().fontSize(14).text(`TOTAL: Bs ${Number(p.total).toFixed(2)}`, { align: 'right' });
  doc.moveDown(2).fontSize(8).fillColor('#888')
    .text('Pokémon y sus marcas pertenecen a Nintendo, Game Freak y The Pokémon Company. Proyecto académico sin transacciones reales.', { align: 'center' });
  doc.end();
}));

module.exports = router;
