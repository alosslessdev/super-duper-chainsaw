// App.js
// This component provides a registration form for a user, handling state,
// validation, and a POST request to a registration API endpoint.

import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import styled from 'styled-components/native';

// This is the main form component for user registration.
const Formulario = () => {
  // `useRouter` is a hook from Expo Router for navigation.
  const router = useRouter();

  // State hooks for managing form input values and loading state.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [telefono, setTelefono] = useState('');

  // The handleRegister function is asynchronous to manage the API call.
  const handleRegister = async () => {
    // Basic validation to ensure required fields are not empty.
    if (email.trim() === '' || password.trim() === '') {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    // Set loading to true to disable the button and show a loading message.
    setLoading(true);

    try {
      // Make a POST request to the registration endpoint.
      const response = await fetch('http://0000243.xyz:8080/usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      // Check if the response was successful (HTTP status 200-299).
      if (response.ok) {
        Alert.alert('Registro Exitoso', 'Te has registrado correctamente', [
          // On success, navigate the user to the login page.
          { text: 'Aceptar', onPress: () => router.replace('/login') },
        ]);
      } else {
        // If the server returns an error, parse the error message and display it.
        const errorData = await response.json();
        Alert.alert(
          'Error de Registro',
          errorData.message || 'Ocurrió un error inesperado'
        );
      }
    } catch (error) {
      // Handle network or other unexpected errors.
      console.error('Error durante el registro:', error);
      Alert.alert(
        'Error de Conexión',
        'No se pudo conectar al servidor. Por favor, inténtalo de nuevo.'
      );
    } finally {
      // Always reset the loading state after the request completes.
      setLoading(false);
    }
  };

  // The JSX for the registration form UI.
  return (
    <Container>
      {/* The Logo component is a styled Text component, so text is correctly wrapped. */}
      <Logo>Registro</Logo>

      <Label>Correo Electrónico</Label>
      <Input
        placeholder="correo@ejemplo.com"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Label>Contraseña</Label>
      <Input
        placeholder="••••••••"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Label>Número Telefónico</Label>
      <Input
        placeholder="60001234"
        keyboardType="phone-pad"
        value={telefono}
        onChangeText={setTelefono}
      />

      {/* The Button is a TouchableOpacity, and its text is inside the ButtonText styled component. */}
      <Button onPress={handleRegister} disabled={loading}>
        <ButtonText>{loading ? 'Registrando...' : 'Registrarse'}</ButtonText>
      </Button>
    </Container>
  );
};

export default Formulario;

// --- Estilos ---
// These are all styled components with their base components defined.

const Container = styled.View`
  flex: 1;
  padding: 20px;
  justify-content: center;
  background-color: #f0f0f0;
`;

const Logo = styled.Text`
  font-size: 32px;
  text-align: center;
  margin-bottom: 40px;
  font-weight: bold;
  color: #333;
`;

const Label = styled.Text`
  margin-bottom: 5px;
  font-weight: bold;
  color: #555;
`;

const Input = styled.TextInput`
  border-radius: 12px;
  padding: 15px 18px;
  margin-bottom: 20px;
  background-color: #fff;
  border-width: 1px;
  border-color: #ddd;
  font-size: 16px;
`;

const Button = styled.TouchableOpacity`
  padding: 18px;
  border-radius: 12px;
  align-items: center;
  margin-vertical: 10px;
  background-color: #0a84ff;
`;

const ButtonText = styled.Text`
  color: white;
  font-weight: bold;
  font-size: 18px;
`;
