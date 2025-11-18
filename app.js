// src/app.js

import express from 'express';
import cors from 'cors'; // 导入 cors
import authRoutes from './features/auth/auth.routes.js'; // 导入认证模块路由
import aiRouter from './features/ai/ai.router.js'; // 导入 AI 模块路由
import clientRoutes from './features/client/client.routes.js'; // 导入客户端模块路由
import booksRoutes from './features/books/book.router.js';
import reviewsRoutes from './features/book-review/bookReview.routes.js';
import protect from './middleware/protect.middleware.js'; // 导入保护中间件
import { corsOptions } from './config/cors.config.js'; // 导入 CORS 配置

const app = express();
app.set('trust proxy', true);

app.use(express.json()); // 解析 JSON body
app.use(cors(corsOptions)); // 使用 CORS 中间件

app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Backend Service Operational (V1.0.3)',
    timestamp: new Date().toISOString(),
  });
});

app.get('/version', (req, res) => {
  res.json({
    version: '1.0.4', // 版本信息
    deployedBy: 'GitHub Actions'
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

export default app;