import app from './app.js';
import { JWT_SECRET } from './config/index.js'; // 导入 JWT_SECRET 等配置

// 使用环境变量，如果没有则使用默认值
const PORT = process.env.PORT || 5002; 
const HOST = '0.0.0.0';  // 允许从任何 IP 访问 (生产环境标准)

if (!JWT_SECRET || JWT_SECRET === 'YOUR_SUPER_SECRET_KEY') {
    console.warn("🚨 WARNING: JWT_SECRET is not set in environment variables! Using default key.");
}

app.listen(PORT, HOST, () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode.`);
    console.log(`🚀 Access API at: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});