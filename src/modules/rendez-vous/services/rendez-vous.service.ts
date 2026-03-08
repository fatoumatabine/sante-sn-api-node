import { rendezVousRepository } from '../repositories/rendez-vous.repository';
import { Prisma, RendezVous, Role, StatutRendezVous } from '@prisma/client';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../../shared/utils/AppError';
import prisma from '../../../config/db';

interface TransitionActor {
  id?: number;
  role: string;
  patientId?: number;
  medecinId?: number;
  secretaireId?: number;
}

export const RENDEZ_VOUS_ALLOWED_TRANSITIONS: Record<StatutRendezVous, StatutRendezVous[]> = {
  en_attente: [StatutRendezVous.confirme, StatutRendezVous.annule],
  confirme: [StatutRendezVous.paye, StatutRendezVous.annule, StatutRendezVous.termine],
  paye: [StatutRendezVous.termine],
  annule: [],
  termine: [],
};

export function canTransitionRendezVous(current: StatutRendezVous, next: StatutRendezVous): boolean {
  if (current === next) return false;
  return RENDEZ_VOUS_ALLOWED_TRANSITIONS[current].includes(next);
}

const DEFAULT_SLOT_DURATION_MINUTES = 30;

function parseHeureToMinutes(heure: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(heure);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return (hours * 60) + minutes;
}

function inferSlotDurationMinutes(sortedSlotsInMinutes: number[]): number {
  const positiveDiffs: number[] = [];

  for (let i = 1; i < sortedSlotsInMinutes.length; i += 1) {
    const diff = sortedSlotsInMinutes[i] - sortedSlotsInMinutes[i - 1];
    if (diff > 0) {
      positiveDiffs.push(diff);
    }
  }

  if (!positiveDiffs.length) {
    return DEFAULT_SLOT_DURATION_MINUTES;
  }

  return Math.min(...positiveDiffs);
}

function resolveRequestedSlot(heureDemandee: string, creneauxHeures: string[]): {
  slotHeure: string | null;
  slotStartMinutes: number | null;
  slotDurationMinutes: number;
} {
  const parsedSlots = creneauxHeures
    .map((heure) => ({ heure, minutes: parseHeureToMinutes(heure) }))
    .filter((slot): slot is { heure: string; minutes: number } => slot.minutes !== null)
    .sort((a, b) => a.minutes - b.minutes);

  const slotDurationMinutes = inferSlotDurationMinutes(parsedSlots.map((slot) => slot.minutes));

  if (!parsedSlots.length) {
    return {
      slotHeure: null,
      slotStartMinutes: null,
      slotDurationMinutes,
    };
  }

  const exactSlot = parsedSlots.find((slot) => slot.heure === heureDemandee);
  if (exactSlot) {
    return {
      slotHeure: exactSlot.heure,
      slotStartMinutes: exactSlot.minutes,
      slotDurationMinutes,
    };
  }

  const requestedMinutes = parseHeureToMinutes(heureDemandee);
  if (requestedMinutes === null) {
    return {
      slotHeure: null,
      slotStartMinutes: null,
      slotDurationMinutes,
    };
  }

  let candidate: { heure: string; minutes: number } | null = null;
  for (const slot of parsedSlots) {
    if (slot.minutes <= requestedMinutes) {
      candidate = slot;
      continue;
    }
    break;
  }

  if (!candidate) {
    return {
      slotHeure: null,
      slotStartMinutes: null,
      slotDurationMinutes,
    };
  }

  if ((requestedMinutes - candidate.minutes) >= slotDurationMinutes) {
    return {
      slotHeure: null,
      slotStartMinutes: null,
      slotDurationMinutes,
    };
  }

  return {
    slotHeure: candidate.heure,
    slotStartMinutes: candidate.minutes,
    slotDurationMinutes,
  };
}

