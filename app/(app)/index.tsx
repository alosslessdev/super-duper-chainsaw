import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Picker as RNPicker } from '@react-native-picker/picker';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform } from 'react-native'; // Importa Alert
import 'react-native-get-random-values';
import styled from 'styled-components/native';
import AnalogClock from '../(app)/analogClock';
import { getAwsKeys } from '../clientKeyStore';
import { colors } from '../styles/colors';


// Interfaces para styled-components
interface BubbleProps {
  fromMe: boolean;
}

interface DayButtonProps {
  isSelected: boolean;
}

interface DayTextProps {
  isSelected: boolean;
}

interface DateTextProps {
  isSelected: boolean;
}

const { sessionCookie } = getAwsKeys();
let url: string = ''; // Initialize url variable

const taskTypes = ['ocio', 'importante', 'liviana', 'descanso', 'general']; // Agregado 'general' para tareas de IA
const hoursOfDay = Array.from({ length: 24 }, (_, i) => i.toString());

// Helper function to format a date as 'YYYY-MM-DD' for consistent storage and comparison
const formatDateToISO = (date: Date) => date.toISOString().split('T')[0];

type Task = {
  id: string;
  name: string;
  type: string;
  description: string;
  hours: number; // duración en horas
  startHour: number; // hora de inicio 0-23
  date: string; // New field: 'YYYY-MM-DD'
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

// --- Nuevas definiciones para tareas frecuentes ---
interface FrequentTaskTemplate {
  name: string;
  type: string;
  description: string;
  hours: number;
  startHour: number;
  // Podrías añadir 'dayOfWeek?: number;' (0=Domingo, 6=Sábado) si quisieras agendar en días específicos
}



const FREQUENT_TASKS: FrequentTaskTemplate[] = [
  {
    name: 'Hacer Ejercicio',
    type: 'importante',
    description: 'Rutina de gimnasio',
    hours: 2,
    startHour: 15, // 3 PM
  },
  {
    name: 'Comer',
    type: 'liviana',
    description: 'Cena familiar',
    hours: 2,
    startHour: 18, // 6 PM
  },
  // Puedes añadir más tareas frecuentes aquí
  // {
  //   name: 'Estudiar Alemán',
  //   type: 'ocio',
  //   description: 'Repasar vocabulario',
  //   hours: 1,
  //   startHour: 20,
  // },
];
// --- Fin nuevas definiciones ---


export default function Index() {
  const router = useRouter();
  const nav = useNavigation();

  const [input, setInput] = useState<string>('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);

  // State for the currently selected date in the week view
  const [selectedDate, setSelectedDate] = useState(new Date());

  // For controlling add/edit task modal
  const [taskName, setTaskName] = useState('');
  const [taskType, setTaskType] = useState<string>('ocio');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskHours, setTaskHours] = useState('1');
  const [taskStartHour, setTaskStartHour] = useState('0');
  // New state for task date in modal, defaults to the currently selected view date
  const [taskDate, setTaskDate] = useState(formatDateToISO(new Date()));

  // For editing mode
  const [isEditing, setIsEditing] = useState(false);

  // For showing/hiding chat
  const [chatVisible, setChatVisible] = useState(false);

  // For AI processed tasks approval
  const [aiProcessedTasks, setAiProcessedTasks] = useState<ProcessedTask[]>([]);
  const [aiApprovalModalVisible, setAiApprovalModalVisible] = useState(false);

  // Formatted date for display based on selectedDate
  const isToday = formatDateToISO(selectedDate) === formatDateToISO(new Date());

  const formattedDisplayDate = `${selectedDate.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}${isToday ? ' (hoy)' : ''}`;


  // Helper to get dates for the current week starting from Sunday
  const getWeekDays = (currentDate: Date) => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Start from Sunday
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays(selectedDate);

  // Function to send messages and simulate response
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

      // Generate a more unique filename for S3 if desired (e.g., using a timestamp or UUID)
      fileNamePDF = `${Date.now()}-${fileNamePDF}`;

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
          url = `https://save-pdf-test.s3.us-east-2.amazonaws.com/${fileNamePDF}`;  

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
      setTaskDate(task.date); // Set existing task date
      setSelectedTask(task);
      setIsEditing(true);
    } else {
      setTaskName('');
      setTaskType('ocio');
      setTaskDescription('');
      setTaskHours('1');
      setTaskStartHour('0');
      setTaskDate(formatDateToISO(selectedDate)); // Default to currently selected view date
      setSelectedTask(null);
      setIsEditing(false);
    }
    setModalVisible(true);
  };

  const saveTask = () => {
    if (!taskName.trim() || taskName.length > 20) {
      // Replaced alert with custom message box as per instructions
      setMsgs(cur => [...cur, { id: Date.now().toString(), text: 'El nombre debe tener máximo 20 caracteres.', fromMe: false }]);
      return;
    }
    if (taskDescription.length > 50) {
      setMsgs(cur => [...cur, { id: Date.now().toString(), text: 'La descripción debe tener máximo 50 caracteres.', fromMe: false }]);
      return;
    }
    const duration = Number(taskHours);
    if (isNaN(duration) || duration <= 0 || duration > 24) {
      setMsgs(cur => [...cur, { id: Date.now().toString(), text: 'Las horas deben ser un número entre 1 y 24.', fromMe: false }]);
      return;
    }
    const start = Number(taskStartHour);
    if (isNaN(start) || start < 0 || start > 23) {
      setMsgs(cur => [...cur, { id: Date.now().toString(), text: 'La hora de inicio debe estar entre 0 y 23.', fromMe: false }]);
      return;
    }

    const end = start + duration;
    const selectedTaskDate = taskDate; // Use the date from the modal

    for (const t of tasks) {
      if (isEditing && selectedTask && t.id === selectedTask.id) continue;

      // Check for conflicts on the SAME DATE
      if (t.date === selectedTaskDate) {
        const tStart = t.startHour;
        const tEnd = t.startHour + t.hours;

        if (!(end <= tStart || start >= tEnd)) {
          setMsgs(cur => [...cur, { id: Date.now().toString(), text: `Conflicto con tarea "${t.name}" programada el ${t.date} de ${tStart}:00 a ${tEnd}:00`, fromMe: false }]);
          return;
        }
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
                date: selectedTaskDate, // Update date
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
        date: selectedTaskDate, // Add date
      };
      setTasks(cur => [...cur, newTask]);
    }

    setTaskName('');
    setTaskType('ocio');
    setTaskDescription('');
    setTaskHours('1');
    setTaskStartHour('0');
    setTaskDate(formatDateToISO(selectedDate)); // Reset to current view date
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
      date: formatDateToISO(selectedDate), // Default to currently selected view date
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
        // Replaced alert with custom message box as per instructions
        setMsgs(cur => [...cur, { id: Date.now().toString(), text: 'Sesión cerrada exitosamente.', fromMe: false }]);
        router.replace('/'); // Navigate to a login or initial screen
      } else {
        const errorData = await response.json();
        setMsgs(cur => [...cur, { id: Date.now().toString(), text: `Error al cerrar sesión: ${errorData.error || response.statusText}`, fromMe: false }]);
      }
    } catch (err) {
      console.error('Logout error:', err);
      setMsgs(cur => [...cur, { id: Date.now().toString(), text: 'Error de conexión al intentar cerrar sesión.', fromMe: false }]);
    }
  };

  // --- Nueva función para agregar tareas frecuentes ---
  const addFrequentTasks = () => {
    const tasksToAdd: Task[] = [];
    const conflicts: string[] = [];
    const selectedDateISO = formatDateToISO(selectedDate);

    FREQUENT_TASKS.forEach(template => {
      const newStart = template.startHour;
      const newEnd = template.startHour + template.hours;

      let hasConflict = false;
      for (const existingTask of tasks) {
        if (existingTask.date === selectedDateISO) {
          const existingStart = existingTask.startHour;
          const existingEnd = existingTask.startHour + existingTask.hours;

          // Check for overlap
          if (!(newEnd <= existingStart || newStart >= existingEnd)) {
            hasConflict = true;
            conflicts.push(`"${template.name}" (${newStart}:00-${newEnd}:00) con "${existingTask.name}" (${existingStart}:00-${existingEnd}:00)`);
            break; // No need to check other tasks for this template
          }
        }
      }

      if (!hasConflict) {
        tasksToAdd.push({
          id: Date.now().toString() + '-' + template.name + '-' + Math.random().toString(36).substring(7), // Unique ID
          name: template.name,
          type: template.type,
          description: template.description,
          hours: template.hours,
          startHour: template.startHour,
          date: selectedDateISO,
        });
      }
    });

    if (conflicts.length > 0) {
      Alert.alert(
        'Conflictos de Horario',
        `No se pudieron agregar algunas tareas frecuentes debido a conflictos de horario en la fecha seleccionada (${formattedDisplayDate}):\n\n${conflicts.join('\n')}\n\nPor favor, ajusta los horarios manualmente.`,
        [{ text: 'OK' }]
      );
    }
    
    if (tasksToAdd.length > 0) {
      setTasks(currentTasks => [...currentTasks, ...tasksToAdd]);
      setMsgs(cur => [...cur, { id: Date.now().toString(), text: `Se agregaron ${tasksToAdd.length} tareas frecuentes para ${formattedDisplayDate}.`, fromMe: false }]);
    } else if (conflicts.length === 0) {
        setMsgs(cur => [...cur, { id: Date.now().toString(), text: `No hay tareas frecuentes para agregar o todas ya existen en ${formattedDisplayDate}.`, fromMe: false }]);
    }
  };
  // --- Fin nueva función ---

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
          <FechaText>{formattedDisplayDate}</FechaText>
          <AnalogClock />

          {/* Week View */}
          <WeekViewContainer>
            <FlatList
              data={weekDays}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => formatDateToISO(item)}
              renderItem={({ item }) => {
                const isSelected = formatDateToISO(item) === formatDateToISO(selectedDate);
                return (
                  <DayButton onPress={() => setSelectedDate(item)} isSelected={isSelected}>
                    <DayText isSelected={isSelected}>{item.toLocaleDateString('es-ES', { weekday: 'short' })}</DayText>
                    <DateText isSelected={isSelected}>{item.getDate()}</DateText>
                  </DayButton>
                );
              }}
            />
          </WeekViewContainer>

          {/* Botones de acción */}
          <ActionButtonsContainer>
            <AddButton onPress={() => openTaskModal()}>
              <AddButtonText>+</AddButtonText>
            </AddButton>
            {/* Nuevo botón para tareas frecuentes */}
            <AddFrequentButton onPress={addFrequentTasks}>
              <AddFrequentButtonText>📅 Frecuentes</AddFrequentButtonText>
            </AddFrequentButton>
          </ActionButtonsContainer>
          
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

                <InputLabel>Fecha:</InputLabel>
                <TextInputStyled
                  value={taskDate}
                  editable= {false} // Make it read-only, date is selected via week view
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
            data={tasks.filter(task => task.date === formatDateToISO(selectedDate))}
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
                  {item.date} | De {item.startHour}:00 a {item.startHour + item.hours}:00 (
                  {item.hours} h)
                </TaskHours>
              </TouchableTaskItem>
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
          />

          {/* Floating button to open chat */}
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
                    <BubbleText fromMe={item.fromMe}>{item.text}</BubbleText>
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

