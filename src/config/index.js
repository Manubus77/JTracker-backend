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

const config = {
  env: environment,
  isDevelopment: environment === 'development',
  isTest: environment === 'test',
  isProduction: environment === 'production',
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  bcryptSaltRounds: numberOrDefault(process.env.BCRYPT_SALT_ROUNDS, 10),
};

module.exports = config;

