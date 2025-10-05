// src/config/cors.config.js

// 假设你的前端部署在 https://your-frontend-domain.com
const allowedOrigins = [
  'https://auth.webhost.innocation.dpdns.org',
  'https://webhost.innocation.dpdns.org',
  // WARNING: 在生产环境中，不应该允许内部 IP，但为了测试暂时保留
  // 生产环境请移除内部 IP 和 localhost，只保留生产域名
  'http://192.168.5.228:5002',
  'http://localhost:5173', // Vite 默认端口
];

export const corsOptions = {
  origin: function (origin, callback) {
    // 允许没有 Origin 头部（如 curl 或 Postman）或在白名单内的请求
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true); // ✅ 允许
    } else {
      // ❌ 拒绝：返回 false 让 CORS 中间件返回 403 Forbidden 响应
      callback(new Error(`Not allowed by CORS: ${origin}`), false); 
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
};