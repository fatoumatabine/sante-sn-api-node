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

export type AdminSettingsPayload = {
  generalSettings: GeneralSettings;
  notificationSettings: NotificationSettings;
  securitySettings: SecuritySettings;
  systemSettings: SystemSettings;
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
