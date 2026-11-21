import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useCart } from '../context.jsx';
import { api } from '../api.js';
import StoreIcon from './StoreIcon.jsx';

const categories = [
  ['Cartas sueltas', 'Cartas individuales para tu colección', '/?tipo=single#catalogo', 'cartas'],
  ['Sobres', 'La emoción de cada apertura', '/?tipo=sellado&subtipo=sobre#catalogo', 'sobres'],
  ['Booster Boxes', 'Cajas completas de sobres', '/?tipo=sellado&subtipo=caja&categoria=booster#catalogo', 'coleccion'],
  ['Elite Trainer Box', 'Cajas para entrenadores', '/?tipo=sellado&subtipo=caja&categoria=etb#catalogo', 'etb'],
  ['Mazos', 'Todo para empezar a jugar', '/?tipo=sellado&subtipo=mazo#catalogo', 'cartas'],
];
function WhatsAppIcon({ size = 22 }) {
  return <svg width={size} height={size} aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A11.87 11.87 0 0 0 12.07 0C5.5 0 .15 5.32.14 11.9c0 2.1.55 4.16 1.6 5.98L.03 24l6.3-1.65a11.88 11.88 0 0 0 5.72 1.46h.01c6.58 0 11.94-5.35 11.94-11.93a11.84 11.84 0 0 0-3.48-8.4Zm-8.46 18.31a9.89 9.89 0 0 1-5.04-1.38l-.36-.22-3.74.98 1-3.64-.24-.38a9.84 9.84 0 0 1-1.52-5.25c0-5.47 4.45-9.92 9.93-9.92 2.65 0 5.14 1.03 7.02 2.91a9.85 9.85 0 0 1 2.9 7.02c0 5.47-4.46 9.92-9.95 9.92Zm5.44-7.44c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.23-.65.08-.3-.15-1.26-.47-2.4-1.48-.88-.78-1.48-1.74-1.65-2.03-.17-.3-.02-.46.13-.6.14-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.2 5.1 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.18-1.41-.08-.13-.28-.2-.58-.35Z"/></svg>;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count, openCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState(0);
  const [mobile, setMobile] = useState(false);
  const [dropdown, setDropdown] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('kanto-tema') || 'oscuro');
  const staff = user && ['admin', 'stock', 'repartidor', 'empacador'].includes(user.rol);
  useEffect(() => { document.documentElement.dataset.tema = theme; localStorage.setItem('kanto-tema', theme); }, [theme]);
  useEffect(() => { setMobile(false); setDropdown(null); }, [location.pathname, location.search]);
  useEffect(() => {
    if (!user) return setNotifications(0);
    api('/notificaciones').then(n => setNotifications(n.filter(x => !x.leida).length)).catch(() => {});
  }, [user]);
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') { setDropdown(null); setMobile(false); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return <>
    <div className="ks-announcement"><span>✦</span> ENTRA AL MUNDO DE POKÉMON TCG <span className="ks-announcement-dot">•</span> CARTAS, SOBRES Y COLECCIONES <span>✦</span></div>
    <header className="ks-header" onMouseLeave={() => setDropdown(null)}>
      <div className="ks-wide ks-header-inner">
        <Link to="/" className="ks-logo" aria-label="Kanto Store, inicio"><span className="ks-pokeball" aria-hidden="true"/><span className="ks-logo-words">KANTO<span>TCG</span><small>STORE</small></span></Link>
        <nav className={`ks-nav-links ${mobile ? 'is-open' : ''}`} aria-label="Navegación principal">
          <NavLink to="/" end>Inicio</NavLink>
          <Link to="/#catalogo" onClick={() => setMobile(false)}><StoreIcon name="tienda" size={22} /> Tienda</Link>
          <div className="ks-nav-popover" onMouseEnter={() => setDropdown('categorias')}>
            <button type="button" className={dropdown === 'categorias' ? 'is-current' : ''} onClick={() => setDropdown(v => v === 'categorias' ? null : 'categorias')} aria-expanded={dropdown === 'categorias'}>Categorías <span>⌄</span></button>
          </div>
          <div className="ks-nav-popover" onMouseEnter={() => setDropdown('guia')}>
            <button type="button" className={dropdown === 'guia' ? 'is-current' : ''} onClick={() => setDropdown(v => v === 'guia' ? null : 'guia')} aria-expanded={dropdown === 'guia'}>Cómo comprar <span>⌄</span></button>
          </div>
          <Link to="/seguimiento" className="ks-mobile-aux"><StoreIcon name="pedidos" size={24}/> Mi pedido</Link>
          {staff && <NavLink className="ks-staff-link" to="/admin">Panel</NavLink>}
          {user && <Link className="ks-mobile-aux" to="/mis-pedidos"><StoreIcon name="pedidos" size={24}/> Mis pedidos</Link>}
          {user && <button type="button" className="ks-mobile-exit" onClick={() => { logout(); setMobile(false); navigate('/'); }}>Cerrar sesión ({user.nombre.split(' ')[0]})</button>}
        </nav>
        <div className="ks-nav-actions">
          <Link className="ks-icon-btn ks-hide-sm" to="/#catalogo" title="Buscar en el catálogo" aria-label="Buscar productos"><StoreIcon name="buscar" size={27} /></Link>
          {user && <Link className="ks-icon-btn ks-hide-sm" to="/deseos" title="Lista de deseos" aria-label="Mis deseos"><StoreIcon name="favoritos" size={27} /></Link>}
          {user && <Link className="ks-icon-btn ks-hide-sm ks-bell" to="/notificaciones" title="Notificaciones">♧{notifications > 0 && <span className="ks-count">{notifications}</span>}</Link>}
          <Link className="ks-account-link" to={user ? '/mis-pedidos' : '/login'} title={user ? 'Mi cuenta y pedidos' : 'Iniciar sesión'}><StoreIcon name="perfil" size={32} /> <span>{user ? 'Mi cuenta' : 'Ingresar'}</span></Link>
          <button type="button" className="ks-cart-link" onClick={openCart} aria-label={`Abrir carrito, ${count} artículos`} title="Ver mi carrito"><StoreIcon name="carrito" size={36} /><b>{count}</b></button>
          <button type="button" className="ks-theme" onClick={() => setTheme(t => t === 'oscuro' ? 'claro' : 'oscuro')} aria-label={`Cambiar a modo ${theme === 'oscuro' ? 'claro' : 'oscuro'}`} title={`Modo ${theme === 'oscuro' ? 'claro' : 'oscuro'}`}>{theme === 'oscuro' ? '☀' : '☾'}</button>
          {user && <button className="ks-logout ks-hide-sm" type="button" onClick={() => { logout(); navigate('/'); }}>Salir</button>}
          <button type="button" className="ks-menu-toggle" onClick={() => setMobile(v => !v)} aria-label="Abrir menú" aria-expanded={mobile}>{mobile ? '✕' : '☰'}</button>
        </div>
      </div>
      {dropdown === 'categorias' && <div className="ks-mega" onMouseEnter={() => setDropdown('categorias')} onMouseLeave={() => setDropdown(null)}><div className="ks-wide ks-mega-inner"><div><span className="ks-section-label">✦ EXPLORA NUESTRAS CATEGORÍAS</span><div className="ks-mega-grid">{categories.map(([name, description, href, emoji]) => <Link to={href} key={name} onClick={() => setDropdown(null)}><span className="ks-mega-emoji"><StoreIcon name={emoji} size={44}/></span><span><strong>{name}</strong><small>{description}</small></span><b>↗</b></Link>)}</div></div><aside><span>✦ TODO EL UNIVERSO TCG</span><h3>¡TU PRÓXIMA CARTA TE ESPERA!</h3><p>Cartas, sobres y cajas para hacer crecer tu colección.</p><Link to="/#catalogo" onClick={() => setDropdown(null)}>VER TODA LA TIENDA →</Link></aside></div></div>}
      {dropdown === 'guia' && <div className="ks-mega ks-guide-mega" onMouseEnter={() => setDropdown('guia')} onMouseLeave={() => setDropdown(null)}><div className="ks-wide ks-guide-mega-inner"><div><span className="ks-section-label">GUÍA DE COMPRA</span><h3>¡COMPRA EN 4 PASOS!</h3><p>Desde elegir tu carta hasta recibirla en tus manos.</p><Link to="/#como-comprar" onClick={() => setDropdown(null)}>VER GUÍA COMPLETA ↗</Link></div>{[['01','🛒','ELIGE'],['02','💳','PAGA'],['03','📦','PREPARAMOS'],['04','🚚','RECIBE']].map(([number, icon, title]) => <Link key={number} to="/#como-comprar" onClick={() => setDropdown(null)}><small>{number}</small><b>{icon}</b><strong>{title}</strong></Link>)}</div></div>}
    </header>
    <a className="ks-whatsapp" href="https://wa.me/59171179684?text=Hola%2C%20quiero%20consultar%20sobre%20Kanto%20Store" target="_blank" rel="noopener noreferrer" aria-label="Consultar por WhatsApp al 71179684"><WhatsAppIcon size={29}/><span className="ks-whatsapp-label">¿Necesitas ayuda? <b>Escríbenos</b></span></a>
  </>;
}
