/**
 * PostgreSQL Database Connection
 */
import { Pool, QueryResult } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('rds.amazonaws.com') 
        ? { rejectUnauthorized: false } 
        : false,
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await getPool().query<T>(text, params);
  const duration = Date.now() - start;
  console.log('Query executed', { text: text.slice(0, 100), duration, rows: result.rowCount });
  return result;
}

export default { query };
