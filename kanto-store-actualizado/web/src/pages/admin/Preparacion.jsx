import { useEffect, useState } from 'react';
import { api, bs, etiqueta } from '../../api.js';
import { useAuth } from '../../context.jsx';

export default function Preparacion() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({}); // pin / monto por pedido (retiro en tienda)

  const cargar = () => api('/pedidos/preparacion').then(setRows).catch((e) => setError(e.message));
  useEffect(() => { cargar(); const t = setInterval(cargar, 30000); return () => clearInterval(t); }, []);
  const run = async (fn, ok) => { setError(''); setMsg(''); try { await fn(); if (ok) setMsg(ok); cargar(); } catch (e) { setError(e.message); } };
  const post = (id, a, body) => api(`/pedidos/${id}/${a}`, { method: 'POST', body: body || {} });
  // Marca el ítem al instante (optimista) y confirma con el servidor; si falla, vuelve a cargar.
  const marcar = (p, i, v) => {
    setRows((cur) => cur.map((x) => (x.id === p.id ? { ...x, items: x.items.map((it) => (it.id === i.id ? { ...it, verificado: v ? 1 : 0 } : it)) } : x)));
    api(`/pedidos/${p.id}/items/${i.id}`, { method: 'PATCH', body: { verificado: v } }).catch((e) => { setError(e.message); cargar(); });
  };
  const setF = (id, k, v) => setForm({ ...form, [id]: { ...form[id], [k]: v } });

  const nuevos = rows.filter((p) => p.estado === 'pagado');
  const enCurso = rows.filter((p) => p.estado === 'preparando');
  const retiros = rows.filter((p) => p.estado === 'empacado');

  return (
    <>
      <h1>Preparación y empaque</h1>
      <p className="muted">1) Toma el pedido · 2) Revisa cada carta contra el checklist (estado y cantidad) · 3) Marca "Empacado". Solo se puede empacar con todo verificado.</p>
      {error && <p className="alert">{error}</p>}{msg && <p className="ok">{msg}</p>}

      <h2>Por preparar ({nuevos.length})</h2>
      {!nuevos.length && <p className="empty">No hay pedidos nuevos.</p>}
      {nuevos.map((p) => (
        <div className="panel" key={p.id}>
          <div className="row between"><strong>{p.codigo}</strong><span className="muted">{etiqueta(p.metodo_entrega)} · {new Date(p.pagado_en || p.creado_en).toLocaleString('es-BO')}</span></div>
          <ul>{p.items.map((i) => <li key={i.id}>{i.cantidad} × {i.nombre}</li>)}</ul>
          <button onClick={() => run(() => post(p.id, 'preparar'), `Tomaste ${p.codigo}`)}>Iniciar preparación</button>
        </div>))}

      <h2>En preparación ({enCurso.length})</h2>
      {enCurso.map((p) => {
        const mio = user.rol === 'admin' || p.empacador_id === user.id;
        const completo = p.items.every((i) => i.verificado);
        return (
          <div className="panel" key={p.id}>
            <div className="row between"><strong>{p.codigo}</strong><span className="muted">Empaca: {p.empacador || '—'}</span></div>
            <ul className="checklist">{p.items.map((i) => (
              <li key={i.id}><label className="radio"><input type="checkbox" disabled={!mio} checked={!!i.verificado}
                onChange={(e) => marcar(p, i, e.target.checked)} />
                <span>{i.cantidad} × {i.nombre}</span></label></li>))}</ul>
            <button disabled={!mio || !completo} onClick={() => run(() => post(p.id, 'empacar'), `${p.codigo} empacado`)}>
              {completo ? 'Marcar como empacado' : `Faltan ${p.items.filter((i) => !i.verificado).length} por verificar`}</button>
            {!mio && <span className="muted"> (lo prepara otro empacador)</span>}
          </div>);
      })}
      {!enCurso.length && <p className="empty">Nada en preparación.</p>}

      {retiros.length > 0 && <h2>Listos para retiro en tienda ({retiros.length})</h2>}
      {retiros.map((p) => (
        <div className="panel" key={p.id}>
          <div className="row between"><strong>{p.codigo}</strong><span>{p.nombre_cliente}</span></div>
          <ul>{p.items.map((i) => <li key={i.id}>{i.cantidad} × {i.nombre}</li>)}</ul>
          <div className="row gap wrap">
            <input style={{ maxWidth: 160 }} placeholder="PIN del cliente" maxLength={6} value={form[p.id]?.pin || ''} onChange={(e) => setF(p.id, 'pin', e.target.value)} />
            {p.metodo_pago === 'contra_entrega' && <input style={{ maxWidth: 180 }} type="number" step="0.01" placeholder={`Cobrar ${bs(p.total)}`} value={form[p.id]?.monto || ''} onChange={(e) => setF(p.id, 'monto', e.target.value)} />}
            <button onClick={() => run(() => post(p.id, 'retirar', { pin: form[p.id]?.pin, monto_cobrado: form[p.id]?.monto }), `${p.codigo} entregado`)}>Entregar al cliente</button>
          </div>
        </div>))}
    </>
  );
}
