-- Script para agregar los campos faltantes de producción a la tabla employees
-- Fecha: 2025-01-20

BEGIN;

-- Agregar campos que faltan de la estructura de producción
ALTER TABLE employees ADD COLUMN IF NOT EXISTS email varchar(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS cdp integer;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS complementaries text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS citycode varchar(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS dni_nie varchar(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS iban varchar(34);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS vehiculo varchar(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS naf varchar(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS fecha_alta_seg_soc date;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS status_baja varchar(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS estado_ss varchar(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS informado_horario boolean DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS cuenta_divilo varchar(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS proxima_asignacion_slots date;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS jefe_trafico varchar(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS coments_jefe_de_trafico text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS incidencias text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS fecha_incidencia date;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS faltas_no_check_in_en_dias integer DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS cruce text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS status varchar(50) DEFAULT 'active';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS penalization_start_date date;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS penalization_end_date date;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS original_hours integer;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS flota varchar(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS vacaciones_disfrutadas numeric(10,2) DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS vacaciones_pendientes numeric(10,2) DEFAULT 0;

-- Agregar constraint de status si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'employees_status_check'
    ) THEN
        ALTER TABLE employees ADD CONSTRAINT employees_status_check 
        CHECK (status IN ('active', 'it_leave', 'company_leave_pending', 'company_leave_approved', 'pending_laboral', 'penalizado'));
    END IF;
END $$;

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_nombre ON employees(nombre);

-- Verificar la estructura final
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'employees'
ORDER BY ordinal_position;

COMMIT;
