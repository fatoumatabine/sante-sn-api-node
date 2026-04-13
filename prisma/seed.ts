import { PrismaClient, Role, StatutRendezVous, TypeRendezVous, StatutConsultation, StatutPaiement, StatutPrestation } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Nettoyer les données existantes
  console.log('🧹 Cleaning existing data...');
  await prisma.medicamentOnOrdonnance.deleteMany();
  await prisma.ordonnance.deleteMany();
  await prisma.prestation.deleteMany();
  await prisma.paiement.deleteMany();
  await prisma.consultation.deleteMany();
  await prisma.rendezVous.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.creneauDisponible.deleteMany();
  await prisma.medicament.deleteMany();
  await prisma.secretaire.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.medecin.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Database cleaned');

  // Hasher le mot de passe
  const hashedPassword = await bcrypt.hash('password123', 10);

  // ==================== CREATION DES UTILISATEURS ====================
  console.log('👥 Creating users...');

  // Admin
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin.santesn@gmail.com',
      password: hashedPassword,
      name: 'Admin Principal',
      role: Role.admin,
      emailVerifiedAt: new Date(),
    },
  });
  console.log('✅ Admin user created');

  // Médecins
  const medecin1User = await prisma.user.create({
    data: {
      email: 'dr.maley@gmail.com',
      password: hashedPassword,
      name: 'Dr Male',
      role: Role.medecin,
      emailVerifiedAt: new Date(),
    },
  });

  const medecin2User = await prisma.user.create({
    data: {
      email: 'dr.diop@gmail.com',
      password: hashedPassword,
      name: 'Dr Diop',
      role: Role.medecin,
      emailVerifiedAt: new Date(),
    },
  });

  const medecin3User = await prisma.user.create({
    data: {
      email: 'dr.sall@gmail.com',
      password: hashedPassword,
      name: 'Dr Sall',
      role: Role.medecin,
      emailVerifiedAt: new Date(),
    },
  });

  const medecin4User = await prisma.user.create({
    data: {
      email: 'dr.oumar.faye@santesn.demo',
      password: hashedPassword,
      name: 'Dr Oumar Faye',
      role: Role.medecin,
      emailVerifiedAt: new Date(),
    },
  });

  const medecin5User = await prisma.user.create({
    data: {
      email: 'dr.khady.ba@santesn.demo',
      password: hashedPassword,
      name: 'Dr Khady Ba',
      role: Role.medecin,
      emailVerifiedAt: new Date(),
    },
  });

  // Secrétaires
  const secretaire1User = await prisma.user.create({
    data: {
      email: 'fatou@gmail.com',
      password: hashedPassword,
      name: 'Fatou Secretaire',
      role: Role.secretaire,
      emailVerifiedAt: new Date(),
    },
  });

  const secretaire2User = await prisma.user.create({
    data: {
      email: 'mariam@gmail.com',
      password: hashedPassword,
      name: 'Mariam Secretaire',
      role: Role.secretaire,
      emailVerifiedAt: new Date(),
    },
  });

  const secretaire3User = await prisma.user.create({
    data: {
      email: 'aminata.cisse@santesn.demo',
      password: hashedPassword,
      name: 'Aminata Cisse',
      role: Role.secretaire,
      emailVerifiedAt: new Date(),
    },
  });

  const secretaire4User = await prisma.user.create({
    data: {
      email: 'astou.sow@santesn.demo',
      password: hashedPassword,
      name: 'Astou Sow',
      role: Role.secretaire,
      emailVerifiedAt: new Date(),
    },
  });

  // Patients
  const patient1User = await prisma.user.create({
    data: {
      email: 'patient1@gmail.com',
      password: hashedPassword,
      name: 'Patient Test 1',
      role: Role.patient,
      emailVerifiedAt: new Date(),
    },
  });

  const patient2User = await prisma.user.create({
    data: {
      email: 'patient2@gmail.com',
      password: hashedPassword,
      name: 'Patient Test 2',
      role: Role.patient,
      emailVerifiedAt: new Date(),
    },
  });

  const patient3User = await prisma.user.create({
    data: {
      email: 'patient3@gmail.com',
      password: hashedPassword,
      name: 'Patient Test 3',
      role: Role.patient,
      emailVerifiedAt: new Date(),
    },
  });

  const patient4User = await prisma.user.create({
    data: {
      email: 'patient4@gmail.com',
      password: hashedPassword,
      name: 'Patient Test 4',
      role: Role.patient,
      emailVerifiedAt: new Date(),
    },
  });

  const patient5User = await prisma.user.create({
    data: {
      email: 'patient5@gmail.com',
      password: hashedPassword,
      name: 'Patient Test 5',
      role: Role.patient,
      emailVerifiedAt: new Date(),
    },
  });

  const patient6User = await prisma.user.create({
    data: {
      email: 'aissatou.ndour@santesn.demo',
      password: hashedPassword,
      name: 'Aissatou Ndour',
      role: Role.patient,
      emailVerifiedAt: new Date(),
    },
  });

  const patient7User = await prisma.user.create({
    data: {
      email: 'cheikh.niane@santesn.demo',
      password: hashedPassword,
      name: 'Cheikh Niane',
      role: Role.patient,
      emailVerifiedAt: new Date(),
    },
  });

  const patient8User = await prisma.user.create({
    data: {
      email: 'adama.gueye@santesn.demo',
      password: hashedPassword,
      name: 'Adama Gueye',
      role: Role.patient,
      emailVerifiedAt: new Date(),
    },
  });

  const patient9User = await prisma.user.create({
    data: {
      email: 'sokhna.fall@santesn.demo',
      password: hashedPassword,
      name: 'Sokhna Fall',
      role: Role.patient,
      emailVerifiedAt: new Date(),
    },
  });

  const patient10User = await prisma.user.create({
    data: {
      email: 'pape.sarr@santesn.demo',
      password: hashedPassword,
      name: 'Pape Sarr',
      role: Role.patient,
      emailVerifiedAt: new Date(),
    },
  });

  console.log('✅ All users created');

  // ==================== CREATION DES MEDECINS ====================
  console.log('👨‍⚕️ Creating doctors...');

  const medecin1 = await prisma.medecin.create({
    data: {
      userId: medecin1User.id,
      nom: 'Male',
      prenom: 'Youssou',
      specialite: 'Cardiologie',
      telephone: '221771234567',
      adresse: 'Dakar, Senegal',
      tarif_consultation: 25000,
    },
  });

  const medecin2 = await prisma.medecin.create({
    data: {
      userId: medecin2User.id,
      nom: 'Diop',
      prenom: 'Moussa',
      specialite: 'Dermatologie',
      telephone: '221771234568',
      adresse: 'Dakar, Senegal',
      tarif_consultation: 20000,
    },
  });

  const medecin3 = await prisma.medecin.create({
    data: {
      userId: medecin3User.id,
      nom: 'Sall',
      prenom: 'Mamadou',
      specialite: 'Généraliste',
      telephone: '221771234569',
      adresse: 'Thiès, Senegal',
      tarif_consultation: 15000,
    },
  });

  const medecin4 = await prisma.medecin.create({
    data: {
      userId: medecin4User.id,
      nom: 'Faye',
      prenom: 'Oumar',
      specialite: 'Pediatrie',
      telephone: '221771234570',
      adresse: 'Saint-Louis, Senegal',
      tarif_consultation: 18000,
    },
  });

  const medecin5 = await prisma.medecin.create({
    data: {
      userId: medecin5User.id,
      nom: 'Ba',
      prenom: 'Khady',
      specialite: 'Gynecologie',
      telephone: '221771234571',
      adresse: 'Kaolack, Senegal',
      tarif_consultation: 22000,
    },
  });

  console.log('✅ Doctors created');

  // ==================== CREATION DES SECRETARIES ====================
  console.log('👩‍💼 Creating secretaries...');

  const secretaire1 = await prisma.secretaire.create({
    data: {
      userId: secretaire1User.id,
      medecinId: medecin1.id,
      nom: 'Seck',
      prenom: 'Fatou',
      telephone: '221771111111',
    },
  });

  const secretaire2 = await prisma.secretaire.create({
    data: {
      userId: secretaire2User.id,
      medecinId: medecin2.id,
      nom: 'Touré',
      prenom: 'Mariam',
      telephone: '221771111112',
    },
  });

  const secretaire3 = await prisma.secretaire.create({
    data: {
      userId: secretaire3User.id,
      medecinId: medecin4.id,
      nom: 'Cisse',
      prenom: 'Aminata',
      telephone: '221771111113',
    },
  });

  const secretaire4 = await prisma.secretaire.create({
    data: {
      userId: secretaire4User.id,
      medecinId: medecin5.id,
      nom: 'Sow',
      prenom: 'Astou',
      telephone: '221771111114',
    },
  });

  console.log('✅ Secretaries created');

  // ==================== CREATION DES PATIENTS ====================
  console.log('🤒 Creating patients...');

  const patient1 = await prisma.patient.create({
    data: {
      userId: patient1User.id,
      nom: 'Diallo',
      prenom: 'Amadou',
      telephone: '221771222222',
      date_naissance: new Date('1990-05-15'),
      adresse: 'Dakar, Senegal',
      groupe_sanguin: 'O+',
      diabete: false,
      hypertension: true,
      hepatite: false,
      autres_pathologies: 'Asthme léger',
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      userId: patient2User.id,
      nom: 'Ndiaye',
      prenom: 'Aïcha',
      telephone: '221771222223',
      date_naissance: new Date('1985-08-22'),
      adresse: 'Pikine, Senegal',
      groupe_sanguin: 'A+',
      diabete: true,
      hypertension: false,
      hepatite: false,
      autres_pathologies: null,
    },
  });

  const patient3 = await prisma.patient.create({
    data: {
      userId: patient3User.id,
      nom: 'Sarr',
      prenom: 'Moussa',
      telephone: '221771222224',
      date_naissance: new Date('1978-12-10'),
      adresse: 'Guédiawaye, Senegal',
      groupe_sanguin: 'B+',
      diabete: false,
      hypertension: true,
      hepatite: true,
      autres_pathologies: 'Hépatite B chronique',
    },
  });

  const patient4 = await prisma.patient.create({
    data: {
      userId: patient4User.id,
      nom: 'Ba',
      prenom: 'Fatou',
      telephone: '221771222225',
      date_naissance: new Date('1995-03-25'),
      adresse: 'Dakar, Senegal',
      groupe_sanguin: 'AB+',
      diabete: false,
      hypertension: false,
      hepatite: false,
      autres_pathologies: null,
    },
  });

  const patient5 = await prisma.patient.create({
    data: {
      userId: patient5User.id,
      nom: 'Sène',
      prenom: 'Ousmane',
      telephone: '221771222226',
      date_naissance: new Date('1982-07-08'),
      adresse: 'Thiès, Senegal',
      groupe_sanguin: 'O-',
      diabete: true,
      hypertension: true,
      hepatite: false,
      autres_pathologies: 'Diabète type 2, Hypertension',
    },
  });

  const patient6 = await prisma.patient.create({
    data: {
      userId: patient6User.id,
      nom: 'Ndour',
      prenom: 'Aissatou',
      telephone: '221771222227',
      date_naissance: new Date('1992-11-04'),
      adresse: 'Mbour, Senegal',
      groupe_sanguin: 'A-',
      diabete: false,
      hypertension: false,
      hepatite: false,
      autres_pathologies: 'Grossesse suivie',
    },
  });

  const patient7 = await prisma.patient.create({
    data: {
      userId: patient7User.id,
      nom: 'Niane',
      prenom: 'Cheikh',
      telephone: '221771222228',
      date_naissance: new Date('2001-02-17'),
      adresse: 'Saint-Louis, Senegal',
      groupe_sanguin: 'B-',
      diabete: false,
      hypertension: false,
      hepatite: false,
      autres_pathologies: null,
    },
  });

  const patient8 = await prisma.patient.create({
    data: {
      userId: patient8User.id,
      nom: 'Gueye',
      prenom: 'Adama',
      telephone: '221771222229',
      date_naissance: new Date('1974-09-30'),
      adresse: 'Kaolack, Senegal',
      groupe_sanguin: 'O+',
      diabete: false,
      hypertension: true,
      hepatite: false,
      autres_pathologies: 'Insuffisance rénale légère',
    },
  });

  const patient9 = await prisma.patient.create({
    data: {
      userId: patient9User.id,
      nom: 'Fall',
      prenom: 'Sokhna',
      telephone: '221771222230',
      date_naissance: new Date('1988-01-12'),
      adresse: 'Ziguinchor, Senegal',
      groupe_sanguin: 'AB-',
      diabete: true,
      hypertension: false,
      hepatite: false,
      autres_pathologies: 'Suivi endocrinologique',
    },
  });

  const patient10 = await prisma.patient.create({
    data: {
      userId: patient10User.id,
      nom: 'Sarr',
      prenom: 'Pape',
      telephone: '221771222231',
      date_naissance: new Date('1997-06-21'),
      adresse: 'Touba, Senegal',
      groupe_sanguin: 'O+',
      diabete: false,
      hypertension: false,
      hepatite: false,
      autres_pathologies: 'Allergie saisonnière',
    },
  });

  console.log('✅ Patients created');

  // ==================== CREATION DES MEDICAMENTS ====================
  console.log('💊 Creating medications...');

  const med1 = await prisma.medicament.create({
    data: { nom: 'Paracétamol', forme: 'Comprimé', dosage: '500mg' },
  });

  const med2 = await prisma.medicament.create({
    data: { nom: 'Amoxicilline', forme: 'Gélule', dosage: '500mg' },
  });

  const med3 = await prisma.medicament.create({
    data: { nom: 'Aspirine', forme: 'Comprimé', dosage: '100mg' },
  });

  const med4 = await prisma.medicament.create({
    data: { nom: 'Metformine', forme: 'Comprimé', dosage: '850mg' },
  });

  const med5 = await prisma.medicament.create({
    data: { nom: 'Captopril', forme: 'Comprimé', dosage: '25mg' },
  });

  const med6 = await prisma.medicament.create({
    data: { nom: 'Oméprazole', forme: 'Gélule', dosage: '20mg' },
  });

  const med7 = await prisma.medicament.create({
    data: { nom: 'Atorvastatine', forme: 'Comprimé', dosage: '20mg' },
  });

  const med8 = await prisma.medicament.create({
    data: { nom: 'Ibuprofène', forme: 'Comprimé', dosage: '400mg' },
  });

  const med9 = await prisma.medicament.create({
    data: { nom: 'Cetirizine', forme: 'Comprimé', dosage: '10mg' },
  });

  const med10 = await prisma.medicament.create({
    data: { nom: 'Vitamine C', forme: 'Comprimé', dosage: '1000mg' },
  });

  console.log('✅ Medications created');

  // ==================== CREATION DES CREAUX DISPONIBLES ====================
  console.log('📅 Creating available slots...');

  const jours = [1, 2, 3, 4, 5];
  const heures = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00', '15:30', '16:00'];

  for (const medecin of [medecin1, medecin2, medecin3, medecin4, medecin5]) {
    for (const jour of jours) {
      for (const heure of heures) {
        await prisma.creneauDisponible.create({
          data: {
            medecinId: medecin.id,
            jour,
            heure,
            actif: true,
          },
        });
      }
    }
  }

  console.log('✅ Available slots created');

  // ==================== CREATION DES RENDEZ-VOUS ====================
  console.log('📆 Creating appointments...');

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const rdv1 = await prisma.rendezVous.create({
    data: {
      date: tomorrow,
      heure: '09:00',
      patientId: patient1.id,
      medecinId: medecin1.id,
      type: TypeRendezVous.presentiel,
      statut: StatutRendezVous.en_attente,
      motif: 'Consultation cardiologique de contrôle',
    },
  });

  const rdv2 = await prisma.rendezVous.create({
    data: {
      date: tomorrow,
      heure: '10:30',
      patientId: patient2.id,
      medecinId: medecin1.id,
      type: TypeRendezVous.presentiel,
      statut: StatutRendezVous.confirme,
      motif: 'Suivi diabète et tension',
    },
  });

  const rdv3 = await prisma.rendezVous.create({
    data: {
      date: nextWeek,
      heure: '14:00',
      patientId: patient3.id,
      medecinId: medecin2.id,
      type: TypeRendezVous.en_ligne,
      statut: StatutRendezVous.termine,
      motif: 'Consultation dermatologique',
    },
  });

  const rdv4 = await prisma.rendezVous.create({
    data: {
      date: nextWeek,
      heure: '15:30',
      patientId: patient4.id,
      medecinId: medecin3.id,
      type: TypeRendezVous.presentiel,
      statut: StatutRendezVous.annule,
      motif: 'Consultation générale',
      raison_refus: 'Patient absent',
    },
  });

  const rdv5 = await prisma.rendezVous.create({
    data: {
      date: nextWeek,
      heure: '09:30',
      patientId: patient5.id,
      medecinId: medecin1.id,
      type: TypeRendezVous.presentiel,
      statut: StatutRendezVous.paye,
      motif: 'Bilan de santé complet',
    },
  });

  const rdv6 = await prisma.rendezVous.create({
    data: {
      date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      heure: '11:00',
      patientId: patient1.id,
      medecinId: medecin2.id,
      type: TypeRendezVous.prestation,
      statut: StatutRendezVous.en_attente,
      motif: 'Prestation analyse sanguine',
      prestation_type: 'Analyse sanguine',
    },
  });

  console.log('✅ Appointments created');

  // ==================== CREATION DES CONSULTATIONS ====================
  console.log('🩺 Creating consultations...');

  const cons1 = await prisma.consultation.create({
    data: {
      rendezVousId: rdv3.id,
      patientId: patient3.id,
      medecinId: medecin2.id,
      date: new Date(),
      heure: '14:00',
      type: 'en_ligne',
      statut: StatutConsultation.termine,
      constantes: {
        tension: '120/80',
        temperature: '37.2',
        poids: 75,
        taille: 175,
      },
      diagnostic: 'Dermatite allergique légère',
      observations: 'Réaction cutanée suite à un nouveau produit cosmétique. Traitement symptomatique recommandé.',
    },
  });

  const cons2 = await prisma.consultation.create({
    data: {
      patientId: patient1.id,
      medecinId: medecin1.id,
      date: new Date(),
      heure: '10:30',
      type: 'presentiel',
      statut: StatutConsultation.en_cours,
      constantes: {
        tension: '140/90',
        temperature: '36.8',
        poids: 80,
        taille: 178,
      },
    },
  });

  const cons3 = await prisma.consultation.create({
    data: {
      patientId: patient2.id,
      medecinId: medecin1.id,
      date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      heure: '09:00',
      type: 'presentiel',
      statut: StatutConsultation.termine,
      constantes: {
        tension: '130/85',
        temperature: '37.0',
        poids: 68,
        taille: 165,
      },
      diagnostic: 'Diabète type 2 bien contrôlé',
      observations: 'HbA1c à 6.5%. Continuation du traitement actuel.',
    },
  });

  console.log('✅ Consultations created');

  // ==================== CREATION DES ORDONNANCES ====================
  console.log('📝 Creating prescriptions...');

  const ord1 = await prisma.ordonnance.create({
    data: {
      consultationId: cons1.id,
      patientId: patient3.id,
      medecinId: medecin2.id,
      contenu: 'Traitement dermatologique pour allergie cutanée',
    },
  });

  const ord2 = await prisma.ordonnance.create({
    data: {
      consultationId: cons3.id,
      patientId: patient2.id,
      medecinId: medecin1.id,
      contenu: 'Renouvellement traitement diabète et hypertension',
    },
  });

  // Ajouter les médicaments aux ordonnances
  await prisma.medicamentOnOrdonnance.create({
    data: {
      ordonnanceId: ord1.id,
      medicamentId: med1.id,
      posologie: '1 comprimé 3x/jour',
      duree: '5 jours',
      quantite: 15,
    },
  });

  await prisma.medicamentOnOrdonnance.create({
    data: {
      ordonnanceId: ord1.id,
      medicamentId: med8.id,
      posologie: '1 comprimé 2x/jour',
      duree: '3 jours',
      quantite: 6,
    },
  });

  await prisma.medicamentOnOrdonnance.create({
    data: {
      ordonnanceId: ord2.id,
      medicamentId: med4.id,
      posologie: '1 comprimé 2x/jour',
      duree: '30 jours',
      quantite: 60,
    },
  });

  await prisma.medicamentOnOrdonnance.create({
    data: {
      ordonnanceId: ord2.id,
      medicamentId: med5.id,
      posologie: '1 comprimé le matin',
      duree: '30 jours',
      quantite: 30,
    },
  });

  console.log('✅ Prescriptions created');

  // ==================== CREATION DES PAIEMENTS ====================
  console.log('💰 Creating payments...');

  await prisma.paiement.create({
    data: {
      patientId: patient1.id,
      rendezVousId: rdv2.id,
      montant: 25000,
      methode: 'Espèces',
      statut: StatutPaiement.paye,
      date_paiement: new Date(),
      transactionId: 'TXN001',
    },
  });

  await prisma.paiement.create({
    data: {
      patientId: patient5.id,
      rendezVousId: rdv5.id,
      montant: 25000,
      methode: 'Mobile Money',
      statut: StatutPaiement.paye,
      date_paiement: new Date(),
      transactionId: 'TXN002',
    },
  });

  await prisma.paiement.create({
    data: {
      patientId: patient2.id,
      rendezVousId: rdv1.id,
      montant: 20000,
      methode: 'Carte bancaire',
      statut: StatutPaiement.en_attente,
    },
  });

  console.log('✅ Payments created');

  // ==================== CREATION DES PRESTATIONS ====================
  console.log('🧪 Creating prestations...');

  await prisma.prestation.create({
    data: {
      consultationId: cons3.id,
      patientId: patient2.id,
      type: 'Analyse sanguine',
      statut: StatutPrestation.termine,
      resultat: 'HbA1c: 6.5%, Glycémie: 1.2g/L',
      date_realisation: new Date(),
    },
  });

  await prisma.prestation.create({
    data: {
      patientId: patient1.id,
      type: 'Electrocardiogramme',
      statut: StatutPrestation.en_cours,
    },
  });

  await prisma.prestation.create({
    data: {
      patientId: patient3.id,
      type: 'Test allergologique',
      statut: StatutPrestation.en_attente,
    },
  });

  await prisma.prestation.create({
    data: {
      patientId: patient5.id,
      type: 'Bilan lipidique',
      statut: StatutPrestation.termine,
      resultat: 'Choléstérol total: 2.0g/L, LDL: 1.2g/L, HDL: 0.5g/L',
      date_realisation: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('✅ Prestations created');

  // ==================== CREATION DES NOTIFICATIONS ====================
  console.log('🔔 Creating notifications...');

  await prisma.notification.create({
    data: {
      userId: patient1User.id,
      titre: 'Rendez-vous confirmé',
      message: 'Votre rendez-vous avec le Dr Male a été confirmé pour demain à 09:00',
      lu: false,
    },
  });

  await prisma.notification.create({
    data: {
      userId: patient2User.id,
      titre: 'Consultation terminée',
      message: 'Votre consultation avec le Dr Male est terminée. L\'ordonnance est disponible.',
      lu: true,
    },
  });

  await prisma.notification.create({
    data: {
      userId: medecin1User.id,
      titre: 'Nouveau patient',
      message: 'Nouveau patient ajouté: Amadou Diallo',
      lu: false,
    },
  });

  await prisma.notification.create({
    data: {
      userId: secretaire1User.id,
      titre: 'Rendez-vous demain',
      message: 'Vous avez 3 rendez-vous demain',
      lu: false,
    },
  });

  console.log('✅ Notifications created');

  console.log('');
  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('📋 Identifiants de test:');
  console.log('   Admin: admin.santesn@gmail.com / password123');
  console.log('   Médecin: dr.maley@gmail.com / password123');
  console.log('   Médecin: dr.diop@gmail.com / password123');
  console.log('   Médecin: dr.sall@gmail.com / password123');
  console.log('   Médecin: dr.oumar.faye@santesn.demo / password123');
  console.log('   Médecin: dr.khady.ba@santesn.demo / password123');
  console.log('   Secrétaire: fatou@gmail.com / password123');
  console.log('   Secrétaire: mariam@gmail.com / password123');
  console.log('   Secrétaire: aminata.cisse@santesn.demo / password123');
  console.log('   Secrétaire: astou.sow@santesn.demo / password123');
  console.log('   Patient: patient1@gmail.com / password123');
  console.log('   Patient: patient2@gmail.com / password123');
  console.log('   Patient: patient3@gmail.com / password123');
  console.log('   Patient: patient4@gmail.com / password123');
  console.log('   Patient: patient5@gmail.com / password123');
  console.log('   Patient: aissatou.ndour@santesn.demo / password123');
  console.log('   Patient: cheikh.niane@santesn.demo / password123');
  console.log('   Patient: adama.gueye@santesn.demo / password123');
  console.log('   Patient: sokhna.fall@santesn.demo / password123');
  console.log('   Patient: pape.sarr@santesn.demo / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
