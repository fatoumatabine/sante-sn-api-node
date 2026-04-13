import { Response, NextFunction } from 'express';
import { prisma } from '../../../config/db';
import { rendezVousService } from '../../rendez-vous/services/rendez-vous.service';
import { AuthRequest } from '../../../shared/middleware/auth.middleware';

async function createRdvActionNotifications(params: {
  rendezVousId: number;
  statut: 'confirme' | 'annule';
  raison?: string;
}) {
  const { rendezVousId, statut, raison } = params;

  const rendezVous = await prisma.rendezVous.findUnique({
    where: { id: rendezVousId },
    include: {
      patient: true,
      medecin: true,
    },
  });

  if (!rendezVous) return;

  const isConfirmed = statut === 'confirme';
  const patientTitle = isConfirmed ? 'Rendez-vous confirmé' : 'Rendez-vous rejeté';
  const medecinTitle = isConfirmed ? 'Nouveau rendez-vous confirmé' : 'Rendez-vous annulé';

  const baseMessage = `RDV ${rendezVous.numero} le ${new Date(rendezVous.date).toLocaleDateString('fr-FR')} à ${rendezVous.heure}`;
  const patientMessage = isConfirmed
    ? `${baseMessage} a été confirmé par le secrétariat.`
    : `${baseMessage} a été rejeté${raison ? ` (${raison})` : ''}.`;
  const medecinMessage = isConfirmed
    ? `${baseMessage} est désormais confirmé et visible dans votre planning.`
    : `${baseMessage} a été annulé par le secrétariat.`;

  await prisma.notification.createMany({
    data: [
      {
        userId: rendezVous.patient.userId,
        titre: patientTitle,
        message: patientMessage,
        lu: false,
      },
      {
        userId: rendezVous.medecin.userId,
        titre: medecinTitle,
        message: medecinMessage,
        lu: false,
      },
    ],
  });
}

const denyAccess = (res: Response, message = 'Accès refusé') =>
  res.status(403).json({
    success: false,
    message,
  });

const emptyMedecinScope = { medecinId: -1 };

async function getSecretaireScope(req: AuthRequest) {
  const userId = req.user?.id;
  if (!userId) return null;

  return prisma.secretaire.findFirst({
    where: {
      userId,
      isArchived: false,
    },
    select: {
      id: true,
      medecinId: true,
    },
  });
}

async function enrichWithValidationAvailability<
  T extends { id: number; statut: string; medecinId: number; date: Date; heure: string }
>(items: T[]) {
  return Promise.all(
    items.map(async (item) => {
      if (item.statut !== 'en_attente') {
        return {
          ...item,
          canValidate: null,
          validationReason: null,
          disponibiliteValidation: null,
        };
      }

      const disponibiliteValidation = await rendezVousService.getDisponibilitePourCreneau({
        medecinId: item.medecinId,
        date: item.date,
        heure: item.heure,
        excludeRendezVousId: item.id,
      });

      return {
        ...item,
        canValidate: disponibiliteValidation.available,
        validationReason: disponibiliteValidation.reason,
        disponibiliteValidation,
      };
    })
  );
}

