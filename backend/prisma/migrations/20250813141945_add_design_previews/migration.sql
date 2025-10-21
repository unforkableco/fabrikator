-- CreateTable
CREATE TABLE "DesignPreview" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectId" UUID NOT NULL,
    "selectedDesignId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "DesignPreview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignOption" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "designPreviewId" UUID NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imagePrompt" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "keyFeatures" TEXT[],
    "complexity" TEXT NOT NULL,
    "printability" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesignOption_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DesignPreview" ADD CONSTRAINT "DesignPreview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignPreview" ADD CONSTRAINT "DesignPreview_selectedDesignId_fkey" FOREIGN KEY ("selectedDesignId") REFERENCES "DesignOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignOption" ADD CONSTRAINT "DesignOption_designPreviewId_fkey" FOREIGN KEY ("designPreviewId") REFERENCES "DesignPreview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
