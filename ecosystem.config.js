// Production PM2 Process Manager Configuration for PDH Smart EMS
// Usage: pm2 start ecosystem.config.js --env production

module.exports = {
  apps: [
    {
      name: 'pdh-smart-ems-api',
      script: './dist/index.js',
      cwd: './server',
      instances: 'max', // Scale to available CPU cores for maximum throughput
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '600M',
      listen_timeout: 10000,
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
