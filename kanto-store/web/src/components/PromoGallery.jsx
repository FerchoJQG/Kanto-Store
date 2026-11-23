import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { obtenerVideoPromo } from '../utils/promoVideo.js';
import './zz-f10-fixes.css';
import './zz-f11-stability.css';
import './zz-f12-carousel-video.css';
import './zz-f13-promociones.css';

function destinoInterno(ruta) {
  return typeof ruta === 'string' && ruta !== '/' && /^\/(?!\/)[a-zA-Z0-9/?=&_%#.-]+$/.test(ruta) ? ruta : null;
}
function Poster({promo, alAbrir, grande = false}) {
  const video = obtenerVideoPromo(promo.video);
  const miniatura = promo.imagen || video?.miniatura || null;
  return <button type="button" className={`kanto-f12-poster ${grande ? 'is-big' : ''}`} onClick={alAbrir}
    aria-label={`Ver afiche de ${promo.titulo || 'promoción'}`}>
    <span className="kanto-f12-poster-glow" aria-hidden="true"
      style={miniatura ? {backgroundImage:`url(${miniatura})`} : undefined}/>
    {miniatura ? <img src={miniatura} alt={promo.titulo || 'Carta promocional'} loading={grande ? 'eager' : 'lazy'}
      decoding="async" onError={e => {e.currentTarget.hidden = true;}}/> : <span className="kanto-f12-video-blank" aria-hidden="true">✦ KANTO TCG</span>}
    <span className="kanto-f12-expand" aria-hidden="true">⤢</span>
  </button>;
}
function MedioAmpliado({promo, modo}) {
  const video = obtenerVideoPromo(promo.video);
  if (modo !== 'video' || !video) {
    const afiche = promo.imagen || video?.miniatura || null;
    return <div className="kanto-f12-enlarged-art">{afiche ? <img src={afiche} alt={promo.titulo || 'Afiche promocional'} />
      : <div className="kanto-f13-sin-afiche">✦ KANTO TCG</div>}</div>;
  }
  if (video.tipo === 'archivo') return <video key={video.url} className="kanto-f12-iframe" controls playsInline preload="metadata" poster={promo.imagen || undefined} src={video.url}/>;
  return <iframe key={video.url} className="kanto-f12-iframe" src={video.url}
    title={`Video de ${promo.titulo || 'promoción Kanto Store'}`} loading="eager"
    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen
    referrerPolicy="strict-origin-when-cross-origin" />;
}
export default function PromoGallery({promos = []}) {
  const activas = Array.isArray(promos) ? promos.filter(p => p && p.activa).slice(0,20) : [];
  const diapositivas = activas;
  const [index, setIndex] = useState(0);
  const [modalIndex, setModalIndex] = useState(null);
  const [modoModal, setModoModal] = useState('afiche');
  const [reproduciendo, setReproduciendo] = useState(true);
  const [enPantalla, setEnPantalla] = useState(true);
  const [visible, setVisible] = useState(true);
  const [reducido, setReducido] = useState(false);
  const seccion = useRef(null);
  const cierreRef = useRef(null);
  const toque = useRef(null);
  const total = diapositivas.length;
  const actual = total ? diapositivas[index % total] : null;
  const ampliada = modalIndex === null || !total ? null : diapositivas[modalIndex % total];

  useEffect(() => {setIndex(0);setModalIndex(null);setModoModal('afiche');}, [promos]);
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const actualizarMotion = () => setReducido(motion.matches);
    const visibilidad = () => setVisible(!document.hidden);
    actualizarMotion();visibilidad();
    motion.addEventListener?.('change', actualizarMotion);
    document.addEventListener('visibilitychange', visibilidad);
    const obs = 'IntersectionObserver' in window
      ? new IntersectionObserver(([entry]) => setEnPantalla(entry.isIntersecting), {threshold:.05}) : null;
    if (obs && seccion.current) obs.observe(seccion.current);
    return () => {motion.removeEventListener?.('change', actualizarMotion);document.removeEventListener('visibilitychange', visibilidad);obs?.disconnect();};
  }, []);
  useEffect(() => {
    if (!reproduciendo || !enPantalla || !visible || reducido || modalIndex !== null || total < 2) return;
    const t = window.setInterval(() => setIndex(i => (i + 1) % total), 5800);
    return () => window.clearInterval(t);
  }, [reproduciendo,enPantalla,visible,reducido,modalIndex,total]);

  // Una sola presentación inicial por sesión, únicamente si hay promociones reales.
  useEffect(() => {
    if (!activas.length || reducido || !visible) return;
    let visto = true;
    try {visto = sessionStorage.getItem('kanto-promo-v11-seen') === '1';} catch { /* opcional */ }
    if (visto) return;
    const t = window.setTimeout(() => {
      if (document.hidden || document.querySelector('[role="dialog"],dialog[open],.ks-cart-drawer.is-open')) return;
      setModoModal('afiche');
      setModalIndex(0);
      try {sessionStorage.setItem('kanto-promo-v11-seen','1');} catch { /* opcional */ }
    }, 10000);
    return () => window.clearTimeout(t);
  }, [activas.length,reducido,visible]);
  useEffect(() => {
    if (modalIndex === null) return;
    const anterior = document.activeElement;
    const overflow = document.body.style.overflow;
    const onKey = e => {
      if (e.key === 'Escape') setModalIndex(null);
      else if (e.key === 'ArrowRight') {setModoModal('afiche');setModalIndex(i => (i + 1) % total);}
      else if (e.key === 'ArrowLeft') {setModoModal('afiche');setModalIndex(i => (i - 1 + total) % total);}
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    cierreRef.current?.focus();
    return () => {document.body.style.overflow = overflow;document.removeEventListener('keydown',onKey);anterior?.focus?.();};
  }, [modalIndex !== null, total]);

  const ir = delta => setIndex(i => (i + delta + total) % total);
  const irModal = delta => { setModoModal('afiche');setModalIndex(i => (i + delta + total) % total); };
  const abrir = (i, modo = 'afiche') => {setModoModal(modo);setModalIndex(i);};
  const enlace = actual?.tipo === 'producto' && Number(actual.producto_id) > 0
    ? `/producto/${Number(actual.producto_id)}` : destinoInterno(actual?.enlace);
  const enlaceModal = ampliada ? (ampliada.tipo === 'producto' && Number(ampliada.producto_id) > 0
    ? `/producto/${Number(ampliada.producto_id)}` : destinoInterno(ampliada.enlace)) : null;
  if (!actual) return null; // No publicar ejemplos cuando el administrador desactiva todas las promociones.
  return <section ref={seccion} className="kanto-v10-promos kanto-f11-promos kanto-f12-promos" aria-label="Promociones y novedades">
    <div className="kanto-v10-promo-head"><span>✦ EN KANTO STORE</span>
      <h2>PROMOCIONES <em>Y NOVEDADES</em></h2>
      <p>Amplía la carta o reproduce su video directamente desde la tienda.</p>
    </div>
    <div className="kanto-v10-promo-stage" role="region" aria-roledescription="carrusel" aria-label="Promociones de la tienda" tabIndex={0}
      onKeyDown={e => {if (e.key === 'ArrowLeft'){e.preventDefault();ir(-1);} if (e.key === 'ArrowRight'){e.preventDefault();ir(1);}}}
      onTouchStart={e => {toque.current = e.touches[0]?.clientX ?? null;}}
      onTouchEnd={e => {if (toque.current === null) return;const delta = e.changedTouches[0].clientX - toque.current;toque.current = null;if (Math.abs(delta)>45) ir(delta<0?1:-1);}}>
      <div className="kanto-v10-promo-image" key={actual.id || index}>
        <Poster promo={actual} alAbrir={() => abrir(index, 'afiche')}/>
      </div>
      <div className="kanto-v10-promo-info">
        <small>{actual.destacada ? '✦ CARTA DESTACADA' : actual.tipo === 'producto' ? '✦ PRODUCTO DEL CATÁLOGO' : '✦ NUEVA CARTA / PROMOCIÓN'}</small>
        <h3>{actual.titulo}</h3><p>{actual.descripcion || 'Explora una nueva selección de Kanto TCG Store.'}</p>
        {obtenerVideoPromo(actual.video) && <span className="kanto-f12-video-chip">▶ Video disponible</span>}
        <div className="kanto-v10-promo-actions kanto-f13-promo-actions">
          <button type="button" onClick={() => abrir(index, 'afiche')}>⤢ VER AFICHE</button>
          {obtenerVideoPromo(actual.video) && <button type="button" className="kanto-f13-video-button" onClick={() => abrir(index, 'video')}>▶ VER VIDEO</button>}
          {enlace && <Link to={enlace}>VER PRODUCTO ↗</Link>}
        </div>
      </div>
    </div>
    <div className="kanto-v10-promo-control">
      <button type="button" aria-label="Promoción anterior" onClick={() => ir(-1)}>←</button>
      <span>{index + 1} de {total}</span>
      <button type="button" aria-label="Promoción siguiente" onClick={() => ir(1)}>→</button>
      <button type="button" aria-pressed={!reproduciendo} onClick={() => setReproduciendo(v=>!v)}>
        {reproduciendo ? 'Ⅱ Pausar' : '▶ Reanudar'}</button>
    </div>
    {ampliada && createPortal(<div className="kanto-v10-modal-backdrop kanto-f11-modal-backdrop kanto-f12-modal"
      onMouseDown={e => {if (e.target === e.currentTarget) setModalIndex(null);}}>
      <div className="kanto-v10-promo-modal" role="dialog" aria-modal="true" aria-label={`Promoción ${ampliada.titulo}`}>
        <button type="button" className="kanto-v10-close" ref={cierreRef} aria-label="Cerrar vista ampliada"
          onClick={() => setModalIndex(null)}>×</button>
        <div className="kanto-v10-modal-image"><span className="kanto-v10-modal-ring" aria-hidden="true"/>
          <MedioAmpliado promo={ampliada} modo={modoModal}/>
        </div>
        <div className="kanto-v10-modal-text"><small>✦ KANTO TCG · PROMOCIÓN</small>
          <h2>DESCUBRE TU <em>PRÓXIMA CARTA</em></h2><h3>{ampliada.titulo}</h3>
          <p>{ampliada.descripcion || 'Conoce todos los detalles de esta carta.'}</p>
          <div className="kanto-f13-modal-tabs">
            <button type="button" className={modoModal === 'afiche' ? 'is-selected' : ''} onClick={() => setModoModal('afiche')}>⤢ VER AFICHE</button>
            {obtenerVideoPromo(ampliada.video) && <button type="button" className={modoModal === 'video' ? 'is-selected' : ''} onClick={() => setModoModal('video')}>▶ VER VIDEO</button>}
          </div>
          <div className="kanto-v10-modal-buttons">
            <button type="button" aria-label="Promoción anterior" onClick={() => irModal(-1)}>←</button>
            <span>{modalIndex + 1} / {total}</span>
            <button type="button" aria-label="Promoción siguiente" onClick={() => irModal(1)}>→</button>
            {enlaceModal && <Link to={enlaceModal} onClick={()=>setModalIndex(null)}>VER PRODUCTO ↗</Link>}
          </div>
        </div>
      </div>
    </div>,document.body)}
  </section>;
}
