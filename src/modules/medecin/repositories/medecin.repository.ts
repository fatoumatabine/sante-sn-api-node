import prisma from '../../../config/db';
import { Medecin } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../../../shared/utils/AppError';
import { readUserAvatarUrl, writeUserAvatarUrl } from '../../../shared/utils/user-avatar';

export interface PublicCatalogSlot {
  jour: number;
  heure: string;
}

export interface PublicCatalogDoctor {
  id: number;
  nom: string;
  prenom: string;
  nomComplet: string;
  specialite: string;
  tarifConsultation: number;
  activeSlotCount: number;
  consultationCount: number;
  nextAvailableSlot: PublicCatalogSlot | null;
}

export interface PublicCatalogService {
  slug: string;
  specialite: string;
  doctorCount: number;
  activeSlotCount: number;
  averageTarifConsultation: number;
  minTarifConsultation: number;
  maxTarifConsultation: number;
  sampleDoctors: string[];
  nextAvailableSlot: PublicCatalogSlot | null;
}

export interface PublicMedecinCatalog {
  doctors: PublicCatalogDoctor[];
  services: PublicCatalogService[];
  stats: {
    totalDoctors: number;
    totalSpecialities: number;
    totalActiveSlots: number;
    averageTarifConsultation: number;
  };
}

function toSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

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
    const medecin = await prisma.medecin.findFirst({
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

    if (!medecin) {
      return null;
    }

    return {
      ...medecin,
      user: {
        ...medecin.user,
        avatarUrl: await readUserAvatarUrl(prisma, medecin.userId),
      },
    } as Medecin;
  }

  async findByUserId(userId: number): Promise<Medecin | null> {
    const medecin = await prisma.medecin.findFirst({
      where: { userId, isArchived: false, user: { isArchived: false } },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!medecin) {
      return null;
    }

    return {
      ...medecin,
      user: {
        ...medecin.user,
        avatarUrl: await readUserAvatarUrl(prisma, medecin.userId),
      },
    } as Medecin;
  }

  async findBySpecialite(specialite: string): Promise<Medecin[]> {
    const medecins = await prisma.medecin.findMany({
      where: { specialite, isArchived: false, user: { isArchived: false } },
      include: { user: { select: { email: true } } },
    });

    return Promise.all(
      medecins.map(async (medecin) => ({
        ...medecin,
        user: {
          ...medecin.user,
          avatarUrl: await readUserAvatarUrl(prisma, medecin.userId),
        },
      }))
    ) as Promise<Medecin[]>;
  }

  async getSpecialites(): Promise<string[]> {
    const medecins = await prisma.medecin.findMany({
      where: { isArchived: false, user: { isArchived: false } },
      select: { specialite: true },
      distinct: ['specialite'],
    });
    return medecins.map(m => m.specialite);
  }

  async getPublicCatalog(): Promise<PublicMedecinCatalog> {
    const medecins = await prisma.medecin.findMany({
      where: { isArchived: false, user: { isArchived: false } },
      select: {
        id: true,
        nom: true,
        prenom: true,
        specialite: true,
        tarif_consultation: true,
        consultations: {
          where: { isArchived: false },
          select: { id: true },
        },
        creneaux: {
          where: { actif: true },
          select: { jour: true, heure: true },
          orderBy: [{ jour: 'asc' }, { heure: 'asc' }],
        },
      },
      orderBy: [{ specialite: 'asc' }, { prenom: 'asc' }, { nom: 'asc' }],
    });

    const doctors: PublicCatalogDoctor[] = medecins.map((medecin) => ({
      id: medecin.id,
      nom: medecin.nom,
      prenom: medecin.prenom,
      nomComplet: `${medecin.prenom} ${medecin.nom}`.trim(),
      specialite: medecin.specialite,
      tarifConsultation: medecin.tarif_consultation,
      activeSlotCount: medecin.creneaux.length,
      consultationCount: medecin.consultations.length,
      nextAvailableSlot: medecin.creneaux[0]
        ? {
            jour: medecin.creneaux[0].jour,
            heure: medecin.creneaux[0].heure,
          }
        : null,
    }));

    const serviceAccumulator = new Map<
      string,
      {
        specialite: string;
        doctorCount: number;
        activeSlotCount: number;
        totalTarifConsultation: number;
        minTarifConsultation: number;
        maxTarifConsultation: number;
        sampleDoctors: string[];
        nextAvailableSlot: PublicCatalogSlot | null;
      }
    >();

    for (const doctor of doctors) {
      const current = serviceAccumulator.get(doctor.specialite);

      if (!current) {
        serviceAccumulator.set(doctor.specialite, {
          specialite: doctor.specialite,
          doctorCount: 1,
          activeSlotCount: doctor.activeSlotCount,
          totalTarifConsultation: doctor.tarifConsultation,
          minTarifConsultation: doctor.tarifConsultation,
          maxTarifConsultation: doctor.tarifConsultation,
          sampleDoctors: [doctor.nomComplet],
          nextAvailableSlot: doctor.nextAvailableSlot,
        });
        continue;
      }

      current.doctorCount += 1;
      current.activeSlotCount += doctor.activeSlotCount;
      current.totalTarifConsultation += doctor.tarifConsultation;
      current.minTarifConsultation = Math.min(current.minTarifConsultation, doctor.tarifConsultation);
      current.maxTarifConsultation = Math.max(current.maxTarifConsultation, doctor.tarifConsultation);

      if (current.sampleDoctors.length < 3) {
        current.sampleDoctors.push(doctor.nomComplet);
      }

      if (
        doctor.nextAvailableSlot &&
        (!current.nextAvailableSlot ||
          doctor.nextAvailableSlot.jour < current.nextAvailableSlot.jour ||
          (doctor.nextAvailableSlot.jour === current.nextAvailableSlot.jour &&
            doctor.nextAvailableSlot.heure.localeCompare(current.nextAvailableSlot.heure) < 0))
      ) {
        current.nextAvailableSlot = doctor.nextAvailableSlot;
      }
    }

    const services: PublicCatalogService[] = Array.from(serviceAccumulator.values())
      .map((service) => ({
        slug: toSlug(service.specialite),
        specialite: service.specialite,
        doctorCount: service.doctorCount,
        activeSlotCount: service.activeSlotCount,
        averageTarifConsultation:
          service.doctorCount > 0
            ? Number((service.totalTarifConsultation / service.doctorCount).toFixed(2))
            : 0,
        minTarifConsultation: service.minTarifConsultation,
        maxTarifConsultation: service.maxTarifConsultation,
        sampleDoctors: service.sampleDoctors,
        nextAvailableSlot: service.nextAvailableSlot,
      }))
      .sort((a, b) => {
        if (b.doctorCount !== a.doctorCount) {
          return b.doctorCount - a.doctorCount;
        }
        return a.specialite.localeCompare(b.specialite, 'fr');
      });

    const totalTarifConsultation = doctors.reduce(
      (sum, doctor) => sum + doctor.tarifConsultation,
      0,
    );

    return {
      doctors,
      services,
      stats: {
        totalDoctors: doctors.length,
        totalSpecialities: services.length,
        totalActiveSlots: doctors.reduce((sum, doctor) => sum + doctor.activeSlotCount, 0),
        averageTarifConsultation:
          doctors.length > 0 ? Number((totalTarifConsultation / doctors.length).toFixed(2)) : 0,
      },
    };
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

  async update(
    id: number,
    data: Partial<Medecin> & { email?: string; avatarUrl?: string | null }
  ): Promise<any> {
    const existing = await prisma.medecin.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        prenom: true,
        nom: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundError('Médecin non trouvé');
    }

    const prenom = typeof data.prenom === 'string' && data.prenom.trim() ? data.prenom.trim() : existing.prenom;
    const nom = typeof data.nom === 'string' && data.nom.trim() ? data.nom.trim() : existing.nom;
    const email =
      typeof data.email === 'string' && data.email.trim()
        ? data.email.trim().toLowerCase()
        : existing.user.email;

    const existingEmail = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
        isArchived: false,
        NOT: { id: existing.userId },
      },
      select: { id: true },
    });

    if (existingEmail) {
      throw new BadRequestError('Cet email est déjà utilisé');
    }

    const { email: _ignoredEmail, avatarUrl, ...medecinData } = data;

    return prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existing.userId },
        data: {
          name: `${prenom} ${nom}`.trim(),
          email,
        },
      });

      if (avatarUrl !== undefined) {
        await writeUserAvatarUrl(tx, existing.userId, typeof avatarUrl === 'string' ? avatarUrl.trim() || null : null);
      }

      const updatedMedecin = await tx.medecin.update({
        where: { id },
        data: {
          ...medecinData,
          prenom,
          nom,
          specialite:
            typeof medecinData.specialite === 'string' ? medecinData.specialite.trim() : medecinData.specialite,
          telephone:
            typeof medecinData.telephone === 'string' ? medecinData.telephone.trim() : medecinData.telephone,
          adresse: typeof medecinData.adresse === 'string' ? medecinData.adresse.trim() : medecinData.adresse,
        },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });

      return {
        ...updatedMedecin,
        user: {
          ...updatedMedecin.user,
          avatarUrl: await readUserAvatarUrl(tx, existing.userId),
        },
      };
    });
  }

  async delete(id: number): Promise<void> {
    await prisma.medecin.delete({ where: { id } });
  }
}

export const medecinRepository = new MedecinRepository();
