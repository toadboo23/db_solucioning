-- Script para agregar turno_2 y renombrar turno a turno_1
-- Ejecutar este script en la base de datos employee_management

-- Renombrar la columna 'turno' a 'turno_1'
ALTER TABLE employees RENAME COLUMN turno TO turno_1;

-- Agregar la nueva columna 'turno_2'
ALTER TABLE employees ADD COLUMN turno_2 varchar(50);

-- Crear un índice para turno_1 (mantener el rendimiento)
CREATE INDEX IF NOT EXISTS idx_employees_turno_1 ON employees(turno_1);

-- Crear un índice para turno_2
CREATE INDEX IF NOT EXISTS idx_employees_turno_2 ON employees(turno_2);

-- Verificar los cambios
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'employees' 
AND column_name IN ('turno_1', 'turno_2')
ORDER BY column_name;
