import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';

export async function api(path, { method = 'GET', body, token } = {}) {
  const t = token ?? (await AsyncStorage.getItem('token'));
  const res = await fetch(API_URL + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de servidor');
  return data;
}
const NOMBRES = { espanol: 'Español', ingles: 'Inglés', japones: 'Japonés', comun: 'Común', poco_comun: 'Poco común', holo_rara: 'Holo rara', ultra_rara: 'Ultra rara', en_transito: 'En tránsito', contra_entrega: 'Contra entrega', qr: 'QR' };
export const etiqueta = (s) => NOMBRES[s] || (s || '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
export const bs = (n) => `Bs ${Number(n).toFixed(2)}`;
