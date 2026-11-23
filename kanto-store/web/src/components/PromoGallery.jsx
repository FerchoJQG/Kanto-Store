import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './zz-f10-fixes.css';

const examples = [
  {id:'coleccion-delta',titulo:'MEGA-GOLISOPOD ex',descripcion:'Descubre la colección Dominio Delta.',imagen:'/assets/carrusel/mega-golisopod-ex-limpia.png',enlace:'/#catalogo',activa:true,destacada:true},
  {id:'coleccion-oscura',titulo:'MEGA-DARKRAI ex',descripcion:'Explora la intensidad de Oscuridad Absoluta.',imagen:'/assets/carrusel/oa-darkrai-card.png',enlace:'/#catalogo',activa:true,destacada:true},
  {id:'coleccion-charizard',titulo:'CHARIZARD ex',descripcion:'Cartas que encienden tu colección.',imagen:'/assets/carrusel/charizard-ex-limpia.png',enlace:'/#catalogo',activa:true,destacada:true},
];
const MAX_SHOW=8;
export default function PromoGallery({promos = []}) {
 const active=(Array.isArray(promos)?promos:[]).filter(x=>x && x.activa).slice(0,MAX_SHOW);
 // Si hay solo una promoción, alternarla con cartas del ZIP: evita una imagen inmóvil de gran tamaño.
 const slides=active.length >= 3?active:[...active,...examples].slice(0,MAX_SHOW);
 const [index,setIndex]=useState(0);
 const [playing,setPlaying]=useState(true);
 const [modal,setModal]=useState(false);
 const [reduce,setReduce]=useState(false);
 const [pageVisible,setPageVisible]=useState(true);
 const [inView,setInView]=useState(false);
 const node=useRef(null);
 const touchX=useRef(null);
 const length=slides.length;
 const current=slides[index % length] || examples[0];
 useEffect(()=>{setIndex(0);},[promos]);
 useEffect(()=>{
   const m=window.matchMedia('(prefers-reduced-motion: reduce)');const onChange=()=>setReduce(m.matches);onChange();m.addEventListener?.('change',onChange);
   const onVis=()=>setPageVisible(!document.hidden);onVis();document.addEventListener('visibilitychange',onVis);
   const obs='IntersectionObserver' in window ? new IntersectionObserver(([entry])=>setInView(entry.isIntersecting),{threshold:.06}):null;
   if(obs&&node.current)obs.observe(node.current);if(!obs)setInView(true);
   return ()=>{m.removeEventListener?.('change',onChange);document.removeEventListener('visibilitychange',onVis);obs?.disconnect();};
 },[]);
 useEffect(()=>{
   if(!playing||!inView||!pageVisible||reduce||modal||length<2)return;
   const timer=setInterval(()=>setIndex(i=>(i+1)%length),5400);
   return ()=>clearInterval(timer);
 },[playing,inView,pageVisible,reduce,modal,length]);
 // Solo una aparición automática por sesión en inicio, sin interrumpir si hay otro diálogo abierto.
 useEffect(()=>{
   if(!pageVisible || reduce || !active.length)return;
   let seen=true;try{seen=sessionStorage.getItem('kanto-promo-v10-seen')==='1';}catch{}
   if(seen)return;
   const t=setTimeout(()=>{
     if(document.hidden||document.querySelector('dialog[open], [role="dialog"], .modal, .ks-cart-drawer.is-open'))return;
     setModal(true);try{sessionStorage.setItem('kanto-promo-v10-seen','1');}catch{}
   },9500);
   return ()=>clearTimeout(t);
 },[active.length,pageVisible,reduce]);
 useEffect(()=>{
   if(!modal)return;
   const prev=document.activeElement;
   const escape=e=>{if(e.key==='Escape')setModal(false);};
   window.addEventListener('keydown',escape);
   document.body.style.overflow='hidden';
   return ()=>{window.removeEventListener('keydown',escape);document.body.style.overflow='';prev?.focus?.();};
 },[modal]);
 const go=d=>setIndex(i=>(i+d+length)%length);
 const media=(p,expanded=false)=>p?.video && /^https:\/\//i.test(p.video)?
  <video className="kanto-v10-promo-video" src={p.video} poster={p.imagen||undefined} controls={expanded} autoPlay={expanded} muted playsInline loop={expanded} preload="metadata" onError={e=>{e.currentTarget.style.display='none';}}/>:
  <img className="kanto-v10-promo-art" src={p?.imagen||examples[0].imagen} alt={p?.titulo||'Promoción Kanto Store'} loading="lazy" decoding="async" onError={e=>{e.currentTarget.src=examples[0].imagen;}}/>;
 return <section ref={node} className="kanto-v10-promos" aria-label="Promociones y cartas destacadas">
   <div className="kanto-v10-promo-head"><span>✦ EDICIÓN KANTO</span><h2>PROMOCIONES <em>Y NOVEDADES</em></h2><p>Conoce nuestras promociones y descubre cartas destacadas. Cada presentación muestra la imagen completa, sin cortes.</p></div>
   <div className="kanto-v10-promo-stage" tabIndex={0} role="region" aria-roledescription="carrusel" aria-label="Promociones de Kanto Store" onKeyDown={e=>{if(e.key==='ArrowLeft'){e.preventDefault();go(-1)}if(e.key==='ArrowRight'){e.preventDefault();go(1)}}}
     onTouchStart={e=>{touchX.current=e.touches[0]?.clientX??null}} onTouchEnd={e=>{if(touchX.current==null)return;const diff=e.changedTouches[0].clientX-touchX.current;touchX.current=null;if(Math.abs(diff)>40)go(diff<0?1:-1)}}>
     <div className="kanto-v10-promo-image" key={current.id||index}>
       <div className="kanto-v10-promo-glow" aria-hidden="true" style={current.imagen?{backgroundImage:`url(${current.imagen})`}:undefined}/>
       {media(current)}
     </div>
     <div className="kanto-v10-promo-info"><small>{current.destacada?'✦ CARTA DESTACADA':'✦ PROMOCIÓN DE LA TIENDA'}</small><h3>{current.titulo}</h3><p>{current.descripcion||'Descubre novedades en Kanto TCG Store.'}</p><div className="kanto-v10-promo-actions"><button type="button" onClick={()=>setModal(true)}>VER CARTA / VIDEO <span>↗</span></button><Link to={current.enlace || '/#catalogo'}>VER EN TIENDA</Link></div></div>
   </div>
   <div className="kanto-v10-promo-control"><button type="button" onClick={()=>go(-1)} aria-label="Anterior promoción">←</button><span>{index%length+1} / {length}</span><button type="button" onClick={()=>go(1)} aria-label="Siguiente promoción">→</button><button type="button" onClick={()=>setPlaying(v=>!v)} aria-pressed={!playing}>{playing?'Ⅱ Pausar':'▶ Reanudar'}</button></div>
   {modal && <div className="kanto-v10-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}} role="presentation"><div className="kanto-v10-promo-modal" role="dialog" aria-modal="true" aria-label="Detalle de promoción" tabIndex={-1}>
     <button className="kanto-v10-close" onClick={()=>setModal(false)} aria-label="Cerrar promoción">×</button>
     <div className="kanto-v10-modal-image"><span className="kanto-v10-modal-ring"/>{media(current,true)}</div>
     <div className="kanto-v10-modal-text"><small>✦ KANTO TCG · PROMOCIONES</small><h2>DESCUBRE TU <em>PRÓXIMA CARTA</em></h2><h3>{current.titulo}</h3><p>{current.descripcion || 'Conoce cartas especiales para tu colección.'}</p><div className="kanto-v10-modal-buttons"><button type="button" onClick={()=>go(-1)}>❮</button><span>{index%length+1} / {length}</span><button type="button" onClick={()=>go(1)}>❯</button><Link onClick={()=>setModal(false)} to={current.enlace||'/#catalogo'}>EXPLORAR ↗</Link></div></div>
   </div></div>}
 </section>;
}
