import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../../shared/utils/ApiResponse';
import { PaiementService } from '../services/paiement.service';
import { AuthRequest } from '../../../shared/middleware/auth.middleware';

export class PaiementController {
  private paiementService: PaiementService;

  constructor() {
    this.paiementService = new PaiementService();
    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
    this.getByPatientId = this.getByPatientId.bind(this);
    this.getByRendezVousId = this.getByRendezVousId.bind(this);
    this.create = this.create.bind(this);
    this.initiate = this.initiate.bind(this);
    this.pay = this.pay.bind(this);
    this.simulate = this.simulate.bind(this);
    this.update = this.update.bind(this);
    this.confirm = this.confirm.bind(this);
    this.fail = this.fail.bind(this);
    this.delete = this.delete.bind(this);
    this.downloadFacture = this.downloadFacture.bind(this);
    this.paydunyaWebhook = this.paydunyaWebhook.bind(this);
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthRequest;
      const paiements = await this.paiementService.findAll({
        role: authReq.user?.role || '',
        patientId: authReq.user?.patientId,
        medecinId: authReq.user?.medecinId,
        secretaireId: authReq.user?.secretaireId,
      });
      return res.status(200).json(ApiResponse.success(paiements, 'Paiements récupérés avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const paiement = await this.paiementService.findById(id, {
        role: req.user?.role || '',
        patientId: req.user?.patientId,
        medecinId: req.user?.medecinId,
        secretaireId: req.user?.secretaireId,
      });
      if (!paiement) {
        return res.status(404).json(ApiResponse.error('Paiement non trouvé', null, 404));
      }

      return res.status(200).json(ApiResponse.success(paiement, 'Paiement récupéré avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async getByPatientId(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const patientId = parseInt(req.params.patientId);
      const paiements = await this.paiementService.findByPatientId(patientId, {
        role: req.user?.role || '',
        patientId: req.user?.patientId,
        medecinId: req.user?.medecinId,
        secretaireId: req.user?.secretaireId,
      });
      return res.status(200).json(ApiResponse.success(paiements, 'Paiements du patient récupérés avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async getByRendezVousId(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const rendezVousId = parseInt(req.params.rendezVousId);
      const paiement = await this.paiementService.findByRendezVousId(rendezVousId, {
        role: req.user?.role || '',
        patientId: req.user?.patientId,
        medecinId: req.user?.medecinId,
        secretaireId: req.user?.secretaireId,
      });

      if (!paiement) {
        const ownerPatientId = await this.paiementService.findRendezVousOwnerPatientId(rendezVousId);
        if (!ownerPatientId) {
          return res.status(404).json(ApiResponse.error('Rendez-vous non trouvé', null, 404));
        }
        return res.status(404).json(ApiResponse.error('Paiement non trouvé', null, 404));
      }

      return res.status(200).json(ApiResponse.success(paiement, 'Paiement récupéré avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const paiement = await this.paiementService.create({
        ...req.body,
        role: req.user?.role,
      });
      return res.status(201).json(ApiResponse.created(paiement, 'Paiement créé avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async initiate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(ApiResponse.error('Non autorisé', null, 401));
      }

      const { rendezVousId, methode } = req.body;
      const paiement = await this.paiementService.initiateForPatient(userId, {
        rendezVousId: Number(rendezVousId),
        methode,
      });
      return res.status(201).json(ApiResponse.created(paiement, 'Paiement initié'));
    } catch (error) {
      next(error);
    }
  }

  async pay(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(ApiResponse.error('Non autorisé', null, 401));
      }

      const id = parseInt(req.params.id);
      const { confirmationCode } = req.body || {};
      const paiement = await this.paiementService.payForPatient(userId, id, confirmationCode);
      return res.status(200).json(ApiResponse.success(paiement, 'Paiement confirmé avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthRequest;
      const id = parseInt(req.params.id);
      const paiement = await this.paiementService.update(id, req.body, {
        role: authReq.user?.role || '',
        patientId: authReq.user?.patientId,
        medecinId: authReq.user?.medecinId,
        secretaireId: authReq.user?.secretaireId,
      });
      return res.status(200).json(ApiResponse.success(paiement, 'Paiement mis à jour avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async confirm(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthRequest;
      const id = parseInt(req.params.id);
      const paiement = await this.paiementService.confirm(id, {
        role: authReq.user?.role || '',
        patientId: authReq.user?.patientId,
        medecinId: authReq.user?.medecinId,
        secretaireId: authReq.user?.secretaireId,
      });
      return res.status(200).json(ApiResponse.success(paiement, 'Paiement confirmé avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async fail(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthRequest;
      const id = parseInt(req.params.id);
      const paiement = await this.paiementService.fail(id, {
        role: authReq.user?.role || '',
        patientId: authReq.user?.patientId,
        medecinId: authReq.user?.medecinId,
        secretaireId: authReq.user?.secretaireId,
      });
      return res.status(200).json(ApiResponse.success(paiement, 'Paiement marqué comme échoué'));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      await this.paiementService.delete(id);
      return res.status(200).json(ApiResponse.success(null, 'Paiement archivé avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async downloadFacture(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const result = await this.paiementService.generateFacturePdf(id, {
        role: req.user?.role || '',
        patientId: req.user?.patientId,
        medecinId: req.user?.medecinId,
        secretaireId: req.user?.secretaireId,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.status(200).send(result.buffer);
    } catch (error) {
      next(error);
    }
  }

  async simulate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(ApiResponse.error('Non autorisé', null, 401));
      }
      const { rendezVousId } = req.body || {};
      const paiement = await this.paiementService.simulate(userId, Number(rendezVousId));
      return res.status(200).json(ApiResponse.success(paiement, 'Paiement simulé avec succès'));
    } catch (error) {
      next(error);
    }
  }

  async paydunyaWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.paiementService.handlePaydunyaWebhook(req.body);
      return res.status(200).json(ApiResponse.success(result, 'Webhook PayDunya traité'));
    } catch (error) {
      next(error);
    }
  }
}

export default new PaiementController();
