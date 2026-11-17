import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { s } from '../ui';
import { COLORS } from '../config';
import { bs, etiqueta } from '../api';

export default function ProductItem({ p, onPress }) {
  return (
    <TouchableOpacity style={[s.card, s.row]} onPress={onPress}>
      <Image source={p.imagen_url ? { uri: p.imagen_url } : undefined} style={{ width: 60, height: 84, borderRadius: 6, backgroundColor: '#e9eef7', marginRight: 12 }} resizeMode="contain" />
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', fontSize: 16, color: COLORS.ink }}>{p.nombre}</Text>
        <Text style={s.muted}>{p.expansion || '—'}{p.numero_coleccion ? ` · ${p.numero_coleccion}` : ''}</Text>
        <Text style={s.muted}>{[p.rareza && etiqueta(p.rareza), etiqueta(p.idioma), etiqueta(p.estado_conservacion)].filter(Boolean).join(' · ')}</Text>
        <View style={[s.row, { justifyContent: 'space-between', marginTop: 4 }]}>
          <Text style={{ color: COLORS.brand, fontWeight: '800' }}>{bs(p.precio)}</Text>
          <Text style={{ color: p.stock > 0 ? COLORS.ok : '#d62839' }}>{p.stock > 0 ? `${p.stock} disp.` : 'Agotado'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
