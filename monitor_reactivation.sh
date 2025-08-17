#!/bin/bash

echo "🔍 Monitoreo de funcionalidad de reactivación - $(date)"
echo "=================================================="

echo "1️⃣ Verificando empleados reactivados que faltan en tabla employees..."

docker exec -it solucioning_postgres psql -U postgres -d employee_management -c "
SELECT 
    cl.employee_id,
    cl.employee_data->>'nombre' as nombre,
    cl.employee_data->>'apellido' as apellido,
    cl.reactivated_at,
    cl.reactivated_by
FROM company_leaves cl
LEFT JOIN employees e ON cl.employee_id = e.id_glovo
WHERE cl.status = 'approved' 
    AND cl.reactivated_at IS NOT NULL 
    AND e.id_glovo IS NULL
ORDER BY cl.employee_id;
"

echo ""
echo "2️⃣ Resumen de empleados reactivados:"

docker exec -it solucioning_postgres psql -U postgres -d employee_management -c "
SELECT 
    cl.employee_id,
    cl.employee_data->>'nombre' as nombre,
    cl.employee_data->>'apellido' as apellido,
    cl.reactivated_at,
    cl.reactivated_by,
    CASE WHEN e.id_glovo IS NOT NULL THEN 'SI' ELSE 'NO' END as en_employees
FROM company_leaves cl
LEFT JOIN employees e ON cl.employee_id = e.id_glovo
WHERE cl.status = 'approved' AND cl.reactivated_at IS NOT NULL
ORDER BY cl.employee_id;
"

echo ""
echo "✅ Monitoreo completado - $(date)"
