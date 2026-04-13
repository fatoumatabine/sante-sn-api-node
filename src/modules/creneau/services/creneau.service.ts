import prisma from '../../../config/db';
import { AppError } from '../../../shared/utils/AppError';

export class CreneauService {
  async findAll() {
    return await prisma.creneauDisponible.findMany({
      where: { actif: true },
      include: {
        medecin: {
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
      },
      orderBy: [
        { jour: 'asc' },
        { heure: 'asc' },
      ],
    });
  }

  async findByMedecinId(medecinId: number, options?: { includeInactive?: boolean }) {
    const includeInactive = options?.includeInactive === true;

    return await prisma.creneauDisponible.findMany({
      where: includeInactive ? { medecinId } : { medecinId, actif: true },
      orderBy: [
        { jour: 'asc' },
        { heure: 'asc' },
      ],
    });
  }

  async findByMedecinIdAndDay(medecinId: number, jour: number) {
    return await prisma.creneauDisponible.findMany({
      where: {
        medecinId,
        jour,
        actif: true,
      },
      orderBy: {
        heure: 'asc',
      },
    });
  }

  async findById(id: number) {
    const creneau = await prisma.creneauDisponible.findUnique({
      where: { id },
      include: {
        medecin: true,
      },
    });

    if (!creneau) {
      throw new AppError('Créneau non trouvé', 404);
    }

    return creneau;
  }

  async create(data: {
    medecinId: number;
    jour: number;
    heure: string;
    actif?: boolean;
  }) {
    const { medecinId, jour, heure, actif = true } = data;

    // Vérifier que le médecin existe
    const medecin = await prisma.medecin.findUnique({
      where: { id: medecinId },
    });

    if (!medecin) {
      throw new AppError('Médecin non trouvé', 404);
    }

    // Vérifier si un créneau similaire existe déjà
    const existingCreneau = await prisma.creneauDisponible.findFirst({
      where: {
        medecinId,
        jour,
        heure,
      },
    });

    if (existingCreneau) {
      if (!existingCreneau.actif) {
        return await prisma.creneauDisponible.update({
          where: { id: existingCreneau.id },
          data: { actif: true },
          include: {
            medecin: true,
          },
        });
      }
      throw new AppError('Un créneau similaire existe déjà', 400);
    }

    return await prisma.creneauDisponible.create({
      data: {
        medecinId,
        jour,
        heure,
        actif,
      },
      include: {
        medecin: true,
      },
    });
  }

  async createMultiple(data: {
    medecinId: number;
    creneaux: Array<{
      jour: number;
      heure: string;
      actif?: boolean;
    }>;
  }) {
    const { medecinId, creneaux } = data;

    // Vérifier que le médecin existe
    const medecin = await prisma.medecin.findUnique({
      where: { id: medecinId },
    });

    if (!medecin) {
      throw new AppError('Médecin non trouvé', 404);
    }

    const createdCreneaux = [];

    for (const creneau of creneaux) {
      // Vérifier si un créneau similaire existe déjà
      const existingCreneau = await prisma.creneauDisponible.findFirst({
        where: {
          medecinId,
          jour: creneau.jour,
          heure: creneau.heure,
        },
      });

      if (!existingCreneau) {
        const created = await prisma.creneauDisponible.create({
          data: {
            medecinId,
            jour: creneau.jour,
            heure: creneau.heure,
            actif: creneau.actif !== false,
          },
        });
        createdCreneaux.push(created);
      } else if (!existingCreneau.actif) {
        const reactivated = await prisma.creneauDisponible.update({
          where: { id: existingCreneau.id },
          data: { actif: true },
        });
        createdCreneaux.push(reactivated);
      }
    }

    return createdCreneaux;
  }

  async update(
    id: number,
    data: {
      jour?: number;
      heure?: string;
      actif?: boolean;
    }
  ) {
    const creneau = await prisma.creneauDisponible.findUnique({
      where: { id },
    });

    if (!creneau) {
      throw new AppError('Créneau non trouvé', 404);
    }

    return await prisma.creneauDisponible.update({
      where: { id },
      data,
      include: {
        medecin: true,
      },
    });
  }

  async toggleActive(id: number) {
    const creneau = await prisma.creneauDisponible.findUnique({
      where: { id },
    });

    if (!creneau) {
      throw new AppError('Créneau non trouvé', 404);
    }

    return await prisma.creneauDisponible.update({
      where: { id },
      data: {
        actif: !creneau.actif,
      },
      include: {
        medecin: true,
      },
    });
  }

  async delete(id: number) {
    const creneau = await prisma.creneauDisponible.findUnique({
      where: { id },
    });

    if (!creneau) {
      throw new AppError('Créneau non trouvé', 404);
    }

    return await prisma.creneauDisponible.update({
      where: { id },
      data: { actif: false },
    });
  }

  async deleteAllByMedecinId(medecinId: number) {
    return await prisma.creneauDisponible.updateMany({
      where: { medecinId, actif: true },
      data: { actif: false },
    });
  }
}
