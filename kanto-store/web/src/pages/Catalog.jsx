import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, etiqueta } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';
import HeroCarousel from '../components/HeroCarousel.jsx';

const VACIO = { q: '', tipo: '', subtipo: '', expansion: '', rareza: '', idioma: '', estado: '', orden: '' };
const categoriaItems = [
  { n: '01', title: 'CARTAS', sub: 'SINGLES', note: 'Tu Pokémon favorito te espera', tipo: 'single', subtipo: '', art: 'card', icon: '🃏' },
  { n: '02', title: 'SOBRES', sub: 'BOOSTER PACKS', note: 'Cada sobre, una sorpresa', tipo: 'sellado', subtipo: 'sobre', art: 'pack', icon: '✨' },
  { n: '03', title: 'CAJAS', sub: 'BOOSTER BOX / ETB', note: 'Amplía tu colección', tipo: 'sellado', subtipo: 'caja', art: 'box', icon: '📦' },
  { n: '04', title: 'MAZOS', sub: 'DECKS', note: 'Prepara tu próxima partida', tipo: 'sellado', subtipo: 'mazo', art: 'deck', icon: '⚡' },
];

function FilterSelect({ label, value, options, onChange }) {
  return <label className="ks-filter-field"><span>{label}</span><select value={value} onChange={onChange}><option value="">Todos</option>{options.map(({ v, t }) => <option key={v} value={v}>{t}</option>)}</select></label>;
}

