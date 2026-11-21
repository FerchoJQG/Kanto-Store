import { useEffect, useRef, useState } from 'react';

// Todas las imágenes existen en public/assets; no hay placeholders ni productos inventados.
const cards = [
  { name: 'Mega-Golisopod ex', set: 'Dominio Delta', image: '/assets/carrusel/mega-golisopod-ex-limpia.png' },
  { name: 'Mega-Chandelure ex', set: 'Oscuridad Absoluta', image: '/assets/carrusel/oa-chandelure-card.png' },
  { name: 'Mega-Darkrai ex', set: 'Oscuridad Absoluta', image: '/assets/carrusel/oa-darkrai-card.png' },
  { name: 'Charizard ex', set: 'Colección destacada', image: '/assets/carrusel/charizard-ex-limpia.png' },
  { name: 'Raikou ex', set: 'Dominio Delta', image: '/assets/cartas-es/me06-121.webp' },
  { name: 'Mega-Malamar ex', set: 'Dominio Delta', image: '/assets/cartas-es/me06-123.webp' },
];
export default function FeaturedCards() {
  const [active, setActive] = useState(2);
  const touchStart = useRef(null);
  const move = (d) => setActive(i => (i + d + cards.length) % cards.length);
  // Cuando la pestaña se oculta, este carrusel no ejecuta animaciones ni temporizadores.
  const offset = (i) => {
    let d = (i - active + cards.length) % cards.length;
    if (d > cards.length / 2) d -= cards.length;
    return d;
  };
  return <section className="ks-featured-cards ks-wide" aria-label="Cartas destacadas con navegación">
    <div className="ks-featured-heading"><span>✦ SELECCIÓN KANTO</span><h2>CARTAS QUE <em>ROBAN MIRADAS.</em></h2><p>Explora nuestras cartas destacadas. Avanza, retrocede o elige la que quieres ver.</p></div>
    <div className="ks-cardfan" role="region" aria-roledescription="carrusel" aria-label="Cartas Pokémon destacadas" tabIndex="0" onKeyDown={e => { if (e.key === 'ArrowLeft') move(-1); if (e.key === 'ArrowRight') move(1); }} onTouchStart={e => { touchStart.current = e.touches[0]?.clientX ?? null; }} onTouchEnd={e => { if (touchStart.current === null) return; const dx = e.changedTouches[0].clientX - touchStart.current; if (Math.abs(dx)>35) move(dx<0?1:-1); touchStart.current = null; }}>
      <div className="ks-cardfan-halo" aria-hidden="true" />
      {cards.map((c, i) => {
        const d = offset(i);
        return <button key={c.image} type="button" className={`ks-cardfan-card ${d === 0 ? 'is-center' : ''}`} aria-hidden={Math.abs(d)>2} tabIndex={Math.abs(d)>2?-1:0} aria-label={`Mostrar carta ${c.name}`} aria-current={d===0?'true':undefined} onClick={() => setActive(i)} style={{ '--card-x': `${d * 70}%`, '--card-rotation': `${d * -10}deg`, '--card-scale': Math.max(.64, 1 - Math.abs(d)*.15), zIndex: 8-Math.abs(d), opacity: Math.abs(d) > 2 ? 0 : 1, pointerEvents: Math.abs(d)>2?'none':'auto' }}><img src={c.image} alt={c.name} loading={Math.abs(d)>1?'lazy':'eager'} decoding="async" draggable="false"/></button>;
      })}
    </div>
    <div className="ks-cardfan-controls"><button type="button" aria-label="Carta anterior" onClick={() => move(-1)}>←</button><span>{active + 1} de {cards.length}</span><button type="button" aria-label="Carta siguiente" onClick={() => move(1)}>→</button></div>
    <div className="ks-cardfan-details" aria-live="polite"><strong>{cards[active].name}</strong><span>{cards[active].set}</span><a href="#catalogo">Explorar el catálogo ↗</a></div>
  </section>;
}
