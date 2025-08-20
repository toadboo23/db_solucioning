-- Script para reordenar las columnas en la tabla employees
-- Mover turno_2 para que aparezca inmediatamente después de turno_1

-- Crear una nueva tabla con el orden de columnas deseado
CREATE TABLE employees_new (
    id_glovo varchar(50) PRIMARY KEY,
    email_glovo varchar(100) UNIQUE,
    turno_1 varchar(50),
    turno_2 varchar(50),
    nombre varchar(100) NOT NULL,
    apellido varchar(100),
    telefono varchar(20),
    direccion text,
    ciudad varchar(100),
    estado varchar(50),
    codigo_postal varchar(10),
    fecha_nacimiento date,
    fecha_contratacion date,
    salario decimal(10,2),
    horas integer,
    departamento varchar(100),
    puesto varchar(100),
    supervisor varchar(100),
    fecha_ultima_actualizacion timestamp DEFAULT CURRENT_TIMESTAMP,
    activo boolean DEFAULT true,
    notas text,
    foto_url text,
    documentos_url text,
    emergencia_nombre varchar(100),
    emergencia_telefono varchar(20),
    emergencia_relacion varchar(50),
    seguro_social varchar(20),
    rfc varchar(20),
    curp varchar(20),
    ine varchar(20),
    licencia_conducir varchar(20),
    certificaciones text,
    habilidades text,
    idiomas text,
    experiencia_anterior text,
    educacion text,
    referencias text,
    evaluaciones text,
    capacitaciones text,
    ausencias text,
    incidentes text,
    reconocimientos text,
    metas text,
    plan_desarrollo text,
    comentarios_supervisor text,
    comentarios_hr text,
    fecha_revision timestamp,
    proxima_revision date,
    estado_contratacion varchar(50),
    tipo_contrato varchar(50),
    fecha_fin_contrato date,
    periodo_prueba boolean DEFAULT false,
    fecha_fin_prueba date,
    motivo_terminacion text,
    fecha_terminacion date,
    documentos_entregados text,
    equipo_devuelto text,
    entrevista_salida text,
    recomendacion_recontratacion boolean,
    comentarios_salida text
);

-- Copiar todos los datos de la tabla original a la nueva tabla
INSERT INTO employees_new 
SELECT 
    id_glovo,
    email_glovo,
    turno_1,
    turno_2,
    nombre,
    apellido,
    telefono,
    direccion,
    ciudad,
    estado,
    codigo_postal,
    fecha_nacimiento,
    fecha_contratacion,
    salario,
    horas,
    departamento,
    puesto,
    supervisor,
    fecha_ultima_actualizacion,
    activo,
    notas,
    foto_url,
    documentos_url,
    emergencia_nombre,
    emergencia_telefono,
    emergencia_relacion,
    seguro_social,
    rfc,
    curp,
    ine,
    licencia_conducir,
    certificaciones,
    habilidades,
    idiomas,
    experiencia_anterior,
    educacion,
    referencias,
    evaluaciones,
    capacitaciones,
    ausencias,
    incidentes,
    reconocimientos,
    metas,
    plan_desarrollo,
    comentarios_supervisor,
    comentarios_hr,
    fecha_revision,
    proxima_revision,
    estado_contratacion,
    tipo_contrato,
    fecha_fin_contrato,
    periodo_prueba,
    fecha_fin_prueba,
    motivo_terminacion,
    fecha_terminacion,
    documentos_entregados,
    equipo_devuelto,
    entrevista_salida,
    recomendacion_recontratacion,
    comentarios_salida
FROM employees;

-- Eliminar la tabla original
DROP TABLE employees;

-- Renombrar la nueva tabla como la original
ALTER TABLE employees_new RENAME TO employees;

-- Recrear los índices
CREATE INDEX IF NOT EXISTS idx_employees_turno_1 ON employees(turno_1);
CREATE INDEX IF NOT EXISTS idx_employees_turno_2 ON employees(turno_2);
CREATE INDEX IF NOT EXISTS idx_employees_ciudad ON employees(ciudad);
CREATE INDEX IF NOT EXISTS idx_employees_activo ON employees(activo);
CREATE INDEX IF NOT EXISTS idx_employees_departamento ON employees(departamento);
CREATE INDEX IF NOT EXISTS idx_employees_fecha_contratacion ON employees(fecha_contratacion);

-- Verificar el nuevo orden de las columnas
SELECT column_name, ordinal_position
FROM information_schema.columns
WHERE table_name = 'employees'
ORDER BY ordinal_position;
