const BASE = import.meta.env.VITE_API_URL || '/api';

export async function api(path, { method = 'GET', body, token } = {}) {
  const t = token ?? localStorage.getItem('token');
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de servidor');
  return data;
}
export const apiBase = BASE;

export const bs = (n) => `Bs ${Number(n).toFixed(2)}`;
const NOMBRES = { espanol: 'Español', ingles: 'Inglés', japones: 'Japonés', comun: 'Común', poco_comun: 'Poco común', holo_rara: 'Holo rara', ultra_rara: 'Ultra rara', en_transito: 'En tránsito', contra_entrega: 'Contra entrega', qr: 'QR', retiro: 'Retiro en tienda', envio: 'Envío' };
export const etiqueta = (s) => NOMBRES[s] || (s || '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
export const PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 140'><rect width='100' height='140' rx='8' fill='%23e9eef7'/><circle cx='50' cy='70' r='24' fill='white' stroke='%23334' stroke-width='4'/><path d='M26 70h48' stroke='%23334' stroke-width='4'/><circle cx='50' cy='70' r='7' fill='%23e63946' stroke='%23334' stroke-width='3'/></svg>";
