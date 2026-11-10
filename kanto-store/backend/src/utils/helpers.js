const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const RAREZAS = ['comun', 'poco_comun', 'rara', 'holo_rara', 'ultra_rara', 'secreta'];
const IDIOMAS = ['espanol', 'ingles', 'japones'];
const ESTADOS_CARTA = ['mint', 'near_mint', 'excelente', 'played', 'sellado'];
const ESTADOS_PEDIDO = ['pendiente', 'pagado', 'preparando', 'en_transito', 'entregado', 'cancelado'];

function genCodigo() {
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `KS-${Date.now().toString(36).toUpperCase()}${r}`;
}

module.exports = { wrap, RAREZAS, IDIOMAS, ESTADOS_CARTA, ESTADOS_PEDIDO, genCodigo };
