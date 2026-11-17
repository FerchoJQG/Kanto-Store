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
const NOMBRES = { pendiente: 'Pendiente de pago', por_verificar: 'Pago en verificación', pagado: 'Pago confirmado', preparando: 'Preparando', empacado: 'Empacado', entregado: 'Entregado', cancelado: 'Cancelado', paypal: 'PayPal', transferencia: 'Depósito / transferencia', empacador: 'Empacador', repartidor: 'Repartidor', stock: 'Encargado de stock', admin: 'Administrador', cliente: 'Cliente', espanol: 'Español', ingles: 'Inglés', japones: 'Japonés', comun: 'Común', poco_comun: 'Poco común', holo_rara: 'Holo rara', ultra_rara: 'Ultra rara', en_transito: 'En camino', contra_entrega: 'Contra entrega', qr: 'QR', retiro: 'Retiro en tienda', envio: 'Envío' };
export const etiqueta = (s) => NOMBRES[s] || (s || '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
export const PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 140'><rect width='100' height='140' rx='8' fill='%23e9eef7'/><circle cx='50' cy='70' r='24' fill='white' stroke='%23334' stroke-width='4'/><path d='M26 70h48' stroke='%23334' stroke-width='4'/><circle cx='50' cy='70' r='7' fill='%23e63946' stroke='%23334' stroke-width='3'/></svg>";

export const ESTADOS_PEDIDO = ['pendiente', 'por_verificar', 'pagado', 'preparando', 'empacado', 'en_transito', 'entregado', 'cancelado'];
export const ROLES = ['cliente', 'admin', 'stock', 'empacador', 'repartidor'];
export const stockTexto = (p) => (p.stock < 1 ? 'Agotado' : p.stock <= (p.stock_minimo ?? 2) ? `¡Últimas ${p.stock}!` : `${p.stock} disponibles`);
export const stockClase = (p) => (p.stock < 1 ? 'bad' : p.stock <= (p.stock_minimo ?? 2) ? 'warn' : 'ok');

// Lee una imagen, la reduce (máx. `max` px) y la devuelve como data URL JPEG liviana.
export function imagenADataUrl(file, max = 900, calidad = 0.75) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) return reject(new Error('Selecciona una imagen'));
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('No se pudo leer la imagen'));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagen inválida'));
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', calidad));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
