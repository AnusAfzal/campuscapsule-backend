import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const developmentAccessSecret =
  'dev_access_secret_campuscapsule_secure_jwt_key_32chars';
const developmentRefreshSecret =
  'dev_refresh_secret_campuscapsule_secure_token_key_32chars';

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',

  PORT: parseInt(process.env.PORT || '5000', 10),

  API_PREFIX: process.env.API_PREFIX || '/api',

  MONGODB_URI:
    process.env.MONGODB_URI ||
    'mongodb://127.0.0.1:27017/campuscapsule',

  // JWT Configuration
  JWT_ACCESS_SECRET:
    process.env.JWT_ACCESS_SECRET ||
    process.env.JWT_SECRET ||
    developmentAccessSecret,

  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ||
    developmentRefreshSecret,

  ACCESS_TOKEN_EXPIRES_IN:
    process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',

  REFRESH_TOKEN_EXPIRES_IN:
    process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',

  // Cloudinary Image Storage
  CLOUDINARY_CLOUD_NAME:
    process.env.CLOUDINARY_CLOUD_NAME || '',

  CLOUDINARY_API_KEY:
    process.env.CLOUDINARY_API_KEY || '',

  CLOUDINARY_API_SECRET:
    process.env.CLOUDINARY_API_SECRET || '',

  // CORS
  CORS_ORIGIN:
    process.env.CORS_ORIGIN || '*',

  // Environment helpers
  isProduction:
    process.env.NODE_ENV === 'production',

  isDevelopment:
    process.env.NODE_ENV !== 'production',
};

if (
  env.isProduction &&
  (env.JWT_ACCESS_SECRET === developmentAccessSecret ||
    env.JWT_REFRESH_SECRET === developmentRefreshSecret)
) {
  throw new Error(
    'Production requires JWT_ACCESS_SECRET (or JWT_SECRET) and JWT_REFRESH_SECRET to be configured.'
  );
}
