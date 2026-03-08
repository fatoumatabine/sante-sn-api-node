import prisma from '../../../config/db';
import { AppError } from '../../../shared/utils/AppError';
import { buildSimplePdf } from '../../../shared/utils/simplePdf';
import { Prisma } from '@prisma/client';

type OrdonnanceActor = {
  role: string;
  patientId?: number;
  medecinId?: number;
  secretaireId?: number;
};

export class OrdonnanceService {
  private async getSecretaireAssignedMedecinId(actor: OrdonnanceActor) {
    if (actor.role !== 'secretaire') return undefined;
    if (!actor.secretaireId) {
      throw new AppError('Accès interdit à cette ordonnance', 403);
    }

    const secretaire = await prisma.secretaire.findFirst({
      where: { id: actor.secretaireId, isArchived: false },
      select: { medecinId: true },
    });

    if (!secretaire?.medecinId) {
      throw new AppError('Accès interdit à cette ordonnance', 403);
    }

    return secretaire.medecinId;
  }

  private async buildWhereByActor(actor?: OrdonnanceActor): Promise<Prisma.OrdonnanceWhereInput> {
    const where: Prisma.OrdonnanceWhereInput = { isArchived: false };

    if (!actor || actor.role === 'admin') {
      return where;
    }

    if (actor.role === 'patient') {
      if (!actor.patientId) {
        throw new AppError('Accès interdit à cette ordonnance', 403);
      }
      where.patientId = actor.patientId;
      return where;
    }

    if (actor.role === 'medecin') {
      if (!actor.medecinId) {
        throw new AppError('Accès interdit à cette ordonnance', 403);
      }
      where.medecinId = actor.medecinId;
      return where;
    }

    if (actor.role === 'secretaire') {
      where.medecinId = await this.getSecretaireAssignedMedecinId(actor);
      return where;
    }

    throw new AppError('Accès interdit à cette ordonnance', 403);
  }

  private async assertReadAccess(ordonnance: { patientId: number; medecinId: number }, actor: OrdonnanceActor) {
    if (actor.role === 'admin') return;

    if (actor.role === 'patient') {
      if (actor.patientId !== ordonnance.patientId) {
        throw new AppError('Accès interdit à cette ordonnance', 403);
      }
      return;
    }

    if (actor.role === 'medecin') {
      if (actor.medecinId !== ordonnance.medecinId) {
        throw new AppError('Accès interdit à cette ordonnance', 403);
      }
      return;
    }

    if (actor.role === 'secretaire') {
      const medecinId = await this.getSecretaireAssignedMedecinId(actor);
      if (medecinId !== ordonnance.medecinId) {
        throw new AppError('Accès interdit à cette ordonnance', 403);
      }
      return;
    }

    throw new AppError('Accès interdit à cette ordonnance', 403);
  }

  private async assertWriteAccess(medecinId: number, actor?: OrdonnanceActor) {
    if (!actor || actor.role === 'admin') return;

    if (actor.role === 'medecin') {
      if (actor.medecinId !== medecinId) {
        throw new AppError('Accès interdit à cette ordonnance', 403);
      }
      return;
    }

    if (actor.role === 'secretaire') {
      const assignedMedecinId = await this.getSecretaireAssignedMedecinId(actor);
      if (assignedMedecinId !== medecinId) {
        throw new AppError('Accès interdit à cette ordonnance', 403);
      }
      return;
    }

    throw new AppError('Accès interdit à cette ordonnance', 403);
  }

  async generateOrdonnancePdf(
    ordonnanceId: number,
    actor: OrdonnanceActor
  ) {
    const accessProbe = await prisma.ordonnance.findFirst({
      where: { id: ordonnanceId, isArchived: false },
      select: { patientId: true, medecinId: true },
    });

    if (!accessProbe) {
      throw new AppError('Ordonnance non trouvée', 404);
    }
    await this.assertReadAccess(accessProbe, actor);

    const ordonnance = await prisma.ordonnance.findFirst({
      where: { id: ordonnanceId, isArchived: false },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
        medecin: {
          include: {
            user: true,
          },
        },
        consultation: true,
        medicaments: {
          include: {
            medicament: true,
          },
        },
      },
    });

