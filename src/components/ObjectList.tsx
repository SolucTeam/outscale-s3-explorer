
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useS3Store } from '../hooks/useS3Store';
import { useEnhancedDirectS3 } from '../hooks/useEnhancedDirectS3';
import { Upload, Download, Trash2, FolderOpen, File, RefreshCw, Plus, FolderPlus, Tag, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileUpload } from './FileUpload';
import { CreateFolderDialog } from './CreateFolderDialog';
import { DeleteObjectDialog } from './DeleteObjectDialog';
import { ObjectDetailsDialog } from './ObjectDetailsDialog';

export const ObjectList = () => {
  const { currentBucket, currentPath, objects, loading, setCurrentPath } = useS3Store();
  const { fetchObjects, deleteObject, downloadObject } = useEnhancedDirectS3();
  const navigate = useNavigate();
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [isLoadingObjects, setIsLoadingObjects] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; objectKey: string; isFolder: boolean }>({
    open: false,
    objectKey: '',
    isFolder: false
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [detailsDialog, setDetailsDialog] = useState<{ open: boolean; objectKey: string; object: any | null }>({
    open: false,
    objectKey: '',
    object: null
  });

  useEffect(() => {
    if (currentBucket) {
      console.log('ObjectList: Loading objects for bucket:', currentBucket, 'path:', currentPath);
      loadObjects();
    }
  }, [currentBucket, currentPath]);

  const loadObjects = async () => {
    if (!currentBucket) return;
    
    setIsLoadingObjects(true);
    try {
      await fetchObjects(currentBucket, currentPath);
    } catch (error) {
      console.error('Error loading objects:', error);
    } finally {
      setIsLoadingObjects(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleObjectClick = (object: any) => {
    if (object.isFolder) {
      // Construire le nouveau chemin
      const newPath = currentPath ? `${currentPath}/${object.key}` : object.key;
      
      // Nettoyer le chemin et encoder correctement pour l'URL
      const cleanPath = newPath.replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '');
      const encodedPath = encodeURIComponent(cleanPath);
      
      console.log('Navigating to folder:', { 
        objectKey: object.key, 
        currentPath, 
        newPath, 
        cleanPath, 
        encodedPath 
      });
      
      // Naviguer vers la nouvelle route
      navigate(`/bucket/${encodeURIComponent(currentBucket!)}/folder/${encodedPath}`);
    }
  };

  const handleDeleteClick = (objectKey: string, isFolder: boolean = false) => {
    setDeleteDialog({ open: true, objectKey, isFolder });
  };

  const handleDeleteConfirm = async () => {
    const { objectKey, isFolder } = deleteDialog;
    
    setIsDeleting(true);
    try {
      let keyToDelete = objectKey;
      if (isFolder) {
        keyToDelete = currentPath ? `${currentPath}/${objectKey}/` : `${objectKey}/`;
      } else if (currentPath) {
        keyToDelete = `${currentPath}/${objectKey}`;
      }
      
      console.log('Deleting object:', { objectKey, isFolder, currentPath, keyToDelete });
      
      await deleteObject(currentBucket!, keyToDelete);
      
      setDeleteDialog({ open: false, objectKey: '', isFolder: false });
      loadObjects();
    } catch (error) {
      console.error('Error deleting object:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async (objectKey: string) => {
    try {
      const fullKey = currentPath ? `${currentPath}/${objectKey}` : objectKey;
      
      // Extraire le nom du fichier depuis la clé
      const fileName = fullKey.split('/').pop() || objectKey;
      
      await downloadObject(currentBucket!, fullKey, fileName);
    } catch (error) {
      console.error('Error downloading object:', error);
    }
  };

  const handleFolderCreated = () => {
    loadObjects();
  };

  const handleUploadComplete = () => {
    setShowUpload(false);
    loadObjects();
  };

  const handleShowDetails = (object: any) => {
    const fullKey = currentPath ? `${currentPath}/${object.key}` : object.key;
    setDetailsDialog({ open: true, objectKey: fullKey, object });
  };

  if (!currentBucket) return null;

  // Afficher le loading pendant le chargement initial ou lors du rafraîchissement
  if (loading || isLoadingObjects) {
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
            {currentPath && (
              <span className="text-gray-500 font-normal"> / {currentPath}</span>
            )}
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
            onClick={loadObjects}
            variant="outline"
            size="sm"
            disabled={isLoadingObjects}
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingObjects ? 'animate-spin' : ''}`} />
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
                          {object.key}
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
                      {object.tags && Object.keys(object.tags).length > 0 && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Tag className="w-3 h-3 text-gray-500" />
                          {Object.entries(object.tags).map(([key, value]) => (
                            <Badge key={key} variant="outline" className="text-xs">
                              {key}: {value}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {!object.isFolder && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleShowDetails(object)}
                          title="Détails de l'objet"
                        >
                          <Info className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(object.key)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteClick(object.key, object.isFolder)}
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
          onUploadComplete={handleUploadComplete}
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

      <DeleteObjectDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        objectKey={deleteDialog.objectKey}
        isFolder={deleteDialog.isFolder}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />

      {detailsDialog.object && (
        <ObjectDetailsDialog
          open={detailsDialog.open}
          onOpenChange={(open) => setDetailsDialog({ ...detailsDialog, open })}
          bucket={currentBucket!}
          objectKey={detailsDialog.objectKey}
          object={detailsDialog.object}
        />
      )}
    </div>
  );
};
