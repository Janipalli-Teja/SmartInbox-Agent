/*
  setupDatabase.ts
  -----------------
  Ensures the MySQL `smartinbox` database and required tables exist.
  This script is safe to run multiple times – it uses `IF NOT EXISTS` guards.
*/

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const initSqlPath = path.resolve(__dirname, '../../database/init.sql');

function loadInitSQL(): string[] {
  const sqlContent = fs.readFileSync(initSqlPath, { encoding: 'utf-8' });
  return sqlContent
    .split(/;\s*\n/)
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);
}

export async function runSetupDatabase(): Promise<void> {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    multipleStatements: true,
  });

  console.log('🔧 Connected to MySQL server');
  const statements = loadInitSQL();

  try {
    for (const stmt of statements) {
      await connection.query(stmt);
      console.log(`✅ Executed: ${stmt.slice(0, 60)}...`);
    }
    console.log('🏁 Database setup complete');
  } catch (err) {
    console.error('❌ Error executing init script:', err);
  } finally {
    await connection.end();
    console.log('🔒 MySQL connection closed');
  }
}

// Allow direct execution via tsx / node
const scriptUrl = import.meta.url;
const callerPath = process.argv[1] ? `file:///${process.argv[1].replace(/\\/g, '/')}` : '';
if (scriptUrl === callerPath || process.argv[1]?.endsWith('setupDatabase.ts') || process.argv[1]?.endsWith('setupDatabase.js')) {
  runSetupDatabase().catch(err => {
    console.error('Fatal error during database setup', err);
    process.exit(1);
  });
}
