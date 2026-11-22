import { useEffect, useRef, useState } from 'react';

// Imágenes del catálogo publicado; ninguna carta depende de una imagen de ejemplo.
const cards = [
  { name: 'Mega-Golisopod ex', set: 'Dominio Delta', image: '/assets/carrusel/mega-golisopod-ex-limpia.png' },
  { name: 'Mega-Chandelure ex', set: 'Oscuridad Absoluta', image: '/assets/carrusel/oa-chandelure-card.png' },
  { name: 'Mega-Darkrai ex', set: 'Oscuridad Absoluta', image: '/assets/carrusel/oa-darkrai-card.png' },
  { name: 'Charizard ex', set: 'Colección destacada', image: '/assets/carrusel/charizard-ex-limpia.png' },
  { name: 'Raikou ex', set: 'Dominio Delta', image: '/assets/cartas-es/me06-121.webp' },
  { name: 'Mega-Malamar ex', set: 'Dominio Delta', image: '/assets/cartas-es/me06-123.webp' },
];

const NEXT_MS = 4800;

export default function FeaturedCards() {
  const [active, setActive] = useState(2);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const [inView, setInView] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const sectionRef = useRef(null);
  const touchStart = useRef(null);

  // No usar intervalos ni transformar cartas cuando el bloque está fuera de pantalla.
  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => setReduceMotion(media.matches);
    onMotion();
    media.addEventListener?.('change', onMotion);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      media.removeEventListener?.('change', onMotion);
    };
  }, []);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) { setInView(true); return; }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || !visible || !inView || reduceMotion) return;
    const timer = window.setInterval(() => setActive(i => (i + 1) % cards.length), NEXT_MS);
    return () => window.clearInterval(timer);
  }, [playing, visible, inView, reduceMotion]);

  const move = delta => setActive(i => (i + delta + cards.length) % cards.length);
  const offset = i => {
    let d = (i - active + cards.length) % cards.length;
    if (d > cards.length / 2) d -= cards.length;
    return d;
  };

  return <section ref={sectionRef} className="ks-featured-cards ks-wide" aria-label="Cartas Pokémon destacadas">
    <div className="ks-featured-heading">
      <span>✦ SELECCIÓN KANTO</span>
      <h2>CARTAS QUE <em>ROBAN MIRADAS.</em></h2>
      <p>Las cartas avanzan automáticamente. También puedes usar las flechas o seleccionar una carta.</p>
    </div>
    <div
      className="ks-cardfan"
      role="region"
      aria-roledescription="carrusel"
      aria-label="Carrusel de seis cartas Pokémon"
      tabIndex="0"
      onKeyDown={e => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
      }}
      onTouchStart={e => { touchStart.current = e.touches[0]?.clientX ?? null; }}
      onTouchEnd={e => {
        if (touchStart.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStart.current;
        if (Math.abs(dx) > 35) move(dx < 0 ? 1 : -1);
        touchStart.current = null;
      }}
    >
      <div className="ks-cardfan-halo" aria-hidden="true" />
      {cards.map((c, i) => {
        const d = offset(i);
        const show = Math.abs(d) <= 2;
        return <button
          key={c.image}
          type="button"
          className={`ks-cardfan-card ${d === 0 ? 'is-center' : ''}`}
          aria-hidden={!show}
          tabIndex={show ? 0 : -1}
          aria-label={`Mostrar ${c.name}`}
          aria-current={d === 0 ? 'true' : undefined}
          onClick={() => setActive(i)}
          style={{
            '--card-x': `${d * 65}%`,
            '--card-rotation': `${d * -8}deg`,
            '--card-scale': Math.max(.68, 1 - Math.abs(d) * .13),
            zIndex: 8 - Math.abs(d),
            opacity: show ? 1 : 0,
            pointerEvents: show ? 'auto' : 'none',
          }}
        ><img src={c.image} alt={c.name} loading={show ? 'eager' : 'lazy'} decoding="async" draggable="false" /></button>;
      })}
    </div>
    <div className="ks-cardfan-controls">
      <button type="button" aria-label="Carta anterior" onClick={() => move(-1)}>←</button>
      <span>{active + 1} de {cards.length}</span>
      <button type="button" aria-label="Carta siguiente" onClick={() => move(1)}>→</button>
      <button
        type="button"
        className="ks-cardfan-play"
        aria-label={playing ? 'Pausar carrusel de cartas' : 'Reanudar carrusel de cartas'}
        aria-pressed={!playing}
        onClick={() => setPlaying(v => !v)}
      >{playing ? 'Ⅱ Pausar' : '▶ Reanudar'}</button>
    </div>
    <div className="ks-cardfan-details" aria-live="off"><strong>{cards[active].name}</strong><span>{cards[active].set}</span><a href="#catalogo">Explorar el catálogo ↗</a></div>
  </section>;
}
