import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';

// PayPal redirige aquí: /paypal/retorno?token=<orden>&codigo=...&email=...  (o /paypal/cancelado si el cliente se arrepiente)
export default function PaypalReturn() {
  const { pathname } = useLocation();
  const [sp] = useSearchParams();
  const codigo = sp.get('codigo'), email = sp.get('email'), token = sp.get('token');
  const cancelado = pathname.endsWith('cancelado');
  const [estado, setEstado] = useState(cancelado ? 'cancelado' : 'cobrando');
  const [error, setError] = useState('');

  useEffect(() => {
    if (cancelado) return;
    api('/paypal/capturar', { method: 'POST', body: { codigo, email, token } })
      .then(() => setEstado('ok')).catch((e) => { setError(e.message); setEstado('error'); });
    // eslint-disable-next-line
  }, []);

  const reintentar = async () => {
    try { const r = await api('/paypal/crear', { method: 'POST', body: { codigo, email } }); window.location.href = r.approve_url; } catch (e) { setError(e.message); }
  };
  const seg = `/seguimiento/${codigo}?email=${encodeURIComponent(email || '')}`;
  return (
    <div className="panel narrow center-text">
      {estado === 'cobrando' && <><h2>Confirmando tu pago con PayPal…</h2><p className="muted">No cierres esta ventana.</p></>}
      {estado === 'ok' && <><h2>¡Pago recibido! ✅</h2><p>Tu pedido <b>{codigo}</b> quedó confirmado y pasa a preparación.</p><Link className="btn" to={seg}>Ver mi pedido</Link></>}
      {estado === 'cancelado' && <><h2>Pago cancelado</h2><p>No se te cobró nada. Tu pedido <b>{codigo}</b> sigue pendiente.</p>
        <button onClick={reintentar}>Intentar de nuevo con PayPal</button> <Link className="btn ghost" to={seg}>Ver mi pedido</Link></>}
      {estado === 'error' && <><h2>No pudimos confirmar el pago</h2><p className="alert">{error}</p><Link className="btn" to={seg}>Ver mi pedido</Link></>}
      {estado === 'cancelado' && error && <p className="alert">{error}</p>}
    </div>
  );
}
