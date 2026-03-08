import prisma from '../../../config/db';
import { AppError } from '../../../shared/utils/AppError';
import { randomUUID } from 'crypto';
import { buildSimplePdf } from '../../../shared/utils/simplePdf';
import { PaydunyaClient } from './paydunya.client';

export class PaiementService {
  private readonly allowedPaymentMethods = [
    'especes',
    'carte_bancaire',
    'mobile_money',
    'virement',
    'wave',
    'orange_money',
  ];
  private readonly onlineMethods = ['carte_bancaire', 'mobile_money', 'wave', 'orange_money'];
  private readonly paydunyaClient = new PaydunyaClient();

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

  private isOnlineMethod(methode: string): boolean {
    return this.onlineMethods.includes(methode);
  }

  private getPaydunyaChannels(methode: string): string[] | undefined {
    if (methode === 'wave') return ['wave-senegal'];
    if (methode === 'orange_money') return ['orange-money-senegal'];
    if (methode === 'carte_bancaire') return ['card'];
    return undefined;
  }

  private getPublicApiBaseUrl(): string | undefined {
    const explicitBase = process.env.API_BASE_URL?.trim();
    if (explicitBase) return explicitBase.replace(/\/+$/, '');

    const frontend = process.env.FRONTEND_URL?.trim();
    if (frontend && frontend.startsWith('http')) {
      return frontend.replace(/\/+$/, '').replace(/:\d+$/, ':5000');
    }

    return undefined;
  }

  private getPaydunyaUrls(paiementId: number): { callbackUrl?: string; returnUrl?: string; cancelUrl?: string } {
    const apiBase = this.getPublicApiBaseUrl();
    const frontendBase = process.env.FRONTEND_URL?.trim()?.replace(/\/+$/, '');

    return {
      callbackUrl:
        process.env.PAYDUNYA_CALLBACK_URL?.trim() ||
        (apiBase ? `${apiBase}/api/v1/paiements/webhooks/paydunya` : undefined),
      returnUrl:
        process.env.PAYDUNYA_RETURN_URL?.trim() ||
        (frontendBase ? `${frontendBase}/patient/paiements?payment=success&paiementId=${paiementId}` : undefined),
      cancelUrl:
        process.env.PAYDUNYA_CANCEL_URL?.trim() ||
        (frontendBase ? `${frontendBase}/patient/paiements?payment=cancelled&paiementId=${paiementId}` : undefined),
    };
  }

  private extractPaydunyaToken(transactionId?: string | null): string | null {
    const raw = transactionId?.trim();
    if (!raw) return null;
    if (raw.startsWith('PDY-')) return raw.slice(4);
    return raw;
  }

  private async markPaiementAsPaidFromProvider(paiementId: number, providerToken?: string) {
    const paiement = await prisma.paiement.findFirst({
      where: { id: paiementId, isArchived: false },
      include: { rendezVous: true },
    });

    if (!paiement) {
      throw new AppError('Paiement non trouvé', 404);
    }

    if (paiement.statut === 'paye') {
      return this.findById(paiement.id);
    }

    if (paiement.rendezVous.statut === 'annule') {
      throw new AppError("Impossible de confirmer le paiement d'un rendez-vous annulé", 400);
    }

    if (!['confirme', 'paye'].includes(paiement.rendezVous.statut)) {
      throw new AppError('Le rendez-vous doit être confirmé avant validation du paiement', 400);
    }

    const transactionId = providerToken
      ? `PDY-${providerToken}`
      : paiement.transactionId || `TXN-${randomUUID()}`;

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

  private async markPaiementAsFailedFromProvider(paiementId: number) {
    const paiement = await prisma.paiement.findFirst({
      where: { id: paiementId, isArchived: false },
      include: {
        patient: true,
        rendezVous: true,
      },
    });

    if (!paiement) {
      throw new AppError('Paiement non trouvé', 404);
    }

    if (paiement.statut === 'paye') {
      return paiement;
    }

    if (paiement.statut === 'echoue') {
      return paiement;
    }

    return prisma.paiement.update({
      where: { id: paiement.id },
      data: { statut: 'echoue' },
      include: {
        patient: true,
        rendezVous: true,
      },
    });
  }

  private normalizePaydunyaWebhookData(payload: unknown): Record<string, unknown> {
    if (!payload || typeof payload !== 'object') return {};

    const source = payload as Record<string, unknown>;
    const data = source.data;

    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
      } catch {
        // ignore invalid json and fallback to source
      }
    } else if (data && typeof data === 'object') {
      return data as Record<string, unknown>;
    }

    return source;
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

