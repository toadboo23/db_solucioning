#!/bin/bash
echo "Monitoreo de reactivación - $(date)"
docker exec -t solucioning_postgres psql -U postgres -d employee_management -c "SELECT COUNT(*) as empleados_problematicos FROM company_leaves cl LEFT JOIN employees e ON cl.employee_id = e.id_glovo WHERE cl.status = 'approved' AND cl.reactivated_at IS NOT NULL AND e.id_glovo IS NULL;"
