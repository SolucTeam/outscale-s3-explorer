export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  canRetry: boolean;
  action?: string;
}

export class ErrorService {
  private static errorMap: Record<string, Partial<AppError>> = {
    // ========================================
    // ERREURS D'AUTHENTIFICATION
    // ========================================
    'INVALID_CREDENTIALS': {
      userMessage: 'Identifiants invalides. Vérifiez votre Access Key et Secret Key.',
      canRetry: false,
      action: 'Vérifiez vos identifiants dans votre console Outscale'
    },
    'InvalidAccessKeyId': {
      userMessage: 'Access Key invalide ou inexistante.',
      canRetry: false,
      action: 'Vérifiez votre Access Key dans la console Outscale'
    },
    'SignatureDoesNotMatch': {
      userMessage: 'Secret Key incorrecte. La signature ne correspond pas.',
      canRetry: false,
      action: 'Vérifiez votre Secret Key dans la console Outscale'
    },
    'TOKEN_EXPIRED': {
      userMessage: 'Session expirée. Veuillez vous reconnecter.',
      canRetry: false,
      action: 'Reconnectez-vous avec vos identifiants'
    },
    'ExpiredToken': {
      userMessage: 'Token de session expiré.',
      canRetry: false,
      action: 'Reconnectez-vous'
    },
    'UNAUTHORIZED': {
      userMessage: 'Accès non autorisé. Vérifiez vos permissions.',
      canRetry: false,
      action: 'Contactez votre administrateur pour obtenir les droits nécessaires'
    },
    'AccessDenied': {
      userMessage: 'Accès refusé. Vous n\'avez pas les permissions nécessaires.',
      canRetry: false,
      action: 'Vérifiez vos droits IAM/EIM dans la console'
    },
    'InvalidSecurity': {
      userMessage: 'Credentials de sécurité invalides.',
      canRetry: false,
      action: 'Vérifiez vos identifiants de sécurité'
    },
    'InvalidToken': {
      userMessage: 'Token invalide ou malformé.',
      canRetry: false,
      action: 'Reconnectez-vous pour obtenir un nouveau token'
    },

    // ========================================
    // ERREURS RÉSEAU
    // ========================================
    'NETWORK_ERROR': {
      userMessage: 'Erreur de connexion. Vérifiez votre connexion internet.',
      canRetry: true,
      action: 'Vérifiez votre connexion internet et réessayez'
    },
    'TIMEOUT': {
      userMessage: 'Délai d\'attente dépassé. Le service met du temps à répondre.',
      canRetry: true,
      action: 'Réessayez dans quelques instants'
    },
    'RequestTimeout': {
      userMessage: 'La requête a pris trop de temps.',
      canRetry: true,
      action: 'Réessayez avec une requête plus petite ou attendez quelques instants'
    },
    'SERVER_ERROR': {
      userMessage: 'Erreur serveur temporaire.',
      canRetry: true,
      action: 'Réessayez dans quelques instants'
    },
    'ServiceUnavailable': {
      userMessage: 'Service temporairement indisponible.',
      canRetry: true,
      action: 'Le service est en maintenance, réessayez dans quelques minutes'
    },
    'SlowDown': {
      userMessage: 'Trop de requêtes. Ralentissez.',
      canRetry: true,
      action: 'Attendez quelques secondes avant de réessayer'
    },
    'InternalError': {
      userMessage: 'Erreur interne du serveur.',
      canRetry: true,
      action: 'Réessayez dans quelques instants'
    },
    'BadGateway': {
      userMessage: 'Erreur de passerelle.',
      canRetry: true,
      action: 'Problème de connectivité côté serveur, réessayez'
    },

    // ========================================
    // ERREURS BUCKET
    // ========================================
    'BUCKET_NOT_FOUND': {
      userMessage: 'Bucket introuvable. Il a peut-être été supprimé.',
      canRetry: false,
      action: 'Actualisez la liste des buckets'
    },
    'NoSuchBucket': {
      userMessage: 'Le bucket n\'existe pas.',
      canRetry: false,
      action: 'Vérifiez le nom du bucket et actualisez la liste'
    },
    'BUCKET_ALREADY_EXISTS': {
      userMessage: 'Un bucket avec ce nom existe déjà.',
      canRetry: false,
      action: 'Choisissez un autre nom de bucket'
    },
    'BucketAlreadyExists': {
      userMessage: 'Le nom de bucket est déjà utilisé.',
      canRetry: false,
      action: 'Les noms de bucket sont uniques globalement, choisissez-en un autre'
    },
    'BucketAlreadyOwnedByYou': {
      userMessage: 'Vous possédez déjà un bucket avec ce nom.',
      canRetry: false,
      action: 'Utilisez le bucket existant ou choisissez un autre nom'
    },
    'BUCKET_NOT_EMPTY': {
      userMessage: 'Le bucket contient encore des fichiers.',
      canRetry: false,
      action: 'Videz le bucket avant de le supprimer ou utilisez l\'option de suppression forcée'
    },
    'BucketNotEmpty': {
      userMessage: 'Impossible de supprimer un bucket non vide.',
      canRetry: false,
      action: 'Supprimez tous les objets et versions d\'abord'
    },
    'InvalidBucketName': {
      userMessage: 'Nom de bucket invalide.',
      canRetry: false,
      action: 'Les noms doivent contenir uniquement des lettres minuscules, chiffres et tirets'
    },
    'TooManyBuckets': {
      userMessage: 'Limite de buckets atteinte.',
      canRetry: false,
      action: 'Supprimez des buckets inutilisés ou contactez le support'
    },

    // ========================================
    // ERREURS OBJET
    // ========================================
    'OBJECT_NOT_FOUND': {
      userMessage: 'Fichier introuvable. Il a peut-être été supprimé.',
      canRetry: false,
      action: 'Actualisez la liste des fichiers'
    },
    'NoSuchKey': {
      userMessage: 'L\'objet n\'existe pas.',
      canRetry: false,
      action: 'Vérifiez le chemin et le nom du fichier'
    },
    'NO_SUCH_KEY': {
      userMessage: 'Clé inexistante.',
      canRetry: false,
      action: 'Vérifiez que le fichier existe toujours'
    },
    'KeyTooLongError': {
      userMessage: 'Le nom du fichier est trop long.',
      canRetry: false,
      action: 'Réduisez la longueur du nom de fichier (max 1024 caractères)'
    },
    'EntityTooLarge': {
      userMessage: 'Le fichier est trop volumineux.',
      canRetry: false,
      action: 'Utilisez le multipart upload pour les fichiers > 5GB'
    },
    'EntityTooSmall': {
      userMessage: 'Le fichier est trop petit pour cette opération.',
      canRetry: false,
      action: 'Vérifiez les exigences de taille minimale'
    },
    'InvalidObjectState': {
      userMessage: 'L\'objet est dans un état invalide.',
      canRetry: false,
      action: 'L\'objet doit être restauré depuis Glacier avant accès'
    },
    'ObjectLockConfigurationNotFoundError': {
      userMessage: 'Configuration Object Lock non trouvée.',
      canRetry: false,
      action: 'Activez Object Lock sur le bucket d\'abord'
    },
    'ObjectNotInActiveTierError': {
      userMessage: 'L\'objet n\'est pas dans un tier actif.',
      canRetry: false,
      action: 'Restaurez l\'objet depuis l\'archivage avant d\'y accéder'
    },

    // ========================================
    // ERREURS UPLOAD/DOWNLOAD
    // ========================================
    'IncompleteBody': {
      userMessage: 'L\'upload n\'a pas été complété.',
      canRetry: true,
      action: 'Réessayez l\'upload du fichier'
    },
    'InvalidPart': {
      userMessage: 'Une partie du fichier est invalide.',
      canRetry: true,
      action: 'Recommencez l\'upload multipart'
    },
    'InvalidPartOrder': {
      userMessage: 'Les parties du fichier ne sont pas dans le bon ordre.',
      canRetry: true,
      action: 'Recommencez l\'upload multipart'
    },
    'NoSuchUpload': {
      userMessage: 'L\'upload multipart n\'existe pas.',
      canRetry: false,
      action: 'Initialisez un nouvel upload multipart'
    },
    'MalformedXML': {
      userMessage: 'La requête est mal formatée.',
      canRetry: false,
      action: 'Erreur de format, contactez le support si le problème persiste'
    },
    'RequestedRangeNotSatisfiable': {
      userMessage: 'La plage demandée n\'est pas valide.',
      canRetry: false,
      action: 'Vérifiez les paramètres de range de votre requête'
    },

    // ========================================
    // ERREURS VERSIONING
    // ========================================
    'NoSuchVersion': {
      userMessage: 'Version inexistante.',
      canRetry: false,
      action: 'Vérifiez l\'ID de version'
    },
    'InvalidVersionId': {
      userMessage: 'ID de version invalide.',
      canRetry: false,
      action: 'Vérifiez le format de l\'ID de version'
    },

    // ========================================
    // ERREURS PERMISSIONS
    // ========================================
    'ACCESS_DENIED': {
      userMessage: 'Accès refusé. Vérifiez vos permissions.',
      canRetry: false,
      action: 'Vérifiez vos droits d\'accès IAM/EIM'
    },
    'AllAccessDisabled': {
      userMessage: 'Tous les accès sont désactivés.',
      canRetry: false,
      action: 'Contactez votre administrateur pour activer les accès'
    },
    'AccountProblem': {
      userMessage: 'Problème avec votre compte.',
      canRetry: false,
      action: 'Contactez le support Outscale'
    },
    'CrossLocationLoggingProhibited': {
      userMessage: 'Logging inter-régions non autorisé.',
      canRetry: false,
      action: 'Utilisez un bucket dans la même région'
    },

    // ========================================
    // ERREURS RATE LIMITING
    // ========================================
    'RATE_LIMIT': {
      userMessage: 'Trop de requêtes simultanées. Ralentissez le rythme.',
      canRetry: true,
      action: 'Attendez quelques secondes et réessayez'
    },
    'RequestLimitExceeded': {
      userMessage: 'Limite de requêtes dépassée.',
      canRetry: true,
      action: 'Attendez avant de faire une nouvelle requête'
    },
    'QUOTA_EXCEEDED': {
      userMessage: 'Quota dépassé.',
      canRetry: false,
      action: 'Contactez votre administrateur pour augmenter le quota'
    },
    'INSUFFICIENT_STORAGE': {
      userMessage: 'Espace de stockage insuffisant.',
      canRetry: false,
      action: 'Libérez de l\'espace ou contactez votre administrateur'
    },

    // ========================================
    // ERREURS VALIDATION
    // ========================================
    'INVALID_REQUEST': {
      userMessage: 'Requête invalide.',
      canRetry: false,
      action: 'Vérifiez les paramètres de votre requête'
    },
    'InvalidArgument': {
      userMessage: 'Argument invalide dans la requête.',
      canRetry: false,
      action: 'Vérifiez les paramètres fournis'
    },
    'InvalidRequest': {
      userMessage: 'La requête est invalide.',
      canRetry: false,
      action: 'Vérifiez la syntaxe de votre requête'
    },
    'InvalidURI': {
      userMessage: 'L\'URI est invalide.',
      canRetry: false,
      action: 'Vérifiez le format de l\'URL'
    },
    'InvalidDigest': {
      userMessage: 'Le digest MD5 ne correspond pas.',
      canRetry: true,
      action: 'Le fichier a peut-être été corrompu, réessayez l\'upload'
    },
    'BadDigest': {
      userMessage: 'Le hash du contenu ne correspond pas.',
      canRetry: true,
      action: 'Réessayez l\'upload, le fichier peut être corrompu'
    },
    'InvalidTag': {
      userMessage: 'Tag invalide.',
      canRetry: false,
      action: 'Vérifiez le format des tags (clé et valeur)'
    },
    'MalformedACLError': {
      userMessage: 'ACL mal formatée.',
      canRetry: false,
      action: 'Vérifiez la syntaxe de vos ACL'
    },
    'MalformedPOSTRequest': {
      userMessage: 'Requête POST mal formatée.',
      canRetry: false,
      action: 'Vérifiez le format de votre requête POST'
    },
    'MalformedPolicy': {
      userMessage: 'Policy mal formatée.',
      canRetry: false,
      action: 'Vérifiez la syntaxe JSON de votre policy'
    },

    // ========================================
    // ERREURS CONDITIONNELLES
    // ========================================
    'PRECONDITION_FAILED': {
      userMessage: 'Précondition échouée.',
      canRetry: false,
      action: 'Vérifiez les conditions de votre requête (If-Match, If-None-Match)'
    },
    'PreconditionFailed': {
      userMessage: 'Au moins une précondition n\'est pas satisfaite.',
      canRetry: false,
      action: 'Vérifiez les headers conditionnels de votre requête'
    },
    'NotModified': {
      userMessage: 'Le contenu n\'a pas été modifié.',
      canRetry: false,
      action: 'L\'objet n\'a pas changé depuis votre dernière requête'
    },

    // ========================================
    // ERREURS LIFECYCLE
    // ========================================
    'NoSuchLifecycleConfiguration': {
      userMessage: 'Aucune configuration lifecycle trouvée.',
      canRetry: false,
      action: 'Créez une configuration lifecycle d\'abord'
    },
    'InvalidLifecycleConfiguration': {
      userMessage: 'Configuration lifecycle invalide.',
      canRetry: false,
      action: 'Vérifiez la syntaxe de votre configuration lifecycle'
    },

    // ========================================
    // ERREURS REPLICATION
    // ========================================
    'NoSuchReplicationConfiguration': {
      userMessage: 'Configuration de réplication introuvable.',
      canRetry: false,
      action: 'Configurez la réplication d\'abord'
    },
    'InvalidReplicationConfiguration': {
      userMessage: 'Configuration de réplication invalide.',
      canRetry: false,
      action: 'Vérifiez votre configuration de réplication'
    },

    // ========================================
    // ERREURS ENCRYPTION
    // ========================================
    'NoSuchEncryptionConfiguration': {
      userMessage: 'Aucune configuration de chiffrement.',
      canRetry: false,
      action: 'Configurez le chiffrement du bucket d\'abord'
    },
    'KMSDisabled': {
      userMessage: 'Le service KMS est désactivé.',
      canRetry: false,
      action: 'Activez le service KMS dans votre compte'
    },
    'KMSInvalidKeyUsage': {
      userMessage: 'Utilisation incorrecte de la clé KMS.',
      canRetry: false,
      action: 'Vérifiez la configuration de votre clé KMS'
    },

    // ========================================
    // ERREURS CORS
    // ========================================
    'NoSuchCORSConfiguration': {
      userMessage: 'Aucune configuration CORS.',
      canRetry: false,
      action: 'Configurez CORS sur le bucket d\'abord'
    },
    'CORSForbidden': {
      userMessage: 'Requête CORS interdite.',
      canRetry: false,
      action: 'Vérifiez la configuration CORS du bucket'
    },

    // ========================================
    // ERREURS WEBSITE
    // ========================================
    'NoSuchWebsiteConfiguration': {
      userMessage: 'Configuration website non trouvée.',
      canRetry: false,
      action: 'Configurez l\'hébergement web d\'abord'
    },

    // ========================================
    // ERREURS LOGGING
    // ========================================
    'NoSuchLoggingConfiguration': {
      userMessage: 'Configuration de logging non trouvée.',
      canRetry: false,
      action: 'Activez le logging d\'abord'
    },
    'InvalidTargetBucketForLogging': {
      userMessage: 'Bucket cible invalide pour le logging.',
      canRetry: false,
      action: 'Vérifiez que le bucket cible existe et a les bonnes permissions'
    },

    // ========================================
    // ERREURS NOTIFICATION
    // ========================================
    'NoSuchNotificationConfiguration': {
      userMessage: 'Configuration de notification non trouvée.',
      canRetry: false,
      action: 'Configurez les notifications d\'abord'
    },
    'InvalidNotificationDestination': {
      userMessage: 'Destination de notification invalide.',
      canRetry: false,
      action: 'Vérifiez l\'ARN de destination'
    },

    // ========================================
    // ERREURS TAGGING
    // ========================================
    'NoSuchTagSet': {
      userMessage: 'Aucun ensemble de tags trouvé.',
      canRetry: false,
      action: 'L\'objet n\'a pas de tags'
    },
    'InvalidTagKey': {
      userMessage: 'Clé de tag invalide.',
      canRetry: false,
      action: 'Les clés de tag doivent respecter le format spécifié'
    },
    'InvalidTagValue': {
      userMessage: 'Valeur de tag invalide.',
      canRetry: false,
      action: 'Les valeurs de tag doivent respecter le format spécifié'
    },

    // ========================================
    // ERREURS REGION
    // ========================================
    'IllegalLocationConstraintException': {
      userMessage: 'Contrainte de région invalide.',
      canRetry: false,
      action: 'Vérifiez que la région est valide'
    },
    'InvalidLocationConstraint': {
      userMessage: 'La région spécifiée n\'est pas valide.',
      canRetry: false,
      action: 'Utilisez une région Outscale valide'
    },

    // ========================================
    // ERREURS METADATA
    // ========================================
    'MetadataTooLarge': {
      userMessage: 'Les métadonnées sont trop volumineuses.',
      canRetry: false,
      action: 'Réduisez la taille des métadonnées (max 2KB)'
    },
    'TooManyMetadata': {
      userMessage: 'Trop de métadonnées.',
      canRetry: false,
      action: 'Réduisez le nombre de métadonnées'
    },

    // ========================================
    // ERREURS OUTSCALE SPÉCIFIQUES
    // ========================================
    'OutscaleServiceError': {
      userMessage: 'Erreur du service Outscale.',
      canRetry: true,
      action: 'Réessayez ou contactez le support Outscale'
    },
    'OutscaleMaintenanceMode': {
      userMessage: 'Service en maintenance.',
      canRetry: true,
      action: 'Attendez la fin de la maintenance et réessayez'
    },

    // ========================================
    // ERREURS GÉNÉRALES
    // ========================================
    'UNKNOWN_ERROR': {
      userMessage: 'Une erreur inattendue s\'est produite.',
      canRetry: true,
      action: 'Réessayez ou contactez le support si le problème persiste'
    },
    'MethodNotAllowed': {
      userMessage: 'Méthode HTTP non autorisée.',
      canRetry: false,
      action: 'Vérifiez la méthode HTTP utilisée'
    },
    'NotImplemented': {
      userMessage: 'Fonctionnalité non implémentée.',
      canRetry: false,
      action: 'Cette fonctionnalité n\'est pas disponible'
    },
    'Redirect': {
      userMessage: 'Redirection nécessaire.',
      canRetry: false,
      action: 'Suivez la redirection fournie'
    },
    'RestoreAlreadyInProgress': {
      userMessage: 'Une restauration est déjà en cours.',
      canRetry: false,
      action: 'Attendez la fin de la restauration en cours'
    },
    'XAmzContentSHA256Mismatch': {
      userMessage: 'Le hash SHA256 ne correspond pas.',
      canRetry: true,
      action: 'Réessayez l\'upload'
    },
    'MissingSecurityHeader': {
      userMessage: 'En-tête de sécurité manquant.',
      canRetry: false,
      action: 'Vérifiez que tous les headers requis sont présents'
    },
    'RequestTimeTooSkewed': {
      userMessage: 'L\'horloge du client est décalée.',
      canRetry: false,
      action: 'Synchronisez l\'horloge de votre système'
    },
    'SignatureVersionNotSupported': {
      userMessage: 'Version de signature non supportée.',
      canRetry: false,
      action: 'Utilisez la version de signature AWS4'
    },
    'TokenRefreshRequired': {
      userMessage: 'Le token doit être rafraîchi.',
      canRetry: false,
      action: 'Reconnectez-vous pour obtenir un nouveau token'
    },
    'UserKeyMustBeSpecified': {
      userMessage: 'La clé utilisateur doit être spécifiée.',
      canRetry: false,
      action: 'Fournissez une Access Key valide'
    }
  };

