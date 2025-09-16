# Script para sincronizar código del VPS con repositorio local
$vpsHost = "69.62.107.86"
$vpsUser = "root"
$vpsPassword = "Solucioning2020@@@@"
$remotePath = "/root/solucioning-deploy"
$localPath = "."

Write-Host "Iniciando sincronización desde VPS..." -ForegroundColor Green

# Función para ejecutar comandos en el VPS
function Invoke-VPSCommand {
    param([string]$Command)
    
    $plinkPath = "plink.exe"
    if (Get-Command $plinkPath -ErrorAction SilentlyContinue) {
        echo y | & $plinkPath -ssh -pw $vpsPassword $vpsUser@$vpsHost $Command
    } else {
        Write-Host "Plink no encontrado. Usando ssh..." -ForegroundColor Yellow
        # Crear expect script temporal
        $expectScript = @"
#!/usr/bin/expect -f
set timeout 30
spawn ssh $vpsUser@$vpsHost
expect "password:"
send "$vpsPassword\r"
expect "#"
send "$Command\r"
expect "#"
send "exit\r"
expect eof
"@
        $expectScript | Out-File -FilePath "temp_expect.exp" -Encoding ASCII
        expect temp_expect.exp
        Remove-Item temp_expect.exp -ErrorAction SilentlyContinue
    }
}

# Verificar conexión y obtener información del VPS
Write-Host "Verificando conexión al VPS..." -ForegroundColor Yellow
try {
    $result = Invoke-VPSCommand "cd $remotePath && pwd && ls -la"
    Write-Host "Conexión exitosa. Contenido del directorio:" -ForegroundColor Green
    Write-Host $result
} catch {
    Write-Host "Error al conectar al VPS: $_" -ForegroundColor Red
    exit 1
}

# Crear backup del código actual
Write-Host "Creando backup del código actual..." -ForegroundColor Yellow
$backupDir = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Copy-Item -Path "." -Destination $backupDir -Recurse -Exclude @("node_modules", ".git", "backup_*") -Force
Write-Host "Backup creado en: $backupDir" -ForegroundColor Green

# Descargar código del VPS usando rsync o scp
Write-Host "Descargando código del VPS..." -ForegroundColor Yellow
try {
    # Usar scp para descargar el directorio completo
    $scpCommand = "scp -r root@$vpsHost`:$remotePath/* ."
    Write-Host "Ejecutando: $scpCommand" -ForegroundColor Cyan
    
    # Crear script batch para scp con password
    $batchScript = @"
@echo off
echo $vpsPassword | scp -r root@$vpsHost`:$remotePath/* .
"@
    $batchScript | Out-File -FilePath "download_vps.bat" -Encoding ASCII
    & ".\download_vps.bat"
    Remove-Item "download_vps.bat" -ErrorAction SilentlyContinue
    
    Write-Host "Descarga completada" -ForegroundColor Green
} catch {
    Write-Host "Error en la descarga: $_" -ForegroundColor Red
    exit 1
}

# Descargar backup de base de datos
Write-Host "Descargando backup de base de datos..." -ForegroundColor Yellow
try {
    $dbBackupCommand = "scp root@$vpsHost`:/root/solucioning_bd_backup/* ./database/backups/"
    New-Item -ItemType Directory -Path "database/backups" -Force | Out-Null
    echo $vpsPassword | scp root@$vpsHost`:/root/solucioning_bd_backup/* ./database/backups/
    Write-Host "Backup de base de datos descargado" -ForegroundColor Green
} catch {
    Write-Host "Error descargando backup de BD: $_" -ForegroundColor Red
}

Write-Host "Sincronización completada. Revisar archivos descargados." -ForegroundColor Green
