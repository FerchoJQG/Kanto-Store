import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, bs, etiqueta, apiBase } from '../api.js';
import { useAuth, useCart } from '../context.jsx';

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
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  if (pedido) return <Resultado pedido={pedido} email={f.email} />;
  if (!items.length) return <div className="empty"><h2>No hay productos para pagar</h2><Link to="/">Ir al catálogo</Link></div>;

  const enviar = async (e) => {
    e.preventDefault(); setError(''); setSending(true);
    try {
      const p = await api('/pedidos', { method: 'POST', body: { ...f, items: items.map((i) => ({ producto_id: i.id, cantidad: i.cantidad })) } });
      clear(); setPedido(p);
    } catch (err) { setError(err.message); } finally { setSending(false); }
  };

  return (
    <form className="checkout" onSubmit={enviar}>
      <h1>Finalizar compra {!user && <small className="muted">(como invitado)</small>}</h1>
      <div className="two">
        <div className="panel">
          <h3>Tus datos</h3>
          <label>Nombre completo<input required value={f.nombre_cliente} onChange={set('nombre_cliente')} /></label>
          <label>Email<input required type="email" value={f.email} onChange={set('email')} /></label>
          <label>Teléfono<input value={f.telefono} onChange={set('telefono')} /></label>
          <h3>Entrega</h3>
          <label className="radio"><input type="radio" checked={f.metodo_entrega === 'envio'} onChange={() => setF({ ...f, metodo_entrega: 'envio' })} /> Envío a domicilio</label>
          <label className="radio"><input type="radio" checked={f.metodo_entrega === 'retiro'} onChange={() => setF({ ...f, metodo_entrega: 'retiro' })} /> Retiro en tienda</label>
          {f.metodo_entrega === 'envio' && <label>Dirección<input required value={f.direccion} onChange={set('direccion')} /></label>}
          <h3>Pago</h3>
          {['qr', 'transferencia', 'contra_entrega'].map((m) => (
            <label key={m} className="radio"><input type="radio" checked={f.metodo_pago === m} onChange={() => setF({ ...f, metodo_pago: m })} /> {m === 'qr' ? 'QR' : etiqueta(m)}</label>
          ))}
        </div>
        <div className="panel">
          <h3>Resumen</h3>
          {items.map((i) => <div className="row between" key={i.id}><span>{i.cantidad} × {i.nombre}</span><span>{bs(i.precio * i.cantidad)}</span></div>)}
          <hr /><div className="row between"><strong>Total</strong><strong>{bs(total)}</strong></div>
          {error && <p className="alert">{error}</p>}
          <button disabled={sending}>{sending ? 'Procesando…' : 'Confirmar pedido'}</button>
        </div>
      </div>
    </form>
  );
}

function Resultado({ pedido, email }) {
  return (
    <div className="panel center-text">
      <h1>¡Pedido registrado! 🎉</h1>
      <p>Código: <strong>{pedido.codigo}</strong> — Total {bs(pedido.total)}</p>
      {pedido.qr && (<><p>Escanea el QR para pagar:</p><img className="qr" src={pedido.qr} alt="QR de pago" /><p className="muted">Pago simulado: el administrador confirmará el pago.</p></>)}
      {pedido.datos_transferencia && (
        <div className="panel left"><p>Transfiere a:</p>
          <ul><li>Banco: {pedido.datos_transferencia.banco}</li><li>Cuenta: {pedido.datos_transferencia.cuenta}</li>
            <li>Titular: {pedido.datos_transferencia.titular}</li><li>Referencia: <b>{pedido.datos_transferencia.referencia}</b></li></ul></div>
      )}
      {pedido.metodo_pago === 'contra_entrega' && <p>Pagarás al recibir tu pedido.</p>}
      <p>
        <a className="btn" target="_blank" rel="noreferrer" href={`${apiBase}/pedidos/comprobante/${pedido.codigo}?email=${encodeURIComponent(email)}`}>Descargar comprobante (PDF)</a>{' '}
        <Link className="btn ghost" to={`/seguimiento/${pedido.codigo}?email=${encodeURIComponent(email)}`}>Seguir pedido</Link>
      </p>
    </div>
  );
}
