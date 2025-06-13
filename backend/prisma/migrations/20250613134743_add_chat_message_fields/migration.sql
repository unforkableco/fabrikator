/*
  Warnings:

  - Added the required column `mode` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sender` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "mode" TEXT NOT NULL,
ADD COLUMN     "sender" TEXT NOT NULL,
ADD COLUMN     "suggestions" JSONB;
