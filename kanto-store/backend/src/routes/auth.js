const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { firmar, auth } = require('../middleware/auth');
const { wrap } = require('../utils/helpers');

const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');

// RF01 — registro (siempre rol cliente)
router.post('/register', wrap(async (req, res) => {
  const { nombre, email, password, telefono } = req.body;
  if (!nombre || !emailOk(email) || !password || password.length < 6) {
    return res.status(400).json({ error: 'Nombre, email válido y contraseña (mín. 6) son obligatorios' });
  }
  const [ex] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
  if (ex.length) return res.status(409).json({ error: 'Ese email ya está registrado' });
  const hash = await bcrypt.hash(password, 10); // RNF02
  const [r] = await db.query(
    'INSERT INTO usuarios (nombre, email, password_hash, telefono) VALUES (?,?,?,?)',
    [nombre, email, hash, telefono || null]
  );
  const user = { id: r.insertId, nombre, email, rol: 'cliente' };
  res.status(201).json({ token: firmar(user), user });
}));

// RF01 — login
router.post('/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  const [[u]] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email || '']);
  if (!u || !u.activo || !(await bcrypt.compare(password || '', u.password_hash))) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  const user = { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol };
  res.json({ token: firmar(user), user });
}));

router.get('/me', auth, wrap(async (req, res) => {
  const [[u]] = await db.query('SELECT id, nombre, email, telefono, rol FROM usuarios WHERE id = ?', [req.user.id]);
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(u);
}));

module.exports = router;
