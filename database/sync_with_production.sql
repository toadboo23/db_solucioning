-- Script para sincronizar la tabla employees local con la estructura de producción
-- y agregar el campo turno_2 al lado de turno_1
-- Fecha: 2025-01-20

BEGIN;

-- 1. Crear una tabla temporal con la estructura exacta de producción + turno_2
CREATE TABLE employees_new (
  id_glovo varchar(50) PRIMARY KEY,
  email_glovo varchar(100) UNIQUE,
  turno_1 varchar(50), -- Renombrar turno a turno_1
  turno_2 varchar(50), -- Nuevo campo
  nombre varchar(100) NOT NULL,
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
  informado_horario boolean DEFAULT false,
  cuenta_divilo varchar(100),
  proxima_asignacion_slots date,
  jefe_trafico varchar(100),
  coments_jefe_de_trafico text,
  incidencias text,
  fecha_incidencia date,
  faltas_no_check_in_en_dias integer DEFAULT 0,
  cruce text,
  status varchar(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'it_leave', 'company_leave_pending', 'company_leave_approved', 'pending_laboral', 'penalizado')),
  penalization_start_date date,
  penalization_end_date date,
  original_hours integer,
  flota varchar(100),
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
  vacaciones_disfrutadas numeric(10,2) DEFAULT 0,
  vacaciones_pendientes numeric(10,2) DEFAULT 0
);

-- 2. Copiar datos de la tabla actual a la nueva tabla, mapeando campos
INSERT INTO employees_new (
  id_glovo,
  email_glovo,
  turno_1,
  turno_2,
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
  turno_1, -- Ya existe en la tabla actual
  turno_2, -- Ya existe en la tabla actual
  nombre,
  apellido,
  telefono,
  NULL as email, -- No existe en la tabla actual, será NULL
  horas,
  NULL as cdp, -- No existe en la tabla actual, será NULL
  NULL as complementaries, -- No existe en la tabla actual, será NULL
  ciudad,
  NULL as citycode, -- No existe en la tabla actual, será NULL
  NULL as dni_nie, -- No existe en la tabla actual, será NULL
  NULL as iban, -- No existe en la tabla actual, será NULL
  direccion,
  NULL as vehiculo, -- No existe en la tabla actual, será NULL
  NULL as naf, -- No existe en la tabla actual, será NULL
  NULL as fecha_alta_seg_soc, -- No existe en la tabla actual, será NULL
  NULL as status_baja, -- No existe en la tabla actual, será NULL
  NULL as estado_ss, -- No existe en la tabla actual, será NULL
  false as informado_horario, -- No existe en la tabla actual, será false
  NULL as cuenta_divilo, -- No existe en la tabla actual, será NULL
  NULL as proxima_asignacion_slots, -- No existe en la tabla actual, será NULL
  NULL as jefe_trafico, -- No existe en la tabla actual, será NULL
  NULL as coments_jefe_de_trafico, -- No existe en la tabla actual, será NULL
  NULL as incidencias, -- No existe en la tabla actual, será NULL
  NULL as fecha_incidencia, -- No existe en la tabla actual, será NULL
  0 as faltas_no_check_in_en_dias, -- No existe en la tabla actual, será 0
  NULL as cruce, -- No existe en la tabla actual, será NULL
  'active' as status, -- Valor por defecto
  NULL as penalization_start_date, -- No existe en la tabla actual, será NULL
  NULL as penalization_end_date, -- No existe en la tabla actual, será NULL
  NULL as original_hours, -- No existe en la tabla actual, será NULL
  NULL as flota, -- No existe en la tabla actual, será NULL
  fecha_ultima_actualizacion as created_at,
  fecha_ultima_actualizacion as updated_at,
  COALESCE(CAST(vacaciones_disfrutadas AS numeric(10,2)), 0) as vacaciones_disfrutadas,
  COALESCE(CAST(vacaciones_pendientes AS numeric(10,2)), 0) as vacaciones_pendientes
FROM employees;

-- 3. Eliminar la tabla original
DROP TABLE employees;

-- 4. Renombrar la nueva tabla
ALTER TABLE employees_new RENAME TO employees;

-- 5. Recrear índices
CREATE INDEX IF NOT EXISTS idx_employees_ciudad ON employees(ciudad);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_nombre ON employees(nombre);
CREATE INDEX IF NOT EXISTS idx_employees_turno_1 ON employees(turno_1);
CREATE INDEX IF NOT EXISTS idx_employees_turno_2 ON employees(turno_2);

-- 6. Verificar la estructura final
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'employees'
ORDER BY ordinal_position;

COMMIT;
