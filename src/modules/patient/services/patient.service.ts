import { patientRepository } from '../repositories/patient.repository';
import { AppError } from '../../../shared/utils/AppError';
import { patientTriageAiService } from './patient-triage-ai.service';

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

  async getPatientMedicalRecord(userId: number) {
    const patient = await patientRepository.findPatientByUserId(userId);
    if (!patient) {
      throw new AppError('Patient non trouvé', 404);
    }
    return patientRepository.getPatientMedicalRecord(patient.id);
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
    data: { prenom?: string; nom?: string; telephone?: string; email?: string; avatarUrl?: string | null }
  ) {
    return patientRepository.updatePatientProfile(userId, data);
  }

  async runTriageEvaluation(
    userId: number,
    data: {
      responses: Record<string, string | string[]>;
      contexteLibre?: string;
    }
  ) {
    const patient = await patientRepository.findPatientByUserId(userId);
    if (!patient) {
      throw new AppError('Patient non trouvé', 404);
    }

    const availableSpecialties = await patientRepository.listActiveSpecialites();
    const triage = await patientTriageAiService.runEvaluation({
      patientProfile: {
        dateNaissance: patient.date_naissance,
        groupeSanguin: patient.groupe_sanguin,
        diabete: patient.diabete,
        hypertension: patient.hypertension,
        hepatite: patient.hepatite,
        autresPathologies: patient.autres_pathologies,
      },
      responses: data.responses,
      contexteLibre: data.contexteLibre,
      availableSpecialties,
    });

    return patientRepository.createPatientTriageEvaluation(patient.id, {
      responses: data.responses,
      niveau: triage.niveau,
      urgent: triage.urgent,
      specialiteConseillee: triage.specialiteConseillee || undefined,
      recommandations: triage.recommandations,
      redFlags: triage.redFlags,
      needsHumanReview: triage.needsHumanReview,
      orientation: triage.orientation,
      aiModel: triage.aiModel,
    });
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
