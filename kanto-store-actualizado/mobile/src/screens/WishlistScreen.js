import React, { useCallback, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { s } from '../ui';
import { useStore } from '../store';
import ProductItem from '../components/ProductItem';

export default function WishlistScreen({ navigation }) {
  const { user, wishlist } = useStore();
  const [items, setItems] = useState([]);
  useFocusEffect(useCallback(() => { if (user) api('/wishlist').then(setItems).catch(() => {}); }, [user, wishlist]));
  if (!user) return <View style={[s.screen, s.pad]}><Text style={s.muted}>Inicia sesión en la pestaña Cuenta para ver tu lista de deseos.</Text></View>;
  return (
    <FlatList style={s.screen} contentContainerStyle={s.pad} data={items} keyExtractor={(p) => String(p.id)}
      ListEmptyComponent={<Text style={s.muted}>Aún no tienes cartas en tu lista.</Text>}
      renderItem={({ item }) => <ProductItem p={item} onPress={() => navigation.navigate('Producto', { id: item.id })} />} />
  );
}
