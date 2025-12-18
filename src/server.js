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
// Trust only the first proxy (Render's load balancer)
app.set('trust proxy', 1);

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
    // Allow requests with no origin (same-origin, mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    if (config.corsWildcard) {
      callback(null, true);
    } else if (config.corsOrigins.length > 0) {
      if (config.corsOrigins.includes(origin)) {
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

// #region agent log
// Log all incoming requests for debugging
app.use((req, res, next) => {
  // Log important requests (auth and applications)
  if (req.path.startsWith('/auth/') || req.path.startsWith('/applications/')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
      origin: req.headers.origin || 'no-origin',
      hasAuth: !!req.headers.authorization,
      ip: req.ip || req.connection.remoteAddress,
    });
  }
  next();
});
// #endregion agent log

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
      // Use custom key generator to avoid trust proxy validation issues
      keyGenerator: (req) => {
        // Use IP from request, fallback to connection remoteAddress
        return req.ip || req.connection.remoteAddress || 'unknown';
      },
      // Handle rate limit errors gracefully
      handler: (req, res) => {
        console.log(`Rate limit exceeded for ${req.ip || req.connection.remoteAddress}`);
        res.status(429).json({ error: 'Too many requests from this IP, please try again later.' });
      },
    });

// Apply general rate limiting to all routes with error handling
app.use((req, res, next) => {
  try {
    generalLimiter(req, res, next);
  } catch (error) {
    // If rate limiter throws an error, log it but don't block the request
    console.error('Rate limiter error:', error.message);
    next();
  }
});

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