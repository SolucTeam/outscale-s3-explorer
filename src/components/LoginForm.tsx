import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useS3Store } from '../hooks/useS3Store';
import { useEnhancedDirectS3 } from '../hooks/useEnhancedDirectS3';
import { useActionHistoryStore } from '../stores/actionHistoryStore';
import { OUTSCALE_REGIONS } from '../data/regions';
import { useToast } from '@/hooks/use-toast';
import { Cloud, Shield, AlertCircle, Globe, Server, Eye, EyeOff } from 'lucide-react';

export const LoginForm = () => {
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [region, setRegion] = useState('eu-west-2');
  const [isLoading, setIsLoading] = useState(false);
  const {
    login,
    isAuthenticated
  } = useS3Store();
  const {
    initialize
  } = useEnhancedDirectS3();
  const {
    toast
  } = useToast();
  const navigate = useNavigate();

  // Rediriger immédiatement si déjà connecté
  useEffect(() => {
    if (isAuthenticated) {
      console.log('User already authenticated, redirecting to dashboard');
      navigate('/dashboard', {
        replace: true
      });
    }
  }, [isAuthenticated, navigate]);

  // Get the selected region details
  const selectedRegion = OUTSCALE_REGIONS.find(r => r.id === region);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessKey || !secretKey) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      console.log('Attempting to login with:', {
        accessKey: accessKey.substring(0, 8) + '...',
        region
      });
      const credentials = {
        accessKey,
        secretKey,
        region
      };
      const success = await initialize(credentials);
      if (success) {
        // D'abord connecter l'utilisateur
        login(credentials);
        
        // Initialiser le userId pour l'historique des actions
        const userId = `${accessKey.substring(0, 8)}_${region}`;
        useActionHistoryStore.getState().setCurrentUser(userId);
        
        console.log('Login successful, will redirect to dashboard');
        toast({
          title: "Connexion réussie",
          description: "Redirection vers le dashboard..."
        });

        // Redirection immédiate avec replace pour éviter de revenir à la page de login
        navigate('/dashboard', {
          replace: true
        });
      } else {
        throw new Error('Échec de l\'initialisation');
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : '';
      const isNetworkError = errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('Serveur proxy non accessible') || errorMessage.includes('ECONNREFUSED');
      if (isNetworkError) {
        toast({
          title: "❌ Serveur proxy non démarré",
          description: "Le serveur proxy est requis pour se connecter à Outscale. Lancez './start.sh' (Linux/Mac) ou 'start.bat' (Windows) dans un terminal pour démarrer le proxy et l'application.",
          variant: "destructive",
          duration: 10000
        });
      } else if (errorMessage.includes('InvalidAccessKeyId') || errorMessage.includes('SignatureDoesNotMatch')) {
        toast({
          title: "❌ Identifiants invalides",
          description: "Vérifiez votre Access Key et Secret Key Outscale.",
          variant: "destructive",
          duration: 6000
        });
      } else {
        toast({
          title: "❌ Erreur de connexion",
          description: errorMessage || "Impossible de se connecter au service. Vérifiez vos identifiants et votre connexion internet.",
          variant: "destructive",
          duration: 6000
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4">
      <Card className="w-full max-w-lg shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg">
            <Cloud className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Outscale S3 Explorer
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Connectez-vous avec vos identifiants Outscale
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="region" className="text-sm font-medium text-foreground">
                Région Outscale
              </Label>
              <Select value={region} onValueChange={setRegion} disabled={isLoading}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionnez une région" />
                </SelectTrigger>
                <SelectContent>
                  {OUTSCALE_REGIONS.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      <div className="flex items-center space-x-2">
                        <Globe className="w-4 h-4" />
                        <span>{r.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Display endpoint for selected region */}
              {selectedRegion && (
                <div className="mt-2 p-3 bg-info/10 rounded-lg border border-info/20">
                  <div className="flex items-center space-x-2 text-sm text-info">
                    <Server className="w-4 h-4" />
                    <span className="font-medium">Endpoint:</span>
                    <code className="bg-info/20 px-2 py-1 rounded text-xs">
                      {selectedRegion.endpoint}
                    </code>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="accessKey" className="text-sm font-medium text-foreground">
                Access Key
              </Label>
              <Input 
                id="accessKey" 
                type="text" 
                value={accessKey} 
                onChange={e => setAccessKey(e.target.value)} 
                placeholder="Votre Access Key Outscale" 
                required 
                disabled={isLoading} 
                className="w-full" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="secretKey" className="text-sm font-medium text-foreground">
                Secret Key
              </Label>
              <div className="relative">
                <Input 
                  id="secretKey" 
                  type={showSecretKey ? "text" : "password"}
                  value={secretKey} 
                  onChange={e => setSecretKey(e.target.value)} 
                  placeholder="Votre Secret Key" 
                  required 
                  disabled={isLoading} 
                  className="w-full pr-12" 
                />
                <button
                  type="button"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors p-1"
                  disabled={isLoading}
                  aria-label={showSecretKey ? "Masquer le secret" : "Afficher le secret"}
                >
                  {showSecretKey ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl" 
              disabled={!accessKey || !secretKey || isLoading}
            >
              <Shield className="w-4 h-4 mr-2" />
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
          
          <div className="mt-4 p-4 bg-success/10 rounded-lg border border-success/20">
            <p className="text-sm text-success">
              <Shield className="w-4 h-4 inline mr-2" />
              Connexion sécurisée via proxy local à votre infrastructure Outscale.
            </p>
          </div>

          <div className="mt-3 p-4 bg-info/10 rounded-lg border border-info/20">
            <p className="text-sm text-info flex items-start">
              <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
              Vos identifiants sont sécurisés et stockés uniquement durant votre session.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};