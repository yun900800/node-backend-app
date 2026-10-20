import app from './app.js';
import { JWT_SECRET } from './config/index.js'; // 导入 JWT_SECRET 等配置

// 使用环境变量，如果没有则使用默认值
const PORT = process.env.PORT || 5002;
const HOST = '0.0.0.0';  // 允许从任意 IP 访问 (生产环境标准)

if (!JWT_SECRET || JWT_SECRET === 'YOUR_SUPER_SECRET_KEY') {
    console.warn("🚨 WARNING: JWT_SECRET is not set in environment variables! Using default key.");
}

// --- 进程级兜底 ---
// 有了 app.js 里的 express-async-errors + 统一错误中间件，正常请求不会走到这里。
// 保留这两个监听，是为了在出现意外时留下可查的日志，而不是静默退出。
process.on('unhandledRejection', (reason) => {
    console.error('[UNHANDLED REJECTION]', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT EXCEPTION]', err);
    // 此时进程状态可能已不一致，退出并交给 keepalive.sh 重启更安全
    process.exit(1);
});

const server = app.listen(PORT, HOST, () => {
    console.log(`🌍 Server is running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode.`);
    console.log(`🚀 Access API at: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});

server.on('error', (err) => {
    console.error('[SERVER ERROR]', err.code || '-', err.message);
    process.exit(1);
});
