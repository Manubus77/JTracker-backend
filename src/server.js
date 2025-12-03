const express = require('express');
const config = require('./config');
const prisma = require('./utils/prisma');
const { testConnection } = require('./db');
const authRouter = require('./modules/auth/router');
const app = express();

async function connectPrisma() {  
  try {
    await prisma.$connect();
    console.log('PrismaConnected to database');
  } catch (error) {
    console.error('Prisma connection error:', error);
    process.exit(1);
  }
}
app.use(express.json());
// Routes
app.use('/auth', authRouter);

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

const start = async () => {
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