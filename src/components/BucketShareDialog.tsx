import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEnhancedDirectS3 } from '../hooks/useEnhancedDirectS3';
import { useToast } from '@/hooks/use-toast';
import { S3Bucket } from '../types/s3';
import { Share2, Loader2, AlertCircle, Eye, Edit, Trash2, CheckCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface BucketShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket: S3Bucket;
}

type AccessLevel = 'read-only' | 'read-write' | 'read-write-delete';

interface AccessLevelOption {
  value: AccessLevel;
  label: string;
  description: string;
  icon: React.ReactNode;
  actions: string[];
}

const ACCESS_LEVELS: AccessLevelOption[] = [
  {
    value: 'read-only',
    label: 'Lecture seule',
    description: 'Permet uniquement de lire et télécharger les objets',
    icon: <Eye className="w-4 h-4" />,
    actions: ['s3:GetObject', 's3:GetObjectVersion', 's3:ListBucket']
  },
  {
    value: 'read-write',
    label: 'Lecture / Écriture',
    description: 'Permet de lire, écrire et modifier les objets',
    icon: <Edit className="w-4 h-4" />,
    actions: ['s3:GetObject', 's3:GetObjectVersion', 's3:ListBucket', 's3:PutObject', 's3:PutObjectAcl']
  },
  {
    value: 'read-write-delete',
    label: 'Lecture / Écriture / Suppression',
    description: 'Accès complet aux objets (lecture, écriture, suppression)',
    icon: <Trash2 className="w-4 h-4" />,
    actions: ['s3:GetObject', 's3:GetObjectVersion', 's3:ListBucket', 's3:PutObject', 's3:PutObjectAcl', 's3:DeleteObject', 's3:DeleteObjectVersion']
  }
];

