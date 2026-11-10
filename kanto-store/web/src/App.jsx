import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
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

function Protegida({ roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.rol)) return <Navigate to="/" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Catalog />} />
          <Route path="/producto/:id" element={<Product />} />
          <Route path="/carrito" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/seguimiento" element={<Track />} />
          <Route path="/seguimiento/:codigo" element={<Track />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route element={<Protegida />}>
            <Route path="/deseos" element={<Wishlist />} />
            <Route path="/mis-pedidos" element={<MyOrders />} />
            <Route path="/notificaciones" element={<Notifications />} />
          </Route>
          <Route element={<Protegida roles={['admin', 'stock', 'repartidor']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="productos" element={<Productos />} />
              <Route path="inventario" element={<Inventario />} />
              <Route path="pedidos" element={<Pedidos />} />
              <Route path="usuarios" element={<Usuarios />} />
              <Route path="entregas" element={<Entregas />} />
            </Route>
          </Route>
          <Route path="*" element={<p>Página no encontrada.</p>} />
        </Routes>
      </main>
      <footer className="footer">
        Kanto Store — proyecto académico SIS324. Pokémon y sus marcas pertenecen a Nintendo, Game Freak y The Pokémon Company.
      </footer>
    </>
  );
}
