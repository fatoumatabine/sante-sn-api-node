import { PrismaClient } from '@prisma/client';
import { AppError } from '../../../shared/utils/AppError';

const prisma = new PrismaClient();

export class PatientRepository {
  async findPatientByUserId(userId: number) {
    return prisma.patient.findFirst({
      where: { userId, isArchived: false, user: { isArchived: false } },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          }
        }
      }
    });
  }

  async getPatientRendezVous(patientId: number) {
    return prisma.rendezVous.findMany({
      where: { patientId },
      include: {
        medecin: {
          include: {
            user: {
              select: {
                name: true,
              }
            }
          }
        }
      },
      orderBy: { date: 'desc' }
    });
  }

  async getPatientConsultations(patientId: number) {
    return prisma.consultation.findMany({
      where: { patientId, isArchived: false },
      include: {
        medecin: {
          include: {
            user: {
              select: {
                name: true,
              }
            }
          }
        },
        ordonnance: true
      },
      orderBy: { date: 'desc' }
    });
  }

  async getPatientDashboard(patientId: number) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const totalRendezVous = await prisma.rendezVous.count({
      where: { patientId }
    });

    const upcomingRendezVous = await prisma.rendezVous.count({
      where: {
        patientId,
        date: { gte: now },
        statut: { in: ['confirme', 'en_attente'] }
      }
    });

    const totalConsultations = await prisma.consultation.count({
      where: { patientId, isArchived: false }
    });

    const consultationsThisMonth = await prisma.consultation.count({
      where: {
        patientId,
        isArchived: false,
        date: { gte: startOfMonth }
      }
    });

    return {
      totalRendezVous,
      upcomingRendezVous,
      totalConsultations,
      consultationsThisMonth
    };
  }

  async getPatientPaiements(patientId: number) {
    return prisma.paiement.findMany({
      where: { patientId, isArchived: false },
      include: {
        rendezVous: {
          include: {
            medecin: {
              select: {
                id: true,
                specialite: true,
                user: {
                  select: {
                    name: true,
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updatePatientProfile(
    userId: number,
    data: {
      prenom?: string;
      nom?: string;
      telephone?: string;
      email?: string;
    }
  ) {
    const patient = await prisma.patient.findFirst({
      where: { userId, isArchived: false, user: { isArchived: false } },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!patient) {
      throw new AppError('Patient non trouvé', 404);
    }

    const prenom = data.prenom?.trim() || patient.prenom;
    const nom = data.nom?.trim() || patient.nom;
    const telephone = data.telephone?.trim() || patient.telephone;
    const email = data.email?.trim().toLowerCase() || patient.user.email;

    if (!prenom || !nom) {
      throw new AppError('Prénom et nom requis', 400);
    }
    if (!telephone) {
      throw new AppError('Téléphone requis', 400);
    }
    if (!email) {
      throw new AppError('Email requis', 400);
    }

    const existingEmail = await prisma.user.findFirst({
      where: {
        email,
        isArchived: false,
        NOT: { id: patient.userId },
      },
      select: { id: true },
    });
    if (existingEmail) {
      throw new AppError('Cet email est déjà utilisé', 400);
    }

    const existingPhone = await prisma.patient.findFirst({
      where: {
        telephone,
        isArchived: false,
        NOT: { id: patient.id },
      },
      select: { id: true },
    });
    if (existingPhone) {
      throw new AppError('Ce numéro de téléphone est déjà utilisé', 400);
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: patient.userId },
        data: {
          name: `${prenom} ${nom}`.trim(),
          email,
        },
      }),
      prisma.patient.update({
        where: { id: patient.id },
        data: {
          prenom,
          nom,
          telephone,
        },
      }),
    ]);

    return this.findPatientByUserId(userId);
  }

  async createPatientTriageEvaluation(
    patientId: number,
    data: {
      responses: Record<string, string | string[]>;
      niveau: 'faible' | 'modere' | 'eleve';
      urgent: boolean;
      specialiteConseillee?: string;
      recommandations: string[];
    }
  ) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PatientTriageEvaluation" (
        "id" SERIAL PRIMARY KEY,
        "patientId" INTEGER NOT NULL REFERENCES "Patient"("id") ON DELETE CASCADE,
        "responses" JSONB NOT NULL,
        "niveau" TEXT NOT NULL,
        "urgent" BOOLEAN NOT NULL DEFAULT false,
        "specialiteConseillee" TEXT,
        "recommandations" JSONB NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "PatientTriageEvaluation_patientId_createdAt_idx"
      ON "PatientTriageEvaluation" ("patientId", "createdAt")
    `);

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: number;
        niveau: string;
        urgent: boolean;
        specialiteConseillee: string | null;
        recommandations: string[] | unknown;
        createdAt: Date;
      }>
    >(
      `
      INSERT INTO "PatientTriageEvaluation"
        ("patientId", "responses", "niveau", "urgent", "specialiteConseillee", "recommandations")
      VALUES
        ($1, $2::jsonb, $3, $4, $5, $6::jsonb)
      RETURNING "id", "niveau", "urgent", "specialiteConseillee", "recommandations", "createdAt"
      `,
      patientId,
      JSON.stringify(data.responses),
      data.niveau,
      data.urgent,
      data.specialiteConseillee || null,
      JSON.stringify(data.recommandations)
    );

    const created = rows[0];
    return {
      id: created.id,
      niveau: created.niveau,
      urgent: created.urgent,
      specialiteConseillee: created.specialiteConseillee,
      recommandations: Array.isArray(created.recommandations) ? created.recommandations : [],
      createdAt: created.createdAt,
    };
  }

  async getPatientTriageHistory(patientId: number, limit: number = 10) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PatientTriageEvaluation" (
        "id" SERIAL PRIMARY KEY,
        "patientId" INTEGER NOT NULL REFERENCES "Patient"("id") ON DELETE CASCADE,
        "responses" JSONB NOT NULL,
        "niveau" TEXT NOT NULL,
        "urgent" BOOLEAN NOT NULL DEFAULT false,
        "specialiteConseillee" TEXT,
        "recommandations" JSONB NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: number;
        niveau: string;
        urgent: boolean;
        specialiteConseillee: string | null;
        recommandations: string[] | unknown;
        createdAt: Date;
      }>
    >(
      `
      SELECT "id", "niveau", "urgent", "specialiteConseillee", "recommandations", "createdAt"
      FROM "PatientTriageEvaluation"
      WHERE "patientId" = $1
      ORDER BY "createdAt" DESC
      LIMIT $2
      `,
      patientId,
      limit
    );

    return rows.map((item) => ({
      id: item.id,
      niveau: item.niveau,
      urgent: item.urgent,
      specialiteConseillee: item.specialiteConseillee,
      recommandations: Array.isArray(item.recommandations) ? item.recommandations : [],
      createdAt: item.createdAt,
    }));
  }
}

export const patientRepository = new PatientRepository();
