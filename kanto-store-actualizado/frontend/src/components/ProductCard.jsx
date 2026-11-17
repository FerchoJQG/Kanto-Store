import { Link } from 'react-router-dom';
import { useApp } from '../AppContext';

export const money = (n) => `Bs. ${Number(n).toFixed(2)}`;

function Img({ p }) {
  return (
    <div className="img-wrap">
      {p.image_url && (
        <img src={p.image_url} alt={p.name} loading="lazy"
             onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }} />
      )}
      <div className="placeholder" style={{ display: p.image_url ? 'none' : 'flex' }}>{p.type === 'sellado' ? '📦' : '🃏'}</div>
    </div>
  );
}
export { Img };

export function RarityTag({ r }) {
  if (!r) return null;
  const cls = { 'Común': 'r-common', 'Poco común': 'r-uncommon', 'Rara': 'r-rare', 'Ultra rara': 'r-ultra', 'Secreta': 'r-secret' }[r];
  return <span className={`tag ${cls}`}>{r}</span>;
}

export default function ProductCard({ p }) {
  const { addToCart, wishIds, toggleWish } = useApp();
  const wished = wishIds.includes(p.id);
  return (
    <article className="product">
      <button className={`heart ${wished ? 'on' : ''}`} title="Lista de deseos" onClick={() => toggleWish(p.id)}>{wished ? '♥' : '♡'}</button>
      <Link to={`/producto/${p.id}`}><Img p={p} /></Link>
      <div className="product-body">
        <Link to={`/producto/${p.id}`} className="product-name">{p.name}</Link>
        <div className="muted small">{p.set_name || '—'}{p.card_number ? ` · ${p.card_number}` : ''}</div>
        <div className="tags">
          <RarityTag r={p.rarity} />
          {p.cond && <span className="tag">{p.cond}</span>}
          <span className="tag">{p.language}</span>
          {p.type === 'sellado' && <span className="tag r-rare">{p.sealed_kind}</span>}
        </div>
        <div className="product-foot">
          <strong>{money(p.price)}</strong>
          {p.stock > 0
            ? <button className="btn-sm" onClick={() => addToCart(p)}>Agregar</button>
            : <span className="out">Agotado</span>}
        </div>
      </div>
    </article>
  );
}
