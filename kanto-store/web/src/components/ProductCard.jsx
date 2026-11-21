import { Link } from 'react-router-dom';
import { useAuth, useCart } from '../context.jsx';
import { bs, etiqueta, PLACEHOLDER, stockTexto, stockClase } from '../api.js';

export const Img = ({ src, alt }) => <img src={src || PLACEHOLDER} alt={alt} loading="lazy" decoding="async" onError={e => { if (e.currentTarget.src !== PLACEHOLDER) e.currentTarget.src = PLACEHOLDER; }} />;

export default function ProductCard({ p }) {
  const { user, wishlist, toggleWish } = useAuth();
  const { add, openCart } = useCart();
  const deseado = wishlist.includes(p.id);
  return <article className="ks-product-card">
    <div className="ks-product-art"><span className="ks-product-top-tag">{p.rareza ? etiqueta(p.rareza) : p.tipo === 'sellado' ? 'SELLADO' : 'TCG'}</span><Link to={`/producto/${p.id}`} aria-label={`Ver ${p.nombre}`}><Img src={p.imagen_url} alt={p.nombre} /></Link><span className={`ks-stock-tag ${stockClase(p)}`}>{stockTexto(p)}</span></div>
    <div className="ks-product-info"><span className="ks-product-type">{p.tipo !== 'sellado' ? 'CARTA POKÉMON TCG' : p.nombre.startsWith('Elite Trainer Box') ? 'ELITE TRAINER BOX' : p.nombre.startsWith('Booster Box') ? 'BOOSTER BOX' : p.subtipo_sellado === 'sobre' ? 'SOBRE TCG' : 'PRODUCTO SELLADO'}</span><Link to={`/producto/${p.id}`} className="ks-product-name">{p.nombre}</Link><span className="ks-product-expansion">{p.expansion || 'Colección Pokémon'}{p.numero_coleccion ? ` · ${p.numero_coleccion}` : ''}</span>
      <div className="ks-product-bottom"><strong className="ks-product-price">{Number(p.precio) > 0 ? <><small>Bs</small> {Number(p.precio).toFixed(2)}</> : <span className="ks-price-pending">Precio pendiente</span>}</strong><div className="ks-product-buttons"><button type="button" disabled={p.stock < 1 || Number(p.precio) <= 0} onClick={() => { add(p); openCart(); }} aria-label={`Agregar ${p.nombre} al carrito`}>+ <span>AGREGAR</span></button>{user && <button type="button" className={`ks-wish ${deseado ? 'is-on' : ''}`} onClick={() => toggleWish(p.id)} aria-label={deseado ? 'Quitar de deseos' : 'Añadir a deseos'}>{deseado ? '♥' : '♡'}</button>}</div></div>
    </div>
  </article>;
}
