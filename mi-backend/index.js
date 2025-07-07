const express = require('express');
const conexion = require('./db'); // Importa la conexión
const app = express();
const port = 3000;

app.use(express.json());

// RUTAS PARA USUARIOS

// Obtener todos los usuarios
app.get('/usuarios', (req, res) => {
  conexion.query('SELECT * FROM usuario', (error, resultados) => {
    if (error) return res.status(500).json({ error: error.message });
    res.json(resultados);
  });
});

// Obtener usuario por ID
app.get('/usuarios/:id', (req, res) => {
  const id = req.params.id;
  conexion.query('SELECT * FROM usuario WHERE pk = ?', [id], (error, resultados) => {
    if (error) return res.status(500).json({ error: error.message });
    if (resultados.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(resultados[0]);
  });
});

// Crear usuario
app.post('/usuarios', (req, res) => {
  const { email } = req.body;
  conexion.query('INSERT INTO usuario (email) VALUES (?)', [email], (error, resultados) => {
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ pk: resultados.insertId, email });
  });
});

// RUTAS PARA TAREAS

// Obtener todas las tareas
app.get('/tareas', (req, res) => {
  conexion.query('SELECT * FROM tarea', (error, resultados) => {
    if (error) return res.status(500).json({ error: error.message });
    res.json(resultados);
  });
});

// Obtener tarea por ID
app.get('/tareas/:id', (req, res) => {
  const id = req.params.id;
  conexion.query('SELECT * FROM tarea WHERE pk = ?', [id], (error, resultados) => {
    if (error) return res.status(500).json({ error: error.message });
    if (resultados.length === 0) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json(resultados[0]);
  });
});

// Crear tarea
app.post('/tareas', (req, res) => {
  const { fecha_inicio, fecha_fin, descripcion, prioridad, titulo, usuario } = req.body;
  const sql = `INSERT INTO tarea (fecha_inicio, fecha_fin, descripcion, prioridad, titulo, usuario)
               VALUES (?, ?, ?, ?, ?, ?)`;
  conexion.query(sql, [fecha_inicio, fecha_fin, descripcion, prioridad, titulo, usuario], (error, resultados) => {
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ pk: resultados.insertId, fecha_inicio, fecha_fin, descripcion, prioridad, titulo, usuario });
  });
});

// Actualizar tarea
app.put('/tareas/:id', (req, res) => {
  const id = req.params.id;
  const { fecha_inicio, fecha_fin, descripcion, prioridad, titulo, usuario } = req.body;
  const sql = `UPDATE tarea SET fecha_inicio = ?, fecha_fin = ?, descripcion = ?, prioridad = ?, titulo = ?, usuario = ?
               WHERE pk = ?`;
  conexion.query(sql, [fecha_inicio, fecha_fin, descripcion, prioridad, titulo, usuario, id], (error, resultados) => {
    if (error) return res.status(500).json({ error: error.message });
    if (resultados.affectedRows === 0) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json({ mensaje: 'Tarea actualizada' });
  });
});

// Eliminar tarea
app.delete('/tareas/:id', (req, res) => {
  const id = req.params.id;
  conexion.query('DELETE FROM tarea WHERE pk = ?', [id], (error, resultados) => {
    if (error) return res.status(500).json({ error: error.message });
    if (resultados.affectedRows === 0) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json({ mensaje: 'Tarea eliminada' });
  });
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
