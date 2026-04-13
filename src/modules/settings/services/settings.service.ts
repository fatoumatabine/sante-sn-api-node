import prisma from '../../../config/db';

const ADMIN_SETTINGS_DB_KEY = 'admin-system-settings-v1';

type GeneralSettings = {
  appName: string;
  appDescription: string;
  timezone: string;
  language: string;
  itemsPerPage: string;
};

type NotificationSettings = {
  emailNotifications: boolean;
  smsNotifications: boolean;
  appointmentReminders: boolean;
  systemAlerts: boolean;
  reminderTime: string;
};

type SecuritySettings = {
  twoFactorAuth: boolean;
  sessionTimeout: string;
  passwordExpiry: string;
  maxLoginAttempts: string;
  requireStrongPassword: boolean;
};

type SystemSettings = {
  maintenanceMode: boolean;
  autoBackup: boolean;
  backupFrequency: string;
  logRetention: string;
  debugMode: boolean;
};

type MarketingAboutSettings = {
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  heroBadge: string;
  missionTitle: string;
  missionDescription: string;
  missionPoint1: string;
  missionPoint2: string;
  missionPoint3: string;
  missionPoint4: string;
  humanityDescription: string;
  trustDescription: string;
  simplicityDescription: string;
};

type MarketingContactSettings = {
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  heroBadge: string;
  phone: string;
  email: string;
  location: string;
  hours: string;
  formIntro: string;
  responseTime: string;
};

export type MarketingSettingsPayload = {
  about: MarketingAboutSettings;
  contact: MarketingContactSettings;
};

export type AdminSettingsPayload = {
  generalSettings: GeneralSettings;
  notificationSettings: NotificationSettings;
  securitySettings: SecuritySettings;
  systemSettings: SystemSettings;
  marketingSettings: MarketingSettingsPayload;
  updatedAt?: string;
};

export type PublicSiteSettingsPayload = {
  generalSettings: Pick<GeneralSettings, 'appName' | 'appDescription' | 'language'>;
  marketingSettings: MarketingSettingsPayload;
  updatedAt?: string;
};

export type UserSettingsPayload = {
  language: string;
  isDarkMode: boolean;
  selectedTheme: string;
  theme?: {
    primary: string;
    secondary: string;
    accent: string;
    sidebarBackground?: string;
    sidebarPrimary?: string;
    sidebarAccent?: string;
  };
  updatedAt?: string;
};

export const defaultAdminSettings: AdminSettingsPayload = {
  generalSettings: {
    appName: 'Santé SN',
    appDescription: 'Plateforme de gestion des rendez-vous médicaux',
    timezone: 'Africa/Dakar',
    language: 'fr',
    itemsPerPage: '20',
  },
  notificationSettings: {
    emailNotifications: true,
    smsNotifications: true,
    appointmentReminders: true,
    systemAlerts: true,
    reminderTime: '24',
  },
  securitySettings: {
    twoFactorAuth: false,
    sessionTimeout: '60',
    passwordExpiry: '90',
    maxLoginAttempts: '5',
    requireStrongPassword: true,
  },
  systemSettings: {
    maintenanceMode: false,
    autoBackup: true,
    backupFrequency: 'daily',
    logRetention: '30',
    debugMode: false,
  },
  marketingSettings: {
    about: {
      heroEyebrow: 'À propos de Santé SN',
      heroTitle: 'Une plateforme pensée pour moderniser le soin sans perdre sa dimension humaine.',
      heroDescription:
        'Notre ambition est simple : construire un environnement de santé numérique crédible, élégant et utile pour les patients comme pour les professionnels.',
      heroBadge: 'Santé numérique, mais toujours profondément humaine',
      missionTitle: 'Concevoir une expérience de santé qui inspire immédiatement confiance.',
      missionDescription:
        'Nous voulons qu’un patient comprenne rapidement où aller, comment être aidé et ce qu’il se passera ensuite. Cette clarté change profondément la perception du service.',
      missionPoint1: 'Rendre la consultation accessible depuis n’importe où',
      missionPoint2: 'Réduire les zones de flou entre prise de rendez-vous et suivi',
      missionPoint3: 'Mieux préparer les médecins grâce à un contexte structuré',
      missionPoint4: 'Créer une interface moderne sans perdre la chaleur humaine',
      humanityDescription:
        'Nous cherchons à rendre la relation de soin plus proche, plus douce et plus claire à chaque étape.',
      trustDescription:
        'La plateforme doit inspirer le sérieux, protéger les données et clarifier les décisions médicales.',
      simplicityDescription:
        'Nous simplifions les parcours complexes pour que l’utilisateur sache toujours où cliquer et quoi faire.',
    },
    contact: {
      heroEyebrow: 'Contact Santé SN',
      heroTitle: 'Une page de contact complète, claire et immédiatement exploitable.',
      heroDescription:
        'Que vous vouliez réserver, poser une question ou parler d’un partenariat, nous avons structuré cette page pour rendre le premier échange simple et rassurant.',
      heroBadge: 'Contact pensé pour rassurer avant même le premier échange',
      phone: '+221 33 123 45 67',
      email: 'contact@santesn.sn',
      location: 'Dakar, Sénégal',
      hours: 'Lun - Ven / 8h00 - 18h00',
      formIntro:
        'Ce formulaire ouvre votre application email avec un message déjà préparé. C’est simple, rapide et suffisant pour une première prise de contact.',
      responseTime: '< 24h',
    },
  },
};

