import prisma from '../../../config/db';
import { Medecin } from '@prisma/client';

export class MedecinRepository {
  async findAll(options?: {
    page?: number;
    limit?: number;
    specialite?: string;
  }): Promise<{ data: Medecin[]; total: number }> {
    const { page = 1, limit = 15, specialite } = options || {};
    
    const where: any = {};
    if (specialite) where.specialite = specialite;
    where.isArchived = false;
    where.user = { isArchived: false };

    const [data, total] = await Promise.all([
      prisma.medecin.findMany({
        where,
        include: { user: { select: { email: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.medecin.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: number): Promise<Medecin | null> {
    return prisma.medecin.findFirst({
      where: { id, isArchived: false, user: { isArchived: false } },
      include: { 
        user: { select: { email: true } },
        creneaux: true,
        secretaires: {
          include: {
            user: { select: { email: true, name: true } }
          }
        },
      },
    });
  }

  async findByUserId(userId: number): Promise<Medecin | null> {
    return prisma.medecin.findFirst({
      where: { userId, isArchived: false, user: { isArchived: false } },
    });
  }

  async findBySpecialite(specialite: string): Promise<Medecin[]> {
    return prisma.medecin.findMany({
      where: { specialite, isArchived: false, user: { isArchived: false } },
      include: { user: { select: { email: true } } },
    });
  }

  async getSpecialites(): Promise<string[]> {
    const medecins = await prisma.medecin.findMany({
      where: { isArchived: false, user: { isArchived: false } },
      select: { specialite: true },
      distinct: ['specialite'],
    });
    return medecins.map(m => m.specialite);
  }

  async create(data: {
    userId: number;
    nom: string;
    prenom: string;
    specialite: string;
    telephone: string;
    adresse?: string;
    tarif_consultation?: number;
  }): Promise<Medecin> {
    return prisma.medecin.create({ data });
  }

  async update(id: number, data: Partial<Medecin>): Promise<Medecin> {
    return prisma.medecin.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<void> {
    await prisma.medecin.delete({ where: { id } });
  }
}

export const medecinRepository = new MedecinRepository();
