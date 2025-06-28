
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { ObjectList } from '../components/ObjectList';
import { Breadcrumb } from '../components/Breadcrumb';
import { ActionHistory } from '../components/ActionHistory';
import { OperationStatusIndicator } from '../components/OperationStatusIndicator';
import { useS3Store } from '../hooks/useS3Store';

const BucketView = () => {
  const { name } = useParams<{ name: string }>();
  const { setCurrentBucket, setCurrentPath, currentBucket } = useS3Store();

  useEffect(() => {
    if (name && name !== currentBucket) {
      console.log('BucketView: Setting bucket and path', { name, currentBucket });
      setCurrentBucket(name);
      setCurrentPath('');
    }
  }, [name, setCurrentBucket, setCurrentPath, currentBucket]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="flex flex-col xl:flex-row gap-4 sm:gap-6">
          <div className="flex-1 min-w-0 space-y-4">
            <OperationStatusIndicator />
            <Breadcrumb />
            <ObjectList />
          </div>
          <div className="hidden xl:block w-80 flex-shrink-0">
            <ActionHistory />
          </div>
        </div>
        <div className="xl:hidden mt-8">
          <ActionHistory />
        </div>
      </main>
    </div>
  );
};

export default BucketView;
