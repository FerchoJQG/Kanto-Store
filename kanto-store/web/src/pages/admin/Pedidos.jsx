import { useEffect, useState } from 'react';
import { api, bs, etiqueta } from '../../api.js';

const ESTADOS = ['pendiente', 'pagado', 'preparando', 'en_transito', 'entregado', 'cancelado'];

export default function Pedidos() {
  const [rows, setRows] = useState([]);
  const [reps, setReps] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [error, setError] = useState('');

  const cargar = () => api(`/pedidos/admin/todos${filtro ? `?estado=${filtro}` : ''}`).then(setRows).catch((e) => setError(e.message));
  useEffect(() => { cargar(); }, [filtro]);
  useEffect(() => { api('/pedidos/admin/repartidores').then(setReps); }, []);

  const run = async (fn) => { setError(''); try { await fn(); cargar(); } catch (e) { setError(e.message); } };
  return (
    <>
      <div className="row between"><h1>Pedidos</h1>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}><option value="">Todos</option>{ESTADOS.map((s) => <option key={s} value={s}>{etiqueta(s)}</option>)}</select></div>
      {error && <p className="alert">{error}</p>}
      {rows.map((p) => (
        <div className="panel" key={p.id}>
          <div className="row between"><strong>{p.codigo}</strong><span className="tag">{etiqueta(p.estado)}</span></div>
          <p>{p.nombre_cliente} · {p.email} {p.telefono && `· ${p.telefono}`}<br />
            <span className="muted">{etiqueta(p.metodo_entrega)}{p.direccion ? `: ${p.direccion}` : ''} · {etiqueta(p.metodo_pago)} · {new Date(p.creado_en).toLocaleString('es-BO')}</span></p>
          <ul>{p.items.map((i, k) => <li key={k}>{i.cantidad} × {i.nombre}</li>)}</ul>
          <div className="row between wrap gap"><strong>{bs(p.total)}</strong>
            <div className="row gap wrap">
              {p.estado === 'pendiente' && <button className="sm" onClick={() => run(() => api(`/pedidos/${p.id}/confirmar-pago`, { method: 'POST' }))}>Confirmar pago (simulado)</button>}
              {p.metodo_entrega === 'envio' && (
                <select value={p.repartidor_id || ''} onChange={(e) => run(() => api(`/pedidos/${p.id}/repartidor`, { method: 'PATCH', body: { repartidor_id: +e.target.value } }))}>
                  <option value="" disabled>Asignar repartidor</option>{reps.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</select>)}
              {!['entregado', 'cancelado'].includes(p.estado) && (
                <select value="" onChange={(e) => e.target.value && run(() => api(`/pedidos/${p.id}/estado`, { method: 'PATCH', body: { estado: e.target.value } }))}>
                  <option value="">Cambiar estado…</option>{ESTADOS.filter((s) => s !== p.estado).map((s) => <option key={s} value={s}>{etiqueta(s)}</option>)}</select>)}
            </div></div>
        </div>))}
      {!rows.length && <p className="empty">No hay pedidos.</p>}
    </>
  );
}
