// app/app/home.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity, TextInput, FlatList,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { colors } from '../styles/colors';

type Msg = { id: string; text: string; fromMe: boolean };

export default function HomeScreen() {
  const router = useRouter();
  const nav = useNavigation();
  const [time, setTime] = useState('');
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);

  // Reloj
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString());
    tick();
    const tm = setInterval(tick, 1000);
    return () => clearInterval(tm);
  }, []);

  React.useLayoutEffect(() => {
    nav.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => nav.dispatch(DrawerActions.toggleDrawer())} style={{ padding: 8 }}>
          <Text style={styles.headerBtn}>☰</Text>
        </TouchableOpacity>
      ),
      headerTitle: () => <Text style={styles.clock}>{time}</Text>,
      headerStyle: { backgroundColor: colors.primary },
      headerTitleAlign: 'center',
      headerTintColor: 'white',
      headerRight: () => (
        <TouchableOpacity onPress={() => router.push('../settings')} style={{ padding: 8 }}>
          <Text style={styles.headerBtn}>⚙️</Text>
        </TouchableOpacity>
      ),
    });
  }, [nav, time]);

  const sendMsg = () => {
    if (!input.trim()) return;
    const newMsg: Msg = { id: Date.now().toString(), text: input.trim(), fromMe: true };
    setMsgs(cur => [...cur, newMsg]);
    setInput('');
    setTimeout(() => {
      setMsgs(cur => [
        ...cur,
        { id: Date.now().toString() + '-bot', text: 'Respuesta automática', fromMe: false }
      ]);
    }, 800);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={msgs}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.fromMe ? styles.myBubble : styles.botBubble]}>
            <Text style={styles.bubbleText}>{item.text}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 16 }}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Escribe un mensaje..."
        />
        <TouchableOpacity onPress={sendMsg} style={styles.sendBtn}>
          <Text style={styles.sendTxt}>Enviar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() =>
            router.push({
              pathname: './history',
              params: { msgs: JSON.stringify(msgs) },
            })
          }
        >
          <Text style={styles.historyTxt}>Historial</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  headerBtn: { color: 'white', fontSize: 20 },
  clock: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  bubble: {
    marginVertical: 4,
    padding: 12,
    maxWidth: '70%',
    borderRadius: 12,
  },
  myBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary + '33' },
  botBubble: { alignSelf: 'flex-start', backgroundColor: '#eee' },
  bubbleText: { color: '#333', fontSize: 16 },

  inputRow: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f6f6f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  sendTxt: { color: 'white', fontWeight: 'bold' },
  historyBtn: {
    marginLeft: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ccc',
    borderRadius: 20,
  },
  historyTxt: { color: '#333' },
});