    if (this.isOnlineMethod(data.methode)) {
      if (!this.paydunyaClient.isConfigured()) {
        throw new AppError(
          'Paiement en ligne indisponible. Configuration PayDunya manquante sur le serveur.',
          503
        );
      }

      const urls = this.getPaydunyaUrls(paiement.id);
      const createResponse = await this.paydunyaClient.createCheckoutInvoice({
        amount: montant,
        description: `Consultation médicale #${rdv.numero}`,
        reference: `PAIEMENT-${paiement.id}`,
        channels: this.getPaydunyaChannels(data.methode),
        callbackUrl: urls.callbackUrl,
        returnUrl: urls.returnUrl,
        cancelUrl: urls.cancelUrl,
        customData: {
          paiement_id: paiement.id,
          rendez_vous_id: rdv.id,
          patient_id: patient.id,
          methode: data.methode,
        },
      });

      if (createResponse.response_code !== '00' || !createResponse.token || !createResponse.response_text) {
        throw new AppError(
          createResponse.description || createResponse.response_text || 'Impossible d’initier la transaction PayDunya',
          400
        );
      }

      const updatedPaiement = await prisma.paiement.update({
        where: { id: paiement.id },
        data: {
          transactionId: `PDY-${createResponse.token}`,
          statut: 'en_attente',
        },
      });

      return {
        ...updatedPaiement,
        paymentSession: {
          provider: 'paydunya',
          token: createResponse.token,
          checkoutUrl: createResponse.response_text,
          expiresInSeconds: 900,
        },
      };
    }

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
      return this.findById(paiement.id);
    }
    if (paiement.rendezVous.statut === 'annule') {
      throw new AppError('Impossible de payer un rendez-vous annulé', 400);
    }
    if (paiement.rendezVous.statut !== 'confirme') {
      throw new AppError('Le rendez-vous doit être confirmé avant le paiement', 400);
    }

    if (this.isOnlineMethod(paiement.methode)) {
      const token = this.extractPaydunyaToken(paiement.transactionId);
      if (!token) {
        throw new AppError('Token de transaction en ligne introuvable. Réinitiez le paiement.', 400);
      }

      const statusResponse = await this.paydunyaClient.confirmCheckoutInvoice(token);
      if (statusResponse.response_code !== '00') {
        throw new AppError(
          statusResponse.response_text || 'Impossible de vérifier le statut PayDunya',
          400
        );
      }

      const providerStatus = (statusResponse.response_message || statusResponse.status || '').toLowerCase();
      if (providerStatus === 'completed') {
        return this.markPaiementAsPaidFromProvider(paiement.id, token);
      }
      if (providerStatus === 'cancelled' || providerStatus === 'failed') {
        return this.markPaiementAsFailedFromProvider(paiement.id);
      }

      return {
        ...paiement,
        paymentSession: {
          provider: 'paydunya',
          token,
          status: providerStatus || 'pending',
        },
      };
    }

    if (!confirmationCode || !/^\d{6}$/.test(confirmationCode)) {
      throw new AppError('Code de confirmation invalide (6 chiffres requis)', 400);
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

  async handlePaydunyaWebhook(payload: unknown) {
    const data = this.normalizePaydunyaWebhookData(payload);

    const token = typeof data.token === 'string' ? data.token.trim() : '';
    const status = typeof data.status === 'string' ? data.status.trim().toLowerCase() : '';
    const hash =
      typeof data.hash === 'string'
        ? data.hash.trim()
        : typeof (payload as Record<string, unknown>)?.hash === 'string'
          ? ((payload as Record<string, unknown>).hash as string).trim()
          : '';

    this.paydunyaClient.assertWebhookSignature(hash);

    if (!token) {
      throw new AppError('Webhook PayDunya invalide: token absent', 400);
    }

    const paiement = await prisma.paiement.findFirst({
      where: {
        isArchived: false,
        OR: [{ transactionId: `PDY-${token}` }, { transactionId: token }],
      },
    });

    if (!paiement) {
      return {
        processed: false,
        reason: 'paiement_not_found',
        token,
        status: status || 'pending',
      };
    }

    if (status === 'completed') {
      const updated = await this.markPaiementAsPaidFromProvider(paiement.id, token);
      return {
        processed: true,
        status: 'paye',
        paiementId: updated.id,
      };
    }

    if (status === 'cancelled' || status === 'failed') {
      const updated = await this.markPaiementAsFailedFromProvider(paiement.id);
      return {
        processed: true,
        status: updated.statut,
        paiementId: updated.id,
      };
    }

    return {
      processed: true,
      status: status || 'pending',
      paiementId: paiement.id,
    };
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
