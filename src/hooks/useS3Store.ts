
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
  
  // Vérifier session au démarrage de manière SYNCHRONE
  const getInitialState = () => {
    if (EncryptionService.hasActiveSession() && EncryptionService.isSessionValid()) {
      const sessionData = EncryptionService.loadFromSession();
      if (sessionData?.credentials) {
        console.log('🔐 Session valide trouvée, restauration automatique');
        return {
          isAuthenticated: true,
          credentials: sessionData.credentials,
          buckets: sessionData.buckets || [],
          currentBucket: sessionData.currentBucket || null,
          currentPath: sessionData.currentPath || ''
        };
      }
    }
    return {
      isAuthenticated: false,
      credentials: null,
      buckets: [],
      currentBucket: null,
      currentPath: ''
    };
  };

  const initialState = getInitialState();

  // Auto-refresh session toutes les 5 minutes
  if (typeof window !== 'undefined') {
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
        isAuthenticated: initialState.isAuthenticated,
        credentials: initialState.credentials,
        currentBucket: initialState.currentBucket,
        currentPath: initialState.currentPath,
        buckets: initialState.buckets,
        objects: [],
        loading: false,
        error: null,
        
        login: (credentials) => {
          console.log('🔐 Connexion sécurisée, chiffrement des credentials');
          
          const state = get();
          // Sauvegarder en session chiffrée avec les buckets
          EncryptionService.saveToSession({
            credentials,
            buckets: state.buckets,
            currentBucket: state.currentBucket,
            currentPath: state.currentPath,
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
        
        setBuckets: (buckets) => {
          set({ buckets });
          // Persister les buckets dans la session
          const state = get();
          if (state.credentials) {
            EncryptionService.saveToSession({
              credentials: state.credentials,
              buckets,
              currentBucket: state.currentBucket,
              currentPath: state.currentPath,
              timestamp: Date.now()
            });
          }
        },
        
        setObjects: (objects) => set({ objects }),
        
        setLoading: (loading) => set({ loading }),
        
        setError: (error) => set({ error }),
        
        navigateToBucket: (bucketName: string) => {
          set({ currentBucket: bucketName, currentPath: '' });
          window.history.pushState({}, '', `/bucket/${encodeURIComponent(bucketName)}`);
          
          // Persister la navigation
          const state = get();
          if (state.credentials) {
            EncryptionService.saveToSession({
              credentials: state.credentials,
              buckets: state.buckets,
              currentBucket: bucketName,
              currentPath: '',
              timestamp: Date.now()
            });
          }
        },
        
        navigateToFolder: (bucketName: string, folderPath: string) => {
          set({ currentBucket: bucketName, currentPath: folderPath });
          window.history.pushState({}, '', `/bucket/${encodeURIComponent(bucketName)}/folder/${encodeURIComponent(folderPath)}`);
          
          // Persister la navigation
          const state = get();
          if (state.credentials) {
            EncryptionService.saveToSession({
              credentials: state.credentials,
              buckets: state.buckets,
              currentBucket: bucketName,
              currentPath: folderPath,
              timestamp: Date.now()
            });
          }
        },
        
        navigateToDashboard: () => {
          set({ currentBucket: null, currentPath: '' });
          window.history.pushState({}, '', '/dashboard');
          
          // Persister la navigation
          const state = get();
          if (state.credentials) {
            EncryptionService.saveToSession({
              credentials: state.credentials,
              buckets: state.buckets,
              currentBucket: null,
              currentPath: '',
              timestamp: Date.now()
            });
          }
        },

        checkSessionValidity: () => {
          return EncryptionService.hasActiveSession() && EncryptionService.isSessionValid();
        }
      };
    });
