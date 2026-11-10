import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useApp } from '../AppContext';

export default function Login() {
  const { login } = useApp();
  const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      const data = await api.login(f);
      login(data);
      nav({ admin: '/admin', stock: '/admin', repartidor: '/entregas' }[data.user.role] || '/');
    } catch (err) { setError(err.message); }
  };

  return (
    <form className="card-box auth" onSubmit={submit}>
      <h1>Ingresar</h1>
      <label>Correo<input type="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></label>
      <label>Contraseña<input type="password" required value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></label>
      {error && <p className="error">{error}</p>}
      <button className="btn">Entrar</button>
      <p className="muted small">¿No tienes cuenta? <Link to="/registro">Regístrate</Link></p>
    </form>
  );
}
