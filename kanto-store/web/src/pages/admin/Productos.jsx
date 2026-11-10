import { useEffect, useState } from 'react';
import { api, bs, etiqueta } from '../../api.js';
import { useAuth } from '../../context.jsx';

const NUEVO = { sku: '', tipo: 'single', subtipo_sellado: '', nombre: '', descripcion: '', expansion_id: '', numero_coleccion: '', rareza: '', idioma: 'ingles', estado_conservacion: 'near_mint', precio: '', stock: 0, stock_minimo: 2, imagen_url: '', activo: 1 };

export default function Productos() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [exps, setExps] = useState([]);
  const [meta, setMeta] = useState({ rarezas: [], idiomas: [], estados: [] });
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  const cargar = () => api('/admin/productos').then(setRows).catch((e) => setError(e.message));
  useEffect(() => { cargar(); api('/expansiones').then(setExps); api('/meta').then(setMeta); }, []);

  const set = (k) => (e) => setEdit({ ...edit, [k]: e.target.value });
  const guardar = async (e) => {
    e.preventDefault(); setError('');
    const body = { ...edit };
    ['expansion_id', 'subtipo_sellado', 'rareza'].forEach((k) => { if (body[k] === '') body[k] = null; });
    delete body.id; delete body.expansion; delete body.creado_en;
    try {
      await api(edit.id ? `/admin/productos/${edit.id}` : '/admin/productos', { method: edit.id ? 'PUT' : 'POST', body });
      setEdit(null); cargar();
    } catch (err) { setError(err.message); }
  };
  const borrar = async (p) => {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return;
    try { const r = await api(`/admin/productos/${p.id}`, { method: 'DELETE' }); if (r.desactivado) alert('Tiene pedidos asociados: se desactivó en lugar de borrarse.'); cargar(); } catch (e) { setError(e.message); }
  };

  const vis = rows.filter((p) => (p.nombre + p.sku).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="row between"><h1>Productos</h1><button onClick={() => setEdit({ ...NUEVO })}>+ Nuevo</button></div>
      {error && <p className="alert">{error}</p>}
      <input placeholder="Filtrar…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="table-wrap"><table className="data">
        <thead><tr><th>SKU</th><th>Nombre</th><th>Tipo</th><th>Estado</th><th>Precio</th><th>Stock</th><th>Activo</th><th /></tr></thead>
        <tbody>{vis.map((p) => (
          <tr key={p.id}><td>{p.sku}</td><td>{p.nombre}<div className="muted">{p.expansion}</div></td><td>{etiqueta(p.tipo)}</td>
            <td>{etiqueta(p.estado_conservacion)}</td><td>{bs(p.precio)}</td>
            <td className={p.stock <= p.stock_minimo ? 'bad' : ''}>{p.stock}</td><td>{p.activo ? '✔' : '—'}</td>
            <td className="row gap"><button className="ghost sm" onClick={() => setEdit({ ...p, expansion_id: p.expansion_id ?? '', subtipo_sellado: p.subtipo_sellado ?? '', rareza: p.rareza ?? '', imagen_url: p.imagen_url ?? '', descripcion: p.descripcion ?? '', numero_coleccion: p.numero_coleccion ?? '' })}>Editar</button>
              {user.rol === 'admin' && <button className="ghost sm danger" onClick={() => borrar(p)}>Borrar</button>}</td></tr>))}</tbody>
      </table></div>

      {edit && (
        <div className="modal" onClick={() => setEdit(null)}>
          <form className="panel" onClick={(e) => e.stopPropagation()} onSubmit={guardar}>
            <h3>{edit.id ? 'Editar' : 'Nuevo'} producto</h3>
            <div className="form-grid">
              <label>SKU<input required value={edit.sku} onChange={set('sku')} /></label>
              <label>Nombre<input required value={edit.nombre} onChange={set('nombre')} /></label>
              <label>Tipo<select value={edit.tipo} onChange={set('tipo')}><option value="single">Single</option><option value="sellado">Sellado</option></select></label>
              {edit.tipo === 'sellado' && <label>Sellado<select value={edit.subtipo_sellado} onChange={set('subtipo_sellado')}><option value="">—</option><option value="sobre">Sobre</option><option value="caja">Caja</option><option value="mazo">Mazo</option></select></label>}
              <label>Expansión<select value={edit.expansion_id} onChange={set('expansion_id')}><option value="">—</option>{exps.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}</select></label>
              <label>N.º colección<input value={edit.numero_coleccion} onChange={set('numero_coleccion')} /></label>
              <label>Rareza<select value={edit.rareza} onChange={set('rareza')}><option value="">—</option>{meta.rarezas.map((r) => <option key={r} value={r}>{etiqueta(r)}</option>)}</select></label>
              <label>Idioma<select value={edit.idioma} onChange={set('idioma')}>{meta.idiomas.map((r) => <option key={r} value={r}>{etiqueta(r)}</option>)}</select></label>
              <label>Estado<select value={edit.estado_conservacion} onChange={set('estado_conservacion')}>{meta.estados.map((r) => <option key={r} value={r}>{etiqueta(r)}</option>)}</select></label>
              <label>Precio (Bs)<input required type="number" step="0.01" min="0" value={edit.precio} onChange={set('precio')} /></label>
              <label>Stock<input type="number" min="0" value={edit.stock} onChange={set('stock')} /></label>
              <label>Stock mínimo<input type="number" min="0" value={edit.stock_minimo} onChange={set('stock_minimo')} /></label>
              <label>URL de imagen<input value={edit.imagen_url} onChange={set('imagen_url')} /></label>
              <label>Activo<select value={edit.activo} onChange={set('activo')}><option value={1}>Sí</option><option value={0}>No</option></select></label>
            </div>
            <label>Descripción<textarea rows="2" value={edit.descripcion} onChange={set('descripcion')} /></label>
            {error && <p className="alert">{error}</p>}
            <div className="row gap"><button>Guardar</button><button type="button" className="ghost" onClick={() => setEdit(null)}>Cancelar</button></div>
          </form>
        </div>)}
    </>
  );
}
