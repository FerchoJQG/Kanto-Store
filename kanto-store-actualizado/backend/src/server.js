require('dotenv').config();
const app = require('./app');
const port = process.env.PORT || 4000;
const { expirarPendientes } = require('./utils/pedidos');
app.listen(port, () => console.log(`Kanto Store API en http://localhost:${port}`));
// Cada 10 min: cancela pedidos sin pagar vencidos y devuelve su stock
setInterval(() => expirarPendientes().then((n) => n && console.log(`${n} pedido(s) vencido(s) cancelado(s)`)).catch((e) => console.error(e.message)), 10 * 60 * 1000);
expirarPendientes().catch(() => {});
