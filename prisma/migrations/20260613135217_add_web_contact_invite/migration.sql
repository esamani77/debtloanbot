-- CreateTable
CREATE TABLE "WebContactInvite" (
    "token" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebContactInvite_pkey" PRIMARY KEY ("token")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebContactInvite_inviterId_key" ON "WebContactInvite"("inviterId");

-- AddForeignKey
ALTER TABLE "WebContactInvite" ADD CONSTRAINT "WebContactInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
