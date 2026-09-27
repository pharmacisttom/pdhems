const path = require('path');
const dotenv = require('../server/node_modules/dotenv');
const bcrypt = require('../server/node_modules/bcryptjs');
const mysql = require('../server/node_modules/mysql2/promise');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

async function setAdminPassword() {
  const username = 'admin';
  const newPassword = process.argv[2] || 'Smartems10832';

  console.log(`Setting password for user: ${username} to: ${newPassword}`);
  const hash = await bcrypt.hash(newPassword, 12);

  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'pdh_smart_ems',
    });

    console.log('Connected to MySQL database.');

    const [users] = await conn.query('SELECT id, username, full_name, password_hash FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      console.log('User admin not found in DB. Creating admin user...');
      const [roles] = await conn.query('SELECT id FROM roles WHERE name = "SUPER_ADMIN" LIMIT 1');
      const roleId = roles.length > 0 ? roles[0].id : 1;
      await conn.query(
        'INSERT INTO users (username, password_hash, full_name, role_id, phone, active, must_change_password) VALUES (?, ?, ?, ?, ?, 1, 0)',
        [username, hash, 'ผู้ดูแลระบบสูงสุด PDH (Admin)', roleId, '0812345678']
      );
      console.log('Admin user created successfully.');
    } else {
      await conn.query(
        'UPDATE users SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL, active = 1, must_change_password = 0 WHERE username = ?',
        [hash, username]
      );
      console.log(`Admin user password updated successfully for ID ${users[0].id} (${users[0].full_name}).`);
    }

    // Clear old sessions
    await conn.query('DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE username = ?)', [username]);
    console.log('Old sessions cleared from sessions table.');

    // Reset rate limits for admin
    await conn.query('DELETE FROM auth_rate_limits WHERE identifier = ? OR identifier LIKE ?', [username, `%${username}%`]);
    console.log('Rate limits cleared.');

    // Verify hash matches
    const [updated] = await conn.query('SELECT password_hash FROM users WHERE username = ?', [username]);
    const isMatch = await bcrypt.compare(newPassword, updated[0].password_hash);
    console.log(`Verification: password match test = ${isMatch ? 'PASSED (TRUE)' : 'FAILED'}`);

    await conn.end();
    console.log('ALL DONE! Credentials are active:');
    console.log('Username:', username);
    console.log('Password:', newPassword);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

setAdminPassword();
