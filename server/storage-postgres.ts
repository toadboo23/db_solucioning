import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, sql, desc, isNotNull, lt, inArray, or, ne } from 'drizzle-orm';
import {
  systemUsers,
  auditLogs,
  employees,
  companyLeaves,
  itLeaves,
  notifications,
  CIUDADES_DISPONIBLES,
  cityHoursRequirements,
  cityHoursRequirementsHistory,
  type SystemUser,
  type AuditLog,
  type InsertSystemUser,
  type UpdateSystemUser,
  type InsertAuditLog,
  type Employee,
  type InsertEmployee,
  type UpdateEmployee,
  type CompanyLeave,
  type InsertCompanyLeave,
  type ItLeave,
  type InsertItLeave,
  type Notification,
  type InsertNotification,
  employeeLeaveHistory,
  type CityHoursRequirement,
  type InsertCityHoursRequirement,
  type UpdateCityHoursRequirement,
  type CityHoursRequirementHistory,
  type CaptationDashboardData,
} from '../shared/schema.js';
// import { IStorage } from "./storage.js";

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

// Helper function to calculate CDP
export const calculateCDP = (horas: number | null | undefined): number => {
  if (!horas || horas <= 0) return 0;
  return Math.round((horas / 38) * 100);
};

// Type for upsert user operation
type UpsertUser = InsertSystemUser & { id: number };

// Función utilitaria para extraer los datos clave del empleado
export function getEmpleadoMetadata(emp: any) {
  return {
    idGlovo: emp.idGlovo,
    emailGlovo: emp.emailGlovo,
    dni: emp.dniNie,
    nombre: emp.nombre,
    apellido: emp.apellido,
    telefono: emp.telefono,
  };
}

export class PostgresStorage {
  // User operations
  async getUser (id: number): Promise<SystemUser | undefined> {
    const [user] = await db.select().from(systemUsers).where(eq(systemUsers.id, id));
    return user;
  }

  async upsertUser (userData: UpsertUser): Promise<SystemUser> {
    try {
      // Try to insert first
      const [user] = await db
        .insert(systemUsers)
        .values(userData)
        .returning();
      return user;
    } catch {
      // If insert fails (user exists), update instead
      const [user] = await db
        .update(systemUsers)
        .set({
          ...userData,
          updatedAt: new Date(),
        })
        .where(eq(systemUsers.id, userData.id))
        .returning();
      return user;
    }
  }

  // Employee operations
  async getAllEmployees (): Promise<Employee[]> {
    return await db.select().from(employees);
  }

