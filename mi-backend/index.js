require('dotenv').config();
const axios = require('axios');
const express = require('express');
const util = require('util');
const conexion = require('./db'); // Importa la conexión
const app = express();
const port = 3000;

app.use(express.json());

// Promisificar la query para usar async/await
const query = util.promisify(conexion.query).bind(conexion);

// RUTAS PARA USUARIOS

// Obtener todos los usuarios
app.get('/usuarios', async (req, res) => {
  try {
    const resultados = await query('SELECT * FROM usuario');
    res.json(resultados);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener usuario por ID
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

// Crear usuario
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

// Obtener todas las tareas
app.get('/tareas', async (req, res) => {
  try {
    const resultados = await query('SELECT * FROM tarea');
    res.json(resultados);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener tarea por ID
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

// Crear tarea
app.post('/tareas', async (req, res) => {
  const { fecha_inicio, fecha_fin, descripcion, prioridad, titulo, usuario } = req.body;
  const sql = `INSERT INTO tarea (fecha_inicio, fecha_fin, descripcion, prioridad, titulo, usuario)
               VALUES (?, ?, ?, ?, ?, ?)`;
  try {
    const resultados = await query(sql, [fecha_inicio, fecha_fin, descripcion, prioridad, titulo, usuario]);
    res.status(201).json({ pk: resultados.insertId, fecha_inicio, fecha_fin, descripcion, prioridad, titulo, usuario });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar tarea
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

// Eliminar tarea
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

// RUTA IA CON TAREA POR ID (corregida)
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

// Ruta para probar IA con texto libre (ya existente)
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
