const router = require('express').Router();
const pool = require('../db');
const { auth, requireRole } = require('../middleware/auth');

const SELECT = `
  SELECT p.*, s.name AS set_name, s.code AS set_code
  FROM products p LEFT JOIN card_sets s ON s.id = p.set_id`;

// Listado de expansiones (para filtros)
router.get('/sets', async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM card_sets ORDER BY release_year, name');
  res.json(rows);
});

// RF02 - Catálogo con filtros: tipo, expansión, rareza, idioma, estado, búsqueda, rango de precio
router.get('/', async (req, res) => {
  const { type, set_id, rarity, language, cond, q, min_price, max_price, sealed_kind, in_stock } = req.query;
  const where = ['p.active = 1'];
  const params = [];
  if (type) { where.push('p.type = ?'); params.push(type); }
  if (set_id) { where.push('p.set_id = ?'); params.push(set_id); }
  if (rarity) { where.push('p.rarity = ?'); params.push(rarity); }
  if (language) { where.push('p.language = ?'); params.push(language); }
  if (cond) { where.push('p.cond = ?'); params.push(cond); }
  if (sealed_kind) { where.push('p.sealed_kind = ?'); params.push(sealed_kind); }
  if (q) { where.push('(p.name LIKE ? OR p.sku LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  if (min_price) { where.push('p.price >= ?'); params.push(min_price); }
  if (max_price) { where.push('p.price <= ?'); params.push(max_price); }
  if (in_stock === '1') where.push('p.stock > 0');
  const order = { price_asc: 'p.price ASC', price_desc: 'p.price DESC', name: 'p.name ASC' }[req.query.sort] || 'p.created_at DESC';
  try {
    const [rows] = await pool.query(`${SELECT} WHERE ${where.join(' AND ')} ORDER BY ${order}`, params);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar el catálogo' });
  }
});

// RF05 - Ficha de carta
router.get('/:id', async (req, res) => {
  const [rows] = await pool.query(`${SELECT} WHERE p.id = ?`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(rows[0]);
});

// ---- Administración (RF09) ----
const FIELDS = ['sku','type','name','set_id','card_number','rarity','language','cond','sealed_kind','image_url','price','stock','min_stock','active'];

router.post('/', auth, requireRole('admin', 'stock'), async (req, res) => {
  const b = req.body;
  if (!b.sku || !b.name || b.price == null) return res.status(400).json({ error: 'SKU, nombre y precio son obligatorios' });
  try {
    const cols = FIELDS.filter(f => b[f] !== undefined);
    const [r] = await pool.query(
      `INSERT INTO products (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
      cols.map(c => (b[c] === '' ? null : b[c]))
    );
    res.status(201).json({ id: r.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El SKU ya existe' });
    console.error(e);
    res.status(500).json({ error: 'Error al crear el producto' });
  }
});

router.put('/:id', auth, requireRole('admin', 'stock'), async (req, res) => {
  const b = req.body;
  const cols = FIELDS.filter(f => b[f] !== undefined);
  if (!cols.length) return res.status(400).json({ error: 'Nada que actualizar' });
  // El encargado de stock no puede cambiar precios
  if (req.user.role === 'stock' && cols.includes('price')) {
    return res.status(403).json({ error: 'El encargado de stock no puede modificar precios' });
  }
  try {
    await pool.query(
      `UPDATE products SET ${cols.map(c => `${c} = ?`).join(',')} WHERE id = ?`,
      [...cols.map(c => (b[c] === '' ? null : b[c])), req.params.id]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// Eliminación lógica si tiene ventas, física si no
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const [sold] = await pool.query('SELECT 1 FROM order_items WHERE product_id = ? LIMIT 1', [req.params.id]);
    if (sold.length) {
      await pool.query('UPDATE products SET active = 0 WHERE id = ?', [req.params.id]);
      return res.json({ ok: true, soft: true });
    }
    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

module.exports = router;
