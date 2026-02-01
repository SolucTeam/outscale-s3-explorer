
import React from 'react';
import { BucketList } from '../components/BucketList';
import { ActionHistory } from '../components/ActionHistory';
import { OperationStatusIndicator } from '../components/OperationStatusIndicator';
import { 
  StatsOverview, 
  StorageChart, 
  SecurityAnalysis, 
  PermissionsOverview 
} from '../components/dashboard';

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Stats Overview - Full width */}
        <div className="mb-6">
          <StatsOverview />
        </div>

        {/* Widgets row - 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
          <StorageChart />
          <SecurityAnalysis />
          <PermissionsOverview />
        </div>

        {/* Operation Status */}
        <div className="mb-6">
          <OperationStatusIndicator />
        </div>

        {/* Main content with sidebar */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Bucket List - 2/3 width */}
          <div className="xl:col-span-2">
            <BucketList />
          </div>
          
          {/* Action History Sidebar - 1/3 width */}
          <div className="xl:col-span-1">
            <ActionHistory />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
