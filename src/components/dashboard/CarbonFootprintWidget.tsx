 import React, { useState, useMemo } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Skeleton } from '@/components/ui/skeleton';
 import { Progress } from '@/components/ui/progress';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { 
   AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
   PieChart, Pie, Cell, Legend
 } from 'recharts';
 import { 
   Leaf, TrendingDown, TrendingUp, RefreshCw, AlertCircle, 
   ChevronDown, ChevronUp, Zap, HardDrive, Wifi, Factory
 } from 'lucide-react';
 import { useQuery } from '@tanstack/react-query';
 import { useS3Store } from '@/hooks/useS3Store';
 import { format, subMonths, startOfMonth } from 'date-fns';
 import { fr } from 'date-fns/locale';
 import { env } from '@/config/environment';
 
 interface CategoryDistribution {
   Category: string;
   Value: number;
 }
 
 interface FactorDistribution {
   Factor: string;
   Value: number;
 }
 
 interface CO2Entry {
   AccountId: string;
   Month: string;
   Value: number;
   PayingAccountId: string;
   CategoryDistribution: CategoryDistribution[];
   FactorDistribution: FactorDistribution[];
 }
 
 interface CarbonResponse {
   Unit: string;
   Value: number;
   CO2EmissionEntries: CO2Entry[];
 }
 
 type TimeRange = '3m' | '6m' | '12m';
 
 const COLORS = [
   'hsl(142, 76%, 36%)',  // Vert
   'hsl(142, 69%, 58%)',  // Vert clair
   'hsl(160, 84%, 39%)',  // Teal
   'hsl(173, 80%, 40%)',  // Cyan
   'hsl(199, 89%, 48%)',  // Bleu
 ];
 
 const CATEGORY_ICONS: Record<string, React.ReactNode> = {
   'compute': <Zap className="w-3 h-3" />,
   'storage': <HardDrive className="w-3 h-3" />,
   'network': <Wifi className="w-3 h-3" />,
 };
 
 const CATEGORY_LABELS: Record<string, string> = {
   'compute': 'Calcul',
   'storage': 'Stockage',
   'network': 'Réseau',
 };
 
 const FACTOR_LABELS: Record<string, string> = {
   'electricity': 'Électricité',
   'hardware': 'Matériel',
   'cooling': 'Refroidissement',
   'other': 'Autre',
 };
 
 export const CarbonFootprintWidget: React.FC = () => {
   const { credentials } = useS3Store();
   const [timeRange, setTimeRange] = useState<TimeRange>('6m');
   const [isExpanded, setIsExpanded] = useState(false);
 
   const getDateRange = (range: TimeRange) => {
     const now = new Date();
     let monthsBack: number;
 
     switch (range) {
       case '3m':
         monthsBack = 3;
         break;
       case '6m':
         monthsBack = 6;
         break;
       case '12m':
         monthsBack = 12;
         break;
       default:
         monthsBack = 6;
     }
 
     const fromMonth = format(startOfMonth(subMonths(now, monthsBack)), 'yyyy-MM-dd');
     const toMonth = format(startOfMonth(now), 'yyyy-MM-dd');
 
     return { fromMonth, toMonth };
   };
 
   const fetchCarbonFootprint = async (): Promise<CarbonResponse | null> => {
     if (!credentials) return null;
 
     const { fromMonth, toMonth } = getDateRange(timeRange);
 
     const response = await fetch(`${env.proxyUrl}/carbon-footprint`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'x-access-key': credentials.accessKey,
         'x-secret-key': credentials.secretKey,
         'x-region': credentials.region,
       },
       body: JSON.stringify({
         fromMonth,
         toMonth,
         overall: false,
       }),
     });
 
     const result = await response.json();
     if (!result.success) {
       throw new Error(result.message || 'Erreur API');
     }
     return result.data;
   };
 
   const { data, isLoading, error, refetch } = useQuery({
     queryKey: ['carbon-footprint', credentials?.accessKey, timeRange],
     queryFn: fetchCarbonFootprint,
     enabled: !!credentials,
     staleTime: 10 * 60 * 1000, // 10 minutes
     retry: 1,
   });
 
   // Données pour le graphique temporel
   const chartData = useMemo(() => {
     if (!data?.CO2EmissionEntries) return [];
 
     return data.CO2EmissionEntries
       .map((entry) => ({
         month: format(new Date(entry.Month), 'MMM yy', { locale: fr }),
         value: Math.round(entry.Value * 1000) / 1000,
         fullDate: entry.Month,
       }))
       .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
   }, [data]);
 
   // Agrégation par catégorie
   const categoryData = useMemo(() => {
     if (!data?.CO2EmissionEntries) return [];
 
     const grouped: Record<string, number> = {};
     
     data.CO2EmissionEntries.forEach((entry) => {
       entry.CategoryDistribution?.forEach((cat) => {
         const key = cat.Category || 'other';
         grouped[key] = (grouped[key] || 0) + cat.Value;
       });
     });
 
     return Object.entries(grouped)
       .map(([category, value]) => ({
         name: CATEGORY_LABELS[category] || category,
         category,
         value: Math.round(value * 1000) / 1000,
       }))
       .sort((a, b) => b.value - a.value);
   }, [data]);
 
   // Agrégation par facteur d'émission
   const factorData = useMemo(() => {
     if (!data?.CO2EmissionEntries) return [];
 
     const grouped: Record<string, number> = {};
     
     data.CO2EmissionEntries.forEach((entry) => {
       entry.FactorDistribution?.forEach((factor) => {
         const key = factor.Factor || 'other';
         grouped[key] = (grouped[key] || 0) + factor.Value;
       });
     });
 
     return Object.entries(grouped)
       .map(([factor, value]) => ({
         name: FACTOR_LABELS[factor] || factor,
         factor,
         value: Math.round(value * 1000) / 1000,
       }))
       .sort((a, b) => b.value - a.value);
   }, [data]);
 
   // Calcul de la tendance
   const trend = useMemo(() => {
     if (chartData.length < 2) return null;
 
     const latest = chartData[chartData.length - 1]?.value || 0;
     const previous = chartData[chartData.length - 2]?.value || 0;
     
     if (previous === 0) return null;
 
     const change = ((latest - previous) / previous) * 100;
     return {
       value: Math.abs(Math.round(change * 10) / 10),
       isPositive: change < 0, // Moins d'émissions = positif
       direction: change < 0 ? 'down' : 'up',
     };
   }, [chartData]);
 
   // Total et unité
   const total = data?.Value || 0;
   const unit = data?.Unit === 'KG' ? 'kg CO₂e' : 't CO₂e';
 
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
             <CardTitle className="text-base">Empreinte Carbone</CardTitle>
           </div>
         </CardHeader>
         <CardContent>
           <p className="text-sm text-muted-foreground mb-3">
             Impossible de charger les données d'empreinte carbone.
           </p>
           <Button variant="outline" size="sm" onClick={() => refetch()}>
             <RefreshCw className="w-4 h-4 mr-2" />
             Réessayer
           </Button>
         </CardContent>
       </Card>
     );
   }
 
   return (
     <Card className="h-full flex flex-col bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20">
       <CardHeader className="pb-3 flex-shrink-0">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
             <div className="p-1.5 bg-emerald-500/20 rounded-lg">
               <Leaf className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
             </div>
             <div>
               <CardTitle className="text-base">Empreinte Carbone</CardTitle>
               <p className="text-xs text-muted-foreground mt-0.5">
                 Estimation des émissions CO₂
               </p>
             </div>
           </div>
           <div className="flex items-center gap-2">
             <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
               <SelectTrigger className="w-[80px] h-8 text-xs">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="3m">3 mois</SelectItem>
                 <SelectItem value="6m">6 mois</SelectItem>
                 <SelectItem value="12m">12 mois</SelectItem>
               </SelectContent>
             </Select>
             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
               <RefreshCw className="w-4 h-4" />
             </Button>
           </div>
         </div>
       </CardHeader>
 
       <CardContent className="flex-1 min-h-0">
         {/* Total avec tendance */}
         <div className="flex items-center justify-between mb-4 p-3 bg-background/80 rounded-lg border">
           <div>
             <p className="text-xs text-muted-foreground">Total période</p>
             <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
               {total.toLocaleString('fr-FR', { maximumFractionDigits: 3 })}
               <span className="text-sm font-normal ml-1">{unit}</span>
             </p>
           </div>
           {trend && (
             <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
               trend.isPositive 
                 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                 : 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
             }`}>
               {trend.isPositive ? (
                 <TrendingDown className="w-3 h-3" />
               ) : (
                 <TrendingUp className="w-3 h-3" />
               )}
               {trend.value}%
             </div>
           )}
         </div>
 
         {/* Graphique temporel */}
         {chartData.length > 0 ? (
           <div className="h-[150px]">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                 <defs>
                   <linearGradient id="carbonGradient" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                     <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                 <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                 <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}`} />
                 <Tooltip
                   formatter={(value: number) => [`${value.toLocaleString('fr-FR')} ${unit}`, 'Émissions']}
                   contentStyle={{
                     backgroundColor: 'hsl(var(--card))',
                     border: '1px solid hsl(var(--border))',
                     borderRadius: '8px',
                     fontSize: '12px',
                   }}
                 />
                 <Area
                   type="monotone"
                   dataKey="value"
                   stroke="hsl(142, 76%, 36%)"
                   strokeWidth={2}
                   fill="url(#carbonGradient)"
                 />
               </AreaChart>
             </ResponsiveContainer>
           </div>
         ) : (
           <div className="h-[150px] flex items-center justify-center text-muted-foreground text-sm">
             Aucune donnée d'émission pour cette période
           </div>
         )}
 
         {/* Répartition par catégorie */}
         <Button
           variant="ghost"
           size="sm"
           className="w-full mt-3 text-xs"
           onClick={() => setIsExpanded(!isExpanded)}
         >
           {isExpanded ? (
             <>
               <ChevronUp className="w-4 h-4 mr-1" />
               Masquer la répartition
             </>
           ) : (
             <>
               <ChevronDown className="w-4 h-4 mr-1" />
               Voir la répartition par catégorie
             </>
           )}
         </Button>
 
         {isExpanded && categoryData.length > 0 && (
           <div className="mt-3 space-y-3">
             <p className="text-xs font-medium text-muted-foreground">Par catégorie</p>
             {categoryData.map((cat, i) => {
               const percentage = total > 0 ? (cat.value / total) * 100 : 0;
               return (
                 <div key={cat.category} className="space-y-1">
               <div className="flex items-center justify-between text-sm text-foreground">
                     <div className="flex items-center gap-2">
                       {CATEGORY_ICONS[cat.category] || <Factory className="w-3 h-3" />}
                       <span>{cat.name}</span>
                     </div>
                     <span className="font-mono text-xs">
                       {cat.value.toLocaleString('fr-FR')} {unit}
                     </span>
                   </div>
                   <Progress 
                     value={percentage} 
                     className="h-1.5"
                     style={{
                       ['--progress-background' as string]: COLORS[i % COLORS.length],
                     }}
                   />
                 </div>
               );
             })}
 
             {factorData.length > 0 && (
               <>
                <p className="text-xs font-medium text-muted-foreground pt-4">Par source d'émission</p>
                 <div className="grid grid-cols-2 gap-2">
                   {factorData.map((factor, i) => (
                     <div
                       key={factor.factor}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs"
                     >
                       <span className="text-muted-foreground">{factor.name}</span>
                      <Badge variant="secondary" className="font-mono">
                         {factor.value.toLocaleString('fr-FR')}
                       </Badge>
                     </div>
                   ))}
                 </div>
               </>
             )}
           </div>
         )}
       </CardContent>
     </Card>
   );
 };