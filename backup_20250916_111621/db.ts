import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema.js';

// Database connection configuration
const databaseUrl = process.env.DATABASE_URL ||
  `postgresql://${process.env.POSTGRES_USER || 'solucioning'}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'employee_management'}`;

console.log('🔗 Database connection URL:', databaseUrl.replace(/:[^:@]*@/, ':****@')); // Hide password in logs

// Create postgres client
const client = postgres(databaseUrl, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 60,
});

// Create drizzle database instance
export const db = drizzle(client, { schema });
