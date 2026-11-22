import { useEffect, useState, useRef } from 'react';
import PaymentIcon from './PaymentIcon.jsx';

// Solo se anuncian servicios presentes en Kanto Store. PayPal sigue en Sandbox.
const servicios = [
  { kind: 'paypal', title: 'PayPal', note: 'Solo pagos de prueba (Sandbox)', tag: 'PAGO DE PRUEBA' },
  { kind: 'qr', title: 'QR bancario', note: 'Comprobante sujeto a verificación', tag: 'PAGO' },
  { kind: 'bank', title: 'Transferencia', note: 'Depósito bancario con comprobante', tag: 'PAGO' },
  { kind: 'cash', title: 'Contra entrega', note: 'Según modalidad de entrega', tag: 'PAGO' },
  { kind: 'delivery', title: 'Envío a domicilio', note: 'Seguimiento de tu pedido', tag: 'ENVÍO' },
  { kind: 'pickup', title: 'Retiro en tienda', note: 'Recoge tu compra confirmada', tag: 'RETIRO' },
  { kind: 'pin', title: 'PIN de seguridad', note: 'Código de confirmación al recibir', tag: 'SEGURIDAD' },
  { kind: 'package', title: 'Empaque verificado', note: 'Revisión de cada producto', tag: 'PREPARACIÓN' },
];

export default function PaymentShippingCarousel() {
  const [start, setStart] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [inView, setInView] = useState(true);
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const [reduceMotion, setReduceMotion] = useState(false);
  const touchX = useRef(null);
  useEffect(() => {
    const visibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', visibility);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduceMotion(motion.matches);
    change(); motion.addEventListener?.('change', change);
    return () => { document.removeEventListener('visibilitychange', visibility); motion.removeEventListener?.('change', change); };
  }, []);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) { setInView(true); return; }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!playing || !visible || !inView || reduceMotion) return;
    const timer = setInterval(() => setStart(i => (i + 1) % servicios.length), 3900);
    return () => clearInterval(timer);
  }, [playing, visible, inView, reduceMotion]);
  const move = delta => setStart(i => (i + delta + servicios.length) % servicios.length);
  // Rotación circular real: las ocho fichas y sus ocho indicadores son alcanzables.
  const visibles = Array.from({ length: 4 }, (_, i) => servicios[(start + i) % servicios.length]);
  return <section ref={sectionRef} className="ks-payments" aria-label="Medios de pago, preparación y envíos">
    <div className="ks-wide ks-payments-inner">
      <div className="ks-payments-heading"><span className="ks-payments-kicker">✦ PAGO · PREPARACIÓN · ENVÍO</span><strong>UNA COMPRA TRANQUILA, DE PRINCIPIO A FIN.</strong><small>Avanza automáticamente cada 4 segundos · usa las flechas</small></div>
      <div className="ks-payments-slider">
        <button type="button" className="ks-payments-arrow" aria-label="Servicio anterior" onClick={() => move(-1)}>‹</button>
        <div className="ks-payments-window" onTouchStart={e => { touchX.current = e.touches[0]?.clientX ?? null; }} onTouchEnd={e => { if (touchX.current === null) return; const diff = e.changedTouches[0].clientX - touchX.current; if (Math.abs(diff) > 35) move(diff < 0 ? 1 : -1); touchX.current = null; }}>
          <div className="ks-payments-list" key={start} aria-live="off">
            {visibles.map(s => <div className={`ks-payments-item ks-payment-${s.kind}`} key={s.kind}>
              <span className="ks-payments-item-icon" aria-hidden="true"><PaymentIcon name={s.kind} size={36}/></span>
              <div><small>{s.tag}</small><strong>{s.title}</strong><span>{s.note}</span></div>
            </div>)}
          </div>
        </div>
        <button type="button" className="ks-payments-arrow" aria-label="Servicio siguiente" onClick={() => move(1)}>›</button>
      </div>
      <div className="ks-payments-progress" role="group" aria-label="Navegación de servicios">{servicios.map((s,i) => <button type="button" key={s.kind} className={i===start?'is-on':''} aria-current={i===start?'true':undefined} aria-label={`Ver ${s.title}`} onClick={() => setStart(i)}/>)}<button className="ks-payments-play" type="button" aria-label={playing ? 'Pausar carrusel de servicios' : 'Reanudar carrusel de servicios'} aria-pressed={!playing} onClick={() => setPlaying(v => !v)}>{playing ? 'Ⅱ Pausar' : '▶ Reanudar'}</button></div>
      <p className="ks-payments-note">PayPal está configurado para pruebas Sandbox. QR y transferencia requieren datos reales y revisión de comprobantes antes de aprobar pagos.</p>
    </div>
  </section>;
}
