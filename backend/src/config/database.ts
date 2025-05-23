/**
 * Configuration de la connexion à la base de données
 */

import { PrismaClient } from '@prisma/client';

// Initialiser le client Prisma
export const prisma = new PrismaClient();

// Database configuration
export const databaseConfig = {
  url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fabrikator'
}; 