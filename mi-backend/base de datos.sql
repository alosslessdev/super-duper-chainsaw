CREATE DATABASE IF NOT EXISTS gestion_tareas;

USE gestion_tareas;

CREATE TABLE usuario (
  pk INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255), 
  salt VARCHAR(255)
);

CREATE TABLE tarea (
  pk INT AUTO_INCREMENT PRIMARY KEY,
  fecha_inicio DATE,
  fecha_fin DATE,
  descripcion TEXT,
  prioridad VARCHAR(50),
  titulo TEXT,
  usuario INT,
  tiempo_estimado VARCHAR(50),
  horas INT,
  FOREIGN KEY (usuario) REFERENCES usuario(pk)
);

-- pruebas, debe ser generado con swagger, contraseña de prueba es asdf
INSERT INTO usuario (email) VALUES
('alice.smith@example.com', 'y3+6s/VmKLGim7j5TOFXZ1DOcPEi8G1rbkvl5r4JEySHKuUp/AqymAVHovhXkC01TwpReQ8rKhl6HCophVeiyXkzbXzNMmiIXCIKNi0Ho9KazWzKLILZldd+tMiywC6ml4jh00ZNVU5F5phj7aQzV1qCOnwNPzvz8h9TbKCCwwg=', '910M8V6hJg1tjc3kYMeNjcYln+28PExnx6BS+BlkfPUJ2Poy0EBcY7WgfgsUtPGo99/F51WAoXm7XCZDq1P3TA=='),
('bob.johnson@example.com', 'y3+6s/VmKLGim7j5TOFXZ1DOcPEi8G1rbkvl5r4JEySHKuUp/AqymAVHovhXkC01TwpReQ8rKhl6HCophVeiyXkzbXzNMmiIXCIKNi0Ho9KazWzKLILZldd+tMiywC6ml4jh00ZNVU5F5phj7aQzV1qCOnwNPzvz8h9TbKCCwwg=', '910M8V6hJg1tjc3kYMeNjcYln+28PExnx6BS+BlkfPUJ2Poy0EBcY7WgfgsUtPGo99/F51WAoXm7XCZDq1P3TA=='),
('charlie.brown@example.com', 'y3+6s/VmKLGim7j5TOFXZ1DOcPEi8G1rbkvl5r4JEySHKuUp/AqymAVHovhXkC01TwpReQ8rKhl6HCophVeiyXkzbXzNMmiIXCIKNi0Ho9KazWzKLILZldd+tMiywC6ml4jh00ZNVU5F5phj7aQzV1qCOnwNPzvz8h9TbKCCwwg=', '910M8V6hJg1tjc3kYMeNjcYln+28PExnx6BS+BlkfPUJ2Poy0EBcY7WgfgsUtPGo99/F51WAoXm7XCZDq1P3TA==');

-- Insert data into the 'tarea' table
-- Assuming user PKs are 1, 2, 3 based on auto-increment from above inserts

INSERT INTO tarea (fecha_inicio, fecha_fin, descripcion, prioridad, titulo, usuario, tiempo_estimado, horas) VALUES
('2024-07-01', '2024-07-05', 'Develop new feature for user authentication module.', 'Alta', 'Implement User Auth', 1, '4 dias', 4),
('2024-07-02', '2024-07-03', 'Review pull requests from junior developers.', 'Media', 'Code Review Session', 1, '1 dia', 1),
('2024-07-05', '2024-07-10', 'Write documentation for API endpoints.', 'Baja', 'API Documentation', 1, '5 dias', 5),
('2024-07-01', '2024-07-08', 'Design database schema for new reporting module.', 'Alta', 'Database Design', 2, '7 dias', 7),
('2024-07-09', '2024-07-12', 'Prepare presentation for quarterly review.', 'Media', 'Quarterly Review Prep', 4, '3 dias', 3),
('2024-07-15', NULL, 'Investigate bug in payment processing system.', 'Alta', 'Payment Bug Fix', 4, '2 dias', 2),
('2024-07-03', '2024-07-04', 'Set up development environment for new project.', 'Media', 'Dev Environment Setup', 4, '1 dia', 1),
('2024-07-06', '2024-07-07', 'Attend team meeting and provide status updates.', 'Baja', 'Team Meeting', 3, '1 dia', 1),
('2024-07-08', '2024-07-14', 'Research new technologies for front-end development.', 'Media', 'Front-end Tech Research', 4, '6 dias', 6);

