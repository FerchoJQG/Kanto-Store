import { useEffect, useState } from 'react';
import { api } from '../api';
import ProductCard from '../components/ProductCard';

const RARITIES = ['Común', 'Poco común', 'Rara', 'Ultra rara', 'Secreta'];
const CONDS = ['Mint', 'Near Mint', 'Excellent', 'Played'];

export default function Catalog() {
  const [sets, setSets] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [f, setF] = useState({ type: '', q: '', set_id: '', rarity: '', language: '', cond: '', sort: '', in_stock: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => { api.sets().then(setSets).catch(() => {}); }, []);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      api.products(f).then(d => { setItems(d); setError(''); }).catch(e => setError(e.message)).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [f]);

  return (
    <>
      <section className="hero">
        <h1>Atrapa la carta que te falta</h1>
        <p>Singles y productos sellados de Pokémon TCG con estado de conservación claro, por expansión y rareza.</p>
        <div className="tabs">
          {[['', 'Todo'], ['single', 'Cartas'], ['sellado', 'Sellados']].map(([v, l]) => (
            <button key={v} className={f.type === v ? 'tab on' : 'tab'} onClick={() => setF({ ...f, type: v })}>{l}</button>
          ))}
        </div>
      </section>

      <section className="filters">
        <input placeholder="Buscar por nombre o SKU…" value={f.q} onChange={set('q')} />
        <select value={f.set_id} onChange={set('set_id')}>
          <option value="">Todas las expansiones</option>
          {sets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={f.rarity} onChange={set('rarity')}>
          <option value="">Toda rareza</option>
          {RARITIES.map(r => <option key={r}>{r}</option>)}
        </select>
        <select value={f.language} onChange={set('language')}>
          <option value="">Todo idioma</option>
          <option>Español</option><option>Inglés</option><option>Japonés</option>
        </select>
        <select value={f.cond} onChange={set('cond')}>
          <option value="">Todo estado</option>
          {CONDS.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={f.sort} onChange={set('sort')}>
          <option value="">Más recientes</option>
          <option value="price_asc">Precio: menor a mayor</option>
          <option value="price_desc">Precio: mayor a menor</option>
          <option value="name">Nombre A-Z</option>
        </select>
        <label className="check"><input type="checkbox" checked={f.in_stock === '1'} onChange={e => setF({ ...f, in_stock: e.target.checked ? '1' : '' })} /> Solo disponibles</label>
      </section>

      {error && <p className="error">{error}</p>}
      {loading ? <p className="muted">Cargando…</p> : items.length === 0 ? <p className="muted">No hay productos con esos filtros.</p> : (
        <section className="grid">{items.map(p => <ProductCard key={p.id} p={p} />)}</section>
      )}
    </>
  );
}
