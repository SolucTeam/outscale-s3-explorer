
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { S3Credentials, S3Bucket, S3Object } from '../types/s3';

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
  initializeFromUrl: () => void;
}

export const useS3Store = create<S3Store>()(
  persist(
    (set, get) => ({
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
      
      logout: () => set({ 
        isAuthenticated: false, 
        credentials: null,
        currentBucket: null,
        currentPath: '',
        buckets: [],
        objects: [],
        error: null
      }),

      setCredentials: (credentials) => set({ 
        credentials,
        isAuthenticated: !!credentials 
      }),
      
      setCurrentBucket: (bucket) => {
        set({ 
          currentBucket: bucket, 
          currentPath: '' 
        });
        
        // Update URL
        const url = new URL(window.location.href);
        if (bucket) {
          url.searchParams.set('bucket', bucket);
          url.searchParams.delete('path');
        } else {
          url.searchParams.delete('bucket');
          url.searchParams.delete('path');
        }
        window.history.pushState({}, '', url.toString());
      },
      
      setCurrentPath: (path) => {
        set({ currentPath: path });
        
        // Update URL
        const url = new URL(window.location.href);
        const { currentBucket } = get();
        if (currentBucket) {
          url.searchParams.set('bucket', currentBucket);
          if (path) {
            url.searchParams.set('path', path);
          } else {
            url.searchParams.delete('path');
          }
          window.history.pushState({}, '', url.toString());
        }
      },
      
      setBuckets: (buckets) => set({ buckets }),
      
      setObjects: (objects) => set({ objects }),
      
      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      initializeFromUrl: () => {
        const url = new URL(window.location.href);
        const bucket = url.searchParams.get('bucket');
        const path = url.searchParams.get('path') || '';
        
        if (bucket) {
          set({ 
            currentBucket: bucket,
            currentPath: path
          });
        }
      }
    }),
    {
      name: 's3-storage',
      partialize: (state) => ({ 
        isAuthenticated: state.isAuthenticated,
        credentials: state.credentials 
      })
    }
  )
);