// Las interfaces ya estaban definidas al principio, no es necesario repetirlas aquí.
// interface BubbleProps {
//   fromMe: boolean;
// }

// interface DayButtonProps {
//   isSelected: boolean;
// }

// interface DayTextProps {
//   isSelected: boolean;
// }

// interface DateTextProps {
//   isSelected: boolean;
// }

const Bubble = styled.View<BubbleProps>`
  margin-vertical: 4px;
  padding: 12px;
  max-width: 70%;
  border-radius: 12px;

`;

const BubbleText = styled.Text<BubbleProps>`
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

const ActionButtonsContainer = styled.View`
  flex-direction: row;
  justify-content: center; /* Centra los botones */
  align-items: center;
  margin: 16px 0;
`;

const AddButton = styled.TouchableOpacity`
  background-color: #0A84FF;
  width: 60px;
  height: 60px;
  border-radius: 30px;
  justify-content: center;
  align-items: center;
  shadow-color: #000;
  shadow-opacity: 0.3;
  shadow-radius: 5px;
  elevation: 5;
  margin-right: 10px; /* Espacio entre botones */
`;

const AddButtonText = styled.Text`
  color: white;
  font-size: 36px;
  line-height: 36px;
  font-weight: bold;
`;

// --- Nuevos estilos para el botón de tareas frecuentes ---
const AddFrequentButton = styled.TouchableOpacity`
  background-color: #28a745; /* Un color diferente para distinguirlo */
  padding: 10px 20px;
  border-radius: 30px;
  justify-content: center;
  align-items: center;
  shadow-color: #000;
  shadow-opacity: 0.3;
  shadow-radius: 5px;
  elevation: 5;
