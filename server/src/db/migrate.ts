import fs from 'fs';
import path from 'path';
import { pool } from './connection';

async function migrate() {
  console.log('Running database migrations...');
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const connection = await pool.getConnection();
  try {
    for (const file of files) {
      console.log(`Executing migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      const statements = sql
        .split(/;\s*$/m)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        if (statement.trim()) {
          await connection.query(statement);
        }
      }
      console.log(`✓ Completed: ${file} (${statements.length} statements)`);
    }
    console.log('All migrations applied successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
}

migrate();
