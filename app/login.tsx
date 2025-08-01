import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Modal, Alert, ActivityIndicator } from 'react-native';
import styled from 'styled-components/native';
import { setAwsKeys, setUserEmail, setUserId } from './clientKeyStore'; // Adjust path as needed, added setUserId
import { colors } from './styles/colors'; // Assuming this path is correct

// Import for Google Sign-In
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';

// Ensure WebBrowser is dismissed
WebBrowser.maybeCompleteAuthSession();

const LoginScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Google OAuth Configuration
  // IMPORTANT: Replace with your actual Android Client ID from Google Cloud Console
  const ANDROID_CLIENT_ID = '1015456684061-86pj6f933utkjpui9uj62fmqntt5duf4.apps.googleusercontent.com'; // e.g., '1234567890-abcdefghijk.apps.googleusercontent.com'
  // For standalone Android apps, a custom URI scheme is typically used.
  // Replace 'com.yourcompany.yourapp' with your actual package name from app.json
  const REDIRECT_URI = makeRedirectUri({
    scheme: 'com.yourcompany.yourapp', // Replace with your actual Android package name
    path: 'oauthredirect', // Optional path, can be anything you configure in Google Cloud
    preferLocalhost: true, // Use localhost for development, will be ignored in production builds if scheme is present
  });

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: ANDROID_CLIENT_ID,
    scopes: ['profile', 'email'],
    redirectUri: REDIRECT_URI,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        handleGoogleAuthSuccess(authentication.accessToken);
      } else {
        showMessage('error', 'Google authentication failed: No access token.');
      }
    } else if (response?.type === 'error') {
      showMessage('error', `Google authentication error: ${response.error?.message || 'Unknown error'}`);
    }
  }, [response]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000); // Hide message after 3 seconds
  };

  // Function to handle social registration (generic, not Google specific)
  const handleSocialRegister = (platform: string) => {
    showMessage('success', `Registrarse con ${platform} (Funcionalidad pendiente)`);
    setShowRegisterModal(false);
  };

  // Redirect to Formulario screen
  const handleFormRegister = () => {
    setShowRegisterModal(false);
    router.push('/Formulario');
  };

  // Handle standard login with backend
  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://octopus-app-jjamd.ondigitalocean.app/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        const cookie = response.headers.get('set-cookie') || '';
        // Extract userId from the response and pass it to setAwsKeys
        const userId = data.usuario.id;
        setAwsKeys(data.secretKeyId, data.secretKey, cookie, userId);
        setUserEmail(email); // Store the email
        setUserId(userId); // Also store userId using the new function if needed separately

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
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Login/Registration
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // Prompt the user for Google sign-in
      await promptAsync();
    } catch (error) {
      showMessage('error', `Error initiating Google Sign-In: ${error}`);
      setLoading(false);
    }
  };

  const handleGoogleAuthSuccess = async (accessToken: string) => {
    try {
      // Fetch user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await userInfoResponse.json();

      if (!userInfo.email) {
        showMessage('error', 'Could not retrieve email from Google account.');
        setLoading(false);
        return;
      }

      const googleEmail = userInfo.email;

      // Send Google email to your backend for registration/login
      const backendResponse = await fetch('https://octopus-app-jjamd.ondigitalocean.app/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: googleEmail, googleAccessToken: accessToken }),
      });

      const backendData = await backendResponse.json();

      if (backendResponse.ok) {
        const cookie = backendResponse.headers.get('set-cookie') || '';
        // Extract userId from the backendData response and pass it to setAwsKeys
        const userId = backendData.usuario.id;
        setAwsKeys(backendData.secretKeyId, backendData.secretKey, cookie, userId);
        setUserEmail(googleEmail); // Store the Google email
        setUserId(userId); // Also store userId using the new function if needed separately
        showMessage('success', 'Has ingresado correctamente con Google.');
        router.replace('/(app)');
      } else {
        showMessage('error', backendData.error || 'Error al procesar el inicio de sesión con Google.');
      }
    } catch (error) {
      showMessage('error', `Error processing Google login: ${error}`);
    } finally {
      setLoading(false);
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

        <Button onPress={handleLogin} disabled={loading}>
          <ButtonText>Ingresar</ButtonText>
        </Button>

        <LinkTouchable onPress={() => Alert.alert('Recuperar contraseña', 'Funcionalidad pendiente')}>
          <LinkText>¿Olvidaste tu contraseña?</LinkText>
        </LinkTouchable>

        <LinkTouchable onPress={() => setShowRegisterModal(true)}>
          <LinkText>Registrarme</LinkText>
        </LinkTouchable>
      </Container>

      {/* Message Modal */}
      {message && (
        <MessageModalOverlay>
          <MessageModalContent type={message.type}>
            <MessageText>{message.text}</MessageText>
          </MessageModalContent>
        </MessageModalOverlay>
      )}

      {/* Register Modal */}
      <Modal visible={showRegisterModal} transparent animationType="slide">
        <ModalOverlay>
          <ModalContent>
            <ModalTitle>Registrarse con:</ModalTitle>

            <SocialButton onPress={() => handleSocialRegister('Google')}>
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
  color: "#000000";
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
  justify-content: center; /* Center content horizontally */
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

// Custom Message Modal Styles
const MessageModalOverlay = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  justify-content: flex-start; /* Position at the top */
  align-items: center;
  padding-top: 50px; /* Adjust as needed */
  pointer-events: none; /* Allow interaction with elements behind it */
`;

const MessageModalContent = styled.View<{ type: 'success' | 'error' }>`
  background-color: ${(props: { type: string; }) => props.type === 'success' ? '#4CAF50' : '#F44336'}; /* Green for success, Red for error */
  padding: 15px 20px;
  border-radius: 8px;
  elevation: 5; /* Shadow for Android */
  shadow-color: #000; /* Shadow for iOS */
  shadow-offset: 0px 2px;
  shadow-opacity: 0.25;
  shadow-radius: 3.84px;
`;

const MessageText = styled.Text`
  color: ${colors.black};
  font-size: 16px;
  text-align: center;
`;
