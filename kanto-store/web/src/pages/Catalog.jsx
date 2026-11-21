import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, etiqueta } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';
import HeroCarousel from '../components/HeroCarousel.jsx';
import PaymentShippingCarousel from '../components/PaymentShippingCarousel.jsx';
import StoreIcon from '../components/StoreIcon.jsx';

const VACIO = { q: '', tipo: '', subtipo: '', categoria: '', expansion: '', rareza: '', idioma: '', estado: '', orden: '' };
// Último catálogo consultado: evita una página en blanco al recargar mientras Render despierta.
// No se guarda ningún token ni dato personal. Se revalida siempre en segundo plano.
const CATALOG_CACHE = 'kanto_catalog_v3';
const CACHE_AGE = 1000 * 60 * 10;
const EMPTY_LIST = { items: [], total: 0, paginas: 1 };
function readCatalogCache(key) {
  try {
    const c = JSON.parse(sessionStorage.getItem(CATALOG_CACHE) || 'null');
    return c?.key === key && Date.now() - c.at < CACHE_AGE && Array.isArray(c.data?.items) ? c.data : null;
  } catch { return null; }
}
function saveCatalogCache(key, data) {
  try { sessionStorage.setItem(CATALOG_CACHE, JSON.stringify({ key, data, at: Date.now() })); } catch { /* Almacenamiento opcional */ }
}
function readReferenceCache(key) {
  try {
    const c = JSON.parse(sessionStorage.getItem(key) || 'null');
    return c && Date.now() - c.at < CACHE_AGE ? c.data : null;
  } catch { return null; }
}
function saveReferenceCache(key, data) {
  try { sessionStorage.setItem(key, JSON.stringify({data,at:Date.now()})); } catch { /* opcional */ }
}

const categoriaItems = [
  { n: '01', title: 'CARTAS', sub: 'CARTAS SUELTAS', note: 'Cartas en español de distintas expansiones', tipo: 'single', subtipo: '', categoria: '', art: 'card', icono: 'cartas', imagen: '/assets/categories/carta-darkrai-ex.png' },
  { n: '02', title: 'SOBRES', sub: 'BOOSTER PACKS', note: 'Sobres para descubrir nuevas cartas', tipo: 'sellado', subtipo: 'sobre', categoria: '', art: 'pack', icono: 'sobres', imagen: '/assets/categories/sobre-dominio-delta.webp' },
  { n: '03', title: 'BOOSTER BOXES', sub: 'CAJAS DE SOBRES', note: 'Cajas completas de tus expansiones', tipo: 'sellado', subtipo: 'caja', categoria: 'booster', art: 'box', icono: 'coleccion', imagen: '/assets/categories/booster-oscuridad-absoluta.webp' },
  { n: '04', title: 'ELITE TRAINER BOX', sub: 'ETB', note: 'Colecciones para entrenadores', tipo: 'sellado', subtipo: 'caja', categoria: 'etb', art: 'deck', icono: 'etb', imagen: '/assets/categories/etb-dominio-delta.webp' },
];
const colecciones = [
  { nombre: 'Dominio Delta', logo: '/assets/collection-logos/me06-logo.png' },
  { nombre: 'Oscuridad Absoluta', logo: '/assets/collection-logos/oa-logo.png' },
  { nombre: 'Llamas Obsidianas', logo: '/assets/collection-logos/obf-logo.png' },
  { nombre: 'Escarlata y Púrpura', logo: '/assets/collection-logos/sv01-logo.png' },
];

function FilterSelect({ label, value, options, onChange }) {
  return <label className="ks-filter-field"><span>{label}</span><select value={value} onChange={onChange}><option value="">Todos</option>{options.map(({ v, t }) => <option key={v} value={v}>{t}</option>)}</select></label>;
}

