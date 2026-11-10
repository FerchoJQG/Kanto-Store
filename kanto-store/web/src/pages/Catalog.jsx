import { useEffect, useState } from 'react';
import { api, etiqueta } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';

const VACIO = { q: '', tipo: '', subtipo: '', expansion: '', rareza: '', idioma: '', estado: '', orden: '' };

export default function Catalog() {
  const [f, setF] = useState(VACIO);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, paginas: 1 });
  const [exps, setExps] = useState([]);
  const [meta, setMeta] = useState({ rarezas: [], idiomas: [], estados: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verFiltros, setVerFiltros] = useState(false);

  useEffect(() => {
    api('/expansiones').then(setExps).catch(() => {});
    api('/meta').then(setMeta).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const qs = new URLSearchParams({ ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)), page });
      setLoading(true);
      api(`/productos?${qs}`).then((d) => { setData(d); setError(''); }).catch((e) => setError(e.message)).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [f, page]);

  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(1); };
  const Sel = ({ k, label, opts }) => (
    <label>{label}
      <select value={f[k]} onChange={set(k)}>
        <option value="">Todos</option>
        {opts.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
      </select>
    </label>
  );

  return (
    <>
      <section className="hero">
        <h1>Encuentra la carta que te falta</h1>
        <p>Singles y productos sellados de Pokémon TCG, con el estado de conservación claro de cada carta.</p>
        <input className="search" placeholder="Buscar carta o SKU… (ej. Charizard)" value={f.q} onChange={set('q')} />
      </section>

      <button className="ghost only-mobile" onClick={() => setVerFiltros(!verFiltros)}>Filtros {verFiltros ? '▲' : '▼'}</button>
      <section className={`filters ${verFiltros ? 'open' : ''}`}>
        <Sel k="tipo" label="Tipo" opts={[{ v: 'single', t: 'Cartas (singles)' }, { v: 'sellado', t: 'Sellados' }]} />
        {f.tipo === 'sellado' && <Sel k="subtipo" label="Sellado" opts={[{ v: 'sobre', t: 'Sobres' }, { v: 'caja', t: 'Cajas' }, { v: 'mazo', t: 'Mazos' }]} />}
        <Sel k="expansion" label="Expansión" opts={exps.map((e) => ({ v: e.id, t: e.nombre }))} />
        <Sel k="rareza" label="Rareza" opts={meta.rarezas.map((v) => ({ v, t: etiqueta(v) }))} />
        <Sel k="idioma" label="Idioma" opts={meta.idiomas.map((v) => ({ v, t: etiqueta(v) }))} />
        <Sel k="estado" label="Estado" opts={meta.estados.map((v) => ({ v, t: etiqueta(v) }))} />
        <Sel k="orden" label="Ordenar" opts={[{ v: 'precio_asc', t: 'Precio ↑' }, { v: 'precio_desc', t: 'Precio ↓' }, { v: 'nombre', t: 'Nombre' }]} />
        <button className="ghost" onClick={() => { setF(VACIO); setPage(1); }}>Limpiar</button>
      </section>

      {error && <p className="alert">{error}</p>}
      <p className="muted">{loading ? 'Cargando…' : `${data.total} resultado(s)`}</p>
      <div className="grid">{data.items.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      {!loading && !data.items.length && <p className="empty">No encontramos productos con esos filtros.</p>}
      {data.paginas > 1 && (
        <div className="row gap center">
          <button className="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Anterior</button>
          <span>Página {page} de {data.paginas}</span>
          <button className="ghost" disabled={page >= data.paginas} onClick={() => setPage(page + 1)}>Siguiente →</button>
        </div>
      )}
    </>
  );
}
