-- Script para importar datos del CSV de empleados con mapeo correcto
-- Fecha: 2025-01-20

-- Primero, limpiar la tabla actual
TRUNCATE TABLE employees;

-- Crear una tabla temporal para la importación
CREATE TEMP TABLE temp_employees (
  id_glovo varchar(50),
  email_glovo varchar(100),
  turno varchar(50), -- Campo original del CSV
  nombre varchar(100),
  apellido varchar(100),
  telefono varchar(20),
  email varchar(100),
  horas integer,
  cdp integer,
  complementaries text,
  ciudad varchar(100),
  citycode varchar(20),
  dni_nie varchar(20),
  iban varchar(34),
  direccion varchar(255),
  vehiculo varchar(50),
  naf varchar(20),
  fecha_alta_seg_soc date,
  status_baja varchar(50),
  estado_ss varchar(50),
  informado_horario boolean,
  cuenta_divilo varchar(100),
  proxima_asignacion_slots date,
  jefe_trafico varchar(100),
  coments_jefe_de_trafico text,
  incidencias text,
  fecha_incidencia date,
  faltas_no_check_in_en_dias integer,
  cruce text,
  status varchar(50),
  penalization_start_date date,
  penalization_end_date date,
  original_hours integer,
  flota varchar(100),
  created_at timestamp,
  updated_at timestamp,
  vacaciones_disfrutadas numeric(10,2),
  vacaciones_pendientes numeric(10,2)
);

-- Importar datos del CSV a la tabla temporal
\copy temp_employees FROM '/tmp/employees.csv' WITH (FORMAT csv, HEADER true, NULL 'NULL');

-- Insertar datos de la tabla temporal a la tabla final con mapeo correcto
INSERT INTO employees (
  id_glovo,
  email_glovo,
  turno_1, -- Mapear turno a turno_1
  turno_2, -- Dejar NULL por ahora
  nombre,
  apellido,
  telefono,
  email,
  horas,
  cdp,
  complementaries,
  ciudad,
  citycode,
  dni_nie,
  iban,
  direccion,
  vehiculo,
  naf,
  fecha_alta_seg_soc,
  status_baja,
  estado_ss,
  informado_horario,
  cuenta_divilo,
  proxima_asignacion_slots,
  jefe_trafico,
  coments_jefe_de_trafico,
  incidencias,
  fecha_incidencia,
  faltas_no_check_in_en_dias,
  cruce,
  status,
  penalization_start_date,
  penalization_end_date,
  original_hours,
  flota,
  created_at,
  updated_at,
  vacaciones_disfrutadas,
  vacaciones_pendientes
)
SELECT 
  id_glovo,
  email_glovo,
  turno as turno_1, -- Mapear turno a turno_1
  NULL as turno_2, -- Dejar NULL por ahora
  nombre,
  apellido,
  telefono,
  email,
  horas,
  cdp,
  complementaries,
  ciudad,
  citycode,
  dni_nie,
  iban,
  direccion,
  vehiculo,
  naf,
  fecha_alta_seg_soc,
  status_baja,
  estado_ss,
  informado_horario,
  cuenta_divilo,
  proxima_asignacion_slots,
  jefe_trafico,
  coments_jefe_de_trafico,
  incidencias,
  fecha_incidencia,
  faltas_no_check_in_en_dias,
  cruce,
  status,
  penalization_start_date,
  penalization_end_date,
  original_hours,
  flota,
  created_at,
  updated_at,
  vacaciones_disfrutadas,
  vacaciones_pendientes
FROM temp_employees;

-- Eliminar tabla temporal
DROP TABLE temp_employees;

-- Verificar la importación
SELECT COUNT(*) as total_empleados FROM employees;
SELECT ciudad, COUNT(*) as empleados_por_ciudad FROM employees GROUP BY ciudad ORDER BY empleados_por_ciudad DESC;
SELECT turno_1, COUNT(*) as empleados_por_turno FROM employees GROUP BY turno_1 ORDER BY empleados_por_turno DESC;
