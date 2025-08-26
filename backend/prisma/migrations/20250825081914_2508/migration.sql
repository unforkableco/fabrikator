-- AlterTable
ALTER TABLE "DesignOption" ADD COLUMN     "parentDesignOptionId" UUID,
ALTER COLUMN "printability" SET DEFAULT 'moderate';

-- AlterTable
ALTER TABLE "DesignPreview" ADD COLUMN     "finishedAt" TIMESTAMPTZ(6),
ADD COLUMN     "logText" TEXT,
ADD COLUMN     "progress" INTEGER,
ADD COLUMN     "stage" TEXT,
ADD COLUMN     "startedAt" TIMESTAMPTZ(6),
ADD COLUMN     "status" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "designThumbnailUrl" TEXT;

-- CreateTable
CREATE TABLE "ProjectCadGeneration" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectId" UUID NOT NULL,
    "designOptionId" UUID,
    "outputDir" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "logText" TEXT,
    "stage" TEXT,
    "progress" INTEGER,
    "totalParts" INTEGER,
    "completedParts" INTEGER,
    "failedParts" INTEGER,
    "startedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ(6),
    "analysisJson" JSONB,
    "partsJson" JSONB,
    "designImagePath" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hardwareSpecs" JSONB,
    "assemblyPlan" JSONB,
    "manufacturingConstraints" JSONB,

    CONSTRAINT "ProjectCadGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCadPart" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cadGenerationId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "geometryHint" TEXT,
    "approxDims" JSONB,
    "features" JSONB,
    "appearance" JSONB,
    "partJson" JSONB,
    "promptMeta" JSONB,
    "scriptCode" TEXT,
    "scriptPath" TEXT,
    "stlPath" TEXT,
    "stlData" BYTEA,
    "status" TEXT NOT NULL,
    "errorLog" TEXT,
    "startedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectCadPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentSpecs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "componentId" UUID NOT NULL,
    "dimensions" JSONB NOT NULL,
    "ports" JSONB NOT NULL,
    "constraints" JSONB NOT NULL,
    "mountingInfo" JSONB NOT NULL,
    "extractedBy" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ComponentSpecs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartInterface" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partAId" UUID NOT NULL,
    "partBId" UUID NOT NULL,
    "interfaceType" TEXT NOT NULL,
    "dimensions" JSONB NOT NULL,
    "tolerances" JSONB NOT NULL,
    "features" JSONB NOT NULL,
    "assemblyOrder" INTEGER,
    "toolsRequired" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartInterface_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssemblyValidation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cadGenerationId" UUID NOT NULL,
    "overallStatus" TEXT NOT NULL,
    "fitmentCheck" JSONB NOT NULL,
    "clearanceCheck" JSONB NOT NULL,
    "interferenceCheck" JSONB NOT NULL,
    "accessibilityCheck" JSONB NOT NULL,
    "issues" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "validatedBy" TEXT NOT NULL,
    "validationTime" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssemblyValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartValidationResult" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assemblyValidationId" UUID NOT NULL,
    "partId" UUID NOT NULL,
    "geometryValid" BOOLEAN NOT NULL,
    "dimensionsValid" BOOLEAN NOT NULL,
    "featuresValid" BOOLEAN NOT NULL,
    "printabilityValid" BOOLEAN NOT NULL,
    "geometryIssues" TEXT[],
    "dimensionIssues" TEXT[],
    "featureIssues" TEXT[],
    "printIssues" TEXT[],
    "recommendations" JSONB NOT NULL,
    "validatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartValidationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefinementIteration" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cadGenerationId" UUID NOT NULL,
    "iterationNumber" INTEGER NOT NULL,
    "triggerReason" TEXT NOT NULL,
    "previousResults" JSONB NOT NULL,
    "targetIssues" TEXT[],
    "refinementGoals" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "partModifications" JSONB NOT NULL,
    "improvements" JSONB NOT NULL,
    "startedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(6),
    "refinedBy" TEXT NOT NULL,

    CONSTRAINT "RefinementIteration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ComponentSpecs_componentId_key" ON "ComponentSpecs"("componentId");

-- CreateIndex
CREATE UNIQUE INDEX "PartInterface_partAId_partBId_key" ON "PartInterface"("partAId", "partBId");

-- AddForeignKey
ALTER TABLE "ProjectCadGeneration" ADD CONSTRAINT "ProjectCadGeneration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCadPart" ADD CONSTRAINT "ProjectCadPart_cadGenerationId_fkey" FOREIGN KEY ("cadGenerationId") REFERENCES "ProjectCadGeneration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignOption" ADD CONSTRAINT "DesignOption_parentDesignOptionId_fkey" FOREIGN KEY ("parentDesignOptionId") REFERENCES "DesignOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentSpecs" ADD CONSTRAINT "ComponentSpecs_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartInterface" ADD CONSTRAINT "PartInterface_partAId_fkey" FOREIGN KEY ("partAId") REFERENCES "ProjectCadPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartInterface" ADD CONSTRAINT "PartInterface_partBId_fkey" FOREIGN KEY ("partBId") REFERENCES "ProjectCadPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssemblyValidation" ADD CONSTRAINT "AssemblyValidation_cadGenerationId_fkey" FOREIGN KEY ("cadGenerationId") REFERENCES "ProjectCadGeneration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartValidationResult" ADD CONSTRAINT "PartValidationResult_assemblyValidationId_fkey" FOREIGN KEY ("assemblyValidationId") REFERENCES "AssemblyValidation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartValidationResult" ADD CONSTRAINT "PartValidationResult_partId_fkey" FOREIGN KEY ("partId") REFERENCES "ProjectCadPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefinementIteration" ADD CONSTRAINT "RefinementIteration_cadGenerationId_fkey" FOREIGN KEY ("cadGenerationId") REFERENCES "ProjectCadGeneration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
