import { 
  S3Client, 
  ListBucketsCommand, 
  CreateBucketCommand, 
  DeleteBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Credentials, S3Bucket, S3Object } from '../types/s3';
import { OutscaleConfig } from './outscaleConfig';

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
      
      // Configuration du client S3 avec options CORS
      this.client = new S3Client({
        region: credentials.region,
        endpoint: OutscaleConfig.getEndpoint(credentials.region),
        credentials: {
          accessKeyId: credentials.accessKey,
          secretAccessKey: credentials.secretKey,
        },
        forcePathStyle: true,
        // Configuration pour éviter les problèmes CORS
        requestHandler: {
          requestTimeout: 30000,
          httpsAgent: undefined
        },
        // Désactiver la signature des requêtes pour les tests
        signerConstructor: undefined
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

    try {
      const command = new ListBucketsCommand({});
      const response = await this.client.send(command);

      const buckets: S3Bucket[] = (response.Buckets || []).map(bucket => ({
        name: bucket.Name || '',
        creationDate: bucket.CreationDate || new Date(),
        region: this.credentials?.region || '',
        objectCount: 0,
        size: 0
      }));

      return { success: true, data: buckets };
    } catch (error) {
      console.error('Erreur getBuckets:', error);
      return {
        success: false,
        error: 'Erreur lors de la récupération des buckets',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async createBucket(name: string): Promise<DirectS3Response<void>> {
    if (!this.client) {
      return { success: false, error: 'Client S3 non initialisé' };
    }

    try {
      const command = new CreateBucketCommand({ Bucket: name });
      await this.client.send(command);
      
      return { success: true };
    } catch (error) {
      console.error('Erreur createBucket:', error);
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
      const command = new DeleteBucketCommand({ Bucket: name });
      await this.client.send(command);
      
      return { success: true };
    } catch (error) {
      console.error('Erreur deleteBucket:', error);
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

    try {
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
      
      // Ajouter les fichiers
      if (response.Contents) {
        response.Contents.forEach(object => {
          if (object.Key && object.Key !== path) {
            objects.push({
              key: object.Key,
              lastModified: object.LastModified || new Date(),
              size: object.Size || 0,
              etag: object.ETag || '',
              storageClass: object.StorageClass || 'STANDARD',
              isFolder: false
            });
          }
        });
      }

      return { success: true, data: objects };
    } catch (error) {
      console.error('Erreur getObjects:', error);
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

  isInitialized(): boolean {
    return !!this.client;
  }
}

export const directS3Service = new DirectS3Service();
