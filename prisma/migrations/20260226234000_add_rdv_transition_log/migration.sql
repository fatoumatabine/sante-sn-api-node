-- CreateTable
CREATE TABLE "RendezVousTransitionLog" (
    "id" SERIAL NOT NULL,
    "rendezVousId" INTEGER NOT NULL,
    "fromStatut" "StatutRendezVous",
    "toStatut" "StatutRendezVous" NOT NULL,
    "actorRole" "Role",
    "actorUserId" INTEGER,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RendezVousTransitionLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RendezVousTransitionLog"
ADD CONSTRAINT "RendezVousTransitionLog_rendezVousId_fkey"
FOREIGN KEY ("rendezVousId") REFERENCES "RendezVous"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "RendezVousTransitionLog_rendezVousId_createdAt_idx" ON "RendezVousTransitionLog"("rendezVousId", "createdAt");
CREATE INDEX "RendezVousTransitionLog_actorUserId_idx" ON "RendezVousTransitionLog"("actorUserId");
