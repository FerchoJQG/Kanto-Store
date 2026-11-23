import { useEffect, useRef, useState } from 'react';
import './zz-f10-card-showcase.css';
import './zz-f10-fixes.css';
import './zz-f11-stability.css';
import './zz-f12-carousel-video.css';

// Seis cartas reales del ZIP original; sin placeholders ni imágenes remotas.
const cards = [
  {name:'Mega-Darkrai ex', set:'Oscuridad Absoluta', src:'/assets/carrusel/oa-darkrai-card.png'},
  {name:'Mega-Chandelure ex', set:'Oscuridad Absoluta', src:'/assets/carrusel/oa-chandelure-card.png'},
  {name:'Mega-Golisopod ex', set:'Dominio Delta', src:'/assets/carrusel/mega-golisopod-ex-limpia.png'},
  {name:'Charizard ex', set:'Colección destacada', src:'/assets/carrusel/charizard-ex-limpia.png'},
  {name:'Raikou ex', set:'Dominio Delta', src:'/assets/carrusel/me06-121.webp'},
  {name:'Mega-Malamar ex', set:'Dominio Delta', src:'/assets/carrusel/me06-123.webp'},
];
const INTERVALO = 4600;
const distanciaCircular = (i, actual) => {
  let distancia = (i - actual + cards.length) % cards.length;
  if (distancia > cards.length / 2) distancia -= cards.length;
  return distancia;
};

export default function FeaturedCards() {
  const [index, setIndex] = useState(0);
  const [reproduciendo, setReproduciendo] = useState(true);
  const [enPantalla, setEnPantalla] = useState(true);
  const [pestanaVisible, setPestanaVisible] = useState(true);
  const [movimientoReducido, setMovimientoReducido] = useState(false);
  const seccion = useRef(null);
  const inicioToque = useRef(null);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const actualizar = () => setMovimientoReducido(media.matches);
    const visibilidad = () => setPestanaVisible(!document.hidden);
    actualizar(); visibilidad();
    media.addEventListener?.('change', actualizar);
    document.addEventListener('visibilitychange', visibilidad);
    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver(([entry]) => setEnPantalla(entry.isIntersecting), {threshold:.05}) : null;
    if (observer && seccion.current) observer.observe(seccion.current);
    return () => { observer?.disconnect(); media.removeEventListener?.('change', actualizar); document.removeEventListener('visibilitychange', visibilidad); };
  }, []);

  useEffect(() => {
    if (!reproduciendo || !enPantalla || !pestanaVisible || movimientoReducido) return;
    const intervalo = window.setInterval(() => setIndex(i => (i + 1) % cards.length), INTERVALO);
    return () => window.clearInterval(intervalo);
  }, [reproduciendo, enPantalla, pestanaVisible, movimientoReducido]);

  // El clic o foco sobre una carta NO pausa automáticamente el carrusel.
  const mover = delta => setIndex(i => (i + delta + cards.length) % cards.length);
  return <section ref={seccion} id="presentaciones" className="tcg-showcase kanto-f11-showcase kanto-f12-showcase" aria-labelledby="tcg-showcase-title">
    <div className="tcg-showcase-wrap">
      <p className="tcg-showcase-kicker">✦ SELECCIÓN KANTO</p>
      <h2 id="tcg-showcase-title">CARTAS QUE <em>ROBAN MIRADAS.</em></h2>
      <p className="tcg-showcase-lead">Seis cartas, una colección que no se detiene. Al llegar a la última, comienza nuevamente por la primera.</p>
      <div className="tcg-showcase-stage" role="region" aria-roledescription="carrusel" aria-label="Seis cartas en rotación circular" tabIndex={0}
        onKeyDown={e => {if (e.key === 'ArrowLeft') {e.preventDefault();mover(-1);} if (e.key === 'ArrowRight') {e.preventDefault();mover(1);}}}
        onTouchStart={e => {inicioToque.current = e.touches[0]?.clientX ?? null;}}
        onTouchEnd={e => {if (inicioToque.current === null) return; const d = e.changedTouches[0].clientX - inicioToque.current; inicioToque.current = null; if (Math.abs(d) > 42) mover(d < 0 ? 1 : -1);}}>
        <div className="kanto-f12-halo" aria-hidden="true" />
        {cards.map((card, i) => {
          const d = distanciaCircular(i, index);
          const mostrada = Math.abs(d) <= 2;
          const clase = d === 0 ? 'is-center' : d < 0 ? `is-left-${-d}` : `is-right-${d}`;
          return <button key={card.src} type="button" className={`tcg-showcase-card ${clase}`}
            aria-hidden={!mostrada} tabIndex={mostrada ? 0 : -1}
            aria-label={`Seleccionar ${card.name}`} aria-current={d === 0 ? 'true' : undefined}
            onClick={() => setIndex(i)}>
            <span className="tcg-showcase-card-inner"><img src={card.src} alt={card.name}
              loading={mostrada ? 'eager' : 'lazy'} decoding="async" draggable="false" /></span>
          </button>;
        })}
      </div>
      <div className="tcg-showcase-controls">
        <button type="button" aria-label="Carta anterior" onClick={() => mover(-1)}>❮</button>
        <span className="tcg-showcase-counter">{index + 1} de {cards.length}</span>
        <button type="button" aria-label="Carta siguiente" onClick={() => mover(1)}>❯</button>
        <button type="button" className="kanto-f10-gallery-play" aria-pressed={!reproduciendo}
          onClick={() => setReproduciendo(v => !v)}>{reproduciendo ? 'Ⅱ Pausar' : '▶ Reanudar'}</button>
      </div>
      <div className="kanto-f12-dots" role="group" aria-label="Seleccionar carta">
        {cards.map((c, i) => <button key={c.src} type="button" className={i === index ? 'is-active' : ''}
          aria-label={`Carta ${i + 1}: ${c.name}`} aria-current={i === index ? 'true' : undefined}
          onClick={() => setIndex(i)} />)}
      </div>
      <div className="tcg-showcase-meta" aria-live="off"><strong>{cards[index].name}</strong><span>{cards[index].set}</span></div>
      <div className="tcg-showcase-footer"><a className="tcg-showcase-cta" href="#catalogo">EXPLORAR CARTAS ↗</a></div>
    </div>
  </section>;
}
