import { useEffect, useState } from 'react';
import { api, bs, etiqueta } from '../../api.js';

export default function Dashboard() {
  const [r, setR] = useState(null);
  useEffect(() => { api('/admin/reportes').then(setR).catch(() => {}); }, []);
  if (!r) return <p>Cargando…</p>;
  const max = Math.max(1, ...r.ventasDia.map((d) => Number(d.total)));
  return (
    <>
      <h1>Resumen</h1>
      <div className="kpis">
        <div className="kpi"><span>Ingresos</span><b>{bs(r.ingresos)}</b></div>
        <div className="kpi"><span>Pedidos pagados/activos</span><b>{r.pedidos}</b></div>
        <div className="kpi"><span>Clientes</span><b>{r.clientes}</b></div>
        <div className="kpi"><span>Stock bajo</span><b className={r.bajoStock ? 'bad' : ''}>{r.bajoStock}</b></div>
      </div>
      <div className="two">
        <div className="panel"><h3>Ventas últimos 14 días</h3>
          {!r.ventasDia.length && <p className="muted">Sin ventas aún.</p>}
          <div className="bars">{r.ventasDia.map((d) => (
            <div key={d.dia} className="bar" title={`${String(d.dia).slice(0, 10)}: ${bs(d.total)}`}><i style={{ height: `${(Number(d.total) / max) * 100}%` }} /><small>{String(d.dia).slice(5, 10)}</small></div>))}</div>
        </div>
        <div className="panel"><h3>Pedidos por estado</h3>
          <ul>{r.porEstado.map((e) => <li key={e.estado}>{etiqueta(e.estado)}: <b>{e.cantidad}</b></li>)}</ul>
          <h3>Más vendidos</h3>
          <ol>{r.top.map((t) => <li key={t.nombre}>{t.nombre} — {t.vendidos} u. ({bs(t.monto)})</li>)}</ol>
        </div>
      </div>
    </>
  );
}
