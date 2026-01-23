// BucketSecurityDialog - Gestion de la sécurité des buckets S3 Outscale
import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useEnhancedDirectS3 } from '../hooks/useEnhancedDirectS3';
import { S3Bucket, BucketAcl, BucketPolicy } from '../types/s3';
import { Shield, Users, FileText, Loader2, AlertCircle, Save, Trash2, Eye, CheckCircle, XCircle, RefreshCw, Share2, Edit, UserMinus, Pencil, Key } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { s3LoggingService } from '@/services/s3LoggingService';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
import { OutscaleConfig } from '@/services/outscaleConfig';
import { OUTSCALE_REGIONS } from '@/data/regions';


interface BucketSecurityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket: S3Bucket;
}

// ACL prédéfinis S3
const PREDEFINED_ACLS = [
  { value: 'private', label: 'Privé', description: 'Seul le propriétaire a un accès complet' },
  { value: 'public-read', label: 'Lecture publique', description: 'Tout le monde peut lire' },
  { value: 'public-read-write', label: 'Lecture/Écriture publique', description: 'Tout le monde peut lire et écrire' },
  { value: 'authenticated-read', label: 'Lecture authentifiée', description: 'Les utilisateurs authentifiés peuvent lire' },
];

// Templates de policies
const POLICY_TEMPLATES = [
  {
    name: 'Lecture publique',
    description: 'Permet à tout le monde de lire les objets',
    policy: {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: 'arn:aws:s3:::BUCKET_NAME/*'
        }
      ]
    }
  },
  {
    name: 'Lecture/Écriture pour un utilisateur',
    description: 'Accès complet pour un utilisateur spécifique',
    policy: {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AllowUserAccess',
          Effect: 'Allow',
          Principal: { AWS: 'arn:aws:iam::ACCOUNT_ID:user/USER_NAME' },
          Action: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
          Resource: 'arn:aws:s3:::BUCKET_NAME/*'
        }
      ]
    }
  },
  {
    name: 'Refuser les suppressions',
    description: 'Empêche la suppression des objets',
    policy: {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'DenyDeleteObject',
          Effect: 'Deny',
          Principal: '*',
          Action: 's3:DeleteObject',
          Resource: 'arn:aws:s3:::BUCKET_NAME/*'
        }
      ]
    }
  }
];

interface EffectivePermission {
  action: string;
  allowed: boolean;
  source: 'ACL' | 'Policy' | 'Default';
  details: string;
}

// Types pour le partage cross-account
type AccessLevel = 'read-only' | 'read-write' | 'read-write-delete';

interface CrossAccountShare {
  canonicalUserId: string;
  sid: string;
  accessLevel: AccessLevel;
  actions: string[];
}

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

// Fonction pour déterminer le niveau d'accès à partir des actions
const detectAccessLevel = (actions: string[]): AccessLevel => {
  const hasDelete = actions.some(a => a.includes('Delete'));
  const hasWrite = actions.some(a => a.includes('Put'));
  
  if (hasDelete) return 'read-write-delete';
  if (hasWrite) return 'read-write';
  return 'read-only';
};

// Fonction pour extraire les partages cross-account de la policy (supporte CanonicalUser et AWS ARN)
const extractCrossAccountShares = (policyText: string): CrossAccountShare[] => {
  if (!policyText) return [];
  
  try {
    const policy = JSON.parse(policyText);
    const shares: CrossAccountShare[] = [];
    
    if (policy.Statement) {
      policy.Statement.forEach((stmt: any) => {
        if (stmt.Effect === 'Allow' && stmt.Principal) {
          let canonicalUserId: string | null = null;
          
          // Support CanonicalUser (Outscale style)
          if (stmt.Principal.CanonicalUser) {
            canonicalUserId = Array.isArray(stmt.Principal.CanonicalUser) 
              ? stmt.Principal.CanonicalUser[0] 
              : stmt.Principal.CanonicalUser;
          }
          // Support legacy AWS ARN style
          else if (stmt.Principal.AWS) {
            const awsPrincipal = Array.isArray(stmt.Principal.AWS) ? stmt.Principal.AWS[0] : stmt.Principal.AWS;
            if (awsPrincipal && awsPrincipal.includes('arn:aws:iam::')) {
              const match = awsPrincipal.match(/arn:aws:iam::(\d{12})/);
              if (match) {
                canonicalUserId = match[1]; // Use account ID as fallback
              }
            }
          }
          
          if (canonicalUserId) {
            const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
            
            shares.push({
              canonicalUserId,
              sid: stmt.Sid || `CrossAccountAccess-${canonicalUserId.substring(0, 12)}`,
              accessLevel: detectAccessLevel(actions),
              actions
            });
          }
        }
      });
    }
    
    return shares;
  } catch (e) {
    return [];
  }
};

