import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context.jsx';

const MENU = [
  { to: '/admin', t: 'Resumen', roles: ['admin'], end: true },
  { to: '/admin/productos', t: 'Productos', roles: ['admin', 'stock'] },
  { to: '/admin/inventario', t: 'Inventario', roles: ['admin', 'stock'] },
  { to: '/admin/pedidos', t: 'Pedidos', roles: ['admin'] },
  { to: '/admin/usuarios', t: 'Usuarios', roles: ['admin'] },
  { to: '/admin/entregas', t: 'Entregas', roles: ['repartidor', 'admin'] },
];

export default function AdminLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const menu = MENU.filter((m) => m.roles.includes(user.rol));
  if (pathname === '/admin' && user.rol !== 'admin') return <Navigate to={menu[0].to} replace />;
  return (
    <div className="admin">
      <aside>
        <h3>Panel · {user.rol}</h3>
        {menu.map((m) => <NavLink key={m.to} to={m.to} end={m.end}>{m.t}</NavLink>)}
      </aside>
      <section><Outlet /></section>
    </div>
  );
}
