import { Router } from 'express';
import { ChatController } from './chat.controller';

const router = Router();
const chatController = new ChatController();

// 3D Design Chat endpoint
router.post('/3d', chatController.handle3DChat.bind(chatController));

export default router;