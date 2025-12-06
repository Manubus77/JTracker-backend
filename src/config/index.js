const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const DEFAULT_ENV = 'development';
const environment = process.env.NODE_ENV || DEFAULT_ENV;

const envFileName = `.env.${environment}`;
const envFilePath = path.resolve(process.cwd(), envFileName);
const defaultEnvPath = path.resolve(process.cwd(), '.env');

const loadEnvFile = () => {
  if (fs.existsSync(envFilePath)) {
    dotenv.config({ path: envFilePath });
    return;
  }

  if (fs.existsSync(defaultEnvPath)) {
    dotenv.config({ path: defaultEnvPath });
    return;
  }

  dotenv.config();
};

loadEnvFile();

const numberOrDefault = (value, fallback) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const parseOrigins = (value) => {
  if (!value) return [];
  return value
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
};

/**
 * Validate configuration values on startup
 * Throws errors if critical security settings are invalid
 */
const validateConfig = () => {
  const errors = [];

  // Validate JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    errors.push('JWT_SECRET environment variable is required');
  } else if (jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long for security');
  } else if (jwtSecret.trim().length === 0) {
    errors.push('JWT_SECRET cannot be empty or whitespace only');
  }

  // Validate bcryptSaltRounds
  const saltRounds = numberOrDefault(process.env.BCRYPT_SALT_ROUNDS, 10);
  if (saltRounds < 10) {
    errors.push('BCRYPT_SALT_ROUNDS must be at least 10 for security');
  } else if (saltRounds > 15) {
    errors.push('BCRYPT_SALT_ROUNDS should not exceed 15 to prevent DoS');
  }

  // Validate JWT_EXPIRES_IN
  const jwtExpiresIn = parseInt(process.env.JWT_EXPIRES_IN, 10);
  if (process.env.JWT_EXPIRES_IN && !isNaN(jwtExpiresIn)) {
    const minExpiration = 15 * 60; // 15 minutes in seconds
    const maxExpiration = 24 * 60 * 60; // 24 hours in seconds
    if (jwtExpiresIn < minExpiration) {
      errors.push(`JWT_EXPIRES_IN must be at least ${minExpiration} seconds (15 minutes)`);
    } else if (jwtExpiresIn > maxExpiration) {
      errors.push(`JWT_EXPIRES_IN should not exceed ${maxExpiration} seconds (24 hours)`);
    }
  }

  // Validate DATABASE_URL (required in production)
  if (environment === 'production' && !process.env.DATABASE_URL) {
    errors.push('DATABASE_URL environment variable is required in production');
  }

  // Validate CORS origins in production
  const origins = parseOrigins(process.env.CORS_ORIGINS || process.env.CORS_ORIGIN);
  if (environment === 'production' && origins.length === 0) {
    errors.push('CORS_ORIGINS (comma-separated) is required in production');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
};

const config = {
  env: environment,
  isDevelopment: environment === 'development',
  isTest: environment === 'test',
  isProduction: environment === 'production',
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  bcryptSaltRounds: numberOrDefault(process.env.BCRYPT_SALT_ROUNDS, 10),
  jwtExpiresIn: parseInt(process.env.JWT_EXPIRES_IN, 10) || 3600,
  refreshTokenDays: numberOrDefault(process.env.REFRESH_TOKEN_DAYS, 30),
  refreshTokenCookieName: process.env.REFRESH_TOKEN_COOKIE_NAME || 'refresh_token',
  // CORS configuration
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS || process.env.CORS_ORIGIN),
  corsWildcard: environment !== 'production',
  // Rate limiting configuration
  rateLimitWindowMs: numberOrDefault(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000), // 15 minutes
  rateLimitMaxLogin: numberOrDefault(process.env.RATE_LIMIT_MAX_LOGIN, 5),
  rateLimitMaxRegister: numberOrDefault(process.env.RATE_LIMIT_MAX_REGISTER, 3),
  rateLimitMaxLogout: numberOrDefault(process.env.RATE_LIMIT_MAX_LOGOUT, 10),
  rateLimitMaxGeneral: numberOrDefault(process.env.RATE_LIMIT_MAX_GENERAL, 100),
  rateLimitMaxApplicationsRead: numberOrDefault(process.env.RATE_LIMIT_MAX_APP_READ, 200),
  rateLimitMaxApplicationsWrite: numberOrDefault(process.env.RATE_LIMIT_MAX_APP_WRITE, 50),
  rateLimitMaxRefresh: numberOrDefault(process.env.RATE_LIMIT_MAX_REFRESH, 20),
};

// Validate configuration (skip in test environment to allow flexibility)
if (environment !== 'test') {
  validateConfig();
}

module.exports = config;

