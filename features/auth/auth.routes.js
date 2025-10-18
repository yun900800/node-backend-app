// src/modules/auth/auth.routes.js

import express from 'express';
import { login,register } from './auth.controller.js';
import { registerSchema } from './schemas/register.schema.js';
import { validationMiddleware } from '../../middleware/validationMiddleware.js';
import { honeypotMiddleware } from '../../middleware/honeypot.middleware.js';
import { rateLimitMiddleware } from '../../middleware/rateLimit.middleware.js';

const router = express.Router();

// 定义认证路由
router.post('/login', login);
router.post('/register',
    validationMiddleware(registerSchema, 'body'),
    honeypotMiddleware,
    ...rateLimitMiddleware,
    register); // 添加注册路由

export default router; // 使用 export default 导出 router