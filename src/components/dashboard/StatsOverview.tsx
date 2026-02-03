import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useS3Store } from '@/hooks/useS3Store';
import { Database, FolderOpen, HardDrive, TrendingUp } from 'lucide-react';

export const StatsOverview = () => {
  const { buckets, loading } = useS3Store();

  const stats = useMemo(() => {
    const totalBuckets = buckets.length;
    const totalObjects = buckets.reduce((sum, b) => sum + (b.objectCount || 0), 0);
    const totalSize = buckets.reduce((sum, b) => sum + (b.size || 0), 0);
    const avgObjectsPerBucket = totalBuckets > 0 ? Math.round(totalObjects / totalBuckets) : 0;

    return { totalBuckets, totalObjects, totalSize, avgObjectsPerBucket };
  }, [buckets]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const statCards = [
    {
      title: 'Total Buckets',
      value: stats.totalBuckets,
      icon: Database,
      variant: 'buckets' as const
    },
    {
      title: 'Total Objets',
      value: stats.totalObjects.toLocaleString(),
      icon: FolderOpen,
      variant: 'objects' as const
    },
    {
      title: 'Stockage Total',
      value: formatBytes(stats.totalSize),
      icon: HardDrive,
      variant: 'storage' as const
    },
    {
      title: 'Moy. Objets/Bucket',
      value: stats.avgObjectsPerBucket.toLocaleString(),
      icon: TrendingUp,
      variant: 'average' as const
    }
  ];

  // Skeleton loading state
  if (loading && buckets.length === 0) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, index) => (
          <Card key={index} className="metric-card animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
            <CardContent className="p-4 pl-5">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="w-12 h-12 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <Card 
          key={index} 
          className={`metric-card metric-card--${stat.variant} hover-lift animate-fade-in`}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <CardContent className="p-4 pl-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                <p className="text-2xl font-bold font-mono tracking-tight">{stat.value}</p>
              </div>
              <div className={`metric-icon metric-icon--${stat.variant}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
