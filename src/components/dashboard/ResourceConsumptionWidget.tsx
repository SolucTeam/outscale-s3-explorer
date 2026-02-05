 import React, { useState, useMemo } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Skeleton } from '@/components/ui/skeleton';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { 
   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
   LineChart, Line, PieChart, Pie, Cell, Legend
 } from 'recharts';
 import { 
   TrendingUp, Calendar, Clock, Database, Euro, RefreshCw, 
   AlertCircle, ChevronDown, ChevronUp, Zap
 } from 'lucide-react';
 import { useQuery } from '@tanstack/react-query';
 import { useS3Store } from '@/hooks/useS3Store';
 import { proxyS3Service } from '@/services/proxyS3Service';
 import { format, subMonths, startOfMonth, endOfMonth, subDays } from 'date-fns';
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
 
 const CATEGORY_LABELS: Record<string, string> = {
   'compute': 'Calcul',
   'storage': 'Stockage',
   'network': 'Réseau',
   'database': 'Base de données',
   'other': 'Autre',
 };
 
 const SERVICE_LABELS: Record<string, string> = {
   'TinaOS-OSU': 'Object Storage (OSU)',
   'TinaOS-FCU': 'Compute (FCU)',
   'TinaOS-LBU': 'Load Balancer',
   'TinaOS-DirectLink': 'DirectLink',
   'OKS': 'Kubernetes',
 };
 
 export const ResourceConsumptionWidget: React.FC = () => {
   const { credentials } = useS3Store();
   const [timeRange, setTimeRange] = useState<TimeRange>('month');
   const [isExpanded, setIsExpanded] = useState(false);
   const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
 
   const getDateRange = (range: TimeRange) => {
     const now = new Date();
     let fromDate: Date;
     let toDate = now;
 
     switch (range) {
       case 'day':
         fromDate = subDays(now, 1);
         break;
       case 'week':
         fromDate = subDays(now, 7);
         break;
       case 'month':
         fromDate = startOfMonth(now);
         toDate = endOfMonth(now);
         break;
       case 'quarter':
         fromDate = subMonths(startOfMonth(now), 2);
         break;
       default:
         fromDate = startOfMonth(now);
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
         showResourceDetails: false,
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
     staleTime: 5 * 60 * 1000, // 5 minutes
     retry: 1,
   });
 
   // Agrégation par catégorie
   const categoryData = useMemo(() => {
     if (!data?.ConsumptionEntries) return [];
 
     const grouped: Record<string, { value: number; price: number }> = {};
     
     data.ConsumptionEntries.forEach((entry) => {
       const cat = entry.Category || 'other';
       if (!grouped[cat]) {
         grouped[cat] = { value: 0, price: 0 };
       }
       grouped[cat].value += entry.Value || 0;
       grouped[cat].price += entry.Price || 0;
     });
 
     return Object.entries(grouped)
       .map(([category, data]) => ({
         name: CATEGORY_LABELS[category] || category,
         category,
         value: data.value,
         price: Math.round(data.price * 100) / 100,
       }))
       .sort((a, b) => b.price - a.price);
   }, [data]);
 
   // Agrégation par service
   const serviceData = useMemo(() => {
     if (!data?.ConsumptionEntries) return [];
 
     const grouped: Record<string, { value: number; price: number }> = {};
     
     data.ConsumptionEntries.forEach((entry) => {
       const svc = entry.Service || 'other';
       if (!grouped[svc]) {
         grouped[svc] = { value: 0, price: 0 };
       }
       grouped[svc].value += entry.Value || 0;
       grouped[svc].price += entry.Price || 0;
     });
 
     return Object.entries(grouped)
       .map(([service, data]) => ({
         name: SERVICE_LABELS[service] || service,
         service,
         value: data.value,
         price: Math.round(data.price * 100) / 100,
       }))
       .sort((a, b) => b.price - a.price);
   }, [data]);
 
   // Total global
   const totals = useMemo(() => {
     if (!data?.ConsumptionEntries) return { price: 0, entries: 0 };
 
     const price = data.ConsumptionEntries.reduce((sum, e) => sum + (e.Price || 0), 0);
     return {
       price: Math.round(price * 100) / 100,
       entries: data.ConsumptionEntries.length,
       currency: data.Currency || 'EUR',
     };
   }, [data]);
 
   // Filtrer uniquement les entrées OSU (Object Storage) pour les buckets
   const osuEntries = useMemo(() => {
     if (!data?.ConsumptionEntries) return [];
     return data.ConsumptionEntries.filter(e => e.Service === 'TinaOS-OSU');
   }, [data]);
 
   const osuTotal = useMemo(() => {
     return osuEntries.reduce((sum, e) => sum + (e.Price || 0), 0);
   }, [osuEntries]);
 
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
             <CardTitle className="text-base">Consommation des ressources</CardTitle>
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
               <Zap className="w-4 h-4 text-primary" />
             </div>
             <div>
               <CardTitle className="text-base">Consommation des ressources</CardTitle>
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
         {/* Résumé global */}
         <div className="grid grid-cols-2 gap-3 mb-4">
           <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-3">
             <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
               <Euro className="w-3 h-3" />
               <span>Total estimé</span>
             </div>
             <p className="text-xl font-bold text-primary">
               {totals.price.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
             </p>
           </div>
           <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-lg p-3">
             <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
               <Database className="w-3 h-3" />
               <span>Stockage (OSU)</span>
             </div>
             <p className="text-xl font-bold text-accent-foreground">
               {osuTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
             </p>
           </div>
         </div>
 
         {/* Graphique par catégorie */}
         {categoryData.length > 0 ? (
           <div className="h-[180px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={categoryData} layout="vertical" margin={{ left: 0, right: 20 }}>
                 <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                 <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}€`} />
                 <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
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
           <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
             Aucune donnée de consommation pour cette période
           </div>
         )}
 
         {/* Détails par service (collapsible) */}
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
               Voir les détails par service
             </>
           )}
         </Button>
 
         {isExpanded && serviceData.length > 0 && (
           <div className="mt-3 space-y-2 max-h-[200px] overflow-y-auto">
             {serviceData.map((svc, i) => (
               <div
                 key={svc.service}
                 className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm"
               >
                 <div className="flex items-center gap-2">
                   <div
                     className="w-3 h-3 rounded-full"
                     style={{ backgroundColor: COLORS[i % COLORS.length] }}
                   />
                   <span className="truncate max-w-[150px]">{svc.name}</span>
                 </div>
                 <Badge variant="secondary" className="font-mono">
                   {svc.price.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                 </Badge>
               </div>
             ))}
           </div>
         )}
       </CardContent>
     </Card>
   );
 };