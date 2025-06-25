
import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { useS3Mock } from '../hooks/useS3Mock';
import { Upload, X, File, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
}

export const FileUpload: React.FC<FileUploadProps> = ({
  bucket,
  path,
  onClose,
  onUploadComplete
}) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { uploadFile } = useS3Mock();
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
    setFiles(prev => [...prev, ...uploadFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startUpload = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    for (let i = 0; i < pendingFiles.length; i++) {
      const fileIndex = files.findIndex(f => f === pendingFiles[i]);
      
      // Marquer comme en cours d'upload
      setFiles(prev => prev.map((f, idx) => 
        idx === fileIndex ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      // Simuler la progression
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map((f, idx) => {
          if (idx === fileIndex && f.status === 'uploading') {
            const newProgress = Math.min(f.progress + Math.random() * 30, 90);
            return { ...f, progress: newProgress };
          }
          return f;
        }));
      }, 200);

      try {
        const success = await uploadFile(pendingFiles[i].file, bucket, path);
        clearInterval(progressInterval);
        
        if (success) {
          setFiles(prev => prev.map((f, idx) => 
            idx === fileIndex ? { ...f, status: 'success', progress: 100 } : f
          ));
          toast({
            title: "Upload réussi",
            description: `${pendingFiles[i].file.name} a été uploadé avec succès.`,
          });
        } else {
          setFiles(prev => prev.map((f, idx) => 
            idx === fileIndex ? { ...f, status: 'error', error: 'Échec de l\'upload' } : f
          ));
        }
      } catch (error) {
        clearInterval(progressInterval);
        setFiles(prev => prev.map((f, idx) => 
          idx === fileIndex ? { ...f, status: 'error', error: 'Erreur réseau' } : f
        ));
      }
    }

    // Fermer après un délai si tous les uploads sont terminés
    setTimeout(() => {
      const allComplete = files.every(f => f.status === 'success' || f.status === 'error');
      if (allComplete) {
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
                    <Progress value={uploadFile.progress} className="mt-2" />
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
