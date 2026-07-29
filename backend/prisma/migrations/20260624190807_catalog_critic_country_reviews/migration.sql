-- AlterTable
ALTER TABLE "Wine" ADD COLUMN     "country" TEXT,
ADD COLUMN     "criticScore" INTEGER,
ADD COLUMN     "imageUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Review_userId_wineId_key" ON "Review"("userId", "wineId");

-- CreateIndex
CREATE INDEX "Wine_type_idx" ON "Wine"("type");

-- CreateIndex
CREATE INDEX "Wine_country_idx" ON "Wine"("country");

-- CreateIndex
CREATE INDEX "Wine_wineryName_idx" ON "Wine"("wineryName");

-- CreateIndex
CREATE INDEX "Wine_criticScore_idx" ON "Wine"("criticScore");
