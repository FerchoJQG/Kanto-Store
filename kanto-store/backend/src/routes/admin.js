// Gestión de productos (RF09), expansiones, inventario, usuarios y reportes.
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { auth, rol } = require('../middleware/auth');
const { wrap, RAREZAS, IDIOMAS, ESTADOS_CARTA } = require('../utils/helpers');
const { notificarDisponibilidad } = require('../utils/notify');

router.use(auth);

// ---------- Productos ----------
function validarProducto(b, parcial = false) {
  const e = [];
  if (!parcial || b.nombre !== undefined) if (!b.nombre) e.push('nombre');
  if (!parcial || b.sku !== undefined) if (!b.sku) e.push('sku');
  if (!parcial || b.tipo !== undefined) if (!['single', 'sellado'].includes(b.tipo)) e.push('tipo');
  if (!parcial || b.precio !== undefined) if (!(Number(b.precio) >= 0)) e.push('precio');
  if (b.rareza && !RAREZAS.includes(b.rareza)) e.push('rareza');
  if (b.idioma && !IDIOMAS.includes(b.idioma)) e.push('idioma');
  if (b.estado_conservacion && !ESTADOS_CARTA.includes(b.estado_conservacion)) e.push('estado_conservacion');
  if (b.stock !== undefined && !(Number(b.stock) >= 0)) e.push('stock');
  return e;
}
const CAMPOS = ['sku', 'tipo', 'subtipo_sellado', 'nombre', 'descripcion', 'expansion_id', 'numero_coleccion',
  'rareza', 'idioma', 'estado_conservacion', 'precio', 'stock', 'stock_minimo', 'imagen_url', 'activo'];

router.get('/productos', rol('admin', 'stock'), wrap(async (_req, res) => {
  const [rows] = await db.query(
    `SELECT p.*, e.nombre AS expansion FROM productos p LEFT JOIN expansiones e ON e.id = p.expansion_id ORDER BY p.id DESC`);
  res.json(rows);
}));

router.post('/productos', rol('admin', 'stock'), wrap(async (req, res) => {
  const err = validarProducto(req.body);
  if (err.length) return res.status(400).json({ error: `Campos inválidos: ${err.join(', ')}` });
  const cols = CAMPOS.filter((c) => req.body[c] !== undefined && req.body[c] !== '');
  try {
    const [r] = await db.query(`INSERT INTO productos (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
      cols.map((c) => req.body[c]));
    res.status(201).json({ id: r.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El SKU ya existe' });
    throw e;
  }
}));

router.put('/productos/:id', rol('admin', 'stock'), wrap(async (req, res) => {
  const err = validarProducto(req.body, true);
  if (err.length) return res.status(400).json({ error: `Campos inválidos: ${err.join(', ')}` });
  const cols = CAMPOS.filter((c) => req.body[c] !== undefined);
  if (!cols.length) return res.status(400).json({ error: 'Nada que actualizar' });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[antes]] = await conn.query('SELECT stock FROM productos WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!antes) { await conn.rollback(); return res.status(404).json({ error: 'No existe' }); }
    await conn.query(`UPDATE productos SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
      [...cols.map((c) => (req.body[c] === '' ? null : req.body[c])), req.params.id]);
    if (antes.stock === 0 && Number(req.body.stock) > 0) await notificarDisponibilidad(conn, req.params.id);
    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El SKU ya existe' });
    throw e;
  } finally { conn.release(); }
}));

