import Joi from 'joi';

/**
 * 发送邮箱验证码请求校验（req.body）
 */
export const requestCodeSchema = Joi.object({
    email: Joi.string()
        .email({ minDomainSegments: 2 })
        .required()
        .messages({
            'string.email': '邮箱格式不正确',
            'any.required': '邮箱是必填项',
        }),

    // register = 注册验证码；login = 登录验证码
    purpose: Joi.string()
        .valid('register', 'login')
        .required()
        .messages({
            'any.only': '验证码用途只支持 register / login',
            'any.required': '验证码用途是必填项',
        }),
});

/**
 * 邮箱验证码校验请求通用片段
 */
export const emailCodeOnlySchema = {
    email: Joi.string()
        .email({ minDomainSegments: 2 })
        .required()
        .messages({
            'string.email': '邮箱格式不正确',
            'any.required': '邮箱是必填项',
        }),
    code: Joi.string()
        .pattern(/^\d{6}$/)
        .length(6)
        .required()
        .messages({
            'string.pattern.base': '验证码必须是 6 位数字',
            'any.required': '验证码是必填项',
        }),
};

/**
 * 验证码登录请求校验（req.body）
 */
export const loginByCodeSchema = Joi.object(emailCodeOnlySchema);

/**
 * 验证码登录完整 schema（路由处使用）
 */
export const loginByCodeRouteSchema = Joi.object({
    ...emailCodeOnlySchema,
});

/**
 * 注册（强制验证码）请求校验：在原 registerSchema 基础上增加 code 字段
 */
export const registerWithCodeSchema = {
    code: Joi.string()
        .pattern(/^\d{6}$/)
        .length(6)
        .required()
        .messages({
            'string.pattern.base': '验证码必须是 6 位数字',
            'any.required': '邮箱验证码是必填项',
        }),
};
