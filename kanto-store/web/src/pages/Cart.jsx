import { Link } from 'react-router-dom';
import { useCart } from '../context.jsx';
import { bs } from '../api.js';
import { Img } from '../components/ProductCard.jsx';

export default function Cart() {
  const { items, setQty, remove, total } = useCart();
  if (!items.length) return <div className="empty"><h2>Tu carrito está vacío</h2><Link to="/">Ver catálogo</Link></div>;
  return (
    <>
      <h1>Carrito</h1>
      <div className="list">
        {items.map((i) => (
          <div className="line" key={i.id}>
            <div className="thumb"><Img src={i.imagen_url} alt={i.nombre} /></div>
            <div className="grow"><strong>{i.nombre}</strong><div className="muted">{bs(i.precio)} c/u</div></div>
            <div className="row gap">
              <button className="ghost sm" onClick={() => setQty(i.id, i.cantidad - 1)}>−</button>
              <span>{i.cantidad}</span>
              <button className="ghost sm" onClick={() => setQty(i.id, i.cantidad + 1)} disabled={i.cantidad >= i.stock}>+</button>
            </div>
            <strong>{bs(i.precio * i.cantidad)}</strong>
            <button className="ghost sm" onClick={() => remove(i.id)} aria-label="Quitar">✕</button>
          </div>
        ))}
      </div>
      <div className="row between total-bar"><h2>Total: {bs(total)}</h2><Link className="btn" to="/checkout">Ir a pagar</Link></div>
    </>
  );
}
