import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useApp } from '../AppContext';
import { money } from '../components/ProductCard';

const METHODS = [
  ['qr', 'Pago por QR'],
  ['transferencia', 'Transferencia bancaria'],
  ['contra_entrega', 'Contra entrega'],
];

export default function Checkout() {
  const { cart, cartTotal, clearCart, user } = useApp();
  const nav = useNavigate();
  const [f, setF] = useState({ guest_name: '', guest_email: '', guest_phone: '', delivery_address: '', payment_method: 'qr' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  if (!cart.length) return <div className="empty"><h2>No hay productos para pagar</h2><Link to="/" className="btn">Ir al catálogo</Link></div>;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const order = await api.checkout({
        items: cart.map(i => ({ product_id: i.id, quantity: i.quantity })),
        payment_method: f.payment_method,
        delivery_address: f.delivery_address,
        ...(user ? {} : { guest_name: f.guest_name, guest_email: f.guest_email, guest_phone: f.guest_phone }),
      });
      clearCart();
      nav(`/pedido/${order.id}`, { state: { order, email: user ? undefined : f.guest_email } });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <>
      <h1>Finalizar compra</h1>
      <div className="two-col">
        <form className="card-box" onSubmit={submit}>
          {user
            ? <p className="muted">Comprando como <b>{user.name}</b></p>
            : <>
                <p className="muted">Compra como invitado (o <Link to="/login">inicia sesión</Link>)</p>
                <label>Nombre<input required value={f.guest_name} onChange={set('guest_name')} /></label>
                <label>Correo<input type="email" required value={f.guest_email} onChange={set('guest_email')} /></label>
                <label>Teléfono<input value={f.guest_phone} onChange={set('guest_phone')} /></label>
              </>}
          <label>Dirección de entrega<textarea required rows="2" value={f.delivery_address} onChange={set('delivery_address')} /></label>
          <fieldset>
            <legend>Método de pago</legend>
            {METHODS.map(([v, l]) => (
              <label key={v} className="radio"><input type="radio" name="pm" checked={f.payment_method === v} onChange={() => setF({ ...f, payment_method: v })} /> {l}</label>
            ))}
          </fieldset>
          {error && <p className="error">{error}</p>}
          <button className="btn" disabled={busy}>{busy ? 'Procesando…' : `Confirmar pedido · ${money(cartTotal)}`}</button>
        </form>
        <aside className="card-box">
          <h3>Resumen</h3>
          {cart.map(i => <div className="sum-row" key={i.id}><span>{i.quantity}× {i.name}</span><span>{money(i.price * i.quantity)}</span></div>)}
          <div className="sum-row total"><span>Total</span><span>{money(cartTotal)}</span></div>
        </aside>
      </div>
    </>
  );
}
