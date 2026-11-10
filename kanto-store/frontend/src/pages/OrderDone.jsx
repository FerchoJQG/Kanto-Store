import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../api';
import { money } from '../components/ProductCard';

const PM = { qr: 'Pago por QR', transferencia: 'Transferencia bancaria', contra_entrega: 'Contra entrega' };

// RF10 - Comprobante de compra
export default function OrderDone() {
  const { id } = useParams();
  const { state } = useLocation();
  const [order, setOrder] = useState(state?.order || null);
  const [error, setError] = useState('');
  const email = state?.email;

  useEffect(() => {
    if (!order) api.order(id, email).then(setOrder).catch(e => setError(e.message));
  }, [id]); // eslint-disable-line

  const pay = async () => {
    try { await api.confirmPayment(id, email); setOrder({ ...order, payment_status: 'pagado' }); }
    catch (e) { setError(e.message); }
  };

  if (error) return <p className="error">{error}</p>;
  if (!order) return <p className="muted">Cargando…</p>;

  return (
    <div className="receipt card-box">
      <h1>¡Pedido #{order.id} registrado!</h1>
      <p className="muted">Comprobante de compra · {new Date(order.created_at).toLocaleString()}</p>
      <table className="specs">
        <tbody>
          <tr><th>Cliente</th><td>{order.user_name || order.guest_name}</td></tr>
          <tr><th>Entrega</th><td>{order.delivery_address}</td></tr>
          <tr><th>Pago</th><td>{PM[order.payment_method]} — <b>{order.payment_status}</b></td></tr>
          <tr><th>Estado</th><td>{order.status}</td></tr>
        </tbody>
      </table>
      {order.items.map(i => (
        <div className="sum-row" key={i.id}><span>{i.quantity}× {i.name} <small className="muted">({i.sku})</small></span><span>{money(i.unit_price * i.quantity)}</span></div>
      ))}
      <div className="sum-row total"><span>Total</span><span>{money(order.total)}</span></div>

      {order.payment_status === 'pendiente' && order.payment_method === 'qr' && (
        <div className="qr-box">
          {order.qr && <img src={order.qr} alt="QR de pago" width="200" height="200" />}
          <p className="muted small">Escanea el QR para pagar. En esta versión del prototipo la confirmación del pago es simulada.</p>
          <button className="btn" onClick={pay}>Simular pago realizado</button>
        </div>
      )}
      {order.payment_status === 'pendiente' && order.payment_method === 'transferencia' && (
        <div className="qr-box">
          <p>Realiza la transferencia por <b>{money(order.total)}</b> indicando el pedido #{order.id}. (Cuenta de ejemplo del prototipo.)</p>
          <button className="btn" onClick={pay}>Simular transferencia realizada</button>
        </div>
      )}
      {order.payment_method === 'contra_entrega' && <p className="muted">Pagarás en efectivo cuando recibas tu pedido.</p>}

      <div className="row">
        <button className="btn-outline" onClick={() => window.print()}>Imprimir comprobante</button>
        <Link to="/" className="btn">Seguir comprando</Link>
      </div>
    </div>
  );
}
