const router = require('express').Router();
const db = require('../db');
const { auth } = require('../middleware/auth');
const { wrap } = require('../utils/helpers');

router.use(auth);

router.get('/', wrap(async (req, res) => {
  const [rows] = await db.query(
    'SELECT * FROM notificaciones WHERE usuario_id = ? ORDER BY creado_en DESC LIMIT 50', [req.user.id]);
  res.json(rows);
}));

router.patch('/leer', wrap(async (req, res) => {
  await db.query('UPDATE notificaciones SET leida = 1 WHERE usuario_id = ?', [req.user.id]);
  res.json({ ok: true });
}));

module.exports = router;
