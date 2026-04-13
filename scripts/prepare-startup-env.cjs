#!/usr/bin/env node
const path = require('path');
const dotenv = require('dotenv');

const projectRoot = process.cwd();
const rawMode = process.argv[2];
const isDev = rawMode !== 'prod';

dotenv.config({ path: path.join(projectRoot, '.env') });

function normalizeConnectionString(connectionString) {
  if (!connectionString) {
    return connectionString;
  }

  try {
    const url = new URL(connectionString);
    const isNeon = url.hostname.endsWith('.neon.tech');
    const isNeonPooler = isNeon && url.hostname.includes('-pooler.');

    if (isNeonPooler && !url.searchParams.has('pgbouncer')) {
      url.searchParams.set('pgbouncer', 'true');
    }

    if (isNeon && !url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', '15');
    }

    return url.toString();
  } catch {
    return connectionString;
  }
}

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

const envOverrides = {};

if (process.env.DATABASE_URL) {
  envOverrides.DATABASE_URL = normalizeConnectionString(process.env.DATABASE_URL);
}

if (process.env.DIRECT_URL) {
  envOverrides.DIRECT_URL = normalizeConnectionString(process.env.DIRECT_URL);
}

if (isDev) {
  envOverrides.NODE_ENV = 'development';
}

for (const [key, value] of Object.entries(envOverrides)) {
  console.log(`export ${key}=${shellEscape(value)}`);
}
