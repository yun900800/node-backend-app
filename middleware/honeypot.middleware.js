/**
 * 🤖 蜜罐 (Honeypot) 检查中间件 🤖
 */

// 定义我们在客户端和后端使用的蜜罐字段名称
// 必须与前端的 name 属性严格一致
const HONEYPOT_FIELD_NAME_1 = 'username_check';
const HONEYPOT_FIELD_NAME_2 = 'confirm_email_address'; // <--- 增加了第二个字段

export const honeypotMiddleware = (req, res, next) => {
    // 1. 获取两个蜜罐字段的值
    const value1 = req.body[HONEYPOT_FIELD_NAME_1];
    const value2 = req.body[HONEYPOT_FIELD_NAME_2];

    // 2. 检查：只要任一字段被填充（存在且长度大于 0），即判定为机器人
    if ((value1 && value1.length > 0) || (value2 && value2.length > 0)) {
        // --- 🤖 发现机器人攻击 🤖 ---
        
        // 记录日志 (可选)
        console.warn(`[HONEYPOT ALERT] Bot detected. IP: ${req.ip}`);

        // 3. 静默拒绝：返回 200 OK 但不执行后续业务，以迷惑攻击者。
        // 这是推荐的机器人处理方式。
        return res.status(200).json({ 
            message: '注册请求已提交',
        });
    }

    // 4. 清理：正常情况，请求继续。但需要将蜜罐字段从请求体中移除，
    // 防止它们意外流入 Joi 验证或业务逻辑层。
    if (req.body.hasOwnProperty(HONEYPOT_FIELD_NAME_1)) {
        delete req.body[HONEYPOT_FIELD_NAME_1];
    }
    if (req.body.hasOwnProperty(HONEYPOT_FIELD_NAME_2)) {
        delete req.body[HONEYPOT_FIELD_NAME_2];
    }

    // 5. 调用下一个中间件或路由处理函数
    next();
};