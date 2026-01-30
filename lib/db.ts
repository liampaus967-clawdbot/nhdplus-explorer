/**
 * PostgreSQL Database Connection
 */
import { Pool, QueryResult } from 'pg';

// Create pool using environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('rds.amazonaws.com') 
    ? { rejectUnauthorized: false } 
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
});

export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  console.log('Query executed', { text: text.slice(0, 100), duration, rows: result.rowCount });
  return result;
}

export default pool;
