import { useEffect, useRef, useState } from 'react';
import './zz-f10-cinematic.css';
import './zz-f10-fixes.css';
import './zz-f11-stability.css';

// Reproducción React de la portada cinematográfica del ZIP suministrado.
// La compra, productos y rutas continúan perteneciendo al React/MySQL de Kanto.
const SLIDES = [
  { name:'Mega-Golisopod ex', bg:'/assets/carrusel/fondo-1.webp', card:'/assets/carrusel/mega-golisopod-ex-limpia.png', logo:'/assets/collection-logos/me06-logo.png', logoType:'delta', seal:'MEGA EVOLUCIÓN · KANTO TCG', sub:'Descubre a Mega-Golisopod ex y las cartas más impactantes de nuestra tienda', theme:'' },
  { name:'Megaevolución Oscuridad Absoluta', bg:'/assets/carrusel/oa-darkrai-bg.jpg', card:'/assets/carrusel/oa-darkrai-card.png', secondary:'/assets/carrusel/oa-chandelure-card.png', logo:'/assets/collection-logos/oa-logo.png', logoType:'oscuridad', seal:'MEGA EVOLUCIÓN · KANTO TCG', sub:'Explora cartas, sobres y colecciones con una estética oscura e intensa', theme:'oscuridad' },
  { name:'Charizard ex', bg:'/assets/carrusel/fondo-2.webp', card:'/assets/carrusel/charizard-ex-limpia.png', logo:'/assets/collection-logos/obf-logo.png', logoType:'obsidianas', seal:'ESCARLATA Y PÚRPURA · KANTO TCG', sub:'Descubre el poder de Charizard ex y las cartas más ardientes de tu colección', theme:'escarlata' }
];
const SLOW_MS = 7000;
export default function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reduce, setReduce] = useState(false);
  const [docVisible, setDocVisible] = useState(true);
  const el = useRef(null);
  const frame = useRef(null);
  const touch = useRef(null);
  useEffect(() => {
    const onVis = () => setDocVisible(!document.hidden);
    onVis(); document.addEventListener('visibilitychange', onVis);
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onReduce = () => setReduce(media.matches);
    onReduce(); media.addEventListener?.('change', onReduce);
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {threshold:.05}) : null;
    if (observer && el.current) observer.observe(el.current);
    return () => { document.removeEventListener('visibilitychange', onVis); media.removeEventListener?.('change', onReduce); observer?.disconnect(); if(frame.current) cancelAnimationFrame(frame.current); };
  }, []);
  useEffect(() => {
    if(paused || !visible || !docVisible || reduce) return;
    const t = window.setInterval(() => setIndex(i => (i+1)%SLIDES.length), SLOW_MS);
    return () => clearInterval(t);
  }, [paused,visible,docVisible,reduce]);
  const move = delta => setIndex(i => (i+delta+SLIDES.length)%SLIDES.length);
  const parallax = event => {
    if(reduce || paused || event.pointerType === 'touch' || !el.current || frame.current) return;
    const stage = el.current.querySelector('.cinematic-stage');
    if(!stage) return;
    const box = stage.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (event.clientX-box.left)/box.width*2-1));
    const y = Math.max(-1, Math.min(1, (event.clientY-box.top)/box.height*2-1));
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      if(!el.current) return;
      el.current.style.setProperty('--pan-x', `${(-x*9).toFixed(1)}px`);
      el.current.style.setProperty('--pan-y', `${(-y*7).toFixed(1)}px`);
      el.current.style.setProperty('--card-rotate-x', `${(y*5).toFixed(1)}deg`);
      el.current.style.setProperty('--card-rotate-y', `${(-x*7).toFixed(1)}deg`);
      el.current.style.setProperty('--card-shift-x', `${(x*9).toFixed(1)}px`);
      el.current.style.setProperty('--card-shift-y', `${(y*8).toFixed(1)}px`);
    });
  };
  const reset = () => {
    if(frame.current) cancelAnimationFrame(frame.current);
    frame.current=null;
    ['--pan-x','--pan-y','--card-rotate-x','--card-rotate-y','--card-shift-x','--card-shift-y'].forEach(prop => el.current?.style.removeProperty(prop));
  };
  const s = SLIDES[index];
  return <section ref={el} className={`cinematic-hero kanto-f10-hero kanto-f11-hero ${paused || reduce ? 'is-motion-paused' : ''}`} data-theme={s.theme} aria-label="Portada cinematográfica Kanto TCG">
    <div className="cinematic-stage" role="region" aria-roledescription="carrusel" aria-label="Colecciones destacadas" tabIndex={0}
      onPointerMove={parallax} onPointerLeave={reset}
      onKeyDown={e => {if(e.key === 'ArrowLeft'){e.preventDefault();move(-1);} if(e.key === 'ArrowRight'){e.preventDefault();move(1);}}}
      onTouchStart={e=>{touch.current = e.touches[0]?.clientX ?? null;}} onTouchEnd={e=>{if(touch.current==null)return; const dx=e.changedTouches[0].clientX-touch.current;touch.current=null;if(Math.abs(dx)>45)move(dx<0?1:-1);}}>
      <div className="cinematic-backdrops" aria-hidden="true">{SLIDES.map((a,i) => <div key={a.bg} className={`cinematic-scene ${index===i?'is-active':''}`} data-hero-bg={i}><img src={a.bg} alt="" decoding="async" loading={i===0?'eager':'lazy'} /></div>)}</div>
      <div className="cinematic-vignette" aria-hidden="true"/><div className="cinematic-copy-shade" aria-hidden="true"/>
      <div className="cinematic-stage-top"><button type="button" className="cinematic-motion" onClick={()=>setPaused(v=>!v)} aria-pressed={paused}><span className="cinematic-motion-label">{paused?'Reanudar movimiento':'Reducir movimiento'}</span><span className="cinematic-switch" aria-hidden="true"/></button></div>
      <div className="cinematic-slides" aria-hidden="true">{SLIDES.map((a,i)=><div key={a.card} className={`cinematic-slide ${i===index?'is-active':''}`} data-hero-slide={i}>
        {a.secondary ? <div className="cinematic-card-stack"><div className="cinematic-card cinematic-card-behind"><img src={a.secondary} alt="" draggable="false"/></div><div className="cinematic-card cinematic-card-infront"><img src={a.card} alt="" draggable="false"/></div></div>
          : <div className="cinematic-card cinematic-card-primary"><img className="cinematic-card-image" src={a.card} alt="" draggable="false" loading={i===0?'eager':'lazy'}/></div>}
      </div>)}</div>
      <div className="cinematic-hero-copy"><h2 className="cinematic-hero-headline"><span>EL PODER DE</span><span className="cinematic-hero-highlight">COLECCIONAR</span><span>ESTÁ EN TUS MANOS</span></h2><p className="cinematic-hero-description">Cartas legendarias, sobres llenos de sorpresas y colecciones que merecen algo especial — encuentra tu próxima gran carta</p></div>
      <div className="cinematic-stage-bottom"><div className="cinematic-controls" aria-label="Controles del carrusel"><button type="button" className="cinematic-arrow" aria-label="Anterior colección" onClick={()=>move(-1)}>❮</button><div className="cinematic-dots">{SLIDES.map((a,i)=><button type="button" key={i} className={`cinematic-dot ${i===index?'is-active':''}`} aria-label={`Ver ${a.name}`} aria-current={i===index?'true':undefined} onClick={()=>setIndex(i)}/>)}</div><button type="button" className="cinematic-arrow" aria-label="Siguiente colección" onClick={()=>move(1)}>❯</button></div></div>
    </div>
    <div className="cinematic-titleband"><span className="cinematic-sidebeam cinematic-sidebeam-left" aria-hidden="true"/><div className="cinematic-title-wrap"><span className="cinematic-suptitle">{s.seal}</span><h1 className="cinematic-title has-collection-logo"><img className="cinematic-collection-logo" data-logo-tipo={s.logoType} src={s.logo} alt={s.name} width={526} height={252} draggable="false"/></h1><p className="cinematic-subtitle">{s.sub}</p><a href="#catalogo" className="cinematic-main-cta">EXPLORAR LA TIENDA ↗</a></div><span className="cinematic-sidebeam cinematic-sidebeam-right" aria-hidden="true"/></div>
    <span className="cinematic-sr-only" aria-live="polite">Colección {index+1} de {SLIDES.length}: {s.name}</span>
  </section>;
}
