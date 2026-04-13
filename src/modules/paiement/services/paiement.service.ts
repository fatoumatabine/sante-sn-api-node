import prisma from '../../../config/db';
import { AppError } from '../../../shared/utils/AppError';
import { randomUUID } from 'crypto';
import { buildSimplePdf } from '../../../shared/utils/simplePdf';
import { PaydunyaClient } from './paydunya.client';

type PaiementActor = {
  role: string;
  patientId?: number;
  medecinId?: number;
  secretaireId?: number;
};

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

  private async getActorMedecinScope(actor?: PaiementActor, strict = false): Promise<number | null> {
    if (!actor) return null;

    if (actor.role === 'medecin') {
      if (actor.medecinId) {
        return actor.medecinId;
      }

      if (strict) {
        throw new AppError('Profil médecin requis', 403);
      }

      return null;
    }

    if (actor.role !== 'secretaire') {
      return null;
    }

    if (!actor.secretaireId) {
      if (strict) {
        throw new AppError('Profil secrétaire requis', 403);
      }
      return null;
    }

    const secretaire = await prisma.secretaire.findFirst({
      where: { id: actor.secretaireId, isArchived: false },
      select: { medecinId: true },
    });

    if (!secretaire?.medecinId) {
      if (strict) {
        throw new AppError('Aucun médecin assigné à cette secrétaire', 403);
      }
      return null;
    }

    return secretaire.medecinId;
  }

  private async findPaiementsForList(medecinId?: number | null) {
    const relationFilter = medecinId ? { rendezVous: { medecinId } } : {};

    try {
      return await prisma.paiement.findMany({
        where: {
          isArchived: false,
          ...relationFilter,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      const code = this.getPrismaErrorCode(error);

      if (code === 'P2022') {
        return await prisma.paiement.findMany({
          where: relationFilter,
          orderBy: { id: 'desc' },
        });
      }

      if (code === 'P2021') {
        return [];
      }

      throw error;
    }
  }

  private async findRendezVousForList(rendezVousIds: number[]) {
    if (rendezVousIds.length === 0) return [];

    return prisma.rendezVous.findMany({
      where: { id: { in: rendezVousIds } },
      select: {
        id: true,
        numero: true,
        date: true,
        heure: true,
        statut: true,
        medecinId: true,
        medecin: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            specialite: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
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

  private async assertPaiementAccess(
    paiement: {
      patientId: number;
      rendezVous: {
        medecinId: number;
      };
    },
    actor?: PaiementActor
  ) {
    if (!actor || actor.role === 'admin') {
      return;
    }

    if (actor.role === 'patient') {
      if (actor.patientId !== paiement.patientId) {
        throw new AppError('Accès interdit', 403);
      }
      return;
    }

    if (actor.role === 'medecin' || actor.role === 'secretaire') {
      const scopedMedecinId = await this.getActorMedecinScope(actor, true);
      if (scopedMedecinId !== paiement.rendezVous.medecinId) {
        throw new AppError('Accès interdit', 403);
      }
      return;
    }

    throw new AppError('Accès interdit', 403);
  }

  private isOnlineMethod(methode: string): boolean {
    return this.onlineMethods.includes(methode);
  }

  private isOnlineSimulationEnabled(): boolean {
    return String(process.env.PAYMENT_SIMULATION_ONLINE || '')
      .trim()
      .toLowerCase() === 'true';
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

  private getPaydunyaUrls(
    paiementId: number,
    rendezVousId: number
  ): { callbackUrl?: string; returnUrl?: string; cancelUrl?: string } {
    const apiBase = this.getPublicApiBaseUrl();
    const frontendBase = process.env.FRONTEND_URL?.trim()?.replace(/\/+$/, '');

    return {
      callbackUrl:
        process.env.PAYDUNYA_CALLBACK_URL?.trim() ||
        (apiBase ? `${apiBase}/api/v1/paiements/webhooks/paydunya` : undefined),
      returnUrl:
        process.env.PAYDUNYA_RETURN_URL?.trim() ||
        (frontendBase
          ? `${frontendBase}/patient/paiements/rendez-vous/${rendezVousId}?payment=success&paiementId=${paiementId}`
          : undefined),
      cancelUrl:
        process.env.PAYDUNYA_CANCEL_URL?.trim() ||
        (frontendBase
          ? `${frontendBase}/patient/paiements/rendez-vous/${rendezVousId}?payment=cancelled&paiementId=${paiementId}`
          : undefined),
    };
  }

  private extractPaydunyaToken(transactionId?: string | null): string | null {
    const raw = transactionId?.trim();
    if (!raw) return null;
    if (raw.startsWith('PDY-')) return raw.slice(4);
    return raw;
  }

  private isSimulatedOnlineTransaction(transactionId?: string | null): boolean {
    return String(transactionId || '').startsWith('SIM-');
  }

  private buildOnlineSimulationCheckoutUrl(url?: string): string | undefined {
    const base = url?.trim();
    if (!base) return undefined;

    try {
      const parsed = new URL(base);
      parsed.searchParams.set('simulated', '1');
      return parsed.toString();
    } catch {
      const separator = base.includes('?') ? '&' : '?';
      return `${base}${separator}simulated=1`;
    }
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

  private async markPaiementAsPaidFromSimulation(paiementId: number) {
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

    const [, updatedPaiement] = await prisma.$transaction([
      prisma.rendezVous.update({
        where: { id: paiement.rendezVousId },
        data: { statut: 'paye' },
      }),
      prisma.paiement.update({
        where: { id: paiement.id },
        data: {
          statut: 'paye',
          transactionId: paiement.transactionId || `SIM-${randomUUID()}`,
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
      const urls = this.getPaydunyaUrls(paiement.id, rdv.id);

      if (this.isOnlineSimulationEnabled()) {
        const simulationToken = `SIM-${randomUUID()}`;
        const updatedPaiement = await prisma.paiement.update({
          where: { id: paiement.id },
          data: {
            transactionId: simulationToken,
            statut: 'en_attente',
          },
        });

        return {
          ...updatedPaiement,
          paymentSession: {
            provider: 'online-simulator',
            token: simulationToken,
            checkoutUrl: this.buildOnlineSimulationCheckoutUrl(urls.returnUrl),
            status: 'ready',
            expiresInSeconds: 900,
          },
        };
      }

      if (!this.paydunyaClient.isConfigured()) {
        throw new AppError(
          'Paiement en ligne indisponible. Configuration PayDunya manquante sur le serveur.',
          503
        );
      }

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
          this.paydunyaClient.normalizeProviderMessage(createResponse.description || createResponse.response_text) ||
            'Impossible d’initier la transaction PayDunya',
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
      if (this.isSimulatedOnlineTransaction(paiement.transactionId)) {
        return this.markPaiementAsPaidFromSimulation(paiement.id);
      }

      const token = this.extractPaydunyaToken(paiement.transactionId);
      if (!token) {
        throw new AppError('Token de transaction en ligne introuvable. Réinitiez le paiement.', 400);
      }

      const statusResponse = await this.paydunyaClient.confirmCheckoutInvoice(token);
      if (statusResponse.response_code !== '00') {
        throw new AppError(
          this.paydunyaClient.normalizeProviderMessage(statusResponse.response_text) ||
            'Impossible de vérifier le statut PayDunya',
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

  async findAll(actor?: PaiementActor) {
    try {
      const scopedMedecinId = await this.getActorMedecinScope(actor, false);
      if ((actor?.role === 'medecin' || actor?.role === 'secretaire') && !scopedMedecinId) {
        return [];
      }

      const paiements = await this.findPaiementsForList(scopedMedecinId);
      if (paiements.length === 0) {
        return paiements;
      }

      const patientIds = Array.from(new Set(paiements.map((paiement) => paiement.patientId)));
      const rendezVousIds = Array.from(new Set(paiements.map((paiement) => paiement.rendezVousId)));
      const patients = await this.findPatientsForList(patientIds);
      const rendezVousList = await this.findRendezVousForList(rendezVousIds);
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
      const rendezVousById = new Map(
        rendezVousList.map((rendezVous) => [
          rendezVous.id,
          {
            id: rendezVous.id,
            numero: rendezVous.numero,
            date: rendezVous.date,
            heure: rendezVous.heure,
            statut: rendezVous.statut,
            medecinId: rendezVous.medecinId,
            medecin: rendezVous.medecin,
          },
        ])
      );

      return paiements.map((paiement) => ({
        ...paiement,
        patient: patientById.get(paiement.patientId) || null,
        rendezVous: rendezVousById.get(paiement.rendezVousId) || null,
      }));
    } catch (error) {
      if (!this.isMissingTableOrColumnError(error)) {
        throw error;
      }

      console.warn(`[paiements] fallback findAll (${this.getPrismaErrorCode(error) || 'UNKNOWN'})`);
      return [];
    }
  }

  async findById(id: number, actor?: PaiementActor) {
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

    await this.assertPaiementAccess(paiement, actor);

    return paiement;
  }

  async findByPatientId(patientId: number, actor?: PaiementActor) {
    if (actor?.role === 'patient' && actor.patientId !== patientId) {
      throw new AppError('Accès interdit', 403);
    }

    const scopedMedecinId = await this.getActorMedecinScope(actor, false);
    if ((actor?.role === 'medecin' || actor?.role === 'secretaire') && !scopedMedecinId) {
      return [];
    }

    return await prisma.paiement.findMany({
      where: {
        patientId,
        isArchived: false,
        ...(scopedMedecinId ? { rendezVous: { medecinId: scopedMedecinId } } : {}),
      },
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

  async findRendezVousOwnerPatientId(rendezVousId: number) {
    const rendezVous = await prisma.rendezVous.findUnique({
      where: { id: rendezVousId },
      select: { patientId: true },
    });

    return rendezVous?.patientId ?? null;
  }

  async findByRendezVousId(rendezVousId: number, actor?: PaiementActor) {
    const paiement = await prisma.paiement.findFirst({
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

    if (!paiement) {
      return null;
    }

    await this.assertPaiementAccess(paiement, actor);
    return paiement;
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
    },
    actor?: PaiementActor
  ) {
    const paiement = await prisma.paiement.findFirst({
      where: { id, isArchived: false },
      include: {
        rendezVous: true,
      },
    });

    if (!paiement) {
      throw new AppError('Paiement non trouvé', 404);
    }

    await this.assertPaiementAccess(paiement, actor);

    return await prisma.paiement.update({
      where: { id },
      data,
      include: {
        patient: true,
        rendezVous: true,
      },
    });
  }

  async confirm(id: number, actor?: PaiementActor) {
    const paiement = await prisma.paiement.findFirst({
      where: { id, isArchived: false },
      include: {
        rendezVous: true,
      },
    });

    if (!paiement) {
      throw new AppError('Paiement non trouvé', 404);
    }

    await this.assertPaiementAccess(paiement, actor);

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

  async fail(id: number, actor?: PaiementActor) {
    const paiement = await prisma.paiement.findFirst({
      where: { id, isArchived: false },
      include: {
        rendezVous: true,
      },
    });

    if (!paiement) {
      throw new AppError('Paiement non trouvé', 404);
    }

    await this.assertPaiementAccess(paiement, actor);

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

  async simulate(userId: number, rendezVousId: number) {
    const patient = await this.findPatientByUserIdOrThrow(userId);
    const rdv = await prisma.rendezVous.findUnique({
      where: { id: rendezVousId },
      include: { medecin: true },
    });

    if (!rdv) throw new AppError('Rendez-vous non trouvé', 404);
    if (rdv.patientId !== patient.id) throw new AppError('Accès interdit pour ce rendez-vous', 403);
    if (!['confirme', 'paye'].includes(rdv.statut)) {
      throw new AppError('Le rendez-vous doit être confirmé avant le paiement', 400);
    }

    const existing = await prisma.paiement.findFirst({
      where: { rendezVousId, isArchived: false },
    });

    if (existing?.statut === 'paye') {
      return this.findById(existing.id);
    }

    const montant = rdv.medecin.tarif_consultation > 0 ? rdv.medecin.tarif_consultation : 15000;
    const transactionId = `SIM-${randomUUID()}`;

    const paiementId = existing?.id ?? null;

    const [, updatedPaiement] = await prisma.$transaction([
      prisma.rendezVous.update({
        where: { id: rendezVousId },
        data: { statut: 'paye' },
      }),
      paiementId
        ? prisma.paiement.update({
            where: { id: paiementId },
            data: { statut: 'paye', montant, methode: 'especes', transactionId, date_paiement: new Date() },
            include: { patient: true, rendezVous: true },
          })
        : prisma.paiement.create({
            data: {
              patientId: patient.id,
              rendezVousId,
              montant,
              methode: 'especes',
              statut: 'paye',
              transactionId,
              date_paiement: new Date(),
            },
            include: { patient: true, rendezVous: true },
          }),
    ]);

    return updatedPaiement;
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
    actor: { role: string; patientId?: number; medecinId?: number; secretaireId?: number }
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

    await this.assertPaiementAccess(paiement, actor);

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
