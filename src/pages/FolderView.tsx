
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { ObjectList } from '../components/ObjectList';
import { NavigationManager } from '../services/navigationManager';

export const FolderView: React.FC = () => {
  const { name, path } = useParams<{ name: string; path: string }>();

  useEffect(() => {
    if (name && path) {
      NavigationManager.saveCurrentBucket(name);
      NavigationManager.saveCurrentPath(decodeURIComponent(path));
    }
  }, [name, path]);

  if (!name || !path) {
    return <div>Dossier non trouvé</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <ObjectList bucketName={name} folderPath={decodeURIComponent(path)} />
      </main>
    </div>
  );
};
