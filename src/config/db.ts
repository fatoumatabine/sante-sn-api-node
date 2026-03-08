import { Prisma, PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  const shouldLogQueries = process.env.PRISMA_LOG_QUERIES === 'true';
  const logConfig: Prisma.LogLevel[] =
    process.env.NODE_ENV === 'development'
      ? shouldLogQueries
        ? ['query', 'error', 'warn']
        : ['error', 'warn']
      : ['error'];

  return new PrismaClient({
    log: logConfig,
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
