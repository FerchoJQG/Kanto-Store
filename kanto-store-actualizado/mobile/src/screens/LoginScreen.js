import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView } from 'react-native';
import { api } from '../api';
import { s, Btn } from '../ui';
import { useStore } from '../store';

export default function LoginScreen() {
  const { user, login, logout } = useStore();
  const [registro, setRegistro] = useState(false);
  const [f, setF] = useState({ nombre: '', email: '', password: '', telefono: '' });
  const [error, setError] = useState('');
  const set = (k) => (v) => setF({ ...f, [k]: v });

  if (user) {
    return (
      <View style={[s.screen, s.pad]}>
        <Text style={s.h1}>Hola, {user.nombre} 👋</Text>
        <Text style={s.muted}>{user.email} · {user.rol}</Text>
        {user.rol !== 'cliente' && <Text style={[s.muted, { marginTop: 8 }]}>El panel administrativo está disponible en la versión web.</Text>}
        <View style={{ height: 16 }} /><Btn ghost title="Cerrar sesión" onPress={logout} />
      </View>
    );
  }
  const enviar = async () => {
    setError('');
    try { login(await api(registro ? '/auth/register' : '/auth/login', { method: 'POST', body: f, token: '' })); }
    catch (e) { setError(e.message); }
  };
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <Text style={s.h1}>{registro ? 'Crear cuenta' : 'Ingresar'}</Text>
      {registro && <TextInput style={s.input} placeholder="Nombre" value={f.nombre} onChangeText={set('nombre')} />}
      <TextInput style={s.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={f.email} onChangeText={set('email')} />
      <TextInput style={s.input} placeholder="Contraseña" secureTextEntry value={f.password} onChangeText={set('password')} />
      {registro && <TextInput style={s.input} placeholder="Teléfono" keyboardType="phone-pad" value={f.telefono} onChangeText={set('telefono')} />}
      {!!error && <Text style={s.err}>{error}</Text>}
      <Btn title={registro ? 'Registrarme' : 'Entrar'} onPress={enviar} />
      <View style={{ height: 8 }} />
      <Btn ghost title={registro ? 'Ya tengo cuenta' : 'Crear una cuenta'} onPress={() => setRegistro(!registro)} />
      <Text style={[s.muted, { marginTop: 12 }]}>También puedes comprar sin cuenta como invitado.</Text>
    </ScrollView>
  );
}
