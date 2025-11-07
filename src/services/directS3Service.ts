import { 
  S3Client, 
  ListBucketsCommand, 
  CreateBucketCommand, 
  DeleteBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  GetBucketVersioningCommand,
  PutBucketVersioningCommand,
  GetObjectLockConfigurationCommand,
  GetObjectTaggingCommand,
  PutObjectTaggingCommand,
  DeleteObjectTaggingCommand,
  GetBucketLocationCommand,
  GetBucketEncryptionCommand,
  PutBucketEncryptionCommand,
  DeleteBucketEncryptionCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Credentials, S3Bucket, S3Object } from '../types/s3';
import { OutscaleConfig } from './outscaleConfig';
import { cacheService, CacheService } from './cacheService';

export interface DirectS3Response<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class DirectS3Service {
  private client: S3Client | null = null;
  private credentials: S3Credentials | null = null;

  async initialize(credentials: S3Credentials): Promise<DirectS3Response<boolean>> {
    try {
      console.log('Initializing S3 client with credentials:', {
        region: credentials.region,
        endpoint: OutscaleConfig.getEndpoint(credentials.region),
        accessKey: credentials.accessKey.substring(0, 8) + '...'
      });

      // Valider la région
      if (!OutscaleConfig.isValidRegion(credentials.region)) {
        return {
          success: false,
          error: 'Région non supportée',
          message: 'La région spécifiée n\'est pas supportée par Outscale'
        };
      }

      this.credentials = credentials;
      
      // Configuration du client S3 avec options CORS optimisées
      this.client = new S3Client({
        region: credentials.region,
        endpoint: OutscaleConfig.getEndpoint(credentials.region),
        credentials: {
          accessKeyId: credentials.accessKey,
          secretAccessKey: credentials.secretKey,
        },
        forcePathStyle: true,
        // Configuration avancée pour CORS
        requestHandler: {
          requestTimeout: 30000,
          httpsAgent: undefined
        },
        // Headers CORS personnalisés
        customUserAgent: 'nums3-console/1.0',
        // Désactiver les checks HTTPS pour dev
        tls: false
      });

      console.log('S3 client created, testing connection...');
      
      // Test de connexion
      const testCommand = new ListBucketsCommand({});
      const response = await this.client.send(testCommand);
      
      console.log('Connection test successful:', response);
      
      return { success: true, data: true };
    } catch (error) {
      console.error('Erreur initialisation S3:', error);
      
      // Messages d'erreur plus spécifiques
      let errorMessage = 'Impossible de se connecter à S3';
      let userMessage = 'Vérifiez vos identifiants et votre connexion internet';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Erreur de réseau ou CORS';
          userMessage = 'Problème de connectivité réseau. Vérifiez votre connexion internet et les paramètres de votre navigateur.';
        } else if (error.message.includes('Access Denied') || error.message.includes('InvalidAccessKeyId')) {
          errorMessage = 'Identifiants invalides';
          userMessage = 'Vérifiez votre Access Key et Secret Key';
        } else if (error.message.includes('SignatureDoesNotMatch')) {
          errorMessage = 'Erreur de signature';
          userMessage = 'Vérifiez votre Secret Key';
        }
      }
      
