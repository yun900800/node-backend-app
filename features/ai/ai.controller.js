// aiController.js

import { getAiResponse } from './ai.service.js'; // 假设aiService.js在你项目中的相对路径

/**
 * 处理 AI 聊天请求，获取模型的回复
 * * @param {object} req - Express请求对象 (假设使用Express框架)
 * @param {object} res - Express响应对象
 */
export const chatWithAI = async (req, res) => {
    // 从请求体中获取用户消息和可选的模型名称
    const { message, model } = req.body; 

    // 基础输入验证
    if (!message) {
        return res.status(400).json({ message: 'Missing required field: message' });
    }

    try {
        // 所有的核心业务逻辑（API调用）都在 Service 层完成
        const aiResponseContent = await getAiResponse(message, model);

        // 如果 Service 成功返回内容，则表示调用成功
        if (aiResponseContent) {
            res.status(200).json({ 
                message: 'AI response successful',
                role: 'assistant',
                content: aiResponseContent
            });
        } else {
            // 理论上Service层应该抛出错误，但如果Service返回了非预期的null/undefined
            // 可以作为一种特殊的成功但无内容的情况（虽然不常见）
            // 这里为了与你的 `register` 模式更接近，我们保持 Service 层内部抛出错误，
            // 并在 Controller 层捕获。
            // 这里的 else 块实际上不应该被执行，因为 Service 失败会抛出错误
            return res.status(500).json({ message: 'AI service returned no content unexpectedly' });
        }
        
    } catch (error) {
        // 捕获 Service 层抛出的错误（如网络问题、API密钥错误、API返回4xx/5xx等）
        console.error('Error during AI chat:', error.message);

        // 根据错误类型返回不同的状态码（可选，更精细的错误处理）
        // 实际应用中，可以解析 error.message 来判断是否为可预测的API错误（如401 Unauthorized）
        // 这里为了简单，我们都返回 500
        
        // 示例：更细致的错误处理（如果Service层结构化了错误）
        // if (error.message.includes('401')) {
        //     return res.status(401).json({ message: 'Authentication failed with AI provider' });
        // }

        res.status(500).json({ message: 'AI chat failed due to server or API error' });
    }
};

// 假设在你的路由文件中，你会这样使用它：
// router.post('/chat', chatWithAI);