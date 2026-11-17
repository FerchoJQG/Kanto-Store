import { useEffect, useState } from 'react';
import { api } from '../api';
import { useApp } from '../AppContext';
import { money } from '../components/ProductCard';

const RARITIES = ['', 'Común', 'Poco común', 'Rara', 'Ultra rara', 'Secreta'];
const CONDS = ['', 'Mint', 'Near Mint', 'Excellent', 'Played'];
const STATUSES = ['pendiente', 'preparando', 'en_transito', 'entregado', 'cancelado'];
const ROLES = ['cliente', 'admin', 'stock', 'repartidor'];

/* ---------- Resumen / reportes ---------- */
function Dashboard() {
  const [r, setR] = useState(null);
  useEffect(() => { api.reports().then(setR).catch(() => {}); }, []);
  if (!r) return <p className="muted">Cargando…</p>;
  return (
    <>
      <div className="stats">
        <div className="stat"><span>Pedidos</span><b>{r.summary.orders_count}</b></div>
        <div className="stat"><span>Ingresos</span><b>{money(r.summary.revenue)}</b></div>
        <div className="stat"><span>Stock bajo</span><b>{r.lowStock}</b></div>
      </div>
      <h3>Más vendidos</h3>
      <table className="table">
        <thead><tr><th>Producto</th><th>Vendidos</th><th>Ingresos</th></tr></thead>
        <tbody>{r.top.map(t => <tr key={t.id}><td>{t.name}</td><td>{t.sold}</td><td>{money(t.income)}</td></tr>)}
          {!r.top.length && <tr><td colSpan="3" className="muted">Sin ventas todavía</td></tr>}</tbody>
      </table>
      <h3>Pedidos por estado</h3>
      <div className="tags">{r.byStatus.map(s => <span className="tag" key={s.status}>{s.status.replace('_', ' ')}: {s.count}</span>)}</div>
      <h3>Ventas últimos 30 días</h3>
      <table className="table">
        <thead><tr><th>Día</th><th>Pedidos</th><th>Ingresos</th></tr></thead>
        <tbody>{r.daily.map(d => <tr key={d.day}><td>{String(d.day).slice(0, 10)}</td><td>{d.orders}</td><td>{money(d.revenue)}</td></tr>)}
          {!r.daily.length && <tr><td colSpan="3" className="muted">Sin datos</td></tr>}</tbody>
      </table>
    </>
  );
}

/* ---------- Productos (CRUD) ---------- */
const EMPTY = { sku: '', type: 'single', name: '', set_id: '', card_number: '', rarity: '', language: 'Español', cond: '', sealed_kind: '', image_url: '', price: '', stock: 0, min_stock: 2 };

