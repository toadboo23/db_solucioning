# Script para desplegar los campos glovo y uber en el VPS
# Fecha: 2025-01-15

Write-Host "🚀 Iniciando despliegue de campos glovo y uber..." -ForegroundColor Green

# Configuración
$vpsHost = "69.62.107.86"
$vpsUser = "root"
$projectPath = "/root/solucioning_clean"

# Función para ejecutar comandos en el VPS
function Invoke-VPSCommand {
    param([string]$Command)
    
    Write-Host "Ejecutando: $Command" -ForegroundColor Yellow
    ssh -o StrictHostKeyChecking=no "$vpsUser@$vpsHost" $Command
}

try {
    # 1. Navegar al directorio del proyecto y hacer pull
    Write-Host "📥 Actualizando código desde repositorio..." -ForegroundColor Cyan
    Invoke-VPSCommand "cd $projectPath; git pull origin main"
    
    # 2. Verificar que el archivo de migración existe
    Write-Host "🔍 Verificando archivo de migración..." -ForegroundColor Cyan
    Invoke-VPSCommand "cd $projectPath; ls -la database/migrations/2025-01-15_add_glovo_uber_fields.sql"
    
    # 3. Ejecutar la migración SQL
    Write-Host "🗄️ Ejecutando migración de base de datos..." -ForegroundColor Cyan
    Invoke-VPSCommand "cd $projectPath; psql -U postgres -d employee_management -f database/migrations/2025-01-15_add_glovo_uber_fields.sql"
    
    # 4. Verificar que los campos se agregaron correctamente
    Write-Host "✅ Verificando que los campos se agregaron correctamente..." -ForegroundColor Cyan
    Invoke-VPSCommand "cd $projectPath; psql -U postgres -d employee_management -c 'SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = ''employees'' AND column_name IN (''glovo'', ''uber'');'"
    
    # 5. Verificar valores por defecto en empleados existentes
    Write-Host "👥 Verificando valores por defecto en empleados existentes..." -ForegroundColor Cyan
    Invoke-VPSCommand "cd $projectPath; psql -U postgres -d employee_management -c 'SELECT COUNT(*) as total_employees, COUNT(CASE WHEN glovo = true THEN 1 END) as glovo_true, COUNT(CASE WHEN uber = false THEN 1 END) as uber_false FROM employees;'"
    
    # 6. Reiniciar los servicios Docker
    Write-Host "🔄 Reiniciando servicios Docker..." -ForegroundColor Cyan
    Invoke-VPSCommand "cd $projectPath; docker-compose restart"
    
    # 7. Verificar que los servicios estén funcionando
    Write-Host "🔍 Verificando estado de los servicios..." -ForegroundColor Cyan
    Invoke-VPSCommand "cd $projectPath; docker-compose ps"
    
    Write-Host "✅ Despliegue completado exitosamente!" -ForegroundColor Green
    Write-Host "📋 Resumen de cambios:" -ForegroundColor White
    Write-Host "   - Campos glovo y uber agregados a tabla employees" -ForegroundColor White
    Write-Host "   - Plantilla Excel actualizada" -ForegroundColor White
    Write-Host "   - Endpoint de exportación actualizado" -ForegroundColor White
    Write-Host "   - Interfaz de usuario actualizada" -ForegroundColor White
    Write-Host "   - Servicios reiniciados" -ForegroundColor White
    
} catch {
    Write-Host "❌ Error durante el despliegue: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
