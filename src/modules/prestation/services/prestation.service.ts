import prisma from '../../../config/db';
import { AppError } from '../../../shared/utils/AppError';

export class PrestationService {
  async findAll() {
    return await prisma.prestation.findMany({
      where: { isArchived: false },
      include: {
        patient: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        consultation: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: number) {
    const prestation = await prisma.prestation.findFirst({
      where: { id, isArchived: false },
      include: {
        patient: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        consultation: true,
      },
    });

    if (!prestation) {
      throw new AppError('Prestation non trouvée', 404);
    }

    return prestation;
  }

  async findByPatientId(patientId: number) {
    return await prisma.prestation.findMany({
      where: { patientId, isArchived: false },
      include: {
        patient: true,
        consultation: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByConsultationId(consultationId: number) {
    return await prisma.prestation.findMany({
      where: { consultationId, isArchived: false },
      include: {
        patient: true,
        consultation: true,
      },
    });
  }

  async create(data: {
    patientId: number;
    consultationId?: number;
    type: string;
    resultat?: string;
    date_realisation?: Date | string;
  }) {
    const { patientId, consultationId, type, resultat, date_realisation } = data;

    // Vérifier que le patient existe
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, isArchived: false },
    });

    if (!patient) {
      throw new AppError('Patient non trouvé', 404);
    }

    // Si une consultation est fournie, vérifier qu'elle existe
    if (consultationId) {
      const consultation = await prisma.consultation.findFirst({
        where: { id: consultationId, isArchived: false },
      });

      if (!consultation) {
        throw new AppError('Consultation non trouvée', 404);
      }
    }

    return await prisma.prestation.create({
      data: {
        patientId,
        consultationId,
        type,
        resultat,
        date_realisation: date_realisation ? new Date(date_realisation) : null,
        statut: 'en_attente',
      },
      include: {
        patient: true,
        consultation: true,
      },
    });
  }

  async update(
    id: number,
    data: {
      type?: string;
      statut?: string;
      resultat?: string;
      date_realisation?: Date | string;
    }
  ) {
    const prestation = await prisma.prestation.findFirst({
      where: { id, isArchived: false },
    });

    if (!prestation) {
      throw new AppError('Prestation non trouvée', 404);
    }

    const updateData: any = { ...data };

    if (data.date_realisation) {
      updateData.date_realisation = new Date(data.date_realisation);
    }

    return await prisma.prestation.update({
      where: { id },
      data: updateData,
      include: {
        patient: true,
        consultation: true,
      },
    });
  }

  async delete(id: number) {
    const prestation = await prisma.prestation.findFirst({
      where: { id, isArchived: false },
    });

    if (!prestation) {
      throw new AppError('Prestation non trouvée', 404);
    }

    return await prisma.prestation.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });
  }
}
