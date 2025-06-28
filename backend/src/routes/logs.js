
const express = require('express');
const router = express.Router();
const logStreamer = require('../utils/logStreamer');
const logger = require('../utils/logger');

// Stream logs to frontend
router.get('/stream', (req, res) => {
  logger.info(`New log stream client connected. Total clients: ${logStreamer.getClientCount() + 1}`);
  logStreamer.addClient(res);
});

// Get recent logs (optional endpoint for initial load)
router.get('/recent', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    // This is a simple implementation - in production you might want to read from log files
    res.json({
      success: true,
      data: [],
      message: 'Recent logs endpoint - implement file reading if needed'
    });
  } catch (error) {
    logger.error('Error fetching recent logs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des logs'
    });
  }
});

module.exports = router;
