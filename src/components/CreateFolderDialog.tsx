import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDirectS3 } from '../hooks/useDirectS3';
import { useToast } from '@/hooks/use-toast';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket: string;
  currentPath: string;
  onFolderCreated: () => void;
}

export const CreateFolderDialog = ({ open, onOpenChange, bucket, currentPath, onFolderCreated }: CreateFolderDialogProps) => {
  const [folderName, setFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { createFolder } = useDirectS3();
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!folderName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un nom de dossier",
        variant: "destructive"
      });
      return;
    }

    // Validation du nom de dossier
    if (folderName.includes('/') || folderName.includes('\\')) {
      toast({
        title: "Nom invalide",
        description: "Le nom ne peut pas contenir de caractères / ou \\",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    const success = await createFolder(bucket, currentPath, folderName);
    
    if (success) {
      setFolderName('');
      onOpenChange(false);
      onFolderCreated();
    }
    
    setIsCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un nouveau dossier</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="folder-name">Nom du dossier</Label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Nouveau dossier"
              disabled={isCreating}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? 'Création...' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
