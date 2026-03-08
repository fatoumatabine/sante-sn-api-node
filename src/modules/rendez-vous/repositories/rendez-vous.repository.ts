import prisma from '../../../config/db';
import { RendezVous, StatutRendezVous, TypeRendezVous } from '@prisma/client';

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
} as const;

const PATIENT_WITH_SAFE_USER = {
  include: {
    user: {
      select: SAFE_USER_SELECT,
    },
  },
} as const;

const MEDECIN_WITH_SAFE_USER = {
  include: {
    user: {
      select: SAFE_USER_SELECT,
    },
  },
} as const;

export class RendezVousRepository {
  async create(data: {
    patientId: number;
    medecinId: number;
    date: Date;
    heure: string;
    type: string;
    motif?: string;
    prestation_type?: string;
    urgent_ia?: boolean;
  }): Promise<RendezVous> {
    const numero = `RDV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Convertir le type string en enum
    const typeValide = data.type as TypeRendezVous;
    const createData: any = {
      numero,
      patientId: data.patientId,
      medecinId: data.medecinId,
      date: data.date,
      heure: data.heure,
      type: typeValide,
      urgent_ia: Boolean(data.urgent_ia),
      motif: data.motif,
      prestation_type: data.prestation_type,
      statut: StatutRendezVous.en_attente,
    };
    
    return prisma.rendezVous.create({
      data: createData,
      include: {
        patient: PATIENT_WITH_SAFE_USER,
        medecin: MEDECIN_WITH_SAFE_USER,
      },
    });
  }

  async findById(id: number): Promise<RendezVous | null> {
    return prisma.rendezVous.findUnique({
      where: { id },
      include: {
        patient: PATIENT_WITH_SAFE_USER,
        medecin: MEDECIN_WITH_SAFE_USER,
        consultation: true,
        paiement: true,
      },
    });
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    statut?: StatutRendezVous;
    patientId?: number;
    medecinId?: number;
  }): Promise<{ data: RendezVous[]; total: number }> {
    const { page = 1, limit = 15, statut, patientId, medecinId } = options || {};
    
    const where: any = {};
    if (statut) where.statut = statut;
    if (patientId) where.patientId = patientId;
    if (medecinId) where.medecinId = medecinId;

    const [data, total] = await Promise.all([
      prisma.rendezVous.findMany({
        where,
        include: {
          patient: PATIENT_WITH_SAFE_USER,
          medecin: MEDECIN_WITH_SAFE_USER,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ date: 'asc' }, { heure: 'asc' }],
      }),
      prisma.rendezVous.count({ where }),
    ]);

    return { data, total };
  }

  async findByPatient(patientId: number): Promise<RendezVous[]> {
    return prisma.rendezVous.findMany({
      where: { patientId },
      include: { medecin: MEDECIN_WITH_SAFE_USER, consultation: true },
      orderBy: [{ date: 'desc' }, { heure: 'desc' }],
    });
  }

  async findByMedecin(medecinId: number): Promise<RendezVous[]> {
    return prisma.rendezVous.findMany({
      where: { medecinId },
      include: {
        patient: PATIENT_WITH_SAFE_USER,
        consultation: true,
      },
      orderBy: [{ date: 'asc' }, { heure: 'asc' }],
    });
  }

  async findAVenir(patientId?: number, medecinId?: number): Promise<RendezVous[]> {
    const where: any = {
      date: { gte: new Date() },
      statut: { not: StatutRendezVous.annule },
    };
    
    if (patientId) where.patientId = patientId;
    if (medecinId) where.medecinId = medecinId;

    return prisma.rendezVous.findMany({
      where,
      include: {
        patient: PATIENT_WITH_SAFE_USER,
        medecin: MEDECIN_WITH_SAFE_USER,
      },
      orderBy: [{ date: 'asc' }, { heure: 'asc' }],
    });
  }

  async findByDate(medecinId: number, date: Date): Promise<RendezVous[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.rendezVous.findMany({
      where: {
        medecinId,
        date: { gte: startOfDay, lte: endOfDay },
        statut: { not: StatutRendezVous.annule },
      },
      orderBy: { heure: 'asc' },
    });
  }

  async update(id: number, data: Partial<RendezVous>): Promise<RendezVous> {
    return prisma.rendezVous.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<void> {
    await prisma.rendezVous.delete({ where: { id } });
  }

  async getStatsParType(): Promise<any> {
    return prisma.rendezVous.groupBy({
      by: ['type', 'statut'],
      _count: true,
    });
  }
}

export const rendezVousRepository = new RendezVousRepository();
