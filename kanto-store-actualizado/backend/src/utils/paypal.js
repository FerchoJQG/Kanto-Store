// Cliente mínimo de la API REST de PayPal (Orders v2). Documentación: developer.paypal.com/docs/api/orders/v2
const base = () => process.env.PAYPAL_API_BASE
  || (process.env.PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com');

async function pp(path, { method = 'POST', body, headers = {}, auth } = {}) {
  const res = await fetch(base() + path, { method, headers: { ...headers, ...(auth ? { Authorization: auth } : {}) }, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.message || data.error_description || `PayPal respondió ${res.status}`);
    e.status = 502; e.detalle = data.details || data.name;
    throw e;
  }
  return data;
}

async function accessToken() {
  const basic = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64');
  const d = await pp('/v1/oauth2/token', {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials', auth: `Basic ${basic}`,
  });
  return d.access_token;
}

// Crea la orden y devuelve { id, approveUrl }. El cliente aprueba el pago en PayPal y vuelve a returnUrl.
async function crearOrden({ codigo, montoUsd, returnUrl, cancelUrl }) {
  const t = await accessToken();
  const d = await pp('/v2/checkout/orders', {
    headers: { 'Content-Type': 'application/json', 'PayPal-Request-Id': `crear-${codigo}-${Date.now()}` },
    auth: `Bearer ${t}`,
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: codigo, custom_id: codigo, description: `Kanto Store — pedido ${codigo}`,
        amount: { currency_code: 'USD', value: montoUsd },
      }],
      payment_source: {
        paypal: { experience_context: {
          brand_name: 'Kanto Store', user_action: 'PAY_NOW', shipping_preference: 'NO_SHIPPING',
          return_url: returnUrl, cancel_url: cancelUrl,
        } },
      },
    }),
  });
  const link = (d.links || []).find((l) => l.rel === 'payer-action') || (d.links || []).find((l) => l.rel === 'approve');
  if (!link) { const e = new Error('PayPal no devolvió el enlace de aprobación'); e.status = 502; throw e; }
  return { id: d.id, approveUrl: link.href };
}

// Cobra la orden ya aprobada por el cliente.
async function capturarOrden(orderId) {
  const t = await accessToken();
  const d = await pp(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    headers: { 'Content-Type': 'application/json', 'PayPal-Request-Id': `cap-${orderId}` }, auth: `Bearer ${t}`, body: '{}',
  });
  const cap = d.purchase_units?.[0]?.payments?.captures?.[0];
  return { estado: d.status, captureId: cap?.id, captureEstado: cap?.status, monto: cap?.amount?.value, moneda: cap?.amount?.currency_code };
}

module.exports = { crearOrden, capturarOrden };
