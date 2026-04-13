import { medecinRepository } from '../repositories/medecin.repository';
import { NotFoundError, BadRequestError } from '../../../shared/utils/AppError';

export class MedecinService {
  async findAll(options?: { page?: number; limit?: number; specialite?: string }) {
    return medecinRepository.findAll(options);
  }

  async findById(id: number) {
    const medecin = await medecinRepository.findById(id);
    if (!medecin) {
      throw new NotFoundError('Médecin non trouvé');
    }
    return medecin;
  }

  async findByUserId(userId: number) {
    const medecin = await medecinRepository.findByUserId(userId);
    if (!medecin) {
      throw new NotFoundError('Profil médecin non trouvé');
    }
    return medecin;
  }

  async findBySpecialite(specialite: string) {
    return medecinRepository.findBySpecialite(specialite);
  }

  async getSpecialites() {
    return medecinRepository.getSpecialites();
  }

  async getPublicCatalog() {
    return medecinRepository.getPublicCatalog();
  }

  async create(data: {
    userId: number;
    nom: string;
    prenom: string;
    specialite: string;
    telephone: string;
    adresse?: string;
    tarif_consultation?: number;
  }) {
    return medecinRepository.create(data);
  }

  async update(id: number, data: any) {
    const medecin = await medecinRepository.findById(id);
    if (!medecin) {
      throw new NotFoundError('Médecin non trouvé');
    }
    return medecinRepository.update(id, data);
  }

  async delete(id: number) {
    const medecin = await medecinRepository.findById(id);
    if (!medecin) {
      throw new NotFoundError('Médecin non trouvé');
    }
    return medecinRepository.delete(id);
  }
}

export const medecinService = new MedecinService();
