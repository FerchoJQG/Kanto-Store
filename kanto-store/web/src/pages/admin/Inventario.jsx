import { useEffect, useState } from 'react';
import { api, etiqueta } from '../../api.js';

export default function Inventario() {
  const [rows, setRows] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [meta, setMeta] = useState({ estados: [] });
  const [msg, setMsg] = useState('');
  const [draft, setDraft] = useState({});

  const cargar = () => {
    api('/admin/productos').then(setRows);
    api('/admin/inventario/alertas').then(setAlertas);
  };
  useEffect(() => { cargar(); api('/meta').then(setMeta); }, []);

  const guardar = async (p) => {
    const d = draft[p.id] || {};
    try {
      const r = await api(`/admin/productos/${p.id}/stock`, { method: 'PATCH', body: { cantidad: d.stock ?? p.stock, estado_conservacion: d.estado ?? p.estado_conservacion } });
      setMsg(`"${p.nombre}" actualizado${r.avisos ? ` · ${r.avisos} aviso(s) enviados a lista de deseos` : ''}`);
      setDraft((x) => { const n = { ...x }; delete n[p.id]; return n; }); cargar();
    } catch (e) { setMsg(e.message); }
  };
  const up = (id, k, v) => setDraft({ ...draft, [id]: { ...draft[id], [k]: v } });

  return (
    <>
      <h1>Inventario</h1>
      {alertas.length > 0 && <div className="alert">⚠ Stock bajo: {alertas.map((a) => `${a.nombre} (${a.stock})`).join(', ')}</div>}
      {msg && <p className="ok">{msg}</p>}
      <div className="table-wrap"><table className="data">
        <thead><tr><th>SKU</th><th>Producto</th><th>Stock</th><th>Estado de conservación</th><th /></tr></thead>
        <tbody>{rows.map((p) => (
          <tr key={p.id}><td>{p.sku}</td><td>{p.nombre}</td>
            <td><input type="number" min="0" style={{ width: 80 }} value={draft[p.id]?.stock ?? p.stock} onChange={(e) => up(p.id, 'stock', e.target.value)} /></td>
            <td><select value={draft[p.id]?.estado ?? p.estado_conservacion} onChange={(e) => up(p.id, 'estado', e.target.value)}>{meta.estados.map((s) => <option key={s} value={s}>{etiqueta(s)}</option>)}</select></td>
            <td><button className="sm" disabled={!draft[p.id]} onClick={() => guardar(p)}>Guardar</button></td></tr>))}</tbody>
      </table></div>
    </>
  );
}
