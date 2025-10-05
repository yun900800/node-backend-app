// src/config/index.js

import dotenv from 'dotenv';

dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_SUPER_SECRET_KEY';
// 可以添加其他配置，例如 PORT, DATABASE_URL 等