
//require('dotenv').config();
import axios from 'axios';
import express from 'express';
import session from 'express-session';
import { jsonrepair } from 'jsonrepair';
import hash from 'pbkdf2-password';
import readlineSync from 'readline-sync';
import swaggerUi from 'swagger-ui-express';
import util from 'util';
import conexion from './db.js'; // Importa la conexión
import swaggerDocument from './swagger.json' with { type: "json" };
// Prompt for API key at startup
const apiKey = readlineSync.question('Ingrese el API key para la IA: ', { hideEchoBack: true }) || '';
const app = express(); //declaracion de aplicacion
const port = 3000; //puerto de red

import cors from 'cors';
app.use(cors({
  origin: 'http://localhost:3000', // or wherever Swagger UI is served
  credentials: true
}));



//const express = require('express');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument)); //usar swagger para documentaciop

app.use(express.json()); //???

const hasher = hash();

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

// Crear usuario / agregado lo de hash
app.post('/usuarios', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  hasher({ password }, (err, pass, salt, hashVal) => {  //hash de libreria externa, this syntax is 
                                                      // a lambda func and password needs to be an object
                                                      // err, pass, salt, hashval are just for library
                                                      // lambda used because of library
    if (err) return res.status(500).json({ error: 'Error al hashear la contraseña' });

    const sql = 'INSERT INTO usuario (email, password, salt) VALUES (?, ?, ?)';
    conexion.query(sql, [email, hashVal, salt], (error, resultados) => {
      if (error) return res.status(500).json({ error: error.message });
      res.status(201).json({ pk: resultados.insertId, email });
    });
  });
});

// Ruta para iniciar sesión
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log("req.body done");

  if (!email || !password) {
      console.log("no pass done");

    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }
  try {
      console.log("enter user search done");

    const resultados = await query('SELECT * FROM usuario WHERE email = ?', [email]);
      console.log("user search done");

    if (resultados.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const user = resultados[0];
  console.log("entering hash");

    hasher({ password, salt: user.salt }, (err, pass, salt, hashVal) => {
        console.log("ahshing");

      if (err) return res.status(500).json({ error: 'Error al verificar contraseña' });

      if (hashVal === user.password) {
        req.session.user = {
          id: user.pk,
          email: user.email
        };
        req.session.save(function (err) {
          if (err) return res.status(500).json({ error: 'Error al guardar la sesión' });
          // Only send one response after session is saved
          res.json({ mensaje: 'Inicio de sesión exitoso', usuario: req.session.user });
        });
      } else {
        res.status(401).json({ error: 'Contraseña incorrecta' });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Require cookie for logout
app.post('/logout', requireLogin, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ mensaje: 'Sesión cerrada' });
  });
});



// RUTAS PARA TAREAS

app.get('/tareas/de/:usuario', requireLogin, async (req, res) => {
  const usuario = req.params.usuario;
  try {
    const resultados = await query('SELECT * FROM tarea WHERE usuario = ?', [usuario]);
    res.json(resultados);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener tarea por ID

app.get('/tareas/por/:id', requireLogin, async (req, res) => {
  const id = req.params.id;
  try {
    const resultados = await query('SELECT * FROM tarea WHERE pk = ?', [id]);
    if (resultados.length === 0) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json(resultados[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/tareas', requireLogin, async (req, res) => {
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
app.put('/tareas/:id', requireLogin, async (req, res) => {
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
app.delete('/tareas/:id', requireLogin, async (req, res) => {
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
app.post('/tareas/ia/', requireLogin, async (req, res) => {
  try {
    let response, tareasJsonStr;
    let attempt = 0;
    let jsonRepairSuccess = false;
    let lastError;
    while (attempt < 2 && !jsonRepairSuccess) {
      try {
        response = await axios.post(
          `http://localhost:8000/secure-data`,
          {
            pdf_url: req.body.pdf_url || '',
            question1: req.body.question
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': apiKey
            }
          }
        );
        let responseString = response.data.replace(/\n/g, "");
        responseString = responseString.replace(/\\/g, "");
        tareasJsonStr = jsonrepair(responseString);
        jsonRepairSuccess = true;
      } catch (err) {
        lastError = err;
        attempt++;
        if (attempt >= 2) {
          console.error(err);
          return res.status(500).json({ error: 'Error al reparar el JSON de la IA tras 2 intentos' });
        }
      }
    }

    // tareasJsonStr is now a valid JSON string or object
    let tareasJson;
    if (typeof tareasJsonStr === 'string') {
      tareasJson = JSON.parse(tareasJsonStr);
    } else {
      tareasJson = tareasJsonStr;
    }

    let results = [];
    // Iterate over keys and group tarea/tiempoEstimado pairs
    // Example: { "tarea_1": "...", "tiempoEstimado_1": "...", "tarea_2": "...", ... }
    const tareas = [];
    for (const key of Object.keys(tareasJson)) {
      if (key.toLowerCase().startsWith('tarea')) {
        // Extract index from key, e.g., tarea_1 -> 1
        const idx = key.split('_')[1] || '';
        const descripcion = tareasJson[key];
        const titulo = tareasJson[key];
        // Find matching tiempoEstimado key
        const tiempoKey = `tiempoEstimado_${idx}`;
        const tiempoEstimado = tareasJson[tiempoKey] || null;
        tareas.push({ descripcion, titulo, tiempoEstimado });
      }
    }

    for (const tareaObj of tareas) {
      const { descripcion, titulo, tiempoEstimado } = tareaObj;
      // Calcular fechaInicio y fechaFin según tiempoEstimado
      let fechaInicio, fechaFin;
      const hoy = new Date();
      fechaInicio = hoy.toISOString().slice(0, 10); // formato YYYY-MM-DD
      let dias = 1;
      if (typeof tiempoEstimado === 'string') {
        const match = tiempoEstimado.match(/(\d+)\s*d[ií]as?/i);
        if (match) {
          dias = parseInt(match[1], 10);
        }
      }
      const fin = new Date(hoy);
      fin.setDate(hoy.getDate() + dias);
      fechaFin = fin.toISOString().slice(0, 10);

      const sql = `INSERT INTO tarea (fecha_inicio, fecha_fin, descripcion, titulo, usuario, tiempo_estimado) VALUES (?, ?, ?, ?, ?, ?)`;
      try {
        const insertResult = await query(sql, [fechaInicio, fechaFin, descripcion, titulo, req.session.user?.id || null, tiempoEstimado]);
        results.push({ tarea: descripcion, tiempoEstimado, insertId: insertResult.insertId });
      } catch (err) {
        results.push({ tarea: descripcion, tiempoEstimado, error: err.message });
      }
    }
    // If no tasks were processed, send an error
    if (results.length === 0) {
      return res.status(404).json({ error: 'No task was found.' });
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