function Products({ isAdmin }) {
  const { notify } = useApp();
  const [list, setList] = useState([]);
  const [sets, setSets] = useState([]);
  const [form, setForm] = useState(null); // null = cerrado
  const load = () => api.products({}).then(setList);
  useEffect(() => { load(); api.sets().then(setSets); }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      if (form.id) {
        const { id, set_name, set_code, created_at, ...body } = form;
        await api.updateProduct(id, body);
      } else await api.createProduct(form);
      notify('Producto guardado'); setForm(null); load();
    } catch (err) { notify(err.message); }
  };
  const del = async (p) => {
    if (!confirm(`¿Eliminar "${p.name}"?`)) return;
    try { await api.deleteProduct(p.id); load(); } catch (e) { notify(e.message); }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <div className="row between"><h3>Productos ({list.length})</h3><button className="btn-sm" onClick={() => setForm({ ...EMPTY })}>+ Nuevo</button></div>
      {form && (
        <form className="card-box form-grid" onSubmit={save}>
          <label>SKU<input required value={form.sku} onChange={set('sku')} /></label>
          <label>Tipo<select value={form.type} onChange={set('type')}><option value="single">Carta</option><option value="sellado">Sellado</option></select></label>
          <label>Nombre<input required value={form.name} onChange={set('name')} /></label>
          <label>Expansión<select value={form.set_id || ''} onChange={set('set_id')}><option value="">—</option>{sets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label>Nº colección<input value={form.card_number || ''} onChange={set('card_number')} /></label>
          <label>Rareza<select value={form.rarity || ''} onChange={set('rarity')}>{RARITIES.map(r => <option key={r} value={r}>{r || '—'}</option>)}</select></label>
          <label>Idioma<input value={form.language} onChange={set('language')} /></label>
          <label>Estado<select value={form.cond || ''} onChange={set('cond')}>{CONDS.map(r => <option key={r} value={r}>{r || '—'}</option>)}</select></label>
          <label>Sellado<select value={form.sealed_kind || ''} onChange={set('sealed_kind')}><option value="">—</option><option>sobre</option><option>caja</option><option>mazo</option></select></label>
          <label>Imagen (URL)<input value={form.image_url || ''} onChange={set('image_url')} /></label>
          {isAdmin && <label>Precio (Bs.)<input type="number" step="0.01" required value={form.price} onChange={set('price')} /></label>}
          <label>Stock<input type="number" min="0" value={form.stock} onChange={set('stock')} /></label>
          <label>Stock mínimo<input type="number" min="0" value={form.min_stock} onChange={set('min_stock')} /></label>
          <div className="row"><button className="btn">Guardar</button><button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancelar</button></div>
        </form>
      )}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>SKU</th><th>Nombre</th><th>Expansión</th><th>Estado</th><th>Precio</th><th>Stock</th><th /></tr></thead>
          <tbody>{list.map(p => (
            <tr key={p.id}>
              <td>{p.sku}</td><td>{p.name}</td><td>{p.set_name}</td><td>{p.cond || '—'}</td><td>{money(p.price)}</td><td>{p.stock}</td>
              <td className="nowrap">
                <button className="btn-ghost" onClick={() => setForm({ ...p })}>Editar</button>
                {isAdmin && <button className="btn-ghost danger" onClick={() => del(p)}>Eliminar</button>}
              </td>
            </tr>))}</tbody>
        </table>
      </div>
    </>
  );
}

/* ---------- Inventario ---------- */
function Inventory() {
  const { notify } = useApp();
  const [rows, setRows] = useState([]);
  const load = () => api.inventory().then(setRows);
  useEffect(() => { load(); }, []);
  const upd = async (id, body) => { try { await api.updateInventory(id, body); load(); } catch (e) { notify(e.message); } };
  const low = rows.filter(r => r.low_stock && r.active);
  return (
    <>
      <h3>Inventario</h3>
      {low.length > 0 && <div className="alert"><b>⚠ Stock bajo:</b> {low.map(r => `${r.name} (${r.stock})`).join(', ')}</div>}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>SKU</th><th>Producto</th><th>Estado de conservación</th><th>Stock</th><th>Mín.</th></tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.id} className={r.low_stock ? 'low' : ''}>
              <td>{r.sku}</td><td>{r.name}</td>
              <td>{r.type === 'single'
                ? <select value={r.cond || ''} onChange={e => upd(r.id, { cond: e.target.value })}>{CONDS.map(c => <option key={c} value={c}>{c || '—'}</option>)}</select> : '—'}</td>
              <td><input type="number" min="0" className="qty" defaultValue={r.stock} key={r.stock}
                         onBlur={e => Number(e.target.value) !== r.stock && upd(r.id, { stock: Number(e.target.value) })} /></td>
              <td>{r.min_stock}</td>
            </tr>))}</tbody>
        </table>
      </div>
    </>
  );
}

