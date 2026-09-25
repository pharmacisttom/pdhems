import fs from 'fs';
import path from 'path';
import { pool } from './connection';

async function migrate() {
  console.log('Running database migrations...');
  const migrationFile = path.join(__dirname, 'migrations', '001_initial_schema.sql');
  const sql = fs.readFileSync(migrationFile, 'utf8');

  // Split queries by semicolon outside of strings
  const statements = sql
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const connection = await pool.getConnection();
  try {
    for (const statement of statements) {
      if (statement.trim()) {
        await connection.query(statement);
      }
    }
    console.log(`Successfully executed ${statements.length} migration statements.`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
}

migrate();
