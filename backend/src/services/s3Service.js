const { S3Client, ListBucketsCommand, CreateBucketCommand, DeleteBucketCommand, 
        ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand, 
        GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const outscaleConfig = require('../config/outscale');
const logger = require('../utils/logger');

class S3Service {
  constructor() {
    this.clients = new Map();
  }

  // Get or create S3 client for specific credentials and region
  getClient(accessKey, secretKey, region) {
    const clientKey = `${accessKey}-${region}`;
    
    if (!this.clients.has(clientKey)) {
      const client = new S3Client({
        region,
        endpoint: outscaleConfig.getEndpoint(region),
        credentials: {
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
        },
        forcePathStyle: true,
        requestHandler: {
          requestTimeout: 30000,
        }
      });
      
      this.clients.set(clientKey, client);
      logger.info(`Created S3 client for region: ${region}`);
    }
    
    return this.clients.get(clientKey);
  }

  // Test connection with credentials
  async testConnection(accessKey, secretKey, region) {
    try {
      const client = this.getClient(accessKey, secretKey, region);
      const command = new ListBucketsCommand({});
      await client.send(command);
      return { success: true };
    } catch (error) {
      logger.error('S3 connection test failed:', error);
      return { 
        success: false, 
        error: this.parseS3Error(error) 
      };
    }
  }

  // Get bucket statistics (size and object count) with timeout
  async getBucketStats(accessKey, secretKey, region, bucketName, timeout = 10000) {
    return new Promise(async (resolve) => {
      const timeoutId = setTimeout(() => {
        logger.warn(`Timeout getting stats for bucket ${bucketName}`);
        resolve({ objectCount: 0, size: 0 });
      }, timeout);

      try {
        const client = this.getClient(accessKey, secretKey, region);
        let totalSize = 0;
        let objectCount = 0;
        let continuationToken = null;

        do {
          const command = new ListObjectsV2Command({
            Bucket: bucketName,
            ContinuationToken: continuationToken,
            MaxKeys: 1000 // Limit to avoid very long requests
          });

          const response = await client.send(command);
          
          if (response.Contents) {
            response.Contents.forEach(object => {
              if (object.Size) {
                totalSize += object.Size;
              }
              objectCount++;
            });
          }

          continuationToken = response.NextContinuationToken;
        } while (continuationToken);

        clearTimeout(timeoutId);
        resolve({ objectCount, size: totalSize });
      } catch (error) {
        clearTimeout(timeoutId);
        logger.warn(`Failed to get stats for bucket ${bucketName}:`, error);
        resolve({ objectCount: 0, size: 0 });
      }
    });
  }

  // List all buckets - return basic info first, then enrich with stats
  async listBuckets(accessKey, secretKey, region) {
    try {
      const client = this.getClient(accessKey, secretKey, region);
      const command = new ListBucketsCommand({});
      const response = await client.send(command);
      
      if (!response.Buckets || response.Buckets.length === 0) {
        return { success: true, data: [] };
      }

      // Return buckets immediately with basic info
      const basicBuckets = response.Buckets.map(bucket => ({
        name: bucket.Name,
        creationDate: bucket.CreationDate,
        region: region,
        objectCount: 0,
        size: 0
      }));

      logger.info(`Found ${basicBuckets.length} buckets, calculating stats...`);

      // Try to get stats for each bucket with limited concurrency to avoid overwhelming the API
      const enrichBucketsWithStats = async () => {
        const bucketStatsPromises = response.Buckets.map(async (bucket) => {
          const stats = await this.getBucketStats(accessKey, secretKey, region, bucket.Name, 8000);
          return {
            name: bucket.Name,
            creationDate: bucket.CreationDate,
            region: region,
            objectCount: stats.objectCount,
            size: stats.size
          };
        });

        try {
          const bucketsWithStats = await Promise.all(bucketStatsPromises);
          logger.info(`Successfully calculated stats for all buckets`);
          return bucketsWithStats;
        } catch (error) {
          logger.warn('Some bucket stats failed, returning basic info:', error);
          return basicBuckets;
        }
      };

      // For now, return basic buckets immediately
      // In a real-world scenario, you might want to implement server-sent events 
      // or WebSocket to update stats progressively
      const enrichedBuckets = await enrichBucketsWithStats();
      
      return { success: true, data: enrichedBuckets };
    } catch (error) {
      logger.error('Failed to list buckets:', error);
      return { 
        success: false, 
        error: this.parseS3Error(error) 
      };
    }
  }

  // Create bucket
  async createBucket(accessKey, secretKey, region, bucketName) {
    try {
      const client = this.getClient(accessKey, secretKey, region);
      const command = new CreateBucketCommand({ Bucket: bucketName });
      await client.send(command);
      
      logger.info(`Bucket created: ${bucketName} in region: ${region}`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to create bucket ${bucketName}:`, error);
      return { 
        success: false, 
        error: this.parseS3Error(error) 
      };
    }
  }

  // Delete bucket
  async deleteBucket(accessKey, secretKey, region, bucketName) {
    try {
      const client = this.getClient(accessKey, secretKey, region);
      const command = new DeleteBucketCommand({ Bucket: bucketName });
      await client.send(command);
      
      logger.info(`Bucket deleted: ${bucketName}`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to delete bucket ${bucketName}:`, error);
      return { 
        success: false, 
        error: this.parseS3Error(error) 
      };
    }
  }

  // List objects in bucket
  async listObjects(accessKey, secretKey, region, bucketName, prefix = '') {
    try {
      const client = this.getClient(accessKey, secretKey, region);
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        Delimiter: '/'
      });
      
      const response = await client.send(command);
      const objects = [];
      
      // Add folders (common prefixes)
      if (response.CommonPrefixes) {
        response.CommonPrefixes.forEach(commonPrefix => {
          objects.push({
            key: commonPrefix.Prefix,
            lastModified: new Date(),
            size: 0,
            etag: '',
            storageClass: 'FOLDER',
            isFolder: true
          });
        });
      }
      
      // Add files
      if (response.Contents) {
        response.Contents.forEach(object => {
          if (object.Key && object.Key !== prefix) {
            objects.push({
              key: object.Key,
              lastModified: object.LastModified,
              size: object.Size,
              etag: object.ETag,
              storageClass: object.StorageClass,
              isFolder: false
            });
          }
        });
      }
      
      return { success: true, data: objects };
    } catch (error) {
      logger.error(`Failed to list objects in bucket ${bucketName}:`, error);
      return { 
        success: false, 
        error: this.parseS3Error(error) 
      };
    }
  }

  // Upload object
  async uploadObject(accessKey, secretKey, region, bucketName, objectKey, fileBuffer, contentType) {
    try {
      const client = this.getClient(accessKey, secretKey, region);
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: fileBuffer,
        ContentType: contentType
      });
      
      await client.send(command);
      logger.info(`Object uploaded: ${objectKey} to bucket: ${bucketName}`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to upload object ${objectKey}:`, error);
      return { 
        success: false, 
        error: this.parseS3Error(error) 
      };
    }
  }

  // Delete object
  async deleteObject(accessKey, secretKey, region, bucketName, objectKey) {
    try {
      const client = this.getClient(accessKey, secretKey, region);
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: objectKey
      });
      
      await client.send(command);
      logger.info(`Object deleted: ${objectKey} from bucket: ${bucketName}`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to delete object ${objectKey}:`, error);
      return { 
        success: false, 
        error: this.parseS3Error(error) 
      };
    }
  }

  // Get download URL
  async getDownloadUrl(accessKey, secretKey, region, bucketName, objectKey) {
    try {
      const client = this.getClient(accessKey, secretKey, region);
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: objectKey
      });
      
      const url = await getSignedUrl(client, command, { expiresIn: 3600 });
      return { success: true, data: { url } };
    } catch (error) {
      logger.error(`Failed to generate download URL for ${objectKey}:`, error);
      return { 
        success: false, 
        error: this.parseS3Error(error) 
      };
    }
  }

  // Create folder (empty object with trailing slash)
  async createFolder(accessKey, secretKey, region, bucketName, folderPath) {
    try {
      const client = this.getClient(accessKey, secretKey, region);
      const objectKey = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
      
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: '',
        ContentLength: 0
      });
      
      await client.send(command);
      logger.info(`Folder created: ${objectKey} in bucket: ${bucketName}`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to create folder ${folderPath}:`, error);
      return { 
        success: false, 
        error: this.parseS3Error(error) 
      };
    }
  }

  // Parse S3 errors to user-friendly messages
  parseS3Error(error) {
    if (error.name === 'NoSuchBucket') {
      return 'Bucket not found';
    }
    if (error.name === 'AccessDenied') {
      return 'Access denied - check your credentials';
    }
    if (error.name === 'InvalidAccessKeyId') {
      return 'Invalid access key';
    }
    if (error.name === 'SignatureDoesNotMatch') {
      return 'Invalid secret key';
    }
    if (error.name === 'BucketAlreadyExists') {
      return 'Bucket name already exists';
    }
    if (error.name === 'BucketNotEmpty') {
      return 'Bucket is not empty';
    }
    if (error.message && error.message.includes('ENOTFOUND')) {
      return 'Network error - check your internet connection';
    }
    
    return error.message || 'Unknown S3 error occurred';
  }
}

module.exports = new S3Service();
