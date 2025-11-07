import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useEnhancedDirectS3 } from '../hooks/useEnhancedDirectS3';
import { S3Bucket } from '../types/s3';
import { AlertCircle, GitBranch, Lock, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BucketSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket: S3Bucket;
  onSettingsUpdated: () => void;
}

export const BucketSettingsDialog: React.FC<BucketSettingsDialogProps> = ({
  open,
  onOpenChange,
  bucket,
  onSettingsUpdated
}) => {
  const { setBucketVersioning, setBucketEncryption, deleteBucketEncryption } = useEnhancedDirectS3();
  const [versioningEnabled, setVersioningEnabled] = useState(bucket.versioningEnabled || false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(bucket.encryptionEnabled || false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      let success = true;

      // Gérer le versioning (sauf si object lock est activé)
      if (!bucket.objectLockEnabled && versioningEnabled !== bucket.versioningEnabled) {
        const result = await setBucketVersioning(bucket.name, versioningEnabled);
        if (!result) success = false;
      }

      // Gérer l'encryption
      if (encryptionEnabled !== bucket.encryptionEnabled) {
        if (encryptionEnabled) {
          const result = await setBucketEncryption(bucket.name);
          if (!result) success = false;
        } else {
          const result = await deleteBucketEncryption(bucket.name);
          if (!result) success = false;
        }
      }

      if (success) {
        onSettingsUpdated();
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Paramètres du bucket
          </DialogTitle>
          <DialogDescription>
            Configurez les options de versioning et d'encryption pour <strong>{bucket.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Versioning */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2 text-base">
                  <GitBranch className="w-4 h-4" />
                  Versioning
                </Label>
                <p className="text-sm text-muted-foreground">
                  Conservez plusieurs versions de vos objets
                </p>
              </div>
              <Switch
                checked={versioningEnabled}
                onCheckedChange={setVersioningEnabled}
                disabled={bucket.objectLockEnabled}
              />
            </div>

            {bucket.objectLockEnabled && (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-sm">
                  Le versioning ne peut pas être désactivé car Object Lock est activé sur ce bucket.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Encryption */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2 text-base">
                  <Lock className="w-4 h-4" />
                  Encryption
                </Label>
                <p className="text-sm text-muted-foreground">
                  Chiffrez automatiquement vos objets (AES-256)
                </p>
              </div>
              <Switch
                checked={encryptionEnabled}
                onCheckedChange={setEncryptionEnabled}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
