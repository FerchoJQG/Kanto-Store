const crypto = require('crypto');

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, msg) => { throw new HttpError(status, msg); };

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const RAREZAS = ['comun', 'poco_comun', 'rara', 'holo_rara', 'ultra_rara', 'secreta'];
const IDIOMAS = ['espanol', 'ingles', 'japones'];
const ESTADOS_CARTA = ['mint', 'near_mint', 'excelente', 'played', 'sellado'];
const ROLES = ['cliente', 'admin', 'stock', 'repartidor', 'empacador'];
const ESTADOS_PEDIDO = ['pendiente', 'por_verificar', 'pagado', 'preparando', 'empacado', 'en_transito', 'entregado', 'cancelado'];
const METODOS_PAGO = ['qr', 'transferencia', 'contra_entrega', 'paypal'];

function genCodigo() {
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `KS-${Date.now().toString(36).toUpperCase()}${r}`;
}
const genPin = () => String(crypto.randomInt(100000, 1000000));

module.exports = { HttpError, fail, wrap, RAREZAS, IDIOMAS, ESTADOS_CARTA, ROLES, ESTADOS_PEDIDO, METODOS_PAGO, genCodigo, genPin };
