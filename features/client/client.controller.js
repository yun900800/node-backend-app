// client.controller.js

import crypto from 'crypto';
import {
    getClientsByPage, 
    deleteClientById,
    updateClientById,
    createClientRecord // 新增：用于调用创建逻辑
} from './client.repository.js';

// 假设认证中间件已将用户信息附加到 req.user
const createClient = async (req, res) => {
    try {
        // --- 核心改动：获取 ownerId ---
        // 假设当前登录用户的 ID 存储在 req.user.userId 中
        const ownerId = req.user ? req.user.userId : null; 
        if (!ownerId) {
            return res.status(401).json({ error: 'User not authenticated to create client.' });
        }
        // ---------------------------------

        const { name, redirectUris, grants } = req.body;
        
        const clientSecret = crypto.randomBytes(32).toString('hex');

        // 将客户端信息保存到数据库，并传入 ownerId
        const newClient = await createClientRecord({
            name,
            secret: clientSecret,
            redirectUris,
            grants,
            ownerId // 传入 ownerId
        });

        res.status(201).json({
            message: 'Client created successfully',
            clientId: newClient.id,
            clientSecret: newClient.secret
        });
    } catch (error) {
        console.error('error', error);
        res.status(500).json({ error: 'Failed to create client' });
    }
};

// clientPages, deleteClient, updateClient 的逻辑保持不变，因为它们只调用仓库函数
const clientPages = async (req,res) => {
    const {page, pageSize} = req.query;
    const userId = req.user ? req.user.userId : null; 
    const pageData = await getClientsByPage(page,pageSize,userId);
    res.json(pageData);
}

const deleteClient = async (req, res) => {
    const { clientId } = req.body;

    if (!clientId) {
        return res.status(400).json({ error: 'Client ID is required.' });
    }

    try {
        const ret = await deleteClientById(clientId);
        // pg-promise 的 delete 返回的是删除的行数
        if (ret === 0) {
            return res.status(404).json({ error: 'Client not found.' });
        }
        res.status(200).json({ message: 'Client deleted successfully.', ret });
    } catch (error) {
        console.error('Error deleting client:', error);
        // 使用 pg-promise 时，我们不再捕获 'P2025' 错误码
        res.status(500).json({ error: 'Failed to delete client.' });
    }
};

const updateClient = async (req, res) => {
    const { id, name, redirectUris, grants } = req.body;

    if (!id) {
        return res.status(400).json({ error: 'Client ID is required for update.' });
    }

    try {
        const updatedClient = await updateClientById(id, { name, redirectUris, grants });
        // pg-promise 的 update 返回的是更新的记录
        if (!updatedClient) {
            return res.status(404).json({ error: 'Client not found.' });
        }
        res.status(200).json({ message: 'Client updated successfully.', updatedClient });
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ error: 'Failed to update client.' });
    }
};

export { 
    createClient,
    clientPages,
    deleteClient,
    updateClient
};