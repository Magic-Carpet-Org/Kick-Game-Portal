import { neon, Pool } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in environment variables');
}

// HTTP query client for fast, single-query serverless operations
export const sql = neon(process.env.DATABASE_URL);

// Connection pool for sessions, transactions, and Better Auth
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL,
});

