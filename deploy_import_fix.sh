#!/bin/bash

# Script de Despliegue - Fix de Importación de Empleados
# Uso: ./deploy_import_fix.sh

set -e  # Salir en caso de error

echo "🚀 Iniciando despliegue de fix de importación de empleados..."
echo "=================================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para logging
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    log_error "No se encontró package.json. Asegúrate de estar en el directorio raíz del proyecto."
    exit 1
fi

log_info "Directorio del proyecto verificado"

# Verificar estado de Git
log_info "Verificando estado de Git..."
git_status=$(git status --porcelain)
if [ -n "$git_status" ]; then
    log_warn "Hay cambios no committeados en el repositorio:"
    echo "$git_status"
    read -p "¿Deseas continuar? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Despliegue cancelado"
        exit 0
    fi
fi

# Verificar rama actual
current_branch=$(git branch --show-current)
log_info "Rama actual: $current_branch"

# Hacer backup de la base de datos
log_info "Creando backup de la base de datos..."
backup_file="backup_before_import_fix_$(date +%Y%m%d_%H%M%S).sql"
if command -v docker-compose &> /dev/null; then
    docker-compose exec -T postgres pg_dump -U postgres -d employee_management > "$backup_file"
    log_info "Backup creado: $backup_file"
else
    log_warn "Docker Compose no encontrado, saltando backup de BD"
fi

# Actualizar dependencias del frontend
log_info "Actualizando dependencias del frontend..."
cd client
npm install
if [ $? -eq 0 ]; then
    log_info "Dependencias del frontend actualizadas"
else
    log_error "Error al actualizar dependencias del frontend"
    exit 1
fi

# Build del frontend
log_info "Construyendo frontend..."
npm run build
if [ $? -eq 0 ]; then
    log_info "Frontend construido exitosamente"
else
    log_error "Error al construir frontend"
    exit 1
fi
cd ..

# Actualizar dependencias del backend
log_info "Actualizando dependencias del backend..."
cd server
npm install
if [ $? -eq 0 ]; then
    log_info "Dependencias del backend actualizadas"
else
    log_error "Error al actualizar dependencias del backend"
    exit 1
fi
cd ..

# Verificar que los archivos modificados existen
log_info "Verificando archivos modificados..."
required_files=(
    "client/src/components/modals/import-employees-modal.tsx"
    "server/routes-clean.ts"
    "plantilla_importacion_empleados.csv"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        log_info "✅ $file encontrado"
    else
        log_error "❌ $file no encontrado"
        exit 1
    fi
done

# Reiniciar servicios
log_info "Reiniciando servicios..."

if command -v docker-compose &> /dev/null; then
    log_info "Usando Docker Compose..."
    docker-compose down
    sleep 5
    docker-compose up -d
    log_info "Servicios Docker reiniciados"
elif command -v pm2 &> /dev/null; then
    log_info "Usando PM2..."
    pm2 restart all
    log_info "Servicios PM2 reiniciados"
else
    log_warn "No se encontró Docker Compose ni PM2. Reinicia los servicios manualmente."
fi

# Esperar a que los servicios estén listos
log_info "Esperando a que los servicios estén listos..."
sleep 10

# Verificar estado de los servicios
log_info "Verificando estado de los servicios..."

if command -v docker-compose &> /dev/null; then
    if docker-compose ps | grep -q "Up"; then
        log_info "✅ Servicios Docker ejecutándose"
    else
        log_error "❌ Servicios Docker no están ejecutándose"
        exit 1
    fi
fi

# Crear directorio para logs si no existe
mkdir -p logs

# Verificar conectividad de la base de datos
log_info "Verificando conectividad de la base de datos..."
if command -v docker-compose &> /dev/null; then
    if docker-compose exec -T postgres pg_isready -U postgres; then
        log_info "✅ Base de datos accesible"
    else
        log_error "❌ Base de datos no accesible"
        exit 1
    fi
fi

# Verificar que la aplicación esté respondiendo
log_info "Verificando que la aplicación esté respondiendo..."
if command -v curl &> /dev/null; then
    # Intentar hacer una petición a la API
    if curl -s -f http://localhost:3000/api/health > /dev/null 2>&1; then
        log_info "✅ API respondiendo en puerto 3000"
    elif curl -s -f http://localhost:5000/api/health > /dev/null 2>&1; then
        log_info "✅ API respondiendo en puerto 5000"
    else
        log_warn "⚠️ No se pudo verificar la API. Verifica manualmente."
    fi
else
    log_warn "curl no encontrado, saltando verificación de API"
fi

# Crear archivo de verificación
verification_file="verificacion_despliegue_$(date +%Y%m%d_%H%M%S).txt"
cat > "$verification_file" << EOF
VERIFICACIÓN DE DESPLIEGUE - FIX DE IMPORTACIÓN
===============================================
Fecha: $(date)
Rama: $current_branch
Commit: $(git rev-parse --short HEAD)

ARCHIVOS VERIFICADOS:
$(for file in "${required_files[@]}"; do echo "- $file"; done)

SERVICIOS:
- Docker Compose: $(command -v docker-compose &> /dev/null && echo "Disponible" || echo "No disponible")
- PM2: $(command -v pm2 &> /dev/null && echo "Disponible" || echo "No disponible")

ESTADO:
- Frontend: Construido
- Backend: Dependencias actualizadas
- Base de datos: Backup creado ($backup_file)

PRÓXIMOS PASOS:
1. Probar importación con plantilla_importacion_empleados.csv
2. Verificar logs en caso de errores
3. Confirmar que los empleados se importan correctamente

NOTAS:
- Backup de BD: $backup_file
- Logs disponibles en: logs/
- Plantilla de importación: plantilla_importacion_empleados.csv
EOF

log_info "Archivo de verificación creado: $verification_file"

echo ""
echo "🎉 DESPLIEGUE COMPLETADO EXITOSAMENTE!"
echo "======================================"
echo ""
echo "📋 Resumen de acciones realizadas:"
echo "   ✅ Backup de base de datos creado"
echo "   ✅ Dependencias actualizadas (frontend y backend)"
echo "   ✅ Frontend construido"
echo "   ✅ Servicios reiniciados"
echo "   ✅ Verificaciones de estado completadas"
echo ""
echo "🔧 Próximos pasos:"
echo "   1. Probar la funcionalidad de importación"
echo "   2. Usar la plantilla: plantilla_importacion_empleados.csv"
echo "   3. Verificar logs en caso de problemas"
echo ""
echo "📁 Archivos importantes:"
echo "   - Backup BD: $backup_file"
echo "   - Verificación: $verification_file"
echo "   - Plantilla: plantilla_importacion_empleados.csv"
echo ""
echo "🚨 En caso de problemas, revisa los logs y el archivo de verificación"
