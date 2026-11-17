import { useEffect, useState } from 'react';
import { api, imagenADataUrl } from '../../api.js';

export default function Pagos() {
  const [f, setF] = useState({ qr_imagen: null, banco: '', cuenta: '', titular: '', instrucciones: '' });
  const [info, setInfo] = useState({});
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { api('/config/pagos').then((c) => { setInfo(c); setF({ qr_imagen: c.qr_imagen, banco: c.banco, cuenta: c.cuenta, titular: c.titular, instrucciones: c.instrucciones }); }); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const elegirQR = async (e) => { try { setF({ ...f, qr_imagen: await imagenADataUrl(e.target.files[0], 900, 0.9) }); setError(''); } catch (er) { setError(er.message); } };
  const guardar = async (e) => {
    e.preventDefault(); setMsg(''); setError('');
    try { await api('/config/admin/pagos', { method: 'PUT', body: f }); setMsg('Configuración guardada. Los clientes ya ven el nuevo QR y los datos.'); } catch (er) { setError(er.message); }
  };
  return (
    <>
      <h1>Cobros</h1>
      <form className="panel" onSubmit={guardar}>
        <h3>QR de pago</h3>
        <p className="muted">Sube la imagen del QR real de tu cuenta (Simple, BCP, etc.). Los clientes lo ven al pagar, y luego suben su comprobante para que tú lo verifiques en <b>Pedidos</b>.</p>
        <input type="file" accept="image/*" onChange={elegirQR} />
        {f.qr_imagen ? <img className="qr" src={f.qr_imagen} alt="QR actual" /> : <p className="warn">Aún no hay QR cargado: se muestra uno de demostración.</p>}
        {f.qr_imagen && <button type="button" className="ghost sm" onClick={() => setF({ ...f, qr_imagen: '' })}>Quitar QR</button>}
        <h3>Depósito / transferencia bancaria</h3>
        <div className="form-grid">
          <label>Banco<input value={f.banco} onChange={set('banco')} /></label>
          <label>N.º de cuenta<input value={f.cuenta} onChange={set('cuenta')} /></label>
          <label>Titular<input value={f.titular} onChange={set('titular')} /></label>
        </div>
        <label>Instrucciones para el cliente<textarea rows="2" value={f.instrucciones} onChange={set('instrucciones')} /></label>
        {error && <p className="alert">{error}</p>}{msg && <p className="ok">{msg}</p>}
        <button>Guardar</button>
      </form>
      <div className="panel">
        <h3>PayPal</h3>
        {info.paypal ? <p className="ok">✔ Activo. Se cobra en USD a Bs {info.bob_por_usd} por dólar.</p>
          : <p className="warn">Desactivado. Configura <code>PAYPAL_CLIENT_ID</code> y <code>PAYPAL_SECRET</code> en las variables de entorno del servidor (ver README).</p>}
      </div>
    </>
  );
}
