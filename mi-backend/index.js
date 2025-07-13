
//require('dotenv').config();
import axios from 'axios';
import express from 'express';
import util from 'util';
import conexion from './db.js'; // Importa la conexión
const app = express();
const port = 3000;
import hash from 'pbkdf2-password';
import session from 'express-session';
import { jsonrepair } from 'jsonrepair'


app.use(express.json());

// Promisificar la query para usar async/await
const query = util.promisify(conexion.query).bind(conexion);

// Configuración de OAuth2 para Google Calendar
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,     // e.g. 1035001014876-r71f38f2nacc4rotd0bjk2k015eusffg.apps.googleusercontent.com
  process.env.GOOGLE_CLIENT_SECRET, // e.g. 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
  process.env.GOOGLE_REDIRECT_URI   // e.g. http://localhost:3000/oauth2callback
);

// Rutas para iniciar OAuth y recibir callback

app.get('/auth', (req, res) => {
  const scopes = ['https://www.googleapis.com/auth/calendar.events'];
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // importante para obtener refresh token
    scope: scopes,
  });
  res.redirect(url);
});

app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('No se recibió el código de autorización');

  try {
    const { tokens } = await oauth2Client.getToken(code);
    // Aquí puedes guardar tokens.access_token y tokens.refresh_token en tu base de datos o archivo .env
    // Para propósitos de prueba, los mostramos en pantalla
    res.json(tokens);
  } catch (error) {
    console.error('Error intercambiando código por tokens:', error);
    res.status(500).send('Error al intercambiar el código por tokens');
  }
});

// Si ya tienes tokens guardados en .env, configúralos aquí para usar en requests
oauth2Client.setCredentials({
  access_token: process.env.GOOGLE_ACCESS_TOKEN,
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  scope: 'https://www.googleapis.com/auth/calendar.events',
  token_type: 'Bearer',
  expiry_date: true // o timestamp si lo tienes
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// RUTAS PARA USUARIOS

app.get('/usuarios', async (req, res) => {
  try {
    const resultados = await query('SELECT * FROM usuario');
    res.json(resultados);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/usuarios/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const resultados = await query('SELECT * FROM usuario WHERE pk = ?', [id]);
    if (resultados.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(resultados[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/usuarios', async (req, res) => {
  const { email } = req.body;
  try {
    const resultados = await query('INSERT INTO usuario (email) VALUES (?)', [email]);
    res.status(201).json({ pk: resultados.insertId, email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// RUTAS PARA TAREAS

app.get('/tareas', async (req, res) => {
  try {
    const resultados = await query('SELECT * FROM tarea');
    res.json(resultados);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/tareas/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const resultados = await query('SELECT * FROM tarea WHERE pk = ?', [id]);
    if (resultados.length === 0) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json(resultados[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/tareas', async (req, res) => {
  const { fecha_inicio, fecha_fin, descripcion, prioridad, titulo, usuario } = req.body;
  const sql = `INSERT INTO tarea (fecha_inicio, fecha_fin, descripcion, prioridad, titulo, usuario)
               VALUES (?, ?, ?, ?, ?, ?)`;
  try {
    const resultados = await query(sql, [fecha_inicio, fecha_fin, descripcion, prioridad, titulo, usuario]);

    // Crear evento en Google Calendar
    const evento = {
      summary: titulo,
      description: descripcion,
      start: {
        dateTime: new Date(fecha_inicio).toISOString(),
        timeZone: 'America/Panama',
      },
      end: {
        dateTime: new Date(fecha_fin).toISOString(),
        timeZone: 'America/Panama',
      },
    };

    try {
      await calendar.events.insert({
        calendarId: 'primary',
        resource: evento,
      });
    } catch (error) {
      console.error('Error creando evento en Google Calendar:', error);
      // Opcional: enviar warning sin interrumpir respuesta exitosa
    }

    res.status(201).json({ pk: resultados.insertId, fecha_inicio, fecha_fin, descripcion, prioridad, titulo, usuario });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/tareas/:id', async (req, res) => {
  const id = req.params.id;
  const { fecha_inicio, fecha_fin, descripcion, prioridad, titulo, usuario } = req.body;
  const sql = `UPDATE tarea SET fecha_inicio = ?, fecha_fin = ?, descripcion = ?, prioridad = ?, titulo = ?, usuario = ?
               WHERE pk = ?`;
  try {
    const resultados = await query(sql, [fecha_inicio, fecha_fin, descripcion, prioridad, titulo, usuario, id]);
    if (resultados.affectedRows === 0) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json({ mensaje: 'Tarea actualizada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/tareas/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const resultados = await query('DELETE FROM tarea WHERE pk = ?', [id]);
    if (resultados.affectedRows === 0) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json({ mensaje: 'Tarea eliminada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// RUTA IA CON TAREA POR ID
app.post('/tareas/ia/:id', async (req, res) => {
  const tareaId = req.params.id;
  try {
    const resultados = await query('SELECT descripcion FROM tarea WHERE pk = ?', [tareaId]);
    if (resultados.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    const descripcion = resultados[0].descripcion;
    const apiKey = process.env.GEMINI_API_KEY;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [{ text: descripcion }]
          }
        ]
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const textoIA = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ respuesta: textoIA });

  } catch (error) {
    console.error('Error en /tareas/ia/:id:', error.response?.data || error.message || error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

// Ruta para probar IA con texto libre
app.post('/ia', async (req, res) => {
  const { prompt } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const textoIA = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ respuesta: textoIA });

  } catch (error) {
    console.error('Error al conectar con Gemini:', error.response?.data || error.message);
    res.status(500).json({ error: 'No se pudo conectar con Gemini' });
  }
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
