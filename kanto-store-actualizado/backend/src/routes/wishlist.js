const router = require('express').Router();
const db = require('../db');
const { auth } = require('../middleware/auth');
const { wrap } = require('../utils/helpers');

router.use(auth);

// RF03
router.get('/', wrap(async (req, res) => {
  const [rows] = await db.query(
    `SELECT p.*, e.nombre AS expansion FROM wishlist w JOIN productos p ON p.id = w.producto_id
     LEFT JOIN expansiones e ON e.id = p.expansion_id WHERE w.usuario_id = ? ORDER BY w.creado_en DESC`, [req.user.id]);
  res.json(rows);
}));

router.post('/:productoId', wrap(async (req, res) => {
  const [[p]] = await db.query('SELECT id FROM productos WHERE id = ?', [req.params.productoId]);
  if (!p) return res.status(404).json({ error: 'Producto no encontrado' });
  await db.query('INSERT IGNORE INTO wishlist (usuario_id, producto_id) VALUES (?,?)', [req.user.id, p.id]);
  res.status(201).json({ ok: true });
}));

router.delete('/:productoId', wrap(async (req, res) => {
  await db.query('DELETE FROM wishlist WHERE usuario_id = ? AND producto_id = ?', [req.user.id, req.params.productoId]);
  res.json({ ok: true });
}));

module.exports = router;
