module.exports = {
  apps: [
    {
      name: 'nest-dome',
      script: 'dist/src/main.js',
      instances: 'max', // 使用所有CPU核心
      exec_mode: 'cluster', // 集群模式
      watch: false, // 生产环境关闭文件监听
      max_memory_restart: '1G', // 内存超过1G时重启
      env: {
        NODE_ENV: 'production',
        PORT: 80,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 80,
      },
      // 日志配置
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // 重启策略
      min_uptime: '10s',
      max_restarts: 10,
      // 健康检查
      health_check_grace_period: 3000,
      // 自动重启
      autorestart: true,
      // 新增配置
      node_args: '--max-old-space-size=1024',
      // 进程管理
      pmx: true,
      // 监控配置
      merge_logs: true,
      // 集群配置
      instance_var: 'INSTANCE_ID',
      // 优雅重启
      wait_ready: true,
      listen_timeout: 8000,
      kill_timeout: 5000,
    },
  ],
};
