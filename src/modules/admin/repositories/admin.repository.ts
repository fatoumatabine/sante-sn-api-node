import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AdminRepository {
  async getAllMedecins() {
    return prisma.medecin.findMany({
      where: { isArchived: false, user: { isArchived: false } },
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

  async getAllSecretaires() {
    return prisma.secretaire.findMany({
      where: { isArchived: false, user: { isArchived: false } },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true
          }
        },
        medecin: {
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });
  }

  async getAllPatients() {
    return prisma.patient.findMany({
      where: { isArchived: false, user: { isArchived: false } },
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

  async getStats() {
    const totalPatients = await prisma.patient.count({ where: { isArchived: false } });
    const totalMedecins = await prisma.medecin.count({ where: { isArchived: false } });
    const totalSecretaires = await prisma.secretaire.count({ where: { isArchived: false } });
    const totalRendezVous = await prisma.rendezVous.count();
    const totalConsultations = await prisma.consultation.count();

    return {
      totalPatients,
      totalMedecins,
      totalSecretaires,
      totalRendezVous,
      totalConsultations
    };
  }
}

export const adminRepository = new AdminRepository();
