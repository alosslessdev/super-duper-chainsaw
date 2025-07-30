import 'react-native-get-random-values';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Picker as RNPicker } from '@react-native-picker/picker';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform } from 'react-native';
import styled from 'styled-components/native';
import AnalogClock from '../(app)/analogClock';
import { getAwsKeys } from '../clientKeyStore';
import { colors } from '../styles/colors';
import * as FileSystem from 'expo-file-system';

const { sessionCookie } = getAwsKeys();
let url: string; //url para archivo en AWS s3

const taskTypes = ['ocio', 'importante', 'liviana', 'descanso'];
const hoursOfDay = Array.from({ length: 24 }, (_, i) => i.toString());
const today = new Date();
const formattedDate = today.toLocaleDateString('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

type Task = {
  id: string;
  name: string;
  type: string;
  description: string;
  hours: number; // duración en horas
  startHour: number; // hora de inicio 0-23
};

type ProcessedTask = {
  tarea: string;
  tiempoEstimado?: string;
  insertId: number;
  error?: string;
};

type Msg = {
  id: string;
  text: string;
  fromMe: boolean;
};

const hourWidth = 30; // ancho fijo para cada hora
const hours = Array.from({ length: 24 }, (_, i) => i);

export default function Index() {
  const router = useRouter();
  const nav = useNavigation();

  const [input, setInput] = useState<string>('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);

  // Para controlar modal agregar/editar
  const [taskName, setTaskName] = useState('');
  const [taskType, setTaskType] = useState<string>('ocio');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskHours, setTaskHours] = useState('1');
  const [taskStartHour, setTaskStartHour] = useState('0');

  // Para editar
  const [isEditing, setIsEditing] = useState(false);

  // Para mostrar u ocultar chat
  const [chatVisible, setChatVisible] = useState(false);

  // For AI processed tasks approval
  const [aiProcessedTasks, setAiProcessedTasks] = useState<ProcessedTask[]>([]);
  const [aiApprovalModalVisible, setAiApprovalModalVisible] = useState(false);

  // Función para enviar mensajes y generar respuesta simulada
  const sendMsg = async (pdfUrl: string, question: string) => {
    if (!question.trim()) { // Allow empty question if PDF is being processed
        setMsgs(cur => [
            ...cur,
            {
                id: Date.now().toString() + '-ai-processing-start',
                text: 'Procesando archivo con IA...',
                fromMe: false,
            },
        ]);
    } else {
        const userMsg: Msg = {
            id: Date.now().toString(),
            text: question.trim(),
            fromMe: true,
        };
        setMsgs(cur => [...cur, userMsg]);
        setInput('');
    }

    setTimeout(async () => {
      try {
        const response = await fetch('http://0000243.xyz:8080/tareas/ia/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: sessionCookie,
          },
          credentials: 'include',
          body: JSON.stringify({ pdf_url: pdfUrl, question }),
        });
        const data = await response.json();

        if (response.ok) {
          if (data.tareasProcesadas && data.tareasProcesadas.length > 0) {
            setAiProcessedTasks(data.tareasProcesadas);
            setAiApprovalModalVisible(true);
            setMsgs(cur => [
              ...cur,
              {
                id: Date.now().toString() + '-ia-prompt',
                text: 'He recibido nuevas tareas de la IA. Por favor, revisa y aprueba cada una.',
                fromMe: false,
              },
            ]);
          } else if (data.error) {
            setMsgs(cur => [
              ...cur,
              {
                id: Date.now().toString() + '-ia-error',
                text: `Error de la IA: ${data.error}`,
                fromMe: false,
              },
            ]);
          } else {
            setMsgs(cur => [
              ...cur,
              {
                id: Date.now().toString() + '-ia-unexpected',
                text: 'Respuesta inesperada de la IA.',
                fromMe: false,
              },
            ]);
          }
        } else {
          setMsgs(cur => [
            ...cur,
            {
              id: Date.now().toString() + '-error',
              text: data.error || `Error al procesar IA: ${response.status} ${response.statusText}`,
              fromMe: false,
            },
          ]);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setMsgs(cur => [
          ...cur,
          {
            id: Date.now().toString() + '-error',
            text: 'No se pudo conectar a la IA. Verifique su conexión o el servidor.',
            fromMe: false,
          },
        ]);
      }
    }, 800);
  };

  const uploadFile = async () => {
  let fileNamePDF: string;
  let PDFfileUri: string; // Renamed for clarity

  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf', // Specify PDF type for better filtering
    copyToCacheDirectory: true, // Crucial: Copy the file to the app's cache
  });

  const { secretKeyId, secretKey } = getAwsKeys();

  if (result.assets && result.assets.length > 0) {
    PDFfileUri = result.assets[0].uri;
    fileNamePDF = result.assets[0].name;

    try {
      // Read the file content as base64
      // For large files, consider reading as ArrayBuffer and creating a Blob/Buffer
      const fileContentBase64 = await FileSystem.readAsStringAsync(PDFfileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to a Uint8Array or Buffer for S3
      // Node.js environments can directly use Buffer.from(fileContentBase64, 'base64')
      // For browser/Expo, you might need to convert it to a Blob or ArrayBuffer
      // Since Expo runs in a React Native environment, Uint8Array is generally preferred for binary data.
      const decodedFile = Uint8Array.from(atob(fileContentBase64), c => c.charCodeAt(0));

      const s3Client = new S3Client({
        region: 'us-east-2', // set your region
        credentials: {
          accessKeyId: secretKeyId ?? '',
          secretAccessKey: secretKey ?? '',
        },
      });

      const response = await s3Client.send(
        new PutObjectCommand({
          Bucket: 'save-pdf-test',
          Key: fileNamePDF,
          Body: decodedFile, // Pass the decoded file content
          ContentType: 'application/pdf', // Specify content type
        })
      );

      if (response.ETag) {
        // Generate a more unique filename for S3 if desired (e.g., using a timestamp or UUID)
        const uniqueFileName = `${Date.now()}-${fileNamePDF}`;
        url = `https://save-pdf-test.s3.us-east-2.amazonaws.com/${uniqueFileName}`; 

        setMsgs(cur => [
          ...cur,
          {
            id: Date.now().toString() + '-upload',
            text: `Archivo "${fileNamePDF}" subido exitosamente a AWS S3. URL: ${url}`,
            fromMe: false,
          },
        ]);
        sendMsg(url, input);
      }
    } catch (err) {
      if (err instanceof Error) {
        console.log('error while uploading', err); // Log the full error for debugging
        setMsgs(cur => [
          ...cur,
          {
            id: Date.now().toString() + '-upload-error',
            text: `Error al subir el archivo: ${err.message}`,
            fromMe: false,
          },
        ]);
      }
    } finally {
      // Optional: Clean up the cached file if you don't need it anymore
      // await FileSystem.deleteAsync(PDFfileUri, { idempotent: true });
    }
  } else {
    setMsgs(cur => [
      ...cur,
        {
          id: Date.now().toString() + '-upload-cancel',
          text: 'Selección de archivo cancelada.',
          fromMe: false,
        },
      ]);
    }
  };


  const openTaskModal = (task?: Task) => {
    if (task) {
      setTaskName(task.name);
      setTaskType(task.type);
      setTaskDescription(task.description);
      setTaskHours(task.hours.toString());
      setTaskStartHour(task.startHour.toString());
      setSelectedTask(task);
      setIsEditing(true);
    } else {
      setTaskName('');
      setTaskType('ocio');
      setTaskDescription('');
      setTaskHours('1');
      setTaskStartHour('0');
      setSelectedTask(null);
      setIsEditing(false);
    }
    setModalVisible(true);
  };

  const saveTask = () => {
    if (!taskName.trim() || taskName.length > 20) {
      alert('El nombre debe tener máximo 20 caracteres.');
      return;
    }
    if (taskDescription.length > 50) {
      alert('La descripción debe tener máximo 50 caracteres.');
      return;
    }
    const duration = Number(taskHours);
    if (isNaN(duration) || duration <= 0 || duration > 24) {
      alert('Las horas deben ser un número entre 1 y 24.');
      return;
    }
    const start = Number(taskStartHour);
    if (isNaN(start) || start < 0 || start > 23) {
      alert('La hora de inicio debe estar entre 0 y 23.');
      return;
    }

    const end = start + duration;

    for (const t of tasks) {
      if (isEditing && selectedTask && t.id === selectedTask.id) continue;

      const tStart = t.startHour;
      const tEnd = t.startHour + t.hours;

      if (!(end <= tStart || start >= tEnd)) {
        alert(
          `Conflicto con tarea "${t.name}" programada de ${tStart}:00 a ${tEnd}:00`
        );
        return;
      }
    }

    if (isEditing && selectedTask) {
      setTasks(cur =>
        cur.map(t =>
          t.id === selectedTask.id
            ? {
                ...t,
                name: taskName.trim(),
                type: taskType,
                description: taskDescription.trim(),
                hours: duration,
                startHour: start,
              }
            : t
        )
      );
    } else {
      const newTask: Task = {
        id: Date.now().toString(),
        name: taskName.trim(),
        type: taskType,
        description: taskDescription.trim(),
        hours: duration,
        startHour: start,
      };
      setTasks(cur => [...cur, newTask]);
    }

    setTaskName('');
    setTaskType('ocio');
    setTaskDescription('');
    setTaskHours('1');
    setTaskStartHour('0');
    setSelectedTask(null);
    setIsEditing(false);
    setModalVisible(false);
  };

  const handleEdit = () => {
    if (selectedTask) {
      openTaskModal(selectedTask);
    }
    setActionModalVisible(false);
  };

  const handleDelete = () => {
    if (selectedTask) {
      setTasks(cur => cur.filter(t => t.id !== selectedTask.id));
    }
    setActionModalVisible(false);
  };

  const handleAcceptProcessedTask = (taskToAccept: ProcessedTask) => {
    // Convert ProcessedTask to Task type for the main task list
    const newTask: Task = {
      id: taskToAccept.insertId.toString(), // Using insertId as the unique ID
      name: taskToAccept.tarea,
      type: 'general', // You might want to infer or ask for the type
      description: taskToAccept.tiempoEstimado || '', // Use tiempoEstimado as description or leave empty
      hours: 1, // Default, you might want AI to provide this or ask the user
      startHour: 0, // Default, you might want AI to provide this or ask the user
    };
    setTasks(cur => [...cur, newTask]);
    setAiProcessedTasks(cur =>
      cur.filter(task => task.insertId !== taskToAccept.insertId)
    );
    setMsgs(cur => [
      ...cur,
      {
        id: Date.now().toString() + `-accepted-${taskToAccept.insertId}`,
        text: `Tarea "${taskToAccept.tarea}" aceptada.`,
        fromMe: false,
      },
    ]);
  };

  const handleRejectProcessedTask = async (taskToReject: ProcessedTask) => {
    try {
      const response = await fetch(
        `http://0000243.xyz:8080/tareas/por/${taskToReject.insertId}`,
        {
          method: 'DELETE',
          headers: {
            Cookie: sessionCookie,
          },
          credentials: 'include',
        }
      );

      if (response.ok) {
        setMsgs(cur => [
          ...cur,
          {
            id: Date.now().toString() + `-rejected-${taskToReject.insertId}`,
            text: `Tarea "${taskToReject.tarea}" rechazada y eliminada del servidor.`,
            fromMe: false,
          },
        ]);
      } else {
        const errorData = await response.json();
        setMsgs(cur => [
          ...cur,
          {
            id:
              Date.now().toString() +
              `-reject-error-${taskToReject.insertId}`,
            text: `Error al rechazar la tarea "${taskToReject.tarea}": ${
              errorData.error || response.statusText
            }.`,
            fromMe: false,
          },
        ]);
      }
    } catch (err) {
      console.error('Delete task error:', err);
      setMsgs(cur => [
        ...cur,
        {
          id: Date.now().toString() + `-reject-fetch-error-${taskToReject.insertId}`,
          text: `Error de conexión al intentar rechazar la tarea "${taskToReject.tarea}".`,
          fromMe: false,
        },
      ]);
    } finally {
      // Always remove from the approval list regardless of API success/failure
      setAiProcessedTasks(cur =>
        cur.filter(task => task.insertId !== taskToReject.insertId)
      );
    }
  };

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
        // Clear local session data if necessary (e.g., setAwsKeys to empty values)
        // setAwsKeys('', '', ''); // This would require modifying setAwsKeys to clear.
        // For now, simply navigate.
        alert('Sesión cerrada exitosamente.');
        router.replace('/'); // Navigate to a login or initial screen
      } else {
        const errorData = await response.json();
        alert(`Error al cerrar sesión: ${errorData.error || response.statusText}`);
      }
    } catch (err) {
      console.error('Logout error:', err);
      alert('Error de conexión al intentar cerrar sesión.');
    }
  };

  const FechaText = styled.Text`
    font-size: 18px;
    font-weight: bold;
    color: #2c3e50;
    text-align: center;
    margin-bottom: 10px;
    text-transform: capitalize;
  `;

  const TouchableTaskItem = styled.TouchableOpacity`
    background-color: #e0f0ff;
    border-radius: 10px;
    padding: 10px;
    margin-bottom: 10px;
  `;

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerShown: true,
          headerStyle: { backgroundColor: colors.primary },
          headerTitleAlign: 'center',
          headerTintColor: 'white',
          headerLeft: () => (
            <HeaderButton
              onPress={() => nav.dispatch(DrawerActions.toggleDrawer())}
            >
              <HeaderText>☰</HeaderText>
            </HeaderButton>
          ),
          headerRight: () => (
            <HeaderButton onPress={() => router.push('/settings')}>
              <HeaderText>⚙️</HeaderText>
            </HeaderButton>
          ),
          headerTitle: () => <HeaderText>GROWIN</HeaderText>,
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Container>
          <FechaText>{formattedDate}</FechaText>
          <AnalogClock />

          <AddButton onPress={() => openTaskModal()}>
            <AddButtonText>+</AddButtonText>
          </AddButton>

          {/* Modal agregar/editar tarea */}
          <Modal
            visible={modalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setModalVisible(false)}
          >
            <ModalBackground>
              <ModalContainer>
                <ModalTitle>
                  {isEditing ? 'Editar tarea' : 'Agregar nueva tarea'}
                </ModalTitle>

                <InputLabel>Nombre de la tarea (max 20 caracteres):</InputLabel>
                <TextInputStyled
                  value={taskName}
                  onChangeText={setTaskName}
                  maxLength={20}
                  placeholder="Ejemplo: Estudiar React"
                />

                <InputLabel>Tipo de tarea:</InputLabel>
                <PickerStyled
                  selectedValue={taskType}
                  onValueChange={(itemValue: string) =>
                    setTaskType(itemValue)
                  }
                >
                  {taskTypes.map(type => (
                    <RNPicker.Item label={type} value={type} key={type} />
                  ))}
                </PickerStyled>

                <InputLabel>Descripción (max 50 caracteres):</InputLabel>
                <TextInputStyledDescription
                  value={taskDescription}
                  onChangeText={setTaskDescription}
                  maxLength={50}
                  placeholder="Detalles adicionales"
                />

                <InputLabel>Hora de inicio (0-23):</InputLabel>
                <PickerStyled
                  selectedValue={taskStartHour}
                  onValueChange={(itemValue: string) =>
                    setTaskStartHour(itemValue)
                  }
                >
                  {hoursOfDay.map(h => (
                    <RNPicker.Item key={h} label={h} value={h} />
                  ))}
                </PickerStyled>

                <InputLabel>Horas a dedicar (1-24):</InputLabel>
                <TextInputStyled
                  value={taskHours}
                  onChangeText={setTaskHours}
                  keyboardType="numeric"
                  placeholder="Ejemplo: 2"
                  maxLength={2}
                />

                <ModalButtonsRow>
                  <ModalButtonCancel onPress={() => setModalVisible(false)}>
                    <ModalButtonText>Cancelar</ModalButtonText>
                  </ModalButtonCancel>
                  <ModalButtonSave onPress={saveTask}>
                    <ModalButtonText>
                      {isEditing ? 'Actualizar' : 'Guardar'}
                    </ModalButtonText>
                  </ModalButtonSave>
                </ModalButtonsRow>
              </ModalContainer>
            </ModalBackground>
          </Modal>

          {/* Modal opciones Editar / Eliminar */}
          <Modal
            visible={actionModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setActionModalVisible(false)}
          >
            <ModalBackground>
              <ModalContainer>
                <ModalTitle>¿Qué deseas hacer?</ModalTitle>

                <ModalButtonsRow>
                  <ModalButtonSave onPress={handleEdit}>
                    <ModalButtonText>Editar</ModalButtonText>
                  </ModalButtonSave>

                  <ModalButtonCancel onPress={handleDelete}>
                    <ModalButtonText>Eliminar</ModalButtonText>
                  </ModalButtonCancel>
                </ModalButtonsRow>

                <ModalButtonCancel
                  onPress={() => setActionModalVisible(false)}
                  style={{ marginTop: 10 }}
                >
                  <ModalButtonText>Cancelar</ModalButtonText>
                </ModalButtonCancel>
              </ModalContainer>
            </ModalBackground>
          </Modal>

          {/* Modal para aprobación/rechazo de tareas de la IA */}
          <Modal
            visible={aiApprovalModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setAiApprovalModalVisible(false)}
          >
            <ModalBackground>
              <ModalContainer>
                <ModalTitle>Tareas sugeridas por la IA</ModalTitle>
                <FlatList
                  data={aiProcessedTasks}
                  keyExtractor={item => item.insertId.toString()}
                  renderItem={({ item }) => (
                    <AITaskItem>
                      <TaskName>{item.tarea}</TaskName>
                      {item.tiempoEstimado && (
                        <TaskType>Tiempo estimado: {item.tiempoEstimado}</TaskType>
                      )}
                      {item.error && <TaskDesc>Error: {item.error}</TaskDesc>}
                      <ModalButtonsRow>
                        <ModalButtonSave
                          onPress={() => handleAcceptProcessedTask(item)}
                        >
                          <ModalButtonText>Aceptar</ModalButtonText>
                        </ModalButtonSave>
                        <ModalButtonCancel
                          onPress={() => handleRejectProcessedTask(item)}
                        >
                          <ModalButtonText>Rechazar</ModalButtonText>
                        </ModalButtonCancel>
                      </ModalButtonsRow>
                    </AITaskItem>
                  )}
                  ListEmptyComponent={() => (
                    <TaskDesc>No hay tareas pendientes de aprobación.</TaskDesc>
                  )}
                />
                <ModalButtonCancel
                  onPress={() => setAiApprovalModalVisible(false)}
                  style={{ marginTop: 20 }}
                >
                  <ModalButtonText>Cerrar</ModalButtonText>
                </ModalButtonCancel>
              </ModalContainer>
            </ModalBackground>
          </Modal>

          {/* Lista de tareas */}
          <FlatList
            data={tasks}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableTaskItem
                onPress={() => {
                  setSelectedTask(item);
                  setActionModalVisible(true);
                }}
              >
                <TaskName>{item.name}</TaskName>
                <TaskType>{item.type}</TaskType>
                <TaskDesc>{item.description}</TaskDesc>
                <TaskHours>
                  De {item.startHour}:00 a {item.startHour + item.hours}:00 (
                  {item.hours} h)
                </TaskHours>
              </TouchableTaskItem>
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
          />

          {/* Botón flotante para abrir chat */}
          {!chatVisible && (
            <ChatOpenButton onPress={() => setChatVisible(true)}>
              <ChatOpenButtonText>💬</ChatOpenButtonText>
            </ChatOpenButton>
          )}

          {/* Chat modal */}
          <Modal
            visible={chatVisible}
            animationType="slide"
            transparent={false}
            onRequestClose={() => setChatVisible(false)}
          >
            <ChatContainer>
              <ChatHeader>
                <ChatTitle>Chat</ChatTitle>
                <CloseButton onPress={() => setChatVisible(false)}>
                  <CloseButtonText>✕</CloseButtonText>
                </CloseButton>
              </ChatHeader>

              <FlatList
                data={msgs}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <Bubble fromMe={item.fromMe}>
                    <BubbleText>{item.text}</BubbleText>
                  </Bubble>
                )}
                contentContainerStyle={{ padding: 16, flexGrow: 1 }}
                inverted
                style={{ flex: 1 }}
              />

              <InputRow>
                <UploadButton onPress={uploadFile}>
                  <UploadButtonText>⬆️ PDF</UploadButtonText>
                </UploadButton>
                <Input
                  value={input}
                  onChangeText={setInput}
                  placeholder="Escribe un mensaje..."
                />
                <SendButton onPress={() => sendMsg(url, input)}>
                  <SendText>➤</SendText>
                </SendButton>
              </InputRow>
            </ChatContainer>
          </Modal>
        </Container>
      </KeyboardAvoidingView>
    </>
  );
}