export class RendezVousService {
  async getDisponibilitePourValidation(rendezVousId: number): Promise<{
    available: boolean;
    reason: string | null;
    creneaux: string[];
    heureDemandeeDisponible: boolean;
    conflictCount: number;
    creneauReference: string | null;
  }> {
    const rdv = await this.findByIdOrThrow(rendezVousId);
    const jour = new Date(rdv.date).getDay();

    const creneaux = await prisma.creneauDisponible.findMany({
      where: {
        medecinId: rdv.medecinId,
        jour,
        actif: true,
      },
      orderBy: { heure: 'asc' },
    });

    const creneauxHeures = creneaux.map((c) => c.heure);
    const slotMatch = resolveRequestedSlot(rdv.heure, creneauxHeures);
    const heureDemandeeDisponible = Boolean(slotMatch.slotHeure);

    let conflictCount = 0;
    if (heureDemandeeDisponible && slotMatch.slotStartMinutes !== null) {
      const existingRdv = await prisma.rendezVous.findMany({
        where: {
          medecinId: rdv.medecinId,
          date: rdv.date,
          statut: {
            not: StatutRendezVous.annule,
          },
          NOT: {
            id: rdv.id,
          },
        },
        select: { heure: true },
      });

      const slotStart = slotMatch.slotStartMinutes;
      const slotEnd = slotStart + slotMatch.slotDurationMinutes;

      conflictCount = existingRdv.filter((existing) => {
        const existingMinutes = parseHeureToMinutes(existing.heure);
        if (existingMinutes === null) {
          return false;
        }
        return existingMinutes >= slotStart && existingMinutes < slotEnd;
      }).length;
    }

    if (!heureDemandeeDisponible) {
      return {
        available: false,
        reason: 'Le médecin n’a pas de créneau actif à cette heure',
        creneaux: creneauxHeures,
        heureDemandeeDisponible,
        conflictCount,
        creneauReference: slotMatch.slotHeure,
      };
    }

    if (conflictCount > 0) {
      return {
        available: false,
        reason: 'Le médecin est déjà occupé sur ce créneau',
        creneaux: creneauxHeures,
        heureDemandeeDisponible,
        conflictCount,
        creneauReference: slotMatch.slotHeure,
      };
    }

    return {
      available: true,
      reason: null,
      creneaux: creneauxHeures,
      heureDemandeeDisponible,
      conflictCount: 0,
      creneauReference: slotMatch.slotHeure,
    };
  }

  private async findByIdOrThrow(id: number): Promise<RendezVous> {
    const rdv = await rendezVousRepository.findById(id);
    if (!rdv) {
      throw new NotFoundError('Rendez-vous non trouvé');
    }
    return rdv;
  }

  private assertTransitionAllowed(current: StatutRendezVous, next: StatutRendezVous) {
    if (current === next) {
      throw new BadRequestError(`Le rendez-vous est déjà au statut ${next}`);
    }
    if (!canTransitionRendezVous(current, next)) {
      throw new BadRequestError(`Transition invalide: ${current} -> ${next}`);
    }
  }

  private normalizeRole(role: string): Role | null {
    if (role === 'patient' || role === 'medecin' || role === 'secretaire' || role === 'admin') {
      return role;
    }
    return null;
  }

