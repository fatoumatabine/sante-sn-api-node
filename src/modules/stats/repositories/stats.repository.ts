import prisma from '../../../config/db';

export class StatsRepository {
  async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const totalPatients = await prisma.patient.count();
    const totalMedecins = await prisma.medecin.count();
    const totalRendezVous = await prisma.rendezVous.count();
    const totalConsultations = await prisma.consultation.count();
    
    // Rendez-vous ce mois
    const rdvCeMois = await prisma.rendezVous.count({
      where: {
        date: { gte: startOfMonth }
      }
    });
    
    // Consultations ce mois
    const consultationsCeMois = await prisma.consultation.count({
      where: {
        date: { gte: startOfMonth }
      }
    });
    
    return {
      totalPatients,
      totalMedecins,
      totalRendezVous,
      totalConsultations,
      rdvCeMois,
      consultationsCeMois
    };
  }

  async getGlobalStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const [
      totalPatients,
      totalMedecins,
      totalSecretaires,
      totalRendezVous,
      totalConsultations,
      rdvCeMois,
      consultationsCeMois,
      rdvAujourdhui,
      rdvEnAttente,
      medecinsDisponibles,
      patientsActifsCeMois,
    ] = await Promise.all([
      prisma.patient.count(),
      prisma.medecin.count(),
      prisma.secretaire.count(),
      prisma.rendezVous.count(),
      prisma.consultation.count(),
      prisma.rendezVous.count({ where: { date: { gte: startOfMonth } } }),
      prisma.consultation.count({ where: { date: { gte: startOfMonth } } }),
      prisma.rendezVous.count({ where: { date: { gte: startOfDay, lt: endOfDay } } }),
      prisma.rendezVous.count({ where: { statut: 'en_attente' } }),
      prisma.creneauDisponible.findMany({
        where: { actif: true },
        distinct: ['medecinId'],
        select: { medecinId: true },
      }),
      prisma.rendezVous.findMany({
        where: { date: { gte: startOfMonth } },
        distinct: ['patientId'],
        select: { patientId: true },
      }),
    ]);

    return {
      patients: {
        total: totalPatients,
        actifs: patientsActifsCeMois.length,
        rdv_ce_mois: rdvCeMois,
        consultations_ce_mois: consultationsCeMois,
      },
      medecins: {
        total: totalMedecins,
        disponibles: medecinsDisponibles.length,
        rdv_ce_mois: rdvCeMois,
        consultations_effectuees: totalConsultations,
      },
      secretaires: {
        total: totalSecretaires,
        rdv_geres_ce_mois: rdvCeMois,
        consultations_enregistrees: consultationsCeMois,
      },
      general: {
        rdv_total: totalRendezVous,
        consultations_total: totalConsultations,
        rdv_ce_jour: rdvAujourdhui,
        rdv_en_attente: rdvEnAttente,
      },
    };
  }

  async getGraphStats() {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleString('fr-FR', { month: 'short' }),
        consultations: 0,
        rendezVous: 0,
      };
    });

    const startRange = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [consultations, rendezVous] = await Promise.all([
      prisma.consultation.findMany({
        where: { date: { gte: startRange } },
        select: { date: true },
      }),
      prisma.rendezVous.findMany({
        where: { date: { gte: startRange } },
        select: { date: true, statut: true },
      }),
    ]);

    const monthMap = new Map(months.map((m) => [m.key, m]));

    consultations.forEach((item) => {
      const key = `${item.date.getFullYear()}-${item.date.getMonth()}`;
      const monthData = monthMap.get(key);
      if (monthData) monthData.consultations += 1;
    });

    rendezVous.forEach((item) => {
      const key = `${item.date.getFullYear()}-${item.date.getMonth()}`;
      const monthData = monthMap.get(key);
      if (monthData) monthData.rendezVous += 1;
    });

    const statusCounts = await prisma.rendezVous.groupBy({
      by: ['statut'],
      _count: { statut: true },
    });

    return {
      consultationsParMois: months.map((m) => ({ mois: m.label, count: m.consultations })),
      rendezVousParMois: months.map((m) => ({ mois: m.label, count: m.rendezVous })),
      rendezVousParStatut: statusCounts.map((item) => ({
        statut: item.statut,
        count: item._count.statut,
      })),
    };
  }
}

export const statsRepository = new StatsRepository();
