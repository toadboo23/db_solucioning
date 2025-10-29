#!/bin/bash

echo "=== ACTUALIZANDO COMPANY-LEAVES EN VPS ==="

# Crear backup del archivo actual
cp /root/solucioning-deploy/client/src/pages/company-leaves.tsx /root/solucioning-deploy/client/src/pages/company-leaves.tsx.backup

echo "Backup creado exitosamente"

# Reiniciar frontend
echo "Reiniciando frontend..."
docker restart solucioning_frontend

echo "Frontend reiniciado"

# Verificar estado
echo "Verificando estado del frontend..."
docker ps --format "table {{.Names}}\t{{.Status}}" | grep solucioning_frontend

echo "=== ACTUALIZACIÓN COMPLETADA ==="
