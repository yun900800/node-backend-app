// src/middleware/protect.middleware.js

import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/index.js';

/**
 * 保护路由的中间件
 */
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 验证 Token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; 
    next();
  } catch (ex) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

export default protect; // 使用 export default 导出中间件