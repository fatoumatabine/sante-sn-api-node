import { statsRepository } from '../repositories/stats.repository';

export class StatsService {
  async getDashboardStats() {
    return statsRepository.getDashboardStats();
  }

  async getGlobalStats() {
    return statsRepository.getGlobalStats();
  }

  async getGraphStats() {
    return statsRepository.getGraphStats();
  }
}

export const statsService = new StatsService();
