import { PostgresStorage } from './storage-postgres.js';
import type { InsertAuditLog } from '../shared/schema.js';

const storage = new PostgresStorage();

export class AuditService {
  /**
   * Registra una acción en el log de auditoría
   */
  static async logAction ({
    userId,
    userRole,
    action,
    entityType,
    entityId,
    entityName,
    description,
    oldData,
    newData,
    req,
  }: {
    userId: string;
    userRole: 'super_admin' | 'admin' | 'normal';
    action: string;
    entityType: string;
    entityId?: string;
    entityName?: string;
    description: string;
    oldData?: Record<string, unknown>;
    newData?: Record<string, unknown>;
    req?: { headers?: Record<string, string> };
  }): Promise<void> {
    try {
      const logData: InsertAuditLog = {
        userId,
        userRole,
        action,
        entityType,
        entityId,
        entityName,
        description,
        oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
        newData: newData ? JSON.parse(JSON.stringify(newData)) : null,
        userAgent: req?.headers?.['user-agent'] || 'unknown',
      };

      await storage.createAuditLog(logData);

      console.log('✅ [AUDIT] Action logged:', {
        user: userId,
        action,
        entity: entityType,
        entityId,
        description,
      });
    } catch (error) {
      console.error('❌ [AUDIT] Failed to log action:', error);
      // No lanzamos el error para que no interrumpa la operación principal
    }
  }

  // ========================================
  // MÉTODOS ESPECÍFICOS PARA CADA ACCIÓN
  // ========================================

  static async logEmployeeCreation (
    userId: string,
    userRole: 'super_admin' | 'admin' | 'normal',
    employeeData: Record<string, unknown>,
    req?: { headers?: Record<string, string> },
  ) {
    await this.logAction({
      userId,
      userRole,
      action: 'create_employee',
      entityType: 'employee',
      entityId: employeeData.idGlovo as string,
      entityName: `${employeeData.nombre as string} ${employeeData.apellido as string || ''}`.trim(),
      description: `Empleado creado: ${employeeData.nombre as string} ${employeeData.apellido as string || ''} (${employeeData.idGlovo as string})`,
      newData: employeeData,
      req,
    });
  }

  static async logEmployeeUpdate (
    userId: string,
    userRole: 'super_admin' | 'admin' | 'normal',
    employeeId: string,
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>,
    req?: { headers?: Record<string, string> },
  ) {
    await this.logAction({
      userId,
      userRole,
      action: 'update_employee',
      entityType: 'employee',
      entityId: employeeId,
      entityName: `${newData.nombre as string || oldData.nombre as string} ${newData.apellido as string || oldData.apellido as string || ''}`.trim(),
      description: `Empleado actualizado: ${newData.nombre as string || oldData.nombre as string} ${newData.apellido as string || oldData.apellido as string || ''} (${employeeId})`,
      oldData,
      newData,
      req,
    });
  }

  static async logEmployeeDelete (
    userId: string,
    userRole: 'super_admin' | 'admin' | 'normal',
    employeeData: Record<string, unknown>,
    req?: { headers?: Record<string, string> },
  ) {
    await this.logAction({
      userId,
      userRole,
      action: 'delete_employee',
      entityType: 'employee',
      entityId: employeeData.idGlovo as string,
      entityName: `${employeeData.nombre as string} ${employeeData.apellido as string || ''}`.trim(),
      description: `Empleado eliminado: ${employeeData.nombre as string} ${employeeData.apellido as string || ''} (${employeeData.idGlovo as string})`,
      oldData: employeeData,
      req,
    });
  }

  static async logBulkImport (
    userId: string,
    userRole: 'super_admin' | 'admin' | 'normal',
    employeeCount: number,
    req?: { headers?: Record<string, string> },
  ) {
    await this.logAction({
      userId,
      userRole,
      action: 'bulk_import_employees',
      entityType: 'employee',
      entityName: `${employeeCount} empleados`,
      description: `Importación masiva realizada: ${employeeCount} empleados importados`,
      newData: { employeeCount, timestamp: new Date().toISOString() },
      req,
    });
  }

