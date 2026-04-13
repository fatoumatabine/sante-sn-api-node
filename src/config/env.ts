const REQUIRED_ENV_VARS = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const;
const DEFAULT_RESET_TOKEN_TTL_MINUTES = 30;

function isBlank(value: string | undefined): boolean {
  return !value || value.trim().length === 0;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (isBlank(value)) {
    throw new Error(`[ENV] Missing required environment variable: ${name}`);
  }
  return value as string;
}

export function getResetTokenTtlMinutes(): number {
  const rawValue = process.env.RESET_PASSWORD_TOKEN_TTL_MINUTES;
  if (isBlank(rawValue)) {
    return DEFAULT_RESET_TOKEN_TTL_MINUTES;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('[ENV] RESET_PASSWORD_TOKEN_TTL_MINUTES must be a positive number');
  }

  return Math.floor(parsed);
}

function requiresDirectUrl(databaseUrl: string): boolean {
  try {
    const url = new URL(databaseUrl);
    return url.hostname.includes('-pooler.') || url.searchParams.get('pgbouncer') === 'true';
  } catch {
    return databaseUrl.includes('-pooler.') || databaseUrl.includes('pgbouncer=true');
  }
}

export function validateRuntimeEnv(): void {
  const databaseUrl = requireEnv('DATABASE_URL');

  for (const envVar of REQUIRED_ENV_VARS) {
    requireEnv(envVar);
  }

  if (requiresDirectUrl(databaseUrl)) {
    requireEnv('DIRECT_URL');
  }

  // Validate optional numeric envs when present.
  getResetTokenTtlMinutes();
}
