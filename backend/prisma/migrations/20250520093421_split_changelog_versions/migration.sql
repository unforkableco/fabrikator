/*
  Warnings:

  - You are about to drop the column `versionId` on the `ChangeLog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ChangeLog" DROP COLUMN "versionId";

-- AddForeignKey
ALTER TABLE "ChangeLog" ADD CONSTRAINT "ChangeLog_reqVersionId_fkey" FOREIGN KEY ("reqVersionId") REFERENCES "ReqVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeLog" ADD CONSTRAINT "ChangeLog_compVersionId_fkey" FOREIGN KEY ("compVersionId") REFERENCES "CompVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeLog" ADD CONSTRAINT "ChangeLog_p3dVersionId_fkey" FOREIGN KEY ("p3dVersionId") REFERENCES "P3DVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeLog" ADD CONSTRAINT "ChangeLog_wireVersionId_fkey" FOREIGN KEY ("wireVersionId") REFERENCES "WireVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeLog" ADD CONSTRAINT "ChangeLog_docVersionId_fkey" FOREIGN KEY ("docVersionId") REFERENCES "DocVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
