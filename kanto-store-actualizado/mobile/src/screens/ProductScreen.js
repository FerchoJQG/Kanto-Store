import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, Alert } from 'react-native';
import { api, bs, etiqueta } from '../api';
import { s, Btn } from '../ui';
import { COLORS } from '../config';
import { useStore } from '../store';

export default function ProductScreen({ route, navigation }) {
  const [p, setP] = useState(null);
  const { addToCart, user, wishlist, toggleWish } = useStore();
  useEffect(() => { api(`/productos/${route.params.id}`).then((d) => { setP(d); navigation.setOptions({ title: d.nombre }); }).catch((e) => Alert.alert('Error', e.message)); }, []);
  if (!p) return null;
  const deseado = wishlist.includes(p.id);
  const Fila = ({ k, v }) => v ? <View style={[s.row, { justifyContent: 'space-between', paddingVertical: 4 }]}><Text style={s.muted}>{k}</Text><Text style={{ color: COLORS.ink }}>{v}</Text></View> : null;
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <Image source={p.imagen_url ? { uri: p.imagen_url } : undefined} style={{ width: '100%', height: 340, backgroundColor: '#e9eef7', borderRadius: 12 }} resizeMode="contain" />
      <Text style={[s.h1, { marginTop: 12 }]}>{p.nombre}</Text>
      <Text style={{ color: COLORS.brand, fontSize: 24, fontWeight: '800' }}>{bs(p.precio)}</Text>
      <View style={[s.card, { marginTop: 10 }]}>
        <Fila k="Expansión" v={p.expansion} /><Fila k="N.º de colección" v={p.numero_coleccion} />
        <Fila k="Rareza" v={p.rareza && etiqueta(p.rareza)} /><Fila k="Idioma" v={etiqueta(p.idioma)} />
        <Fila k="Estado de conservación" v={etiqueta(p.estado_conservacion)} /><Fila k="SKU" v={p.sku} />
        <Fila k="Stock" v={p.stock > 0 ? `${p.stock} disponible(s)` : 'Agotado'} />
      </View>
      {!!p.descripcion && <Text style={{ marginBottom: 12, color: COLORS.ink }}>{p.descripcion}</Text>}
      <Btn title="Agregar al carrito" disabled={p.stock < 1} onPress={() => { addToCart(p); Alert.alert('Listo', 'Agregado al carrito'); }} />
      <View style={{ height: 8 }} />
      {user
        ? <Btn ghost title={deseado ? '♥ En tu lista de deseos' : p.stock < 1 ? '♡ Avisarme cuando haya stock' : '♡ Agregar a deseos'} onPress={() => toggleWish(p.id).catch((e) => Alert.alert('Error', e.message))} />
        : <Text style={s.muted}>Inicia sesión (pestaña Cuenta) para usar la lista de deseos.</Text>}
    </ScrollView>
  );
}
