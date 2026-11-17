import { useEffect, useState } from 'react';
import { api, bs, etiqueta, ESTADOS_PEDIDO } from '../../api.js';

export default function Pedidos() {
  const [rows, setRows] = useState([]);
  const [reps, setReps] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [error, setError] = useState('');
  const [foto, setFoto] = useState(null);

  const cargar = () => api(`/pedidos/admin/todos${filtro ? `?estado=${filtro}` : ''}`).then(setRows).catch((e) => setError(e.message));
  useEffect(() => { cargar(); }, [filtro]);
  useEffect(() => { api('/pedidos/admin/repartidores').then(setReps); }, []);

  const run = async (fn) => { setError(''); try { await fn(); cargar(); } catch (e) { setError(e.message); } };
  const post = (id, accion, body) => run(() => api(`/pedidos/${id}/${accion}`, { method: 'POST', body: body || {} }));
  const verComprobante = (p) => run(async () => { const r = await api(`/pedidos/${p.id}/comprobante-pago`); setFoto({ ...r, codigo: p.codigo, total: p.total }); });
  const rechazar = (p) => { const motivo = prompt('Motivo del rechazo (el cliente podrá volver a subir su comprobante):'); if (motivo) post(p.id, 'rechazar-pago', { motivo }); };
  const cancelar = (p) => { const motivo = prompt(`¿Cancelar ${p.codigo}? Se devolverá el stock. Motivo:`); if (motivo !== null) post(p.id, 'cancelar', { motivo }); };

  return (
    <>
      <div className="row between"><h1>Pedidos</h1>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}><option value="">Todos</option>{ESTADOS_PEDIDO.map((s) => <option key={s} value={s}>{etiqueta(s)}</option>)}</select></div>
      <p className="muted">Flujo: pago → <b>empaque</b> (rol empacador) → <b>entrega</b> (repartidor con PIN del cliente) o retiro en tienda.</p>
      {error && <p className="alert">{error}</p>}
      {rows.map((p) => (
        <div className="panel" key={p.id}>
          <div className="row between"><strong>{p.codigo}</strong><span className={`tag est-${p.estado}`}>{etiqueta(p.estado)}</span></div>
          <p>{p.nombre_cliente} · {p.email} {p.telefono && `· ${p.telefono}`}<br />
            <span className="muted">{etiqueta(p.metodo_entrega)}{p.direccion ? `: ${p.direccion}` : ''} · {etiqueta(p.metodo_pago)} · {new Date(p.creado_en).toLocaleString('es-BO')}</span><br />
            <span className="muted">{p.empacador && `Empaque: ${p.empacador}`} {p.repartidor && `· Repartidor: ${p.repartidor}`} {p.comprobante_ref && `· Ref. pago: ${p.comprobante_ref}`}</span></p>
          <ul>{p.items.map((i) => <li key={i.id}>{i.cantidad} × {i.nombre}</li>)}</ul>
          {p.monto_cobrado != null && <p className="ok">Cobrado en entrega: {bs(p.monto_cobrado)}</p>}
          <div className="row between wrap gap"><strong>{bs(p.total)}</strong>
            <div className="row gap wrap">
              {p.tiene_comprobante && ['por_verificar', 'pendiente'].includes(p.estado) && <button className="ghost sm" onClick={() => verComprobante(p)}>Ver comprobante</button>}
              {p.estado === 'por_verificar' && <button className="ghost sm danger" onClick={() => rechazar(p)}>Rechazar</button>}
              {['pendiente', 'por_verificar'].includes(p.estado) && p.metodo_pago !== 'contra_entrega' && p.metodo_pago !== 'paypal' &&
                <button className="sm" onClick={() => post(p.id, 'confirmar-pago')}>Confirmar pago</button>}
              {p.metodo_entrega === 'envio' && !['entregado', 'cancelado', 'en_transito'].includes(p.estado) && (
                <select value={p.repartidor_id || ''} onChange={(e) => run(() => api(`/pedidos/${p.id}/repartidor`, { method: 'PATCH', body: { repartidor_id: +e.target.value } }))}>
                  <option value="" disabled>Asignar repartidor</option>{reps.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</select>)}
              {!['entregado', 'cancelado', 'en_transito'].includes(p.estado) && <button className="ghost sm danger" onClick={() => cancelar(p)}>Cancelar</button>}
            </div></div>
        </div>))}
      {!rows.length && <p className="empty">No hay pedidos.</p>}

      {foto && (
        <div className="modal" onClick={() => setFoto(null)}>
          <div className="panel center-text" onClick={(e) => e.stopPropagation()}>
            <h3>Comprobante de {foto.codigo}</h3>
            <p>Monto esperado: <b>{bs(foto.total)}</b>{foto.referencia && <> · Ref.: <b>{foto.referencia}</b></>}</p>
            <img className="vista grande" src={foto.imagen} alt="Comprobante" />
            <div className="row gap center">
              <button onClick={() => { const p = rows.find((r) => r.codigo === foto.codigo); setFoto(null); post(p.id, 'confirmar-pago'); }}>Confirmar pago</button>
              <button className="ghost" onClick={() => setFoto(null)}>Cerrar</button>
            </div>
          </div>
        </div>)}
    </>
  );
}
