// app/settings.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../styles/colors';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configuración</Text>
      {/* Aquí puedes agregar opciones futuras */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: colors.white },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.primary, marginBottom: 10 },
});
