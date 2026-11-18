import { Link } from 'react-router-dom';
import { useAuth, useCart } from '../context.jsx';
import { bs, etiqueta, PLACEHOLDER, stockTexto, stockClase } from '../api.js';

export const Img = ({ src, alt }) => <img src={src || PLACEHOLDER} alt={alt} loading="lazy" onError={e => { if (e.currentTarget.src !== PLACEHOLDER) e.currentTarget.src = PLACEHOLDER; }} />;

export default function ProductCard({ p }) {
  const { user, wishlist, toggleWish } = useAuth();
  const { add } = useCart();
  const deseado = wishlist.includes(p.id);
  return <article className="ks-product-card">
    <div className="ks-product-art"><span className="ks-product-top-tag">{p.rareza ? etiqueta(p.rareza) : p.tipo === 'sellado' ? 'SELLADO' : 'TCG'}</span><Link to={`/producto/${p.id}`} aria-label={`Ver ${p.nombre}`}><Img src={p.imagen_url} alt={p.nombre} /></Link><span className={`ks-stock-tag ${stockClase(p)}`}>{stockTexto(p)}</span></div>
    <div className="ks-product-info"><span className="ks-product-type">{p.tipo === 'sellado' ? 'PRODUCTO SELLADO' : 'CARTA POKÉMON TCG'}</span><Link to={`/producto/${p.id}`} className="ks-product-name">{p.nombre}</Link><span className="ks-product-expansion">{p.expansion || 'Colección Pokémon'}{p.numero_coleccion ? ` · ${p.numero_coleccion}` : ''}</span>
      <div className="ks-product-bottom"><strong className="ks-product-price"><small>Bs</small> {Number(p.precio).toFixed(2)}</strong><div className="ks-product-buttons"><button type="button" disabled={p.stock < 1} onClick={() => add(p)} aria-label={`Agregar ${p.nombre} al carrito`}>+ <span>AGREGAR</span></button>{user && <button type="button" className={`ks-wish ${deseado ? 'is-on' : ''}`} onClick={() => toggleWish(p.id)} aria-label={deseado ? 'Quitar de deseos' : 'Añadir a deseos'}>{deseado ? '♥' : '♡'}</button>}</div></div>
    </div>
  </article>;
}