export default function Catalog() {
  const location = useLocation();
  const [f, setF] = useState(VACIO);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(() => readCatalogCache('page=1') || EMPTY_LIST);
  const [exps, setExps] = useState([]);
  const [meta, setMeta] = useState({ rarezas: [], idiomas: [], estados: [] });
  const [loading, setLoading] = useState(() => !readCatalogCache('page=1'));
  const [slow, setSlow] = useState(false);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [promos, setPromos] = useState([]);
  const categoriesRef = useRef(null);
  const [categoryPage, setCategoryPage] = useState(0);
  const moveCategories = (dir) => {
    const rail = categoriesRef.current;
    if (!rail) return;
    const card = rail.querySelector('.ks-category');
    const gap = Number.parseFloat(getComputedStyle(rail).columnGap) || 18;
    rail.scrollBy({ left: dir * ((card?.getBoundingClientRect().width || 280) + gap), behavior: 'smooth' });
  };

  useEffect(() => {
    const controller = new AbortController();
    const refs = [
      ['/expansiones', 'kanto_refs_exp_v1', setExps],
      ['/meta', 'kanto_refs_meta_v1', setMeta],
      ['/config/promociones', 'kanto_refs_promos_v1', setPromos],
    ];
    refs.forEach(([url, key, setter]) => {
      const cached = readReferenceCache(key);
      if (cached) setter(cached);
      // Una sola carga de metadatos por sesión reciente, no tres solicitudes por cada recarga.
      if (!cached) api(url, { signal: controller.signal }).then(d => {
        if (!controller.signal.aborted) { setter(d); saveReferenceCache(key, d); }
      }).catch(() => {});
    });
    return () => controller.abort();
  }, []);
  // Los enlaces del megamenú llevan el filtro en la URL, sin perder el catálogo React.
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    setF(prev => ({ ...prev, tipo: q.get('tipo') || '', subtipo: q.get('subtipo') || '', categoria: q.get('categoria') || '' }));
    setPage(1);
    if (location.hash) requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }));
  }, [location.search, location.hash]);

  useEffect(() => {
    const controller = new AbortController();
    const qs = new URLSearchParams({ ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)), page });
    const key = qs.toString();
    const cached = readCatalogCache(key);
    setError('');
    setSlow(false);
    if (cached) { setData(cached); setLoading(false); } else { setLoading(true); }
    // Render en reposo puede tardar en iniciar. La interfaz sigue respondiendo y permite reintentar.
    const slowTimer = setTimeout(() => { if (!controller.signal.aborted) setSlow(true); }, 7000);
    const timer = setTimeout(() => {
      api(`/productos?${qs}`, { signal: controller.signal, timeoutMs: 60000 }).then(d => {
        if (!controller.signal.aborted) {
          setData(d); setError(''); saveCatalogCache(key, d);
        }
      }).catch(e => {
        if (!controller.signal.aborted) setError(e.message);
      }).finally(() => {
        clearTimeout(slowTimer);
        if (!controller.signal.aborted) { setLoading(false); setSlow(false); }
      });
    }, 230);
    return () => { clearTimeout(timer); clearTimeout(slowTimer); controller.abort(); };
  }, [f, page, retry]);

  const set = key => e => { setF(prev => ({ ...prev, [key]: e.target.value, ...(key === 'tipo' ? { subtipo: '', categoria: '' } : {}), ...(key === 'subtipo' ? { categoria: '' } : {}) })); setPage(1); };
  function selectCategory(tipo, subtipo = '', categoria = '') {
    setF(prev => ({ ...prev, tipo, subtipo, categoria, expansion: '' })); setPage(1);
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
  }

  return <>
    <HeroCarousel />
    <PaymentShippingCarousel />

    <section className="ks-trust" aria-label="Ventajas de comprar en Kanto Store"><div className="ks-wide ks-trust-grid">
      <div><span className="ks-trust-icon">✦</span><div><strong>COLECCIÓN SIN LÍMITES</strong><small>Descubre nuevos tesoros TCG</small></div></div>
      <div><span className="ks-trust-icon">🛡</span><div><strong>STOCK ACTUALIZADO</strong><small>Consulta disponibilidad antes de comprar</small></div></div>
      <div><span className="ks-trust-icon">📦</span><div><strong>EMPAQUE CUIDADOSO</strong><small>Seguimiento hasta la entrega</small></div></div>
      <div><span className="ks-trust-icon">💬</span><div><strong>ATENCIÓN CERCANA</strong><small>Resolvemos tus dudas por WhatsApp</small></div></div>
    </div></section>

    <section className="ks-section ks-wide" id="categorias">
      <div className="ks-section-heading"><div><span className="ks-section-label">✦ DESCUBRE TU MUNDO</span><h2>EXPLORA <em>POR CATEGORÍA</em></h2><p>Todo lo que necesitas para seguir coleccionando.</p></div><a className="ks-text-link" href="#catalogo">VER TODO EL CATÁLOGO ↗</a></div>
      <div className="ks-category-toolbar"><span>DESLIZA PARA DESCUBRIR · 01 — 04</span><div><button type="button" aria-label="Categoría anterior" onClick={() => moveCategories(-1)}>←</button><button type="button" aria-label="Categoría siguiente" onClick={() => moveCategories(1)}>→</button></div></div>
      <div className="ks-categories" ref={categoriesRef} onScroll={e => { const rail = e.currentTarget; const card = rail.querySelector('.ks-category'); if (card) setCategoryPage(Math.min(3, Math.max(0, Math.round(rail.scrollLeft / (card.getBoundingClientRect().width + 18))))); }}>{categoriaItems.map(c => <button type="button" className={`ks-category ks-category-${c.art}`} key={c.n} onClick={() => selectCategory(c.tipo, c.subtipo, c.categoria)}>
        <span className="ks-category-number">{c.n} / CATEGORÍA</span><span className="ks-category-icon"><StoreIcon name={c.icono} size={37}/></span>
        <div className="ks-category-art" aria-hidden="true"><img src={c.imagen} alt="" loading="lazy" /></div>
        <span className="ks-category-sub">{c.sub}</span><strong>{c.title}</strong><span className="ks-category-note">{c.note} <b>↗</b></span>
      </button>)}</div><div className="ks-category-dots" aria-label="Posición de categorías">{categoriaItems.map((c, i) => <button key={c.n} type="button" aria-label={`Ir a ${c.title}`} aria-current={categoryPage === i ? 'true' : undefined} onClick={() => { const rail = categoriesRef.current; const item = rail?.children[i]; if (rail && item) rail.scrollTo({ left: item.offsetLeft - rail.offsetLeft, behavior: 'smooth' }); }} className={categoryPage === i ? 'is-active' : ''} />)}</div>
    </section>


    <section className="ks-wide ks-collections" aria-label="Colecciones destacadas">
      <div className="ks-collections-top"><span><StoreIcon name="coleccion" size={28}/> EXPANSIONES DESTACADAS</span><small>Selecciona una colección para explorar sus cartas y productos.</small></div>
      <div className="ks-collections-grid">{colecciones.map(c => <button type="button" key={c.nombre} title={`Ver ${c.nombre}`} onClick={() => {
        const ex = exps.find(x => x.nombre === c.nombre || x.nombre.endsWith(` · ${c.nombre}`));
        setF({ ...VACIO, expansion: ex ? String(ex.id) : '', q: ex ? '' : c.nombre }); setPage(1);
        document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
      }}><img src={c.logo} alt={c.nombre} loading="lazy"/><span>{c.nombre} ↗</span></button>)}</div>
    </section>

    {promos.length > 0 && <section className="ks-wide ks-section ks-promos" aria-label="Promociones de la tienda">
      <div className="ks-section-heading"><div><span className="ks-section-label">✦ ELEGIDO PARA TI</span><h2>PROMOCIONES <em>Y NOVEDADES</em></h2><p>Publicadas directamente por Kanto Store.</p></div></div>
      <div className="ks-promo-grid">{promos.map(p => <a className="ks-promo-card" key={p.id} href={p.enlace || '/'}>{p.imagen ? <img src={p.imagen} alt="" loading="lazy" /> : <span className="ks-promo-placeholder">✦</span>}<div><small>EN KANTO STORE</small><strong>{p.titulo}</strong><p>{p.descripcion}</p><b>DESCUBRIR ↗</b></div></a>)}</div>
    </section>}

    <section className="ks-wide ks-catalog ks-section" id="catalogo">
      <div className="ks-section-heading"><div><span className="ks-section-label">✦ ENCUENTRA TU FAVORITA</span><h2>ENCUENTRA TU <em>PRÓXIMO TESORO</em></h2><p>Cartas en español, sobres, Booster Boxes y Elite Trainer Box. Filtra por expansión, rareza o estado.</p></div><span className="ks-results-counter">{loading ? 'Buscando…' : `${data.total} productos encontrados`}</span></div>
      <div className="ks-catalog-toolbar"><label className="ks-search-box"><StoreIcon name="buscar" size={33}/><input aria-label="Buscar carta o SKU" placeholder="Busca un Pokémon, carta o SKU…" value={f.q} onChange={set('q')} /></label><button type="button" className="ks-filters-toggle" onClick={() => setFiltersOpen(v => !v)} aria-expanded={filtersOpen}><StoreIcon name="filtros" size={26} /> Filtrar productos <span>{filtersOpen ? '−' : '+'}</span></button><label className="ks-sort"><span>ORDENAR</span><select aria-label="Ordenar productos" value={f.orden} onChange={set('orden')}><option value="">Destacados</option><option value="precio_asc">Precio: menor a mayor</option><option value="precio_desc">Precio: mayor a menor</option><option value="nombre">Nombre</option></select></label></div>
      <div className="ks-pills" role="group" aria-label="Filtrar por categoría"><button type="button" className={!f.tipo ? 'selected' : ''} onClick={() => selectCategory('', '')}>Todos</button><button type="button" className={f.tipo === 'single' ? 'selected' : ''} onClick={() => selectCategory('single')}>Cartas sueltas</button><button type="button" className={f.subtipo === 'sobre' ? 'selected' : ''} onClick={() => selectCategory('sellado','sobre')}>Sobres</button><button type="button" className={f.categoria === 'booster' ? 'selected' : ''} onClick={() => selectCategory('sellado','caja','booster')}>Booster Boxes</button><button type="button" className={f.categoria === 'etb' ? 'selected' : ''} onClick={() => selectCategory('sellado','caja','etb')}>Elite Trainer Box</button><button type="button" className={f.subtipo === 'mazo' && !f.categoria ? 'selected' : ''} onClick={() => selectCategory('sellado','mazo')}>Mazos</button></div>
      {filtersOpen && <div className="ks-filters">
        <FilterSelect label="TIPO" value={f.tipo} onChange={set('tipo')} options={[{v:'single',t:'Cartas sueltas'},{v:'sellado',t:'Producto sellado'}]} />
        {f.tipo === 'sellado' && <FilterSelect label="SELLADO" value={f.subtipo} onChange={set('subtipo')} options={[{v:'sobre',t:'Sobres'},{v:'caja',t:'Cajas'},{v:'mazo',t:'Mazos'}]} />}
        {f.subtipo === 'caja' && <FilterSelect label="TIPO DE CAJA" value={f.categoria} onChange={set('categoria')} options={[{v:'booster',t:'Booster Boxes'},{v:'etb',t:'Elite Trainer Box'}]} />}
        <FilterSelect label="EXPANSIÓN" value={f.expansion} onChange={set('expansion')} options={exps.map(x => ({v:x.id,t:x.nombre}))} />
        <FilterSelect label="RAREZA" value={f.rareza} onChange={set('rareza')} options={meta.rarezas.map(v => ({v,t:etiqueta(v)}))} />
        <FilterSelect label="IDIOMA" value={f.idioma} onChange={set('idioma')} options={meta.idiomas.map(v => ({v,t:etiqueta(v)}))} />
        <FilterSelect label="ESTADO" value={f.estado} onChange={set('estado')} options={meta.estados.map(v => ({v,t:etiqueta(v)}))} />
        <button type="button" className="ks-clear-filters" onClick={() => { setF(VACIO); setPage(1); }}>Limpiar filtros ↺</button>
      </div>}
      {slow && loading && <div className="ks-slow-notice" role="status">El servidor está tardando en responder (puede estar iniciándose en Render). La página sigue disponible. <button type="button" onClick={() => setRetry(n => n + 1)}>Reintentar consulta</button></div>}
      {error && <div className="alert" role="alert">No se pudo actualizar el catálogo: {error} <button type="button" onClick={() => setRetry(n => n + 1)}>Reintentar</button></div>}
      {loading ? <p className="ks-loading" role="status">✦ Buscando cartas para tu colección…</p> : data.items.length ? <div className="ks-products-grid">{data.items.map(p => <ProductCard key={p.id} p={p} />)}</div> : <div className="ks-empty"><span>🔍</span><h3>No encontramos cartas con esos filtros.</h3><p>Prueba otra búsqueda o explora todas nuestras categorías.</p><button onClick={() => { setF(VACIO); setPage(1); }}>VER TODOS LOS PRODUCTOS</button></div>}
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
