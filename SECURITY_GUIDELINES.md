# ðŸ”’ PROTECCIONES DE SEGURIDAD DEL REPOSITORIO

Este repositorio tiene configuradas mÃºltiples capas de protecciÃ³n para evitar que informaciÃ³n sensible o archivos innecesarios se suban a GitHub.

## ðŸ›¡ï¸ PROTECCIONES ACTIVAS

### 1. `.gitignore` - Primera lÃ­nea de defensa

El archivo `.gitignore` estÃ¡ configurado para ignorar automÃ¡ticamente:

**Archivos sensibles:**
- âœ… Variables de entorno (`.env`, `.env.local`, `.env.production`)
- âœ… Archivos CSV con datos de empleados (`*.csv`, `all_employees_*.csv`)
- âœ… Backups de base de datos (`*.sql`, `backup_*.sql`)
- âœ… Claves SSH (`vps-tickets`, `*.pem`, `*.key`)

**Archivos de desarrollo:**
- âœ… Scripts PowerShell de desarrollo (`*-vps.ps1`, `connect-*.ps1`, etc.)
- âœ… Scripts Python de desarrollo (`actualizar_*.py`, `crear_*.py`)
- âœ… Scripts de limpieza (`cleanup-*.ps1`, `fix-database.ps1`)
- âœ… Carpetas de backup (`backup_*/`)
- âœ… Docker data local (`docker-data/`)

### 2. Pre-commit Hook - Segunda lÃ­nea de defensa

Hay un hook de pre-commit instalado que **BLOQUEARÃ** automÃ¡ticamente cualquier intento de commit que incluya:

- ðŸš« Archivos `.csv` (datos sensibles)
- ðŸš« Archivos `.sql` (backups de BD)
- ðŸš« Archivos `.env` (variables de entorno)
- ðŸš« Claves SSH (`.pem`, `.key`, `vps-tickets`)
- ðŸš« Scripts de desarrollo local
- ðŸš« Carpetas de backup

**El commit serÃ¡ rechazado automÃ¡ticamente si intentas agregar estos archivos.**

### 3. GitHub Actions - Tercera lÃ­nea de defensa

El workflow de deployment en `.github/workflows/deploy.yml` estÃ¡ configurado para deployment automÃ¡tico solo desde la rama `main`, manteniendo separado el cÃ³digo de desarrollo.

## ðŸ“‹ QUÃ‰ HACER SI EL COMMIT ES BLOQUEADO

Si ves un mensaje como:
```
âŒ BLOQUEADO: archivo.csv (coincide con patrÃ³n: \.csv$)
ðŸš« COMMIT BLOQUEADO: Se detectaron archivos sensibles o innecesarios
```

**SoluciÃ³n:**

1. Elimina el archivo del staging area:
   ```bash
   git reset HEAD archivo.csv
   ```

2. Si el archivo debe ser ignorado permanentemente, verifica que estÃ© en `.gitignore`

3. Si necesitas el archivo en el repositorio (caso excepcional), consulta con el equipo primero

## ðŸ”§ CÃ“MO FUNCIONA EL HOOK

### InstalaciÃ³n automÃ¡tica

Los hooks ya estÃ¡n instalados en `.git/hooks/`:
- `pre-commit` - Para sistemas Unix/Linux/Mac
- `pre-commit.ps1` - Para Windows/PowerShell

### Desactivar temporalmente (NO RECOMENDADO)

Si **absolutamente necesitas** hacer un commit sin la verificaciÃ³n:
```bash
git commit --no-verify -m "mensaje"
```

âš ï¸ **ADVERTENCIA:** Solo usa esto en casos extremos y consultando con el equipo.

## ðŸ“ ARCHIVOS PERMITIDOS EN EL REPOSITORIO

Solo estos archivos deben estar en GitHub:

âœ… **CÃ³digo fuente:**
- Archivos TypeScript/JavaScript (`.ts`, `.tsx`, `.js`)
- Archivos de configuraciÃ³n de proyecto (`package.json`, `tsconfig.json`, etc.)
- Archivos de configuraciÃ³n Docker (`Dockerfile.*`, `docker-compose.yml`)

âœ… **ConfiguraciÃ³n:**
- `.gitignore`
- `.prettierrc`
- `eslint.config.js`
- `env.example` (plantilla SIN valores reales)

âœ… **Deployment:**
- `.github/workflows/deploy.yml`
- `nginx.conf`

## ðŸš¨ REPORTAR PROBLEMAS

Si encuentras archivos sensibles en el repositorio:

1. **NO** hagas pull de esos cambios
2. Notifica inmediatamente al equipo
3. Se procederÃ¡ a limpiar el historial de Git si es necesario

## ðŸ“š RECURSOS ADICIONALES

- [DocumentaciÃ³n de .gitignore](https://git-scm.com/docs/gitignore)
- [Git Hooks Documentation](https://git-scm.com/docs/githooks)

---

**Ãšltima actualizaciÃ³n:** 2025-09-30
**Mantenedor:** Equipo de Desarrollo Solucioning
