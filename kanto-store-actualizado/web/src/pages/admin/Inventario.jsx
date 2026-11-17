import { useEffect, useState } from 'react';
import { api, etiqueta, stockClase } from '../../api.js';

export default function Inventario() {
  const [rows, setRows] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [meta, setMeta] = useState({ estados: [] });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [aj, setAj] = useState(null);      // ajuste de stock abierto
  const [kardex, setKardex] = useState(null);
  const [q, setQ] = useState('');

  const cargar = () => { api('/admin/productos').then(setRows); api('/admin/inventario/alertas').then(setAlertas); };
  useEffect(() => { cargar(); api('/meta').then(setMeta); }, []);

  const guardarEstado = async (p, estado) => {
    setError('');
    try { await api(`/admin/productos/${p.id}/stock`, { method: 'PATCH', body: { cantidad: p.stock, estado_conservacion: estado } }); setMsg(`Estado de "${p.nombre}" actualizado`); cargar(); } catch (e) { setError(e.message); }
  };
  const ajustar = async (e) => {
    e.preventDefault(); setError('');
    try {
      const body = { motivo: aj.motivo, tipo: aj.tipo };
      if (aj.modo === 'delta') body.delta = (aj.signo === '-' ? -1 : 1) * Math.abs(parseInt(aj.valor || 0));
      else body.cantidad = parseInt(aj.valor);
      const r = await api(`/admin/productos/${aj.p.id}/stock`, { method: 'PATCH', body });
      setMsg(`"${aj.p.nombre}": stock ahora ${r.stock}${r.avisos ? ` · ${r.avisos} aviso(s) a listas de deseos` : ''}`);
      setAj(null); cargar();
    } catch (er) { setError(er.message); }
  };
  const verKardex = async (p) => setKardex({ p, filas: await api(`/admin/inventario/movimientos?producto_id=${p.id}&limit=100`) });
  const vis = rows.filter((p) => (p.nombre + p.sku).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <h1>Inventario</h1>
      {alertas.length > 0 && <div className="alert">⚠ Stock bajo: {alertas.map((a) => `${a.nombre} (${a.stock})`).join(', ')}</div>}
      {msg && <p className="ok">{msg}</p>}{error && !aj && <p className="alert">{error}</p>}
      <input placeholder="Buscar por nombre o SKU…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="table-wrap"><table className="data">
        <thead><tr><th>SKU</th><th>Producto</th><th>Stock</th><th>Mín.</th><th>Estado de conservación</th><th /></tr></thead>
        <tbody>{vis.map((p) => (
          <tr key={p.id}><td>{p.sku}</td><td>{p.nombre}</td>
            <td><b className={stockClase(p)}>{p.stock}</b></td><td>{p.stock_minimo}</td>
            <td><select value={p.estado_conservacion} onChange={(e) => guardarEstado(p, e.target.value)}>{meta.estados.map((s) => <option key={s} value={s}>{etiqueta(s)}</option>)}</select></td>
            <td className="row gap"><button className="sm" onClick={() => { setError(''); setAj({ p, modo: 'delta', signo: '+', valor: '', motivo: '', tipo: '' }); }}>Ajustar stock</button>
              <button className="ghost sm" onClick={() => verKardex(p)}>Kardex</button></td></tr>))}</tbody>
      </table></div>

      {aj && (
        <div className="modal" onClick={() => setAj(null)}>
          <form className="panel" onClick={(e) => e.stopPropagation()} onSubmit={ajustar}>
            <h3>Ajustar stock — {aj.p.nombre}</h3>
            <p className="muted">Stock actual: <b>{aj.p.stock}</b>. Todo ajuste queda registrado en el kardex.</p>
            <div className="row gap">
              <label className="radio"><input type="radio" checked={aj.modo === 'delta'} onChange={() => setAj({ ...aj, modo: 'delta' })} /> Sumar / restar</label>
              <label className="radio"><input type="radio" checked={aj.modo === 'final'} onChange={() => setAj({ ...aj, modo: 'final' })} /> Fijar cantidad final</label>
            </div>
            <div className="row gap">
              {aj.modo === 'delta' && <select style={{ width: 90 }} value={aj.signo} onChange={(e) => setAj({ ...aj, signo: e.target.value })}><option>+</option><option>-</option></select>}
              <input required type="number" min="0" placeholder={aj.modo === 'delta' ? 'Cantidad' : 'Nuevo stock'} value={aj.valor} onChange={(e) => setAj({ ...aj, valor: e.target.value })} />
            </div>
            <label>Tipo<select value={aj.tipo} onChange={(e) => setAj({ ...aj, tipo: e.target.value })}>
              <option value="">Automático</option><option value="entrada">Entrada (compra / reposición)</option><option value="salida">Salida (pérdida, daño)</option><option value="ajuste">Ajuste (conteo físico)</option></select></label>
            <label>Motivo (obligatorio)<input required value={aj.motivo} maxLength={200} onChange={(e) => setAj({ ...aj, motivo: e.target.value })} placeholder="Ej.: llegaron 5 sobres de proveedor" /></label>
            {error && <p className="alert">{error}</p>}
            <div className="row gap"><button>Guardar</button><button type="button" className="ghost" onClick={() => setAj(null)}>Cancelar</button></div>
          </form>
        </div>)}

      {kardex && (
        <div className="modal" onClick={() => setKardex(null)}>
          <div className="panel" onClick={(e) => e.stopPropagation()}>
            <h3>Kardex — {kardex.p.nombre}</h3>
            <div className="table-wrap"><table className="data">
              <thead><tr><th>Fecha</th><th>Tipo</th><th>Cant.</th><th>Stock</th><th>Detalle</th><th>Usuario</th></tr></thead>
              <tbody>{kardex.filas.map((m) => (
                <tr key={m.id}><td>{new Date(m.creado_en).toLocaleString('es-BO')}</td><td>{etiqueta(m.tipo)}</td>
                  <td className={m.cantidad < 0 ? 'bad' : 'ok'}>{m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}</td><td>{m.stock_resultante}</td><td>{m.nota}</td><td>{m.usuario || 'cliente'}</td></tr>))}</tbody>
            </table></div>
            <button className="ghost" onClick={() => setKardex(null)}>Cerrar</button>
          </div>
        </div>)}
    </>
  );
}
