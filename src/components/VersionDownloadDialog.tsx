import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEnhancedDirectS3 } from '@/hooks/useEnhancedDirectS3';
import { Download, RefreshCw, History } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ObjectVersion } from '@/types/s3';

interface VersionDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket: string;
  objectKey: string;
  fileName: string;
}

export const VersionDownloadDialog: React.FC<VersionDownloadDialogProps> = ({
  open,
  onOpenChange,
  bucket,
  objectKey,
  fileName
}) => {
  const { listObjectVersions, downloadObject } = useEnhancedDirectS3();
  const [versions, setVersions] = useState<ObjectVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingVersion, setDownloadingVersion] = useState<string | null>(null);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const data = await listObjectVersions(bucket, objectKey);
      if (data) {
        setVersions(data);
      }
    } catch (error) {
      console.error('Error loading versions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadVersions();
    }
  }, [open, bucket, objectKey]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = async (versionId?: string) => {
    const downloadVersionId = versionId || undefined;
    setDownloadingVersion(versionId || 'latest');
    try {
      await downloadObject(bucket, objectKey, fileName, downloadVersionId);
    } finally {
      setDownloadingVersion(null);
    }
  };

  const truncateVersionId = (versionId: string) => {
    if (versionId.length > 20) {
      return `${versionId.slice(0, 8)}...${versionId.slice(-8)}`;
    }
    return versionId;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Télécharger une version
          </DialogTitle>
          <DialogDescription className="text-sm break-all">
            {fileName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : versions.length > 0 ? (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {versions.map((version) => (
                  <div
                    key={version.versionId}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span 
                          className="font-mono text-xs text-muted-foreground"
                          title={version.versionId}
                        >
                          {truncateVersionId(version.versionId)}
                        </span>
                        {version.isLatest && (
                          <Badge variant="default" className="text-xs">Actuelle</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatBytes(version.size)} • {formatDistanceToNow(new Date(version.lastModified), { addSuffix: true, locale: fr })}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={version.isLatest ? "default" : "outline"}
                      onClick={() => handleDownload(version.versionId)}
                      disabled={downloadingVersion !== null}
                    >
                      {downloadingVersion === version.versionId ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">
                Aucune version disponible. Le versioning n'est peut-être pas activé.
              </p>
              <Button onClick={() => handleDownload()} disabled={downloadingVersion !== null}>
                {downloadingVersion ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Télécharger le fichier
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
