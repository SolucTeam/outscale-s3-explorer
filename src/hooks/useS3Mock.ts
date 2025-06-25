
import { useS3Store } from './useS3Store';
import { S3Bucket, S3Object } from '../types/s3';

// Mock data pour la démonstration
let mockBuckets: S3Bucket[] = [
  {
    name: 'my-app-assets',
    creationDate: new Date('2024-01-15'),
    region: 'eu-west-2',
    objectCount: 145,
    size: 2048576
  },
  {
    name: 'backup-data',
    creationDate: new Date('2024-02-20'),
    region: 'us-east-2',
    objectCount: 23,
    size: 10485760
  },
  {
    name: 'logs-archive',
    creationDate: new Date('2024-03-10'),
    region: 'cloudgouv-eu-west-1',
    objectCount: 892,
    size: 524288000
  }
];

const mockObjects: Record<string, S3Object[]> = {
  'my-app-assets': [
    {
      key: 'images/',
      lastModified: new Date('2024-06-20'),
      size: 0,
      etag: '',
      storageClass: 'STANDARD',
      isFolder: true
    },
    {
      key: 'css/',
      lastModified: new Date('2024-06-18'),
      size: 0,
      etag: '',
      storageClass: 'STANDARD',
      isFolder: true
    },
    {
      key: 'js/',
      lastModified: new Date('2024-06-22'),
      size: 0,
      etag: '',
      storageClass: 'STANDARD',
      isFolder: true
    },
    {
      key: 'favicon.ico',
      lastModified: new Date('2024-06-15'),
      size: 4286,
      etag: '"abc123def456"',
      storageClass: 'STANDARD',
      isFolder: false
    }
  ],
  'my-app-assets/images/': [
    {
      key: 'logo.png',
      lastModified: new Date('2024-06-20'),
      size: 15420,
      etag: '"img123abc"',
      storageClass: 'STANDARD',
      isFolder: false
    },
    {
      key: 'banner.jpg',
      lastModified: new Date('2024-06-19'),
      size: 89432,
      etag: '"img456def"',
      storageClass: 'STANDARD',
      isFolder: false
    }
  ]
};

export const useS3Mock = () => {
  const { setLoading, setBuckets, setObjects, setError, credentials } = useS3Store();

  const generateUniqueFilename = (originalName: string, existingObjects: S3Object[]): string => {
    const existingNames = existingObjects.filter(obj => !obj.isFolder).map(obj => obj.key);
    
    if (!existingNames.includes(originalName)) {
      return originalName;
    }
    
    const nameParts = originalName.split('.');
    const extension = nameParts.length > 1 ? `.${nameParts.pop()}` : '';
    const baseName = nameParts.join('.');
    
    let counter = 1;
    let newName = `${baseName}(${counter})${extension}`;
    
    while (existingNames.includes(newName)) {
      counter++;
      newName = `${baseName}(${counter})${extension}`;
    }
    
    return newName;
  };

  const fetchBuckets = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setBuckets(mockBuckets);
    } catch (error) {
      setError('Erreur lors du chargement des buckets');
    } finally {
      setLoading(false);
    }
  };

  const createBucket = async (bucketName: string, region: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Vérifier si le bucket existe déjà
      if (mockBuckets.find(b => b.name === bucketName)) {
        throw new Error('Un bucket avec ce nom existe déjà');
      }
      
      const newBucket: S3Bucket = {
        name: bucketName,
        creationDate: new Date(),
        region,
        objectCount: 0,
        size: 0
      };
      
      mockBuckets.push(newBucket);
      setBuckets([...mockBuckets]);
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur lors de la création du bucket');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteBucket = async (bucketName: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Supprimer tous les objets du bucket d'abord (suppression forcée)
      Object.keys(mockObjects).forEach(key => {
        if (key.startsWith(bucketName)) {
          delete mockObjects[key];
        }
      });
      
      mockBuckets = mockBuckets.filter(b => b.name !== bucketName);
      setBuckets([...mockBuckets]);
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur lors de la suppression du bucket');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const fetchObjects = async (bucket: string, path: string = '') => {
    setLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const key = path ? `${bucket}/${path}` : bucket;
      const objects = mockObjects[key] || [];
      setObjects(objects);
    } catch (error) {
      setError('Erreur lors du chargement des objets');
    } finally {
      setLoading(false);
    }
  };

  const createFolder = async (bucket: string, path: string, folderName: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const key = path ? `${bucket}/${path}` : bucket;
      const objects = mockObjects[key] || [];
      
      // Vérifier si le dossier existe déjà
      if (objects.find(obj => obj.key === `${folderName}/` && obj.isFolder)) {
        throw new Error('Un dossier avec ce nom existe déjà');
      }
      
      const newFolder: S3Object = {
        key: `${folderName}/`,
        lastModified: new Date(),
        size: 0,
        etag: '',
        storageClass: 'STANDARD',
        isFolder: true
      };
      
      objects.push(newFolder);
      mockObjects[key] = objects;
      setObjects([...objects]);
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur lors de la création du dossier');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File, bucket: string, path: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const key = path ? `${bucket}/${path}` : bucket;
      const objects = mockObjects[key] || [];
      
      // Générer un nom unique pour éviter les collisions
      const uniqueFilename = generateUniqueFilename(file.name, objects);
      
      const newFile: S3Object = {
        key: uniqueFilename,
        lastModified: new Date(),
        size: file.size,
        etag: `"${Math.random().toString(36).substr(2, 9)}"`,
        storageClass: 'STANDARD',
        isFolder: false
      };
      
      objects.push(newFile);
      mockObjects[key] = objects;
      setObjects([...objects]);
      return true;
    } catch (error) {
      setError('Erreur lors de l\'upload du fichier');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteObject = async (bucket: string, objectKey: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Trouver et supprimer l'objet dans tous les chemins possibles
      Object.keys(mockObjects).forEach(key => {
        if (key.startsWith(bucket)) {
          mockObjects[key] = mockObjects[key].filter(obj => obj.key !== objectKey);
          
          // Si c'est un dossier, supprimer aussi tous les objets dans ce dossier
          if (objectKey.endsWith('/')) {
            const folderPrefix = objectKey;
            const subFolderKey = key === bucket ? `${bucket}/${folderPrefix}` : `${key}/${folderPrefix}`;
            delete mockObjects[subFolderKey];
          }
        }
      });
      
      return true;
    } catch (error) {
      setError('Erreur lors de la suppression');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    fetchBuckets,
    createBucket,
    deleteBucket,
    fetchObjects,
    createFolder,
    uploadFile,
    deleteObject
  };
};
