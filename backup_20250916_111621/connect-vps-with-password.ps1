# Script para conectar al VPS con contraseña
$password = "?2Lr7/g2lWc6;2y&oLAb"
$username = "root"
$hostname = "69.62.107.86"

# Crear un objeto SecureString con la contraseña
$securePassword = ConvertTo-SecureString $password -AsPlainText -Force

# Crear credenciales
$credentials = New-Object System.Management.Automation.PSCredential($username, $securePassword)

# Conectar usando SSH con expect (si está disponible) o usando plink
try {
    # Intentar con plink (PuTTY Link) si está disponible
    if (Get-Command plink -ErrorAction SilentlyContinue) {
        echo y | plink -ssh -pw $password $username@$hostname
    } else {
        # Si plink no está disponible, usar ssh con expect
        Write-Host "Conectando a $hostname como $username..."
        ssh -o StrictHostKeyChecking=no $username@$hostname
    }
} catch {
    Write-Host "Error al conectar: $($_.Exception.Message)"
    Write-Host "Intentando conexión manual..."
    ssh $username@$hostname
}
