import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context.jsx';

// El panel consulta el MySQL existente cada 30 s, sin notificaciones invasivas.
export default function AlertasFase9() {
  const { user } = useAuth();
  const [info, setInfo] = useState(null);
  const [abierto, setAbierto] = useState(false);
  const [nuevo, setNuevo] = useState('');
  const ultimo = useRef(null);
  useEffect(() => {
    if (user?.rol !== 'admin') return;
    let vivo = true;
    const cargar = async () => {
      try {
        const r = await api('/fase9/alertas');
        if (!vivo) return;
        const actual = {
          pedido: Math.max(0, ...r.pedidos_recientes.map(p => Number(p.id))),
          cliente: Math.max(0, ...r.clientes_recientes.map(p => Number(p.id)))
        };
        if (ultimo.current) {
          const nP = r.pedidos_recientes.filter(p => p.id > ultimo.current.pedido).length;
          const nC = r.clientes_recientes.filter(c => c.id > ultimo.current.cliente).length;
          if (nP || nC) setNuevo(`${nP ? `${nP} pedido(s) nuevo(s). ` : ''}${nC ? `${nC} cliente(s) nuevo(s).` : ''}`);
        }
        ultimo.current = actual;
        setInfo(r);
      } catch { /* Si la API aún no se desplegó, no bloqueamos el panel. */ }
    };
    cargar();
    const timer = setInterval(cargar, 30000);
    return () => { vivo = false; clearInterval(timer); };
  }, [user?.rol]);
  if (user?.rol !== 'admin' || !info) return null;
  return <div className="panel" style={{marginBottom:16, padding:16}}>
    <div className="row between wrap gap">
      <button type="button" className="ghost" onClick={() => { setAbierto(!abierto); setNuevo(''); }} aria-expanded={abierto}>
        🔔 Avisos · {info.pagos_por_verificar} pagos por confirmar · {info.pendientes} pedidos pendientes
      </button>
      <Link to="/admin/pedidos">Revisar pedidos</Link>
    </div>
    {nuevo && <p className="warn" role="status">🔔 {nuevo}</p>}
    {abierto && <div style={{marginTop:12}}>
      <strong>Pedidos recientes</strong>
      <ul>{info.pedidos_recientes.map(p => <li key={p.id}>{p.codigo} · {p.nombre_cliente} · {p.estado}</li>)}</ul>
      <strong>Clientes registrados recientemente</strong>
      <ul>{info.clientes_recientes.map(c => <li key={c.id}>{c.nombre} · {new Date(c.creado_en).toLocaleString('es-BO')}</li>)}</ul>
      {!info.clientes_recientes.length && <p className="muted">Sin registros nuevos en las últimas 48 horas.</p>}
    </div>}
  </div>;
}
