// src/modules/auth/auth.routes.js

import express from 'express';
import { login, register, requestEmailCode, loginByEmailCode } from './auth.controller.js';
import { registerSchema } from './schemas/register.schema.js';
import { requestCodeSchema, loginByCodeSchema } from './schemas/emailCode.schema.js';
import { validationMiddleware } from '../../middleware/validationMiddleware.js';
import { honeypotMiddleware } from '../../middleware/honeypot.middleware.js';
import { rateLimitMiddleware, emailCodeLimiter } from '../../middleware/rateLimit.middleware.js';

const router = express.Router();

// 定义认证路由
router.post('/login', login);

// 邮箱验证码登录
router.post(
    '/login/code',
    validationMiddleware(loginByCodeSchema, 'body'),
    loginByEmailCode
);

// 发送邮箱验证码（register / login 两种用途）
// 限流：15 分钟 20 次/IP + 业务层 60s 冷却 + 每小时 5 封
router.post(
    '/email/request-code',
    validationMiddleware(requestCodeSchema, 'body'),
    emailCodeLimiter,
    requestEmailCode
);

// 注册（强制邮箱验证码）
router.post(
    '/register',
    validationMiddleware(registerSchema, 'body'),
    honeypotMiddleware,
    ...rateLimitMiddleware,
    register
);

export default router; // 使用 export default 导出 router
