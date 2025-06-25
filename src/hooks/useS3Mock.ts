
import { useS3Store } from './useS3Store';
import { S3Bucket, S3Object } from '../types/s3';

// Mock data pour la démonstration
const mockBuckets: S3Bucket[] = [
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
  const { setLoading, setBuckets, setObjects, setError } = useS3Store();

  const fetchBuckets = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simuler un délai réseau
      await new Promise(resolve => setTimeout(resolve, 1000));
      setBuckets(mockBuckets);
    } catch (error) {
      setError('Erreur lors du chargement des buckets');
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

  const uploadFile = async (file: File, bucket: string, path: string) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Simuler l'upload réussi
      return true;
    } catch (error) {
      setError('Erreur lors de l\'upload du fichier');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteObject = async (bucket: string, key: string) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
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
    fetchObjects,
    uploadFile,
    deleteObject
  };
};
