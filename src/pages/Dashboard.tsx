import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { BucketList } from '../components/BucketList';
import { ActionHistory } from '../components/ActionHistory';
import { OperationStatusIndicator } from '../components/OperationStatusIndicator';
import { 
  StatsOverview, 
  StorageChart, 
  SecurityAnalysis, 
  PermissionsOverview,
  WidgetSettingsDialog,
  ResourceConsumptionWidget,
  CarbonFootprintWidget
} from '../components/dashboard';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardPreferences } from '@/stores/dashboardPreferencesStore';

const widgetComponents: Record<string, React.FC> = {
  stats: StatsOverview,
  storage: StorageChart,
  security: SecurityAnalysis,
  permissions: PermissionsOverview,
};

const WidgetWrapper: React.FC<{ children: React.ReactNode; id: string; index: number }> = ({ 
  children, 
  id, 
  index 
}) => (
  <div
    key={id}
    className="animate-fade-in transition-all duration-500 ease-out"
    style={{ 
      animationDelay: `${index * 100}ms`,
      animationFillMode: 'backwards'
    }}
  >
    {children}
  </div>
);

const Dashboard = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { widgets } = useDashboardPreferences();

  // Listen for custom event from header menu
  useEffect(() => {
    const handleOpenSettings = () => setSettingsOpen(true);
    window.addEventListener('open-dashboard-settings', handleOpenSettings);
    return () => window.removeEventListener('open-dashboard-settings', handleOpenSettings);
  }, []);

  const visibleWidgets = useMemo(() => {
    return widgets
      .filter((w) => w.visible)
      .sort((a, b) => a.order - b.order);
  }, [widgets]);

  const statsWidget = visibleWidgets.find((w) => w.id === 'stats');
  const rowWidgets = visibleWidgets.filter((w) => ['storage', 'security', 'permissions'].includes(w.id));
  const consumptionWidget = visibleWidgets.find((w) => w.id === 'consumption');
  const carbonWidget = visibleWidgets.find((w) => w.id === 'carbon');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">

        {/* Stats Overview - Full width (if visible) */}
        <div className={`transition-all duration-500 ease-out overflow-hidden ${
          statsWidget ? 'opacity-100 max-h-96 mb-6' : 'opacity-0 max-h-0 mb-0'
        }`}>
          {statsWidget && <StatsOverview />}
        </div>

        {/* Widgets row - dynamic based on visibility */}
        <div className={`transition-all duration-500 ease-out overflow-hidden ${
          rowWidgets.length > 0 ? 'opacity-100 max-h-[800px] mb-6' : 'opacity-0 max-h-0 mb-0'
        }`}>
          <div className={`grid gap-6 transition-all duration-300 ${
            rowWidgets.length === 1 
              ? 'grid-cols-1' 
              : rowWidgets.length === 2 
                ? 'grid-cols-1 md:grid-cols-2' 
                : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
          }`}>
            {rowWidgets.map((widget, index) => {
              const Component = widgetComponents[widget.id];
              return Component ? (
                <WidgetWrapper key={widget.id} id={widget.id} index={index}>
                  <Component />
                </WidgetWrapper>
              ) : null;
            })}
          </div>
        </div>

        {/* Operation Status */}
        <div className="mb-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <OperationStatusIndicator />
        </div>

        {/* Main content with sidebar */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Bucket List - 2/3 width */}
          <div className="xl:col-span-2 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <BucketList />
          </div>
          
          {/* Action History Sidebar - 1/3 width */}
          <div className="xl:col-span-1 animate-fade-in" style={{ animationDelay: '400ms' }}>
            <ActionHistory />
            
            {/* Widgets de consommation sous l'historique */}
            <div className="mt-6 space-y-6">
              {consumptionWidget && (
                <div className="animate-fade-in" style={{ animationDelay: '500ms' }}>
                  <ResourceConsumptionWidget />
                </div>
              )}
              {carbonWidget && (
                <div className="animate-fade-in" style={{ animationDelay: '600ms' }}>
                  <CarbonFootprintWidget />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Widget Settings Dialog */}
      <WidgetSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default Dashboard;
