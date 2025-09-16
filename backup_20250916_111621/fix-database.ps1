# Script para arreglar las relaciones de la base de datos
# Fecha: 2025-01-15

Write-Host "🔧 Iniciando reparación de la base de datos..." -ForegroundColor Green

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
    # 1. Navegar al directorio del proyecto
    Write-Host "📁 Navegando al directorio del proyecto..." -ForegroundColor Cyan
    Invoke-VPSCommand "cd $projectPath"
    
    # 2. Verificar si los campos glovo y uber existen
    Write-Host "🔍 Verificando campos glovo y uber..." -ForegroundColor Cyan
    Invoke-VPSCommand "psql -U postgres -d employee_management -c \"SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'employees' AND column_name IN ('glovo', 'uber');\""
    
    # 3. Agregar campos si no existen
    Write-Host "➕ Agregando campos glovo y uber si no existen..." -ForegroundColor Cyan
    Invoke-VPSCommand "psql -U postgres -d employee_management -c \"ALTER TABLE employees ADD COLUMN IF NOT EXISTS glovo boolean NOT NULL DEFAULT true;\""
    Invoke-VPSCommand "psql -U postgres -d employee_management -c \"ALTER TABLE employees ADD COLUMN IF NOT EXISTS uber boolean NOT NULL DEFAULT false;\""
    
    # 4. Crear índices
    Write-Host "📊 Creando índices..." -ForegroundColor Cyan
    Invoke-VPSCommand "psql -U postgres -d employee_management -c \"CREATE INDEX IF NOT EXISTS idx_employees_glovo ON employees(glovo);\""
    Invoke-VPSCommand "psql -U postgres -d employee_management -c \"CREATE INDEX IF NOT EXISTS idx_employees_uber ON employees(uber);\""
    
    # 5. Verificar que hay empleados en la tabla
    Write-Host "👥 Verificando empleados en la tabla..." -ForegroundColor Cyan
    Invoke-VPSCommand "psql -U postgres -d employee_management -c \"SELECT COUNT(*) as total_employees FROM employees;\""
    
    # 6. Verificar algunos empleados de ejemplo
    Write-Host "📋 Verificando empleados de ejemplo..." -ForegroundColor Cyan
    Invoke-VPSCommand "psql -U postgres -d employee_management -c \"SELECT idGlovo, nombre, apellido, glovo, uber FROM employees LIMIT 5;\""
    
    # 7. Reiniciar servicios Docker
    Write-Host "🔄 Reiniciando servicios Docker..." -ForegroundColor Cyan
    Invoke-VPSCommand "cd $projectPath && docker-compose restart"
    
    # 8. Verificar estado de servicios
    Write-Host "🔍 Verificando estado de servicios..." -ForegroundColor Cyan
    Invoke-VPSCommand "cd $projectPath && docker-compose ps"
    
    Write-Host "✅ Reparación de base de datos completada!" -ForegroundColor Green
    Write-Host "📋 Resumen de acciones:" -ForegroundColor White
    Write-Host "   - Campos glovo y uber verificados/agregados" -ForegroundColor White
    Write-Host "   - Índices creados" -ForegroundColor White
    Write-Host "   - Empleados verificados" -ForegroundColor White
    Write-Host "   - Servicios reiniciados" -ForegroundColor White
    
} catch {
    Write-Host "❌ Error durante la reparación: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
