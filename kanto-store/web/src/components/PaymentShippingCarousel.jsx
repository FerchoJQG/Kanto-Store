import { useState } from 'react';
import './zz-f10-payments.css';
import './zz-f10-fixes.css';

// Se copian los logos del ZIP original. Son ilustrativos y NO habilitan cobros.
const brands = [
  ['tether','Tether (USDT)','tether.png'],
  ['bitcoin','Bitcoin','bitcoin.png'],
  ['ethereum','Ethereum','ethereum.png'],
  ['paypal','PayPal','paypal.png'],
  ['visa','Visa','visa.png'],
  ['mastercard','Mastercard','mastercard.png'],
  ['applepay','Apple Pay','applepay.png'],
  ['qr','QR ilustrativo','qr.png'],
  ['mercadopago','Mercado Pago','mercadopago.png'],
  ['bolivia','Bolivia','bolivia.png'],
  ['argentina','Argentina','argentina.png']
];
function Logos({ duplicate = false }) {
  return <div className="payment-marquee-set" aria-hidden={duplicate?'true':undefined}>{brands.map(([key,name,asset])=>
    <span className="payment-marquee-item" data-brand={key} title={name} key={key}>
      <img src={`/assets/payment-logos/${asset}`} className="payment-brand-logo" alt={duplicate?'':name} loading="lazy" decoding="async" width={140} height={54} draggable="false"
        onError={e=>{e.currentTarget.hidden=true; if(e.currentTarget.nextSibling)e.currentTarget.nextSibling.hidden=false;}} />
      <span hidden className="payment-brand-fallback">{name}</span>
    </span>
  )}</div>;
}
export default function PaymentShippingCarousel() {
  const [pause,setPause] = useState(false);
  return <section className={`payment-showcase kanto-f10-payment ${pause?'is-paused':''}`} aria-labelledby="payment-showcase-title">
    <div className="payment-showcase-header"><h2 id="payment-showcase-title">MEDIOS Y PLATAFORMAS DE PAGO</h2><button type="button" onClick={()=>setPause(v=>!v)} className="kanto-f10-marquee-toggle" aria-pressed={pause}>{pause?'▶ Reanudar movimiento':'Ⅱ Pausar movimiento'}</button></div>
    <div className="payment-marquee" aria-label="Logotipos de plataformas y banderas en movimiento"><div className="payment-marquee-track"><Logos/><Logos duplicate /></div></div>
    <p className="payment-showcase-note">Galería ilustrativa de marcas. Solo están habilitados los métodos de pago configurados en la caja de Kanto Store.</p>
  </section>;
}
