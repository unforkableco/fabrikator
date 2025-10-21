import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { AccountService } from '../account/account.service';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-prod';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

export class AuthController {
  private accountService: AccountService;

  constructor() {
    this.accountService = new AccountService();
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body as { email?: string; password?: string };

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const account = await this.accountService.findByEmail(email);
      if (!account) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(password, account.hashedPassword);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (account.status !== 'active') {
        return res.status(403).json({ error: 'Account is not active' });
      }

      const signOptions: SignOptions = { expiresIn: JWT_EXPIRES_IN as any };
      const token = jwt.sign({ accountId: account.id }, JWT_SECRET as Secret, signOptions);
      const summary = await this.accountService.getSummary(account.id);

      res.json({
        token,
        account: summary,
      });
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ error: 'Failed to login' });
    }
  }
}
