import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useS3Store } from '../hooks/useS3Store';
import { useBackendApi } from '../hooks/useBackendApi';
import { Folder, Calendar, HardDrive, ChevronRight, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CreateBucketDialog } from './CreateBucketDialog';
import { ForceDeleteBucketDialog } from './ForceDeleteBucketDialog';

export const BucketList = () => {
  const { buckets, loading, setCurrentBucket, setCurrentPath, setObjects } = useS3Store();
  const { fetchBuckets } = useBackendApi();
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bucketToDelete, setBucketToDelete] = useState<string>('');

  useEffect(() => {
    // Réinitialiser l'état quand on arrive sur la liste des buckets
    setCurrentBucket(null);
    setCurrentPath('');
    setObjects([]);
    
    // Charger les buckets
    fetchBuckets();
  }, [fetchBuckets, setCurrentBucket, setCurrentPath, setObjects]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDeleteBucket = (bucketName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setBucketToDelete(bucketName);
    setShowDeleteDialog(true);
  };

  const handleDeleteCompleted = () => {
    fetchBuckets();
    setBucketToDelete('');
  };

  const handleRefresh = () => {
    fetchBuckets();
  };

  const handleBucketClick = (bucketName: string) => {
    navigate(`/bucket/${bucketName}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2 text-blue-600">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Chargement des buckets...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Mes Buckets S3</h2>
          <p className="text-sm sm:text-base text-gray-600">Gérez vos espaces de stockage Outscale</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau bucket
          </Button>
          <Button onClick={handleRefresh} variant="outline" size="sm" className="w-full sm:w-auto">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {buckets.map((bucket) => (
          <Card key={bucket.name} className="hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={() => handleBucketClick(bucket.name)}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors flex-shrink-0">
                    <Folder className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm sm:text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                      {bucket.name}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {bucket.region}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => handleDeleteBucket(bucket.name, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                    title="Supprimer le bucket et son contenu"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center space-x-2 text-gray-600 min-w-0">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Créé {formatDistanceToNow(bucket.creationDate, { addSuffix: true, locale: fr })}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-gray-600">{bucket.objectCount || 0} objets</span>
                <div className="flex items-center space-x-2 text-gray-600">
                  <HardDrive className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{formatBytes(bucket.size || 0)}</span>
                </div>
              </div>
              
              <Button 
                className="w-full mt-4 text-sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleBucketClick(bucket.name);
                }}
                variant="outline"
              >
                Parcourir
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <CreateBucketDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
      />

      <ForceDeleteBucketDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        bucketName={bucketToDelete}
        onDeleted={handleDeleteCompleted}
      />
    </div>
  );
};
