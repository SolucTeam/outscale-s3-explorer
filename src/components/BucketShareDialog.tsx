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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEnhancedDirectS3 } from '../hooks/useEnhancedDirectS3';
import { useToast } from '@/hooks/use-toast';
import { S3Bucket } from '../types/s3';
import { Share2, Loader2, AlertCircle, Eye, Edit, Trash2, CheckCircle, Key } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
import { OutscaleConfig } from '@/services/outscaleConfig';
import { OUTSCALE_REGIONS } from '@/data/regions';

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
    actions: ['s3:ListBucket', 's3:GetObject', 's3:GetBucketLocation', 's3:ListBucketMultipartUploads']
  },
  {
    value: 'read-write',
    label: 'Lecture / Écriture',
    description: 'Permet de lire, écrire et modifier les objets',
    icon: <Edit className="w-4 h-4" />,
    actions: ['s3:ListBucket', 's3:GetObject', 's3:PutObject', 's3:GetBucketLocation', 's3:ListBucketMultipartUploads', 's3:AbortMultipartUpload', 's3:ListMultipartUploadParts']
  },
  {
    value: 'read-write-delete',
    label: 'Lecture / Écriture / Suppression',
    description: 'Accès complet aux objets (lecture, écriture, suppression)',
    icon: <Trash2 className="w-4 h-4" />,
    actions: ['s3:ListBucket', 's3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:GetBucketLocation', 's3:ListBucketMultipartUploads', 's3:AbortMultipartUpload', 's3:ListMultipartUploadParts']
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
  const [beneficiaryAccessKey, setBeneficiaryAccessKey] = useState('');
  const [beneficiarySecretKey, setBeneficiarySecretKey] = useState('');
  const [beneficiaryRegion, setBeneficiaryRegion] = useState('eu-west-2');
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('read-only');
  const [isSharing, setIsSharing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedCanonicalUserId, setVerifiedCanonicalUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Vérifier les credentials et obtenir le CanonicalUser ID
  const verifyCredentials = async () => {
    if (!beneficiaryAccessKey.trim() || !beneficiarySecretKey.trim()) {
      setError('Veuillez saisir les clés d\'accès du compte bénéficiaire');
      return;
    }

    setIsVerifying(true);
    setError(null);
    setVerifiedCanonicalUserId(null);

    try {
      const tempClient = new S3Client({
        region: beneficiaryRegion,
        endpoint: OutscaleConfig.getEndpoint(beneficiaryRegion),
        credentials: {
          accessKeyId: beneficiaryAccessKey.trim(),
          secretAccessKey: beneficiarySecretKey.trim(),
        },
        forcePathStyle: true,
      });

      const response = await tempClient.send(new ListBucketsCommand({}));
      
      if (response.Owner?.ID) {
        setVerifiedCanonicalUserId(response.Owner.ID);
        toast({
          title: 'Compte vérifié',
          description: `ID canonique récupéré avec succès`,
        });
      } else {
        setError('Impossible de récupérer l\'ID du compte');
      }
    } catch (err: any) {
      setError(err.message || 'Credentials invalides');
    } finally {
      setIsVerifying(false);
    }
  };

  // Réinitialiser si credentials changent
  const handleCredentialChange = (field: 'ak' | 'sk' | 'region', value: string) => {
    setVerifiedCanonicalUserId(null);
    setError(null);
    if (field === 'ak') setBeneficiaryAccessKey(value);
    else if (field === 'sk') setBeneficiarySecretKey(value);
    else setBeneficiaryRegion(value);
  };

  // Fusionner avec policy existante
  const mergeWithExistingPolicy = async (newStatement: any): Promise<string> => {
    try {
      const existingPolicy = await getBucketPolicy(bucket.name);
      
      if (existingPolicy?.policy) {
        const parsed = JSON.parse(existingPolicy.policy);
        const existingIdx = parsed.Statement.findIndex((stmt: any) => stmt.Sid === newStatement.Sid);

        if (existingIdx >= 0) {
          parsed.Statement[existingIdx] = newStatement;
        } else {
          parsed.Statement.push(newStatement);
        }

        return JSON.stringify(parsed);
      }
    } catch (e) {
      // Pas de policy existante
    }

    return JSON.stringify({
      Version: '2012-10-17',
      Statement: [newStatement]
    });
  };

  const handleShare = async () => {
    if (!verifiedCanonicalUserId) {
      setError('Veuillez d\'abord vérifier les credentials');
      return;
    }

    setIsSharing(true);
    setError(null);

    try {
      const selectedLevel = ACCESS_LEVELS.find(l => l.value === accessLevel)!;
      const shortId = verifiedCanonicalUserId.substring(0, 16);
      
      const newStatement = {
        Sid: `CrossAccountAccess-${shortId}`,
        Effect: 'Allow',
        Principal: {
          CanonicalUser: verifiedCanonicalUserId
        },
        Action: selectedLevel.actions,
        Resource: [
          `arn:aws:s3:::${bucket.name}`,
          `arn:aws:s3:::${bucket.name}/*`
        ]
      };
      
      const finalPolicy = await mergeWithExistingPolicy(newStatement);
      const result = await setBucketPolicy(bucket.name, finalPolicy);

      if (result) {
        setSuccess(true);
        toast({
          title: 'Partage configuré',
          description: `Le bucket a été partagé avec le compte Outscale`,
        });

        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setError('Échec de la configuration du partage');
      }
    } catch (err) {
      console.error('Share error:', err);
      setError('Une erreur est survenue');
    } finally {
      setIsSharing(false);
    }
  };

  const handleClose = () => {
    setBeneficiaryAccessKey('');
    setBeneficiarySecretKey('');
    setVerifiedCanonicalUserId(null);
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
            Partager <strong className="break-all">{bucket.name}</strong> avec un autre compte Outscale
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {success && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Le partage a été configuré avec succès !
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Credentials du bénéficiaire */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-muted-foreground" />
                <Label className="font-medium">Credentials du compte bénéficiaire</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ak" className="text-xs">Access Key</Label>
                <Input
                  id="ak"
                  placeholder="AKIAXXXXXXXXXXXXXXXX"
                  value={beneficiaryAccessKey}
                  onChange={(e) => handleCredentialChange('ak', e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sk" className="text-xs">Secret Key</Label>
                <Input
                  id="sk"
                  type="password"
                  placeholder="••••••••••••••••••••••••••"
                  value={beneficiarySecretKey}
                  onChange={(e) => handleCredentialChange('sk', e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="region" className="text-xs">Région</Label>
                <Select value={beneficiaryRegion} onValueChange={(v) => handleCredentialChange('region', v)}>
                  <SelectTrigger id="region">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTSCALE_REGIONS.map((region) => (
                      <SelectItem key={region.id} value={region.id}>
                        {region.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {verifiedCanonicalUserId && (
                <Alert className="bg-green-50 border-green-200 py-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-xs text-green-800">
                    Compte vérifié - ID: {verifiedCanonicalUserId.substring(0, 20)}...
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                variant="outline" 
                onClick={verifyCredentials}
                disabled={isVerifying || !beneficiaryAccessKey.trim() || !beneficiarySecretKey.trim()}
                className="w-full"
              >
                {isVerifying ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Key className="w-4 h-4 mr-2" />
                )}
                Vérifier les credentials
              </Button>
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
                  Actions S3 autorisées pour ce compte
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
            disabled={isSharing || !verifiedCanonicalUserId}
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
