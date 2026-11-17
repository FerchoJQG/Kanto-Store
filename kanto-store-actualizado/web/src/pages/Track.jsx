import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api, bs, etiqueta, apiBase } from '../api.js';
import PagoPanel from '../components/PagoPanel.jsx';

const PASOS = ['pendiente', 'pagado', 'preparando', 'empacado', 'en_transito', 'entregado'];

export default function Track() {
  const { codigo: cp } = useParams();
  const [sp] = useSearchParams();
  const [codigo, setCodigo] = useState(cp || '');
  const [email, setEmail] = useState(sp.get('email') || '');
  const [p, setP] = useState(null);
  const [error, setError] = useState('');

  const buscar = async (c = codigo, e = email) => {
    setError('');
    try { setP(await api(`/pedidos/seguimiento/${c.trim()}?email=${encodeURIComponent(e)}`)); } catch (err) { setP(null); setError(err.message); }
  };
  useEffect(() => { if (cp && sp.get('email')) buscar(cp, sp.get('email')); /* eslint-disable-next-line */ }, []);

  const cancelar = async () => {
    if (!confirm('¿Cancelar este pedido? Se devolverá el stock.')) return;
    try { await api(`/pedidos/seguimiento/${p.codigo}/cancelar?email=${encodeURIComponent(email)}`, { method: 'POST', body: {} }); buscar(); } catch (err) { setError(err.message); }
  };
  // "por_verificar" se muestra dentro del paso de pago
  const idx = p ? PASOS.indexOf(p.estado === 'por_verificar' ? 'pendiente' : p.estado) : -1;
  const sinPagar = p && ['pendiente', 'por_verificar'].includes(p.estado);

  return (
    <div className="narrow-wide">
      <div className="panel">
        <h1>Seguimiento de pedido</h1>
        <form onSubmit={(e) => { e.preventDefault(); buscar(); }}>
          <label>Código de pedido<input required value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="KS-XXXX" /></label>
          <label>Email de la compra<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <button>Buscar</button>
        </form>
        {error && <p className="alert">{error}</p>}
      </div>

      {p && (
        <>
          <div className="panel">
            <div className="row between"><h3>{p.codigo}</h3><span className={`tag est-${p.estado}`}>{etiqueta(p.estado)}</span></div>
            {p.estado === 'cancelado' ? <p className="bad">Pedido cancelado</p> : (
              <ol className="steps">{PASOS.map((s, i) => <li key={s} className={i <= idx ? 'done' : ''}>{etiqueta(s)}</li>)}</ol>
            )}
            {p.estado === 'por_verificar' && <p className="warn">Recibimos tu comprobante; lo estamos verificando.</p>}
            {p.pin_entrega && (
              <div className="pinbox">Tu PIN de entrega: <b>{p.pin_entrega}</b>
                <small>Dáselo al {p.metodo_entrega === 'retiro' ? 'encargado al retirar' : 'repartidor'} solo cuando tengas tu pedido en la mano.</small></div>
            )}
            <ul>{p.items.map((i) => <li key={i.id}>{i.cantidad} × {i.nombre} — {bs(i.precio_unitario * i.cantidad)}</li>)}</ul>
            <p><strong>Total: {bs(p.total)}</strong> · {etiqueta(p.metodo_pago)} · {etiqueta(p.metodo_entrega)}</p>
            <div className="row gap wrap">
              <a className="btn ghost" target="_blank" rel="noreferrer" href={`${apiBase}/pedidos/comprobante/${p.codigo}?email=${encodeURIComponent(email)}`}>Comprobante PDF</a>
              {sinPagar && <button className="ghost danger" onClick={cancelar}>Cancelar pedido</button>}
            </div>
          </div>

          {sinPagar && <PagoPanel pedido={p} email={email} onCambio={() => buscar()} />}

          <div className="panel">
            <h3>Historial</h3>
            <ul className="timeline">
              {[...p.historial].reverse().map((h, k) => (
                <li key={k}><b>{etiqueta(h.estado)}</b>{h.nota ? ` — ${h.nota}` : ''}<span className="muted"> · {new Date(h.creado_en).toLocaleString('es-BO')}</span></li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
