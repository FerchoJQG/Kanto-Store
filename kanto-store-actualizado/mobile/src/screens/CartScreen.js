import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { s, Btn } from '../ui';
import { bs } from '../api';
import { COLORS } from '../config';
import { useStore } from '../store';

export default function CartScreen({ navigation }) {
  const { cart, setQty, removeItem, total } = useStore();
  if (!cart.length) return <View style={[s.screen, s.pad]}><Text style={[s.muted, { textAlign: 'center', marginTop: 40 }]}>Tu carrito está vacío</Text></View>;
  return (
    <View style={s.screen}>
      <FlatList data={cart} keyExtractor={(i) => String(i.id)} contentContainerStyle={s.pad}
        renderItem={({ item: i }) => (
          <View style={s.card}>
            <Text style={{ fontWeight: '700', color: COLORS.ink }}>{i.nombre}</Text>
            <View style={[s.row, { justifyContent: 'space-between', marginTop: 6 }]}>
              <View style={s.row}>
                <Btn ghost title="−" onPress={() => setQty(i.id, i.cantidad - 1)} style={{ paddingHorizontal: 12 }} />
                <Text style={{ marginHorizontal: 12, fontSize: 16 }}>{i.cantidad}</Text>
                <Btn ghost title="+" disabled={i.cantidad >= i.stock} onPress={() => setQty(i.id, i.cantidad + 1)} style={{ paddingHorizontal: 12 }} />
              </View>
              <Text style={{ fontWeight: '700' }}>{bs(i.precio * i.cantidad)}</Text>
              <TouchableOpacity onPress={() => removeItem(i.id)}><Text style={{ color: '#d62839' }}>Quitar</Text></TouchableOpacity>
            </View>
          </View>)} />
      <View style={[s.pad, { backgroundColor: '#fff', borderTopWidth: 1, borderColor: COLORS.line }]}>
        <Text style={[s.h1, { textAlign: 'right' }]}>Total: {bs(total)}</Text>
        <Btn title="Ir a pagar" onPress={() => navigation.navigate('Checkout')} />
      </View>
    </View>
  );
}
