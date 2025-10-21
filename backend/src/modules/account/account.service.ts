import { prisma } from '../../prisma/prisma.service';
import bcrypt from 'bcryptjs';

export interface AccountSummary {
  id: string;
  email: string;
  credits: number;
  maxProjects: number;
  status: string;
  role: string;
  projectsUsed: number;
  projectsRemaining: number;
}

export class AccountService {
  normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  async findByEmail(email: string) {
    const normalized = this.normalizeEmail(email);
    return prisma.account.findUnique({ where: { email: normalized } });
  }

  async getById(id: string) {
    return prisma.account.findUnique({ where: { id } });
  }

  async getSummary(accountId: string): Promise<AccountSummary | null> {
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) return null;

    const projectsUsed = await prisma.project.count({ where: { ownerId: accountId } });
    const projectsRemaining = Math.max(account.maxProjects - projectsUsed, 0);

    return {
      id: account.id,
      email: account.email,
      credits: account.credits,
      maxProjects: account.maxProjects,
      status: account.status,
      role: account.role,
      projectsUsed,
      projectsRemaining,
    };
  }

  async decrementCredits(accountId: string, amount: number, reason?: string) {
    return prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({ where: { id: accountId } });
      if (!account) {
        throw new Error('ACCOUNT_NOT_FOUND');
      }

      if (account.credits < amount) {
        throw new Error('INSUFFICIENT_CREDITS');
      }

      await tx.account.update({
        where: { id: accountId },
        data: {
          credits: { decrement: amount },
        },
      });

      await tx.accountCreditTransaction.create({
        data: {
          accountId,
          amount: -Math.abs(amount),
          reason,
        },
      });
    });
  }

  async recordCreditChange(accountId: string, amount: number, reason?: string) {
    return prisma.accountCreditTransaction.create({
      data: {
        accountId,
        amount,
        reason,
      },
    });
  }

  async updatePassword(accountId: string, currentPassword: string, newPassword: string) {
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) {
      throw new Error('ACCOUNT_NOT_FOUND');
    }

    const isValid = await bcrypt.compare(currentPassword, account.hashedPassword);
    if (!isValid) {
      throw new Error('INVALID_PASSWORD');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.account.update({
      where: { id: accountId },
      data: { hashedPassword },
    });
  }
}
