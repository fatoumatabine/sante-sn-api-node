import {
  PrismaClient,
  Role,
  StatutConsultation,
  StatutPaiement,
  StatutRendezVous,
  TypeRendezVous,
  User,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'password123';

type DemoUserSeed = {
  email: string;
  name: string;
  role: Role;
};

type DemoDoctorSeed = {
  key: string;
  user: DemoUserSeed;
  nom: string;
  prenom: string;
  specialite: string;
  telephone: string;
  adresse: string;
  tarifConsultation: number;
};

type DemoSecretarySeed = {
  user: DemoUserSeed;
  nom: string;
  prenom: string;
  telephone: string;
  medecinKey: string;
};

type DemoPatientSeed = {
  key: string;
  user: DemoUserSeed;
  nom: string;
  prenom: string;
  telephone: string;
  dateNaissance: Date;
  adresse: string;
  groupeSanguin: string;
  diabete: boolean;
  hypertension: boolean;
  hepatite: boolean;
  autresPathologies: string | null;
};

const DEMO_ADMIN: DemoUserSeed = {
  email: 'admin.santesn@gmail.com',
  name: 'Admin Principal',
  role: Role.admin,
};

const DEMO_DOCTORS: DemoDoctorSeed[] = [
  {
    key: 'male',
    user: {
      email: 'dr.maley@gmail.com',
      name: 'Dr Male',
      role: Role.medecin,
    },
    nom: 'Male',
    prenom: 'Youssou',
    specialite: 'Cardiologie',
    telephone: '221771234567',
    adresse: 'Dakar, Senegal',
    tarifConsultation: 25000,
  },
  {
    key: 'diop',
    user: {
      email: 'dr.diop@gmail.com',
      name: 'Dr Diop',
      role: Role.medecin,
    },
    nom: 'Diop',
    prenom: 'Moussa',
    specialite: 'Dermatologie',
    telephone: '221771234568',
    adresse: 'Dakar, Senegal',
    tarifConsultation: 20000,
  },
  {
    key: 'sall',
    user: {
      email: 'dr.sall@gmail.com',
      name: 'Dr Sall',
      role: Role.medecin,
    },
    nom: 'Sall',
    prenom: 'Mamadou',
    specialite: 'Generaliste',
    telephone: '221771234569',
    adresse: 'Thies, Senegal',
    tarifConsultation: 15000,
  },
  {
    key: 'faye',
    user: {
      email: 'dr.oumar.faye@santesn.demo',
      name: 'Dr Oumar Faye',
      role: Role.medecin,
    },
    nom: 'Faye',
    prenom: 'Oumar',
    specialite: 'Pediatrie',
    telephone: '221771234570',
    adresse: 'Saint-Louis, Senegal',
    tarifConsultation: 18000,
  },
  {
    key: 'ba',
    user: {
      email: 'dr.khady.ba@santesn.demo',
      name: 'Dr Khady Ba',
      role: Role.medecin,
    },
    nom: 'Ba',
    prenom: 'Khady',
    specialite: 'Gynecologie',
    telephone: '221771234571',
    adresse: 'Kaolack, Senegal',
    tarifConsultation: 22000,
  },
];

const DEMO_SECRETARIES: DemoSecretarySeed[] = [
  {
    user: {
      email: 'fatou@gmail.com',
      name: 'Fatou Secretaire',
      role: Role.secretaire,
    },
    nom: 'Seck',
    prenom: 'Fatou',
    telephone: '221771111111',
    medecinKey: 'male',
  },
  {
    user: {
      email: 'mariam@gmail.com',
      name: 'Mariam Secretaire',
      role: Role.secretaire,
    },
    nom: 'Toure',
    prenom: 'Mariam',
    telephone: '221771111112',
    medecinKey: 'diop',
  },
  {
    user: {
      email: 'aminata.cisse@santesn.demo',
      name: 'Aminata Cisse',
      role: Role.secretaire,
    },
    nom: 'Cisse',
    prenom: 'Aminata',
    telephone: '221771111113',
    medecinKey: 'faye',
  },
  {
    user: {
      email: 'astou.sow@santesn.demo',
      name: 'Astou Sow',
      role: Role.secretaire,
    },
    nom: 'Sow',
    prenom: 'Astou',
    telephone: '221771111114',
    medecinKey: 'ba',
  },
];

const DEMO_PATIENTS: DemoPatientSeed[] = [
  {
    key: 'patient1',
    user: {
      email: 'patient1@gmail.com',
      name: 'Patient Test 1',
      role: Role.patient,
    },
    nom: 'Diallo',
    prenom: 'Amadou',
    telephone: '221771222222',
    dateNaissance: new Date('1990-05-15'),
    adresse: 'Dakar, Senegal',
    groupeSanguin: 'O+',
    diabete: false,
    hypertension: true,
    hepatite: false,
    autresPathologies: 'Asthme leger',
  },
  {
    key: 'patient2',
    user: {
      email: 'patient2@gmail.com',
      name: 'Patient Test 2',
      role: Role.patient,
    },
    nom: 'Ndiaye',
    prenom: 'Aicha',
    telephone: '221771222223',
    dateNaissance: new Date('1985-08-22'),
    adresse: 'Pikine, Senegal',
    groupeSanguin: 'A+',
    diabete: true,
    hypertension: false,
    hepatite: false,
    autresPathologies: null,
  },
  {
    key: 'patient3',
    user: {
      email: 'patient3@gmail.com',
      name: 'Patient Test 3',
      role: Role.patient,
    },
    nom: 'Sarr',
    prenom: 'Moussa',
    telephone: '221771222224',
    dateNaissance: new Date('1978-12-10'),
    adresse: 'Guediawaye, Senegal',
    groupeSanguin: 'B+',
    diabete: false,
    hypertension: true,
    hepatite: true,
    autresPathologies: 'Hepatite B chronique',
  },
  {
    key: 'patient4',
    user: {
      email: 'patient4@gmail.com',
      name: 'Patient Test 4',
      role: Role.patient,
    },
    nom: 'Ba',
    prenom: 'Fatou',
    telephone: '221771222225',
    dateNaissance: new Date('1995-03-25'),
    adresse: 'Dakar, Senegal',
    groupeSanguin: 'AB+',
    diabete: false,
    hypertension: false,
    hepatite: false,
    autresPathologies: null,
  },
  {
    key: 'patient5',
    user: {
      email: 'patient5@gmail.com',
      name: 'Patient Test 5',
      role: Role.patient,
    },
    nom: 'Sene',
    prenom: 'Ousmane',
    telephone: '221771222226',
    dateNaissance: new Date('1982-07-08'),
    adresse: 'Thies, Senegal',
    groupeSanguin: 'O-',
    diabete: true,
    hypertension: true,
    hepatite: false,
    autresPathologies: 'Diabete type 2, Hypertension',
  },
  {
    key: 'patient6',
    user: {
      email: 'aissatou.ndour@santesn.demo',
      name: 'Aissatou Ndour',
      role: Role.patient,
    },
    nom: 'Ndour',
    prenom: 'Aissatou',
    telephone: '221771222227',
    dateNaissance: new Date('1992-11-04'),
    adresse: 'Mbour, Senegal',
    groupeSanguin: 'A-',
    diabete: false,
    hypertension: false,
    hepatite: false,
    autresPathologies: 'Grossesse suivie',
  },
  {
    key: 'patient7',
    user: {
      email: 'cheikh.niane@santesn.demo',
      name: 'Cheikh Niane',
      role: Role.patient,
    },
    nom: 'Niane',
    prenom: 'Cheikh',
    telephone: '221771222228',
    dateNaissance: new Date('2001-02-17'),
    adresse: 'Saint-Louis, Senegal',
    groupeSanguin: 'B-',
    diabete: false,
    hypertension: false,
    hepatite: false,
    autresPathologies: null,
  },
  {
    key: 'patient8',
    user: {
      email: 'adama.gueye@santesn.demo',
      name: 'Adama Gueye',
      role: Role.patient,
    },
    nom: 'Gueye',
    prenom: 'Adama',
    telephone: '221771222229',
    dateNaissance: new Date('1974-09-30'),
    adresse: 'Kaolack, Senegal',
    groupeSanguin: 'O+',
    diabete: false,
    hypertension: true,
    hepatite: false,
    autresPathologies: 'Insuffisance renale legere',
  },
  {
    key: 'patient9',
    user: {
      email: 'sokhna.fall@santesn.demo',
      name: 'Sokhna Fall',
      role: Role.patient,
    },
    nom: 'Fall',
    prenom: 'Sokhna',
    telephone: '221771222230',
    dateNaissance: new Date('1988-01-12'),
    adresse: 'Ziguinchor, Senegal',
    groupeSanguin: 'AB-',
    diabete: true,
    hypertension: false,
    hepatite: false,
    autresPathologies: 'Suivi endocrinologique',
  },
  {
    key: 'patient10',
    user: {
      email: 'pape.sarr@santesn.demo',
      name: 'Pape Sarr',
      role: Role.patient,
    },
    nom: 'Sarr',
    prenom: 'Pape',
    telephone: '221771222231',
    dateNaissance: new Date('1997-06-21'),
    adresse: 'Touba, Senegal',
    groupeSanguin: 'O+',
    diabete: false,
    hypertension: false,
    hepatite: false,
    autresPathologies: 'Allergie saisonniere',
  },
];

const DEMO_MEDICATIONS = [
  { nom: 'Paracetamol', forme: 'Comprime', dosage: '500mg' },
  { nom: 'Amoxicilline', forme: 'Gelule', dosage: '500mg' },
  { nom: 'Aspirine', forme: 'Comprime', dosage: '100mg' },
  { nom: 'Metformine', forme: 'Comprime', dosage: '850mg' },
  { nom: 'Captopril', forme: 'Comprime', dosage: '25mg' },
  { nom: 'Ibuprofene', forme: 'Comprime', dosage: '400mg' },
];

async function ensureUser(data: DemoUserSeed, hashedPassword: string) {
  return prisma.user.upsert({
    where: { email: data.email },
    update: {
      name: data.name,
      role: data.role,
      emailVerifiedAt: new Date(),
      isArchived: false,
      archivedAt: null,
    },
    create: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: data.role,
      emailVerifiedAt: new Date(),
    },
  });
}

