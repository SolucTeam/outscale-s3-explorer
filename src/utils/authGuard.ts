
import { jwtAuthService } from '../services/jwtAuthService';
import { NavigationManager } from '../services/navigationManager';

export class AuthGuard {
  static async checkAuthentication(): Promise<boolean> {
    try {
      const isValid = await jwtAuthService.isTokenValid();
      
      if (!isValid) {
        // Le token n'est pas valide, essayer de le rafraîchir
        const refreshed = await jwtAuthService.refreshToken();
        return refreshed;
      }
      
      return true;
    } catch (error) {
      console.error('Authentication check failed:', error);
      return false;
    }
  }
  
  static handleAuthenticationFailure(currentPath: string): void {
    // Sauvegarder la route actuelle pour redirection après login
    if (currentPath && currentPath !== '/login') {
      NavigationManager.saveRedirectAfterLogin(currentPath);
    }
    
    // Nettoyer l'état de navigation
    NavigationManager.clearAll();
    
    // Effectuer le logout complet
    jwtAuthService.logout();
  }
  
  static async requireAuth(currentPath: string): Promise<boolean> {
    const isAuthenticated = await this.checkAuthentication();
    
    if (!isAuthenticated) {
      this.handleAuthenticationFailure(currentPath);
      return false;
    }
    
    return true;
  }
}
