/*
  Warnings:

  - You are about to drop the column `conversationId` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the `Conversation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Suggestion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SuggestionItem` table. If the table is not empty, all the data it contains will be lost.

*/

-- First add the new columns allowing NULL temporarily
ALTER TABLE "Message" ADD COLUMN "context" TEXT;
ALTER TABLE "Message" ADD COLUMN "projectId" UUID;

-- Copy projectId from Conversation to Message 
UPDATE "Message" m
SET "projectId" = c."projectId", "context" = c."context"
FROM "Conversation" c
WHERE m."conversationId" = c."id";

-- Now make columns NOT NULL after data is filled
ALTER TABLE "Message" ALTER COLUMN "context" SET NOT NULL;
ALTER TABLE "Message" ALTER COLUMN "projectId" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "Suggestion" DROP CONSTRAINT "Suggestion_projectId_fkey";

-- DropForeignKey
ALTER TABLE "SuggestionItem" DROP CONSTRAINT "SuggestionItem_suggestionId_fkey";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "conversationId",
DROP COLUMN "role";

-- DropTable
DROP TABLE "Conversation";

-- DropTable
DROP TABLE "Suggestion";

-- DropTable
DROP TABLE "SuggestionItem";

-- CreateIndex
CREATE INDEX "Message_projectId_context_idx" ON "Message"("projectId", "context");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
