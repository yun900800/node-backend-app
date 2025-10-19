// aiService.js

// 从环境变量中读取密钥和配置
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '<YOUR_OPENROUTER_API_KEY>';
const YOUR_SITE_URL = process.env.YOUR_SITE_URL || 'http://localhost:5172'; // 你的网站URL
const YOUR_SITE_NAME = process.env.YOUR_SITE_NAME || 'My AI App'; // 你的网站名称

/**
 * 调用 OpenRouter API 获取 AI 回答
 * @param {string} userMessage - 用户的输入消息
 * @param {string} modelName - 要使用的模型名称，默认为 'openai/gpt-4o'
 * @returns {Promise<string|null>} - AI的回复文本，如果调用失败则返回null
 */
export const getAiResponse = async (userMessage, modelName = 'openai/gpt-4o') => {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': YOUR_SITE_URL, 
                'X-Title': YOUR_SITE_NAME, 
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: modelName,
                messages: [
                    {
                        role: 'user',
                        content: userMessage,
                    },
                ],
                // 更多可选参数，例如 stream: true, max_tokens, temperature 等
            }),
        });

        // 检查HTTP响应状态码
        if (!response.ok) {
            // 如果API返回非2xx状态码
            const errorData = await response.json().catch(() => ({ message: 'Unknown error format' }));
            console.error('OpenRouter API Error:', response.status, errorData);
            // 抛出带有足够信息的错误，以便Controller层捕获并处理
            throw new Error(`AI service failed: ${response.status} - ${errorData.message || response.statusText}`);
        }

        const data = await response.json();
        console.log('OpenRouter API Response Data:', data);
        // 检查API返回的数据结构，确保能拿到回复内容
        if (data && data.choices && data.choices.length > 0) {
            return data.choices[0].message.content;
        } else {
            // API调用成功，但没有返回有效的回复内容
            console.error('AI response data is empty or invalid:', data);
            throw new Error('AI service returned an empty or invalid response.');
        }

    } catch (error) {
        // 捕获网络错误、JSON解析错误或自定义抛出的错误
        console.error('Error in getAiResponse:', error.message);
        // 在Service层内部消化或转换错误，确保Controller层能以统一的方式处理
        // 在这里，我们选择重新抛出，让Controller处理HTTP状态码
        throw error;
    }
};