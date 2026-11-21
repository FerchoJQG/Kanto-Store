import { useEffect, useState } from 'react';

// Mostrar únicamente los medios y modalidades que implementa Kanto Store.
// PayPal está en SANDBOX: no anunciarlo como cobro real habilitado.
const servicios = [
  { icon: '🅿', title: 'PayPal', note: 'Modo de pruebas Sandbox', kind: 'paypal', tag: 'PAGO DE PRUEBA' },
  { icon: '▦', title: 'QR bancario', note: 'Con comprobante verificable', kind: 'qr', tag: 'PAGO' },
  { icon: '▤', title: 'Transferencia', note: 'Depósito y comprobante', kind: 'banco', tag: 'PAGO' },
  { icon: '◈', title: 'Contra entrega', note: 'Disponible según el envío', kind: 'cash', tag: 'PAGO' },
  { icon: '🚚', title: 'Envío a domicilio', note: 'Preparación y seguimiento', kind: 'envio', tag: 'ENTREGA' },
  { icon: '🏪', title: 'Retiro en tienda', note: 'Recoge tu pedido confirmado', kind: 'retiro', tag: 'ENTREGA' },
  { icon: '🔐', title: 'PIN de seguridad', note: 'Confirma al recibir tu compra', kind: 'pin', tag: 'SEGURIDAD' },
  { icon: '📦', title: 'Empaque verificado', note: 'Revisión antes de entregar', kind: 'empaque', tag: 'PROCESO' },
];
const viewSize = 4;

export default function PaymentShippingCarousel() {
  const [start, setStart] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(m.matches);
    update();
    m.addEventListener?.('change', update);
    return () => m.removeEventListener?.('change', update);
  }, []);
  useEffect(() => {
    if (paused || reduced) return;
    const timer = window.setInterval(() => setStart(i => (i + 1) % servicios.length), 5200);
    return () => window.clearInterval(timer);
  }, [paused, reduced]);
  const move = delta => setStart(i => (i + delta + servicios.length) % servicios.length);
  const visibles = Array.from({ length: viewSize }, (_, i) => servicios[(start + i) % servicios.length]);
  return (
    <section className="ks-payments" aria-label="Información de pagos y entregas" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false); }}>
      <div className="ks-wide ks-payments-inner">
        <div className="ks-payments-heading"><span className="ks-payments-kicker">✦ PAGO · PREPARACIÓN · ENVÍO</span><strong>UNA COMPRA TRANQUILA, DE PRINCIPIO A FIN.</strong><small>Desliza para conocer cómo funciona tu pedido</small></div>
        <div className="ks-payments-slider">
          <button type="button" className="ks-payments-arrow" aria-label="Medio anterior" onClick={() => move(-1)}>‹</button>
          <div className="ks-payments-window" aria-live="off">
            <div className="ks-payments-list" key={start}>
              {visibles.map((s, i) => <div key={`${start}-${s.kind}`} className={`ks-payments-item ks-payment-${s.kind}`}>
                <span className="ks-payments-item-icon" aria-hidden="true">{s.icon}</span><div><small>{s.tag}</small><strong>{s.title}</strong><span>{s.note}</span></div>
              </div>)}
            </div>
          </div>
          <button type="button" className="ks-payments-arrow" aria-label="Medio siguiente" onClick={() => move(1)}>›</button>
        </div>
        <div className="ks-payments-progress" role="group" aria-label="Posición del carrusel">{servicios.map((s,i)=><button type="button" key={s.kind} className={i === start?'is-on':''} aria-label={`Mostrar ${s.title}`} aria-current={i===start?'true':undefined} onClick={()=>setStart(i)} />)}</div>
        <p className="ks-payments-note">PayPal funciona actualmente en modo de pruebas (Sandbox). QR y transferencia requieren datos bancarios reales configurados y verificación del comprobante.</p>
      </div>
    </section>
  );
}