// --- Estilos ---

const Bubble = styled.View.withConfig({})<{ fromMe: boolean }>`
  margin-vertical: 4px;
  padding: 12px;
  max-width: 70%;
  border-radius: 12px;
  background-color: ${(props: { fromMe: any; }) => (props.fromMe ? '#0A84FF' : '#E5E5EA')};
  align-self: ${(props: { fromMe: any; }) => (props.fromMe ? 'flex-end' : 'flex-start')};
`;

const BubbleText = styled.Text`
  color: ${(props: { fromMe: any; }) => (props.fromMe ? '#ffffff' : '#000000')};
  font-size: 16px;
`;

const Container = styled.View`
  flex: 1;
  background-color: #fff;
  padding: 16px;
`;

const HeaderButton = styled.TouchableOpacity`
  padding: 22px;
`;

const HeaderText = styled.Text`
  color: white;
  font-size: 20px;
`;

const InputRow = styled.View`
  flex-direction: row;
  padding: 8px;
  border-top-width: 1px;
  border-color: #ddd;
  align-items: center;
`;

const Input = styled.TextInput`
  flex: 1;
  background-color: #f6f6f6;
  border-radius: 20px;
  padding: 8px 16px;
  margin-right: 8px;
`;

const TextInputStyled = styled.TextInput`
  background-color: #f6f6f6;
  border-radius: 8px;
  padding: 8px 12px;
  margin-top: 6px;
  font-size: 16px;
`;

