import Joi from 'joi';

/**
 * 注册用户请求体 (req.body) 的 Joi 验证 Schema
 */
export const registerSchema = Joi.object({
    // 邮箱验证：必须是字符串，必须是有效的邮箱格式，必填
    email: Joi.string()
        .email({ minDomainSegments: 2, tlds: { allow: ['com', 'cn', 'net'] } })
        .required()
        .messages({
            'string.email': '邮箱格式不正确',
            'any.required': '邮箱是必填项'
        }),

    // 密码验证：必须是字符串，长度至少 8 位，必填
    password: Joi.string()
        .min(8)
        .max(30)
        // 可以添加一个正则来强制复杂度，例如：.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
        .required()
        .messages({
            'string.min': '密码至少需要 {#limit} 个字符',
            'string.max': '密码不能超过 {#limit} 个字符',
            'any.required': '密码是必填项'
        }),

    // 用户名验证：必须是字符串，长度 3 到 20 位，可选
    username: Joi.string()
        .min(3)
        .max(20)
        // 允许字母、数字和下划线
        .pattern(/^[a-zA-Z0-9_]+$/)
        .optional()
        .messages({
            'string.min': '用户名至少需要 {#limit} 个字符',
            'string.max': '用户名不能超过 {#limit} 个字符',
            'string.pattern.base': '用户名只能包含字母、数字和下划线'
        })
});