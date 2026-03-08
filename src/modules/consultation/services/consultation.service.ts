import prisma from '../../../config/db';
import { Prisma } from '@prisma/client';
import { AppError } from '../../../shared/utils/AppError';

export class ConsultationService {
  private buildVideoSession(consultationId: number) {
    const base = process.env.VIDEO_CALL_BASE_URL || 'https://meet.jit.si';
    const room = `sante-sn-consult-${consultationId}`;
    return {
      room,
      joinUrl: `${base.replace(/\/$/, '')}/${room}`,
    };
  }

  private async assertVideoAccess(
    consultation: { patientId: number; medecinId: number },
    actor: { role: string; patientId?: number; medecinId?: number; secretaireId?: number }
  ) {
    if (actor.role === 'admin') return;

    if (actor.role === 'patient' && actor.patientId !== consultation.patientId) {
      throw new AppError('Accès interdit à cette consultation', 403);
    }
    if (actor.role === 'patient') return;

    if (actor.role === 'medecin' && actor.medecinId !== consultation.medecinId) {
      throw new AppError('Accès interdit à cette consultation', 403);
    }
    if (actor.role === 'medecin') return;

    if (actor.role === 'secretaire') {
      if (!actor.secretaireId) {
        throw new AppError('Accès interdit à cette consultation', 403);
      }
      const secretaire = await prisma.secretaire.findFirst({
        where: { id: actor.secretaireId, isArchived: false },
        select: { medecinId: true },
      });
      if (!secretaire?.medecinId || secretaire.medecinId !== consultation.medecinId) {
        throw new AppError('Accès interdit à cette consultation', 403);
      }
      return;
    }

    throw new AppError('Accès interdit à cette consultation', 403);
  }

  async startVideoSession(consultationId: number, actor: { role: string; patientId?: number; medecinId?: number; secretaireId?: number }) {
    const consultation = await prisma.consultation.findFirst({
      where: { id: consultationId, isArchived: false },
      include: { rendezVous: true },
    });

    if (!consultation) {
      throw new AppError('Consultation non trouvée', 404);
    }

    await this.assertVideoAccess(consultation, actor);

    if (!['medecin', 'admin'].includes(actor.role)) {
      throw new AppError('Seul le médecin peut démarrer l\'appel vidéo', 403);
    }

    if (consultation.statut === 'en_attente') {
      await prisma.consultation.update({
        where: { id: consultation.id },
        data: { statut: 'en_cours' },
      });
    }

    if (consultation.statut !== 'en_cours' && consultation.statut !== 'termine') {
      throw new AppError('Consultation non éligible à un appel vidéo', 400);
    }

    return this.buildVideoSession(consultation.id);
  }

  async getVideoSession(consultationId: number, actor: { role: string; patientId?: number; medecinId?: number; secretaireId?: number }) {
    const consultation = await prisma.consultation.findFirst({
      where: { id: consultationId, isArchived: false },
      include: { rendezVous: true },
    });

    if (!consultation) {
      throw new AppError('Consultation non trouvée', 404);
    }

    await this.assertVideoAccess(consultation, actor);

    if (consultation.statut !== 'en_cours') {
      throw new AppError('L\'appel vidéo n\'est pas encore disponible', 400);
    }

    return this.buildVideoSession(consultation.id);
  }

