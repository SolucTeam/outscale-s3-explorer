
import { create } from 'zustand';
import { S3Credentials, S3Bucket, S3Object } from '../types/s3';
import { EncryptionService } from '../services/encryptionService';
import { cacheService, CacheService } from '../services/cacheService';

interface S3Store {
  isAuthenticated: boolean;
  credentials: S3Credentials | null;
  currentBucket: string | null;
  currentPath: string;
  buckets: S3Bucket[];
  objects: S3Object[];
  loading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: S3Credentials) => void;
  logout: () => void;
  setCredentials: (credentials: S3Credentials | null) => void;
  setCurrentBucket: (bucket: string | null) => void;
  setCurrentPath: (path: string) => void;
  setBuckets: (buckets: S3Bucket[]) => void;
  setObjects: (objects: S3Object[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  navigateToBucket: (bucketName: string) => void;
  navigateToFolder: (bucketName: string, folderPath: string) => void;
  navigateToDashboard: () => void;
  checkSessionValidity: () => boolean;
}

export const useS3Store = create<S3Store>()((set, get) => {
  // Initialiser le cache auto-cleanup
  cacheService.startAutoCleanup();
  
  // Vérifier session au démarrage
  const initializeFromSession = () => {
    if (EncryptionService.hasActiveSession() && EncryptionService.isSessionValid()) {
      const sessionData = EncryptionService.loadFromSession();
      if (sessionData?.credentials) {
        console.log('🔐 Session valide trouvée, restauration automatique');
        set({
          isAuthenticated: true,
          credentials: sessionData.credentials
        });
      }
    }
  };

  // Auto-refresh session toutes les 5 minutes
  if (typeof window !== 'undefined') {
    initializeFromSession();
    
    setInterval(() => {
      if (EncryptionService.hasActiveSession()) {
        if (EncryptionService.isSessionValid()) {
          EncryptionService.refreshSession();
        } else {
          console.log('🕒 Session expirée, déconnexion automatique');
          get().logout();
        }
      }
    }, 5 * 60 * 1000); // Vérification toutes les 5 minutes
  }

  return {
        isAuthenticated: false,
        credentials: null,
        currentBucket: null,
        currentPath: '',
        buckets: [],
        objects: [],
        loading: false,
        error: null,
        
        login: (credentials) => {
          console.log('🔐 Connexion sécurisée, chiffrement des credentials');
          
          // Sauvegarder en session chiffrée
          EncryptionService.saveToSession({
            credentials,
            timestamp: Date.now()
          });
          
          set({ 
            isAuthenticated: true, 
            credentials,
            error: null 
          });
        },
        
        logout: () => {
          console.log('🚪 Déconnexion et nettoyage sécurisé');
          
          // Nettoyer session chiffrée
          EncryptionService.clearSession();
          
          // Vider le cache
          cacheService.clear();
          
          set({ 
            isAuthenticated: false, 
            credentials: null,
            currentBucket: null,
            currentPath: '',
            buckets: [],
            objects: [],
            error: null
          });
          
          // Redirection
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        },

        setCredentials: (credentials) => set({ 
          credentials,
          isAuthenticated: !!credentials 
        }),
        
        setCurrentBucket: (bucket) => set({ 
          currentBucket: bucket, 
          currentPath: bucket ? '' : ''
        }),
        
        setCurrentPath: (path) => set({ currentPath: path }),
        
        setBuckets: (buckets) => set({ buckets }),
        
        setObjects: (objects) => set({ objects }),
        
        setLoading: (loading) => set({ loading }),
        
        setError: (error) => set({ error }),
        
        navigateToBucket: (bucketName: string) => {
          set({ currentBucket: bucketName, currentPath: '' });
          window.history.pushState({}, '', `/bucket/${encodeURIComponent(bucketName)}`);
        },
        
        navigateToFolder: (bucketName: string, folderPath: string) => {
          set({ currentBucket: bucketName, currentPath: folderPath });
          window.history.pushState({}, '', `/bucket/${encodeURIComponent(bucketName)}/folder/${encodeURIComponent(folderPath)}`);
        },
        
        navigateToDashboard: () => {
          set({ currentBucket: null, currentPath: '' });
          window.history.pushState({}, '', '/dashboard');
        },

        checkSessionValidity: () => {
          return EncryptionService.hasActiveSession() && EncryptionService.isSessionValid();
        }
      };
    });
