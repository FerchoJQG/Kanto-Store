import { useRef } from 'react';
import './zz-f10-categories.css';
import './zz-f10-fixes.css';

const cats = [
 {id:'cartas',className:'category-cards',tip:'COLECCIONA TUS FAVORITAS',title:['CARTAS','SUELTAS'],label:'EXPLORAR COLECCIÓN',image:'/assets/categories/carta-darkrai-ex.png',symbol:'✧',filter:['single','','']},
 {id:'sobres',className:'category-packs',tip:'DESCUBRE LA SORPRESA',title:['SOBRES'],label:'ABRE LA AVENTURA',image:'/assets/categories/sobre-dominio-delta.webp',symbol:'✳',filter:['sellado','sobre','']},
 {id:'booster',className:'category-boxes',tip:'LLEVA TU COLECCIÓN MÁS LEJOS',title:['BOOSTER','BOXES'],label:'VER BOOSTER BOXES',image:'/assets/categories/booster-oscuridad-absoluta.webp',symbol:'⬡',filter:['sellado','caja','booster']},
 {id:'etb',className:'category-etb',tip:'PARA VERDADEROS ENTRENADORES',title:['ELITE','TRAINER BOX'],label:'VER ELITE TRAINER BOX',image:'/assets/categories/etb-dominio-delta.webp',symbol:'✷',filter:['sellado','caja','etb']},
];
export default function AdventureCategories({onSelect}) {
 const currentFrame=useRef(new Map());
 const pointer = (e,id) => {
   if(e.pointerType==='touch'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
   const node=e.currentTarget;
   if(currentFrame.current.has(id))return;
   const bounds=node.getBoundingClientRect();
   const x=Math.max(-1,Math.min(1,(e.clientX-bounds.left)/bounds.width*2-1));
   const y=Math.max(-1,Math.min(1,(e.clientY-bounds.top)/bounds.height*2-1));
   const raf=requestAnimationFrame(()=>{
     currentFrame.current.delete(id);
     if(!node.isConnected)return;
     node.style.setProperty('--rot-y',`${x*5}deg`);node.style.setProperty('--rot-x',`${-y*5}deg`);
     node.style.setProperty('--adventure-x',`${(x+1)*50}%`);node.style.setProperty('--adventure-y',`${(y+1)*50}%`);
   });currentFrame.current.set(id,raf);
 };
 const leave=(e,id)=>{const raf=currentFrame.current.get(id);if(raf)cancelAnimationFrame(raf);currentFrame.current.delete(id);e.currentTarget.style.setProperty('--rot-x','0deg');e.currentTarget.style.setProperty('--rot-y','0deg');};
 return <section id="categorias" className="categories-section section-space" aria-labelledby="adventure-heading">
   <div className="adventure-grid-pattern" aria-hidden="true"/><div className="adventure-ambient adventure-ambient-a" aria-hidden="true"/><div className="adventure-ambient adventure-ambient-b" aria-hidden="true"/>
   <div className="wrap adventure-wrap ks-wide"><div className="section-head adventure-heading"><div className="adventure-heading-main"><div className="section-kicker">✦ ELIGE TU AVENTURA</div><h2 id="adventure-heading"><span className="adventure-title-a">EXPLORA EL</span> <em className="adventure-title-b">UNIVERSO TCG</em></h2><p>Cuatro caminos, miles de cartas — <strong>tu próxima colección comienza aquí.</strong></p><span className="adventure-title-underline" aria-hidden="true"/></div><a className="subtle-link adventure-all-link" href="#catalogo" onClick={()=>onSelect('','','')}>VER TODOS LOS PRODUCTOS ↗</a></div>
   <div className="category-grid adventure-categories">{cats.map(c => <button key={c.id} type="button" className={`category-card ${c.className}`} aria-label={`Explorar ${c.title.join(' ')}`} onPointerMove={e=>pointer(e,c.id)} onPointerLeave={e=>leave(e,c.id)} onClick={()=>onSelect(...c.filter)}>
     <span className="adventure-spotlight" aria-hidden="true"/><span className="adventure-foil" aria-hidden="true"/>
     <span className={`adventure-card-art adventure-product-art ${c.id==='cartas'?'adventure-art-single':c.id==='sobres'?'adventure-art-pack':c.id==='booster'?'adventure-art-box':'adventure-art-etb'}`} aria-hidden="true"><img src={c.image} alt="" loading="lazy" draggable="false"/></span>
     <span className="adventure-card-copy"><small>{c.tip}</small><strong>{c.title.map((t,i)=><span key={i}>{i>0&&<br/>}{t}</span>)}</strong><span className="adventure-card-link">{c.label} <b>↗</b></span></span>
     <span className="adventure-card-particle" aria-hidden="true">{c.symbol}</span>
   </button>)}</div></div>
 </section>;
}
