
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { router: authRoutes } = require('./routes/auth');
const s3Routes = require('./routes/s3');
const logRoutes = require('./routes/logs');

const app = express();
const PORT = process.env.PORT || 5000;

// Compteur d'opérations actives pour éviter les redémarrages
let activeOperations = 0;
let isShuttingDown = false;

// Middleware pour tracker les opérations actives
const trackActiveOperations = (req, res, next) => {
  // Incrémenter le compteur pour les opérations S3
  if (req.path.startsWith('/api/s3/')) {
    activeOperations++;
    logger.info(`Opération démarrée. Total actif: ${activeOperations}`);
    
    // Décrémenter quand la réponse est finie
    res.on('finish', () => {
      activeOperations = Math.max(0, activeOperations - 1);
      logger.info(`Opération terminée. Total actif: ${activeOperations}`);
    });
  }
  next();
};

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP',
    message: 'Please try again later'
  }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Middleware pour tracker les opérations
app.use(trackActiveOperations);

// Health check endpoint avec info sur les opérations actives
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    activeOperations: activeOperations,
    shuttingDown: isShuttingDown
  });
});

// Endpoint pour vérifier les opérations actives
app.get('/api/status/operations', (req, res) => {
  res.json({
    activeOperations: activeOperations,
    canShutdown: activeOperations === 0,
    shuttingDown: isShuttingDown
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/s3', s3Routes);
app.use('/api/logs', logRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown avec protection des opérations actives
const gracefulShutdown = (signal) => {
  logger.info(`${signal} reçu. Début de l'arrêt gracieux...`);
  isShuttingDown = true;

  const checkAndShutdown = () => {
    if (activeOperations > 0) {
      logger.info(`⏳ Attente de ${activeOperations} opération(s) en cours...`);
      setTimeout(checkAndShutdown, 5000); // Vérifier toutes les 5 secondes
    } else {
      logger.info('✅ Toutes les opérations terminées. Arrêt du serveur.');
      process.exit(0);
    }
  };

  // Commencer la vérification
  checkAndShutdown();

  // Timeout de sécurité après 2 minutes
  setTimeout(() => {
    logger.warn(`⚠️  Timeout atteint. Arrêt forcé avec ${activeOperations} opération(s) encore active(s).`);
    process.exit(1);
  }, 120000);
};

// Gestion des signaux de fermeture
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  logger.info('🔒 Protection anti-redémarrage activée pendant les opérations');
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  if (activeOperations === 0) {
    process.exit(1);
  } else {
    logger.warn('🔒 Opérations en cours - maintien du serveur actif malgré l\'erreur');
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (activeOperations === 0) {
    process.exit(1);
  } else {
    logger.warn('🔒 Opérations en cours - maintien du serveur actif malgré le rejet');
  }
});

module.exports = app;
