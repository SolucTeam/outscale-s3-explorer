
import React, { useEffect } from 'react';
import { useS3Store } from '../hooks/useS3Store';
import { LoginForm } from '../components/LoginForm';
import { Header } from '../components/Header';
import { BucketList } from '../components/BucketList';
import { ObjectList } from '../components/ObjectList';
import { Breadcrumb } from '../components/Breadcrumb';
import { ActionHistory } from '../components/ActionHistory';

const Index = () => {
  const { isAuthenticated, currentBucket, initializeFromUrl } = useS3Store();

  useEffect(() => {
    if (isAuthenticated) {
      initializeFromUrl();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="flex flex-col xl:flex-row gap-4 sm:gap-6">
          {/* Contenu principal */}
          <div className="flex-1 min-w-0">
            <Breadcrumb />
            {currentBucket ? <ObjectList /> : <BucketList />}
          </div>
          
          {/* Historique des actions - caché sur mobile, visible sur desktop */}
          <div className="hidden xl:block w-80 flex-shrink-0">
            <ActionHistory />
          </div>
        </div>
        
        {/* Historique des actions mobile - section séparée en bas */}
        <div className="xl:hidden mt-8">
          <ActionHistory />
        </div>
      </main>
    </div>
  );
};

export default Index;
