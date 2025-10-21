import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma/prisma.service';

interface TokenPayload {
  accountId: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-prod';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;

    const account = await prisma.account.findUnique({ where: { id: payload.accountId } });

    if (!account || account.status !== 'active') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.account = account;
    return next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

export const requireAccount = (req: Request, res: Response, next: NextFunction) => {
  if (!req.account) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
};
