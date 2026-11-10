import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api';

const AuthCtx = createContext(null);
const CartCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);
export const useCart = () => useContext(CartCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [wishlist, setWishlist] = useState([]); // ids

  const cargarWishlist = useCallback(async () => {
    try { setWishlist((await api('/wishlist')).map((p) => p.id)); } catch { setWishlist([]); }
  }, []);
  useEffect(() => { if (user) cargarWishlist(); else setWishlist([]); }, [user, cargarWishlist]);

  const login = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  };
  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); };

  const toggleWish = async (id) => {
    if (wishlist.includes(id)) { await api(`/wishlist/${id}`, { method: 'DELETE' }); setWishlist((w) => w.filter((x) => x !== id)); }
    else { await api(`/wishlist/${id}`, { method: 'POST' }); setWishlist((w) => [...w, id]); }
  };
  return <AuthCtx.Provider value={{ user, login, logout, wishlist, toggleWish, cargarWishlist }}>{children}</AuthCtx.Provider>;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cart')) || []; } catch { return []; }
  });
  useEffect(() => localStorage.setItem('cart', JSON.stringify(items)), [items]);

  const add = (p, cantidad = 1) => setItems((cur) => {
    const ex = cur.find((i) => i.id === p.id);
    const nueva = Math.min((ex?.cantidad || 0) + cantidad, p.stock);
    if (ex) return cur.map((i) => (i.id === p.id ? { ...i, cantidad: nueva, stock: p.stock } : i));
    return [...cur, { id: p.id, nombre: p.nombre, precio: p.precio, imagen_url: p.imagen_url, stock: p.stock, cantidad: Math.min(cantidad, p.stock) }];
  });
  const setQty = (id, c) => setItems((cur) => cur.map((i) => (i.id === id ? { ...i, cantidad: Math.max(1, Math.min(c, i.stock)) } : i)));
  const remove = (id) => setItems((cur) => cur.filter((i) => i.id !== id));
  const clear = () => setItems([]);
  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const count = items.reduce((s, i) => s + i.cantidad, 0);
  return <CartCtx.Provider value={{ items, add, setQty, remove, clear, total, count }}>{children}</CartCtx.Provider>;
}
