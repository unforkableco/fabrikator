import { Router } from 'express';
import { AccountController } from './account.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const accountController = new AccountController();

router.get('/me', authenticate, accountController.getMe.bind(accountController));
router.put('/me/password', authenticate, accountController.updatePassword.bind(accountController));

export const accountRouter = router;
