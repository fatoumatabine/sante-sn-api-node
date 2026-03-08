import { Role, User, Patient, Medecin, Secretaire } from '@prisma/client';

export interface IAuthRepository {
  findUserByEmail(email: string): Promise<(User & { patient?: Patient | null; medecin?: Medecin | null; secretaire?: Secretaire | null }) | null>;
  findUserById(id: number): Promise<User | null>;
  findUserByIdWithRelations(id: number): Promise<(User & { patient?: Patient | null; medecin?: Medecin | null; secretaire?: Secretaire | null }) | null>;
  createUser(data: {
    email: string;
    password: string;
    name: string;
    role: Role;
  }): Promise<User>;
  createPatient(userId: number, data: {
    nom: string;
    prenom: string;
    telephone: string;
  }): Promise<Patient>;
  createMedecin(userId: number, data: {
    nom: string;
    prenom: string;
    telephone: string;
    specialite: string;
    tarif_consultation?: number;
  }): Promise<Medecin>;
  createSecretaire(userId: number, data: {
    nom: string;
    prenom: string;
    telephone: string;
  }): Promise<Secretaire>;
  verifyPassword(password: string, hashedPassword: string): Promise<boolean>;
  updatePassword(userId: number, newPassword: string): Promise<User>;
  setResetToken(userId: number, tokenHash: string, expiresAt: Date): Promise<void>;
  findByResetToken(tokenHash: string, now: Date): Promise<User | null>;
  clearResetToken(userId: number): Promise<void>;
}