export const BucketSecurityDialog: React.FC<BucketSecurityDialogProps> = ({
  open,
  onOpenChange,
  bucket
}) => {
  const { getBucketAcl, getBucketPolicy, setBucketAcl, setBucketPolicy, deleteBucketPolicy } = useEnhancedDirectS3();
  const { toast } = useToast();
  
  const [acl, setAcl] = useState<BucketAcl | null>(null);
  const [policy, setPolicy] = useState<BucketPolicy | null>(null);
  const [loadingAcl, setLoadingAcl] = useState(false);
  const [loadingPolicy, setLoadingPolicy] = useState(false);
  const [errorAcl, setErrorAcl] = useState<string | null>(null);
  const [errorPolicy, setErrorPolicy] = useState<string | null>(null);
  
  // États pour l'édition ACL
  const [selectedAcl, setSelectedAcl] = useState<string>('private');
  const [policyText, setPolicyText] = useState<string>('');
  const [savingAcl, setSavingAcl] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [deletingPolicy, setDeletingPolicy] = useState(false);
  const [policyError, setPolicyError] = useState<string | null>(null);
  
  // Permissions effectives calculées
  const [effectivePermissions, setEffectivePermissions] = useState<EffectivePermission[]>([]);

  // États pour le partage
  const [crossAccountShares, setCrossAccountShares] = useState<CrossAccountShare[]>([]);
  const [beneficiaryAccessKey, setBeneficiaryAccessKey] = useState('');
  const [beneficiarySecretKey, setBeneficiarySecretKey] = useState('');
  const [beneficiaryRegion, setBeneficiaryRegion] = useState('eu-west-2');
  const [newAccessLevel, setNewAccessLevel] = useState<AccessLevel>('read-only');
  const [isAddingShare, setIsAddingShare] = useState(false);
  const [isVerifyingCredentials, setIsVerifyingCredentials] = useState(false);
  const [verifiedCanonicalUserId, setVerifiedCanonicalUserId] = useState<string | null>(null);
  const [credentialsError, setCredentialsError] = useState<string | null>(null);
  const [revokingShareId, setRevokingShareId] = useState<string | null>(null);
  const [editingShare, setEditingShare] = useState<CrossAccountShare | null>(null);
  const [editAccessLevel, setEditAccessLevel] = useState<AccessLevel>('read-only');
  const [isUpdatingShare, setIsUpdatingShare] = useState(false);

  const loadAcl = useCallback(async () => {
    setLoadingAcl(true);
    setErrorAcl(null);
    try {
      const result = await getBucketAcl(bucket.name);
      if (result) {
        setAcl(result);
        // Détecter l'ACL actuel basé sur les grants
        detectCurrentAcl(result);
      } else {
        setErrorAcl('Impossible de récupérer les ACL');
      }
    } catch (error) {
      setErrorAcl('Erreur lors du chargement des ACL');
    } finally {
      setLoadingAcl(false);
    }
  }, [bucket.name, getBucketAcl]);

  const loadPolicy = useCallback(async () => {
    setLoadingPolicy(true);
    setErrorPolicy(null);
    try {
      const result = await getBucketPolicy(bucket.name);
      if (result) {
        setPolicy(result);
        const formattedPolicy = result.policy ? formatJson(result.policy) : '';
        setPolicyText(formattedPolicy);
        
        // Extraire les partages cross-account
        const shares = extractCrossAccountShares(result.policy || '');
        setCrossAccountShares(shares);
      } else {
        setPolicy({ policy: undefined });
        setPolicyText('');
        setCrossAccountShares([]);
      }
    } catch (error) {
      setErrorPolicy('Erreur lors du chargement de la policy');
    } finally {
      setLoadingPolicy(false);
    }
  }, [bucket.name, getBucketPolicy]);

  useEffect(() => {
    if (open) {
      loadAcl();
      loadPolicy();
    }
  }, [open, loadAcl, loadPolicy]);

  // Calculer les permissions effectives
  useEffect(() => {
    calculateEffectivePermissions();
  }, [acl, policy]);

  const detectCurrentAcl = (aclData: BucketAcl) => {
    const hasPublicRead = aclData.grants.some(g => 
      g.grantee.uri === 'http://acs.amazonaws.com/groups/global/AllUsers' && 
      (g.permission === 'READ' || g.permission === 'FULL_CONTROL')
    );
    const hasPublicWrite = aclData.grants.some(g => 
      g.grantee.uri === 'http://acs.amazonaws.com/groups/global/AllUsers' && 
      (g.permission === 'WRITE' || g.permission === 'FULL_CONTROL')
    );
    const hasAuthRead = aclData.grants.some(g => 
      g.grantee.uri === 'http://acs.amazonaws.com/groups/global/AuthenticatedUsers' && 
      g.permission === 'READ'
    );

    if (hasPublicRead && hasPublicWrite) {
      setSelectedAcl('public-read-write');
    } else if (hasPublicRead) {
      setSelectedAcl('public-read');
    } else if (hasAuthRead) {
      setSelectedAcl('authenticated-read');
    } else {
      setSelectedAcl('private');
    }
  };

  const calculateEffectivePermissions = () => {
    const permissions: EffectivePermission[] = [];
    
    // Permissions de base basées sur l'ACL
    if (acl) {
      const hasPublicRead = acl.grants.some(g => 
        g.grantee.uri?.includes('AllUsers') && 
        (g.permission === 'READ' || g.permission === 'FULL_CONTROL')
      );
      const hasPublicWrite = acl.grants.some(g => 
        g.grantee.uri?.includes('AllUsers') && 
        (g.permission === 'WRITE' || g.permission === 'FULL_CONTROL')
      );
      
      permissions.push({
        action: 's3:GetObject (Public)',
        allowed: hasPublicRead,
        source: 'ACL',
        details: hasPublicRead ? 'AllUsers a la permission READ' : 'Aucun accès public en lecture'
      });
      
      permissions.push({
        action: 's3:PutObject (Public)',
        allowed: hasPublicWrite,
        source: 'ACL',
        details: hasPublicWrite ? 'AllUsers a la permission WRITE' : 'Aucun accès public en écriture'
      });
    }
    
    // Analyser la policy
    if (policy?.policy) {
      try {
        const policyObj = JSON.parse(policy.policy);
        if (policyObj.Statement) {
          policyObj.Statement.forEach((stmt: any) => {
            const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
            const isAllow = stmt.Effect === 'Allow';
            const principal = typeof stmt.Principal === 'string' ? stmt.Principal : JSON.stringify(stmt.Principal);
            
            actions.forEach((action: string) => {
              permissions.push({
                action: `${action} (Policy)`,
                allowed: isAllow,
                source: 'Policy',
                details: `${stmt.Effect} pour ${principal}`
              });
            });
          });
        }
      } catch (e) {
        // Policy invalide
      }
    }
    
    // Permissions par défaut du propriétaire
    permissions.push({
      action: 'Toutes les actions (Propriétaire)',
      allowed: true,
      source: 'Default',
      details: 'Le propriétaire a toujours un accès complet'
    });
    
    setEffectivePermissions(permissions);
  };

  const formatJson = (jsonString?: string) => {
    if (!jsonString) return '';
    try {
      return JSON.stringify(JSON.parse(jsonString), null, 2);
    } catch {
      return jsonString;
    }
  };

  const validatePolicy = (text: string): boolean => {
    if (!text.trim()) {
      setPolicyError(null);
      return true;
    }
    try {
      const parsed = JSON.parse(text);
      if (!parsed.Version || !parsed.Statement) {
        setPolicyError('La policy doit contenir "Version" et "Statement"');
        return false;
      }
      setPolicyError(null);
      return true;
    } catch (e) {
      setPolicyError('JSON invalide');
      return false;
    }
  };

  const handleSaveAcl = async () => {
    setSavingAcl(true);
    try {
      const success = await setBucketAcl(bucket.name, selectedAcl);
      if (success) {
        await loadAcl();
      }
    } finally {
      setSavingAcl(false);
    }
  };

  const handleSavePolicy = async () => {
    if (!validatePolicy(policyText)) return;
    
    setSavingPolicy(true);
    try {
      const policyToSave = policyText.trim().replace(/BUCKET_NAME/g, bucket.name);
      const success = await setBucketPolicy(bucket.name, policyToSave);
      if (success) {
        await loadPolicy();
      }
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleDeletePolicy = async () => {
    setDeletingPolicy(true);
    try {
      const success = await deleteBucketPolicy(bucket.name);
      if (success) {
        setPolicy({ policy: undefined });
        setPolicyText('');
        setCrossAccountShares([]);
      }
    } finally {
      setDeletingPolicy(false);
    }
  };

  const applyTemplate = (template: typeof POLICY_TEMPLATES[0]) => {
    const policyWithBucket = JSON.stringify(template.policy, null, 2)
      .replace(/BUCKET_NAME/g, bucket.name);
    setPolicyText(policyWithBucket);
    validatePolicy(policyWithBucket);
  };

  // Vérifier les credentials du bénéficiaire et obtenir le CanonicalUser ID
  const verifyBeneficiaryCredentials = async () => {
    if (!beneficiaryAccessKey.trim() || !beneficiarySecretKey.trim()) {
      setCredentialsError('Veuillez saisir les clés d\'accès du compte bénéficiaire');
      return;
    }

    setIsVerifyingCredentials(true);
    setCredentialsError(null);
    setVerifiedCanonicalUserId(null);

    try {
      // Créer un client S3 temporaire avec les credentials du bénéficiaire
      const tempClient = new S3Client({
        region: beneficiaryRegion,
        endpoint: OutscaleConfig.getEndpoint(beneficiaryRegion),
        credentials: {
          accessKeyId: beneficiaryAccessKey.trim(),
          secretAccessKey: beneficiarySecretKey.trim(),
        },
        forcePathStyle: true,
      });

      // Appeler list-buckets pour obtenir le Owner.ID (CanonicalUser)
      const response = await tempClient.send(new ListBucketsCommand({}));
      
      if (response.Owner?.ID) {
        setVerifiedCanonicalUserId(response.Owner.ID);
        toast({
          title: 'Compte vérifié',
          description: `ID canonique récupéré: ${response.Owner.ID.substring(0, 16)}...`,
        });
      } else {
        setCredentialsError('Impossible de récupérer l\'ID du compte. Vérifiez les credentials.');
      }
    } catch (err: any) {
      console.error('Credential verification error:', err);
      setCredentialsError(err.message || 'Credentials invalides ou problème de connexion');
    } finally {
      setIsVerifyingCredentials(false);
    }
  };

  // Réinitialiser la vérification si les credentials changent
  const handleBeneficiaryCredentialsChange = (field: 'ak' | 'sk' | 'region', value: string) => {
    setVerifiedCanonicalUserId(null);
    setCredentialsError(null);
    if (field === 'ak') setBeneficiaryAccessKey(value);
    else if (field === 'sk') setBeneficiarySecretKey(value);
    else setBeneficiaryRegion(value);
  };

  // Ajouter un nouveau partage cross-account
  const handleAddShare = async () => {
    if (!verifiedCanonicalUserId) {
      toast({
        title: 'Erreur',
        description: 'Veuillez d\'abord vérifier les credentials du compte bénéficiaire',
        variant: 'destructive'
      });
      return;
    }
    
    // Vérifier si ce compte est déjà partagé
    if (crossAccountShares.some(s => s.canonicalUserId === verifiedCanonicalUserId)) {
      toast({
        title: 'Erreur',
        description: 'Ce compte a déjà accès au bucket',
        variant: 'destructive'
      });
      return;
    }

    setIsAddingShare(true);
    const shortId = verifiedCanonicalUserId.substring(0, 16);
    const entryId = s3LoggingService.logOperationStart('share_add', bucket.name, undefined, `Compte: ${shortId}...`);

    try {
      const selectedLevel = ACCESS_LEVELS.find(l => l.value === newAccessLevel)!;
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

      let newPolicy: any;
      
      if (policy?.policy) {
        newPolicy = JSON.parse(policy.policy);
        newPolicy.Statement.push(newStatement);
      } else {
        newPolicy = {
          Version: '2012-10-17',
          Statement: [newStatement]
        };
      }

      const success = await setBucketPolicy(bucket.name, JSON.stringify(newPolicy));

      if (success) {
        s3LoggingService.logOperationSuccess(entryId, 'share_add', bucket.name, undefined, `Accès ${selectedLevel.label} accordé au compte ${shortId}...`);
        toast({
          title: 'Partage ajouté',
          description: `Le bucket a été partagé avec le compte Outscale`,
        });
        // Réinitialiser le formulaire
        setBeneficiaryAccessKey('');
        setBeneficiarySecretKey('');
        setVerifiedCanonicalUserId(null);
        setNewAccessLevel('read-only');
        await loadPolicy();
      } else {
        s3LoggingService.logOperationError(entryId, 'share_add', 'Échec de l\'ajout du partage', bucket.name);
      }
    } catch (err) {
      s3LoggingService.logOperationError(entryId, 'share_add', 'Erreur lors de l\'ajout du partage', bucket.name);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de l\'ajout du partage',
        variant: 'destructive'
      });
    } finally {
      setIsAddingShare(false);
    }
  };

  // Modifier le niveau d'accès d'un partage existant
  const handleUpdateShare = async () => {
    if (!editingShare) return;

    setIsUpdatingShare(true);
    const shortId = editingShare.canonicalUserId.substring(0, 16);
    const entryId = s3LoggingService.logOperationStart('share_update', bucket.name, undefined, `Compte: ${shortId}...`);

    try {
      if (!policy?.policy) return;

      const currentPolicy = JSON.parse(policy.policy);
      const selectedLevel = ACCESS_LEVELS.find(l => l.value === editAccessLevel)!;
      
      // Trouver et mettre à jour le statement existant
      currentPolicy.Statement = currentPolicy.Statement.map((stmt: any) => {
        // Matcher par CanonicalUser
        if (stmt.Principal?.CanonicalUser === editingShare.canonicalUserId) {
          return {
            ...stmt,
            Action: selectedLevel.actions,
            Sid: `CrossAccountAccess-${shortId}`
          };
        }
        // Support legacy AWS ARN
        let principalArn: string | null = null;
        if (stmt.Principal?.AWS) {
          principalArn = Array.isArray(stmt.Principal.AWS) ? stmt.Principal.AWS[0] : stmt.Principal.AWS;
        }
        if (principalArn && principalArn.includes(editingShare.canonicalUserId)) {
          return {
            ...stmt,
            Action: selectedLevel.actions,
            Sid: `CrossAccountAccess-${shortId}`
          };
        }
        return stmt;
      });

      const success = await setBucketPolicy(bucket.name, JSON.stringify(currentPolicy));

      if (success) {
        const previousLevel = ACCESS_LEVELS.find(l => l.value === editingShare.accessLevel);
        s3LoggingService.logOperationSuccess(
          entryId, 
          'share_update', 
          bucket.name, 
          undefined, 
          `Compte ${shortId}...: ${previousLevel?.label} → ${selectedLevel.label}`
        );
        toast({
          title: 'Partage modifié',
          description: `L'accès a été mis à jour vers ${selectedLevel.label}`,
        });
        setEditingShare(null);
        await loadPolicy();
      } else {
        s3LoggingService.logOperationError(entryId, 'share_update', 'Échec de la modification du partage', bucket.name);
      }
    } catch (err) {
      s3LoggingService.logOperationError(entryId, 'share_update', 'Erreur lors de la modification du partage', bucket.name);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la modification du partage',
        variant: 'destructive'
      });
    } finally {
      setIsUpdatingShare(false);
    }
  };

  // Démarrer l'édition d'un partage
  const startEditShare = (share: CrossAccountShare) => {
    setEditingShare(share);
    setEditAccessLevel(share.accessLevel);
  };

  // Annuler l'édition
  const cancelEditShare = () => {
    setEditingShare(null);
    setEditAccessLevel('read-only');
  };

  // Révoquer un partage cross-account
  const handleRevokeShare = async (share: CrossAccountShare) => {
    setRevokingShareId(share.canonicalUserId);
    const shortId = share.canonicalUserId.substring(0, 16);
    const entryId = s3LoggingService.logOperationStart('share_revoke', bucket.name, undefined, `Compte: ${shortId}...`);

    try {
      if (!policy?.policy) return;

      const currentPolicy = JSON.parse(policy.policy);
      
      // Filtrer pour retirer le statement de ce compte
      currentPolicy.Statement = currentPolicy.Statement.filter((stmt: any) => {
        // Identifier par Sid
        if (stmt.Sid === share.sid) return false;
        
        // Identifier par CanonicalUser
        if (stmt.Principal?.CanonicalUser === share.canonicalUserId) return false;
        
        // Support legacy AWS ARN
        if (stmt.Principal?.AWS) {
          const awsPrincipal = Array.isArray(stmt.Principal.AWS) ? stmt.Principal.AWS[0] : stmt.Principal.AWS;
          if (awsPrincipal && awsPrincipal.includes(share.canonicalUserId)) {
            return false;
          }
        }
        
        return true;
      });

      const accessLevel = ACCESS_LEVELS.find(l => l.value === share.accessLevel);

      // Si plus aucun statement, supprimer la policy entière
      if (currentPolicy.Statement.length === 0) {
        const success = await deleteBucketPolicy(bucket.name);
        if (success) {
          s3LoggingService.logOperationSuccess(entryId, 'share_revoke', bucket.name, undefined, `Accès ${accessLevel?.label} révoqué pour ${shortId}...`);
          toast({
            title: 'Accès révoqué',
            description: `L'accès a été supprimé`,
          });
          await loadPolicy();
        } else {
          s3LoggingService.logOperationError(entryId, 'share_revoke', 'Échec de la révocation', bucket.name);
        }
      } else {
        const success = await setBucketPolicy(bucket.name, JSON.stringify(currentPolicy));
        if (success) {
          s3LoggingService.logOperationSuccess(entryId, 'share_revoke', bucket.name, undefined, `Accès ${accessLevel?.label} révoqué pour ${shortId}...`);
          toast({
            title: 'Accès révoqué',
            description: `L'accès a été supprimé`,
          });
          await loadPolicy();
        } else {
          s3LoggingService.logOperationError(entryId, 'share_revoke', 'Échec de la révocation', bucket.name);
        }
      }
    } catch (err) {
      s3LoggingService.logOperationError(entryId, 'share_revoke', 'Erreur lors de la révocation de l\'accès', bucket.name);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la révocation de l\'accès',
        variant: 'destructive'
      });
    } finally {
      setRevokingShareId(null);
    }
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'FULL_CONTROL':
        return <Badge variant="destructive">Contrôle total</Badge>;
      case 'READ':
        return <Badge variant="secondary">Lecture</Badge>;
      case 'WRITE':
        return <Badge variant="outline">Écriture</Badge>;
      case 'READ_ACP':
        return <Badge variant="secondary">Lire ACL</Badge>;
      case 'WRITE_ACP':
        return <Badge variant="outline">Modifier ACL</Badge>;
      default:
        return <Badge>{permission}</Badge>;
    }
  };

  const getAccessLevelBadge = (level: AccessLevel) => {
    switch (level) {
      case 'read-only':
        return <Badge variant="secondary" className="flex items-center gap-1"><Eye className="w-3 h-3" />Lecture</Badge>;
      case 'read-write':
        return <Badge variant="default" className="flex items-center gap-1"><Edit className="w-3 h-3" />Lecture/Écriture</Badge>;
      case 'read-write-delete':
        return <Badge variant="destructive" className="flex items-center gap-1"><Trash2 className="w-3 h-3" />Accès complet</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">Gestion de la sécurité</span>
          </DialogTitle>
          <DialogDescription className="truncate">
            ACL, policies, cross-account et permissions pour <strong className="break-all">{bucket.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="acl" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
            <TabsTrigger value="acl" className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-3">
              <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden xs:inline sm:inline">ACL</span>
            </TabsTrigger>
            <TabsTrigger value="policy" className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-3">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden xs:inline sm:inline">Policy</span>
            </TabsTrigger>
            <TabsTrigger value="crossaccount" className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-3">
              <Share2 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden xs:inline sm:inline">Cross-Account</span>
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-3">
              <Eye className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden xs:inline sm:inline">Permissions</span>
            </TabsTrigger>
          </TabsList>

          {/* ACL Tab */}
          <TabsContent value="acl" className="flex-1 overflow-hidden mt-4">
            {loadingAcl ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : errorAcl ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorAcl}</AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[calc(90vh-200px)] max-h-[500px] pr-2 sm:pr-4">
                <div className="space-y-4">
                  {/* ACL prédéfini */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">ACL prédéfini</CardTitle>
                      <CardDescription>Sélectionnez un niveau d'accès prédéfini</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Select value={selectedAcl} onValueChange={setSelectedAcl}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un ACL" />
                        </SelectTrigger>
                        <SelectContent>
                          {PREDEFINED_ACLS.map(acl => (
                            <SelectItem key={acl.value} value={acl.value}>
                              <div className="flex flex-col">
                                <span>{acl.label}</span>
                                <span className="text-xs text-muted-foreground">{acl.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Button 
                        onClick={handleSaveAcl} 
                        disabled={savingAcl}
                        className="w-full"
                      >
                        {savingAcl ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Appliquer l'ACL
                      </Button>
                    </CardContent>
                  </Card>

                  <Separator />

                  {/* Propriétaire */}
                  {acl && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Propriétaire du bucket</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-sm">
                          <span className="text-muted-foreground flex-shrink-0">ID:</span>
                          <span className="font-mono text-xs break-all sm:text-right">{acl.owner.id}</span>
                        </div>
                        {acl.owner.displayName && (
                          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-sm">
                            <span className="text-muted-foreground flex-shrink-0">Nom:</span>
                            <span className="break-all sm:text-right">{acl.owner.displayName}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Grants détaillés */}
                  {acl && acl.grants.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Permissions détaillées</CardTitle>
                        <CardDescription>
                          {acl.grants.length} {acl.grants.length > 1 ? 'permissions accordées' : 'permission accordée'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {acl.grants.map((grant, index) => (
                            <div key={index} className="p-2 sm:p-3 bg-muted/50 rounded-lg space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <span className="text-xs sm:text-sm font-medium break-all">
                                   {grant.grantee.displayName || 
                                   (grant.grantee.uri?.includes('AllUsers') ? '🌍 Tout le monde' : 
                                    grant.grantee.uri?.includes('AuthenticatedUsers') ? '🔐 Utilisateurs authentifiés' :
                                    grant.grantee.emailAddress || 
                                    grant.grantee.id?.substring(0, 20) + '...')}
                                </span>
                                <div className="flex-shrink-0">
                                  {getPermissionIcon(grant.permission)}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <div>Type: {grant.grantee.type}</div>
                                {grant.grantee.id && (
                                  <div className="font-mono break-all">ID: {grant.grantee.id}</div>
                                )}
                                {grant.grantee.uri && (
                                  <div className="break-all">URI: {grant.grantee.uri}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Policy Tab */}
          <TabsContent value="policy" className="flex-1 overflow-auto mt-4">
            {loadingPolicy ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : errorPolicy ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorPolicy}</AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[calc(90vh-200px)] max-h-[500px] pr-2 sm:pr-4">
              <div className="space-y-4">
                {/* Templates */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Templates de policy</CardTitle>
                    <CardDescription>Utilisez un template comme point de départ</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {POLICY_TEMPLATES.map((template, index) => (
                        <Button 
                          key={index}
                          variant="outline" 
                          size="sm"
                          onClick={() => applyTemplate(template)}
                        >
                          {template.name}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Éditeur de policy */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Éditeur de policy JSON</CardTitle>
                    <CardDescription>
                      Modifiez directement la policy du bucket
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Policy JSON</Label>
                      <Textarea 
                        value={policyText}
                        onChange={(e) => {
                          setPolicyText(e.target.value);
                          validatePolicy(e.target.value);
                        }}
                        placeholder='{"Version": "2012-10-17", "Statement": [...]}'
                        className="font-mono text-[10px] sm:text-xs min-h-[150px] sm:min-h-[200px]"
                      />
                      {policyError && (
                        <p className="text-xs text-destructive">{policyError}</p>
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button 
                        onClick={handleSavePolicy} 
                        disabled={savingPolicy || !!policyError}
                        className="flex-1 text-xs sm:text-sm"
                        size="sm"
                      >
                        {savingPolicy ? (
                          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        )}
                        <span className="truncate">Enregistrer</span>
                      </Button>
                      
                      {policy?.policy && (
                        <Button 
                          variant="destructive"
                          onClick={handleDeletePolicy}
                          disabled={deletingPolicy}
                          size="sm"
                          className="text-xs sm:text-sm"
                        >
                          {deletingPolicy ? (
                            <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          )}
                          <span className="truncate">Supprimer</span>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Cross-Account Tab */}
          <TabsContent value="crossaccount" className="flex-1 overflow-auto mt-4">
            <ScrollArea className="h-[calc(90vh-200px)] max-h-[500px] pr-2 sm:pr-4">
              <div className="space-y-4">
                {/* Ajouter un accès cross-account */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Share2 className="w-4 h-4" />
                      Accès Cross-Account
                    </CardTitle>
                    <CardDescription>
                      Accorder l'accès à ce bucket à un autre compte Outscale
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Credentials du bénéficiaire */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-muted-foreground" />
                        <Label className="font-medium">Credentials du compte bénéficiaire</Label>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="beneficiaryAk" className="text-xs">Access Key</Label>
                        <Input
                          id="beneficiaryAk"
                          placeholder="AKIAXXXXXXXXXXXXXXXX"
                          value={beneficiaryAccessKey}
                          onChange={(e) => handleBeneficiaryCredentialsChange('ak', e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="beneficiarySk" className="text-xs">Secret Key</Label>
                        <Input
                          id="beneficiarySk"
                          type="password"
                          placeholder="••••••••••••••••••••••••••"
                          value={beneficiarySecretKey}
                          onChange={(e) => handleBeneficiaryCredentialsChange('sk', e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="beneficiaryRegion" className="text-xs">Région</Label>
                        <Select value={beneficiaryRegion} onValueChange={(v) => handleBeneficiaryCredentialsChange('region', v)}>
                          <SelectTrigger id="beneficiaryRegion">
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

                      {credentialsError && (
                        <Alert variant="destructive" className="py-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">{credentialsError}</AlertDescription>
                        </Alert>
                      )}

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
                        onClick={verifyBeneficiaryCredentials}
                        disabled={isVerifyingCredentials || !beneficiaryAccessKey.trim() || !beneficiarySecretKey.trim()}
                        className="w-full"
                      >
                        {isVerifyingCredentials ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Key className="w-4 h-4 mr-2" />
                        )}
                        Vérifier les credentials
                      </Button>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label>Niveau d'accès</Label>
                      <RadioGroup
                        value={newAccessLevel}
                        onValueChange={(value) => setNewAccessLevel(value as AccessLevel)}
                        className="space-y-2"
                      >
                        {ACCESS_LEVELS.map((level) => (
                          <div key={level.value} className="flex items-start space-x-3">
                            <RadioGroupItem value={level.value} id={`new-${level.value}`} className="mt-1" />
                            <div className="flex-1">
                              <Label htmlFor={`new-${level.value}`} className="flex items-center gap-2 cursor-pointer">
                                {level.icon}
                                <span className="font-medium text-sm">{level.label}</span>
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                {level.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    <Button 
                      onClick={handleAddShare} 
                      disabled={isAddingShare || !verifiedCanonicalUserId}
                      className="w-full"
                    >
                      {isAddingShare ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Share2 className="w-4 h-4 mr-2" />
                      )}
                      Ajouter l'accès cross-account
                    </Button>
                  </CardContent>
                </Card>

                <Separator />

                {/* Liste des accès cross-account existants */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Accès Cross-Account existants
                    </CardTitle>
                    <CardDescription>
                      {crossAccountShares.length === 0 
                        ? 'Aucun accès cross-account configuré'
                        : `${crossAccountShares.length} compte${crossAccountShares.length > 1 ? 's' : ''} avec accès`
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingPolicy ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    ) : crossAccountShares.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Share2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">Aucun accès cross-account configuré pour ce bucket</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {crossAccountShares.map((share) => (
                          <div 
                            key={share.canonicalUserId}
                            className="p-3 bg-muted/50 rounded-lg space-y-3"
                          >
                            {editingShare?.canonicalUserId === share.canonicalUserId ? (
                              // Mode édition
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-medium truncate max-w-[200px]" title={share.canonicalUserId}>
                                    {share.canonicalUserId.substring(0, 20)}...
                                  </span>
                                  <Badge variant="outline" className="text-xs">En cours de modification</Badge>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label className="text-xs">Nouveau niveau d'accès</Label>
                                  <RadioGroup
                                    value={editAccessLevel}
                                    onValueChange={(value) => setEditAccessLevel(value as AccessLevel)}
                                    className="space-y-1"
                                  >
                                    {ACCESS_LEVELS.map((level) => (
                                      <div key={level.value} className="flex items-center space-x-2">
                                        <RadioGroupItem value={level.value} id={`edit-${share.canonicalUserId.substring(0, 12)}-${level.value}`} />
                                        <Label 
                                          htmlFor={`edit-${share.canonicalUserId.substring(0, 12)}-${level.value}`} 
                                          className="flex items-center gap-2 cursor-pointer text-sm"
                                        >
                                          {level.icon}
                                          <span>{level.label}</span>
                                        </Label>
                                      </div>
                                    ))}
                                  </RadioGroup>
                                </div>
                                
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={handleUpdateShare}
                                    disabled={isUpdatingShare || editAccessLevel === share.accessLevel}
                                    className="flex-1"
                                  >
                                    {isUpdatingShare ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <>
                                        <Save className="w-4 h-4 mr-1" />
                                        Enregistrer
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={cancelEditShare}
                                    disabled={isUpdatingShare}
                                  >
                                    Annuler
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              // Mode affichage
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-medium truncate max-w-[200px]" title={share.canonicalUserId}>
                                      {share.canonicalUserId.substring(0, 24)}...
                                    </span>
                                    {getAccessLevelBadge(share.accessLevel)}
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {share.actions.slice(0, 3).map((action) => (
                                      <span key={action} className="text-xs text-muted-foreground font-mono bg-background px-1.5 py-0.5 rounded">
                                        {action.replace('s3:', '')}
                                      </span>
                                    ))}
                                    {share.actions.length > 3 && (
                                      <span className="text-xs text-muted-foreground">
                                        +{share.actions.length - 3} autres
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2 self-start sm:self-auto">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => startEditShare(share)}
                                    disabled={revokingShareId === share.canonicalUserId || editingShare !== null}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  >
                                    <Pencil className="w-4 h-4 mr-1" />
                                    Modifier
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRevokeShare(share)}
                                    disabled={revokingShareId === share.canonicalUserId || editingShare !== null}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    {revokingShareId === share.canonicalUserId ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <>
                                        <UserMinus className="w-4 h-4 mr-1" />
                                        Révoquer
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Information */}
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>Note :</strong> Les partages sont gérés via la bucket policy. 
                    Toute modification dans l'onglet Policy peut affecter les partages configurés ici.
                  </AlertDescription>
                </Alert>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Permissions Preview Tab */}
          <TabsContent value="preview" className="flex-1 overflow-auto mt-4">
            <ScrollArea className="h-[calc(90vh-200px)] max-h-[500px] pr-2 sm:pr-4">
            <div className="space-y-4">
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-xs sm:text-sm">Permissions effectives</CardTitle>
                    <CardDescription className="text-xs">
                      Résumé des permissions calculées
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => { loadAcl(); loadPolicy(); }}
                    className="self-start sm:self-auto text-xs"
                  >
                    <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Actualiser
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                  <div className="space-y-2">
                    {effectivePermissions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Shield className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-20" />
                        <p className="text-xs sm:text-sm">Chargement des permissions...</p>
                      </div>
                    ) : (
                      effectivePermissions.map((perm, index) => (
                        <div 
                          key={index} 
                          className={`p-2 sm:p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${
                            perm.allowed 
                              ? 'bg-green-500/10 border-green-500/20' 
                              : 'bg-red-500/10 border-red-500/20'
                          }`}
                        >
                          <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                            {perm.allowed ? (
                              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0 mt-0.5 sm:mt-0" />
                            ) : (
                              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0 mt-0.5 sm:mt-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-medium break-all">{perm.action}</p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground break-all">{perm.details}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="self-start sm:self-auto text-[10px] sm:text-xs flex-shrink-0">{perm.source}</Badge>
                        </div>
                      ))
                    )}
                  </div>
              </CardContent>
            </Card>

            {/* Légende */}
            <Card>
              <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm">Comprendre les permissions</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] sm:text-xs">ACL</Badge>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Permissions héritées des Access Control Lists
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] sm:text-xs">Policy</Badge>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Permissions définies dans la bucket policy JSON
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] sm:text-xs">Default</Badge>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Permissions par défaut du propriétaire
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