`;

const AddFrequentButtonText = styled.Text`
  color: white;
  font-size: 18px;
  font-weight: bold;
`;
// --- Fin nuevos estilos ---

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
  max-height: 80%;
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
  flex: 1;
  margin: 0 5px;
  justify-content: center;
  align-items: center;
`;

const ModalButtonSave = styled.Pressable`
  background-color: #0A84FF;
  padding: 10px 20px;
  border-radius: 8px;
  flex: 1;
  margin: 0 5px;
  justify-content: center;
  align-items: center;
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
  font-size: 12px;
  color: #666;
  margin-top: 5px;
`;

const WeekViewContainer = styled.View`
  height: 80px; /* Altura fija para la vista semanal */
  margin-bottom: 10px;
`;

const DayButton = styled.TouchableOpacity<DayButtonProps>`
  padding: 8px 12px;
  border-radius: 8px;
  margin-horizontal: 4px;
  align-items: center;
  justify-content: center;
  
`;

const DayText = styled.Text<DayTextProps>`
  font-size: 14px;
  font-weight: bold;
  
`;

const DateText = styled.Text<DateTextProps>`
  font-size: 18px;
  font-weight: bold;
`;

const ChatOpenButton = styled.TouchableOpacity`
  position: absolute;
  bottom: 20px;
  right: 20px;
  background-color: #0A84FF;
  width: 50px;
  height: 50px;
  border-radius: 25px;
  justify-content: center;
  align-items: center;
  elevation: 5;
`;

const ChatOpenButtonText = styled.Text`
  font-size: 24px;
`;

const ChatContainer = styled.View`
  flex: 1;
  background-color: #f0f0f0;
`;

const ChatHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: ${colors.primary};
`;

const ChatTitle = styled.Text`
  color: white;
  font-size: 20px;
  font-weight: bold;
`;

const CloseButton = styled.TouchableOpacity`
  padding: 5px;
`;

const CloseButtonText = styled.Text`
  color: white;
  font-size: 24px;
`;

const UploadButton = styled.TouchableOpacity`
  background-color: #6c757d;
  padding: 10px 12px;
  border-radius: 20px;
  margin-right: 8px;
`;

const UploadButtonText = styled.Text`
  color: white;
  font-weight: bold;
`;

const AITaskItem = styled.View`
  background-color: #f8d7da; /* Color para tareas de IA pendientes */
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 10px;
  border-left-width: 5px;
  border-left-color: #dc3545;
`;