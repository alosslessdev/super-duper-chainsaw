
//require('dotenv').config();
import axios from 'axios';
import express from 'express';
import session from 'express-session';
import { jsonrepair } from 'jsonrepair';
import hash from 'pbkdf2-password';
import util from 'util';
import conexion from './db.js'; // Importa la conexión
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger.json' with { type: "json" };
import readlineSync from 'readline-sync';
// Prompt for API key at startup
const apiKey = readlineSync.question('Ingrese el API key para la IA: ', { hideEchoBack: true }) || '';
const app = express(); //declaracion de aplicacion
const port = 3000; //puerto de red



//const express = require('express');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument)); //usar swagger para documentaciop

app.use(express.json()); //???


//middleware de sesión? O es para guardar contraseñas?
app.use(session({ //de express-session, guarda una id de sesion en el servidor, se usa para cookies, esto es para opciones de la sesion y hay un objeto json con opciones
  secret: 'clave-super-secreta', //secreto usaod para formar la cookie de id de sesion
  resave: false, // se usa con almacenamiento de sesionse dependiendo de si usa el metodo touch, no se usa. 
  saveUninitialized: false // no guardar sesiones que no se han inicializado, para sesiones de login, pedir permiso de cookies, reduce espacio de almacenamiento
}));

// 🔐 Middleware de protección, fucnion para login requiere session arriba
function requireLogin(req, res, next) { // req es request, res es response, next se pone para seguir al siguiente middleware, son de express, porque se llama next? 
                                        // Que llama requirelogin? Nada
  if (!req.session.user) {  //si el request no tiene session de user, que establece req? Express session.
    return res.status(401).json({ error: 'No autorizado. Inicia sesión primero.' }); //retirnar no autorizado en json
  }
  next(); //seguir al siguente middleware
}


/*¿Cómo lo usas?
Una vez definido, lo puedes aplicar a cualquier ruta que quieras proteger.
Solo lo agregas como parámetro en esa ruta. Ejemplo:
app.get('/tareas', requireLogin, async (req, res) => {   
  // Esta ruta SOLO se puede acceder si estás logueado usando requirelogin arriba
});
*/

// Promisificar la query a la conexion de base de datos para usar async/await
const query = util.promisify(conexion.query).bind(conexion);

// Configuración de OAuth2 para Google Calendar
// Roto: No sigue: https://developers.google.com/workspace/calendar/api/quickstart/nodejs
/* const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,     // e.g. 1035001014876-r71f38f2nacc4rotd0bjk2k015eusffg.apps.googleusercontent.com
  process.env.GOOGLE_CLIENT_SECRET, // e.g. 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
  process.env.GOOGLE_REDIRECT_URI   // e.g. http://localhost:3000/oauth2callback
); */

// Rutas para iniciar OAuth y recibir callback
//seguir documentacion de google de autenticacion (oauth)

/* app.get('/auth', (req, res) => {
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
 */
// Si ya tienes tokens guardados en .env, configúralos aquí para usar en requests
// Roto: No sigue: https://developers.google.com/workspace/calendar/api/quickstart/nodejs
/* oauth2Client.setCredentials({
  access_token: process.env.GOOGLE_ACCESS_TOKEN,
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  scope: 'https://www.googleapis.com/auth/calendar.events',
  token_type: 'Bearer',
  expiry_date: true // o timestamp si lo tienes
});
 */
// Roto: No sigue: https://developers.google.com/workspace/calendar/api/quickstart/nodejs
/* const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
 */

