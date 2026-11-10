import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api, bs, etiqueta } from '../api';
import { s } from '../ui';
import { API_URL, COLORS } from '../config';
import { useStore } from '../store';

export default function OrdersScreen() {
  const { user } = useStore();
  const [rows, setRows] = useState([]);
  useFocusEffect(useCallback(() => { if (user) api('/pedidos/mis').then(setRows).catch(() => {}); }, [user]));
  if (!user) return <View style={[s.screen, s.pad]}><Text style={s.muted}>Inicia sesión en la pestaña Cuenta para ver tu historial.</Text></View>;
  return (
    <FlatList style={s.screen} contentContainerStyle={s.pad} data={rows} keyExtractor={(p) => String(p.id)}
      ListEmptyComponent={<Text style={s.muted}>Todavía no has hecho pedidos.</Text>}
      renderItem={({ item: p }) => (
        <View style={s.card}>
          <View style={[s.row, { justifyContent: 'space-between' }]}><Text style={{ fontWeight: '800' }}>{p.codigo}</Text><Text style={{ color: COLORS.blue }}>{etiqueta(p.estado)}</Text></View>
          <Text style={s.muted}>{new Date(p.creado_en).toLocaleString()} · {etiqueta(p.metodo_pago)}</Text>
          {p.items.map((i, k) => <Text key={k}>{i.cantidad} × {i.nombre}</Text>)}
          <View style={[s.row, { justifyContent: 'space-between', marginTop: 6 }]}>
            <Text style={{ fontWeight: '800' }}>{bs(p.total)}</Text>
            <TouchableOpacity onPress={() => Linking.openURL(`${API_URL}/pedidos/comprobante/${p.codigo}?email=${encodeURIComponent(p.email)}`)}><Text style={{ color: COLORS.blue }}>Comprobante</Text></TouchableOpacity>
          </View>
        </View>)} />
  );
}