  static async logCompanyLeaveRequest (
    userId: string,
    userRole: 'super_admin' | 'admin' | 'normal',
    employeeData: Record<string, unknown>,
    leaveType: string,
    leaveDate: string,
    req?: { headers?: Record<string, string> },
  ) {
    await this.logAction({
      userId,
      userRole,
      action: 'request_company_leave',
      entityType: 'company_leave',
      entityId: employeeData.idGlovo as string,
      entityName: `${employeeData.nombre as string} ${employeeData.apellido as string || ''}`.trim(),
      description: `Solicitud de baja empresa: ${employeeData.nombre as string} ${
        employeeData.apellido as string || ''
      } - Tipo: ${leaveType} - Fecha: ${leaveDate}`,
      newData: { employeeId: employeeData.idGlovo as string, leaveType, leaveDate },
      req,
    });
  }

  static async logCompanyLeaveApproval (
    userId: string,
    userRole: 'super_admin',
    employeeData: Record<string, unknown>,
    leaveType: string,
    action: 'approve' | 'reject',
    processingDate: string,
    req?: { headers?: Record<string, string> },
  ) {
    await this.logAction({
      userId,
      userRole,
      action: action === 'approve' ? 'approve_company_leave' : 'reject_company_leave',
      entityType: 'company_leave',
      entityId: employeeData.idGlovo as string,
      entityName: `${employeeData.nombre as string} ${employeeData.apellido as string || ''}`.trim(),
      description:
        `Baja empresa ${action === 'approve' ? 'aprobada' : 'rechazada'}: ` +
        `${employeeData.nombre as string} ` +
        `${employeeData.apellido as string || ''} - Tipo: ${leaveType} - ` +
        `Fecha: ${processingDate}`,
      newData: { action, employeeId: employeeData.idGlovo as string, leaveType, processingDate },
      req,
    });
  }

  static async logItLeaveRequest (
    userId: string,
    userRole: 'super_admin' | 'admin' | 'normal',
    employeeData: Record<string, unknown>,
    leaveType: string,
    leaveDate: string,
    req?: { headers?: Record<string, string> },
  ) {
    await this.logAction({
      userId,
      userRole,
      action: 'request_it_leave',
      entityType: 'it_leave',
      entityId: employeeData.idGlovo as string,
      entityName: `${employeeData.nombre as string} ${employeeData.apellido as string || ''}`.trim(),
      description: `Baja IT procesada: ${employeeData.nombre as string} ${
        employeeData.apellido as string || ''
      } - Tipo: ${leaveType} - Fecha: ${leaveDate}`,
      newData: { employeeId: employeeData.idGlovo as string, leaveType, leaveDate },
      req,
    });
  }

  static async logEmployeeReactivation (
    userId: string,
    userRole: 'super_admin',
    employeeData: Record<string, unknown>,
    req?: { headers?: Record<string, string> },
  ) {
    await this.logAction({
      userId,
      userRole,
      action: 'reactivate_employee',
      entityType: 'employee',
      entityId: employeeData.idGlovo as string,
      entityName: `${employeeData.nombre as string} ${employeeData.apellido as string || ''}`.trim(),
      description: `Empleado reactivado desde baja IT: ${employeeData.nombre as string} ${
        employeeData.apellido as string || ''
      } (${employeeData.idGlovo as string}) - Cambiado de 'it_leave' a 'active'`,
      oldData: { status: 'it_leave' },
      newData: { status: 'active', reactivatedAt: new Date().toISOString() },
      req,
    });
  }

