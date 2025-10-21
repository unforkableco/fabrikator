-- Create Account table
CREATE TABLE "Account" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 6,
    "maxProjects" INTEGER NOT NULL DEFAULT 6,
    "role" TEXT NOT NULL DEFAULT 'user',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Account_email_key" UNIQUE ("email")
);

-- Create AccountCreditTransaction table
CREATE TABLE "AccountCreditTransaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "accountId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountCreditTransaction_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AccountCreditTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Add ownerId to Project
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "ownerId" UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'Project_ownerId_fkey'
    ) THEN
        ALTER TABLE "Project"
        ADD CONSTRAINT "Project_ownerId_fkey"
        FOREIGN KEY ("ownerId") REFERENCES "Account"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "AccountCreditTransaction_accountId_idx" ON "AccountCreditTransaction"("accountId");
CREATE INDEX IF NOT EXISTS "Project_ownerId_idx" ON "Project"("ownerId");
