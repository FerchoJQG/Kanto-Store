import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useApp } from '../AppContext';
import { Img, RarityTag, money } from '../components/ProductCard';

const COND_HELP = {
  'Mint': 'Perfecta, sin marcas visibles.',
  'Near Mint': 'Casi perfecta, mínimos desgastes.',
  'Excellent': 'Leves marcas en bordes o superficie.',
  'Played': 'Desgaste evidente por uso.',
};

export default function ProductDetail() {
  const { id } = useParams();
  const { addToCart, wishIds, toggleWish } = useApp();
  const [p, setP] = useState(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => { api.product(id).then(setP).catch(e => setError(e.message)); }, [id]);
  if (error) return <p className="error">{error}</p>;
  if (!p) return <p className="muted">Cargando…</p>;

  const wished = wishIds.includes(p.id);
  return (
    <>
      <Link to="/" className="muted">← Volver al catálogo</Link>
      <section className="detail">
        <div className="detail-img"><Img p={p} /></div>
        <div className="detail-info">
          <h1>{p.name}</h1>
          <div className="tags">
            <RarityTag r={p.rarity} />
            {p.cond && <span className="tag">{p.cond}</span>}
            <span className="tag">{p.language}</span>
            {p.sealed_kind && <span className="tag r-rare">{p.sealed_kind}</span>}
          </div>
          <table className="specs">
            <tbody>
              <tr><th>Expansión</th><td>{p.set_name || '—'}</td></tr>
              {p.card_number && <tr><th>Nº de colección</th><td>{p.card_number}</td></tr>}
              <tr><th>SKU</th><td>{p.sku}</td></tr>
              {p.cond && <tr><th>Estado de conservación</th><td><b>{p.cond}</b> — {COND_HELP[p.cond]}</td></tr>}
              <tr><th>Disponibilidad</th><td>{p.stock > 0 ? `${p.stock} en stock` : 'Agotado'}</td></tr>
            </tbody>
          </table>
          <div className="price">{money(p.price)}</div>
          <div className="row">
            {p.stock > 0 && (
              <>
                <input type="number" min="1" max={p.stock} value={qty} className="qty"
                       onChange={e => setQty(Math.max(1, Math.min(p.stock, Number(e.target.value) || 1)))} />
                <button className="btn" onClick={() => addToCart(p, qty)}>Agregar al carrito</button>
              </>
            )}
            <button className="btn-outline" onClick={() => toggleWish(p.id)}>{wished ? '♥ En mi lista' : '♡ Añadir a deseos'}</button>
          </div>
          {p.stock === 0 && <p className="muted small">Agrégala a tu lista de deseos y revisa tus avisos cuando vuelva a haber stock.</p>}
          <p className="muted small">Imagen referencial. Pokémon es marca de Nintendo / Game Freak / The Pokémon Company.</p>
        </div>
      </section>
    </>
  );
}