/* ---------- Pedidos ---------- */
function OrdersAdmin() {
  const { notify } = useApp();
  const [orders, setOrders] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [filter, setFilter] = useState('');
  const load = () => api.allOrders(filter).then(setOrders);
  useEffect(() => { load(); }, [filter]); // eslint-disable-line
  useEffect(() => { api.couriers().then(setCouriers).catch(() => {}); }, []);
  const act = async (fn) => { try { await fn(); load(); } catch (e) { notify(e.message); } };
  return (
    <>
      <div className="row between"><h3>Pedidos</h3>
        <select value={filter} onChange={e => setFilter(e.target.value)}><option value="">Todos</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
      {orders.map(o => (
        <div className="card-box order" key={o.id}>
          <div className="row between"><b>#{o.id} · {o.user_name || o.guest_name}</b><b>{money(o.total)}</b></div>
          <div className="small muted">{new Date(o.created_at).toLocaleString()} · {o.payment_method.replace('_', ' ')} ({o.payment_status}) · {o.delivery_address}</div>
          <div className="small">{o.items.map(i => `${i.quantity}× ${i.name}`).join(' · ')}</div>
          <div className="row">
            <select value={o.status} onChange={e => act(() => api.setStatus(o.id, e.target.value))}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select>
            <select value={o.courier_id || ''} onChange={e => e.target.value && act(() => api.assign(o.id, Number(e.target.value)))}>
              <option value="">Asignar repartidor…</option>{couriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </div>
        </div>
      ))}
      {!orders.length && <p className="muted">Sin pedidos.</p>}
    </>
  );
}

/* ---------- Usuarios ---------- */
function Users() {
  const { notify, user: me } = useApp();
  const [users, setUsers] = useState([]);
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'stock' });
  const load = () => api.users().then(setUsers);
  useEffect(() => { load(); }, []);
  const add = async (e) => { e.preventDefault(); try { await api.createUser(f); setF({ name: '', email: '', password: '', role: 'stock' }); load(); } catch (err) { notify(err.message); } };
  return (
    <>
      <h3>Usuarios</h3>
      <form className="card-box form-grid" onSubmit={add}>
        <label>Nombre<input required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
        <label>Correo<input type="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></label>
        <label>Contraseña<input type="password" minLength="6" required value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></label>
        <label>Rol<select value={f.role} onChange={e => setF({ ...f, role: e.target.value })}>{ROLES.map(r => <option key={r}>{r}</option>)}</select></label>
        <div><button className="btn">Crear usuario</button></div>
      </form>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th /></tr></thead>
          <tbody>{users.map(u => (
            <tr key={u.id}><td>{u.name}</td><td>{u.email}</td>
              <td><select value={u.role} disabled={u.id === me.id} onChange={async e => { try { await api.setRole(u.id, e.target.value); load(); } catch (er) { notify(er.message); } }}>{ROLES.map(r => <option key={r}>{r}</option>)}</select></td>
              <td>{u.id !== me.id && <button className="btn-ghost danger" onClick={async () => { if (confirm('¿Eliminar usuario?')) { await api.deleteUser(u.id); load(); } }}>Eliminar</button>}</td></tr>))}</tbody>
        </table>
      </div>
    </>
  );
}

export default function Admin() {
  const { user } = useApp();
  const isAdmin = user.role === 'admin';
  const tabs = isAdmin
    ? [['resumen', 'Resumen'], ['productos', 'Productos'], ['inventario', 'Inventario'], ['pedidos', 'Pedidos'], ['usuarios', 'Usuarios']]
    : [['inventario', 'Inventario'], ['productos', 'Productos']];
  const [tab, setTab] = useState(tabs[0][0]);
  return (
    <>
      <h1>Panel {isAdmin ? 'administrativo' : 'de stock'}</h1>
      <div className="tabs">{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'tab on' : 'tab'} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'resumen' && <Dashboard />}
      {tab === 'productos' && <Products isAdmin={isAdmin} />}
      {tab === 'inventario' && <Inventory />}
      {tab === 'pedidos' && <OrdersAdmin />}
      {tab === 'usuarios' && <Users />}
    </>
  );
}
