// src/modules/auth/auth.controller.js

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { findUserByEmail } from './auth.model.js';
import { JWT_SECRET } from '../../config/index.js';

/**
 * 处理用户登录，并颁发 JWT Token
 */
export const login = async (req, res) => {
  const { email, password } = req.body;
  console.log(`Attempting login for user: ${email}`);
  console.log(`Password is: ${password}`);

  // 1. 查找用户
  const user = findUserByEmail(email);
  console.log(`User found: ${user ? 'Yes' : 'No'}`);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // 2. 验证密码
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  console.log(`Password match: ${isMatch ? 'Yes' : 'No'}`);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // 3. 生成 JWT Token
  const token = jwt.sign(
    { userId: user.id },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({
    message: 'Login successful',
    token,
    expiresIn: 3600
  });
};