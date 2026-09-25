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
    await connection.query("SET time_zone = '+00:00'");
    const [lock]: any = await connection.query("SELECT GET_LOCK(CONCAT(DATABASE(), ':migration'), 30) AS acquired");
    if (!lock[0].acquired) throw new Error('Migration lock unavailable');
    await connection.query('CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
    for (const file of files) {
      const [applied]: any = await connection.query('SELECT name FROM schema_migrations WHERE name=?', [file]);
      if (applied.length) continue;
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
      await connection.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
      console.log(`✓ Completed: ${file} (${statements.length} statements)`);
    }
    console.log('All migrations applied successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await connection.query("SELECT RELEASE_LOCK(CONCAT(DATABASE(), ':migration'))");
    connection.release();
    await pool.end();
  }
}

migrate();