  async getEmployee (id: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.idGlovo, id));
    return employee;
  }

  async createEmployee (employeeData: InsertEmployee): Promise<Employee> {
    // Generar ID temporal si no se proporciona idGlovo
    let finalEmployeeData = { ...employeeData };
    
    if (!employeeData.idGlovo || employeeData.idGlovo.trim() === '') {
      // Generar ID temporal único para empleados sin ID Glovo
      const tempId = `TEMP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      finalEmployeeData.idGlovo = tempId;
      finalEmployeeData.status = 'pendiente_activacion';
      
      // Si hay emailGlovo duplicado, generar uno temporal
      if (employeeData.emailGlovo && employeeData.emailGlovo.trim() !== '') {
        // Verificar si el email ya existe
        const existingEmployee = await db
          .select()
          .from(employees)
          .where(eq(employees.emailGlovo, employeeData.emailGlovo))
          .limit(1);
        
        if (existingEmployee.length > 0) {
          // Generar email temporal único
          const tempEmail = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@temp.glovo.com`;
          finalEmployeeData.emailGlovo = tempEmail;
        }
      }
    }

    // Calcular CDP automáticamente basado en las horas
    const cdp = calculateCDP(finalEmployeeData.horas);
    const employeeDataWithCDP = { ...finalEmployeeData, cdp };

    const [employee] = await db.insert(employees).values(employeeDataWithCDP as InsertEmployee).returning();
    return employee;
  }

  async updateEmployee (id: string, employeeData: UpdateEmployee): Promise<Employee> {
    // Obtener el empleado actual antes de la actualización
    const [currentEmployee] = await db
      .select()
      .from(employees)
      .where(eq(employees.idGlovo, id));
    
    if (!currentEmployee) {
      throw new Error(`Employee with ID ${id} not found`);
    }

    // CÁLCULO DE VACACIONES_PENDIENTES DESHABILITADO
    // No permitir modificar vacaciones_pendientes manualmente
    if ('vacacionesPendientes' in employeeData) {
      delete (employeeData as any).vacacionesPendientes;
    }

    // Calcular vacaciones_pendientes automáticamente - DESHABILITADO
    // let fechaAlta = employeeData.fechaAltaSegSoc || currentEmployee.fechaAltaSegSoc;
    // let vacacionesDisfrutadas =
    //   typeof employeeData.vacacionesDisfrutadas !== 'undefined'
    //     ? Number(employeeData.vacacionesDisfrutadas)
    //     : Number(currentEmployee.vacacionesDisfrutadas) || 0;
    // let vacacionesPendientes = 0;
    // if (fechaAlta) {
    //   const fechaInicio = new Date(fechaAlta);
    //   const hoy = new Date();
    //   const diasTranscurridos = Math.floor((hoy.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
    //   vacacionesPendientes = (diasTranscurridos * 0.0833333333333333) - vacacionesDisfrutadas;
    //   if (vacacionesPendientes < 0) vacacionesPendientes = 0;
    //   vacacionesPendientes = Number(vacacionesPendientes.toFixed(2));
    // }
    // // Si no hay fecha de alta, dejar en 0
    // else {
    //   vacacionesPendientes = 0;
    // }
    
    // Mantener el valor actual de vacaciones_pendientes sin calcular
    let vacacionesPendientes = Number(currentEmployee.vacacionesPendientes || 0);

    // Verificar si se está cambiando de it_leave a active
    const isReactivatingFromItLeave = currentEmployee.status === 'it_leave' && 
                                     employeeData.status === 'active';
    // Verificar si se está cambiando a company_leave_approved (baja empresa)
    const isGoingToCompanyLeave = employeeData.status === 'company_leave_approved';
    // Verificar si se está activando un empleado pendiente de activación
    const isActivatingPendingEmployee = currentEmployee.status === 'pendiente_activacion' && 
                                       employeeData.status === 'active' &&
                                       employeeData.idGlovo && 
                                       employeeData.idGlovo !== currentEmployee.idGlovo &&
                                       !employeeData.idGlovo.startsWith('TEMP_');
    
    // Si se está reactivando desde baja IT, restaurar las horas originales
    if (isReactivatingFromItLeave && currentEmployee.originalHours !== null) {
      employeeData.horas = currentEmployee.originalHours;
      employeeData.originalHours = null;
    }
    
    // Si se está activando un empleado pendiente, verificar que tenga ID Glovo válido
    if (isActivatingPendingEmployee) {
      // Verificar que el nuevo ID Glovo no esté en uso
      const existingEmployee = await this.getEmployee(employeeData.idGlovo);
      if (existingEmployee && existingEmployee.idGlovo !== currentEmployee.idGlovo) {
        throw new Error(`El ID Glovo ${employeeData.idGlovo} ya está en uso por otro empleado`);
      }
      
      // Crear notificación de activación
      await this.createNotification({
        type: 'employee_update',
        title: 'Empleado Activado',
        message: `El empleado ${currentEmployee.nombre} ${currentEmployee.apellido || ''} ha sido activado con ID Glovo: ${employeeData.idGlovo}`,
        requestedBy: 'SYSTEM',
        status: 'processed',
        metadata: {
          ...getEmpleadoMetadata(currentEmployee),
          employeeId: employeeData.idGlovo,
          action: 'employee_activated',
          previousId: currentEmployee.idGlovo,
          newId: employeeData.idGlovo,
          previousStatus: currentEmployee.status,
          newStatus: 'active',
        },
      });
    }
    
    // Si se está cambiando a baja empresa, guardar las horas originales y poner las actuales a 0
    if (isGoingToCompanyLeave) {
      const originalHours = currentEmployee.originalHours !== null ? currentEmployee.originalHours : currentEmployee.horas || 0;
      employeeData.originalHours = originalHours;
      employeeData.horas = 0;
      await this.createNotification({
        type: 'employee_update',
        title: 'Empleado en Baja Empresa - Horas Guardadas',
        message: `El empleado ${currentEmployee.nombre} ${currentEmployee.apellido || ''} (${id}) ha sido puesto en baja empresa. Horas originales guardadas: ${originalHours}, horas actuales: 0`,
        requestedBy: 'SYSTEM',
        status: 'processed',
        metadata: {
          ...getEmpleadoMetadata(currentEmployee),
          employeeId: id,
          action: 'company_leave_hours_saved',
          originalHours,
          currentHours: 0,
          previousStatus: currentEmployee.status,
          newStatus: 'company_leave_approved',
        },
      });
    }
    // Calcular CDP automáticamente si se actualizan las horas
    const cdp = calculateCDP(employeeData.horas);
    const employeeDataWithCDP = { ...employeeData, cdp, vacacionesPendientes };
    
    // Si se está cambiando el ID Glovo de un empleado pendiente, necesitamos manejar esto de forma especial
    if (isActivatingPendingEmployee && employeeData.idGlovo && employeeData.idGlovo !== id) {
      // Primero eliminar el empleado con el ID temporal
      await db.delete(employees).where(eq(employees.idGlovo, id));
      
      // Luego crear el nuevo empleado con el ID Glovo real
      const [employee] = await db.insert(employees).values(employeeDataWithCDP as InsertEmployee).returning();
      return employee;
    } else {
      // Actualización normal
      const [employee] = await db
        .update(employees)
        .set(employeeDataWithCDP as UpdateEmployee)
        .where(eq(employees.idGlovo, id))
        .returning();
      return employee;
    }
  }

  async deleteEmployee (id: string): Promise<void> {
    await db.delete(employees).where(eq(employees.idGlovo, id));
  }

  async getEmployeesByCity (city: string): Promise<Employee[]> {
    return await db.select().from(employees).where(eq(employees.ciudad, city));
  }

  async searchEmployees (query: string): Promise<Employee[]> {
    return await db
      .select()
      .from(employees)
      .where(
        sql`LOWER(${employees.nombre}) LIKE ${`%${query.toLowerCase()}%`} OR 
            LOWER(${employees.apellido}) LIKE ${`%${query.toLowerCase()}%`} OR 
            LOWER(${employees.email}) LIKE ${`%${query.toLowerCase()}%`} OR
            LOWER(${employees.emailGlovo}) LIKE ${`%${query.toLowerCase()}%`}`,
      );
  }

  async getEmployeesByStatus (status: string): Promise<Employee[]> {
    return await db.select().from(employees).where(eq(employees.statusBaja, status));
  }

  // Company leave operations
  async getAllCompanyLeaves (): Promise<CompanyLeave[]> {
    return await db.select().from(companyLeaves).orderBy(companyLeaves.createdAt);
  }

  async createCompanyLeave (leaveData: InsertCompanyLeave): Promise<CompanyLeave> {
    const [leave] = await db.insert(companyLeaves).values(leaveData).returning();
    return leave;
  }

  async getNotification (id: number): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification;
  }

  async createNotification (notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(notificationData).returning();
    return notification;
  }

  async updateCompanyLeaveStatus (id: number, status: string, approvedBy: string, approvedAt: Date): Promise<CompanyLeave> {
    const [companyLeave] = await db
      .update(companyLeaves)
      .set({
        status,
        approvedBy,
        approvedAt,
        updatedAt: new Date(),
      })
      .where(eq(companyLeaves.id, id))
      .returning();
    return companyLeave;
  }

  // IT leave operations
  async getAllItLeaves (): Promise<ItLeave[]> {
    return await db.select().from(itLeaves).orderBy(itLeaves.createdAt);
  }

  async createItLeave (leaveData: InsertItLeave): Promise<ItLeave> {
    if (process.env.NODE_ENV !== 'production') console.log('🚀 [STORAGE] Starting createItLeave with data:', JSON.stringify(leaveData, null, 2));

    try {
      // Validate required fields
      if (!leaveData.employeeId) {
        throw new Error('employeeId is required');
      }
      if (!leaveData.leaveType) {
        throw new Error('leaveType is required');
      }
      if (!leaveData.requestedBy) {
        throw new Error('requestedBy is required');
      }

      // Ensure dates are properly formatted
      const now = new Date();
      const processedData = {
        ...leaveData,
        leaveDate: leaveData.leaveDate || now,
        requestedAt: leaveData.requestedAt || now,
        approvedAt: leaveData.approvedAt || now,
        status: (leaveData.status as 'pending' | 'approved' | 'rejected') || 'approved',
      };

      if (process.env.NODE_ENV !== 'production') console.log('📝 [STORAGE] Processed data for insertion:', JSON.stringify(processedData, null, 2));

      // Insert IT leave
      const [leave] = await db.insert(itLeaves).values(processedData).returning();

      // Obtener el empleado actual para guardar sus horas originales
      const [currentEmployee] = await db
        .select()
        .from(employees)
        .where(eq(employees.idGlovo, leaveData.employeeId));
      
      if (!currentEmployee) {
        throw new Error(`Employee with ID ${leaveData.employeeId} not found`);
      }
      
      // Siempre guardar las horas actuales como original_hours si no están ya guardadas
      const originalHours = currentEmployee.originalHours !== null ? currentEmployee.originalHours : currentEmployee.horas || 0;

      // Update employee status to 'it_leave' and set fechaIncidencia
      await db.update(employees)
        .set({
          status: 'it_leave',
          fechaIncidencia: processedData.leaveDate,
          originalHours: originalHours, // Guardar las horas originales
          horas: 0, // Poner las horas actuales a 0
          updatedAt: now,
        } as Record<string, unknown>)
        .where(eq(employees.idGlovo, leaveData.employeeId));

      if (process.env.NODE_ENV !== 'production') console.log('✅ [STORAGE] IT leave created and employee updated:', JSON.stringify(leave, null, 2));
      return leave;
    } catch (_error) {
      console.error('💥 [STORAGE] Error in createItLeave:', _error);
      console.error('💥 [STORAGE] Original data that failed:', JSON.stringify(leaveData, null, 2));
      throw _error;
    }
  }

  // Notification operations
  async getAllNotifications (): Promise<Notification[]> {
    return await db.select().from(notifications).orderBy(desc(notifications.createdAt));
  }

  async updateNotificationStatus (id: number, status: 'pending' | 'pending_laboral' | 'pendiente_laboral' | 'approved' | 'rejected' | 'processed'): Promise<Notification> {
    const [notification] = await db
      .update(notifications)
      .set({ status, updatedAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    return notification;
  }

  async updateNotificationStatusWithDate (id: number, status: 'pending' | 'pending_laboral' | 'approved' | 'rejected' | 'processed', processingDate: Date): Promise<Notification> {
    const [notification] = await db
      .update(notifications)
      .set({ status, processingDate, updatedAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    return notification;
  }

  async deleteNotification (id: number): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  // Dashboard metrics
  async getDashboardMetrics () {
    if (process.env.NODE_ENV !== 'production') console.log('📊 [METRICS] Calculando métricas del dashboard...');

    // Obtener todos los datos necesarios
    const [allEmployees, allCompanyLeaves, allNotifications] = await Promise.all([
      this.getAllEmployees(),
      this.getAllCompanyLeaves(),
      this.getAllNotifications(),
    ]);

    if (process.env.NODE_ENV !== 'production') console.log('📊 [METRICS] Datos obtenidos:', {
      empleadosEnTablaEmpleados: allEmployees.length,
      empleadosEnBajaEmpresa: allCompanyLeaves.length,
      notificaciones: allNotifications.length,
    });

    // TOTAL DE EMPLEADOS: Todos los que existen (activos + baja IT + baja empresa)
    const totalEmployees = allEmployees.length + allCompanyLeaves.length;

    // TRABAJADORES ACTIVOS: Solo activos + baja IT (excluye baja empresa y pendientes de baja empresa)
    const activeEmployees = allEmployees.filter(emp =>
      emp.status === 'active' || emp.status === 'it_leave',
    );

    // EMPLEADOS EN BAJA IT: Solo los que están en baja IT
    const itLeaveEmployees = allEmployees.filter(emp => emp.status === 'it_leave');

    // EMPLEADOS EN PENDIENTE LABORAL: Solo los que están en pending_laboral
    const pendingLaboralEmployees = allEmployees.filter(emp => emp.status === 'pending_laboral');

    // EMPLEADOS PENALIZADOS: Solo los que están en penalizado
    const penalizedEmployees = allEmployees.filter(emp => emp.status === 'penalizado');

    // NOTIFICACIONES PENDIENTES: Solo las que necesitan acción del super admin
    const pendingNotifications = allNotifications.filter(notif => notif.status === 'pending');

    // EMPLEADOS POR CIUDAD: Incluir TODOS los empleados (activos + baja IT + baja empresa)
    const allEmployeesForCities = [...allEmployees];

    // Agregar empleados de baja empresa (extraer de employeeData JSON)
    allCompanyLeaves.forEach(leave => {
      if (leave.employeeData) {
        const empData = leave.employeeData as Record<string, unknown>;
        allEmployeesForCities.push({
          ...empData,
          status: `company_leave_${leave.status}`, // para identificación
        } as any);
      }
    });

    // Agrupar por código de ciudad
    const cityCodeGroups = allEmployeesForCities.reduce((acc, emp) => {
      const cityCode = emp.cityCode || 'N/A';
      if (!acc[cityCode]) acc[cityCode] = 0;
      acc[cityCode]++;
      return acc;
    }, {} as Record<string, number>);

    // Convertir a array y ordenar por cantidad (mayor a menor)
    const employeesByCityCode = Object.entries(cityCodeGroups)
      .map(([cityCode, count]) => ({ cityCode, count }))
      .sort((a, b) => (b.count as number) - (a.count as number));

    const metrics = {
      totalEmployees, // TODOS: activos + baja IT + baja empresa
      activeEmployees: activeEmployees.length, // TRABAJANDO: activos + baja IT
      itLeaves: itLeaveEmployees.length, // SOLO BAJA IT
      pendingLaboral: pendingLaboralEmployees.length, // EMPLEADOS EN PENDIENTE LABORAL
      penalizedEmployees: penalizedEmployees.length, // EMPLEADOS PENALIZADOS
      pendingActions: pendingNotifications.length, // NOTIFICACIONES PENDIENTES
      employeesByCityCode, // POR CÓDIGO DE CIUDAD (TODOS)
    };

    if (process.env.NODE_ENV !== 'production') console.log('📊 [METRICS] Métricas calculadas:', {
      totalEmployees: metrics.totalEmployees,
      activeEmployees: metrics.activeEmployees,
      itLeaves: metrics.itLeaves,
      pendingLaboral: metrics.pendingLaboral,
      penalized: metrics.penalizedEmployees,
      pendingActions: metrics.pendingActions,
      topCityCodes: metrics.employeesByCityCode.slice(0, 5),
    });

    return metrics;
  }

  // Bulk operations for replacing entire employee database
  async clearAllEmployees (): Promise<void> {
    if (process.env.NODE_ENV !== 'production') console.log('Clearing all employees from PostgreSQL database');
    await db.delete(employees);
  }

  async bulkCreateEmployees (employeeDataList: InsertEmployee[]): Promise<Employee[]> {
    if (process.env.NODE_ENV !== 'production') console.log('Bulk creating employees in PostgreSQL:', employeeDataList.length);

    try {
      // Calcular CDP para cada empleado
      const employeesWithCDP = employeeDataList.map(employee => ({
        ...employee,
        cdp: calculateCDP(employee.horas),
      }));

      if (process.env.NODE_ENV !== 'production') console.log('Processed employees with CDP:', employeesWithCDP.length);

      // Verificar si hay IDs duplicados en la lista de importación
      const idGlovoList = employeesWithCDP.map(emp => emp.idGlovo).filter(id => id && id.trim() !== '');
      const uniqueIds = new Set(idGlovoList);
      if (idGlovoList.length !== uniqueIds.size) {
        const duplicates = idGlovoList.filter((id, index) => idGlovoList.indexOf(id) !== index);
        throw new Error(`Error: IDs duplicados encontrados en el archivo de importación: ${duplicates.join(', ')}`);
      }

      // Verificar si alguno de los IDs ya existe en la base de datos
      const existingEmployees = await db
        .select({ idGlovo: employees.idGlovo, nombre: employees.nombre, apellido: employees.apellido })
        .from(employees)
        .where(inArray(employees.idGlovo, idGlovoList));

      if (existingEmployees.length > 0) {
        const existingIds = existingEmployees.map(emp => `${emp.idGlovo} (${emp.nombre} ${emp.apellido || ''})`);
        throw new Error(`Error: Los siguientes IDs ya existen en la base de datos: ${existingIds.join(', ')}. No se puede importar empleados con IDs duplicados.`);
      }

      // Insertar empleados (sin ON CONFLICT ya que verificamos duplicados)
      const createdEmployees = await db
        .insert(employees)
        .values(employeesWithCDP as InsertEmployee[])
        .returning();
      
      if (process.env.NODE_ENV !== 'production') console.log('Bulk operation completed. Total employees:', createdEmployees.length);
      return createdEmployees;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('❌ Error in bulkCreateEmployees:', error);
      throw error;
    }
  }

  // Utility methods for data validation and parsing
  private parseDate (dateValue: string | Date | null | undefined): Date | null {
    if (!dateValue) return null;
    if (dateValue instanceof Date) return dateValue;
    if (typeof dateValue === 'string') {
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  }

  private parseBoolean (value: string | boolean | null | undefined): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes';
    }
    return false;
  }

  private validateStatus (status: string | null | undefined): string {
    if (!status) return 'active';
    const validStatuses = ['it_leave', 'active', 'company_leave_pending', 'company_leave_approved', 'pending_laboral', 'pendiente_laboral', 'penalizado'];
    return validStatuses.includes(status) ? status : 'active';
  }

  // City and fleet operations
  async getUniqueCities (): Promise<string[]> {
    try {
      // Consultar códigos de ciudad únicos de la tabla employees
      const result = await db
        .selectDistinct({ cityCode: employees.cityCode })
        .from(employees)
        .where(isNotNull(employees.cityCode))
        .orderBy(employees.cityCode);

      // Extraer los códigos de ciudad y filtrar valores nulos/vacíos
      const cityCodes = result
        .map(row => row.cityCode)
        .filter(cityCode => cityCode && cityCode.trim() !== '')
        .sort();

      // Si no hay códigos de ciudad en la base de datos, devolver las ciudades predefinidas
      if (cityCodes.length === 0) {
        console.log('⚠️ No se encontraron códigos de ciudad en la base de datos, usando ciudades predefinidas');
        return [...CIUDADES_DISPONIBLES];
      }

      console.log(`✅ Se encontraron ${cityCodes.length} códigos de ciudad únicos en la base de datos:`, cityCodes);
      return cityCodes;
    } catch (error) {
      console.error('❌ Error obteniendo códigos de ciudad únicos:', error);
      // En caso de error, devolver las ciudades predefinidas
      return [...CIUDADES_DISPONIBLES];
    }
  }

  async getUniqueFleets (): Promise<string[]> {
    try {
      // Consultar flotas únicas de la tabla employees
      const result = await db
        .selectDistinct({ flota: employees.flota })
        .from(employees)
        .where(isNotNull(employees.flota))
        .orderBy(employees.flota);

      // Extraer las flotas y filtrar valores nulos/vacíos
      const fleets = result
        .map(row => row.flota)
        .filter(flota => flota && flota.trim() !== '')
        .sort();

      return fleets;
    } catch (error) {
      console.error('❌ Error obteniendo flotas únicas:', error);
      return [];
    }
  }

  // System user operations
  async getAllSystemUsers (): Promise<SystemUser[]> {
    return await db.select().from(systemUsers).orderBy(systemUsers.createdAt);
  }

  async getSystemUser (id: number): Promise<SystemUser | undefined> {
    const [user] = await db.select().from(systemUsers).where(eq(systemUsers.id, id));
    return user;
  }

  async getSystemUserByEmail (email: string): Promise<SystemUser | undefined> {
    const [user] = await db.select().from(systemUsers).where(eq(systemUsers.email, email));
    return user;
  }

  async createSystemUser (userData: InsertSystemUser): Promise<SystemUser> {
    const [user] = await db.insert(systemUsers).values(userData).returning();
    return user;
  }

  async updateSystemUser (id: number, userData: UpdateSystemUser): Promise<SystemUser> {
    const [user] = await db
      .update(systemUsers)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(systemUsers.id, id))
      .returning();
    return user;
  }

  async deleteSystemUser (id: number): Promise<void> {
    await db.delete(systemUsers).where(eq(systemUsers.id, id));
  }

  async updateSystemUserLastLogin (id: number): Promise<void> {
    await db
      .update(systemUsers)
      .set({ lastLogin: new Date() })
      .where(eq(systemUsers.id, id));
  }

  async updateSystemUserPassword (id: number, hashedPassword: string): Promise<SystemUser> {
    const [user] = await db
      .update(systemUsers)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(systemUsers.id, id))
      .returning();
    return user;
  }

  // Audit log operations
  async createAuditLog (logData: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(logData).returning();
    return log;
  }

  async getAllAuditLogs (limit: number = 1000): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  async getAuditLogsByUser (userId: string, limit: number = 100): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(auditLogs.createdAt)
      .limit(limit);
  }

  async getAuditLogsByAction (action: string, limit: number = 100): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, action))
      .orderBy(auditLogs.createdAt)
      .limit(limit);
  }

  async getAuditLogsByEntity (entityType: string, entityId?: string, limit: number = 100): Promise<AuditLog[]> {
    if (entityId) {
      return await db
        .select()
        .from(auditLogs)
        .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)))
        .orderBy(auditLogs.createdAt)
        .limit(limit);
    }

    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityType, entityType))
      .orderBy(auditLogs.createdAt)
      .limit(limit);
  }

  async getAuditLogsStats (): Promise<{
    totalLogs: number;
    logsByAction: Record<string, number>;
    logsByUser: Record<string, number>;
    logsByEntity: Record<string, number>;
    recentActivity: AuditLog[];
  }> {
    const allLogs = await this.getAllAuditLogs(1000);

    const logsByAction: Record<string, number> = {};
    const logsByUser: Record<string, number> = {};
    const logsByEntity: Record<string, number> = {};

    allLogs.forEach(log => {
      logsByAction[log.action] = (logsByAction[log.action] || 0) + 1;
      logsByUser[log.userId] = (logsByUser[log.userId] || 0) + 1;
      logsByEntity[log.entityType] = (logsByEntity[log.entityType] || 0) + 1;
    });

    return {
      totalLogs: allLogs.length,
      logsByAction,
      logsByUser,
      logsByEntity,
      recentActivity: allLogs.slice(0, 10),
    };
  }

  // Penalization operations
  async penalizeEmployee (employeeId: string, startDate: string, endDate: string, observations: string): Promise<Employee> {
    try {
      // Get current employee data
      const employee = await this.getEmployee(employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      // Store original hours if not already stored
      const originalHours = employee.originalHours || employee.horas || 0;

      // Parse dates for comparison
      const startDateObj = new Date(startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDateObj.setHours(0, 0, 0, 0);

      // Determine if penalization should be applied immediately or scheduled
      const shouldApplyImmediately = startDateObj <= today;

      // Update employee with penalization data
      const updateData: Record<string, unknown> = {
        penalizationStartDate: startDate,
        penalizationEndDate: endDate,
        originalHours: originalHours,
        updatedAt: new Date(),
      };

      if (shouldApplyImmediately) {
        // Apply penalization immediately if start date is today or in the past
        updateData.status = 'penalizado';
        updateData.horas = employee.horas; // Keep current hours instead of setting to 0
      } else {
        // Schedule penalization for future date - keep current status and hours
        updateData.status = employee.status; // Keep current status
        updateData.horas = employee.horas; // Keep current hours
      }

      const [updatedEmployee] = await db
        .update(employees)
        .set(updateData)
        .where(eq(employees.idGlovo, employeeId))
        .returning();

      // Create notification for the penalization
      const notificationTitle = shouldApplyImmediately ? 'Empleado Penalizado/Vacaciones' : 'Penalización Programada';
      const notificationMessage = shouldApplyImmediately 
        ? `El empleado ${employee.nombre} ${employee.apellido || ''} (${employeeId}) ha sido penalizado/vacaciones desde ${startDate} hasta ${endDate}. Observaciones: ${observations}`
        : `El empleado ${employee.nombre} ${employee.apellido || ''} (${employeeId}) será penalizado/vacaciones desde ${startDate} hasta ${endDate}. Observaciones: ${observations}`;

      await this.createNotification({
        type: 'employee_update',
        title: notificationTitle,
        message: notificationMessage,
        requestedBy: 'SYSTEM',
        status: 'processed',
        metadata: {
          ...getEmpleadoMetadata(employee),
          employeeId,
          startDate,
          endDate,
          observations,
          originalHours,
          scheduled: !shouldApplyImmediately,
          appliedImmediately: shouldApplyImmediately,
        },
      });

      return updatedEmployee;
    } catch (error) {
      console.error('Error penalizing employee:', error);
      throw error;
    }
  }

  async removePenalization (employeeId: string): Promise<Employee> {
    try {
      // Get current employee data to access originalHours
      const employee = await this.getEmployee(employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      // Restore original hours or keep current hours if no originalHours stored
      const hoursToRestore = employee.originalHours || employee.horas || 0;

      const [updatedEmployee] = await db
        .update(employees)
        .set({
          penalizationStartDate: null,
          penalizationEndDate: null,
          status: 'active',
          horas: hoursToRestore, // Restore original hours
          originalHours: null, // Clear original hours after restoration
          updatedAt: new Date(),
        })
        .where(eq(employees.idGlovo, employeeId))
        .returning();

      // Create notification for the penalization removal
      await this.createNotification({
        type: 'employee_update',
        title: 'Penalización Removida',
        message: `La penalización del empleado ${employee.nombre} ${employee.apellido || ''} (${employeeId}) ha sido removida. Horas restauradas: ${hoursToRestore}`,
        requestedBy: 'SYSTEM',
        status: 'processed',
        metadata: {
          ...getEmpleadoMetadata(employee),
          employeeId,
          restoredHours: hoursToRestore,
        },
      });

      return updatedEmployee;
    } catch (error) {
      console.error('Error removing employee penalization:', error);
      throw error;
    }
  }

  async reactivateEmployee (employeeId: string, reactivatedBy?: string): Promise<Employee> {
    try {
      // Obtener el empleado actual antes de la reactivación
      const [currentEmployee] = await db
        .select()
        .from(employees)
        .where(eq(employees.idGlovo, employeeId));
      
      // Si el empleado no existe en employees, verificar si está en company_leaves
      if (!currentEmployee) {
        const [leaveRecord] = await db
          .select()
          .from(companyLeaves)
          .where(eq(companyLeaves.employeeId, employeeId))
          .orderBy(desc(companyLeaves.createdAt))
          .limit(1);
        
        if (!leaveRecord) {
          throw new Error(`Employee with ID ${employeeId} not found in employees or company_leaves`);
        }
        
        // Extraer datos del empleado desde company_leaves
        const employeeData = leaveRecord.employeeData as any;
        if (!employeeData) {
          throw new Error(`No employee data found for ${employeeId} in company_leaves`);
        }
        
        // Crear el empleado en la tabla employees
        const [newEmployee] = await db
          .insert(employees)
          .values({
            idGlovo: employeeId,
            nombre: employeeData.nombre || 'Sin nombre',
            apellido: employeeData.apellido || '',
            emailGlovo: employeeData.emailGlovo || '',
            turno1: employeeData.turno || employeeData.turno1 || '',
            telefono: employeeData.telefono || '',
            email: employeeData.email || '',
            horas: employeeData.horas || 0,
            cdp: employeeData.cdp || 0,
            complementaries: employeeData.complementaries || 0,
            ciudad: employeeData.ciudad || '',
            citycode: employeeData.cityCode || '',
            dniNie: employeeData.dniNie || '',
            iban: employeeData.iban || '',
            vehiculo: employeeData.vehiculo || '',
            naf: employeeData.naf || '',
            fechaAltaSegSoc: employeeData.fechaAltaSegSoc ? new Date(employeeData.fechaAltaSegSoc) : null,
            status: 'active',
            flota: employeeData.flota || '',
            vacacionesDisfrutadas: employeeData.vacacionesDisfrutadas || 0,
            vacacionesPendientes: employeeData.vacacionesPendientes || 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        
        // Actualizar el estado en company_leaves a 'reactivated'
        await db
          .update(companyLeaves)
          .set({ 
            status: 'reactivated',
            updatedAt: new Date()
          })
          .where(eq(companyLeaves.employeeId, employeeId));
        
        console.log(`✅ Employee ${employeeId} reactivated from company_leaves and created in employees`);
        return newEmployee;
      }
      
      // Verificar si el empleado está en baja IT o baja empresa
      if (currentEmployee.status !== 'it_leave' && currentEmployee.status !== 'company_leave_approved') {
        throw new Error(`Employee ${employeeId} is not in IT leave or company leave status`);
      }
      
      // Preparar los datos de actualización
      const updateData: Record<string, unknown> = {
        status: 'active',
        updatedAt: new Date(),
      };
      
      // Si tiene horas originales guardadas, restaurarlas
      if (currentEmployee.originalHours !== null) {
        const leaveType = currentEmployee.status === 'it_leave' ? 'IT leave' : 'company leave';
        console.log(`🔄 Reactivating employee ${employeeId} from ${leaveType}. Restoring hours from ${currentEmployee.horas} to ${currentEmployee.originalHours}`);
        updateData.horas = currentEmployee.originalHours;
        updateData.originalHours = null; // Limpiar las horas originales
      }
      
      // Actualizar el empleado
      const [employee] = await db
        .update(employees)
        .set(updateData)
        .where(eq(employees.idGlovo, employeeId))
        .returning();

      // Log de reactivación (sin actualizar campos en company_leaves)
      if (currentEmployee.status === 'company_leave_approved') {
        console.log(`✅ Employee ${employeeId} reactivated from company leave`);
      }
      
      return employee;
    } catch (error) {
      console.error(`❌ Error reactivating employee ${employeeId}:`, error);
      throw error;
    }
  }

  // Obtener empleados ya reactivados desde bajas empresa
  async getReactivatedEmployeesFromLeaves(): Promise<string[]> {
    try {
      // Buscar empleados que están en company_leaves con status 'approved' 
      // pero que en employees tienen status 'active'
      const reactivatedEmployees = await db
        .select({ employeeId: companyLeaves.employeeId })
        .from(companyLeaves)
        .innerJoin(employees, eq(companyLeaves.employeeId, employees.idGlovo))
        .where(
          and(
            eq(companyLeaves.status, 'approved'),
            eq(employees.status, 'active')
          )
        );

      return reactivatedEmployees.map(emp => emp.employeeId);
    } catch (error) {
      console.error('❌ Error getting reactivated employees from leaves:', error);
      return [];
    }
  }

  // Check and auto-restore expired penalizations
  async activateScheduledPenalizations (): Promise<{
    checked: number;
    activated: number;
    activatedEmployees: Employee[];
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day for date comparison

      // Get all employees with scheduled penalizations that should start today
      const scheduledPenalizations = await db
        .select()
        .from(employees)
        .where(
          and(
            ne(employees.status, 'penalizado'), // Not already penalized
            isNotNull(employees.penalizationStartDate),
            isNotNull(employees.penalizationEndDate),
            sql`${employees.penalizationStartDate} <= ${today}`,
            sql`${employees.penalizationEndDate} >= ${today}`
          )
        );

      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔍 [PENALIZATION] Checking ${scheduledPenalizations.length} scheduled penalizations to activate`);
      }

      const activatedEmployees: Employee[] = [];

      // Activate each scheduled penalization
      for (const employee of scheduledPenalizations) {
        try {
          const [activatedEmployee] = await db
            .update(employees)
            .set({
              status: 'penalizado',
              horas: employee.horas, // Keep current hours instead of setting to 0
              updatedAt: new Date(),
            } as Record<string, unknown>)
            .where(eq(employees.idGlovo, employee.idGlovo))
            .returning();

          activatedEmployees.push(activatedEmployee);

          // Create notification for the activation
          await this.createNotification({
            type: 'employee_update',
            title: 'Penalización/Vacaciones Activada',
            message: `La penalización/vacaciones del empleado ${employee.nombre} ${employee.apellido || ''} (${employee.idGlovo}) ha sido activada automáticamente.`,
            requestedBy: 'SYSTEM',
            status: 'processed',
            metadata: {
              ...getEmpleadoMetadata(employee),
              employeeId: employee.idGlovo,
              startDate: employee.penalizationStartDate,
              endDate: employee.penalizationEndDate,
              originalHours: employee.originalHours,
              activated: true,
              automatic: true,
            },
          });

          if (process.env.NODE_ENV !== 'production') {
            console.log(`✅ [PENALIZATION] Auto-activated penalization for ${employee.nombre} ${employee.apellido || ''} (${employee.idGlovo})`);
          }
        } catch (error) {
          console.error(`❌ [PENALIZATION] Error auto-activating penalization for ${employee.idGlovo}:`, error);
        }
      }

      return {
        checked: scheduledPenalizations.length,
        activated: activatedEmployees.length,
        activatedEmployees,
      };
    } catch (error) {
      console.error('❌ [PENALIZATION] Error activating scheduled penalizations:', error);
      throw error;
    }
  }

  async checkAndRestoreExpiredPenalizations (): Promise<{
    checked: number;
    restored: number;
    restoredEmployees: Employee[];
    pendingPenalizations: Employee[];
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day for date comparison

      // Get all penalized employees with expired end dates
      const expiredPenalizations = await db
        .select()
        .from(employees)
        .where(
          and(
            eq(employees.status, 'penalizado'),
            isNotNull(employees.penalizationEndDate),
            sql`${employees.penalizationEndDate} < ${today}`
          )
        );

      // Get all penalized employees with future end dates (for information)
      const pendingPenalizations = await db
        .select()
        .from(employees)
        .where(
          and(
            eq(employees.status, 'penalizado'),
            isNotNull(employees.penalizationEndDate),
            sql`${employees.penalizationEndDate} >= ${today}`
          )
        );

      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔍 [PENALIZATION] Checking ${expiredPenalizations.length} expired penalizations`);
        console.log(`⏳ [PENALIZATION] Found ${pendingPenalizations.length} pending penalizations`);
      }

      const restoredEmployees: Employee[] = [];

      // Restore each expired penalization
      for (const employee of expiredPenalizations) {
        try {
          const restoredEmployee = await this.removePenalization(employee.idGlovo);
          restoredEmployees.push(restoredEmployee);

          if (process.env.NODE_ENV !== 'production') {
            console.log(`✅ [PENALIZATION] Auto-restored penalization for ${employee.nombre} ${employee.apellido || ''} (${employee.idGlovo})`);
          }
        } catch (error) {
          console.error(`❌ [PENALIZATION] Error auto-restoring penalization for ${employee.idGlovo}:`, error);
        }
      }

      return {
        checked: expiredPenalizations.length,
        restored: restoredEmployees.length,
        restoredEmployees,
        pendingPenalizations,
      };
    } catch (error) {
      console.error('❌ [PENALIZATION] Error checking expired penalizations:', error);
      throw error;
    }
  }

  async setEmployeeItLeave (employeeId: string, fechaIncidencia: string | Date): Promise<Employee> {
    const now = new Date();
    
    // Primero obtener el empleado actual para guardar sus horas originales
    const [currentEmployee] = await db
      .select()
      .from(employees)
      .where(eq(employees.idGlovo, employeeId));
    
    if (!currentEmployee) {
      throw new Error(`Employee with ID ${employeeId} not found`);
    }
    
    // Guardar las horas actuales como original_hours si no están ya guardadas
    const originalHours = currentEmployee.originalHours || currentEmployee.horas;
    
    const [updatedEmployee] = await db
      .update(employees)
      .set({
        status: 'it_leave',
        fechaIncidencia: fechaIncidencia || now,
        originalHours: originalHours, // Guardar las horas originales
        horas: 0, // Poner las horas actuales a 0
        updatedAt: now,
      } as Record<string, unknown>)
      .where(eq(employees.idGlovo, employeeId))
      .returning();
    return updatedEmployee;
  }

  // Get penalizations expiring soon (within next 7 days)
  async getPenalizationsExpiringSoon (days: number = 7): Promise<Employee[]> {
    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + days);
      today.setHours(0, 0, 0, 0);
      futureDate.setHours(23, 59, 59, 999);

      const expiringPenalizations = await db
        .select()
        .from(employees)
        .where(
          and(
            eq(employees.status, 'penalizado'),
            isNotNull(employees.penalizationEndDate),
            sql`${employees.penalizationEndDate} >= ${today}`,
            sql`${employees.penalizationEndDate} <= ${futureDate}`
          )
        );

      return expiringPenalizations;
    } catch (error) {
      console.error('❌ [PENALIZATION] Error getting expiring penalizations:', error);
      throw error;
    }
  }

  async getCompanyLeaveById (id: number): Promise<CompanyLeave | undefined> {
    const [leave] = await db.select().from(companyLeaves).where(eq(companyLeaves.id, id));
    return leave;
  }

  async updateCompanyLeaveReason (id: number, motivoNuevo: string, comentarios: string | null): Promise<CompanyLeave> {
    const [leave] = await db
      .update(companyLeaves)
      .set({
        leaveType: motivoNuevo as any,
        comments: comentarios,
        updatedAt: new Date(),
      })
      .where(eq(companyLeaves.id, id))
      .returning();
    return leave;
  }

  async createEmployeeLeaveHistory (data: {
    employeeId: string,
    leaveType: string,
    motivoAnterior: string,
    motivoNuevo: string,
    comentarios?: string | null,
    cambiadoPor: string,
    rolUsuario: string,
  }): Promise<void> {
    await db.insert(employeeLeaveHistory).values({
      employeeId: data.employeeId,
      leaveType: data.leaveType,
      motivoAnterior: data.motivoAnterior,
      motivoNuevo: data.motivoNuevo,
      comentarios: data.comentarios || null,
      cambiadoPor: data.cambiadoPor,
      rolUsuario: data.rolUsuario,
      fechaCambio: new Date(),
    });
  }

  async getEmployeeLeaveHistory (employeeId: string): Promise<any[]> {
    return await db.select().from(employeeLeaveHistory)
      .where(eq(employeeLeaveHistory.employeeId, employeeId))
      .orderBy(desc(employeeLeaveHistory.fechaCambio));
  }

  // --- FIN DE FUNCIONES CORRECTAS ---

  /**
   * Elimina empleados con status 'company_leave_approved' que ya existen en company_leaves.
   * Retorna un resumen de los empleados eliminados.
   */
  async getEmployeesToClean(): Promise<{ employees: any[]; total: number }> {
    // Obtener SOLO empleados con estado 'company_leave_approved'
    const empleados = await db.select().from(employees).where(eq(employees.status, 'company_leave_approved'));
    
    if (!empleados.length) {
      return { employees: [], total: 0 };
    }

    // Obtener registros de company_leaves para verificar que tienen baja aprobada
    const leaves = await db.select({ 
      employeeId: companyLeaves.employeeId,
      status: companyLeaves.status 
    }).from(companyLeaves);
    
    // Filtrar solo los que tienen estado 'approved' en company_leaves
    const leavesAprobadas = leaves.filter(l => l.status === 'approved');
    const leavesIds = new Set(leavesAprobadas.map(l => l.employeeId));
    
    // Filtrar empleados que tienen baja aprobada en company_leaves
    const empleadosAEliminar = empleados.filter(emp => leavesIds.has(emp.idGlovo));
    
    return { 
      employees: empleadosAEliminar, 
      total: empleadosAEliminar.length 
    };
  }

  async cleanCompanyLeaveApprovedEmployees(): Promise<{ deleted: string[]; total: number }> {
    // Obtener SOLO empleados con estado 'company_leave_approved'
    const empleados = await db.select().from(employees).where(eq(employees.status, 'company_leave_approved'));
    
    if (!empleados.length) {
      console.log('📋 No hay empleados con estado company_leave_approved para limpiar');
      return { deleted: [], total: 0 };
    }

    console.log(`📋 Encontrados ${empleados.length} empleados con estado company_leave_approved`);

    // Obtener registros de company_leaves para verificar que tienen baja aprobada
    const leaves = await db.select({ 
      employeeId: companyLeaves.employeeId,
      status: companyLeaves.status 
    }).from(companyLeaves);
    
    // Filtrar solo los que tienen estado 'approved' en company_leaves
    const leavesAprobadas = leaves.filter(l => l.status === 'approved');
    const leavesIds = new Set(leavesAprobadas.map(l => l.employeeId));
    
    // Filtrar empleados que tienen baja aprobada en company_leaves
    const empleadosAEliminar = empleados.filter(emp => leavesIds.has(emp.idGlovo));
    
    if (!empleadosAEliminar.length) {
      console.log('📋 No hay empleados con baja aprobada en company_leaves para eliminar');
      return { deleted: [], total: 0 };
    }

    console.log(`🗑️ Eliminando ${empleadosAEliminar.length} empleados con baja empresa aprobada:`);
    empleadosAEliminar.forEach(emp => {
      console.log(`  - ${emp.nombre} ${emp.apellido} (${emp.idGlovo}) - Estado: ${emp.status}`);
    });

    // Eliminar empleados con doble verificación de estado
    await db.delete(employees).where(
      and(
        eq(employees.status, 'company_leave_approved'),
        inArray(employees.idGlovo, empleadosAEliminar.map(e => e.idGlovo))
      )
    );

    console.log(`✅ Eliminación completada: ${empleadosAEliminar.length} empleados`);
    
    return { 
      deleted: empleadosAEliminar.map(e => e.idGlovo), 
      total: empleadosAEliminar.length 
    };
  }

  async fixItLeaveHours (employeeId: string): Promise<Employee> {
    const now = new Date();
    const [currentEmployee] = await db
      .select()
      .from(employees)
      .where(eq(employees.idGlovo, employeeId));
    if (!currentEmployee) throw new Error(`Employee with ID ${employeeId} not found`);
    if (currentEmployee.status !== 'it_leave') throw new Error(`Employee ${employeeId} is not in IT leave status`);
    if (currentEmployee.originalHours !== null) return currentEmployee;
    const originalHours = currentEmployee.horas;
    const [updatedEmployee] = await db
      .update(employees)
      .set({ originalHours, horas: 0, updatedAt: now } as Record<string, unknown>)
      .where(eq(employees.idGlovo, employeeId))
      .returning();
    return updatedEmployee;
  }

  async fixCompanyLeaveHours (employeeId: string): Promise<Employee> {
    const now = new Date();
    const [currentEmployee] = await db
      .select()
      .from(employees)
      .where(eq(employees.idGlovo, employeeId));
    if (!currentEmployee) throw new Error(`Employee with ID ${employeeId} not found`);
    if (currentEmployee.status !== 'company_leave_approved') throw new Error(`Employee ${employeeId} is not in company leave approved status`);
    if (currentEmployee.originalHours !== null && currentEmployee.horas === 0) return currentEmployee;
    const originalHours = currentEmployee.originalHours !== null ? currentEmployee.originalHours : currentEmployee.horas || 0;
    const [updatedEmployee] = await db
      .update(employees)
      .set({ originalHours, horas: 0, updatedAt: now } as Record<string, unknown>)
      .where(eq(employees.idGlovo, employeeId))
      .returning();
    await this.createNotification({
      type: 'employee_update',
      title: 'Corrección de Horas en Baja Empresa',
      message: `Se corrigieron las horas del empleado ${currentEmployee.nombre} ${currentEmployee.apellido || ''} (${employeeId}) en baja empresa. Horas originales: ${originalHours}, horas actuales: 0`,
      requestedBy: 'SYSTEM',
      status: 'processed',
      metadata: {
        ...getEmpleadoMetadata(currentEmployee),
        employeeId,
        action: 'fix_company_leave_hours',
        originalHours,
        currentHours: 0,
        previousHours: currentEmployee.horas,
        previousOriginalHours: currentEmployee.originalHours,
      },
    });
    return updatedEmployee;
  }

  async verifyAndFixAllEmployeeHours(): Promise<{
    checked: number;
    fixed: number;
    fixedEmployees: string[];
    errors: string[];
  }> {
    const results = {
      checked: 0,
      fixed: 0,
      fixedEmployees: [] as string[],
      errors: [] as string[],
    };
    try {
      const employeesToCheck = await db
        .select()
        .from(employees)
        .where(
          or(
            eq(employees.status, 'it_leave'),
            eq(employees.status, 'company_leave_approved'),
            eq(employees.status, 'penalizado')
          )
        );
      results.checked = employeesToCheck.length;
      for (const employee of employeesToCheck) {
        try {
          let needsFix = false;
          switch (employee.status) {
            case 'it_leave':
              if (employee.originalHours === null || employee.horas !== 0) needsFix = true;
              break;
            case 'company_leave_approved':
              if (employee.originalHours === null || employee.horas !== 0) needsFix = true;
              break;
            case 'penalizado':
              if (employee.originalHours === null || employee.horas !== 0) needsFix = true;
              break;
          }
          if (needsFix) {
            switch (employee.status) {
              case 'it_leave':
                await this.fixItLeaveHours(employee.idGlovo);
                break;
              case 'company_leave_approved':
                await this.fixCompanyLeaveHours(employee.idGlovo);
                break;
              case 'penalizado':
                if (employee.originalHours === null) {
                  const originalHours = employee.horas || 0;
                  await db
                    .update(employees)
                    .set({ originalHours, horas: 0, updatedAt: new Date() } as Record<string, unknown>)
                    .where(eq(employees.idGlovo, employee.idGlovo));
                }
                break;
            }
            results.fixed++;
            results.fixedEmployees.push(employee.idGlovo);
          }
        } catch (error) {
          results.errors.push(`Error fixing employee ${employee.idGlovo}: ${error}`);
        }
      }
      return results;
    } catch (error) {
      throw error;
    }
  }

  // ===== MÉTODOS DEL MÓDULO CAPTACIÓN/SALIDAS =====

  async getCaptationDashboard(): Promise<CaptationDashboardData[]> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM get_captation_dashboard()
      `);
      
      return result.rows.map((row: any) => ({
        ciudad: row.ciudad,
        horasFijasRequeridas: parseInt(String(row.horas_fijas_requeridas)) || 0,
        horasFijasActuales: parseInt(String(row.horas_fijas_actuales)) || 0,
        horasFijasPendientes: parseInt(String(row.horas_fijas_pendientes)) || 0,
        deficitHorasFijas: parseInt(String(row.deficit_horas_fijas)) || 0,
        totalEmpleadosActivos: parseInt(String(row.total_empleados_activos)) || 0,
        empleadosActivos: parseInt(String(row.empleados_activos)) || 0,
        empleadosBajaIt: parseInt(String(row.empleados_baja_it)) || 0,
        porcentajeCoberturaFijas: parseFloat(String(row.porcentaje_cobertura_fijas)) || 0,
      }));
    } catch (error) {
      console.error('Error getting captation dashboard:', error);
      throw error;
    }
  }

  async getCityHoursRequirement(ciudad: string): Promise<CityHoursRequirement | undefined> {
    try {
      const [requirement] = await db
        .select()
        .from(cityHoursRequirements)
        .where(eq(cityHoursRequirements.ciudad, ciudad));
      
      return requirement;
    } catch (error) {
      console.error('Error getting city hours requirement:', error);
      throw error;
    }
  }

  async getAllCityHoursRequirements(): Promise<CityHoursRequirement[]> {
    try {
      return await db
        .select()
        .from(cityHoursRequirements)
        .orderBy(cityHoursRequirements.ciudad);
    } catch (error) {
      console.error('Error getting all city hours requirements:', error);
      throw error;
    }
  }

  async createCityHoursRequirement(data: InsertCityHoursRequirement): Promise<CityHoursRequirement> {
    try {
      const [requirement] = await db
        .insert(cityHoursRequirements)
        .values(data)
        .returning();
      
      return requirement;
    } catch (error) {
      console.error('Error creating city hours requirement:', error);
      throw error;
    }
  }

  async updateCityHoursRequirement(
    ciudad: string, 
    data: UpdateCityHoursRequirement, 
    updatedBy: string,
    motivoCambio?: string
  ): Promise<CityHoursRequirement> {
    try {
      // Obtener el requerimiento actual para el historial
      const currentRequirement = await this.getCityHoursRequirement(ciudad);
      if (!currentRequirement) {
        throw new Error(`City hours requirement for ${ciudad} not found`);
      }

      // Actualizar el requerimiento
      const [updatedRequirement] = await db
        .update(cityHoursRequirements)
        .set({
          ...data,
          updatedAt: new Date(),
          updatedBy,
        })
        .where(eq(cityHoursRequirements.ciudad, ciudad))
        .returning();

      // Crear entrada en el historial
      await db.insert(cityHoursRequirementsHistory).values({
        cityRequirementId: currentRequirement.id,
        ciudad,
        horasFijasAnterior: currentRequirement.horasFijasRequeridas,
        horasFijasNuevo: data.horasFijasRequeridas || currentRequirement.horasFijasRequeridas,
        horasComplementariasAnterior: currentRequirement.horasComplementariasRequeridas,
        horasComplementariasNuevo: data.horasComplementariasRequeridas || currentRequirement.horasComplementariasRequeridas,
        changedBy: updatedBy,
        motivoCambio,
      });

      return updatedRequirement;
    } catch (error) {
      console.error('Error updating city hours requirement:', error);
      throw error;
    }
  }

  async getCityHoursRequirementHistory(ciudad: string, limit: number = 50): Promise<CityHoursRequirementHistory[]> {
    try {
      return await db
        .select()
        .from(cityHoursRequirementsHistory)
        .where(eq(cityHoursRequirementsHistory.ciudad, ciudad))
        .orderBy(desc(cityHoursRequirementsHistory.changedAt))
        .limit(limit);
    } catch (error) {
      console.error('Error getting city hours requirement history:', error);
      throw error;
    }
  }

  async getCityCurrentHours(ciudad: string): Promise<{
    ciudad: string;
    horasFijasActuales: number;
    horasComplementariasActuales: number;
    totalEmpleadosActivos: number;
    empleadosActivos: number;
    empleadosBajaIt: number;
  } | null> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM get_city_current_hours(${ciudad})
      `);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ciudad: String(row.ciudad),
        horasFijasActuales: parseInt(String(row.horas_fijas_actuales)) || 0,
        horasComplementariasActuales: parseInt(String(row.horas_complementarias_actuales)) || 0,
        totalEmpleadosActivos: parseInt(String(row.total_empleados_activos)) || 0,
        empleadosActivos: parseInt(String(row.empleados_activos)) || 0,
        empleadosBajaIt: parseInt(String(row.empleados_baja_it)) || 0,
      };
    } catch (error) {
      console.error('Error getting city current hours:', error);
      throw error;
    }
  }

  // Sincronización de last_order desde couriers_export
  async syncLastOrderFromCouriers(): Promise<{ updated: number; errors: string[] }> {
    try {
      // Verificar si ya se sincronizó en las últimas 6 horas
      const lastSyncCheck = await db.execute(
        sql`SELECT last_sync FROM sync_control WHERE sync_type = 'last_order' LIMIT 1`
      );
      
      if (lastSyncCheck.rows.length > 0) {
        const lastSync = new Date(String(lastSyncCheck.rows[0].last_sync));
        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
        
        if (lastSync > sixHoursAgo) {
          console.log('Last order sync skipped - already synced within 6 hours');
          return { updated: 0, errors: ['Already synced within 6 hours'] };
        }
      }
      
      // Ejecutar sincronización
      const result = await db.execute(
        sql`SELECT sync_last_order_from_couriers() as updated_count`
      );
      
      const updated = Number(result.rows[0]?.updated_count) || 0;
      
      // Actualizar control de sincronización
      await db.execute(
        sql`UPDATE sync_control SET last_sync = NOW(), records_updated = ${updated} WHERE sync_type = 'last_order'`
      );
      
      console.log(`✅ Last order sync completed: ${updated} records updated`);
      return { updated, errors: [] };
    } catch (error) {
      console.error('❌ Error syncing last order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      return { updated: 0, errors: [errorMessage] };
    }
  }

  // Importación de CSV de Fleet a couriers_export
  async importFleetFromCSV(csvBuffer: Buffer): Promise<{ imported: number; errors: string[] }> {
    try {
      // Convertir el buffer a string
      const csvContent = csvBuffer.toString('utf-8');
      const lines = csvContent.split('\n');
      
      if (lines.length < 2) {
        throw new Error('El archivo CSV debe tener al menos una fila de encabezados y una fila de datos');
      }
      
      // Obtener encabezados
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      // Verificar que los encabezados requeridos estén presentes
      const requiredHeaders = ['Courier ID', 'Platform', 'Status', 'Courier name', 'Last order date'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        throw new Error(`Encabezados requeridos faltantes: ${missingHeaders.join(', ')}`);
      }
      
      // TRUNCATE de la tabla couriers_export
      await db.execute(sql`TRUNCATE TABLE couriers_export`);
      
      // Procesar líneas de datos (excluyendo la primera línea de encabezados)
      const dataLines = lines.slice(1).filter(line => line.trim() !== '');
      
      let imported = 0;
      const errors: string[] = [];
      
      // Procesar en lotes para mejor rendimiento
      const batchSize = 100;
      for (let i = 0; i < dataLines.length; i += batchSize) {
        const batch = dataLines.slice(i, i + batchSize);
        const batchData: any[] = [];
        
        for (const line of batch) {
          try {
            // Parsear línea CSV (manejar comas dentro de campos entre comillas)
            const values = this.parseCSVLine(line);
            
            if (values.length >= headers.length) {
              const row: any = {};
              headers.forEach((header, index) => {
                row[header] = values[index]?.trim() || '';
              });
              batchData.push(row);
            }
          } catch (lineError) {
            const errorMessage = lineError instanceof Error ? lineError.message : 'Error desconocido';
            errors.push(`Línea ${i + batch.length + 1}: ${errorMessage}`);
          }
        }
        
        if (batchData.length > 0) {
          try {
            // Insertar lote en la base de datos
            const insertQuery = sql`
              INSERT INTO couriers_export (
                "Courier ID", "Platform", "Status", "Courier name", "Transport", 
                "Phone number", "Email", "Start date", "City code", "Cash balance", 
                "Kickouts", "Reassignments", "Booked slots", "Unbooked slots", 
                "Delivered orders", "Bad ratings", "Average delivery time (min)", 
                "Earnings glovo", "Earnings tips", "Earnings KM", "Total hours worked", 
                "Canceled orders", "% reassignments", "% attendance", "Kms driven", 
                "Last order date", "Hours Delivering"
              ) VALUES ${sql.join(
                batchData.map(row => sql`(
                  ${row['Courier ID']}, ${row['Platform']}, ${row['Status']}, 
                  ${row['Courier name']}, ${row['Transport'] || ''}, 
                  ${row['Phone number'] || ''}, ${row['Email'] || ''}, 
                  ${row['Start date'] || ''}, ${row['City code'] || ''}, 
                  ${row['Cash balance'] || '0'}, ${row['Kickouts'] || '0'}, 
                  ${row['Reassignments'] || '0'}, ${row['Booked slots'] || '0'}, 
                  ${row['Unbooked slots'] || '0'}, ${row['Delivered orders'] || '0'}, 
                  ${row['Bad ratings'] || '0'}, ${row['Average delivery time (min)'] || '0'}, 
                  ${row['Earnings glovo'] || '0'}, ${row['Earnings tips'] || '0'}, 
                  ${row['Earnings KM'] || '0'}, ${row['Total hours worked'] || '0'}, 
                  ${row['Canceled orders'] || '0'}, ${row['% reassignments'] || '0'}, 
                  ${row['% attendance'] || '0'}, ${row['Kms driven'] || '0'}, 
                  ${row['Last order date'] || ''}, ${row['Hours Delivering'] || '0'}
                )`),
                sql`, `
              )}
            `;
            
            await db.execute(insertQuery);
            imported += batchData.length;
          } catch (batchError) {
            console.error('❌ Error insertando lote:', batchError);
            const errorMessage = batchError instanceof Error ? batchError.message : 'Error desconocido';
            errors.push(`Error en lote ${Math.floor(i / batchSize) + 1}: ${errorMessage}`);
          }
        }
      }
      
      if (errors.length > 0) {
        console.log(`⚠️ Errores encontrados: ${errors.length}`);
      }
      
      return { imported, errors };
    } catch (error) {
      console.error('❌ Error en importación de CSV:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Error desconocido en importación de CSV');
      }
    }
  }

  // Función auxiliar para parsear líneas CSV
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result.map(field => field.replace(/^"|"$/g, ''));
  }

}
