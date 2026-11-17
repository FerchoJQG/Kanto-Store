import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, Image, TouchableOpacity, Linking, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api, bs, etiqueta } from '../api';
import { s, Btn } from '../ui';
import { COLORS, API_URL, WEB_URL } from '../config';
import { useStore } from '../store';

const Opt = ({ t, on, onPress }) => (
  <TouchableOpacity onPress={onPress} style={[s.row, { paddingVertical: 6 }]}>
    <Text style={{ fontSize: 18, marginRight: 8, color: COLORS.brand }}>{on ? '◉' : '○'}</Text><Text style={{ color: COLORS.ink }}>{t}</Text>
  </TouchableOpacity>
);

export default function CheckoutScreen({ navigation }) {
  const { cart, total, clearCart, user } = useStore();
  const [f, setF] = useState({ nombre_cliente: user?.nombre || '', email: user?.email || '', telefono: '', direccion: '', metodo_entrega: 'envio', metodo_pago: 'qr' });
  const [cfg, setCfg] = useState({ paypal: false });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pedido, setPedido] = useState(null);
  const [foto, setFoto] = useState(null);
  const [ref, setRef] = useState('');
  const [enviado, setEnviado] = useState(false);
  const set = (k) => (v) => setF({ ...f, [k]: v });
  useEffect(() => { api('/config/pagos').then(setCfg).catch(() => {}); }, []);

  const enviar = async () => {
    setError(''); setBusy(true);
    try {
      const p = await api('/pedidos', { method: 'POST', body: { ...f, items: cart.map((i) => ({ producto_id: i.id, cantidad: i.cantidad })) } });
      clearCart(); setPedido(p);
      if (p.metodo_pago === 'paypal') pagarPayPal(p);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const pagarPayPal = async (p = pedido) => {
    try { const r = await api('/paypal/crear', { method: 'POST', body: { codigo: p.codigo, email: f.email } }); Linking.openURL(r.approve_url); }
    catch (e) { Alert.alert('PayPal', e.message); }
  };
  const elegirFoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permiso', 'Necesitamos acceso a tus fotos para adjuntar el comprobante.');
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.5 });
    if (!r.canceled) setFoto(`data:image/jpeg;base64,${r.assets[0].base64}`);
  };
  const subirComprobante = async () => {
    try {
      await api(`/pedidos/seguimiento/${pedido.codigo}/comprobante`, { method: 'POST', body: { email: f.email, imagen: foto, referencia: ref } });
      setEnviado(true);
    } catch (e) { Alert.alert('Error', e.message); }
  };

  if (pedido) {
    const manual = ['qr', 'transferencia'].includes(pedido.metodo_pago);
    return (
      <ScrollView style={s.screen} contentContainerStyle={[s.pad, { alignItems: 'center' }]}>
        <Text style={s.h1}>¡Pedido registrado! 🎉</Text>
        <Text>Código: <Text style={{ fontWeight: '800' }}>{pedido.codigo}</Text> — {bs(pedido.total)}</Text>
        <View style={[s.card, { alignItems: 'center', backgroundColor: '#fff8d6', width: '100%', marginTop: 10 }]}>
          <Text>Tu PIN de entrega</Text><Text style={{ fontSize: 30, fontWeight: '800', letterSpacing: 6 }}>{pedido.pin_entrega}</Text>
          <Text style={s.muted}>Dáselo al repartidor solo al recibir tu pedido.</Text>
        </View>
        {pedido.qr && <><Text style={{ marginTop: 6 }}>Escanea para pagar {bs(pedido.total)}:</Text>
          <Image source={{ uri: pedido.qr }} style={{ width: 240, height: 240, backgroundColor: '#fff' }} resizeMode="contain" />
          {!pedido.qr_es_real && <Text style={s.muted}>(QR de demostración)</Text>}</>}
        {pedido.datos_transferencia && <View style={[s.card, { width: '100%' }]}><Text>Banco: {pedido.datos_transferencia.banco}</Text><Text>Cuenta: {pedido.datos_transferencia.cuenta}</Text><Text>Titular: {pedido.datos_transferencia.titular}</Text><Text>Glosa: {pedido.datos_transferencia.referencia}</Text></View>}
        {pedido.metodo_pago === 'contra_entrega' && <Text>Pagarás en efectivo al recibir tu pedido.</Text>}
        {pedido.metodo_pago === 'paypal' && <><Text style={{ marginVertical: 6 }}>Se cobrará USD {pedido.paypal?.monto_usd}</Text><Btn title="Pagar con PayPal" onPress={() => pagarPayPal()} /></>}
        {manual && (enviado ? <Text style={{ color: COLORS.ok, marginTop: 10 }}>✔ Comprobante enviado. Lo verificaremos pronto.</Text> : (
          <View style={{ width: '100%', marginTop: 10 }}>
            <Text style={s.h1}>Sube tu comprobante</Text>
            <Btn ghost title={foto ? 'Cambiar imagen' : 'Elegir foto del comprobante'} onPress={elegirFoto} />
            {foto && <Image source={{ uri: foto }} style={{ width: '100%', height: 200, marginVertical: 8 }} resizeMode="contain" />}
            <TextInput style={[s.input, { marginTop: 8 }]} placeholder="N.º de transacción (opcional)" value={ref} onChangeText={setRef} />
            <Btn title="Enviar comprobante" disabled={!foto} onPress={subirComprobante} />
          </View>))}
        <View style={{ height: 12 }} />
        <Btn ghost title="Ver seguimiento en la web" onPress={() => Linking.openURL(`${WEB_URL}/seguimiento/${pedido.codigo}?email=${encodeURIComponent(f.email)}`)} />
        <View style={{ height: 8 }} />
        <Btn ghost title="Comprobante PDF" onPress={() => Linking.openURL(`${API_URL}/pedidos/comprobante/${pedido.codigo}?email=${encodeURIComponent(f.email)}`)} />
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
      {['qr', 'transferencia', 'paypal', 'contra_entrega'].filter((m) => m !== 'paypal' || cfg.paypal).map((m) => (
        <Opt key={m} t={m === 'qr' ? 'QR bancario' : m === 'paypal' ? 'PayPal' : etiqueta(m)} on={f.metodo_pago === m} onPress={() => set('metodo_pago')(m)} />))}
      <Text style={[s.h1, { marginTop: 12 }]}>Total: {bs(total)}</Text>
      {!!error && <Text style={s.err}>{error}</Text>}
      <Btn title={busy ? 'Procesando…' : 'Confirmar pedido'} disabled={busy} onPress={enviar} />
    </ScrollView>
  );
}
