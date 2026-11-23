import { useEffect, useRef, useState } from 'react';
import './zz-f10-card-showcase.css';
import './zz-f10-fixes.css';
import './zz-f11-stability.css';

const cards = [
  {name:'Mega-Darkrai ex',set:'Oscuridad Absoluta · Carta destacada',src:'/assets/carrusel/oa-darkrai-card.png'},
  {name:'Mega-Chandelure ex',set:'Oscuridad Absoluta · Carta destacada',src:'/assets/carrusel/oa-chandelure-card.png'},
  {name:'Mega-Golisopod ex',set:'Dominio Delta · Carta destacada',src:'/assets/carrusel/mega-golisopod-ex-limpia.png'},
  {name:'Charizard ex',set:'Llamas Obsidianas · Carta destacada',src:'/assets/carrusel/charizard-ex-limpia.png'}
];
export default function FeaturedCards() {
  const [index,setIndex] = useState(0);
  const [playing,setPlaying] = useState(true);
  const [visible,setVisible] = useState(false);
  const [focus,setFocus] = useState(false);
  const [reduce,setReduce] = useState(false);
  const [docVisible,setDocVisible] = useState(true);
  const el = useRef(null);
  const touchX = useRef(null);
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>setReduce(media.matches);
    const visibility=()=>setDocVisible(!document.hidden);
    update();visibility();media.addEventListener?.('change',update);document.addEventListener('visibilitychange',visibility);
    const obs='IntersectionObserver' in window ? new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{threshold:.05}):null;
    if(obs&&el.current)obs.observe(el.current);if(!obs)setVisible(true);
    return ()=>{media.removeEventListener?.('change',update);document.removeEventListener('visibilitychange',visibility);obs?.disconnect();};
  },[]);
  useEffect(()=>{
    if(!visible||!playing||reduce||!docVisible||focus)return;
    const timer=setInterval(()=>setIndex(i=>(i+1)%cards.length),5200);
    return ()=>clearInterval(timer);
  },[visible,playing,reduce,docVisible,focus]);
  const go = delta=>setIndex(i=>(i+delta+cards.length)%cards.length);
  function distance(i){let d=(i-index+cards.length)%cards.length;if(d>cards.length/2)d-=cards.length;return d;}
  return <section ref={el} id="presentaciones" className="tcg-showcase kanto-f11-showcase" aria-labelledby="tcg-showcase-title"><div className="tcg-showcase-wrap">
    <p className="tcg-showcase-kicker">✦ SELECCIÓN KANTO</p>
    <h2 id="tcg-showcase-title">CARTAS QUE <em>ROBAN MIRADAS</em></h2>
    <p className="tcg-showcase-lead">Desde megavoluciones impactantes hasta tus Pokémon favoritos — descubre una nueva carta en cada movimiento.</p>
    <div className="tcg-showcase-stage" role="region" aria-roledescription="carrusel" aria-label="Galería 3D de cartas" tabIndex={0}
      onKeyDown={e=>{if(e.key==='ArrowLeft'){e.preventDefault();go(-1);}if(e.key==='ArrowRight'){e.preventDefault();go(1);}}}
      onFocus={()=>setFocus(true)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocus(false);}}
      onTouchStart={e=>{touchX.current=e.touches[0]?.clientX??null;}} onTouchEnd={e=>{if(touchX.current==null)return;const dx=e.changedTouches[0].clientX-touchX.current;touchX.current=null;if(Math.abs(dx)>45)go(dx<0?1:-1);}}>
      {cards.map((c,i)=>{const d=distance(i);const cls=d===0?'is-center':d<0?`is-left-${-d}`:`is-right-${d}`;return <button key={c.src} type="button" className={`tcg-showcase-card ${cls}`} aria-hidden={Math.abs(d)>2} tabIndex={Math.abs(d)>2?-1:0} aria-label={`Mostrar ${c.name}`} aria-current={d===0?'true':undefined} onClick={()=>setIndex(i)}><span className="tcg-showcase-card-inner"><img src={c.src} alt={c.name} loading="lazy" decoding="async" draggable="false" /></span></button>;})}
    </div>
    <div className="tcg-showcase-controls"><button type="button" aria-label="Carta anterior" onClick={()=>go(-1)}>❮</button><span className="tcg-showcase-counter">{index+1} de {cards.length}</span><button type="button" aria-label="Carta siguiente" onClick={()=>go(1)}>❯</button><button type="button" className="kanto-f10-gallery-play" onClick={()=>setPlaying(v=>!v)} aria-pressed={!playing}>{playing?'Ⅱ Pausar':'▶ Reanudar'}</button></div>
    <div className="tcg-showcase-meta" aria-live="off"><strong>{cards[index].name}</strong><span>{cards[index].set}</span></div>
    <div className="tcg-showcase-footer"><a className="tcg-showcase-cta" href="#catalogo">EXPLORAR CARTAS ↗</a></div>
  </div></section>;
}
