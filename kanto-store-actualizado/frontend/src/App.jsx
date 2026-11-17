import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './AppContext';
import Navbar from './components/Navbar';
import Catalog from './pages/Catalog';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderDone from './pages/OrderDone';
import Login from './pages/Login';
import Register from './pages/Register';
import Orders from './pages/Orders';
import Wishlist from './pages/Wishlist';
import Admin from './pages/Admin';
import Delivery from './pages/Delivery';

function Protected({ roles, children }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { toast } = useApp();
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Catalog />} />
          <Route path="/producto/:id" element={<ProductDetail />} />
          <Route path="/carrito" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/pedido/:id" element={<OrderDone />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/mis-pedidos" element={<Protected><Orders /></Protected>} />
          <Route path="/deseos" element={<Protected><Wishlist /></Protected>} />
          <Route path="/admin/*" element={<Protected roles={['admin', 'stock']}><Admin /></Protected>} />
          <Route path="/entregas" element={<Protected roles={['repartidor']}><Delivery /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="footer">
        Kanto Store · Prototipo académico — Ingeniería de Software SIS324 · Pokémon y sus marcas pertenecen a Nintendo, Game Freak y The Pokémon Company.
      </footer>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
