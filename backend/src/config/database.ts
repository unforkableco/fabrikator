/**
 * Database connection configuration
 */

import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
export const prisma = new PrismaClient();

// Database configuration
export const databaseConfig = {
  url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fabrikator'
}; 