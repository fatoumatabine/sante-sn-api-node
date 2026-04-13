CREATE TABLE IF NOT EXISTS "PatientTriageEvaluation" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "responses" JSONB NOT NULL,
    "niveau" TEXT NOT NULL,
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "specialiteConseillee" TEXT,
    "recommandations" JSONB NOT NULL,
    "redFlags" JSONB NOT NULL DEFAULT '[]',
    "needsHumanReview" BOOLEAN NOT NULL DEFAULT false,
    "orientation" TEXT NOT NULL DEFAULT 'revue_humaine',
    "aiModel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientTriageEvaluation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PatientTriageEvaluation"
    ADD COLUMN IF NOT EXISTS "redFlags" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "PatientTriageEvaluation"
    ADD COLUMN IF NOT EXISTS "needsHumanReview" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PatientTriageEvaluation"
    ADD COLUMN IF NOT EXISTS "orientation" TEXT NOT NULL DEFAULT 'revue_humaine';

ALTER TABLE "PatientTriageEvaluation"
    ADD COLUMN IF NOT EXISTS "aiModel" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PatientTriageEvaluation_patientId_fkey'
  ) THEN
    ALTER TABLE "PatientTriageEvaluation"
      ADD CONSTRAINT "PatientTriageEvaluation_patientId_fkey"
      FOREIGN KEY ("patientId")
      REFERENCES "Patient"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "PatientTriageEvaluation_patientId_createdAt_idx"
ON "PatientTriageEvaluation" ("patientId", "createdAt");

ALTER TABLE "PatientTriageEvaluation"
    ALTER COLUMN "redFlags" DROP DEFAULT;

ALTER TABLE "PatientTriageEvaluation"
    ALTER COLUMN "orientation" DROP DEFAULT;
