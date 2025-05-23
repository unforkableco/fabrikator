/*
  Warnings:

  - You are about to drop the column `docVersionId` on the `ChangeLog` table. All the data in the column will be lost.
  - You are about to drop the column `p3dVersionId` on the `ChangeLog` table. All the data in the column will be lost.
  - You are about to drop the column `reqVersionId` on the `ChangeLog` table. All the data in the column will be lost.
  - You are about to drop the `DocVersion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Document` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `P3DVersion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Product3D` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReqVersion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Requirement` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ChangeLog" DROP CONSTRAINT "ChangeLog_docVersionId_fkey";

-- DropForeignKey
ALTER TABLE "ChangeLog" DROP CONSTRAINT "ChangeLog_p3dVersionId_fkey";

-- DropForeignKey
ALTER TABLE "ChangeLog" DROP CONSTRAINT "ChangeLog_reqVersionId_fkey";

-- DropForeignKey
ALTER TABLE "DocVersion" DROP CONSTRAINT "DocVersion_documentId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_currentVersionId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_projectId_fkey";

-- DropForeignKey
ALTER TABLE "P3DVersion" DROP CONSTRAINT "P3DVersion_product3DId_fkey";

-- DropForeignKey
ALTER TABLE "Product3D" DROP CONSTRAINT "Product3D_currentVersionId_fkey";

-- DropForeignKey
ALTER TABLE "Product3D" DROP CONSTRAINT "Product3D_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ReqVersion" DROP CONSTRAINT "ReqVersion_requirementId_fkey";

-- DropForeignKey
ALTER TABLE "Requirement" DROP CONSTRAINT "Requirement_currentVersionId_fkey";

-- DropForeignKey
ALTER TABLE "Requirement" DROP CONSTRAINT "Requirement_projectId_fkey";

-- AlterTable
ALTER TABLE "ChangeLog" DROP COLUMN "docVersionId",
DROP COLUMN "p3dVersionId",
DROP COLUMN "reqVersionId";

-- DropTable
DROP TABLE "DocVersion";

-- DropTable
DROP TABLE "Document";

-- DropTable
DROP TABLE "P3DVersion";

-- DropTable
DROP TABLE "Product3D";

-- DropTable
DROP TABLE "ReqVersion";

-- DropTable
DROP TABLE "Requirement";
