import { useEffect, useState } from 'react';
import { api } from '../api';
import { money } from '../components/ProductCard';

// Módulo de entregas del repartidor
export default function Delivery() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const load = () => api.myDeliveries().then(setOrders).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  const mark = async (id, status) => {
    try { await api.setStatus(id, status); load(); } catch (e) { setError(e.message); }
  };

  if (!orders) return <p className="muted">{error || 'Cargando…'}</p>;
  return (
    <>
      <h1>Mis entregas</h1>
      {error && <p className="error">{error}</p>}
      {!orders.length && <p className="muted">No tienes pedidos asignados.</p>}
      {orders.map(o => (
        <div className="card-box order" key={o.id}>
          <div className="row between"><b>Pedido #{o.id}</b><span className={`status s-${o.status}`}>{o.status.replace('_', ' ')}</span></div>
          <div className="small">📍 {o.delivery_address}</div>
          <div className="small muted">{o.user_name || o.guest_name} · {o.guest_phone || ''}</div>
          <div className="small">{o.payment_method === 'contra_entrega' ? <b>Cobrar {money(o.total)} al entregar</b> : `Pago: ${o.payment_status}`}</div>
          <div className="row">
            {o.status === 'preparando' && <button className="btn-sm" onClick={() => mark(o.id, 'en_transito')}>Salir a entregar</button>}
            {o.status === 'en_transito' && <button className="btn-sm" onClick={() => mark(o.id, 'entregado')}>Marcar entregado</button>}
          </div>
        </div>
      ))}
    </>
  );
}
