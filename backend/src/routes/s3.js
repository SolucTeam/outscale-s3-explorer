
const express = require('express');
const multer = require('multer');
const { body, param, query, validationResult } = require('express-validator');
const s3Service = require('../services/s3Service');
const { authenticateToken } = require('../middleware/auth');
const { getCredentials } = require('./auth');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types
    cb(null, true);
  }
});

// Apply authentication and credentials middleware to all routes
router.use(authenticateToken);
router.use(getCredentials);

// Get all buckets
router.get('/buckets', async (req, res) => {
  try {
    const { accessKey, secretKey, region } = req.credentials;
    const result = await s3Service.listBuckets(accessKey, secretKey, region);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: result.error
      });
    }
  } catch (error) {
    logger.error('Get buckets error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to fetch buckets'
    });
  }
});

// Create bucket
router.post('/buckets', [
  body('name').notEmpty().withMessage('Bucket name is required')
    .matches(/^[a-z0-9.-]+$/).withMessage('Invalid bucket name format'),
  body('region').optional().isString()
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

    const { name, region: bucketRegion } = req.body;
    const { accessKey, secretKey, region } = req.credentials;
    const targetRegion = bucketRegion || region;
    
    const result = await s3Service.createBucket(accessKey, secretKey, targetRegion, name);
    
    if (result.success) {
      res.status(201).json({
        success: true,
        message: `Bucket "${name}" created successfully`
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: result.error
      });
    }
  } catch (error) {
    logger.error('Create bucket error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to create bucket'
    });
  }
});

// Delete bucket - with optional force parameter (fixed validation)
router.delete('/buckets/:bucketName', [
  param('bucketName').notEmpty().withMessage('Bucket name is required'),
  query('force').optional().isIn(['true', 'false']).withMessage('Force parameter must be "true" or "false"')
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

    const { bucketName } = req.params;
    const { force } = req.query;
    const { accessKey, secretKey, region } = req.credentials;
    
    // Convert string to boolean properly
    const forceDelete = force === 'true';
    logger.info(`Deleting bucket ${bucketName} with force=${forceDelete}`);
    
    const result = await s3Service.deleteBucket(accessKey, secretKey, region, bucketName, forceDelete);
    
    if (result.success) {
      res.json({
        success: true,
        message: `Bucket "${bucketName}" deleted successfully${forceDelete ? ' (including all contents)' : ''}`
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: result.error
      });
    }
  } catch (error) {
    logger.error('Delete bucket error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to delete bucket'
    });
  }
});

// Get objects in bucket - improved path handling
router.get('/buckets/:bucketName/objects', [
  param('bucketName').notEmpty().withMessage('Bucket name is required'),
  query('path').optional().isString()
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

    const { bucketName } = req.params;
    let { path = '' } = req.query;
    const { accessKey, secretKey, region } = req.credentials;
    
    // Clean up the path - remove leading/trailing slashes and decode
    if (path) {
      path = decodeURIComponent(path).replace(/^\/+|\/+$/g, '');
    }
    
    logger.info(`Listing objects in bucket ${bucketName} with path: "${path}"`);
    
    const result = await s3Service.listObjects(accessKey, secretKey, region, bucketName, path);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: result.error
      });
    }
  } catch (error) {
    logger.error('Get objects error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to fetch objects'
    });
  }
});

// Upload file
router.post('/buckets/:bucketName/upload', [
  param('bucketName').notEmpty().withMessage('Bucket name is required')
], upload.single('file'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: errors.array()[0].msg
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided',
        message: 'Please select a file to upload'
      });
    }

    const { bucketName } = req.params;
    const { path = '' } = req.body;
    const { accessKey, secretKey, region } = req.credentials;
    
    const objectKey = path ? `${path}/${req.file.originalname}` : req.file.originalname;
    
    const result = await s3Service.uploadObject(
      accessKey, 
      secretKey, 
      region, 
      bucketName, 
      objectKey, 
      req.file.buffer, 
      req.file.mimetype
    );
    
    if (result.success) {
      res.status(201).json({
        success: true,
        message: `File "${req.file.originalname}" uploaded successfully`
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: result.error
      });
    }
  } catch (error) {
    logger.error('Upload file error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to upload file'
    });
  }
});

// Delete object - improved key handling
router.delete('/buckets/:bucketName/objects/:objectKey(*)', [
  param('bucketName').notEmpty().withMessage('Bucket name is required'),
  param('objectKey').notEmpty().withMessage('Object key is required')
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

    const { bucketName, objectKey } = req.params;
    const { accessKey, secretKey, region } = req.credentials;
    
    // Decode the object key properly
    const decodedObjectKey = decodeURIComponent(objectKey);
    
    logger.info(`Deleting object: ${decodedObjectKey} from bucket: ${bucketName}`);
    
    const result = await s3Service.deleteObject(accessKey, secretKey, region, bucketName, decodedObjectKey);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Object deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: result.error
      });
    }
  } catch (error) {
    logger.error('Delete object error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to delete object'
    });
  }
});

// Get download URL
router.get('/buckets/:bucketName/objects/:objectKey(*)/download', [
  param('bucketName').notEmpty().withMessage('Bucket name is required'),
  param('objectKey').notEmpty().withMessage('Object key is required')
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

    const { bucketName, objectKey } = req.params;
    const { accessKey, secretKey, region } = req.credentials;
    
    const result = await s3Service.getDownloadUrl(accessKey, secretKey, region, bucketName, objectKey);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: result.error
      });
    }
  } catch (error) {
    logger.error('Get download URL error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to generate download URL'
    });
  }
});

// Create folder - improved path handling
router.post('/buckets/:bucketName/folders', [
  param('bucketName').notEmpty().withMessage('Bucket name is required'),
  body('path').optional().isString(),
  body('folderName').notEmpty().withMessage('Folder name is required')
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

    const { bucketName } = req.params;
    let { path = '', folderName } = req.body;
    const { accessKey, secretKey, region } = req.credentials;
    
    // Clean up the path
    if (path) {
      path = path.replace(/^\/+|\/+$/g, '');
    }
    
    const folderPath = path ? `${path}/${folderName}` : folderName;
    
    logger.info(`Creating folder: ${folderPath} in bucket: ${bucketName}`);
    
    const result = await s3Service.createFolder(accessKey, secretKey, region, bucketName, folderPath);
    
    if (result.success) {
      res.status(201).json({
        success: true,
        message: `Folder "${folderName}" created successfully`
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: result.error
      });
    }
  } catch (error) {
    logger.error('Create folder error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to create folder'
    });
  }
});

module.exports = router;