    if (!ordonnance) {
      throw new AppError('Ordonnance non trouvée', 404);
    }

    const medecinName = ordonnance.medecin.user?.name || `${ordonnance.medecin.prenom} ${ordonnance.medecin.nom}`;
    const patientName = ordonnance.patient.user?.name || `${ordonnance.patient.prenom} ${ordonnance.patient.nom}`;
    const ordonnanceNo = `ORD-${ordonnance.id}-${new Date(ordonnance.date_creation).toISOString().slice(0, 10).replace(/-/g, '')}`;

    const medLines = ordonnance.medicaments.length
      ? ordonnance.medicaments.map(
          (m, idx) =>
            `${idx + 1}. ${m.medicament.nom} - ${m.posologie} - ${m.duree} - Qté: ${m.quantite}`
        )
      : ['Aucun medicament renseigne'];

    const lines = [
      `Numero ordonnance: ${ordonnanceNo}`,
      `Date emission: ${new Date(ordonnance.date_creation).toLocaleDateString('fr-FR')}`,
      '',
      `Patient: ${patientName}`,
      `Email patient: ${ordonnance.patient.user?.email || 'N/A'}`,
      `Medecin: ${medecinName}`,
      `Specialite: ${ordonnance.medecin.specialite}`,
      '',
      `Contenu/Instructions: ${ordonnance.contenu || 'N/A'}`,
      '',
      'Medicaments:',
      ...medLines,
      '',
      'Document medical confidentiel - Sante SN.',
    ];

