
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useS3Store } from '../hooks/useS3Store';
import { useEnhancedDirectS3 } from '../hooks/useEnhancedDirectS3';
import { Upload, Download, Trash2, FolderOpen, File, RefreshCw, Plus, FolderPlus, Tag, Info, History, Edit, Copy, X, CheckSquare, Square } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileUpload } from './FileUpload';
import { CreateFolderDialog } from './CreateFolderDialog';
import { DeleteObjectDialog } from './DeleteObjectDialog';
import { ObjectDetailsDialog } from './ObjectDetailsDialog';
import { ObjectEditDialog } from './ObjectEditDialog';
import { SearchFilter } from './SearchFilter';
import { VersionDownloadDialog } from './VersionDownloadDialog';
import { CopyObjectDialog } from './CopyObjectDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useActionHistoryStore } from '../stores/actionHistoryStore';
import { useActiveOperationsStore } from '../stores/activeOperationsStore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const ObjectList = () => {
  const { currentBucket, currentPath, objects, loading, setCurrentPath, buckets } = useS3Store();
  const { fetchObjects, deleteObject, downloadObject } = useEnhancedDirectS3();
  const { addEntry, updateEntry } = useActionHistoryStore();
  const { startOperation, completeOperation, isOperationActive } = useActiveOperationsStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [isLoadingObjects, setIsLoadingObjects] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
  const [versionDialog, setVersionDialog] = useState<{ open: boolean; objectKey: string; fileName: string }>({
    open: false,
    objectKey: '',
    fileName: ''
  });
  const [editDialog, setEditDialog] = useState<{ open: boolean; objectKey: string; object: any | null }>({
    open: false,
    objectKey: '',
    object: null
  });
  const [copyDialog, setCopyDialog] = useState<{ open: boolean; objectKey: string }>({
    open: false,
    objectKey: ''
  });

  // Multi-selection state
  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set());
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Filtrer les objets selon la recherche
  const filteredObjects = useMemo(() => {
    if (!searchQuery.trim()) return objects;
    const query = searchQuery.toLowerCase();
    return objects.filter(obj => 
      obj.key.toLowerCase().includes(query)
    );
  }, [objects, searchQuery]);

  // Reset selection when objects change
  useEffect(() => {
    setSelectedObjects(new Set());
  }, [objects, currentPath, currentBucket]);

  // Selection handlers
  const toggleSelectObject = (key: string) => {
    setSelectedObjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedObjects(new Set(filteredObjects.map(obj => obj.key)));
  };

  const deselectAll = () => {
    setSelectedObjects(new Set());
  };

  const isAllSelected = filteredObjects.length > 0 && selectedObjects.size === filteredObjects.length;
  const hasSelection = selectedObjects.size > 0;

  // Bulk delete handler
  const handleBulkDelete = async () => {
    const operationId = `bulk-delete-${Date.now()}`;
    setIsBulkDeleting(true);
    let successCount = 0;
    let errorCount = 0;
    let cancelled = false;

    const abortController = startOperation(operationId, 'bulk_delete', `Suppression de ${selectedObjects.size} objet(s)`);
    
    addEntry({
      id: operationId,
      operationType: 'bulk_delete',
      status: 'started',
      bucketName: currentBucket!,
      logLevel: 'info',
      userFriendlyMessage: `Suppression groupée de ${selectedObjects.size} objet(s)`,
      details: `Bucket: ${currentBucket}`
    } as any);

    try {
      const objectsArray = Array.from(selectedObjects);
      for (let i = 0; i < objectsArray.length; i++) {
        // Vérifier si l'opération a été annulée
        if (abortController.signal.aborted) {
          cancelled = true;
          break;
        }

        const objectKey = objectsArray[i];
        const object = objects.find(o => o.key === objectKey);
        if (!object) continue;

        let keyToDelete = objectKey;
        if (object.isFolder) {
          keyToDelete = currentPath ? `${currentPath}/${objectKey}/` : `${objectKey}/`;
        } else if (currentPath) {
          keyToDelete = `${currentPath}/${objectKey}`;
        }

        try {
          await deleteObject(currentBucket!, keyToDelete);
          successCount++;
        } catch (error) {
          console.error('Error deleting object:', objectKey, error);
          errorCount++;
        }
      }

      completeOperation(operationId);

      if (cancelled) {
        updateEntry(operationId, {
          status: 'error',
          userFriendlyMessage: `Suppression annulée: ${successCount} supprimé(s)`,
          logLevel: 'warning'
        });
        toast({
          title: "Opération annulée",
          description: `${successCount} objet(s) supprimé(s) avant annulation`,
        });
      } else if (successCount > 0) {
        updateEntry(operationId, {
          status: errorCount > 0 ? 'error' : 'success',
          userFriendlyMessage: `${successCount} objet(s) supprimé(s)${errorCount > 0 ? `, ${errorCount} erreur(s)` : ''}`,
          logLevel: errorCount > 0 ? 'warning' : 'info'
        });
        toast({
          title: "Suppression terminée",
          description: `${successCount} objet(s) supprimé(s)${errorCount > 0 ? `, ${errorCount} erreur(s)` : ''}`,
          variant: errorCount > 0 ? "destructive" : "default"
        });
      }

      setSelectedObjects(new Set());
      setBulkDeleteDialog(false);
      loadObjects();
    } catch (error) {
      console.error('Bulk delete error:', error);
      completeOperation(operationId);
      updateEntry(operationId, {
        status: 'error',
        userFriendlyMessage: 'Erreur lors de la suppression groupée',
        logLevel: 'error'
      });
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression groupée",
        variant: "destructive"
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Bulk download handler
  const handleBulkDownload = async () => {
    const operationId = `bulk-download-${Date.now()}`;
    const filesToDownload = Array.from(selectedObjects)
      .map(key => objects.find(o => o.key === key))
      .filter(obj => obj && !obj.isFolder);

    const abortController = startOperation(operationId, 'bulk_download', `Téléchargement de ${filesToDownload.length} fichier(s)`);

    addEntry({
      id: operationId,
      operationType: 'bulk_download',
      status: 'started',
      bucketName: currentBucket!,
      logLevel: 'info',
      userFriendlyMessage: `Téléchargement groupé de ${filesToDownload.length} fichier(s)`,
      details: `Bucket: ${currentBucket}`
    } as any);

    let successCount = 0;
    let cancelled = false;

    for (const obj of filesToDownload) {
      // Vérifier si l'opération a été annulée
      if (abortController.signal.aborted) {
        cancelled = true;
        break;
      }

      if (obj) {
        try {
          const fullKey = currentPath ? `${currentPath}/${obj.key}` : obj.key;
          const fileName = fullKey.split('/').pop() || obj.key;
          await downloadObject(currentBucket!, fullKey, fileName);
          successCount++;
        } catch (error) {
          console.error('Error downloading:', obj.key, error);
        }
      }
    }

    completeOperation(operationId);

    if (cancelled) {
      updateEntry(operationId, {
        status: 'error',
        userFriendlyMessage: `Téléchargement annulé: ${successCount} fichier(s) téléchargé(s)`,
        logLevel: 'warning'
      });
      toast({
        title: "Opération annulée",
        description: `${successCount} fichier(s) téléchargé(s) avant annulation`,
      });
    } else {
      updateEntry(operationId, {
        status: 'success',
        userFriendlyMessage: `${successCount} fichier(s) téléchargé(s)`,
        logLevel: 'info'
      });
      toast({
        title: "Téléchargement",
        description: `${filesToDownload.length} fichier(s) téléchargé(s)`
      });
    }
  };

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
    
    addEntry({
      operationType: isFolder ? 'folder_delete' : 'object_delete',
      status: 'started',
      bucketName: currentBucket!,
      objectName: objectKey,
      logLevel: 'info',
      userFriendlyMessage: `Suppression de ${isFolder ? 'dossier' : 'fichier'}: ${objectKey}`,
      details: `Bucket: ${currentBucket}`
    });

    try {
      let keyToDelete = objectKey;
      if (isFolder) {
        keyToDelete = currentPath ? `${currentPath}/${objectKey}/` : `${objectKey}/`;
      } else if (currentPath) {
        keyToDelete = `${currentPath}/${objectKey}`;
      }
      
      console.log('Deleting object:', { objectKey, isFolder, currentPath, keyToDelete });
      
      await deleteObject(currentBucket!, keyToDelete);
      
      addEntry({
        operationType: isFolder ? 'folder_delete' : 'object_delete',
        status: 'success',
        bucketName: currentBucket!,
        objectName: objectKey,
        logLevel: 'info',
        userFriendlyMessage: `${isFolder ? 'Dossier' : 'Fichier'} supprimé: ${objectKey}`,
        details: `Bucket: ${currentBucket}`
      });
      
      setDeleteDialog({ open: false, objectKey: '', isFolder: false });
      loadObjects();
    } catch (error) {
      console.error('Error deleting object:', error);
      addEntry({
        operationType: isFolder ? 'folder_delete' : 'object_delete',
        status: 'error',
        bucketName: currentBucket!,
        objectName: objectKey,
        logLevel: 'error',
        userFriendlyMessage: `Erreur suppression: ${objectKey}`,
        details: String(error)
      });
    } finally {
      setIsDeleting(false);
    }
  };


  const truncatePath = (path: string, maxLength: number = 60): string => {
    if (path.length <= maxLength) return path;
    
    const parts = path.split('/');
    
    // Si un seul segment est trop long (hash SHA256 par exemple)
    if (parts.length === 1) {
      if (/^[a-f0-9]{40,}$/i.test(path)) {
        // Hash: garder début et fin
        return `${path.slice(0, 12)}...${path.slice(-12)}`;
      }
      // Nom normal: couper au milieu
      return `${path.slice(0, maxLength - 3)}...`;
    }
    
    // Plusieurs segments: afficher premier / ... / dernier
    if (parts.length > 3) {
      const first = parts[0];
      const last = parts[parts.length - 1];
      return `${first}/.../${last}`;
    }
    
    // 2-3 segments: afficher normalement mais tronquer les segments longs
    return parts.map(part => {
      if (part.length > 20) {
        if (/^[a-f0-9]{40,}$/i.test(part)) {
          return `${part.slice(0, 8)}...${part.slice(-8)}`;
        }
        return `${part.slice(0, 17)}...`;
      }
      return part;
    }).join('/');
  };

  const handleDownload = async (objectKey: string) => {
    const fullKey = currentPath ? `${currentPath}/${objectKey}` : objectKey;
    const fileName = fullKey.split('/').pop() || objectKey;
    
    addEntry({
      operationType: 'object_download',
      status: 'started',
      bucketName: currentBucket!,
      objectName: objectKey,
      logLevel: 'info',
      userFriendlyMessage: `Téléchargement: ${fileName}`,
      details: `Bucket: ${currentBucket}`
    });

    try {
      await downloadObject(currentBucket!, fullKey, fileName);
      
      addEntry({
        operationType: 'object_download',
        status: 'success',
        bucketName: currentBucket!,
        objectName: objectKey,
        logLevel: 'info',
        userFriendlyMessage: `Téléchargé: ${fileName}`,
        details: `Bucket: ${currentBucket}`
      });
    } catch (error) {
      console.error('Error downloading object:', error);
      addEntry({
        operationType: 'object_download',
        status: 'error',
        bucketName: currentBucket!,
        objectName: objectKey,
        logLevel: 'error',
        userFriendlyMessage: `Erreur téléchargement: ${fileName}`,
        details: String(error)
      });
    }
  };

  const handleVersionDownload = (objectKey: string) => {
    const fullKey = currentPath ? `${currentPath}/${objectKey}` : objectKey;
    const fileName = fullKey.split('/').pop() || objectKey;
    
    addEntry({
      operationType: 'version_list',
      status: 'started',
      bucketName: currentBucket!,
      objectName: objectKey,
      logLevel: 'info',
      userFriendlyMessage: `Consultation des versions: ${fileName}`,
      details: `Bucket: ${currentBucket}`
    });
    
    setVersionDialog({ open: true, objectKey: fullKey, fileName });
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
    
    addEntry({
      operationType: 'object_view',
      status: 'success',
      bucketName: currentBucket!,
      objectName: object.key,
      logLevel: 'info',
      userFriendlyMessage: `Détails de: ${object.key}`,
      details: `Bucket: ${currentBucket}`
    });
    
    setDetailsDialog({ open: true, objectKey: fullKey, object });
  };

  const handleEditObject = (object: any) => {
    const fullKey = currentPath ? `${currentPath}/${object.key}` : object.key;
    // Note: Le log est fait dans ObjectEditDialog lors de la sauvegarde
    setEditDialog({ open: true, objectKey: fullKey, object });
  };

  const handleCopyObject = (object: any) => {
    const fullKey = currentPath ? `${currentPath}/${object.key}` : object.key;
    // Note: Le log 'started' est fait dans CopyObjectDialog lors de la confirmation
    setCopyDialog({ open: true, objectKey: fullKey });
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
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-semibold text-gray-900 truncate">
            Contenu de {currentBucket}
            {currentPath && (
              <span className="text-gray-500 font-normal" title={currentPath}>
                {' '} / {truncatePath(currentPath)}
              </span>
            )}
          </h3>
          <p className="text-gray-600 text-sm">
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

      {/* Barre de recherche et sélection */}
      {objects.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap">
          <SearchFilter
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher un fichier ou dossier..."
          />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={isAllSelected ? deselectAll : selectAll}
            >
              {isAllSelected ? (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  Tout désélectionner
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Tout sélectionner
                </>
              )}
            </Button>
          </div>
          {searchQuery && (
            <span className="text-sm text-muted-foreground">
              {filteredObjects.length} résultat{filteredObjects.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Barre d'actions groupées */}
      {hasSelection && (
        <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-3 rounded-lg flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm">
              {selectedObjects.size} sélectionné{selectedObjects.size > 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBulkDownload}
              disabled={Array.from(selectedObjects).every(key => objects.find(o => o.key === key)?.isFolder)}
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={deselectAll}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

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
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => setShowCreateFolder(true)} variant="outline">
                <FolderPlus className="w-4 h-4 mr-2" />
                Créer un dossier
              </Button>
              <Button onClick={() => setShowUpload(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter des fichiers
              </Button>
            </div>
          </div>
        </Card>
      ) : filteredObjects.length === 0 && searchQuery ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Aucun élément ne correspond à "{searchQuery}"</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredObjects.map((object) => (
            <TooltipProvider key={object.key}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className={`hover:bg-gray-50 transition-colors ${selectedObjects.has(object.key) ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          {/* Checkbox de sélection */}
                          <Checkbox
                            checked={selectedObjects.has(object.key)}
                            onCheckedChange={() => toggleSelectObject(object.key)}
                            className="shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          />
                          
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
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-gray-900 hover:text-blue-600 transition-colors truncate max-w-md">
                                  {object.key.length > 50 
                                    ? `${object.key.slice(0, 25)}...${object.key.slice(-20)}` 
                                    : object.key}
                                </h4>
                                {object.isFolder && (
                                  <Badge variant="secondary" className="shrink-0">Dossier</Badge>
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
                                onClick={() => handleEditObject(object)}
                                title="Modifier (tags, ACL, rétention)"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopyObject(object)}
                                title="Copier l'objet"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleVersionDownload(object.key)}
                                title="Télécharger une version"
                              >
                                <History className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownload(object.key)}
                                title="Télécharger"
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
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-md">
                  <p className="font-medium break-all">{object.key}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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

      <VersionDownloadDialog
        open={versionDialog.open}
        onOpenChange={(open) => setVersionDialog({ ...versionDialog, open })}
        bucket={currentBucket!}
        objectKey={versionDialog.objectKey}
        fileName={versionDialog.fileName}
      />

      {editDialog.object && (
        <ObjectEditDialog
          open={editDialog.open}
          onOpenChange={(open) => setEditDialog({ ...editDialog, open })}
          bucket={currentBucket!}
          objectKey={editDialog.objectKey}
          object={editDialog.object}
          objectLockEnabled={buckets.find(b => b.name === currentBucket)?.objectLockEnabled}
          onUpdated={loadObjects}
        />
      )}

      <CopyObjectDialog
        open={copyDialog.open}
        onOpenChange={(open) => setCopyDialog({ ...copyDialog, open })}
        sourceBucket={currentBucket!}
        sourceKey={copyDialog.objectKey}
        onCopyComplete={loadObjects}
      />

      {/* Dialogue de confirmation de suppression groupée */}
      <AlertDialog open={bulkDeleteDialog} onOpenChange={setBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer {selectedObjects.size} élément{selectedObjects.size > 1 ? 's' : ''} ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