      return {
        success: false,
        error: errorMessage,
        message: userMessage
      };
    }
  }

  async getBuckets(): Promise<DirectS3Response<S3Bucket[]>> {
    if (!this.client) {
      return { success: false, error: 'Client S3 non initialisé' };
    }

    // Vérifier le cache d'abord
    const cacheKey = `buckets_${this.credentials?.region}`;
    const cached = cacheService.get<S3Bucket[]>(cacheKey);
    if (cached) {
      console.log('📦 Buckets récupérés depuis le cache');
      return { success: true, data: cached };
    }

    try {
      console.log('🌐 Chargement des buckets depuis l\'API...');
      const command = new ListBucketsCommand({});
      const response = await this.client.send(command);

      const buckets: S3Bucket[] = await Promise.all(
        (response.Buckets || []).map(async bucket => {
          const bucketName = bucket.Name || '';
          
          // Récupérer le statut du versioning
          let versioningEnabled = false;
          try {
            const versioningCmd = new GetBucketVersioningCommand({ Bucket: bucketName });
            const versioningResponse = await this.client!.send(versioningCmd);
            versioningEnabled = versioningResponse.Status === 'Enabled';
          } catch (error) {
            console.log(`Versioning status not available for ${bucketName}`);
          }
          
          // Récupérer le statut de l'object lock
          let objectLockEnabled = false;
          try {
            const lockCmd = new GetObjectLockConfigurationCommand({ Bucket: bucketName });
            await this.client!.send(lockCmd);
            objectLockEnabled = true;
          } catch (error) {
            // Object lock n'est pas configuré
          }
          
          // Récupérer la location du bucket
          let location = this.credentials?.region;
          try {
            const locationCmd = new GetBucketLocationCommand({ Bucket: bucketName });
            const locationResponse = await this.client!.send(locationCmd);
            location = locationResponse.LocationConstraint || this.credentials?.region || '';
          } catch (error) {
            console.log(`Location not available for ${bucketName}`);
          }
          
          // Récupérer le statut de l'encryption
          let encryptionEnabled = false;
          try {
            const encryptionCmd = new GetBucketEncryptionCommand({ Bucket: bucketName });
            await this.client!.send(encryptionCmd);
            encryptionEnabled = true;
          } catch (error) {
            // Encryption n'est pas configurée
          }
          
          return {
            name: bucketName,
            creationDate: bucket.CreationDate || new Date(),
            region: this.credentials?.region || '',
            location,
            objectCount: 0,
            size: 0,
            versioningEnabled,
            objectLockEnabled,
            encryptionEnabled
          };
        })
      );

      // Mettre en cache
      cacheService.set(cacheKey, buckets, CacheService.TTL.BUCKETS);
      console.log(`✅ ${buckets.length} buckets chargés et mis en cache`);

      return { success: true, data: buckets };
    } catch (error) {
      console.error('❌ Erreur getBuckets:', error);
      return {
        success: false,
        error: 'Erreur lors de la récupération des buckets',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async createBucket(
    name: string, 
    options?: { 
      objectLockEnabled?: boolean;
      versioningEnabled?: boolean;
      encryptionEnabled?: boolean;
    }
  ): Promise<DirectS3Response<void>> {
    if (!this.client) {
      return { success: false, error: 'Client S3 non initialisé' };
    }

    try {
      console.log(`🆕 Création du bucket: ${name}`, options);
      
      // Créer le bucket avec object lock si demandé
      const command = new CreateBucketCommand({ 
        Bucket: name,
        ObjectLockEnabledForBucket: options?.objectLockEnabled
      });
      await this.client.send(command);
      
      // Activer le versioning si demandé (requis pour object lock)
      if (options?.versioningEnabled || options?.objectLockEnabled) {
        await this.setBucketVersioning(name, true);
      }
      
      // Activer l'encryption si demandé
      if (options?.encryptionEnabled) {
        await this.setBucketEncryption(name);
      }
      
      // Invalider le cache des buckets
      const cacheKey = `buckets_${this.credentials?.region}`;
      cacheService.delete(cacheKey);
      console.log(`✅ Bucket "${name}" créé avec succès`);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur createBucket:', error);
      return {
        success: false,
        error: 'Erreur lors de la création du bucket',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async deleteBucket(name: string): Promise<DirectS3Response<void>> {
    if (!this.client) {
      return { success: false, error: 'Client S3 non initialisé' };
    }

    try {
      console.log(`🗑️ Suppression du bucket: ${name}`);
      const command = new DeleteBucketCommand({ Bucket: name });
      await this.client.send(command);
      
      // Invalider tous les caches liés à ce bucket
      const bucketCacheKey = `buckets_${this.credentials?.region}`;
      const objectsCacheKey = `objects_${name}`;
      cacheService.delete(bucketCacheKey);
      cacheService.clearByPattern(objectsCacheKey);
      console.log(`✅ Bucket "${name}" supprimé avec succès`);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur deleteBucket:', error);
      return {
        success: false,
        error: 'Erreur lors de la suppression du bucket',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async getObjects(bucket: string, path: string = ''): Promise<DirectS3Response<S3Object[]>> {
    if (!this.client) {
      return { success: false, error: 'Client S3 non initialisé' };
    }

    // Vérifier le cache d'abord
    const cacheKey = `objects_${bucket}_${path}`;
    const cached = cacheService.get<S3Object[]>(cacheKey);
    if (cached) {
      console.log(`📂 Objets récupérés depuis le cache pour ${bucket}/${path}`);
      return { success: true, data: cached };
    }

    try {
      console.log(`🌐 Chargement des objets pour ${bucket}/${path}...`);
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: path,
        Delimiter: '/'
      });
      
      const response = await this.client.send(command);
      
      const objects: S3Object[] = [];
      
      // Ajouter les dossiers
      if (response.CommonPrefixes) {
        response.CommonPrefixes.forEach(prefix => {
          if (prefix.Prefix) {
            objects.push({
              key: prefix.Prefix,
              lastModified: new Date(),
              size: 0,
              etag: '',
              storageClass: 'STANDARD',
              isFolder: true
            });
          }
        });
      }
      
      // Ajouter les fichiers avec leurs tags
      if (response.Contents) {
        for (const object of response.Contents) {
          if (object.Key && object.Key !== path) {
            let tags: Record<string, string> = {};
            
            // Récupérer les tags de l'objet
            try {
              const tagsCmd = new GetObjectTaggingCommand({
                Bucket: bucket,
                Key: object.Key
              });
              const tagsResponse = await this.client!.send(tagsCmd);
              if (tagsResponse.TagSet) {
                tags = tagsResponse.TagSet.reduce((acc, tag) => {
                  if (tag.Key) {
                    acc[tag.Key] = tag.Value || '';
                  }
                  return acc;
                }, {} as Record<string, string>);
              }
            } catch (error) {
              // Les tags ne sont pas disponibles
            }
            
            objects.push({
              key: object.Key,
              lastModified: object.LastModified || new Date(),
              size: object.Size || 0,
              etag: object.ETag || '',
              storageClass: object.StorageClass || 'STANDARD',
              isFolder: false,
              tags
            });
          }
        }
      }

      // Mettre en cache
      cacheService.set(cacheKey, objects, CacheService.TTL.OBJECTS);
      console.log(`✅ ${objects.length} objets chargés et mis en cache`);

      return { success: true, data: objects };
    } catch (error) {
      console.error('❌ Erreur getObjects:', error);
      return {
        success: false,
        error: 'Erreur lors de la récupération des objets',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async uploadFile(file: File, bucket: string, path: string = ''): Promise<DirectS3Response<void>> {
    if (!this.client) {
      return { success: false, error: 'Client S3 non initialisé' };
    }

    try {
      const key = path ? `${path}/${file.name}` : file.name;
      
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file,
        ContentType: file.type,
        ContentLength: file.size
      });

      await this.client.send(command);
      return { success: true };
    } catch (error) {
      console.error('Erreur uploadFile:', error);
      return {
        success: false,
        error: 'Erreur lors de l\'upload',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async deleteObject(bucket: string, objectKey: string): Promise<DirectS3Response<void>> {
    if (!this.client) {
      return { success: false, error: 'Client S3 non initialisé' };
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: objectKey
      });

      await this.client.send(command);
      return { success: true };
    } catch (error) {
      console.error('Erreur deleteObject:', error);
      return {
        success: false,
        error: 'Erreur lors de la suppression',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async getDownloadUrl(bucket: string, objectKey: string): Promise<DirectS3Response<{ url: string }>> {
    if (!this.client) {
      return { success: false, error: 'Client S3 non initialisé' };
    }

    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: objectKey
      });

      const url = await getSignedUrl(this.client, command, { expiresIn: 3600 });
      return { success: true, data: { url } };
    } catch (error) {
      console.error('Erreur getDownloadUrl:', error);
      return {
        success: false,
        error: 'Erreur lors de la génération du lien',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async createFolder(bucket: string, path: string, folderName: string): Promise<DirectS3Response<void>> {
    if (!this.client) {
      return { success: false, error: 'Client S3 non initialisé' };
    }

    try {
      const key = path ? `${path}/${folderName}/` : `${folderName}/`;
      
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: '',
        ContentLength: 0
      });

      await this.client.send(command);
      return { success: true };
    } catch (error) {
      console.error('Erreur createFolder:', error);
      return {
        success: false,
        error: 'Erreur lors de la création du dossier',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async setBucketVersioning(bucket: string, enabled: boolean): Promise<DirectS3Response<void>> {
    if (!this.client) {
      return { success: false, error: 'Client S3 non initialisé' };
    }

    try {
      const command = new PutBucketVersioningCommand({
        Bucket: bucket,
        VersioningConfiguration: {
          Status: enabled ? 'Enabled' : 'Suspended'
        }
      });

      await this.client.send(command);
      
      // Invalider le cache des buckets
      const cacheKey = `buckets_${this.credentials?.region}`;
      cacheService.delete(cacheKey);
      
      return { success: true };
    } catch (error) {
      console.error('Erreur setBucketVersioning:', error);
      return {
        success: false,
        error: 'Erreur lors de la configuration du versioning',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async setObjectTags(bucket: string, objectKey: string, tags: Record<string, string>): Promise<DirectS3Response<void>> {
    if (!this.client) {
      return { success: false, error: 'Client S3 non initialisé' };
    }

    try {
      const tagSet = Object.entries(tags).map(([Key, Value]) => ({ Key, Value }));
      
      const command = new PutObjectTaggingCommand({
        Bucket: bucket,
        Key: objectKey,
        Tagging: {
          TagSet: tagSet
        }
      });

      await this.client.send(command);
      
      // Invalider le cache des objets
      const cacheKey = `objects_${bucket}`;
      cacheService.clearByPattern(cacheKey);
      
      return { success: true };
    } catch (error) {
      console.error('Erreur setObjectTags:', error);
      return {
        success: false,
        error: 'Erreur lors de la définition des tags',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async deleteObjectTags(bucket: string, objectKey: string): Promise<DirectS3Response<void>> {
    if (!this.client) {
      return { success: false, error: 'Client S3 non initialisé' };
    }

    try {
      const command = new DeleteObjectTaggingCommand({
        Bucket: bucket,
        Key: objectKey
      });

      await this.client.send(command);
      
      // Invalider le cache des objets
      const cacheKey = `objects_${bucket}`;
      cacheService.clearByPattern(cacheKey);
      
      return { success: true };
    } catch (error) {
      console.error('Erreur deleteObjectTags:', error);
      return {
        success: false,
        error: 'Erreur lors de la suppression des tags',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async setBucketEncryption(bucket: string): Promise<DirectS3Response<void>> {
    if (!this.client) {
      return { success: false, error: 'Client S3 non initialisé' };
    }

    try {
      const command = new PutBucketEncryptionCommand({
        Bucket: bucket,
        ServerSideEncryptionConfiguration: {
          Rules: [
            {
              ApplyServerSideEncryptionByDefault: {
                SSEAlgorithm: 'AES256'
              },
              BucketKeyEnabled: true
            }
          ]
        }
      });

      await this.client.send(command);
      
      // Invalider le cache des buckets
      const cacheKey = `buckets_${this.credentials?.region}`;
      cacheService.delete(cacheKey);
      
      return { success: true };
    } catch (error) {
      console.error('Erreur setBucketEncryption:', error);
      return {
        success: false,
        error: 'Erreur lors de l\'activation du chiffrement',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async deleteBucketEncryption(bucket: string): Promise<DirectS3Response<void>> {
    if (!this.client) {
      return { success: false, error: 'Client S3 non initialisé' };
    }

    try {
      const command = new DeleteBucketEncryptionCommand({
        Bucket: bucket
      });

      await this.client.send(command);
      
      // Invalider le cache des buckets
      const cacheKey = `buckets_${this.credentials?.region}`;
      cacheService.delete(cacheKey);
      
      return { success: true };
    } catch (error) {
      console.error('Erreur deleteBucketEncryption:', error);
      return {
        success: false,
        error: 'Erreur lors de la désactivation du chiffrement',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  isInitialized(): boolean {
    return !!this.client;
  }
}

export const directS3Service = new DirectS3Service();
