-- Script para importar datos del CSV de empleados
-- Fecha: 2025-01-20

-- Primero, limpiar la tabla actual
TRUNCATE TABLE employees;

-- Importar datos del CSV
\copy employees (
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
) FROM '/tmp/employees.csv' WITH (FORMAT csv, HEADER true, NULL 'NULL');

-- Verificar la importación
SELECT COUNT(*) as total_empleados FROM employees;
SELECT ciudad, COUNT(*) as empleados_por_ciudad FROM employees GROUP BY ciudad ORDER BY empleados_por_ciudad DESC;
