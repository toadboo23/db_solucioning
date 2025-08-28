# Funciones útiles para trabajar con el VPS
# Cargar este archivo con: . .\vps-functions.ps1

# Conectar al VPS
function Connect-VPS {
    ssh vps-tickets
}

# Ejecutar comando en el VPS
function Invoke-VPSCommand {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Command
    )
    ssh vps-tickets $Command
}

# Verificar estado del VPS
function Get-VPSStatus {
    ssh vps-tickets "echo '=== Estado del VPS ===' && date && uptime && echo '=== Uso de disco ===' && df -h && echo '=== Uso de memoria ===' && free -h"
}

# Reiniciar servicios Docker
function Restart-VPSDocker {
    ssh vps-tickets "cd /root/solucioning-deploy && docker-compose restart"
}

# Ver logs de Docker
function Get-VPSDockerLogs {
    param(
        [string]$Service = ""
    )
    if ($Service) {
        ssh vps-tickets "cd /root/solucioning-deploy && docker-compose logs $Service"
    } else {
        ssh vps-tickets "cd /root/solucioning-deploy && docker-compose logs"
    }
}

# Hacer backup de la base de datos
function Backup-VPSDatabase {
    ssh vps-tickets "cd /root/solucioning-deploy && docker exec solucioning-deploy-db-1 pg_dump -U postgres -d employee_management > backup_$(date +%Y%m%d_%H%M%S).sql"
}

# Sincronizar cambios locales con el VPS
function Sync-VPSChanges {
    param(
        [string]$LocalPath = ".",
        [string]$RemotePath = "/root/solucioning-deploy"
    )
    scp -r $LocalPath vps-tickets:$RemotePath
}

# Ver procesos en el VPS
function Get-VPSProcesses {
    ssh vps-tickets "ps aux | head -20"
}

# Alias para comandos rápidos
Set-Alias -Name vps -Value Connect-VPS
Set-Alias -Name vps-cmd -Value Invoke-VPSCommand
Set-Alias -Name vps-status -Value Get-VPSStatus
Set-Alias -Name vps-restart -Value Restart-VPSDocker
Set-Alias -Name vps-logs -Value Get-VPSDockerLogs
Set-Alias -Name vps-backup -Value Backup-VPSDatabase
Set-Alias -Name vps-sync -Value Sync-VPSChanges
Set-Alias -Name vps-ps -Value Get-VPSProcesses

Write-Host "Funciones VPS cargadas. Usa 'Get-Help <nombre-función>' para más información." -ForegroundColor Green
Write-Host "Alias disponibles: vps, vps-cmd, vps-status, vps-restart, vps-logs, vps-backup, vps-sync, vps-ps" -ForegroundColor Yellow
