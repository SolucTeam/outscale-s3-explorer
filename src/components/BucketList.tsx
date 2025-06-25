
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useS3Store } from '../hooks/useS3Store';
import { useS3Mock } from '../hooks/useS3Mock';
import { Folder, Calendar, HardDrive, ChevronRight, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CreateBucketDialog } from './CreateBucketDialog';
import { useToast } from '@/components/ui/use-toast';

export const BucketList = () => {
  const { buckets, loading, setCurrentBucket } = useS3Store();
  const { fetchBuckets, deleteBucket } = useS3Mock();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBuckets();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDeleteBucket = async (bucketName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le bucket "${bucketName}" ? Cette action est irréversible.`)) {
      return;
    }

    const success = await deleteBucket(bucketName);
    if (success) {
      toast({
        title: "Succès",
        description: `Bucket "${bucketName}" supprimé avec succès`
      });
    }
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mes Buckets S3</h2>
          <p className="text-gray-600">Gérez vos espaces de stockage Outscale</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau bucket
          </Button>
          <Button onClick={fetchBuckets} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {buckets.map((bucket) => (
          <Card key={bucket.name} className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Folder className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {bucket.name}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {bucket.region}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => handleDeleteBucket(bucket.name, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Créé {formatDistanceToNow(bucket.creationDate, { addSuffix: true, locale: fr })}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{bucket.objectCount || 0} objets</span>
                <div className="flex items-center space-x-2 text-gray-600">
                  <HardDrive className="w-4 h-4" />
                  <span>{formatBytes(bucket.size || 0)}</span>
                </div>
              </div>
              
              <Button 
                className="w-full mt-4" 
                onClick={() => setCurrentBucket(bucket.name)}
                variant="outline"
              >
                Parcourir
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <CreateBucketDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
};
