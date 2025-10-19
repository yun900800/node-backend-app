import express from 'express';

const router = express.Router();
import { chatWithAI } from './ai.controller.js';

router.post('/chat', chatWithAI);

export default router;
