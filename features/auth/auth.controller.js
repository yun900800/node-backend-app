import * as authService from './auth.service.js';
import * as emailCodeService from './emailCode.service.js';

/**
 * 发送邮箱验证码（register / login 两种用途）
 * POST /api/auth/email/request-code
 */
export const requestEmailCode = async (req, res) => {
    try {
        const { email, purpose } = req.body;
        await emailCodeService.requestVerificationCode({ email, purpose });

        res.json({
            message: '验证码已发送，请查收邮件',
            cooldown: 60, // 前端展示倒计时用
        });
    } catch (error) {
        if (error.status && error.status < 500) {
            return res.status(error.status).json({ message: error.message });
        }
        console.error('Request email code error:', error);
        res.status(500).json({ message: '验证码发送失败，请稍后重试' });
    }
};

/**
 * 验证码登录（换发 JWT）
 * POST /api/auth/login/code
 */
export const loginByEmailCode = async (req, res) => {
    const { email, code } = req.body;

    try {
        const result = await authService.authenticateUserByEmailCode({ email, code });

        if (!result) {
            return res.status(401).json({ message: '该邮箱尚未注册，请先注册账号' });
        }

        res.json({
            message: 'Login successful',
            token: result.token,
            expiresIn: result.expiresIn,
            user: result.user,
        });
    } catch (error) {
        if (error.status && error.status < 500) {
            return res.status(error.status).json({ message: error.message });
        }
        console.error('Login by email code error:', error);
        res.status(500).json({ message: '登录失败，请稍后重试' });
    }
};

/**
 * 处理用户登录，并颁发 JWT Token
 */
export const login = async (req, res) => {
    const { email, password } = req.body;
    
    // 所有的认证逻辑都在 Service 层完成
    const result = await authService.authenticateUser(email, password);

    if (!result) {
        return res.status(401).json({ message: '邮箱或密码错误' });
    }

    // 成功，直接返回 Service 层封装好的数据
    res.json({
        message: 'Login successful',
        token: result.token,
        expiresIn: result.expiresIn,
        user: result.user // 可选：返回部分用户信息
    });
};

/**
 * 处理用户注册，创建新用户账号
 */
export const register = async (req, res) => {
    console.log('register');
    const { email, password, username, code } = req.body;

    try {
        // 所有的创建和验证逻辑都在 Service 层完成（code 强制校验在 Service 内）
        const result = await authService.registerUser(email, password, username, code);
        
        if (!result) {
            // Service 返回 null，表示用户已存在
            return res.status(409).json({ message: 'User already exists' });
        }
        
        // 注册成功 → 直接返回登录态（token），前端可自动登录
        res.status(201).json({ 
            message: 'Registration successful',
            token: result.token,
            expiresIn: result.expiresIn,
            user: result.user
        });
    } catch (error) {
        // 验证码类错误（带 status < 500）原样返回
        if (error.status && error.status < 500) {
            return res.status(error.status).json({ message: error.message });
        }
        // 捕获 Service 层或 Repository 层的未知错误（如数据库连接失败）
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Registration failed due to server error' });
    }
};