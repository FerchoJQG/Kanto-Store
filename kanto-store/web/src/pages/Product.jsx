import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, bs, etiqueta, stockTexto, stockClase } from '../api.js';
import { useAuth, useCart } from '../context.jsx';
import { Img } from '../components/ProductCard.jsx';

export default function Product() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const [zoom, setZoom] = useState(false);
  const zoomRef = useRef(null);
  const { add, openCart } = useCart();
  const { user, wishlist, toggleWish } = useAuth();

  useEffect(() => {
    const controller = new AbortController();
    setP(null); setError(''); setZoom(false);
    api(`/productos/${id}`, { signal: controller.signal }).then(setP).catch((e) => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [id]);
  useEffect(() => {
    if (!zoom) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const key = e => { if (e.key === 'Escape') setZoom(false); };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = old; document.removeEventListener('keydown', key); };
  }, [zoom]);
  const tilt = e => {
    if (!zoomRef.current || e.pointerType === 'touch') return;
    const b = zoomRef.current.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width - .5;
    const y = (e.clientY - b.top) / b.height - .5;
    zoomRef.current.style.transform = `perspective(1000px) rotateY(${x * 13}deg) rotateX(${-y * 11}deg)`;
  };
  if (error) return <p className="alert">{error}</p>;
  if (!p) return <p>Cargando…</p>;
  const deseado = wishlist.includes(p.id);
  const fila = (k, v) => v && <tr><th>{k}</th><td>{v}</td></tr>;
  return (
    <div className="detail">
      <button type="button" className="detail-img ks-product-zoom-trigger" onClick={() => setZoom(true)} aria-label={`Ampliar imagen de ${p.nombre}`}><Img src={p.imagen_url} alt={p.nombre} /><span>⌕ VER EN GRANDE</span></button>
      <div>
        <h1>{p.nombre}</h1>
        <p className="price big">{Number(p.precio) > 0 ? bs(p.precio) : 'Precio pendiente de configuración'}</p>
        <table className="spec"><tbody>
          {fila('Expansión', p.expansion)}
          {fila('N.º de colección', p.numero_coleccion)}
          {fila('Rareza', p.rareza && etiqueta(p.rareza))}
          {fila('Idioma', etiqueta(p.idioma))}
          {fila('Estado de conservación', <span className={`tag estado-${p.estado_conservacion}`}>{etiqueta(p.estado_conservacion)}</span>)}
          {fila('SKU', p.sku)}
          {fila('Disponibilidad', <b className={stockClase(p)}>{stockTexto(p)}</b>)}
        </tbody></table>
        {p.descripcion && <p>{p.descripcion}</p>}
        <div className="row gap">
          {p.stock > 0 && <input type="number" min="1" max={p.stock} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(p.stock, +e.target.value || 1)))} style={{ width: 80 }} />}
          <button disabled={p.stock < 1 || Number(p.precio) <= 0} onClick={() => { add(p, qty); openCart(); }}>Agregar al carrito</button>
          {user
            ? <button className={`ghost ${deseado ? 'on' : ''}`} onClick={() => toggleWish(p.id)}>{deseado ? '♥ En tu lista' : p.stock < 1 ? '♡ Avisarme cuando haya' : '♡ A mi lista de deseos'}</button>
            : p.stock < 1 && <span className="muted">Inicia sesión para recibir un aviso cuando esté disponible.</span>}
        </div>
      </div>
      {zoom && <div className="ks-zoom-overlay" role="dialog" aria-modal="true" aria-label={`Vista ampliada: ${p.nombre}`} onMouseDown={e => { if (e.target === e.currentTarget) setZoom(false); }}>
        <button type="button" className="ks-zoom-close" onClick={() => setZoom(false)} aria-label="Cerrar vista ampliada">×</button>
        <div className="ks-zoom-stage"><small>KANTO TCG STORE · VISTA AMPLIADA</small><div className="ks-zoom-art" ref={zoomRef} onPointerMove={tilt} onPointerLeave={() => { if (zoomRef.current) zoomRef.current.style.transform = ''; }}><Img src={p.imagen_url} alt={p.nombre}/></div><h2>{p.nombre}</h2><p>{p.expansion || 'Colección Pokémon'} · {p.numero_coleccion || 'Artículo coleccionable'}</p><span>✦ MUEVE EL MOUSE PARA VER EL EFECTO 3D · ESC PARA CERRAR</span></div>
      </div>}
    </div>
  );
}
