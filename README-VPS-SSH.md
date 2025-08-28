# Configuración SSH sin contraseña para VPS

## ✅ Configuración Completada

Tu conexión SSH al VPS está configurada y funcionando correctamente sin necesidad de contraseña.

## 🔧 Configuración Actual

### Claves SSH
- **Clave privada**: `~/.ssh/vps-tickets`
- **Clave pública**: `~/.ssh/vps-tickets.pub`
- **Host**: `vps-tickets` (alias para `69.62.107.86`)
- **Usuario**: `root`

### Configuración SSH
- **Archivo de configuración**: `~/.ssh/config`
- **Optimizaciones**: Compresión, keep-alive, timeouts
- **Conexión**: Funcionando sin contraseña

### Funciones PowerShell
- **Archivo**: `vps-functions.ps1`
- **Ubicación**: `$env:USERPROFILE\Documents\WindowsPowerShell\`
- **Carga automática**: Configurada en el perfil de PowerShell

## 🚀 Comandos Disponibles

### Conexión básica
```powershell
vps                    # Conectar al VPS
ssh vps-tickets        # Conexión directa SSH
```

### Gestión del sistema
```powershell
vps-status            # Ver estado del VPS (CPU, memoria, disco)
vps-ps                # Ver procesos en el VPS
vps-cmd "comando"     # Ejecutar comando específico
```

### Gestión de Docker
```powershell
vps-restart           # Reiniciar servicios Docker
vps-logs              # Ver logs de todos los servicios
vps-logs backend      # Ver logs de un servicio específico
```

### Base de datos
```powershell
vps-backup            # Hacer backup de la base de datos
```

### Sincronización
```powershell
vps-sync              # Sincronizar cambios locales con el VPS
```

## 📋 Ejemplos de Uso

### Verificar estado del sistema
```powershell
vps-status
```

### Reiniciar servicios después de cambios
```powershell
vps-restart
```

### Ver logs en tiempo real
```powershell
vps-logs backend --follow
```

### Ejecutar comando personalizado
```powershell
vps-cmd "docker system df"
```

### Hacer backup de la base de datos
```powershell
vps-backup
```

## 🔄 Carga Automática

Las funciones se cargan automáticamente al iniciar PowerShell. Si necesitas cargarlas manualmente:

```powershell
. .\vps-functions.ps1
```

## 📁 Archivos de Configuración

- **SSH Config**: `~/.ssh/config`
- **Funciones VPS**: `$env:USERPROFILE\Documents\WindowsPowerShell\vps-functions.ps1`
- **Perfil PowerShell**: `$env:USERPROFILE\Documents\WindowsPowerShell\profile.ps1`

## 🛠️ Solución de Problemas

### Si la conexión SSH falla
1. Verificar que la clave SSH existe: `ls ~/.ssh/vps-tickets`
2. Verificar permisos de la clave: `icacls ~/.ssh/vps-tickets`
3. Probar conexión manual: `ssh vps-tickets "echo test"`

### Si las funciones no están disponibles
1. Cargar manualmente: `. .\vps-functions.ps1`
2. Verificar perfil: `Test-Path $PROFILE.CurrentUserAllHosts`
3. Reiniciar PowerShell

### Si el VPS no responde
1. Verificar estado: `vps-status`
2. Verificar servicios: `vps-cmd "docker-compose ps"`
3. Reiniciar servicios: `vps-restart`

## 🎯 Beneficios de esta Configuración

✅ **Sin contraseñas**: Conexión automática y segura  
✅ **Comandos rápidos**: Funciones optimizadas para tareas comunes  
✅ **Carga automática**: Funciones disponibles en cada sesión  
✅ **Optimizada**: Configuración SSH con compresión y keep-alive  
✅ **Segura**: Uso de claves SSH en lugar de contraseñas  

## 📞 Soporte

Si necesitas ayuda adicional:
1. Verificar la documentación del proyecto
2. Revisar los logs del sistema
3. Contactar al administrador del sistema
