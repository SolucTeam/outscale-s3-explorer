
import React from 'react';
import { Header } from '../components/Header';
import { BucketList } from '../components/BucketList';

export const DashboardPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-6 py-8">
        <BucketList />
      </main>
    </div>
  );
};
