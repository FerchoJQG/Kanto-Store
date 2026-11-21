import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, bs } from '../api.js';
import { useCart } from '../context.jsx';
import { Img } from './ProductCard.jsx';
import StoreIcon from './StoreIcon.jsx';

export default function CartDrawer() {
  const { cartOpen, closeCart, items, setQty, remove, total, count, sincronizar } = useCart();
  const [avisos, setAvisos] = useState([]);
  const closeRef = useRef(null);
  const previousFocus = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => { if (cartOpen) closeCart(); /* Solo cerrar ante navegación real. */ }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!cartOpen) return;
    previousFocus.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const key = e => {
      if (e.key === 'Escape') return closeCart();
      if (e.key !== 'Tab') return;
      const controls = Array.from(document.querySelectorAll('.ks-drawer button:not(:disabled), .ks-drawer a[href], .ks-drawer input:not(:disabled)'));
      const first = controls[0], last = controls[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus?.();
    };
  }, [cartOpen, closeCart]);
  useEffect(() => {
    if (!cartOpen || !items.length) return;
    setAvisos([]);
    let mounted = true;
    const controller = new AbortController();
    api('/carrito/validar', { method: 'POST', body: { items: items.map(i => ({ producto_id: i.id })) }, signal: controller.signal })
      .then(rows => { if (mounted) setAvisos(sincronizar(rows)); })
      .catch(() => { if (mounted) setAvisos(['No se pudo comprobar el stock. Se verificará de nuevo al confirmar el pedido.']); });
    return () => { mounted = false; controller.abort(); };
  }, [cartOpen]); // La revisión se realiza al abrir, no tras cada actualización del carrito.
  if (!cartOpen) return null;

  return <div className="ks-drawer-overlay" onMouseDown={e => { if (e.target === e.currentTarget) closeCart(); }}>
    <aside className="ks-drawer" role="dialog" aria-modal="true" aria-label="Mi carrito" aria-describedby="ks-drawer-help">
      <header className="ks-drawer-header"><div><small>✦ TU COLECCIÓN</small><h2><StoreIcon name="carrito" size={40}/> MI CARRITO <em>({count})</em></h2><p id="ks-drawer-help">Revisa tus productos antes de comprar.</p></div><button ref={closeRef} type="button" className="ks-drawer-close" onClick={closeCart} aria-label="Cerrar carrito">×</button></header>
      <div className="ks-drawer-scroll">
        {!!avisos.length && <div className="ks-drawer-alerts">{avisos.map((a,i) => <p key={`${i}-${a}`}>{a}</p>)}</div>}
        {!items.length ? <div className="ks-drawer-empty"><StoreIcon name="carrito" size={76}/><h3>Todavía no hay productos</h3><p>Encuentra tu próximo tesoro TCG.</p><button type="button" onClick={closeCart}>EXPLORAR TIENDA ↗</button></div>
          : items.map(i => <article className="ks-drawer-product" key={i.id}>
            <div className="ks-drawer-img"><Img src={i.imagen_url} alt={i.nombre} /></div>
            <div className="ks-drawer-product-info"><strong>{i.nombre}</strong><small>{bs(i.precio)} por unidad · Disponible: {i.stock}</small><div className="ks-drawer-product-bottom"><div className="ks-drawer-qty"><button type="button" onClick={() => setQty(i.id, i.cantidad - 1)} disabled={i.cantidad<=1} aria-label={`Restar una unidad de ${i.nombre}`}>−</button><span>{i.cantidad}</span><button type="button" onClick={() => setQty(i.id, i.cantidad + 1)} disabled={i.cantidad>=i.stock} aria-label={`Agregar una unidad de ${i.nombre}`}>+</button></div><b>{bs(i.precio * i.cantidad)}</b></div></div>
            <button type="button" className="ks-drawer-remove" onClick={() => remove(i.id)} aria-label={`Quitar ${i.nombre}`}>×</button>
          </article>)}
      </div>
      <footer className="ks-drawer-footer"><div className="ks-drawer-subtotal"><span>Subtotal <small>{count} artículo(s)</small></span><strong>{bs(total)}</strong></div><p>El método de entrega y pago se elige al finalizar el pedido.</p>{items.length ? <Link to="/checkout" onClick={closeCart} className="ks-drawer-checkout">CONTINUAR CON MI PEDIDO <span>↗</span></Link> : <button type="button" className="ks-drawer-checkout" onClick={closeCart}>VER CATÁLOGO ↗</button>}<span className="ks-drawer-footnote">🛡 Stock verificado al confirmar · PIN de entrega</span></footer>
    </aside>
  </div>;
}
