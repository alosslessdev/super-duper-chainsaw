import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Modal } from 'react-native';
import styled from 'styled-components/native';
import { colors } from './styles/colors';

const LoginScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const handleSocialRegister = (platform: string) => {
    Alert.alert('Registro', `Registrarse con ${platform}`);
    // Aquí puedes agregar lógica real de autenticación social
    setShowRegisterModal(false);
  };

  // ¡Importante! Aquí redirigimos a la pantalla formulario con ruta en minúscula
  const handleFormRegister = () => {
    setShowRegisterModal(false);
    router.push('/Formulario'); // nombre en minúscula porque el archivo será formulario.tsx
  };

  const handleLogin = () => {
    if (email === 'admin' && password === '1234') {
      Alert.alert('Bienvenido', 'Has ingresado correctamente', [
        {
          text: 'Aceptar',
          onPress: () => router.replace('/(app)'),
        },
      ]);
    } else {
      Alert.alert('Error', 'Por favor ingresa un correo válido y contraseña correcta');
    }
  };

  return (
    <>
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
        />

        <Label>Contraseña</Label>
        <Input
          placeholder="1234"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Button onPress={handleLogin}>
          <ButtonText>Ingresar</ButtonText>
        </Button>

        <LinkTouchable onPress={() => Alert.alert('Recuperar contraseña', 'Funcionalidad pendiente')}>
          <LinkText>¿Olvidaste tu contraseña?</LinkText>
        </LinkTouchable>

        <LinkTouchable onPress={() => setShowRegisterModal(true)}>
          <LinkText>Registrarme</LinkText>
        </LinkTouchable>
      </Container>

      {/* Modal de Registro */}
      <Modal visible={showRegisterModal} transparent animationType="slide">
        <ModalOverlay>
          <ModalContent>
            <ModalTitle>Registrarse con:</ModalTitle>

            <SocialButton onPress={() => handleSocialRegister('Gmail')}>
              <FontAwesome name="google" size={20} color="white" />
              <SocialText>Gmail</SocialText>
            </SocialButton>

            <SocialButton onPress={() => handleSocialRegister('Facebook')}>
              <FontAwesome name="facebook" size={20} color="white" />
              <SocialText>Facebook</SocialText>
            </SocialButton>

            <SocialButton onPress={() => handleSocialRegister('X')}>
              <FontAwesome name="twitter" size={20} color="white" />
              <SocialText>X</SocialText>
            </SocialButton>

            <SocialButton onPress={handleFormRegister}>
              <FontAwesome name="user-plus" size={20} color="white" />
              <SocialText>Registro con formulario</SocialText>
            </SocialButton>

            <CancelButton onPress={() => setShowRegisterModal(false)}>
              <CancelText>Cancelar</CancelText>
            </CancelButton>
          </ModalContent>
        </ModalOverlay>
      </Modal>
    </>
  );
};

export default LoginScreen;

// ---------------- STYLES ----------------

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

// Modal styles
const ModalOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: center;
  align-items: center;
`;

const ModalContent = styled.View`
  width: 80%;
  background-color: white;
  border-radius: 16px;
  padding: 20px;
  align-items: center;
`;

const ModalTitle = styled.Text`
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 16px;
`;

const SocialButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  background-color: ${colors.primary};
  padding: 10px 16px;
  border-radius: 8px;
  margin-vertical: 6px;
  width: 100%;
`;

const SocialText = styled.Text`
  color: white;
  margin-left: 12px;
  font-size: 16px;
`;

const CancelButton = styled.TouchableOpacity`
  margin-top: 12px;
`;

const CancelText = styled.Text`
  color: ${colors.primary};
  text-decoration: underline;
  font-size: 16px;
`;
