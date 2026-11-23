import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../api.js';
import { obtenerVideoPromo } from '../../utils/promoVideo.js';
import '../../components/zz-f11-stability.css';
import '../../components/zz-f12-carousel-video.css';

const nueva = () => ({
  id:`${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
  titulo:'',descripcion:'',imagen:'',video:'',enlace:'',activa:true,
});
const miniaturaGoogle = url => /(?:encrypted-tbn\d?\.gstatic\.com|google\.com\/images\?)/i.test(url||'');

export default function Promociones() {
  const [items,setItems] = useState([]);
  const [mensaje,setMensaje] = useState('');
  const [error,setError] = useState('');
  const [ocupado,setOcupado] = useState(false);
  const [preview,setPreview] = useState(null);
  useEffect(() => {api('/config/admin/promociones').then(data => setItems(Array.isArray(data)?data:[])).catch(e=>setError(e.message));},[]);
  const cambiar = (i,k,v) => setItems(actual=>actual.map((p,j)=>i===j?{...p,[k]:v}:p));
  const guardar = async () => {
    setError('');setMensaje('');
    for (const p of items) {
      if (p.video && !obtenerVideoPromo(p.video)) {
        setError(`El video de “${p.titulo || 'Sin título'}” no es válido. Utiliza un enlace público de YouTube, Vimeo, Google Drive o MP4/WebM.`);
        return;
      }
    }
    setOcupado(true);
    try {await api('/config/admin/promociones',{method:'PUT',body:{promociones:items}});
      setMensaje('Promociones guardadas. Su imagen/video se verá al recargar la tienda.');}
    catch(e) {setError(e.message);} finally {setOcupado(false);}
  };
  return <div className="kanto-f11-promo-admin kanto-f12-admin-promos">
    <h1>Promociones de la tienda</h1>
    <p className="muted">Puedes usar la dirección pública de un video <b>YouTube, Shorts, Vimeo, Google Drive</b> o un archivo <b>MP4/WebM</b>. No tienes que subir videos al repositorio. La tienda abrirá el video en una ventana ampliada.</p>
    {items.map((p,i) => {
      const video = obtenerVideoPromo(p.video);
      return <section className="panel" key={p.id}>
        <div className="row between wrap gap"><strong>Promoción {i+1}</strong>
          <button type="button" className="ghost sm danger" onClick={()=>setItems(a=>a.filter((_,j)=>i!==j))}>Eliminar</button></div>
        <label>Título<input maxLength={90} value={p.titulo||''} onChange={e=>cambiar(i,'titulo',e.target.value)}/></label>
        <label>Descripción<textarea maxLength={250} rows={3} value={p.descripcion||''} onChange={e=>cambiar(i,'descripcion',e.target.value)}/></label>
        <label>URL de imagen o portada (opcional si hay video)
          <input type="url" placeholder="https://sitio.com/carta-alta-resolucion.jpg" value={p.imagen||''} onChange={e=>cambiar(i,'imagen',e.target.value)}/></label>
        {miniaturaGoogle(p.imagen) && <p className="warn">Esta dirección es una miniatura de Google y puede verse borrosa. Usa la imagen original.</p>}
        <label>Enlace de video (YouTube, Shorts, Vimeo, Drive o MP4/WebM)
          <input type="url" placeholder="https://www.youtube.com/watch?v=XXXXXXXXXXX" value={p.video||''} onChange={e=>cambiar(i,'video',e.target.value)}/></label>
        <p className="muted kanto-f12-video-hint">
          {p.video ? video ? `✓ Enlace reconocido: ${video.nombre}. Se reproducirá en la tienda.` : '⚠ Enlace no reconocido: comprueba que sea público y del formato admitido.' : 'Solo pega el enlace compartido del video, sin descargar ni subir el archivo.'}
        </p>
        <label>Enlace interno al producto (opcional)
          <input placeholder="/producto/15" value={p.enlace||''} onChange={e=>cambiar(i,'enlace',e.target.value)}/></label>
        <p className="muted">No pongas <code>/</code> para ampliar la promoción: esa ruta solo abre el inicio. El botón <b>Ver carta / Reproducir video</b> ya abrirá la ventana.</p>
        <label><input type="checkbox" style={{width:'auto'}} checked={!!p.activa} onChange={e=>cambiar(i,'activa',e.target.checked)}/> Publicada</label>
        <div className="row gap wrap"><button type="button" className="ghost" onClick={()=>setPreview(p)}>Vista previa de carta / video</button></div>
      </section>;
    })}
    <div className="row gap wrap">
      <button type="button" className="ghost" disabled={items.length>=20} onClick={()=>setItems(a=>[...a,nueva()])}>+ Añadir promoción</button>
      <button type="button" disabled={ocupado} onClick={guardar}>{ocupado?'Guardando…':'Guardar promociones'}</button>
    </div>
    {error && <p className="alert" role="alert">{error}</p>}
    {mensaje && <p className="ok" role="status">{mensaje}</p>}
    {preview && createPortal(<div className="kanto-f11-admin-backdrop kanto-f12-admin-modal"
      onMouseDown={e=>{if(e.target===e.currentTarget)setPreview(null);}}>
      <div className="kanto-f11-admin-preview" role="dialog" aria-modal="true" aria-label="Vista previa de promoción">
        <button type="button" className="ghost" onClick={()=>setPreview(null)}>✕ Cerrar</button>
        {(() => {const v=obtenerVideoPromo(preview.video);
          if (v?.tipo === 'archivo') return <video className="kanto-f12-admin-media" controls playsInline preload="metadata" poster={preview.imagen||undefined} src={v.url}/>;
          if (v) return <iframe className="kanto-f12-admin-media" title={`Video de ${preview.titulo}`} src={v.url} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>;
          if (preview.imagen) return <img className="kanto-f12-admin-media" src={preview.imagen} alt={preview.titulo||'Promoción'}/>;
          return <p>Agrega una imagen o un enlace de video para mostrarlo.</p>;
        })()}
        <h2>{preview.titulo||'Nueva promoción'}</h2><p>{preview.descripcion}</p>
      </div>
    </div>,document.body)}
  </div>;
}
