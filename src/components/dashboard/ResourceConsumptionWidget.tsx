import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  Database, Euro, RefreshCw, AlertCircle, ChevronDown, ChevronUp, HardDrive
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useS3Store } from '@/hooks/useS3Store';
import { format, subMonths, startOfMonth, subDays, lastDayOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { env } from '@/config/environment';

interface ConsumptionEntry {
  AccountId: string;
  Category: string;
  FromDate: string;
  ToDate: string;
  Operation: string;
  Service: string;
  SubregionName?: string;
  Title: string;
  Type: string;
  Value: number;
  Price?: number;
  UnitPrice?: number;
}

interface ConsumptionResponse {
  ConsumptionEntries: ConsumptionEntry[];
  Currency?: string;
}

type TimeRange = 'day' | 'week' | 'month' | 'quarter';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export const ResourceConsumptionWidget: React.FC = () => {
  const { credentials } = useS3Store();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [isExpanded, setIsExpanded] = useState(false);

  const getDateRange = (range: TimeRange) => {
    const now = new Date();
    let fromDate: Date;
    let toDate: Date;

    const lastAvailableDate = subDays(now, 1);

    switch (range) {
      case 'day':
        fromDate = subDays(now, 2);
        toDate = lastAvailableDate;
        break;
      case 'week':
        fromDate = subDays(now, 8);
        toDate = lastAvailableDate;
        break;
      case 'month':
        fromDate = startOfMonth(subMonths(now, 1));
        toDate = lastAvailableDate;
        break;
      case 'quarter':
        fromDate = subMonths(startOfMonth(now), 2);
        toDate = lastDayOfMonth(subMonths(now, 1));
        break;
      default:
        fromDate = startOfMonth(now);
        toDate = lastAvailableDate;
    }

    return {
      fromDate: format(fromDate, 'yyyy-MM-dd'),
      toDate: format(toDate, 'yyyy-MM-dd'),
    };
  };

  const fetchConsumption = async (): Promise<ConsumptionResponse | null> => {
    if (!credentials) return null;

    const { fromDate, toDate } = getDateRange(timeRange);

    const response = await fetch(`${env.proxyUrl}/consumption`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-access-key': credentials.accessKey,
        'x-secret-key': credentials.secretKey,
        'x-region': credentials.region,
      },
      body: JSON.stringify({
        fromDate,
        toDate,
        showPrice: true,
      }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Erreur API');
    }
    return result.data;
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['consumption', credentials?.accessKey, timeRange],
    queryFn: fetchConsumption,
    enabled: !!credentials,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // ✅ Filtrer uniquement TinaOS-OOS
  const oosEntries = useMemo(() => {
    if (!data?.ConsumptionEntries) return [];
    return data.ConsumptionEntries.filter(e => e.Service === 'TinaOS-OOS');
  }, [data]);

  // Total OOS
  const oosTotal = useMemo(() => {
    return oosEntries.reduce((sum, e) => sum + (e.Price || 0), 0);
  }, [oosEntries]);

  // Agrégation par Type/Operation pour les détails
  const detailsData = useMemo(() => {
    if (!oosEntries.length) return [];

    const grouped: Record<string, { value: number; price: number; title: string }> = {};
    
    oosEntries.forEach((entry) => {
      const key = entry.Type || entry.Operation || 'other';
      if (!grouped[key]) {
        grouped[key] = { value: 0, price: 0, title: entry.Title || key };
      }
      grouped[key].value += entry.Value || 0;
      grouped[key].price += entry.Price || 0;
    });

    return Object.entries(grouped)
      .map(([type, data]) => ({
        type,
        name: data.title,
        value: data.value,
        price: Math.round(data.price * 100) / 100,
      }))
      .filter(d => d.price > 0)
      .sort((a, b) => b.price - a.price);
  }, [oosEntries]);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-40" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-[200px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full border-destructive/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <CardTitle className="text-base">Consommation Stockage</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Impossible de charger les données de consommation.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { fromDate, toDate } = getDateRange(timeRange);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <HardDrive className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Consommation Stockage (OOS)</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(fromDate), 'd MMM', { locale: fr })} - {format(new Date(toDate), 'd MMM yyyy', { locale: fr })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Jour</SelectItem>
                <SelectItem value="week">Semaine</SelectItem>
                <SelectItem value="month">Mois</SelectItem>
                <SelectItem value="quarter">Trimestre</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0">
        {/* Total OOS */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Euro className="w-3 h-3" />
            <span>Total Stockage Objet</span>
          </div>
          <p className="text-2xl font-bold text-primary">
            {oosTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {oosEntries.length} opération{oosEntries.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Graphique par type */}
        {detailsData.length > 0 ? (
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={detailsData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}€`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={100} />
                <Tooltip 
                  formatter={(value: number) => [`${value.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`, 'Coût']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="price" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[150px] flex items-center justify-center text-muted-foreground text-sm">
            Aucune donnée de stockage pour cette période
          </div>
        )}

        {/* Détails (collapsible) */}
        {detailsData.length > 0 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3 text-xs"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Masquer les détails
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Voir tous les détails
                </>
              )}
            </Button>

            {isExpanded && (
              <div className="mt-3 space-y-2 max-h-[200px] overflow-y-auto">
                {detailsData.map((item, i) => (
                  <div
                    key={item.type}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="truncate max-w-[180px] text-xs">{item.name}</span>
                    </div>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {item.price.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};