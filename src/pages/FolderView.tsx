
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { ObjectList } from '../components/ObjectList';
import { NavigationManager } from '../services/navigationManager';
import { useS3Store } from '../hooks/useS3Store';

export const FolderView: React.FC = () => {
  const { name, path } = useParams<{ name: string; path: string }>();
  const { setCurrentBucket, setCurrentPath } = useS3Store();

  useEffect(() => {
    if (name && path) {
      const decodedPath = decodeURIComponent(path);
      NavigationManager.saveCurrentBucket(name);
      NavigationManager.saveCurrentPath(decodedPath);
      setCurrentBucket(name);
      setCurrentPath(decodedPath);
    }
  }, [name, path, setCurrentBucket, setCurrentPath]);

  if (!name || !path) {
    return <div>Dossier non trouvé</div>;
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
