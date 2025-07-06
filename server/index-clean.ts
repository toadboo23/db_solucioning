import express from 'express';
import { registerRoutes } from './routes-clean.js';

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const PORT = parseInt(process.env.PORT || '5173');

// Enhanced logging
console.log('🔥 Starting Solucioning Server...');
console.log('📍 Port:', PORT);

// Manual CORS configuration (more reliable than cors package)
app.use((req, res, next) => {
  // Allow requests from both localhost and Docker frontend
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5174', // Vite dev server
    'http://frontend:3000', // Docker frontend
    'http://employee_management_frontend:3000', // Docker service name
    'http://69.62.107.86:3000', // Production frontend
    'http://solucioning_frontend:3000', // Docker service name
  ];

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie',
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`🌐 ${timestamp} - ${req.method} ${req.path}`);

  // Log request body for POST requests (excluding sensitive data)
  if (req.method === 'POST' && req.body) {
    const logBody = { ...req.body };
    if (logBody.password) {
      logBody.password = '***HIDDEN***';
    }
    console.log('📝 Request body:', logBody);
  }

  next();
});

// Initialize database and users
async function initializeSystem () {
  try {
    console.log('🗄️ Initializing database connection...');
    // System initialization completed - users are managed via system_users table
    console.log('🎯 System initialization completed');
    console.log('📊 Users are managed via the system_users table (see init.sql)');
  } catch (error) {
    console.error('🚨 Error during system initialization:', error);
    console.log('⚠️ Continuing anyway...');
  }
}

// Register routes and start server
async function startServer () {
  try {
    console.log('🛠️ Registering routes...');
    const httpServer = await registerRoutes(app);

    await initializeSystem();

    httpServer.listen(PORT, () => {
      console.log('\n🚀 Server running on http://localhost:' + PORT);
      console.log('📊 Users available in system_users table:');
      console.log('   - Super Admins: nmartinez@solucioning.net, lvega@solucioning.net');
      console.log('   - Admins: trafico1@solucioning.net to trafico20@solucioning.net');
      console.log('\n🔗 API Endpoints:');
      console.log('   - Health: GET /api/health');
      console.log('   - Login: POST /api/auth/login');
      console.log('   - User Info: GET /api/auth/user');
      console.log('   - Logout: POST /api/auth/logout');
      console.log('   - Dashboard: GET /api/dashboard/metrics');
      console.log('   - Employees: GET /api/employees');
      console.log('\n✨ Ready to accept connections!');
    });
  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

// Error handling
process.on('uncaughtException', error => {
  console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
startServer().catch(error => {
  console.error('💥 Server startup failed:', error);
  process.exit(1);
});
