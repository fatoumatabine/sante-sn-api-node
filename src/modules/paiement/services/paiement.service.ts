import prisma from '../../../config/db';
import { AppError } from '../../../shared/utils/AppError';
import { randomUUID } from 'crypto';
import { buildSimplePdf } from '../../../shared/utils/simplePdf';

export class PaiementService {
  private readonly allowedPaymentMethods = ['especes', 'carte_bancaire', 'mobile_money', 'virement', 'wave', 'orange_money'];

  private getPrismaErrorCode(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') return undefined;
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }

  private isMissingTableOrColumnError(error: unknown): boolean {
    const code = this.getPrismaErrorCode(error);
    return code === 'P2021' || code === 'P2022';
  }

  private async findPaiementsForList() {
    try {
      return await prisma.paiement.findMany({
        where: { isArchived: false },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      const code = this.getPrismaErrorCode(error);

      if (code === 'P2022') {
        return await prisma.paiement.findMany({
          orderBy: { id: 'desc' },
        });
      }

      if (code === 'P2021') {
        return [];
      }

      throw error;
    }
  }

  private async findPatientsForList(patientIds: number[]) {
    if (patientIds.length === 0) return [];

    const select = {
      id: true,
      prenom: true,
      nom: true,
      userId: true,
    } as const;

    try {
      return await prisma.patient.findMany({
        where: { id: { in: patientIds }, isArchived: false },
        select,
      });
    } catch (error) {
      if (this.getPrismaErrorCode(error) !== 'P2022') {
        throw error;
      }
      return await prisma.patient.findMany({
        where: { id: { in: patientIds } },
        select,
      });
    }
  }

  private assertValidMethod(methode: string) {
    if (!this.allowedPaymentMethods.includes(methode)) {
      throw new AppError('Méthode de paiement invalide', 400);
    }
  }

  private async findPatientByUserIdOrThrow(userId: number) {
    const patient = await prisma.patient.findFirst({
      where: { userId, isArchived: false },
    });
    if (!patient) {
      throw new AppError('Profil patient requis', 403);
    }
    return patient;
  }

  private async findRdvForPatientOrThrow(rendezVousId: number, patientId: number) {
    const rdv = await prisma.rendezVous.findUnique({
      where: { id: rendezVousId },
      include: { medecin: true },
    });

    if (!rdv) {
      throw new AppError('Rendez-vous non trouvé', 404);
    }
    if (rdv.patientId !== patientId) {
      throw new AppError('Accès interdit pour ce rendez-vous', 403);
    }
    if (!['confirme', 'paye'].includes(rdv.statut)) {
      throw new AppError('Le paiement est autorisé uniquement pour un rendez-vous confirmé', 400);
    }
    return rdv;
  }

  async initiateForPatient(userId: number, data: { rendezVousId: number; methode: string }) {
    const patient = await this.findPatientByUserIdOrThrow(userId);
    this.assertValidMethod(data.methode);
    const rdv = await this.findRdvForPatientOrThrow(data.rendezVousId, patient.id);

    const montant = rdv.medecin.tarif_consultation > 0 ? rdv.medecin.tarif_consultation : 15000;

    const existing = await prisma.paiement.findFirst({
      where: { rendezVousId: rdv.id, isArchived: false },
    });

    if (existing?.statut === 'paye') {
      throw new AppError('Ce rendez-vous est déjà payé', 400);
    }

    const paiement = existing
      ? await prisma.paiement.update({
          where: { id: existing.id },
          data: {
            methode: data.methode,
            montant,
            statut: existing.statut === 'echoue' ? 'en_attente' : existing.statut,
            transactionId: existing.transactionId || `INIT-${randomUUID()}`,
          },
        })
      : await prisma.paiement.create({
          data: {
            patientId: patient.id,
            rendezVousId: rdv.id,
            montant,
            methode: data.methode,
            statut: 'en_attente',
            transactionId: `INIT-${randomUUID()}`,
          },
        });

    return {
      ...paiement,
      paymentSession: {
        provider: 'internal-gateway',
        token: `PAY-${randomUUID()}`,
        expiresInSeconds: 900,
      },
    };
  }

  async payForPatient(userId: number, paiementId: number, confirmationCode?: string) {
    if (!confirmationCode || !/^\d{6}$/.test(confirmationCode)) {
      throw new AppError('Code de confirmation invalide (6 chiffres requis)', 400);
    }

    const patient = await this.findPatientByUserIdOrThrow(userId);
    const paiement = await prisma.paiement.findFirst({
      where: { id: paiementId, isArchived: false },
      include: { rendezVous: true },
    });

    if (!paiement) {
      throw new AppError('Paiement non trouvé', 404);
    }
    if (paiement.patientId !== patient.id) {
      throw new AppError('Accès interdit à ce paiement', 403);
    }
    if (paiement.statut === 'paye') {
      throw new AppError('Ce paiement est déjà confirmé', 400);
    }
    if (paiement.rendezVous.statut === 'annule') {
      throw new AppError('Impossible de payer un rendez-vous annulé', 400);
    }
    if (paiement.rendezVous.statut !== 'confirme') {
      throw new AppError('Le rendez-vous doit être confirmé avant le paiement', 400);
    }

    const transactionId = paiement.transactionId || `TXN-${randomUUID()}`;

    const [, updatedPaiement] = await prisma.$transaction([
      prisma.rendezVous.update({
        where: { id: paiement.rendezVousId },
        data: { statut: 'paye' },
      }),
      prisma.paiement.update({
        where: { id: paiement.id },
        data: {
          statut: 'paye',
          transactionId,
          date_paiement: new Date(),
        },
        include: {
          patient: true,
          rendezVous: true,
        },
      }),
    ]);

    return updatedPaiement;
  }

  async findAll() {
    try {
      const paiements = await this.findPaiementsForList();
      if (paiements.length === 0) {
        return paiements;
      }

      const patientIds = Array.from(new Set(paiements.map((paiement) => paiement.patientId)));
      const patients = await this.findPatientsForList(patientIds);
      const userIds = Array.from(new Set(patients.map((patient) => patient.userId)));
      const users =
        userIds.length > 0
          ? await prisma.user.findMany({
              where: { id: { in: userIds } },
              select: { id: true, email: true, name: true },
            })
          : [];

      const userById = new Map(users.map((user) => [user.id, user]));
      const patientById = new Map(
        patients.map((patient) => [
          patient.id,
          {
            id: patient.id,
            prenom: patient.prenom,
            nom: patient.nom,
            user: userById.get(patient.userId) || undefined,
          },
        ])
      );

      return paiements.map((paiement) => ({
        ...paiement,
        patient: patientById.get(paiement.patientId) || null,
      }));
    } catch (error) {
      if (!this.isMissingTableOrColumnError(error)) {
        throw error;
      }

      console.warn(`[paiements] fallback findAll (${this.getPrismaErrorCode(error) || 'UNKNOWN'})`);
      return [];
    }
  }

  async findById(id: number) {
    const paiement = await prisma.paiement.findFirst({
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
        rendezVous: {
          include: {
            medecin: true,
          },
        },
      },
    });

    if (!paiement) {
      throw new AppError('Paiement non trouvé', 404);
    }

    return paiement;
  }

  async findByPatientId(patientId: number) {
    return await prisma.paiement.findMany({
      where: { patientId, isArchived: false },
      include: {
        patient: true,
        rendezVous: {
          include: {
            medecin: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByRendezVousId(rendezVousId: number) {
    return await prisma.paiement.findFirst({
      where: { rendezVousId, isArchived: false },
      include: {
        patient: true,
        rendezVous: {
          include: {
            medecin: true,
          },
        },
      },
    });
  }

  async create(data: {
    patientId: number;
    rendezVousId: number;
    montant: number;
    methode: string;
    role?: string;
  }) {
    const { patientId, rendezVousId, montant, methode, role } = data;
    this.assertValidMethod(methode);

    if (role === 'patient') {
      throw new AppError('Utilisez le flux sécurisé /paiements/initier', 403);
    }

    // Vérifier que le patient existe
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, isArchived: false },
    });

    if (!patient) {
      throw new AppError('Patient non trouvé', 404);
    }

    // Vérifier que le rendez-vous existe
    const rendezVous = await prisma.rendezVous.findUnique({
      where: { id: rendezVousId },
    });

    if (!rendezVous) {
      throw new AppError('Rendez-vous non trouvé', 404);
    }
    if (rendezVous.statut !== 'confirme') {
      throw new AppError('Un paiement ne peut être créé que pour un rendez-vous confirmé', 400);
    }

    // Vérifier si un paiement existe déjà pour ce rendez-vous
    const existingPaiement = await prisma.paiement.findFirst({
      where: { rendezVousId, isArchived: false },
    });

    if (existingPaiement) {
      throw new AppError('Un paiement existe déjà pour ce rendez-vous', 400);
    }

    return await prisma.paiement.create({
      data: {
        patientId,
        rendezVousId,
        montant,
        methode,
        statut: 'en_attente',
      },
      include: {
        patient: true,
        rendezVous: true,
      },
    });
  }

  async update(
    id: number,
    data: {
      montant?: number;
      methode?: string;
      transactionId?: string;
    }
  ) {
    const paiement = await prisma.paiement.findFirst({
      where: { id, isArchived: false },
    });

    if (!paiement) {
      throw new AppError('Paiement non trouvé', 404);
    }

    return await prisma.paiement.update({
      where: { id },
      data,
      include: {
        patient: true,
        rendezVous: true,
      },
    });
  }

  async confirm(id: number) {
    const paiement = await prisma.paiement.findFirst({
      where: { id, isArchived: false },
      include: {
        rendezVous: true,
      },
    });

    if (!paiement) {
      throw new AppError('Paiement non trouvé', 404);
    }

    if (paiement.statut === 'paye') {
      throw new AppError('Ce paiement est déjà confirmé', 400);
    }

    if (paiement.statut !== 'en_attente' && paiement.statut !== 'echoue') {
      throw new AppError('Seuls les paiements en attente/échoués peuvent être confirmés', 400);
    }
    if (paiement.rendezVous.statut === 'annule') {
      throw new AppError('Impossible de confirmer le paiement d\'un rendez-vous annulé', 400);
    }
    if (paiement.rendezVous.statut !== 'confirme' && paiement.rendezVous.statut !== 'paye') {
      throw new AppError('Le rendez-vous doit être confirmé avant validation du paiement', 400);
    }

    const [, updatedPaiement] = await prisma.$transaction([
      prisma.rendezVous.update({
        where: { id: paiement.rendezVousId },
        data: { statut: 'paye' },
      }),
      prisma.paiement.update({
        where: { id },
        data: {
          statut: 'paye',
          date_paiement: new Date(),
          transactionId: paiement.transactionId || `TXN-${randomUUID()}`,
        },
        include: {
          patient: true,
          rendezVous: true,
        },
      }),
    ]);

    return updatedPaiement;
  }

  async fail(id: number) {
    const paiement = await prisma.paiement.findFirst({
      where: { id, isArchived: false },
    });

    if (!paiement) {
      throw new AppError('Paiement non trouvé', 404);
    }

    if (paiement.statut === 'paye') {
      throw new AppError('Un paiement confirmé ne peut pas être marqué échoué', 400);
    }

    return await prisma.paiement.update({
      where: { id },
      data: {
        statut: 'echoue',
      },
      include: {
        patient: true,
        rendezVous: true,
      },
    });
  }

  async delete(id: number) {
    const paiement = await prisma.paiement.findFirst({
      where: { id, isArchived: false },
    });

    if (!paiement) {
      throw new AppError('Paiement non trouvé', 404);
    }

    return await prisma.paiement.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });
  }

  async generateFacturePdf(
    paiementId: number,
    actor: { role: string; patientId?: number; medecinId?: number }
  ) {
    const paiement = await prisma.paiement.findFirst({
      where: { id: paiementId, isArchived: false },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
        rendezVous: {
          include: {
            medecin: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!paiement) {
      throw new AppError('Paiement non trouvé', 404);
    }

    if (actor.role === 'patient' && actor.patientId !== paiement.patientId) {
      throw new AppError('Accès interdit à cette facture', 403);
    }
    if (actor.role === 'medecin' && actor.medecinId !== paiement.rendezVous.medecinId) {
      throw new AppError('Accès interdit à cette facture', 403);
    }
    if (paiement.statut !== 'paye') {
      throw new AppError('La facture est disponible uniquement pour un paiement confirmé', 400);
    }

    const factureNumber = `FAC-${paiement.id}-${new Date(paiement.createdAt).toISOString().slice(0, 10).replace(/-/g, '')}`;
    const medecinName = paiement.rendezVous.medecin.user?.name || `${paiement.rendezVous.medecin.prenom} ${paiement.rendezVous.medecin.nom}`;
    const patientName = paiement.patient.user?.name || `${paiement.patient.prenom} ${paiement.patient.nom}`;

    const lines = [
      `Numero facture: ${factureNumber}`,
      `Date emission: ${new Date().toLocaleDateString('fr-FR')}`,
      '',
      `Patient: ${patientName}`,
      `Email patient: ${paiement.patient.user?.email || 'N/A'}`,
      `Medecin: ${medecinName}`,
      `Specialite: ${paiement.rendezVous.medecin.specialite}`,
      '',
      `Rendez-vous: ${new Date(paiement.rendezVous.date).toLocaleDateString('fr-FR')} a ${paiement.rendezVous.heure}`,
      `Motif: ${paiement.rendezVous.motif || 'Consultation'}`,
      '',
      `Montant: ${paiement.montant.toFixed(0)} FCFA`,
      `Methode: ${paiement.methode}`,
      `Statut: ${paiement.statut}`,
      `Reference transaction: ${paiement.transactionId || 'N/A'}`,
      '',
      'Document genere automatiquement par Sante SN.',
    ];

    const buffer = buildSimplePdf('Facture - Sante SN', lines);
    return {
      buffer,
      filename: `${factureNumber}.pdf`,
    };
  }
}
