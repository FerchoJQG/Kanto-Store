import './zz-f11-stability.css';
import { useEffect, useState } from 'react';
import { api, imagenADataUrl } from '../api.js';

const ETIQUETAS = {
  producto: 'Foto del producto real (opcional)',
  empaque: 'Foto del empaque (opcional)',
  entrega: 'Foto del paquete para envío o recojo (opcional)',
};
export default function FotosPedido({ pedidoId, etapas = ['producto', 'empaque'], deshabilitado = false }) {
  const [fotos, setFotos] = useState([]);
  const [ocupado, setOcupado] = useState('');
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  useEffect(() => {
    let active = true;
    api(`/pedidos/${pedidoId}/evidencias`)
      .then(rows => { if (active) setFotos(Array.isArray(rows) ? rows : []); })
      .catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [pedidoId]);
  const subir = async (etapa, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(''); setExito(''); setOcupado(etapa);
    try {
      if (file.size > 12 * 1024 * 1024) throw Error('Selecciona una fotografía menor de 12 MB');
      const imagen = await imagenADataUrl(file, 900, 0.70);
      await api(`/pedidos/${pedidoId}/evidencias`, { method: 'POST', body: { etapa, imagen } });
      const rows = await api(`/pedidos/${pedidoId}/evidencias`);
      setFotos(Array.isArray(rows) ? rows : []);
      setExito(`Foto guardada correctamente: ${etapa}.`);
    } catch (err) { setError(err.message); }
    finally { setOcupado(''); e.target.value = ''; }
  };
  return <section className="kanto-f11-fotos" aria-label="Fotografías del pedido">
    <h4>📸 Fotografías del pedido</h4>
    <p className="muted">Puedes mostrar al cliente el estado real de su carta y cómo la empaquetaste. <strong>Las fotos son opcionales</strong> y no impiden finalizar el pedido.</p>
    {!deshabilitado && <div className="kanto-f11-fotos-campos">
      {etapas.map(etapa => <label key={etapa} className="kanto-f11-foto-campo">
        <span>{ETIQUETAS[etapa] || etapa}</span>
        <input aria-label={ETIQUETAS[etapa] || etapa} type="file" accept="image/jpeg,image/png,image/webp"
          capture="environment" disabled={!!ocupado || fotos.length >= 12} onChange={e => subir(etapa, e)} />
      </label>)}
    </div>}
    {ocupado && <p className="muted" role="status">Guardando fotografía…</p>}
    {error && <p className="alert" role="alert">{error}</p>}
    {exito && <p className="ok" role="status">{exito}</p>}
    {fotos.length ? <div className="kanto-f11-fotos-grid">
      {fotos.map(f => <figure key={f.id}>
        <img src={f.imagen} alt={`Fotografía del pedido: ${f.etapa}`} loading="lazy" />
        <figcaption>{ETIQUETAS[f.etapa] || f.etapa}</figcaption>
      </figure>)}
    </div> : <p className="muted">Todavía no hay fotos cargadas.</p>}
  </section>;
}
