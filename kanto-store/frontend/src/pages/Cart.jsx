import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { money } from '../components/ProductCard';

export default function Cart() {
  const { cart, setQty, removeFromCart, cartTotal } = useApp();
  const nav = useNavigate();
  if (!cart.length) return (
    <div className="empty"><h2>Tu carrito está vacío</h2><Link to="/" className="btn">Ir al catálogo</Link></div>
  );
  return (
    <>
      <h1>Carrito</h1>
      <div className="cart">
        {cart.map(i => (
          <div className="cart-row" key={i.id}>
            <div className="grow"><Link to={`/producto/${i.id}`}><b>{i.name}</b></Link><div className="muted small">{money(i.price)} c/u</div></div>
            <input type="number" className="qty" min="1" max={i.stock} value={i.quantity} onChange={e => setQty(i.id, Number(e.target.value) || 1)} />
            <div className="line-total">{money(i.price * i.quantity)}</div>
            <button className="btn-ghost" onClick={() => removeFromCart(i.id)}>✕</button>
          </div>
        ))}
        <div className="cart-total"><span>Total</span><strong>{money(cartTotal)}</strong></div>
        <div className="row end"><button className="btn" onClick={() => nav('/checkout')}>Continuar al pago</button></div>
      </div>
    </>
  );
}
