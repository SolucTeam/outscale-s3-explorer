
import React, { useEffect } from 'react';
import { Header } from '../components/Header';
import { BucketList } from '../components/BucketList';
import { ActionHistory } from '../components/ActionHistory';
import { BackendStatusIndicator } from '../components/BackendStatusIndicator';
import { useBackendApi } from '../hooks/useBackendApi';

export const DashboardPage = () => {
  const { fetchBuckets } = useBackendApi();

  useEffect(() => {
    fetchBuckets();
  }, [fetchBuckets]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <BucketList />
          </div>
          <div className="lg:w-80">
            <div className="hidden lg:block">
              <ActionHistory />
            </div>
          </div>
        </div>
        <div className="lg:hidden mt-6">
          <ActionHistory />
        </div>
        <BackendStatusIndicator />
      </main>
    </div>
  );
};
