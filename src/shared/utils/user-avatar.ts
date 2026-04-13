type AvatarDbClient = {
  $queryRaw: <T = unknown>(query: TemplateStringsArray, ...values: unknown[]) => Promise<T>;
  $executeRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
};

export const readUserAvatarUrl = async (db: AvatarDbClient, userId: number): Promise<string | null> => {
  const rows = await db.$queryRaw<Array<{ avatarUrl: string | null }>>`
    SELECT "avatarUrl"
    FROM "User"
    WHERE "id" = ${userId}
    LIMIT 1
  `;

  return rows[0]?.avatarUrl ?? null;
};

export const writeUserAvatarUrl = async (
  db: AvatarDbClient,
  userId: number,
  avatarUrl: string | null
): Promise<void> => {
  await db.$executeRaw`
    UPDATE "User"
    SET "avatarUrl" = ${avatarUrl}
    WHERE "id" = ${userId}
  `;
};
