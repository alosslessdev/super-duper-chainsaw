import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Picker as RNPicker } from '@react-native-picker/picker';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
} from 'react-native';
import styled from 'styled-components/native';
import AnalogClock from '../(app)/analogClock';
import { getAwsKeys } from '../clientKeyStore';
import { colors } from '../styles/colors';
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


  // Función para enviar mensajes y generar respuesta simulada
 const sendMsg = async (pdfUrl: string, question: string) => { // pdfUrl and question parameters are not currently used when calling sendMsg. You might want to review where sendMsg is called to ensure these are passed if needed by the backend.

    if (!input.trim()) return;

    const userMsg: Msg = {
      id: Date.now().toString(),
      text: input.trim(),
      fromMe: true,
    };
    setMsgs(cur => [...cur, userMsg]);
    setInput('');

    setTimeout(async () => {
      // Removed the static bot responses as they are now handled by the AI
      
      try {
          const response = await fetch('http://0000243.xyz:8080/tareas/ia/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': sessionCookie,
            },
            credentials: 'include',
            body: JSON.stringify({ pdf_url: pdfUrl, question }), // Ensure pdfUrl and question are passed correctly
          });
          const data = await response.json();

          if (response.ok) {
            let botResponse = 'No se procesaron tareas.'; // Default response if no tasks are processed

            if (data.tareasProcesadas && data.tareasProcesadas.length > 0) {
              botResponse = 'Tareas procesadas:\n\n';
              data.tareasProcesadas.forEach((task: any) => {
                botResponse += `• Tarea: ${task.tarea}\n`;
                if (task.tiempoEstimado) {
                  botResponse += `  Tiempo estimado: ${task.tiempoEstimado}\n`;
                }
                if (task.error) {
                  botResponse += `  Error: ${task.error}\n`;
                }
                botResponse += '\n'; // Add an extra newline for spacing between tasks
              });
            } else if (data.error) {
                botResponse = `Error de la IA: ${data.error}`;
            } else {
                botResponse = 'Respuesta inesperada de la IA.';
            }

            setMsgs(cur => [
              ...cur,
              {
                id: Date.now().toString() + '-ia',
                text: botResponse,
                fromMe: false,
              },
            ]);
          } else {
            // This handles HTTP errors (e.g., 400, 500)
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
          console.error("Fetch error:", err); // Log the actual error for debugging
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
    let fileNamePDF, PDFfile;
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



      try{
    
      const response = await s3Client.send(
          new PutObjectCommand({
            Bucket: "save-pdf-test",
            Key: fileNamePDF,
            Body: PDFfile,
          }),
        );

      if (response.ETag){
        url = `https://save-pdf-test.s3.us-east-2.amazonaws.com/${fileNamePDF}` //change to random filename
      }

      }catch (err){
        console.log("error while uploading")
      }

    }

    

  };


  // Función para abrir modal agregar o editar tarea
  const openTaskModal = (task?: Task) => {
    if (task) {
      // Editar tarea: precargar datos
      setTaskName(task.name);
      setTaskType(task.type);
      setTaskDescription(task.description);
      setTaskHours(task.hours.toString());
      setTaskStartHour(task.startHour.toString());
      setSelectedTask(task);
      setIsEditing(true);
    } else {
      // Nueva tarea
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
            <HeaderButton onPress={() => nav.dispatch(DrawerActions.toggleDrawer())}>
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
                <ModalTitle>{isEditing ? 'Editar tarea' : 'Agregar nueva tarea'}</ModalTitle>

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
                  onValueChange={(itemValue: string) => setTaskType(itemValue)}
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
                  onValueChange={(itemValue: string) => setTaskStartHour(itemValue)}
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
                    <ModalButtonText>{isEditing ? 'Actualizar' : 'Guardar'}</ModalButtonText>
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

                <ModalButtonCancel onPress={() => setActionModalVisible(false)} style={{ marginTop: 10 }}>
                  <ModalButtonText>Cancelar</ModalButtonText>
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
                  De {item.startHour}:00 a {item.startHour + item.hours}:00 ({item.hours} h)
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
                <Input
                  value={input}
                  onChangeText={setInput}
                  placeholder="Escribe un mensaje..."
                />
                <SendButton onPress={sendMsg}>
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

// Estilos

const Bubble = styled.View.withConfig({})<{ fromMe: boolean }>`
  margin-vertical: 4px;
  padding: 12px;
  max-width: 70%;
  border-radius: 12px;

`;

const BubbleText = styled.Text`
  color: #ffffff;
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
`;

const ModalButtonSave = styled.Pressable`
  background-color: #0A84FF;
  padding: 10px 20px;
  border-radius: 8px;
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


// para subir a aws s3


 

 
