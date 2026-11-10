import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Image, TouchableOpacity, Linking } from 'react-native';
import { api, bs, etiqueta } from '../api';
import { s, Btn } from '../ui';
import { COLORS, API_URL } from '../config';
import { useStore } from '../store';

const Opt = ({ t, on, onPress }) => (
  <TouchableOpacity onPress={onPress} style={[s.row, { paddingVertical: 6 }]}>
    <Text style={{ fontSize: 18, marginRight: 8, color: COLORS.brand }}>{on ? '◉' : '○'}</Text><Text style={{ color: COLORS.ink }}>{t}</Text>
  </TouchableOpacity>
);

export default function CheckoutScreen({ navigation }) {
  const { cart, total, clearCart, user } = useStore();
  const [f, setF] = useState({ nombre_cliente: user?.nombre || '', email: user?.email || '', telefono: '', direccion: '', metodo_entrega: 'envio', metodo_pago: 'qr' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pedido, setPedido] = useState(null);
  const set = (k) => (v) => setF({ ...f, [k]: v });

  const enviar = async () => {
    setError(''); setBusy(true);
    try {
      const p = await api('/pedidos', { method: 'POST', body: { ...f, items: cart.map((i) => ({ producto_id: i.id, cantidad: i.cantidad })) } });
      clearCart(); setPedido(p);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  if (pedido) {
    return (
      <ScrollView style={s.screen} contentContainerStyle={[s.pad, { alignItems: 'center' }]}>
        <Text style={s.h1}>¡Pedido registrado! 🎉</Text>
        <Text>Código: <Text style={{ fontWeight: '800' }}>{pedido.codigo}</Text></Text>
        <Text style={{ marginVertical: 6 }}>Total {bs(pedido.total)}</Text>
        {pedido.qr && <><Image source={{ uri: pedido.qr }} style={{ width: 240, height: 240, backgroundColor: '#fff' }} /><Text style={s.muted}>Escanea para pagar (confirmación simulada).</Text></>}
        {pedido.datos_transferencia && <View style={s.card}><Text>Banco: {pedido.datos_transferencia.banco}</Text><Text>Cuenta: {pedido.datos_transferencia.cuenta}</Text><Text>Titular: {pedido.datos_transferencia.titular}</Text><Text>Referencia: {pedido.datos_transferencia.referencia}</Text></View>}
        {pedido.metodo_pago === 'contra_entrega' && <Text>Pagarás al recibir tu pedido.</Text>}
        <View style={{ height: 12 }} />
        <Btn title="Descargar comprobante (PDF)" onPress={() => Linking.openURL(`${API_URL}/pedidos/comprobante/${pedido.codigo}?email=${encodeURIComponent(f.email)}`)} />
        <View style={{ height: 8 }} />
        <Btn ghost title="Volver al catálogo" onPress={() => navigation.popToTop()} />
      </ScrollView>
    );
  }
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <TextInput style={s.input} placeholder="Nombre completo" value={f.nombre_cliente} onChangeText={set('nombre_cliente')} />
      <TextInput style={s.input} placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={f.email} onChangeText={set('email')} />
      <TextInput style={s.input} placeholder="Teléfono" keyboardType="phone-pad" value={f.telefono} onChangeText={set('telefono')} />
      <Text style={s.h1}>Entrega</Text>
      <Opt t="Envío a domicilio" on={f.metodo_entrega === 'envio'} onPress={() => set('metodo_entrega')('envio')} />
      <Opt t="Retiro en tienda" on={f.metodo_entrega === 'retiro'} onPress={() => set('metodo_entrega')('retiro')} />
      {f.metodo_entrega === 'envio' && <TextInput style={s.input} placeholder="Dirección" value={f.direccion} onChangeText={set('direccion')} />}
      <Text style={s.h1}>Pago</Text>
      {['qr', 'transferencia', 'contra_entrega'].map((m) => <Opt key={m} t={etiqueta(m)} on={f.metodo_pago === m} onPress={() => set('metodo_pago')(m)} />)}
      <Text style={[s.h1, { marginTop: 12 }]}>Total: {bs(total)}</Text>
      {!!error && <Text style={s.err}>{error}</Text>}
      <Btn title={busy ? 'Procesando…' : 'Confirmar pedido'} disabled={busy} onPress={enviar} />
    </ScrollView>
  );
}
