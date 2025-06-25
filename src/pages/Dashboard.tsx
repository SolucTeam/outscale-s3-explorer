
import React from 'react';
import { Header } from '../components/Header';
import { BucketList } from '../components/BucketList';
import { ActionHistory } from '../components/ActionHistory';

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="flex flex-col xl:flex-row gap-4 sm:gap-6">
          <div className="flex-1 min-w-0">
            <BucketList />
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

export default Dashboard;
