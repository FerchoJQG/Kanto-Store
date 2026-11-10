import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from './config';

export const Btn = ({ title, onPress, ghost, disabled, style }) => (
  <TouchableOpacity disabled={disabled} onPress={onPress} activeOpacity={0.8}
    style={[s.btn, ghost && s.ghost, disabled && { opacity: 0.4 }, style]}>
    <Text style={[s.btnT, ghost && { color: COLORS.ink }]}>{title}</Text>
  </TouchableOpacity>
);
export const s = StyleSheet.create({
  btn: { backgroundColor: COLORS.brand, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.line },
  btnT: { color: '#fff', fontWeight: '700' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 10, marginBottom: 10, color: COLORS.ink },
  screen: { flex: 1, backgroundColor: COLORS.bg },
  pad: { padding: 14 },
  h1: { fontSize: 22, fontWeight: '800', color: COLORS.ink, marginBottom: 8 },
  muted: { color: COLORS.muted, fontSize: 13 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, padding: 12, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  err: { color: '#9b1c1c', backgroundColor: '#fde8e8', padding: 8, borderRadius: 8, marginBottom: 8 },
});
