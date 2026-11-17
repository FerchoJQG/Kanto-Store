import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useApp } from '../AppContext';

export default function Register() {
  const { login } = useApp();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try { login(await api.register(f)); nav('/'); } catch (err) { setError(err.message); }
  };

  return (
    <form className="card-box auth" onSubmit={submit}>
      <h1>Crear cuenta</h1>
      <label>Nombre<input required value={f.name} onChange={set('name')} /></label>
      <label>Correo<input type="email" required value={f.email} onChange={set('email')} /></label>
      <label>Teléfono<input value={f.phone} onChange={set('phone')} /></label>
      <label>Contraseña (mín. 6)<input type="password" minLength="6" required value={f.password} onChange={set('password')} /></label>
      {error && <p className="error">{error}</p>}
      <button className="btn">Registrarme</button>
      <p className="muted small">¿Ya tienes cuenta? <Link to="/login">Ingresa</Link></p>
    </form>
  );
}
