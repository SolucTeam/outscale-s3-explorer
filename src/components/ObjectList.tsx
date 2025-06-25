import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useS3Store } from '../hooks/useS3Store';
import { useBackendApi } from '../hooks/useBackendApi';
import { Upload, Download, Trash2, FolderOpen, File, RefreshCw, Plus, FolderPlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileUpload } from './FileUpload';
import { CreateFolderDialog } from './CreateFolderDialog';

export const ObjectList = () => {
  const { currentBucket, currentPath, objects, loading, setCurrentPath } = useS3Store();
  const { fetchObjects, deleteObject, downloadObject } = useBackendApi();
  const navigate = useNavigate();
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);

  useEffect(() => {
    if (currentBucket) {
      fetchObjects(currentBucket, currentPath);
    }
  }, [currentBucket, currentPath]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleObjectClick = (object: any) => {
    if (object.isFolder) {
      const newPath = currentPath ? `${currentPath}/${object.key}` : object.key;
      const encodedPath = encodeURIComponent(newPath.replace(/\/$/, ''));
      navigate(`/bucket/${currentBucket}/folder/${encodedPath}`);
    }
  };

  const handleDelete = async (objectKey: string, isFolder: boolean = false) => {
    const itemType = isFolder ? 'dossier' : 'fichier';
    const confirmMessage = isFolder 
      ? `Êtes-vous sûr de vouloir supprimer le dossier "${objectKey}" et tout son contenu ?`
      : `Êtes-vous sûr de vouloir supprimer ce ${itemType} ?`;
    
    if (window.confirm(confirmMessage)) {
      // For folders, we need to delete the folder with trailing slash
      const keyToDelete = isFolder && !objectKey.endsWith('/') ? `${objectKey}/` : objectKey;
      await deleteObject(currentBucket!, keyToDelete);
      fetchObjects(currentBucket!, currentPath);
    }
  };

  const handleDownload = async (objectKey: string) => {
    await downloadObject(currentBucket!, objectKey);
  };

  const handleFolderCreated = () => {
    fetchObjects(currentBucket!, currentPath);
  };

  if (!currentBucket) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2 text-blue-600">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Chargement des objets...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            Contenu de {currentBucket}
          </h3>
          <p className="text-gray-600">
            {objects.length} élément{objects.length > 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            onClick={() => setShowCreateFolder(true)}
            variant="outline"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            Nouveau dossier
          </Button>
          <Button 
            onClick={() => setShowUpload(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Uploader
          </Button>
          <Button 
            onClick={() => fetchObjects(currentBucket, currentPath)}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {objects.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <FolderOpen className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Aucun objet trouvé</h3>
              <p className="text-gray-600">Ce dossier est vide. Commencez par uploader des fichiers ou créer des dossiers.</p>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Button onClick={() => setShowCreateFolder(true)} variant="outline">
                <FolderPlus className="w-4 h-4 mr-2" />
                Créer un dossier
              </Button>
              <Button onClick={() => setShowUpload(true)} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter des fichiers
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {objects.map((object) => (
            <Card key={object.key} className="hover:bg-gray-50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center space-x-4 flex-1 cursor-pointer"
                    onClick={() => handleObjectClick(object)}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      object.isFolder 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {object.isFolder ? (
                        <FolderOpen className="w-5 h-5" />
                      ) : (
                        <File className="w-5 h-5" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                          {object.key.replace(/\/$/, '')}
                        </h4>
                        {object.isFolder && (
                          <Badge variant="secondary">Dossier</Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        {!object.isFolder && (
                          <span>{formatBytes(object.size)}</span>
                        )}
                        <span>
                          Modifié {formatDistanceToNow(object.lastModified, { 
                            addSuffix: true, 
                            locale: fr 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {!object.isFolder && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(object.key)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(object.key, object.isFolder)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showUpload && (
        <FileUpload
          bucket={currentBucket}
          path={currentPath}
          onClose={() => setShowUpload(false)}
          onUploadComplete={() => {
            setShowUpload(false);
            fetchObjects(currentBucket, currentPath);
          }}
        />
      )}

      {showCreateFolder && (
        <CreateFolderDialog
          open={showCreateFolder}
          onOpenChange={setShowCreateFolder}
          bucket={currentBucket}
          currentPath={currentPath}
          onFolderCreated={handleFolderCreated}
        />
      )}
    </div>
  );
};
