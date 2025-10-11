// src/modules/auth/auth.routes.js

import express from 'express';
import { createClient, updateClient, clientPages, deleteClient } from './client.controller.js';

const router = express.Router();

// 定义客户端路由
router.post('/', createClient);
router.put('/:id', updateClient);
router.get('/', clientPages);
router.delete('/:id', deleteClient);

export default router; // 使用 export default 导出 router