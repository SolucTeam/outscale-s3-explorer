
import { jwtDecode } from 'jwt-decode';

interface JWTPayload {
  accessKey: string;
  region: string;
  sessionId: string;
  exp: number;
  iat: number;
}

export class AuthTokenService {
  private static instance: AuthTokenService;
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiration

  private constructor() {}

  static getInstance(): AuthTokenService {
    if (!AuthTokenService.instance) {
      AuthTokenService.instance = new AuthTokenService();
    }
    return AuthTokenService.instance;
  }

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  isTokenValid(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const decoded = jwtDecode<JWTPayload>(token);
      const now = Date.now() / 1000;
      return decoded.exp > now;
    } catch {
      return false;
    }
  }

  isTokenExpiringSoon(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const decoded = jwtDecode<JWTPayload>(token);
      const now = Date.now();
      const expirationTime = decoded.exp * 1000;
      return (expirationTime - now) < this.REFRESH_THRESHOLD;
    } catch {
      return false;
    }
  }

  getTokenPayload(): JWTPayload | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      return jwtDecode<JWTPayload>(token);
    } catch {
      return null;
    }
  }

  getTimeUntilExpiration(): number {
    const payload = this.getTokenPayload();
    if (!payload) return 0;

    const now = Date.now() / 1000;
    return Math.max(0, payload.exp - now);
  }
}
