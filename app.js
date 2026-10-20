// src/app.js

// ⚠️ 必须放在 express 之前：
// Express 4 不会捕获 async 控制器里抛出的异常，未捕获的 rejection 会让 Node 直接退出。
// 这个补丁会把异步异常转交给下面的错误中间件处理。
import 'express-async-errors';

import express from 'express';
import cors from 'cors'; // 导入 cors
import authRoutes from './features/auth/auth.routes.js'; // 导入认证模块路由
import aiRouter from './features/ai/ai.router.js'; // 导入 AI 模块路由
import clientRoutes from './features/client/client.routes.js'; // 导入客户端模块路由
import booksRoutes from './features/books/book.router.js';
import reviewsRoutes from './features/book-review/bookReview.routes.js';
import protect from './middleware/protect.middleware.js'; // 导入保护中间件
import { corsOptions } from './config/cors.config.js'; // 导入 CORS 配置
import { postgres } from './shared/db/index.js';
import { isDbUnavailable, isCorsRejection } from './shared/errors/db-errors.js';

const app = express();
app.set('trust proxy', true);

app.use(express.json()); // 解析 JSON body
app.use(cors(corsOptions)); // 使用 CORS 中间件

app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Backend Service Operational (V1.0.6)',
    timestamp: new Date().toISOString(),
  });
});

// 健康检查：数据库不可用时返回 503，方便排查和监控
app.get('/health', async (req, res) => {
  try {
    await postgres.one('SELECT 1 AS ok');
    res.json({ status: 'ok', db: 'up', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      db: 'down',
      code: err.code || null,
      message: err.message,
    });
  }
});

app.get('/version', (req, res) => {
  res.json({
    version: '1.0.4', // 版本信息
    deployedBy: 'GitHub Actions upgrade-workflow', // 部署信息
    deployedAt: '2024-06-15T12:00:00Z', // 部署时间
  });
});

// 1. 认证模块路由 (开放访问)
app.use('/api/auth', authRoutes);

// 2. 客户端模块路由 (受保护)
app.use('/api/client', protect, clientRoutes);

app.use('/api/books', protect, booksRoutes);

app.use('/api/reviews', protect, reviewsRoutes);

// 4. AI 模块路由 (受保护)
app.use('/api/ai', protect, aiRouter); // AI 模块路由 (受保护)

// 3. 受保护的路由示例
app.get('/api/profile', protect, (req, res) => {
  res.json({
    message: `Welcome to your profile, user ${req.user.userId}`,
    data: req.user
  });
});

// 未匹配的路由
app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// 统一错误处理（必须放在所有路由之后，且必须保留 4 个参数，否则 Express 不会识别）
app.use((err, req, res, next) => {
  console.error(
    `[ERR] ${req.method} ${req.originalUrl} code=${err.code || '-'} msg=${err.message}`
  );

  if (res.headersSent) {
    return next(err);
  }

  // CORS 拒绝：返回 403，而不是让人误以为是服务端 500
  if (isCorsRejection(err)) {
    return res.status(403).json({ message: 'Origin not allowed' });
  }

  // 数据库不可用：返回 503（暂时性故障，客户端可重试）
  if (isDbUnavailable(err)) {
    return res.status(503).json({ message: 'Service temporarily unavailable' });
  }

  res.status(err.status || 500).json({ message: 'Internal server error' });
});

export default app;
