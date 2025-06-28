
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { S3Credentials, S3Bucket, S3Object } from '../types/s3';
import { AuthService } from '../services/authService';

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

export const useS3Store = create<S3Store>()(
  persist(
    (set, get) => {
      // Écouter les événements d'expiration de token
      if (typeof window !== 'undefined') {
        window.addEventListener('auth:expired', () => {
          const state = get();
          if (state.isAuthenticated) {
            console.log('Auth expired event received, logging out');
            state.logout();
          }
        });
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
        
        login: (credentials) => set({ 
          isAuthenticated: true, 
          credentials,
          error: null 
        }),
        
        logout: () => {
          // Nettoyer complètement l'état
          AuthService.getInstance().clearAllCredentials();
          set({ 
            isAuthenticated: false, 
            credentials: null,
            currentBucket: null,
            currentPath: '',
            buckets: [],
            objects: [],
            error: null
          });
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
          const authService = AuthService.getInstance();
          const isValid = authService.isSessionValid('localStorage');
          
          if (!isValid && get().isAuthenticated) {
            console.log('Session invalid, logging out');
            get().logout();
          }
          
          return isValid;
        }
      };
    },
    {
      name: 's3-storage',
      partialize: (state) => ({ 
        isAuthenticated: state.isAuthenticated,
        credentials: state.credentials 
      })
    }
  )
);
