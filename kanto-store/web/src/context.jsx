import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api';

const AuthCtx = createContext(null);
const CartCtx = createContext(null);
const AUTH_TOKEN = 'kanto_auth_token_tab';
const AUTH_USER = 'kanto_auth_user_tab';
const CART_KEY = 'kanto_cart_tab';
export const useAuth = () => useContext(AuthCtx);
export const useCart = () => useContext(CartCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return sessionStorage.getItem(AUTH_TOKEN) ? JSON.parse(sessionStorage.getItem(AUTH_USER)) : null; } catch { return null; }
  });
  const [wishlist, setWishlist] = useState([]); // ids
  // Elimina credenciales antiguas compartidas entre pestañas: no se migran por seguridad.
  useEffect(() => { localStorage.removeItem('token'); localStorage.removeItem('user'); }, []);
  // Revalida el usuario guardado al recargar, pero no cierra sesión por caídas de red.
  useEffect(() => {
    const initialToken = sessionStorage.getItem(AUTH_TOKEN);
    if (!initialToken) return;
    let mounted = true;
    api('/auth/me').then(u => {
      if (!mounted || sessionStorage.getItem(AUTH_TOKEN) !== initialToken) return;
      sessionStorage.setItem(AUTH_USER, JSON.stringify(u));
      setUser(prev => JSON.stringify(prev) === JSON.stringify(u) ? prev : u);
    }).catch(e => {
      if (mounted && sessionStorage.getItem(AUTH_TOKEN) === initialToken && e.status === 401) {
        sessionStorage.removeItem(AUTH_TOKEN); sessionStorage.removeItem(AUTH_USER);
        setUser(null);
      }
    });
    return () => { mounted = false; };
  }, []);

  const cargarWishlist = useCallback(async () => {
    try { setWishlist((await api('/wishlist')).map((p) => p.id)); } catch { setWishlist([]); }
  }, []);
  useEffect(() => { if (user) cargarWishlist(); else setWishlist([]); }, [user, cargarWishlist]);

  const login = (data) => {
    sessionStorage.setItem(AUTH_TOKEN, data.token);
    sessionStorage.setItem(AUTH_USER, JSON.stringify(data.user));
    setUser(data.user);
  };
  const logout = () => { sessionStorage.removeItem(AUTH_TOKEN); sessionStorage.removeItem(AUTH_USER); setUser(null); };

  const toggleWish = async (id) => {
    if (wishlist.includes(id)) { await api(`/wishlist/${id}`, { method: 'DELETE' }); setWishlist((w) => w.filter((x) => x !== id)); }
    else { await api(`/wishlist/${id}`, { method: 'POST' }); setWishlist((w) => [...w, id]); }
  };
  return <AuthCtx.Provider value={{ user, login, logout, wishlist, toggleWish, cargarWishlist }}>{children}</AuthCtx.Provider>;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { const old = sessionStorage.getItem(CART_KEY) || localStorage.getItem('cart'); return old ? JSON.parse(old) : []; } catch { return []; }
  });
  const [cartOpen, setCartOpen] = useState(false);
  useEffect(() => sessionStorage.setItem(CART_KEY, JSON.stringify(items)), [items]);
  useEffect(() => { localStorage.removeItem('cart'); }, []);
  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);

  const add = (p, cantidad = 1) => setItems((cur) => {
    const ex = cur.find((i) => i.id === p.id);
    const nueva = Math.min((ex?.cantidad || 0) + cantidad, p.stock);
    if (ex) return cur.map((i) => (i.id === p.id ? { ...i, cantidad: nueva, stock: p.stock } : i));
    return [...cur, { id: p.id, nombre: p.nombre, precio: p.precio, imagen_url: p.imagen_url, stock: p.stock, cantidad: Math.min(cantidad, p.stock) }];
  });
  const setQty = (id, c) => setItems((cur) => cur.map((i) => (i.id === id ? { ...i, cantidad: Math.max(1, Math.min(c, i.stock)) } : i)));
  const remove = (id) => setItems((cur) => cur.filter((i) => i.id !== id));
  const clear = () => setItems([]);
  // Revalida el carrito con el stock/precio actual del servidor; devuelve avisos para el cliente.
  const sincronizar = (rows) => {
    const avisos = [], nuevos = [];
    for (const i of items) {
      const r = rows.find((x) => x.id === i.id);
      if (!r || !r.activo || r.stock < 1) { avisos.push(`"${i.nombre}" ya no está disponible y se quitó del carrito.`); continue; }
      const cantidad = Math.min(i.cantidad, r.stock);
      if (cantidad < i.cantidad) avisos.push(`De "${i.nombre}" solo quedan ${r.stock}; ajustamos la cantidad.`);
      if (Number(r.precio) !== Number(i.precio)) avisos.push(`El precio de "${i.nombre}" cambió a Bs ${Number(r.precio).toFixed(2)}.`);
      nuevos.push({ ...i, cantidad, stock: r.stock, precio: r.precio });
    }
    setItems(nuevos);
    return avisos;
  };
  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const count = items.reduce((s, i) => s + i.cantidad, 0);
  return <CartCtx.Provider value={{ items, add, setQty, remove, clear, sincronizar, total, count, cartOpen, openCart, closeCart }}>{children}</CartCtx.Provider>;
}
