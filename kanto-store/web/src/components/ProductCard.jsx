import { Link } from 'react-router-dom';
import { useAuth, useCart } from '../context.jsx';
import { bs, etiqueta, PLACEHOLDER } from '../api.js';

export const Img = ({ src, alt }) => (
  <img src={src || PLACEHOLDER} alt={alt} loading="lazy" onError={(e) => { e.currentTarget.src = PLACEHOLDER; }} />
);

export default function ProductCard({ p }) {
  const { user, wishlist, toggleWish } = useAuth();
  const { add } = useCart();
  const deseado = wishlist.includes(p.id);
  return (
    <article className="card">
      <Link to={`/producto/${p.id}`} className="card-img"><Img src={p.imagen_url} alt={p.nombre} /></Link>
      <div className="card-body">
        <Link to={`/producto/${p.id}`}><h3>{p.nombre}</h3></Link>
        <p className="muted">{p.expansion || '—'}{p.numero_coleccion ? ` · ${p.numero_coleccion}` : ''}</p>
        <div className="tags">
          {p.rareza && <span className="tag">{etiqueta(p.rareza)}</span>}
          <span className="tag">{etiqueta(p.idioma)}</span>
          <span className={`tag estado-${p.estado_conservacion}`}>{etiqueta(p.estado_conservacion)}</span>
        </div>
        <div className="row between">
          <strong className="price">{bs(p.precio)}</strong>
          <span className={p.stock > 0 ? 'ok' : 'bad'}>{p.stock > 0 ? `${p.stock} disp.` : 'Agotado'}</span>
        </div>
        <div className="row gap">
          <button disabled={p.stock < 1} onClick={() => add(p)}>Agregar</button>
          {user && (
            <button className={`ghost ${deseado ? 'on' : ''}`} title={p.stock < 1 ? 'Avísame cuando haya stock' : 'Lista de deseos'}
              onClick={() => toggleWish(p.id)}>{deseado ? '♥' : '♡'}</button>
          )}
        </div>
      </div>
    </article>
  );
}
