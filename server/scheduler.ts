import { telegramBot } from './telegram-bot.js';
import { PostgresStorage } from './storage-postgres.js';
import { AuditService } from './audit-service.js';

class SchedulerService {
  private hourlyInterval: ReturnType<typeof setInterval> | null = null;
  private dailyInterval: ReturnType<typeof setInterval> | null = null;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private penalizationInterval: ReturnType<typeof setInterval> | null = null;
  private lastOrderSyncInterval: ReturnType<typeof setInterval> | null = null;
  private storage: PostgresStorage;

  constructor () {
    this.storage = new PostgresStorage();
  }

  /**
   * Iniciar el programador de tareas
   */
  startScheduler (): void {
    console.log('⏰ Iniciando programador de tareas...');

    // Reporte horario (cada hora)
    this.hourlyInterval = setInterval(async () => {
      try {
        console.log('📊 Enviando reporte horario...');
        await telegramBot.sendHourlyReport();
      } catch (error) {
        console.error('❌ Error enviando reporte horario:', error);
      }
    }, 60 * 60 * 1000); // Cada hora

    // Reporte diario (cada día a las 9:00 AM)
    this.dailyInterval = setInterval(async () => {
      const now = new Date();
      const hour = now.getHours();

      // Solo enviar a las 9:00 AM
      if (hour === 9) {
        try {
          console.log('📈 Enviando reporte diario...');
          await telegramBot.sendDailyReport();
        } catch (error) {
          console.error('❌ Error enviando reporte diario:', error);
        }
      }
    }, 60 * 60 * 1000); // Verificar cada hora

    // Limpieza automática de empleados dados de baja (cada día a las 7:00 AM)
    this.cleanupInterval = setInterval(async () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();

      // Solo ejecutar a las 7:00 AM (con tolerancia de 1 minuto)
      if (hour === 7 && minute === 0) {
        try {
          console.log('🧹 Ejecutando limpieza automática de empleados dados de baja...');
          await this.executeAutomaticCleanup();
        } catch (error) {
          console.error('❌ Error en limpieza automática de empleados:', error);
        }
      }
    }, 60 * 1000); // Verificar cada minuto

