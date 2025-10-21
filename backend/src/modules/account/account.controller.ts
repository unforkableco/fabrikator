import { Request, Response } from 'express';
import { AccountService } from './account.service';

export class AccountController {
  private accountService: AccountService;

  constructor() {
    this.accountService = new AccountService();
  }

  async getMe(req: Request, res: Response) {
    try {
      if (!req.account) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const summary = await this.accountService.getSummary(req.account.id);
      if (!summary) {
        return res.status(404).json({ error: 'Account not found' });
      }

      res.json(summary);
    } catch (error) {
      console.error('Error retrieving account summary:', error);
      res.status(500).json({ error: 'Failed to retrieve account summary' });
    }
  }

  async updatePassword(req: Request, res: Response) {
    try {
      if (!req.account) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters long' });
      }

      await this.accountService.updatePassword(req.account.id, currentPassword, newPassword);

      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'INVALID_PASSWORD') {
          return res.status(400).json({ error: 'Current password is incorrect' });
        }
        if (error.message === 'ACCOUNT_NOT_FOUND') {
          return res.status(404).json({ error: 'Account not found' });
        }
      }
      console.error('Error updating password:', error);
      res.status(500).json({ error: 'Failed to update password' });
    }
  }
}
