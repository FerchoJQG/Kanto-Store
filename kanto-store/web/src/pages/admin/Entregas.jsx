import { useEffect, useState } from 'react';
import { api, bs, etiqueta } from '../../api.js';

export default function Entregas() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const cargar = () => api('/pedidos/entregas').then(setRows).catch((e) => setError(e.message));
  useEffect(() => { cargar(); }, []);
  const cambiar = async (id, estado) => { setError(''); try { await api(`/pedidos/${id}/estado`, { method: 'PATCH', body: { estado } }); cargar(); } catch (e) { setError(e.message); } };
  return (
    <>
      <h1>Mis entregas</h1>
      {error && <p className="alert">{error}</p>}
      {!rows.length && <p className="empty">No tienes entregas asignadas.</p>}
      {rows.map((p) => (
        <div className="panel" key={p.id}>
          <div className="row between"><strong>{p.codigo}</strong><span className="tag">{etiqueta(p.estado)}</span></div>
          <p>{p.nombre_cliente} · {p.telefono}<br />📍 {p.direccion}</p>
          <ul>{p.items.map((i, k) => <li key={k}>{i.cantidad} × {i.nombre}</li>)}</ul>
          <div className="row between"><strong>{bs(p.total)}{p.metodo_pago === 'contra_entrega' ? ' (cobrar al entregar)' : ''}</strong>
            <div className="row gap">
              {p.estado !== 'en_transito' && <button className="sm" onClick={() => cambiar(p.id, 'en_transito')}>En tránsito</button>}
              <button className="sm" onClick={() => cambiar(p.id, 'entregado')}>Marcar entregado</button></div></div>
        </div>))}
    </>
  );
}
