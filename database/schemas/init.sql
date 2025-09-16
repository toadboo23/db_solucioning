-- Initialize PostgreSQL database for Solucioning System
-- IMPORTANTE: Este script debe ejecutarse en la base de datos 'employee_management'
-- NO en la base de datos 'postgres' por defecto

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create sessions table for authentication
CREATE TABLE IF NOT EXISTS session (
  sid varchar(255) NOT NULL PRIMARY KEY,
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id_glovo varchar(50) PRIMARY KEY,
  email_glovo varchar(100) UNIQUE,
  turno varchar(50),
  nombre varchar(100) NOT NULL,
  apellido varchar(100),
  telefono varchar(20),
  email varchar(100),
  horas integer,
  cdp integer, -- Cumplimiento de Horas (porcentaje basado en 38h = 100%)
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
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Create company_leaves table for historical data
CREATE TABLE IF NOT EXISTS company_leaves (
  id serial PRIMARY KEY,
  employee_id varchar(50) NOT NULL,
  employee_data jsonb NOT NULL,
  leave_type varchar(100) NOT NULL,
  leave_date date NOT NULL,
  leave_requested_at timestamp NOT NULL,
  leave_requested_by varchar(255) NOT NULL,
  approved_by varchar(255),
  approved_at timestamp,
  status varchar(50) DEFAULT 'approved',
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Create it_leaves table
CREATE TABLE IF NOT EXISTS it_leaves (
  id serial PRIMARY KEY,
  employee_id varchar(50) NOT NULL,
  leave_type varchar(100) NOT NULL,
  leave_date timestamp NOT NULL,
  requested_at timestamp DEFAULT CURRENT_TIMESTAMP,
  requested_by varchar(255) NOT NULL,
  approved_by varchar(255),
  approved_at timestamp,
  status varchar(50) DEFAULT 'pending',
  created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id serial PRIMARY KEY,
  type varchar(100) NOT NULL,
  title varchar(255) NOT NULL,
  message text NOT NULL,
  requested_by varchar(255) NOT NULL,
  status varchar(50) DEFAULT 'pending',
  metadata jsonb,
  processing_date timestamp,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Create system_users table (for user management by super admin)
CREATE TABLE IF NOT EXISTS system_users (
  id serial PRIMARY KEY,
  email varchar(255) UNIQUE NOT NULL,
  first_name varchar(100) NOT NULL,
  last_name varchar(100) NOT NULL,
  password varchar(255) NOT NULL, -- Hashed password
  role varchar(20) NOT NULL CHECK (role IN ('super_admin', 'admin', 'normal')),
  is_active boolean NOT NULL DEFAULT true,
  created_by varchar(255) NOT NULL, -- Email of creator
  last_login timestamp,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
  assigned_city varchar(200)
);

-- Create audit_logs table (for tracking all admin/super_admin actions)
CREATE TABLE IF NOT EXISTS audit_logs (
  id serial PRIMARY KEY,
  user_id varchar(255) NOT NULL, -- Email of user performing action
  user_role varchar(20) NOT NULL CHECK (user_role IN ('super_admin', 'admin')),
  action varchar(100) NOT NULL, -- create_employee, edit_employee, delete_employee, etc.
  entity_type varchar(50) NOT NULL, -- employee, user, notification, etc.
  entity_id varchar(255), -- ID of affected entity
  entity_name varchar(255), -- Name/description for easy reading
  description text NOT NULL, -- Human readable description
  old_data jsonb, -- Previous state (for updates)
  new_data jsonb, -- New state (for creates/updates)
  ip_address varchar(45), -- User's IP
  user_agent text, -- Browser info
  created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_ciudad ON employees(ciudad);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_nombre ON employees(nombre);
CREATE INDEX IF NOT EXISTS idx_company_leaves_employee_id ON company_leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_it_leaves_employee_id ON it_leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);

-- Add indexes for new tables
CREATE INDEX IF NOT EXISTS idx_system_users_email ON system_users(email);
CREATE INDEX IF NOT EXISTS idx_system_users_role ON system_users(role);
CREATE INDEX IF NOT EXISTS idx_system_users_is_active ON system_users(is_active);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_users_assigned_city ON system_users(assigned_city);

-- Add unique constraint to dni_nie field to prevent duplicates
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'employees_dni_nie_unique' 
        AND conrelid = 'employees'::regclass
    ) THEN
        ALTER TABLE employees ADD CONSTRAINT employees_dni_nie_unique UNIQUE (dni_nie);
    END IF;
END $$;

-- Insert production super admin users with HASHED passwords (39284756 hasheado con bcrypt)
INSERT INTO system_users (email, first_name, last_name, password, role, is_active, created_by, assigned_city) 
VALUES 
  ('nmartinez@solucioning.net', 'Nicolas', 'Martinez', '$2b$10$KunpNfnpDczxVRPB9rxJ4ey2RV2iRGTFtQR0ddIhvWV1.lo8QKidi', 'super_admin', true, 'SYSTEM', NULL),
  ('lvega@solucioning.net', 'Luciana', 'Vega', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin', true, 'SYSTEM', NULL)
ON CONFLICT (email) DO NOTHING;

-- Insert initial audit log for system setup
INSERT INTO audit_logs (user_id, user_role, action, entity_type, entity_id, entity_name, description, ip_address, user_agent)
SELECT * FROM (VALUES 
  ('SYSTEM', 'super_admin', 'system_init', 'database', 'db_init', 'Database Initialization', 'Sistema Solucioning inicializado con tablas y super admin users', '127.0.0.1', 'System')
) AS v(user_id, user_role, action, entity_type, entity_id, entity_name, description, ip_address, user_agent)
WHERE NOT EXISTS (SELECT 1 FROM audit_logs WHERE action = 'system_init');

-- Asegurar que la columna assigned_city exista en system_users (para compatibilidad con versiones anteriores)
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS assigned_city varchar(200);

-- Normalizar todas las ciudades existentes a formato capitalizado (primera letra mayúscula, resto minúsculas)
DO $$
DECLARE
    rec RECORD;
    ciudad_normalizada VARCHAR(200);
BEGIN
    FOR rec IN SELECT DISTINCT ciudad FROM employees WHERE ciudad IS NOT NULL LOOP
        ciudad_normalizada := INITCAP(LOWER(rec.ciudad));
        UPDATE employees SET ciudad = ciudad_normalizada WHERE LOWER(ciudad) = LOWER(rec.ciudad);
    END LOOP;
END $$;