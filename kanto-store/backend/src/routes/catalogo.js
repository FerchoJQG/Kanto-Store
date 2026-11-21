const router = require('express').Router();
const db = require('../db');
const { wrap, RAREZAS, IDIOMAS, ESTADOS_CARTA } = require('../utils/helpers');

const SELECT = `SELECT p.*, e.nombre AS expansion FROM productos p
                LEFT JOIN expansiones e ON e.id = p.expansion_id`;

// RF02 — catálogo con filtros (singles y sellados)
router.get('/productos', wrap(async (req, res) => {
  const { tipo, expansion, rareza, idioma, estado, q, subtipo, categoria, min, max, orden } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(60, parseInt(req.query.limit) || 24);
  const where = ['p.activo = 1'];
  const params = [];
  if (tipo) { where.push('p.tipo = ?'); params.push(tipo); }
  if (subtipo) { where.push('p.subtipo_sellado = ?'); params.push(subtipo); }
  // Diferencia Booster Boxes y ETB sin alterar el ENUM de TiDB ni el flujo de ventas.
  if (categoria === 'booster') where.push("p.tipo = 'sellado' AND p.subtipo_sellado = 'caja' AND p.nombre LIKE 'Booster Box%'");
  if (categoria === 'etb') where.push("p.tipo = 'sellado' AND p.subtipo_sellado = 'caja' AND (p.nombre LIKE 'Elite Trainer Box%' OR p.nombre LIKE 'Caja de entrenador%')");
  if (expansion) { where.push('p.expansion_id = ?'); params.push(expansion); }
  if (rareza) { where.push('p.rareza = ?'); params.push(rareza); }
  if (idioma) { where.push('p.idioma = ?'); params.push(idioma); }
  if (estado) { where.push('p.estado_conservacion = ?'); params.push(estado); }
  if (min) { where.push('p.precio >= ?'); params.push(Number(min)); }
  if (max) { where.push('p.precio <= ?'); params.push(Number(max)); }
  if (q) { where.push('(p.nombre LIKE ? OR p.sku LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  const orderBy = { precio_asc: 'p.precio ASC', precio_desc: 'p.precio DESC', nombre: 'p.nombre ASC' }[orden] || 'p.creado_en DESC';
  const w = where.join(' AND ');
  const [[{ total }]] = await db.query(`SELECT COUNT(*) total FROM productos p WHERE ${w}`, params);
  const [items] = await db.query(`${SELECT} WHERE ${w} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]);
  res.json({ items, total, page, paginas: Math.ceil(total / limit) });
}));

// RF05 — ficha de producto
router.get('/productos/:id', wrap(async (req, res) => {
  const [[p]] = await db.query(`${SELECT} WHERE p.id = ? AND p.activo = 1`, [req.params.id]);
  if (!p) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(p);
}));

// Revalida el carrito con el stock y precios actuales
router.post('/carrito/validar', wrap(async (req, res) => {
  const ids = (Array.isArray(req.body.items) ? req.body.items : []).map((i) => Number(i.producto_id)).filter(Number.isInteger);
  if (!ids.length) return res.json([]);
  const [rows] = await db.query('SELECT id, nombre, precio, stock, activo FROM productos WHERE id IN (?)', [ids]);
  res.json(rows);
}));

router.get('/expansiones', wrap(async (_req, res) => {
  const [rows] = await db.query('SELECT * FROM expansiones ORDER BY fecha_lanzamiento DESC, nombre');
  res.json(rows);
}));

router.get('/meta', (_req, res) => res.json({ rarezas: RAREZAS, idiomas: IDIOMAS, estados: ESTADOS_CARTA }));

module.exports = router;
