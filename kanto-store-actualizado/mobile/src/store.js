import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const u = await AsyncStorage.getItem('user');
        const c = await AsyncStorage.getItem('cart');
        if (u) setUser(JSON.parse(u));
        if (c) setCart(JSON.parse(c));
      } catch {}
      setReady(true);
    })();
  }, []);
  useEffect(() => { if (ready) AsyncStorage.setItem('cart', JSON.stringify(cart)).catch(() => {}); }, [cart, ready]);

  const cargarWishlist = useCallback(async () => {
    try { setWishlist((await api('/wishlist')).map((p) => p.id)); } catch { setWishlist([]); }
  }, []);
  useEffect(() => { if (user) cargarWishlist(); else setWishlist([]); }, [user, cargarWishlist]);

  const login = async (data) => {
    await AsyncStorage.multiSet([['token', data.token], ['user', JSON.stringify(data.user)]]);
    setUser(data.user);
  };
  const logout = async () => { await AsyncStorage.multiRemove(['token', 'user']); setUser(null); };

  const addToCart = (p, cantidad = 1) => setCart((cur) => {
    const ex = cur.find((i) => i.id === p.id);
    if (ex) return cur.map((i) => (i.id === p.id ? { ...i, stock: p.stock, cantidad: Math.min(i.cantidad + cantidad, p.stock) } : i));
    return [...cur, { id: p.id, nombre: p.nombre, precio: p.precio, imagen_url: p.imagen_url, stock: p.stock, cantidad: Math.min(cantidad, p.stock) }];
  });
  const setQty = (id, c) => setCart((cur) => cur.map((i) => (i.id === id ? { ...i, cantidad: Math.max(1, Math.min(c, i.stock)) } : i)));
  const removeItem = (id) => setCart((cur) => cur.filter((i) => i.id !== id));
  const clearCart = () => setCart([]);
  const toggleWish = async (id) => {
    if (wishlist.includes(id)) { await api(`/wishlist/${id}`, { method: 'DELETE' }); setWishlist((w) => w.filter((x) => x !== id)); }
    else { await api(`/wishlist/${id}`, { method: 'POST' }); setWishlist((w) => [...w, id]); }
  };
  const total = cart.reduce((s, i) => s + i.precio * i.cantidad, 0);

  return (
    <Ctx.Provider value={{ user, login, logout, cart, addToCart, setQty, removeItem, clearCart, total, wishlist, toggleWish, ready }}>
      {children}
    </Ctx.Provider>
  );
}
