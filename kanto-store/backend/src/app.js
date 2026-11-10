const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: (process.env.CORS_ORIGIN || '*').split(',') }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/catalogo'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/notificaciones', require('./routes/notificaciones'));
app.use('/api/pedidos', require('./routes/pedidos'));
app.use('/api/admin', require('./routes/admin'));

app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