async function ensureMedication(nom: string, forme: string, dosage: string) {
  const existing = await prisma.medicament.findFirst({
    where: { nom, forme, dosage },
  });

  if (existing) {
    return existing;
  }

  return prisma.medicament.create({
    data: { nom, forme, dosage },
  });
}

async function ensureNotification(userId: number, titre: string, message: string, lu: boolean) {
  const existing = await prisma.notification.findFirst({
    where: { userId, titre, message },
  });

  if (existing) {
    return prisma.notification.update({
      where: { id: existing.id },
      data: { lu, isArchived: false, archivedAt: null },
    });
  }

  return prisma.notification.create({
    data: { userId, titre, message, lu },
  });
}

async function main() {
  console.log('Starting safe deploy seed...');

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

  const adminUser = await ensureUser(DEMO_ADMIN, hashedPassword);

  const doctorUsers = new Map<string, User>();
  for (const doctor of DEMO_DOCTORS) {
    doctorUsers.set(doctor.key, await ensureUser(doctor.user, hashedPassword));
  }

  const secretaryUsers = new Map<string, User>();
  for (const secretary of DEMO_SECRETARIES) {
    secretaryUsers.set(secretary.user.email, await ensureUser(secretary.user, hashedPassword));
  }

  const patientUsers = new Map<string, User>();
  for (const patient of DEMO_PATIENTS) {
    patientUsers.set(patient.key, await ensureUser(patient.user, hashedPassword));
  }

  const doctors = new Map<string, number>();
  for (const doctor of DEMO_DOCTORS) {
    const user = doctorUsers.get(doctor.key);
    if (!user) {
      throw new Error(`Missing seeded doctor user for key ${doctor.key}`);
    }

    const medecin = await prisma.medecin.upsert({
      where: { userId: user.id },
      update: {
        nom: doctor.nom,
        prenom: doctor.prenom,
        specialite: doctor.specialite,
        telephone: doctor.telephone,
        adresse: doctor.adresse,
        tarif_consultation: doctor.tarifConsultation,
        isArchived: false,
        archivedAt: null,
      },
      create: {
        userId: user.id,
        nom: doctor.nom,
        prenom: doctor.prenom,
        specialite: doctor.specialite,
        telephone: doctor.telephone,
        adresse: doctor.adresse,
        tarif_consultation: doctor.tarifConsultation,
      },
    });

    doctors.set(doctor.key, medecin.id);
  }

  for (const secretary of DEMO_SECRETARIES) {
    const user = secretaryUsers.get(secretary.user.email);
    const medecinId = doctors.get(secretary.medecinKey);

    if (!user || !medecinId) {
      throw new Error(`Missing relation for secretary ${secretary.user.email}`);
    }

    await prisma.secretaire.upsert({
      where: { userId: user.id },
      update: {
        medecinId,
        nom: secretary.nom,
        prenom: secretary.prenom,
        telephone: secretary.telephone,
        isArchived: false,
        archivedAt: null,
      },
      create: {
        userId: user.id,
        medecinId,
        nom: secretary.nom,
        prenom: secretary.prenom,
        telephone: secretary.telephone,
      },
    });
  }

  const patients = new Map<string, number>();
  for (const patient of DEMO_PATIENTS) {
    const user = patientUsers.get(patient.key);
    if (!user) {
      throw new Error(`Missing seeded patient user for key ${patient.key}`);
    }

    const patientRow = await prisma.patient.upsert({
      where: { userId: user.id },
      update: {
        nom: patient.nom,
        prenom: patient.prenom,
        telephone: patient.telephone,
        date_naissance: patient.dateNaissance,
        adresse: patient.adresse,
        groupe_sanguin: patient.groupeSanguin,
        diabete: patient.diabete,
        hypertension: patient.hypertension,
        hepatite: patient.hepatite,
        autres_pathologies: patient.autresPathologies,
        isArchived: false,
        archivedAt: null,
      },
      create: {
        userId: user.id,
        nom: patient.nom,
        prenom: patient.prenom,
        telephone: patient.telephone,
        date_naissance: patient.dateNaissance,
        adresse: patient.adresse,
        groupe_sanguin: patient.groupeSanguin,
        diabete: patient.diabete,
        hypertension: patient.hypertension,
        hepatite: patient.hepatite,
        autres_pathologies: patient.autresPathologies,
      },
    });

    patients.set(patient.key, patientRow.id);
  }

  const medications = new Map<string, number>();
  for (const medication of DEMO_MEDICATIONS) {
    const medicationRow = await ensureMedication(
      medication.nom,
      medication.forme,
      medication.dosage
    );
    medications.set(`${medication.nom}|${medication.forme}|${medication.dosage}`, medicationRow.id);
  }

  const jours = [1, 2, 3, 4, 5];
  const heures = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00'];

  for (const medecinId of doctors.values()) {
    for (const jour of jours) {
      for (const heure of heures) {
        await prisma.creneauDisponible.upsert({
          where: {
            medecinId_jour_heure: {
              medecinId,
              jour,
              heure,
            },
          },
          update: { actif: true },
          create: {
            medecinId,
            jour,
            heure,
            actif: true,
          },
        });
      }
    }
  }

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(14, 0, 0, 0);

  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  twoDaysAgo.setHours(14, 0, 0, 0);

  const rdv1 = await prisma.rendezVous.upsert({
    where: { numero: 'RDV-SEED-001' },
    update: {
      date: tomorrow,
      heure: '09:00',
      patientId: patients.get('patient1')!,
      medecinId: doctors.get('male')!,
      type: TypeRendezVous.presentiel,
      statut: StatutRendezVous.en_attente,
      motif: 'Consultation cardiologique de controle',
      raison_refus: null,
      prestation_type: null,
    },
    create: {
      numero: 'RDV-SEED-001',
      date: tomorrow,
      heure: '09:00',
      patientId: patients.get('patient1')!,
      medecinId: doctors.get('male')!,
      type: TypeRendezVous.presentiel,
      statut: StatutRendezVous.en_attente,
      motif: 'Consultation cardiologique de controle',
    },
  });

  const rdv2 = await prisma.rendezVous.upsert({
    where: { numero: 'RDV-SEED-002' },
    update: {
      date: tomorrow,
      heure: '10:30',
      patientId: patients.get('patient2')!,
      medecinId: doctors.get('male')!,
      type: TypeRendezVous.presentiel,
      statut: StatutRendezVous.confirme,
      motif: 'Suivi diabete et tension',
      raison_refus: null,
      prestation_type: null,
    },
    create: {
      numero: 'RDV-SEED-002',
      date: tomorrow,
      heure: '10:30',
      patientId: patients.get('patient2')!,
      medecinId: doctors.get('male')!,
      type: TypeRendezVous.presentiel,
      statut: StatutRendezVous.confirme,
      motif: 'Suivi diabete et tension',
    },
  });

  const rdv3 = await prisma.rendezVous.upsert({
    where: { numero: 'RDV-SEED-003' },
    update: {
      date: twoDaysAgo,
      heure: '14:00',
      patientId: patients.get('patient3')!,
      medecinId: doctors.get('diop')!,
      type: TypeRendezVous.en_ligne,
      statut: StatutRendezVous.termine,
      motif: 'Consultation dermatologique',
      raison_refus: null,
      prestation_type: null,
    },
    create: {
      numero: 'RDV-SEED-003',
      date: twoDaysAgo,
      heure: '14:00',
      patientId: patients.get('patient3')!,
      medecinId: doctors.get('diop')!,
      type: TypeRendezVous.en_ligne,
      statut: StatutRendezVous.termine,
      motif: 'Consultation dermatologique',
    },
  });

  const rdv4 = await prisma.rendezVous.upsert({
    where: { numero: 'RDV-SEED-004' },
    update: {
      date: nextWeek,
      heure: '09:30',
      patientId: patients.get('patient5')!,
      medecinId: doctors.get('male')!,
      type: TypeRendezVous.presentiel,
      statut: StatutRendezVous.paye,
      motif: 'Bilan de sante complet',
      raison_refus: null,
      prestation_type: null,
    },
    create: {
      numero: 'RDV-SEED-004',
      date: nextWeek,
      heure: '09:30',
      patientId: patients.get('patient5')!,
      medecinId: doctors.get('male')!,
      type: TypeRendezVous.presentiel,
      statut: StatutRendezVous.paye,
      motif: 'Bilan de sante complet',
    },
  });

  await prisma.consultation.upsert({
    where: { rendezVousId: rdv3.id },
    update: {
      patientId: patients.get('patient3')!,
      medecinId: doctors.get('diop')!,
      date: twoDaysAgo,
      heure: '14:00',
      type: 'en_ligne',
      statut: StatutConsultation.termine,
      constantes: {
        tension: '120/80',
        temperature: '37.2',
        poids: 75,
        taille: 175,
      },
      diagnostic: 'Dermatite allergique legere',
      observations: 'Traitement symptomatique recommande.',
      isArchived: false,
      archivedAt: null,
    },
    create: {
      rendezVousId: rdv3.id,
      patientId: patients.get('patient3')!,
      medecinId: doctors.get('diop')!,
      date: twoDaysAgo,
      heure: '14:00',
      type: 'en_ligne',
      statut: StatutConsultation.termine,
      constantes: {
        tension: '120/80',
        temperature: '37.2',
        poids: 75,
        taille: 175,
      },
      diagnostic: 'Dermatite allergique legere',
      observations: 'Traitement symptomatique recommande.',
    },
  });

  const consultation = await prisma.consultation.findUnique({
    where: { rendezVousId: rdv3.id },
  });

  if (!consultation) {
    throw new Error('Missing seeded consultation for RDV-SEED-003');
  }

  const ordonnance = await prisma.ordonnance.upsert({
    where: { consultationId: consultation.id },
    update: {
      patientId: patients.get('patient3')!,
      medecinId: doctors.get('diop')!,
      contenu: 'Traitement dermatologique pour allergie cutanee',
      isArchived: false,
      archivedAt: null,
    },
    create: {
      consultationId: consultation.id,
      patientId: patients.get('patient3')!,
      medecinId: doctors.get('diop')!,
      contenu: 'Traitement dermatologique pour allergie cutanee',
    },
  });

  const paracetamolId = medications.get('Paracetamol|Comprime|500mg');
  const ibuprofeneId = medications.get('Ibuprofene|Comprime|400mg');

  if (!paracetamolId || !ibuprofeneId) {
    throw new Error('Missing seeded medications for ordonnance');
  }

  await prisma.medicamentOnOrdonnance.upsert({
    where: {
      ordonnanceId_medicamentId: {
        ordonnanceId: ordonnance.id,
        medicamentId: paracetamolId,
      },
    },
    update: {
      posologie: '1 comprime 3x/jour',
      duree: '5 jours',
      quantite: 15,
    },
    create: {
      ordonnanceId: ordonnance.id,
      medicamentId: paracetamolId,
      posologie: '1 comprime 3x/jour',
      duree: '5 jours',
      quantite: 15,
    },
  });

  await prisma.medicamentOnOrdonnance.upsert({
    where: {
      ordonnanceId_medicamentId: {
        ordonnanceId: ordonnance.id,
        medicamentId: ibuprofeneId,
      },
    },
    update: {
      posologie: '1 comprime 2x/jour',
      duree: '3 jours',
      quantite: 6,
    },
    create: {
      ordonnanceId: ordonnance.id,
      medicamentId: ibuprofeneId,
      posologie: '1 comprime 2x/jour',
      duree: '3 jours',
      quantite: 6,
    },
  });

  await prisma.paiement.upsert({
    where: { rendezVousId: rdv2.id },
    update: {
      patientId: patients.get('patient2')!,
      montant: 20000,
      methode: 'Carte bancaire',
      statut: StatutPaiement.en_attente,
      transactionId: null,
      date_paiement: null,
      isArchived: false,
      archivedAt: null,
    },
    create: {
      patientId: patients.get('patient2')!,
      rendezVousId: rdv2.id,
      montant: 20000,
      methode: 'Carte bancaire',
      statut: StatutPaiement.en_attente,
    },
  });

  await prisma.paiement.upsert({
    where: { rendezVousId: rdv4.id },
    update: {
      patientId: patients.get('patient5')!,
      montant: 25000,
      methode: 'Mobile Money',
      statut: StatutPaiement.paye,
      transactionId: 'SEED-TXN-002',
      date_paiement: new Date(),
      isArchived: false,
      archivedAt: null,
    },
    create: {
      patientId: patients.get('patient5')!,
      rendezVousId: rdv4.id,
      montant: 25000,
      methode: 'Mobile Money',
      statut: StatutPaiement.paye,
      transactionId: 'SEED-TXN-002',
      date_paiement: new Date(),
    },
  });

  await ensureNotification(
    patientUsers.get('patient1')!.id,
    '[Seed] Rendez-vous confirme',
    'Votre rendez-vous de demonstration est disponible dans votre espace patient.',
    false
  );

  await ensureNotification(
    doctorUsers.get('male')!.id,
    '[Seed] Nouveau patient',
    'Le compte de demonstration patient1@gmail.com est pret a etre consulte.',
    false
  );

  await ensureNotification(
    adminUser.id,
    '[Seed] Demo data active',
    'Les comptes et donnees de demonstration ont ete verifies sur cet environnement.',
    true
  );

  console.log('Safe deploy seed completed.');
  console.log(`Admin: ${DEMO_ADMIN.email} / ${DEMO_PASSWORD}`);
  for (const doctor of DEMO_DOCTORS) {
    console.log(`Medecin: ${doctor.user.email} / ${DEMO_PASSWORD}`);
  }
  for (const secretary of DEMO_SECRETARIES) {
    console.log(`Secretaire: ${secretary.user.email} / ${DEMO_PASSWORD}`);
  }
  for (const patient of DEMO_PATIENTS) {
    console.log(`Patient: ${patient.user.email} / ${DEMO_PASSWORD}`);
  }
}

main()
  .catch((error) => {
    console.error('Safe deploy seed error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
