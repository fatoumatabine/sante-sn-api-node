-- CreateTable
CREATE TABLE "ChatThread" (
    "id" SERIAL NOT NULL,
    "participantAUserId" INTEGER NOT NULL,
    "participantBUserId" INTEGER NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" SERIAL NOT NULL,
    "threadId" INTEGER NOT NULL,
    "senderUserId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatThread_participantAUserId_participantBUserId_key" ON "ChatThread"("participantAUserId", "participantBUserId");
CREATE INDEX "ChatThread_participantAUserId_idx" ON "ChatThread"("participantAUserId");
CREATE INDEX "ChatThread_participantBUserId_idx" ON "ChatThread"("participantBUserId");
CREATE INDEX "ChatThread_lastMessageAt_idx" ON "ChatThread"("lastMessageAt");

-- CreateIndex
CREATE INDEX "ChatMessage_threadId_createdAt_idx" ON "ChatMessage"("threadId", "createdAt");
CREATE INDEX "ChatMessage_senderUserId_idx" ON "ChatMessage"("senderUserId");
CREATE INDEX "ChatMessage_readAt_idx" ON "ChatMessage"("readAt");

-- AddForeignKey
ALTER TABLE "ChatThread"
ADD CONSTRAINT "ChatThread_participantAUserId_fkey"
FOREIGN KEY ("participantAUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThread"
ADD CONSTRAINT "ChatThread_participantBUserId_fkey"
FOREIGN KEY ("participantBUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage"
ADD CONSTRAINT "ChatMessage_threadId_fkey"
FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage"
ADD CONSTRAINT "ChatMessage_senderUserId_fkey"
FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