  static async logUserCreation (
    userId: string,
    userRole: 'super_admin',
    newUserData: Record<string, unknown>,
    req?: { headers?: Record<string, string> },
  ) {
    await this.logAction({
      userId,
      userRole,
      action: 'create_user',
      entityType: 'user',
      entityId: newUserData.email as string,
      entityName: `${newUserData.firstName as string} ${newUserData.lastName as string}`,
      description: `Usuario creado: ${newUserData.firstName as string} ${
        newUserData.lastName as string
      } (${newUserData.email as string}) - Rol: ${newUserData.role as string}`,
      newData: {
        email: newUserData.email as string,
        firstName: newUserData.firstName as string,
        lastName: newUserData.lastName as string,
        role: newUserData.role as string,
      },
      req,
    });
  }

  static async logUserUpdate (
    userId: string,
    userRole: 'super_admin',
    targetUserEmail: string,
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>,
    req?: { headers?: Record<string, string> },
  ) {
    await this.logAction({
      userId,
      userRole,
      action: 'update_user',
      entityType: 'user',
      entityId: targetUserEmail,
      entityName: `${newData.firstName as string || oldData.firstName as string} ${
        newData.lastName as string || oldData.lastName as string
      }`,
      description:
        'Usuario actualizado: ' +
        `${newData.firstName as string || oldData.firstName as string} ` +
        `${newData.lastName as string || oldData.lastName as string} ` +
        `(${targetUserEmail})`,
      oldData: {
        firstName: oldData.firstName as string,
        lastName: oldData.lastName as string,
        role: oldData.role as string,
        isActive: oldData.isActive as boolean,
      },
      newData: {
        firstName: newData.firstName as string,
        lastName: newData.lastName as string,
        role: newData.role as string,
        isActive: newData.isActive as boolean,
      },
      req,
    });
  }

  static async logUserDelete (
    userId: string,
    userRole: 'super_admin',
    deletedUserData: Record<string, unknown>,
    req?: { headers?: Record<string, string> },
  ) {
    await this.logAction({
      userId,
      userRole,
      action: 'delete_user',
      entityType: 'user',
      entityId: deletedUserData.email as string,
      entityName: `${deletedUserData.firstName as string} ${deletedUserData.lastName as string}`,
      description: `Usuario eliminado: ${deletedUserData.firstName as string} ${deletedUserData.lastName as string} (${deletedUserData.email as string}) - Rol: ${deletedUserData.role as string}`,
      oldData: {
        email: deletedUserData.email as string,
        firstName: deletedUserData.firstName as string,
        lastName: deletedUserData.lastName as string,
        role: deletedUserData.role as string,
      },
      req,
    });
  }

  static async logPasswordChange (userId: string, userRole: 'super_admin', targetUserEmail: string, req?: { headers?: Record<string, string> }) {
    await this.logAction({
      userId,
      userRole,
      action: 'change_user_password',
      entityType: 'user',
      entityId: targetUserEmail,
      entityName: targetUserEmail,
      description: `Contraseña cambiada para usuario: ${targetUserEmail}`,
      newData: {
        targetUserEmail,
        changedBy: userId,
        changedAt: new Date().toISOString(),
      },
      req,
    });
  }

  static async logLogin (userId: string, userRole: 'super_admin' | 'admin' | 'normal', req?: { headers?: Record<string, string> }) {
    await this.logAction({
      userId,
      userRole: userRole as 'super_admin' | 'admin', // Solo admin y super_admin se loggean
      action: 'user_login',
      entityType: 'session',
      entityId: userId,
      entityName: userId,
      description: `Usuario inició sesión: ${userId} - Rol: ${userRole}`,
      newData: { loginTime: new Date().toISOString(), userRole },
      req,
    });
  }

  static async logLogout (userId: string, userRole: 'super_admin' | 'admin' | 'normal', req?: { headers?: Record<string, string> }) {
    await this.logAction({
      userId,
      userRole: userRole as 'super_admin' | 'admin', // Solo admin y super_admin se loggean
      action: 'user_logout',
      entityType: 'session',
      entityId: userId,
      entityName: userId,
      description: `Usuario cerró sesión: ${userId} - Rol: ${userRole}`,
      newData: { logoutTime: new Date().toISOString(), userRole },
      req,
    });
  }
}

export default AuditService;
