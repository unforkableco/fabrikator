import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/prisma/prisma.service';
import { AccountService } from '../src/modules/account/account.service';

const accountService = new AccountService();

const args = process.argv.slice(2);
const options: Record<string, string> = {};

for (const arg of args) {
  const [key, value] = arg.split('=');
  if (key && value) {
    const normalizedKey = key.replace(/^--/, '');
    options[normalizedKey] = value;
  }
}

const email = options.email;
const password = options.password;
const credits = options.credits ? Number(options.credits) : 6;
const maxProjects = options.maxProjects ? Number(options.maxProjects) : 6;
const role = options.role ?? 'user';
const status = options.status ?? 'active';

if (!email || !password) {
  console.error('Usage: ts-node scripts/create-account.ts --email=user@example.com --password=secret [--credits=6] [--maxProjects=6] [--role=user] [--status=active]');
  process.exit(1);
}

(async () => {
  try {
    const normalizedEmail = accountService.normalizeEmail(email);

    const existing = await prisma.account.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      console.error(`Account with email ${normalizedEmail} already exists.`);
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const account = await prisma.account.create({
      data: {
        email: normalizedEmail,
        hashedPassword,
        credits,
        maxProjects,
        role,
        status,
      },
    });

    console.log('Account created successfully:');
    console.log({
      id: account.id,
      email: account.email,
      credits: account.credits,
      maxProjects: account.maxProjects,
      role: account.role,
      status: account.status,
    });
    process.exit(0);
  } catch (error) {
    console.error('Failed to create account:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
