module.exports = {
  apps: [
    {
      name: 'etift-employee-portal',
      script: 'server/app.js',
      cwd: __dirname,
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        HOST: '0.0.0.0'
      },
      watch: false,
      autorestart: true,
      max_memory_restart: '500M'
    }
  ]
};
