
import React, { useEffect } from 'react';
import { Header } from '../components/Header';
import { BucketList } from '../components/BucketList';
import { NavigationManager } from '../services/navigationManager';

export const Dashboard: React.FC = () => {
  useEffect(() => {
    // Nettoyer l'état de navigation bucket au retour au dashboard
    NavigationManager.saveCurrentBucket(null);
    NavigationManager.saveCurrentPath('');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <BucketList />
      </main>
    </div>
  );
};
