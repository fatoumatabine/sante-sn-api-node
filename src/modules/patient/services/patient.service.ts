import { patientRepository } from '../repositories/patient.repository';
import { AppError } from '../../../shared/utils/AppError';

export class PatientService {
  async getPatientProfile(userId: number) {
    const patient = await patientRepository.findPatientByUserId(userId);
    if (!patient) {
      throw new AppError('Patient non trouvé', 404);
    }
    return patient;
  }

  async getMesRendezVous(userId: number) {
    const patient = await patientRepository.findPatientByUserId(userId);
    if (!patient) {
      throw new AppError('Patient non trouvé', 404);
    }
    return patientRepository.getPatientRendezVous(patient.id);
  }

  async getMesConsultations(userId: number) {
    const patient = await patientRepository.findPatientByUserId(userId);
    if (!patient) {
      throw new AppError('Patient non trouvé', 404);
    }
    return patientRepository.getPatientConsultations(patient.id);
  }

  async getDashboardSummary(userId: number) {
    const patient = await patientRepository.findPatientByUserId(userId);
    if (!patient) {
      throw new AppError('Patient non trouvé', 404);
    }
    return patientRepository.getPatientDashboard(patient.id);
  }

  async getMesPaiements(userId: number) {
    const patient = await patientRepository.findPatientByUserId(userId);
    if (!patient) {
      throw new AppError('Patient non trouvé', 404);
    }
    return patientRepository.getPatientPaiements(patient.id);
  }

  async updatePatientProfile(
    userId: number,
    data: { prenom?: string; nom?: string; telephone?: string; email?: string }
  ) {
    return patientRepository.updatePatientProfile(userId, data);
  }

  async createTriageEvaluation(
    userId: number,
    data: {
      responses: Record<string, string | string[]>;
      niveau: 'faible' | 'modere' | 'eleve';
      urgent: boolean;
      specialiteConseillee?: string;
      recommandations: string[];
    }
  ) {
    const patient = await patientRepository.findPatientByUserId(userId);
    if (!patient) {
      throw new AppError('Patient non trouvé', 404);
    }
    return patientRepository.createPatientTriageEvaluation(patient.id, data);
  }

  async getTriageHistory(userId: number, limit: number = 10) {
    const patient = await patientRepository.findPatientByUserId(userId);
    if (!patient) {
      throw new AppError('Patient non trouvé', 404);
    }
    return patientRepository.getPatientTriageHistory(patient.id, limit);
  }
}

export const patientService = new PatientService();