// RUTAS PARA USUARIOS
// Obtener todos los usuarios
app.get('/usuarios', async (req, res) => { //async de express 
  try {
    const resultados = await query('SELECT * FROM usuario'); //de es7 javascript await, query de funcion arriba
    res.json(resultados);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener usuario por ID
app.get('/usuarios/:id', async (req, res) => {
  const id = req.params.id; //request parameters are? id is related to this route aka url and req.params.id represents 
                            // whatever the frontend sends replacing the :id field aka parameter
  try {
    const resultados = await query('SELECT * FROM usuario WHERE pk = ?', [id]);
    if (resultados.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(resultados[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear usuario / agregado lo de hash

app.post('/usuarios', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  hash({ password }, (err, pass, salt, hashVal) => {  //hash de libreria externa, this syntax is 
                                                      // a lambda func and password needs to be an object
                                                      // err, pass, salt, hashval are just for library
                                                      // lambda used because of library
    if (err) return res.status(500).json({ error: 'Error al hashear la contraseña' });

    const sql = 'INSERT INTO usuario (email, password_hash, salt) VALUES (?, ?, ?)';
    conexion.query(sql, [email, hashVal, salt], (error, resultados) => {
      if (error) return res.status(500).json({ error: error.message });
      res.status(201).json({ pk: resultados.insertId, email });
    });
  });
});

// Ruta para iniciar sesión
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  try {
    const resultados = await query('SELECT * FROM usuario WHERE email = ?', [email]);
    if (resultados.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const user = resultados[0];

    hash({ password, salt: user.salt }, (err, pass, salt, hashVal) => {
      if (err) return res.status(500).json({ error: 'Error al verificar contraseña' });

      if (hashVal === user.password_hash) {
        req.session.user = {
          id: user.pk,
          email: user.email
        };
        res.json({ mensaje: 'Inicio de sesión exitoso', usuario: req.session.user });
      } else {
        res.status(401).json({ error: 'Contraseña incorrecta' });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ mensaje: 'Sesión cerrada' });
  });
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

app.post('/tareas', async (req, res) => {
  const { fecha_inicio, fecha_fin, descripcion, prioridad, titulo, usuario } = req.body;
  const sql = `INSERT INTO tarea (fecha_inicio, fecha_fin, descripcion, prioridad, titulo, usuario)
               VALUES (?, ?, ?, ?, ?, ?)`;
  try {
    const resultados = await query(sql, [fecha_inicio, fecha_fin, descripcion, prioridad, titulo, usuario]);

    // Crear evento en Google Calendar
   /* const evento = {
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
*/
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

// RUTA IA CON TAREA POR ID
// hacer que guarde los datos temporalmente antes de modificar la base de datos
// ver tambien como se sube el archivo lo mas probable es que sea en s3 y luego aqui se tome el link desde s3 y se pase al rag
app.post('/tareas/ia/:id', async (req, res) => {
  const tareaId = req.params.id;
  try {
    const resultados = await query('SELECT descripcion FROM tarea WHERE pk = ?', [tareaId]);
    if (resultados.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    const descripcion = resultados[0].descripcion;

    // Send header data and get JSON response with tasks
    const response = await axios.post(
      `https://localhost:8000/secure-data`,
      {
        pdf_url: req.body.pdf_url || '', // If you want to send a PDF URL, otherwise remove
        question: descripcion
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey // Send API key in header
        }
      }
    );

    // Expect response in format: [{ tarea: '...', tiempoEstimado: '...' }, ...]
    try{
    let tareasJsonStr = jsonrepair(response.data).replace(/\n/g, ""); //when does jsonrepair fail?
    }catch (err){
        console.error(err) // in case json is corrupted and unrecoverable by jsonrepair
    }
    tareasJsonStr = JSON.stringify(tareasJsonStr);
    const tareasJson = JSON.parse(tareasJsonStr);

    let results = [];
    let tareasArray = Array.isArray(tareasJson) ? tareasJson : Object.values(tareasJson);

    for (const tareaObj of tareasArray) {
      // Support both { tarea, tiempoEstimado } and legacy string value
      let descripcion, titulo, tiempoEstimado;
      if (typeof tareaObj === 'object' && tareaObj.tarea && tareaObj.tiempoEstimado) {
        descripcion = tareaObj.tarea;
        titulo = tareaObj.tarea;
        tiempoEstimado = tareaObj.tiempoEstimado;
      } else {
        descripcion = tareaObj;
        titulo = tareaObj;
        tiempoEstimado = null;
      }
      // Insert each task into the DB with time estimation
      const sql = `INSERT INTO tarea (descripcion, titulo, usuario, tiempo_estimado) VALUES (?, ?, ?, ?)`;
      try {
        const insertResult = await query(sql, [descripcion, titulo, req.session.user?.id || null, tiempoEstimado]);
        results.push({ tarea: descripcion, tiempoEstimado, insertId: insertResult.insertId });
      } catch (err) {
        results.push({ tarea: descripcion, tiempoEstimado, error: err.message });
      }
    }
    res.json({ tareasProcesadas: results });
  } catch (error) {
    console.error('Error en /tareas/ia/:id:', error.response?.data || error.message || error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

// hacer que guarde los datos temporalmente antes de modificar la base de datos



app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});