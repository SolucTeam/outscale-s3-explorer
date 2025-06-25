
// Utilitaire pour gérer les problèmes de CORS avec Outscale
export const configureCorsForOutscale = () => {
  // Configuration des en-têtes par défaut pour les requêtes fetch
  const originalFetch = window.fetch;
  
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    
    // Si c'est une requête vers Outscale, ajouter les en-têtes nécessaires
    if (url && url.includes('outscale.com')) {
      const headers = new Headers(init?.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Amz-Date, X-Amz-Security-Token');
      
      const newInit: RequestInit = {
        ...init,
        headers,
        mode: 'cors'
      };
      
      console.log('Making CORS request to:', url);
      return originalFetch(input, newInit);
    }
    
    return originalFetch(input, init);
  };
};

// Restaurer fetch original si nécessaire
export const restoreOriginalFetch = () => {
  // Cette fonction pourrait être utilisée pour restaurer le comportement original
  // si nécessaire dans le futur
};
