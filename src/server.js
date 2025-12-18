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
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      origin: req.headers.origin || 'no-origin',
      hasAuth: !!req.headers.authorization,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']?.substring(0, 50) || 'no-ua',
    };
    console.log(`[${logData.timestamp}] ${logData.method} ${logData.path}`, logData);
  }
  next();
});

// Log response errors
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(data) {
    if (res.statusCode >= 400) {
      console.error(`[${new Date().toISOString()}] ERROR ${res.statusCode} ${req.method} ${req.path}`, {
        statusCode: res.statusCode,
        path: req.path,
        origin: req.headers.origin || 'no-origin',
      });
    }
    return originalSend.call(this, data);
  };
  next();
});
// #endregion agent log

// Rate Limiting - General API limit (applies to all routes)
// Disabled in test environment to avoid test failures
// Wrap in try-catch to handle validation errors gracefully
let generalLimiter;
try {
  generalLimiter = config.isTest 
    ? (req, res, next) => next() // No-op middleware for tests
    : rateLimit({
        windowMs: config.rateLimitWindowMs,
        max: config.rateLimitMaxGeneral, // configurable requests per window
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      });
} catch (error) {
  console.warn('Rate limiter validation error (using no-op):', error.message);
  // Fallback to no-op if rate limiter fails to initialize
  generalLimiter = (req, res, next) => next();
}

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