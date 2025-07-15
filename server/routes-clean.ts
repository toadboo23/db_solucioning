import type { Express } from 'express';
import { createServer, type Server } from 'http';
import { PostgresStorage, getEmpleadoMetadata } from './storage-postgres.js';
import { setupAuth, isAuthenticated } from './auth-local.js';
import { AuditService } from './audit-service.js';
// XLSX import removed as it's not used in this file

// Extender la interfaz Request para incluir el usuario
declare global {
  namespace Express {
    interface Request {
      user?: {
        id?: string;
        email?: string;
        firstName?: string;
        lastName?: string;
        role?: string;
        ciudad?: string;
      };
    }
  }
}

const storage = new PostgresStorage();

export async function registerRoutes (app: Express): Promise<Server> {
  if (process.env.NODE_ENV !== 'production') console.log('🚀 Setting up routes...');

  // Setup authentication first
  await setupAuth(app);

  // Health check
  app.get('/api/health', (req, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('❤️ Health check');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Dashboard metrics (protected)
  app.get('/api/dashboard/metrics', isAuthenticated, async (req, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('📊 Dashboard metrics request');
    try {
      const user = req.user as { role?: string; email?: string };
      if (user?.role === 'normal') {
        return res.status(403).json({ message: 'No tienes permisos para ver el dashboard' });
      }
      const metrics = await storage.getDashboardMetrics();

      // Solo el super admin puede ver las notificaciones pendientes
      if (user?.role !== 'super_admin') {
        metrics.pendingActions = 0; // Ocultar notificaciones pendientes para otros roles
      }

      // Log dashboard access
      await AuditService.logAction({
        userId: user?.email || '',
        userRole: (user.role as 'super_admin' | 'admin') || 'normal',
        action: 'access_dashboard',
        entityType: 'dashboard',
        description: `Acceso al dashboard - Usuario: ${user.email}`,
        newData: { metrics },
      });

      res.json(metrics);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error fetching dashboard metrics:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard metrics' });
    }
  });

  // Get unique cities for filters (protected)
  app.get('/api/cities', isAuthenticated, async (req, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('🏙️ Unique cities request');
    try {
      const cities = await storage.getUniqueCities();
      res.json(cities);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error fetching cities:', error);
      res.status(500).json({ message: 'Failed to fetch cities' });
    }
  });

  // Get unique fleets for filters (protected) - REMOVED as fleets are no longer used
  // app.get('/api/fleets', isAuthenticated, async (req, res) => {
  //   if (process.env.NODE_ENV !== 'production') console.log('🛳️ Unique fleets request');
  //   try {
  //     const fleets = await storage.getUniqueFleets();
  //     res.json(fleets);
  //   } catch (error) {
  //     if (process.env.NODE_ENV !== 'production') console.error('❌ Error fetching fleets:', error);
  //     res.status(500).json({ message: 'Failed to fetch fleets' });
  //   }
  // });

  // Get unique cities for filters (protected)
  app.get('/api/ciudades', isAuthenticated, async (req, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('🏙️ Unique cities request');
    try {
      const ciudades = await storage.getUniqueCities();
      res.json(ciudades);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error fetching cities:', error);
      res.status(500).json({ message: 'Failed to fetch cities' });
    }
  });

  // Employees list (protected)
  app.get('/api/employees', isAuthenticated, async (req, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('👥 Employees list request with filters:', req.query);
    try {
      const { city, status, search, userCity } = req.query;
      const user = req.user as { role?: string; ciudad?: string; email?: string };

      let employees = await storage.getAllEmployees();

      // Si el usuario no es super_admin, filtrar por su ciudad asignada (case-insensitive)
      if (user?.role !== 'super_admin' && typeof user?.ciudad === 'string') {
        const userCityLower = user.ciudad.toLowerCase();
        employees = employees.filter(emp => (emp.ciudad || '').toLowerCase() === userCityLower);
        if (process.env.NODE_ENV !== 'production') console.log(`🔒 Filtrando empleados por ciudad del usuario: ${user.ciudad}`);
      }

      // Apply filters (case-insensitive)
      if (typeof city === 'string' && city !== 'all') {
        const cityLower = city.toLowerCase();
        employees = employees.filter(emp => (emp.ciudad || '').toLowerCase() === cityLower);
      }

      if (status && status !== 'all') {
        employees = employees.filter(emp => emp.status === status);
      }

      if (search) {
        const searchTerm = search.toString().toLowerCase();
        employees = employees.filter(emp =>
          emp.nombre?.toLowerCase().includes(searchTerm) ||
          emp.apellido?.toLowerCase().includes(searchTerm) ||
          emp.telefono?.includes(searchTerm) ||
          emp.email?.toLowerCase().includes(searchTerm),
        );
      }

      // Log employee list access
      await AuditService.logAction({
        userId: user?.email || '',
        userRole: (user.role as 'super_admin' | 'admin' | 'normal') || 'normal',
        action: 'view_employees',
        entityType: 'employee',
        description: `Consulta de empleados - Usuario: ${user?.email || ''} - Filtros: ciudad=${city || 'all'}, status=${status || 'all'}, search=${search || 'none'}`,
        newData: { 
          totalEmployees: employees.length,
          filters: { city, status, search },
          userCity: user.ciudad 
        },
      });

      res.json(employees);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error fetching employees:', error);
      res.status(500).json({ message: 'Failed to fetch employees' });
    }
  });

  // Create employee (protected - admin/super_admin only)
  app.post('/api/employees', isAuthenticated, async (req, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('➕ Create employee request');
    try {
      const user = req.user as { email?: string; role?: string };
      if (user?.role === 'normal') {
        return res.status(403).json({ message: 'No tienes permisos para crear empleados' });
      }

      const employeeData = req.body as Record<string, unknown>;
      // Capitalizar ciudad si existe
      if (employeeData.ciudad && typeof employeeData.ciudad === 'string') {
        employeeData.ciudad = employeeData.ciudad.charAt(0).toUpperCase() + employeeData.ciudad.slice(1).toLowerCase();
      }
      const employee = await storage.createEmployee(employeeData as any);

      // Log audit
      await AuditService.logAction({
        userId: user?.email || '',
        userRole: (user.role as 'super_admin' | 'admin') || 'normal',
        action: 'create_employee',
        entityType: 'employee',
        entityId: employee.idGlovo,
        entityName: `${employee.nombre} ${employee.apellido}`,
        description: `Empleado creado: ${employee.nombre} ${employee.apellido} (${employee.idGlovo})`,
        newData: employee,
      });

      res.status(201).json(employee);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error creating employee:', error);
      res.status(500).json({ message: 'Failed to create employee' });
    }
  });

  // Update employee (protected - admin/super_admin only)
  app.put('/api/employees/:id', isAuthenticated, async (req, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('✏️ Update employee request');
    try {
      const user = req.user as { email?: string; role?: string };
      if (user?.role === 'normal') {
        return res.status(403).json({ message: 'No tienes permisos para editar empleados' });
      }

      const { id } = req.params;
      const employeeData = req.body as Record<string, unknown>;
      // Capitalizar ciudad si existe
      if (employeeData.ciudad && typeof employeeData.ciudad === 'string') {
        employeeData.ciudad = employeeData.ciudad.charAt(0).toUpperCase() + employeeData.ciudad.slice(1).toLowerCase();
      }
      // Get old data for audit
      const oldEmployee = await storage.getEmployee(id);
      const employee = await storage.updateEmployee(id, employeeData as Record<string, unknown>);

      // Determinar si se está reactivando desde baja IT
      const isReactivatingFromItLeave = oldEmployee?.status === 'it_leave' && 
                                       employeeData.status === 'active';
      
      // Crear mensaje de auditoría más descriptivo
      let auditDescription = `Empleado actualizado: ${employee.nombre} ${employee.apellido} (${employee.idGlovo})`;
      
      if (isReactivatingFromItLeave) {
        const hoursRestored = oldEmployee?.originalHours || 0;
        auditDescription = `Empleado REACTIVADO desde baja IT: ${employee.nombre} ${employee.apellido} (${employee.idGlovo}) - Horas restauradas: ${hoursRestored}`;
      }

      // Log audit
      await AuditService.logAction({
        userId: user?.email || '',
        userRole: (user.role as 'super_admin' | 'admin') || 'normal',
        action: isReactivatingFromItLeave ? 'reactivate_employee_from_it_leave' : 'update_employee',
        entityType: 'employee',
        entityId: employee.idGlovo,
        entityName: `${employee.nombre} ${employee.apellido}`,
        description: auditDescription,
        oldData: oldEmployee,
        newData: employee,
      });

      res.json(employee);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error updating employee:', error);
      res.status(500).json({ message: 'Failed to update employee' });
    }
  });

  // Delete employee (protected - super_admin only)
  app.delete('/api/employees/:id', isAuthenticated, async (req, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('🗑️ Delete employee request');
    try {
      const user = req.user as { role?: string };
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Solo el super admin puede eliminar empleados' });
      }

      const { id } = req.params;

      // Get employee data for audit
      const employee = await storage.getEmployee(id);
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      await storage.deleteEmployee(id);

      // Log audit
      await AuditService.logAction({
        userId: (user as { email?: string }).email || '',
        userRole: (user.role as 'super_admin' | 'admin') || 'normal',
        action: 'delete_employee',
        entityType: 'employee',
        entityId: employee.idGlovo,
        entityName: `${employee.nombre} ${employee.apellido}`,
        description: `Empleado eliminado: ${employee.nombre} ${employee.apellido} (${employee.idGlovo})`,
        oldData: employee,
      });

      res.status(204).send();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error deleting employee:', error);
      res.status(500).json({ message: 'Failed to delete employee' });
    }
  });

  // Delete all employees (protected - super_admin only)
  app.delete('/api/employees/all', isAuthenticated, async (req: { user?: { email?: string; role?: string } }, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('🗑️ Delete all employees request');
    try {
      const user = req.user as { role?: string };
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Solo el super admin puede eliminar todos los empleados' });
      }

      // Get count for audit
      const employees = await storage.getAllEmployees();

      await storage.clearAllEmployees();

      // Log audit
      await AuditService.logAction({
        userId: (user as { email?: string }).email || '',
        userRole: (user.role as 'super_admin' | 'admin') || 'normal',
        action: 'delete_all_employees',
        entityType: 'employee',
        description: `Todos los empleados eliminados (${employees.length} empleados)`,
        oldData: { count: employees.length },
      });

      res.status(204).send();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error deleting all employees:', error);
      res.status(500).json({ message: 'Failed to delete all employees' });
    }
  });

  // Bulk import employees (protected - super_admin only)
  app.post('/api/employees/bulk-import', isAuthenticated, async (req: { user?: { email?: string; role?: string }; body: { employees: Record<string, unknown>[]; dryRun?: boolean } }, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('📥 Bulk import employees request');
    try {
      const user = req.user as { email?: string; role?: string };
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Solo el super admin puede importar empleados' });
      }

      const { employees, dryRun = false } = req.body;

      if (!Array.isArray(employees) || employees.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input: employees must be a non-empty array',
        });
      }

      // Process and validate employees
      const processedEmployees = employees.map((emp: Record<string, unknown>, index: number) => {
        const processString = (stringValue: unknown): string | undefined => {
          if (!stringValue) return undefined;
          const processed = String(stringValue).trim();
          return processed === '' ? undefined : processed;
        };

        const processNumber = (numberValue: unknown): number | undefined => {
          if (numberValue === null || numberValue === undefined || numberValue === '') return undefined;
          const num = Number(numberValue);
          return isNaN(num) ? undefined : Math.round(num); // Convertir a entero
        };

        const processDate = (dateValue: unknown): string | undefined => {
          if (!dateValue) return undefined;
          try {
            const date = new Date(dateValue as string | number | Date);
            if (isNaN(date.getTime())) return undefined;
            return date.toISOString().split('T')[0]; // YYYY-MM-DD format
          } catch {
            return undefined;
          }
        };

        const processBoolean = (boolValue: unknown): boolean => {
          if (typeof boolValue === 'boolean') return boolValue;
          if (typeof boolValue === 'string') {
            const lower = boolValue.toLowerCase();
            return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'sí';
          }
          return false;
        };

        const horas = processNumber(emp.horas);
        const cdp = horas ? Math.round((horas / 38) * 100) : 0;

        return {
          idGlovo: processString(emp.idGlovo) || `TEMP_${index}`,
          emailGlovo: processString(emp.emailGlovo),
          turno: processString(emp.turno),
          nombre: processString(emp.nombre) || 'Sin Nombre',
          apellido: processString(emp.apellido),
          telefono: processString(emp.telefono) || 'Sin Teléfono',
          email: processString(emp.email),
          horas: horas,
          cdp: cdp,
          complementaries: processString(emp.complementaries),
          ciudad: processString(emp.ciudad),
          cityCode: processString(emp.cityCode),
          flota: processString(emp.flota),
          dniNie: processString(emp.dniNie),
          iban: processString(emp.iban),
          direccion: processString(emp.direccion),
          vehiculo: processString(emp.vehiculo) as 'Bicicleta' | 'Patinete' | 'Moto' | 'Otro' | undefined,
          naf: processString(emp.naf),
          fechaAltaSegSoc: processDate(emp.fechaAltaSegSoc),
          statusBaja: processString(emp.statusBaja),
          estadoSs: processString(emp.estadoSs),
          informadoHorario: processBoolean(emp.informadoHorario),
          cuentaDivilo: processString(emp.cuentaDivilo),
          proximaAsignacionSlots: processDate(emp.proximaAsignacionSlots),
          jefeTrafico: processString(emp.jefeTrafico),
          comentsJefeDeTrafico: processString(emp.comentsJefeDeTrafico),
          incidencias: processString(emp.incidencias),
          fechaIncidencia: processDate(emp.fechaIncidencia),
          faltasNoCheckInEnDias: processNumber(emp.faltasNoCheckInEnDias) || 0,
          cruce: processString(emp.cruce),
          status: (processString(emp.status) as 'active' | 'it_leave' | 'company_leave_pending' | 'company_leave_approved' | 'pending_laboral' | 'pendiente_laboral' | 'penalizado') || 'active',
        };
      });

      // Validate required fields
      const errors: string[] = [];
      processedEmployees.forEach((emp, index) => {
        if (!emp.idGlovo || emp.idGlovo === `TEMP_${index}`) {
          errors.push(`Fila ${index + 2}: ID Glovo es requerido`);
        }
        if (!emp.nombre || emp.nombre === 'Sin Nombre') {
          errors.push(`Fila ${index + 2}: Nombre es requerido`);
        }
        if (!emp.telefono || emp.telefono === 'Sin Teléfono') {
          errors.push(`Fila ${index + 2}: Teléfono es requerido`);
        }
      });

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Errores de validación encontrados',
          errors,
        });
      }

      // Si es dryRun, solo devolver validación sin importar
      if (dryRun) {
        return res.json({
          success: true,
          message: 'Vista previa completada',
          validEmployees: processedEmployees,
          invalidEmployees: [],
          validationErrors: errors,
        });
      }

      // Import employees
      if (process.env.NODE_ENV !== 'production') console.log('📥 Starting bulk import with', processedEmployees.length, 'employees');
      
      const createdEmployees = await storage.bulkCreateEmployees(processedEmployees);

      if (process.env.NODE_ENV !== 'production') console.log('✅ Bulk import completed successfully');

      // Crear notificación para la importación masiva
      const notificationData = {
        type: 'bulk_upload' as const,
        title: 'Importación Masiva de Empleados',
        message: `Se han importado ${createdEmployees.length} empleados correctamente desde archivo Excel.`,
        requestedBy: user.email || '',
        status: 'processed' as const,
        metadata: {
          employeeCount: createdEmployees.length,
          importType: 'bulk_upload',
          employees: createdEmployees.map(emp => getEmpleadoMetadata(emp)),
        },
      };

      const notification = await storage.createNotification(notificationData);

      // Log audit
      await AuditService.logAction({
        userId: user.email || '',
        userRole: (user.role as 'super_admin' | 'admin') || 'normal',
        action: 'bulk_import_employees',
        entityType: 'employee',
        description: `Importación masiva de empleados: ${createdEmployees.length} empleados importados`,
        newData: { count: createdEmployees.length, employees: createdEmployees },
      });

      res.json({
        success: true,
        message: `Se importaron ${createdEmployees.length} empleados correctamente`,
        employees: createdEmployees,
      });
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error in bulk import:', error);
      res.status(500).json({
        success: false,
        message: 'Error al importar empleados',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Employee penalization (protected - admin/super_admin only)
  app.post('/api/employees/:id/penalize', isAuthenticated, async (req: any, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('⚠️ Penalize employee request');
    try {
      const user = req.user as { email?: string; role?: string };
      if (user?.role === 'normal') {
        return res.status(403).json({ message: 'No tienes permisos para penalizar empleados' });
      }

      const { id } = req.params;
      const { startDate, endDate, observations } = req.body;

      // Validate required fields
      if (!startDate || !endDate || !observations) {
        return res.status(400).json({ message: 'startDate, endDate y observations son requeridos' });
      }

      // Get employee data for audit
      const employee = await storage.getEmployee(id);
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      const penalizedEmployee = await storage.penalizeEmployee(id, startDate, endDate, observations);

      // Log audit
      await AuditService.logAction({
        userId: user.email || '',
        userRole: (user.role as 'super_admin' | 'admin') || 'normal',
        action: 'penalize_employee',
        entityType: 'employee',
        entityId: employee.idGlovo,
        entityName: `${employee.nombre} ${employee.apellido}`,
        description: `Empleado penalizado: ${employee.nombre} ${employee.apellido} (${employee.idGlovo}) desde ${startDate} hasta ${endDate}`,
        oldData: employee,
        newData: penalizedEmployee,
      });

      res.json(penalizedEmployee);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error penalizing employee:', error);
      res.status(500).json({ message: 'Failed to penalize employee' });
    }
  });

  app.post('/api/employees/:id/remove-penalization', isAuthenticated, async (req: any, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('✅ Remove employee penalization request');
    try {
      const user = req.user as { email?: string; role?: string };
      if (user?.role === 'normal') {
        return res.status(403).json({ message: 'No tienes permisos para remover penalizaciones' });
      }

      const { id } = req.params;

      // Get employee data for audit
      const employee = await storage.getEmployee(id);
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      const updatedEmployee = await storage.removePenalization(id);

      // Log audit
      await AuditService.logAction({
        userId: user.email || '',
        userRole: (user.role as 'super_admin' | 'admin') || 'normal',
        action: 'remove_employee_penalization',
        entityType: 'employee',
        entityId: employee.idGlovo,
        entityName: `${employee.nombre} ${employee.apellido}`,
        description: `Penalización removida del empleado: ${employee.nombre} ${employee.apellido} (${employee.idGlovo})`,
        oldData: employee,
        newData: updatedEmployee,
      });

      res.json(updatedEmployee);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error removing employee penalization:', error);
      res.status(500).json({ message: 'Failed to remove employee penalization' });
    }
  });

  // Check and restore expired penalizations (protected - admin/super_admin only)
  app.post('/api/employees/check-expired-penalizations', isAuthenticated, async (req: any, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('🔍 Check expired penalizations request');
    try {
      const user = req.user as { email?: string; role?: string };
      if (user?.role === 'normal') {
        return res.status(403).json({ message: 'No tienes permisos para verificar penalizaciones expiradas' });
      }

      const result = await storage.checkAndRestoreExpiredPenalizations();

      // Log audit
      await AuditService.logAction({
        userId: user.email || '',
        userRole: (user.role as 'super_admin' | 'admin') || 'normal',
        action: 'check_expired_penalizations',
        entityType: 'system',
        entityId: 'penalizations',
        entityName: 'Sistema de Penalizaciones',
        description: `Verificación automática de penalizaciones expiradas: ${result.checked} verificadas, ${result.restored} restauradas`,
        oldData: { checked: result.checked },
        newData: { restored: result.restored, restoredEmployees: result.restoredEmployees },
      });

      res.json({
        message: 'Verificación de penalizaciones expiradas completada',
        ...result,
      });
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error checking expired penalizations:', error);
      res.status(500).json({ message: 'Failed to check expired penalizations' });
    }
  });

  // Get penalizations expiring soon (protected - admin/super_admin only)
  app.get('/api/employees/penalizations/expiring-soon', isAuthenticated, async (req: any, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('⏳ Get expiring penalizations request');
    try {
      const user = req.user as { email?: string; role?: string };
      if (user?.role === 'normal') {
        return res.status(403).json({ message: 'No tienes permisos para ver penalizaciones por expirar' });
      }

      const days = parseInt(req.query.days as string) || 7;
      const expiringPenalizations = await storage.getPenalizationsExpiringSoon(days);

      res.json({
        message: 'Penalizaciones por expirar obtenidas',
        expiringPenalizations,
        days,
      });
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error getting expiring penalizations:', error);
      res.status(500).json({ message: 'Failed to get expiring penalizations' });
    }
  });

  // Company leaves (protected)
  app.get('/api/company-leaves', isAuthenticated, async (req, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('🏢 Company leaves request');
    try {
      const leaves = await storage.getAllCompanyLeaves();
      res.json(leaves);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error fetching company leaves:', error);
      res.status(500).json({ message: 'Failed to fetch company leaves' });
    }
  });

  app.post('/api/company-leaves', isAuthenticated, async (req: any, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('➕ Create company leave request');
    try {
      const user = req.user as { email?: string; role?: string };
      if (user?.role === 'normal') {
        return res.status(403).json({ message: 'No tienes permisos para crear bajas de empresa' });
      }

      const leaveData = req.body;
      
      // Validar el tipo de baja empresa
      const validLeaveTypes = ['despido', 'voluntaria', 'nspp', 'anulacion', 'fin_contrato_temporal', 'agotamiento_it', 'otras_causas'];
      if (!validLeaveTypes.includes(leaveData.leaveType)) {
        return res.status(400).json({ 
          message: `Tipo de baja inválido. Tipos válidos: ${validLeaveTypes.join(', ')}` 
        });
      }

      // Validar que 'otras_causas' tenga comentarios
      let comments = null;
      if (leaveData.leaveType === 'otras_causas') {
        comments = leaveData.comments ? String(leaveData.comments) : '';
      }
      // Asegurar que leaveRequestedAt y leaveRequestedBy estén presentes
      const processedLeaveData = {
        ...leaveData,
        comments,
        leaveRequestedAt: leaveData.leaveRequestedAt || new Date(),
        leaveRequestedBy: leaveData.leaveRequestedBy || leaveData.requestedBy || user.email || '',
        // Si hay otherReasonText, guardarlo en comments
        comments: leaveData.otherReasonText || null,
      };
      
      const leave = await storage.createCompanyLeave(processedLeaveData);

      // Crear notificación automáticamente
      // Obtener datos del empleado
      const empleado = await storage.getEmployee(leaveData.employeeId);
      const empleadoMetadata = empleado ? getEmpleadoMetadata(empleado) : {};
      
      // Formatear el motivo de baja empresa para mostrar completo
      const motivoCompleto = leaveData.leaveType === 'despido' ? 'Baja Empresa - Despido' :
                            leaveData.leaveType === 'voluntaria' ? 'Baja Empresa - Baja Voluntaria' :
                            leaveData.leaveType === 'nspp' ? 'Baja Empresa - NSPP' :
                            leaveData.leaveType === 'anulacion' ? 'Baja Empresa - Anulación' :
                            leaveData.leaveType === 'fin_contrato_temporal' ? 'Baja Empresa - Fin de Contrato Temporal' :
                            leaveData.leaveType === 'agotamiento_it' ? 'Baja Empresa - Agotamiento IT' :
                            leaveData.leaveType === 'otras_causas' ? `Baja Empresa - Otras Causas: ${leaveData.otherReasonText || 'No especificado'}` :
                            `Baja Empresa - ${leaveData.leaveType}`;
      
      // Formatear la fecha
      const fechaBaja = new Date(leaveData.leaveDate).toLocaleDateString('es-ES');
      
      const notificationData = {
        type: 'company_leave_request' as const,
        title: motivoCompleto,
        message: `Se ha solicitado una ${motivoCompleto} para el empleado ${leaveData.employeeId} con fecha ${fechaBaja}. Pendiente de aprobación.`,
        requestedBy: user.email || '',
        status: 'pending' as const,
        metadata: {
          ...empleadoMetadata,
          employeeId: leaveData.employeeId,
          leaveType: leaveData.leaveType,
          leaveDate: leaveData.leaveDate,
          motivoCompleto,
          fechaBaja,
          companyLeaveId: leave.id,
          tipoBaja: 'Empresa',
          otherReasonText: leaveData.otherReasonText,
        },
      };

      const notification = await storage.createNotification(notificationData);

      // Log audit for company leave creation
      await AuditService.logAction({
        userId: user.email || '',
        userRole: (user.role as 'super_admin' | 'admin') || 'normal',
        action: 'create_company_leave',
        entityType: 'company_leave',
        entityId: leave.employeeId,
        description: `Usuario ${user.email} SOLICITÓ una ${motivoCompleto} para el empleado ${leaveData.employeeId} - Fecha: ${fechaBaja}`,
        newData: {
          ...leave,
          requestedBy: user.email,
          employeeData: empleadoMetadata,
          motivoCompleto,
          fechaBaja,
        },
      });

      // Log audit for notification creation
      await AuditService.logAction({
        userId: user.email || '',
        userRole: (user.role as 'super_admin' | 'admin') || 'normal',
        action: 'create_notification',
        entityType: 'notification',
        entityId: notification.id.toString(),
        description: `Usuario ${user.email} CREÓ notificación de ${motivoCompleto} para empleado ${leaveData.employeeId} - Estado: PENDIENTE`,
        newData: {
          ...notification,
          requestedBy: user.email,
          employeeData: empleadoMetadata,
          motivoCompleto,
          fechaBaja,
        },
      });

      res.status(201).json({ leave, notification });
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error creating company leave:', error);
      res.status(500).json({ message: 'Failed to create company leave' });
    }
  });

  // Cambiar motivo de baja empresa (solo super admin)
  app.post('/api/company-leaves/:id/change-reason', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as { email?: string; role?: string };
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Solo el super admin puede cambiar el motivo de baja empresa' });
      }
      const leaveId = parseInt(req.params.id, 10);
      const { motivoNuevo, comentarios } = req.body;
      const validLeaveTypes = ['despido', 'voluntaria', 'nspp', 'anulacion', 'fin_contrato_temporal', 'agotamiento_it', 'otras_causas'];
      if (!validLeaveTypes.includes(motivoNuevo)) {
        return res.status(400).json({ message: `Motivo inválido. Tipos válidos: ${validLeaveTypes.join(', ')}` });
      }
      if (motivoNuevo === 'otras_causas' && (!comentarios || comentarios.trim() === '')) {
        return res.status(400).json({ message: 'El tipo "Otras Causas" requiere un comentario obligatorio' });
      }
      // Obtener la baja actual
      const leave = await storage.getCompanyLeaveById(leaveId);
      if (!leave) {
        return res.status(404).json({ message: 'Baja empresa no encontrada' });
      }
      const motivoAnterior = leave.leaveType;
      // Actualizar motivo y comentarios
      await storage.updateCompanyLeaveReason(leaveId, motivoNuevo, motivoNuevo === 'otras_causas' ? comentarios : null);
      // Registrar en historial
      await storage.createEmployeeLeaveHistory({
        employeeId: leave.employeeId,
        leaveType: 'company_leave',
        motivoAnterior,
        motivoNuevo,
        comentarios: motivoNuevo === 'otras_causas' ? comentarios : null,
        cambiadoPor: user.email,
        rolUsuario: user.role,
      });
      // Registrar en logs
      await AuditService.logAction({
        userId: user.email,
        userRole: user.role,
        action: 'change_company_leave_reason',
        entityType: 'company_leave',
        entityId: leave.employeeId,
        description: `Cambio de motivo de baja empresa: de ${motivoAnterior} a ${motivoNuevo}`,
        oldData: leave,
        newData: { ...leave, leaveType: motivoNuevo, comments: motivoNuevo === 'otras_causas' ? comentarios : null },
      });
      res.json({ message: 'Motivo de baja empresa actualizado y registrado en historial' });
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error cambiando motivo de baja empresa:', error);
      res.status(500).json({ message: 'Error cambiando motivo de baja empresa' });
    }
  });

  // IT leaves (protected)
  app.get('/api/it-leaves', isAuthenticated, async (req, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('🏥 IT leaves request');
    try {
      const leaves = await storage.getAllItLeaves();
      res.json(leaves);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error fetching IT leaves:', error);
      res.status(500).json({ message: 'Failed to fetch IT leaves' });
    }
  });

  app.post('/api/it-leaves', isAuthenticated, async (req: any, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('➕ Create IT leave request');
    try {
      const user = req.user as { email?: string; role?: string };
      if (user?.role === 'normal') {
        return res.status(403).json({ message: 'No tienes permisos para crear bajas IT' });
      }

      const leaveData = req.body;
      const leave = await storage.createItLeave(leaveData);

      // Log audit for IT leave creation
      await AuditService.logAction({
        userId: user.email || '',
        userRole: (user.role as 'super_admin' | 'admin') || 'normal',
        action: 'create_it_leave',
        entityType: 'it_leave',
        entityId: leave.employeeId,
        description: `Baja IT creada para empleado ${leave.employeeId} - Tipo: ${leaveData.leaveType} - Fecha: ${new Date(leaveData.leaveDate).toLocaleDateString('es-ES')}`,
        newData: leave,
      });

      res.status(201).json(leave);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error creating IT leave:', error);
      res.status(500).json({ message: 'Failed to create IT leave' });
    }
  });

  // Notifications (protected)
  app.get('/api/notifications', isAuthenticated, async (req, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('🔔 Notifications request');
    try {
      const notifications = await storage.getAllNotifications();
      res.json(notifications);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error fetching notifications:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  app.post('/api/notifications', isAuthenticated, async (req: any, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('➕ Create notification request');
    try {
      const user = req.user as { email?: string; role?: string };
      const notificationData = req.body;
      const notification = await storage.createNotification(notificationData);

      // Log audit
      await AuditService.logAction({
        userId: user.email || '',
        userRole: (user.role as 'super_admin' | 'admin') || 'normal',
        action: 'create_notification',
        entityType: 'notification',
        entityId: notification.id.toString(),
        description: `Notificación creada: ${notification.title}`,
        newData: notification,
      });

      res.status(201).json(notification);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error creating notification:', error);
      res.status(500).json({ message: 'Failed to create notification' });
    }
  });

  app.put('/api/notifications/:id/status', isAuthenticated, async (req: any, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('✏️ Update notification status request');
    try {
      const user = req.user as { email?: string; role?: string };
      if (user?.role === 'normal') {
        return res.status(403).json({ message: 'No tienes permisos para actualizar notificaciones' });
      }

      const { id } = req.params;
      const { status } = req.body;

      const notification = await storage.updateNotificationStatus(parseInt(id), status);

      // Log audit
      await AuditService.logAction({
        userId: user.email || '',
        userRole: (user.role as 'super_admin' | 'admin') || 'normal',
        action: 'update_notification_status',
        entityType: 'notification',
        entityId: notification.id.toString(),
        description: `Estado de notificación actualizado a: ${status}`,
        oldData: { status: notification.status },
        newData: { status },
      });

      res.json(notification);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error updating notification status:', error);
      res.status(500).json({ message: 'Failed to update notification status' });
    }
  });

  // Process notification (protected - super_admin only)
  app.post('/api/notifications/:id/process', isAuthenticated, async (req: any, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('⚙️ Process notification request');
    try {
      const user = req.user as { email?: string; role?: string };
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Solo el super admin puede procesar notificaciones' });
      }

      const { id } = req.params;
      const { action, processingDate } = req.body;

      if (!action || !['approve', 'reject', 'pending_laboral', 'processed'].includes(action)) {
        return res.status(400).json({ message: 'Acción inválida. Debe ser: approve, reject, pending_laboral, o processed' });
      }

      // Get the notification
      const notification = await storage.getNotification(parseInt(id));
      if (!notification) {
        return res.status(404).json({ message: 'Notificación no encontrada' });
      }

      // If this is a company leave request, update the employee status and company leave record
      if (notification.type === 'company_leave_request' && notification.metadata) {
        const metadata = notification.metadata as any;
        const employeeId = metadata.employeeId;
        const companyLeaveId = metadata.companyLeaveId;

        if (employeeId) {
          let newEmployeeStatus: string;
          let newCompanyLeaveStatus: string;
          let shouldDeleteEmployee = false;

          switch (action) {
            case 'approve':
              newEmployeeStatus = 'company_leave_approved';
              newCompanyLeaveStatus = 'approved';
              break;
            case 'reject':
              newEmployeeStatus = 'active'; // Return to active status
              newCompanyLeaveStatus = 'rejected';
              break;
            case 'pending_laboral':
              newEmployeeStatus = 'pending_laboral';
              newCompanyLeaveStatus = 'pending';
              break;
            case 'processed':
              // Cuando se procesa una notificación de pending_laboral como "tramitado",
              // el empleado debe ser eliminado de la tabla employees
              newEmployeeStatus = 'deleted'; // Para el audit log, aunque no se use
              newCompanyLeaveStatus = 'approved';
              shouldDeleteEmployee = true;
              break;
            default:
              newEmployeeStatus = 'company_leave_pending';
              newCompanyLeaveStatus = 'pending';
          }

          // Si la acción es 'processed', eliminar el empleado de employees sin actualizar status
          if (shouldDeleteEmployee) {
            // Obtener datos del empleado antes de eliminarlo para el audit log
            const empleado = await storage.getEmployee(employeeId);
            if (empleado) {
              await storage.deleteEmployee(employeeId);
              await AuditService.logAction({
                userId: user.email || '',
                userRole: (user.role as 'super_admin' | 'admin') || 'normal',
                action: 'delete_employee_pending_laboral_processed',
                entityType: 'employee',
                entityId: employeeId,
                entityName: `${empleado.nombre} ${empleado.apellido || ''}`,
                description: `Empleado eliminado de tabla employees tras tramitación de pendiente laboral: ${empleado.nombre} ${empleado.apellido || ''} (${employeeId})`,
                oldData: empleado,
                newData: {
                  processedBy: user.email,
                  action,
                  employeeId,
                  processingDate,
                  originalRequestedBy: notification.requestedBy,
                  reason: 'pending_laboral_processed',
                },
              });
            }
          } else {
            // Si es rechazo, restaurar las horas originales
            if (action === 'reject') {
              const empleado = await storage.getEmployee(employeeId);
              let horasRestaurar = null;
              // 1. Si el empleado tiene originalHours, usarlo
              if (empleado && empleado.originalHours !== null) {
                horasRestaurar = empleado.originalHours;
              } else {
                // 2. Buscar en metadata de la notificación
                if (metadata && metadata.originalHours !== undefined && metadata.originalHours !== null) {
                  horasRestaurar = metadata.originalHours;
                } else {
                  // 3. Buscar en el registro de company_leaves
                  const companyLeaves = await storage.getAllCompanyLeaves();
                  const leave = companyLeaves.find(l => l.employeeId === employeeId && l.status === 'approved');
                  if (leave && leave.employeeData && leave.employeeData.horas !== undefined && leave.employeeData.horas !== null) {
                    horasRestaurar = leave.employeeData.horas;
                  }
                }
              }
              if (horasRestaurar !== null && empleado) {
                await storage.updateEmployee(employeeId, { 
                  status: newEmployeeStatus as any,
                  horas: horasRestaurar,
                  originalHours: null // Limpiar las horas originales ya que se restauraron
                });
                // Log de auditoría para la restauración de horas
                await AuditService.logAction({
                  userId: user.email || '',
                  userRole: (user.role as 'super_admin' | 'admin') || 'normal',
                  action: 'restore_employee_hours_on_reject',
                  entityType: 'employee',
                  entityId: employeeId,
                  entityName: `${empleado.nombre} ${empleado.apellido || ''}`,
                  description: `Horas restauradas al rechazar baja empresa: ${empleado.nombre} ${empleado.apellido || ''} (${employeeId}) - Horas restauradas: ${horasRestaurar}`,
                  oldData: {
                    status: empleado.status,
                    horas: empleado.horas,
                    originalHours: empleado.originalHours
                  },
                  newData: {
                    status: newEmployeeStatus,
                    horas: horasRestaurar,
                    originalHours: null,
                    processedBy: user.email,
                    action: 'reject',
                    employeeId,
                    processingDate
                  },
                });
              } else {
                // Si no se encuentra valor, solo cambiar el estado y dejar horas en 0
                await storage.updateEmployee(employeeId, { status: newEmployeeStatus as any });
                if (empleado) {
                  await AuditService.logAction({
                    userId: user.email || '',
                    userRole: (user.role as 'super_admin' | 'admin') || 'normal',
                    action: 'restore_employee_hours_on_reject_failed',
                    entityType: 'employee',
                    entityId: employeeId,
                    entityName: `${empleado.nombre} ${empleado.apellido || ''}`,
                    description: `No se pudo restaurar horas originales al rechazar baja empresa: ${empleado.nombre} ${empleado.apellido || ''} (${employeeId}) - Horas actuales: 0`,
                    oldData: {
                      status: empleado.status,
                      horas: empleado.horas,
                      originalHours: empleado.originalHours
                    },
                    newData: {
                      status: newEmployeeStatus,
                      horas: 0,
                      originalHours: null,
                      processedBy: user.email,
                      action: 'reject',
                      employeeId,
                      processingDate
                    },
                  });
                }
              }
            } else {
              // Para otras acciones, solo cambiar el estado
              await storage.updateEmployee(employeeId, { status: newEmployeeStatus as any });
            }
          }

          // Update company leave status if it exists
          if (companyLeaveId) {
            await storage.updateCompanyLeaveStatus(parseInt(companyLeaveId), newCompanyLeaveStatus, user.email || '', new Date(processingDate));
          }

          // If action is pending_laboral, create a new notification for pending laboral
          if (action === 'pending_laboral') {
            // Obtener datos del empleado para incluir en la notificación
            const empleado = await storage.getEmployee(employeeId);
            const empleadoMetadata = empleado ? getEmpleadoMetadata(empleado) : {};
            
            // Obtener el motivo completo del metadata original
            const motivoCompleto = metadata.motivoCompleto || 'Baja Empresa';
            const fechaBaja = metadata.fechaBaja || new Date().toLocaleDateString('es-ES');
            
            // Create a new notification for pending laboral
            await storage.createNotification({
              type: 'company_leave_request',
              title: `${motivoCompleto} - Pendiente Laboral`,
              message: `El empleado ${employeeId} con ${motivoCompleto} del ${fechaBaja} ha sido movido a pendiente laboral. Requiere tramitación.`,
              status: 'pending_laboral',
              requestedBy: user.email || '',
              metadata: {
                ...empleadoMetadata,
                employeeId,
                companyLeaveId,
                originalNotificationId: notification.id,
                action: 'pending_laboral',
                motivoCompleto,
                fechaBaja,
                tipoBaja: 'Empresa',
              },
            });
          }

          // Log audit for employee status change (solo si no se eliminó)
          if (!shouldDeleteEmployee) {
            // Obtener el motivo completo del metadata
            const motivoCompleto = metadata.motivoCompleto || 'Baja Empresa';
            const fechaBaja = metadata.fechaBaja || 'Fecha no especificada';
            
            await AuditService.logAction({
              userId: user.email || '',
              userRole: (user.role as 'super_admin' | 'admin') || 'normal',
              action: 'process_company_leave_notification',
              entityType: 'employee',
              entityId: employeeId,
              description: `Usuario ${user.email} ${action === 'approve' ? 'APROBÓ' : action === 'reject' ? 'RECHAZÓ' : 'MOVIÓ A PENDIENTE LABORAL'} la ${motivoCompleto} del empleado ${employeeId} (${fechaBaja}) - Estado final: ${newEmployeeStatus}`,
              newData: {
                processedBy: user.email,
                action,
                employeeId,
                newEmployeeStatus,
                newCompanyLeaveStatus,
                processingDate,
                originalRequestedBy: notification.requestedBy,
                motivoCompleto,
                fechaBaja,
              },
            });
          }
        }
      }

      // Update notification status with processing date
      const updatedNotification = await storage.updateNotificationStatusWithDate(
        parseInt(id),
        action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : action === 'pending_laboral' ? 'approved' : 'processed',
        new Date(processingDate),
      );

      // Log audit for notification processing
      await AuditService.logAction({
        userId: user.email || '',
        userRole: (user.role as 'super_admin' | 'admin') || 'normal',
        action: 'process_notification',
        entityType: 'notification',
        entityId: notification.id.toString(),
        description: `Usuario ${user.email} ${action === 'approve' ? 'APROBÓ' : action === 'reject' ? 'RECHAZÓ' : 'MOVIÓ A PENDIENTE LABORAL'} la notificación "${notification.title}" - Estado: ${notification.status} → ${updatedNotification.status}`,
        oldData: { 
          status: notification.status,
          requestedBy: notification.requestedBy,
          motivoCompleto: (notification.metadata as any)?.motivoCompleto,
          fechaBaja: (notification.metadata as any)?.fechaBaja,
        },
        newData: { 
          processedBy: user.email,
          action, 
          processingDate, 
          newStatus: updatedNotification.status,
          originalRequestedBy: notification.requestedBy,
          motivoCompleto: (notification.metadata as any)?.motivoCompleto,
          fechaBaja: (notification.metadata as any)?.fechaBaja,
        },
      });

      res.json(updatedNotification);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error processing notification:', error);
      res.status(500).json({ message: 'Failed to process notification' });
    }
  });

  // System users (protected - super_admin only)
  app.get('/api/system-users', isAuthenticated, async (req: any, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('👥 System users request');
    try {
      const user = req.user as { role?: string };
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Solo el super admin puede ver usuarios del sistema' });
      }

      const users = await storage.getAllSystemUsers();
      res.json(users);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error fetching system users:', error);
      res.status(500).json({ message: 'Failed to fetch system users' });
    }
  });

  app.post('/api/system-users', isAuthenticated, async (req: any, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('➕ Create system user request');
    try {
      const user = req.user as { email?: string; role?: string };
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Solo el super admin puede crear usuarios del sistema' });
      }

      const userData = req.body;
      // Agregar el campo createdBy con el email del usuario autenticado
      if (!user.email) {
        return res.status(400).json({ message: 'Usuario no válido' });
      }
      const userDataWithCreatedBy = {
        ...userData,
        createdBy: user.email,
      };
      const newUser = await storage.createSystemUser(userDataWithCreatedBy);

      // Log audit
      await AuditService.logAction({
        userId: user.email || '',
        userRole: (user.role as 'super_admin' | 'admin') || 'normal',
        action: 'create_system_user',
        entityType: 'system_user',
        entityId: newUser.id.toString(),
        entityName: `${newUser.firstName} ${newUser.lastName}`,
        description: `Usuario del sistema creado: ${newUser.email}`,
        newData: { ...newUser, password: '[HIDDEN]' },
      });

      res.status(201).json(newUser);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error creating system user:', error);
      res.status(500).json({ message: 'Failed to create system user' });
    }
  });

  app.put('/api/system-users/:id', isAuthenticated, async (req: any, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('✏️ Update system user request');
    try {
      const user = req.user as { email?: string; role?: string };
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Solo el super admin puede editar usuarios del sistema' });
      }

      const { id } = req.params;
      const userData = req.body;

      // Get old data for audit
      const oldUser = await storage.getSystemUser(parseInt(id));

      const updatedUser = await storage.updateSystemUser(parseInt(id), userData);

      // Log audit
      await AuditService.logAction({
        userId: user.email || '',
        userRole: (user.role as 'super_admin' | 'admin') || 'normal',
        action: 'update_system_user',
        entityType: 'system_user',
        entityId: updatedUser.id.toString(),
        entityName: `${updatedUser.firstName} ${updatedUser.lastName}`,
        description: `Usuario del sistema actualizado: ${updatedUser.email}`,
        oldData: oldUser,
        newData: { ...updatedUser, password: '[HIDDEN]' },
      });

      res.json(updatedUser);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error updating system user:', error);
      res.status(500).json({ message: 'Failed to update system user' });
    }
  });

  app.delete('/api/system-users/:id', isAuthenticated, async (req: any, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('🗑️ Delete system user request');
    try {
      const user = req.user as { role?: string };
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Solo el super admin puede eliminar usuarios del sistema' });
      }

      const { id } = req.params;

      // Get user data for audit
      const systemUser = await storage.getSystemUser(parseInt(id));
      if (!systemUser) {
        return res.status(404).json({ message: 'System user not found' });
      }

      // Prevent deletion of super admin
      if (systemUser.email === 'superadmin@glovo.com') {
        return res.status(403).json({ message: 'No se puede eliminar el super administrador' });
      }

      await storage.deleteSystemUser(parseInt(id));

      // Log audit
      await AuditService.logAction({
        userId: (user as { email?: string }).email || '',
        userRole: (user.role as 'super_admin' | 'admin') || 'normal',
        action: 'delete_system_user',
        entityType: 'system_user',
        entityId: systemUser.id.toString(),
        entityName: `${systemUser.firstName} ${systemUser.lastName}`,
        description: `Usuario del sistema eliminado: ${systemUser.firstName} ${systemUser.lastName} (${systemUser.email})`,
        oldData: systemUser,
      });

      res.status(204).send();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error deleting system user:', error);
      res.status(500).json({ message: 'Failed to delete system user' });
    }
  });

  // Change system user password (protected - super_admin only)
  app.put('/api/system-users/:id/password', isAuthenticated, async (req: any, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('🔑 Change system user password request');
    try {
      const user = req.user as { email?: string; role?: string };
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Solo el super admin puede cambiar contraseñas' });
      }

      const { id } = req.params;
      const { password } = req.body;

      if (!password || password.length < 6) {
        return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
      }

      // Get user data for audit
      const systemUser = await storage.getSystemUser(parseInt(id));
      if (!systemUser) {
        return res.status(404).json({ message: 'System user not found' });
      }

      // Hash the new password
      const bcrypt = await import('bcrypt');
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Update the password
      const updatedUser = await storage.updateSystemUserPassword(parseInt(id), hashedPassword);

      // Log audit
      await AuditService.logAction({
        userId: user.email || '',
        userRole: (user.role as 'super_admin' | 'admin') || 'normal',
        action: 'change_system_user_password',
        entityType: 'system_user',
        entityId: systemUser.id.toString(),
        entityName: `${systemUser.firstName} ${systemUser.lastName}`,
        description: `Contraseña cambiada para usuario: ${systemUser.firstName} ${systemUser.lastName} (${systemUser.email})`,
        oldData: systemUser,
        newData: { ...updatedUser, password: '[HIDDEN]' },
      });

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error changing system user password:', error);
      res.status(500).json({ message: 'Failed to change password' });
    }
  });

  // Audit logs (protected - super_admin only)
  app.get('/api/audit-logs', isAuthenticated, async (req: { user?: { role?: string }; query: { limit?: string } }, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('📋 Audit logs request');
    try {
      const user = req.user as { role?: string };
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Solo el super admin puede ver logs de auditoría' });
      }

      const { limit = 1000 } = req.query;
      const logs = await storage.getAllAuditLogs(parseInt(limit.toString()));
      res.json(logs);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error fetching audit logs:', error);
      res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
  });

  app.get('/api/audit-logs/stats', isAuthenticated, async (req: { user?: { role?: string } }, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('📊 Audit logs stats request');
    try {
      const user = req.user as { role?: string };
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Solo el super admin puede ver estadísticas de auditoría' });
      }

      const stats = await storage.getAuditLogsStats();
      res.json(stats);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error fetching audit logs stats:', error);
      res.status(500).json({ message: 'Failed to fetch audit logs stats' });
    }
  });

  // Crear baja IT para un empleado específico
  app.post('/api/employees/:id/it-leave', isAuthenticated, async (req: any, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('➕ Create IT leave for employee request');
    try {
      const user = req.user as { email?: string; role?: string };
      if (user?.role === 'normal') {
        return res.status(403).json({ message: 'No tienes permisos para crear bajas IT' });
      }

      const { id } = req.params;
      const { leaveType, leaveDate } = req.body;
      const now = new Date();

      // Actualizar estado y fecha en employees
      const updatedEmployee = await storage.setEmployeeItLeave(id, leaveDate || now);

      // Log audit for IT leave creation
      await AuditService.logAction({
        userId: user.email || '',
        userRole: (user.role as 'super_admin' | 'admin') || 'normal',
        action: 'set_it_leave',
        entityType: 'employee',
        entityId: id,
        entityName: `${updatedEmployee?.nombre || ''} ${updatedEmployee?.apellido || ''}`,
        description: `Usuario ${user.email} CREÓ una ${leaveType === 'enfermedad' ? 'Baja IT - Enfermedad' : leaveType === 'accidente' ? 'Baja IT - Accidente' : `Baja IT - ${leaveType || 'No especificado'}`} para el empleado ${id} - Fecha: ${new Date(leaveDate || now).toLocaleDateString('es-ES')}`,
        newData: {
          ...updatedEmployee,
          motivoCompleto: leaveType === 'enfermedad' ? 'Baja IT - Enfermedad' : leaveType === 'accidente' ? 'Baja IT - Accidente' : `Baja IT - ${leaveType || 'No especificado'}`,
          fechaBaja: new Date(leaveDate || now).toLocaleDateString('es-ES'),
        },
      });

      res.status(200).json({ employee: updatedEmployee });
    } catch (error) {
      console.error('❌ Error setting IT leave:', error);
      res.status(500).json({ message: 'Failed to set IT leave' });
    }
  });

  // Export employees to CSV (protected - admin/super_admin only)
  app.get('/api/employees/export/csv', isAuthenticated, async (req: any, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('📤 Export employees to CSV request');
    try {
      const user = req.user as { email?: string; role?: string };
      if (user?.role === 'normal') {
        return res.status(403).json({ message: 'No tienes permisos para exportar empleados' });
      }

      const employees = await storage.getAllEmployees();
      
      // Log export action
      await AuditService.logAction({
        userId: user.email || '',
        userRole: (user.role as 'super_admin' | 'admin') || 'normal',
        action: 'export_employees_csv',
        entityType: 'employee',
        description: `Exportación de empleados a CSV - Usuario: ${user.email} - Total: ${employees.length} empleados`,
        newData: { exportType: 'csv', employeeCount: employees.length },
      });

      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="empleados_${new Date().toISOString().split('T')[0]}.csv"`);

      // Create CSV content
      const csvHeaders = [
        'ID Glovo',
        'Email Glovo',
        'Turno',
        'Nombre',
        'Apellido',
        'Teléfono',
        'Email',
        'Horas',
        'CDP',
        'Complementarias',
        'Ciudad',
        'City Code',
        'DNI/NIE',
        'IBAN',
        'Dirección',
        'Vehículo',
        'NAF',
        'Fecha Alta Seg Soc',
        'Status Baja',
        'Estado SS',
        'Informado Horario',
        'Cuenta Divilo',
        'Próxima Asignación Slots',
        'Jefe Tráfico',
        'Comentarios Jefe Tráfico',
        'Incidencias',
        'Fecha Incidencia',
        'Faltas No Check In',
        'Cruce',
        'Status',
        'Fecha Inicio Penalización',
        'Fecha Fin Penalización',
        'Horas Originales',
      ].join(',');

      const csvRows = employees.map(emp => [
        emp.idGlovo,
        emp.emailGlovo || '',
        emp.turno || '',
        emp.nombre,
        emp.apellido || '',
        emp.telefono || '',
        emp.email || '',
        emp.horas || '',
        emp.cdp || '',
        emp.complementaries || '',
        emp.ciudad || '',
        emp.cityCode || '',
        emp.dniNie || '',
        emp.iban || '',
        emp.direccion || '',
        emp.vehiculo || '',
        emp.naf || '',
        emp.fechaAltaSegSoc || '',
        emp.statusBaja || '',
        emp.estadoSs || '',
        emp.informadoHorario ? 'Sí' : 'No',
        emp.cuentaDivilo || '',
        emp.proximaAsignacionSlots || '',
        emp.jefeTrafico || '',
        emp.comentsJefeDeTrafico || '',
        emp.incidencias || '',
        emp.fechaIncidencia || '',
        emp.faltasNoCheckInEnDias || '',
        emp.cruce || '',
        emp.status,
        emp.penalizationStartDate || '',
        emp.penalizationEndDate || '',
        emp.originalHours || '',
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));

      const csvContent = [csvHeaders, ...csvRows].join('\n');
      res.send(csvContent);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error exporting employees to CSV:', error);
      res.status(500).json({ message: 'Failed to export employees' });
    }
  });

  // Reactivate employee (protected - super_admin only)
  app.post('/api/employees/:id/reactivate', isAuthenticated, async (req: any, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('🔄 Reactivate employee request');
    try {
      const user = req.user as { email?: string; role?: string };
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Solo el super admin puede reactivar empleados' });
      }

      const { id } = req.params;

      // Get employee data for audit
      const employee = await storage.getEmployee(id);
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      const reactivatedEmployee = await storage.reactivateEmployee(id);

      // Log audit
      await AuditService.logAction({
        userId: user.email || '',
        userRole: (user.role as 'super_admin' | 'admin') || 'normal',
        action: 'reactivate_employee',
        entityType: 'employee',
        entityId: employee.idGlovo,
        entityName: `${employee.nombre} ${employee.apellido}`,
        description: `Empleado reactivado: ${employee.nombre} ${employee.apellido} (${employee.idGlovo})`,
        oldData: employee,
        newData: reactivatedEmployee,
      });

      res.json(reactivatedEmployee);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error reactivating employee:', error);
      res.status(500).json({ message: 'Failed to reactivate employee' });
    }
  });

  // Page access logging (protected)
  app.post('/api/log-page-access', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as { email?: string; role?: string };
      const { page, action } = req.body;

      // Log page access
      await AuditService.logAction({
        userId: user.email || '',
        userRole: (user.role as 'super_admin' | 'admin') || 'normal',
        action: 'page_access',
        entityType: 'page',
        entityName: page,
        description: `Acceso a página: ${page} - Usuario: ${user.email}`,
        newData: { page, action, timestamp: new Date().toISOString() },
      });

      res.json({ success: true });
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error logging page access:', error);
      res.status(500).json({ message: 'Failed to log page access' });
    }
  });

  // Obtener historial de bajas de un empleado
  app.get('/api/employees/:id/leave-history', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      // Permitir que cualquier usuario autenticado consulte el historial
      const history = await storage.getEmployeeLeaveHistory(id);
      res.json(history);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error obteniendo historial de bajas:', error);
      res.status(500).json({ message: 'Error obteniendo historial de bajas' });
    }
  });

  // Limpieza de empleados dados de baja aprobada (solo superadmin)
  app.post('/api/employees/clean-leaves', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as { email?: string; role?: string };
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Solo el super admin puede limpiar empleados dados de baja' });
      }
      const result = await storage.cleanCompanyLeaveApprovedEmployees();
      // Log audit
      await AuditService.logAction({
        userId: user?.email || '',
        userRole: 'super_admin',
        action: 'clean_company_leave_approved_employees',
        entityType: 'employee',
        description: `Limpieza masiva de empleados dados de baja aprobada (${result.total} eliminados)`,
        newData: result,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error en limpieza de empleados dados de baja:', error);
      res.status(500).json({ message: 'Error al limpiar empleados dados de baja' });
    }
  });

  // Corregir horas de empleados en baja IT
  app.post('/api/employees/:id/fix-it-leave-hours', isAuthenticated, async (req: any, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('🔧 Fix IT leave hours request');
    try {
      const user = req.user as { email?: string; role?: string };
      if (user?.role === 'normal') {
        return res.status(403).json({ message: 'No tienes permisos para corregir horas de baja IT' });
      }

      const { id } = req.params;
      
      // Corregir las horas del empleado
      const updatedEmployee = await storage.fixItLeaveHours(id);

      // Log audit
      await AuditService.logAction({
        userId: user.email || '',
        userRole: (user.role as 'super_admin' | 'admin') || 'normal',
        action: 'fix_it_leave_hours',
        entityType: 'employee',
        entityId: id,
        entityName: `${updatedEmployee?.nombre || ''} ${updatedEmployee?.apellido || ''}`,
        description: `Usuario ${user.email} CORRIGIÓ las horas de baja IT para el empleado ${id} - Horas originales: ${updatedEmployee.originalHours}, Horas actuales: ${updatedEmployee.horas}`,
        newData: updatedEmployee,
      });

      res.status(200).json({ 
        message: 'Horas de baja IT corregidas correctamente',
        employee: updatedEmployee 
      });
    } catch (error) {
      console.error('❌ Error fixing IT leave hours:', error);
      res.status(500).json({ message: 'Failed to fix IT leave hours' });
    }
  });

  // Verificar y corregir horas de todos los empleados (solo superadmin)
  app.post('/api/employees/verify-hours', isAuthenticated, async (req: any, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('🔍 Verify and fix all employee hours request');
    try {
      const user = req.user as { email?: string; role?: string };
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Solo el super admin puede verificar horas de empleados' });
      }

      const result = await storage.verifyAndFixAllEmployeeHours();

      // Log audit
      await AuditService.logAction({
        userId: user.email || '',
        userRole: (user.role as 'super_admin' | 'admin') || 'normal',
        action: 'verify_and_fix_all_employee_hours',
        entityType: 'system',
        entityId: 'verify-hours',
        description: `Verificación masiva de horas de empleados: ${result.checked} verificados, ${result.fixed} corregidos`,
        newData: result,
      });

      res.status(200).json({ 
        message: 'Verificación de horas completada',
        result 
      });
    } catch (error) {
      console.error('❌ Error verifying employee hours:', error);
      res.status(500).json({ message: 'Failed to verify employee hours' });
    }
  });

  // Corregir horas de empleado específico (solo superadmin)
  app.post('/api/employees/:id/fix-hours', isAuthenticated, async (req: any, res) => {
    if (process.env.NODE_ENV !== 'production') console.log('🔧 Fix specific employee hours request');
    try {
      const user = req.user as { email?: string; role?: string };
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Solo el super admin puede corregir horas de empleados' });
      }

      const { id } = req.params;

      // Obtener el empleado para determinar qué tipo de corrección aplicar
      const employee = await storage.getEmployee(id);
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      let result;
      let actionType = '';
      switch (employee.status) {
        case 'it_leave':
          result = await storage.fixItLeaveHours(id);
          actionType = 'fix_it_leave_hours';
          break;
        case 'company_leave_approved':
          result = await storage.fixCompanyLeaveHours(id);
          actionType = 'fix_company_leave_hours';
          break;
        default:
          return res.status(400).json({ message: 'Employee is not in a status that requires hours fixing' });
      }

      // Log audit
      await AuditService.logAction({
        userId: user.email || '',
        userRole: (user.role as 'super_admin' | 'admin') || 'normal',
        action: actionType,
        entityType: 'employee',
        entityId: id,
        entityName: `${employee.nombre} ${employee.apellido || ''}`,
        description: `Corrección de horas para empleado ${employee.nombre} ${employee.apellido || ''} (${id}) - Estado: ${employee.status}`,
        oldData: employee,
        newData: result,
      });

      res.status(200).json({ 
        message: 'Horas corregidas correctamente',
        employee: result 
      });
    } catch (error) {
      console.error('❌ Error fixing employee hours:', error);
      res.status(500).json({ message: 'Failed to fix employee hours' });
    }
  });

  // Create HTTP server
  const server = createServer(app);

  if (process.env.NODE_ENV !== 'production') console.log('✅ Routes setup completed');

  return server;
}
