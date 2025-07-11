const mysql = require('mysql');

const conexion = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // <-- cadena vacía si no le pusiste clave
  database: 'gestion_tareas'
});


conexion.connect((err) => {
  if (err) {
    console.error('Error de conexión: ' + err.stack);
    return;
  }
  console.log('Conectado a la base de datos MySQL');
});

module.exports = conexion;
