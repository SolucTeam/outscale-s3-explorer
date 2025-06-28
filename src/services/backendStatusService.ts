
export interface BackendStatus {
  isOnline: boolean;
  message: string;
  variant: 'success' | 'error' | 'warning';
}

class BackendStatusService {
  private baseUrl: string;

  constructor() {
    // Récupérer l'URL du backend depuis les variables d'environnement
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    const envPort = import.meta.env.VITE_API_PORT;
    
    if (envUrl) {
      this.baseUrl = envUrl;
    } else if (envPort) {
      this.baseUrl = `http://localhost:${envPort}`;
    } else {
      // Fallback par défaut uniquement si aucune variable n'est définie
      this.baseUrl = 'http://localhost:5000';
    }

    console.log('Backend URL configurée:', this.baseUrl);
  }

  async checkStatus(): Promise<BackendStatus> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return {
          isOnline: true,
          message: 'Backend connecté avec succès',
          variant: 'success'
        };
      } else {
        return {
          isOnline: false,
          message: `Backend accessible mais erreur HTTP ${response.status}`,
          variant: 'warning'
        };
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          isOnline: false,
          message: 'Timeout : Backend ne répond pas (> 5s)',
          variant: 'error'
        };
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        return {
          isOnline: false,
          message: 'Backend inaccessible - Vérifiez que Flask est démarré',
          variant: 'error'
        };
      } else {
        return {
          isOnline: false,
          message: `Erreur de connexion : ${error.message}`,
          variant: 'error'
        };
      }
    }
  }
}

export const backendStatusService = new BackendStatusService();
