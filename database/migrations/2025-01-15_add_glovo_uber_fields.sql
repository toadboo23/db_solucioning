-- Migración para agregar campos glovo y uber a la tabla employees
-- Fecha: 2025-01-15
-- Descripción: Agrega campos booleanos glovo (default true) y uber (default false) a la tabla employees

-- Agregar campo glovo con valor por defecto true
ALTER TABLE employees 
ADD COLUMN glovo boolean NOT NULL DEFAULT true;

-- Agregar campo uber con valor por defecto false  
ALTER TABLE employees 
ADD COLUMN uber boolean NOT NULL DEFAULT false;

-- Crear índices para optimizar consultas por plataforma
CREATE INDEX IF NOT EXISTS idx_employees_glovo ON employees(glovo);
CREATE INDEX IF NOT EXISTS idx_employees_uber ON employees(uber);

-- Comentarios para documentar los nuevos campos
COMMENT ON COLUMN employees.glovo IS 'Indica si el empleado está activo en la plataforma Glovo';
COMMENT ON COLUMN employees.uber IS 'Indica si el empleado está activo en la plataforma Uber';

-- Verificar que los campos se agregaron correctamente
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'employees' 
AND column_name IN ('glovo', 'uber')
ORDER BY column_name;
