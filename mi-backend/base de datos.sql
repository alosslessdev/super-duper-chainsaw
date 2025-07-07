CREATE DATABASE IF NOT EXISTS gestion_tareas;

USE gestion_tareas;

CREATE TABLE usuario (
  pk INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE tarea (
  pk INT AUTO_INCREMENT PRIMARY KEY,
  fecha_inicio DATE,
  fecha_fin DATE,
  descripcion TEXT,
  prioridad VARCHAR(50),
  titulo VARCHAR(100),
  usuario INT,
  FOREIGN KEY (usuario) REFERENCES usuario(pk)
);