const TextInputStyledDescription = styled(TextInputStyled).attrs(() => ({
  multiline: true,
  numberOfLines: 3,
}))``;

const SendButton = styled.TouchableOpacity`
  background-color: #0A84FF;
  padding: 10px 16px;
  border-radius: 20px;
`;

const SendText = styled.Text`
  color: white;
  font-weight: bold;
`;

const AddButton = styled.TouchableOpacity`
  background-color: #0A84FF;
  width: 60px;
  height: 60px;
  border-radius: 30px;
  justify-content: center;
  align-items: center;
  margin: 16px auto;
  shadow-color: #000;
  shadow-opacity: 0.3;
  shadow-radius: 5px;
  elevation: 5;
`;

const AddButtonText = styled.Text`
  color: white;
  font-size: 36px;
  line-height: 36px;
  font-weight: bold;
`;

const PickerStyled = styled(RNPicker).attrs(() => ({
  mode: 'dropdown',
}))`
  margin-top: 6px;
  background-color: #f6f6f6;
  border-radius: 8px;
`;

const ModalBackground = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: center;
  align-items: center;
`;

const ModalContainer = styled.View`
  background: white;
  width: 90%;
  border-radius: 12px;
  padding: 20px;
  elevation: 10;
  max-height: 80%; /* Added to prevent modal from overflowing on smaller screens */
