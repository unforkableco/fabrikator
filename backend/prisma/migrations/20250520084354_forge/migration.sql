-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requirement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectId" UUID NOT NULL,
    "currentVersionId" UUID,

    CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReqVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requirementId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB NOT NULL,

    CONSTRAINT "ReqVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Component" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectId" UUID NOT NULL,
    "currentVersionId" UUID,

    CONSTRAINT "Component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "componentId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "specs" JSONB NOT NULL,

    CONSTRAINT "CompVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product3D" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectId" UUID NOT NULL,
    "currentVersionId" UUID,

    CONSTRAINT "Product3D_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "P3DVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product3DId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modelData" JSONB NOT NULL,

    CONSTRAINT "P3DVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WiringSchema" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectId" UUID NOT NULL,
    "currentVersionId" UUID,

    CONSTRAINT "WiringSchema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WireVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wiringSchemaId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "wiringData" JSONB NOT NULL,

    CONSTRAINT "WireVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectId" UUID NOT NULL,
    "currentVersionId" UUID,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "documentId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" JSONB NOT NULL,

    CONSTRAINT "DocVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suggestion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectId" UUID NOT NULL,
    "context" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "promptPayload" JSONB NOT NULL,
    "responsePayload" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuggestionItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "suggestionId" UUID NOT NULL,
    "itemPayload" JSONB NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "SuggestionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity" TEXT NOT NULL,
    "versionId" UUID NOT NULL,
    "changeType" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "diffPayload" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReqVersion_requirementId_versionNumber_key" ON "ReqVersion"("requirementId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CompVersion_componentId_versionNumber_key" ON "CompVersion"("componentId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "P3DVersion_product3DId_versionNumber_key" ON "P3DVersion"("product3DId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WireVersion_wiringSchemaId_versionNumber_key" ON "WireVersion"("wiringSchemaId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DocVersion_documentId_versionNumber_key" ON "DocVersion"("documentId", "versionNumber");

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "ReqVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReqVersion" ADD CONSTRAINT "ReqVersion_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "CompVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompVersion" ADD CONSTRAINT "CompVersion_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product3D" ADD CONSTRAINT "Product3D_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product3D" ADD CONSTRAINT "Product3D_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "P3DVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "P3DVersion" ADD CONSTRAINT "P3DVersion_product3DId_fkey" FOREIGN KEY ("product3DId") REFERENCES "Product3D"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WiringSchema" ADD CONSTRAINT "WiringSchema_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WiringSchema" ADD CONSTRAINT "WiringSchema_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "WireVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WireVersion" ADD CONSTRAINT "WireVersion_wiringSchemaId_fkey" FOREIGN KEY ("wiringSchemaId") REFERENCES "WiringSchema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "DocVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocVersion" ADD CONSTRAINT "DocVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuggestionItem" ADD CONSTRAINT "SuggestionItem_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "Suggestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeLog" ADD CONSTRAINT "ChangeLog_reqVersion_fkey" FOREIGN KEY ("versionId") REFERENCES "ReqVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeLog" ADD CONSTRAINT "ChangeLog_compVersion_fkey" FOREIGN KEY ("versionId") REFERENCES "CompVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeLog" ADD CONSTRAINT "ChangeLog_p3dVersion_fkey" FOREIGN KEY ("versionId") REFERENCES "P3DVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeLog" ADD CONSTRAINT "ChangeLog_wireVersion_fkey" FOREIGN KEY ("versionId") REFERENCES "WireVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeLog" ADD CONSTRAINT "ChangeLog_docVersion_fkey" FOREIGN KEY ("versionId") REFERENCES "DocVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
