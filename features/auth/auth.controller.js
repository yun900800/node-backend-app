// src/modules/auth/auth.controller.js

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { findUserByEmail, createUser } from './auth.model.js';
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

/**
 * 处理用户注册，创建新用户账号
 */
export const register = async (req, res) => {
  const { email, password } = req.body;
  console.log(`Attempting registration for user: ${email}`);

  // 1. 检查用户是否已存在
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    // 409 Conflict 表示请求与资源的当前状态冲突，通常用于重复创建
    return res.status(409).json({ message: 'User already exists' });
  }

  // 2. 密码哈希
  // 10 是 saltRounds 的推荐值，决定了哈希的强度
  const salt = await bcrypt.genSalt(10); 
  const passwordHash = await bcrypt.hash(password, salt);
  console.log('Password has been securely hashed.');

  // 3. 创建用户
  try {
    // 假设 createUser 会返回新创建的用户对象，或者至少返回一个成功指示
    const newUser = await createUser(email, passwordHash);
    
    // 注册成功，但出于安全考虑，不返回密码哈希
    res.status(201).json({ // 201 Created 表示请求已成功，并创建了新资源
      message: 'Registration successful',
      userId: newUser.id,
      email: newUser.email
    });
  } catch (error) {
    console.error('Error creating user:', error);
    // 500 Internal Server Error 用于数据库或服务器内部错误
    res.status(500).json({ message: 'Registration failed due to server error' });
  }
};