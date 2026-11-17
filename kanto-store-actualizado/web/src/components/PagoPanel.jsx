import { useState } from 'react';
import { api, bs, etiqueta, imagenADataUrl } from '../api.js';

// Muestra cómo pagar (QR real / datos de depósito / PayPal) y permite subir el comprobante.
export default function PagoPanel({ pedido, email, onCambio }) {
  const [archivo, setArchivo] = useState(null);
  const [vista, setVista] = useState('');
  const [ref, setRef] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [enviando, setEnviando] = useState(false);
  const esEnRevision = pedido.estado === 'por_verificar';

  const elegir = async (e) => {
    const f = e.target.files?.[0]; setError('');
    if (!f) return;
    try { setVista(await imagenADataUrl(f)); setArchivo(f); } catch (er) { setError(er.message); }
  };
  const enviar = async () => {
    setError(''); setMsg(''); setEnviando(true);
    try {
      await api(`/pedidos/seguimiento/${pedido.codigo}/comprobante`, { method: 'POST', body: { email, imagen: vista, referencia: ref } });
      setMsg('¡Comprobante enviado! Lo revisaremos y confirmaremos tu pago.'); setArchivo(null); setVista(''); onCambio?.();
    } catch (er) { setError(er.message); } finally { setEnviando(false); }
  };
  const pagarPayPal = async () => {
    setError('');
    try { const r = await api('/paypal/crear', { method: 'POST', body: { codigo: pedido.codigo, email } }); window.location.href = r.approve_url; }
    catch (er) { setError(er.message); }
  };

  return (
    <div className="panel pago">
      <h3>Pagar pedido {pedido.codigo} · {bs(pedido.total)}</h3>
      {pedido.estado === 'pendiente' && pedido.expira_en && <p className="muted">Reserva tu stock pagando antes del {new Date(pedido.expira_en).toLocaleString('es-BO')}; luego se cancela automáticamente.</p>}

      {pedido.metodo_pago === 'qr' && pedido.qr && (
        <div className="center-text">
          <p>Escanea este QR con la app de tu banco y paga <b>{bs(pedido.total)}</b>:</p>
          <img className="qr" src={pedido.qr} alt="QR de pago" />
          {!pedido.qr_es_real && <p className="muted">(QR de demostración: el administrador aún no cargó el QR real.)</p>}
        </div>
      )}
      {pedido.metodo_pago === 'transferencia' && pedido.datos_transferencia && (
        <ul className="datos">
          <li>Banco: <b>{pedido.datos_transferencia.banco || '—'}</b></li>
          <li>Cuenta: <b>{pedido.datos_transferencia.cuenta || '—'}</b></li>
          <li>Titular: <b>{pedido.datos_transferencia.titular}</b></li>
          <li>Glosa / referencia: <b>{pedido.codigo}</b></li>
          <li>Monto exacto: <b>{bs(pedido.total)}</b></li>
        </ul>
      )}
      {pedido.instrucciones && <p className="muted">{pedido.instrucciones}</p>}

      {pedido.metodo_pago === 'paypal' && pedido.paypal && (
        <div className="center-text">
          <p>Se cobrará <b>USD {pedido.paypal.monto_usd}</b> <span className="muted">(Bs {Number(pedido.total).toFixed(2)} a Bs {pedido.paypal.tipo_cambio} por dólar)</span></p>
          <button className="paypal" onClick={pagarPayPal}>Pagar con PayPal</button>
        </div>
      )}

      {['qr', 'transferencia'].includes(pedido.metodo_pago) && (
        <div className="comprobante">
          <h4>{esEnRevision ? 'Comprobante en revisión ✔' : 'Sube tu comprobante'}</h4>
          {esEnRevision && <p className="muted">Si te equivocaste de imagen, puedes enviar otra.</p>}
          <label>Foto o captura del pago<input type="file" accept="image/*" onChange={elegir} /></label>
          <label>N.º de transacción (opcional)<input value={ref} maxLength={80} onChange={(e) => setRef(e.target.value)} /></label>
          {vista && <img className="vista" src={vista} alt="Vista previa" />}
          <button disabled={!archivo || enviando} onClick={enviar}>{enviando ? 'Enviando…' : 'Enviar comprobante'}</button>
        </div>
      )}
      {error && <p className="alert">{error}</p>}
      {msg && <p className="ok">{msg}</p>}
      <p className="muted">Método: {etiqueta(pedido.metodo_pago)}</p>
    </div>
  );
}
