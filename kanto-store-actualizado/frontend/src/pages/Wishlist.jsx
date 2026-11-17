import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useApp } from '../AppContext';
import ProductCard, { money } from '../components/ProductCard';

// RF03 / RF04 - Lista de deseos con avisos de disponibilidad
export default function Wishlist() {
  const { wishIds } = useApp();
  const [items, setItems] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    api.wishlist().then(setItems).catch(() => setItems([]));
    api.wishAlerts().then(setAlerts).catch(() => {});
  }, [wishIds]);

  if (!items) return <p className="muted">Cargando…</p>;
  return (
    <>
      <h1>Mi lista de deseos</h1>
      {alerts.length > 0 && (
        <div className="alert">
          <b>🔔 ¡Disponibles ahora!</b>
          <ul>{alerts.map(a => <li key={a.id}><Link to={`/producto/${a.id}`}>{a.name}</Link> — {money(a.price)} ({a.stock} en stock)</li>)}</ul>
        </div>
      )}
      {items.length === 0
        ? <div className="empty"><h2>Tu lista está vacía</h2><Link to="/" className="btn">Explorar cartas</Link></div>
        : <section className="grid">{items.map(p => <ProductCard key={p.id} p={p} />)}</section>}
    </>
  );
}
