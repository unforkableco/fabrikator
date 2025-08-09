-- CreateEnum
CREATE TYPE "Component3DType" AS ENUM ('DESIGN', 'FUNCTIONAL', 'ELECTRONIC', 'MECHANICAL');

-- AlterTable
ALTER TABLE "ChangeLog" ADD COLUMN     "sceneVersionId" UUID;

-- CreateTable
CREATE TABLE "Scene3D" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectId" UUID NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'New Scene',
    "currentVersionId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scene3D_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scene3dId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "sceneGraph" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SceneVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Component3D" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "type" "Component3DType" NOT NULL,
    "category" TEXT NOT NULL,
    "filePath" TEXT,
    "fileSize" INTEGER,
    "metadata" JSONB NOT NULL,
    "isGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Component3D_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SceneVersion_scene3dId_versionNumber_key" ON "SceneVersion"("scene3dId", "versionNumber");

-- AddForeignKey
ALTER TABLE "ChangeLog" ADD CONSTRAINT "ChangeLog_sceneVersionId_fkey" FOREIGN KEY ("sceneVersionId") REFERENCES "SceneVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene3D" ADD CONSTRAINT "Scene3D_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "SceneVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene3D" ADD CONSTRAINT "Scene3D_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneVersion" ADD CONSTRAINT "SceneVersion_scene3dId_fkey" FOREIGN KEY ("scene3dId") REFERENCES "Scene3D"("id") ON DELETE CASCADE ON UPDATE CASCADE;
