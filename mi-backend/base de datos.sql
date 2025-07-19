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
  tiempo_estimado VARCHAR(50),
  FOREIGN KEY (usuario) REFERENCES usuario(pk)
);

--pruebas
INSERT INTO usuario (email) VALUES
('alice.smith@example.com'),
('bob.johnson@example.com'),
('charlie.brown@example.com');

-- Insert data into the 'tarea' table
-- Assuming user PKs are 1, 2, 3 based on auto-increment from above inserts

INSERT INTO tarea (fecha_inicio, fecha_fin, descripcion, prioridad, titulo, usuario, tiempo_estimado) VALUES
('2024-07-01', '2024-07-05', 'Develop new feature for user authentication module.', 'Alta', 'Implement User Auth', 1, '4 dias'),
('2024-07-02', '2024-07-03', 'Review pull requests from junior developers.', 'Media', 'Code Review Session', 1, '1 dia'),
('2024-07-05', '2024-07-10', 'Write documentation for API endpoints.', 'Baja', 'API Documentation', 1, '5 dias'),
('2024-07-01', '2024-07-08', 'Design database schema for new reporting module.', 'Alta', 'Database Design', 2, '7 dias'),
('2024-07-09', '2024-07-12', 'Prepare presentation for quarterly review.', 'Media', 'Quarterly Review Prep', 2, '3 dias'),
('2024-07-15', NULL, 'Investigate bug in payment processing system.', 'Alta', 'Payment Bug Fix', 2, '2 dias'),
('2024-07-03', '2024-07-04', 'Set up development environment for new project.', 'Media', 'Dev Environment Setup', 3, '1 dia'),
('2024-07-06', '2024-07-07', 'Attend team meeting and provide status updates.', 'Baja', 'Team Meeting', 3, '1 dia'),
('2024-07-08', '2024-07-14', 'Research new technologies for front-end development.', 'Media', 'Front-end Tech Research', 3, '6 dias');

