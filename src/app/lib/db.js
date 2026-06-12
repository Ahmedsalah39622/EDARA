import { Pool } from 'pg';

let pool;

if (!global.pgPool) {
  global.pgPool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres.rgrdljoeuybaqfymanor:pjhXONdCwvyiEeMD@aws-1-eu-north-1.pooler.supabase.com:6543/postgres',
    ssl: {
      rejectUnauthorized: false
    }
  });
}

pool = global.pgPool;

export default pool;
