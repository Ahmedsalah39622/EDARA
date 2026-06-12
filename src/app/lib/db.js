import { Pool } from 'pg';

let pool;

if (!global.pgPool) {
  global.pgPool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:pjhXONdCwvyiEeMD@db.rgrdljoeuybaqfymanor.supabase.co:5432/postgres',
    ssl: {
      rejectUnauthorized: false
    }
  });
}

pool = global.pgPool;

export default pool;
