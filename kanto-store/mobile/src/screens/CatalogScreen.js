import React, { useEffect, useState } from 'react';
import { View, FlatList, TextInput, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { api, etiqueta } from '../api';
import { s } from '../ui';
import { COLORS } from '../config';
import ProductItem from '../components/ProductItem';

const Chip = ({ t, on, onPress }) => (
  <TouchableOpacity onPress={onPress} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginRight: 6, backgroundColor: on ? COLORS.brand : '#fff', borderWidth: 1, borderColor: COLORS.line }}>
    <Text style={{ color: on ? '#fff' : COLORS.ink }}>{t}</Text>
  </TouchableOpacity>
);

export default function CatalogScreen({ navigation }) {
  const [q, setQ] = useState('');
  const [f, setF] = useState({ tipo: '', expansion: '', rareza: '', idioma: '', estado: '' });
  const [items, setItems] = useState([]);
  const [exps, setExps] = useState([]);
  const [meta, setMeta] = useState({ rarezas: [], idiomas: [], estados: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { api('/expansiones').then(setExps).catch(() => {}); api('/meta').then(setMeta).catch(() => {}); }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      const qs = new URLSearchParams({ ...Object.fromEntries(Object.entries({ ...f, q }).filter(([, v]) => v)), limit: 60 });
      setLoading(true);
      api(`/productos?${qs}`).then((d) => { setItems(d.items); setError(''); }).catch((e) => setError(e.message)).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [f, q]);
  const tog = (k, v) => setF((x) => ({ ...x, [k]: x[k] === v ? '' : v }));

  const Fila = ({ k, opts }) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
      {opts.map((o) => <Chip key={o.v} t={o.t} on={f[k] === String(o.v)} onPress={() => tog(k, String(o.v))} />)}
    </ScrollView>
  );
  return (
    <View style={s.screen}>
      <View style={s.pad}>
        <TextInput style={s.input} placeholder="Buscar carta… (ej. Charizard)" value={q} onChangeText={setQ} />
        <Fila k="tipo" opts={[{ v: 'single', t: 'Cartas' }, { v: 'sellado', t: 'Sellados' }]} />
        <Fila k="expansion" opts={exps.map((e) => ({ v: e.id, t: e.nombre }))} />
        <Fila k="rareza" opts={meta.rarezas.map((v) => ({ v, t: etiqueta(v) }))} />
        <Fila k="idioma" opts={meta.idiomas.map((v) => ({ v, t: etiqueta(v) }))} />
        <Fila k="estado" opts={meta.estados.map((v) => ({ v, t: etiqueta(v) }))} />
        {!!error && <Text style={s.err}>{error}</Text>}
      </View>
      {loading ? <ActivityIndicator color={COLORS.brand} /> : (
        <FlatList data={items} keyExtractor={(p) => String(p.id)} contentContainerStyle={{ paddingHorizontal: 14 }}
          ListEmptyComponent={<Text style={[s.muted, { textAlign: 'center', marginTop: 30 }]}>Sin resultados</Text>}
          renderItem={({ item }) => <ProductItem p={item} onPress={() => navigation.navigate('Producto', { id: item.id })} />} />
      )}
    </View>
  );
}
