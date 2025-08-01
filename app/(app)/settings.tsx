import { useNavigation } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router'; // Import useRouter
import React from 'react';
import { ScrollView } from 'react-native';
import styled from 'styled-components/native';
import { getAwsKeys } from '../clientKeyStore'; // Import getAwsKeys
import { colors } from '../styles/colors';

export default function SettingsScreen() {
  const nav = useNavigation();
  const router = useRouter(); // Initialize useRouter

  const { sessionCookie } = getAwsKeys(); // Get sessionCookie

  // Maneja cierre de sesión y navegación a pantalla de login
  const handleLogout = async () => {
    try {
      const response = await fetch('http://0000243.xyz:8080/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie, // Send the cookie to ensure the correct session is logged out
        },
        credentials: 'include',
      });

      if (response.ok) {
        // Puedes reemplazar alert por un Toast o componente propio
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

  // Opciones básicas de configuración
  const basicOptions = [
    { id: 'profile', label: 'Perfil', onPress: () => alert('Perfil aún no implementado') },
    { id: 'notifications', label: 'Notificaciones', onPress: () => alert('Notificaciones aún no implementado') },
    { id: 'privacy', label: 'Privacidad', onPress: () => alert('Privacidad aún no implementado') },
  ];

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
          headerTitle: () => <HeaderText>Configuración</HeaderText>,
        }}
      />

      {/* Contenedor principal con scroll para opciones */}
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Container>
          <Title>Configuración</Title>
          <Text>Opciones básicas de usuario</Text>

          {/* Renderiza las opciones básicas */}
          {basicOptions.map(option => (
            <OptionButton key={option.id} onPress={option.onPress}>
              <OptionText>{option.label}</OptionText>
            </OptionButton>
          ))}

          {/* Botón para cerrar sesión */}
          <LogoutButton onPress={handleLogout}>
            <LogoutButtonText>Cerrar Sesión</LogoutButtonText>
          </LogoutButton>
        </Container>
      </ScrollView>
    </>
  );
}

// Estilos con styled-components
const Container = styled.View`
  flex: 1;
  justify-content: flex-start;
  align-items: center;
  background-color: ${colors.white};
  padding: 20px;
`;

const Title = styled.Text`
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 12px;
`;

const Text = styled.Text`
  font-size: 16px;
  color: #555;
  margin-bottom: 20px;
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
  margin-top: 40px;
`;

const LogoutButtonText = styled.Text`
  color: white;
  font-size: 18px;
  font-weight: bold;
`;

const OptionButton = styled.TouchableOpacity`
  background-color: #0A84FF;
  padding: 15px 30px;
  border-radius: 10px;
  margin-bottom: 15px;
  width: 100%;
  max-width: 400px;
  align-items: center;
`;

const OptionText = styled.Text`
  color: white;
  font-size: 18px;
  font-weight: 600;
`;
