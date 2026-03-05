-- CreateTable
CREATE TABLE "DashboardSnapshot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedLabel" TEXT,
    "figma" JSONB,
    "contentful" JSONB NOT NULL,
    "github" JSONB NOT NULL,

    CONSTRAINT "DashboardSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DashboardSnapshot_createdAt_idx" ON "DashboardSnapshot"("createdAt" DESC);