// Eliminar: borrado lógico si tiene pedidos, físico si no
router.delete('/productos/:id', rol('admin'), wrap(async (req, res) => {
  const [[{ n }]] = await db.query('SELECT COUNT(*) n FROM pedido_items WHERE producto_id = ?', [req.params.id]);
  if (n > 0) {
    await db.query('UPDATE productos SET activo = 0 WHERE id = ?', [req.params.id]);
    return res.json({ ok: true, desactivado: true });
  }
  await db.query('DELETE FROM productos WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

// ---------- Inventario ----------
router.patch('/productos/:id/stock', rol('admin', 'stock'), wrap(async (req, res) => {
  const { cantidad, estado_conservacion } = req.body; // cantidad = nuevo stock absoluto
  if (!(Number(cantidad) >= 0)) return res.status(400).json({ error: 'Cantidad inválida' });
  if (estado_conservacion && !ESTADOS_CARTA.includes(estado_conservacion)) return res.status(400).json({ error: 'Estado inválido' });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[antes]] = await conn.query('SELECT stock FROM productos WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!antes) { await conn.rollback(); return res.status(404).json({ error: 'No existe' }); }
    await conn.query('UPDATE productos SET stock = ?, estado_conservacion = COALESCE(?, estado_conservacion) WHERE id = ?',
      [Number(cantidad), estado_conservacion || null, req.params.id]);
    let avisos = 0;
    if (antes.stock === 0 && Number(cantidad) > 0) avisos = await notificarDisponibilidad(conn, req.params.id);
    await conn.commit();
    res.json({ ok: true, avisos });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));

router.get('/inventario/alertas', rol('admin', 'stock'), wrap(async (_req, res) => {
  const [rows] = await db.query(
    'SELECT id, sku, nombre, stock, stock_minimo FROM productos WHERE activo = 1 AND stock <= stock_minimo ORDER BY stock ASC');
  res.json(rows);
}));

// ---------- Expansiones ----------
router.post('/expansiones', rol('admin', 'stock'), wrap(async (req, res) => {
  const { nombre, codigo, fecha_lanzamiento } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre obligatorio' });
  const [r] = await db.query('INSERT INTO expansiones (nombre, codigo, fecha_lanzamiento) VALUES (?,?,?)',
    [nombre, codigo || null, fecha_lanzamiento || null]);
  res.status(201).json({ id: r.insertId });
}));

// ---------- Usuarios ----------
router.get('/usuarios', rol('admin'), wrap(async (_req, res) => {
  const [rows] = await db.query('SELECT id, nombre, email, telefono, rol, activo, creado_en FROM usuarios ORDER BY id DESC');
  res.json(rows);
}));

router.post('/usuarios', rol('admin'), wrap(async (req, res) => {
  const { nombre, email, password, rol: r, telefono } = req.body;
  if (!nombre || !email || !password || !['cliente', 'admin', 'stock', 'repartidor'].includes(r)) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }
  try {
    const [x] = await db.query('INSERT INTO usuarios (nombre,email,password_hash,telefono,rol) VALUES (?,?,?,?,?)',
      [nombre, email, await bcrypt.hash(password, 10), telefono || null, r]);
    res.status(201).json({ id: x.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email ya registrado' });
    throw e;
  }
}));

router.patch('/usuarios/:id', rol('admin'), wrap(async (req, res) => {
  const { rol: r, activo } = req.body;
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'No puedes modificar tu propia cuenta' });
  if (r !== undefined && !['cliente', 'admin', 'stock', 'repartidor'].includes(r)) return res.status(400).json({ error: 'Rol inválido' });
  await db.query('UPDATE usuarios SET rol = COALESCE(?, rol), activo = COALESCE(?, activo) WHERE id = ?',
    [r ?? null, activo === undefined ? null : (activo ? 1 : 0), req.params.id]);
  res.json({ ok: true });
}));

// ---------- Reportes ----------
router.get('/reportes', rol('admin'), wrap(async (_req, res) => {
  const [[resumen]] = await db.query(
    `SELECT COUNT(*) pedidos, COALESCE(SUM(total),0) ingresos FROM pedidos WHERE estado NOT IN ('cancelado','pendiente')`);
  const [porEstado] = await db.query('SELECT estado, COUNT(*) cantidad FROM pedidos GROUP BY estado');
  const [top] = await db.query(
    `SELECT i.nombre, SUM(i.cantidad) vendidos, SUM(i.cantidad*i.precio_unitario) monto
     FROM pedido_items i JOIN pedidos p ON p.id = i.pedido_id WHERE p.estado <> 'cancelado'
     GROUP BY i.nombre ORDER BY vendidos DESC LIMIT 5`);
  const [ventasDia] = await db.query(
    `SELECT DATE(creado_en) dia, SUM(total) total FROM pedidos WHERE estado NOT IN ('cancelado','pendiente')
     AND creado_en >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) GROUP BY DATE(creado_en) ORDER BY dia`);
  const [[{ bajoStock }]] = await db.query('SELECT COUNT(*) bajoStock FROM productos WHERE activo = 1 AND stock <= stock_minimo');
  const [[{ clientes }]] = await db.query("SELECT COUNT(*) clientes FROM usuarios WHERE rol = 'cliente'");
  res.json({ ...resumen, porEstado, top, ventasDia, bajoStock, clientes });
}));

module.exports = router;
