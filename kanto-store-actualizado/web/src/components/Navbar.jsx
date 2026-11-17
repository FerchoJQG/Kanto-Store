import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth, useCart } from '../context.jsx';
import { api } from '../api.js';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const nav = useNavigate();
  const [nuevas, setNuevas] = useState(0);
  const [open, setOpen] = useState(false);
  const [tema, setTema] = useState(() => localStorage.getItem('kanto-tema') || 'claro');
  useEffect(() => { document.documentElement.dataset.tema = tema; localStorage.setItem('kanto-tema', tema); }, [tema]);

  useEffect(() => {
    if (!user) return setNuevas(0);
    api('/notificaciones').then((n) => setNuevas(n.filter((x) => !x.leida).length)).catch(() => {});
  }, [user]);

  const staff = user && ['admin', 'stock', 'repartidor', 'empacador'].includes(user.rol);
  const go = () => setOpen(false);
  return (
    <header className="nav">
      <div className="nav-in">
        <Link to="/" className="brand" onClick={go}>⚡ Kanto Store</Link>
        <button className="burger" onClick={() => setOpen(!open)} aria-label="Menú">☰</button>
        <nav className={open ? 'open' : ''} onClick={go}>
          <NavLink to="/" end>Catálogo</NavLink>
          <NavLink to="/seguimiento">Mi pedido</NavLink>
          {user && <NavLink to="/deseos">♥ Deseos</NavLink>}
          {user && <NavLink to="/mis-pedidos">Mis pedidos</NavLink>}
          {user && <NavLink to="/notificaciones">🔔{nuevas > 0 && <b className="badge">{nuevas}</b>}</NavLink>}
          {staff && <NavLink to="/admin">Panel</NavLink>}
          <a href="https://wa.me/59171179684" target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <button type="button" className="theme-toggle" onClick={(e) => { e.stopPropagation(); setTema(t => t === 'oscuro' ? 'claro' : 'oscuro'); }} aria-label="Cambiar tema">{tema === 'oscuro' ? '☀ Claro' : '☾ Oscuro'}</button>
          <NavLink to="/carrito">🛒{count > 0 && <b className="badge">{count}</b>}</NavLink>
          {user ? (
            <button className="link" onClick={() => { logout(); nav('/'); }}>Salir ({user.nombre.split(' ')[0]})</button>
          ) : (
            <NavLink to="/login">Ingresar</NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
