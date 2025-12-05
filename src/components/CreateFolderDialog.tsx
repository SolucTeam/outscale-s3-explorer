import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEnhancedDirectS3 } from '../hooks/useEnhancedDirectS3'; 
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
  const { createFolder } = useEnhancedDirectS3();
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

    // Validation regex: alphanumériques, tirets, underscores et espaces
    const validNameRegex = /^[a-zA-Z0-9\s_-]+$/;
    if (!validNameRegex.test(folderName)) {
      toast({
        title: "Nom invalide",
        description: "Le nom ne peut contenir que des lettres, chiffres, espaces, tirets et underscores",
        variant: "destructive"
      });
      return;
    }

    // Validation longueur
    if (folderName.length > 255) {
      toast({
        title: "Nom trop long",
        description: "Le nom du dossier ne peut pas dépasser 255 caractères",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const success = await createFolder(bucket, currentPath, folderName);
      
      if (success) {
        setFolderName('');
        onOpenChange(false);
        onFolderCreated();
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
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
