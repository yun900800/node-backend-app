export const remoteVercelPoolConfig = {
  host: process.env.DB_HOST || 'aws-0-us-east-1.pooler.supabase.com',
  user: process.env.DB_USER || 'postgres.nwnbmhmprhkcknzaqvvm',
  password: process.env.DB_PASSWORD || 'iagua2RC0sUuWZwK',
  database: process.env.DB_DATABASE || 'postgres', // <--- 关键：确保有 database 属性
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 6543 // 确保端口是数字
}


