// app/login.tsx
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import styled from 'styled-components/native';
import { colors } from './styles/colors';
import { setAwsKeys } from './awsKeyStore';

const LoginScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

const handleLogin = async () => {

 try {
      const response = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // for session cookies
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
      // Get session cookie from response headers
      const cookie = response.headers.get('set-cookie') || '';
      setAwsKeys(data.secretKeyId, data.secretKey, cookie);
        ;
        Alert.alert('Bienvenido', 'Has ingresado correctamente', [
          {
            text: 'Aceptar',
            onPress: () => router.replace('/(app)'),
          },
        ]);
      } else {
        Alert.alert('Error', data.error || 'Por favor ingresa un correo válido y contraseña correcta');
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo conectar al servidor');
    }
  };

  /* if (email === 'admin' && password === '1234') {
    Alert.alert('Bienvenido', 'Has ingresado correctamente', [
      {
        text: 'Aceptar',
        onPress: () => router.replace('/(app)'),
      },
    ]);
  } else {
    Alert.alert('Error', 'Por favor ingresa un correo válido y contraseña correcta');
  }
}; */

  return (
    <Container>
      <Logo>Growin</Logo>
      <Title>Inicia sesión para tener seguimiento de tus rutinas</Title>

      <Label>Correo electrónico</Label>
      <Input
        placeholder="admin"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Campo correo electrónico"
      />

      <Label>Contraseña</Label>
      <Input
        placeholder="1234"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        accessibilityLabel="Campo contraseña"
      />

      <Button onPress={handleLogin} accessibilityRole="button">
        <ButtonText>Ingresar</ButtonText>
      </Button>

      <LinkTouchable>
        <LinkText>¿Olvidaste tu contraseña?</LinkText>
      </LinkTouchable>

      <LinkTouchable>
        <LinkText>Registrarme</LinkText>
      </LinkTouchable>
    </Container>
  );
};

export default LoginScreen;

// Estilos con styled-components
const Container = styled.View`
  flex: 1;
  background-color: ${colors.primary};
  padding: 20px;
  justify-content: center;
`;

const Logo = styled.Text`
  font-size: 24px;
  color: ${colors.white};
  text-align: center;
  margin-bottom: 10px;
  font-weight: bold;
`;

const Title = styled.Text`
  font-size: 18px;
  color: ${colors.white};
  text-align: center;
  margin-bottom: 30px;
`;

const Label = styled.Text`
  color: ${colors.white};
  margin-bottom: 5px;
  font-weight: bold;
`;

const Input = styled.TextInput`
  background-color: ${colors.white};
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 15px;
`;

const Button = styled.TouchableOpacity`
  background-color: ${colors.white};
  padding: 15px;
  border-radius: 10px;
  align-items: center;
  margin-vertical: 10px;
`;

const ButtonText = styled.Text`
  color: ${colors.primary};
  font-weight: bold;
`;

const LinkTouchable = styled.TouchableOpacity``;

const LinkText = styled.Text`
  color: ${colors.white};
  text-align: center;
  margin-top: 10px;
  text-decoration: underline;
`;
