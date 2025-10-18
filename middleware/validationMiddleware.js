import Joi from 'joi';

/**
 * 通用验证中间件
 * * @param {Joi.Schema} schema Joi 定义的验证规则
 * @param {string} source 要验证的数据来源 ('body', 'query', 'params')
 * @returns {function} Express 中间件函数
 */
export const validationMiddleware = (schema, source = 'body') => {
    return (req, res, next) => {
        // 1. 根据 source 确定要验证的数据 (例如 req.body)
        const dataToValidate = req[source];

        // 2. 使用 Joi 进行验证
        // abortEarly: false 表示返回所有错误，而不是第一个
        const { error, value } = schema.validate(dataToValidate, { abortEarly: false });

        if (error) {
            // 3. 验证失败：构造清晰的错误信息
            const errorMessage = error.details.map(detail => detail.message).join(', ');
            
            // 返回 400 Bad Request，这是客户端发送数据无效的标准响应
            return res.status(400).json({ 
                message: '输入数据验证失败',
                details: errorMessage,
                // 仅在开发/调试阶段返回完整的错误详情
                // errors: error.details
            });
        }

        // 4. 验证成功：用清理后的数据 (value) 替换原始数据 (可选，但推荐)
        req[source] = value;

        // 5. 调用下一个中间件或路由处理函数
        next();
    };
};