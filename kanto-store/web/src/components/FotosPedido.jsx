import { useEffect, useState } from 'react';
import { api, imagenADataUrl } from '../api.js';

export default function FotosPedido({ pedidoId, etapas = ['producto', 'empaque'], deshabilitado = false }) {
  const [fotos, setFotos] = useState([]);
  const [etapa, setEtapa] = useState(etapas[0]);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const cargar = () => api(`/pedidos/${pedidoId}/evidencias`).then(setFotos).catch(e => setError(e.message));
  useEffect(() => { cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pedidoId]);
  const subir = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(''); setExito(''); setOcupado(true);
    try {
      const imagen = await imagenADataUrl(file, 1000, 0.74);
      await api(`/pedidos/${pedidoId}/evidencias`, {method:'POST', body:{etapa, imagen}});
      await cargar();
      setExito('Fotografía guardada en el pedido.');
    } catch (err) { setError(err.message); }
    finally {setOcupado(false); e.target.value='';}
  };
  return <div style={{paddingTop:10, marginTop:12, borderTop:'1px solid #aaa5'}}>
    <h4>📷 Fotografías del pedido</h4>
    <p className="muted">Fotografía del producto real, empaque o paquete listo para entregar.</p>
    {!deshabilitado && <div className="row gap wrap">
      <select value={etapa} onChange={e=>setEtapa(e.target.value)}>
        {etapas.map(x=><option key={x} value={x}>{x === 'producto'?'Producto real':x === 'empaque'?'Empaque':'Envío / recojo'}</option>)}
      </select>
      <label>Tomar o subir foto
        <input type="file" accept="image/png,image/jpeg,image/webp" capture="environment" disabled={ocupado || fotos.length >= 12} onChange={subir} />
      </label>
    </div>}
    {error && <p className="alert" role="alert">{error}</p>}
    {exito && <p className="ok" role="status">{exito}</p>}
    {fotos.length > 0 && <div className="row gap wrap" style={{marginTop:12}}>
      {fotos.map(f=><figure key={f.id} style={{maxWidth:155, margin:0}}>
        <img src={f.imagen} alt={`Foto de ${f.etapa}`} style={{width:'100%', maxHeight:180, objectFit:'cover', borderRadius:8}} />
        <figcaption className="muted">{f.etapa}</figcaption>
      </figure>)}
    </div>}
  </div>;
}
