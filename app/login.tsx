// app/login.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router'; // <-- Importamos router
import { colors } from './styles/colors';

const LoginScreen = () => {
  const router = useRouter(); // <-- Hook para navegación
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // Validar usuario fijo
    if (email === 'admin' && password === '1234') {
      Alert.alert('Bienvenido', 'Has ingresado correctamente', [
        {
          text: 'Aceptar',
          onPress: () => router.push('/app/home'), // Navegar a "home"
        },
      ]);
    } else {
      Alert.alert('Error', 'Por favor ingresa un correo válido y contraseña correcta');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Growin</Text>
      <Text style={styles.title}>Inicia sesión para tener seguimiento de tus rutinas</Text>

      <Text style={styles.label}>Correo electrónico</Text>
      <TextInput
        style={styles.input}
        placeholder="admin"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Campo correo electrónico"
      />

      <Text style={styles.label}>Contraseña</Text>
      <TextInput
        style={styles.input}
        placeholder="1234"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        accessibilityLabel="Campo contraseña"
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} accessibilityRole="button">
        <Text style={styles.buttonText}>Ingresar</Text>
      </TouchableOpacity>

      <TouchableOpacity>
        <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
      </TouchableOpacity>

      <TouchableOpacity>
        <Text style={styles.link}>Registrarme</Text>
      </TouchableOpacity>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: 20,
    justifyContent: 'center',
  },
  logo: {
    fontSize: 24,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 30,
  },
  label: {
    color: colors.white,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 15,
  },
  button: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  link: {
    color: colors.white,
    textAlign: 'center',
    marginTop: 10,
    textDecorationLine: 'underline',
  },
});
