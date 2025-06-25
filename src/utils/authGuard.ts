
import { useAuth } from '../hooks/useAuth';
import { NavigationManager } from '../services/navigationManager';

export class AuthGuard {
  static checkAuthentication(): boolean {
    try {
      // Utiliser le hook useAuth pour vérifier l'authentification
      // Note: Cette approche sera refactorisée pour utiliser directement le store
      const authData = localStorage.getItem('auth-storage');
      if (!authData) return false;
      
      const parsed = JSON.parse(authData);
      return parsed?.state?.isAuthenticated || false;
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
    
    // Nettoyer le localStorage auth
    localStorage.removeItem('auth-storage');
  }
  
  static requireAuth(currentPath: string): boolean {
    const isAuthenticated = this.checkAuthentication();
    
    if (!isAuthenticated) {
      this.handleAuthenticationFailure(currentPath);
      return false;
    }
    
    return true;
  }
}
