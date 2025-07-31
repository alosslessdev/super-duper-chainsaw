
import 'react-native-get-random-values';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Picker as RNPicker } from '@react-native-picker/picker';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { Stack, useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Alert } from 'react-native';
import styled from 'styled-components/native';
import AnalogClock from '../(app)/analogClock';
import { getAwsKeys, getUserId } from '../clientKeyStore'; // Import getUserId
import { colors } from '../styles/colors';
import * as FileSystem from 'expo-file-system';

const { sessionCookie } = getAwsKeys();
let url: string; //url para archivo en AWS s3

const taskTypes = ['ocio', 'importante', 'liviana', 'descanso', 'general']; // Added 'general' for AI tasks
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
  hours: number;
  startHour: number;
  completed?: boolean; // Nueva propiedad

};

type ProcessedTask = {
  tarea: string; // AI's suggested task name
  tiempoEstimado?: string; // AI's suggested estimated time (can map to description)
  horas: number; // Duration in hours from AI
  insertId: number; // ID for the processed task
  error?: string;
};

type Msg = {
  id: string;
  text: string;
  fromMe: boolean;
};

const hourWidth = 30; // ancho fijo para cada hora
const hours = Array.from({ length: 24 }, (_, i) => i);

// Helper function to get current hour rounded to nearest hour
const getCurrentHourRounded = (): number => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  
  // Round to nearest hour (if >= 30 minutes, round up)
  return currentMinutes >= 30 ? (currentHour + 1) % 24 : currentHour;
};

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

  // State for loading tasks from the server
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  // Add state to prevent duplicate processing
  const [processingTaskIds, setProcessingTaskIds] = useState<Set<number>>(new Set());
  
  // Track AI task IDs that are pending approval (should not show in main task list)
  const [pendingAiTaskIds, setPendingAiTaskIds] = useState<Set<number>>(new Set());

  // Function to fetch tasks from the server
  const fetchTasks = useCallback(async () => {
    const userId = getUserId();
    if (!userId) {
      console.log('User ID not available, cannot fetch tasks.');
      return;
    }

    setIsLoadingTasks(true);
    try {
      const response = await fetch(`http://0000243.xyz:8080/tareas/de/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const loadedTasks: Task[] = data
          .filter((serverTask: any) => {
            // Filter out AI tasks that are still pending approval
            return !pendingAiTaskIds.has(parseInt(serverTask.pk));
          })
          .map((serverTask: any) => {
            // Parse fecha_inicio to get the hour
            const startDate = new Date(serverTask.fecha_inicio);
            const startHour = startDate.getHours();

            return {
              id: serverTask.pk.toString(), // Use 'pk' as the ID
              name: serverTask.titulo, // Map 'titulo' to 'name'
              type: serverTask.tipo || 'general', // Map 'tipo' to 'type', default to 'general'
              description: serverTask.descripcionInvalidoAquiNoExiste || '', // Map 'descripcion'
              hours: serverTask.horas || 1, // Map 'horas' directly
              startHour: startHour || 0, // Use the derived start hour
            };
          });
        setTasks(loadedTasks);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch tasks:', errorData.error || response.statusText);
        Alert.alert('Error', `No se pudieron cargar las tareas: ${errorData.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Network error fetching tasks:', error);
      Alert.alert('Error', 'No se pudo conectar al servidor para cargar las tareas.');
    } finally {
      setIsLoadingTasks(false);
    }
  }, [sessionCookie, pendingAiTaskIds]);

  // Fetch tasks on component mount
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);


  // Helper function to find the next available start hour for a task
  const findNextAvailableHour = useCallback((duration: number, existingTasks: Task[], preferredStartHour?: number): number => {
    // Sort tasks by start hour to ensure correct conflict checking
    const sortedTasks = [...existingTasks].sort((a, b) => a.startHour - b.startHour);
    
    // If a preferred start hour is provided, try that first
    if (preferredStartHour !== undefined) {
      let isConflict = false;
      const newEnd = preferredStartHour + duration;
      
      // Check if we don't exceed 24 hours
      if (newEnd <= 24) {
        for (const existingTask of sortedTasks) {
          const existingStart = existingTask.startHour;
          const existingEnd = existingTask.startHour + existingTask.hours;

          // Check for overlap
          if (!(newEnd <= existingStart || preferredStartHour >= existingEnd)) {
            isConflict = true;
            break;
          }
        }
        if (!isConflict) {
          return preferredStartHour;
        }
      }
    }

    // If preferred hour doesn't work or wasn't provided, find next available
    for (let hour = 0; hour <= 24 - duration; hour++) {
      let isConflict = false;
      const newEnd = hour + duration;
      for (const existingTask of sortedTasks) {
        const existingStart = existingTask.startHour;
        const existingEnd = existingTask.startHour + existingTask.hours;

        // Check for overlap: new task starts before existing task ends, AND new task ends after existing task starts
        if (!(newEnd <= existingStart || hour >= existingEnd)) {
          isConflict = true;
          break;
        }
      }
      if (!isConflict) {
        return hour;
      }
    }
    return -1; // No available slot found
  }, []);

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
            // Add all AI task IDs to pending list so they don't show in main task list
            const newPendingIds = data.tareasProcesadas.map((task: ProcessedTask) => task.insertId);
            setPendingAiTaskIds(prev => new Set([...prev, ...newPendingIds]));
            
            setAiProcessedTasks(data.tareasProcesadas);
            setAiApprovalModalVisible(true);
            setMsgs(cur => [
              ...cur,
              {
                id: Date.now().toString() + '-ia-prompt',
                text: 'Has recibido nuevas tareas de la IA. Por favor, revisa y aprueba cada una.',
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

              text: `Archivo subido exitosamente`,
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

  const saveTask = async () => { // Made async to handle API calls
    if (!taskName.trim() || taskName.length > 20) {
      Alert.alert('Error', 'El nombre debe tener máximo 20 caracteres.');
      return;
    }
    if (taskDescription.length > 50) {
      Alert.alert('Error', 'La descripción debe tener máximo 50 caracteres.');
      return;
    }
    const duration = Number(taskHours);
    if (isNaN(duration) || duration <= 0 || duration > 24) {
      Alert.alert('Error', 'Las horas deben ser un número entre 1 y 24.');
      return;
    }
    let start = Number(taskStartHour);
    if (isNaN(start) || start < 0 || start > 23) {
      Alert.alert('Error', 'La hora de inicio debe estar entre 0 y 23.');
      return;
    }

    // Adjust for date if necessary, assuming all tasks are for the current day for startHour logic
    const today = new Date();
    today.setHours(start, 0, 0, 0); // Set to the start hour for today
    const fecha_inicio = today.toISOString(); // Format for backend

    const endDate = new Date(today);
    endDate.setHours(start + duration, 0, 0, 0);
    const fecha_fin = endDate.toISOString(); // Format for backend

    // Check for conflicts with existing tasks
    let newStartHour = start;
    let conflictDetected = false;
    // We pass `tasks` directly to `findNextAvailableHour` for its internal logic
    const suggestedStart = findNextAvailableHour(duration, tasks);

    // If we are editing, we need to exclude the task being edited from conflict checks
    const tasksToCheck = isEditing && selectedTask ? tasks.filter(t => t.id !== selectedTask.id) : tasks;
    for (const t of tasksToCheck) {
      const tStart = t.startHour;
      const tEnd = t.startHour + t.hours;

      if (!( (start + duration) <= tStart || start >= tEnd)) {
        conflictDetected = true;
        break;
      }
    }

    if (conflictDetected) {
      if (suggestedStart !== -1) {
        Alert.alert(
          "Conflicto de Tareas",
          `La tarea "${taskName.trim()}" entra en conflicto con una tarea existente. ¿Deseas moverla a las ${suggestedStart}:00?`,
          [
            {
              text: "Cancelar",
              style: "cancel",
              onPress: () => {
                // Do nothing, let the user manually adjust or cancel
              }
            },
            {
              text: "Mover",
              onPress: async () => { // Make this onPress async
                newStartHour = suggestedStart;
                // Re-calculate fecha_inicio and fecha_fin for the suggested start hour
                const newToday = new Date();
                newToday.setHours(newStartHour, 0, 0, 0);
                const new_fecha_inicio = newToday.toISOString();

                const newEndDate = new Date(newToday);
                newEndDate.setHours(newStartHour + duration, 0, 0, 0);
                const new_fecha_fin = newEndDate.toISOString();


                const taskPayload = {
                  titulo: taskName.trim(),
                  tipo: taskType,
                  descripcion: taskDescription.trim(),
                  horas: duration,
                  fecha_inicio: new_fecha_inicio,
                  fecha_fin: new_fecha_fin,
                  usuario: getUserId(), // Ensure userId is passed
                  prioridad: 'general', // You might want to make this dynamic
                  tiempo_estimado: taskDescription.trim(),
                  hecho: false, // Default value
                };

                try {
                  const method = isEditing && selectedTask ? 'PUT' : 'POST';
                  const url = isEditing && selectedTask
                    ? `http://0000243.xyz:8080/tareas/${selectedTask.id}`
                    : 'http://0000243.xyz:8080/tareas'; //to fix

                  const response = await fetch(url, {
                    method: method,
                    headers: {
                      'Content-Type': 'application/json',
                      Cookie: sessionCookie,
                    },
                    credentials: 'include',
                    body: JSON.stringify(taskPayload),
                  });

                  if (response.ok) {
                    Alert.alert('Éxito', 'Tarea guardada exitosamente.');
                    // Re-fetch tasks to update the UI with the latest data from the server
                    fetchTasks();
                    resetAndCloseModal();
                  } else {
                    const errorData = await response.json();
                    Alert.alert('Error', `Error al guardar la tarea: ${errorData.error || response.statusText}`);
                  }
                } catch (err) {
                  console.error('Save task error:', err);
                  Alert.alert('Error', 'No se pudo conectar al servidor para guardar la tarea.');
                }
              }
            }
          ]
        );
        return; // Prevent immediate save, wait for user's decision
      } else {
        Alert.alert("Conflicto de Tareas", "No hay espacio disponible para esta tarea sin conflictos.");
        return;
      }
    }


    // If no conflict, or user decided to save after conflict resolution
    const taskPayload = {
      titulo: taskName.trim(),
      tipo: taskType,
      descripcion: taskDescription.trim(),
      horas: duration,
      fecha_inicio: fecha_inicio,
      fecha_fin: fecha_fin,
      usuario: getUserId(), // Ensure userId is passed
      prioridad: 'general', // You might want to make this dynamic
      tiempo_estimado: taskDescription.trim(),
      hecho: false, // Default value
    };

    try {
      const method = isEditing && selectedTask ? 'PUT' : 'POST';
      const url = isEditing && selectedTask
        ? `http://0000243.xyz:8080/tareas/${selectedTask.id}`
        : 'http://0000243.xyz:8080/tareas';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        credentials: 'include',
        body: JSON.stringify(taskPayload),
      });

      if (response.ok) {
        Alert.alert('Éxito', 'Tarea guardada exitosamente.');
        fetchTasks(); // Re-fetch tasks to update the UI
        resetAndCloseModal();
      } else {
        const errorData = await response.json();
        Alert.alert('Error', `Error al guardar la tarea: ${errorData.error || response.statusText}`);
      }
    } catch (err) {
      console.error('Save task error:', err);
      Alert.alert('Error', 'No se pudo conectar al servidor para guardar la tarea.');
    }
  };

  const resetAndCloseModal = () => {
    setTaskName('');
    setTaskType('ocio');
    setTaskDescription('');
    setTaskHours('1');
    setTaskStartHour('0');
    setSelectedTask(null);
    setIsEditing(false);
    setModalVisible(false);
  }

  const handleEdit = () => {
    if (selectedTask) {
      openTaskModal(selectedTask);
    }
    setActionModalVisible(false);
  };

  const handleDelete = async () => {
    if (selectedTask) {
      // Confirm deletion with the user
      Alert.alert(
        "Eliminar Tarea",
        `¿Estás seguro de que quieres eliminar la tarea "${selectedTask.name}"?`,
        [
          {
            text: "Cancelar",
            style: "cancel",
            onPress: () => setActionModalVisible(false),
          },
          {
            text: "Eliminar",
            onPress: async () => {
              try {
                const response = await fetch(
                  `http://0000243.xyz:8080/tareas/${selectedTask.id}`, // Use selectedTask.id
                  {
                    method: 'DELETE',
                    headers: {
                      Cookie: sessionCookie,
                    },
                    credentials: 'include',
                  }
                );

                if (response.ok) {
                  // Instead of directly manipulating state, re-fetch tasks
                  fetchTasks();
                  Alert.alert('Éxito', 'Tarea eliminada exitosamente.');
                } else {
                  const errorData = await response.json();
                  Alert.alert('Error', `Error al eliminar la tarea: ${errorData.error || response.statusText}`);
                }
              } catch (err) {
                console.error('Delete task error:', err);
                Alert.alert('Error', 'No se pudo conectar al servidor para eliminar la tarea.');
              } finally {
                setActionModalVisible(false);
              }
            },
          },
        ],
        { cancelable: true }
      );
    }
  };
  //completado
  const handleComplete = () => {
    if (selectedTask) {
      setTasks(cur =>
        cur.map(t =>
          t.id === selectedTask.id ? { ...t, completed: true } : t
        )
      );
    }
    setActionModalVisible(false);
  };

  const handleAcceptProcessedTask = async (taskToAccept: ProcessedTask) => {
    // Prevent duplicate processing
    if (processingTaskIds.has(taskToAccept.insertId)) {
      console.log(`Task ${taskToAccept.insertId} is already being processed`);
      return;
    }

    // Add to processing set
    setProcessingTaskIds(prev => new Set(prev).add(taskToAccept.insertId));

    try {
      // Get current hour rounded to nearest hour as preferred start time
      const preferredStartHour = getCurrentHourRounded();
      
      // Find the next available start hour for the AI task, preferring current hour
      const nextAvailableStartHour = findNextAvailableHour(taskToAccept.horas, tasks, preferredStartHour);

      if (nextAvailableStartHour === -1) {
        Alert.alert('Sin Espacio', `No hay suficiente espacio en el horario para la tarea "${taskToAccept.tarea}".`);
        setMsgs(cur => [
          ...cur,
          {
            id: Date.now().toString() + `-no-space-${taskToAccept.insertId}`,
            text: `No hay espacio disponible para la tarea "${taskToAccept.tarea}".`,
            fromMe: false,
          },
        ]);
        // Remove from approval list
        setAiProcessedTasks(cur =>
          cur.filter(task => task.insertId !== taskToAccept.insertId)
        );
        return;
      }

      const today = new Date();
      today.setHours(nextAvailableStartHour, 0, 0, 0);
      const fecha_inicio = today.toISOString();

      const endDate = new Date(today);
      endDate.setHours(nextAvailableStartHour + taskToAccept.horas, 0, 0, 0);
      const fecha_fin = endDate.toISOString();

      const taskPayload = {
        titulo: taskToAccept.tarea,
        tipo: 'general',
        descripcion: taskToAccept.tiempoEstimado || '',
        horas: taskToAccept.horas,
        fecha_inicio: fecha_inicio,
        fecha_fin: fecha_fin,
        usuario: getUserId(),
        prioridad: 'general',
        tiempo_estimado: taskToAccept.tiempoEstimado || '',
        hecho: false,
      };

      // Update the existing task instead of creating a new one
      const response = await fetch(`http://0000243.xyz:8080/tareas/${taskToAccept.insertId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',  
          Cookie: sessionCookie,
        },
        credentials: 'include',
        body: JSON.stringify(taskPayload),
      });

      if (response.ok) {
        // Success - show success message
        Alert.alert('Éxito', `Tarea "${taskToAccept.tarea}" aceptada y programada a las ${nextAvailableStartHour}:00.`);
        
        // Add success message to chat
        setMsgs(cur => [
          ...cur,
          {
            id: Date.now().toString() + `-accepted-${taskToAccept.insertId}`,
            text: `Tarea "${taskToAccept.tarea}" aceptada y programada a las ${nextAvailableStartHour}:00.`,
            fromMe: false,
          },
        ]);

        // Remove from approval list
        setAiProcessedTasks(cur =>
          cur.filter(task => task.insertId !== taskToAccept.insertId)
        );

        // Remove from pending list so it shows in main task list
        setPendingAiTaskIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskToAccept.insertId);
          return newSet;
        });

        // Refetch tasks to get the updated task from server
        fetchTasks();

      } else {
        const errorData = await response.json();
        Alert.alert('Error', `Error al aceptar la tarea: ${errorData.error || response.statusText}`);
        setMsgs(cur => [
          ...cur,
          {
            id: Date.now().toString() + `-accept-error-${taskToAccept.insertId}`,
            text: `Error al aceptar la tarea "${taskToAccept.tarea}": ${errorData.error || response.statusText}.`,
            fromMe: false,
          },
        ]);
      }
    } catch (err) {
      console.error('Accept processed task error:', err);
      Alert.alert('Error', 'No se pudo conectar al servidor para aceptar la tarea.');
      setMsgs(cur => [
        ...cur,
        {
          id: Date.now().toString() + `-accept-fetch-error-${taskToAccept.insertId}`,
          text: `Error de conexión al intentar aceptar la tarea "${taskToAccept.tarea}".`,
          fromMe: false,
        },
      ]);
    } finally {
      // Always remove from processing set
      setProcessingTaskIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskToAccept.insertId);
        return newSet;
      });
    }
  };


  const handleRejectProcessedTask = async (taskToReject: ProcessedTask) => {
    // Prevent duplicate processing
    if (processingTaskIds.has(taskToReject.insertId)) {
      console.log(`Task ${taskToReject.insertId} is already being processed`);
      return;
    }

    // Add to processing set
    setProcessingTaskIds(prev => new Set(prev).add(taskToReject.insertId));

    try {
      const response = await fetch(
        `http://0000243.xyz:8080/tareas/${taskToReject.insertId}`,
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
            text: `Tarea "${taskToReject.tarea}" rechazada y eliminada`,
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
            text: `Error al rechazar la tarea "${taskToReject.tarea}": ${errorData.error || response.statusText
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
      
      // Keep the task in pending list since it was rejected and deleted
      // (it won't show up in fetchTasks anyway since it's deleted from DB)
      
      // Remove from processing set
      setProcessingTaskIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskToReject.insertId);
        return newSet;
      });
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

  const getTaskColor = (type: string, completed?: boolean) => {
    if (completed) return '#d3d3d3'; // gris si completada
    switch (type) {
      case 'importante':
        return '#ffb3b3'; // rojo claro
      case 'ocio':
        return '#d6b3ff'; // azul claro
      case 'liviana':
        return '#b3ffb3'; // verde claro
      case 'descanso':
        return '#b3e0ff'; // naranja claro
      default:
        return '#e0f0ff'; // azul por defecto
    }
  };


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
                <CloseModalButton onPress={() => setActionModalVisible(false)}>
                  <CloseModalButtonText>✖</CloseModalButtonText>
                </CloseModalButton>
                <ModalTitle>¿Qué deseas hacer?</ModalTitle>

                <ModalButtonsRow>
                  <ModalButtonSave onPress={handleEdit}>
                    <ModalButtonText>Editar</ModalButtonText>
                  </ModalButtonSave>

                  <ModalButtonCancel onPress={handleDelete}>
                    <ModalButtonText>Eliminar</ModalButtonText>
                  </ModalButtonCancel>

                  <ModalButtonComplete onPress={handleComplete}>
                    <ModalButtonText>Completada</ModalButtonText>
                  </ModalButtonComplete>
                </ModalButtonsRow>





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

          {isLoadingTasks ? (
            <LoadingText>Cargando tareas...</LoadingText>
          ) : (
            <FlatList
              data={tasks}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableTaskItem
                  onPress={() => {
                    setSelectedTask(item);
                    setActionModalVisible(true);
                  }}
                  $bg={getTaskColor(item.type, item.completed)}
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
              /* ListEmptyComponent={() => (
                <EmptyListText>No tienes tareas agendadas. ¡Agrega una!</EmptyListText>
              )} */
            />
          )}


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

const Bubble = styled.View.withConfig({}) <{ fromMe: boolean }>`
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
  text-align: center;
  width: 100%;
`;

const InputLabel = styled.Text`
  margin-top: 12px;
  font-weight: 600;
  color: #333;
`;


const CloseModalButton = styled.TouchableOpacity`
  position: absolute;
  top: -4px;
  right: 0px;
  z-index: 10;
  background-color: transparent;
  padding: 6px;
`;

const CloseModalButtonText = styled.Text`
  font-size: 22px;
  color: #888;
  font-weight: bold;
`;

const ModalButtonsRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-top: 20px;
`;

const ModalButtonClose = styled.Pressable`
  background-color: #aaa; /* gris claro*/
  padding: 10px 20px;
  border-radius: 8px;
  width: 100%;
  margin-top: 10px;
  justify-content: center;
  align-items: center;
`;

const ModalButtonCancel = styled.Pressable`
  background-color: #FF3B30;
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

const ModalButtonComplete = styled.Pressable`
  background-color: #4CD964; /* verde */
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
  margin-top: 4px;
  font-weight: 600;
  color: #444;
`;

const TouchableTaskItem = styled.TouchableOpacity<{ $bg: string }>`
  background-color: ${(props: { $bg: string }) => props.$bg};
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 10px;
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


const LoadingText = styled.Text`
  text-align: center;
  margin-top: 20px;
  font-size: 16px;
  color: #555;
`;

const EmptyListText = styled.Text`
  text-align: center;
  margin-top: 20px;
  font-size: 16px;
  color: #777;
`;
