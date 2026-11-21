// Iconografía del ZIP proporcionado por el propietario de la tienda.
const validos = new Set(['tienda', 'perfil', 'carrito', 'pedidos', 'cartas', 'sobres', 'etb', 'favoritos', 'buscar', 'filtros', 'monedas', 'coleccion']);
export default function StoreIcon({ name, size = 24, className = '' }) {
  if (!validos.has(name)) return null;
  return <img className={`ks-store-icon ${className}`} src={`/assets/ui-icons/${name}.webp`} alt="" aria-hidden="true" width={size} height={size} decoding="async" />;
}
