import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { api, apiBase, imagenADataUrl } from '../../api.js';
import { obtenerVideoPromo } from '../../utils/promoVideo.js';
import '../../components/zz-f11-stability.css';
import '../../components/zz-f12-carousel-video.css';
import '../../components/zz-f13-promociones.css';

const nueva = () => ({
  id: `promo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  tipo: 'novedad', producto_id: null, titulo: '', descripcion: '',
  imagen: '', video: '', enlace: '', activa: true,
});
const miniaturaGoogle = url => /(?:encrypted-tbn\d?\.gstatic\.com|google\.com\/images\?)/i.test(url || '');

// Un afiche sencillo generado en el navegador. El archivo resultante se sube al MySQL
// existente mediante la misma ruta protegida que usa el botón "Subir afiche".
function aficheAutomatico(titulo, descripcion) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200; canvas.height = 1500;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Tu navegador no permite crear el afiche. Puedes subir uno propio.');
  const w = canvas.width, h = canvas.height;
  const fondo = ctx.createLinearGradient(0, 0, w, h);
  fondo.addColorStop(0, '#101a35'); fondo.addColorStop(.48, '#223a70'); fondo.addColorStop(1, '#070c1a');
  ctx.fillStyle = fondo; ctx.fillRect(0, 0, w, h);
  const halo = ctx.createRadialGradient(620, 700, 40, 600, 700, 670);
  halo.addColorStop(0, '#4e69bb66'); halo.addColorStop(1, '#15275100');
  ctx.fillStyle = halo; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#d9bb5655'; ctx.lineWidth = 4; ctx.strokeRect(51, 50, w - 102, h - 100);
  for (let i = 0; i < 17; i++) {
    ctx.beginPath(); ctx.strokeStyle = `rgba(255,217,85,${.08 + i * .008})`;
    ctx.lineWidth = 1.2; ctx.arc(w / 2, 690, 190 + i * 22, 0, Math.PI * 2); ctx.stroke();
  }
  for (let i = 0; i < 50; i++) {
    const x = 90 + ((i * 137) % 1010), y = 130 + ((i * 251) % 1190);
    ctx.fillStyle = i % 4 ? '#fff9' : '#ffe47baa';
    ctx.beginPath(); ctx.arc(x, y, i % 5 === 0 ? 3.5 : 1.7, 0, Math.PI * 2); ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe26b'; ctx.font = '900 46px system-ui, sans-serif';
  ctx.fillText('✦  KANTO TCG STORE  ✦', w / 2, 177);
  ctx.fillStyle = '#bfcff0'; ctx.font = '700 30px system-ui, sans-serif';
  ctx.fillText('PROMOCIÓN · NOVEDAD', w / 2, 245);
  const tituloLimpio = String(titulo || 'NUEVA CARTA').trim().toUpperCase();
  function lineas(texto, maxAncho, fuente, maxLineas) {
    ctx.font = fuente;
    const palabras = texto.split(/\s+/), out = []; let linea = '';
    for (const palabra of palabras) {
      const prueba = linea ? `${linea} ${palabra}` : palabra;
      if (linea && ctx.measureText(prueba).width > maxAncho) { out.push(linea); linea = palabra; }
      else linea = prueba;
    }
    if (linea) out.push(linea);
    return out.slice(0, maxLineas);
  }
  const fuente = '900 87px system-ui, sans-serif';
  const lineasTitulo = lineas(tituloLimpio, 985, fuente, 5);
  const alturaTitulo = 108 * lineasTitulo.length;
  const inicio = 670 - alturaTitulo / 2;
  ctx.font = fuente; ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#050716'; ctx.shadowBlur = 26;
  lineasTitulo.forEach((l, i) => ctx.fillText(l, w / 2, inicio + i * 108));
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffd646'; ctx.fillRect(425, 910, 350, 6);
  const lineasDesc = lineas(String(descripcion || 'Descubre lo nuevo en Kanto TCG Store.'), 980,
    '500 35px system-ui, sans-serif', 5);
  ctx.fillStyle = '#d5e1fa'; ctx.font = '500 35px system-ui, sans-serif';
  lineasDesc.forEach((l, i) => ctx.fillText(l, w / 2, 1000 + i * 54));
  ctx.fillStyle = '#ffe26b'; ctx.font = '800 33px system-ui, sans-serif';
  ctx.fillText('DESCUBRE LA COLECCIÓN', w / 2, 1375);
  return canvas.toDataURL('image/jpeg', .85);
}

export default function Promociones() {
  const [items, setItems] = useState([]);
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [subiendo, setSubiendo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [verVideo, setVerVideo] = useState(false);

  useEffect(() => {
    api('/config/admin/promociones')
      .then(data => setItems(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message));
    api('/admin/productos')
      .then(data => setProductos(Array.isArray(data) ? data : []))
      .catch(() => { /* El listado puede no estar disponible; las novedades siguen funcionando. */ });
  }, []);
  const cambiar = (id, campo, valor) => setItems(actual => actual.map(p => p.id === id ? { ...p, [campo]: valor } : p));
  const productoFiltrado = useMemo(() => productos.filter(p =>
    `${p.nombre} ${p.sku || ''} ${p.id}`.toLowerCase().includes(busqueda.toLowerCase())).slice(0, 75), [productos, busqueda]);

  function asociarProducto(promo, id) {
    const productoId = Number(id);
    const producto = productos.find(p => Number(p.id) === productoId);
    setItems(actual => actual.map(p => p.id === promo.id ? {
      ...p,
      producto_id: producto ? productoId : null,
      enlace: producto ? `/producto/${productoId}` : '',
      titulo: p.titulo || producto?.nombre || '',
      imagen: p.imagen || producto?.imagen_url || '',
    } : p));
  }

  async function subirData(promo, imagen) {
    setSubiendo(promo.id); setError(''); setMensaje('');
    try {
      const result = await api('/config/admin/promociones/afiches', { method: 'POST', body: { imagen } });
      const urlPublica = result.url.replace(/^\/api(?=\/)/, apiBase.replace(/\/$/, ''));
      cambiar(promo.id, 'imagen', urlPublica);
      setMensaje('Afiche guardado en MySQL. Pulsa Guardar promociones para publicarlo.');
    } catch (e) { setError(e.message); }
    finally { setSubiendo(null); }
  }
  async function subirArchivo(promo, archivo) {
    if (!archivo) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) {
      setError('Utiliza un afiche JPG, PNG o WebP.'); return;
    }
    try {
      // Reducir el afiche antes de subirlo: evita superar el límite de la API.
      let img = await imagenADataUrl(archivo, 1600, .82);
      if (img.length > 2_000_000) img = await imagenADataUrl(archivo, 1200, .68);
      if (img.length > 2_000_000) throw new Error('El afiche es demasiado grande. Reduce su tamaño.');
      await subirData(promo, img);
    } catch (e) { setError(e.message); }
  }
  async function crearAfiche(promo) {
    try { await subirData(promo, aficheAutomatico(promo.titulo, promo.descripcion)); }
    catch (e) { setError(e.message); }
  }

  async function guardar() {
    setError(''); setMensaje('');
    for (const p of items) {
      if (!p.titulo?.trim()) { setError('Cada promoción necesita un título.'); return; }
      if (!p.imagen?.trim() && !obtenerVideoPromo(p.video)) {
        setError(`La promoción «${p.titulo}» necesita un afiche o video.`); return;
      }
      if (p.video && !obtenerVideoPromo(p.video)) {
        setError(`Video inválido en «${p.titulo}». Introduce un enlace público de YouTube, Shorts, Vimeo, Drive o MP4/WebM.`); return;
      }
      if (p.tipo === 'producto' && !Number(p.producto_id)) {
        setError(`Selecciona la carta del catálogo para «${p.titulo}».`); return;
      }
    }
    setOcupado(true);
    try {
      await api('/config/admin/promociones', { method: 'PUT', body: { promociones: items } });
      setMensaje('Promociones guardadas. El afiche y los botones condicionales aparecerán en la tienda.');
    } catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  }

  return <div className="kanto-f13-admin kanto-f12-admin-promos">
    <h1>Promociones de la tienda</h1>
    <p className="muted">Anuncia <b>una carta nueva</b> aunque todavía no esté en el inventario, o promociona <b>un producto existente</b>. Puedes subir tu propio afiche, generar uno con el título y añadir un video externo opcional.</p>
    {items.map((p, i) => {
      const video = obtenerVideoPromo(p.video);
      const tipo = p.tipo === 'producto' ? 'producto' : 'novedad';
      const seleccion = productos.find(x => Number(x.id) === Number(p.producto_id));
      return <section className="panel kanto-f13-editor" key={p.id}>
        <div className="row between wrap gap"><strong>Promoción {i + 1}</strong>
          <button type="button" className="ghost sm danger" onClick={() => setItems(a => a.filter(x => x.id !== p.id))}>Eliminar</button></div>
        <div className="kanto-f13-type" role="group" aria-label={`Tipo de promoción ${i + 1}`}>
          <button type="button" className={tipo === 'novedad' ? 'is-selected' : ''} onClick={() => setItems(a => a.map(x => x.id === p.id ? { ...x, tipo: 'novedad', producto_id: null, enlace: '' } : x))}>✦ Carta nueva / anuncio</button>
          <button type="button" className={tipo === 'producto' ? 'is-selected' : ''} onClick={() => cambiar(p.id, 'tipo', 'producto')}>◈ Producto del catálogo</button>
        </div>
        {tipo === 'producto' ? <div className="kanto-f13-association">
          <label>Buscar carta o SKU<input placeholder="Buscar por nombre o SKU" value={busqueda} onChange={e => setBusqueda(e.target.value)}/></label>
          <label>Producto a promocionar<select value={p.producto_id || ''} onChange={e => asociarProducto(p, e.target.value)}>
            <option value="">Selecciona un producto</option>
            {seleccion && !productoFiltrado.some(x => Number(x.id) === Number(seleccion.id)) && <option value={seleccion.id}>{seleccion.nombre} · #{seleccion.id}</option>}
            {productoFiltrado.map(item => <option value={item.id} key={item.id}>{item.nombre} · {item.sku || `#${item.id}`}</option>)}
          </select></label>
          <p className="muted">El botón <b>Ver producto</b> se abrirá en su ficha del catálogo. Puedes usar otro afiche diferente a la foto del producto.</p>
        </div> : <p className="muted kanto-f13-hint">Esta promoción puede anunciar una carta todavía no disponible. No se crea stock automáticamente. <Link to="/admin/productos">Registrar la carta como producto</Link>.</p>}
        <label>Título<input maxLength={90} value={p.titulo || ''} onChange={e => cambiar(p.id, 'titulo', e.target.value)} placeholder="Ej. Nueva carta Zoro Ultra Rara"/></label>
        <label>Descripción<textarea maxLength={250} rows={3} value={p.descripcion || ''} onChange={e => cambiar(p.id, 'descripcion', e.target.value)} placeholder="Texto de la novedad o campaña"/></label>
        <div className="kanto-f13-poster-editor">
          <div className="kanto-f13-poster-preview">
            {p.imagen ? <img src={p.imagen} alt={`Afiche de ${p.titulo || 'promoción'}`} loading="lazy"/> : video?.miniatura ? <img src={video.miniatura} alt="Miniatura del video"/> : <span>Tu afiche aparecerá aquí</span>}
          </div>
          <div className="kanto-f13-poster-options">
            <strong>Afiche promocional</strong>
            <p className="muted">Sube uno creado por ti o genera un afiche Kanto con el título. Se guarda en tu MySQL, <b>no en GitHub</b>.</p>
            <label className="kanto-f13-file-label">📁 Subir afiche JPG/PNG/WebP
              <input type="file" accept="image/jpeg,image/png,image/webp" disabled={subiendo === p.id}
                onChange={e => { subirArchivo(p, e.target.files?.[0]); e.target.value = ''; }}/>
            </label>
            <button type="button" className="ghost" disabled={subiendo === p.id} onClick={() => crearAfiche(p)}>{subiendo === p.id ? 'Guardando afiche…' : '✦ Crear afiche con el título'}</button>
            <label>O usar URL de imagen original<input type="url" placeholder="https://ejemplo.com/afiche.jpg" value={p.imagen || ''} onChange={e => cambiar(p.id, 'imagen', e.target.value)}/></label>
            {miniaturaGoogle(p.imagen) && <small className="warn">La URL es una miniatura de Google; utiliza la imagen original para evitar desenfoque.</small>}
          </div>
        </div>
        <label>Video opcional (YouTube, Shorts, Vimeo, Drive o MP4/WebM)
          <input type="url" placeholder="https://www.youtube.com/watch?v=XXXXXXXXXXX" value={p.video || ''} onChange={e => cambiar(p.id, 'video', e.target.value)}/></label>
        <p className="muted kanto-f13-video-hint">{!p.video ? 'Sin video: la promoción solo mostrará Ver afiche y, si corresponde, Ver producto.' : video ? `✓ Video reconocido: ${video.nombre}. Aparecerá un botón ▶ Ver video.` : '⚠ La URL de video no es compatible.'}</p>
        <label className="kanto-f13-check"><input type="checkbox" checked={!!p.activa} onChange={e => cambiar(p.id, 'activa', e.target.checked)}/> Publicada</label>
        <div className="row gap wrap"><button type="button" className="ghost" onClick={() => { setPreview(p); setVerVideo(false); }}>Vista previa de la promoción</button>
          {video && <span className="kanto-f13-video-ok">▶ Incluye video</span>}</div>
      </section>;
    })}
    <div className="row gap wrap kanto-f13-footer">
      <button type="button" className="ghost" disabled={items.length >= 20} onClick={() => setItems(a => [...a, nueva()])}>+ Añadir promoción</button>
      <button type="button" disabled={ocupado || !!subiendo} onClick={guardar}>{ocupado ? 'Guardando…' : 'Guardar promociones'}</button>
    </div>
    {error && <p className="alert" role="alert">{error}</p>}
    {mensaje && <p className="ok" role="status">{mensaje}</p>}
    {preview && createPortal(<div className="kanto-f11-admin-backdrop kanto-f12-admin-modal" onMouseDown={e => { if (e.target === e.currentTarget) setPreview(null); }}>
      <div className="kanto-f11-admin-preview kanto-f13-preview-modal" role="dialog" aria-modal="true" aria-label={`Vista previa ${preview.titulo || 'promoción'}`}>
        <button type="button" className="ghost" onClick={() => setPreview(null)}>✕ Cerrar</button>
        {verVideo && obtenerVideoPromo(preview.video) ? (() => { const v = obtenerVideoPromo(preview.video);
          return v.tipo === 'archivo' ? <video className="kanto-f12-admin-media" controls playsInline preload="metadata" poster={preview.imagen || undefined} src={v.url}/>
            : <iframe className="kanto-f12-admin-media" title={`Video de ${preview.titulo}`} src={v.url} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>;
        })() : <div className="kanto-f13-preview-image">{preview.imagen || obtenerVideoPromo(preview.video)?.miniatura ? <img src={preview.imagen || obtenerVideoPromo(preview.video)?.miniatura} alt={preview.titulo}/> : <div>Sin afiche</div>}</div>}
        <h2>{preview.titulo || 'Nueva promoción'}</h2><p>{preview.descripcion}</p>
        <div className="row gap wrap">
          <button type="button" className="ghost" onClick={() => setVerVideo(false)}>⤢ Ver afiche</button>
          {obtenerVideoPromo(preview.video) && <button type="button" onClick={() => setVerVideo(true)}>▶ Ver video</button>}
          {preview.tipo === 'producto' && preview.producto_id && <span className="kanto-f13-product-tag">Ver producto · #{preview.producto_id}</span>}
        </div>
      </div>
    </div>, document.body)}
  </div>;
}
