import { Account } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      account?: Account;
    }
  }
}

export {};
