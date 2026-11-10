import { useEffect, useState } from 'react';
import { api, etiqueta } from '../../api.js';
import { useAuth } from '../../context.jsx';

export default function Usuarios() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [nuevo, setNuevo] = useState(null);
  const [error, setError] = useState('');
  const cargar = () => api('/admin/usuarios').then(setRows).catch((e) => setError(e.message));
  useEffect(() => { cargar(); }, []);
  const patch = async (id, body) => { setError(''); try { await api(`/admin/usuarios/${id}`, { method: 'PATCH', body }); cargar(); } catch (e) { setError(e.message); } };
  const crear = async (e) => { e.preventDefault(); setError(''); try { await api('/admin/usuarios', { method: 'POST', body: nuevo }); setNuevo(null); cargar(); } catch (er) { setError(er.message); } };
  const set = (k) => (e) => setNuevo({ ...nuevo, [k]: e.target.value });
  return (
    <>
      <div className="row between"><h1>Usuarios</h1><button onClick={() => setNuevo({ nombre: '', email: '', password: '', rol: 'stock' })}>+ Personal</button></div>
      {error && <p className="alert">{error}</p>}
      {nuevo && (
        <form className="panel" onSubmit={crear}>
          <div className="form-grid">
            <label>Nombre<input required value={nuevo.nombre} onChange={set('nombre')} /></label>
            <label>Email<input required type="email" value={nuevo.email} onChange={set('email')} /></label>
            <label>Contraseña<input required minLength={6} value={nuevo.password} onChange={set('password')} /></label>
            <label>Rol<select value={nuevo.rol} onChange={set('rol')}>{['cliente', 'admin', 'stock', 'repartidor'].map((r) => <option key={r} value={r}>{etiqueta(r)}</option>)}</select></label>
          </div>
          <div className="row gap"><button>Crear</button><button type="button" className="ghost" onClick={() => setNuevo(null)}>Cancelar</button></div>
        </form>)}
      <div className="table-wrap"><table className="data">
        <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Activo</th></tr></thead>
        <tbody>{rows.map((u) => (
          <tr key={u.id}><td>{u.nombre}</td><td>{u.email}</td>
            <td><select disabled={u.id === user.id} value={u.rol} onChange={(e) => patch(u.id, { rol: e.target.value })}>{['cliente', 'admin', 'stock', 'repartidor'].map((r) => <option key={r} value={r}>{etiqueta(r)}</option>)}</select></td>
            <td><input type="checkbox" disabled={u.id === user.id} checked={!!u.activo} onChange={(e) => patch(u.id, { activo: e.target.checked })} /></td></tr>))}</tbody>
      </table></div>
    </>
  );
}
