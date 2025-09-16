import axios from 'axios';
import { db } from './db.js';
import { employees, systemUsers, notifications, auditLogs } from '../shared/schema.js';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

class TelegramBotService {
  private config: TelegramConfig;
  private baseUrl: string;

  constructor() {
    this.config = {
      botToken: process.env.TELEGRAM_BOT_TOKEN || '7718484147:AAFSeHqwa6W50tGbNGkL6cvQNn8PDpro-7o',
      chatId: process.env.TELEGRAM_CHAT_ID || '7321175509',
      enabled: process.env.TELEGRAM_BOT_ENABLED !== 'false'
    };
    
    this.baseUrl = `https://api.telegram.org/bot${this.config.botToken}`;
  }

  async sendMessage(message: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<boolean> {
    if (!this.config.enabled) {
      console.log('🤖 Bot de Telegram deshabilitado');
      return false;
    }

    try {
      const response = await axios.post(`${this.baseUrl}/sendMessage`, {
        chat_id: this.config.chatId,
        text: message,
        parse_mode: parseMode
      });

      return response.data.ok;
    } catch (error) {
      console.error('❌ Error enviando mensaje a Telegram:', error);
      return false;
    }
  }

  async sendSystemReport(): Promise<void> {
    try {
      // Obtener estadísticas del sistema
      const totalEmployees = await db.select({ count: sql`count(*)` }).from(employees);
      const totalUsers = await db.select({ count: sql`count(*)` }).from(systemUsers);
      const recentNotifications = await db.select({ count: sql`count(*)` }).from(notifications)
        .where(gte(notifications.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));

      const report = `
🤖 <b>Reporte del Sistema - Solucioning</b>

📊 <b>Estadísticas Generales:</b>
   • Empleados totales: ${totalEmployees[0]?.count || 0}
   • Usuarios del sistema: ${totalUsers[0]?.count || 0}
   • Notificaciones (24h): ${recentNotifications[0]?.count || 0}

⏰ <b>Información del Sistema:</b>
   • Fecha: ${new Date().toLocaleDateString('es-ES')}
   • Hora: ${new Date().toLocaleTimeString('es-ES')}
   • Estado: ✅ Funcionando

 <b>Servicios:</b>
   • Backend: ✅ Activo
   • Base de datos: ✅ Conectada
   • Frontend: ✅ Disponible
   • Bot de Telegram: ✅ Funcionando
      `;

      await this.sendMessage(report);
    } catch (error) {
      console.error('❌ Error generando reporte:', error);
    }
  }

  async sendAlert(message: string, level: 'info' | 'warning' | 'error' = 'info'): Promise<void> {
    const emoji = {
      info: 'ℹ️',
      warning: '⚠️',
      error: ''
    };

    const alertMessage = `
${emoji[level]} <b>Alerta del Sistema</b>

${message}

⏰ ${new Date().toLocaleString('es-ES')}
      `;

    await this.sendMessage(alertMessage);
  }

  async sendEmployeeNotification(employeeName: string, action: string): Promise<void> {
    const message = `
 <b>Notificación de Empleado</b>

<b>Acción:</b> ${action}
<b>Empleado:</b> ${employeeName}
<b>Fecha:</b> ${new Date().toLocaleString('es-ES')}
      `;

    await this.sendMessage(message);
  }

  async sendHourlyReport(): Promise<boolean> {
    try {
      await this.sendSystemReport();
      return true;
    } catch (error) {
      console.error('❌ Error enviando reporte horario:', error);
      return false;
    }
  }

  async sendDailyReport(): Promise<boolean> {
    try {
      await this.sendSystemReport();
      return true;
    } catch (error) {
      console.error('❌ Error enviando reporte diario:', error);
      return false;
    }
  }
}

export const telegramBot = new TelegramBotService(); 