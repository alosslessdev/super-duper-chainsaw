import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import styled from 'styled-components/native';

const Formulario = () => {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');

  const handleRegister = () => {
    if (email.trim() === '' || password.trim() === '' || telefono.trim() === '') {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    Alert.alert('Registro Exitoso', 'Te has registrado correctamente', [
      { text: 'Aceptar', onPress: () => router.replace('/login') },
    ]);
  };

  return (
    <Container>
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

      <Button onPress={handleRegister}>
        <ButtonText>Registrarse</ButtonText>
      </Button>
    </Container>
  );
};

export default Formulario;

// Estilos
const Container = styled.View`
  flex: 1;
  padding: 20px;
  justify-content: center;
`;

const Logo = styled.Text`
  font-size: 24px;
  text-align: center;
  margin-bottom: 30px;
  font-weight: bold;
`;

const Label = styled.Text`
  margin-bottom: 5px;
  font-weight: bold;
`;

const Input = styled.TextInput`
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 15px;
  background-color: #fff;
`;

const Button = styled.TouchableOpacity`
  padding: 15px;
  border-radius: 10px;
  align-items: center;
  margin-vertical: 10px;
  background-color: #0A84FF;
`;

const ButtonText = styled.Text`
  color: white;
  font-weight: bold;
`;
