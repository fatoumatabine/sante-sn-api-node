import { Role, User, Patient, Medecin, Secretaire } from '@prisma/client';

export type AuthUser = User & { avatarUrl?: string | null };
export type AuthUserWithRelations = AuthUser & {
  patient?: Patient | null;
  medecin?: Medecin | null;
  secretaire?: Secretaire | null;
};

export interface IAuthRepository {
  findUserByEmail(email: string): Promise<AuthUserWithRelations | null>;
  findUserById(id: number): Promise<AuthUser | null>;
  findUserByIdWithRelations(id: number): Promise<AuthUserWithRelations | null>;
  createUser(data: {
    email: string;
    password: string;
    name: string;
    role: Role;
  }): Promise<AuthUser>;
  createPatient(userId: number, data: {
    nom: string;
    prenom: string;
    telephone: string;
    date_naissance?: Date;
    adresse?: string;
    groupe_sanguin?: string;
    diabete?: boolean;
    hypertension?: boolean;
    hepatite?: boolean;
    autres_pathologies?: string;
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
  findByResetToken(tokenHash: string, now: Date): Promise<AuthUser | null>;
  clearResetToken(userId: number): Promise<void>;
}
