#!/usr/bin/env bash
set -u

MODE="${1:-dev}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

eval "$(node scripts/prepare-startup-env.cjs "$MODE")"

if [[ "$MODE" == "prod" ]]; then
  MAX_ATTEMPTS=3
else
  MAX_ATTEMPTS=2
fi

ATTEMPT=1
RETRY_DELAY_SECONDS=4

while true; do
  echo "[startup] prisma migrate deploy ($ATTEMPT/$MAX_ATTEMPTS)"

  set +e
  PRISMA_OUTPUT="$(npx prisma migrate deploy 2>&1)"
  STATUS=$?
  set -e

  if [[ -n "$PRISMA_OUTPUT" ]]; then
    printf '%s\n' "$PRISMA_OUTPUT"
  fi

  if [[ $STATUS -eq 0 ]]; then
    break
  fi

  if printf '%s' "$PRISMA_OUTPUT" | grep -Eqi "P1001|EAI_AGAIN|ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|Can't reach database server"; then
    RETRYABLE_FAILURE=true
  else
    RETRYABLE_FAILURE=false
  fi

  if [[ "$RETRYABLE_FAILURE" == true && $ATTEMPT -lt $MAX_ATTEMPTS ]]; then
    echo "[startup] Database connection still unavailable. Retrying in ${RETRY_DELAY_SECONDS}s..."
    ATTEMPT=$((ATTEMPT + 1))
    sleep "$RETRY_DELAY_SECONDS"
    continue
  fi

  if [[ "$MODE" != "prod" && "$RETRYABLE_FAILURE" == true ]]; then
    echo "[startup] Prisma migrations skipped for dev because the database is unreachable right now."
    echo "[startup] The API will still boot, but database-backed routes may fail until Neon becomes reachable."
    break
  fi

  exit "$STATUS"
done

if [[ "$MODE" == "prod" ]]; then
  exec node dist/server.js
fi

exec npx ts-node-dev --respawn --transpile-only src/server.ts
