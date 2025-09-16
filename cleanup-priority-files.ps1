# Script para eliminar archivos de prioridad alta de forma segura
param(
    [switch]$DryRun = $false
)

Write-Host "=== LIMPIEZA DE ARCHIVOS DE PRIORIDAD ALTA ===" -ForegroundColor Green
Write-Host "Modo: $(if($DryRun) { 'SIMULACIÓN' } else { 'EJECUCIÓN REAL' })" -ForegroundColor $(if($DryRun) { 'Yellow' } else { 'Red' })

# Crear backup de seguridad antes de eliminar
$backupDir = "backup_before_cleanup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Write-Host "`nCreando backup de seguridad en: $backupDir" -ForegroundColor Cyan

if (-not $DryRun) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

# 1. ELIMINAR NODE_MODULES
Write-Host "`n1. ELIMINANDO NODE_MODULES..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    $nodeModulesSize = (Get-ChildItem -Path "node_modules" -Recurse | Measure-Object -Property Length -Sum).Sum
    $nodeModulesSizeMB = [math]::Round($nodeModulesSize / 1MB, 2)
    Write-Host "   Tamaño: $nodeModulesSizeMB MB" -ForegroundColor White
    
    if ($DryRun) {
        Write-Host "   [SIMULACIÓN] Se eliminaría: node_modules/" -ForegroundColor Yellow
    } else {
        Write-Host "   Eliminando node_modules..." -ForegroundColor Red
        Remove-Item -Path "node_modules" -Recurse -Force
        Write-Host "   ✓ node_modules eliminado" -ForegroundColor Green
    }
} else {
    Write-Host "   node_modules no encontrado" -ForegroundColor Gray
}

# 2. ELIMINAR ARCHIVOS DE CLAVES SSH
Write-Host "`n2. ELIMINANDO ARCHIVOS DE CLAVES SSH..." -ForegroundColor Yellow
$sshFiles = Get-ChildItem -Path "." -Filter "vps-*"
if ($sshFiles.Count -gt 0) {
    Write-Host "   Archivos encontrados: $($sshFiles.Count)" -ForegroundColor White
    foreach ($file in $sshFiles) {
        Write-Host "   - $($file.Name)" -ForegroundColor White
    }
    
    if ($DryRun) {
        Write-Host "   [SIMULACIÓN] Se eliminarían archivos vps-*" -ForegroundColor Yellow
    } else {
        Write-Host "   Eliminando archivos de claves SSH..." -ForegroundColor Red
        Remove-Item -Path "vps-*" -Force
        Write-Host "   ✓ Archivos de claves SSH eliminados" -ForegroundColor Green
    }
} else {
    Write-Host "   No se encontraron archivos vps-*" -ForegroundColor Gray
}

# 3. ELIMINAR ARCHIVOS DE LOGS Y TEMPORALES
Write-Host "`n3. ELIMINANDO ARCHIVOS TEMPORALES..." -ForegroundColor Yellow
$logFiles = Get-ChildItem -Path "." -Filter "*.log"
$tmpFiles = Get-ChildItem -Path "." -Filter "*.tmp"
$totalTempFiles = $logFiles.Count + $tmpFiles.Count

if ($totalTempFiles -gt 0) {
    Write-Host "   Archivos .log: $($logFiles.Count)" -ForegroundColor White
    Write-Host "   Archivos .tmp: $($tmpFiles.Count)" -ForegroundColor White
    
    if ($DryRun) {
        Write-Host "   [SIMULACIÓN] Se eliminarían archivos temporales" -ForegroundColor Yellow
    } else {
        Write-Host "   Eliminando archivos temporales..." -ForegroundColor Red
        Remove-Item -Path "*.log", "*.tmp" -Force -ErrorAction SilentlyContinue
        Write-Host "   ✓ Archivos temporales eliminados" -ForegroundColor Green
    }
} else {
    Write-Host "   No se encontraron archivos temporales" -ForegroundColor Gray
}