const defaultUserSettings: UserSettingsPayload = {
  language: 'fr',
  isDarkMode: false,
  selectedTheme: 'turquoise',
};

type AppSettingDelegate = {
  findUnique: (args: any) => Promise<any>;
  upsert: (args: any) => Promise<any>;
};

type UserSettingDelegate = {
  findUnique: (args: any) => Promise<any>;
  upsert: (args: any) => Promise<any>;
};

const getPrismaErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object') return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
};

const isMissingSettingsStorage = (error: unknown): boolean => {
  const code = getPrismaErrorCode(error);
  return code === 'P2021' || code === 'P2022';
};

const logSettingsFallback = (operation: string, error: unknown): void => {
  const code = getPrismaErrorCode(error) || 'UNKNOWN';
  console.warn(`[settings] ${operation}: fallback local (${code})`);
};

const getAppSettingDelegate = (): AppSettingDelegate | null => {
  const delegate = (prisma as unknown as { appSetting?: AppSettingDelegate }).appSetting;
  if (!delegate || typeof delegate.findUnique !== 'function' || typeof delegate.upsert !== 'function') {
    return null;
  }
  return delegate;
};

const getUserSettingDelegate = (): UserSettingDelegate | null => {
  const delegate = (prisma as unknown as { userSetting?: UserSettingDelegate }).userSetting;
  if (!delegate || typeof delegate.findUnique !== 'function' || typeof delegate.upsert !== 'function') {
    return null;
  }
  return delegate;
};

const asObject = (value: unknown): Record<string, any> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, any>) : {};

const normalizeAdminSettings = (input: unknown): AdminSettingsPayload => {
  const value = asObject(input);
  return {
    generalSettings: {
      ...defaultAdminSettings.generalSettings,
      ...asObject(value.generalSettings),
    },
    notificationSettings: {
      ...defaultAdminSettings.notificationSettings,
      ...asObject(value.notificationSettings),
    },
    securitySettings: {
      ...defaultAdminSettings.securitySettings,
      ...asObject(value.securitySettings),
    },
    systemSettings: {
      ...defaultAdminSettings.systemSettings,
      ...asObject(value.systemSettings),
    },
    marketingSettings: {
      about: {
        ...defaultAdminSettings.marketingSettings.about,
        ...asObject(asObject(value.marketingSettings).about),
      },
      contact: {
        ...defaultAdminSettings.marketingSettings.contact,
        ...asObject(asObject(value.marketingSettings).contact),
      },
    },
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : undefined,
  };
};

const normalizeUserSettings = (input: unknown): UserSettingsPayload => {
  const value = asObject(input);
  const theme = asObject(value.theme);

  const payload: UserSettingsPayload = {
    language: typeof value.language === 'string' ? value.language : defaultUserSettings.language,
    isDarkMode: typeof value.isDarkMode === 'boolean' ? value.isDarkMode : defaultUserSettings.isDarkMode,
    selectedTheme: typeof value.selectedTheme === 'string' ? value.selectedTheme : defaultUserSettings.selectedTheme,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : undefined,
  };

  if (typeof theme.primary === 'string' && typeof theme.secondary === 'string' && typeof theme.accent === 'string') {
    payload.theme = {
      primary: theme.primary,
      secondary: theme.secondary,
      accent: theme.accent,
      sidebarBackground: typeof theme.sidebarBackground === 'string' ? theme.sidebarBackground : undefined,
      sidebarPrimary: typeof theme.sidebarPrimary === 'string' ? theme.sidebarPrimary : undefined,
      sidebarAccent: typeof theme.sidebarAccent === 'string' ? theme.sidebarAccent : undefined,
    };
  }

  return payload;
};

