import * as authService from './auth.service.js';

/**
 * 处理用户登录，并颁发 JWT Token
 */
export const login = async (req, res) => {
    const { email, password } = req.body;
    
    // 所有的认证逻辑都在 Service 层完成
    const result = await authService.authenticateUser(email, password);

    if (!result) {
        return res.status(401).json({ message: 'Invalid credentials' });
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
    const { email, password, username } = req.body; // 注意：这里可能需要从请求中获取 username

    try {
        // 所有的创建和验证逻辑都在 Service 层完成
        const newUser = await authService.registerUser(email, password, username);
        
        if (!newUser) {
            // Service 返回 null，表示用户已存在
            return res.status(409).json({ message: 'User already exists' });
        }
        
        // 注册成功
        res.status(201).json({ 
            message: 'Registration successful',
            userId: newUser.id,
            email: newUser.email
        });
    } catch (error) {
        // 捕获 Service 层或 Repository 层的未知错误（如数据库连接失败）
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Registration failed due to server error' });
    }
};