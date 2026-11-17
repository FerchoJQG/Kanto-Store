import { useEffect, useState } from 'react';
import { api } from '../../api.js';
const nuevo = () => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, titulo: '', descripcion: '', imagen: '', enlace: '/', activa: true });
export default function Promociones() {
  const [items, setItems] = useState([]), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { api('/config/admin/promociones').then(setItems).catch(e => setMsg(e.message)); }, []);
  const cambiar = (i, k, v) => setItems(a => a.map((p, j) => i === j ? { ...p, [k]: v } : p));
  async function guardar() { setBusy(true); setMsg(''); try { await api('/config/admin/promociones', { method: 'PUT', body: { promociones: items } }); setMsg('Promociones guardadas.'); } catch(e) { setMsg(e.message); } finally { setBusy(false); } }
  return <div><h2>Promociones de la tienda</h2><p className="muted">Crea banners que aparecerán en el catálogo. Los enlaces deben comenzar por / y apuntar a una página de la tienda. Las promociones no modifican automáticamente el precio del producto.</p>
    {items.map((p, i) => <section className="panel" key={p.id}>
      <div className="row between"><strong>Promoción {i + 1}</strong><button className="ghost sm" onClick={() => setItems(a => a.filter((_, j) => j !== i))}>Eliminar</button></div>
      <label>Título<input maxLength={90} value={p.titulo} onChange={e => cambiar(i, 'titulo', e.target.value)} /></label>
      <label>Descripción<textarea maxLength={250} value={p.descripcion} onChange={e => cambiar(i, 'descripcion', e.target.value)} /></label>
      <label>URL de imagen (https://)<input value={p.imagen} onChange={e => cambiar(i, 'imagen', e.target.value)} /></label>
      <label>Enlace interno<input value={p.enlace} onChange={e => cambiar(i, 'enlace', e.target.value)} /></label>
      <label><input type="checkbox" style={{width:'auto'}} checked={p.activa} onChange={e => cambiar(i, 'activa', e.target.checked)} /> Publicada</label>
    </section>)}
    <div className="row gap wrap"><button className="ghost" disabled={items.length >= 20} onClick={() => setItems(a => [...a, nuevo()])}>+ Añadir promoción</button><button disabled={busy} onClick={guardar}>Guardar promociones</button></div>{msg && <p role="status">{msg}</p>}
  </div>;
}
