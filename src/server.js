const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const prisma = require('./utils/prisma');
const { testConnection } = require('./db');
const authRouter = require('./modules/auth/router');
const applicationsRouter = require('./modules/applications/router');
const app = express();

// Trust proxy for Render deployment (needed for rate limiting behind proxy)
app.set('trust proxy', true);

// #region agent log
const logPath = path.resolve(process.cwd(), '.cursor', 'debug.log');
const logDebug = (location, message, data, hypothesisId) => {
  try {
    const logEntry = JSON.stringify({
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      location,
      message,
      data: data || {},
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: hypothesisId || 'A'
    }) + '\n';
    fs.appendFileSync(logPath, logEntry, 'utf8');
  } catch (err) {
    // Silently fail if logging fails
  }
};
// #endregion agent log

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
// #region agent log
logDebug('server.js:29', 'CORS config on startup', {
  corsWildcard: config.corsWildcard,
  corsOrigins: config.corsOrigins,
  isProduction: config.isProduction,
  originConfig: config.corsWildcard ? 'wildcard (true)' : (config.corsOrigins.length > 0 ? config.corsOrigins : 'false (blocked)')
}, 'A');
// #endregion agent log
const corsOptions = {
  origin: (origin, callback) => {
    // #region agent log
    logDebug('server.js:62', 'CORS origin check', {
      requestOrigin: origin || 'no-origin-header',
      corsWildcard: config.corsWildcard,
      allowedOrigins: config.corsOrigins,
      isProduction: config.isProduction
    }, 'A');
    // #endregion agent log
    if (config.corsWildcard) {
      // #region agent log
      logDebug('server.js:72', 'CORS origin allowed (wildcard)', { requestOrigin: origin || 'no-origin-header' }, 'A');
      // #endregion agent log
      callback(null, true);
    } else if (config.corsOrigins.length > 0) {
      if (origin && config.corsOrigins.includes(origin)) {
        // #region agent log
        logDebug('server.js:77', 'CORS origin allowed (in list)', { requestOrigin: origin }, 'A');
        // #endregion agent log
        callback(null, true);
      } else {
        // #region agent log
        console.error('CORS REJECTED:', {
          requestOrigin: origin || 'no-origin-header',
          allowedOrigins: config.corsOrigins,
          message: `Origin "${origin || 'missing'}" is not in allowed origins list`
        });
        logDebug('server.js:85', 'CORS origin REJECTED', {
          requestOrigin: origin || 'no-origin-header',
          allowedOrigins: config.corsOrigins
        }, 'A');
        // #endregion agent log
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // #region agent log
      console.error('CORS REJECTED: No CORS origins configured in production');
      logDebug('server.js:95', 'CORS origin REJECTED (no origins configured)', { requestOrigin: origin || 'no-origin-header' }, 'A');
      // #endregion agent log
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
// Log all incoming requests to /auth/register
app.use((req, res, next) => {
  if (req.path === '/auth/register' || req.originalUrl === '/auth/register') {
    logDebug('server.js:65', 'Request received at /auth/register', {
      method: req.method,
      origin: req.headers.origin || 'no-origin',
      referer: req.headers.referer || 'no-referer',
      userAgent: req.headers['user-agent'] || 'no-user-agent',
      contentType: req.headers['content-type'] || 'no-content-type',
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : []
    }, 'B');
  }
  if (req.method === 'OPTIONS') {
    logDebug('server.js:76', 'OPTIONS preflight request', {
      path: req.path,
      origin: req.headers.origin || 'no-origin',
      accessControlRequestMethod: req.headers['access-control-request-method'] || 'no-method',
      accessControlRequestHeaders: req.headers['access-control-request-headers'] || 'no-headers'
    }, 'B');
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

// #region agent log
// Error handler - must be after all routes
app.use((err, req, res, next) => {
  if (err) {
    logDebug('server.js:190', 'Express error handler', {
      errorMessage: err.message,
      errorStack: err.stack?.substring(0, 200),
      path: req.path,
      method: req.method,
      origin: req.headers.origin || 'no-origin'
    }, 'D');
  }
  next(err);
});
// #endregion agent log

const start = async () => {
  // Run database migrations in production before connecting
  if (config.isProduction) {
    try {
      // #region agent log
      console.log('Running database migrations...');
      logDebug('server.js:207', 'Starting database migrations', { isProduction: config.isProduction }, 'E');
      // #endregion agent log
      const { execSync } = require('child_process');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      // #region agent log
      console.log('Database migrations completed successfully');
      logDebug('server.js:213', 'Database migrations completed', {}, 'E');
      // #endregion agent log
    } catch (error) {
      // #region agent log
      console.error('Database migration error:', error);
      logDebug('server.js:218', 'Database migration failed', {
        errorMessage: error.message,
        errorStack: error.stack?.substring(0, 200)
      }, 'E');
      // #endregion agent log
      console.error('Failed to run database migrations:', error.message);
      process.exit(1);
    }
  }
  
  await connectPrisma();
  // #region agent log
  console.log('CORS Configuration:', {
    corsWildcard: config.corsWildcard,
    corsOrigins: config.corsOrigins,
    isProduction: config.isProduction
  });
  // #endregion agent log
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