export class SettingsService {
  async getPublicSiteSettings(): Promise<PublicSiteSettingsPayload> {
    const settings = await this.getAdminSettings();
    return {
      generalSettings: {
        appName: settings.generalSettings.appName,
        appDescription: settings.generalSettings.appDescription,
        language: settings.generalSettings.language,
      },
      marketingSettings: settings.marketingSettings,
      updatedAt: settings.updatedAt,
    };
  }

  async getAdminSettings() {
    const appSetting = getAppSettingDelegate();
    if (!appSetting) {
      return defaultAdminSettings;
    }

    try {
      const row = await appSetting.findUnique({
        where: { key: ADMIN_SETTINGS_DB_KEY },
        select: { value: true, updatedAt: true },
      });

      if (!row) {
        return defaultAdminSettings;
      }

      const normalized = normalizeAdminSettings(row.value);
      return {
        ...normalized,
        updatedAt: row.updatedAt.toISOString(),
      };
    } catch (error) {
      if (!isMissingSettingsStorage(error)) {
        throw error;
      }
      logSettingsFallback('getAdminSettings', error);
      return defaultAdminSettings;
    }
  }

  async updateAdminSettings(input: unknown) {
    const normalized = normalizeAdminSettings(input);
    const payload = {
      ...normalized,
      updatedAt: new Date().toISOString(),
    };
    const appSetting = getAppSettingDelegate();

    if (!appSetting) {
      return payload;
    }

    try {
      await appSetting.upsert({
        where: { key: ADMIN_SETTINGS_DB_KEY },
        update: { value: payload },
        create: { key: ADMIN_SETTINGS_DB_KEY, value: payload },
      });
    } catch (error) {
      if (!isMissingSettingsStorage(error)) {
        throw error;
      }
      logSettingsFallback('updateAdminSettings', error);
    }

    return payload;
  }

  async resetAdminSettings() {
    const payload = {
      ...defaultAdminSettings,
      updatedAt: new Date().toISOString(),
    };
    const appSetting = getAppSettingDelegate();

    if (!appSetting) {
      return payload;
    }

    try {
      await appSetting.upsert({
        where: { key: ADMIN_SETTINGS_DB_KEY },
        update: { value: payload },
        create: { key: ADMIN_SETTINGS_DB_KEY, value: payload },
      });
    } catch (error) {
      if (!isMissingSettingsStorage(error)) {
        throw error;
      }
      logSettingsFallback('resetAdminSettings', error);
    }

    return payload;
  }

  async getUserSettings(userId: number) {
    const userSetting = getUserSettingDelegate();
    if (!userSetting) {
      return defaultUserSettings;
    }

    try {
      const row = await userSetting.findUnique({
        where: { userId },
        select: { value: true, updatedAt: true },
      });

      if (!row) {
        return defaultUserSettings;
      }

      const normalized = normalizeUserSettings(row.value);
      return {
        ...normalized,
        updatedAt: row.updatedAt.toISOString(),
      };
    } catch (error) {
      if (!isMissingSettingsStorage(error)) {
        throw error;
      }
      logSettingsFallback('getUserSettings', error);
      return defaultUserSettings;
    }
  }

  async updateUserSettings(userId: number, input: unknown) {
    const current = await this.getUserSettings(userId);
    const merged = normalizeUserSettings({
      ...current,
      ...asObject(input),
    });

    const payload = {
      ...merged,
      updatedAt: new Date().toISOString(),
    };
    const userSetting = getUserSettingDelegate();

    if (!userSetting) {
      return payload;
    }

    try {
      await userSetting.upsert({
        where: { userId },
        update: { value: payload },
        create: { userId, value: payload },
      });
    } catch (error) {
      if (!isMissingSettingsStorage(error)) {
        throw error;
      }
      logSettingsFallback('updateUserSettings', error);
    }

    return payload;
  }
}

export const settingsService = new SettingsService();