`;

const ModalTitle = styled.Text`
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 12px;
`;

const InputLabel = styled.Text`
  margin-top: 12px;
  font-weight: 600;
  color: #333;
`;

const ModalButtonsRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-top: 20px;
`;

const ModalButtonCancel = styled.Pressable`
  background-color: #aaa;
  padding: 10px 20px;
  border-radius: 8px;
  flex: 1; /* Added for equal button width */
  margin: 0 5px; /* Added spacing between buttons */
  justify-content: center; /* Center text vertically */
  align-items: center; /* Center text horizontally */
`;

const ModalButtonSave = styled.Pressable`
  background-color: #0A84FF;
  padding: 10px 20px;
  border-radius: 8px;
  flex: 1; /* Added for equal button width */
  margin: 0 5px; /* Added spacing between buttons */
  justify-content: center; /* Center text vertically */
  align-items: center; /* Center text horizontally */
`;

const ModalButtonText = styled.Text`
  color: white;
  font-weight: bold;
  text-align: center;
`;

const TaskName = styled.Text`
  font-weight: bold;
  font-size: 16px;
`;

const TaskType = styled.Text`
  font-style: italic;
  color: #0A84FF;
`;

const TaskDesc = styled.Text`
  margin-top: 4px;
  color: #333;
`;

