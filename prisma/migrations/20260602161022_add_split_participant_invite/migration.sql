-- CreateTable
CREATE TABLE "SplitParticipantInvite" (
    "token" TEXT NOT NULL,
    "splitSessionId" TEXT NOT NULL,
    "participantIndex" INTEGER NOT NULL,
    "claimedByUserId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SplitParticipantInvite_pkey" PRIMARY KEY ("token")
);

-- AddForeignKey
ALTER TABLE "SplitParticipantInvite" ADD CONSTRAINT "SplitParticipantInvite_splitSessionId_fkey" FOREIGN KEY ("splitSessionId") REFERENCES "SplitSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