  static parseError(error: unknown): AppError {
    let errorCode = 'UNKNOWN_ERROR';
    let originalMessage = 'Erreur inconnue';

    // Typage pour les erreurs avec response
    interface ErrorWithResponse {
      response?: {
        status: number;
        data?: {
          error?: string;
          message?: string;
          code?: string;
          Code?: string;
        };
      };
      code?: string;
      message?: string;
      name?: string;
    }

    const typedError = error as ErrorWithResponse;

    if (typedError?.response) {
      const status = typedError.response.status;
      const errorData = typedError.response.data;
      originalMessage = errorData?.error || errorData?.message || `HTTP ${status}`;
      
      // Utiliser le code d'erreur S3/AWS si disponible
      if (errorData?.Code || errorData?.code) {
        errorCode = errorData.Code || errorData.code || 'UNKNOWN_ERROR';
      } else {
        // Mapper les codes HTTP vers nos codes d'erreur
        switch (status) {
          case 400:
            errorCode = 'INVALID_REQUEST';
            break;
          case 401:
            errorCode = errorData?.code === 'TOKEN_EXPIRED' ? 'TOKEN_EXPIRED' : 'INVALID_CREDENTIALS';
            break;
          case 403:
            errorCode = 'ACCESS_DENIED';
            break;
          case 404:
            errorCode = originalMessage.toLowerCase().includes('bucket') ? 'BUCKET_NOT_FOUND' : 'OBJECT_NOT_FOUND';
            break;
          case 408:
            errorCode = 'TIMEOUT';
            break;
          case 409:
            errorCode = 'BUCKET_ALREADY_EXISTS';
            break;
          case 412:
            errorCode = 'PRECONDITION_FAILED';
            break;
          case 429:
            errorCode = 'RATE_LIMIT';
            break;
          case 500:
            errorCode = 'InternalError';
            break;
          case 502:
            errorCode = 'BadGateway';
            break;
          case 503:
            errorCode = 'ServiceUnavailable';
            break;
          case 504:
            errorCode = 'RequestTimeout';
            break;
          default:
            errorCode = 'UNKNOWN_ERROR';
        }
      }
    } else if (typedError?.code || typedError?.name) {
      errorCode = typedError.code || typedError.name || 'UNKNOWN_ERROR';
      originalMessage = typedError.message || 'Erreur réseau';
    } else if (typedError?.message) {
      originalMessage = typedError.message;
      if (originalMessage.includes('Network Error') || originalMessage.includes('fetch') || originalMessage.includes('Failed to fetch')) {
        errorCode = 'NETWORK_ERROR';
      } else if (originalMessage.includes('timeout')) {
        errorCode = 'TIMEOUT';
      }
    }

    const errorInfo = this.errorMap[errorCode] || {};
    
    return {
      code: errorCode,
      message: originalMessage,
      userMessage: errorInfo.userMessage || 'Une erreur inattendue s\'est produite',
      canRetry: errorInfo.canRetry !== undefined ? errorInfo.canRetry : false,
      action: errorInfo.action
    };
  }

