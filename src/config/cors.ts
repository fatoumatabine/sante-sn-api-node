import { CorsOptions } from 'cors';

const LOCALHOST_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
const VERCEL_PREVIEW_ORIGIN_PATTERN = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

function normalizeOrigin(origin: string): string {
  try {
    return new URL(origin).origin;
  } catch {
    return origin.replace(/\/+$/, '');
  }
}

function extractConfiguredOrigins(...values: Array<string | undefined>): string[] {
  return values
    .flatMap((value) => (value || '').split(','))
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeOrigin);
}

function getConfiguredOrigins(): Set<string> {
  return new Set(
    extractConfiguredOrigins(
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:4000',
      'http://localhost:5000',
      'http://localhost:8080',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:4000',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:5174',
      process.env.FRONTEND_URL,
      process.env.FRONTEND_URLS
    )
  );
}

function shouldAllowVercelPreviewOrigins(): boolean {
  return (process.env.ALLOW_VERCEL_PREVIEW_ORIGINS || '').trim().toLowerCase() === 'true';
}

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = normalizeOrigin(origin);
    const allowedOrigins = getConfiguredOrigins();

    // Allow all localhost ports for development
    if (LOCALHOST_ORIGIN_PATTERN.test(normalizedOrigin)) {
      return callback(null, true);
    }

    if (allowedOrigins.has(normalizedOrigin)) {
      return callback(null, true);
    }

    if (shouldAllowVercelPreviewOrigins() && VERCEL_PREVIEW_ORIGIN_PATTERN.test(normalizedOrigin)) {
      return callback(null, true);
    }

    callback(new Error(`Not allowed by CORS: ${normalizedOrigin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  exposedHeaders: ['Authorization', 'X-Total-Count', 'Content-Disposition'],
  credentials: true,
  maxAge: 3600,
};
