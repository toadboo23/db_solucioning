import session from 'express-session';
import type { Express, RequestHandler } from 'express';
import connectPg from 'connect-pg-simple';
import bcrypt from 'bcryptjs';
import { PostgresStorage } from './storage-postgres.js';
import { AuditService } from './audit-service.js';
import type { SystemUser } from '../shared/schema.js';
import type { Request, Response } from 'express';

// Extiende express-session para incluir user en SessionData
import 'express-session';
declare module 'express-session' {
  interface SessionData {
    user?: any;
  }
}

const storage = new PostgresStorage();

// NOTE: For production, all authentication is done through database users only
// No hardcoded users for security reasons

export function getSession () {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const isProduction = process.env.NODE_ENV === 'production';

  return session({
    secret: process.env.SESSION_SECRET || 'default-secret-key',
    resave: true,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: false, // true en producción (HTTPS), false en desarrollo
      maxAge: sessionTtl,
      sameSite: 'lax', // 'none' en producción, 'lax' en desarrollo
    },
  });
}

export async function setupAuth (app: Express) {
  app.set('trust proxy', 1);
  app.use(getSession());

  console.log('🔐 Setting up authentication routes...');

  // LOGIN ROUTE - Enhanced to support database users
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    console.log('📝 Login attempt for:', req.body.email);

    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        console.log('❌ Missing email or password');
        return res.status(400).json({
          error: 'Email y contraseña son requeridos',
          success: false,
        });
      }

      let userRecord: SystemUser | null = null;

      // Check database users only (secure production approach)
      console.log('🔍 Checking database for user:', email);
      try {
        const dbUsers = await storage.getAllSystemUsers();
        const dbUser = dbUsers.find((u) => u.email === email);

        if (!dbUser) {
          console.log('❌ Usuario no encontrado:', email);
        } else if (!dbUser.isActive) {
          console.log('❌ Usuario inactivo:', email);
        } else {
          userRecord = dbUser;
          console.log('✅ Found database user:', email);
        }
      } catch (dbError) {
        console.error('❌ Database error while fetching user:', dbError);
        return res.status(500).json({
          error: 'Error interno del servidor',
          success: false,
        });
      }

      if (!userRecord) {
        return res.status(401).json({
          error: 'Usuario no encontrado o inactivo',
          success: false,
        });
      }

      // Check password - handle both hashed and plain text passwords
      let passwordValid = false;

      // Check if password is hashed (starts with $2b$)
      if (userRecord.password.startsWith('$2b$')) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('🔑 Hash almacenado (parcial):', userRecord.password.slice(0, 20) + '...');
        }
        try {
          passwordValid = await bcrypt.compare(password, userRecord.password);
          if (process.env.NODE_ENV !== 'production') {
            console.log('🔍 Password validation result (bcrypt.compare):', passwordValid ? 'SUCCESS' : 'FAILED');
          }
        } catch (bcryptError) {
          console.error('❌ Bcrypt error:', bcryptError);
          passwordValid = false;
        }
      } else {
        // Plain text password comparison (should be removido en producción)
        passwordValid = password === userRecord.password;
        if (process.env.NODE_ENV !== 'production') {
          console.log('🔍 Password validation result (plain text):', passwordValid ? 'SUCCESS' : 'FAILED');
        }
      }

      if (!passwordValid) {
        console.log('❌ Invalid password para:', email);
        return res.status(401).json({
          error: 'Contraseña incorrecta',
          success: false,
        });
      }

      // Create user data without password
      const userData = {
        id: userRecord.id.toString(),
        email: userRecord.email,
        firstName: userRecord.firstName,
        lastName: userRecord.lastName,
        role: userRecord.role,
        ciudad: userRecord.assigned_city || undefined,
      };
      console.log('✅ Login successful for:', email);

      // Update last login timestamp in database
      try {
        await storage.updateSystemUserLastLogin(Number(userRecord.id));
      } catch (dbError) {
        console.error('⚠️ Could not update last login (continuing anyway):', dbError);
      }

      // Set session
      req.session.user = userData;

      // Log successful login
      await AuditService.logAction({
        userId: userData.email,
        userRole: userData.role as 'super_admin' | 'admin' | 'normal',
        action: 'login',
        entityType: 'session',
        entityId: userData.id,
        entityName: `${userData.firstName} ${userData.lastName}`,
        description: `Usuario ${userData.email} inició sesión exitosamente`,
        newData: { loginTime: new Date().toISOString() },
        req: { headers: { 'user-agent': req.headers['user-agent'] || '' } },
      });

      res.json({
        success: true,
        user: userData,
      });
    } catch (error) {
      console.error('🚨 Error during login:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        success: false,
      });
    }
  });

  // LOGOUT ROUTE
  app.post('/api/auth/logout', async (req: Request, res: Response) => {
    console.log('👋 Logout request');
    // Log logout before destroying session
    if (req.session?.user) {
      const user = req.session.user as Record<string, unknown>;
      await AuditService.logAction({
        userId: user.email as string,
        userRole: user.role as 'super_admin' | 'admin' | 'normal',
        action: 'logout',
        entityType: 'session',
        entityId: user.id as string,
        entityName: `${user.firstName as string} ${user.lastName as string}`,
        description: `Usuario ${user.email as string} cerró sesión`,
        newData: { logoutTime: new Date().toISOString() },
        req: { headers: { 'user-agent': req.headers['user-agent'] || '' } },
      });
    }
    req.session.destroy((err?: Error) => {
      if (err) {
        console.error('❌ Error destroying session:', err);
        return res.status(500).json({ error: 'Error al cerrar sesión' });
      }
      res.json({ success: true });
    });
  });

  // GET USER INFO ROUTE
  app.get('/api/auth/user', (req: Request, res: Response) => {
    console.log('👤 Get user request, session user:', req.session?.user);
    if (!req.session?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    res.json(req.session.user);
  });

  // GET ME ROUTE (alternative)
  app.get('/api/auth/me', (req: Request, res: Response) => {
    if (req.session?.user) {
      res.json(req.session.user);
    } else {
      res.status(401).json({ message: 'No authenticated' });
    }
  });

  console.log('✅ Authentication routes set up successfully');
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.session?.user) {
    console.log('🚫 Authentication required, no session found');
    return res.status(401).json({ message: 'Unauthorized' });
  }
  req.user = req.session.user;
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  console.log('✅ User authenticated:', req.user.email);
  next();
};
