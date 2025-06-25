
export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  canRetry: boolean;
  action?: string;
}

export class ErrorService {
  private static errorMap: Record<string, Partial<AppError>> = {
    // Erreurs d'authentification
    'INVALID_CREDENTIALS': {
      userMessage: 'Identifiants invalides. Vérifiez votre Access Key et Secret Key.',
      canRetry: false,
      action: 'Vérifiez vos identifiants dans votre console Outscale'
    },
    'TOKEN_EXPIRED': {
      userMessage: 'Session expirée. Veuillez vous reconnecter.',
      canRetry: false,
      action: 'Reconnectez-vous'
    },
    'UNAUTHORIZED': {
      userMessage: 'Accès non autorisé. Vérifiez vos permissions.',
      canRetry: false,
      action: 'Contactez votre administrateur'
    },

    // Erreurs de réseau
    'NETWORK_ERROR': {
      userMessage: 'Erreur de connexion. Vérifiez votre connexion internet.',
      canRetry: true,
      action: 'Vérifiez votre connexion et réessayez'
    },
    'TIMEOUT': {
      userMessage: 'Délai d\'attente dépassé. Le service met du temps à répondre.',
      canRetry: true,
      action: 'Réessayez dans quelques instants'
    },
    'SERVER_ERROR': {
      userMessage: 'Erreur serveur temporaire.',
      canRetry: true,
      action: 'Réessayez dans quelques instants'
    },

    // Erreurs S3
    'BUCKET_NOT_FOUND': {
      userMessage: 'Bucket introuvable. Il a peut-être été supprimé.',
      canRetry: false,
      action: 'Actualisez la liste des buckets'
    },
    'BUCKET_ALREADY_EXISTS': {
      userMessage: 'Un bucket avec ce nom existe déjà.',
      canRetry: false,
      action: 'Choisissez un autre nom'
    },
    'BUCKET_NOT_EMPTY': {
      userMessage: 'Le bucket contient encore des fichiers.',
      canRetry: false,
      action: 'Videz le bucket avant de le supprimer'
    },
    'OBJECT_NOT_FOUND': {
      userMessage: 'Fichier introuvable. Il a peut-être été supprimé.',
      canRetry: false,
      action: 'Actualisez la liste des fichiers'
    },
    'INSUFFICIENT_STORAGE': {
      userMessage: 'Espace de stockage insuffisant.',
      canRetry: false,
      action: 'Contactez votre administrateur'
    },

    // Erreurs de limite
    'RATE_LIMIT': {
      userMessage: 'Trop de requêtes simultanées. Ralentissez le rythme.',
      canRetry: true,
      action: 'Attendez quelques secondes et réessayez'
    },
    'QUOTA_EXCEEDED': {
      userMessage: 'Quota dépassé.',
      canRetry: false,
      action: 'Contactez votre administrateur'
    }
  };

  static parseError(error: any): AppError {
    let errorCode = 'UNKNOWN_ERROR';
    let originalMessage = 'Erreur inconnue';

    if (error?.response) {
      const status = error.response.status;
      originalMessage = error.response.data?.error || error.response.data?.message || `HTTP ${status}`;
      
      // Mapper les codes HTTP vers nos codes d'erreur
      switch (status) {
        case 401:
          errorCode = error.response.data?.code === 'TOKEN_EXPIRED' ? 'TOKEN_EXPIRED' : 'INVALID_CREDENTIALS';
          break;
        case 403:
          errorCode = 'UNAUTHORIZED';
          break;
        case 404:
          errorCode = originalMessage.includes('bucket') ? 'BUCKET_NOT_FOUND' : 'OBJECT_NOT_FOUND';
          break;
        case 408:
          errorCode = 'TIMEOUT';
          break;
        case 409:
          errorCode = 'BUCKET_ALREADY_EXISTS';
          break;
        case 429:
          errorCode = 'RATE_LIMIT';
          break;
        case 500:
        case 502:
        case 503:
          errorCode = 'SERVER_ERROR';
          break;
        default:
          errorCode = 'UNKNOWN_ERROR';
      }
    } else if (error?.code) {
      errorCode = error.code;
      originalMessage = error.message || 'Erreur réseau';
    } else if (error?.message) {
      originalMessage = error.message;
      if (error.message.includes('Network Error') || error.message.includes('fetch')) {
        errorCode = 'NETWORK_ERROR';
      }
    }

    const errorInfo = this.errorMap[errorCode] || {};
    
    return {
      code: errorCode,
      message: originalMessage,
      userMessage: errorInfo.userMessage || 'Une erreur inattendue s\'est produite',
      canRetry: errorInfo.canRetry || false,
      action: errorInfo.action
    };
  }

  static shouldRetry(error: AppError): boolean {
    return error.canRetry && !['INVALID_CREDENTIALS', 'TOKEN_EXPIRED', 'UNAUTHORIZED'].includes(error.code);
  }
}
