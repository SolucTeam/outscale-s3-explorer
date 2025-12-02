
import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { useEnhancedDirectS3 } from '../hooks/useEnhancedDirectS3';
import { Upload, X, File, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { s3LoggingService } from '../services/s3LoggingService';

interface FileUploadProps {
  bucket: string;
  path: string;
  onClose: () => void;
  onUploadComplete: () => void;
}

interface UploadFile {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  logEntryId?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  bucket,
  path,
  onClose,
  onUploadComplete
}) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [bulkLogEntryId, setBulkLogEntryId] = useState<string>('');
  const { uploadFile } = useEnhancedDirectS3();
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    addFiles(selectedFiles);
  };

  const addFiles = (newFiles: File[]) => {
    const uploadFiles: UploadFile[] = newFiles.map(file => ({
      file,
      status: 'pending',
      progress: 0
    }));
    setFiles(prev => {
      const updated = [...prev, ...uploadFiles];
      console.log(`📁 Fichiers ajoutés pour upload: ${newFiles.length} nouveaux fichiers`);
      return updated;
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const fileToRemove = prev[index];
      console.log(`🗑️ Fichier retiré de la liste: ${fileToRemove.file.name}`);
      return prev.filter((_, i) => i !== index);
    });
  };

  const startUpload = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    if (pendingFiles.length === 0) return;

    // Log bulk operation start
    const bulkId = s3LoggingService.logBulkOperationStart('object_upload', pendingFiles.length);
    setBulkLogEntryId(bulkId);
    
    console.log(`🚀 Démarrage de l'upload en lot: ${pendingFiles.length} fichiers`);
    
    let completedUploads = 0;
    
    for (let i = 0; i < pendingFiles.length; i++) {
      const fileIndex = files.findIndex(f => f === pendingFiles[i]);
      const currentFile = pendingFiles[i];
      
      // Log individual file upload start
      const logEntryId = s3LoggingService.logOperationStart(
        'object_upload',
        bucket,
        currentFile.file.name,
        `Taille: ${formatBytes(currentFile.file.size)}`
      );
      
      // Update file with log entry ID and mark as uploading
      setFiles(prev => prev.map((f, idx) => 
        idx === fileIndex ? { 
          ...f, 
          status: 'uploading', 
          progress: 0,
          logEntryId 
        } : f
      ));

      // Simulate progress during upload
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map((f, idx) => {
          if (idx === fileIndex && f.status === 'uploading') {
            const newProgress = Math.min(f.progress + Math.random() * 20, 90);
            
            // Log progress updates every 25%
            if (f.logEntryId && Math.floor(newProgress / 25) > Math.floor(f.progress / 25)) {
              s3LoggingService.logOperationProgress(
                f.logEntryId,
                Math.floor(newProgress),
                `Upload en cours: ${Math.floor(newProgress)}%`
              );
            }
            
            return { ...f, progress: newProgress };
          }
          return f;
        }));
      }, 300);

      try {
        const success = await uploadFile(currentFile.file, bucket, path);
        clearInterval(progressInterval);
        
        if (success) {
          setFiles(prev => prev.map((f, idx) => 
            idx === fileIndex ? { ...f, status: 'success', progress: 100 } : f
          ));
          
          // Log success
          s3LoggingService.logOperationSuccess(
            logEntryId,
            'object_upload',
            bucket,
            currentFile.file.name,
            `Upload réussi (${formatBytes(currentFile.file.size)})`
          );
          
          completedUploads++;
        } else {
          setFiles(prev => prev.map((f, idx) => 
            idx === fileIndex ? { 
              ...f, 
              status: 'error', 
              progress: 0, 
              error: 'Échec de l\'upload' 
            } : f
          ));
          
          // Log error
          s3LoggingService.logOperationError(
            logEntryId,
            'object_upload',
            'Échec de l\'upload',
            bucket,
            currentFile.file.name,
            'UPLOAD_FAILED'
          );
        }
      } catch (error) {
        clearInterval(progressInterval);
        const errorMessage = error instanceof Error ? error.message : 'Erreur réseau';
        
        setFiles(prev => prev.map((f, idx) => 
          idx === fileIndex ? { 
            ...f, 
            status: 'error', 
            progress: 0, 
            error: errorMessage 
          } : f
        ));
        
        // Log error
        s3LoggingService.logOperationError(
          logEntryId,
          'object_upload',
          error instanceof Error ? error.message : errorMessage,
          bucket,
          currentFile.file.name,
          'NETWORK_ERROR'
        );
      }
      
      // Update bulk progress
      if (bulkId) {
        s3LoggingService.logBulkOperationProgress(bulkId, i + 1, pendingFiles.length);
      }
    }

    // Log bulk operation completion
    if (bulkId) {
      if (completedUploads === pendingFiles.length) {
        s3LoggingService.logOperationSuccess(
          bulkId,
          'object_upload',
          bucket,
          undefined,
          `Tous les uploads réussis: ${completedUploads}/${pendingFiles.length}`
        );
      } else {
        s3LoggingService.logOperationError(
          bulkId,
          'object_upload',
          `Uploads partiellement réussis: ${completedUploads}/${pendingFiles.length}`,
          bucket,
          undefined,
          'PARTIAL_SUCCESS'
        );
      }
    }

    console.log(`✅ Upload en lot terminé: ${completedUploads}/${pendingFiles.length} réussis`);

    // Close after a delay if all uploads are complete and some succeeded
    setTimeout(() => {
      const allComplete = files.every(f => f.status === 'success' || f.status === 'error');
      const hasSuccess = files.some(f => f.status === 'success');
      if (allComplete && hasSuccess) {
        onUploadComplete();
      }
    }, 1000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload de fichiers</DialogTitle>
          <p className="text-sm text-gray-600">
            Destination: {bucket}{path ? `/${path}` : ''}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Zone de drop */}
          <Card 
            className={`transition-all duration-200 ${
              isDragging 
                ? 'border-blue-500 bg-blue-50 border-dashed border-2' 
                : 'border-dashed border-2 border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <CardContent className="p-8 text-center">
              <Upload className={`w-12 h-12 mx-auto mb-4 ${
                isDragging ? 'text-blue-500' : 'text-gray-400'
              }`} />
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-900">
                  Glissez-déposez vos fichiers ici
                </p>
                <p className="text-gray-600">ou</p>
                <div>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                  >
                    Parcourir les fichiers
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des fichiers */}
          {files.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-auto">
              {files.map((uploadFile, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <File className="w-5 h-5 text-gray-500" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {uploadFile.file.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatBytes(uploadFile.file.size)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {uploadFile.status === 'success' && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      {uploadFile.status === 'error' && (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                      {uploadFile.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {uploadFile.status === 'uploading' && (
                    <div className="mt-2">
                      <Progress value={uploadFile.progress} className="h-2" />
                      <p className="text-xs text-gray-500 mt-1">
                        {Math.round(uploadFile.progress)}% - Upload en cours...
                      </p>
                    </div>
                  )}
                  
                  {uploadFile.status === 'error' && uploadFile.error && (
                    <p className="text-sm text-red-600 mt-1">{uploadFile.error}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button 
            onClick={startUpload}
            disabled={files.length === 0 || files.every(f => f.status !== 'pending')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Uploader ({files.filter(f => f.status === 'pending').length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
