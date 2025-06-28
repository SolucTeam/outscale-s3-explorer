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

  // Helper method to delete all objects in a bucket
  async deleteAllObjectsInBucket(accessKey, secretKey, region, bucketName) {
    const client = this.getClient(accessKey, secretKey, region);
    let deletedCount = 0;
    let hasMoreObjects = true;

    while (hasMoreObjects) {
      try {
        // List objects in the bucket
        const listCommand = new ListObjectsV2Command({
          Bucket: bucketName,
          MaxKeys: 1000
        });
        
        const listResponse = await client.send(listCommand);
        
        if (!listResponse.Contents || listResponse.Contents.length === 0) {
          hasMoreObjects = false;
          break;
        }

        // Delete objects in batch
        for (const object of listResponse.Contents) {
          if (object.Key) {
            try {
              const deleteCommand = new DeleteObjectCommand({
                Bucket: bucketName,
                Key: object.Key
              });
              
              await client.send(deleteCommand);
              deletedCount++;
              logger.info(`Deleted object: ${object.Key} from bucket: ${bucketName}`);
            } catch (deleteError) {
              logger.warn(`Failed to delete object ${object.Key}:`, deleteError);
            }
          }
        }

        // Check if there are more objects
        hasMoreObjects = listResponse.IsTruncated || false;
      } catch (error) {
        logger.error(`Error listing/deleting objects in bucket ${bucketName}:`, error);
        hasMoreObjects = false;
      }
    }

    return deletedCount;
  }

  // Get bucket statistics (size and object count) with proper counting
  async getBucketStats(accessKey, secretKey, region, bucketName, timeout = 15000) {
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

        logger.info(`Calculating stats for bucket: ${bucketName}`);

        do {
          const command = new ListObjectsV2Command({
            Bucket: bucketName,
            ContinuationToken: continuationToken,
            MaxKeys: 1000
          });

          const response = await client.send(command);
          
          if (response.Contents) {
            response.Contents.forEach(object => {
              // Ne compter que les objets réels, pas les dossiers vides
              if (object.Key && !object.Key.endsWith('/')) {
                if (object.Size) {
                  totalSize += object.Size;
                }
                objectCount++;
              }
            });
          }

          continuationToken = response.NextContinuationToken;
          
          // Log du progrès
          if (objectCount > 0) {
            logger.info(`Bucket ${bucketName}: ${objectCount} objets trouvés, ${totalSize} bytes`);
          }
        } while (continuationToken);

        clearTimeout(timeoutId);
        logger.info(`Stats finales pour ${bucketName}: ${objectCount} objets, ${totalSize} bytes`);
        resolve({ objectCount, size: totalSize });
      } catch (error) {
        clearTimeout(timeoutId);
        logger.warn(`Failed to get stats for bucket ${bucketName}:`, error);
        resolve({ objectCount: 0, size: 0 });
      }
    });
  }

  // List all buckets - return enriched data with stats
  async listBuckets(accessKey, secretKey, region) {
    try {
      const client = this.getClient(accessKey, secretKey, region);
      const command = new ListBucketsCommand({});
      const response = await client.send(command);
      
      if (!response.Buckets || response.Buckets.length === 0) {
        return { success: true, data: [] };
      }

      logger.info(`Found ${response.Buckets.length} buckets, calculating stats...`);

      // Calculer les statistiques pour chaque bucket avec limitation de concurrence
      const bucketStatsPromises = response.Buckets.map(async (bucket) => {
        try {
          const stats = await this.getBucketStats(accessKey, secretKey, region, bucket.Name, 12000);
          return {
            name: bucket.Name,
            creationDate: bucket.CreationDate,
            region: region,
            objectCount: stats.objectCount,
            size: stats.size
          };
        } catch (error) {
          logger.warn(`Failed to get stats for bucket ${bucket.Name}:`, error);
          return {
            name: bucket.Name,
            creationDate: bucket.CreationDate,
            region: region,
            objectCount: 0,
            size: 0
          };
        }
      });

      // Exécuter les promesses avec un délai pour éviter de surcharger l'API
      const bucketsWithStats = [];
      for (const promise of bucketStatsPromises) {
        const result = await promise;
        bucketsWithStats.push(result);
        // Petit délai entre les buckets pour éviter la surcharge
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.info(`Successfully calculated stats for ${bucketsWithStats.length} buckets`);
      return { success: true, data: bucketsWithStats };
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

  // Delete bucket - now with force delete capability
  async deleteBucket(accessKey, secretKey, region, bucketName, forceDelete = false) {
    try {
      const client = this.getClient(accessKey, secretKey, region);
      
      if (forceDelete) {
        // First, delete all objects in the bucket
        const deletedObjects = await this.deleteAllObjectsInBucket(accessKey, secretKey, region, bucketName);
        logger.info(`Deleted ${deletedObjects} objects from bucket ${bucketName} before deletion`);
      }
      
      // Then delete the bucket
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

  // List objects in bucket - improved folder detection
  async listObjects(accessKey, secretKey, region, bucketName, prefix = '') {
    try {
      const client = this.getClient(accessKey, secretKey, region);
      
      // Ensure prefix ends with / if it's not empty and doesn't already end with /
      const normalizedPrefix = prefix && !prefix.endsWith('/') ? `${prefix}/` : prefix;
      
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: normalizedPrefix,
        Delimiter: '/'
      });
      
      const response = await client.send(command);
      const objects = [];
      
      // Add folders (common prefixes) - these represent "virtual directories"
      if (response.CommonPrefixes) {
        response.CommonPrefixes.forEach(commonPrefix => {
          if (commonPrefix.Prefix && 
              commonPrefix.Prefix !== normalizedPrefix) {
            
            // Extract folder name from the prefix
            const folderName = commonPrefix.Prefix.replace(normalizedPrefix, '').replace(/\/+$/, '');
            if (folderName) {
              objects.push({
                key: folderName,
                lastModified: new Date(),
                size: 0,
                etag: '',
                storageClass: 'FOLDER',
                isFolder: true
              });
            }
          }
        });
      }
      
      // Add files
      if (response.Contents) {
        response.Contents.forEach(object => {
          // Skip the prefix itself and folder markers
          if (object.Key && 
              object.Key !== normalizedPrefix && 
              !object.Key.endsWith('/')) {
            
            // Extract file name from the key
            const fileName = object.Key.replace(normalizedPrefix, '');
            
            // Only add if it's a direct child (no additional slashes)
            if (fileName && !fileName.includes('/')) {
              objects.push({
                key: fileName,
                lastModified: object.LastModified,
                size: object.Size,
                etag: object.ETag,
                storageClass: object.StorageClass,
                isFolder: false
              });
            }
          }
        });
      }
      
      logger.info(`Listed ${objects.length} objects in bucket ${bucketName} with prefix "${normalizedPrefix}"`);
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
