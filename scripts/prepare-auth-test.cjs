const mysql = require('../server/node_modules/mysql2/promise');
const { spawnSync } = require('child_process');
(async () => {
  const name = process.env.DB_NAME;
  if (!name || !/^pdh_auth1_test_[a-z0-9_]+$/.test(name)) throw new Error('DB_NAME must be a dedicated pdh_auth1_test_* database');
  const conn = await mysql.createConnection({host:'127.0.0.1',user:'root'});
  await conn.query('CREATE DATABASE IF NOT EXISTS `'+name+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await conn.end();
  for (const file of ['src/db/migrate.ts','src/db/seed.ts','src/db/seedHistoricalMissions.ts']) {
    const result = spawnSync(process.execPath,['--import','tsx',file], {cwd:require('path').resolve(__dirname,'../server'),env:process.env,stdio:'inherit'});
    if(result.status!==0) process.exit(result.status || 1);
  }
})().catch(e=>{console.error(e.message);process.exitCode=1});
