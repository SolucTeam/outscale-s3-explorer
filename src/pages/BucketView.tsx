
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { ObjectList } from '../components/ObjectList';
import { NavigationManager } from '../services/navigationManager';

export const BucketView: React.FC = () => {
  const { name } = useParams<{ name: string }>();

  useEffect(() => {
    if (name) {
      NavigationManager.saveCurrentBucket(name);
      NavigationManager.saveCurrentPath('');
    }
  }, [name]);

  if (!name) {
    return <div>Bucket non trouvé</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <ObjectList bucketName={name} />
      </main>
    </div>
  );
};
