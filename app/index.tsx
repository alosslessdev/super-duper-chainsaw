import { router } from 'expo-router';
import styled from "styled-components/native";

/**
 * Pantalla de bienvenida de la app.
 * Muestra el nombre de la app, un mensaje motivador y un botón para comenzar.
 * Al presionar el botón, navega a la pantalla de inicio de sesión.
 */
export default function PantallaInicioSesion() {
  return (
    <Container>
      <Title>Growin</Title>
      <SubTitle>Crece cada minuto,{"\n"}organiza tu tiempo, conquista tu día.</SubTitle>
      <StartButton onPress={() => router.push('/login')}>
        <ButtonText>Comenzar</ButtonText>
      </StartButton>
    </Container>
  );
}

// Estilos con styled-components
const Container = styled.View`
  flex: 1;
  background-color: #2196F3;
  justify-content: center;
  align-items: center;
  padding: 20px;
`;

const Title = styled.Text`
  font-size: 36px;
  color: white;
  font-weight: bold;
  margin-bottom: 20px;
`;

const SubTitle = styled.Text`
  font-size: 18px;
  color: white;
  text-align: center;
  margin-bottom: 40px;
`;

const StartButton = styled.TouchableOpacity`
  background-color: white;
  padding-vertical: 14px;
  padding-horizontal: 40px;
  border-radius: 12px;
`;

const ButtonText = styled.Text`
  color: #2196F3;
  font-size: 16px;
  font-weight: bold;
`;