export const secretaireController = {
  async getDisponibiliteDemande(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const rdvId = parseInt(id, 10);
      const secretaire = await getSecretaireScope(req);

      if (!secretaire) {
        return denyAccess(res);
      }
      if (!secretaire.medecinId) {
        return denyAccess(res, 'Aucun médecin assigné');
      }

      const rendezVous = await prisma.rendezVous.findUnique({
        where: { id: rdvId },
        select: { medecinId: true },
      });
      if (!rendezVous) {
        return res.status(404).json({
          success: false,
          message: 'Rendez-vous non trouvé',
        });
      }
      if (rendezVous.medecinId !== secretaire.medecinId) {
        return denyAccess(res, 'Accès interdit pour ce rendez-vous');
      }

      const disponibilite = await rendezVousService.getDisponibilitePourValidation(rdvId);
      return res.json({
        success: true,
        data: disponibilite,
      });
    } catch (error) {
      next(error);
    }
  },

  // Récupérer tous les rendez-vous
  async getAllAppointments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const secretaire = await getSecretaireScope(req);
      if (!secretaire) {
        return denyAccess(res);
      }

      const appointments = await prisma.rendezVous.findMany({
        where: secretaire.medecinId ? { medecinId: secretaire.medecinId } : emptyMedecinScope,
        include: {
          patient: {
            include: {
              user: true,
            },
          },
          medecin: {
            include: {
              user: true
            }
          },
          consultation: true,
        },
        orderBy: {
          date: 'desc'
        }
      });

      const appointmentsWithAvailability = await enrichWithValidationAvailability(appointments);

      res.json({
        success: true,
        data: appointmentsWithAvailability
      });
    } catch (error) {
      next(error);
    }
  },

  // Récupérer les demandes de RDV en attente (utilise les RDV en_attente)
  async getDemandesRDV(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const secretaire = await getSecretaireScope(req);
      if (!secretaire) {
        return denyAccess(res);
      }

      // Les demandes sont les RDV en attente
      const demandes = await prisma.rendezVous.findMany({
        where: {
          statut: 'en_attente',
          medecinId: secretaire.medecinId || emptyMedecinScope.medecinId,
        },
        include: {
          patient: {
            include: {
              user: true,
            },
          },
          medecin: {
            include: {
              user: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const demandesWithAvailability = await enrichWithValidationAvailability(demandes);

      res.json({
        success: true,
        data: demandesWithAvailability
      });
    } catch (error) {
      next(error);
    }
  },

  // Récupérer les patients
  async getPatients(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const secretaire = await getSecretaireScope(req);
      if (!secretaire) {
        return denyAccess(res);
      }

      if (!secretaire.medecinId) {
        return res.json({
          success: true,
          data: [],
        });
      }

      const patients = await prisma.user.findMany({
        where: {
          role: 'patient',
          patient: {
            is: {
              isArchived: false,
              rendezVous: {
                some: {
                  medecinId: secretaire.medecinId,
                },
              },
            },
          },
        },
        include: {
          patient: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json({
        success: true,
        data: patients
      });
    } catch (error) {
      next(error);
    }
  },

  // Récupérer les médecins
  async getMedecins(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const secretaire = await getSecretaireScope(req);
      if (!secretaire) {
        return denyAccess(res);
      }

      if (!secretaire.medecinId) {
        return res.json({
          success: true,
          data: [],
        });
      }

      const medecins = await prisma.user.findMany({
        where: {
          role: 'medecin',
          medecin: {
            is: {
              id: secretaire.medecinId,
              isArchived: false,
            },
          },
        },
        include: {
          medecin: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json({
        success: true,
        data: medecins
      });
    } catch (error) {
      next(error);
    }
  },

  // Statistiques du dashboard secretary
  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const secretaire = await getSecretaireScope(req);
      if (!secretaire) {
        return denyAccess(res);
      }

      if (!secretaire.medecinId) {
        return res.json({
          success: true,
          data: {
            totalRendezVous: 0,
            rendezVousAujourdhui: 0,
            demandesEnAttente: 0,
            totalPatients: 0,
          },
        });
      }

      const whereByMedecin = { medecinId: secretaire.medecinId };

      const totalRendezVous = await prisma.rendezVous.count({
        where: whereByMedecin,
      });
      const rendezVousAujourdhui = await prisma.rendezVous.count({
        where: {
          ...whereByMedecin,
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }
      });
      const demandesEnAttente = await prisma.rendezVous.count({
        where: {
          ...whereByMedecin,
          statut: 'en_attente'
        }
      });
      const totalPatients = await prisma.patient.count({
        where: {
          isArchived: false,
          rendezVous: {
            some: whereByMedecin,
          },
        }
      });

      res.json({
        success: true,
        data: {
          totalRendezVous,
          rendezVousAujourdhui,
          demandesEnAttente,
          totalPatients
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Valider un rendez-vous (le passer à confirmé)
  async validerRendezVous(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const rdvId = parseInt(id, 10);

      const rendezVous = await rendezVousService.confirmer(rdvId, {
        id: req.user?.id,
        role: req.user?.role || 'secretaire',
        patientId: req.user?.patientId,
        medecinId: req.user?.medecinId,
        secretaireId: req.user?.secretaireId,
      });

      await createRdvActionNotifications({
        rendezVousId: rdvId,
        statut: 'confirme',
      });

      res.json({
        success: true,
        data: rendezVous,
        message: 'Rendez-vous validé'
      });
    } catch (error) {
      next(error);
    }
  },

  // Annuler un rendez-vous
  async rejeterRendezVous(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { raison } = req.body;
      const rdvId = parseInt(id, 10);

      const rendezVous = await rendezVousService.annulerAvecContexte(
        rdvId,
        {
          id: req.user?.id,
          role: req.user?.role || 'secretaire',
          patientId: req.user?.patientId,
          medecinId: req.user?.medecinId,
          secretaireId: req.user?.secretaireId,
        },
        raison
      );

      await createRdvActionNotifications({
        rendezVousId: rdvId,
        statut: 'annule',
        raison,
      });

      res.json({
        success: true,
        data: rendezVous,
        message: 'Rendez-vous annulé'
      });
    } catch (error) {
      next(error);
    }
  },

  // Annuler un rendez-vous
  async annulerRendezVous(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { raison } = req.body;
      const rdvId = parseInt(id, 10);

      const rendezVous = await rendezVousService.annulerAvecContexte(
        rdvId,
        {
          id: req.user?.id,
          role: req.user?.role || 'secretaire',
          patientId: req.user?.patientId,
          medecinId: req.user?.medecinId,
          secretaireId: req.user?.secretaireId,
        },
        raison
      );

      await createRdvActionNotifications({
        rendezVousId: rdvId,
        statut: 'annule',
        raison,
      });

      res.json({
        success: true,
        data: rendezVous,
        message: 'Rendez-vous annulé'
      });
    } catch (error) {
      next(error);
    }
  },

  // Confirmer un rendez-vous
  async confirmerRendezVous(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const rdvId = parseInt(id, 10);

      const rendezVous = await rendezVousService.confirmer(rdvId, {
        id: req.user?.id,
        role: req.user?.role || 'secretaire',
        patientId: req.user?.patientId,
        medecinId: req.user?.medecinId,
        secretaireId: req.user?.secretaireId,
      });

      await createRdvActionNotifications({
        rendezVousId: rdvId,
        statut: 'confirme',
      });

      res.json({
        success: true,
        data: rendezVous,
        message: 'Rendez-vous confirmé'
      });
    } catch (error) {
      next(error);
    }
  },

  // Valider une demande de RDV ( stesso que valider RDV)
  async validerDemande(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const rdvId = parseInt(id, 10);

      const rendezVous = await rendezVousService.confirmer(rdvId, {
        id: req.user?.id,
        role: req.user?.role || 'secretaire',
        patientId: req.user?.patientId,
        medecinId: req.user?.medecinId,
        secretaireId: req.user?.secretaireId,
      });

      await createRdvActionNotifications({
        rendezVousId: rdvId,
        statut: 'confirme',
      });

      res.json({
        success: true,
        data: rendezVous,
        message: 'Demande validée'
      });
    } catch (error) {
      next(error);
    }
  },

  // Rejeter une demande de RDV ( stesso qu'annuler)
  async rejeterDemande(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { raison } = req.body;
      const rdvId = parseInt(id, 10);

      const rendezVous = await rendezVousService.annulerAvecContexte(
        rdvId,
        {
          id: req.user?.id,
          role: req.user?.role || 'secretaire',
          patientId: req.user?.patientId,
          medecinId: req.user?.medecinId,
          secretaireId: req.user?.secretaireId,
        },
        raison
      );

      await createRdvActionNotifications({
        rendezVousId: rdvId,
        statut: 'annule',
        raison,
      });

      res.json({
        success: true,
        data: rendezVous,
        message: 'Demande rejetée'
      });
    } catch (error) {
      next(error);
    }
  }
};
