// app/app/history.tsx
import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors } from '../styles/colors';

type Msg = { id: string; text: string; fromMe: boolean };

export default function HistoryScreen() {
  const { msgs } = useLocalSearchParams<{ msgs?: string }>();
  const data: Msg[] = msgs ? JSON.parse(msgs) : [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Historial</Text>
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.fromMe ? styles.myBubble : styles.botBubble]}>
            <Text style={styles.bubbleText}>{item.text}</Text>
          </View>
        )}
        ListEmptyComponent={<Text>No hay mensajes aún</Text>}
        contentContainerStyle={{ paddingVertical: 8 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  bubble: { marginVertical: 6, padding: 10, maxWidth: '80%', borderRadius: 12 },
  myBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary + '33' },
  botBubble: { alignSelf: 'flex-start', backgroundColor: '#eee' },
  bubbleText: { color: '#333' },
});
