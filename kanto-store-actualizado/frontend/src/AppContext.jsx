import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => read('kanto_user', null));
  const [cart, setCart] = useState(() => read('kanto_cart', []));
  const [wishIds, setWishIds] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => localStorage.setItem('kanto_cart', JSON.stringify(cart)), [cart]);

  const notify = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); }, []);

  const refreshWish = useCallback(async () => {
    if (!localStorage.getItem('kanto_token')) return setWishIds([]);
    try { setWishIds((await api.wishlist()).map(p => p.id)); } catch { setWishIds([]); }
  }, []);
  useEffect(() => { refreshWish(); }, [user, refreshWish]);

  const login = (data) => {
    localStorage.setItem('kanto_token', data.token);
    localStorage.setItem('kanto_user', JSON.stringify(data.user));
    setUser(data.user);
  };
  const logout = () => {
    localStorage.removeItem('kanto_token');
    localStorage.removeItem('kanto_user');
    setUser(null); setWishIds([]);
  };

  const addToCart = (p, qty = 1) => {
    setCart(prev => {
      const f = prev.find(i => i.id === p.id);
      const next = Math.min((f?.quantity || 0) + qty, p.stock);
      if (f) return prev.map(i => (i.id === p.id ? { ...i, quantity: next, stock: p.stock } : i));
      return [...prev, { id: p.id, name: p.name, price: p.price, image_url: p.image_url, stock: p.stock, quantity: Math.min(qty, p.stock) }];
    });
    notify(`${p.name} agregado al carrito`);
  };
  const setQty = (id, q) => setCart(prev => prev.map(i => (i.id === id ? { ...i, quantity: Math.max(1, Math.min(q, i.stock)) } : i)));
  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));
  const clearCart = () => setCart([]);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const toggleWish = async (id) => {
    if (!user) return notify('Inicia sesión para usar tu lista de deseos');
    try {
      if (wishIds.includes(id)) { await api.wishRemove(id); notify('Quitado de tu lista de deseos'); }
      else { await api.wishAdd(id); notify('Agregado a tu lista de deseos'); }
      refreshWish();
    } catch (e) { notify(e.message); }
  };

  return (
    <Ctx.Provider value={{ user, login, logout, cart, addToCart, setQty, removeFromCart, clearCart, cartTotal, cartCount, wishIds, toggleWish, notify, toast }}>
      {children}
    </Ctx.Provider>
  );
}
