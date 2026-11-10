import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, bs, etiqueta } from '../api.js';
import { useAuth, useCart } from '../context.jsx';
import { Img } from '../components/ProductCard.jsx';

export default function Product() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const { add } = useCart();
  const { user, wishlist, toggleWish } = useAuth();

  useEffect(() => { api(`/productos/${id}`).then(setP).catch((e) => setError(e.message)); }, [id]);
  if (error) return <p className="alert">{error}</p>;
  if (!p) return <p>Cargando…</p>;
  const deseado = wishlist.includes(p.id);
  const fila = (k, v) => v && <tr><th>{k}</th><td>{v}</td></tr>;
  return (
    <div className="detail">
      <div className="detail-img"><Img src={p.imagen_url} alt={p.nombre} /></div>
      <div>
        <h1>{p.nombre}</h1>
        <p className="price big">{bs(p.precio)}</p>
        <table className="spec"><tbody>
          {fila('Expansión', p.expansion)}
          {fila('N.º de colección', p.numero_coleccion)}
          {fila('Rareza', p.rareza && etiqueta(p.rareza))}
          {fila('Idioma', etiqueta(p.idioma))}
          {fila('Estado de conservación', <span className={`tag estado-${p.estado_conservacion}`}>{etiqueta(p.estado_conservacion)}</span>)}
          {fila('SKU', p.sku)}
          {fila('Stock', p.stock > 0 ? `${p.stock} disponible(s)` : 'Agotado')}
        </tbody></table>
        {p.descripcion && <p>{p.descripcion}</p>}
        <div className="row gap">
          {p.stock > 0 && <input type="number" min="1" max={p.stock} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(p.stock, +e.target.value || 1)))} style={{ width: 80 }} />}
          <button disabled={p.stock < 1} onClick={() => add(p, qty)}>Agregar al carrito</button>
          {user
            ? <button className={`ghost ${deseado ? 'on' : ''}`} onClick={() => toggleWish(p.id)}>{deseado ? '♥ En tu lista' : p.stock < 1 ? '♡ Avisarme cuando haya' : '♡ A mi lista de deseos'}</button>
            : p.stock < 1 && <span className="muted">Inicia sesión para recibir un aviso cuando esté disponible.</span>}
        </div>
      </div>
    </div>
  );
}
