import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api, bs, etiqueta, apiBase } from '../api.js';

const PASOS = ['pendiente', 'pagado', 'preparando', 'en_transito', 'entregado'];

export default function Track() {
  const { codigo: cp } = useParams();
  const [sp] = useSearchParams();
  const [codigo, setCodigo] = useState(cp || '');
  const [email, setEmail] = useState(sp.get('email') || '');
  const [p, setP] = useState(null);
  const [error, setError] = useState('');

  const buscar = async (c = codigo, e = email) => {
    setError(''); setP(null);
    try { setP(await api(`/pedidos/seguimiento/${c.trim()}?email=${encodeURIComponent(e)}`)); } catch (err) { setError(err.message); }
  };
  useEffect(() => { if (cp && sp.get('email')) buscar(cp, sp.get('email')); /* eslint-disable-next-line */ }, []);

  return (
    <div className="panel narrow">
      <h1>Seguimiento de pedido</h1>
      <form onSubmit={(e) => { e.preventDefault(); buscar(); }}>
        <label>Código de pedido<input required value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="KS-XXXX" /></label>
        <label>Email de la compra<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <button>Buscar</button>
      </form>
      {error && <p className="alert">{error}</p>}
      {p && (
        <div>
          <h3>{p.codigo}</h3>
          {p.estado === 'cancelado' ? <p className="bad">Pedido cancelado</p> : (
            <ol className="steps">{PASOS.map((s, i) => <li key={s} className={i <= PASOS.indexOf(p.estado) ? 'done' : ''}>{etiqueta(s)}</li>)}</ol>
          )}
          <ul>{p.items.map((i, k) => <li key={k}>{i.cantidad} × {i.nombre} — {bs(i.precio_unitario * i.cantidad)}</li>)}</ul>
          <p><strong>Total: {bs(p.total)}</strong> · {etiqueta(p.metodo_pago)}</p>
          {p.qr && <img className="qr" src={p.qr} alt="QR" />}
          <a className="btn" target="_blank" rel="noreferrer" href={`${apiBase}/pedidos/comprobante/${p.codigo}?email=${encodeURIComponent(email)}`}>Comprobante PDF</a>
        </div>
      )}
    </div>
  );
}
