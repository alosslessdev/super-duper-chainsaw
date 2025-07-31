import { DrawerActions, useNavigation } from '@react-navigation/native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { FlatList } from 'react-native';
import styled from 'styled-components/native';



import { colors } from '../styles/colors';

type BubbleProps = {
  fromMe: boolean;
};

// Tipo de dato para los mensajes
type Msg = { id: string; text: string; fromMe: boolean };

export default function HistoryScreen() {
  const nav = useNavigation();

  // Obtener los parámetros de búsqueda locales (mensajes en formato JSON)
  const { msgs } = useLocalSearchParams<{ msgs?: string }>();
  const data: Msg[] = msgs ? JSON.parse(msgs) : [];

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
          headerLeft: () => (
            <HeaderButton onPress={() => nav.dispatch(DrawerActions.toggleDrawer())}>
              <HeaderText>☰</HeaderText>
            </HeaderButton>
          ),
          // Se eliminó el reloj del título
          headerTitle: () => <HeaderText>Historial</HeaderText>,
        }}
      />
      
      {/* Contenido principal */}
      <Container>
        <Title>Historial</Title>
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Bubble fromMe={item.fromMe}>
              <BubbleText>{item.text}</BubbleText>
            </Bubble>
          )}
          ListEmptyComponent={<EmptyText>No hay mensajes aún</EmptyText>}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      </Container>
    </>
  );
}

// Estilos con styled-components
const Container = styled.View`
  flex: 1;
  background-color: ${colors.white};
  padding: 16px;
`;

const Title = styled.Text`
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 12px;
`;

const EmptyText = styled.Text`
  text-align: center;
  color: #888;
  margin-top: 20px;
`;

const Bubble = styled.View<BubbleProps>`
  margin-vertical: 6px;
  padding: 10px;
  max-width: 80%;
  border-radius: 12px;
align-self: ${(props: BubbleProps) => (props.fromMe ? 'flex-end' : 'flex-start')};
background-color: ${(props: BubbleProps) => (props.fromMe ? `${colors.primary}33` : '#eee')};
`;

const BubbleText = styled.Text`
  color: #333;
`;

const HeaderButton = styled.TouchableOpacity`
  padding: 8px;
`;

const HeaderText = styled.Text`
  color: white;
  font-size: 20px;
`;
