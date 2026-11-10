const router = require('express').Router();
const QRCode = require('qrcode');
const pool = require('../db');
const { auth, optionalAuth, requireRole } = require('../middleware/auth');

async function loadOrder(id) {
  const [orders] = await pool.query(
    `SELECT o.*, u.name AS user_name, u.email AS user_email, c.name AS courier_name
     FROM orders o LEFT JOIN users u ON u.id = o.user_id LEFT JOIN users c ON c.id = o.courier_id
     WHERE o.id = ?`, [id]);
  if (!orders[0]) return null;
  const [items] = await pool.query(
    `SELECT oi.*, p.name, p.sku FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`, [id]);
  return { ...orders[0], items };
}

// RF06/RF07/RF08/RF10 - Checkout (cliente registrado o invitado)
// RNF04: transacción con bloqueo de filas para mantener el stock consistente
router.post('/', optionalAuth, async (req, res) => {
  const { items, payment_method, delivery_address, guest_name, guest_email, guest_phone } = req.body;
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'El carrito está vacío' });
  if (!['qr', 'transferencia', 'contra_entrega'].includes(payment_method)) {
    return res.status(400).json({ error: 'Método de pago inválido' });
  }
  if (!req.user && (!guest_name || !guest_email)) {
    return res.status(400).json({ error: 'Los invitados deben indicar nombre y correo' });
  }

  // Normaliza y agrupa cantidades por producto
  const qtyById = new Map();
  for (const it of items) {
    const q = parseInt(it.quantity, 10);
    if (!it.product_id || !(q > 0)) return res.status(400).json({ error: 'Ítem inválido en el carrito' });
    qtyById.set(it.product_id, (qtyById.get(it.product_id) || 0) + q);
  }
  const ids = [...qtyById.keys()].sort((a, b) => a - b); // orden fijo => evita deadlocks

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [products] = await conn.query(
      `SELECT id, name, price, stock, active FROM products WHERE id IN (?) ORDER BY id FOR UPDATE`, [ids]);
    if (products.length !== ids.length) throw Object.assign(new Error('Algún producto ya no existe'), { status: 400 });

    let total = 0;
    for (const p of products) {
      const q = qtyById.get(p.id);
      if (!p.active) throw Object.assign(new Error(`"${p.name}" ya no está disponible`), { status: 409 });
      if (p.stock < q) throw Object.assign(new Error(`Stock insuficiente de "${p.name}" (disponible: ${p.stock})`), { status: 409 });
      total += p.price * q;
    }

    const [r] = await conn.query(
      `INSERT INTO orders (user_id, guest_name, guest_email, guest_phone, total, payment_method, delivery_address)
       VALUES (?,?,?,?,?,?,?)`,
      [req.user?.id || null, guest_name || null, guest_email || null, guest_phone || null, total, payment_method, delivery_address || null]
    );
    for (const p of products) {
      const q = qtyById.get(p.id);
      await conn.query('INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?,?,?,?)', [r.insertId, p.id, q, p.price]);
      await conn.query('UPDATE products SET stock = stock - ? WHERE id = ?', [q, p.id]); // RF08
    }
    await conn.commit();

    const order = await loadOrder(r.insertId);
    // QR de pago real (contenido simulado); la confirmación es simulada (ver restricciones del proyecto)
    if (payment_method === 'qr') {
      order.qr = await QRCode.toDataURL(`KANTOSTORE|PEDIDO:${order.id}|MONTO:${Number(order.total).toFixed(2)}|BOB`);
    }
    res.status(201).json(order);
  } catch (e) {
    await conn.rollback();
    if (e.status) return res.status(e.status).json({ error: e.message });
    console.error(e);
    res.status(500).json({ error: 'Error al procesar el pedido' });
  } finally {
    conn.release();
  }
});

// RF11 - Historial del cliente
router.get('/mine', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT id FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
  res.json(await Promise.all(rows.map(r => loadOrder(r.id))));
});

