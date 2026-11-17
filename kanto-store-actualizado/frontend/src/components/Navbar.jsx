import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';

export default function Navbar() {
  const { user, logout, cartCount } = useApp();
  const nav = useNavigate();
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand"><span className="ball" /> Kanto Store</Link>
        <nav className="links">
          <NavLink to="/" end>Catálogo</NavLink>
          {user?.role === 'cliente' && <NavLink to="/deseos">Deseos</NavLink>}
          {user?.role === 'cliente' && <NavLink to="/mis-pedidos">Mis pedidos</NavLink>}
          {['admin', 'stock'].includes(user?.role) && <NavLink to="/admin">Panel</NavLink>}
          {user?.role === 'repartidor' && <NavLink to="/entregas">Entregas</NavLink>}
          <NavLink to="/carrito" className="cart-link">Carrito{cartCount > 0 && <b className="badge">{cartCount}</b>}</NavLink>
          {user ? (
            <button className="btn-ghost" onClick={() => { logout(); nav('/'); }}>Salir ({user.name.split(' ')[0]})</button>
          ) : (
            <>
              <NavLink to="/login">Ingresar</NavLink>
              <NavLink to="/registro" className="btn-sm">Registro</NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
