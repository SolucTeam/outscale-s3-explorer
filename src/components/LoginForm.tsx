
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useS3Store } from '../hooks/useS3Store';
import { OUTSCALE_REGIONS } from '../data/regions';
import { apiService } from '../services/apiService';
import { useToast } from '@/hooks/use-toast';
import { Cloud, Shield, AlertCircle } from 'lucide-react';
import { useBackendStatus } from '../hooks/useBackendStatus';
import { BackendStatusIndicator } from './BackendStatusIndicator';

export const LoginForm = () => {
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [region, setRegion] = useState('eu-west-2');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useS3Store();
  const { toast } = useToast();
  const { status: backendStatus, isChecking, checkStatus } = useBackendStatus();

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

    if (!backendStatus.isOnline) {
      toast({
        title: "Backend inaccessible",
        description: "Impossible de se connecter avec le backend indisponible",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiService.login({
        accessKey,
        secretKey,
        region
      });

      if (response.success && response.data) {
        login({
          accessKey: response.data.user.accessKey,
          secretKey: '', // Ne pas stocker côté client
          region: response.data.user.region
        });
        
        toast({
          title: "Connexion réussie",
          description: "Vous êtes maintenant connecté à votre compte Outscale"
        });
      } else {
        toast({
          title: "Erreur de connexion",
          description: response.error || "Identifiants invalides",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Erreur de connexion",
        description: "Impossible de se connecter au serveur",
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
          {/* Indicateur de statut du backend */}
          <BackendStatusIndicator 
            status={backendStatus}
            isChecking={isChecking}
            onRetry={checkStatus}
            className="mb-6"
          />

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
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                placeholder="Votre Access Key Outscale" 
                required 
                disabled={isLoading}
                className="w-full" 
              />
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
                placeholder="Votre Secret Key" 
                required 
                disabled={isLoading}
                className="w-full" 
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl" 
              disabled={!accessKey || !secretKey || isLoading || !backendStatus.isOnline}
            >
              <Shield className="w-4 h-4 mr-2" />
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <Shield className="w-4 h-4 inline mr-2" />
              Vos identifiants sont traités de manière sécurisée côté serveur.
            </p>
          </div>

          <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800 flex items-start">
              <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
              Assurez-vous que votre backend Flask est démarré sur l'URL configurée.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