  static shouldRetry(error: AppError): boolean {
    const nonRetryableCodes = [
      'INVALID_CREDENTIALS',
      'TOKEN_EXPIRED',
      'UNAUTHORIZED',
      'ACCESS_DENIED',
      'InvalidAccessKeyId',
      'SignatureDoesNotMatch',
      'ExpiredToken',
      'AccessDenied',
      'AccountProblem'
    ];
    
    return error.canRetry && !nonRetryableCodes.includes(error.code);
  }

  /**
   * Obtenir un message d'erreur formaté pour l'utilisateur
   */
  static getUserMessage(error: AppError): string {
    let message = error.userMessage;
    
    if (error.action) {
      message += `\n\n💡 ${error.action}`;
    }
    
    if (error.canRetry) {
      message += '\n\n🔄 Vous pouvez réessayer cette opération.';
    }
    
    return message;
  }

  /**
   * Vérifier si une erreur est liée aux permissions
   */
  static isPermissionError(error: AppError): boolean {
    const permissionCodes = [
      'ACCESS_DENIED',
      'AccessDenied',
      'UNAUTHORIZED',
      'AllAccessDisabled',
      'AccountProblem'
    ];
    return permissionCodes.includes(error.code);
  }

  /**
   * Vérifier si une erreur est liée à l'authentification
   */
  static isAuthError(error: AppError): boolean {
    const authCodes = [
      'INVALID_CREDENTIALS',
      'InvalidAccessKeyId',
      'SignatureDoesNotMatch',
      'TOKEN_EXPIRED',
      'ExpiredToken',
      'InvalidToken',
      'InvalidSecurity'
    ];
    return authCodes.includes(error.code);
  }

  /**
   * Vérifier si une erreur est liée au réseau
   */
  static isNetworkError(error: AppError): boolean {
    const networkCodes = [
      'NETWORK_ERROR',
      'TIMEOUT',
      'RequestTimeout',
      'BadGateway'
    ];
    return networkCodes.includes(error.code);
  }

  /**
   * Obtenir une recommandation pour gérer l'erreur
   */
  static getRecommendation(error: AppError): string {
    if (this.isAuthError(error)) {
      return 'Vérifiez vos identifiants S3 dans la console Outscale.';
    }
    
    if (this.isPermissionError(error)) {
      return 'Contactez votre administrateur pour obtenir les permissions nécessaires.';
    }
    
    if (this.isNetworkError(error)) {
      return 'Vérifiez votre connexion internet et réessayez.';
    }
    
    if (error.canRetry) {
      return 'Attendez quelques instants et réessayez l\'opération.';
    }
    
    return error.action || 'Consultez la documentation ou contactez le support.';
  }
}