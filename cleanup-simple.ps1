# Script simple para limpiar archivos innecesarios
Write-Host "=== LIMPIEZA DE ARCHIVOS INNECESARIOS ===" -ForegroundColor Green

# 1. Eliminar node_modules
Write-Host "`n1. Eliminando node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    $size = (Get-ChildItem -Path "node_modules" -Recurse | Measure-Object -Property Length -Sum).Sum
    $sizeMB = [math]::Round($size / 1MB, 2)
    Write-Host "   Tamaño: $sizeMB MB" -ForegroundColor White
    Remove-Item -Path "node_modules" -Recurse -Force
    Write-Host "   ✓ node_modules eliminado" -ForegroundColor Green
} else {
    Write-Host "   node_modules no encontrado" -ForegroundColor Gray
}

# 2. Eliminar archivos de claves SSH
Write-Host "`n2. Eliminando archivos de claves SSH..." -ForegroundColor Yellow
$sshFiles = Get-ChildItem -Path "." -Filter "vps-*"
if ($sshFiles.Count -gt 0) {
    Write-Host "   Archivos encontrados: $($sshFiles.Count)" -ForegroundColor White
    foreach ($file in $sshFiles) {
        Write-Host "   - $($file.Name)" -ForegroundColor White
    }
    Remove-Item -Path "vps-*" -Force
    Write-Host "   ✓ Archivos de claves SSH eliminados" -ForegroundColor Green
} else {
    Write-Host "   No se encontraron archivos vps-*" -ForegroundColor Gray
}

# 3. Eliminar archivos temporales
Write-Host "`n3. Eliminando archivos temporales..." -ForegroundColor Yellow
$logFiles = Get-ChildItem -Path "." -Filter "*.log"
$tmpFiles = Get-ChildItem -Path "." -Filter "*.tmp"
$totalTempFiles = $logFiles.Count + $tmpFiles.Count

if ($totalTempFiles -gt 0) {
    Write-Host "   Archivos temporales encontrados: $totalTempFiles" -ForegroundColor White
    Remove-Item -Path "*.log", "*.tmp" -Force -ErrorAction SilentlyContinue
    Write-Host "   ✓ Archivos temporales eliminados" -ForegroundColor Green
} else {
    Write-Host "   No se encontraron archivos temporales" -ForegroundColor Gray
}

# 4. Organizar archivos SQL
Write-Host "`n4. Organizando archivos de backup SQL..." -ForegroundColor Yellow
$sqlFiles = Get-ChildItem -Path "." -Filter "*.sql"
if ($sqlFiles.Count -gt 0) {
    $sqlSize = ($sqlFiles | Measure-Object -Property Length -Sum).Sum
    $sqlSizeMB = [math]::Round($sqlSize / 1MB, 2)
    Write-Host "   Archivos SQL encontrados: $($sqlFiles.Count) ($sqlSizeMB MB)" -ForegroundColor White
    
    # Crear directorio de backups
    if (-not (Test-Path "database/backups")) {
        New-Item -ItemType Directory -Path "database/backups" -Force | Out-Null
        Write-Host "   Directorio database/backups creado" -ForegroundColor Cyan
    }
    
    Move-Item -Path "*.sql" -Destination "database/backups/" -Force
    Write-Host "   ✓ Archivos SQL movidos a database/backups/" -ForegroundColor Green
} else {
    Write-Host "   No se encontraron archivos SQL" -ForegroundColor Gray
}

# 5. Eliminar scripts específicos del VPS
Write-Host "`n5. Eliminando scripts específicos del VPS..." -ForegroundColor Yellow
$vpsScripts = @("connect-vps.ps1", "connect-vps-with-password.ps1", "deploy-to-vps.ps1", "sync-from-vps.ps1")
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
        Remove-Item -Path $script -Force
    }
    Write-Host "   ✓ Scripts específicos del VPS eliminados" -ForegroundColor Green
} else {
    Write-Host "   No se encontraron scripts específicos del VPS" -ForegroundColor Gray
}

Write-Host "`n=== LIMPIEZA COMPLETADA ===" -ForegroundColor Green
Write-Host "Archivos eliminados de forma segura" -ForegroundColor White
Write-Host "`nPróximos pasos:" -ForegroundColor Cyan
Write-Host "1. Ejecutar npm install para regenerar node_modules" -ForegroundColor White
Write-Host "2. Limpiar archivos de configuración" -ForegroundColor White
Write-Host "3. Preparar para sincronización con repositorio" -ForegroundColor White
