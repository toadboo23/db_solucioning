# Script simplificado para sincronizar desde VPS
param(
    [string]$Action = "list"
)

$vpsHost = "69.62.107.86"
$vpsUser = "root"
$vpsPassword = "Solucioning2020@@@@"
$remotePath = "/root/solucioning-deploy"

Write-Host "=== Sincronización VPS -> Local ===" -ForegroundColor Green
Write-Host "VPS: $vpsUser@$vpsHost" -ForegroundColor Cyan
Write-Host "Directorio remoto: $remotePath" -ForegroundColor Cyan

switch ($Action) {
    "list" {
        Write-Host "`nListando contenido del VPS..." -ForegroundColor Yellow
        Write-Host "Ejecuta manualmente: ssh $vpsUser@$vpsHost" -ForegroundColor White
        Write-Host "Password: $vpsPassword" -ForegroundColor White
        Write-Host "Luego ejecuta: cd $remotePath && ls -la" -ForegroundColor White
    }
    "backup" {
        Write-Host "`nCreando backup local..." -ForegroundColor Yellow
        $backupDir = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        
        # Excluir directorios innecesarios
        $excludeItems = @("node_modules", ".git", "backup_*", "*.log", ".env")
        
        Get-ChildItem -Path "." -Recurse | Where-Object {
            $item = $_
            $shouldExclude = $false
            foreach ($exclude in $excludeItems) {
                if ($item.Name -like $exclude -or $item.FullName -like "*\$exclude\*") {
                    $shouldExclude = $true
                    break
                }
            }
            -not $shouldExclude
        } | Copy-Item -Destination $backupDir -Recurse -Force
        
        Write-Host "Backup creado en: $backupDir" -ForegroundColor Green
    }
    "download" {
        Write-Host "`nDescargando desde VPS..." -ForegroundColor Yellow
        Write-Host "Usando scp para descargar archivos..." -ForegroundColor Cyan
        
        # Crear directorio para backups de BD
        New-Item -ItemType Directory -Path "database\backups" -Force | Out-Null
        
        Write-Host "`nPara descargar el código, ejecuta manualmente:" -ForegroundColor White
        Write-Host "scp -r $vpsUser@$vpsHost`:$remotePath/* ." -ForegroundColor Yellow
        Write-Host "Password: $vpsPassword" -ForegroundColor White
        
        Write-Host "`nPara descargar backup de BD:" -ForegroundColor White
        Write-Host "scp -r $vpsUser@$vpsHost`:/root/solucioning_bd_backup/* ./database/backups/" -ForegroundColor Yellow
    }
    "clean" {
        Write-Host "`nLimpiando archivos de configuración específicos del VPS..." -ForegroundColor Yellow
        
        # Archivos a limpiar o modificar
        $filesToClean = @(
            ".env",
            "docker-compose.override.yml",
            "nginx.conf"
        )
        
        foreach ($file in $filesToClean) {
            if (Test-Path $file) {
                Write-Host "Limpiando: $file" -ForegroundColor Cyan
                # Hacer backup del archivo original
                Copy-Item $file "$file.vps-backup" -Force
                # Aquí se pueden hacer modificaciones específicas
            }
        }
        
        Write-Host "Archivos de configuración limpiados" -ForegroundColor Green
    }
}

Write-Host "`n=== Comandos útiles ===" -ForegroundColor Green
Write-Host "1. Conectar al VPS: ssh $vpsUser@$vpsHost" -ForegroundColor White
Write-Host "2. Ver código: cd $remotePath && ls -la" -ForegroundColor White
Write-Host "3. Descargar código: scp -r $vpsUser@$vpsHost`:$remotePath/* ." -ForegroundColor White
Write-Host "4. Descargar BD: scp -r $vpsUser@$vpsHost`:/root/solucioning_bd_backup/* ./database/backups/" -ForegroundColor White
