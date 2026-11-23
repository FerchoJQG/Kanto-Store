import '../../components/zz-f11-stability.css';
import { useEffect, useState } from 'react';
import { api } from '../../api.js';

const nuevo = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  titulo: '', descripcion: '', imagen: '', video: '', enlace: '/#catalogo', activa: true,
});
const gstaticThumb = url => /(?:encrypted-tbn\d?\.gstatic\.com|google\.com\/images\?)/i.test(url || '');

export default function Promociones() {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    api('/config/admin/promociones').then(v => setItems(Array.isArray(v) ? v : [])).catch(e => setError(e.message));
  }, []);
  const cambiar = (i, k, v) => setItems(a => a.map((p, j) => i === j ? { ...p, [k]: v } : p));
  async function guardar() {
    setBusy(true); setError(''); setMsg('');
    try {
      await api('/config/admin/promociones', { method: 'PUT', body: { promociones: items } });
      setMsg('Promociones guardadas. La vista ampliada aparecerá en el catálogo al actualizar.');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <div className="kanto-f11-promo-admin">
    <h1>Promociones de la tienda</h1>
    <p className="muted">Las promociones se muestran en la tienda como un carrusel. El botón <strong>Ver carta / video</strong> abre una vista ampliada sin salir de la página. El enlace interno solo se utiliza para navegar a un producto específico.</p>
    {items.map((p, i) => <section className="panel" key={p.id}>
      <div className="row between wrap gap"><strong>Promoción {i + 1}</strong><button type="button" className="ghost sm danger" onClick={() => setItems(a => a.filter((_, j) => i !== j))}>Eliminar</button></div>
      <label>Título<input maxLength={90} value={p.titulo || ''} onChange={e => cambiar(i, 'titulo', e.target.value)} /></label>
      <label>Descripción<textarea maxLength={250} value={p.descripcion || ''} onChange={e => cambiar(i, 'descripcion', e.target.value)} /></label>
      <label>URL de imagen completa (https://)<input placeholder="https://ejemplo.com/carta-grande.jpg" value={p.imagen || ''} onChange={e => cambiar(i, 'imagen', e.target.value)} /></label>
      {gstaticThumb(p.imagen) && <p className="warn">Esta URL es una miniatura de Google Images: se verá borrosa al ampliar. Usa la URL directa de la imagen original, preferiblemente de alta resolución.</p>}
      <label>Video directo MP4/WebM (opcional)<input placeholder="https://ejemplo.com/video.mp4" value={p.video || ''} onChange={e => cambiar(i, 'video', e.target.value)} /></label>
      <label>Enlace interno a un producto (opcional)
        <input placeholder="/producto/15 o /#catalogo" value={p.enlace || ''} onChange={e => cambiar(i, 'enlace', e.target.value)} />
      </label>
      <p className="muted">La ruta <code>/</code> solo vuelve al inicio. Para que el cliente vea la carta, usa <strong>Ver carta / video</strong>. Si quieres dirigirlo a una ficha, coloca <code>/producto/ID</code>.</p>
      <label><input type="checkbox" style={{ width: 'auto' }} checked={!!p.activa} onChange={e => cambiar(i, 'activa', e.target.checked)} /> Publicada</label>
      <div className="row gap wrap">
        <button type="button" className="ghost" onClick={() => setPreview(p)}>Vista previa de la carta / video</button>
      </div>
    </section>)}
    <div className="row gap wrap">
      <button type="button" className="ghost" disabled={items.length >= 20} onClick={() => setItems(a => [...a, nuevo()])}>+ Añadir promoción</button>
      <button type="button" disabled={busy} onClick={guardar}>{busy ? 'Guardando…' : 'Guardar promociones'}</button>
    </div>
    {error && <p role="alert" className="alert">{error}</p>}
    {msg && <p role="status" className="ok">{msg}</p>}
    {preview && <div className="kanto-f11-admin-backdrop" onClick={e => { if (e.target === e.currentTarget) setPreview(null); }}>
      <div role="dialog" aria-modal="true" aria-label="Vista previa de promoción" className="kanto-f11-admin-preview">
        <button type="button" className="ghost" onClick={() => setPreview(null)}>✕ Cerrar</button>
        {preview.video && /^https:\/\//.test(preview.video) ?
          <video controls playsInline preload="metadata" poster={preview.imagen || undefined} src={preview.video} /> :
          preview.imagen ? <img src={preview.imagen} alt={preview.titulo || 'Promoción'} /> :
            <p>Agrega una imagen o un video para previsualizar.</p>}
        <h2>{preview.titulo || 'Nueva promoción'}</h2><p>{preview.descripcion}</p>
      </div>
    </div>}
  </div>;
}