export const BucketShareDialog: React.FC<BucketShareDialogProps> = ({
  open,
  onOpenChange,
  bucket
}) => {
  const { setBucketPolicy, getBucketPolicy } = useEnhancedDirectS3();
  const { toast } = useToast();

  // État du formulaire
  const [beneficiaryAccountId, setBeneficiaryAccountId] = useState('');
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('read-only');
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validation de l'ID de compte AWS (12 chiffres)
  const validateAccountId = (accountId: string): boolean => {
    const cleanId = accountId.replace(/[-\s]/g, '');
    return /^\d{12}$/.test(cleanId);
  };

  // Générer la policy de partage
  const generateSharePolicy = (accountId: string, level: AccessLevel): object => {
    const cleanAccountId = accountId.replace(/[-\s]/g, '');
    const selectedLevel = ACCESS_LEVELS.find(l => l.value === level)!;

    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: `CrossAccountAccess-${cleanAccountId}`,
          Effect: 'Allow',
          Principal: {
            AWS: `arn:aws:iam::${cleanAccountId}:root`
          },
          Action: selectedLevel.actions,
          Resource: [
            `arn:aws:s3:::${bucket.name}`,
            `arn:aws:s3:::${bucket.name}/*`
          ]
        }
      ]
    };

    return policy;
  };

  // Fusionner avec une policy existante si présente
  const mergeWithExistingPolicy = async (newStatement: any): Promise<string> => {
    try {
      const existingPolicy = await getBucketPolicy(bucket.name);
      
      if (existingPolicy?.policy) {
        const parsed = JSON.parse(existingPolicy.policy);
        
        // Vérifier si un statement pour ce compte existe déjà
        const existingStatementIndex = parsed.Statement.findIndex((stmt: any) => 
          stmt.Sid === newStatement.Sid
        );

        if (existingStatementIndex >= 0) {
          // Remplacer le statement existant
          parsed.Statement[existingStatementIndex] = newStatement;
        } else {
          // Ajouter le nouveau statement
          parsed.Statement.push(newStatement);
        }

        return JSON.stringify(parsed);
      }
    } catch (e) {
      // Pas de policy existante ou erreur de parsing
    }

    // Retourner une nouvelle policy avec seulement ce statement
    return JSON.stringify({
      Version: '2012-10-17',
      Statement: [newStatement]
    });
  };

  const handleShare = async () => {
    setError(null);
    setSuccess(false);

    // Validation
    if (!beneficiaryAccountId.trim()) {
      setError('Veuillez saisir l\'ID du compte bénéficiaire');
      return;
    }

    if (!validateAccountId(beneficiaryAccountId)) {
      setError('L\'ID du compte AWS doit contenir exactement 12 chiffres');
      return;
    }

    setIsSharing(true);

    try {
      const sharePolicy = generateSharePolicy(beneficiaryAccountId, accessLevel);
      const newStatement = (sharePolicy as any).Statement[0];
      
      // Fusionner avec la policy existante
      const finalPolicy = await mergeWithExistingPolicy(newStatement);

      const result = await setBucketPolicy(bucket.name, finalPolicy);

      if (result) {
        setSuccess(true);
        toast({
          title: 'Partage configuré',
          description: `Le bucket a été partagé avec le compte ${beneficiaryAccountId}`,
        });

        // Réinitialiser le formulaire après succès
        setTimeout(() => {
          setBeneficiaryAccountId('');
          setAccessLevel('read-only');
          setSuccess(false);
        }, 2000);
      } else {
        setError('Échec de la configuration du partage. Veuillez réessayer.');
      }
    } catch (err) {
      console.error('Share error:', err);
      setError('Une erreur est survenue lors de la configuration du partage');
    } finally {
      setIsSharing(false);
    }
  };

  const handleClose = () => {
    setBeneficiaryAccountId('');
    setAccessLevel('read-only');
    setError(null);
    setSuccess(false);
    onOpenChange(false);
  };

  const selectedLevel = ACCESS_LEVELS.find(l => l.value === accessLevel)!;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">Partager le bucket</span>
          </DialogTitle>
          <DialogDescription className="truncate">
            Partager <strong className="break-all">{bucket.name}</strong> avec un autre compte AWS
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Message de succès */}
            {success && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Le partage a été configuré avec succès !
                </AlertDescription>
              </Alert>
            )}

            {/* Message d'erreur */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* ID du compte bénéficiaire */}
            <div className="space-y-2">
              <Label htmlFor="accountId">ID du compte AWS bénéficiaire</Label>
              <Input
                id="accountId"
                placeholder="123456789012"
                value={beneficiaryAccountId}
                onChange={(e) => setBeneficiaryAccountId(e.target.value)}
                maxLength={14}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                L'identifiant AWS du compte qui recevra l'accès (12 chiffres)
              </p>
            </div>

            <Separator />

            {/* Niveau d'accès */}
            <div className="space-y-3">
              <Label>Niveau d'accès</Label>
              <RadioGroup
                value={accessLevel}
                onValueChange={(value) => setAccessLevel(value as AccessLevel)}
                className="space-y-3"
              >
                {ACCESS_LEVELS.map((level) => (
                  <div key={level.value} className="flex items-start space-x-3">
                    <RadioGroupItem value={level.value} id={level.value} className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor={level.value} className="flex items-center gap-2 cursor-pointer">
                        {level.icon}
                        <span className="font-medium">{level.label}</span>
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {level.description}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Separator />

            {/* Aperçu des permissions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Permissions accordées</CardTitle>
                <CardDescription>
                  Actions S3 qui seront autorisées pour ce compte
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {selectedLevel.actions.map((action) => (
                    <span
                      key={action}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-muted"
                    >
                      {action}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Avertissement */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Important :</strong> Cette action modifie la policy du bucket. 
                Le compte bénéficiaire pourra accéder au bucket dès que la policy sera appliquée.
              </AlertDescription>
            </Alert>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button 
            onClick={handleShare} 
            disabled={isSharing || !beneficiaryAccountId.trim()}
          >
            {isSharing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Partage en cours...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 mr-2" />
                Partager
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
