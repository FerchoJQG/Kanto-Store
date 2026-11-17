const router = require('express').Router();
const { authOpcional } = require('../middleware/auth');
const { wrap, fail } = require('../utils/helpers');
const { bobPorUsd, webUrl } = require('../utils/config');
const paypal = require('../utils/paypal');
const P = require('../utils/pedidos');
const db = require('../db');

const activo = () => !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET);

// 1) Crea la orden en PayPal y devuelve el enlace donde el cliente aprueba el pago.
router.post('/crear', authOpcional, wrap(async (req, res) => {
  if (!activo()) fail(400, 'PayPal no está configurado');
  const p0 = await P.accesoPedido(req, req.body.codigo);
  if (p0 === null) fail(404, 'Pedido no encontrado');
  if (p0 === undefined) fail(403, 'Acceso denegado');
  if (p0.metodo_pago !== 'paypal') fail(400, 'Este pedido no se paga con PayPal');
  if (!['pendiente', 'por_verificar'].includes(p0.estado)) fail(400, 'El pedido ya no está pendiente de pago');
  const usd = (Number(p0.total) / bobPorUsd()).toFixed(2);
  const q = `codigo=${encodeURIComponent(p0.codigo)}&email=${encodeURIComponent(p0.email)}`;
  const orden = await paypal.crearOrden({
    codigo: p0.codigo, montoUsd: usd,
    returnUrl: `${webUrl()}/paypal/retorno?${q}`, cancelUrl: `${webUrl()}/paypal/cancelado?${q}`,
  });
  await db.query('UPDATE pedidos SET paypal_order_id = ? WHERE id = ?', [orden.id, p0.id]);
  res.json({ approve_url: orden.approveUrl, monto_usd: usd });
}));

// 2) Al volver de PayPal, cobra la orden y confirma el pedido.
router.post('/capturar', authOpcional, wrap(async (req, res) => {
  if (!activo()) fail(400, 'PayPal no está configurado');
  const { token } = req.body; // PayPal devuelve ?token=<order id>
  const p0 = await P.accesoPedido(req, req.body.codigo);
  if (p0 === null) fail(404, 'Pedido no encontrado');
  if (p0 === undefined) fail(403, 'Acceso denegado');
  if (!token) fail(400, 'Falta el token de PayPal');
  await P.conPedido(p0.id, async (conn, p) => {
    if (p.estado === 'pagado') return; // ya capturado (recarga de la página)
    if (!['pendiente', 'por_verificar'].includes(p.estado)) fail(400, 'El pedido ya no está pendiente de pago');
    if (p.paypal_order_id !== token) fail(400, 'La orden de PayPal no corresponde a este pedido');
    const c = await paypal.capturarOrden(token);
    const esperado = (Number(p.total) / bobPorUsd()).toFixed(2);
    if (c.estado !== 'COMPLETED' || c.captureEstado !== 'COMPLETED') fail(402, 'PayPal no completó el cobro');
    if (c.moneda !== 'USD' || Number(c.monto).toFixed(2) !== esperado) fail(402, 'El monto cobrado no coincide con el pedido');
    await P.cambiarEstado(conn, p, 'pagado', null, `Pago con PayPal confirmado (USD ${esperado})`,
      { paypal_capture_id: c.captureId, pagado_en: new Date(), expira_en: null });
  });
  res.json({ ok: true });
}));

module.exports = router;
