
const mysql = require('mysql2');
const readlineSync = require('readline-sync');

// Prompt for DB connection parameters
const host = readlineSync.question('Host de la base de datos (default: localhost): ', { defaultInput: 'localhost' }) || 'localhost';
const user = readlineSync.question('Usuario de la base de datos (default: root): ', { defaultInput: 'root' }) || 'root';
const password = readlineSync.question('Contraseña de la base de datos (puede estar vacía): ', { hideEchoBack: true }) || '';
const database = readlineSync.question('Nombre de la base de datos (default: gestion_tareas): ', { defaultInput: 'gestion_tareas' }) || 'gestion_tareas';

const conexion = mysql.createConnection({
  host,
  user,
  password,
  database
});

conexion.connect(error => {
  if (error) {
    console.error('Error al conectar a la base de datos:', error);
  } else {
    console.log('Conectado a la base de datos MySQL');
  }
});

module.exports = conexion;
