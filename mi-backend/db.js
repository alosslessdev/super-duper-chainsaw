const mysql = require('mysql2');

const conexion = mysql.createConnection({
  host: 'localhost',
  user: 'root',          // Cambia si usas otro usuario
  password: '',          // Cambia si tienes contraseña
  database: 'gestion_tareas'  // El nombre de la base que creaste
});

conexion.connect(error => {
  if (error) {
    console.error('Error al conectar a la base de datos:', error);
  } else {
    console.log('Conectado a la base de datos MySQL');
  }
});

module.exports = conexion;