    const buffer = buildSimplePdf('Ordonnance Medicale - Sante SN', lines);
    return {
      buffer,
      filename: `${ordonnanceNo}.pdf`,
    };
  }

  async findAll(actor?: OrdonnanceActor) {
    const where = await this.buildWhereByActor(actor);
    return await prisma.ordonnance.findMany({
      where,
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
        consultation: true,
        medicaments: {
          include: {
            medicament: true,
          },
        },
      },
      orderBy: {
        date_creation: 'desc',
      },
    });
  }

  async findById(id: number, actor?: OrdonnanceActor) {
    const where = await this.buildWhereByActor(actor);
    const ordonnance = await prisma.ordonnance.findFirst({
      where: { ...where, id },
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
        consultation: true,
        medicaments: {
          include: {
            medicament: true,
          },
        },
      },
    });

    if (!ordonnance) {
      throw new AppError('Ordonnance non trouvée', 404);
    }

    return ordonnance;
  }

  async findByConsultationId(consultationId: number, actor?: OrdonnanceActor) {
    const where = await this.buildWhereByActor(actor);
    return await prisma.ordonnance.findFirst({
      where: { ...where, consultationId },
      include: {
        patient: true,
        medecin: true,
        consultation: true,
        medicaments: {
          include: {
            medicament: true,
          },
        },
      },
    });
  }

  async findByPatientId(patientId: number, actor?: OrdonnanceActor) {
    const where = await this.buildWhereByActor(actor);
    return await prisma.ordonnance.findMany({
      where: { ...where, patientId },
      include: {
        patient: true,
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
        consultation: true,
        medicaments: {
          include: {
            medicament: true,
          },
        },
      },
      orderBy: {
        date_creation: 'desc',
      },
    });
  }

  async create(data: {
    consultationId: number;
    patientId?: number;
    medecinId?: number;
    contenu: string;
    medicaments?: Array<{
      medicamentId: number;
      posologie: string;
      duree: string;
      quantite?: number;
    }>;
  }, actor?: OrdonnanceActor) {
    const { consultationId, patientId, medecinId, contenu, medicaments } = data;

    if (!actor || actor.role !== 'medecin') {
      throw new AppError('Seul un médecin peut générer une ordonnance', 403);
    }

    // Vérifier que la consultation existe
    const consultation = await prisma.consultation.findFirst({
      where: { id: consultationId, isArchived: false },
      select: { id: true, patientId: true, medecinId: true },
    });

    if (!consultation) {
      throw new AppError('Consultation non trouvée', 404);
    }

    const resolvedPatientId = patientId ?? consultation.patientId;
    const resolvedMedecinId = medecinId ?? consultation.medecinId;

    if (resolvedPatientId !== consultation.patientId) {
      throw new AppError('Le patient ne correspond pas à la consultation', 400);
    }
    if (resolvedMedecinId !== consultation.medecinId) {
      throw new AppError('Le médecin ne correspond pas à la consultation', 400);
    }
    await this.assertWriteAccess(resolvedMedecinId, actor);

    // Vérifier si une ordonnance existe déjà pour cette consultation
    const existingOrdonnance = await prisma.ordonnance.findFirst({
      where: { consultationId, isArchived: false },
    });

    if (existingOrdonnance) {
      throw new AppError('Une ordonnance existe déjà pour cette consultation', 400);
    }

    // Créer l'ordonnance avec les médicaments
    const ordonnance = await prisma.ordonnance.create({
      data: {
        consultationId,
        patientId: resolvedPatientId,
        medecinId: resolvedMedecinId,
        contenu,
        medicaments: medicaments
          ? {
              create: medicaments.map((med) => ({
                medicamentId: med.medicamentId,
                posologie: med.posologie,
                duree: med.duree,
                quantite: med.quantite || 1,
              })),
            }
          : undefined,
      },
      include: {
        patient: true,
        medecin: true,
        medicaments: {
          include: {
            medicament: true,
          },
        },
      },
    });

    return ordonnance;
  }

  async update(id: number, data: { contenu?: string }, actor?: OrdonnanceActor) {
    const ordonnance = await prisma.ordonnance.findFirst({
      where: { id, isArchived: false },
    });

    if (!ordonnance) {
      throw new AppError('Ordonnance non trouvée', 404);
    }
    await this.assertWriteAccess(ordonnance.medecinId, actor);

    return await prisma.ordonnance.update({
      where: { id },
      data: {
        contenu: data.contenu,
      },
      include: {
        patient: true,
        medecin: true,
        medicaments: {
          include: {
            medicament: true,
          },
        },
      },
    });
  }

  async addMedicaments(
    ordonnanceId: number,
    medicaments: Array<{
      medicamentId: number;
      posologie: string;
      duree: string;
      quantite?: number;
    }>
  ) {
    const ordonnance = await prisma.ordonnance.findFirst({
      where: { id: ordonnanceId, isArchived: false },
    });

    if (!ordonnance) {
      throw new AppError('Ordonnance non trouvée', 404);
    }

    return await prisma.medicamentOnOrdonnance.createMany({
      data: medicaments.map((med) => ({
        ordonnanceId,
        medicamentId: med.medicamentId,
        posologie: med.posologie,
        duree: med.duree,
        quantite: med.quantite || 1,
      })),
    });
  }

  async removeMedicament(ordonnanceId: number, medicamentId: number) {
    return await prisma.medicamentOnOrdonnance.delete({
      where: {
        ordonnanceId_medicamentId: {
          ordonnanceId,
          medicamentId,
        },
      },
    });
  }

  async delete(id: number, actor?: OrdonnanceActor) {
    const ordonnance = await prisma.ordonnance.findFirst({
      where: { id, isArchived: false },
    });

    if (!ordonnance) {
      throw new AppError('Ordonnance non trouvée', 404);
    }
    await this.assertWriteAccess(ordonnance.medecinId, actor);

    return await prisma.ordonnance.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });
  }
}
