import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useActionHistoryStore, OperationType } from '../stores/actionHistoryStore';
import { useActiveOperationsStore } from '../stores/activeOperationsStore';
import { useS3Store } from '../hooks/useS3Store';
import { useHistorySync } from '../hooks/useHistorySync';
import { 
  Activity, Clock, CheckCircle, XCircle, AlertCircle, Filter, Trash2, User, 
  Settings, ChevronLeft, ChevronRight, X, Loader2, Cloud, CloudOff, RefreshCw, 
  Database, Search, CalendarIcon, ChevronDown, RotateCcw, ChevronsUpDown
} from 'lucide-react';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type FilterType = 'all' | 'success' | 'error' | 'info';

// Catégories d'opérations pour le filtre
const OPERATION_CATEGORIES = {
  'Buckets': ['bucket_create', 'bucket_delete', 'bucket_list', 'bucket_empty', 'bucket_configure'],
  'Objets': ['object_upload', 'object_delete', 'object_download', 'object_list', 'object_view', 'object_copy', 'object_move', 'object_rename', 'object_restore'],
  'Dossiers': ['folder_create', 'folder_delete', 'folder_move', 'folder_copy'],
  'Bulk': ['bulk_upload', 'bulk_delete', 'bulk_download', 'bulk_copy', 'bulk_move'],
  'Tags/Metadata': ['tags_add', 'tags_update', 'tags_delete', 'metadata_update'],
  'Versioning': ['version_list', 'version_restore', 'version_delete', 'versioning_enable', 'versioning_disable'],
  'Sécurité': ['acl_update', 'policy_update', 'cors_update', 'share_add', 'share_update', 'share_revoke'],
  'Encryption': ['encryption_enable', 'encryption_disable', 'encryption_update'],
  'Lifecycle': ['lifecycle_add_rule', 'lifecycle_update_rule', 'lifecycle_delete_rule'],
} as const;

const getOperationLabel = (op: string): string => {
  const labels: Record<string, string> = {
    'bucket_create': 'Création bucket',
    'bucket_delete': 'Suppression bucket',
    'bucket_list': 'Liste buckets',
    'bucket_empty': 'Vidage bucket',
    'bucket_configure': 'Config bucket',
    'object_upload': 'Upload',
    'object_delete': 'Suppression objet',
    'object_download': 'Téléchargement',
    'object_list': 'Liste objets',
    'object_view': 'Affichage objet',
    'object_copy': 'Copie objet',
    'object_move': 'Déplacement',
    'object_rename': 'Renommage',
    'folder_create': 'Création dossier',
    'folder_delete': 'Suppression dossier',
    'bulk_upload': 'Upload multiple',
    'bulk_delete': 'Suppression multiple',
    'bulk_download': 'Téléchargement multiple',
    'tags_add': 'Ajout tags',
    'tags_update': 'Mise à jour tags',
    'share_add': 'Partage ajouté',
    'share_revoke': 'Partage révoqué',
    'versioning_enable': 'Versioning activé',
    'versioning_disable': 'Versioning désactivé',
    'encryption_enable': 'Encryption activée',
    'acl_update': 'ACL modifié',
    'policy_update': 'Policy modifiée',
  };
  return labels[op] || op.replace(/_/g, ' ');
};