export default function Catalog() {
  const location = useLocation();
  const [f, setF] = useState(VACIO);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, paginas: 1 });
  const [exps, setExps] = useState([]);
  const [meta, setMeta] = useState({ rarezas: [], idiomas: [], estados: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [promos, setPromos] = useState([]);

  useEffect(() => {
    api('/expansiones').then(setExps).catch(() => {});
    api('/meta').then(setMeta).catch(() => {});
    api('/config/promociones').then(setPromos).catch(() => {});
  }, []);
  // Los enlaces del megamenú llevan el filtro en la URL, sin perder el catálogo React.
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    setF(prev => ({ ...prev, tipo: q.get('tipo') || '', subtipo: q.get('subtipo') || '' }));
    setPage(1);
    if (location.hash) requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }));
  }, [location.search, location.hash]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      const qs = new URLSearchParams({ ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)), page });
      api(`/productos?${qs}`).then(d => { setData(d); setError(''); }).catch(e => setError(e.message)).finally(() => setLoading(false));
    }, 230);
    return () => clearTimeout(timer);
  }, [f, page]);

  const set = key => e => { setF(prev => ({ ...prev, [key]: e.target.value, ...(key === 'tipo' ? { subtipo: '' } : {}) })); setPage(1); };
  function selectCategory(tipo, subtipo = '') {
    setF(prev => ({ ...prev, tipo, subtipo })); setPage(1);
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
  }

  return <>
    <HeroCarousel />

    <section className="ks-trust" aria-label="Ventajas de comprar en Kanto Store"><div className="ks-wide ks-trust-grid">
      <div><span className="ks-trust-icon">✦</span><div><strong>COLECCIÓN SIN LÍMITES</strong><small>Descubre nuevos tesoros TCG</small></div></div>
      <div><span className="ks-trust-icon">🛡</span><div><strong>STOCK ACTUALIZADO</strong><small>Consulta disponibilidad antes de comprar</small></div></div>
      <div><span className="ks-trust-icon">📦</span><div><strong>EMPAQUE CUIDADOSO</strong><small>Seguimiento hasta la entrega</small></div></div>
      <div><span className="ks-trust-icon">💬</span><div><strong>ATENCIÓN CERCANA</strong><small>Resolvemos tus dudas por WhatsApp</small></div></div>
    </div></section>

    <section className="ks-section ks-wide" id="categorias">
      <div className="ks-section-heading"><div><span className="ks-section-label">✦ DESCUBRE TU MUNDO</span><h2>EXPLORA <em>POR CATEGORÍA</em></h2><p>Todo lo que necesitas para seguir coleccionando.</p></div><a className="ks-text-link" href="#catalogo">VER TODO EL CATÁLOGO ↗</a></div>
      <div className="ks-categories">{categoriaItems.map(c => <button type="button" className={`ks-category ks-category-${c.art}`} key={c.n} onClick={() => selectCategory(c.tipo, c.subtipo)}>
        <span className="ks-category-number">{c.n} / CATEGORÍA</span>
        <div className="ks-category-art" aria-hidden="true">{c.art === 'card' ? <img src="/assets/carrusel/carta-1.png" alt="" /> : c.art === 'pack' ? <span className="ks-faux-pack"><small>⚡ KANTO</small><b>TCG</b><em>BOOSTER</em></span> : c.art === 'box' ? <span className="ks-faux-box"><small>COLLECTOR</small><b>TCG</b><em>BOOSTER BOX</em></span> : <span className="ks-faux-deck"><b>★</b><em>TRAINER DECK</em></span>}</div>
        <span className="ks-category-sub">{c.sub}</span><strong>{c.title}</strong><span className="ks-category-note">{c.note} <b>↗</b></span>
      </button>)}</div>
    </section>

    {promos.length > 0 && <section className="ks-wide ks-section ks-promos" aria-label="Promociones de la tienda">
      <div className="ks-section-heading"><div><span className="ks-section-label">✦ ELEGIDO PARA TI</span><h2>PROMOCIONES <em>Y NOVEDADES</em></h2><p>Publicadas directamente por Kanto Store.</p></div></div>
      <div className="ks-promo-grid">{promos.map(p => <a className="ks-promo-card" key={p.id} href={p.enlace || '/'}>{p.imagen ? <img src={p.imagen} alt="" loading="lazy" /> : <span className="ks-promo-placeholder">✦</span>}<div><small>EN KANTO STORE</small><strong>{p.titulo}</strong><p>{p.descripcion}</p><b>DESCUBRIR ↗</b></div></a>)}</div>
    </section>}

    <section className="ks-wide ks-catalog ks-section" id="catalogo">
      <div className="ks-section-heading"><div><span className="ks-section-label">✦ ENCUENTRA TU FAVORITA</span><h2>ELIGE TU <em>PRÓXIMA CARTA</em></h2><p>Busca por nombre, expansión, rareza y estado.</p></div><span className="ks-results-counter">{loading ? 'Buscando…' : `${data.total} productos encontrados`}</span></div>
      <div className="ks-catalog-toolbar"><label className="ks-search-box"><span aria-hidden="true">⌕</span><input aria-label="Buscar carta o SKU" placeholder="Busca un Pokémon, carta o SKU…" value={f.q} onChange={set('q')} /></label><button type="button" className="ks-filters-toggle" onClick={() => setFiltersOpen(v => !v)} aria-expanded={filtersOpen}>☷ Filtrar productos <span>{filtersOpen ? '−' : '+'}</span></button><label className="ks-sort"><span>ORDENAR</span><select aria-label="Ordenar productos" value={f.orden} onChange={set('orden')}><option value="">Destacados</option><option value="precio_asc">Precio: menor a mayor</option><option value="precio_desc">Precio: mayor a menor</option><option value="nombre">Nombre</option></select></label></div>
      <div className="ks-pills" role="group" aria-label="Filtrar por categoría"><button type="button" className={!f.tipo ? 'selected' : ''} onClick={() => selectCategory('', '')}>Todos</button><button type="button" className={f.tipo === 'single' ? 'selected' : ''} onClick={() => selectCategory('single')}>Cartas sueltas</button><button type="button" className={f.subtipo === 'sobre' ? 'selected' : ''} onClick={() => selectCategory('sellado','sobre')}>Sobres</button><button type="button" className={f.subtipo === 'caja' ? 'selected' : ''} onClick={() => selectCategory('sellado','caja')}>Cajas</button><button type="button" className={f.subtipo === 'mazo' ? 'selected' : ''} onClick={() => selectCategory('sellado','mazo')}>Mazos</button></div>
      {filtersOpen && <div className="ks-filters">
        <FilterSelect label="TIPO" value={f.tipo} onChange={set('tipo')} options={[{v:'single',t:'Cartas sueltas'},{v:'sellado',t:'Producto sellado'}]} />
        {f.tipo === 'sellado' && <FilterSelect label="SELLADO" value={f.subtipo} onChange={set('subtipo')} options={[{v:'sobre',t:'Sobres'},{v:'caja',t:'Cajas'},{v:'mazo',t:'Mazos'}]} />}
        <FilterSelect label="EXPANSIÓN" value={f.expansion} onChange={set('expansion')} options={exps.map(x => ({v:x.id,t:x.nombre}))} />
        <FilterSelect label="RAREZA" value={f.rareza} onChange={set('rareza')} options={meta.rarezas.map(v => ({v,t:etiqueta(v)}))} />
        <FilterSelect label="IDIOMA" value={f.idioma} onChange={set('idioma')} options={meta.idiomas.map(v => ({v,t:etiqueta(v)}))} />
        <FilterSelect label="ESTADO" value={f.estado} onChange={set('estado')} options={meta.estados.map(v => ({v,t:etiqueta(v)}))} />
        <button type="button" className="ks-clear-filters" onClick={() => { setF(VACIO); setPage(1); }}>Limpiar filtros ↺</button>
      </div>}
      {error && <p className="alert" role="alert">No se pudo cargar el catálogo: {error}</p>}
      {loading ? <p className="ks-loading">✦ Buscando cartas para tu colección…</p> : data.items.length ? <div className="ks-products-grid">{data.items.map(p => <ProductCard key={p.id} p={p} />)}</div> : <div className="ks-empty"><span>🔍</span><h3>No encontramos cartas con esos filtros.</h3><p>Prueba otra búsqueda o explora todas nuestras categorías.</p><button onClick={() => { setF(VACIO); setPage(1); }}>VER TODOS LOS PRODUCTOS</button></div>}
      {data.paginas > 1 && <div className="ks-pagination"><button disabled={page <= 1} onClick={() => { setPage(x => x - 1); document.getElementById('catalogo')?.scrollIntoView({behavior:'smooth'}); }}>← ANTERIOR</button><span>Página {page} / {data.paginas}</span><button disabled={page >= data.paginas} onClick={() => { setPage(x => x + 1); document.getElementById('catalogo')?.scrollIntoView({behavior:'smooth'}); }}>SIGUIENTE →</button></div>}
    </section>

    <section className="ks-feature"><div className="ks-wide ks-feature-inner"><div><span>✦ TU AVENTURA SIGUE</span><h2>HAZ CRECER TU <em>COLECCIÓN.</em></h2><p>Descubre cartas y productos para tu próxima aventura TCG.</p></div><a className="ks-btn ks-btn-primary" href="#catalogo">ENCUENTRA TU CARTA ↗</a></div></section>
    <section className="ks-section ks-wide ks-guide" id="como-comprar"><div className="ks-section-heading"><div><span className="ks-section-label">✦ COMPRA CON CONFIANZA</span><h2>ASÍ DE FÁCIL <em>ES COMPRAR</em></h2><p>Desde tu carta favorita hasta recibir tu pedido.</p></div></div><div className="ks-guide-steps">
      {[
        ['01','🛒','ELIGE','Explora el catálogo, revisa el estado de cada carta y agrégala a tu carrito.'],
        ['02','💳','PAGA','Selecciona QR, depósito o las opciones de pago que estén habilitadas.'],
        ['03','📦','PREPARAMOS','Una vez confirmado el pago, el equipo verifica y prepara tu pedido.'],
        ['04','🚚','RECIBE','Sigue el proceso y confirma la entrega con tu PIN de seguridad.'],
      ].map(([n,icon,title,text]) => <div key={n} className="ks-guide-step"><span className="ks-guide-n">{n}</span><span className="ks-guide-icon">{icon}</span><h3>{title}</h3><p>{text}</p></div>)}
    </div></section>
  </>;
}
