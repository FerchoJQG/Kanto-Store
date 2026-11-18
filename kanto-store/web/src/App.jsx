import { Routes, Route, Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import { useAuth } from './context.jsx';
import Catalog from './pages/Catalog.jsx';
import Product from './pages/Product.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Track from './pages/Track.jsx';
import { Login, Register } from './pages/AuthPages.jsx';
import { Wishlist, MyOrders, Notifications } from './pages/Account.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import Productos from './pages/admin/Productos.jsx';
import Pedidos from './pages/admin/Pedidos.jsx';
import Usuarios from './pages/admin/Usuarios.jsx';
import Inventario from './pages/admin/Inventario.jsx';
import Entregas from './pages/admin/Entregas.jsx';
import Preparacion from './pages/admin/Preparacion.jsx';
import Pagos from './pages/admin/Pagos.jsx';
import PaypalReturn from './pages/PaypalReturn.jsx';
import Promociones from './pages/admin/Promociones.jsx';

function Protegida({ roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.rol)) return <Navigate to="/" replace />;
  return <Outlet />;
}

export default function App() {
  const { pathname } = useLocation();
  return <>
    <Navbar />
    <main className={pathname === '/' ? 'ks-home-main' : 'container ks-inner-main'}>
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/producto/:id" element={<Product />} />
        <Route path="/carrito" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/seguimiento" element={<Track />} />
        <Route path="/seguimiento/:codigo" element={<Track />} />
        <Route path="/paypal/retorno" element={<PaypalReturn />} />
        <Route path="/paypal/cancelado" element={<PaypalReturn />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Register />} />
        <Route element={<Protegida />}>
          <Route path="/deseos" element={<Wishlist />} />
          <Route path="/mis-pedidos" element={<MyOrders />} />
          <Route path="/notificaciones" element={<Notifications />} />
        </Route>
        <Route element={<Protegida roles={['admin','stock','repartidor','empacador']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="productos" element={<Productos />} />
            <Route path="inventario" element={<Inventario />} />
            <Route path="pedidos" element={<Pedidos />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="entregas" element={<Entregas />} />
            <Route path="preparacion" element={<Preparacion />} />
            <Route path="pagos" element={<Pagos />} />
            <Route path="promociones" element={<Promociones />} />
          </Route>
        </Route>
        <Route path="*" element={<p>Página no encontrada.</p>} />
      </Routes>
    </main>
    <footer className="ks-footer"><div className="ks-wide ks-footer-main"><div><Link className="ks-footer-logo" to="/">◉ KANTO<span>TCG</span> <small>STORE</small></Link><p>Para quienes disfrutan cada carta, cada apertura y cada colección.</p></div><div><strong>EXPLORA</strong><Link to="/#catalogo">Tienda</Link><Link to="/seguimiento">Mi pedido</Link><Link to="/carrito">Carrito</Link></div><div><strong>ATENCIÓN</strong><a target="_blank" rel="noreferrer" href="https://wa.me/59171179684">💬 WhatsApp · 71179684</a><span>Sucre, Bolivia</span></div></div><div className="ks-wide ks-footer-bottom"><span>© Kanto Store · Proyecto académico SIS324</span><span>Pokémon y sus marcas pertenecen a sus respectivos titulares.</span></div></footer>
  </>;
}
