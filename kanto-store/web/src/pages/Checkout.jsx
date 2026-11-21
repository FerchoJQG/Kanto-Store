import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, bs, etiqueta, apiBase } from '../api.js';
import { useAuth, useCart } from '../context.jsx';
import PagoPanel from '../components/PagoPanel.jsx';

export default function Checkout() {
  const { items, total, clear } = useCart();
  const { user } = useAuth();
  const [f, setF] = useState({
    nombre_cliente: user?.nombre || '', email: user?.email || '', telefono: '', direccion: '',
    metodo_entrega: 'envio', metodo_pago: 'qr',
  });
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [pedido, setPedido] = useState(null);
  const [cfg, setCfg] = useState({ paypal: false });
  useEffect(() => { api('/config/pagos').then(setCfg).catch(() => {}); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  if (pedido) return <Resultado pedido={pedido} email={f.email} />;
  if (!items.length) return <div className="empty"><h2>No hay productos para pagar</h2><Link to="/">Ir al catálogo</Link></div>;

  const enviar = async (e) => {
    e.preventDefault(); setError(''); setSending(true);
    try {
      const p = await api('/pedidos', { method: 'POST', body: { ...f, items: items.map((i) => ({ producto_id: i.id, cantidad: i.cantidad })) } });
      clear();
      if (p.metodo_pago === 'paypal') { // PayPal: crea la orden y redirige a aprobar el pago
        try { const r = await api('/paypal/crear', { method: 'POST', body: { codigo: p.codigo, email: f.email } }); window.location.href = r.approve_url; return; }
        catch (er) { setError(`Tu pedido ${p.codigo} quedó pendiente, pero PayPal falló: ${er.message}`); }
      }
      setPedido(p);
    } catch (err) { setError(err.message); } finally { setSending(false); }
  };

  return (
    <form className="checkout ks-checkout" onSubmit={enviar}>
      <div className="ks-checkout-hero"><span>✦ YA CASI LO TIENES</span><h1>FINALIZAR COMPRA</h1><p>Confirma tus datos, elige cómo recibir tu colección y selecciona un medio de pago. {!user && "Puedes comprar como invitado."}</p></div>
      <div className="two">
        <div className="panel">
          <h3><span className="ks-checkout-step">01</span> Tus datos</h3>
          <label>Nombre completo<input required value={f.nombre_cliente} onChange={set('nombre_cliente')} /></label>
          <label>Email<input required type="email" value={f.email} onChange={set('email')} /></label>
          <label>Teléfono<input value={f.telefono} onChange={set('telefono')} /></label>
          <h3><span className="ks-checkout-step">02</span> Entrega</h3>
          <label className="radio"><input type="radio" checked={f.metodo_entrega === 'envio'} onChange={() => setF({ ...f, metodo_entrega: 'envio' })} /> Envío a domicilio</label>
          <label className="radio"><input type="radio" checked={f.metodo_entrega === 'retiro'} onChange={() => setF({ ...f, metodo_entrega: 'retiro' })} /> Retiro en tienda</label>
          {f.metodo_entrega === 'envio' && <label>Dirección<input required value={f.direccion} onChange={set('direccion')} /></label>}
          <h3><span className="ks-checkout-step">03</span> Pago</h3>
          {['qr', 'transferencia', 'paypal', 'contra_entrega'].filter((m) => m !== 'paypal' || cfg.paypal).map((m) => (
            <label key={m} className="radio"><input type="radio" checked={f.metodo_pago === m} onChange={() => setF({ ...f, metodo_pago: m })} />
              {m === 'qr' ? 'QR bancario' : m === 'paypal' ? 'PayPal (tarjeta o cuenta PayPal)' : etiqueta(m)}</label>
          ))}
          {f.metodo_pago === 'contra_entrega' && f.metodo_entrega === 'envio' && <p className="muted">Pagas en efectivo al recibir; el repartidor registrará el cobro.</p>}
        </div>
        <div className="panel">
          <h3><span className="ks-checkout-step">✦</span> Resumen del pedido</h3>
          {items.map((i) => <div className="row between" key={i.id}><span>{i.cantidad} × {i.nombre}</span><span>{bs(i.precio * i.cantidad)}</span></div>)}
          <hr /><div className="row between"><strong>Total</strong><strong>{bs(total)}</strong></div>
          {error && <p className="alert">{error}</p>}
          <button className="ks-checkout-submit" disabled={sending}>{sending ? 'Procesando…' : 'CONFIRMAR PEDIDO ↗'}</button>
        </div>
      </div>
    </form>
  );
}

function Resultado({ pedido, email }) {
  const [hecho, setHecho] = useState(false);
  return (
    <div className="narrow-wide">
      <div className="panel center-text">
        <h1>¡Pedido registrado! 🎉</h1>
        <p>Código: <strong>{pedido.codigo}</strong> — Total {bs(pedido.total)}</p>
        {pedido.metodo_pago === 'contra_entrega'
          ? <p>Pedido confirmado. Pagarás al recibirlo.</p>
          : <p className="muted">Tu pedido se confirma cuando verifiquemos el pago.</p>}
        <div className="pinbox">Tu PIN de entrega: <b>{pedido.pin_entrega}</b><small>Guárdalo: se lo das al repartidor solo cuando recibas tu pedido.</small></div>
        <p>
          <Link className="btn" to={`/seguimiento/${pedido.codigo}?email=${encodeURIComponent(email)}`}>Seguir mi pedido</Link>{' '}
          <a className="btn ghost" target="_blank" rel="noreferrer" href={`${apiBase}/pedidos/comprobante/${pedido.codigo}?email=${encodeURIComponent(email)}`}>Comprobante PDF</a>
        </p>
      </div>
      {['qr', 'transferencia'].includes(pedido.metodo_pago) && !hecho && (
        <PagoPanel pedido={{ ...pedido, estado: 'pendiente' }} email={email} onCambio={() => setHecho(true)} />
      )}
      {hecho && <p className="ok center-text">✔ Comprobante enviado. Puedes seguir el estado desde "Seguir mi pedido".</p>}
      {pedido.metodo_pago === 'paypal' && <PagoPanel pedido={{ ...pedido, estado: 'pendiente' }} email={email} />}
    </div>
  );
}