export const ActionHistory = () => {
  const { credentials } = useS3Store();
  const { toast } = useToast();
  const { 
    getCurrentUserEntries, 
    clearHistory, 
    setCurrentUser, 
    currentUserId,
    userHistories,
    toggleLogging,
    updateEntry,
    syncEnabled,
    setSyncEnabled,
    getPendingEntries
  } = useActionHistoryStore();
  
  const { getAllOperations, cancelOperation } = useActiveOperationsStore();
  const activeOperations = getAllOperations();
  
  const { 
    isSyncing, 
    fullSync, 
    clearAllHistory,
    getStats
  } = useHistorySync();
  
  // Filtres de base
  const [filter, setFilter] = useState<FilterType>('all');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState<{ total: number; successCount: number; errorCount: number } | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const itemsPerPage = 10;

  // Filtres avancés
  const [searchText, setSearchText] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedBucket, setSelectedBucket] = useState<string>('all');
  const [selectedOperation, setSelectedOperation] = useState<string>('all');

  // Mettre à jour l'utilisateur courant quand les credentials changent
  useEffect(() => {
    if (credentials) {
      const userId = `${credentials.accessKey.substring(0, 8)}_${credentials.region}`;
      setCurrentUser(userId);
    }
  }, [credentials, setCurrentUser]);

  // Charger les statistiques
  useEffect(() => {
    if (credentials && showSettings) {
      getStats().then(s => {
        if (s) setStats(s);
      });
    }
  }, [credentials, showSettings, getStats]);

  const entries = getCurrentUserEntries();
  const pendingCount = getPendingEntries().length;
  const currentUserHistory = currentUserId && userHistories[currentUserId];
  const isLoggingEnabled = currentUserHistory?.isLoggingEnabled ?? true;

  // Extraire les buckets uniques des entrées
  const uniqueBuckets = useMemo(() => {
    const buckets = new Set<string>();
    entries.forEach(entry => {
      if (entry.bucketName) {
        buckets.add(entry.bucketName);
      }
    });
    return Array.from(buckets).sort();
  }, [entries]);

  // Extraire les types d'opérations uniques
  const uniqueOperations = useMemo(() => {
    const ops = new Set<string>();
    entries.forEach(entry => {
      ops.add(entry.operationType);
    });
    return Array.from(ops).sort();
  }, [entries]);

  // Filtrage avancé
  const filteredActions = useMemo(() => {
    return entries.filter(entry => {
      // Filtre par statut
      if (filter !== 'all') {
        if (filter === 'success' && entry.status !== 'success') return false;
        if (filter === 'error' && entry.status !== 'error') return false;
        if (filter === 'info' && entry.status !== 'started' && entry.status !== 'progress') return false;
      }

      // Filtre par texte
      if (searchText.trim()) {
        const search = searchText.toLowerCase().trim();
        const matchesMessage = entry.userFriendlyMessage?.toLowerCase().includes(search);
        const matchesBucket = entry.bucketName?.toLowerCase().includes(search);
        const matchesObject = entry.objectName?.toLowerCase().includes(search);
        const matchesDetails = entry.details?.toLowerCase().includes(search);
        if (!matchesMessage && !matchesBucket && !matchesObject && !matchesDetails) {
          return false;
        }
      }

      // Filtre par date de début
      if (startDate) {
        const entryDate = new Date(entry.timestamp);
        if (isBefore(entryDate, startOfDay(startDate))) {
          return false;
        }
      }

      // Filtre par date de fin
      if (endDate) {
        const entryDate = new Date(entry.timestamp);
        if (isAfter(entryDate, endOfDay(endDate))) {
          return false;
        }
      }

      // Filtre par bucket
      if (selectedBucket !== 'all' && entry.bucketName !== selectedBucket) {
        return false;
      }

      // Filtre par type d'opération
      if (selectedOperation !== 'all' && entry.operationType !== selectedOperation) {
        return false;
      }

      return true;
    });
  }, [entries, filter, searchText, startDate, endDate, selectedBucket, selectedOperation]);

  const totalPages = Math.ceil(filteredActions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedActions = filteredActions.slice(startIndex, endIndex);

  // Reset page quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchText, startDate, endDate, selectedBucket, selectedOperation]);

  const hasActiveFilters = searchText || startDate || endDate || selectedBucket !== 'all' || selectedOperation !== 'all';

  const resetFilters = () => {
    setSearchText('');
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedBucket('all');
    setSelectedOperation('all');
    setFilter('all');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />;
      case 'started':
      case 'progress':
        return <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />;
      default:
        return <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'started':
      case 'progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getCurrentUserDisplay = () => {
    if (!credentials) return 'Aucun compte';
    return `${credentials.accessKey.substring(0, 8)}... (${credentials.region})`;
  };

  const getFilterLabel = (filterType: FilterType): string => {
    switch (filterType) {
      case 'all':
        return 'Toutes';
      case 'success':
        return 'Succès';
      case 'error':
        return 'Erreurs';
      case 'info':
        return 'En cours';
      default:
        return 'Toutes';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'success':
        return 'Réussi';
      case 'error':
        return 'Échec';
      case 'cancelled':
        return 'Annulé';
      case 'started':
        return 'Démarré';
      case 'progress':
        return 'En cours';
      default:
        return status;
    }
  };

  const handleCancelOperation = (entryId: string, operationName: string) => {
    const activeOp = activeOperations.find(op => op.id === entryId);
    if (activeOp) {
      cancelOperation(entryId);
      updateEntry(entryId, {
        status: 'error',
        userFriendlyMessage: `${operationName} - Annulé`,
        logLevel: 'warning'
      });
      toast({
        title: "Opération annulée",
        description: operationName,
      });
    }
  };

  const handleSync = async () => {
    const result = await fullSync();
    if (result.success) {
      toast({
        title: "Synchronisation réussie",
        description: `${result.pushed || 0} envoyées, ${result.pulled || 0} récupérées`,
      });
    } else {
      toast({
        title: "Erreur de synchronisation",
        description: "Vérifiez votre connexion",
        variant: "destructive"
      });
    }
  };

  const handleClearAll = async () => {
    await clearAllHistory();
    toast({
      title: "Historique effacé",
      description: "Local et distant",
    });
  };

  const isEntryActive = (entryId: string): boolean => {
    return activeOperations.some(op => op.id === entryId);
  };

  return (
    <Collapsible open={isPanelOpen} onOpenChange={setIsPanelOpen}>
      <Card className="h-fit shadow-sm border-border">
        <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-accent/5 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <div className="p-1.5 bg-primary/10 rounded-lg flex-shrink-0">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-sm sm:text-base text-foreground">Historique des actions</CardTitle>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground truncate max-w-[100px] sm:max-w-[150px]" title={getCurrentUserDisplay()}>
                    {getCurrentUserDisplay()}
                  </span>
                  <Badge variant="secondary" className="text-xs h-5 flex-shrink-0">
                    {filteredActions.length}/{entries.length}
                  </Badge>
                  {/* Indicateur de sync */}
                  {syncEnabled ? (
                    <div className="flex items-center gap-1 flex-shrink-0" title={pendingCount > 0 ? `${pendingCount} en attente de sync` : 'Synchronisé'}>
                      {isSyncing ? (
                        <Loader2 className="w-3 h-3 text-primary animate-spin" />
                      ) : pendingCount > 0 ? (
                        <Cloud className="w-3 h-3 text-warning" />
                      ) : (
                        <Cloud className="w-3 h-3 text-success" />
                      )}
                    </div>
                  ) : (
                    <span title="Sync désactivée" className="flex-shrink-0">
                      <CloudOff className="w-3 h-3 text-muted-foreground" />
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSync}
                disabled={isSyncing || !credentials}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                title="Synchroniser maintenant"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant={showAdvancedFilters ? "default" : "ghost"}
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="h-8 w-8 p-0"
                title="Recherche avancée"
              >
                <Search className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <Settings className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="xl:hidden h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <Filter className="w-3 h-3" />
              </Button>
              
              {/* Séparateur visuel avant l'icône suppression */}
              {entries.length > 0 && (
                <>
                  <div className="w-px h-5 bg-border mx-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Effacer l'historique"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </>
              )}
              
              {/* Toggle pour réduire/agrandir le panel */}
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground ml-1"
                  title={isPanelOpen ? "Réduire le panel" : "Agrandir le panel"}
                >
                  <ChevronsUpDown className={cn("w-4 h-4 transition-transform", !isPanelOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

        {/* Recherche avancée */}
        {showAdvancedFilters && (
          <div className="mt-3 p-3 bg-card rounded-lg border border-border space-y-3">
            {/* Barre de recherche textuelle */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
              {searchText && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchText('')}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>

            {/* Filtres par ligne - responsive */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Date de début */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 justify-start text-left font-normal text-xs w-full",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1.5 h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      {startDate ? format(startDate, "dd/MM/yy", { locale: fr }) : "Début"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 bg-card" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>

              {/* Date de fin */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 justify-start text-left font-normal text-xs w-full",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1.5 h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      {endDate ? format(endDate, "dd/MM/yy", { locale: fr }) : "Fin"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 bg-card" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>

              {/* Filtre par bucket */}
              <Select value={selectedBucket} onValueChange={setSelectedBucket}>
                <SelectTrigger className="h-9 text-xs w-full">
                  <SelectValue placeholder="Buckets">
                    <span className="truncate block">
                      {selectedBucket === 'all' ? 'Buckets' : selectedBucket}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-50 bg-card">
                  <SelectItem value="all">Tous les buckets</SelectItem>
                  {uniqueBuckets.map(bucket => (
                    <SelectItem key={bucket} value={bucket}>
                      <span className="truncate">📦 {bucket}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtre par type d'opération */}
              <Select value={selectedOperation} onValueChange={setSelectedOperation}>
                <SelectTrigger className="h-9 text-xs w-full">
                  <SelectValue placeholder="Opérations">
                    <span className="truncate block">
                      {selectedOperation === 'all' ? 'Opérations' : getOperationLabel(selectedOperation)}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-50 bg-card max-h-64">
                  <SelectItem value="all">Toutes</SelectItem>
                  {Object.entries(OPERATION_CATEGORIES).map(([category, ops]) => {
                    const availableOps = ops.filter(op => uniqueOperations.includes(op));
                    if (availableOps.length === 0) return null;
                    return (
                      <React.Fragment key={category}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted">
                          {category}
                        </div>
                        {availableOps.map(op => (
                          <SelectItem key={op} value={op}>
                            {getOperationLabel(op)}
                          </SelectItem>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Bouton reset si filtres actifs */}
            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  {filteredActions.length} résultat(s) trouvé(s)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-7 text-xs text-gray-600 hover:text-gray-900"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Réinitialiser
                </Button>
              </div>
            )}
          </div>
        )}
        
        {/* Paramètres */}
        {showSettings && (
          <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Enregistrement automatique</span>
              <Button
                variant={isLoggingEnabled ? "default" : "outline"}
                size="sm"
                onClick={toggleLogging}
                className="h-7 text-xs"
              >
                {isLoggingEnabled ? 'Activé' : 'Désactivé'}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">Synchronisation cloud</span>
              </div>
              <Button
                variant={syncEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => setSyncEnabled(!syncEnabled)}
                className="h-7 text-xs"
              >
                {syncEnabled ? 'Activé' : 'Désactivé'}
              </Button>
            </div>
            {stats && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Statistiques serveur</p>
                <div className="flex gap-3 text-xs">
                  <span className="text-green-600">✓ {stats.successCount} succès</span>
                  <span className="text-red-600">✗ {stats.errorCount} erreurs</span>
                  <span className="text-gray-600">Total: {stats.total}</span>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Filtres par statut */}
        <div className={`flex flex-wrap gap-1 mt-2 ${isExpanded ? 'block' : 'hidden xl:flex'}`}>
          {(['all', 'success', 'error', 'info'] as const).map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(status)}
              className="text-xs h-7 border-gray-300"
            >
              {getFilterLabel(status)}
            </Button>
          ))}
        </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="p-0">
            {filteredActions.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  {hasActiveFilters ? (
                    <Search className="w-8 h-8 text-muted-foreground" />
                  ) : (
                    <Clock className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  {hasActiveFilters ? 'Aucun résultat' : 'Aucune action enregistrée'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {hasActiveFilters ? 'Essayez de modifier vos filtres' : 'Les actions S3 apparaîtront ici'}
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                    className="mt-3 text-xs"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Réinitialiser les filtres
                  </Button>
                )}
              </div>
            ) : (
              <>
                <ScrollArea className="h-64 xl:h-96">
                  <div className="p-4 space-y-3">
                    {paginatedActions.map((entry, index) => (
                    <div
                      key={entry.id}
                      className={`group relative p-3 rounded-lg border transition-all duration-200 hover:shadow-sm ${
                        index === 0 ? 'bg-primary/5 border-primary/20' : 'bg-card border-border hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="flex-shrink-0">
                            {(entry.status === 'started' || entry.status === 'progress') && isEntryActive(entry.id) ? (
                              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 text-primary animate-spin" />
                            ) : (
                              getStatusIcon(entry.status)
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground line-clamp-2" title={entry.userFriendlyMessage}>
                              {entry.userFriendlyMessage}
                            </p>
                            {(entry.bucketName || entry.objectName) && (
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {entry.bucketName && (
                                  <span className="px-1.5 py-0.5 bg-muted rounded text-xs truncate max-w-[80px] sm:max-w-[120px]" title={entry.bucketName}>
                                    📦 {entry.bucketName}
                                  </span>
                                )}
                                {entry.objectName && (
                                  <span className="px-1.5 py-0.5 bg-muted rounded text-xs truncate max-w-[80px] sm:max-w-[100px]" title={entry.objectName}>
                                    📄 {entry.objectName}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {(entry.status === 'started' || entry.status === 'progress') && isEntryActive(entry.id) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelOperation(entry.id, entry.userFriendlyMessage)}
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Annuler l'opération"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                          <Badge
                            variant="secondary"
                            className={`text-xs flex-shrink-0 border ${getStatusColor(entry.status)}`}
                          >
                            {getStatusLabel(entry.status)}
                          </Badge>
                        </div>
                      </div>
                      
                      {entry.details && (
                        <p className="text-xs text-muted-foreground mt-2 pl-5 sm:pl-7 line-clamp-2 bg-muted/50 p-2 rounded" title={entry.details}>
                          {entry.details}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between mt-2 pl-5 sm:pl-7">
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(entry.timestamp, { addSuffix: true, locale: fr })}
                        </p>
                        {entry.progress !== undefined && (
                          <div className="text-xs text-primary font-medium font-mono">
                            {entry.progress}%
                          </div>
                        )}
                      </div>
                    </div>
                    ))}
                  </div>
                </ScrollArea>
                
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      <span className="hidden sm:inline">Page {currentPage} sur {totalPages}</span>
                      <span className="sm:hidden">{currentPage}/{totalPages}</span>
                      <span className="hidden sm:inline"> ({filteredActions.length} actions)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};