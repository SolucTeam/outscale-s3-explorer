
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const s3Service = require('../services/s3Service');
const outscaleConfig = require('../config/outscale');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// In-memory session store (use Redis in production)
const sessions = new Map();

// Login endpoint
router.post('/login', [
  body('accessKey').notEmpty().withMessage('Access key is required'),
  body('secretKey').notEmpty().withMessage('Secret key is required'),
  body('region').notEmpty().withMessage('Region is required')
    .custom(value => {
      if (!outscaleConfig.isValidRegion(value)) {
        throw new Error('Invalid region');
      }
      return true;
    })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: errors.array()[0].msg
      });
    }

    const { accessKey, secretKey, region } = req.body;

    // Test S3 connection
    const connectionTest = await s3Service.testConnection(accessKey, secretKey, region);
    if (!connectionTest.success) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: connectionTest.error
      });
    }

    // Create JWT token with extended expiration (8 hours)
    const tokenPayload = {
      accessKey,
      region,
      sessionId: Date.now().toString()
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '8h' // Extended to 8 hours
    });

    // Store encrypted credentials in session
    const hashedSecretKey = await bcrypt.hash(secretKey, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    sessions.set(tokenPayload.sessionId, {
      accessKey,
      secretKey: hashedSecretKey,
      region,
      createdAt: Date.now(),
      expiresAt: Date.now() + (8 * 60 * 60 * 1000) // 8 hours expiration
    });

    logger.info(`User authenticated: ${accessKey.substring(0, 8)}... in region: ${region} - Session expires in 8 hours`);

    res.json({
      success: true,
      data: {
        token,
        user: {
          accessKey: accessKey.substring(0, 8) + '...',
          region
        },
        expiresIn: '8h'
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Authentication failed'
    });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, (req, res) => {
  try {
    const sessionId = req.user.sessionId;
    sessions.delete(sessionId);
    
    logger.info(`User logged out: ${req.user.accessKey.substring(0, 8)}...`);
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Logout failed'
    });
  }
});

// Refresh token endpoint
router.post('/refresh', authenticateToken, (req, res) => {
  try {
    const { accessKey, region, sessionId } = req.user;
    
    // Check if session still exists
    if (!sessions.has(sessionId)) {
      return res.status(401).json({
        success: false,
        error: 'Session expired',
        message: 'Please login again'
      });
    }

    // Generate new token
    const newToken = jwt.sign(
      { accessKey, region, sessionId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      data: { token: newToken }
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Token refresh failed'
    });
  }
});

// Get available regions
router.get('/regions', (req, res) => {
  try {
    const regions = outscaleConfig.getAllRegions();
    res.json({
      success: true,
      data: regions
    });
  } catch (error) {
    logger.error('Get regions error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to fetch regions'
    });
  }
});

// Middleware to get credentials from session
const getCredentials = (req, res, next) => {
  const sessionId = req.user.sessionId;
  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Session expired',
      message: 'Please login again'
    });
  }
  
  req.credentials = session;
  next();
};

module.exports = { router, getCredentials };
