-- CreateTable
CREATE TABLE "ConsultationPresence" (
    "id" SERIAL NOT NULL,
    "consultationId" INTEGER NOT NULL,
    "role" "Role" NOT NULL,
    "userId" INTEGER NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationPresence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationPresence_consultationId_role_key" ON "ConsultationPresence"("consultationId", "role");
CREATE INDEX "ConsultationPresence_consultationId_lastSeenAt_idx" ON "ConsultationPresence"("consultationId", "lastSeenAt");
CREATE INDEX "ConsultationPresence_userId_idx" ON "ConsultationPresence"("userId");

-- AddForeignKey
ALTER TABLE "ConsultationPresence"
ADD CONSTRAINT "ConsultationPresence_consultationId_fkey"
FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
