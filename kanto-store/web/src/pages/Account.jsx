import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, bs, etiqueta, apiBase } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';
import { useAuth } from '../context.jsx';

export function Wishlist() {
  const [items, setItems] = useState([]);
  const { wishlist } = useAuth();
  useEffect(() => { api('/wishlist').then(setItems).catch(() => {}); }, [wishlist]);
  return (<><h1>Mi lista de deseos</h1>
    {!items.length ? <p className="empty">Aún no tienes cartas en tu lista. <Link to="/">Explora el catálogo</Link></p>
      : <div className="grid">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div>}</>);
}

export function MyOrders() {
  const [rows, setRows] = useState(null);
  useEffect(() => { api('/pedidos/mis').then(setRows).catch(() => setRows([])); }, []);
  if (!rows) return <p>Cargando…</p>;
  return (<><h1>Mis pedidos</h1>
    {!rows.length && <p className="empty">Todavía no has hecho pedidos.</p>}
    {rows.map((p) => (
      <div className="panel" key={p.id}>
        <div className="row between"><strong>{p.codigo}</strong><span className="tag">{etiqueta(p.estado)}</span></div>
        <p className="muted">{new Date(p.creado_en).toLocaleString('es-BO')} · {etiqueta(p.metodo_pago)}</p>
        <ul>{p.items.map((i, k) => <li key={k}>{i.cantidad} × {i.nombre}</li>)}</ul>
        <div className="row between"><strong>{bs(p.total)}</strong>
          <span><Link to={`/seguimiento/${p.codigo}?email=${encodeURIComponent(p.email)}`}>Seguir</Link> · <a target="_blank" rel="noreferrer" href={`${apiBase}/pedidos/comprobante/${p.codigo}?email=${encodeURIComponent(p.email)}`}>Comprobante</a></span></div>
      </div>))}</>);
}

export function Notifications() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api('/notificaciones').then(setRows).catch(() => {}); api('/notificaciones/leer', { method: 'PATCH' }).catch(() => {}); }, []);
  return (<><h1>Notificaciones</h1>
    {!rows.length && <p className="empty">Sin notificaciones.</p>}
    {rows.map((n) => (
      <div className={`panel ${n.leida ? '' : 'unread'}`} key={n.id}>
        {n.producto_id ? <Link to={`/producto/${n.producto_id}`}>{n.mensaje}</Link> : n.mensaje}
        <div className="muted">{new Date(n.creado_en).toLocaleString('es-BO')}</div>
      </div>))}</>);
}
