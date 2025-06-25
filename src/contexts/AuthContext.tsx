
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { S3Credentials } from '../types/s3';
import { jwtAuthService } from '../services/jwtAuthService';
import { CredentialsValidator } from '../services/credentialsValidator';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: {
    accessKey: string;
    region: string;
  } | null;
  login: (credentials: S3Credentials) => Promise<boolean>;
  logout: () => Promise<void>;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ accessKey: string; region: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initializeAuth = () => {
      const storedToken = jwtAuthService.getToken();
      
      if (storedToken && jwtAuthService.isTokenValid()) {
        setToken(storedToken);
        setIsAuthenticated(true);
        
        // Extraire les infos utilisateur du token
        try {
          const payload = JSON.parse(atob(storedToken.split('.')[1]));
          setUser({
            accessKey: payload.accessKey,
            region: payload.region
          });
        } catch (error) {
          console.error('Error parsing token:', error);
          handleLogout();
        }
      } else if (storedToken) {
        // Token expiré
        toast({
          title: "Session expirée",
          description: "Veuillez vous reconnecter",
          variant: "destructive"
        });
        handleLogout();
      }
      
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (credentials: S3Credentials): Promise<boolean> => {
    setIsLoading(true);

    try {
      // Valider les credentials avec validation plus souple
      const sanitizedCredentials = CredentialsValidator.sanitizeCredentials(credentials);
      const validation = CredentialsValidator.validateCredentials(sanitizedCredentials);

      if (!validation.isValid) {
        console.warn('Credentials validation failed:', validation.errors);
        toast({
          title: "Format des identifiants invalide",
          description: validation.errors.join(', '),
          variant: "destructive"
        });
        return false;
      }

      console.log('Attempting login with sanitized credentials...');
      const response = await jwtAuthService.login(sanitizedCredentials);

      if (response.success && response.data) {
        setToken(response.data.token);
        setIsAuthenticated(true);
        setUser(response.data.user);

        toast({
          title: "Connexion réussie",
          description: "Vous êtes maintenant connecté"
        });

        return true;
      } else {
        console.error('Login failed:', response);
        
        // Messages d'erreur plus détaillés
        let errorMessage = response.message || "Credentials invalides";
        if (response.error === 'Authentication failed') {
          errorMessage = "Vérifiez vos clés d'accès et votre région";
        } else if (response.error === 'Network error') {
          errorMessage = "Erreur de connexion au serveur";
        }
        
        toast({
          title: "Erreur de connexion",
          description: errorMessage,
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la connexion",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await jwtAuthService.logout();
    setToken(null);
    setIsAuthenticated(false);
    setUser(null);
  };

  const logout = async (): Promise<void> => {
    await handleLogout();
    toast({
      title: "Déconnexion",
      description: "Vous avez été déconnecté avec succès"
    });
  };

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    token,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
