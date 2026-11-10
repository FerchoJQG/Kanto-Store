import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { money } from '../components/ProductCard';

// RF11 - Historial de pedidos
export default function Orders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.myOrders().then(setOrders).catch(e => setError(e.message)); }, []);
  if (error) return <p className="error">{error}</p>;
  if (!orders) return <p className="muted">Cargando…</p>;
  if (!orders.length) return <div className="empty"><h2>Aún no tienes pedidos</h2><Link to="/" className="btn">Ir al catálogo</Link></div>;
  return (
    <>
      <h1>Mis pedidos</h1>
      {orders.map(o => (
        <div className="card-box order" key={o.id}>
          <div className="row between">
            <b>Pedido #{o.id}</b>
            <span className={`status s-${o.status}`}>{o.status.replace('_', ' ')}</span>
          </div>
          <div className="muted small">{new Date(o.created_at).toLocaleString()} · pago {o.payment_status}</div>
          {o.items.map(i => <div className="sum-row" key={i.id}><span>{i.quantity}× {i.name}</span><span>{money(i.unit_price * i.quantity)}</span></div>)}
          <div className="sum-row total"><span>Total</span><span>{money(o.total)}</span></div>
          <Link to={`/pedido/${o.id}`}>Ver comprobante</Link>
        </div>
      ))}
    </>
  );
}