const TaskHours = styled.Text`
  margin-top: 4px;
  font-weight: 600;
  color: #444;
`;

// Estilos para el chat

const ChatOpenButton = styled.TouchableOpacity`
  background-color: #0A84FF;
  width: 60px;
  height: 60px;
  border-radius: 30px;
  justify-content: center;
  align-items: center;
  position: absolute;
  bottom: 30px;
  right: 20px;
  shadow-color: #000;
  shadow-opacity: 0.3;
  shadow-radius: 5px;
  elevation: 5;
`;

const ChatOpenButtonText = styled.Text`
  color: white;
  font-size: 28px;
`;

const ChatContainer = styled.View`
  flex: 1;
  background-color: white;
  padding: 12px;
`;

const ChatHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 10px;
  border-bottom-width: 1px;
  border-color: #ddd;
`;

const ChatTitle = styled.Text`
  font-size: 20px;
  font-weight: bold;
`;

const CloseButton = styled.TouchableOpacity`
  padding: 6px 12px;
`;

const CloseButtonText = styled.Text`
  font-size: 24px;
  color: #888;
`;

const UploadButton = styled.TouchableOpacity`
  background-color: #0A84FF;
  padding: 10px 12px;
  border-radius: 20px;
  margin-right: 8px;
`;

const UploadButtonText = styled.Text`
  color: white;
  font-weight: bold;
`;

const AITaskItem = styled.View`
  background-color: #f8f8f8;
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 10px;
  border-width: 1px;
  border-color: #eee;
`;