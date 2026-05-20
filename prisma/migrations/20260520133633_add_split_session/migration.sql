-- CreateEnum
CREATE TYPE "SplitStatus" AS ENUM ('DRAFT', 'CALCULATED', 'SHARED');

-- CreateEnum
CREATE TYPE "SplitType" AS ENUM ('EQUAL', 'PERCENTAGE', 'CUSTOM');

-- CreateTable
CREATE TABLE "SplitSession" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "status" "SplitStatus" NOT NULL DEFAULT 'DRAFT',
    "participants" TEXT[],
    "shareToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SplitSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillItem" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paidByIndex" INTEGER NOT NULL,
    "splitType" "SplitType" NOT NULL,
    "shares" DOUBLE PRECISION[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SplitSession_shareToken_key" ON "SplitSession"("shareToken");

-- AddForeignKey
ALTER TABLE "SplitSession" ADD CONSTRAINT "SplitSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillItem" ADD CONSTRAINT "BillItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SplitSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
