import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useS3Store } from '@/hooks/useS3Store';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { HardDrive } from 'lucide-react';

// Cohesive teal/cyan palette for cloud theme (5 main colors)
const CHART_COLORS = [
  'hsl(187, 80%, 42%)',  // Primary teal
  'hsl(175, 70%, 45%)',  // Lighter teal
  'hsl(195, 75%, 50%)',  // Cyan
  'hsl(160, 65%, 45%)',  // Green-teal
  'hsl(210, 70%, 55%)',  // Blue
];

export const StorageChart = () => {
  const { buckets, loading } = useS3Store();

  const chartData = useMemo(() => {
    const bucketsWithSize = buckets
      .filter(b => (b.size || 0) > 0)
      .map(b => ({
        name: b.name,
        value: b.size || 0,
        formattedSize: formatBytes(b.size || 0)
      }))
      .sort((a, b) => b.value - a.value);

    // Show top 4 buckets + "Autres" if more than 5
    if (bucketsWithSize.length > 5) {
      const top4 = bucketsWithSize.slice(0, 4);
      const others = bucketsWithSize.slice(4);
      const othersTotal = others.reduce((sum, b) => sum + b.value, 0);
      
      return [
        ...top4,
        {
          name: `Autres (${others.length})`,
          value: othersTotal,
          formattedSize: formatBytes(othersTotal)
        }
      ];
    }

    return bucketsWithSize.slice(0, 5);
  }, [buckets]);

  const totalSize = useMemo(() => {
    return buckets.reduce((sum, b) => sum + (b.size || 0), 0);
  }, [buckets]);

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const percent = ((payload[0].value / totalSize) * 100).toFixed(1);
      return (
        <div className="bg-card border border-border rounded-lg shadow-medium p-3 animate-scale-in">
          <p className="font-medium text-foreground">{payload[0].payload.name}</p>
          <p className="text-sm text-muted-foreground font-mono">
            {payload[0].payload.formattedSize}
          </p>
          <p className="text-sm text-primary font-mono font-medium">
            {percent}% du total
          </p>
        </div>
      );
    }
    return null;
  };

  // Skeleton loading state
  if (loading && buckets.length === 0) {
    return (
      <Card className="border-0 shadow-soft animate-fade-in h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="h-4 w-24 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center">
            <div className="relative">
              <Skeleton className="w-40 h-40 rounded-full" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Skeleton className="w-24 h-24 rounded-full bg-background" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="border-0 shadow-soft animate-fade-in h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-primary" />
            Utilisation du Stockage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            <p>Aucune donnée de stockage disponible</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-soft animate-fade-in h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-primary" />
          Utilisation du Stockage
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Total: <span className="font-mono font-medium text-foreground">{formatBytes(totalSize)}</span>
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              {/* Inner fill (avoid white donut hole) */}
              <Pie
                data={[{ name: 'center', value: 1 }]}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={0}
                outerRadius={50}
                fill="hsl(var(--muted))"
                isAnimationActive={false}
                stroke="none"
                strokeWidth={0}
              />

              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={0}
                minAngle={1}
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
                stroke="none"
                strokeWidth={0}
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                    stroke="none"
                    strokeWidth={0}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                formatter={(value) => (
                  <span className="text-xs text-foreground">
                    {value.length > 15 ? value.slice(0, 15) + '...' : value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
