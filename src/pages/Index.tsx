
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
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Breadcrumb />
            {currentBucket ? <ObjectList /> : <BucketList />}
          </div>
          <div className="lg:col-span-1">
            <ActionHistory />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
