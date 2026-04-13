-- AlterTable
ALTER TABLE "RendezVous" ADD COLUMN     "urgent_ia" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "RendezVous_urgent_ia_statut_idx" ON "RendezVous"("urgent_ia", "statut");
