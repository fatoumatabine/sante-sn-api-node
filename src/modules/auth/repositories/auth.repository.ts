import prisma from '../../../config/db';
import { Role, User, Patient, Medecin, Secretaire } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { IAuthRepository } from './IAuthRepository';

export class AuthRepository implements IAuthRepository {
  async findUserByEmail(email: string): Promise<(User & { patient?: Patient | null; medecin?: Medecin | null; secretaire?: Secretaire | null }) | null> {
    const normalizedEmail = email.trim();
    return prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
        isArchived: false,
      },
      include: {
        patient: true,
        medecin: true,
        secretaire: true,
      },
    });
  }

  async findUserByIdWithRelations(id: number): Promise<(User & { patient?: Patient | null; medecin?: Medecin | null; secretaire?: Secretaire | null }) | null> {
    return prisma.user.findFirst({
      where: { id, isArchived: false },
      include: {
        patient: true,
        medecin: true,
        secretaire: true,
      },
    });
  }

  async findUserById(id: number): Promise<User | null> {
    return prisma.user.findFirst({
      where: { id, isArchived: false },
    });
  }

  async createUser(data: {
    email: string;
    password: string;
    name: string;
    role: Role;
  }): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 12);
    
    return prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  }

  async createPatient(userId: number, data: {
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
  }): Promise<Patient> {
    return prisma.patient.create({
      data: {
        userId,
        nom: data.nom,
        prenom: data.prenom,
        telephone: data.telephone,
        date_naissance: data.date_naissance,
        adresse: data.adresse,
        groupe_sanguin: data.groupe_sanguin,
        diabete: data.diabete,
        hypertension: data.hypertension,
        hepatite: data.hepatite,
        autres_pathologies: data.autres_pathologies,
      },
    });
  }

  async createMedecin(userId: number, data: {
    nom: string;
    prenom: string;
    telephone: string;
    specialite: string;
    tarif_consultation?: number;
  }): Promise<Medecin> {
    return prisma.medecin.create({
      data: {
        userId,
        nom: data.nom,
        prenom: data.prenom,
        telephone: data.telephone,
        specialite: data.specialite,
        tarif_consultation: data.tarif_consultation || 0,
      },
    });
  }

  async updatePassword(userId: number, newPassword: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    return prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  async setResetToken(userId: number, tokenHash: string, expiresAt: Date): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        rememberToken: `${tokenHash}:${expiresAt.getTime()}`,
      },
    });
  }

  async findByResetToken(tokenHash: string, now: Date): Promise<User | null> {
    const user = await prisma.user.findFirst({
      where: {
        rememberToken: {
          startsWith: `${tokenHash}:`,
        },
        isArchived: false,
      },
    });

    if (!user?.rememberToken) {
      return null;
    }

    const expiresRaw = user.rememberToken.split(':')[1];
    const expiresAtMs = Number(expiresRaw);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now.getTime()) {
      return null;
    }

    return user;
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async createSecretaire(userId: number, data: {
    nom: string;
    prenom: string;
    telephone: string;
  }): Promise<Secretaire> {
    return prisma.secretaire.create({
      data: {
        userId,
        nom: data.nom,
        prenom: data.prenom,
        telephone: data.telephone,
      },
    });
  }

  async clearResetToken(userId: number): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        rememberToken: null,
      },
    });
  }
}

export const authRepository = new AuthRepository();
