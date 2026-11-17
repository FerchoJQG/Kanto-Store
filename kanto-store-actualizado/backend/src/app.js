const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
app.use(helmet({ crossOriginResourcePolicy: false }));
const origenes = (process.env.CORS_ORIGIN || '*').split(',').map((o) => o.trim().replace(/\/$/, ''));
app.use(cors({ origin: origenes.includes('*') ? true : origenes }));
app.use(express.json({ limit: '3mb' })); // comprobantes e imagen del QR viajan como data URL

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/catalogo'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/notificaciones', require('./routes/notificaciones'));
app.use('/api/pedidos', require('./routes/pedidos'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/config', require('./routes/config'));
app.use('/api/paypal', require('./routes/paypal'));

app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
  if (err.status === 502) return res.status(502).json({ error: `PayPal: ${err.message}` });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'La imagen es demasiado grande' });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
