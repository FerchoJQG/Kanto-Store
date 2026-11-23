import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import './zz-f10-fixes.css';
import './zz-f11-stability.css';

const ejemplos = [
  { id: 'k11-darkrai', titulo: 'Mega-Darkrai ex', descripcion: 'Una carta destacada de Oscuridad Absoluta.', imagen: '/assets/carrusel/oa-darkrai-card.png', enlace: '/#catalogo', activa: true, destacada: true },
  { id: 'k11-charizard', titulo: 'Charizard ex', descripcion: 'Descubre cartas para tu colección.', imagen: '/assets/carrusel/charizard-ex-limpia.png', enlace: '/#catalogo', activa: true, destacada: true },
  { id: 'k11-golisopod', titulo: 'Mega-Golisopod ex', descripcion: 'Explora cartas y colecciones.', imagen: '/assets/carrusel/mega-golisopod-ex-limpia.png', enlace: '/#catalogo', activa: true, destacada: true },
];
const destinoInterno = ruta => typeof ruta === 'string' && ruta !== '/' && /^\/(?!\/)[a-zA-Z0-9/?=&_%#.-]+$/.test(ruta) ? ruta : null;
const videoValido = valor => typeof valor === 'string' && /^https:\/\//i.test(valor) && /\.(mp4|webm)(\?.*)?$/i.test(valor);

function Media({ promo, grande = false, onAmpliar }) {
  const fallback = ejemplos[0].imagen;
  if (videoValido(promo.video)) return <video
    className="kanto-v10-promo-video" src={promo.video} poster={promo.imagen || undefined}
    controls={grande} autoPlay={grande} muted playsInline loop={grande} preload="metadata"
    aria-label={`Video de ${promo.titulo}`} />;
  const img = <img className="kanto-v10-promo-art" src={promo.imagen || fallback} alt={promo.titulo || 'Promoción Kanto Store'}
    loading={grande ? 'eager' : 'lazy'} decoding="async" onError={e => {
      e.currentTarget.onerror = null;
      e.currentTarget.src = fallback;
    }} />;
  return onAmpliar ? <button className="kanto-f11-open-image" type="button" onClick={onAmpliar}
    aria-label={`Ampliar ${promo.titulo}`}>{img}</button>
    : <div className="kanto-f11-open-image">{img}</div>;
}

export default function PromoGallery({ promos = [] }) {
  const activas = Array.isArray(promos) ? promos.filter(p => p && p.activa).slice(0, 20) : [];
  const diapositivas = activas.length >= 3 ? activas : [...activas, ...ejemplos];
  const [index, setIndex] = useState(0);
  const [modalIndex, setModalIndex] = useState(null);
  const [playing, setPlaying] = useState(true);
  const [enPantalla, setEnPantalla] = useState(false);
  const [pestanaVisible, setPestanaVisible] = useState(true);
  const [reducido, setReducido] = useState(false);
  const nodo = useRef(null);
  const cerrarBtn = useRef(null);
  const inicioToque = useRef(null);
  const total = diapositivas.length;
  const actual = diapositivas[index % total];
  const ampliada = modalIndex === null ? null : diapositivas[modalIndex % total];

  useEffect(() => setIndex(0), [promos]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setReducido(media.matches);
    const visibility = () => setPestanaVisible(!document.hidden);
    motion(); visibility();
    media.addEventListener?.('change', motion);
    document.addEventListener('visibilitychange', visibility);
    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver(([entry]) => setEnPantalla(entry.isIntersecting), { threshold: .06 }) : null;
    if (observer && nodo.current) observer.observe(nodo.current);
    else setEnPantalla(true);
    return () => { media.removeEventListener?.('change', motion); document.removeEventListener('visibilitychange', visibility); observer?.disconnect(); };
  }, []);
  useEffect(() => {
    if (!playing || !enPantalla || !pestanaVisible || reducido || modalIndex !== null || total < 2) return;
    const timer = setInterval(() => setIndex(i => (i + 1) % total), 6500);
    return () => clearInterval(timer);
  }, [playing, enPantalla, pestanaVisible, reducido, modalIndex, total]);

  // Una promoción REAL se amplía una sola vez por sesión; nunca una carta de relleno.
  useEffect(() => {
    if (!activas.length || reducido || !pestanaVisible) return;
    let vista = true;
    try { vista = sessionStorage.getItem('kanto-promo-v11-seen') === '1'; } catch { /* opcional */ }
    if (vista) return;
    const timer = setTimeout(() => {
      if (document.hidden || document.querySelector('[role="dialog"],dialog[open],.ks-cart-drawer.is-open')) return;
      setModalIndex(0);
      try { sessionStorage.setItem('kanto-promo-v11-seen', '1'); } catch { /* opcional */ }
    }, 10000);
    return () => clearTimeout(timer);
  }, [activas.length, reducido, pestanaVisible]);

  useEffect(() => {
    if (modalIndex === null) return;
    const previo = document.activeElement;
    const overflow = document.body.style.overflow;
    const esc = e => { if (e.key === 'Escape') setModalIndex(null); };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', esc);
    cerrarBtn.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', esc);
      previo?.focus?.();
    };
  }, [modalIndex === null]);

  const go = desplazamiento => setIndex(i => (i + desplazamiento + total) % total);
  const goModal = desplazamiento => setModalIndex(i => (i + desplazamiento + total) % total);
  const destino = destinoInterno(actual.enlace);
  const destinoModal = ampliada ? destinoInterno(ampliada.enlace) : null;

  return <section className="kanto-v10-promos kanto-f11-promos" ref={nodo} aria-label="Promociones y novedades">
    <div className="kanto-v10-promo-head"><span>✦ EN KANTO STORE</span><h2>PROMOCIONES <em>Y NOVEDADES</em></h2><p>Descubre promociones de la tienda, amplía cada carta o mira su video sin salir de esta página.</p></div>
    <div className="kanto-v10-promo-stage" role="region" aria-roledescription="carrusel" aria-label="Promociones" tabIndex={0}
      onKeyDown={e => { if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } }}
      onTouchStart={e => { inicioToque.current = e.touches[0]?.clientX ?? null; }}
      onTouchEnd={e => { if (inicioToque.current === null) return; const delta = e.changedTouches[0].clientX - inicioToque.current; inicioToque.current = null; if (Math.abs(delta) > 45) go(delta < 0 ? 1 : -1); }}>
      <div className="kanto-v10-promo-image" key={actual.id || index}>
        <div className="kanto-v10-promo-glow" style={actual.imagen ? { backgroundImage: `url(${actual.imagen})` } : undefined} aria-hidden="true" />
        <Media promo={actual} onAmpliar={() => setModalIndex(index)} />
      </div>
      <div className="kanto-v10-promo-info">
        <small>{actual.destacada ? '✦ CARTA DESTACADA' : '✦ PROMOCIÓN PUBLICADA'}</small>
        <h3>{actual.titulo}</h3><p>{actual.descripcion || 'Descubre las novedades de Kanto TCG Store.'}</p>
        <div className="kanto-v10-promo-actions"><button type="button" onClick={() => setModalIndex(index)}>VER CARTA / VIDEO ↗</button>
          {destino && <Link to={destino}>VER PRODUCTO / CATÁLOGO</Link>}
        </div>
      </div>
    </div>
    <div className="kanto-v10-promo-control">
      <button type="button" aria-label="Promoción anterior" onClick={() => go(-1)}>←</button>
      <span>{index + 1} de {total}</span>
      <button type="button" aria-label="Promoción siguiente" onClick={() => go(1)}>→</button>
      <button type="button" aria-pressed={!playing} onClick={() => setPlaying(v => !v)}>{playing ? 'Ⅱ Pausar' : '▶ Reanudar'}</button>
    </div>
    {ampliada && createPortal(<div className="kanto-v10-modal-backdrop kanto-f11-modal-backdrop"
      onMouseDown={e => { if (e.currentTarget === e.target) setModalIndex(null); }}>
      <div className="kanto-v10-promo-modal" role="dialog" aria-modal="true" aria-label={`Promoción: ${ampliada.titulo}`}>
        <button className="kanto-v10-close" ref={cerrarBtn} aria-label="Cerrar vista ampliada" onClick={() => setModalIndex(null)}>×</button>
        <div className="kanto-v10-modal-image"><span className="kanto-v10-modal-ring" aria-hidden="true" />
          <Media promo={ampliada} grande />
        </div>
        <div className="kanto-v10-modal-text"><small>✦ PROMOCIÓN · KANTO TCG</small>
          <h2>DESCUBRE TU <em>PRÓXIMA CARTA</em></h2>
          <h3>{ampliada.titulo}</h3><p>{ampliada.descripcion || 'Conoce esta carta especial.'}</p>
          <div className="kanto-v10-modal-buttons"><button type="button" onClick={() => goModal(-1)}>←</button>
            <span>{modalIndex % total + 1} / {total}</span><button type="button" onClick={() => goModal(1)}>→</button>
            {destinoModal && <Link to={destinoModal} onClick={() => setModalIndex(null)}>VER PRODUCTO ↗</Link>}
          </div>
        </div>
      </div>
    </div>, document.body)}
  </section>;
}
