import { useEffect, useState } from 'react';
import { api } from '../api.js';
export default function FotosSeguimiento({codigo,email}) {
  const [fotos, setFotos] = useState([]);
  useEffect(()=>{
    let vivo=true;
    api(`/pedidos/seguimiento/${encodeURIComponent(codigo)}/evidencias?email=${encodeURIComponent(email)}`)
      .then(r=>{if(vivo)setFotos(r);}).catch(()=>{});
    return ()=>{vivo=false;};
  },[codigo,email]);
  if(!fotos.length)return null;
  return <div className="panel"><h3>Fotos de la preparación y entrega</h3>
    <div className="row gap wrap">{fotos.map(f=><figure key={f.id} style={{maxWidth:170,margin:0}}>
      <img alt={`Pedido: ${f.etapa}`} src={f.imagen} style={{maxWidth:'100%', maxHeight:220, objectFit:'cover', borderRadius:8}} />
      <figcaption>{f.etapa} · {new Date(f.creado_en).toLocaleString('es-BO')}</figcaption>
    </figure>)}</div>
  </div>;
}