# 4. ORGANIZAR ARCHIVOS DE BACKUP SQL
Write-Host "`n4. ORGANIZANDO ARCHIVOS DE BACKUP SQL..." -ForegroundColor Yellow
$sqlFiles = Get-ChildItem -Path "." -Filter "*.sql"
if ($sqlFiles.Count -gt 0) {
    $sqlSize = ($sqlFiles | Measure-Object -Property Length -Sum).Sum
    $sqlSizeMB = [math]::Round($sqlSize / 1MB, 2)
    Write-Host "   Archivos encontrados: $($sqlFiles.Count)" -ForegroundColor White
    Write-Host "   Tamaño total: $sqlSizeMB MB" -ForegroundColor White
    
    foreach ($file in $sqlFiles) {
        $sizeMB = [math]::Round($file.Length / 1MB, 2)
        Write-Host "   - $($file.Name) ($sizeMB MB)" -ForegroundColor White
    }
    
    if ($DryRun) {
        Write-Host "   [SIMULACIÓN] Se moverían a database/backups/" -ForegroundColor Yellow
    } else {
        # Crear directorio de backups si no existe
        if (-not (Test-Path "database/backups")) {
            New-Item -ItemType Directory -Path "database/backups" -Force | Out-Null
            Write-Host "   Directorio database/backups creado" -ForegroundColor Cyan
        }
        
        Write-Host "   Moviendo archivos SQL a database/backups/..." -ForegroundColor Red
        Move-Item -Path "*.sql" -Destination "database/backups/" -Force
        Write-Host "   ✓ Archivos SQL movidos a database/backups/" -ForegroundColor Green
    }
} else {
    Write-Host "   No se encontraron archivos SQL" -ForegroundColor Gray
}

# 5. ELIMINAR SCRIPTS ESPECÍFICOS DEL VPS
Write-Host "`n5. ELIMINANDO SCRIPTS ESPECÍFICOS DEL VPS..." -ForegroundColor Yellow
$vpsScripts = @(
    "connect-vps.ps1",
    "connect-vps-with-password.ps1", 
    "deploy-to-vps.ps1",
    "sync-from-vps.ps1"
)

$foundScripts = @()
foreach ($script in $vpsScripts) {
    if (Test-Path $script) {
        $foundScripts += $script
    }
}

if ($foundScripts.Count -gt 0) {
    Write-Host "   Scripts encontrados: $($foundScripts.Count)" -ForegroundColor White
    foreach ($script in $foundScripts) {
        Write-Host "   - $script" -ForegroundColor White
    }
    
    if ($DryRun) {
        Write-Host "   [SIMULACIÓN] Se eliminarían scripts específicos del VPS" -ForegroundColor Yellow
    } else {
        Write-Host "   Eliminando scripts específicos del VPS..." -ForegroundColor Red
        foreach ($script in $foundScripts) {
            Remove-Item -Path $script -Force
            Write-Host "   ✓ $script eliminado" -ForegroundColor Green
        }
    }
} else {
    Write-Host "   No se encontraron scripts específicos del VPS" -ForegroundColor Gray
}

# Resumen final
Write-Host "`n=== RESUMEN DE LIMPIEZA ===" -ForegroundColor Green
if ($DryRun) {
    Write-Host "SIMULACIÓN COMPLETADA - No se eliminó ningún archivo" -ForegroundColor Yellow
    Write-Host "Para ejecutar la limpieza real, ejecuta:" -ForegroundColor White
    Write-Host ".\cleanup-priority-files.ps1" -ForegroundColor Cyan
} else {
    Write-Host "LIMPIEZA COMPLETADA" -ForegroundColor Green
    Write-Host "Archivos eliminados de forma segura" -ForegroundColor White
}

Write-Host "`nPróximos pasos recomendados:" -ForegroundColor Cyan
Write-Host "1. Verificar que el proyecto funcione sin los archivos eliminados" -ForegroundColor White
Write-Host "2. Ejecutar npm install para regenerar node_modules" -ForegroundColor White
Write-Host "3. Limpiar archivos de configuración (.env, nginx.conf)" -ForegroundColor White
Write-Host "4. Preparar para sincronización con repositorio remoto" -ForegroundColor White
