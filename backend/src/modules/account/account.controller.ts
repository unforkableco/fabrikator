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
}
