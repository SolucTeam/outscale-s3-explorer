
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { ObjectList } from '../components/ObjectList';
import { useS3Store } from '../hooks/useS3Store';

export const FolderPage: React.FC = () => {
  const { bucketName, folderPath } = useParams<{ 
    bucketName: string; 
    folderPath: string; 
  }>();
  const { setCurrentBucket, setCurrentPath } = useS3Store();

  useEffect(() => {
    if (bucketName) {
      setCurrentBucket(bucketName);
    }
    if (folderPath) {
      // Décoder le path encodé
      setCurrentPath(decodeURIComponent(folderPath));
    }
  }, [bucketName, folderPath, setCurrentBucket, setCurrentPath]);

  if (!bucketName) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Bucket non trouvé</h1>
          <p className="text-gray-600">Le nom du bucket est requis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-6 py-8">
        <ObjectList />
      </main>
    </div>
  );
};