  async pingVideoPresence(consultationId: number, actor: { id?: number; role: string; patientId?: number; medecinId?: number; secretaireId?: number }) {
    if (!actor.id) {
      throw new AppError('Utilisateur non identifié', 401);
    }
    if (!['patient', 'medecin'].includes(actor.role)) {
      throw new AppError('Rôle non autorisé pour la présence vidéo', 403);
    }

    const consultation = await prisma.consultation.findFirst({
      where: { id: consultationId, isArchived: false },
    });
    if (!consultation) {
      throw new AppError('Consultation non trouvée', 404);
    }

    await this.assertVideoAccess(consultation, actor);

    try {
      await prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO "ConsultationPresence" ("consultationId", "role", "userId", "lastSeenAt", "updatedAt")
          VALUES (
            ${consultationId},
            CAST(${actor.role} AS "Role"),
            ${actor.id},
            NOW(),
            NOW()
          )
          ON CONFLICT ("consultationId", "role")
          DO UPDATE SET
            "userId" = EXCLUDED."userId",
            "lastSeenAt" = NOW(),
            "updatedAt" = NOW()
        `
      );
    } catch (error) {
      console.warn('[Presence] Impossible d\'écrire la présence (migration manquante ?):', error);
    }

    return { ok: true };
  }

  async getVideoPresence(consultationId: number, actor: { role: string; patientId?: number; medecinId?: number; secretaireId?: number }) {
    const consultation = await prisma.consultation.findFirst({
      where: { id: consultationId, isArchived: false },
    });
    if (!consultation) {
      throw new AppError('Consultation non trouvée', 404);
    }

    await this.assertVideoAccess(consultation, actor);

    const timeoutSeconds = Number(process.env.VIDEO_PRESENCE_TIMEOUT_SECONDS || '30');
    const cutoff = Date.now() - timeoutSeconds * 1000;

    let patientLastSeenAt: Date | null = null;
    let medecinLastSeenAt: Date | null = null;

    try {
      const rows = await prisma.$queryRaw<Array<{ role: string; lastSeenAt: Date }>>(
        Prisma.sql`
          SELECT "role", "lastSeenAt"
          FROM "ConsultationPresence"
          WHERE "consultationId" = ${consultationId}
            AND "role" IN (CAST('patient' AS "Role"), CAST('medecin' AS "Role"))
        `
      );

      patientLastSeenAt = rows.find((p) => p.role === 'patient')?.lastSeenAt || null;
      medecinLastSeenAt = rows.find((p) => p.role === 'medecin')?.lastSeenAt || null;
    } catch (error) {
      console.warn('[Presence] Impossible de lire la présence (migration manquante ?):', error);
    }

    const patientOnline = !!patientLastSeenAt && new Date(patientLastSeenAt).getTime() >= cutoff;
    const medecinOnline = !!medecinLastSeenAt && new Date(medecinLastSeenAt).getTime() >= cutoff;

    return {
      timeoutSeconds,
      patientOnline,
      medecinOnline,
      patientLastSeenAt,
      medecinLastSeenAt,
    };
  }

  async startFromRendezVous(rendezVousId: number, actor: { role: string; medecinId?: number }) {
    const rdv = await prisma.rendezVous.findUnique({
      where: { id: rendezVousId },
      include: { consultation: true },
    });

    if (!rdv) {
      throw new AppError('Rendez-vous non trouvé', 404);
    }

    if (actor.role === 'medecin' && actor.medecinId !== rdv.medecinId) {
      throw new AppError('Accès interdit à ce rendez-vous', 403);
    }

    if (rdv.statut !== 'paye') {
      throw new AppError('Le rendez-vous doit être payé avant de démarrer la consultation', 400);
    }

    if (rdv.consultation) {
      const updated = await prisma.consultation.update({
        where: { id: rdv.consultation.id },
        data: {
          statut: rdv.consultation.statut === 'en_attente' ? 'en_cours' : rdv.consultation.statut,
        },
        include: {
          patient: true,
          medecin: true,
          rendezVous: true,
        },
      });
      return updated;
    }

    return await prisma.consultation.create({
      data: {
        rendezVousId: rdv.id,
        patientId: rdv.patientId,
        medecinId: rdv.medecinId,
        date: rdv.date,
        heure: rdv.heure,
        type: rdv.type,
        statut: 'en_cours',
      },
      include: {
        patient: true,
        medecin: true,
        rendezVous: true,
      },
    });
  }

  async findAll() {
    return await prisma.consultation.findMany({
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
        rendezVous: true,
        ordonnance: true,
        prestations: {
          where: { isArchived: false },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: number) {
    const consultation = await prisma.consultation.findFirst({
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
        rendezVous: true,
        ordonnance: {
          include: {
            medicaments: {
              include: {
                medicament: true,
              },
            },
          },
        },
        prestations: {
          where: { isArchived: false },
        },
      },
    });

    if (!consultation) {
      throw new AppError('Consultation non trouvée', 404);
    }

    return consultation;
  }

  async findByPatientId(patientId: number) {
    return await prisma.consultation.findMany({
      where: { patientId, isArchived: false },
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
        ordonnance: true,
        prestations: {
          where: { isArchived: false },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  async findByMedecinId(medecinId: number) {
    return await prisma.consultation.findMany({
      where: { medecinId, isArchived: false },
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
        ordonnance: true,
        prestations: {
          where: { isArchived: false },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  async create(data: {
    patientId: number;
    medecinId: number;
    date: Date | string;
    heure: string;
    type: string;
    rendezVousId?: number;
  }) {
    const { patientId, medecinId, date, heure, type, rendezVousId } = data;

    // Vérifier que le patient existe
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, isArchived: false },
    });

    if (!patient) {
      throw new AppError('Patient non trouvé', 404);
    }

    // Vérifier que le médecin existe
    const medecin = await prisma.medecin.findFirst({
      where: { id: medecinId, isArchived: false },
    });

    if (!medecin) {
      throw new AppError('Médecin non trouvé', 404);
    }

    // Si un rendez-vous est fourni, vérifier qu'il existe
    if (rendezVousId) {
      const rendezVous = await prisma.rendezVous.findUnique({
        where: { id: rendezVousId },
      });

      if (!rendezVous) {
        throw new AppError('Rendez-vous non trouvé', 404);
      }

      if (rendezVous.statut !== 'paye') {
        throw new AppError('Le rendez-vous doit être payé avant de démarrer une consultation', 400);
      }
    }

    return await prisma.consultation.create({
      data: {
        patientId,
        medecinId,
        date: new Date(date),
        heure,
        type,
        rendezVousId,
        statut: 'en_attente',
      },
      include: {
        patient: true,
        medecin: true,
      },
    });
  }

  async update(
    id: number,
    data: {
      date?: Date | string;
      heure?: string;
      type?: string;
      statut?: string;
      constantes?: any;
      diagnostic?: string;
      observations?: string;
    }
  ) {
    const consultation = await prisma.consultation.findFirst({
      where: { id, isArchived: false },
    });

    if (!consultation) {
      throw new AppError('Consultation non trouvée', 404);
    }

    const updateData: any = { ...data };

    if (data.date) {
      updateData.date = new Date(data.date);
    }

    return await prisma.consultation.update({
      where: { id },
      data: updateData,
      include: {
        patient: true,
        medecin: true,
        ordonnance: true,
        prestations: {
          where: { isArchived: false },
        },
      },
    });
  }

  async delete(id: number) {
    const consultation = await prisma.consultation.findFirst({
      where: { id, isArchived: false },
    });

    if (!consultation) {
      throw new AppError('Consultation non trouvée', 404);
    }

    // Vérifier si la consultation a une ordonnance
    const ordonnance = await prisma.ordonnance.findFirst({
      where: { consultationId: id, isArchived: false },
    });

    if (ordonnance) {
      await prisma.ordonnance.update({
        where: { id: ordonnance.id },
        data: {
          isArchived: true,
          archivedAt: new Date(),
        },
      });
    }

    // Archiver les prestations liées
    await prisma.prestation.updateMany({
      where: { consultationId: id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    return await prisma.consultation.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });
  }
}
