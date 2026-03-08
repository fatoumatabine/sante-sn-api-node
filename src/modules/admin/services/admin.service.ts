import { adminRepository } from '../repositories/admin.repository';

export class AdminService {
  async getMedecins() {
    return adminRepository.getAllMedecins();
  }

  async getSecretaires() {
    return adminRepository.getAllSecretaires();
  }

  async getPatients() {
    return adminRepository.getAllPatients();
  }

  async getStats() {
    return adminRepository.getStats();
  }
}

export const adminService = new AdminService();
