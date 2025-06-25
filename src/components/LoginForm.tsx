
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useS3Store } from '../hooks/useS3Store';
import { useBackendApi } from '../hooks/useBackendApi';
import { OUTSCALE_REGIONS } from '../data/regions';
import { useToast } from '@/hooks/use-toast';
import { Cloud, Shield, AlertCircle, Globe, Server } from 'lucide-react';
import { AuthTokenService } from '../services/authTokenService';
import { CredentialsValidator } from '../services/credentialsValidator';

export const LoginForm = () => {
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [region, setRegion] = useState('eu-west-2');
  const [isLoading, setIsLoading] = useState(false);
  const [accessKeyError, setAccessKeyError] = useState<string | null>(null);
  const [secretKeyError, setSecretKeyError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useS3Store();
  const { initialize } = useBackendApi();
  const { toast } = useToast();
  const authTokenService = AuthTokenService.getInstance();

  // Redirect if already authenticated
  useEffect(() => {
    if (authTokenService.isTokenValid()) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [navigate, location]);

  // Get the selected region details
  const selectedRegion = OUTSCALE_REGIONS.find(r => r.id === region);

  // Validate credentials on change
  useEffect(() => {
    if (accessKey) {
      setAccessKeyError(CredentialsValidator.getAccessKeyError(accessKey));
    }
  }, [accessKey]);

  useEffect(() => {
    if (secretKey) {
      setSecretKeyError(CredentialsValidator.getSecretKeyError(secretKey));
    }
  }, [secretKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate credentials format
    const validation = CredentialsValidator.validateCredentials(accessKey, secretKey);
    if (!validation.isValid) {
      toast({
        title: "Erreur de validation",
        description: validation.errors.join(', '),
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

      const credentials = { accessKey, secretKey, region };
      
      const success = await initialize(credentials);
      
      if (success) {
        login(credentials);
        toast({
          title: "Connexion réussie",
          description: "Vous êtes maintenant connecté à votre compte Outscale"
        });
        
        // Redirect to intended page or dashboard
        const from = (location.state as any)?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Erreur de connexion",
        description: "Impossible de se connecter au service. Vérifiez vos identifiants et votre connexion internet.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4">
      <Card className="w-full max-w-lg shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-lg">
            <Cloud className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              NumS3 Console
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Connectez-vous avec vos identifiants Outscale
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="region" className="text-sm font-medium text-gray-700">
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
              
              {selectedRegion && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2 text-sm text-blue-800">
                    <Server className="w-4 h-4" />
                    <span className="font-medium">Endpoint:</span>
                    <code className="bg-blue-100 px-2 py-1 rounded text-xs">
                      {selectedRegion.endpoint}
                    </code>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="accessKey" className="text-sm font-medium text-gray-700">
                Access Key
              </Label>
              <Input 
                id="accessKey" 
                type="text" 
                value={accessKey} 
                onChange={e => setAccessKey(e.target.value)} 
                placeholder="AKXXXXXXXXXXXXXXXX" 
                required 
                disabled={isLoading}
                className={`w-full ${accessKeyError ? 'border-red-500' : ''}`}
              />
              {accessKeyError && (
                <p className="text-sm text-red-600">{accessKeyError}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="secretKey" className="text-sm font-medium text-gray-700">
                Secret Key
              </Label>
              <Input 
                id="secretKey" 
                type="password" 
                value={secretKey} 
                onChange={e => setSecretKey(e.target.value)} 
                placeholder="40 caractères alphanumériques" 
                required 
                disabled={isLoading}
                className={`w-full ${secretKeyError ? 'border-red-500' : ''}`}
              />
              {secretKeyError && (
                <p className="text-sm text-red-600">{secretKeyError}</p>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl" 
              disabled={!accessKey || !secretKey || !!accessKeyError || !!secretKeyError || isLoading}
            >
              <Shield className="w-4 h-4 mr-2" />
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800">
              <Shield className="w-4 h-4 inline mr-2" />
              Connexion sécurisée via notre backend à votre infrastructure Outscale.
            </p>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 flex items-start">
              <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
              Vos identifiants sont sécurisés et stockés uniquement durant votre session.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
