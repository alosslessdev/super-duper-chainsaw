// app/app/home.tsx
// ------------------------------------------
// Pantalla principal de la app Growin.
// Este componente muestra la hora actual, un listado de mensajes
// y un campo de entrada para enviar mensajes.
// Utiliza Expo Router para navegación y styled-components para estilos.
// Estilo: Programación Declarativa con Componentes Funcionales
// ------------------------------------------

import React, { useState, useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import {
  Platform,
  FlatList,
  KeyboardAvoidingView,
  // KeyboardAvoidingView ajusta la interfaz al teclado en iOS
} from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import styled from 'styled-components/native';

import { colors } from '../styles/colors';

import {S3Client, PutObjectCommand} from "@aws-sdk/client-s3"; //conexion a amazon s3 para subir archivos para que el backend lo lea
import { createInterface } from "node:readline/promises";
import * as DocumentPicker from 'expo-document-picker';
import { getAwsKeys } from '../awsKeyStore';



// --------------------
// Definición de tipos
// --------------------
// Msg: representa un mensaje en la conversación.
// - id: identificador único (string) para FlatList
// - text: contenido del mensaje
// - fromMe: indica si el mensaje fue enviado por el usuario
// --------------------
type Msg = {
  id: string;
  text: string;
  fromMe: boolean;
};

// Componente principal HomeScreen
export default function HomeScreen() {
  // expo-router hook para navegación basada en rutas
  const router = useRouter();
  // hook de React Navigation para disparar acciones del drawer
  const nav = useNavigation();

  // ------------------------------------------------
  // Estado interno del componente
  // ------------------------------------------------
  // time: mantiene la hora actual como cadena
  // input: contenido del TextInput
  // msgs: arreglo de mensajes mostrados en la FlatList
  // ------------------------------------------------
  const [time, setTime] = useState<string>('');
  const [input, setInput] = useState<string>('');
  const [msgs, setMsgs] = useState<Msg[]>([]);

  // useEffect para actualizar la hora cada segundo
  useEffect(() => {
    // Función tick: obtiene la hora local y la formatea
    const tick = () => setTime(new Date().toLocaleTimeString());
    tick(); // inicializa inmediatamente
    const tm = setInterval(tick, 1000); // actualiza c/1s
    return () => clearInterval(tm); // limpieza al desmontar
  }, []);

  // Función para enviar un nuevo mensaje
  const sendMsg = () => {
    // No enviar si la cadena está vacía o sólo espacios
    if (!input.trim()) return;
    // Construye el mensaje del usuario
    const newMsg: Msg = {
      id: Date.now().toString(),
      text: input.trim(),
      fromMe: true,
    };
    // Agrega el mensaje al estado
    setMsgs(cur => [...cur, newMsg]);
    setInput(''); // limpia el input

    // Simula una respuesta automática tras un retraso
    setTimeout(() => {
      setMsgs(cur => [
        ...cur,
        {
          id: Date.now().toString() + '-bot',
          text: 'Respuesta automática',
          fromMe: false,
        },
      ]);
    }, 800);
  };

  // --------------------
  // Renderizado
  // --------------------
  return (
    <>
      {/* Configuración del header a través de Stack.Screen */}
      <Stack.Screen
        options={{
          title: '',
          headerShown: true,
          headerStyle: { backgroundColor: colors.primary },
          headerTitleAlign: 'center',
          headerTintColor: 'white',

          // Botón que abre el drawer
          headerLeft: () => (
            <HeaderButton onPress={() => nav.dispatch(DrawerActions.toggleDrawer())}>
              <HeaderText>☰</HeaderText>
            </HeaderButton>
          ),

          // Botón que navega a /settings
          headerRight: () => (
            <HeaderButton onPress={() => router.push('/settings')}>
              <HeaderText>⚙️</HeaderText>
            </HeaderButton>
          ),
          headerTitle: () => <HeaderText>Configuración</HeaderText>,
        }}
      />

      {/* Ajusta vista para teclado en iOS */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Container>
          {/* Contenedor del reloj */}
          <ClockContainer>
            <ClockText>{time}</ClockText>
          </ClockContainer>

          {/* Lista de mensajes */}
          <FlatList
            data={msgs}                             // fuente de datos
            keyExtractor={item => item.id}         // clave única
            renderItem={({ item }) => (
              <Bubble fromMe={item.fromMe}>
                <BubbleText>{item.text}</BubbleText>
              </Bubble>
            )}
            contentContainerStyle={{ padding: 16 }} // padding interno
          />

          {/* Fila de entrada de texto y botón */}
          <InputRow>
            <Input
              value={input}
              onChangeText={setInput}
              placeholder="Escribe un mensaje..."
            />
            <SendButton onPress={sendMsg}>
              <SendText>➤</SendText>
            </SendButton>

            <UploadButton onPress={uploadFile}>
              <SendText>📤</SendText>
            </UploadButton>

          </InputRow>
        </Container>
      </KeyboardAvoidingView>
    </>
  );
}

// --------------------
// Styled Components
// --------------------

// Contenedor principal que ocupa toda la pantalla
type ContainerProps = {};
const Container = styled.View<ContainerProps>`
  flex: 1;
  background-color: #FFFFFF;
`;

// Botón de cabecera (drawer & settings)
const HeaderButton = styled.TouchableOpacity`
  padding: 8px;
`;


// Icono de texto en el header
const HeaderIcon = styled.Text`
  color: white;
  font-size: 20px;
`;

// Texto principal del header, “Growin plis”
const HeaderSubtitle = styled.Text`
  font-size: 18px;
  font-weight: bold;
  color: white;
`;

// Contenedor del reloj con margen superior e inferior
const ClockContainer = styled.View`
  align-items: center;
  margin: 16px 0;
`;

// Texto de la hora
const ClockText = styled.Text`
  color: black;
  font-size: 18px;
  font-weight: bold;
`;

// Burbuja de mensaje, varía posición y color según emisor
const Bubble = styled.View<{ fromMe: boolean }>`
  margin-vertical: 4px;
  padding: 12px;
  max-width: 70%;
  border-radius: 12px;
  align-self: ${({ fromMe }) => (fromMe ? 'flex-end' : 'flex-start')};
  background-color: ${({ fromMe }) => (fromMe ? '#0A84FF33' : '#eee')};
`;

// Texto dentro de la burbuja
const BubbleText = styled.Text`
  color: #333;
  font-size: 16px;
`;

// Fila inferior con TextInput y botón de envío
const InputRow = styled.View`
  flex-direction: row;
  padding: 8px;
  border-top-width: 1px;
  border-color: #ddd;
  align-items: center;
`;

// Campo de texto para escribir mensaje
const Input = styled.TextInput`
  flex: 1;
  background-color: #f6f6f6;
  border-radius: 20px;
  padding: 8px 16px;
  margin-right: 8px;
`;

// Botón de enviar mensaje
const SendButton = styled.TouchableOpacity`
  background-color: #0A84FF;
  padding: 10px 16px;
  border-radius: 20px;
`;

const UploadButton = styled.TouchableOpacity`
  background-color: #34C759;
  padding: 10px 16px;
  border-radius: 20px;
  margin-left: 8px;
`;

// Texto del botón de envío\dd
const SendText = styled.Text`
  color: white;
  font-weight: bold;
`;

const HeaderText = styled.Text`
  color: white;
  font-size: 20px;
`;


// para subir a aws s3

let fileNamePDF, PDFfile;

  const uploadFile = async () => {
    
    const result = await DocumentPicker.getDocumentAsync({});
    const { secretKeyId, secretKey } = getAwsKeys();

    if (result.assets) {

      const s3Client = new S3Client({
      region: "us-east-1", // set your region
      credentials: {
        accessKeyId: secretKeyId ?? "",
        secretAccessKey: secretKey ?? "",
    },
    });


    PDFfile = result.assets[0].uri;
    fileNamePDF = result.assets[0].name;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: "save-pdf-test",
        Key: fileNamePDF,
        Body: PDFfile,
      }),
    );
      // Aquí puedes subir el archivo a S3 usando result.uri, result.name, etc.
      // Ejemplo:
      // const fileUri = result.uri;
      // const fileName = result.name;
      // const fileType = result.mimeType;
      // ...subir a S3...
      //alert(`Archivo seleccionado: ${result.name}`);
    }
};
