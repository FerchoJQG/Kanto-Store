import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

// Imágenes originales del ZIP de referencia, editables en web/public/assets/carrusel.
const slides = [
  { bg: '/assets/carrusel/fondo-1.webp', card: '/assets/carrusel/carta-1.png', name: 'MEGA-GOLISOPOD ex', line: 'PODER EN CADA CARTA', tag: 'Carta destacada' },
  { bg: '/assets/carrusel/fondo-2.webp', card: '/assets/carrusel/carta-2.png', name: 'CHARIZARD ex', line: 'ENCIENDE TU COLECCIÓN', tag: 'Favorita de coleccionistas' },
  { bg: '/assets/carrusel/fondo-3.webp', card: '/assets/carrusel/carta-3.png', name: 'TU PRÓXIMO HALLAZGO', line: 'UNA SORPRESA TE ESPERA', tag: 'Personaliza esta carta' },
];

export default function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const visual = useRef(null);
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setIndex(i => (i + 1) % slides.length), 6000);
    return () => clearInterval(timer);
  }, [paused]);
  const move = e => {
    if (e.pointerType === 'touch' || !visual.current) return;
    const bounds = visual.current.getBoundingClientRect();
    const x = (e.clientX - bounds.left) / bounds.width - .5;
    const y = (e.clientY - bounds.top) / bounds.height - .5;
    visual.current.style.setProperty('--pointer-x', `${x * 26}px`);
    visual.current.style.setProperty('--pointer-y', `${y * 20}px`);
    visual.current.style.setProperty('--rotate-y', `${x * 16}deg`);
    visual.current.style.setProperty('--rotate-x', `${y * -12}deg`);
  };
  const reset = () => {
    setPaused(false);
    if (!visual.current) return;
    ['--pointer-x', '--pointer-y', '--rotate-x', '--rotate-y'].forEach(v => visual.current.style.removeProperty(v));
  };
  const go = delta => setIndex(i => (i + delta + slides.length) % slides.length);
  return <section className="ks-hero" aria-label="Kanto TCG Store">
    <div className="ks-hero-pattern" aria-hidden="true" />
    <div className="ks-hero-backdrops" aria-hidden="true">{slides.map((s, i) => <div className={`ks-hero-backdrop ${index === i ? 'is-active' : ''}`} key={s.bg}><img src={s.bg} alt="" /></div>)}</div>
    <div className="ks-wide ks-hero-inner">
      <div className="ks-hero-copy">
        <span className="ks-eyebrow"><span className="ks-star">✦</span> TU AVENTURA TCG COMIENZA AQUÍ</span>
        <h1>EL PODER DE <em>COLECCIONAR</em> ESTÁ EN TUS MANOS<span className="ks-period">.</span></h1>
        <p>Cartas legendarias, sobres llenos de sorpresas y colecciones que merecen algo especial. Encuentra tu próxima gran carta.</p>
        <div className="ks-hero-buttons">
          <a className="ks-btn ks-btn-primary" href="#catalogo">Explorar la tienda <span>↗</span></a>
          <a className="ks-btn ks-btn-outline" href="#categorias">Ver categorías <span>→</span></a>
        </div>
        <div className="ks-hero-social"><div className="ks-mini-icons"><span>⚡</span><span>🔥</span><span>✨</span></div><div><strong>Tu universo TCG, en un solo lugar</strong><small>Explora • Elige • Colecciona</small></div></div>
      </div>
      <div className="ks-hero-visual" ref={visual} role="region" aria-roledescription="carrusel" aria-label="Cartas destacadas" tabIndex="0" onPointerMove={move} onPointerEnter={() => setPaused(true)} onPointerLeave={reset} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} onKeyDown={e => { if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); }}>
        <div className="ks-hero-orbit ks-orbit-a" aria-hidden="true"/><div className="ks-hero-orbit ks-orbit-b" aria-hidden="true"/>
        {slides.map((s, i) => <div className={`ks-hero-slide ${i === index ? 'is-active' : ''}`} key={s.card} aria-hidden={i !== index}>
          <div className="ks-hero-card-float"><img className="ks-hero-card-image" src={s.card} alt={i === index ? s.name : ''} draggable="false" /></div>
          <div className="ks-hero-card-label"><small>✦ {s.tag}</small><strong>{s.name}</strong><span>{s.line}</span></div>
        </div>)}
        <div className="ks-carousel-controls"><button type="button" aria-label="Carta anterior" onClick={() => go(-1)}>←</button><div className="ks-dots">{slides.map((_, i) => <button key={i} aria-label={`Ver carta ${i + 1}`} aria-current={index === i ? 'true' : undefined} className={index === i ? 'active' : ''} onClick={() => setIndex(i)} />)}</div><button type="button" aria-label="Siguiente carta" onClick={() => go(1)}>→</button></div>
      </div>
    </div>
    <span className="ks-hero-scroll">DESLIZA PARA EXPLORAR <span>↓</span></span>
  </section>;
}
