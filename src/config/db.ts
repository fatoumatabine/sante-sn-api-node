import { Prisma, PrismaClient } from '@prisma/client';

function normalizeDatasourceUrl(connectionString: string | undefined): string | undefined {
  if (!connectionString) {
    return undefined;
  }

  try {
    const url = new URL(connectionString);
    const isNeon = url.hostname.endsWith('.neon.tech');
    const isNeonPooler = isNeon && url.hostname.includes('-pooler.');

    if (isNeonPooler) {
      // Prisma works better with Neon pooled endpoints when pgbouncer mode is explicit.
      if (!url.searchParams.has('pgbouncer')) {
        url.searchParams.set('pgbouncer', 'true');
      }

      // Fail fast when the pooled endpoint is unavailable instead of hanging startup.
      if (!url.searchParams.has('connect_timeout')) {
        url.searchParams.set('connect_timeout', '15');
      }
    }

    return url.toString();
  } catch {
    return connectionString;
  }
}

const prismaClientSingleton = () => {
  const shouldLogQueries = process.env.PRISMA_LOG_QUERIES === 'true';
  const logConfig: Prisma.LogLevel[] =
    process.env.NODE_ENV === 'development'
      ? shouldLogQueries
        ? ['query', 'error', 'warn']
        : ['error', 'warn']
      : ['error'];

  const datasourceUrl = normalizeDatasourceUrl(process.env.DATABASE_URL);

  return new PrismaClient({
    log: logConfig,
    datasources: datasourceUrl ? { db: { url: datasourceUrl } } : undefined,
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
