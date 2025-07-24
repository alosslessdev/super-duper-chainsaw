import { Stack } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import styled from 'styled-components/native';
import { colors } from '../styles/colors';

export default function SettingsScreen() {
  const nav = useNavigation();

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
`;

const Title = styled.Text`
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 12px;
`;

const Text = styled.Text`
  font-size: 16px;
  color: #555;
`;

const HeaderButton = styled.TouchableOpacity`
  padding: 8px;
`;

const HeaderText = styled.Text`
  color: white;
  font-size: 20px;
`;
