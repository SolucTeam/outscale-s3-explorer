
import React from 'react';
import { BucketList } from '../components/BucketList';
import { ActionHistory } from '../components/ActionHistory';
import { OperationStatusIndicator } from '../components/OperationStatusIndicator';

export const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="xl:col-span-2 space-y-6">
            <OperationStatusIndicator />
            <BucketList />
          </div>
          
          {/* Sidebar - positioned lower */}
          <div className="xl:col-span-1 space-y-4 pt-4">
            <ActionHistory />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