// Pedidos asignados al repartidor
router.get('/deliveries/mine', auth, requireRole('repartidor'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id FROM orders WHERE courier_id = ? AND status IN ('preparando','en_transito','entregado') ORDER BY created_at DESC`, [req.user.id]);
  res.json(await Promise.all(rows.map(r => loadOrder(r.id))));
});

// Panel admin: todos los pedidos
router.get('/', auth, requireRole('admin', 'stock'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT o.id FROM orders o ${req.query.status ? 'WHERE o.status = ?' : ''} ORDER BY o.created_at DESC`,
    req.query.status ? [req.query.status] : []);
  res.json(await Promise.all(rows.map(r => loadOrder(r.id))));
});

// Comprobante (RF10): dueño, personal, o invitado con su correo
router.get('/:id', optionalAuth, async (req, res) => {
  const order = await loadOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
  const staff = req.user && ['admin', 'stock', 'repartidor'].includes(req.user.role);
  const owner = req.user && order.user_id === req.user.id;
  const guestOk = !order.user_id && req.query.email && req.query.email === order.guest_email;
  if (!(staff || owner || guestOk)) return res.status(403).json({ error: 'Sin acceso a este pedido' });
  res.json(order);
});

// Confirmación de pago SIMULADA (primera versión)
router.post('/:id/confirm-payment', optionalAuth, async (req, res) => {
  const order = await loadOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
  const staff = req.user && req.user.role === 'admin';
  const owner = req.user && order.user_id === req.user.id;
  const guestOk = !order.user_id && req.body.email && req.body.email === order.guest_email;
  if (!(staff || owner || guestOk)) return res.status(403).json({ error: 'Sin acceso a este pedido' });
  if (order.payment_method === 'contra_entrega') return res.status(400).json({ error: 'Este pedido se paga contra entrega' });
  await pool.query("UPDATE orders SET payment_status = 'pagado' WHERE id = ?", [order.id]);
  res.json({ ok: true });
});

// Asignar repartidor
router.patch('/:id/assign', auth, requireRole('admin'), async (req, res) => {
  const { courier_id } = req.body;
  const [u] = await pool.query("SELECT id FROM users WHERE id = ? AND role = 'repartidor'", [courier_id]);
  if (!u[0]) return res.status(400).json({ error: 'El usuario no es un repartidor' });
  await pool.query("UPDATE orders SET courier_id = ?, status = IF(status = 'pendiente','preparando',status) WHERE id = ?", [courier_id, req.params.id]);
  res.json({ ok: true });
});

// Cambiar estado (admin: cualquiera; repartidor: solo sus pedidos -> en_transito/entregado)
router.patch('/:id/status', auth, requireRole('admin', 'repartidor'), async (req, res) => {
  const { status } = req.body;
  const valid = ['pendiente', 'preparando', 'en_transito', 'entregado', 'cancelado'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Estado inválido' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [req.params.id]);
    const o = rows[0];
    if (!o) { await conn.rollback(); return res.status(404).json({ error: 'Pedido no encontrado' }); }
    if (req.user.role === 'repartidor') {
      if (o.courier_id !== req.user.id) { await conn.rollback(); return res.status(403).json({ error: 'Este pedido no te fue asignado' }); }
      if (!['en_transito', 'entregado'].includes(status)) { await conn.rollback(); return res.status(403).json({ error: 'Estado no permitido' }); }
    }
    // Cancelar devuelve el stock
    if (status === 'cancelado' && o.status !== 'cancelado') {
      await conn.query(
        `UPDATE products p JOIN order_items oi ON oi.product_id = p.id SET p.stock = p.stock + oi.quantity WHERE oi.order_id = ?`, [o.id]);
    }
    const paid = status === 'entregado' && o.payment_method === 'contra_entrega' ? ", payment_status = 'pagado'" : '';
    await conn.query(`UPDATE orders SET status = ?${paid} WHERE id = ?`, [status, o.id]);
    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ error: 'Error al actualizar el pedido' });
  } finally {
    conn.release();
  }
});

module.exports = router;
