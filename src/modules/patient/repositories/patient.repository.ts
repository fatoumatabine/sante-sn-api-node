import prisma from '../../../config/db';
import { AppError } from '../../../shared/utils/AppError';
import { readUserAvatarUrl, writeUserAvatarUrl } from '../../../shared/utils/user-avatar';

type TriageLevel = 'faible' | 'modere' | 'eleve';
type TriageOrientation = 'auto_soin' | 'rendez_vous' | 'urgence' | 'revue_humaine';

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

const mapPatientTriageEvaluation = (item: {
  id: number;
  niveau: string;
  urgent: boolean;
  specialiteConseillee: string | null;
  recommandations: unknown;
  redFlags: unknown;
  needsHumanReview: boolean;
  orientation: string;
  aiModel: string | null;
  createdAt: Date;
}) => ({
  id: item.id,
  niveau: item.niveau,
  urgent: item.urgent,
  specialiteConseillee: item.specialiteConseillee,
  recommandations: toStringArray(item.recommandations),
  redFlags: toStringArray(item.redFlags),
  needsHumanReview: item.needsHumanReview,
  orientation: item.orientation,
  aiModel: item.aiModel,
  createdAt: item.createdAt,
});

export class PatientRepository {
  async findPatientByUserId(userId: number) {
    const patient = await prisma.patient.findFirst({
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

    if (!patient) {
      return null;
    }

    return {
      ...patient,
      user: {
        ...patient.user,
        avatarUrl: await readUserAvatarUrl(prisma, patient.userId),
      },
    };
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

  async getPatientMedicalRecord(patientId: number) {
    const [patient, consultationsCount, ordonnancesCount, upcomingAppointmentsCount, triageCount, recentConsultations] =
      await Promise.all([
        prisma.patient.findFirst({
          where: { id: patientId, isArchived: false, user: { isArchived: false } },
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        }),
        prisma.consultation.count({
          where: { patientId, isArchived: false },
        }),
        prisma.ordonnance.count({
          where: { patientId, isArchived: false },
        }),
        prisma.rendezVous.count({
          where: {
            patientId,
            date: { gte: new Date() },
            statut: { in: ['en_attente', 'confirme', 'paye'] },
          },
        }),
        prisma.patientTriageEvaluation.count({
          where: { patientId },
        }),
        prisma.consultation.findMany({
          where: { patientId, isArchived: false },
          include: {
            medecin: {
              select: {
                prenom: true,
                nom: true,
                specialite: true,
              },
            },
            ordonnance: {
              select: {
                id: true,
              },
            },
          },
          orderBy: { date: 'desc' },
          take: 5,
        }),
      ]);

    if (!patient) {
      throw new AppError('Patient non trouvé', 404);
    }

    return {
      patient: {
        id: patient.id,
        prenom: patient.prenom,
        nom: patient.nom,
        email: patient.user.email,
        telephone: patient.telephone,
        adresse: patient.adresse,
        dateNaissance: patient.date_naissance,
        groupeSanguin: patient.groupe_sanguin,
        diabete: patient.diabete,
        hypertension: patient.hypertension,
        hepatite: patient.hepatite,
        autresPathologies: patient.autres_pathologies,
      },
      summary: {
        consultationsCount,
        ordonnancesCount,
        upcomingAppointmentsCount,
        triageCount,
        lastConsultationAt: recentConsultations[0]?.date || null,
      },
      recentConsultations: recentConsultations.map((consultation) => ({
        id: consultation.id,
        date: consultation.date,
        diagnostic: consultation.diagnostic,
        notes: consultation.observations,
        ordonnanceId: consultation.ordonnance?.id || null,
        medecin: consultation.medecin
          ? {
              prenom: consultation.medecin.prenom,
              nom: consultation.medecin.nom,
              specialite: consultation.medecin.specialite,
            }
          : null,
      })),
    };
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
      avatarUrl?: string | null;
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

    if (data.avatarUrl !== undefined) {
      await writeUserAvatarUrl(
        prisma,
        patient.userId,
        typeof data.avatarUrl === 'string' ? data.avatarUrl.trim() || null : null
      );
    }

    return this.findPatientByUserId(userId);
  }

  async createPatientTriageEvaluation(
    patientId: number,
    data: {
      responses: Record<string, string | string[]>;
      niveau: TriageLevel;
      urgent: boolean;
      specialiteConseillee?: string;
      recommandations: string[];
      redFlags: string[];
      needsHumanReview: boolean;
      orientation: TriageOrientation;
      aiModel?: string;
    }
  ) {
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: number;
        niveau: string;
        urgent: boolean;
        specialiteConseillee: string | null;
        recommandations: unknown;
        redFlags: unknown;
        needsHumanReview: boolean;
        orientation: string;
        aiModel: string | null;
        createdAt: Date;
      }>
    >(
      `
      INSERT INTO "PatientTriageEvaluation"
        (
          "patientId",
          "responses",
          "niveau",
          "urgent",
          "specialiteConseillee",
          "recommandations",
          "redFlags",
          "needsHumanReview",
          "orientation",
          "aiModel"
        )
      VALUES
        ($1, $2::jsonb, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10)
      RETURNING
        "id",
        "niveau",
        "urgent",
        "specialiteConseillee",
        "recommandations",
        "redFlags",
        "needsHumanReview",
        "orientation",
        "aiModel",
        "createdAt"
      `,
      patientId,
      JSON.stringify(data.responses),
      data.niveau,
      data.urgent,
      data.specialiteConseillee?.trim() || null,
      JSON.stringify(data.recommandations),
      JSON.stringify(data.redFlags),
      data.needsHumanReview,
      data.orientation,
      data.aiModel?.trim() || null
    );

    return mapPatientTriageEvaluation(rows[0]);
  }

  async getPatientTriageHistory(patientId: number, limit: number = 10) {
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: number;
        niveau: string;
        urgent: boolean;
        specialiteConseillee: string | null;
        recommandations: unknown;
        redFlags: unknown;
        needsHumanReview: boolean;
        orientation: string;
        aiModel: string | null;
        createdAt: Date;
      }>
    >(
      `
      SELECT
        "id",
        "niveau",
        "urgent",
        "specialiteConseillee",
        "recommandations",
        "redFlags",
        "needsHumanReview",
        "orientation",
        "aiModel",
        "createdAt"
      FROM "PatientTriageEvaluation"
      WHERE "patientId" = $1
      ORDER BY "createdAt" DESC
      LIMIT $2
      `,
      patientId,
      limit
    );

    return rows.map(mapPatientTriageEvaluation);
  }

  async listActiveSpecialites(): Promise<string[]> {
    const medecins = await prisma.medecin.findMany({
      where: {
        isArchived: false,
        user: {
          isArchived: false,
        },
      },
      select: {
        specialite: true,
      },
      distinct: ['specialite'],
      orderBy: {
        specialite: 'asc',
      },
    });

    return medecins
      .map((medecin) => medecin.specialite.trim())
      .filter((specialite) => specialite.length > 0);
  }
}

export const patientRepository = new PatientRepository();
