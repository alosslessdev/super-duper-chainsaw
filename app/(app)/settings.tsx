import { Stack, useRouter } from 'expo-router'; // Import useRouter
import { useNavigation } from '@react-navigation/native';
import styled from 'styled-components/native';
import { colors } from '../styles/colors';
import { getAwsKeys } from '../clientKeyStore'; // Import getAwsKeys

export default function SettingsScreen() {
  const nav = useNavigation();
  const router = useRouter(); // Initialize useRouter

  const { sessionCookie } = getAwsKeys(); // Get sessionCookie

  const handleLogout = async () => {
    try {
      const response = await fetch('https://octopus-app-jjamd.ondigitalocean.app/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie, // Send the cookie to ensure the correct session is logged out
        },
        credentials: 'include',
      });

      if (response.ok) {
        alert('Sesión cerrada exitosamente.');
        router.replace('../login'); // Navigate to a login or initial screen, assuming '/' is your login page
      } else {
        const errorData = await response.json();
        alert(`Error al cerrar sesión: ${errorData.error || response.statusText}`);
      }
    } catch (err) {
      console.error('Logout error:', err);
      alert('Error de conexión al intentar cerrar sesión.');
    }
  };

  return (
    <>
      {/* Configuración del encabezado de la pantalla */}
      <Stack.Screen
        options={{
          title: '',
          headerShown: true,
          headerStyle: { backgroundColor: colors.primary },
          headerTitleAlign: 'center',
          headerTintColor: 'white',

          // Botón que regresa a la pantalla anterior
          headerLeft: () => (
            <HeaderButton onPress={() => nav.goBack()}>
              <HeaderText>⬅</HeaderText>
            </HeaderButton>
          ),
          // Se eliminó el reloj del título
          headerTitle: () => <HeaderText>Configuración</HeaderText>,
        }}
      />

      {/* Contenido principal */}
      <Container>
        <Title>Configuración</Title>
        <Text>Opciones de usuario, notificaciones, privacidad, etc.</Text>

        <LogoutButton onPress={handleLogout}>
          <LogoutButtonText>Cerrar Sesión</LogoutButtonText>
        </LogoutButton>
      </Container>
    </>
  );
}

// Estilos con styled-components
const Container = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  background-color: ${colors.white};
  padding: 20px; /* Add some padding */
`;

const Title = styled.Text`
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 12px;
`;

const Text = styled.Text`
  font-size: 16px;
  color: #555;
  margin-bottom: 20px; /* Space before the button */
`;

const HeaderButton = styled.TouchableOpacity`
  padding: 8px;
`;

const HeaderText = styled.Text`
  color: white;
  font-size: 20px;
`;

const LogoutButton = styled.TouchableOpacity`
  background-color: #ff4d4d; /* Red color for logout button */
  padding: 15px 30px;
  border-radius: 10px;
  margin-top: 20px;
`;

const LogoutButtonText = styled.Text`
  color: white;
  font-size: 18px;
  font-weight: bold;
`;