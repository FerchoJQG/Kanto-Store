import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context.jsx';

function Form({ registro }) {
  const [f, setF] = useState({ nombre: '', email: '', password: '', telefono: '' });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const nav = useNavigate();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setError('');
    try {
      const data = await api(registro ? '/auth/register' : '/auth/login', { method: 'POST', body: f, token: '' });
      login(data);
      nav(['admin', 'stock', 'repartidor'].includes(data.user.rol) ? '/admin' : '/');
    } catch (err) { setError(err.message); }
  };
  return (
    <form className="panel narrow" onSubmit={submit}>
      <h1>{registro ? 'Crear cuenta' : 'Ingresar'}</h1>
      {registro && <label>Nombre<input required value={f.nombre} onChange={set('nombre')} /></label>}
      <label>Email<input required type="email" value={f.email} onChange={set('email')} /></label>
      <label>Contraseña<input required type="password" minLength={6} value={f.password} onChange={set('password')} /></label>
      {registro && <label>Teléfono<input value={f.telefono} onChange={set('telefono')} /></label>}
      {error && <p className="alert">{error}</p>}
      <button>{registro ? 'Registrarme' : 'Entrar'}</button>
      <p className="muted">{registro ? <>¿Ya tienes cuenta? <Link to="/login">Ingresa</Link></> : <>¿Nuevo? <Link to="/registro">Crea tu cuenta</Link>. También puedes comprar como invitado.</>}</p>
    </form>
  );
}
export const Login = () => <Form />;
export const Register = () => <Form registro />;
