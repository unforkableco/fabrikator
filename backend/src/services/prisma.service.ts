import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Gestion des erreurs Prisma
prisma.$use(async (params, next) => {
  try {
    return await next(params);
  } catch (error) {
    console.error(`Prisma Error in ${params.model}.${params.action}:`, error);
    throw error;
  }
}); 