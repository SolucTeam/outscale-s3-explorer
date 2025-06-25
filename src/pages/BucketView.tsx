
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { ObjectList } from '../components/ObjectList';
import { NavigationManager } from '../services/navigationManager';
import { useS3Store } from '../hooks/useS3Store';

export const BucketView: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const { setCurrentBucket } = useS3Store();

  useEffect(() => {
    if (name) {
      NavigationManager.saveCurrentBucket(name);
      NavigationManager.saveCurrentPath('');
      setCurrentBucket(name);
    }
  }, [name, setCurrentBucket]);

  if (!name) {
    return <div>Bucket non trouvé</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <ObjectList />
      </main>
    </div>
  );
};