    // Verificación de penalizaciones programadas (cada día a las 6:00 AM)
    this.penalizationInterval = setInterval(async () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();

      // Solo ejecutar a las 6:00 AM (con tolerancia de 1 minuto)
      if (hour === 6 && minute === 0) {
        try {
          console.log('⏰ Ejecutando verificación de penalizaciones programadas...');
          await this.executePenalizationChecks();
        } catch (error) {
          console.error('❌ Error en verificación de penalizaciones:', error);
        }
      }
    }, 60 * 1000); // Verificar cada minuto

    // Sincronización automática de work equipment cada 6 horas
    this.lastOrderSyncInterval = setInterval(async () => {
      try {
        console.log('🔄 Ejecutando sincronización automática de work equipment...');
        const result = await this.storage.syncLastOrderFromCouriers();
        
        if (result.updated > 0) {
          console.log(`✅ Sincronización automática completada: ${result.updated} registros actualizados`);
        } else {
          console.log('✅ Sincronización automática completada: sin cambios necesarios');
        }
      } catch (error) {
        console.error('❌ Error en sincronización automática:', error);
      }
    }, 6 * 60 * 60 * 1000); // 6 horas en milisegundos

    console.log('✅ Programador de tareas iniciado');
    console.log('⏰ Sincronización automática de work equipment configurada cada 6 horas');
  }

  /**
   * Ejecutar verificaciones de penalizaciones programadas
   */
  private async executePenalizationChecks (): Promise<void> {
    try {
      console.log('🔄 Iniciando proceso de verificación de penalizaciones...');

      // 1. Activar penalizaciones programadas que deben empezar hoy
      const activationResult = await this.storage.activateScheduledPenalizations();
      
      // 2. Verificar y restaurar penalizaciones expiradas
      const restorationResult = await this.storage.checkAndRestoreExpiredPenalizations();

      // Registrar en auditoría
      await AuditService.logAction({
        userId: 'SYSTEM',
        userRole: 'super_admin',
        action: 'automatic_penalization_checks',
        entityType: 'employee',
        description: `Verificación automática de penalizaciones: ${activationResult.activated} activadas, ${restorationResult.restored} restauradas`,
        newData: {
          activationResult,
          restorationResult,
          executionTime: new Date().toISOString(),
          automatic: true,
        },
      });

      console.log(`✅ Verificación de penalizaciones completada: ${activationResult.activated} activadas, ${restorationResult.restored} restauradas`);

      // Enviar notificación por Telegram si hay cambios
      if (activationResult.activated > 0 || restorationResult.restored > 0) {
        try {
          await telegramBot.sendMessage(
            '⏰ *Verificación de Penalizaciones Completada*\n\n' +
            `Penalizaciones activadas: *${activationResult.activated}*\n` +
            `Penalizaciones restauradas: *${restorationResult.restored}*\n` +
            `Fecha: ${new Date().toLocaleString('es-ES')}\n` +
            'Proceso: Automático (6:00 AM)',
            'HTML'
          );
        } catch (telegramError) {
          console.error('❌ Error enviando notificación de penalizaciones por Telegram:', telegramError);
        }
      }
    } catch (error) {
      console.error('❌ Error en verificación automática de penalizaciones:', error);
      throw error;
    }
  }

  /**
   * Ejecutar limpieza automática de empleados dados de baja
   */
  private async executeAutomaticCleanup (): Promise<void> {
    try {
      console.log('🔄 Iniciando proceso de limpieza automática...');

      // Ejecutar la limpieza
      const result = await this.storage.cleanCompanyLeaveApprovedEmployees();

      // Registrar en auditoría
      await AuditService.logAction({
        userId: 'SYSTEM',
        userRole: 'super_admin',
        action: 'automatic_clean_company_leave_approved_employees',
        entityType: 'employee',
        description: `Limpieza automática diaria de empleados dados de baja aprobada (${result.total} eliminados)`,
        newData: {
          ...result,
          executionTime: new Date().toISOString(),
          automatic: true,
        },
      });

      console.log(`✅ Limpieza automática completada: ${result.total} empleados eliminados`);

      // Enviar notificación por Telegram si hay empleados eliminados
      if (result.total > 0) {
        try {
          await telegramBot.sendMessage(
            '🧹 *Limpieza Automática Completada*\n\n' +
            `Se eliminaron *${result.total}* empleados dados de baja aprobada.\n` +
            `Fecha: ${new Date().toLocaleString('es-ES')}\n` +
            'Proceso: Automático (7:00 AM)',
          );
        } catch (telegramError) {
          console.error('❌ Error enviando notificación de limpieza por Telegram:', telegramError);
        }
      }
    } catch (error) {
      console.error('❌ Error en limpieza automática:', error);

      // Registrar error en auditoría
      try {
        await AuditService.logAction({
          userId: 'SYSTEM',
          userRole: 'super_admin',
          action: 'automatic_clean_company_leave_approved_employees_error',
          entityType: 'employee',
          description: `Error en limpieza automática diaria de empleados dados de baja: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          newData: {
            error: error instanceof Error ? error.message : 'Error desconocido',
            executionTime: new Date().toISOString(),
            automatic: true,
          },
        });
      } catch (auditError) {
        console.error('❌ Error registrando fallo en auditoría:', auditError);
      }

      // Enviar notificación de error por Telegram
      try {
        await telegramBot.sendMessage(
          '⚠️ *Error en Limpieza Automática*\n\n' +
          'La limpieza automática de empleados falló.\n' +
          `Error: ${error instanceof Error ? error.message : 'Error desconocido'}\n` +
          `Fecha: ${new Date().toLocaleString('es-ES')}\n` +
          'Se requiere intervención manual.',
        );
      } catch (telegramError) {
        console.error('❌ Error enviando notificación de error por Telegram:', telegramError);
      }
    }
  }

  /**
   * Detener el programador de tareas
   */
  stopScheduler (): void {
    if (this.hourlyInterval) {
      clearInterval(this.hourlyInterval);
      this.hourlyInterval = null;
    }

    if (this.dailyInterval) {
      clearInterval(this.dailyInterval);
      this.dailyInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.penalizationInterval) {
      clearInterval(this.penalizationInterval);
      this.penalizationInterval = null;
    }

    if (this.lastOrderSyncInterval) {
      clearInterval(this.lastOrderSyncInterval);
      this.lastOrderSyncInterval = null;
    }

    console.log('⏹️ Programador de tareas detenido');
  }

  /**
   * Enviar reporte manual
   */
  async sendManualReport (type: 'hourly' | 'daily'): Promise<boolean> {
    try {
      if (type === 'hourly') {
        return await telegramBot.sendHourlyReport();
      } else {
        return await telegramBot.sendDailyReport();
      }
    } catch (error) {
      console.error(`❌ Error enviando reporte ${type}:`, error);
      return false;
    }
  }

  /**
   * Ejecutar limpieza manual
   */
  async executeManualCleanup (): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      console.log('🔄 Ejecutando limpieza manual de empleados dados de baja...');
      const result = await this.storage.cleanCompanyLeaveApprovedEmployees();

      // Registrar en auditoría
      await AuditService.logAction({
        userId: 'SYSTEM',
        userRole: 'super_admin',
        action: 'manual_clean_company_leave_approved_employees',
        entityType: 'employee',
        description: `Limpieza manual de empleados dados de baja aprobada (${result.total} eliminados)`,
        newData: {
          ...result,
          executionTime: new Date().toISOString(),
          automatic: false,
        },
      });

      console.log(`✅ Limpieza manual completada: ${result.total} empleados eliminados`);
      return { success: true, result };
    } catch (error) {
      console.error('❌ Error en limpieza manual:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }
}

export const scheduler = new SchedulerService();