  private async logTransition(params: {
    rendezVousId: number;
    fromStatut: StatutRendezVous;
    toStatut: StatutRendezVous;
    actor: TransitionActor;
    reason?: string;
  }): Promise<void> {
    const { rendezVousId, fromStatut, toStatut, actor, reason } = params;
    const actorRole = this.normalizeRole(actor.role);
    const metadata = {
      actorPatientId: actor.patientId ?? null,
      actorMedecinId: actor.medecinId ?? null,
      actorSecretaireId: actor.secretaireId ?? null,
    };

    try {
      await prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO "RendezVousTransitionLog"
            ("rendezVousId", "fromStatut", "toStatut", "actorRole", "actorUserId", "reason", "metadata")
          VALUES
            (
              ${rendezVousId},
              CAST(${fromStatut} AS "StatutRendezVous"),
              CAST(${toStatut} AS "StatutRendezVous"),
              CAST(${actorRole} AS "Role"),
              ${actor.id ?? null},
              ${reason ?? null},
              CAST(${JSON.stringify(metadata)} AS jsonb)
            )
        `
      );
    } catch (error) {
      // Do not block business flow if migrations are not yet applied
      console.warn('[Audit] Impossible d\'écrire le log de transition RDV:', error);
    }
  }

  private assertOwnerForPatient(rdv: RendezVous, actor: TransitionActor) {
    if (actor.patientId !== rdv.patientId) {
      throw new ForbiddenError('Accès interdit pour ce rendez-vous');
    }
  }

  private assertOwnerForMedecin(rdv: RendezVous, actor: TransitionActor) {
    if (actor.medecinId !== rdv.medecinId) {
      throw new ForbiddenError('Accès interdit pour ce rendez-vous');
    }
  }

  private async assertOwnerForSecretaire(rdv: RendezVous, actor: TransitionActor) {
    if (!actor.secretaireId) {
      throw new ForbiddenError('Profil secrétaire requis');
    }

    const secretaire = await prisma.secretaire.findFirst({
      where: { id: actor.secretaireId, isArchived: false },
      select: { medecinId: true },
    });

    if (!secretaire?.medecinId || secretaire.medecinId !== rdv.medecinId) {
      throw new ForbiddenError('Accès interdit pour ce rendez-vous');
    }
  }

  private ensureCancellationReason(actor: TransitionActor, raison?: string) {
    if (actor.role === 'patient') return;
    if (!raison || !raison.trim()) {
      throw new BadRequestError('La raison de rejet/annulation est obligatoire');
    }
  }
  
  async create(data: {
    patientId: number;
    medecinId: number;
    date: Date;
    heure: string;
    type: string;
    motif?: string;
    prestation_type?: string;
    urgent_ia?: boolean;
  }) {
    // Vérifier si le médecin est disponible
    const isDisponible = await this.isMedecinDisponible(data.medecinId, data.date, data.heure);
    if (!isDisponible) {
      throw new BadRequestError('Le médecin n\'est pas disponible à cette heure');
    }

    return rendezVousRepository.create(data);
  }

  async isMedecinDisponible(medecinId: number, date: Date, heure: string): Promise<boolean> {
    const rdvExistants = await rendezVousRepository.findByDate(medecinId, date);
    return !rdvExistants.some(rdv => rdv.heure === heure);
  }

  async getCreneauxDisponibles(medecinId: number, date: Date): Promise<string[]> {
    const horaires = [
      '08:00', '09:00', '10:00', '11:00', '12:00',
      '14:00', '15:00', '16:00', '17:00'
    ];

    const rdvExistants = await rendezVousRepository.findByDate(medecinId, date);
    const heuresOccupees = rdvExistants.map(rdv => rdv.heure);

    return horaires.filter(h => !heuresOccupees.includes(h));
  }

  async peutAnnuler(rendezVousId: number): Promise<boolean> {
    const rdv = await rendezVousRepository.findById(rendezVousId);
    if (!rdv) throw new NotFoundError('Rendez-vous non trouvé');
    
    if (rdv.statut === StatutRendezVous.annule) return false;
    
    const datetime = new Date(`${new Date(rdv.date).toISOString().split('T')[0]}T${rdv.heure}`);
    const diffHeures = (datetime.getTime() - Date.now()) / (1000 * 60 * 60);
    
    return diffHeures >= 48;
  }

  async annuler(id: number) {
    return this.annulerAvecContexte(id, { role: 'admin' }, 'Annulation système');
  }

  async annulerAvecContexte(id: number, actor: TransitionActor, raison?: string) {
    const rdv = await this.findByIdOrThrow(id);
    this.assertTransitionAllowed(rdv.statut, StatutRendezVous.annule);
    this.ensureCancellationReason(actor, raison);

    if (actor.role === 'patient') {
      this.assertOwnerForPatient(rdv, actor);
      const peutAnnuler = await this.peutAnnuler(id);
      if (!peutAnnuler) {
        throw new BadRequestError('Impossible d\'annuler ce rendez-vous (délai < 48h)');
      }
    } else if (actor.role === 'medecin') {
      this.assertOwnerForMedecin(rdv, actor);
    } else if (actor.role === 'secretaire') {
      await this.assertOwnerForSecretaire(rdv, actor);
    } else if (!['secretaire', 'admin'].includes(actor.role)) {
      throw new ForbiddenError('Rôle non autorisé pour cette action');
    }

    const reasonValue = raison?.trim();
    const actorTrace = actor.id ? `${actor.role}#${actor.id}` : actor.role;

    const updated = await rendezVousRepository.update(id, {
      statut: StatutRendezVous.annule,
      raison_refus: reasonValue ? `[${actorTrace}] ${reasonValue}` : null,
    });

    await this.logTransition({
      rendezVousId: id,
      fromStatut: rdv.statut,
      toStatut: StatutRendezVous.annule,
      actor,
      reason: reasonValue,
    });

    return updated;
  }

  async confirmer(id: number, actor: TransitionActor = { role: 'secretaire' }) {
    const rdv = await this.findByIdOrThrow(id);
    this.assertTransitionAllowed(rdv.statut, StatutRendezVous.confirme);

    if (actor.role !== 'secretaire') {
      throw new ForbiddenError('Seule une secrétaire peut confirmer ce rendez-vous');
    }

    await this.assertOwnerForSecretaire(rdv, actor);

    const disponibilite = await this.getDisponibilitePourValidation(id);
    if (!disponibilite.available) {
      throw new BadRequestError(
        `Validation impossible: ${disponibilite.reason || 'médecin non disponible'}`
      );
    }

    const updated = await rendezVousRepository.update(id, { statut: StatutRendezVous.confirme, raison_refus: null });

    await this.logTransition({
      rendezVousId: id,
      fromStatut: rdv.statut,
      toStatut: StatutRendezVous.confirme,
      actor,
    });

    return updated;
  }

  async payer(id: number, actor: TransitionActor = { role: 'patient' }) {
    const rdv = await this.findByIdOrThrow(id);
    this.assertTransitionAllowed(rdv.statut, StatutRendezVous.paye);

    if (actor.role === 'patient') {
      this.assertOwnerForPatient(rdv, actor);
    } else if (actor.role === 'secretaire') {
      await this.assertOwnerForSecretaire(rdv, actor);
    } else if (!['admin', 'secretaire'].includes(actor.role)) {
      throw new ForbiddenError('Rôle non autorisé pour enregistrer ce paiement');
    }

    const updated = await rendezVousRepository.update(id, { statut: StatutRendezVous.paye });

    await this.logTransition({
      rendezVousId: id,
      fromStatut: rdv.statut,
      toStatut: StatutRendezVous.paye,
      actor,
    });

    return updated;
  }

  async findAll(options?: any) {
    return rendezVousRepository.findAll(options);
  }

  async findById(id: number) {
    return this.findByIdOrThrow(id);
  }

  async mesRendezVous(patientId: number) {
    return rendezVousRepository.findByPatient(patientId);
  }

  async medecinList(medecinId: number) {
    return rendezVousRepository.findByMedecin(medecinId);
  }

  async getStatsParType(): Promise<any> {
    const stats = await rendezVousRepository.getStatsParType();
    
    const result: any = {};
    stats.forEach((s: any) => {
      if (!result[s.type]) result[s.type] = {};
      result[s.type][s.statut] = s._count;
    });

    return result;
  }
}

export const rendezVousService = new RendezVousService();
