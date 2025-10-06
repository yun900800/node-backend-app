// src/modules/auth/auth.routes.js

import express from 'express';
import { login,register } from './auth.controller.js';

const router = express.Router();

// 定义认证路由
router.post('/login', login);
router.post('/register', register); // 添加注册路由

export default router; // 使用 export default 导出 router