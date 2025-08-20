-- Script para pasar empleados a baja empresa y eliminarlos de employees
-- Fecha: 2025-08-19
-- Motivo: Otras Causas - dado de baja en sage y glovo

-- 1. Insertar empleados en la tabla company_leaves (baja empresa)
INSERT INTO company_leaves (
    employee_id,
    employee_data,
    leave_type,
    comments,
    leave_date,
    leave_requested_at,
    leave_requested_by,
    status
)
SELECT 
    id_glovo as employee_id,
    to_jsonb(employees.*) as employee_data,
    'otras_causas' as leave_type,
    'Otras Causas - dado de baja en sage y glovo' as comments,
    CURRENT_DATE as leave_date,
    CURRENT_TIMESTAMP as leave_requested_at,
    'nmartinez@solucioning.net' as leave_requested_by,
    'approved' as status
FROM employees 
WHERE id_glovo IN (
    '203202297',
    '203202313', 
    '203268805',
    '203312679',
    '203312689'
);

-- 2. Eliminar empleados de la tabla employees
DELETE FROM employees 
WHERE id_glovo IN (
    '203202297',
    '203202313',
    '203268805', 
    '203312679',
    '203312689'
);

-- 3. Verificar que se hayan movido correctamente
SELECT 
    'Empleados movidos a baja empresa:' as mensaje,
    COUNT(*) as total
FROM company_leaves 
WHERE employee_id IN (
    '203202297',
    '203202313',
    '203268805',
    '203312679', 
    '203312689'
)
AND leave_type = 'otras_causas';

-- 4. Verificar que se hayan eliminado de employees
SELECT 
    'Empleados restantes en employees:' as mensaje,
    COUNT(*) as total
FROM employees 
WHERE id_glovo IN (
    '203202297',
    '203202313',
    '203268805',
    '203312679',
    '203312689'
);
