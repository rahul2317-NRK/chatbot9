import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Define required environment variables for production
const requiredEnvVars = [
  'OPENAI_API_KEY',
  'GEMINI_API_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'JWT_SECRET_KEY'
];

// Validate required environment variables
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.warn(`⚠️ Missing environment variables: ${missingEnvVars.join(', ')}`);
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Required environment variables are missing in production!');
    process.exit(1);
  }
}

// Determine if we are in production mode
const isProduction = process.env.NODE_ENV === 'production';

const config = {
  environment: process.env.NODE_ENV || 'development',

  // Server Configuration
  server: {
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || '0.0.0.0'
  },

  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 500,
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7
  },

  // Gemini Configuration
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
  },

  // AWS Configuration
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    dynamodb: {
      tablePrefix: process.env.DYNAMODB_TABLE_PREFIX || 'bluepixel_'
    }
  },

  // Authentication
  auth: {
    jwtSecret: process.env.JWT_SECRET_KEY || 'default-dev-secret',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10
  },

  // External APIs
  externalApis: {
    googleSearch: {
      apiKey: process.env.GOOGLE_SEARCH_API_KEY || '',
      engineId: process.env.GOOGLE_SEARCH_ENGINE_ID || ''
    },
    rapidApi: {
      key: process.env.RAPID_API_KEY || ''
    }
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100
  },

  // Session Configuration
  session: {
    secret: process.env.SESSION_SECRET || 'bluepixel-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
    credentials: true
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || path.resolve('logs', 'app.log')
  }
};

export default config;
