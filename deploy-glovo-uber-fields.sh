#!/bin/bash

# Script para desplegar los campos glovo y uber en el VPS
# Fecha: 2025-01-15

echo "🚀 Iniciando despliegue de campos glovo y uber..."

# 1. Navegar al directorio del proyecto
cd /root/solucioning_clean

# 2. Hacer pull de los últimos cambios
echo "📥 Actualizando código desde repositorio..."
git pull origin main

# 3. Verificar que el archivo de migración existe
if [ ! -f "database/migrations/2025-01-15_add_glovo_uber_fields.sql" ]; then
    echo "❌ Error: No se encontró el archivo de migración"
    exit 1
fi

# 4. Ejecutar la migración SQL
echo "🗄️ Ejecutando migración de base de datos..."
psql -U postgres -d employee_management -f database/migrations/2025-01-15_add_glovo_uber_fields.sql

# 5. Verificar que los campos se agregaron correctamente
echo "✅ Verificando que los campos se agregaron correctamente..."
psql -U postgres -d employee_management -c "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'employees' AND column_name IN ('glovo', 'uber');"

# 6. Verificar que los empleados existentes tienen los valores por defecto
echo "👥 Verificando valores por defecto en empleados existentes..."
psql -U postgres -d employee_management -c "SELECT COUNT(*) as total_employees, COUNT(CASE WHEN glovo = true THEN 1 END) as glovo_true, COUNT(CASE WHEN uber = false THEN 1 END) as uber_false FROM employees;"

# 7. Reiniciar los servicios Docker
echo "🔄 Reiniciando servicios Docker..."
docker-compose restart

# 8. Verificar que los servicios estén funcionando
echo "🔍 Verificando estado de los servicios..."
docker-compose ps

echo "✅ Despliegue completado exitosamente!"
echo "📋 Resumen de cambios:"
echo "   - Campos glovo y uber agregados a tabla employees"
echo "   - Plantilla Excel actualizada"
echo "   - Endpoint de exportación actualizado"
echo "   - Interfaz de usuario actualizada"
echo "   - Servicios reiniciados"
