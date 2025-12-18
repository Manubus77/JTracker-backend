const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const prisma = require('./utils/prisma');
const { testConnection } = require('./db');
const authRouter = require('./modules/auth/router');
const applicationsRouter = require('./modules/applications/router');
const app = express();

// Trust proxy for Render deployment (needed for rate limiting behind proxy)
app.set('trust proxy', true);

async function connectPrisma() {  
  try {
    await prisma.$connect();
    console.log('PrismaConnected to database');
  } catch (error) {
    console.error('Prisma connection error:', error);
    process.exit(1);
  }
}

// Security Headers (helmet)
app.use(helmet({
  contentSecurityPolicy: config.isProduction ? undefined : false, // Disable in dev for easier testing
  crossOriginEmbedderPolicy: false, // Adjust based on needs
}));

// CORS Configuration
const corsOptions = {
  origin: (origin, callback) => {
    if (config.corsWildcard) {
      callback(null, true);
    } else if (config.corsOrigins.length > 0) {
      if (origin && config.corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Body Parser with size limits
app.use(express.json({ limit: '10kb' })); // Limit request body size to prevent DoS
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Rate Limiting - General API limit (applies to all routes)
// Disabled in test environment to avoid test failures
const generalLimiter = config.isTest 
  ? (req, res, next) => next() // No-op middleware for tests
  : rateLimit({
      windowMs: config.rateLimitWindowMs,
      max: config.rateLimitMaxGeneral, // configurable requests per window
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Routes
app.use('/auth', authRouter);
app.use('/applications', applicationsRouter);

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        environment: config.env,
    });
});

//Test DB Connection with Prisma
app.get('/health/db', async (req, res) => {
    try {
        const result = await prisma.$queryRaw`SELECT NOW()`;
        res.json({
            status: 'ok',
            database: 'connected',
            timestamp: result[0].now,
        });
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({
            status: 'error',
            database: 'disconnected',
            error: error.message,
        });
    }
});

// 404 handler for unknown API routes (must be last)
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

const start = async () => {
  // Run database migrations in production before connecting
  if (config.isProduction) {
    try {
      console.log('Running database migrations...');
      const { execSync } = require('child_process');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('Database migrations completed successfully');
    } catch (error) {
      console.error('Failed to run database migrations:', error.message);
      process.exit(1);
    }
  }
  
  await connectPrisma();
  const server = app.listen(config.port, () => {
    console.log(`Server running in ${config.env} mode on port ${config.port}`);
  });

  return server;
};

if (require.main === module) {
  start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = {
  app,
  start,
};

process.on('SIGINT', async () => {
  console.log('\nShutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});