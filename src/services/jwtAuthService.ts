import { S3Credentials } from '../types/s3';
import { ErrorService } from './errorService';

export interface LoginResponse {
  success: boolean;
  data?: {
    token: string;
    user: {
      accessKey: string;
      region: string;
    };
  };
  error?: string;
  message?: string;
}

export interface RefreshResponse {
  success: boolean;
  data?: {
    token: string;
  };
  error?: string;
  message?: string;
}

class JWTAuthService {
  private static instance: JWTAuthService;
  private readonly API_BASE = '/api/auth';
  private readonly TOKEN_KEY = 'jwt_token';
  private refreshTimer: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): JWTAuthService {
    if (!JWTAuthService.instance) {
      JWTAuthService.instance = new JWTAuthService();
    }
    return JWTAuthService.instance;
  }

  /**
   * Login avec credentials S3 - amélioration de la gestion d'erreurs
   */
  async login(credentials: S3Credentials): Promise<LoginResponse> {
    try {
      console.log('Attempting login with credentials:', {
        accessKey: credentials.accessKey.substring(0, 8) + '...',
        region: credentials.region,
        secretKeyLength: credentials.secretKey.length
      });

      const response = await fetch(`${this.API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();
      
      console.log('Login response:', {
        status: response.status,
        success: data.success,
        error: data.error,
        message: data.message
      });

      if (data.success && data.data?.token) {
        this.setToken(data.data.token);
        this.scheduleTokenRefresh();
      }

      return data;
    } catch (error) {
      console.error('Login network error:', error);
      return {
        success: false,
        error: 'Network error',
        message: 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.'
      };
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    const token = this.getToken();
    
    if (token) {
      try {
        await fetch(`${this.API_BASE}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    this.clearToken();
    this.clearRefreshTimer();
  }

  /**
   * Refresh token
   */
  async refreshToken(): Promise<boolean> {
    const token = this.getToken();
    if (!token) return false;

    try {
      const response = await fetch(`${this.API_BASE}/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data: RefreshResponse = await response.json();

      if (data.success && data.data?.token) {
        this.setToken(data.data.token);
        this.scheduleTokenRefresh();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  /**
   * Vérifier si le token est valide
   */
  isTokenValid(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  }

  /**
   * Obtenir le token
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Définir le token
   */
  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * Supprimer le token
   */
  private clearToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  /**
   * Programmer le refresh automatique du token
   */
  private scheduleTokenRefresh(): void {
    this.clearRefreshTimer();

    const token = this.getToken();
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      const timeUntilExpiry = payload.exp - currentTime;
      
      // Refresh 5 minutes before expiration
      const refreshTime = Math.max(timeUntilExpiry - 300, 60) * 1000;

      this.refreshTimer = setTimeout(async () => {
        const success = await this.refreshToken();
        if (!success) {
          const error = ErrorService.parseError(new Error('Session expirée'));
          console.error('Session timeout:', error);
          this.clearToken();
          window.location.href = '/login';
        }
      }, refreshTime);
    } catch (error) {
      console.error('Error scheduling token refresh:', error);
    }
  }

  /**
   * Nettoyer le timer de refresh
   */
  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Obtenir les headers d'authentification
   */
  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
}

export const jwtAuthService = JWTAuthService.getInstance();
