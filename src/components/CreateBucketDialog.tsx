
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useS3Store } from '../hooks/useS3Store';
import { useEnhancedDirectS3 } from '../hooks/useEnhancedDirectS3';
import { useToast } from '@/hooks/use-toast';
import { OUTSCALE_REGIONS } from '../data/regions';
import { Info, Lock, GitBranch, Shield } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface CreateBucketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateBucketDialog = ({ open, onOpenChange }: CreateBucketDialogProps) => {
  const [bucketName, setBucketName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [versioningEnabled, setVersioningEnabled] = useState(false);
  const [objectLockEnabled, setObjectLockEnabled] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  
  const { credentials } = useS3Store();
  const { createBucket, fetchBuckets } = useEnhancedDirectS3();
  const { toast } = useToast();

  // Get current region info
  const currentRegion = credentials?.region || 'eu-west-2';
  const regionInfo = OUTSCALE_REGIONS.find(r => r.id === currentRegion);

  const handleCreate = async () => {
    if (!bucketName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un nom de bucket",
        variant: "destructive"
      });
      return;
    }

    // Validation du nom de bucket
    const bucketNameRegex = /^[a-z0-9][a-z0-9\-]*[a-z0-9]$/;
    if (bucketName.length < 3 || bucketName.length > 63 || !bucketNameRegex.test(bucketName)) {
      toast({
        title: "Nom invalide",
        description: "Le nom doit contenir 3-63 caractères, uniquement des minuscules, chiffres et tirets",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    
    const success = await createBucket(bucketName, currentRegion, {
      versioningEnabled,
      objectLockEnabled,
      encryptionEnabled
    });
    
    if (success) {
      setBucketName('');
      setVersioningEnabled(false);
      setObjectLockEnabled(false);
      setEncryptionEnabled(false);
      onOpenChange(false);
      toast({
        title: "Succès",
        description: `Bucket "${bucketName}" créé avec succès`
      });
    } else {
      toast({
        title: "Erreur",
        description: "Erreur lors de la création du bucket",
        variant: "destructive"
      });
    }
    
    setIsCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un nouveau bucket</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Nom du bucket */}
          <div>
            <Label htmlFor="bucket-name">Nom du bucket</Label>
            <Input
              id="bucket-name"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value.toLowerCase())}
              placeholder="mon-nouveau-bucket"
              disabled={isCreating}
            />
            <p className="text-sm text-muted-foreground mt-1">
              3-63 caractères, minuscules, chiffres et tirets uniquement
            </p>
          </div>
          
          {/* Région */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <Label className="text-sm font-medium">Région et endpoint</Label>
            <div className="mt-1 space-y-1">
              <p className="text-sm font-medium">{regionInfo?.name || currentRegion}</p>
              <p className="text-xs text-muted-foreground">{regionInfo?.endpoint || `Région: ${currentRegion}`}</p>
            </div>
          </div>

          <Separator />

          {/* Options de configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Options de sécurité et versioning
            </h3>

            {/* Versioning */}
            <div className="flex items-start justify-between space-x-4 p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-blue-600" />
                  <Label htmlFor="versioning" className="font-medium">Versioning</Label>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Conserve plusieurs versions de vos objets pour récupération et protection
                </p>
              </div>
              <Switch
                id="versioning"
                checked={versioningEnabled}
                onCheckedChange={setVersioningEnabled}
                disabled={isCreating || objectLockEnabled}
              />
            </div>

            {/* Object Lock */}
            <div className="flex items-start justify-between space-x-4 p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600" />
                  <Label htmlFor="object-lock" className="font-medium">Object Lock</Label>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Protection WORM (Write Once Read Many) - empêche la suppression/modification
                </p>
                {objectLockEnabled && (
                  <div className="mt-2 p-2 bg-amber-50 border-l-2 border-amber-500 rounded">
                    <p className="text-xs text-amber-800 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Le versioning sera activé automatiquement (requis pour Object Lock)
                    </p>
                  </div>
                )}
              </div>
              <Switch
                id="object-lock"
                checked={objectLockEnabled}
                onCheckedChange={(checked) => {
                  setObjectLockEnabled(checked);
                  if (checked) setVersioningEnabled(true);
                }}
                disabled={isCreating}
              />
            </div>

            {/* Encryption */}
            <div className="flex items-start justify-between space-x-4 p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <Label htmlFor="encryption" className="font-medium">Chiffrement (Encryption)</Label>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Chiffrement AES-256 côté serveur pour tous les objets du bucket
                </p>
              </div>
              <Switch
                id="encryption"
                checked={encryptionEnabled}
                onCheckedChange={setEncryptionEnabled}
                disabled={isCreating}
              />
            </div>
          </div>

          {/* Info générale */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-800 space-y-1">
                <p className="font-medium">Note importante :</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>Object Lock nécessite le versioning et ne peut pas être désactivé après création</li>
                  <li>Le versioning et l'encryption peuvent être modifiés après la création</li>
                  <li>Les options de sécurité peuvent impacter les coûts de stockage</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? 'Création...' : 'Créer le bucket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
