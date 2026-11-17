import { useEffect, useState } from 'react';
import { api, bs, etiqueta } from '../../api.js';

export default function Entregas() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({});
  const cargar = () => api('/pedidos/entregas').then(setRows).catch((e) => setError(e.message));
  useEffect(() => { cargar(); }, []);
  const run = async (fn, ok) => { setError(''); setMsg(''); try { await fn(); if (ok) setMsg(ok); cargar(); } catch (e) { setError(e.message); } };
  const post = (id, a, body) => api(`/pedidos/${id}/${a}`, { method: 'POST', body: body || {} });
  const setF = (id, k, v) => setForm({ ...form, [id]: { ...form[id], [k]: v } });

  return (
    <>
      <h1>Mis entregas</h1>
      <p className="muted">Al llegar, pide al cliente su <b>PIN de entrega</b> (6 dígitos) para cerrar el pedido. Si es contra entrega, registra el cobro.</p>
      {error && <p className="alert">{error}</p>}{msg && <p className="ok">{msg}</p>}
      {!rows.length && <p className="empty">No tienes entregas asignadas.</p>}
      {rows.map((p) => (
        <div className="panel" key={p.id}>
          <div className="row between"><strong>{p.codigo}</strong><span className={`tag est-${p.estado}`}>{etiqueta(p.estado)}</span></div>
          <p>{p.nombre_cliente} · {p.telefono && <a href={`tel:${p.telefono}`}>{p.telefono}</a>}<br />📍 {p.direccion}{p.repartidor && <><br /><span className="muted">Repartidor: {p.repartidor}</span></>}</p>
          <ul>{p.items.map((i) => <li key={i.id}>{i.cantidad} × {i.nombre}</li>)}</ul>
          <p><strong>{bs(p.total)}</strong>{p.metodo_pago === 'contra_entrega' ? ' — COBRAR EN EFECTIVO' : ' — ya pagado'}</p>
          {p.estado === 'empacado' && (p.repartidor_id
            ? <button onClick={() => run(() => post(p.id, 'salir'), `${p.codigo}: en camino`)}>Salir a entregar</button>
            : <p className="warn">Falta asignar repartidor (administrador).</p>)}
          {p.estado === 'en_transito' && (
            <div className="row gap wrap">
              <input style={{ maxWidth: 150 }} placeholder="PIN del cliente" maxLength={6} inputMode="numeric" value={form[p.id]?.pin || ''} onChange={(e) => setF(p.id, 'pin', e.target.value)} />
              {p.metodo_pago === 'contra_entrega' && <input style={{ maxWidth: 160 }} type="number" step="0.01" placeholder="Monto cobrado" value={form[p.id]?.monto || ''} onChange={(e) => setF(p.id, 'monto', e.target.value)} />}
              <input style={{ maxWidth: 220 }} placeholder="Nota (quién recibió)" value={form[p.id]?.nota || ''} onChange={(e) => setF(p.id, 'nota', e.target.value)} />
              <button onClick={() => run(() => post(p.id, 'entregar', { pin: form[p.id]?.pin, monto_cobrado: form[p.id]?.monto, nota: form[p.id]?.nota }), `${p.codigo} entregado ✔`)}>Confirmar entrega</button>
            </div>)}
        </div>))}
    </>
  );
}
